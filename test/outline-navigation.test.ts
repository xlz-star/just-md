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

    resetOutlineState()
    vi.clearAllMocks()

    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('uses visible heading position instead of selection position when highlighting outline item', async () => {
    const editorContainer = document.getElementById('editor') as HTMLDivElement
    const headingElements = [document.createElement('h1'), document.createElement('h2')]
    headingElements.forEach((element, index) => {
      element.dataset.headingPos = index === 0 ? '1' : '20'
      editorContainer.appendChild(element)
    })

    headingElements[0].getBoundingClientRect = vi.fn(() => ({ top: -120, bottom: -80 })) as any
    headingElements[1].getBoundingClientRect = vi.fn(() => ({ top: 16, bottom: 48 })) as any

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
        nodeDOM: vi.fn((pos: number) => headingElements.find((element) => element.dataset.headingPos === String(pos)) ?? null),
      },
      commands: {
        setTextSelection: vi.fn(),
        focus: vi.fn(),
      },
    } as any)

    showOutlinePanel()
    await new Promise(resolve => setTimeout(resolve, 30))

    const activeItem = document.querySelector('.outline-item.active')
    expect(activeItem).toHaveTextContent('第二章')
  })

  it('updates active outline item when editor container scrolls', async () => {
    const editorContainer = document.getElementById('editor') as HTMLDivElement
    const headingElements = [document.createElement('h1'), document.createElement('h2')]
    headingElements.forEach((element, index) => {
      element.dataset.headingPos = index === 0 ? '1' : '20'
      editorContainer.appendChild(element)
    })

    const rects = [
      [{ top: 12, bottom: 36 }, { top: 520, bottom: 544 }],
      [{ top: -220, bottom: -180 }, { top: 24, bottom: 48 }],
    ]
    let currentRectIndex = 0

    headingElements[0].getBoundingClientRect = vi.fn(() => rects[currentRectIndex][0]) as any
    headingElements[1].getBoundingClientRect = vi.fn(() => rects[currentRectIndex][1]) as any

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
        nodeDOM: vi.fn((pos: number) => headingElements.find((element) => element.dataset.headingPos === String(pos)) ?? null),
      },
      commands: {
        setTextSelection: vi.fn(),
        focus: vi.fn(),
      },
    } as any)

    showOutlinePanel()
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(document.querySelector('.outline-item.active')).toHaveTextContent('第一章')

    currentRectIndex = 1
    editorContainer.dispatchEvent(new Event('scroll'))

    expect(document.querySelector('.outline-item.active')).toHaveTextContent('第二章')
  })

  it('clicking outline item selects a valid text position inside heading content', async () => {
    const editorContainer = document.getElementById('editor') as HTMLDivElement
    const headingElement = document.createElement('h2')
    headingElement.dataset.headingPos = '20'
    headingElement.textContent = '第二章'
    headingElement.getBoundingClientRect = vi.fn(() => ({ top: 24, bottom: 56 })) as any
    editorContainer.appendChild(headingElement)

    const setTextSelection = vi.fn()
    const focus = vi.fn()
    const nodeDOM = vi.fn(() => headingElement)
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

    expect(setTextSelection).toHaveBeenCalledWith(21)
    expect(nodeDOM).toHaveBeenCalledWith(20)
    expect(domAtPos).not.toHaveBeenCalled()
    expect(headingElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    expect(focus).toHaveBeenCalled()
  })

  it('toc item click selects a valid text position inside heading content', () => {
    const editorContainer = document.getElementById('editor') as HTMLDivElement
    const headingElement = document.createElement('h2')
    headingElement.dataset.headingPos = '20'
    headingElement.textContent = '第二章'
    editorContainer.appendChild(headingElement)

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
          resolve: vi.fn((pos: number) => ({ parent: { isTextblock: true }, pos })),
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
    expect(setTextSelection).toHaveBeenCalledWith(21)
    expect(nodeDOM).toHaveBeenCalledWith(20)
    expect(domAtPos).not.toHaveBeenCalled()
    expect(headingElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })
})
