import { getEditor, getCurrentMarkdownContent } from './editor'
import { invoke } from '@tauri-apps/api/core'

let splitViewEnabled = false
let splitViewContainer: HTMLElement | null = null
let previewPane: HTMLElement | null = null
let editorPane: HTMLElement | null = null
let updateTimer: number | null = null

export function initSplitView(): void {
  createSplitViewButton()
}

function createSplitViewButton(): void {
  const button = document.createElement('button')
  button.id = 'split-view-btn'
  button.className = 'floating-btn split-view-btn'
  button.title = '切换分屏视图'
  button.innerHTML = '<i class="ri-layout-column-line"></i>'
  
  document.getElementById('app')?.appendChild(button)
  
  button.addEventListener('click', toggleSplitView)
}

export function toggleSplitView(): void {
  if (splitViewEnabled) {
    disableSplitView()
  } else {
    enableSplitView()
  }
}

function enableSplitView(): void {
  splitViewEnabled = true
  
  // Create split view container
  const mainContent = document.getElementById('main-content')
  if (!mainContent) return
  
  // Create container
  splitViewContainer = document.createElement('div')
  splitViewContainer.className = 'split-view-container'
  
  // Move editor to left pane
  const editor = document.getElementById('editor')
  if (!editor) return
  
  editorPane = document.createElement('div')
  editorPane.className = 'split-pane editor-pane'
  editorPane.appendChild(editor)
  
  // Create preview pane
  previewPane = document.createElement('div')
  previewPane.className = 'split-pane preview-pane'
  previewPane.innerHTML = '<div class="preview-content"></div>'
  
  // Create resizer
  const resizer = document.createElement('div')
  resizer.className = 'split-resizer'
  
  // Add panes to container
  splitViewContainer.appendChild(editorPane)
  splitViewContainer.appendChild(resizer)
  splitViewContainer.appendChild(previewPane)
  
  // Add container to main content
  mainContent.appendChild(splitViewContainer)
  
  // Initialize resizer
  initResizer(resizer)
  
  // Update preview
  updatePreview()
  
  // Listen for editor changes
  const editorInstance = getEditor()
  if (editorInstance) {
    editorInstance.on('update', debounceUpdate)
  }
  
  // Update button icon
  const button = document.getElementById('split-view-btn')
  if (button) {
    button.querySelector('i')!.className = 'ri-layout-row-line'
  }
}

function disableSplitView(): void {
  splitViewEnabled = false
  
  if (!splitViewContainer || !editorPane) return
  
  const mainContent = document.getElementById('main-content')
  const editor = document.getElementById('editor')
  
  if (mainContent && editor) {
    // Move editor back to main content
    mainContent.appendChild(editor)
    
    // Remove split view container
    splitViewContainer.remove()
  }
  
  // Stop listening for updates
  const editorInstance = getEditor()
  if (editorInstance) {
    editorInstance.off('update', debounceUpdate)
  }
  
  // Clear references
  splitViewContainer = null
  previewPane = null
  editorPane = null
  
  // Update button icon
  const button = document.getElementById('split-view-btn')
  if (button) {
    button.querySelector('i')!.className = 'ri-layout-column-line'
  }
}

function initResizer(resizer: HTMLElement): void {
  let isResizing = false
  let startX = 0
  let startWidthLeft = 0
  let startWidthRight = 0
  
  resizer.addEventListener('mousedown', (e) => {
    isResizing = true
    startX = e.clientX
    
    if (editorPane && previewPane) {
      startWidthLeft = editorPane.offsetWidth
      startWidthRight = previewPane.offsetWidth
    }
    
    document.body.classList.add('resizing-split')
  })
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing || !editorPane || !previewPane) return
    
    const deltaX = e.clientX - startX
    const newWidthLeft = startWidthLeft + deltaX
    const newWidthRight = startWidthRight - deltaX
    
    // Set minimum widths
    if (newWidthLeft >= 300 && newWidthRight >= 300) {
      editorPane.style.width = `${newWidthLeft}px`
      previewPane.style.width = `${newWidthRight}px`
    }
  })
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false
      document.body.classList.remove('resizing-split')
    }
  })
}

function debounceUpdate(): void {
  if (updateTimer) {
    clearTimeout(updateTimer)
  }
  
  updateTimer = setTimeout(() => {
    updatePreview()
  }, 300) as unknown as number
}

async function updatePreview(): Promise<void> {
  if (!previewPane || !splitViewEnabled) return
  
  const markdown = getCurrentMarkdownContent()
  if (!markdown) return
  
  try {
    // Convert markdown to HTML
    const html = await invoke<string>('render_markdown_to_html', { markdown })
    
    const previewContent = previewPane.querySelector('.preview-content')
    if (previewContent) {
      previewContent.innerHTML = html
      
      // Sync scroll position
      syncScroll()
    }
  } catch (error) {
    console.error('Failed to update preview:', error)
  }
}

function syncScroll(): void {
  if (!editorPane || !previewPane) return
  
  const editor = editorPane.querySelector('.ProseMirror') as HTMLElement
  const preview = previewPane.querySelector('.preview-content') as HTMLElement
  
  if (!editor || !preview) return
  
  // Simple scroll sync based on percentage
  const scrollPercentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight)
  preview.scrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight)
}