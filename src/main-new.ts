import { initEditor, initDragAndDrop, setEditorContent, setCurrentFile, getEditor } from './editor'
import { initOutlineFeature, resetOutlineState, updateOutlineIfNeeded } from './outline'
import { initKeyboardShortcuts } from './menu'
import { handleFileDrop, saveFile, openFile, generateId } from './fileManager'
import { initFindReplace } from './findReplace'
import { initWordCount } from './wordCount'
import { initThemes } from './themes'
import { initAutoSave } from './autoSave'
import { initCodeFolding } from './codeFolding'
import { initPrintPreview } from './printPreview'
import { initTocGenerator } from './tocGenerator'
import { initFocusMode } from './focusMode'
import { initSettings } from './settings'
import { initSourceEditor } from './sourceEditor'
import { initLayoutManager, updateSaveStatus } from './layoutManager'
import { initTabManager, createNewTab, addTab } from './tabManager'
import { initCommandPalette } from './commandPalette'
import { OpenedFile } from './types'
import { invoke } from '@tauri-apps/api/core'
import './styles.css'

// Application entry point
async function main() {
  try {
    // Initialize layout manager first
    initLayoutManager()
    
    // Initialize tab manager
    initTabManager()
    
    // Initialize editor with content change callback
    initEditor('', (isDirty: boolean) => {
      updateSaveStatus(!isDirty)
    })

    // Initialize drag and drop
    initDragAndDrop(handleFileDrop)

    // Initialize outline feature
    initOutlineFeature()

    // Initialize keyboard shortcuts
    initKeyboardShortcuts()
    
    // Initialize find/replace
    initFindReplace()
    
    // Initialize themes
    initThemes()
    
    // Initialize auto save
    initAutoSave()
    
    // Initialize code folding
    initCodeFolding()
    
    // Initialize print preview
    initPrintPreview()
    
    // Initialize TOC generator
    initTocGenerator()
    
    // Initialize focus mode
    initFocusMode()
    
    // Initialize settings
    initSettings()
    
    // Initialize source editor
    initSourceEditor()
    
    // Initialize command palette
    initCommandPalette()
    
    // Initialize word count (delayed)
    setTimeout(() => {
      initWordCount()
    }, 100)

    // Setup title bar controls
    setupTitleBarControls()
    
    // Setup FAB (Floating Action Button)
    setupFAB()
    
    // Handle window close event
    window.addEventListener('beforeunload', () => {
      saveFile().catch((err: Error) => console.error('Failed to save:', err))
    })

    // Check for initial file from command line
    try {
      const initialFile = await invoke<string | null>('get_initial_file')
      if (initialFile) {
        const pathParts = initialFile.split(/[/\\]/)
        const fileName = pathParts[pathParts.length - 1]
        
        try {
          const htmlContent = await invoke<string>('read_markdown', { path: initialFile })
          const markdownContent = await invoke<string>('get_raw_markdown', { path: initialFile })
          
          if (htmlContent && markdownContent) {
            const file: OpenedFile = {
              id: generateId(),
              path: initialFile,
              name: fileName,
              content: markdownContent,
              isDirty: false
            }
            
            addTab(file, true)
            setCurrentFile(file.path, file.name)
            resetOutlineState()
            setEditorContent(htmlContent, markdownContent)
            updateOutlineIfNeeded()
          }
        } catch (err) {
          console.error('Failed to read initial file:', err)
        }
      } else {
        // Create new empty tab
        createNewTab()
      }
    } catch (err) {
      console.error('Failed to get initial file:', err)
      createNewTab()
    }

    console.log('Application initialized successfully')
  } catch (error) {
    console.error('Application initialization failed:', error)
  }
}

function setupTitleBarControls(): void {
  // Sidebar toggle
  const sidebarToggle = document.getElementById('sidebar-toggle')
  sidebarToggle?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar')
    sidebar?.classList.toggle('collapsed')
  })
  
  // New file
  const newFileBtn = document.getElementById('new-file-btn')
  newFileBtn?.addEventListener('click', () => {
    createNewTab()
  })
  
  // Open file
  const openFileBtn = document.getElementById('open-file-btn')
  openFileBtn?.addEventListener('click', () => {
    openFile()
  })
  
  // Save file
  const saveFileBtn = document.getElementById('save-file-btn')
  saveFileBtn?.addEventListener('click', () => {
    saveFile()
  })
  
  // Search
  const searchBtn = document.getElementById('search-btn')
  searchBtn?.addEventListener('click', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true
    })
    document.dispatchEvent(event)
  })
  
  // View source
  const viewSourceBtn = document.getElementById('view-source-btn')
  viewSourceBtn?.addEventListener('click', () => {
    const event = new KeyboardEvent('keydown', {
      key: '/',
      ctrlKey: true
    })
    document.dispatchEvent(event)
  })
}

function setupFAB(): void {
  const fab = document.getElementById('fab')
  if (!fab) return
  
  let menu: HTMLElement | null = null
  
  fab.addEventListener('click', () => {
    if (menu) {
      menu.remove()
      menu = null
      return
    }
    
    menu = document.createElement('div')
    menu.className = 'fab-menu'
    menu.innerHTML = `
      <button class="fab-menu-item" data-action="heading">
        <i class="ri-h-1"></i>
        <span>标题</span>
      </button>
      <button class="fab-menu-item" data-action="bold">
        <i class="ri-bold"></i>
        <span>粗体</span>
      </button>
      <button class="fab-menu-item" data-action="italic">
        <i class="ri-italic"></i>
        <span>斜体</span>
      </button>
      <button class="fab-menu-item" data-action="link">
        <i class="ri-link"></i>
        <span>链接</span>
      </button>
      <button class="fab-menu-item" data-action="image">
        <i class="ri-image-line"></i>
        <span>图片</span>
      </button>
      <button class="fab-menu-item" data-action="table">
        <i class="ri-table-line"></i>
        <span>表格</span>
      </button>
    `
    
    document.body.appendChild(menu)
    
    // Position menu
    const fabRect = fab.getBoundingClientRect()
    menu.style.position = 'fixed'
    menu.style.bottom = `${window.innerHeight - fabRect.top + 10}px`
    menu.style.right = '24px'
    
    // Handle menu item clicks
    menu.querySelectorAll('.fab-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action')
        handleFABAction(action)
        menu?.remove()
        menu = null
      })
    })
    
    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', closeFABMenu)
    }, 0)
    
    function closeFABMenu(e: MouseEvent): void {
      if (!menu?.contains(e.target as Node) && e.target !== fab) {
        menu?.remove()
        menu = null
        document.removeEventListener('click', closeFABMenu)
      }
    }
  })
}

function handleFABAction(action: string | null): void {
  const editor = getEditor()
  if (!editor || !action) return
  
  switch (action) {
    case 'heading':
      editor.chain().focus().toggleHeading({ level: 2 }).run()
      break
    case 'bold':
      editor.chain().focus().toggleBold().run()
      break
    case 'italic':
      editor.chain().focus().toggleItalic().run()
      break
    case 'link':
      const url = prompt('输入链接地址:')
      if (url) {
        editor.chain().focus().setLink({ href: url }).run()
      }
      break
    case 'table':
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      break
  }
}

// Add FAB menu styles
const fabStyles = document.createElement('style')
fabStyles.textContent = `
  .fab-menu {
    background: var(--bg-primary);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    box-shadow: var(--shadow-xl);
    padding: var(--spacing-sm);
    z-index: 101;
    animation: fadeInUp 0.2s ease;
  }
  
  .fab-menu-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 14px;
    cursor: pointer;
    border-radius: 4px;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }
  
  .fab-menu-item:hover {
    background: var(--bg-hover);
  }
  
  .fab-menu-item i {
    font-size: 18px;
    width: 24px;
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`
document.head.appendChild(fabStyles)

// Start the application
main().catch(console.error)