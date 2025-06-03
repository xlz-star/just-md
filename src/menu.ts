import { exit } from '@tauri-apps/plugin-process'
import { openFile, saveFile, openFolder } from './fileManager'
import { getEditor } from './editor'
import { toggleFindReplace } from './findReplace'
import { exportToHTML, exportToPDF } from './export'
import { showThemeSelector } from './themes'
import { toggleSplitView } from './splitView'
import { showPrintPreview } from './printPreview'

// 初始化菜单
export function initMenus(): void {
  // 文件菜单项
  const openFileItem = document.getElementById('open-file')
  const openFolderItem = document.getElementById('open-folder')
  const saveFileItem = document.getElementById('save-file')
  const exportHtmlItem = document.getElementById('export-html')
  const exportPdfItem = document.getElementById('export-pdf')
  const printPreviewItem = document.getElementById('print-preview')
  const exitAppItem = document.getElementById('exit-app')
  
  // 编辑菜单项
  const undoItem = document.getElementById('undo')
  const redoItem = document.getElementById('redo')
  const findItem = document.getElementById('find')
  const findReplaceItem = document.getElementById('find-replace')
  const insertTableItem = document.getElementById('insert-table')
  const insertMathInlineItem = document.getElementById('insert-math-inline')
  const insertMathBlockItem = document.getElementById('insert-math-block')
  
  // 视图菜单项
  const toggleSplitViewItem = document.getElementById('toggle-split-view')
  const selectThemeItem = document.getElementById('select-theme')
  
  // 夜间模式切换按钮
  const themeToggleBtn = document.getElementById('theme-toggle-btn')
  
  // 菜单展开/关闭
  const allMenus = document.querySelectorAll('.menu-item')
  
  // 点击菜单项时展开下拉菜单
  allMenus.forEach(menu => {
    menu.addEventListener('click', () => {
      // 关闭其他菜单
      allMenus.forEach(m => {
        if (m !== menu) {
          m.classList.remove('active')
        }
      })
      
      // 切换当前菜单状态
      menu.classList.toggle('active')
    })
  })
  
  // 点击菜单项外区域关闭菜单
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.menu-item')) {
      allMenus.forEach(menu => {
        menu.classList.remove('active')
      })
    }
  })
  
  // 阻止下拉菜单项点击事件冒泡到菜单项
  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      
      // 点击后关闭菜单
      allMenus.forEach(menu => {
        menu.classList.remove('active')
      })
    })
  })
  
  // 文件菜单项事件
  openFileItem?.addEventListener('click', openFile)
  openFolderItem?.addEventListener('click', openFolder)
  saveFileItem?.addEventListener('click', saveFile)
  exportHtmlItem?.addEventListener('click', exportToHTML)
  exportPdfItem?.addEventListener('click', exportToPDF)
  printPreviewItem?.addEventListener('click', showPrintPreview)
  exitAppItem?.addEventListener('click', () => {
    exit(0)
  })
  
  // 编辑菜单项事件
  undoItem?.addEventListener('click', () => {
    const editor = getEditor()
    editor?.commands.undo()
  })
  
  redoItem?.addEventListener('click', () => {
    const editor = getEditor()
    editor?.commands.redo()
  })
  
  findItem?.addEventListener('click', () => {
    toggleFindReplace(false)
  })
  
  findReplaceItem?.addEventListener('click', () => {
    toggleFindReplace(true)
  })
  
  insertTableItem?.addEventListener('click', () => {
    const editor = getEditor()
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  })
  
  insertMathInlineItem?.addEventListener('click', () => {
    const editor = getEditor()
    editor?.chain().focus().setMathInline('x^2 + y^2 = z^2').run()
  })
  
  insertMathBlockItem?.addEventListener('click', () => {
    const editor = getEditor()
    editor?.chain().focus().setMathBlock('\\int_{a}^{b} f(x) dx = F(b) - F(a)').run()
  })
  
  // 视图菜单项事件
  toggleSplitViewItem?.addEventListener('click', toggleSplitView)
  selectThemeItem?.addEventListener('click', showThemeSelector)
  
  // 夜间模式切换事件
  themeToggleBtn?.addEventListener('click', showThemeSelector)
  
  // 初始化夜间模式状态
  initDarkMode()
}

// 初始化键盘快捷键
export function initKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Ctrl+S 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      saveFile()
    }
    
    // Ctrl+O 打开文件
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault()
      openFile()
    }
    
    // Ctrl+K 打开文件夹
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      openFolder()
    }
    
    // Ctrl+T 插入表格
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault()
      const editor = getEditor()
      editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }
    
    // Ctrl+\ 切换分屏视图
    if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
      e.preventDefault()
      toggleSplitView()
    }
    
    // Ctrl+M 插入行内公式
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'm') {
      e.preventDefault()
      const editor = getEditor()
      editor?.chain().focus().setMathInline('x^2 + y^2 = z^2').run()
    }
    
    // Ctrl+Shift+M 插入块级公式
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
      e.preventDefault()
      const editor = getEditor()
      editor?.chain().focus().setMathBlock('\\int_{a}^{b} f(x) dx = F(b) - F(a)').run()
    }
  })
}

// 初始化夜间模式
function initDarkMode(): void {
  // 从本地存储中获取夜间模式设置
  const isDarkMode = localStorage.getItem('darkMode') === 'true'
  
  // 应用夜间模式设置
  if (isDarkMode) {
    document.body.classList.add('dark-mode')
    updateDarkModeIcon(true)
  } else {
    document.body.classList.remove('dark-mode')
    updateDarkModeIcon(false)
  }
}

// 切换夜间模式
function toggleDarkMode(): void {
  const isDarkMode = document.body.classList.contains('dark-mode')
  
  if (isDarkMode) {
    // 切换到亮色模式
    document.body.classList.remove('dark-mode')
    localStorage.setItem('darkMode', 'false')
    updateDarkModeIcon(false)
  } else {
    // 切换到夜间模式
    document.body.classList.add('dark-mode')
    localStorage.setItem('darkMode', 'true')
    updateDarkModeIcon(true)
  }
}

// 更新夜间模式图标
function updateDarkModeIcon(isDarkMode: boolean): void {
  const themeToggleBtn = document.getElementById('theme-toggle-btn')
  const icon = themeToggleBtn?.querySelector('i')
  
  if (icon) {
    if (isDarkMode) {
      icon.className = 'ri-sun-line' // 夜间模式下显示太阳图标
    } else {
      icon.className = 'ri-moon-line' // 亮色模式下显示月亮图标
    }
  }
} 