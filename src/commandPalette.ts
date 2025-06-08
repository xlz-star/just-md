import { getEditor } from './editor'
import { ImageInsertManager } from './markdownImage'
import { openFile, saveFile, openFolder } from './fileManager'
import { toggleFindReplace } from './findReplace'
import { exportToHTML, exportToPDF } from './export'
import { showThemeSelector } from './themes'
import { toggleSplitView } from './splitView'
import { showPrintPreview } from './printPreview'
import { toggleFocusMode, toggleTypewriterMode } from './focusMode'
import { showFullSourceEditor } from './sourceEditor'
import { insertToc, generateToc } from './tocGenerator'

interface Command {
  id: string
  name: string
  shortcut?: string
  category: string
  action: () => void
}

const commands: Command[] = [
  // File commands
  {
    id: 'file.new',
    name: '新建文件',
    shortcut: 'Ctrl+N',
    category: '文件',
    action: () => {
      // Implement new file
    }
  },
  {
    id: 'file.open',
    name: '打开文件',
    shortcut: 'Ctrl+O',
    category: '文件',
    action: openFile
  },
  {
    id: 'file.openFolder',
    name: '打开文件夹',
    shortcut: 'Ctrl+K',
    category: '文件',
    action: openFolder
  },
  {
    id: 'file.save',
    name: '保存',
    shortcut: 'Ctrl+S',
    category: '文件',
    action: () => saveFile()
  },
  {
    id: 'file.exportHtml',
    name: '导出为 HTML',
    category: '文件',
    action: exportToHTML
  },
  {
    id: 'file.exportPdf',
    name: '导出为 PDF',
    category: '文件',
    action: exportToPDF
  },
  {
    id: 'file.print',
    name: '打印预览',
    shortcut: 'Ctrl+P',
    category: '文件',
    action: showPrintPreview
  },
  
  // Edit commands
  {
    id: 'edit.undo',
    name: '撤销',
    shortcut: 'Ctrl+Z',
    category: '编辑',
    action: () => getEditor()?.commands.undo()
  },
  {
    id: 'edit.redo',
    name: '重做',
    shortcut: 'Ctrl+Y',
    category: '编辑',
    action: () => getEditor()?.commands.redo()
  },
  {
    id: 'edit.find',
    name: '查找',
    shortcut: 'Ctrl+F',
    category: '编辑',
    action: () => toggleFindReplace(false)
  },
  {
    id: 'edit.replace',
    name: '替换',
    shortcut: 'Ctrl+H',
    category: '编辑',
    action: () => toggleFindReplace(true)
  },
  {
    id: 'edit.sourceCode',
    name: '编辑源码',
    shortcut: 'Ctrl+/',
    category: '编辑',
    action: showFullSourceEditor
  },
  
  // Format commands
  {
    id: 'format.bold',
    name: '粗体',
    shortcut: 'Ctrl+B',
    category: '格式',
    action: () => getEditor()?.chain().focus().toggleBold().run()
  },
  {
    id: 'format.italic',
    name: '斜体',
    shortcut: 'Ctrl+I',
    category: '格式',
    action: () => getEditor()?.chain().focus().toggleItalic().run()
  },
  {
    id: 'format.heading1',
    name: '一级标题',
    shortcut: 'Ctrl+1',
    category: '格式',
    action: () => getEditor()?.chain().focus().toggleHeading({ level: 1 }).run()
  },
  {
    id: 'format.heading2',
    name: '二级标题',
    shortcut: 'Ctrl+2',
    category: '格式',
    action: () => getEditor()?.chain().focus().toggleHeading({ level: 2 }).run()
  },
  {
    id: 'format.heading3',
    name: '三级标题',
    shortcut: 'Ctrl+3',
    category: '格式',
    action: () => getEditor()?.chain().focus().toggleHeading({ level: 3 }).run()
  },
  
  // Insert commands
  {
    id: 'insert.link',
    name: '插入链接',
    shortcut: 'Ctrl+K',
    category: '插入',
    action: () => {
      const url = prompt('输入链接地址:')
      if (url) {
        getEditor()?.chain().focus().setLink({ href: url }).run()
      }
    }
  },
  {
    id: 'insert.image',
    name: '插入图片',
    shortcut: 'Ctrl+Shift+I',
    category: '插入',
    action: () => {
      const editor = getEditor()
      if (editor) {
        const imageManager = new ImageInsertManager(editor)
        imageManager.showInsertDialog()
      }
    }
  },
  {
    id: 'insert.table',
    name: '插入表格',
    shortcut: 'Ctrl+T',
    category: '插入',
    action: () => getEditor()?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  },
  {
    id: 'insert.toc',
    name: '插入目录',
    category: '插入',
    action: () => {
      const toc = generateToc()
      if (toc && toc.length > 0) {
        insertToc(toc)
      }
    }
  },
  {
    id: 'insert.mathInline',
    name: '插入行内公式',
    shortcut: 'Ctrl+M',
    category: '插入',
    action: () => getEditor()?.chain().focus().setMathInline('x^2').run()
  },
  {
    id: 'insert.mathBlock',
    name: '插入块级公式',
    shortcut: 'Ctrl+Shift+M',
    category: '插入',
    action: () => getEditor()?.chain().focus().setMathBlock('\\int_{a}^{b} f(x) dx').run()
  },
  {
    id: 'insert.footnote',
    name: '插入脚注',
    category: '插入',
    action: () => getEditor()?.chain().focus().setFootnote('footnote-1', '脚注内容').run()
  },
  
  // View commands
  {
    id: 'view.splitView',
    name: '分屏视图',
    shortcut: 'Ctrl+\\',
    category: '视图',
    action: toggleSplitView
  },
  {
    id: 'view.focusMode',
    name: '专注模式',
    category: '视图',
    action: toggleFocusMode
  },
  {
    id: 'view.typewriterMode',
    name: '打字机模式',
    category: '视图',
    action: toggleTypewriterMode
  },
  {
    id: 'view.theme',
    name: '切换主题',
    category: '视图',
    action: showThemeSelector
  },
  {
    id: 'view.settings',
    name: '设置',
    shortcut: 'Ctrl+,',
    category: '视图',
    action: () => document.getElementById('settings-btn')?.click()
  }
]

let paletteElement: HTMLElement | null = null
let isOpen = false
let selectedIndex = 0
let filteredCommands = commands

export function initCommandPalette(): void {
  createPaletteElement()
  
  // Keyboard shortcut to open
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
      e.preventDefault()
      toggleCommandPalette()
    }
  })
}

function createPaletteElement(): void {
  const palette = document.createElement('div')
  palette.className = 'command-palette hidden'
  palette.innerHTML = `
    <div class="command-palette-backdrop"></div>
    <div class="command-palette-modal">
      <input type="text" class="command-palette-input" placeholder="输入命令或搜索..." />
      <div class="command-palette-results">
        <!-- Results will be dynamically added -->
      </div>
    </div>
  `
  
  document.body.appendChild(palette)
  paletteElement = palette
  
  // Event listeners
  const input = palette.querySelector('.command-palette-input') as HTMLInputElement
  const backdrop = palette.querySelector('.command-palette-backdrop')
  
  input?.addEventListener('input', handleSearch)
  input?.addEventListener('keydown', handleKeyDown)
  backdrop?.addEventListener('click', closeCommandPalette)
}

function toggleCommandPalette(): void {
  if (isOpen) {
    closeCommandPalette()
  } else {
    openCommandPalette()
  }
}

function openCommandPalette(): void {
  if (!paletteElement) return
  
  isOpen = true
  paletteElement.classList.remove('hidden')
  
  const input = paletteElement.querySelector('.command-palette-input') as HTMLInputElement
  input?.focus()
  input?.select()
  
  // Reset state
  selectedIndex = 0
  filteredCommands = commands
  renderResults()
}

function closeCommandPalette(): void {
  if (!paletteElement) return
  
  isOpen = false
  paletteElement.classList.add('hidden')
  
  const input = paletteElement.querySelector('.command-palette-input') as HTMLInputElement
  if (input) {
    input.value = ''
  }
}

function handleSearch(e: Event): void {
  const input = e.target as HTMLInputElement
  const query = input.value.toLowerCase()
  
  if (!query) {
    filteredCommands = commands
  } else {
    filteredCommands = commands.filter(cmd => 
      cmd.name.toLowerCase().includes(query) ||
      cmd.category.toLowerCase().includes(query) ||
      cmd.shortcut?.toLowerCase().includes(query)
    )
  }
  
  selectedIndex = 0
  renderResults()
}

function handleKeyDown(e: KeyboardEvent): void {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1)
      renderResults()
      break
      
    case 'ArrowUp':
      e.preventDefault()
      selectedIndex = Math.max(selectedIndex - 1, 0)
      renderResults()
      break
      
    case 'Enter':
      e.preventDefault()
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex])
      }
      break
      
    case 'Escape':
      e.preventDefault()
      closeCommandPalette()
      break
  }
}

function renderResults(): void {
  if (!paletteElement) return
  
  const resultsContainer = paletteElement.querySelector('.command-palette-results')
  if (!resultsContainer) return
  
  // Group commands by category
  const grouped = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = []
    acc[cmd.category].push(cmd)
    return acc
  }, {} as Record<string, Command[]>)
  
  let html = ''
  let index = 0
  
  for (const [category, cmds] of Object.entries(grouped)) {
    html += `<div class="command-category">${category}</div>`
    
    for (const cmd of cmds) {
      const isSelected = index === selectedIndex
      html += `
        <div class="command-item ${isSelected ? 'selected' : ''}" data-index="${index}">
          <span class="command-name">${cmd.name}</span>
          ${cmd.shortcut ? `<span class="command-shortcut">${cmd.shortcut}</span>` : ''}
        </div>
      `
      index++
    }
  }
  
  resultsContainer.innerHTML = html
  
  // Add click handlers
  resultsContainer.querySelectorAll('.command-item').forEach((item, i) => {
    item.addEventListener('click', () => {
      executeCommand(filteredCommands[i])
    })
  })
  
  // Scroll selected item into view
  const selectedItem = resultsContainer.querySelector('.command-item.selected')
  selectedItem?.scrollIntoView({ block: 'nearest' })
}

function executeCommand(command: Command): void {
  closeCommandPalette()
  command.action()
}

// Add styles
const style = document.createElement('style')
style.textContent = `
  .command-palette {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10000;
  }
  
  .command-palette.hidden {
    display: none;
  }
  
  .command-palette-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
  }
  
  .command-palette-modal {
    position: absolute;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    max-width: 600px;
    background: var(--bg-primary);
    border-radius: 8px;
    box-shadow: var(--shadow-xl);
    overflow: hidden;
    animation: slideInDown 0.2s ease;
  }
  
  .command-palette-input {
    width: 100%;
    padding: var(--spacing-md);
    border: none;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 16px;
    outline: none;
    border-bottom: 1px solid var(--border-subtle);
  }
  
  .command-palette-results {
    max-height: 400px;
    overflow-y: auto;
    padding: var(--spacing-sm);
  }
  
  .command-category {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-xs);
    text-transform: uppercase;
  }
  
  .command-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    margin: 2px 0;
    border-radius: 4px;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .command-item:hover {
    background: var(--bg-hover);
  }
  
  .command-item.selected {
    background: var(--accent-subtle);
    color: var(--accent-primary);
  }
  
  .command-name {
    font-size: 14px;
  }
  
  .command-shortcut {
    font-size: 12px;
    color: var(--text-tertiary);
    font-family: var(--font-mono);
  }
  
  @keyframes slideInDown {
    from {
      transform: translateX(-50%) translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
`
document.head.appendChild(style)