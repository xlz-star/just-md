import { toggleFocusMode, toggleTypewriterMode } from './focusMode'
import { toggleCodeFolding } from './codeFolding'
import { switchTheme, getCurrentTheme } from './themes'
import { spellChecker } from './spellCheck'

let settingsPanel: HTMLElement | null = null

export function initSettings(): void {
  createSettingsButton()
  createSettingsPanel()
  
  // Load saved settings
  loadSettings()
}

function createSettingsButton(): void {
  const button = document.createElement('button')
  button.id = 'settings-btn'
  button.className = 'floating-btn settings-btn'
  button.title = '设置'
  button.innerHTML = '<i class="ri-settings-3-line"></i>'
  
  document.getElementById('app')?.appendChild(button)
  
  button.addEventListener('click', toggleSettings)
}

function createSettingsPanel(): void {
  const panel = document.createElement('div')
  panel.id = 'settings-panel'
  panel.className = 'settings-panel hidden'
  panel.innerHTML = `
    <div class="settings-content">
      <div class="settings-header">
        <h2>设置</h2>
        <button class="settings-close" id="settings-close">
          <i class="ri-close-line"></i>
        </button>
      </div>
      
      <div class="settings-body">
        <div class="settings-section">
          <h3>外观</h3>
          <div class="settings-item">
            <label>
              <span>主题</span>
              <select id="theme-select">
                <option value="light">亮色</option>
                <option value="dark">暗色</option>
                <option value="sepia">护眼</option>
              </select>
            </label>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>编辑器</h3>
          <div class="settings-item">
            <label>
              <input type="checkbox" id="focus-mode-checkbox">
              <span>专注模式</span>
              <small>隐藏界面元素，淡化非当前段落</small>
            </label>
          </div>
          <div class="settings-item">
            <label>
              <input type="checkbox" id="typewriter-mode-checkbox">
              <span>打字机模式</span>
              <small>始终将光标保持在屏幕中央</small>
            </label>
          </div>
          <div class="settings-item">
            <label>
              <input type="checkbox" id="code-folding-checkbox">
              <span>代码折叠</span>
              <small>允许折叠长代码块</small>
            </label>
          </div>
          <div class="settings-item">
            <label>
              <input type="checkbox" id="auto-save-checkbox">
              <span>自动保存</span>
              <small>每30秒自动保存文件</small>
            </label>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>拼写检查</h3>
          <div class="spell-check-settings">
            <div class="spell-check-setting-item">
              <span class="spell-check-setting-label">启用拼写检查</span>
              <div class="spell-check-toggle" id="spell-check-toggle">
              </div>
            </div>
            <div class="spell-check-setting-item">
              <span class="spell-check-setting-label">检查语言</span>
              <select class="spell-check-language-select" id="spell-check-language">
                <option value="zh-CN">中文</option>
                <option value="en-US">English</option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>快捷键</h3>
          <div class="settings-shortcuts">
            <div class="shortcut-item">
              <span class="shortcut-desc">查找/替换</span>
              <span class="shortcut-key">Ctrl+F / Ctrl+H</span>
            </div>
            <div class="shortcut-item">
              <span class="shortcut-desc">源码编辑</span>
              <span class="shortcut-key">按住 Alt 点击元素</span>
            </div>
            <div class="shortcut-item">
              <span class="shortcut-desc">插入图片</span>
              <span class="shortcut-key">Ctrl+Shift+I</span>
            </div>
            <div class="shortcut-item">
              <span class="shortcut-desc">插入链接</span>
              <span class="shortcut-key">Ctrl+K</span>
            </div>
            <div class="shortcut-item">
              <span class="shortcut-desc">切换粗体</span>
              <span class="shortcut-key">Ctrl+B</span>
            </div>
            <div class="shortcut-item">
              <span class="shortcut-desc">切换斜体</span>
              <span class="shortcut-key">Ctrl+I</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(panel)
  settingsPanel = panel
  
  // Add event listeners
  const closeBtn = document.getElementById('settings-close')
  closeBtn?.addEventListener('click', closeSettings)
  
  const themeSelect = document.getElementById('theme-select') as HTMLSelectElement
  themeSelect?.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement
    switchTheme(target.value)
  })
  
  const focusModeCheckbox = document.getElementById('focus-mode-checkbox') as HTMLInputElement
  focusModeCheckbox?.addEventListener('change', toggleFocusMode)
  
  const typewriterModeCheckbox = document.getElementById('typewriter-mode-checkbox') as HTMLInputElement
  typewriterModeCheckbox?.addEventListener('change', toggleTypewriterMode)
  
  const codeFoldingCheckbox = document.getElementById('code-folding-checkbox') as HTMLInputElement
  codeFoldingCheckbox?.addEventListener('change', toggleCodeFolding)
  
  const autoSaveCheckbox = document.getElementById('auto-save-checkbox') as HTMLInputElement
  autoSaveCheckbox?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement
    localStorage.setItem('autoSaveEnabled', target.checked.toString())
    // Trigger auto save update
    const event = new CustomEvent('autoSaveSettingChanged', { detail: target.checked })
    window.dispatchEvent(event)
  })
  
  // Spell check event listeners
  const spellCheckToggle = document.getElementById('spell-check-toggle')
  spellCheckToggle?.addEventListener('click', () => {
    const newState = !spellChecker.getEnabled()
    spellChecker.setEnabled(newState)
    spellCheckToggle.classList.toggle('active', newState)
  })
  
  const spellCheckLanguage = document.getElementById('spell-check-language') as HTMLSelectElement
  spellCheckLanguage?.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement
    spellChecker.setLanguage(target.value)
  })
  
  // Click outside to close
  panel.addEventListener('click', (e) => {
    if (e.target === panel) {
      closeSettings()
    }
  })
  
  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsPanel && !settingsPanel.classList.contains('hidden')) {
      closeSettings()
    }
  })
}

function toggleSettings(): void {
  if (!settingsPanel) return
  
  if (settingsPanel.classList.contains('hidden')) {
    openSettings()
  } else {
    closeSettings()
  }
}

function openSettings(): void {
  if (!settingsPanel) return
  
  settingsPanel.classList.remove('hidden')
  
  // Update settings UI to reflect current state
  updateSettingsUI()
}

function closeSettings(): void {
  if (!settingsPanel) return
  
  settingsPanel.classList.add('hidden')
}

function updateSettingsUI(): void {
  // Update theme select
  const themeSelect = document.getElementById('theme-select') as HTMLSelectElement
  if (themeSelect) {
    themeSelect.value = getCurrentTheme()
  }
  
  // Update checkboxes
  const focusModeCheckbox = document.getElementById('focus-mode-checkbox') as HTMLInputElement
  if (focusModeCheckbox) {
    focusModeCheckbox.checked = localStorage.getItem('focusModeEnabled') === 'true'
  }
  
  const typewriterModeCheckbox = document.getElementById('typewriter-mode-checkbox') as HTMLInputElement
  if (typewriterModeCheckbox) {
    typewriterModeCheckbox.checked = localStorage.getItem('typewriterModeEnabled') === 'true'
  }
  
  const codeFoldingCheckbox = document.getElementById('code-folding-checkbox') as HTMLInputElement
  if (codeFoldingCheckbox) {
    codeFoldingCheckbox.checked = localStorage.getItem('codeFoldingEnabled') === 'true'
  }
  
  const autoSaveCheckbox = document.getElementById('auto-save-checkbox') as HTMLInputElement
  if (autoSaveCheckbox) {
    autoSaveCheckbox.checked = localStorage.getItem('autoSaveEnabled') === 'true'
  }
  
  // Update spell check settings
  const spellCheckToggle = document.getElementById('spell-check-toggle')
  if (spellCheckToggle) {
    spellCheckToggle.classList.toggle('active', spellChecker.getEnabled())
  }
  
  const spellCheckLanguage = document.getElementById('spell-check-language') as HTMLSelectElement
  if (spellCheckLanguage) {
    spellCheckLanguage.value = spellChecker.getLanguage()
  }
}

function loadSettings(): void {
  // Settings are loaded in their respective modules
  // This function is here for future extensions
}

export function isSettingsOpen(): boolean {
  return settingsPanel ? !settingsPanel.classList.contains('hidden') : false
}