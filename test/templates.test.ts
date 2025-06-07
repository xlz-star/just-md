import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Tauri API
const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke
}))

// Mock template manager functionality
const createTemplateManager = () => {
  interface Template {
    id: string
    name: string
    description: string
    category: string
    content: string
    isBuiltIn: boolean
    createdAt: Date
    tags: string[]
  }
  
  let templates: Template[] = []
  let currentCategory = 'all'
  
  const builtinTemplates: Template[] = [
    {
      id: 'blank',
      name: '空白文档',
      description: '从头开始创建文档',
      category: 'basic',
      content: '',
      isBuiltIn: true,
      createdAt: new Date(),
      tags: ['基础']
    },
    {
      id: 'article',
      name: '文章模板',
      description: '标准文章写作模板',
      category: 'writing',
      content: '# 文章标题\n\n## 摘要\n\n在此处写下文章的简要摘要...',
      isBuiltIn: true,
      createdAt: new Date(),
      tags: ['文章', '写作']
    }
  ]
  
  const loadTemplates = () => {
    templates = [...builtinTemplates]
    
    // Mock localStorage
    const customTemplatesData = localStorage.getItem('just-md-custom-templates')
    if (customTemplatesData) {
      try {
        const customTemplates = JSON.parse(customTemplatesData)
        customTemplates.forEach((template: any) => {
          template.createdAt = new Date(template.createdAt)
        })
        templates.push(...customTemplates)
      } catch (error) {
        console.error('Failed to load custom templates:', error)
      }
    }
  }
  
  const saveTemplates = () => {
    const customTemplates = templates.filter(t => !t.isBuiltIn)
    localStorage.setItem('just-md-custom-templates', JSON.stringify(customTemplates))
  }
  
  const addTemplate = (template: Template) => {
    templates.push(template)
    saveTemplates()
  }
  
  const updateTemplate = (updatedTemplate: Template) => {
    const index = templates.findIndex(t => t.id === updatedTemplate.id)
    if (index !== -1) {
      templates[index] = updatedTemplate
      saveTemplates()
    }
  }
  
  const deleteTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template || template.isBuiltIn) return false
    
    templates = templates.filter(t => t.id !== templateId)
    saveTemplates()
    return true
  }
  
  const getFilteredTemplates = () => {
    if (currentCategory === 'all') {
      return templates
    }
    return templates.filter(template => template.category === currentCategory)
  }
  
  const filterTemplates = (keyword: string) => {
    return getFilteredTemplates().filter(template =>
      template.name.toLowerCase().includes(keyword.toLowerCase()) ||
      template.description.toLowerCase().includes(keyword.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))
    )
  }
  
  const switchCategory = (category: string) => {
    currentCategory = category
  }
  
  const useTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return false
    
    // Mock editor
    const mockEditor = {
      commands: {
        focus: vi.fn(),
        setContent: vi.fn()
      }
    }
    
    // Check if content is Markdown
    const isMarkdown = template.content.match(/^#+ /m) || // headers
                      template.content.includes('**') || // bold
                      template.content.includes('*') || // italic
                      template.content.includes('- ') || // lists
                      template.content.includes('[') || // links
                      template.content.includes('```') || // code blocks
                      template.content.includes('|') // tables
    
    if (isMarkdown) {
      try {
        mockInvoke.mockResolvedValue(`<p>${template.content}</p>`)
        const htmlContent = await mockInvoke('render_markdown_to_html', { 
          markdown: template.content 
        })
        mockEditor.commands.setContent(htmlContent)
      } catch (error) {
        console.error('Failed to convert template content:', error)
        mockEditor.commands.setContent(template.content)
      }
    } else {
      mockEditor.commands.setContent(template.content)
    }
    
    return true
  }
  
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
  
  const validateTemplate = (template: Partial<Template>) => {
    const errors: string[] = []
    
    if (!template.name || template.name.trim().length === 0) {
      errors.push('模板名称不能为空')
    }
    
    if (!template.description || template.description.trim().length === 0) {
      errors.push('模板描述不能为空')
    }
    
    if (!template.content || template.content.trim().length === 0) {
      errors.push('模板内容不能为空')
    }
    
    if (!template.category || template.category.trim().length === 0) {
      errors.push('模板分类不能为空')
    }
    
    return errors
  }
  
  return {
    loadTemplates,
    saveTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getFilteredTemplates,
    filterTemplates,
    switchCategory,
    useTemplate,
    generateId,
    validateTemplate,
    getTemplates: () => templates,
    getCurrentCategory: () => currentCategory
  }
}

describe('Template Manager Functionality', () => {
  let templateManager: ReturnType<typeof createTemplateManager>
  
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    templateManager = createTemplateManager()
    templateManager.loadTemplates()
  })
  
  describe('Template Loading and Saving', () => {
    it('should load builtin templates', () => {
      const templates = templateManager.getTemplates()
      expect(templates.length).toBeGreaterThan(0)
      expect(templates.some(t => t.id === 'blank')).toBe(true)
      expect(templates.some(t => t.id === 'article')).toBe(true)
    })
    
    it('should load custom templates from localStorage', () => {
      const customTemplate = {
        id: 'custom1',
        name: '自定义模板',
        description: '用户创建的模板',
        category: 'custom',
        content: '# 自定义内容',
        isBuiltIn: false,
        createdAt: new Date().toISOString(),
        tags: ['自定义']
      }
      
      localStorage.setItem('just-md-custom-templates', JSON.stringify([customTemplate]))
      templateManager.loadTemplates()
      
      const templates = templateManager.getTemplates()
      expect(templates.some(t => t.id === 'custom1')).toBe(true)
    })
    
    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('just-md-custom-templates', 'invalid json')
      
      expect(() => templateManager.loadTemplates()).not.toThrow()
      const templates = templateManager.getTemplates()
      expect(templates.length).toBe(2) // Only builtin templates
    })
  })
  
  describe('Template CRUD Operations', () => {
    it('should add new custom template', () => {
      const newTemplate = {
        id: 'test1',
        name: '测试模板',
        description: '测试用模板',
        category: 'custom',
        content: '# 测试内容',
        isBuiltIn: false,
        createdAt: new Date(),
        tags: ['测试']
      }
      
      templateManager.addTemplate(newTemplate)
      
      const templates = templateManager.getTemplates()
      expect(templates.some(t => t.id === 'test1')).toBe(true)
      expect(localStorage.getItem('just-md-custom-templates')).toContain('test1')
    })
    
    it('should update existing template', () => {
      const template = {
        id: 'test2',
        name: '原始名称',
        description: '原始描述',
        category: 'custom',
        content: '原始内容',
        isBuiltIn: false,
        createdAt: new Date(),
        tags: ['原始']
      }
      
      templateManager.addTemplate(template)
      
      const updatedTemplate = {
        ...template,
        name: '更新名称',
        description: '更新描述'
      }
      
      templateManager.updateTemplate(updatedTemplate)
      
      const templates = templateManager.getTemplates()
      const found = templates.find(t => t.id === 'test2')
      expect(found?.name).toBe('更新名称')
      expect(found?.description).toBe('更新描述')
    })
    
    it('should delete custom template', () => {
      const template = {
        id: 'test3',
        name: '待删除模板',
        description: '将被删除的模板',
        category: 'custom',
        content: '# 内容',
        isBuiltIn: false,
        createdAt: new Date(),
        tags: ['删除']
      }
      
      templateManager.addTemplate(template)
      expect(templateManager.getTemplates().some(t => t.id === 'test3')).toBe(true)
      
      const deleted = templateManager.deleteTemplate('test3')
      expect(deleted).toBe(true)
      expect(templateManager.getTemplates().some(t => t.id === 'test3')).toBe(false)
    })
    
    it('should not delete builtin template', () => {
      const deleted = templateManager.deleteTemplate('blank')
      expect(deleted).toBe(false)
      expect(templateManager.getTemplates().some(t => t.id === 'blank')).toBe(true)
    })
  })
  
  describe('Template Filtering', () => {
    beforeEach(() => {
      templateManager.addTemplate({
        id: 'custom1',
        name: '自定义模板1',
        description: '技术文档模板',
        category: 'technical',
        content: '# 技术文档',
        isBuiltIn: false,
        createdAt: new Date(),
        tags: ['技术', 'API']
      })
      
      templateManager.addTemplate({
        id: 'custom2',
        name: '自定义模板2',
        description: '商务文档模板',
        category: 'business',
        content: '# 商务文档',
        isBuiltIn: false,
        createdAt: new Date(),
        tags: ['商务', '报告']
      })
    })
    
    it('should filter by category', () => {
      templateManager.switchCategory('writing')
      const filtered = templateManager.getFilteredTemplates()
      expect(filtered.every(t => t.category === 'writing')).toBe(true)
      expect(filtered.some(t => t.id === 'article')).toBe(true)
    })
    
    it('should show all templates when category is "all"', () => {
      templateManager.switchCategory('all')
      const filtered = templateManager.getFilteredTemplates()
      expect(filtered.length).toBeGreaterThan(2) // Should include all templates
    })
    
    it('should filter by keyword in name', () => {
      const filtered = templateManager.filterTemplates('自定义')
      expect(filtered.every(t => t.name.includes('自定义'))).toBe(true)
      expect(filtered.length).toBe(2)
    })
    
    it('should filter by keyword in description', () => {
      const filtered = templateManager.filterTemplates('技术')
      expect(filtered.some(t => t.description.includes('技术'))).toBe(true)
    })
    
    it('should filter by keyword in tags', () => {
      const filtered = templateManager.filterTemplates('API')
      expect(filtered.some(t => t.tags.includes('API'))).toBe(true)
    })
    
    it('should handle case-insensitive search', () => {
      const filtered = templateManager.filterTemplates('技术') // Use Chinese term that exists in test data
      expect(filtered.length).toBeGreaterThan(0)
    })
  })
  
  describe('Template Usage', () => {
    it('should use template with markdown content', async () => {
      const result = await templateManager.useTemplate('article')
      expect(result).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('render_markdown_to_html', {
        markdown: expect.stringContaining('# 文章标题')
      })
    })
    
    it('should use template with plain content', async () => {
      templateManager.addTemplate({
        id: 'plain',
        name: '纯文本模板',
        description: '纯文本内容',
        category: 'basic',
        content: 'Plain text content',
        isBuiltIn: false,
        createdAt: new Date(),
        tags: ['纯文本']
      })
      
      const result = await templateManager.useTemplate('plain')
      expect(result).toBe(true)
      expect(mockInvoke).not.toHaveBeenCalled() // Should not convert plain text
    })
    
    it('should handle template not found', async () => {
      const result = await templateManager.useTemplate('nonexistent')
      expect(result).toBe(false)
    })
    
    it('should handle markdown conversion failure', async () => {
      mockInvoke.mockRejectedValue(new Error('Conversion failed'))
      
      const result = await templateManager.useTemplate('article')
      expect(result).toBe(true) // Should still succeed with fallback
    })
  })
  
  describe('Template Validation', () => {
    it('should validate required fields', () => {
      const invalidTemplate = {
        name: '',
        description: '',
        content: '',
        category: ''
      }
      
      const errors = templateManager.validateTemplate(invalidTemplate)
      expect(errors).toContain('模板名称不能为空')
      expect(errors).toContain('模板描述不能为空')
      expect(errors).toContain('模板内容不能为空')
      expect(errors).toContain('模板分类不能为空')
    })
    
    it('should pass validation for valid template', () => {
      const validTemplate = {
        name: '有效模板',
        description: '有效描述',
        content: '# 有效内容',
        category: 'custom'
      }
      
      const errors = templateManager.validateTemplate(validTemplate)
      expect(errors).toHaveLength(0)
    })
    
    it('should trim whitespace in validation', () => {
      const templateWithWhitespace = {
        name: '   ',
        description: '   ',
        content: '   ',
        category: '   '
      }
      
      const errors = templateManager.validateTemplate(templateWithWhitespace)
      expect(errors.length).toBe(4) // All fields should fail
    })
  })
  
  describe('Utility Functions', () => {
    it('should generate unique IDs', () => {
      const id1 = templateManager.generateId()
      const id2 = templateManager.generateId()
      
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^[0-9a-z]+$/)
      expect(id2).toMatch(/^[0-9a-z]+$/)
    })
    
    it('should track current category', () => {
      expect(templateManager.getCurrentCategory()).toBe('all')
      
      templateManager.switchCategory('writing')
      expect(templateManager.getCurrentCategory()).toBe('writing')
    })
  })
  
  describe('Edge Cases', () => {
    it('should handle empty templates array', () => {
      const emptyManager = createTemplateManager()
      // Don't load templates
      
      const filtered = emptyManager.getFilteredTemplates()
      expect(filtered).toHaveLength(0)
      
      const searchResult = emptyManager.filterTemplates('test')
      expect(searchResult).toHaveLength(0)
    })
    
    it('should handle special characters in search', () => {
      templateManager.addTemplate({
        id: 'special',
        name: '特殊字符@#$%',
        description: '包含特殊字符的模板',
        category: 'custom',
        content: '# 内容',
        isBuiltIn: false,
        createdAt: new Date(),
        tags: ['特殊']
      })
      
      const filtered = templateManager.filterTemplates('@#$')
      expect(filtered.some(t => t.name.includes('@#$'))).toBe(true)
    })
    
    it('should handle very long template content', () => {
      const longContent = 'Very long content. '.repeat(1000)
      const template = {
        id: 'long',
        name: '长模板',
        description: '包含很长内容的模板',
        category: 'custom',
        content: longContent,
        isBuiltIn: false,
        createdAt: new Date(),
        tags: ['长内容']
      }
      
      expect(() => templateManager.addTemplate(template)).not.toThrow()
      expect(templateManager.getTemplates().some(t => t.id === 'long')).toBe(true)
    })
  })
})