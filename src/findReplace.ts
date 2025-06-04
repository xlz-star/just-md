import { getEditor } from './editor'
import { getSearchState } from './searchExtension'

let findReplacePanel: HTMLElement | null = null

export function initFindReplace(): void {
  // Create find/replace panel
  createFindReplacePanel()
  
  // Create find/replace button
  createFindReplaceButton()
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault()
      toggleFindReplace()
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
      e.preventDefault()
      toggleFindReplace(true)
    }
    
    if (e.key === 'Escape' && findReplacePanel && !findReplacePanel.classList.contains('hidden')) {
      closeFindReplace()
    }
  })
}

function createFindReplaceButton(): void {
  const button = document.createElement('button')
  button.id = 'find-replace-btn'
  button.className = 'floating-btn find-replace-btn'
  button.title = '查找/替换 (Ctrl+F)'
  button.innerHTML = '<i class="ri-search-line"></i>'
  
  document.getElementById('app')?.appendChild(button)
  
  button.addEventListener('click', () => toggleFindReplace())
}

function createFindReplacePanel(): void {
  const panel = document.createElement('div')
  panel.id = 'find-replace-panel'
  panel.className = 'find-replace-panel hidden'
  panel.innerHTML = `
    <div class="find-replace-content">
      <div class="find-replace-row">
        <input type="text" id="find-input" placeholder="查找..." class="find-replace-input">
        <span class="match-count" id="match-count">0/0</span>
        <button id="find-prev" class="find-replace-btn" title="上一个 (Shift+F3)">
          <i class="ri-arrow-up-s-line"></i>
        </button>
        <button id="find-next" class="find-replace-btn" title="下一个 (F3)">
          <i class="ri-arrow-down-s-line"></i>
        </button>
        <button id="close-find-replace" class="find-replace-btn" title="关闭 (Esc)">
          <i class="ri-close-line"></i>
        </button>
      </div>
      <div class="find-replace-row replace-row hidden">
        <input type="text" id="replace-input" placeholder="替换为..." class="find-replace-input">
        <button id="replace-one" class="find-replace-btn" title="替换">
          替换
        </button>
        <button id="replace-all" class="find-replace-btn" title="全部替换">
          全部替换
        </button>
      </div>
      <div class="find-replace-options">
        <label>
          <input type="checkbox" id="case-sensitive">
          区分大小写
        </label>
        <label>
          <input type="checkbox" id="whole-word">
          全词匹配
        </label>
        <label>
          <input type="checkbox" id="use-regex">
          正则表达式
        </label>
      </div>
    </div>
  `
  
  // Insert panel after navbar
  const navbar = document.getElementById('navbar')
  navbar?.insertAdjacentElement('afterend', panel)
  
  findReplacePanel = panel
  
  // Add event listeners
  const findInput = document.getElementById('find-input') as HTMLInputElement
  const replaceInput = document.getElementById('replace-input') as HTMLInputElement
  const findPrev = document.getElementById('find-prev')
  const findNext = document.getElementById('find-next')
  const replaceOne = document.getElementById('replace-one')
  const replaceAll = document.getElementById('replace-all')
  const closeBtn = document.getElementById('close-find-replace')
  const caseSensitive = document.getElementById('case-sensitive') as HTMLInputElement
  const wholeWord = document.getElementById('whole-word') as HTMLInputElement
  const useRegex = document.getElementById('use-regex') as HTMLInputElement
  
  findInput?.addEventListener('input', () => {
    performSearch()
  })
  
  findInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        findPrevMatch()
      } else {
        findNextMatch()
      }
    }
  })
  
  replaceInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      replaceCurrentMatch()
    }
  })
  
  findPrev?.addEventListener('click', findPrevMatch)
  findNext?.addEventListener('click', findNextMatch)
  replaceOne?.addEventListener('click', replaceCurrentMatch)
  replaceAll?.addEventListener('click', replaceAllMatches)
  closeBtn?.addEventListener('click', closeFindReplace)
  
  caseSensitive?.addEventListener('change', performSearch)
  wholeWord?.addEventListener('change', performSearch)
  useRegex?.addEventListener('change', performSearch)
  
  // Add F3/Shift+F3 shortcuts
  document.addEventListener('keydown', (e) => {
    if (findReplacePanel && !findReplacePanel.classList.contains('hidden')) {
      if (e.key === 'F3') {
        e.preventDefault()
        if (e.shiftKey) {
          findPrevMatch()
        } else {
          findNextMatch()
        }
      }
    }
  })
}

export function toggleFindReplace(showReplace = false): void {
  if (!findReplacePanel) return
  
  const editor = getEditor()
  if (!editor) return
  
  const isHidden = findReplacePanel.classList.contains('hidden')
  
  if (isHidden) {
    findReplacePanel.classList.remove('hidden')
    
    // Show/hide replace row
    const replaceRow = findReplacePanel.querySelector('.replace-row')
    if (showReplace) {
      replaceRow?.classList.remove('hidden')
    } else {
      replaceRow?.classList.add('hidden')
    }
    
    // Focus find input
    const findInput = document.getElementById('find-input') as HTMLInputElement
    findInput?.focus()
    
    // Get selected text if any
    const { from, to } = editor.state.selection
    if (from !== to) {
      const selectedText = editor.state.doc.textBetween(from, to)
      if (selectedText && !selectedText.includes('\n')) {
        findInput.value = selectedText
        performSearch()
      }
    }
  } else {
    closeFindReplace()
  }
}

function closeFindReplace(): void {
  if (!findReplacePanel) return
  
  findReplacePanel.classList.add('hidden')
  
  // Clear search
  const editor = getEditor()
  editor?.commands.clearSearch()
  
  // Return focus to editor
  editor?.commands.focus()
}

function performSearch(): void {
  const editor = getEditor()
  if (!editor) return
  
  const findInput = document.getElementById('find-input') as HTMLInputElement
  const searchTerm = findInput?.value || ''
  
  if (!searchTerm) {
    editor.commands.clearSearch()
    updateMatchCount(0, 0)
    return
  }
  
  const caseSensitive = (document.getElementById('case-sensitive') as HTMLInputElement)?.checked
  const wholeWord = (document.getElementById('whole-word') as HTMLInputElement)?.checked
  const useRegex = (document.getElementById('use-regex') as HTMLInputElement)?.checked
  
  // Set search term with options
  editor.commands.setSearchTerm({
    searchTerm,
    caseSensitive,
    wholeWord,
    useRegex
  })
  
  // Get search state
  const searchState = getSearchState(editor.state)
  if (searchState) {
    const { searchResults, currentIndex } = searchState
    updateMatchCount(searchResults.length, currentIndex + 1)
    
    if (searchResults.length > 0 && currentIndex >= 0) {
      scrollToMatch(currentIndex)
    }
  }
}

function findNextMatch(): void {
  const editor = getEditor()
  if (!editor) return
  
  const searchState = getSearchState(editor.state)
  if (!searchState || searchState.searchResults.length === 0) return
  
  const { searchResults, currentIndex } = searchState
  const nextIndex = (currentIndex + 1) % searchResults.length
  
  editor.commands.setCurrentSearchIndex(nextIndex)
  scrollToMatch(nextIndex)
  updateMatchCount(searchResults.length, nextIndex + 1)
}

function findPrevMatch(): void {
  const editor = getEditor()
  if (!editor) return
  
  const searchState = getSearchState(editor.state)
  if (!searchState || searchState.searchResults.length === 0) return
  
  const { searchResults, currentIndex } = searchState
  const prevIndex = (currentIndex - 1 + searchResults.length) % searchResults.length
  
  editor.commands.setCurrentSearchIndex(prevIndex)
  scrollToMatch(prevIndex)
  updateMatchCount(searchResults.length, prevIndex + 1)
}

function scrollToMatch(index: number): void {
  const editor = getEditor()
  if (!editor) return
  
  const searchState = getSearchState(editor.state)
  if (!searchState || index >= searchState.searchResults.length) return
  
  const match = searchState.searchResults[index]
  editor.commands.setTextSelection({ from: match.from, to: match.to })
  
  // Scroll into view
  const { node } = editor.view.domAtPos(match.from)
  if (node && node.nodeType === Node.TEXT_NODE && node.parentElement) {
    node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function replaceCurrentMatch(): void {
  const editor = getEditor()
  if (!editor) return
  
  const searchState = getSearchState(editor.state)
  if (!searchState || searchState.currentIndex === -1 || searchState.searchResults.length === 0) return
  
  const replaceInput = document.getElementById('replace-input') as HTMLInputElement
  const replaceText = replaceInput?.value || ''
  
  const match = searchState.searchResults[searchState.currentIndex]
  editor.chain()
    .setTextSelection({ from: match.from, to: match.to })
    .insertContent(replaceText)
    .run()
  
  // Re-search after replace
  setTimeout(() => {
    performSearch()
  }, 0)
}

function replaceAllMatches(): void {
  const editor = getEditor()
  if (!editor) return
  
  const searchState = getSearchState(editor.state)
  if (!searchState || searchState.searchResults.length === 0) return
  
  const replaceInput = document.getElementById('replace-input') as HTMLInputElement
  const replaceText = replaceInput?.value || ''
  
  // Replace from end to start to maintain positions
  const reversedMatches = [...searchState.searchResults].reverse()
  
  editor.chain().focus().run()
  
  reversedMatches.forEach(match => {
    editor.chain()
      .setTextSelection({ from: match.from, to: match.to })
      .insertContent(replaceText)
      .run()
  })
  
  // Re-search after replace
  setTimeout(() => {
    performSearch()
  }, 0)
}

function updateMatchCount(total: number, current: number): void {
  const matchCount = document.getElementById('match-count')
  if (matchCount) {
    if (total === 0) {
      matchCount.textContent = '0/0'
    } else {
      matchCount.textContent = `${current}/${total}`
    }
  }
}

