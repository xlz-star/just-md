import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { OpenedFile } from './types'
import { getEditorContent, setEditorContent, setCurrentFile, getCurrentFilePath } from './editor'
import { resetOutlineState, updateOutlineIfNeeded } from './outline'

// 动态导入以避免循环引用
let filetreeModulePromise: Promise<any> | null = null;

// 打开的文件列表
const openedFiles: OpenedFile[] = []

// 生成唯一ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// 检查并刷新文件树
function refreshFileTreeIfNeeded(): void {
  // 动态导入文件树模块
  import('./filetree').then(filetreeModule => {
    // 检查是否处于文件树视图
    const fileTreeContainer = document.getElementById('file-tree-container')
    const outlinePanel = document.getElementById('outline-panel')
    
    // 如果文件树容器存在且大纲面板可见
    if (fileTreeContainer && outlinePanel && !outlinePanel.classList.contains('hidden')) {
      // 检查是否处于文件树视图模式（通过检查切换按钮的标题）
      const toggleButton = document.getElementById('toggle-filetree-btn')
      if (toggleButton && toggleButton.title === '切换到大纲视图') {
        // 处于文件树视图，重新加载并渲染文件树
        filetreeModule.loadFileTree().then(() => {
          filetreeModule.renderFileTree()
        })
      }
    }
  })
}

// 打开文件
export async function openFile(): Promise<void> {
  try {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Markdown',
        extensions: ['md', 'markdown']
      }]
    })
    
    if (selected && typeof selected === 'string') {
      // 从路径中提取文件名
      const pathParts = selected.split(/[/\\]/)
      const fileName = pathParts[pathParts.length - 1]
      
      try {
        // 读取渲染后的HTML内容用于显示
        const htmlContent = await invoke<string>('read_markdown', { path: selected })
        
        // 同时获取原始Markdown内容用于保存
        const markdownContent = await invoke<string>('get_raw_markdown', { path: selected })
        
        if (htmlContent && markdownContent) {
          // 创建文件对象，保存原始Markdown内容
          const file: OpenedFile = {
            id: generateId(),
            path: selected,
            name: fileName,
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
          
          // 刷新文件树（如果需要）
          refreshFileTreeIfNeeded()
        } else {
          console.error('文件内容为空')
        }
      } catch (err) {
        console.error('读取文件内容失败:', err)
      }
    }
  } catch (e) {
    console.error('打开文件失败:', e)
  }
}

// 保存文件
export async function saveFile(): Promise<void> {
  try {
    const currentFilePath = getCurrentFilePath()
    
    if (!currentFilePath || currentFilePath === getCurrentFilePath()) {
      // 如果没有当前文件路径或路径只是文件名（拖放的文件），打开保存对话框
      const savePath = await save({
        filters: [{
          name: 'Markdown',
          extensions: ['md']
        }]
      })
      
      if (savePath) {
        // 从路径中提取文件名
        const pathParts = savePath.split(/[/\\]/)
        const fileName = pathParts[pathParts.length - 1]
        
        // 更新当前文件信息
        setCurrentFile(savePath, fileName)
        
        // 更新打开的文件列表
        const index = openedFiles.findIndex(f => f.path === savePath || f.name === fileName)
        if (index !== -1) {
          // 更新已存在的文件
          openedFiles[index].path = savePath
          openedFiles[index].name = fileName
          
          // 更新标签显示
          const tabElement = document.querySelector(`.file-tab[data-id="${openedFiles[index].id}"]`)
          if (tabElement) {
            const nameElement = tabElement.querySelector('.file-tab-name')
            if (nameElement) {
              nameElement.textContent = fileName
            }
          }
        } else {
          // 创建新的文件对象
          const file: OpenedFile = {
            id: generateId(),
            path: savePath,
            name: fileName,
            content: getEditorContent(),
            isDirty: false
          }
          
          // 添加到标签列表
          addFileTab(file, false)
          updateTabsActiveState(file.id)
        }
      } else {
        // 用户取消保存
        return
      }
    }
    
    // 获取编辑器内容
    const content = getEditorContent()
    
    // 保存到文件
    await invoke('save_markdown', {
      path: getCurrentFilePath(),
      content
    })
    
    // 更新文件内容和编辑状态
    const currentFile = openedFiles.find(f => f.path === getCurrentFilePath())
    if (currentFile) {
      currentFile.content = content
      updateFileDirtyState(currentFile.id, false)
    }
    
    // 刷新文件树（如果需要）
    refreshFileTreeIfNeeded()
  } catch (e) {
    console.error('保存文件失败:', e)
  }
}

// 文件标签管理
export function addFileTab(file: OpenedFile, setActive: boolean = true): void {
  // 检查文件是否已经打开
  const existingIndex = openedFiles.findIndex(f => f.path === file.path)
  
  if (existingIndex !== -1) {
    // 文件已经打开，切换到该文件
    if (setActive) {
      switchToFile(existingIndex)
    }
    return
  }
  
  // 添加到打开的文件列表
  openedFiles.push(file)
  
  // 创建标签元素
  const tabsContainer = document.querySelector('.file-tabs-container') as HTMLElement
  const tabElement = document.createElement('div')
  tabElement.className = 'file-tab'
  tabElement.dataset.id = file.id
  tabElement.innerHTML = `
    ${file.isDirty ? '<span class="file-tab-dirty-mark"></span>' : ''}
    <span class="file-tab-name">${file.name}</span>
    <span class="file-tab-close">×</span>
  `
  
  // 添加点击事件
  tabElement.addEventListener('click', async (e) => {
    // 如果点击的是关闭按钮，不切换文件
    if ((e.target as HTMLElement).classList.contains('file-tab-close')) {
      return
    }
    
    // 切换到该文件
    const index = openedFiles.findIndex(f => f.id === file.id)
    if (index !== -1) {
      await switchToFile(index)
    }
  })
  
  // 添加关闭按钮事件
  const closeBtn = tabElement.querySelector('.file-tab-close') as HTMLElement
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    
    // 关闭文件
    const index = openedFiles.findIndex(f => f.id === file.id)
    if (index !== -1) {
      closeFile(index)
    }
  })
  
  // 添加到DOM
  tabsContainer.appendChild(tabElement)
  
  // 显示文件标签栏
  updateFileTabsVisibility()
  
  // 设置为活动标签
  if (setActive) {
    switchToFile(openedFiles.length - 1)
  }
}

// 切换到指定文件
export async function switchToFile(index: number): Promise<void> {
  if (index < 0 || index >= openedFiles.length) return
  
  // 保存当前文件内容
  saveCurrentFileContent()
  
  // 设置当前文件
  const file = openedFiles[index]
  setCurrentFile(file.path, file.name)
  
  // 重置大纲结构
  resetOutlineState()
  
  try {
    // 渲染Markdown内容为HTML
    const htmlContent = await invoke<string>('render_markdown_to_html', { markdown: file.content })
    
    // 更新编辑器内容为渲染后的HTML
    setEditorContent(htmlContent)
  } catch (err) {
    console.error('渲染Markdown失败:', err)
    // 如果渲染失败，使用原始内容
    setEditorContent(file.content)
  }
  
  // 确保编辑器内容不是默认样式
  const proseMirror = document.querySelector('.ProseMirror') as HTMLElement
  if (proseMirror) {
    proseMirror.classList.remove('using-default-content')
  }
  
  // 更新标签样式
  updateTabsActiveState(file.id)
  
  // 更新大纲
  updateOutlineIfNeeded()
  
  // 刷新文件树（如果需要）
  refreshFileTreeIfNeeded()
}

// 关闭文件
export function closeFile(index: number): void {
  if (index < 0 || index >= openedFiles.length) return
  
  const file = openedFiles[index]
  
  // 从DOM中移除标签
  const tabElement = document.querySelector(`.file-tab[data-id="${file.id}"]`)
  if (tabElement) {
    tabElement.remove()
  }
  
  // 从列表中移除
  openedFiles.splice(index, 1)
  
  // 更新文件标签栏可见性
  updateFileTabsVisibility()
  
  // 如果关闭的是当前文件，切换到其他文件
  if (getCurrentFilePath() === file.path) {
    if (openedFiles.length > 0) {
      // 切换到下一个文件，如果没有下一个，则切换到上一个
      const newIndex = index < openedFiles.length ? index : openedFiles.length - 1
      switchToFile(newIndex)
    } else {
      // 没有打开的文件，清空编辑器
      setCurrentFile(null, null)
      setEditorContent('')
      
      // 刷新文件树（如果需要）
      refreshFileTreeIfNeeded()
    }
  } else {
    // 即使关闭的不是当前文件，也尝试刷新文件树
    refreshFileTreeIfNeeded()
  }
}

// 保存当前文件内容
export function saveCurrentFileContent(): void {
  const currentFilePath = getCurrentFilePath()
  if (currentFilePath) {
    const content = getEditorContent()
    
    // 更新文件内容
    const index = openedFiles.findIndex(f => f.path === currentFilePath)
    if (index !== -1) {
      // 只更新内容，不改变编辑状态
      openedFiles[index].content = content
    }
  }
}

// 更新标签活动状态
export function updateTabsActiveState(activeId: string): void {
  // 移除所有活动状态
  document.querySelectorAll('.file-tab').forEach(tab => {
    tab.classList.remove('active')
  })
  
  // 设置活动标签
  const activeTab = document.querySelector(`.file-tab[data-id="${activeId}"]`)
  if (activeTab) {
    activeTab.classList.add('active')
    
    // 确保标签可见
    activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }
}

// 更新文件的编辑状态
export function updateFileDirtyState(fileId: string, isDirty: boolean): void {
  // 更新文件对象
  const index = openedFiles.findIndex(f => f.id === fileId)
  if (index !== -1) {
    openedFiles[index].isDirty = isDirty
    
    // 更新标签显示
    const tabElement = document.querySelector(`.file-tab[data-id="${fileId}"]`)
    if (tabElement) {
      // 检查是否已有标记
      let dirtyMark = tabElement.querySelector('.file-tab-dirty-mark')
      
      if (isDirty && !dirtyMark) {
        // 添加标记
        dirtyMark = document.createElement('span')
        dirtyMark.className = 'file-tab-dirty-mark'
        tabElement.insertBefore(dirtyMark, tabElement.firstChild)
      } else if (!isDirty && dirtyMark) {
        // 移除标记
        dirtyMark.remove()
      }
    }
  }
}

// 获取当前打开的文件
export function getOpenedFiles(): OpenedFile[] {
  return [...openedFiles]
}

// 获取当前活动文件
export function getActiveFile(): OpenedFile | null {
  const currentFilePath = getCurrentFilePath()
  if (!currentFilePath) return null
  
  return openedFiles.find(f => f.path === currentFilePath) || null
}

// 更新文件标签栏可见性
export function updateFileTabsVisibility(): void {
  const fileTabsElement = document.getElementById('file-tabs')
  if (fileTabsElement) {
    if (openedFiles.length > 0) {
      fileTabsElement.classList.add('has-tabs')
    } else {
      fileTabsElement.classList.remove('has-tabs')
    }
  }
}

// 处理拖放文件
export function handleFileDrop(file: File): void {
  file.text().then(content => {
    // 拖放的文件内容是原始Markdown
    const markdownContent = content;
    
    // 调用后端渲染Markdown为HTML
    invoke<string>('render_markdown_to_html', { markdown: markdownContent })
      .then(htmlContent => {
        // 创建文件对象，保存原始Markdown内容
        const openedFile: OpenedFile = {
          id: generateId(),
          path: file.name, // 拖放的文件没有完整路径，只用文件名作为临时路径
          name: file.name,
          content: markdownContent, // 保存原始Markdown
          isDirty: false
        }
        
        // 添加到标签列表
        addFileTab(openedFile, false) // 先添加到标签，但不激活
        
        // 手动设置当前文件信息
        setCurrentFile(openedFile.path, openedFile.name)
        
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
        updateTabsActiveState(openedFile.id)
        
        // 更新大纲
        updateOutlineIfNeeded()
        
        // 刷新文件树（如果需要）
        refreshFileTreeIfNeeded()
      })
      .catch(err => {
        console.error('渲染Markdown失败:', err);
        
        // 如果渲染失败，就直接用原始内容
        const openedFile: OpenedFile = {
          id: generateId(),
          path: file.name,
          name: file.name,
          content: markdownContent,
          isDirty: false
        }
        
        // 添加到标签列表
        addFileTab(openedFile)
      });
  }).catch(err => {
    console.error('读取拖放文件失败:', err)
  })
}

// 打开文件夹
export async function openFolder(): Promise<void> {
  try {
    // 打开文件夹选择对话框
    const selected = await open({
      multiple: false,
      directory: true
    });
    
    if (selected && typeof selected === 'string') {
      // 先设置当前目录为选择的文件夹路径
      await invoke('set_current_directory', { path: selected });
      
      // 如果没有加载filetree模块，则加载它
      if (!filetreeModulePromise) {
        filetreeModulePromise = import('./filetree');
      }
      
      const filetreeModule = await filetreeModulePromise;
      const outlineModule = await import('./outline');
      
      // 先获取大纲面板
      const outlinePanel = document.getElementById('outline-panel');
      
      // 处理面板初始可见性
      if (outlinePanel && outlinePanel.classList.contains('hidden')) {
        // 面板处于隐藏状态，先显示它
        outlineModule.showOutlinePanel();
        
        // 确保面板完全显示后再继续操作
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 将大纲面板切换到文件树视图
      filetreeModule.switchToFileTree();
      
      // 在切换视图后等待一下，确保DOM已更新
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 如果面板尚未固定，则固定它
      if (outlinePanel && !outlinePanel.classList.contains('pinned')) {
        outlineModule.toggleOutlinePinned();
        
        // 再等待固定操作完成
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 更新切换按钮状态，确保显示正确的图标和标题
      const toggleButton = document.getElementById('toggle-filetree-btn');
      if (toggleButton) {
        toggleButton.innerHTML = '<i class="ri-list-check"></i>';
        toggleButton.title = '切换到大纲视图';
      }
      
      // 预先加载文件树数据
      await filetreeModule.loadFileTree(selected);
      
      // 最后渲染文件树
      filetreeModule.renderFileTree();
    }
  } catch (e) {
    console.error('打开文件夹失败:', e);
  }
} 