import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock DOM and timer functions
const mockSetTimeout = vi.fn()
const mockClearTimeout = vi.fn()

vi.stubGlobal('setTimeout', mockSetTimeout)
vi.stubGlobal('clearTimeout', mockClearTimeout)

// Create a mock editor module that includes the image retry logic
const createMockEditor = () => {
  // Global retry manager (replicate from editor.ts)
  const globalRetryManager = new Map<string, { isRetrying: boolean, retryCount: number }>()
  
  // Mock DOM elements
  const createMockImage = (src: string, className = 'markdown-image') => {
    const img = document.createElement('img')
    img.src = src
    img.className = className
    return img
  }
  
  const createMockEditorElement = () => {
    const editor = document.createElement('div')
    editor.id = 'editor'
    document.body.appendChild(editor)
    return editor
  }
  
  const showImageError = vi.fn((target: HTMLImageElement, originalSrc: string, maxRetries: number) => {
    target.alt = `图片加载失败: ${originalSrc}`
    target.title = `图片加载失败 (重试${maxRetries}次后仍然失败)`
    target.classList.add('image-load-error')
    target.removeAttribute('src')
    target.setAttribute('data-retrying', 'true')
  })
  
  // Image error handling logic (replicated from editor.ts)
  const handleImageError = (target: HTMLImageElement) => {
    if (target.tagName !== 'IMG' || !target.classList.contains('markdown-image')) return
    
    // Get original src (clean previous retry parameters)
    let originalSrc = target.getAttribute('data-original-src')
    if (!originalSrc) {
      originalSrc = target.src.split('?_retry=')[0]
      target.setAttribute('data-original-src', originalSrc)
    }
    
    // Assign unique ID if not exists
    let imageId = target.getAttribute('data-image-id')
    if (!imageId) {
      imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      target.setAttribute('data-image-id', imageId)
    }
    
    // Check global retry manager
    const globalRetryInfo = globalRetryManager.get(originalSrc)
    if (globalRetryInfo?.isRetrying) {
      console.log(`图片 ${imageId} URL已在全局重试中，跳过: ${originalSrc}`)
      return
    }
    
    // Check if image is already retrying
    if (target.getAttribute('data-retrying') === 'true') {
      console.log(`图片 ${imageId} 正在重试中，跳过此次错误事件`)
      return
    }
    
    const retryCount = globalRetryInfo?.retryCount || parseInt(target.getAttribute('data-retry-count') || '0')
    const maxRetries = parseInt(target.getAttribute('data-max-retries') || '3')
    
    console.log(`图片 ${imageId} 加载失败 (当前重试次数: ${retryCount}/${maxRetries}): ${originalSrc}`)
    
    if (retryCount < maxRetries) {
      // Mark global retry state
      const newRetryCount = retryCount + 1
      globalRetryManager.set(originalSrc, { isRetrying: true, retryCount: newRetryCount })
      
      // Mark image as retrying
      target.setAttribute('data-retrying', 'true')
      target.setAttribute('data-retry-count', newRetryCount.toString())
      
      console.log(`图片 ${imageId} 开始重试加载 (${newRetryCount}/${maxRetries}): ${originalSrc}`)
      
      // Mock retry logic - execute synchronously for tests
      const currentGlobalInfo = globalRetryManager.get(originalSrc)
      if (!currentGlobalInfo || currentGlobalInfo.retryCount > maxRetries) {
        target.setAttribute('data-retrying', 'false')
        globalRetryManager.delete(originalSrc)
        return
      }
      
      const separator = originalSrc.includes('?') ? '&' : '?'
      const newSrc = `${originalSrc}${separator}_retry=${Date.now()}`
      
      console.log(`正在重试加载图片 ${imageId}: ${newSrc}`)
      
      target.setAttribute('data-retrying', 'false')
      target.src = newSrc
      
      globalRetryManager.set(originalSrc, { isRetrying: false, retryCount: newRetryCount })
    } else {
      showImageError(target, originalSrc, maxRetries)
      globalRetryManager.delete(originalSrc)
    }
  }
  
  const handleImageLoad = (target: HTMLImageElement) => {
    if (target.tagName === 'IMG' && target.classList.contains('markdown-image')) {
      target.setAttribute('data-retry-count', '0')
      target.setAttribute('data-retrying', 'false')
      target.classList.remove('image-load-error')
      
      const originalSrc = target.getAttribute('data-original-src')
      if (originalSrc) {
        globalRetryManager.delete(originalSrc)
      }
      
      // Clear error styles
      target.style.border = ''
      target.style.padding = ''
      target.style.minHeight = ''
      target.style.backgroundColor = ''
      target.style.color = ''
      target.style.textAlign = ''
      target.style.display = ''
    }
  }
  
  return {
    globalRetryManager,
    createMockImage,
    createMockEditorElement,
    handleImageError,
    handleImageLoad,
    showImageError
  }
}

describe('Image Retry Functionality', () => {
  let mockEditor: ReturnType<typeof createMockEditor>
  
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
    mockEditor = createMockEditor()
  })
  
  afterEach(() => {
    document.body.innerHTML = ''
  })
  
  describe('Global Retry Manager', () => {
    it('should prevent duplicate retries for same URL', () => {
      const editorElement = mockEditor.createMockEditorElement()
      const img1 = mockEditor.createMockImage('https://example.com/image.jpg')
      const img2 = mockEditor.createMockImage('https://example.com/image.jpg')
      
      editorElement.appendChild(img1)
      editorElement.appendChild(img2)
      
      // First image error should start retry
      mockEditor.handleImageError(img1)
      expect(mockEditor.globalRetryManager.get('https://example.com/image.jpg')).toEqual({
        isRetrying: false, // After retry completes synchronously
        retryCount: 1
      })
      
      // Reset retry count to simulate still retrying scenario
      mockEditor.globalRetryManager.set('https://example.com/image.jpg', { isRetrying: true, retryCount: 1 })
      
      // Second image error should be skipped
      const consoleSpy = vi.spyOn(console, 'log')
      mockEditor.handleImageError(img2)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('URL已在全局重试中，跳过')
      )
    })
    
    it('should clean up global state after successful load', () => {
      const editorElement = mockEditor.createMockEditorElement()
      const img = mockEditor.createMockImage('https://example.com/image.jpg')
      editorElement.appendChild(img)
      
      // Simulate error and retry
      mockEditor.handleImageError(img)
      expect(mockEditor.globalRetryManager.has('https://example.com/image.jpg')).toBe(true)
      
      // Simulate successful load
      mockEditor.handleImageLoad(img)
      expect(mockEditor.globalRetryManager.has('https://example.com/image.jpg')).toBe(false)
      expect(img.getAttribute('data-retry-count')).toBe('0')
      expect(img.getAttribute('data-retrying')).toBe('false')
    })
  })
  
  describe('Image Error Handling', () => {
    it('should ignore non-markdown images', () => {
      const editorElement = mockEditor.createMockEditorElement()
      const img = mockEditor.createMockImage('https://example.com/image.jpg', 'regular-image')
      editorElement.appendChild(img)
      
      mockEditor.handleImageError(img)
      expect(mockEditor.globalRetryManager.size).toBe(0)
      expect(img.getAttribute('data-retry-count')).toBeNull()
    })
    
    it('should assign unique image ID if not present', () => {
      const editorElement = mockEditor.createMockEditorElement()
      const img = mockEditor.createMockImage('https://example.com/image.jpg')
      editorElement.appendChild(img)
      
      expect(img.getAttribute('data-image-id')).toBeNull()
      
      mockEditor.handleImageError(img)
      expect(img.getAttribute('data-image-id')).toMatch(/^img_\d+_[a-z0-9]+$/)
    })
    
    it('should extract original src correctly', () => {
      const editorElement = mockEditor.createMockEditorElement()
      const img = mockEditor.createMockImage('https://example.com/image.jpg?_retry=123')
      editorElement.appendChild(img)
      
      mockEditor.handleImageError(img)
      expect(img.getAttribute('data-original-src')).toBe('https://example.com/image.jpg')
    })
    
    it('should prevent retry when image is already retrying', () => {
      const editorElement = mockEditor.createMockEditorElement()
      const img = mockEditor.createMockImage('https://example.com/image.jpg')
      img.setAttribute('data-retrying', 'true')
      editorElement.appendChild(img)
      
      const consoleSpy = vi.spyOn(console, 'log')
      mockEditor.handleImageError(img)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('正在重试中，跳过此次错误事件')
      )
    })
  })
  
  describe('Retry Logic', () => {
    it('should start retry when under max retry limit', () => {
      const editorElement = mockEditor.createMockEditorElement()
      const img = mockEditor.createMockImage('https://example.com/image.jpg')
      img.setAttribute('data-max-retries', '3')
      editorElement.appendChild(img)
      
      mockEditor.handleImageError(img)
      
      expect(img.getAttribute('data-retry-count')).toBe('1')
      expect(img.getAttribute('data-retrying')).toBe('false') // Should be reset after retry
      expect(mockEditor.globalRetryManager.get('https://example.com/image.jpg')).toEqual({
        isRetrying: false,
        retryCount: 1
      })
    })
    
    it('should show error when max retries reached', () => {
      const editorElement = mockEditor.createMockEditorElement()
      const img = mockEditor.createMockImage('https://example.com/image.jpg')
      img.setAttribute('data-max-retries', '3')
      img.setAttribute('data-retry-count', '3')
      editorElement.appendChild(img)
      
      mockEditor.handleImageError(img)
      
      expect(mockEditor.showImageError).toHaveBeenCalledWith(
        img,
        'https://example.com/image.jpg',
        3
      )
      expect(img.classList.contains('image-load-error')).toBe(true)
      expect(img.getAttribute('src')).toBeNull()
    })
    
    it('should generate retry URL with timestamp', () => {
      const editorElement = mockEditor.createMockEditorElement()
      const img = mockEditor.createMockImage('https://example.com/image.jpg')
      editorElement.appendChild(img)
      
      const originalSrc = img.src
      mockEditor.handleImageError(img)
      
      // After retry logic executes, src should have retry parameter
      expect(img.src).toMatch(/^https:\/\/example\.com\/image\.jpg\?_retry=\d+$/)
      expect(img.src).not.toBe(originalSrc)
    })
    
    it('should handle URLs with existing query parameters', () => {
      const editorElement = mockEditor.createMockEditorElement()
      const img = mockEditor.createMockImage('https://example.com/image.jpg?size=large')
      editorElement.appendChild(img)
      
      mockEditor.handleImageError(img)
      
      expect(img.src).toMatch(/^https:\/\/example\.com\/image\.jpg\?size=large&_retry=\d+$/)
    })
  })
  
  describe('Error Display', () => {
    it('should show error message correctly', () => {
      const img = mockEditor.createMockImage('https://example.com/failed.jpg')
      
      mockEditor.showImageError(img, 'https://example.com/failed.jpg', 3)
      
      expect(img.alt).toBe('图片加载失败: https://example.com/failed.jpg')
      expect(img.title).toBe('图片加载失败 (重试3次后仍然失败)')
      expect(img.classList.contains('image-load-error')).toBe(true)
      expect(img.getAttribute('data-retrying')).toBe('true')
      expect(img.getAttribute('src')).toBeNull()
    })
  })
  
  describe('Edge Cases', () => {
    it('should handle multiple simultaneous errors for different URLs', () => {
      const editorElement = mockEditor.createMockEditorElement()
      const img1 = mockEditor.createMockImage('https://example.com/image1.jpg')
      const img2 = mockEditor.createMockImage('https://example.com/image2.jpg')
      
      editorElement.appendChild(img1)
      editorElement.appendChild(img2)
      
      mockEditor.handleImageError(img1)
      mockEditor.handleImageError(img2)
      
      expect(mockEditor.globalRetryManager.size).toBe(2)
      expect(mockEditor.globalRetryManager.has('https://example.com/image1.jpg')).toBe(true)
      expect(mockEditor.globalRetryManager.has('https://example.com/image2.jpg')).toBe(true)
    })
    
    it('should handle cleanup when retry count exceeds max', () => {
      const editorElement = mockEditor.createMockEditorElement()
      const img = mockEditor.createMockImage('https://example.com/image.jpg')
      img.setAttribute('data-max-retries', '2')
      editorElement.appendChild(img)
      
      // First error (retry 1)
      mockEditor.handleImageError(img)
      expect(mockEditor.globalRetryManager.get('https://example.com/image.jpg')?.retryCount).toBe(1)
      
      // Second error (retry 2)
      img.setAttribute('data-retrying', 'false')
      mockEditor.globalRetryManager.set('https://example.com/image.jpg', { isRetrying: false, retryCount: 1 })
      mockEditor.handleImageError(img)
      expect(mockEditor.globalRetryManager.get('https://example.com/image.jpg')?.retryCount).toBe(2)
      
      // Third error (should show error and cleanup)
      img.setAttribute('data-retrying', 'false')
      mockEditor.globalRetryManager.set('https://example.com/image.jpg', { isRetrying: false, retryCount: 2 })
      mockEditor.handleImageError(img)
      expect(mockEditor.globalRetryManager.has('https://example.com/image.jpg')).toBe(false)
    })
    
    it('should handle missing max-retries attribute', () => {
      const editorElement = mockEditor.createMockEditorElement()
      const img = mockEditor.createMockImage('https://example.com/image.jpg')
      editorElement.appendChild(img)
      
      mockEditor.handleImageError(img)
      
      // Should default to 3 retries
      expect(img.getAttribute('data-retry-count')).toBe('1')
      expect(mockEditor.globalRetryManager.get('https://example.com/image.jpg')?.retryCount).toBe(1)
    })
  })
})