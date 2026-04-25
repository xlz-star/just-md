import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getCurrentFilePathMock,
  setEditorContentMock,
  setCurrentFileMock,
  generateIdMock,
  addFileTabMock,
  updateTabsActiveStateMock,
  resetOutlineStateMock,
  updateOutlineIfNeededMock,
} = vi.hoisted(() => ({
  getCurrentFilePathMock: vi.fn(),
  setEditorContentMock: vi.fn(),
  setCurrentFileMock: vi.fn(),
  generateIdMock: vi.fn(() => 'generated-id'),
  addFileTabMock: vi.fn(),
  updateTabsActiveStateMock: vi.fn(),
  resetOutlineStateMock: vi.fn(),
  updateOutlineIfNeededMock: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'

const invokeMock = vi.mocked(invoke)

vi.mock('../src/editor', () => ({
  getCurrentFilePath: getCurrentFilePathMock,
  setEditorContent: setEditorContentMock,
  setCurrentFile: setCurrentFileMock,
}))

vi.mock('../src/fileManager', () => ({
  generateId: generateIdMock,
  addFileTab: addFileTabMock,
  updateTabsActiveState: updateTabsActiveStateMock,
}))

vi.mock('../src/outline', () => ({
  resetOutlineState: resetOutlineStateMock,
  updateOutlineIfNeeded: updateOutlineIfNeededMock,
}))

describe('filetree', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = `
      <div id="outline-panel" class="outline-panel">
        <div class="outline-header">
          <h3>文档大纲</h3>
        </div>
      </div>
      <button id="toggle-filetree-btn"></button>
    `
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('将展开目录的子节点渲染在父节点下方而不是同一横排', async () => {
    const filetree = await import('../src/filetree.ts')

    invokeMock.mockResolvedValue({
      root_path: '/workspace',
      current_path: '/workspace',
      parent_path: null,
      items: [
        {
          name: 'src',
          path: '/workspace/src',
          is_directory: true,
          level: 0,
          is_expanded: true,
          children: [
            {
              name: 'main.md',
              path: '/workspace/src/main.md',
              is_directory: false,
              level: 1,
              is_expanded: false,
              children: [],
            },
          ],
        },
      ],
    })

    await filetree.loadFileTree('/workspace')
    filetree.setFileTreeVisibility(true)
    filetree.renderFileTree()
    await vi.runAllTimersAsync()

    const directoryItem = document.querySelector('.file-tree-item') as HTMLElement
    expect(directoryItem).toBeTruthy()
    expect(directoryItem.firstElementChild).toHaveClass('file-tree-item-content')
    expect(directoryItem.lastElementChild).toHaveClass('file-tree-list')
    expect(directoryItem.lastElementChild?.parentElement).toBe(directoryItem)
  })
})
