import { getEditor } from './editor'

let wordCountElement: HTMLElement | null = null
let updateTimer: number | null = null

export function initWordCount(): void {
  createWordCountElement()
  
  const editor = getEditor()
  if (editor) {
    // Initial count
    updateWordCount()
    
    // Update on content change with debounce
    editor.on('update', () => {
      if (updateTimer) {
        clearTimeout(updateTimer)
      }
      updateTimer = setTimeout(() => {
        updateWordCount()
      }, 300) as unknown as number
    })
  }
}

function createWordCountElement(): void {
  const element = document.createElement('div')
  element.id = 'word-count'
  element.className = 'word-count'
  element.innerHTML = `
    <div class="word-count-content">
      <span class="word-count-item">
        <i class="ri-file-word-line"></i>
        <span id="word-count-value">0</span> 字
      </span>
      <span class="word-count-separator">|</span>
      <span class="word-count-item">
        <i class="ri-character-recognition-line"></i>
        <span id="char-count-value">0</span> 字符
      </span>
      <span class="word-count-separator">|</span>
      <span class="word-count-item">
        <i class="ri-paragraph"></i>
        <span id="para-count-value">0</span> 段落
      </span>
      <span class="word-count-separator">|</span>
      <span class="word-count-item">
        <i class="ri-time-line"></i>
        <span id="read-time-value">0</span> 分钟
      </span>
    </div>
  `
  
  // Add to bottom of editor
  const app = document.getElementById('app')
  app?.appendChild(element)
  
  wordCountElement = element
  
  // Add click handler to show detailed statistics
  element.addEventListener('click', showDetailedStats)
}

function updateWordCount(): void {
  const editor = getEditor()
  if (!editor || !wordCountElement) return
  
  const text = editor.state.doc.textContent
  
  // Count words (Chinese and English)
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = text
    .replace(/[\u4e00-\u9fa5]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0).length
  const totalWords = chineseChars + englishWords
  
  // Count characters (excluding spaces)
  const charCount = text.replace(/\s/g, '').length
  
  // Count paragraphs
  const paragraphs = text.split(/\n\n+/).filter(para => para.trim().length > 0).length
  
  // Estimate reading time (250 words per minute for English, 300 chars per minute for Chinese)
  const readingTime = Math.ceil((chineseChars / 300) + (englishWords / 250))
  
  // Update UI
  const wordCountValue = document.getElementById('word-count-value')
  const charCountValue = document.getElementById('char-count-value')
  const paraCountValue = document.getElementById('para-count-value')
  const readTimeValue = document.getElementById('read-time-value')
  
  if (wordCountValue) wordCountValue.textContent = totalWords.toString()
  if (charCountValue) charCountValue.textContent = charCount.toString()
  if (paraCountValue) paraCountValue.textContent = paragraphs.toString()
  if (readTimeValue) readTimeValue.textContent = readingTime.toString()
}

function showDetailedStats(): void {
  const editor = getEditor()
  if (!editor) return
  
  const text = editor.state.doc.textContent
  
  // Detailed statistics
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = text
    .replace(/[\u4e00-\u9fa5]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0).length
  const totalChars = text.length
  const charsNoSpaces = text.replace(/\s/g, '').length
  const lines = text.split('\n').length
  const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 0).length
  
  // Create modal
  const modal = document.createElement('div')
  modal.className = 'stats-modal'
  modal.innerHTML = `
    <div class="stats-modal-content">
      <div class="stats-modal-header">
        <h3>文档统计信息</h3>
        <button class="stats-modal-close"><i class="ri-close-line"></i></button>
      </div>
      <div class="stats-modal-body">
        <div class="stats-grid">
          <div class="stats-item">
            <div class="stats-label">中文字符</div>
            <div class="stats-value">${chineseChars.toLocaleString()}</div>
          </div>
          <div class="stats-item">
            <div class="stats-label">英文单词</div>
            <div class="stats-value">${englishWords.toLocaleString()}</div>
          </div>
          <div class="stats-item">
            <div class="stats-label">总字符数</div>
            <div class="stats-value">${totalChars.toLocaleString()}</div>
          </div>
          <div class="stats-item">
            <div class="stats-label">字符数(不含空格)</div>
            <div class="stats-value">${charsNoSpaces.toLocaleString()}</div>
          </div>
          <div class="stats-item">
            <div class="stats-label">行数</div>
            <div class="stats-value">${lines.toLocaleString()}</div>
          </div>
          <div class="stats-item">
            <div class="stats-label">句子数</div>
            <div class="stats-value">${sentences.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Close handlers
  const closeBtn = modal.querySelector('.stats-modal-close')
  closeBtn?.addEventListener('click', () => modal.remove())
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
  
  // Close on Escape
  const escapeHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      modal.remove()
      document.removeEventListener('keydown', escapeHandler)
    }
  }
  document.addEventListener('keydown', escapeHandler)
}

export function toggleWordCount(): void {
  if (wordCountElement) {
    wordCountElement.classList.toggle('hidden')
  }
}