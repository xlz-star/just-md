import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'
import { invoke } from '@tauri-apps/api/core'

// 图片 URL 正则表达式
const IMAGE_URL_REGEX = /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|svg|bmp|ico|tiff?)(\?.*)?)$/i

// 检测是否为图片 URL
function isImageUrl(url: string): boolean {
  return IMAGE_URL_REGEX.test(url)
}

function getPlainTextFromClipboard(clipboardData: DataTransfer): string {
  return clipboardData.getData('text/plain').trim()
}

// 从 URL 中提取文件名作为 alt 文本
function getAltFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = pathname.split('/').pop() || ''
    return filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'image'
  } catch {
    return 'image'
  }
}

// 处理剪贴板中的图片文件，返回图片 URL
async function handleClipboardImageFile(file: File): Promise<string | null> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    const result = await invoke<string>('save_temp_image', {
      data: Array.from(uint8Array),
      fileType: file.type || 'image/png'
    })

    return result
  } catch (error) {
    console.error('处理剪贴板图片失败:', error)
    return null
  }
}

export function handleAutoImagePaste(view: EditorView, event: ClipboardEvent): boolean {
  const clipboardData = event.clipboardData
  if (!clipboardData) return false

  const items = clipboardData.items
  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    if (item.kind === 'file' && item.type.startsWith('image/')) {
      event.preventDefault()
      const file = item.getAsFile()
      if (!file) return false

      handleClipboardImageFile(file).then(url => {
        if (url) {
          const alt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'image'
          const { state } = view
          const { from, to } = state.selection
          const imageNode = state.schema.nodes.image?.create({ src: url, alt })
          if (imageNode) {
            view.dispatch(state.tr.replaceWith(from, to, imageNode))
          }
        }
      })
      return true
    }
  }

  const plainText = getPlainTextFromClipboard(clipboardData)
  if (!plainText || !isImageUrl(plainText)) {
    return false
  }

  event.preventDefault()
  const alt = getAltFromUrl(plainText)
  const { state } = view
  const { from, to } = state.selection
  const imageNode = state.schema.nodes.image?.create({ src: plainText, alt })
  if (!imageNode) {
    return false
  }

  view.dispatch(state.tr.replaceWith(from, to, imageNode))
  return true
}

export const AutoImageExtension = Extension.create({
  name: 'autoImage',

  // 处理输入时的 URL 转换
  addInputRules() {
    return [
      {
        find: /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp|ico|tiff?)(?:\?[^\s]*)?)/i,
        handler: ({ state, range, match }) => {
          const url = match[0]
          const alt = getAltFromUrl(url)
          const { tr } = state
          const from = range.from
          const to = range.to

          // 只替换匹配到的 URL 部分
          const fullText = state.doc.textBetween(from, to)
          const urlIndex = fullText.indexOf(url)

          if (urlIndex >= 0) {
            // 如果有非 URL 的前缀文本，保留它
            if (urlIndex > 0) {
              tr.insertText(fullText.substring(0, urlIndex), from)
            }

            // 用图片节点替换 URL
            const imageNode = state.schema.nodes.image?.create({ src: url, alt, class: 'markdown-image' })
            if (imageNode) {
              const imagePos = from + urlIndex
              tr.replaceWith(imagePos, imagePos + url.length, imageNode)
            }
          }
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('autoImage'),

        props: {
          handlePaste: handleAutoImagePaste,
        },
      }),
    ]
  },
})

export default AutoImageExtension
