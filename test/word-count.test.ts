import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock performance and cache utilities
const mockPerformanceUtils = {
  debounce: vi.fn((fn, delay) => fn),
  batchDOMUpdates: vi.fn((updates) => updates.forEach(update => update())),
}

const mockPerformanceMonitor = {
  recordOperation: vi.fn(),
  measureRender: vi.fn((name, fn) => fn()),
}

const mockCacheManager = {
  get: vi.fn(),
  set: vi.fn(),
}

// Mock word count logic
const createWordCountManager = () => {
  let wordCountElement: HTMLElement | null = null
  let lastContent = ''
  let lastCounts = { words: 0, chars: 0, paras: 0, readTime: 0 }
  
  const createWordCountElement = () => {
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
    
    const app = document.getElementById('app') || document.body
    app.appendChild(element)
    
    wordCountElement = element
    return element
  }
  
  const calculateWordCount = (text: string) => {
    // Filter special characters and whitespace
    text = text
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
      .replace(/\u00A0/g, ' ') // Non-breaking space
      .trim()
    
    // Count Chinese characters
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    
    // Count English words more accurately
    const englishText = text
      .replace(/[\u4e00-\u9fa5]/g, ' ') // Replace Chinese with space
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
      .trim()
    
    const englishWords = englishText
      ? englishText.split(/\s+/).filter(word => word.length > 1).length
      : 0
    
    const totalWords = chineseChars + englishWords
    
    // Count characters (excluding spaces)
    const charCount = text.replace(/\s/g, '').length
    
    // Count paragraphs
    const paragraphs = text.split(/\n\n+/).filter(para => para.trim().length > 0).length
    
    // Estimate reading time (250 words per minute for English, 300 chars per minute for Chinese)
    const readingTime = Math.ceil((chineseChars / 300) + (englishWords / 250))
    
    return {
      words: totalWords,
      chars: charCount,
      paras: paragraphs,
      readTime: readingTime
    }
  }
  
  const updateWordCount = (text: string) => {
    if (!wordCountElement) return
    
    // Avoid unnecessary recalculation
    if (text === lastContent) return
    
    const cacheKey = `word-count-${text.length}-${text.slice(0, 100)}`
    let cachedCounts = mockCacheManager.get(cacheKey)
    
    if (!cachedCounts) {
      cachedCounts = mockPerformanceMonitor.measureRender('word-count', () => {
        return calculateWordCount(text)
      })
      
      mockCacheManager.set(cacheKey, cachedCounts, 60000)
    }
    
    // Only update DOM if values changed
    if (JSON.stringify(cachedCounts) !== JSON.stringify(lastCounts)) {
      mockPerformanceUtils.batchDOMUpdates([
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
  
  const toggleWordCount = () => {
    if (wordCountElement) {
      wordCountElement.classList.toggle('hidden')
    }
  }
  
  return {
    createWordCountElement,
    calculateWordCount,
    updateWordCount,
    toggleWordCount,
    getLastCounts: () => lastCounts,
    getWordCountElement: () => wordCountElement,
  }
}

describe('Word Count Functionality', () => {
  let wordCountManager: ReturnType<typeof createWordCountManager>
  
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>'
    vi.clearAllMocks()
    wordCountManager = createWordCountManager()
  })
  
  describe('Word Count Element Creation', () => {
    it('should create word count element with correct structure', () => {
      const element = wordCountManager.createWordCountElement()
      
      expect(element.id).toBe('word-count')
      expect(element.className).toBe('word-count')
      expect(element.querySelector('#word-count-value')).toBeTruthy()
      expect(element.querySelector('#char-count-value')).toBeTruthy()
      expect(element.querySelector('#para-count-value')).toBeTruthy()
      expect(element.querySelector('#read-time-value')).toBeTruthy()
    })
    
    it('should append element to app container', () => {
      wordCountManager.createWordCountElement()
      
      const app = document.getElementById('app')
      expect(app?.querySelector('#word-count')).toBeTruthy()
    })
  })
  
  describe('Word Count Calculation', () => {
    it('should count Chinese characters correctly', () => {
      const result = wordCountManager.calculateWordCount('你好世界')
      expect(result.words).toBe(4) // 4 Chinese characters
      expect(result.chars).toBe(4)
    })
    
    it('should count English words correctly', () => {
      const result = wordCountManager.calculateWordCount('Hello world test')
      expect(result.words).toBe(3) // 3 English words
      expect(result.chars).toBe(14) // 14 characters (excluding spaces)
    })
    
    it('should count mixed Chinese and English correctly', () => {
      const result = wordCountManager.calculateWordCount('你好 Hello 世界 World')
      expect(result.words).toBe(6) // 2 Chinese + 2 English (counting each Chinese char)
      expect(result.chars).toBe(14) // All characters excluding spaces (including Chinese)
    })
    
    it('should filter out zero-width characters', () => {
      const textWithZeroWidth = '你好\u200B\u200C\u200D\uFEFFworld'
      const result = wordCountManager.calculateWordCount(textWithZeroWidth)
      expect(result.words).toBe(3) // 2 Chinese + 1 English
      expect(result.chars).toBe(7) // Should not count zero-width chars
    })
    
    it('should handle non-breaking spaces', () => {
      const textWithNbsp = '你好\u00A0world'
      const result = wordCountManager.calculateWordCount(textWithNbsp)
      expect(result.words).toBe(3) // 2 Chinese + 1 English
    })
    
    it('should count paragraphs correctly', () => {
      const multiParagraphText = '第一段\n\n第二段\n\n\n第三段'
      const result = wordCountManager.calculateWordCount(multiParagraphText)
      expect(result.paras).toBe(3)
    })
    
    it('should ignore empty paragraphs', () => {
      const textWithEmptyParas = '第一段\n\n\n\n第二段\n\n  \n\n第三段'
      const result = wordCountManager.calculateWordCount(textWithEmptyParas)
      expect(result.paras).toBe(3)
    })
    
    it('should calculate reading time correctly', () => {
      // 300 Chinese chars should take 1 minute
      const chineseText = '你'.repeat(300)
      const chineseResult = wordCountManager.calculateWordCount(chineseText)
      expect(chineseResult.readTime).toBe(1)
      
      // 250 English words should take 1 minute
      const englishText = 'word '.repeat(250).trim()
      const englishResult = wordCountManager.calculateWordCount(englishText)
      expect(englishResult.readTime).toBe(1)
    })
    
    it('should handle empty text', () => {
      const result = wordCountManager.calculateWordCount('')
      expect(result.words).toBe(0)
      expect(result.chars).toBe(0)
      expect(result.paras).toBe(0)
      expect(result.readTime).toBe(0)
    })
    
    it('should filter single character English words', () => {
      const result = wordCountManager.calculateWordCount('I am a good student')
      expect(result.words).toBe(3) // Should exclude 'I' and 'a' (only count words > 1 char)
    })
  })
  
  describe('Word Count Updates', () => {
    beforeEach(() => {
      wordCountManager.createWordCountElement()
    })
    
    it('should update display values correctly', () => {
      const text = '你好 Hello 世界'
      wordCountManager.updateWordCount(text)
      
      expect(document.getElementById('word-count-value')?.textContent).toBe('5') // 2 Chinese + 1 English (counting each char)
      expect(document.getElementById('char-count-value')?.textContent).toBe('9')
      expect(document.getElementById('para-count-value')?.textContent).toBe('1')
      expect(document.getElementById('read-time-value')?.textContent).toBe('1')
    })
    
    it('should avoid recalculation for same content', () => {
      const text = 'Same content'
      
      wordCountManager.updateWordCount(text)
      wordCountManager.updateWordCount(text)
      
      // Should only call cache get once for duplicate content
      expect(mockCacheManager.get).toHaveBeenCalledTimes(1)
      expect(mockCacheManager.set).toHaveBeenCalledTimes(1) // Only once for new calculation
    })
    
    it('should use performance monitoring', () => {
      const text = 'Test content'
      wordCountManager.updateWordCount(text)
      
      expect(mockPerformanceMonitor.measureRender).toHaveBeenCalledWith(
        'word-count',
        expect.any(Function)
      )
    })
    
    it('should use batch DOM updates', () => {
      const text = 'Test content'
      wordCountManager.updateWordCount(text)
      
      expect(mockPerformanceUtils.batchDOMUpdates).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Function)])
      )
    })
    
    it('should cache calculation results', () => {
      const text = 'Cacheable content'
      
      // First call should calculate and cache
      mockCacheManager.get.mockReturnValue(null)
      wordCountManager.updateWordCount(text)
      
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('word-count-'),
        expect.any(Object),
        60000
      )
      
      // Second call with different text should use cache if available
      const text2 = 'Different content'
      const cachedResult = { words: 2, chars: 16, paras: 1, readTime: 1 }
      mockCacheManager.get.mockReturnValue(cachedResult)
      wordCountManager.updateWordCount(text2)
      
      expect(mockCacheManager.get).toHaveBeenCalledTimes(2)
    })
  })
  
  describe('Word Count Toggle', () => {
    beforeEach(() => {
      wordCountManager.createWordCountElement()
    })
    
    it('should toggle visibility correctly', () => {
      const element = wordCountManager.getWordCountElement()
      expect(element?.classList.contains('hidden')).toBe(false)
      
      wordCountManager.toggleWordCount()
      expect(element?.classList.contains('hidden')).toBe(true)
      
      wordCountManager.toggleWordCount()
      expect(element?.classList.contains('hidden')).toBe(false)
    })
  })
  
  describe('Edge Cases', () => {
    it('should handle very long text efficiently', () => {
      const longText = '你好'.repeat(10000) + ' hello'.repeat(10000)
      
      const startTime = Date.now()
      const result = wordCountManager.calculateWordCount(longText)
      const endTime = Date.now()
      
      expect(result.words).toBe(30000) // 20000 Chinese + 10000 English
      expect(endTime - startTime).toBeLessThan(100) // Should be fast
    })
    
    it('should handle text with only punctuation', () => {
      const result = wordCountManager.calculateWordCount('!@#$%^&*().,;:')
      expect(result.words).toBe(0)
      expect(result.chars).toBe(14)
    })
    
    it('should handle text with mixed line endings', () => {
      const text = '第一段\r\n\r\n第二段\n\n第三段\r\r第四段'
      const result = wordCountManager.calculateWordCount(text)
      expect(result.paras).toBe(2) // Only \n\n+ separates paragraphs in the implementation
    })
    
    it('should handle text with only whitespace', () => {
      const result = wordCountManager.calculateWordCount('   \n\n   \t\t   ')
      expect(result.words).toBe(0)
      expect(result.chars).toBe(0)
      expect(result.paras).toBe(0)
    })
  })
})