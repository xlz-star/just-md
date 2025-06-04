import { OpenedFile } from './types'
import { setEditorContent, setCurrentFile } from './editor'
import { saveFile } from './fileManager'
import { updateDocumentTitle } from './layoutManager'

interface Tab {
  id: string
  file: OpenedFile
  element: HTMLElement
}

let tabs: Tab[] = []
let activeTabId: string | null = null

export function initTabManager(): void {
  // Tab bar event delegation
  const tabBar = document.getElementById('tab-bar')
  if (!tabBar) return
  
  tabBar.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    
    // Click on tab
    const tab = target.closest('.file-tab')
    if (tab && !target.closest('.file-tab-close')) {
      const tabId = tab.getAttribute('data-tab-id')
      if (tabId) {
        switchToTab(tabId)
      }
    }
    
    // Click on close button
    if (target.closest('.file-tab-close')) {
      const tab = target.closest('.file-tab')
      const tabId = tab?.getAttribute('data-tab-id')
      if (tabId) {
        closeTab(tabId)
      }
    }
  })
  
  // Middle click to close
  tabBar.addEventListener('mousedown', (e) => {
    if (e.button === 1) { // Middle click
      const tab = (e.target as HTMLElement).closest('.file-tab')
      const tabId = tab?.getAttribute('data-tab-id')
      if (tabId) {
        e.preventDefault()
        closeTab(tabId)
      }
    }
  })
}

export function addTab(file: OpenedFile, activate = true): void {
  // Check if tab already exists
  const existingTab = tabs.find(t => t.file.path === file.path)
  if (existingTab) {
    if (activate) {
      switchToTab(existingTab.id)
    }
    return
  }
  
  // Create tab element
  const tabElement = createTabElement(file)
  const tabBar = document.getElementById('tab-bar')
  if (!tabBar) return
  
  tabBar.appendChild(tabElement)
  
  // Add to tabs array
  const tab: Tab = {
    id: file.id,
    file,
    element: tabElement
  }
  tabs.push(tab)
  
  // Activate if requested
  if (activate) {
    switchToTab(tab.id)
  }
}

function createTabElement(file: OpenedFile): HTMLElement {
  const tab = document.createElement('div')
  tab.className = 'file-tab'
  tab.setAttribute('data-tab-id', file.id)
  tab.innerHTML = `
    <span class="file-tab-name">${file.name}</span>
    <span class="file-tab-close">
      <i class="ri-close-line"></i>
    </span>
  `
  
  // Add modified indicator
  if (file.isDirty) {
    tab.classList.add('modified')
  }
  
  return tab
}

export function switchToTab(tabId: string): void {
  const tab = tabs.find(t => t.id === tabId)
  if (!tab) return
  
  // Save current file if modified
  if (activeTabId && activeTabId !== tabId) {
    const currentTab = tabs.find(t => t.id === activeTabId)
    if (currentTab?.file.isDirty) {
      saveFile().catch(console.error)
    }
  }
  
  // Update active states
  tabs.forEach(t => {
    if (t.id === tabId) {
      t.element.classList.add('active')
    } else {
      t.element.classList.remove('active')
    }
  })
  
  activeTabId = tabId
  
  // Update editor content
  setCurrentFile(tab.file.path, tab.file.name)
  setEditorContent(tab.file.content)
  
  // Update document title
  updateDocumentTitle(tab.file.name)
  
  // Scroll tab into view
  tab.element.scrollIntoView({ behavior: 'smooth', inline: 'center' })
}

export function closeTab(tabId: string): void {
  const tabIndex = tabs.findIndex(t => t.id === tabId)
  if (tabIndex === -1) return
  
  const tab = tabs[tabIndex]
  
  // Check if file has unsaved changes
  if (tab.file.isDirty) {
    const save = confirm(`"${tab.file.name}" 有未保存的更改。是否保存？`)
    if (save) {
      saveFile().then(() => {
        removeTab(tabIndex)
      })
      return
    }
  }
  
  removeTab(tabIndex)
}

function removeTab(tabIndex: number): void {
  const tab = tabs[tabIndex]
  if (!tab) return
  
  // Remove from DOM
  tab.element.remove()
  
  // Remove from array
  tabs.splice(tabIndex, 1)
  
  // If this was the active tab, switch to another
  if (tab.id === activeTabId) {
    if (tabs.length > 0) {
      // Switch to the next tab or previous if it was the last
      const newIndex = Math.min(tabIndex, tabs.length - 1)
      switchToTab(tabs[newIndex].id)
    } else {
      // No tabs left, create a new empty one
      activeTabId = null
      createNewTab()
    }
  }
}

export function createNewTab(): void {
  const newFile: OpenedFile = {
    id: `new-${Date.now()}`,
    path: '',
    name: '未命名文档',
    content: '',
    isDirty: false
  }
  
  addTab(newFile, true)
}

export function updateTabDirtyState(tabId: string, isDirty: boolean): void {
  const tab = tabs.find(t => t.id === tabId)
  if (!tab) return
  
  tab.file.isDirty = isDirty
  
  if (isDirty) {
    tab.element.classList.add('modified')
  } else {
    tab.element.classList.remove('modified')
  }
}

export function getActiveTab(): Tab | null {
  if (!activeTabId) return null
  return tabs.find(t => t.id === activeTabId) || null
}

export function getAllTabs(): Tab[] {
  return tabs
}

export function closeAllTabs(): void {
  // Check for unsaved changes
  const unsavedTabs = tabs.filter(t => t.file.isDirty)
  if (unsavedTabs.length > 0) {
    const save = confirm(`有 ${unsavedTabs.length} 个文件未保存。是否全部保存？`)
    if (save) {
      // Save all and then close
      Promise.all(unsavedTabs.map(() => saveFile()))
        .then(() => {
          tabs.forEach(t => t.element.remove())
          tabs = []
          activeTabId = null
          createNewTab()
        })
      return
    }
  }
  
  // Close all tabs
  tabs.forEach(t => t.element.remove())
  tabs = []
  activeTabId = null
  createNewTab()
}

// Add CSS for modified indicator
const style = document.createElement('style')
style.textContent = `
  .file-tab.modified .file-tab-name::after {
    content: '•';
    margin-left: 4px;
    color: var(--text-secondary);
    font-size: 16px;
    vertical-align: middle;
  }
`
document.head.appendChild(style)