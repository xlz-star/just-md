import { FileTreeItem } from './types'
import { getCurrentFilePath, setEditorContent } from './editor'
import { invoke } from '@tauri-apps/api/core'
import { OpenedFile } from './types'
import { generateId, addFileTab, updateTabsActiveState } from './fileManager'
import { resetOutlineState, updateOutlineIfNeeded } from './outline'
import { setCurrentFile } from './editor'

// 文件树状态
let isFileTreeVisible = false
let fileTreeData: FileTreeItem[] = []
let rootFolder: string | null = null

// 加载文件树
export async function loadFileTree(folderPath?: string): Promise<void> {
  try {
    const filePath = folderPath || getCurrentFilePath();
    if (!filePath) {
      fileTreeData = [];
      return;
    }
    
    // 调用Rust后端函数获取文件树数据
    const result = await invoke('get_file_tree', { filePath });
    
    if (result) {
      // 解析返回的数据并转换字段名为驼峰命名法
      const { root_path, items } = result as { root_path: string, items: any[] };
      rootFolder = root_path;
      fileTreeData = items.map(convertItemToCamelCase);
    } else {
      fileTreeData = [];
    }
  } catch (error) {
    console.error('加载文件树失败:', error);
    fileTreeData = [];
  }
}

// 展开/折叠目录
export async function toggleDirectory(item: FileTreeItem): Promise<void> {
  if (!item.isDirectory) return
  
  if (item.isExpanded) {
    // 折叠目录
    item.isExpanded = false
    item.children = []
  } else {
    // 展开目录，调用Rust后端获取子目录内容
    try {
      const children = await invoke('get_directory_children', { dirPath: item.path })
      
      if (children && Array.isArray(children)) {
        item.isExpanded = true
        // 转换返回的子项字段为驼峰命名法
        item.children = (children as any[]).map(convertItemToCamelCase)
      } else {
        item.children = []
      }
    } catch (error) {
      console.error('获取子目录失败:', error)
      item.children = []
    }
  }
  
  // 更新UI
  renderFileTree()
}

// 获取文件树数据
export function getFileTreeData(): FileTreeItem[] {
  return fileTreeData
}

// 切换文件树可见性
export function toggleFileTreeVisibility(): boolean {
  isFileTreeVisible = !isFileTreeVisible
  return isFileTreeVisible
}

// 获取文件树可见性
export function getFileTreeVisibility(): boolean {
  return isFileTreeVisible
}

// 设置文件树可见性
export function setFileTreeVisibility(visible: boolean): void {
  isFileTreeVisible = visible
}

// 渲染文件树
export function renderFileTree(): void {
  const outlinePanel = document.getElementById('outline-panel')
  if (!outlinePanel) return
  
  // 如果文件树不可见，不执行任何操作
  if (!isFileTreeVisible) return
  
  // 清空当前内容
  const fileTreeContainer = document.getElementById('file-tree-container')
  if (fileTreeContainer) {
    fileTreeContainer.innerHTML = ''
  } else {
    // 创建文件树容器
    const newFileTreeContainer = document.createElement('div')
    newFileTreeContainer.id = 'file-tree-container'
    newFileTreeContainer.className = 'file-tree-container'
    outlinePanel.appendChild(newFileTreeContainer)
  }
  
  const container = document.getElementById('file-tree-container')!
  
  // 更新大纲面板标题
  const outlineHeader = outlinePanel.querySelector('.outline-header h3')
  if (outlineHeader) {
    outlineHeader.textContent = '文件树'
  }
  
  // 更新切换按钮
  const toggleButton = document.getElementById('toggle-filetree-btn')
  if (toggleButton) {
    toggleButton.innerHTML = '<i class="ri-list-check"></i>'
    toggleButton.title = '切换到大纲视图'
  }
  
  // 显示文件树根目录路径
  if (rootFolder) {
    const rootPathElement = document.createElement('div')
    rootPathElement.className = 'file-tree-root-path'
    rootPathElement.textContent = rootFolder
    container.appendChild(rootPathElement)
  }
  
  // 递归渲染文件树项目
  function renderItems(items: FileTreeItem[], parentElement: HTMLElement): void {
    const ul = document.createElement('ul')
    ul.className = 'file-tree-list'
    
    items.forEach(item => {
      const li = document.createElement('li')
      li.className = 'file-tree-item'
      li.style.paddingLeft = `${item.level * 16}px`
      
      const icon = document.createElement('span')
      icon.className = 'file-tree-icon'
      
      if (item.isDirectory) {
        icon.innerHTML = item.isExpanded ? '📂' : '📁'
        icon.addEventListener('click', () => toggleDirectory(item))
      } else {
        icon.innerHTML = '📄'
      }
      
      const name = document.createElement('span')
      name.className = 'file-tree-name'
      name.textContent = item.name
      
      if (!item.isDirectory) {
        name.addEventListener('click', async () => {
          // 集成文件管理模块，打开文件
          try {
            // 获取渲染后的HTML内容用于显示
            const htmlContent = await invoke<string>('read_markdown', { path: item.path })
            
            // 同时获取原始Markdown内容用于保存
            const markdownContent = await invoke<string>('get_raw_markdown', { path: item.path })
            
            if (htmlContent && markdownContent) {
              // 创建文件对象，保存原始Markdown内容
              const file: OpenedFile = {
                id: generateId(),
                path: item.path,
                name: item.name,
                content: markdownContent, // 保存原始Markdown
                isDirty: false
              }
              
              // 添加到标签列表并设置编辑器内容为渲染后的HTML
              addFileTab(file, false) // 先添加到标签，但不激活（避免触发switchToFile中的setEditorContent）
              
              // 手动设置当前文件信息
              setCurrentFile(file.path, file.name)
              
              // 重置大纲结构
              resetOutlineState()
              
              // 设置编辑器内容为渲染后的HTML
              setEditorContent(htmlContent)
              
              // 确保编辑器内容不是默认样式
              const proseMirror = document.querySelector('.ProseMirror') as HTMLElement
              if (proseMirror) {
                proseMirror.classList.remove('using-default-content')
              }
              
              // 更新标签样式
              updateTabsActiveState(file.id)
              
              // 更新大纲
              updateOutlineIfNeeded()
            }
          } catch (err) {
            console.error('打开文件失败:', err)
          }
        })
      } else {
        // 为目录添加点击事件
        name.addEventListener('click', () => toggleDirectory(item))
      }
      
      li.appendChild(icon)
      li.appendChild(name)
      ul.appendChild(li)
      
      // 如果是展开的目录，渲染子项目
      if (item.isDirectory && item.isExpanded && item.children && item.children.length > 0) {
        renderItems(item.children, li)
      }
    })
    
    parentElement.appendChild(ul)
  }
  
  // 渲染文件树
  if (fileTreeData.length > 0) {
    renderItems(fileTreeData, container)
  } else {
    // 显示空状态
    const emptyState = document.createElement('div')
    emptyState.className = 'file-tree-empty'
    emptyState.textContent = '没有可显示的文件'
    container.appendChild(emptyState)
  }
}

// 在文件树和大纲之间切换
export function switchToFileTree(): void {
  setFileTreeVisibility(true)
  
  // 获取并保存当前面板宽度
  const outlinePanel = document.getElementById('outline-panel')
  const outlineBtn = document.getElementById('outline-btn')
  let currentWidth = '';
  
  if (outlinePanel) {
    currentWidth = outlinePanel.style.width || '';
    
    // 更新大纲面板标题
    const outlineHeader = outlinePanel.querySelector('.outline-header h3')
    if (outlineHeader) {
      outlineHeader.textContent = '文件树'
    }
  }
  
  // 隐藏大纲按钮
  if (outlineBtn && !outlineBtn.classList.contains('hidden')) {
    outlineBtn.classList.add('fade-out')
    setTimeout(() => {
      if (outlinePanel && !outlinePanel.classList.contains('hidden')) { 
        // 如果面板仍然可见，则隐藏按钮
        outlineBtn.classList.add('hidden')
      }
    }, 300);
  }
  
  // 隐藏大纲内容
  const outlineContent = document.getElementById('outline-content')
  if (outlineContent) {
    outlineContent.style.display = 'none'
  }
  
  // 显示文件树内容或创建它
  let fileTreeContainer = document.getElementById('file-tree-container')
  if (!fileTreeContainer) {
    // 如果文件树容器不存在，需要创建它
    fileTreeContainer = document.createElement('div')
    fileTreeContainer.id = 'file-tree-container'
    fileTreeContainer.className = 'file-tree-container'
    
    if (outlinePanel) {
      outlinePanel.appendChild(fileTreeContainer)
    }
  }
  
  fileTreeContainer.style.display = 'flex';
  
  // 恢复宽度
  if (currentWidth && outlinePanel) {
    outlinePanel.style.width = currentWidth
    outlinePanel.style.minWidth = currentWidth
  }
  
  // 更新切换按钮状态
  const toggleButton = document.getElementById('toggle-filetree-btn')
  if (toggleButton) {
    toggleButton.innerHTML = '<i class="ri-list-check"></i>'
    toggleButton.title = '切换到大纲视图'
  }
  
  // 隐藏大纲内容容器
  const outlineContainer = document.getElementById('outline-container')
  if (outlineContainer) {
    outlineContainer.style.display = 'none'
  }
  
  // 加载并渲染文件树
  loadFileTree().then(() => {
    renderFileTree()
  }).catch(err => {
    console.error('加载文件树失败:', err)
    
    // 即使加载失败，也尝试渲染（显示空状态）
    renderFileTree()
  })
}

// 切换到大纲视图
export function switchToOutline(): void {
  setFileTreeVisibility(false)
  
  // 保存当前面板宽度
  const outlinePanel = document.getElementById('outline-panel')
  const outlineBtn = document.getElementById('outline-btn')
  let currentWidth = '';
  
  if (outlinePanel) {
    currentWidth = outlinePanel.style.width || '';
  }
  
  // 隐藏大纲按钮
  if (outlineBtn && !outlineBtn.classList.contains('hidden')) {
    outlineBtn.classList.add('fade-out')
    setTimeout(() => {
      if (outlinePanel && !outlinePanel.classList.contains('hidden')) { 
        // 如果面板仍然可见，则隐藏按钮
        outlineBtn.classList.add('hidden')
      }
    }, 300);
  }
  
  // 动态导入避免循环引用
  import('./outline').then(outlineModule => {
    // 显示大纲面板
    outlineModule.showOutlinePanel()
    
    // 恢复宽度
    if (currentWidth && outlinePanel) {
      outlinePanel.style.width = currentWidth
      outlinePanel.style.minWidth = currentWidth
    }
    
    // 更新切换按钮状态
    const toggleButton = document.getElementById('toggle-filetree-btn')
    if (toggleButton) {
      toggleButton.innerHTML = '<i class="ri-folder-line"></i>'
      toggleButton.title = '切换到文件树视图'
    }
    
    // 隐藏文件树内容
    const fileTreeContainer = document.getElementById('file-tree-container')
    if (fileTreeContainer) {
      fileTreeContainer.style.display = 'none'
    }
    
    // 显示大纲内容并更新
    const outlineContainer = document.getElementById('outline-container')
    if (outlineContainer) {
      outlineContainer.style.display = 'block'
    }
    
    const outlineContent = document.getElementById('outline-content')
    if (outlineContent) {
      outlineContent.style.display = 'block'
      // 更新大纲内容
      outlineModule.updateOutlineIfNeeded()
    }
  })
}

// 显示大纲面板
export function showOutlinePanel(): void {
  const outlinePanel = document.getElementById('outline-panel');
  
  // 如果面板存在且是隐藏状态，直接修改其类以显示
  if (outlinePanel && outlinePanel.classList.contains('hidden')) {
    outlinePanel.classList.remove('hidden');
    
    // 处理遮罩层
    const outlineOverlay = document.getElementById('outline-overlay');
    if (outlineOverlay) {
      outlineOverlay.classList.remove('hidden');
    }
    
    // 动态导入outline模块并调用其显示方法
    import('./outline').then(outlineModule => {
      // 在显示方法可用时调用它
      if (typeof outlineModule.showOutlinePanel === 'function') {
        outlineModule.showOutlinePanel();
      }
    });
  } else {
    // 如果面板不存在或已显示，仅动态导入调用显示方法
    import('./outline').then(outlineModule => {
      outlineModule.showOutlinePanel();
    });
  }
}

// 将蛇形命名法转换为驼峰命名法
function convertItemToCamelCase(item: any): FileTreeItem {
  return {
    name: item.name,
    path: item.path,
    isDirectory: item.is_directory,
    level: item.level,
    isExpanded: item.is_expanded,
    children: item.children ? item.children.map(convertItemToCamelCase) : []
  }
} 
