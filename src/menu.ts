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
  })
} 