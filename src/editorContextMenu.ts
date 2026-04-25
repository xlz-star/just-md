import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'

let menuElement: HTMLElement | null = null
let currentView: EditorView | null = null

function createMenu(): HTMLElement {
  const menu = document.createElement('div')
  menu.className = 'editor-context-menu image-context-menu'
  menu.innerHTML = `
    <div class="context-menu-item" data-action="copy">
      <i class="ri-file-copy-line"></i>
      <span>复制</span>
    </div>
    <div class="context-menu-item" data-action="cut">
      <i class="ri-scissors-cut-line"></i>
      <span>剪切</span>
    </div>
    <div class="context-menu-item" data-action="paste">
      <i class="ri-clipboard-line"></i>
      <span>粘贴</span>
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" data-action="select-all">
      <i class="ri-select-all"></i>
      <span>全选</span>
    </div>
  `
  menu.style.display = 'none'
  document.body.appendChild(menu)
  return menu
}

function getMenu(): HTMLElement {
  if (!menuElement) {
    menuElement = createMenu()
  }
  return menuElement
}

function showMenu(x: number, y: number) {
  const menu = getMenu()
  menu.style.display = 'block'
  menu.style.left = `${x}px`
  menu.style.top = `${y}px`

  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      menu.style.left = `${Math.max(8, x - rect.width)}px`
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${Math.max(8, y - rect.height)}px`
    }
  })
}

function hideMenu() {
  if (!menuElement) return
  menuElement.style.display = 'none'
  currentView = null
}

function runCommand(action: string) {
  if (action === 'select-all') {
    currentView?.focus()
    document.execCommand('selectAll')
    hideMenu()
    return
  }

  document.execCommand(action)
  hideMenu()
}

export function shouldHandleEditorContextMenu(target: HTMLElement | null): boolean {
  if (!target) return false
  if (!target.closest('.ProseMirror')) return false
  if (target.closest('.spell-error')) return false
  if (target.closest('img') || target.closest('.image-resize-wrapper')) return false
  return true
}

export function handleEditorContextMenuEvent(view: EditorView, event: MouseEvent): boolean {
  const target = event.target as HTMLElement | null
  if (!shouldHandleEditorContextMenu(target)) {
    return false
  }

  event.preventDefault()
  event.stopPropagation()
  currentView = view
  showMenu(event.clientX, event.clientY)
  return true
}

export function initEditorContextMenu(): void {
  const menu = getMenu()
  menu.addEventListener('click', (event) => {
    const item = (event.target as HTMLElement).closest('.context-menu-item')
    const action = item?.getAttribute('data-action')
    if (!action) return
    runCommand(action)
  })

  document.addEventListener('click', (event) => {
    if (!menuElement || menuElement.style.display !== 'block') return
    const target = event.target as HTMLElement
    if (!target.closest('.editor-context-menu')) {
      hideMenu()
    }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideMenu()
    }
  })

  window.addEventListener('scroll', hideMenu, true)
}

export function resetEditorContextMenu(): void {
  if (menuElement?.parentNode) {
    menuElement.parentNode.removeChild(menuElement)
  }
  menuElement = null
  currentView = null
}

export const EditorContextMenu = Extension.create({
  name: 'editorContextMenu',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('editorContextMenu'),
        props: {
          handleDOMEvents: {
            contextmenu: (view: EditorView, event: Event) => {
              return handleEditorContextMenuEvent(view, event as MouseEvent)
            },
          },
        },
      }),
    ]
  },
})
