import { getEditor } from './editor'

let sidebarCollapsed = false
let formatToolbarVisible = false
let currentSidebarTab = 'files'

export function initLayoutManager(): void {
  initSidebarControls()
  initFormatToolbar()
  initStatusBar()
  initResizer()
  
  // Load saved layout preferences
  loadLayoutPreferences()
}

function initSidebarControls(): void {
  const sidebarToggle = document.getElementById('sidebar-toggle')
  const sidebarClose = document.getElementById('sidebar-close')
  const sidebarTabs = document.querySelectorAll('.sidebar-tab')
  
  // Toggle sidebar
  sidebarToggle?.addEventListener('click', toggleSidebar)
  sidebarClose?.addEventListener('click', () => setSidebarCollapsed(true))
  
  // Tab switching
  sidebarTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab')
      if (tabName) {
        switchSidebarTab(tabName)
      }
    })
  })
}

function toggleSidebar(): void {
  setSidebarCollapsed(!sidebarCollapsed)
}

function setSidebarCollapsed(collapsed: boolean): void {
  const sidebar = document.getElementById('sidebar')
  const toggleBtn = document.getElementById('sidebar-toggle')
  
  sidebarCollapsed = collapsed
  
  if (sidebar) {
    if (collapsed) {
      sidebar.classList.add('collapsed')
      toggleBtn?.querySelector('i')?.setAttribute('class', 'ri-menu-line')
    } else {
      sidebar.classList.remove('collapsed')
      toggleBtn?.querySelector('i')?.setAttribute('class', 'ri-menu-3-line')
    }
  }
  
  localStorage.setItem('sidebarCollapsed', collapsed.toString())
}

function switchSidebarTab(tabName: string): void {
  currentSidebarTab = tabName
  
  // Update tab buttons
  document.querySelectorAll('.sidebar-tab').forEach(tab => {
    if (tab.getAttribute('data-tab') === tabName) {
      tab.classList.add('active')
    } else {
      tab.classList.remove('active')
    }
  })
  
  // Update panels
  document.querySelectorAll('.sidebar-panel').forEach(panel => {
    if (panel.id === `panel-${tabName}`) {
      panel.classList.add('active')
    } else {
      panel.classList.remove('active')
    }
  })
  
  localStorage.setItem('sidebarTab', tabName)
}

function initFormatToolbar(): void {
  const editor = getEditor()
  if (!editor) return
  
  const toolbar = document.getElementById('format-toolbar')
  if (!toolbar) return
  
  // Listen for selection changes
  editor.on('selectionUpdate', ({ editor }) => {
    const { from, to } = editor.state.selection
    const hasSelection = from !== to
    
    if (hasSelection && editor.state.doc.textBetween(from, to).trim()) {
      showFormatToolbar()
    } else {
      hideFormatToolbar()
    }
  })
  
  // Format button clicks
  toolbar.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const format = btn.getAttribute('data-format')
      if (format) {
        applyFormat(format)
      }
    })
  })
  
  // Hide on click outside
  document.addEventListener('click', (e) => {
    if (!toolbar.contains(e.target as Node)) {
      hideFormatToolbar()
    }
  })
}

function showFormatToolbar(): void {
  const toolbar = document.getElementById('format-toolbar')
  const editor = getEditor()
  if (!toolbar || !editor) return
  
  const { from, to } = editor.state.selection
  const startCoords = editor.view.coordsAtPos(from)
  const endCoords = editor.view.coordsAtPos(to)
  
  // Calculate position
  const x = (startCoords.left + endCoords.right) / 2
  const y = startCoords.top - 50
  
  toolbar.style.left = `${x}px`
  toolbar.style.top = `${y}px`
  toolbar.classList.add('visible')
  
  formatToolbarVisible = true
  
  // Update button states
  updateFormatButtonStates()
}

function hideFormatToolbar(): void {
  const toolbar = document.getElementById('format-toolbar')
  if (toolbar) {
    toolbar.classList.remove('visible')
    formatToolbarVisible = false
  }
}

function updateFormatButtonStates(): void {
  const editor = getEditor()
  if (!editor) return
  
  const toolbar = document.getElementById('format-toolbar')
  if (!toolbar) return
  
  // Check active formats
  const isBold = editor.isActive('bold')
  const isItalic = editor.isActive('italic')
  const isCode = editor.isActive('code')
  const isHeading = editor.isActive('heading')
  const isLink = editor.isActive('link')
  const isQuote = editor.isActive('blockquote')
  
  // Update button states
  toolbar.querySelector('[data-format="bold"]')?.classList.toggle('active', isBold)
  toolbar.querySelector('[data-format="italic"]')?.classList.toggle('active', isItalic)
  toolbar.querySelector('[data-format="code"]')?.classList.toggle('active', isCode)
  toolbar.querySelector('[data-format="heading"]')?.classList.toggle('active', isHeading)
  toolbar.querySelector('[data-format="link"]')?.classList.toggle('active', isLink)
  toolbar.querySelector('[data-format="quote"]')?.classList.toggle('active', isQuote)
}

function applyFormat(format: string): void {
  const editor = getEditor()
  if (!editor) return
  
  switch (format) {
    case 'bold':
      editor.chain().focus().toggleBold().run()
      break
    case 'italic':
      editor.chain().focus().toggleItalic().run()
      break
    case 'heading':
      editor.chain().focus().toggleHeading({ level: 2 }).run()
      break
    case 'link':
      const url = prompt('输入链接地址:')
      if (url) {
        editor.chain().focus().setLink({ href: url }).run()
      }
      break
    case 'code':
      editor.chain().focus().toggleCode().run()
      break
    case 'quote':
      editor.chain().focus().toggleBlockquote().run()
      break
  }
  
  // Keep toolbar visible after applying format
  setTimeout(() => {
    if (editor.state.selection.from !== editor.state.selection.to) {
      showFormatToolbar()
    }
  }, 10)
}

function initStatusBar(): void {
  const editor = getEditor()
  if (!editor) return
  
  // Update cursor position
  editor.on('selectionUpdate', updateCursorPosition)
  editor.on('update', updateWordCount)
  
  // Initial update
  updateCursorPosition()
  updateWordCount()
}

function updateCursorPosition(): void {
  const editor = getEditor()
  if (!editor) return
  
  const cursorPos = document.querySelector('#cursor-position span')
  if (!cursorPos) return
  
  const { from } = editor.state.selection
  
  // Calculate line and column
  let line = 1
  let col = 1
  
  for (let i = 0; i < from; i++) {
    const char = editor.state.doc.textBetween(i, i + 1)
    if (char === '\n') {
      line++
      col = 1
    } else {
      col++
    }
  }
  
  cursorPos.textContent = `行 ${line}, 列 ${col}`
}

function updateWordCount(): void {
  const editor = getEditor()
  if (!editor) return
  
  const wordCountEl = document.querySelector('#word-count span')
  if (!wordCountEl) return
  
  const text = editor.state.doc.textContent
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const charCount = text.length
  
  wordCountEl.textContent = `${wordCount} 字 / ${charCount} 字符`
}

export function updateSaveStatus(saved: boolean): void {
  const saveStatus = document.querySelector('#save-status')
  if (!saveStatus) return
  
  const icon = saveStatus.querySelector('i')
  const text = saveStatus.querySelector('span')
  
  if (icon && text) {
    if (saved) {
      icon.className = 'ri-check-line'
      text.textContent = '已保存'
    } else {
      icon.className = 'ri-loader-4-line'
      text.textContent = '未保存'
    }
  }
}

export function updateDocumentTitle(title: string): void {
  const docTitle = document.getElementById('doc-title')
  if (docTitle) {
    docTitle.textContent = title || '未命名文档'
  }
  
  // Also update window title
  document.title = `${title || '未命名文档'} - Just MD`
}

function initResizer(): void {
  const sidebar = document.getElementById('sidebar')
  const resizer = document.querySelector('.sidebar-resizer') as HTMLElement
  if (!sidebar || !resizer) return
  
  let isResizing = false
  let startX = 0
  let startWidth = 0
  
  resizer.addEventListener('mousedown', (e) => {
    isResizing = true
    startX = e.clientX
    startWidth = sidebar.offsetWidth
    document.body.style.cursor = 'col-resize'
    e.preventDefault()
  })
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return
    
    const width = startWidth + (e.clientX - startX)
    if (width >= 200 && width <= 500) {
      sidebar.style.width = `${width}px`
    }
  })
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false
      document.body.style.cursor = ''
      
      // Save width preference
      const width = sidebar?.style.width
      if (width) {
        localStorage.setItem('sidebarWidth', width)
      }
    }
  })
}

function loadLayoutPreferences(): void {
  // Sidebar collapsed state
  const collapsed = localStorage.getItem('sidebarCollapsed') === 'true'
  setSidebarCollapsed(collapsed)
  
  // Sidebar tab
  const tab = localStorage.getItem('sidebarTab') || 'files'
  switchSidebarTab(tab)
  
  // Sidebar width
  const width = localStorage.getItem('sidebarWidth')
  if (width) {
    const sidebar = document.getElementById('sidebar')
    if (sidebar) {
      sidebar.style.width = width
    }
  }
}

// Export utility functions
export function isFormatToolbarVisible(): boolean {
  return formatToolbarVisible
}

export function isSidebarCollapsed(): boolean {
  return sidebarCollapsed
}

export function getCurrentSidebarTab(): string {
  return currentSidebarTab
}