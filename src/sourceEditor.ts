import { getEditor } from './editor'

let sourceEditModal: HTMLElement | null = null

export function initSourceEditor(): void {
  createSourceEditModal()
  addSourceEditListeners()
}

function createSourceEditModal(): void {
  const modal = document.createElement('div')
  modal.id = 'source-edit-modal'
  modal.className = 'source-edit-modal hidden'
  modal.innerHTML = `
    <div class="source-edit-content">
      <div class="source-edit-header">
        <h3>编辑源码</h3>
        <button class="source-edit-close" id="source-edit-close">
          <i class="ri-close-line"></i>
        </button>
      </div>
      <div class="source-edit-body">
        <textarea id="source-edit-textarea" class="source-edit-textarea" placeholder="输入 Markdown 源码..."></textarea>
      </div>
      <div class="source-edit-footer">
        <button id="source-edit-cancel" class="btn btn-secondary">取消</button>
        <button id="source-edit-save" class="btn btn-primary">保存</button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  sourceEditModal = modal
  
  // Add event listeners
  const closeBtn = document.getElementById('source-edit-close')
  const cancelBtn = document.getElementById('source-edit-cancel')
  const saveBtn = document.getElementById('source-edit-save')
  
  closeBtn?.addEventListener('click', closeSourceEditor)
  cancelBtn?.addEventListener('click', closeSourceEditor)
  saveBtn?.addEventListener('click', saveSourceEdit)
  
  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeSourceEditor()
    }
  })
  
  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sourceEditModal && !sourceEditModal.classList.contains('hidden')) {
      closeSourceEditor()
    }
  })
}

function addSourceEditListeners(): void {
  // Listen for Alt+Click on editor elements
  document.addEventListener('click', (e) => {
    if (!e.altKey) return
    
    const target = e.target as HTMLElement
    const editor = getEditor()
    if (!editor) return
    
    // Check if click is within editor
    const editorElement = document.querySelector('.ProseMirror')
    if (!editorElement || !editorElement.contains(target)) return
    
    e.preventDefault()
    e.stopPropagation()
    
    // Find the nearest editable element
    let editableElement = target
    while (editableElement && editableElement !== editorElement) {
      if (isEditableElement(editableElement)) {
        openSourceEditor(editableElement)
        return
      }
      editableElement = editableElement.parentElement as HTMLElement
    }
  }, true)
}

function isEditableElement(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase()
  const editableTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'code', 'img', 'a', 'table', 'tr', 'td', 'th']
  return editableTags.includes(tagName)
}

function getElementMarkdown(element: HTMLElement): string {
  const editor = getEditor()
  if (!editor) return ''
  
  const tagName = element.tagName.toLowerCase()
  
  switch (tagName) {
    case 'img': {
      const img = element as HTMLImageElement
      return `![${img.alt || ''}](${img.src})`
    }
    case 'a': {
      const link = element as HTMLAnchorElement
      return `[${link.textContent || ''}](${link.href})`
    }
    case 'h1':
      return `# ${element.textContent || ''}`
    case 'h2':
      return `## ${element.textContent || ''}`
    case 'h3':
      return `### ${element.textContent || ''}`
    case 'h4':
      return `#### ${element.textContent || ''}`
    case 'h5':
      return `##### ${element.textContent || ''}`
    case 'h6':
      return `###### ${element.textContent || ''}`
    case 'blockquote':
      return `> ${element.textContent || ''}`
    case 'pre':
    case 'code': {
      const codeBlock = element.querySelector('code') || element
      const language = codeBlock.className.match(/language-(\w+)/)?.[1] || ''
      const code = codeBlock.textContent || ''
      if (element.tagName === 'PRE') {
        return `\`\`\`${language}\n${code}\n\`\`\``
      } else {
        return `\`${code}\``
      }
    }
    case 'li': {
      const list = element.parentElement
      if (list?.tagName === 'OL') {
        const index = Array.from(list.children).indexOf(element) + 1
        return `${index}. ${element.textContent || ''}`
      } else {
        return `- ${element.textContent || ''}`
      }
    }
    default:
      return element.textContent || ''
  }
}

let currentEditingElement: HTMLElement | null = null

function openSourceEditor(element: HTMLElement): void {
  if (!sourceEditModal) return
  
  currentEditingElement = element
  const markdown = getElementMarkdown(element)
  
  const textarea = document.getElementById('source-edit-textarea') as HTMLTextAreaElement
  if (textarea) {
    textarea.value = markdown
  }
  
  sourceEditModal.classList.remove('hidden')
  textarea?.focus()
  textarea?.select()
}

function closeSourceEditor(): void {
  if (!sourceEditModal) return
  
  sourceEditModal.classList.add('hidden')
  currentEditingElement = null
  
  const textarea = document.getElementById('source-edit-textarea') as HTMLTextAreaElement
  if (textarea) {
    textarea.value = ''
  }
}

function saveSourceEdit(): void {
  const editor = getEditor()
  if (!editor || !currentEditingElement) return
  
  const textarea = document.getElementById('source-edit-textarea') as HTMLTextAreaElement
  const newMarkdown = textarea?.value || ''
  
  if (!newMarkdown.trim()) {
    closeSourceEditor()
    return
  }
  
  // Get the position of the current element in the editor
  const view = editor.view
  let pos = 0
  let found = false
  
  view.state.doc.descendants((_node, nodePos) => {
    if (found) return false
    
    const dom = view.nodeDOM(nodePos)
    if (dom === currentEditingElement || (dom && dom.contains(currentEditingElement))) {
      pos = nodePos
      found = true
      return false
    }
  })
  
  if (found) {
    // Replace the content at the found position
    try {
      const view = editor.view
      const node = view.state.doc.nodeAt(pos)
      if (node) {
        const from = pos
        const to = pos + node.nodeSize
        editor.chain()
          .focus()
          .setTextSelection({ from, to })
          .deleteRange({ from, to })
          .insertContent(newMarkdown)
          .run()
      }
    } catch (error) {
      // Fallback: replace all content with new markdown
      editor.commands.setContent(newMarkdown)
    }
  }
  
  closeSourceEditor()
}

export function showFullSourceEditor(): void {
  const editor = getEditor()
  if (!editor) return
  
  const modal = document.createElement('div')
  modal.className = 'full-source-modal'
  modal.innerHTML = `
    <div class="full-source-content">
      <div class="full-source-header">
        <h3>Markdown 源码</h3>
        <button class="full-source-close"><i class="ri-close-line"></i></button>
      </div>
      <div class="full-source-body">
        <textarea class="full-source-textarea" id="full-source-textarea"></textarea>
      </div>
      <div class="full-source-footer">
        <button class="btn btn-secondary" id="full-source-cancel">取消</button>
        <button class="btn btn-primary" id="full-source-save">应用更改</button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Get current content as markdown
  const content = editor.storage.markdown.getMarkdown()
  const textarea = document.getElementById('full-source-textarea') as HTMLTextAreaElement
  if (textarea) {
    textarea.value = content
  }
  
  // Event listeners
  const closeBtn = modal.querySelector('.full-source-close') as HTMLElement
  const cancelBtn = document.getElementById('full-source-cancel') as HTMLElement
  const saveBtn = document.getElementById('full-source-save') as HTMLElement
  
  const closeModal = () => {
    modal.remove()
  }
  
  const saveChanges = () => {
    const newContent = textarea.value
    editor.commands.setContent(newContent)
    closeModal()
  }
  
  closeBtn.addEventListener('click', closeModal)
  cancelBtn.addEventListener('click', closeModal)
  saveBtn.addEventListener('click', saveChanges)
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal()
    }
  })
  
  textarea.focus()
}