import { Node, mergeAttributes } from '@tiptap/core'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'

// Declare katex as any to avoid TypeScript errors
declare const katex: any

export interface MathOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    math: {
      setMathInline: (content: string) => ReturnType
      setMathBlock: (content: string) => ReturnType
    }
  }
}

// Inline math node
export const MathInline = Node.create<MathOptions>({
  name: 'mathInline',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      content: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math-inline"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'math-inline' })]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('span')
      dom.classList.add('math-inline')
      dom.setAttribute('data-type', 'math-inline')
      
      const render = () => {
        dom.innerHTML = ''
        try {
          katex.render(node.attrs.content || '', dom, {
            throwOnError: false,
            displayMode: false,
          })
        } catch (e) {
          dom.textContent = node.attrs.content || ''
          dom.classList.add('math-error')
        }
      }
      
      render()
      
      // Add click handler to edit
      dom.addEventListener('click', () => {
        if (editor.isEditable) {
          const pos = getPos()
          if (typeof pos === 'number') {
            editor.chain().focus().setTextSelection(pos).run()
            showMathEditor(editor, node.attrs.content, false, (newContent) => {
              editor.chain().focus().command(({ tr }) => {
                tr.setNodeMarkup(pos, undefined, { content: newContent })
                return true
              }).run()
            })
          }
        }
      })
      
      return {
        dom,
        update: (updatedNode: ProseMirrorNode) => {
          if (updatedNode.type !== node.type) {
            return false
          }
          node = updatedNode
          render()
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      setMathInline: (content: string) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { content },
        })
      },
    }
  },
})

// Block math node
export const MathBlock = Node.create<MathOptions>({
  name: 'mathBlock',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      content: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="math-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'math-block' })]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div')
      dom.classList.add('math-block')
      dom.setAttribute('data-type', 'math-block')
      
      const render = () => {
        dom.innerHTML = ''
        try {
          katex.render(node.attrs.content || '', dom, {
            throwOnError: false,
            displayMode: true,
          })
        } catch (e) {
          dom.textContent = node.attrs.content || ''
          dom.classList.add('math-error')
        }
      }
      
      render()
      
      // Add click handler to edit
      dom.addEventListener('click', () => {
        if (editor.isEditable) {
          const pos = getPos()
          if (typeof pos === 'number') {
            editor.chain().focus().setTextSelection(pos).run()
            showMathEditor(editor, node.attrs.content, true, (newContent) => {
              editor.chain().focus().command(({ tr }) => {
                tr.setNodeMarkup(pos, undefined, { content: newContent })
                return true
              }).run()
            })
          }
        }
      })
      
      return {
        dom,
        update: (updatedNode: ProseMirrorNode) => {
          if (updatedNode.type !== node.type) {
            return false
          }
          node = updatedNode
          render()
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      setMathBlock: (content: string) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { content },
        })
      },
    }
  },
})

// Math editor dialog
function showMathEditor(_editor: any, initialContent: string, isBlock: boolean, onSave: (content: string) => void): void {
  const modal = document.createElement('div')
  modal.className = 'math-editor-modal'
  modal.innerHTML = `
    <div class="math-editor-content">
      <div class="math-editor-header">
        <h3>${isBlock ? '块级公式' : '行内公式'}</h3>
        <button class="math-editor-close"><i class="ri-close-line"></i></button>
      </div>
      <div class="math-editor-body">
        <textarea class="math-editor-input" placeholder="输入LaTeX公式，例如: x^2 + y^2 = z^2">${initialContent}</textarea>
        <div class="math-editor-preview"></div>
      </div>
      <div class="math-editor-footer">
        <button class="math-editor-cancel">取消</button>
        <button class="math-editor-save">保存</button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  const input = modal.querySelector('.math-editor-input') as HTMLTextAreaElement
  const preview = modal.querySelector('.math-editor-preview') as HTMLElement
  const closeBtn = modal.querySelector('.math-editor-close') as HTMLElement
  const cancelBtn = modal.querySelector('.math-editor-cancel') as HTMLElement
  const saveBtn = modal.querySelector('.math-editor-save') as HTMLElement
  
  // Update preview
  const updatePreview = () => {
    try {
      katex.render(input.value || '', preview, {
        throwOnError: false,
        displayMode: isBlock,
      })
    } catch (e) {
      preview.innerHTML = '<span class="math-error">Invalid LaTeX</span>'
    }
  }
  
  // Initial preview
  updatePreview()
  
  // Event listeners
  input.addEventListener('input', updatePreview)
  
  const close = () => modal.remove()
  
  closeBtn.addEventListener('click', close)
  cancelBtn.addEventListener('click', close)
  
  saveBtn.addEventListener('click', () => {
    onSave(input.value)
    close()
  })
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      close()
    }
  })
  
  // Focus input
  setTimeout(() => input.focus(), 0)
}