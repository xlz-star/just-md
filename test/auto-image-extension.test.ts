import { beforeEach, describe, expect, it, vi } from 'vitest'

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}))

import { handleAutoImagePaste } from '../src/autoImageExtension'

function createMockView() {
  const replaceWith = vi.fn(() => ({ step: 'replaceWith' }))
  const dispatch = vi.fn()
  const create = vi.fn((attrs: Record<string, unknown>) => ({ attrs }))

  return {
    dispatch,
    state: {
      selection: { from: 1, to: 1 },
      schema: {
        nodes: {
          image: {
            create,
          },
        },
      },
      tr: {
        replaceWith,
      },
    },
  }
}

function createTextPasteEvent(text: string) {
  return {
    preventDefault: vi.fn(),
    clipboardData: {
      getData: vi.fn((type: string) => (type === 'text/plain' ? text : '')),
      items: [
        {
          kind: 'string',
          type: 'text/plain',
          getAsString: (callback: (value: string) => void) => callback(text),
        },
      ],
    },
  } as unknown as ClipboardEvent
}

function createImageFilePasteEvent(file: File) {
  return {
    preventDefault: vi.fn(),
    clipboardData: {
      getData: vi.fn(() => ''),
      items: [
        {
          kind: 'file',
          type: file.type,
          getAsFile: () => file,
        },
      ],
    },
  } as unknown as ClipboardEvent
}

describe('auto image extension paste handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not intercept normal plain text paste', () => {
    const view = createMockView()
    const event = createTextPasteEvent('hello world')

    const handled = handleAutoImagePaste(view as never, event)

    expect(handled).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(view.dispatch).not.toHaveBeenCalled()
  })

  it('intercepts pure image url text paste', () => {
    const view = createMockView()
    const event = createTextPasteEvent('https://example.com/cat.png')

    const handled = handleAutoImagePaste(view as never, event)

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(view.state.schema.nodes.image.create).toHaveBeenCalledWith({
      src: 'https://example.com/cat.png',
      alt: 'cat',
    })
    expect(view.dispatch).toHaveBeenCalledOnce()
  })

  it('does not intercept sentences that merely contain an image url', () => {
    const view = createMockView()
    const event = createTextPasteEvent('see https://example.com/cat.png now')

    const handled = handleAutoImagePaste(view as never, event)

    expect(handled).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(view.dispatch).not.toHaveBeenCalled()
  })

  it('returns false when clipboardData is unavailable', () => {
    const view = createMockView()
    const event = {
      preventDefault: vi.fn(),
      clipboardData: null,
    } as unknown as ClipboardEvent

    const handled = handleAutoImagePaste(view as never, event)

    expect(handled).toBe(false)
  })

  it('still intercepts pasted image files', async () => {
    invokeMock.mockResolvedValue('tauri://temp/pasted.png')
    const view = createMockView()
    const file = {
      name: 'pasted-image.png',
      type: 'image/png',
      arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
    } as unknown as File
    const event = createImageFilePasteEvent(file)

    const handled = handleAutoImagePaste(view as never, event)
    await Promise.resolve()
    await Promise.resolve()

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(invokeMock).toHaveBeenCalledWith('save_temp_image', {
      data: [1, 2, 3],
      fileType: 'image/png',
    })
  })
})
