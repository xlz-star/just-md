import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  handleEditorContextMenuEvent,
  initEditorContextMenu,
  resetEditorContextMenu,
  shouldHandleEditorContextMenu,
} from '../src/editorContextMenu'

function createView(dom: HTMLElement) {
  return {
    dom,
    focus: vi.fn(),
  }
}

function createContextMenuEvent(target: HTMLElement) {
  return {
    target,
    clientX: 24,
    clientY: 32,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as MouseEvent
}

describe('editor context menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    document.execCommand = vi.fn()
    resetEditorContextMenu()
    initEditorContextMenu()
  })

  it('handles ordinary editor content targets', () => {
    const proseMirror = document.createElement('div')
    proseMirror.className = 'ProseMirror'
    const paragraph = document.createElement('p')
    proseMirror.appendChild(paragraph)

    expect(shouldHandleEditorContextMenu(paragraph)).toBe(true)
  })

  it('does not handle spell error targets', () => {
    const spellError = document.createElement('span')
    spellError.className = 'spell-error'

    expect(shouldHandleEditorContextMenu(spellError)).toBe(false)
  })

  it('does not handle image targets', () => {
    const image = document.createElement('img')
    image.className = 'markdown-image'

    expect(shouldHandleEditorContextMenu(image)).toBe(false)
  })

  it('shows a chinese menu for ordinary editor right click', () => {
    const proseMirror = document.createElement('div')
    proseMirror.className = 'ProseMirror'
    document.body.appendChild(proseMirror)
    const paragraph = document.createElement('p')
    proseMirror.appendChild(paragraph)

    const handled = handleEditorContextMenuEvent(createView(proseMirror) as never, createContextMenuEvent(paragraph))

    expect(handled).toBe(true)
    expect(document.querySelector('.editor-context-menu')).not.toBeNull()
    expect(document.body.textContent).toContain('复制')
    expect(document.body.textContent).toContain('剪切')
    expect(document.body.textContent).toContain('粘贴')
    expect(document.body.textContent).toContain('全选')
  })

  it('closes when clicking outside the menu', () => {
    const proseMirror = document.createElement('div')
    proseMirror.className = 'ProseMirror'
    document.body.appendChild(proseMirror)
    const paragraph = document.createElement('p')
    proseMirror.appendChild(paragraph)

    handleEditorContextMenuEvent(createView(proseMirror) as never, createContextMenuEvent(paragraph))
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(document.querySelector('.editor-context-menu')).toHaveStyle({ display: 'none' })
  })

  it('closes on escape', () => {
    const proseMirror = document.createElement('div')
    proseMirror.className = 'ProseMirror'
    document.body.appendChild(proseMirror)
    const paragraph = document.createElement('p')
    proseMirror.appendChild(paragraph)

    handleEditorContextMenuEvent(createView(proseMirror) as never, createContextMenuEvent(paragraph))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(document.querySelector('.editor-context-menu')).toHaveStyle({ display: 'none' })
  })

  it('executes commands from menu actions', () => {
    const proseMirror = document.createElement('div')
    proseMirror.className = 'ProseMirror'
    document.body.appendChild(proseMirror)
    const paragraph = document.createElement('p')
    proseMirror.appendChild(paragraph)

    handleEditorContextMenuEvent(createView(proseMirror) as never, createContextMenuEvent(paragraph))
    ;(document.querySelector('[data-action="copy"]') as HTMLElement).click()

    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })
})
