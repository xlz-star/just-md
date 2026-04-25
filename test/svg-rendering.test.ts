import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { SvgBlock } from '../src/svgExtension'

const svgMarkup = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <circle cx="12" cy="12" r="10" fill="#4f46e5"></circle>
</svg>
`

describe('svg rendering', () => {
  it('renders raw svg markup as an image in the editor', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)

    const editor = new Editor({
      element,
      extensions: [StarterKit, SvgBlock],
      content: svgMarkup,
    })

    const image = element.querySelector('img.markdown-svg')

    expect(image).not.toBeNull()
    expect(image).toHaveAttribute('src', expect.stringMatching(/^data:image\/svg\+xml/))

    editor.destroy()
  })

  it('removes executable svg content before rendering', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)

    const editor = new Editor({
      element,
      extensions: [StarterKit, SvgBlock],
      content: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><circle cx="5" cy="5" r="4" /></svg>',
    })

    const image = element.querySelector('img.markdown-svg') as HTMLImageElement | null

    expect(image).not.toBeNull()

    const encodedSvg = image?.getAttribute('src')?.replace('data:image/svg+xml;charset=utf-8,', '') ?? ''
    const decodedSvg = decodeURIComponent(encodedSvg)

    expect(decodedSvg).not.toContain('<script')
    expect(decodedSvg).not.toContain('onload=')

    editor.destroy()
  })
})
