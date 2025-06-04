import { getEditor } from './editor'

let codeFoldingEnabled = true

export function initCodeFolding(): void {
  // Initialize folding state
  const savedState = localStorage.getItem('codeFoldingEnabled')
  if (savedState !== null) {
    codeFoldingEnabled = savedState === 'true'
  }
  
  if (codeFoldingEnabled) {
    enableCodeFolding()
  }
}


export function toggleCodeFolding(): void {
  if (codeFoldingEnabled) {
    disableCodeFolding()
  } else {
    enableCodeFolding()
  }
}

function enableCodeFolding(): void {
  codeFoldingEnabled = true
  localStorage.setItem('codeFoldingEnabled', 'true')
  
  // Add fold/unfold buttons to code blocks
  addFoldButtons()
  
  // Update settings checkbox if open
  const checkbox = document.getElementById('code-folding-checkbox') as HTMLInputElement
  if (checkbox) {
    checkbox.checked = true
  }
}

function disableCodeFolding(): void {
  codeFoldingEnabled = false
  localStorage.setItem('codeFoldingEnabled', 'false')
  
  // Remove all fold buttons and unfold all code
  removeFoldButtons()
  unfoldAllCode()
  
  // Update settings checkbox if open
  const checkbox = document.getElementById('code-folding-checkbox') as HTMLInputElement
  if (checkbox) {
    checkbox.checked = false
  }
}

function addFoldButtons(): void {
  const editor = getEditor()
  if (!editor) return
  
  // Use MutationObserver to watch for new code blocks
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          const codeBlocks = node.querySelectorAll('.code-block')
          codeBlocks.forEach(addFoldButtonToBlock)
          
          if (node.classList?.contains('code-block')) {
            addFoldButtonToBlock(node)
          }
        }
      })
    })
  })
  
  // Start observing
  const editorElement = document.querySelector('.ProseMirror')
  if (editorElement) {
    observer.observe(editorElement, {
      childList: true,
      subtree: true,
    })
    
    // Add to existing code blocks
    const existingBlocks = editorElement.querySelectorAll('.code-block')
    existingBlocks.forEach(addFoldButtonToBlock)
  }
  
  // Store observer for cleanup
  (window as any).codeFoldingObserver = observer
}

function removeFoldButtons(): void {
  // Stop observing
  const observer = (window as any).codeFoldingObserver
  if (observer) {
    observer.disconnect()
    delete (window as any).codeFoldingObserver
  }
  
  // Remove all fold buttons
  document.querySelectorAll('.code-fold-button').forEach(btn => btn.remove())
}

function addFoldButtonToBlock(block: Element): void {
  if (block.querySelector('.code-fold-button')) {
    return // Already has button
  }
  
  const pre = block.querySelector('pre')
  if (!pre) return
  
  // Check if code has more than 5 lines
  const lines = pre.textContent?.split('\n').length || 0
  if (lines <= 5) return
  
  // Create fold button
  const button = document.createElement('button')
  button.className = 'code-fold-button'
  button.innerHTML = '<i class="ri-arrow-down-s-line"></i>'
  button.title = '折叠代码'
  
  // Insert button
  block.insertBefore(button, block.firstChild)
  
  // Add click handler
  button.addEventListener('click', () => {
    toggleFold(block as HTMLElement, button)
  })
}

function toggleFold(block: HTMLElement, button: HTMLElement): void {
  const pre = block.querySelector('pre')
  if (!pre) return
  
  if (block.classList.contains('folded')) {
    // Unfold
    block.classList.remove('folded')
    button.innerHTML = '<i class="ri-arrow-down-s-line"></i>'
    button.title = '折叠代码'
    
    // Show full content
    const placeholder = block.querySelector('.code-fold-placeholder')
    if (placeholder) {
      placeholder.remove()
    }
    if (pre) {
      pre.style.display = ''
    }
  } else {
    // Fold
    block.classList.add('folded')
    button.innerHTML = '<i class="ri-arrow-right-s-line"></i>'
    button.title = '展开代码'
    
    // Hide content and show placeholder
    const lines = pre.textContent?.split('\n') || []
    const firstLine = lines[0] || ''
    const lastLine = lines[lines.length - 1] || ''
    
    pre.style.display = 'none'
    
    const placeholder = document.createElement('div')
    placeholder.className = 'code-fold-placeholder'
    placeholder.innerHTML = `
      <span class="fold-preview">${firstLine}</span>
      <span class="fold-ellipsis">... ${lines.length} 行代码 ...</span>
      <span class="fold-preview">${lastLine}</span>
    `
    
    block.appendChild(placeholder)
  }
}

function unfoldAllCode(): void {
  document.querySelectorAll('.code-block.folded').forEach((block) => {
    const button = block.querySelector('.code-fold-button') as HTMLElement
    if (button) {
      toggleFold(block as HTMLElement, button)
    }
  })
}