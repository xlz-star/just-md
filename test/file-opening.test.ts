import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  invokeMock,
  listenMock,
  setEditorContentMock,
  setCurrentFileMock,
  getCurrentFilePathMock,
  getCurrentMarkdownContentMock,
  resetOutlineStateMock,
  updateOutlineIfNeededMock,
  addRecentFileMock,
  processImagePathsMock,
  dialogOpenMock,
} = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  listenMock: vi.fn(),
  setEditorContentMock: vi.fn(),
  setCurrentFileMock: vi.fn(),
  getCurrentFilePathMock: vi.fn(() => null),
  getCurrentMarkdownContentMock: vi.fn(() => ''),
  resetOutlineStateMock: vi.fn(),
  updateOutlineIfNeededMock: vi.fn(),
  addRecentFileMock: vi.fn(),
  processImagePathsMock: vi.fn((html: string) => html),
  dialogOpenMock: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: listenMock,
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: dialogOpenMock,
}))

vi.mock('../src/editor', () => ({
  getCurrentFilePath: getCurrentFilePathMock,
  getCurrentMarkdownContent: getCurrentMarkdownContentMock,
  setCurrentFile: setCurrentFileMock,
  setEditorContent: setEditorContentMock,
}))

vi.mock('../src/outline', () => ({
  resetOutlineState: resetOutlineStateMock,
  updateOutlineIfNeeded: updateOutlineIfNeededMock,
}))

vi.mock('../src/recentFiles', () => ({
  recentFilesManager: {
    addRecentFile: addRecentFileMock,
  },
}))

vi.mock('../src/markdownImage', () => ({
  processImagePaths: processImagePathsMock,
}))

describe('file opening', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    document.body.innerHTML = `
      <div id="file-tabs"></div>
      <div class="file-tabs-container"></div>
      <div class="ProseMirror using-default-content"></div>
    `
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('opens a markdown file by path and updates the editor state', async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === 'read_markdown') {
        return Promise.resolve('<p>rendered html</p>')
      }

      if (command === 'get_raw_markdown') {
        return Promise.resolve('# Hello from macOS')
      }

      if (command === 'render_markdown_to_html') {
        return Promise.resolve('<p>rendered html</p>')
      }

      return Promise.resolve(null)
    })
    processImagePathsMock.mockReturnValue('<p>processed html</p>')

    const fileManager = await import('../src/fileManager.ts')
    await fileManager.openFileByPath('/Users/demo/Documents/test.md')

    expect(invokeMock).toHaveBeenCalledWith('read_markdown', { path: '/Users/demo/Documents/test.md' })
    expect(invokeMock).toHaveBeenCalledWith('get_raw_markdown', { path: '/Users/demo/Documents/test.md' })
    expect(setCurrentFileMock).toHaveBeenCalledWith('/Users/demo/Documents/test.md', 'test.md')
    expect(setEditorContentMock).toHaveBeenCalledWith('<p>processed html</p>', '# Hello from macOS')
    expect(resetOutlineStateMock).toHaveBeenCalled()
    expect(updateOutlineIfNeededMock).toHaveBeenCalled()
    expect(addRecentFileMock).toHaveBeenCalledWith('/Users/demo/Documents/test.md')
    expect(document.querySelectorAll('.file-tab')).toHaveLength(1)
    expect(document.querySelector('.file-tab-name')?.textContent).toBe('test.md')
    expect(document.querySelector('.ProseMirror')).not.toHaveClass('using-default-content')
  })

  it('reuses an existing tab when the same file path is opened twice', async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === 'read_markdown') {
        return Promise.resolve('<p>rendered html</p>')
      }

      if (command === 'get_raw_markdown') {
        return Promise.resolve('# Existing content')
      }

      if (command === 'render_markdown_to_html') {
        return Promise.resolve('<p>rendered again</p>')
      }

      return Promise.resolve(null)
    })

    const fileManager = await import('../src/fileManager.ts')

    await fileManager.openFileByPath('/Users/demo/Documents/test.md')
    invokeMock.mockClear()

    await fileManager.openFileByPath('/Users/demo/Documents/test.md')

    expect(invokeMock).not.toHaveBeenCalledWith('read_markdown', { path: '/Users/demo/Documents/test.md' })
    expect(invokeMock).not.toHaveBeenCalledWith('get_raw_markdown', { path: '/Users/demo/Documents/test.md' })
    expect(invokeMock).toHaveBeenCalledWith('render_markdown_to_html', { markdown: '# Existing content' })
    expect(document.querySelectorAll('.file-tab')).toHaveLength(1)
  })

  it('listens for the Tauri file-opened event and opens the incoming path', async () => {
    let handler: ((event: { payload: { path: string } }) => Promise<void>) | undefined
    listenMock.mockImplementation(async (_event: string, callback: (event: { payload: { path: string } }) => Promise<void>) => {
      handler = callback
      return vi.fn()
    })

    invokeMock.mockImplementation((command: string) => {
      if (command === 'read_markdown') {
        return Promise.resolve('<p>finder html</p>')
      }

      if (command === 'get_raw_markdown') {
        return Promise.resolve('# From Finder')
      }

      if (command === 'render_markdown_to_html') {
        return Promise.resolve('<p>finder html</p>')
      }

      return Promise.resolve(null)
    })

    const fileManager = await import('../src/fileManager.ts')

    await fileManager.initializeExternalFileOpenListener()
    await handler?.({ payload: { path: '/Users/demo/Documents/from-finder.md' } })

    expect(listenMock).toHaveBeenCalledWith('file-opened', expect.any(Function))
    expect(invokeMock).toHaveBeenCalledWith('read_markdown', { path: '/Users/demo/Documents/from-finder.md' })
    expect(setCurrentFileMock).toHaveBeenCalledWith('/Users/demo/Documents/from-finder.md', 'from-finder.md')
  })

  it('opens empty markdown files without treating them as errors', async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === 'read_markdown') {
        return Promise.resolve('')
      }

      if (command === 'get_raw_markdown') {
        return Promise.resolve('')
      }

      return Promise.resolve(null)
    })

    processImagePathsMock.mockReturnValue('')

    const fileManager = await import('../src/fileManager.ts')
    await fileManager.openFileByPath('/Users/demo/Documents/empty.md')

    expect(setCurrentFileMock).toHaveBeenCalledWith('/Users/demo/Documents/empty.md', 'empty.md')
    expect(setEditorContentMock).toHaveBeenCalledWith('', '')
    expect(addRecentFileMock).toHaveBeenCalledWith('/Users/demo/Documents/empty.md')
  })

  it('initializes the external file-open listener only once', async () => {
    listenMock.mockResolvedValue(vi.fn())

    const fileManager = await import('../src/fileManager.ts')

    await fileManager.initializeExternalFileOpenListener()
    await fileManager.initializeExternalFileOpenListener()

    expect(listenMock).toHaveBeenCalledTimes(1)
  })
})
