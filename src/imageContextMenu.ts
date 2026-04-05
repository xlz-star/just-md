import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'

interface ImageContextMenuState {
  visible: boolean
  x: number
  y: number
  imgElement: HTMLImageElement | null
}

let menuState: ImageContextMenuState = {
  visible: false,
  x: 0,
  y: 0,
  imgElement: null,
}

let menuElement: HTMLElement | null = null

function createContextMenu(): HTMLElement {
  const menu = document.createElement('div')
  menu.className = 'image-context-menu'
  menu.innerHTML = `
    <div class="context-menu-item" data-action="zoom-in">
      <i class="ri-zoom-in-line"></i>
      <span>放大 (25%)</span>
    </div>
    <div class="context-menu-item" data-action="zoom-out">
      <i class="ri-zoom-out-line"></i>
      <span>缩小 (25%)</span>
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" data-action="reset-size">
      <i class="ri-fullscreen-line"></i>
      <span>原始大小</span>
    </div>
    <div class="context-menu-item" data-action="fit-width">
      <i class="ri-expand-left-right-line"></i>
      <span>适应宽度</span>
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" data-action="copy-image">
      <i class="ri-image-copy-line"></i>
      <span>复制图片</span>
    </div>
    <div class="context-menu-item" data-action="delete-image">
      <i class="ri-delete-bin-line"></i>
      <span>删除</span>
    </div>
  `
  menu.style.display = 'none'
  document.body.appendChild(menu)
  return menu
}

function showContextMenu(x: number, y: number): void {
  if (!menuElement) {
    menuElement = createContextMenu()
  }

  menuElement.style.display = 'block'
  menuElement.style.left = `${x}px`
  menuElement.style.top = `${y}px`

  // 确保菜单不超出视口
  requestAnimationFrame(() => {
    const rect = menuElement!.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (rect.right > viewportWidth) {
      menuElement!.style.left = `${x - rect.width}px`
    }
    if (rect.bottom > viewportHeight) {
      menuElement!.style.top = `${y - rect.height}px`
    }
  })

  menuState.visible = true
}

function hideContextMenu(): void {
  if (menuElement) {
    menuElement.style.display = 'none'
  }
  menuState.visible = false
  menuState.imgElement = null
}

function setImageScale(img: HTMLImageElement, scale: number): void {
  const wrapper = img.closest('.image-resize-wrapper') || img.parentElement
  if (wrapper) {
    ;(wrapper as HTMLElement).style.transform = `scale(${scale})`
    ;(wrapper as HTMLElement).style.transformOrigin = 'top left'
    ;(wrapper as HTMLElement).dataset.scale = scale.toString()
  } else {
    img.style.transform = `scale(${scale})`
    img.style.transformOrigin = 'top left'
    ;(img as HTMLElement).dataset.scale = scale.toString()
  }
}

function getImageScale(img: HTMLImageElement): number {
  const wrapper = img.closest('.image-resize-wrapper') || img.parentElement
  if (wrapper) {
    return parseFloat((wrapper as HTMLElement).dataset.scale || '1')
  }
  return parseFloat((img as HTMLElement).dataset.scale || '1') || 1
}

async function copyImageToClipboard(img: HTMLImageElement): Promise<void> {
  try {
    const response = await fetch(img.src)
    const blob = await response.blob()
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ])
  } catch {
    // 降级方案：尝试通过 canvas 复制
    try {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        canvas.toBlob(async (blob) => {
          if (blob) {
            await navigator.clipboard.write([
              new ClipboardItem({ [blob.type]: blob }),
            ])
          }
        })
      }
    } catch {
      console.warn('无法复制图片到剪贴板')
    }
  }
}

export const ImageContextMenu = Extension.create({
  name: 'imageContextMenu',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('imageContextMenu'),
        props: {
          handleDOMEvents: {
            contextmenu: (view: EditorView, event: Event) => {
              const mouseEvent = event as MouseEvent
              const target = mouseEvent.target as HTMLElement

              // 检查是否右键点击了图片
              const img = target.closest('img.markdown-image') || target.closest('img')
              if (!img) return false

              // 检查是否在编辑器内
              const editorEl = view.dom.closest('.ProseMirror')
              if (!editorEl || !editorEl.contains(img)) return false

              event.preventDefault()
              event.stopPropagation()

              menuState.imgElement = img as HTMLImageElement
              showContextMenu(mouseEvent.clientX, mouseEvent.clientY)

              return true
            },
          },
        },
      }),
    ]
  },
})

// 初始化右键菜单事件
export function initImageContextMenu(): void {
  // 延迟创建菜单，确保 DOM 已加载
  setTimeout(() => {
    if (!menuElement) {
      menuElement = createContextMenu()
    }

    // 菜单项点击事件
    menuElement.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('.context-menu-item')
      if (!item) return

      const action = item.getAttribute('data-action')
      const img = menuState.imgElement
      if (!img) return

      switch (action) {
        case 'zoom-in': {
          const currentScale = getImageScale(img)
          setImageScale(img, Math.min(currentScale + 0.25, 3))
          break
        }
        case 'zoom-out': {
          const currentScale = getImageScale(img)
          setImageScale(img, Math.max(currentScale - 0.25, 0.25))
          break
        }
        case 'reset-size':
          setImageScale(img, 1)
          break
        case 'fit-width': {
          const editorEl = document.querySelector('.ProseMirror') as HTMLElement
          if (editorEl) {
            const editorWidth = editorEl.clientWidth - 40
            const naturalWidth = img.naturalWidth
            if (naturalWidth > 0) {
              const scale = editorWidth / naturalWidth
              setImageScale(img, Math.min(scale, 1))
            }
          }
          break
        }
        case 'copy-image':
          copyImageToClipboard(img)
          break
        case 'delete-image': {
          // 通过 TipTap 命令删除图片节点
          const editorEl = document.querySelector('.ProseMirror')
          if (!editorEl) break
          const pmView = (editorEl as any).pmView
          if (pmView) {
            const { state, dispatch } = pmView
            const { from, to } = state.selection
            dispatch(state.tr.delete(from, to))
            break
          }
          // 回退：直接从 DOM 移除
          const wrapper = img.closest('.image-resize-wrapper') || img.parentElement
          if (wrapper) {
            wrapper.remove()
          } else {
            img.remove()
          }
          break
        }
      }

      hideContextMenu()
    })

    // 点击其他地方关闭菜单
    document.addEventListener('click', (e) => {
      if (menuState.visible) {
        const target = e.target as HTMLElement
        if (!target.closest('.image-context-menu')) {
          hideContextMenu()
        }
      }
    })

    // ESC 键关闭菜单
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuState.visible) {
        hideContextMenu()
      }
    })

    // 滚动时关闭菜单
    window.addEventListener('scroll', () => {
      if (menuState.visible) {
        hideContextMenu()
      }
    }, true)
  }, 100)
}

export default ImageContextMenu
