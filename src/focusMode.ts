import { getEditor } from './editor'

let focusModeEnabled = false
let typewriterModeEnabled = false

export function initFocusMode(): void {
  // Load saved states
  const savedFocusMode = localStorage.getItem('focusModeEnabled')
  const savedTypewriterMode = localStorage.getItem('typewriterModeEnabled')
  
  if (savedFocusMode === 'true') {
    enableFocusMode()
  }
  
  if (savedTypewriterMode === 'true') {
    enableTypewriterMode()
  }
}


export function toggleFocusMode(): void {
  if (focusModeEnabled) {
    disableFocusMode()
  } else {
    enableFocusMode()
  }
}

export function toggleTypewriterMode(): void {
  if (typewriterModeEnabled) {
    disableTypewriterMode()
  } else {
    enableTypewriterMode()
  }
}

function enableFocusMode(): void {
  focusModeEnabled = true
  localStorage.setItem('focusModeEnabled', 'true')
  
  document.body.classList.add('focus-mode')
  
  // Update settings checkbox if open
  const checkbox = document.getElementById('focus-mode-checkbox') as HTMLInputElement
  if (checkbox) {
    checkbox.checked = true
  }
  
  // Apply focus effect
  applyFocusEffect()
}

function disableFocusMode(): void {
  focusModeEnabled = false
  localStorage.setItem('focusModeEnabled', 'false')
  
  document.body.classList.remove('focus-mode')
  
  // Update settings checkbox if open
  const checkbox = document.getElementById('focus-mode-checkbox') as HTMLInputElement
  if (checkbox) {
    checkbox.checked = false
  }
  
  // Remove focus effect
  removeFocusEffect()
}

function enableTypewriterMode(): void {
  typewriterModeEnabled = true
  localStorage.setItem('typewriterModeEnabled', 'true')
  
  document.body.classList.add('typewriter-mode')
  
  // Update settings checkbox if open
  const checkbox = document.getElementById('typewriter-mode-checkbox') as HTMLInputElement
  if (checkbox) {
    checkbox.checked = true
  }
  
  // Start typewriter effect
  startTypewriterEffect()
}

function disableTypewriterMode(): void {
  typewriterModeEnabled = false
  localStorage.setItem('typewriterModeEnabled', 'false')
  
  document.body.classList.remove('typewriter-mode')
  
  // Update settings checkbox if open
  const checkbox = document.getElementById('typewriter-mode-checkbox') as HTMLInputElement
  if (checkbox) {
    checkbox.checked = false
  }
  
  // Stop typewriter effect
  stopTypewriterEffect()
}

function applyFocusEffect(): void {
  const editor = getEditor()
  if (!editor) return
  
  // Add event listeners for cursor movement
  editor.on('selectionUpdate', handleFocusUpdate)
  editor.on('update', handleFocusUpdate)
  
  // Initial focus
  handleFocusUpdate()
}

function removeFocusEffect(): void {
  const editor = getEditor()
  if (!editor) return
  
  editor.off('selectionUpdate', handleFocusUpdate)
  editor.off('update', handleFocusUpdate)
  
  // Remove all dimming
  document.querySelectorAll('.paragraph-dimmed').forEach(el => {
    el.classList.remove('paragraph-dimmed')
  })
}

function handleFocusUpdate(): void {
  if (!focusModeEnabled) return
  
  const editor = getEditor()
  if (!editor) return
  
  const { from } = editor.state.selection
  
  // Find all paragraph-like elements
  const editorElement = document.querySelector('.ProseMirror')
  if (!editorElement) return
  
  const paragraphs = editorElement.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre')
  
  // Get current paragraph element
  let currentElement: Element | null = null
  const { node } = editor.view.domAtPos(from)
  if (node) {
    currentElement = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element
    while (currentElement && !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE'].includes(currentElement.tagName)) {
      currentElement = currentElement.parentElement
    }
  }
  
  // Apply dimming
  paragraphs.forEach(p => {
    if (p === currentElement) {
      p.classList.remove('paragraph-dimmed')
    } else {
      p.classList.add('paragraph-dimmed')
    }
  })
}

let typewriterInterval: number | null = null

function startTypewriterEffect(): void {
  const editor = getEditor()
  if (!editor) return
  
  // Add event listener for cursor movement
  editor.on('selectionUpdate', handleTypewriterScroll)
  editor.on('update', handleTypewriterScroll)
  
  // Initial centering
  handleTypewriterScroll()
}

function stopTypewriterEffect(): void {
  const editor = getEditor()
  if (!editor) return
  
  editor.off('selectionUpdate', handleTypewriterScroll)
  editor.off('update', handleTypewriterScroll)
  
  if (typewriterInterval) {
    clearInterval(typewriterInterval)
    typewriterInterval = null
  }
}

function handleTypewriterScroll(): void {
  if (!typewriterModeEnabled) return
  
  const editor = getEditor()
  if (!editor) return
  
  try {
    const { from } = editor.state.selection
    const coords = editor.view.coordsAtPos(from)
    
    const editorElement = document.querySelector('.ProseMirror') as HTMLElement
    if (!editorElement) return
    
    const container = editorElement.parentElement as HTMLElement
    if (!container) return
    
    const containerRect = container.getBoundingClientRect()
    const targetY = containerRect.height / 2
    const currentY = coords.top - containerRect.top + container.scrollTop
    const scrollOffset = currentY - targetY
    
    // Smooth scroll to center the cursor
    container.scrollTo({
      top: scrollOffset,
      behavior: 'smooth'
    })
  } catch (error) {
    // Ignore errors when cursor position is not available
  }
}