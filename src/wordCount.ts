import { getEditor } from './editor'
import { PerformanceUtils, performanceMonitor, cacheManager } from './performance'

let wordCountElement: HTMLElement | null = null
let lastContent = ''
let lastCounts = { words: 0, chars: 0, paras: 0, readTime: 0 }

// 使用防抖优化更新频率
const debouncedUpdate = PerformanceUtils.debounce(updateWordCount, 300)

export function initWordCount(): void {
  createWordCountElement()
  
  const editor = getEditor()
  if (editor) {
    // Initial count
    updateWordCount()
    
    // Update on content change with optimized debounce
    editor.on('update', () => {
      performanceMonitor.recordOperation('word-count-update')
      debouncedUpdate()
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
  
  // 避免不必要的重计算
  if (text === lastContent) return
  
  // 尝试从缓存获取计算结果
  const cacheKey = `word-count-${text.length}-${text.slice(0, 100)}`
  let cachedCounts = cacheManager.get(cacheKey)
  
  if (!cachedCounts) {
    // 使用性能测量
    performanceMonitor.measureRender('word-count', () => {
      // Count words (Chinese and English) - 优化正则表达式
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
      
      cachedCounts = {
        words: totalWords,
        chars: charCount,
        paras: paragraphs,
        readTime: readingTime
      }
    })
    
    // 缓存计算结果
    cacheManager.set(cacheKey, cachedCounts, 60000) // 缓存1分钟
  }
  
  // 仅在数值发生变化时更新DOM
  if (JSON.stringify(cachedCounts) !== JSON.stringify(lastCounts)) {
    PerformanceUtils.batchDOMUpdates([
      () => {
        const wordCountValue = document.getElementById('word-count-value')
        if (wordCountValue) wordCountValue.textContent = cachedCounts.words.toString()
      },
      () => {
        const charCountValue = document.getElementById('char-count-value')
        if (charCountValue) charCountValue.textContent = cachedCounts.chars.toString()
      },
      () => {
        const paraCountValue = document.getElementById('para-count-value')
        if (paraCountValue) paraCountValue.textContent = cachedCounts.paras.toString()
      },
      () => {
        const readTimeValue = document.getElementById('read-time-value')
        if (readTimeValue) readTimeValue.textContent = cachedCounts.readTime.toString()
      }
    ])
    
    lastCounts = cachedCounts
  }
  
  lastContent = text
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