import { Node, mergeAttributes } from '@tiptap/core'

export interface FootnoteOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnote: {
      setFootnote: (id: string, content: string) => ReturnType
    }
  }
}

let footnoteCounter = 0
const footnotes: Map<string, { id: string, content: string, number: number }> = new Map()

export const Footnote = Node.create<FootnoteOptions>({
  name: 'footnote',

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
      id: {
        default: '',
      },
      content: {
        default: '',
      },
      number: {
        default: 0,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'sup[data-footnote]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-footnote': node.attrs.id,
      class: 'footnote-ref',
    })
    return ['sup', attrs, `[${node.attrs.number}]`]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const sup = document.createElement('sup')
      sup.className = 'footnote-ref'
      sup.setAttribute('data-footnote', node.attrs.id)
      sup.textContent = `[${node.attrs.number}]`
      
      // Add click handler
      sup.addEventListener('click', () => {
        if (editor.isEditable) {
          showFootnoteTooltip(sup, node.attrs.content)
        }
      })
      
      return {
        dom: sup,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) {
            return false
          }
          node = updatedNode
          sup.textContent = `[${node.attrs.number}]`
          sup.setAttribute('data-footnote', node.attrs.id)
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      setFootnote: (id: string, content: string) => ({ commands, state }) => {
        // Generate unique ID if not provided
        const footnoteId = id || `footnote-${Date.now()}`
        
        // Check if footnote already exists
        let footnoteData = footnotes.get(footnoteId)
        if (!footnoteData) {
          footnoteCounter++
          footnoteData = {
            id: footnoteId,
            content,
            number: footnoteCounter,
          }
          footnotes.set(footnoteId, footnoteData)
        }
        
        return commands.insertContent({
          type: this.name,
          attrs: {
            id: footnoteId,
            content,
            number: footnoteData.number,
          },
        })
      },
    }
  },
})

function showFootnoteTooltip(element: HTMLElement, content: string): void {
  // Remove existing tooltip
  const existing = document.querySelector('.footnote-tooltip')
  if (existing) {
    existing.remove()
  }
  
  const tooltip = document.createElement('div')
  tooltip.className = 'footnote-tooltip'
  tooltip.textContent = content
  
  document.body.appendChild(tooltip)
  
  // Position tooltip
  const rect = element.getBoundingClientRect()
  tooltip.style.left = `${rect.left}px`
  tooltip.style.top = `${rect.bottom + 5}px`
  
  // Remove on click outside
  const removeTooltip = (e: MouseEvent) => {
    if (!tooltip.contains(e.target as Node) && e.target !== element) {
      tooltip.remove()
      document.removeEventListener('click', removeTooltip)
    }
  }
  
  setTimeout(() => {
    document.addEventListener('click', removeTooltip)
  }, 0)
}

export function getFootnotes(): Array<{ id: string, content: string, number: number }> {
  return Array.from(footnotes.values()).sort((a, b) => a.number - b.number)
}

export function clearFootnotes(): void {
  footnotes.clear()
  footnoteCounter = 0
}