import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { exit } from '@tauri-apps/plugin-process'

// 文件相关状态
let currentFilePath: string | null = null
let currentFileName: string | null = null

// 打开的文件列表
interface OpenedFile {
  id: string;
  path: string;
  name: string;
  content: string;
  isDirty: boolean; // 是否已编辑但未保存
}

// 打开的文件列表
const openedFiles: OpenedFile[] = []

// 全局编辑器变量声明
let editor: Editor

// 大纲显示状态
let isOutlinePanelVisible = false
// 大纲固定状态
let isOutlinePanelPinned = false
// 大纲更新防抖计时器
let outlineUpdateDebounceTimer: number | null = null
// 上次的大纲结构，用于比较变化
let lastOutlineStructure: Array<{level: number, text: string, pos: number}> = []

// 初始化编辑器
function initEditor(content: string = '') {
  // 如果已存在编辑器，先销毁
  if (editor) {
    editor.destroy()
  }
  
  // 重置大纲结构
  lastOutlineStructure = []
  
  // 默认占位符内容
  const defaultContent = '<p>输入你的 Markdown 内容或拖放 .md 文件到这里...</p>'
  
  // 标记是否使用了默认内容
  const isUsingDefault = !content
  
  // 创建新的编辑器实例
  editor = new Editor({
    element: document.querySelector('#editor') as HTMLElement,
    extensions: [
      StarterKit,
    ],
    content: content || defaultContent,
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
    onSelectionUpdate: ({ editor }) => {
      // 如果大纲面板可见，同步光标位置到大纲
      if (isOutlinePanelVisible) {
        syncCursorPositionToOutline()
      }
    },
  })
  
  // 如果使用了默认内容，添加特殊标记类
  if (isUsingDefault) {
    const proseMirror = document.querySelector('.ProseMirror') as HTMLElement
    if (proseMirror) {
      proseMirror.classList.add('using-default-content')
    }
  }
  
  // 监听编辑器内容变化
  editor.on('update', ({ editor: updatedEditor }) => {
    // 如果没有打开的文件，不需要处理脏状态
    if (currentFilePath && openedFiles.length > 0) {
      // 获取当前文件
      const currentFile = openedFiles.find(f => f.path === currentFilePath)
      if (currentFile) {
        // 检查内容是否变化
        const currentContent = updatedEditor.getHTML()
        const isDirty = currentContent !== currentFile.content
        
        // 更新编辑状态
        updateFileDirtyState(currentFile.id, isDirty)
      }
    }
    
    // 如果大纲面板可见，使用防抖更新大纲
    if (isOutlinePanelVisible) {
      debouncedUpdateOutline()
    }
  })
  
  // 添加焦点事件处理
  editor.on('focus', () => {
    const proseMirror = document.querySelector('.ProseMirror') as HTMLElement
    if (proseMirror && proseMirror.classList.contains('using-default-content')) {
      // 清空默认内容
      editor.commands.setContent('<p></p>')
      proseMirror.classList.remove('using-default-content')
    }
  })
  
  // 添加失焦事件处理
  editor.on('blur', () => {
    // 检查内容是否为空
    const content = editor.getHTML()
    const isEmpty = content === '<p></p>' || content === '<p><br></p>' || content === ''
    
    if (isEmpty && !currentFilePath) {
      // 如果内容为空且没有打开的文件，显示默认内容
      editor.commands.setContent(defaultContent)
      const proseMirror = document.querySelector('.ProseMirror') as HTMLElement
      if (proseMirror) {
        proseMirror.classList.add('using-default-content')
      }
    }
  })
  
  // 添加点击事件处理
  const editorElement = document.querySelector('#editor') as HTMLElement
  editorElement.addEventListener('click', (e) => {
    // 如果编辑器已经获得焦点，不需要处理
    if (editor.isFocused) return
    
    // 获取焦点并将光标移动到末尾
    editor.commands.focus('end')
  })
  
  return editor
}

// 初始化编辑器
editor = initEditor()

// 初始化菜单
initMenus()

// 初始化大纲功能
initOutlineFeature()

// 初始化大纲功能
function initOutlineFeature() {
  const outlineBtn = document.getElementById('outline-btn')
  const outlinePanel = document.getElementById('outline-panel')
  const outlineOverlay = document.getElementById('outline-overlay')
  const pinOutlineBtn = document.getElementById('pin-outline-btn')
  
  // 点击大纲按钮显示/隐藏大纲面板
  outlineBtn?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isOutlinePanelVisible) {
      hideOutlinePanel()
    } else {
      showOutlinePanel()
    }
  })
  
  // 点击遮罩层隐藏大纲面板
  outlineOverlay?.addEventListener('click', (e) => {
    e.preventDefault()
    // 如果大纲已固定，不隐藏
    if (!isOutlinePanelPinned) {
      hideOutlinePanel()
    }
  })
  
  // 点击固定按钮
  pinOutlineBtn?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    toggleOutlinePinned()
  })
  
  // 点击文档时，如果大纲面板可见，则隐藏它
  document.addEventListener('click', (e) => {
    // 如果点击的是大纲面板内部或大纲按钮，不处理
    if (
      e.target === outlineBtn || 
      outlineBtn?.contains(e.target as Node) ||
      e.target === outlinePanel || 
      outlinePanel?.contains(e.target as Node)
    ) {
      return
    }
    
    // 如果大纲面板可见且未固定，则隐藏
    if (isOutlinePanelVisible && !isOutlinePanelPinned) {
      hideOutlinePanel()
    }
  })
  
  // 初始化编辑器选择监听
  initEditorSelectionListener()
}

// 显示大纲面板
function showOutlinePanel() {
  const outlinePanel = document.getElementById('outline-panel')
  const outlineOverlay = document.getElementById('outline-overlay')
  
  if (outlinePanel && outlineOverlay) {
    // 确保样式应用前有一个小延迟，以触发动画
    requestAnimationFrame(() => {
      outlinePanel.classList.remove('hidden')
      if (!isOutlinePanelPinned) {
        outlineOverlay.classList.remove('hidden')
      }
    })
    
    isOutlinePanelVisible = true
    
    // 重置大纲结构
    lastOutlineStructure = []
    
    // 立即更新大纲内容
    updateOutlineIfNeeded()
  }
}

// 隐藏大纲面板
function hideOutlinePanel() {
  const outlinePanel = document.getElementById('outline-panel')
  const outlineOverlay = document.getElementById('outline-overlay')
  
  if (outlinePanel && outlineOverlay) {
    // 如果已固定，不隐藏
    if (isOutlinePanelPinned) {
      return
    }
    
    // 先添加隐藏类触发动画
    outlinePanel.classList.add('hidden')
    outlineOverlay.classList.add('hidden')
    
    isOutlinePanelVisible = false
  }
}

// 切换大纲固定状态
function toggleOutlinePinned() {
  const outlinePanel = document.getElementById('outline-panel')
  const outlineOverlay = document.getElementById('outline-overlay')
  const pinOutlineBtn = document.getElementById('pin-outline-btn')
  
  if (outlinePanel && outlineOverlay && pinOutlineBtn) {
    isOutlinePanelPinned = !isOutlinePanelPinned
    
    if (isOutlinePanelPinned) {
      // 固定状态
      outlinePanel.classList.add('pinned')
      outlineOverlay.classList.add('hidden')
      pinOutlineBtn.innerHTML = '<i class="ri-pushpin-fill"></i>'
      pinOutlineBtn.title = "取消固定"
    } else {
      // 非固定状态
      outlinePanel.classList.remove('pinned')
      if (isOutlinePanelVisible) {
        outlineOverlay.classList.remove('hidden')
      }
      pinOutlineBtn.innerHTML = '<i class="ri-pushpin-line"></i>'
      pinOutlineBtn.title = "固定大纲"
    }
    
    // 切换固定状态后，确保大纲内容是最新的
    if (isOutlinePanelVisible) {
      updateOutlineIfNeeded()
    }
  }
}

// 防抖更新大纲
function debouncedUpdateOutline() {
  // 如果已有计时器，清除它
  if (outlineUpdateDebounceTimer !== null) {
    clearTimeout(outlineUpdateDebounceTimer)
  }
  
  // 设置新的计时器
  outlineUpdateDebounceTimer = setTimeout(() => {
    updateOutlineIfNeeded()
    outlineUpdateDebounceTimer = null
  }, 300) as unknown as number
}

// 检查并更新大纲（如果需要的话）
function updateOutlineIfNeeded() {
  if (!editor || !isOutlinePanelVisible) return
  
  // 获取当前文档的大纲结构
  const currentStructure = extractHeadings(editor)
  
  // 比较大纲结构是否发生变化
  if (!areHeadingsEqual(lastOutlineStructure, currentStructure)) {
    // 结构已变化，更新大纲
    lastOutlineStructure = currentStructure
    renderOutline(currentStructure)
  } else {
    // 仅更新活动项，不重新渲染整个大纲
    updateActiveOutlineItem()
  }
}

// 从编辑器中提取标题结构
function extractHeadings(editor: Editor): Array<{level: number, text: string, pos: number}> {
  const headings: Array<{level: number, text: string, pos: number}> = []
  
  // 遍历文档中的所有节点
  editor.state.doc.descendants((node, pos) => {
    // 检查节点是否是标题
    if (node.type.name === 'heading') {
      headings.push({
        level: node.attrs.level,
        text: node.textContent,
        pos: pos
      })
    }
    return true // 继续遍历
  })
  
  return headings
}

// 比较两个大纲结构是否相同
function areHeadingsEqual(
  oldHeadings: Array<{level: number, text: string, pos: number}>, 
  newHeadings: Array<{level: number, text: string, pos: number}>
): boolean {
  if (oldHeadings.length !== newHeadings.length) {
    return false
  }
  
  for (let i = 0; i < oldHeadings.length; i++) {
    if (
      oldHeadings[i].level !== newHeadings[i].level || 
      oldHeadings[i].text !== newHeadings[i].text
    ) {
      return false
    }
  }
  
  return true
}

// 渲染大纲内容
function renderOutline(headings: Array<{level: number, text: string, pos: number}>) {
  const outlineContent = document.getElementById('outline-content')
  if (!outlineContent) return
  
  // 保存当前滚动位置
  const scrollTop = outlineContent.scrollTop
  
  // 创建一个新的容器用于构建大纲
  const tempContainer = document.createElement('div')
  
  if (headings.length === 0) {
    // 没有标题时显示提示
    tempContainer.innerHTML = '<div class="outline-placeholder">文档中没有标题内容</div>'
  } else {
    // 为每个标题创建大纲项
    headings.forEach((heading, index) => {
      const outlineItem = document.createElement('div')
      outlineItem.className = `outline-item outline-h${heading.level}`
      outlineItem.textContent = heading.text || `标题 ${index + 1}`
      outlineItem.dataset.index = index.toString()
      outlineItem.dataset.position = heading.pos.toString()
      
      // 点击大纲项跳转到对应位置
      outlineItem.addEventListener('click', () => {
        // 使用Tiptap API设置光标位置
        editor.commands.setTextSelection(heading.pos)
        editor.commands.scrollIntoView()
        
        // 设置活动状态
        setActiveOutlineItem(outlineItem)
      })
      
      tempContainer.appendChild(outlineItem)
    })
  }
  
  // 替换整个内容区域
  outlineContent.innerHTML = ''
  while (tempContainer.firstChild) {
    outlineContent.appendChild(tempContainer.firstChild)
  }
  
  // 恢复滚动位置
  outlineContent.scrollTop = scrollTop
  
  // 更新活动项
  updateActiveOutlineItem()
}

// 更新活动大纲项，不重新渲染整个大纲
function updateActiveOutlineItem() {
  if (!editor || !isOutlinePanelVisible) return
  
  // 获取当前光标位置
  const { from } = editor.state.selection
  let currentHeadingPos = -1
  let currentHeadingIndex = -1
  
  // 查找当前光标所在的标题或其父标题
  for (let i = 0; i < lastOutlineStructure.length; i++) {
    const heading = lastOutlineStructure[i]
    const nextHeading = i < lastOutlineStructure.length - 1 ? lastOutlineStructure[i + 1] : null
    
    // 检查光标是否在这个标题的范围内
    if (from >= heading.pos) {
      if (nextHeading === null || from < nextHeading.pos) {
        currentHeadingPos = heading.pos
        currentHeadingIndex = i
        break
      }
    }
  }
  
  // 移除所有大纲项的活动状态
  document.querySelectorAll('.outline-item').forEach(item => {
    item.classList.remove('active')
  })
  
  // 如果找到了当前标题，高亮对应的大纲项
  if (currentHeadingIndex !== -1) {
    const activeItem = document.querySelector(`.outline-item[data-index="${currentHeadingIndex}"]`)
    if (activeItem instanceof HTMLElement) {
      activeItem.classList.add('active')
      activeItem.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    }
  }
}

// 监听编辑器选择变化
function initEditorSelectionListener() {
  if (!editor) return
  
  // 监听选择变化
  editor.on('selectionUpdate', () => {
    // 如果大纲面板可见，同步光标位置到大纲
    if (isOutlinePanelVisible) {
      syncCursorPositionToOutline()
    }
  })
}

// 生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// 打开文件
async function openFile() {
  try {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Markdown',
        extensions: ['md', 'markdown']
      }]
    })
    
    console.log('选择的文件:', selected)
    
    if (selected && typeof selected === 'string') {
      // 从路径中提取文件名
      const pathParts = selected.split(/[/\\]/)
      const fileName = pathParts[pathParts.length - 1]
      
      try {
        // 读取文件内容
        console.log('正在读取文件:', selected)
        const content = await invoke<string>('read_markdown', { path: selected })
        console.log('读取到的内容:', content)
        
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
          
          console.log('已打开文件:', fileName)
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
async function saveFile() {
  try {
    if (!currentFilePath || currentFilePath === currentFileName) {
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
        currentFilePath = savePath
        currentFileName = fileName
        
        // 更新窗口标题
        document.title = `${currentFileName} - Just MD`
        
        // 更新打开的文件列表
        const index = openedFiles.findIndex(f => f.path === currentFilePath || f.name === currentFileName)
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
            content: editor.getHTML(),
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
    const content = editor.getHTML()
    
    // 保存到文件
    await invoke('save_markdown', {
      path: currentFilePath,
      content
    })
    
    // 更新文件内容和编辑状态
    const currentFile = openedFiles.find(f => f.path === currentFilePath)
    if (currentFile) {
      currentFile.content = content
      updateFileDirtyState(currentFile.id, false)
    }
    
    console.log('文件已保存:', currentFilePath)
  } catch (e) {
    console.error('保存文件失败:', e)
  }
}

// 文件标签管理
function addFileTab(file: OpenedFile, setActive: boolean = true) {
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
function switchToFile(index: number) {
  if (index < 0 || index >= openedFiles.length) return
  
  // 保存当前文件内容
  saveCurrentFileContent()
  
  // 设置当前文件
  const file = openedFiles[index]
  currentFilePath = file.path
  currentFileName = file.name
  
  // 更新窗口标题
  document.title = `${currentFileName} - Just MD`
  
  // 重置大纲结构
  lastOutlineStructure = []
  
  // 更新编辑器内容
  initEditor(file.content)
  
  // 更新标签样式
  updateTabsActiveState(file.id)
  
  // 如果大纲面板可见，更新大纲
  if (isOutlinePanelVisible) {
    updateOutlineIfNeeded()
  }
}

// 关闭文件
function closeFile(index: number) {
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
  if (currentFilePath === file.path) {
    if (openedFiles.length > 0) {
      // 切换到下一个文件，如果没有下一个，则切换到上一个
      const newIndex = index < openedFiles.length ? index : openedFiles.length - 1
      switchToFile(newIndex)
    } else {
      // 没有打开的文件，清空编辑器
      currentFilePath = null
      currentFileName = null
      document.title = 'Just MD - Markdown 编辑器'
      initEditor()
    }
  }
}

// 保存当前文件内容
function saveCurrentFileContent() {
  if (currentFilePath) {
    const content = editor.getHTML()
    
    // 更新文件内容
    const index = openedFiles.findIndex(f => f.path === currentFilePath)
    if (index !== -1) {
      // 只更新内容，不改变编辑状态
      openedFiles[index].content = content
    }
  }
}

// 更新标签活动状态
function updateTabsActiveState(activeId: string) {
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
function updateFileDirtyState(fileId: string, isDirty: boolean) {
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

// 更新文件标签栏可见性
function updateFileTabsVisibility() {
  const fileTabsElement = document.getElementById('file-tabs')
  if (fileTabsElement) {
    if (openedFiles.length > 0) {
      fileTabsElement.classList.add('has-tabs')
    } else {
      fileTabsElement.classList.remove('has-tabs')
    }
  }
}

// 保存文件内容
window.addEventListener('beforeunload', () => {
  if (currentFilePath) {
    const content = editor.getHTML()
    console.log('保存内容:', content)
    
    // 调用 Tauri 命令保存内容
    invoke('save_markdown', {
      path: currentFilePath,
      content: editor.getHTML()
    }).catch((err: Error) => console.error('保存失败:', err))
  }
})

// 添加拖放文件支持
const editorElement = document.querySelector('#editor') as HTMLElement

editorElement.addEventListener('dragover', (e) => {
  e.preventDefault()
  editorElement.classList.add('drag-over')
})

editorElement.addEventListener('dragleave', () => {
  editorElement.classList.remove('drag-over')
})

editorElement.addEventListener('drop', async (e) => {
  e.preventDefault()
  editorElement.classList.remove('drag-over')

  if (e.dataTransfer?.files.length) {
    const file = e.dataTransfer.files[0]
    
    if (file.name.endsWith('.md')) {
      try {
        const content = await file.text()
        
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
        
        console.log('加载了文件:', file.name)
      } catch (err) {
        console.error('读取文件失败:', err)
      }
    }
  }
})

// 添加键盘快捷键支持
document.addEventListener('keydown', (e) => {
  // Ctrl+S 保存
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    saveFile()
  }
  
  // Ctrl+O 打开
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault()
    openFile()
  }
})

// 添加编辑器菜单样式
document.head.insertAdjacentHTML('beforeend', `
  <style>
    .drag-over {
      background-color: rgba(0, 120, 255, 0.1);
      border: 2px dashed #0078ff !important;
    }
  </style>
`)

// 菜单初始化
function initMenus() {
  // 文件菜单
  const fileMenu = document.getElementById('file-menu')
  const openFileItem = document.getElementById('open-file')
  const saveFileItem = document.getElementById('save-file')
  const exitAppItem = document.getElementById('exit-app')
  
  // 编辑菜单
  const editMenu = document.getElementById('edit-menu')
  const undoItem = document.getElementById('undo')
  const redoItem = document.getElementById('redo')
  
  // 菜单展开/关闭
  const allMenus = document.querySelectorAll('.menu-item')
  
  // 点击菜单项时展开下拉菜单
  allMenus.forEach(menu => {
    menu.addEventListener('click', () => {
      // 关闭其他菜单
      allMenus.forEach(m => {
        if (m !== menu) {
          m.classList.remove('active')
        }
      })
      
      // 切换当前菜单状态
      menu.classList.toggle('active')
    })
  })
  
  // 点击菜单项外区域关闭菜单
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.menu-item')) {
      allMenus.forEach(menu => {
        menu.classList.remove('active')
      })
    }
  })
  
  // 阻止下拉菜单项点击事件冒泡到菜单项
  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      
      // 点击后关闭菜单
      allMenus.forEach(menu => {
        menu.classList.remove('active')
      })
    })
  })
  
  // 文件菜单项事件
  openFileItem?.addEventListener('click', openFile)
  saveFileItem?.addEventListener('click', saveFile)
  exitAppItem?.addEventListener('click', () => {
    exit(0).catch((err: Error) => console.error('退出失败:', err))
  })
  
  // 编辑菜单项事件
  undoItem?.addEventListener('click', () => {
    editor.commands.undo()
  })
  
  redoItem?.addEventListener('click', () => {
    editor.commands.redo()
  })
}

// 更新大纲内容 (保留此函数用于兼容现有调用)
function updateOutline() {
  updateOutlineIfNeeded()
}

// 设置活动大纲项 (重新实现为调用 updateActiveOutlineItem)
function setActiveOutlineItem(activeItem: HTMLElement | null) {
  if (!activeItem) {
    // 如果没有传入活动项，直接更新全部
    updateActiveOutlineItem()
    return
  }
  
  // 移除所有大纲项的活动状态
  document.querySelectorAll('.outline-item').forEach(item => {
    item.classList.remove('active')
  })
  
  // 设置当前项为活动状态
  activeItem.classList.add('active')
  
  // 确保大纲项在视图中可见
  activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

// 同步光标位置到大纲 (重新实现为调用 updateActiveOutlineItem)
function syncCursorPositionToOutline() {
  updateActiveOutlineItem()
}
