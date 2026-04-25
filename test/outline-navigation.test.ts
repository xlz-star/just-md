import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/editor', () => ({
  getEditor: vi.fn(),
}))

import { getEditor } from '../src/editor'
import { showOutlinePanel, resetOutlineState, updateOutlineIfNeeded } from '../src/outline'
import { showTocDialog } from '../src/tocGenerator'

const mockedGetEditor = vi.mocked(getEditor)

function createHeadingNode(level: number, text: string) {
  return {
    type: { name: 'heading' },
    attrs: { level },
    textContent: text,
  }
}

describe('outline navigation behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="outline-btn"></button>
      <div id="outline-panel" class="hidden">
        <div class="outline-header"><h3></h3></div>
        <button id="pin-outline-btn"></button>
        <button id="close-outline-btn"></button>
        <button id="toggle-filetree-btn"></button>
        <div id="outline-content"></div>
      </div>
      <div id="outline-overlay" class="hidden"></div>
      <div id="file-tree-container"></div>
      <div id="editor"></div>
    `

    const editorElement = document.getElementById('editor') as HTMLDivElement
    Object.defineProperty(editorElement, 'clientHeight', {
      value: 300,
      configurable: true,
    })
    editorElement.getBoundingClientRect = vi.fn(() => ({
      top: 0,
      left: 0,
      right: 800,
      bottom: 300,
      width: 800,
      height: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }))
    editorElement.scrollTo = vi.fn((options?: ScrollToOptions) => {
      if (options?.top !== undefined) {
        editorElement.scrollTop = options.top
      }
    })

    resetOutlineState()
    vi.clearAllMocks()

    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('uses visible heading position instead of selection position when highlighting outline item', async () => {
    const editorElement = document.getElementById('editor') as HTMLDivElement

    mockedGetEditor.mockReturnValue({
      state: {
        selection: { from: 1 },
        doc: {
          descendants: (callback: (node: unknown, pos: number) => boolean) => {
            callback(createHeadingNode(1, '第一章'), 1)
            callback(createHeadingNode(2, '第二章'), 20)
          },
        },
      },
      view: {
        coordsAtPos: vi.fn((pos: number) => {
          const top = pos === 1 ? 0 : 210
          return { top: top - editorElement.scrollTop, bottom: top + 32 - editorElement.scrollTop }
        }),
        nodeDOM: vi.fn(() => null),
      },
      commands: {
        setTextSelection: vi.fn(),
        focus: vi.fn(),
      },
    } as any)

    showOutlinePanel()
    await new Promise(resolve => setTimeout(resolve, 30))

    editorElement.scrollTop = 210
    editorElement.dispatchEvent(new Event('scroll'))

    const activeItem = document.querySelector('.outline-item.active')
    expect(activeItem).toHaveTextContent('第二章')
  })

  it('clicking outline item scrolls editor container with stable heading position lookup', async () => {
    const editorElement = document.getElementById('editor') as HTMLDivElement
    const setTextSelection = vi.fn()
    const focus = vi.fn()
    const coordsAtPos = vi.fn(() => ({ top: 200, bottom: 232 }))
    const nodeDOM = vi.fn(() => document.createElement('h2'))
    const domAtPos = vi.fn(() => ({ node: document.createTextNode('wrong') }))

    mockedGetEditor.mockReturnValue({
      state: {
        selection: { from: 1 },
        doc: {
          descendants: (callback: (node: unknown, pos: number) => boolean) => {
            callback(createHeadingNode(2, '第二章'), 20)
          },
        },
      },
      view: {
        coordsAtPos,
        nodeDOM,
        domAtPos,
      },
      commands: {
        setTextSelection,
        focus,
      },
    } as any)

    showOutlinePanel()
    await new Promise(resolve => setTimeout(resolve, 30))

    const outlineItem = document.querySelector('.outline-item') as HTMLElement
    outlineItem.click()

    expect(setTextSelection).toHaveBeenCalledWith(20)
    expect(coordsAtPos).toHaveBeenCalledWith(20)
    expect(domAtPos).not.toHaveBeenCalled()
    expect(editorElement.scrollTo).toHaveBeenCalledWith({ behavior: 'smooth', top: 50 })
    expect(focus).toHaveBeenCalled()
  })

  it('toc item click scrolls with stable heading element lookup', () => {
    const headingElement = document.createElement('h2')
    headingElement.dataset.headingPos = '20'
    document.body.appendChild(headingElement)

    const setTextSelection = vi.fn()
    const focus = vi.fn()
    const nodeDOM = vi.fn(() => headingElement)
    const domAtPos = vi.fn(() => ({ node: document.createTextNode('wrong') }))

    mockedGetEditor.mockReturnValue({
      state: {
        doc: {
          descendants: (callback: (node: unknown, pos: number) => boolean) => {
            callback(createHeadingNode(2, '第二章'), 20)
          },
        },
      },
      view: {
        nodeDOM,
        domAtPos,
      },
      commands: {
        focus,
        setTextSelection,
      },
    } as any)

    showTocDialog()

    const tocItem = document.querySelector('.toc-item') as HTMLElement
    tocItem.click()

    expect(focus).toHaveBeenCalled()
    expect(setTextSelection).toHaveBeenCalledWith(20)
    expect(nodeDOM).toHaveBeenCalledWith(20)
    expect(domAtPos).not.toHaveBeenCalled()
    expect(headingElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })
})
