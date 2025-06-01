import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { OpenedFile } from './types'
import { getEditorContent, setEditorContent, setCurrentFile, getCurrentFilePath } from './editor'
import { resetOutlineState, updateOutlineIfNeeded } from './outline'

// 打开的文件列表
const openedFiles: OpenedFile[] = []

// 生成唯一ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
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
        // 读取文件内容
        const content = await invoke<string>('read_markdown', { path: selected })
        
        if (content) {
          // 创建文件对象
          const file: OpenedFile = {
            id: generateId(),
            path: selected,
            name: fileName,
            content: content,
            isDirty: false
          }
          
          // 添加到标签列表
          addFileTab(file)
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
  tabElement.addEventListener('click', (e) => {
    // 如果点击的是关闭按钮，不切换文件
    if ((e.target as HTMLElement).classList.contains('file-tab-close')) {
      return
    }
    
    // 切换到该文件
    const index = openedFiles.findIndex(f => f.id === file.id)
    if (index !== -1) {
      switchToFile(index)
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
export function switchToFile(index: number): void {
  if (index < 0 || index >= openedFiles.length) return
  
  // 保存当前文件内容
  saveCurrentFileContent()
  
  // 设置当前文件
  const file = openedFiles[index]
  setCurrentFile(file.path, file.name)
  
  // 重置大纲结构
  resetOutlineState()
  
  // 更新编辑器内容
  setEditorContent(file.content)
  
  // 更新标签样式
  updateTabsActiveState(file.id)
  
  // 更新大纲
  updateOutlineIfNeeded()
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
    }
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
    // 创建文件对象
    const openedFile: OpenedFile = {
      id: generateId(),
      path: file.name, // 拖放的文件没有完整路径，只用文件名作为临时路径
      name: file.name,
      content: content,
      isDirty: false
    }
    
    // 添加到标签列表
    addFileTab(openedFile)
  }).catch(err => {
    console.error('读取拖放文件失败:', err)
  })
} 