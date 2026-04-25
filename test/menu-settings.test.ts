import { beforeEach, describe, expect, it, vi } from 'vitest'

const { exitMock, showThemeSelectorMock, toggleFocusModeMock, toggleTypewriterModeMock } = vi.hoisted(() => ({
  exitMock: vi.fn(),
  showThemeSelectorMock: vi.fn(),
  toggleFocusModeMock: vi.fn(),
  toggleTypewriterModeMock: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-process', () => ({
  exit: exitMock,
}))

vi.mock('../src/fileManager', () => ({
  openFile: vi.fn(),
  saveFile: vi.fn(),
  openFolder: vi.fn(),
}))

vi.mock('../src/editor', () => ({
  getEditor: vi.fn(() => ({
    commands: {
      undo: vi.fn(),
      redo: vi.fn(),
    },
    chain: () => ({
      focus: () => ({
        insertTable: () => ({ run: vi.fn() }),
        setMathInline: () => ({ run: vi.fn() }),
        setMathBlock: () => ({ run: vi.fn() }),
        setFootnote: () => ({ run: vi.fn() }),
      }),
    }),
  })),
}))

vi.mock('../src/findReplace', () => ({
  toggleFindReplace: vi.fn(),
}))

vi.mock('../src/export', () => ({
  exportToHTML: vi.fn(),
  exportToPDF: vi.fn(),
}))

vi.mock('../src/themes', () => ({
  showThemeSelector: showThemeSelectorMock,
}))

vi.mock('../src/printPreview', () => ({
  showPrintPreview: vi.fn(),
}))

vi.mock('../src/focusMode', () => ({
  toggleFocusMode: toggleFocusModeMock,
  toggleTypewriterMode: toggleTypewriterModeMock,
}))

vi.mock('../src/sourceEditor', () => ({
  showFullSourceEditor: vi.fn(),
}))

vi.mock('../src/markdownImage', () => ({
  ImageInsertManager: class {
    showInsertDialog() {}
  },
}))

vi.mock('../src/recentFilesDialog', () => ({
  showRecentFilesDialog: vi.fn(),
}))

vi.mock('../src/tocGenerator', () => ({
  generateToc: vi.fn(() => []),
  insertToc: vi.fn(),
}))

function mountMenuDom() {
  document.body.innerHTML = `
    <div id="navbar">
      <div class="nav-left">
        <div class="nav-menu">
          <div class="menu-item" id="file-menu">
            <span>文件</span>
            <div class="dropdown-menu">
              <div class="dropdown-item" id="open-file"><span>打开文件</span></div>
              <div class="dropdown-item" id="open-folder"><span>打开文件夹</span></div>
              <div class="dropdown-item" id="recent-files"><span>最近文件</span></div>
              <div class="dropdown-item" id="save-file"><span>保存文件</span></div>
              <div class="dropdown-item" id="export-html"><span>导出为 HTML</span></div>
              <div class="dropdown-item" id="export-pdf"><span>导出为 PDF</span></div>
              <div class="dropdown-item" id="print-preview"><span>打印预览</span></div>
              <div class="dropdown-item" id="exit-app"><span>退出</span></div>
            </div>
          </div>
          <div class="menu-item" id="edit-menu">
            <span>编辑</span>
            <div class="dropdown-menu">
              <div class="dropdown-item" id="undo"><span>撤销</span></div>
              <div class="dropdown-item" id="redo"><span>重做</span></div>
              <div class="dropdown-item" id="find"><span>查找</span></div>
              <div class="dropdown-item" id="find-replace"><span>查找和替换</span></div>
              <div class="dropdown-item" id="insert-table"><span>插入表格</span></div>
              <div class="dropdown-item" id="insert-math-inline"><span>插入行内公式</span></div>
              <div class="dropdown-item" id="insert-math-block"><span>插入块级公式</span></div>
              <div class="dropdown-item" id="insert-footnote"><span>插入脚注</span></div>
            </div>
          </div>
          <div class="menu-item" id="view-menu">
            <span>视图</span>
            <div class="dropdown-menu">
              <div class="dropdown-item" id="select-theme"><span>选择主题</span></div>
              <div class="dropdown-item" id="toggle-focus-mode"><span>专注模式</span></div>
              <div class="dropdown-item" id="toggle-typewriter-mode"><span>打字机模式</span></div>
              <div class="dropdown-item" id="open-settings"><span>设置</span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="nav-actions">
        <button id="nav-settings-btn" title="设置 (Ctrl+,)">设置</button>
      </div>
    </div>
    <button id="theme-toggle-btn"><i></i></button>
  `
}

describe('menu and settings entry', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    HTMLElement.prototype.scrollIntoView = vi.fn()
    mountMenuDom()
  })

  it('shows key menu labels in chinese', () => {
    expect(document.body.textContent).toContain('文件')
    expect(document.body.textContent).toContain('编辑')
    expect(document.body.textContent).toContain('视图')
    expect(document.body.textContent).toContain('设置')
    expect(document.body.textContent).toContain('打开文件')
    expect(document.body.textContent).toContain('打开文件夹')
    expect(document.body.textContent).toContain('最近文件')
    expect(document.body.textContent).toContain('打印预览')
  })

  it('opens settings from the view menu', async () => {
    const clickSpy = vi.spyOn(document.getElementById('nav-settings-btn') as HTMLButtonElement, 'click')
    const { initMenus } = await import('../src/menu')

    initMenus()
    ;(document.getElementById('open-settings') as HTMLElement).click()

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('opens settings with Ctrl+,', async () => {
    const clickSpy = vi.spyOn(document.getElementById('nav-settings-btn') as HTMLButtonElement, 'click')
    const { initKeyboardShortcuts } = await import('../src/menu')

    initKeyboardShortcuts()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ',', ctrlKey: true, bubbles: true }))

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('opens settings from the command palette action', async () => {
    const clickSpy = vi.spyOn(document.getElementById('nav-settings-btn') as HTMLButtonElement, 'click')
    const { initCommandPalette } = await import('../src/commandPalette')

    initCommandPalette()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'P', ctrlKey: true, shiftKey: true, bubbles: true }))

    const input = document.querySelector('.command-palette-input') as HTMLInputElement
    input.value = '设置'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })
})
