import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock settings functionality
const createSettingsManager = () => {
  let settingsPanel: HTMLElement | null = null
  let isOpen = false
  
  const createSettingsPanel = () => {
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
              </label>
            </div>
            <div class="settings-item">
              <label>
                <input type="checkbox" id="typewriter-mode-checkbox">
                <span>打字机模式</span>
              </label>
            </div>
            <div class="settings-item">
              <label>
                <input type="checkbox" id="auto-save-checkbox">
                <span>自动保存</span>
              </label>
            </div>
          </div>
          
          <div class="settings-section">
            <h3>工具</h3>
            <div class="settings-tools">
              <div class="tool-item">
                <button class="tool-btn" id="find-replace-tool">
                  <i class="ri-search-line"></i>
                  <span>查找/替换</span>
                </button>
              </div>
              <div class="tool-item">
                <button class="tool-btn" id="writing-stats-tool">
                  <i class="ri-bar-chart-line"></i>
                  <span>写作统计</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
    
    document.body.appendChild(panel)
    settingsPanel = panel
    
    // Add event listeners
    const closeBtn = panel.querySelector('#settings-close')
    closeBtn?.addEventListener('click', closeSettings)
    
    // Theme select handler
    const themeSelect = panel.querySelector('#theme-select') as HTMLSelectElement
    themeSelect?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement
      localStorage.setItem('selectedTheme', target.value)
      // Trigger theme change event
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: target.value }))
    })
    
    // Checkbox handlers
    const focusCheckbox = panel.querySelector('#focus-mode-checkbox') as HTMLInputElement
    focusCheckbox?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement
      localStorage.setItem('focusModeEnabled', target.checked.toString())
      window.dispatchEvent(new CustomEvent('focusModeChanged', { detail: target.checked }))
    })
    
    const typewriterCheckbox = panel.querySelector('#typewriter-mode-checkbox') as HTMLInputElement
    typewriterCheckbox?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement
      localStorage.setItem('typewriterModeEnabled', target.checked.toString())
      window.dispatchEvent(new CustomEvent('typewriterModeChanged', { detail: target.checked }))
    })
    
    const autoSaveCheckbox = panel.querySelector('#auto-save-checkbox') as HTMLInputElement
    autoSaveCheckbox?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement
      localStorage.setItem('autoSaveEnabled', target.checked.toString())
      window.dispatchEvent(new CustomEvent('autoSaveChanged', { detail: target.checked }))
    })
    
    // Tool buttons
    panel.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      const toolBtn = target.closest('.tool-btn') as HTMLElement
      if (!toolBtn) return
      
      const toolId = toolBtn.id
      closeSettings() // Close settings first
      
      // Simulate tool activation
      window.dispatchEvent(new CustomEvent('toolActivated', { detail: toolId }))
    })
    
    // Click outside to close
    panel.addEventListener('click', (e) => {
      if (e.target === panel) {
        closeSettings()
      }
    })
    
    return panel
  }
  
  const openSettings = () => {
    if (!settingsPanel) return
    
    settingsPanel.classList.remove('hidden')
    isOpen = true
    
    // Update UI to reflect current state
    updateSettingsUI()
  }
  
  const closeSettings = () => {
    if (!settingsPanel) return
    
    settingsPanel.classList.add('hidden')
    isOpen = false
  }
  
  const toggleSettings = () => {
    if (isOpen) {
      closeSettings()
    } else {
      openSettings()
    }
  }
  
  const updateSettingsUI = () => {
    if (!settingsPanel) return
    
    // Update theme select
    const themeSelect = settingsPanel.querySelector('#theme-select') as HTMLSelectElement
    if (themeSelect) {
      themeSelect.value = localStorage.getItem('selectedTheme') || 'light'
    }
    
    // Update checkboxes
    const focusCheckbox = settingsPanel.querySelector('#focus-mode-checkbox') as HTMLInputElement
    if (focusCheckbox) {
      focusCheckbox.checked = localStorage.getItem('focusModeEnabled') === 'true'
    }
    
    const typewriterCheckbox = settingsPanel.querySelector('#typewriter-mode-checkbox') as HTMLInputElement
    if (typewriterCheckbox) {
      typewriterCheckbox.checked = localStorage.getItem('typewriterModeEnabled') === 'true'
    }
    
    const autoSaveCheckbox = settingsPanel.querySelector('#auto-save-checkbox') as HTMLInputElement
    if (autoSaveCheckbox) {
      autoSaveCheckbox.checked = localStorage.getItem('autoSaveEnabled') === 'true'
    }
  }
  
  const loadSettings = () => {
    // Load settings from localStorage
    const theme = localStorage.getItem('selectedTheme') || 'light'
    const focusMode = localStorage.getItem('focusModeEnabled') === 'true'
    const typewriterMode = localStorage.getItem('typewriterModeEnabled') === 'true'
    const autoSave = localStorage.getItem('autoSaveEnabled') === 'true'
    
    return { theme, focusMode, typewriterMode, autoSave }
  }
  
  const saveSettings = (settings: {
    theme?: string
    focusMode?: boolean
    typewriterMode?: boolean
    autoSave?: boolean
  }) => {
    if (settings.theme !== undefined) {
      localStorage.setItem('selectedTheme', settings.theme)
    }
    if (settings.focusMode !== undefined) {
      localStorage.setItem('focusModeEnabled', settings.focusMode.toString())
    }
    if (settings.typewriterMode !== undefined) {
      localStorage.setItem('typewriterModeEnabled', settings.typewriterMode.toString())
    }
    if (settings.autoSave !== undefined) {
      localStorage.setItem('autoSaveEnabled', settings.autoSave.toString())
    }
  }
  
  const resetSettings = () => {
    localStorage.removeItem('selectedTheme')
    localStorage.removeItem('focusModeEnabled')
    localStorage.removeItem('typewriterModeEnabled')
    localStorage.removeItem('autoSaveEnabled')
    
    if (settingsPanel) {
      updateSettingsUI()
    }
  }
  
  return {
    createSettingsPanel,
    openSettings,
    closeSettings,
    toggleSettings,
    updateSettingsUI,
    loadSettings,
    saveSettings,
    resetSettings,
    isSettingsOpen: () => isOpen,
    getSettingsPanel: () => settingsPanel
  }
}

describe('Settings Manager Functionality', () => {
  let settingsManager: ReturnType<typeof createSettingsManager>
  
  beforeEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    vi.clearAllMocks()
    settingsManager = createSettingsManager()
  })
  
  describe('Settings Panel Creation', () => {
    it('should create settings panel with correct structure', () => {
      const panel = settingsManager.createSettingsPanel()
      
      expect(panel.id).toBe('settings-panel')
      expect(panel.classList.contains('settings-panel')).toBe(true)
      expect(panel.classList.contains('hidden')).toBe(true)
      expect(panel.querySelector('#theme-select')).toBeTruthy()
      expect(panel.querySelector('#focus-mode-checkbox')).toBeTruthy()
      expect(panel.querySelector('#typewriter-mode-checkbox')).toBeTruthy()
      expect(panel.querySelector('#auto-save-checkbox')).toBeTruthy()
    })
    
    it('should append panel to document body', () => {
      settingsManager.createSettingsPanel()
      expect(document.querySelector('#settings-panel')).toBeTruthy()
    })
    
    it('should set up event listeners', () => {
      settingsManager.createSettingsPanel()
      const panel = document.querySelector('#settings-panel')
      
      expect(panel?.querySelector('#settings-close')).toBeTruthy()
      expect(panel?.querySelector('#theme-select')).toBeTruthy()
      expect(panel?.querySelector('#focus-mode-checkbox')).toBeTruthy()
    })
  })
  
  describe('Settings Panel Visibility', () => {
    beforeEach(() => {
      settingsManager.createSettingsPanel()
    })
    
    it('should open settings panel', () => {
      expect(settingsManager.isSettingsOpen()).toBe(false)
      
      settingsManager.openSettings()
      
      expect(settingsManager.isSettingsOpen()).toBe(true)
      expect(settingsManager.getSettingsPanel()?.classList.contains('hidden')).toBe(false)
    })
    
    it('should close settings panel', () => {
      settingsManager.openSettings()
      expect(settingsManager.isSettingsOpen()).toBe(true)
      
      settingsManager.closeSettings()
      
      expect(settingsManager.isSettingsOpen()).toBe(false)
      expect(settingsManager.getSettingsPanel()?.classList.contains('hidden')).toBe(true)
    })
    
    it('should toggle settings panel', () => {
      expect(settingsManager.isSettingsOpen()).toBe(false)
      
      settingsManager.toggleSettings()
      expect(settingsManager.isSettingsOpen()).toBe(true)
      
      settingsManager.toggleSettings()
      expect(settingsManager.isSettingsOpen()).toBe(false)
    })
    
    it('should close when clicking close button', () => {
      settingsManager.openSettings()
      
      const closeBtn = document.querySelector('#settings-close') as HTMLElement
      closeBtn.click()
      
      expect(settingsManager.isSettingsOpen()).toBe(false)
    })
    
    it('should close when clicking outside panel', () => {
      settingsManager.openSettings()
      const panel = settingsManager.getSettingsPanel()!
      
      // Simulate click on panel background
      panel.dispatchEvent(new MouseEvent('click', {
        target: panel as any,
        bubbles: true
      }))
      
      expect(settingsManager.isSettingsOpen()).toBe(false)
    })
  })
  
  describe('Theme Settings', () => {
    beforeEach(() => {
      settingsManager.createSettingsPanel()
    })
    
    it('should change theme when select value changes', () => {
      const themeSelect = document.querySelector('#theme-select') as HTMLSelectElement
      const eventSpy = vi.fn()
      window.addEventListener('themeChanged', eventSpy)
      
      themeSelect.value = 'dark'
      themeSelect.dispatchEvent(new Event('change'))
      
      expect(localStorage.getItem('selectedTheme')).toBe('dark')
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'dark'
        })
      )
    })
    
    it('should load saved theme on UI update', () => {
      localStorage.setItem('selectedTheme', 'sepia')
      
      settingsManager.updateSettingsUI()
      
      const themeSelect = document.querySelector('#theme-select') as HTMLSelectElement
      expect(themeSelect.value).toBe('sepia')
    })
    
    it('should default to light theme', () => {
      settingsManager.updateSettingsUI()
      
      const themeSelect = document.querySelector('#theme-select') as HTMLSelectElement
      expect(themeSelect.value).toBe('light')
    })
  })
  
  describe('Editor Settings', () => {
    beforeEach(() => {
      settingsManager.createSettingsPanel()
    })
    
    it('should toggle focus mode', () => {
      const checkbox = document.querySelector('#focus-mode-checkbox') as HTMLInputElement
      const eventSpy = vi.fn()
      window.addEventListener('focusModeChanged', eventSpy)
      
      checkbox.checked = true
      checkbox.dispatchEvent(new Event('change'))
      
      expect(localStorage.getItem('focusModeEnabled')).toBe('true')
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: true
        })
      )
    })
    
    it('should toggle typewriter mode', () => {
      const checkbox = document.querySelector('#typewriter-mode-checkbox') as HTMLInputElement
      const eventSpy = vi.fn()
      window.addEventListener('typewriterModeChanged', eventSpy)
      
      checkbox.checked = true
      checkbox.dispatchEvent(new Event('change'))
      
      expect(localStorage.getItem('typewriterModeEnabled')).toBe('true')
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: true
        })
      )
    })
    
    it('should toggle auto save', () => {
      const checkbox = document.querySelector('#auto-save-checkbox') as HTMLInputElement
      const eventSpy = vi.fn()
      window.addEventListener('autoSaveChanged', eventSpy)
      
      checkbox.checked = true
      checkbox.dispatchEvent(new Event('change'))
      
      expect(localStorage.getItem('autoSaveEnabled')).toBe('true')
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: true
        })
      )
    })
    
    it('should restore checkbox states from localStorage', () => {
      localStorage.setItem('focusModeEnabled', 'true')
      localStorage.setItem('typewriterModeEnabled', 'false')
      localStorage.setItem('autoSaveEnabled', 'true')
      
      settingsManager.updateSettingsUI()
      
      const focusCheckbox = document.querySelector('#focus-mode-checkbox') as HTMLInputElement
      const typewriterCheckbox = document.querySelector('#typewriter-mode-checkbox') as HTMLInputElement
      const autoSaveCheckbox = document.querySelector('#auto-save-checkbox') as HTMLInputElement
      
      expect(focusCheckbox.checked).toBe(true)
      expect(typewriterCheckbox.checked).toBe(false)
      expect(autoSaveCheckbox.checked).toBe(true)
    })
  })
  
  describe('Tool Buttons', () => {
    beforeEach(() => {
      settingsManager.createSettingsPanel()
    })
    
    it('should activate tools when clicked', () => {
      const eventSpy = vi.fn()
      window.addEventListener('toolActivated', eventSpy)
      
      const findReplaceBtn = document.querySelector('#find-replace-tool') as HTMLElement
      findReplaceBtn.click()
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'find-replace-tool'
        })
      )
      expect(settingsManager.isSettingsOpen()).toBe(false) // Should close settings
    })
    
    it('should handle writing stats tool', () => {
      const eventSpy = vi.fn()
      window.addEventListener('toolActivated', eventSpy)
      
      const writingStatsBtn = document.querySelector('#writing-stats-tool') as HTMLElement
      writingStatsBtn.click()
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'writing-stats-tool'
        })
      )
    })
  })
  
  describe('Settings Persistence', () => {
    it('should load settings from localStorage', () => {
      localStorage.setItem('selectedTheme', 'dark')
      localStorage.setItem('focusModeEnabled', 'true')
      localStorage.setItem('typewriterModeEnabled', 'false')
      localStorage.setItem('autoSaveEnabled', 'true')
      
      const settings = settingsManager.loadSettings()
      
      expect(settings.theme).toBe('dark')
      expect(settings.focusMode).toBe(true)
      expect(settings.typewriterMode).toBe(false)
      expect(settings.autoSave).toBe(true)
    })
    
    it('should save settings to localStorage', () => {
      settingsManager.saveSettings({
        theme: 'sepia',
        focusMode: true,
        typewriterMode: true,
        autoSave: false
      })
      
      expect(localStorage.getItem('selectedTheme')).toBe('sepia')
      expect(localStorage.getItem('focusModeEnabled')).toBe('true')
      expect(localStorage.getItem('typewriterModeEnabled')).toBe('true')
      expect(localStorage.getItem('autoSaveEnabled')).toBe('false')
    })
    
    it('should save partial settings', () => {
      localStorage.setItem('selectedTheme', 'dark')
      localStorage.setItem('focusModeEnabled', 'true')
      
      settingsManager.saveSettings({
        autoSave: true
      })
      
      expect(localStorage.getItem('selectedTheme')).toBe('dark') // Should remain unchanged
      expect(localStorage.getItem('focusModeEnabled')).toBe('true') // Should remain unchanged
      expect(localStorage.getItem('autoSaveEnabled')).toBe('true') // Should be updated
    })
    
    it('should reset all settings', () => {
      localStorage.setItem('selectedTheme', 'dark')
      localStorage.setItem('focusModeEnabled', 'true')
      localStorage.setItem('typewriterModeEnabled', 'true')
      localStorage.setItem('autoSaveEnabled', 'true')
      
      settingsManager.resetSettings()
      
      expect(localStorage.getItem('selectedTheme')).toBeNull()
      expect(localStorage.getItem('focusModeEnabled')).toBeNull()
      expect(localStorage.getItem('typewriterModeEnabled')).toBeNull()
      expect(localStorage.getItem('autoSaveEnabled')).toBeNull()
    })
  })
  
  describe('Edge Cases', () => {
    it('should handle missing localStorage values', () => {
      const settings = settingsManager.loadSettings()
      
      expect(settings.theme).toBe('light') // Default value
      expect(settings.focusMode).toBe(false)
      expect(settings.typewriterMode).toBe(false)
      expect(settings.autoSave).toBe(false)
    })
    
    it('should handle corrupted localStorage values', () => {
      localStorage.setItem('focusModeEnabled', 'invalid-boolean')
      localStorage.setItem('typewriterModeEnabled', 'not-a-boolean')
      
      const settings = settingsManager.loadSettings()
      
      expect(settings.focusMode).toBe(false) // Should default to false
      expect(settings.typewriterMode).toBe(false) // Should default to false
    })
    
    it('should handle operations when panel is not created', () => {
      // Don't create panel
      expect(() => settingsManager.openSettings()).not.toThrow()
      expect(() => settingsManager.closeSettings()).not.toThrow()
      expect(() => settingsManager.updateSettingsUI()).not.toThrow()
      
      expect(settingsManager.isSettingsOpen()).toBe(false)
      expect(settingsManager.getSettingsPanel()).toBeNull()
    })
    
    it('should handle multiple rapid toggle operations', () => {
      settingsManager.createSettingsPanel()
      
      for (let i = 0; i < 10; i++) {
        settingsManager.toggleSettings()
      }
      
      expect(settingsManager.isSettingsOpen()).toBe(false) // Should be closed after even number of toggles
    })
    
    it('should handle clicking on non-tool elements', () => {
      settingsManager.createSettingsPanel()
      const eventSpy = vi.fn()
      window.addEventListener('toolActivated', eventSpy)
      
      const header = document.querySelector('.settings-header') as HTMLElement
      header.click()
      
      expect(eventSpy).not.toHaveBeenCalled()
      expect(settingsManager.isSettingsOpen()).toBe(false) // Should not change state
    })
  })
})