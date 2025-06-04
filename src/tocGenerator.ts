import { getEditor } from './editor'

interface TocItem {
  text: string
  level: number
  id: string
}

export function initTocGenerator(): void {
  createTocButton()
}

function createTocButton(): void {
  const button = document.createElement('button')
  button.id = 'toc-btn'
  button.className = 'floating-btn toc-btn'
  button.title = '生成目录'
  button.innerHTML = '<i class="ri-list-ordered"></i>'
  
  document.getElementById('app')?.appendChild(button)
  
  button.addEventListener('click', showTocDialog)
}

function showTocDialog(): void {
  const toc = generateToc()
  
  const modal = document.createElement('div')
  modal.className = 'toc-modal'
  modal.innerHTML = `
    <div class="toc-modal-content">
      <div class="toc-modal-header">
        <h3>文档目录</h3>
        <button class="toc-modal-close"><i class="ri-close-line"></i></button>
      </div>
      <div class="toc-modal-body">
        <div class="toc-list">
          ${toc.map(item => `
            <div class="toc-item toc-level-${item.level}" data-id="${item.id}">
              <span class="toc-number">${item.level}.</span>
              <span class="toc-text">${item.text}</span>
            </div>
          `).join('')}
        </div>
        <div class="toc-actions">
          <button class="toc-insert-btn">在光标处插入目录</button>
          <button class="toc-copy-btn">复制目录</button>
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Event handlers
  const closeBtn = modal.querySelector('.toc-modal-close')
  closeBtn?.addEventListener('click', () => modal.remove())
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
  
  // Click on TOC item to jump
  modal.querySelectorAll('.toc-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id')
      if (id) {
        jumpToHeading(id)
        modal.remove()
      }
    })
  })
  
  // Insert TOC
  const insertBtn = modal.querySelector('.toc-insert-btn')
  insertBtn?.addEventListener('click', () => {
    insertToc(toc)
    modal.remove()
  })
  
  // Copy TOC
  const copyBtn = modal.querySelector('.toc-copy-btn')
  copyBtn?.addEventListener('click', () => {
    copyTocToClipboard(toc)
    copyBtn.textContent = '已复制!'
    setTimeout(() => {
      copyBtn.textContent = '复制目录'
    }, 2000)
  })
}

function generateToc(): TocItem[] {
  const editor = getEditor()
  if (!editor) return []
  
  const toc: TocItem[] = []
  const doc = editor.state.doc
  
  doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const level = node.attrs.level
      const text = node.textContent
      const id = `heading-${pos}`
      
      toc.push({ text, level, id })
    }
  })
  
  return toc
}

function jumpToHeading(id: string): void {
  const editor = getEditor()
  if (!editor) return
  
  const pos = parseInt(id.replace('heading-', ''))
  editor.commands.focus()
  editor.commands.setTextSelection(pos)
  
  // Scroll into view
  const { node } = editor.view.domAtPos(pos)
  if (node && node.nodeType === Node.ELEMENT_NODE) {
    (node as Element).scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function insertToc(toc: TocItem[]): void {
  const editor = getEditor()
  if (!editor) return
  
  const tocHtml = `<div class="toc-block"><h2>目录</h2><ul>${
    toc.map(item => `<li class="toc-level-${item.level}">${item.text}</li>`).join('')
  }</ul></div>`
  
  editor.commands.insertContent(tocHtml)
}

function copyTocToClipboard(toc: TocItem[]): void {
  const tocText = toc.map(item => {
    const indent = '  '.repeat(item.level - 1)
    return `${indent}- ${item.text}`
  }).join('\n')
  
  navigator.clipboard.writeText(tocText)
}