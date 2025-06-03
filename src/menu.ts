import { exit } from '@tauri-apps/plugin-process'
import { openFile, saveFile, openFolder } from './fileManager'
import { getEditor } from './editor'

// 初始化菜单
export function initMenus(): void {
  // 文件菜单项
  const openFileItem = document.getElementById('open-file')
  const openFolderItem = document.getElementById('open-folder')
  const saveFileItem = document.getElementById('save-file')
  const exitAppItem = document.getElementById('exit-app')
  
  // 编辑菜单项
  const undoItem = document.getElementById('undo')
  const redoItem = document.getElementById('redo')
  const insertTableItem = document.getElementById('insert-table')
  
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
  
  insertTableItem?.addEventListener('click', () => {
    const editor = getEditor()
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  })
  
  // 夜间模式切换事件
  themeToggleBtn?.addEventListener('click', toggleDarkMode)
  
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