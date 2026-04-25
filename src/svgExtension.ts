import { Node, mergeAttributes } from '@tiptap/core'

export interface SvgBlockOptions {
  HTMLAttributes: Record<string, any>
}

const UNSAFE_SELECTOR = 'script, foreignObject'
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

function sanitizeSvgElement(element: SVGElement): string {
  const cloned = element.cloneNode(true) as SVGElement

  if (!cloned.getAttribute('xmlns')) {
    cloned.setAttribute('xmlns', SVG_NAMESPACE)
  }

  cloned.querySelectorAll(UNSAFE_SELECTOR).forEach(node => node.remove())

  const nodes = [cloned, ...Array.from(cloned.querySelectorAll('*'))]

  nodes.forEach(node => {
    Array.from(node.attributes).forEach(attribute => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()

      if (name.startsWith('on')) {
        node.removeAttribute(attribute.name)
        return
      }

      if ((name === 'href' || name === 'xlink:href') && value.startsWith('javascript:')) {
        node.removeAttribute(attribute.name)
        return
      }

      if (name === 'style' && value.includes('javascript:')) {
        node.removeAttribute(attribute.name)
      }
    })
  })

  return new XMLSerializer().serializeToString(cloned)
}

function createSvgDataUri(markup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
}

function getSvgAltText(element: SVGElement): string {
  const title = element.querySelector('title')?.textContent?.trim()
  return title || 'SVG image'
}

export const SvgBlock = Node.create<SvgBlockOptions>({
  name: 'svgBlock',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'markdown-image markdown-svg',
      },
    }
  },

  group: 'inline',

  inline: true,

  atom: true,

  draggable: true,

  selectable: true,

  addAttributes() {
    return {
      markup: {
        default: '',
        rendered: false,
      },
      src: {
        default: '',
        rendered: false,
      },
      alt: {
        default: 'SVG image',
        rendered: false,
      },
      width: {
        default: null,
        rendered: false,
      },
      height: {
        default: null,
        rendered: false,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'svg',
        getAttrs: element => {
          if (!(element instanceof SVGElement)) {
            return false
          }

          const markup = sanitizeSvgElement(element)

          return {
            markup,
            src: createSvgDataUri(markup),
            alt: getSvgAltText(element),
            width: element.getAttribute('width'),
            height: element.getAttribute('height'),
          }
        },
      },
    ]
  },

  renderHTML({ node }) {
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, {
        src: node.attrs.src,
        alt: node.attrs.alt,
        width: node.attrs.width,
        height: node.attrs.height,
      }),
    ]
  },
})
