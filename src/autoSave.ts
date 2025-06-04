import { saveFile } from './fileManager'
import { getCurrentFilePath } from './editor'
import { getEditor } from './editor'

let autoSaveEnabled = false
let autoSaveTimer: number | null = null
let autoSaveInterval = 30000 // 30 seconds default
let lastSavedContent = ''

export function initAutoSave(): void {
  // Load auto-save settings
  const savedEnabled = localStorage.getItem('autoSaveEnabled') === 'true'
  const savedInterval = localStorage.getItem('autoSaveInterval')
  
  if (savedInterval) {
    autoSaveInterval = parseInt(savedInterval, 10)
  }
  
  if (savedEnabled) {
    enableAutoSave()
  }
  
  // Create auto-save indicator
  createAutoSaveIndicator()
  
  // Listen for settings changes
  window.addEventListener('autoSaveSettingChanged', (e) => {
    const event = e as CustomEvent
    if (event.detail) {
      enableAutoSave()
    } else {
      disableAutoSave()
    }
  })
}

export function enableAutoSave(): void {
  autoSaveEnabled = true
  localStorage.setItem('autoSaveEnabled', 'true')
  
  const editor = getEditor()
  if (editor) {
    // Listen for changes
    editor.on('update', scheduleAutoSave)
  }
  
  updateIndicator('enabled')
}

export function disableAutoSave(): void {
  autoSaveEnabled = false
  localStorage.setItem('autoSaveEnabled', 'false')
  
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }
  
  const editor = getEditor()
  if (editor) {
    editor.off('update', scheduleAutoSave)
  }
  
  updateIndicator('disabled')
}

export function setAutoSaveInterval(interval: number): void {
  autoSaveInterval = interval
  localStorage.setItem('autoSaveInterval', interval.toString())
  
  // Reschedule if active
  if (autoSaveEnabled && autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    scheduleAutoSave()
  }
}

function scheduleAutoSave(): void {
  if (!autoSaveEnabled) return
  
  // Clear existing timer
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  
  updateIndicator('pending')
  
  // Schedule new save
  autoSaveTimer = setTimeout(async () => {
    await performAutoSave()
  }, autoSaveInterval) as unknown as number
}

async function performAutoSave(): Promise<void> {
  const filePath = getCurrentFilePath()
  if (!filePath) return
  
  const editor = getEditor()
  if (!editor) return
  
  const currentContent = editor.getHTML()
  
  // Check if content has changed
  if (currentContent === lastSavedContent) {
    updateIndicator('saved')
    return
  }
  
  updateIndicator('saving')
  
  try {
    await saveFile()
    lastSavedContent = currentContent
    updateIndicator('saved')
  } catch (error) {
    console.error('Auto-save failed:', error)
    updateIndicator('error')
  }
}

function createAutoSaveIndicator(): void {
  const indicator = document.createElement('div')
  indicator.id = 'auto-save-indicator'
  indicator.className = 'auto-save-indicator'
  indicator.innerHTML = `
    <i class="ri-save-3-line"></i>
    <span class="auto-save-text">自动保存已关闭</span>
  `
  
  const navbar = document.getElementById('navbar')
  navbar?.appendChild(indicator)
  
  // Click to toggle settings
  indicator.addEventListener('click', showAutoSaveSettings)
}

function updateIndicator(status: 'enabled' | 'disabled' | 'pending' | 'saving' | 'saved' | 'error'): void {
  const indicator = document.getElementById('auto-save-indicator')
  if (!indicator) return
  
  const icon = indicator.querySelector('i')
  const text = indicator.querySelector('.auto-save-text')
  
  if (!icon || !text) return
  
  switch (status) {
    case 'enabled':
      icon.className = 'ri-save-3-line'
      text.textContent = '自动保存已开启'
      indicator.className = 'auto-save-indicator enabled'
      break
    case 'disabled':
      icon.className = 'ri-save-3-line'
      text.textContent = '自动保存已关闭'
      indicator.className = 'auto-save-indicator disabled'
      break
    case 'pending':
      icon.className = 'ri-time-line'
      text.textContent = '等待保存...'
      indicator.className = 'auto-save-indicator pending'
      break
    case 'saving':
      icon.className = 'ri-loader-4-line spinning'
      text.textContent = '正在保存...'
      indicator.className = 'auto-save-indicator saving'
      break
    case 'saved':
      icon.className = 'ri-check-line'
      text.textContent = '已保存'
      indicator.className = 'auto-save-indicator saved'
      
      // Reset to enabled after 2 seconds
      setTimeout(() => {
        if (autoSaveEnabled) {
          updateIndicator('enabled')
        }
      }, 2000)
      break
    case 'error':
      icon.className = 'ri-error-warning-line'
      text.textContent = '保存失败'
      indicator.className = 'auto-save-indicator error'
      break
  }
}

function showAutoSaveSettings(): void {
  const modal = document.createElement('div')
  modal.className = 'auto-save-modal'
  modal.innerHTML = `
    <div class="auto-save-modal-content">
      <div class="auto-save-modal-header">
        <h3>自动保存设置</h3>
        <button class="auto-save-modal-close"><i class="ri-close-line"></i></button>
      </div>
      <div class="auto-save-modal-body">
        <div class="auto-save-toggle">
          <label class="switch">
            <input type="checkbox" id="auto-save-toggle" ${autoSaveEnabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          <span>启用自动保存</span>
        </div>
        <div class="auto-save-interval">
          <label>保存间隔</label>
          <select id="auto-save-interval">
            <option value="10000" ${autoSaveInterval === 10000 ? 'selected' : ''}>10秒</option>
            <option value="30000" ${autoSaveInterval === 30000 ? 'selected' : ''}>30秒</option>
            <option value="60000" ${autoSaveInterval === 60000 ? 'selected' : ''}>1分钟</option>
            <option value="300000" ${autoSaveInterval === 300000 ? 'selected' : ''}>5分钟</option>
            <option value="600000" ${autoSaveInterval === 600000 ? 'selected' : ''}>10分钟</option>
          </select>
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Event handlers
  const closeBtn = modal.querySelector('.auto-save-modal-close')
  closeBtn?.addEventListener('click', () => modal.remove())
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
  
  // Toggle handler
  const toggle = modal.querySelector('#auto-save-toggle') as HTMLInputElement
  toggle?.addEventListener('change', () => {
    if (toggle.checked) {
      enableAutoSave()
    } else {
      disableAutoSave()
    }
  })
  
  // Interval handler
  const intervalSelect = modal.querySelector('#auto-save-interval') as HTMLSelectElement
  intervalSelect?.addEventListener('change', () => {
    setAutoSaveInterval(parseInt(intervalSelect.value, 10))
  })
}