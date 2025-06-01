import { Editor } from '@tiptap/core'
import { HeadingStructure } from './types'
import { getEditor } from './editor'

// 大纲显示状态
let isOutlinePanelVisible = false
// 大纲固定状态
let isOutlinePanelPinned = false
// 大纲更新防抖计时器
let outlineUpdateDebounceTimer: number | null = null
// 上次的大纲结构，用于比较变化
let lastOutlineStructure: HeadingStructure[] = []

// 初始化大纲功能
export function initOutlineFeature(): void {
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
}

// 显示大纲面板
export function showOutlinePanel(): void {
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
export function hideOutlinePanel(): void {
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
export function toggleOutlinePinned(): void {
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

// 检查大纲面板是否可见
export function isOutlineVisible(): boolean {
  return isOutlinePanelVisible
}

// 防抖更新大纲
export function debouncedUpdateOutline(): void {
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
export function updateOutlineIfNeeded(): void {
  const editor = getEditor()
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
function extractHeadings(editor: Editor): HeadingStructure[] {
  const headings: HeadingStructure[] = []
  
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
function areHeadingsEqual(oldHeadings: HeadingStructure[], newHeadings: HeadingStructure[]): boolean {
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
function renderOutline(headings: HeadingStructure[]): void {
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
        const editor = getEditor()
        if (editor) {
          // 使用Tiptap API设置光标位置
          editor.commands.setTextSelection(heading.pos)
          editor.commands.scrollIntoView()
          
          // 设置活动状态
          setActiveOutlineItem(outlineItem)
        }
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
function updateActiveOutlineItem(): void {
  const editor = getEditor()
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

// 设置活动大纲项
export function setActiveOutlineItem(activeItem: HTMLElement | null): void {
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

// 同步光标位置到大纲
export function syncCursorPositionToOutline(): void {
  updateActiveOutlineItem()
}

// 重置大纲状态
export function resetOutlineState(): void {
  lastOutlineStructure = []
}

// 兼容旧接口
export function updateOutline(): void {
  updateOutlineIfNeeded()
} 