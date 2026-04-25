import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const { getEditorMock } = vi.hoisted(() => ({
  getEditorMock: vi.fn(),
}))

vi.mock('../src/editor.ts', () => ({
  getEditor: getEditorMock,
}))

type HeadingFixture = {
  pos: number
  text: string
  level: number
  top: number
}

function createDom(): HTMLDivElement {
  document.body.innerHTML = `
    <button id="outline-btn"></button>
    <div id="outline-panel" class="outline-panel hidden">
      <div class="outline-header">
        <h3>文档大纲</h3>
        <button id="toggle-filetree-btn"></button>
        <button id="pin-outline-btn"></button>
        <button id="close-outline-btn"></button>
      </div>
      <div id="outline-content"></div>
      <div id="outline-resizer"></div>
    </div>
    <div id="outline-overlay" class="hidden"></div>
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

  return editorElement
}

function createMockEditor(editorElement: HTMLDivElement, headings: HeadingFixture[]) {
  const absoluteTopMap = new Map(headings.map(heading => [heading.pos, heading.top]))

  const editor = {
    state: {
      selection: { from: headings[0]?.pos ?? 1 },
      doc: {
        descendants: (callback: (node: any, pos: number) => boolean | void) => {
          headings.forEach(heading => {
            callback(
              {
                type: { name: 'heading' },
                attrs: { level: heading.level },
                textContent: heading.text,
              },
              heading.pos,
            )
          })
          return true
        },
      },
    },
    view: {
      coordsAtPos: vi.fn((pos: number) => {
        const top = absoluteTopMap.get(pos) ?? 0
        return {
          top: top - editorElement.scrollTop,
          bottom: top + 32 - editorElement.scrollTop,
        }
      }),
      nodeDOM: vi.fn((pos: number) => {
        const node = document.createElement('h1')
        node.dataset.pos = String(pos)
        return node
      }),
      domAtPos: vi.fn(() => {
        const node = document.createElement('h1')
        node.scrollIntoView = vi.fn()
        return { node }
      }),
    },
    commands: {
      setTextSelection: vi.fn((pos: number) => {
        editor.state.selection.from = pos
      }),
      focus: vi.fn(),
    },
  }

  return editor
}

describe('outline', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: vi.fn(),
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('根据编辑区滚动位置同步高亮当前大纲项', async () => {
    vi.resetModules()

    const outline = await import('../src/outline.ts')
    const editorElement = createDom()
    const editor = createMockEditor(editorElement, [
      { pos: 1, text: '第一章', level: 1, top: 0 },
      { pos: 20, text: '第二章', level: 2, top: 200 },
      { pos: 40, text: '第三章', level: 2, top: 420 },
    ])

    getEditorMock.mockReturnValue(editor)

    outline.initOutlineFeature()
    outline.showOutlinePanel()
    await vi.runAllTimersAsync()

    expect(document.querySelector('.outline-item.active')?.textContent).toBe('第一章')

    editorElement.scrollTop = 210
    editorElement.dispatchEvent(new Event('scroll'))
    await vi.runAllTimersAsync()

    expect(document.querySelector('.outline-item.active')?.textContent).toBe('第二章')
  })

  it('点击大纲项时按编辑区容器位置滚动到目标标题', async () => {
    vi.resetModules()

    const outline = await import('../src/outline.ts')
    const editorElement = createDom()
    const editor = createMockEditor(editorElement, [
      { pos: 1, text: '第一章', level: 1, top: 0 },
      { pos: 20, text: '第二章', level: 2, top: 200 },
    ])

    getEditorMock.mockReturnValue(editor)

    outline.initOutlineFeature()
    outline.showOutlinePanel()
    await vi.runAllTimersAsync()

    ;(editorElement.scrollTo as ReturnType<typeof vi.fn>).mockClear()

    const secondItem = document.querySelector('.outline-item[data-index="1"]') as HTMLElement
    secondItem.click()

    expect(editor.commands.setTextSelection).toHaveBeenCalledWith(20)
    expect(editor.commands.focus).toHaveBeenCalled()
    expect(editorElement.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({
        top: 50,
        behavior: 'smooth',
      }),
    )
  })
})
