import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { updateOutlineIfNeeded } from './outline.ts'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight } from 'lowlight'
import ImageResize from './imageResizeExtension'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { SearchExtension } from './searchExtension'
import { MathInline, MathBlock } from './mathExtension'
import { Footnote } from './footnoteExtension'
import { setupPasteHandler, setupDragDropHandler } from './imageHandler'
import { TableToolbar, setupTableShortcuts } from './tableToolbar'
import { SpellCheckExtension } from './spellCheck'
import 'highlight.js/styles/github.css'

// 注册常用的编程语言
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import css from 'highlight.js/lib/languages/css'
import html from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import rust from 'highlight.js/lib/languages/rust'
import markdown from 'highlight.js/lib/languages/markdown'
import python from 'highlight.js/lib/languages/python'
import csharp from 'highlight.js/lib/languages/csharp'
import lua from 'highlight.js/lib/languages/lua'
import java from 'highlight.js/lib/languages/java'
import go from 'highlight.js/lib/languages/go'
import cpp from 'highlight.js/lib/languages/cpp'
import c from 'highlight.js/lib/languages/c'
import shell from 'highlight.js/lib/languages/shell'
import yaml from 'highlight.js/lib/languages/yaml'
import sql from 'highlight.js/lib/languages/sql'

// 创建lowlight实例并注册语言
const lowlight = createLowlight()
lowlight.register('javascript', javascript)
lowlight.register('js', javascript)
lowlight.register('typescript', typescript)
lowlight.register('ts', typescript)
lowlight.register('css', css)
lowlight.register('html', html)
lowlight.register('json', json)
lowlight.register('rust', rust)
lowlight.register('markdown', markdown)
lowlight.register('md', markdown)
lowlight.register('python', python)
lowlight.register('py', python)
lowlight.register('csharp', csharp)
lowlight.register('cs', csharp)
lowlight.register('lua', lua)
lowlight.register('java', java)
lowlight.register('go', go)
lowlight.register('cpp', cpp)
lowlight.register('c', c)
lowlight.register('shell', shell)
lowlight.register('sh', shell)
lowlight.register('bash', shell)
lowlight.register('yaml', yaml)
lowlight.register('yml', yaml)
lowlight.register('sql', sql)

// 全局编辑器变量
let editor: Editor
let sourceEditor: HTMLTextAreaElement | null = null
let isSourceMode = false
let currentMarkdownContent = ''

// 初始化编辑器
export function initEditor(content: string = '', onContentChange?: (isDirty: boolean) => void): Editor {
  // 创建源代码编辑器容器
  createSourceEditor()
  // 如果已存在编辑器，先销毁
  if (editor) {
    editor.destroy()
  }
  
  // 默认占位符内容
  const defaultContent = '<p>输入你的 Markdown 内容或打开 md 文件...</p>'
  
  // 标记是否使用了默认内容
  const isUsingDefault = !content
  
  // 创建新的编辑器实例
  editor = new Editor({
    element: document.querySelector('#editor') as HTMLElement,
    extensions: [
      StarterKit.configure({
        codeBlock: false, // 禁用默认的代码块，使用自定义的
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'code-block',
        },
      }),
      ImageResize.configure({
        inline: true,
        allowBase64: true,
        allowResize: true,
        HTMLAttributes: {
          class: 'markdown-image',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'markdown-link',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'markdown-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      SearchExtension,
      SpellCheckExtension,
      MathInline,
      MathBlock,
      Footnote,
    ],
    content: content || defaultContent,
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
    onSelectionUpdate: () => {
      // 使用requestAnimationFrame优化性能
      requestAnimationFrame(() => {
        updateOutlineIfNeeded()
      })
    },
  })
  
  // 如果使用了默认内容，添加特殊标记类
  if (isUsingDefault) {
    const proseMirror = document.querySelector('.ProseMirror') as HTMLElement
    if (proseMirror) {
      proseMirror.classList.add('using-default-content')
    }
  }
  
  // 防抖计时器
  let updateDebounceTimer: number | null = null
  
  // 监听编辑器内容变化
  editor.on('update', () => {
    // 如果设置了内容变化回调，调用它
    if (onContentChange) {
      onContentChange(true)
    }
    
    // 使用防抖触发大纲更新，避免频繁更新
    if (updateDebounceTimer !== null) {
      clearTimeout(updateDebounceTimer)
    }
    
    updateDebounceTimer = setTimeout(() => {
      updateOutlineIfNeeded()
      updateDebounceTimer = null
    }, 100) as unknown as number
  })
  
  // 添加焦点事件处理
  editor.on('focus', () => {
    const proseMirror = document.querySelector('.ProseMirror') as HTMLElement
    if (proseMirror && proseMirror.classList.contains('using-default-content')) {
      // 清空默认内容
      editor.commands.setContent('<p></p>')
      proseMirror.classList.remove('using-default-content')
    }
  })
  
  // 添加失焦事件处理
  editor.on('blur', () => {
    // 检查内容是否为空
    const content = editor.getHTML()
    const isEmpty = content === '<p></p>' || content === '<p><br></p>' || content === ''
    
    if (isEmpty && !getCurrentFilePath()) {
      // 如果内容为空且没有打开的文件，显示默认内容
      editor.commands.setContent(defaultContent)
      const proseMirror = document.querySelector('.ProseMirror') as HTMLElement
      if (proseMirror) {
        proseMirror.classList.add('using-default-content')
      }
    }
  })
  
  // 添加点击事件处理
  const editorElement = document.querySelector('#editor') as HTMLElement
  editorElement.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    
    // 检查是否点击了图片或链接
    if (target.tagName === 'IMG' && target.classList.contains('markdown-image')) {
      e.preventDefault()
      showSourceDialog('image', target)
    } else if (target.tagName === 'A' && target.classList.contains('markdown-link')) {
      e.preventDefault()
      showSourceDialog('link', target)
    } else if (!editor.isFocused) {
      // 获取焦点并将光标移动到末尾
      editor.commands.focus('end')
    }
  })
  
  // 为代码块添加点击事件
  editorElement.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const codeBlock = target.closest('.code-block')
    if (codeBlock && e.altKey) {
      e.preventDefault()
      showSourceDialog('code', codeBlock as HTMLElement)
    }
  })
  
  // 设置图片粘贴和拖拽处理
  setupPasteHandler(editor)
  setupDragDropHandler(editor)
  
  // 设置表格工具栏和快捷键
  const tableToolbar = new TableToolbar(editor)
  setupTableShortcuts(editor)
  
  // 存储工具栏实例以便后续清理
  ;(editor as any).tableToolbar = tableToolbar
  
  return editor
}

// 获取编辑器实例
export function getEditor(): Editor | null {
  return editor || null
}

// 获取编辑器内容（HTML格式）
export function getEditorContent(): string {
  return editor ? editor.getHTML() : ''
}

// 获取当前的Markdown内容（用于保存）
export function getCurrentMarkdownContent(): string {
  if (isSourceMode && sourceEditor) {
    // 源代码模式，直接返回源代码编辑器的内容
    return sourceEditor.value
  } else {
    // 富文本模式，返回保存的Markdown内容
    return currentMarkdownContent
  }
}

// 设置编辑器内容（需要传入HTML和对应的Markdown）
export function setEditorContent(content: string, markdown?: string): void {
  if (editor) {
    // 设置内容
    editor.commands.setContent(content)
    
    // 更新当前的Markdown内容
    if (markdown !== undefined) {
      currentMarkdownContent = markdown
    }
    
    // 如果在源代码模式，同时更新源代码编辑器
    if (isSourceMode && sourceEditor && markdown !== undefined) {
      sourceEditor.value = markdown
    }
    
    // 确保内容不被当作默认内容处理
    const proseMirror = document.querySelector('.ProseMirror') as HTMLElement
    if (proseMirror) {
      // 如果有内容，移除默认内容样式
      if (content && content !== '<p></p>' && content !== '<p><br></p>') {
        proseMirror.classList.remove('using-default-content')
      }
      // 如果没有内容且没有打开文件，添加默认内容样式
      else if (!getCurrentFilePath() && (!content || content === '<p></p>' || content === '<p><br></p>')) {
        proseMirror.classList.add('using-default-content')
      }
    }
    
    // 手动激活编辑器，确保显示正常
    if (content && !editor.isFocused) {
      // 尝试给编辑器元素发送一个点击事件
      const editorElement = document.querySelector('#editor') as HTMLElement
      if (editorElement) {
        // 如果有内容，强制编辑器获得焦点一次，然后立即失去焦点
        // 这样可以确保内容被正确渲染
        editor.commands.focus()
        setTimeout(() => {
          editor.commands.blur()
        }, 10)
      }
    }
  }
}

// 文件路径管理
let currentFilePath: string | null = null
let currentFileName: string | null = null

// 获取当前文件路径
export function getCurrentFilePath(): string | null {
  return currentFilePath
}

// 获取当前文件名
export function getCurrentFileName(): string | null {
  return currentFileName
}

// 设置当前文件信息
export function setCurrentFile(path: string | null, name: string | null): void {
  currentFilePath = path;
  currentFileName = name;
  
  // 设置到window对象，以便其他模块访问
  (window as any).currentFilePath = path;
  
  // 更新窗口标题
  if (name) {
    document.title = `${name} - Just MD`;
  } else {
    document.title = 'Just MD - Markdown 编辑器';
  }
}

// 拖放文件支持
export function initDragAndDrop(onFileDrop: (file: File) => void): void {
  const editorElement = document.querySelector('#editor') as HTMLElement
  
  editorElement.addEventListener('dragover', (e) => {
    e.preventDefault()
    editorElement.classList.add('drag-over')
  })
  
  editorElement.addEventListener('dragleave', () => {
    editorElement.classList.remove('drag-over')
  })
  
  editorElement.addEventListener('drop', async (e) => {
    e.preventDefault()
    editorElement.classList.remove('drag-over')
    
    if (e.dataTransfer?.files.length) {
      const file = e.dataTransfer.files[0]
      
      if (file.name.endsWith('.md')) {
        onFileDrop(file)
      }
    }
  })
}

// 创建源代码编辑器
function createSourceEditor(): void {
  const editorContainer = document.querySelector('#editor') as HTMLElement
  
  // 创建源代码编辑器
  const textarea = document.createElement('textarea')
  textarea.id = 'source-editor'
  textarea.className = 'source-editor hidden'
  textarea.placeholder = '输入 Markdown 源代码...'
  
  editorContainer.parentElement?.insertBefore(textarea, editorContainer)
  sourceEditor = textarea
  
  // 监听源代码变化
  textarea.addEventListener('input', () => {
    currentMarkdownContent = textarea.value
  })
}

// 切换编辑模式
export function toggleSourceMode(): void {
  if (!editor || !sourceEditor) return
  
  const editorElement = document.querySelector('#editor') as HTMLElement
  const sourceBtn = document.querySelector('#source-mode-btn') as HTMLElement
  
  if (isSourceMode) {
    // 切换到富文本模式
    sourceEditor.classList.add('hidden')
    editorElement.classList.remove('hidden')
    
    // 将Markdown转换为HTML
    if (currentMarkdownContent) {
      // 这里需要调用后端API将Markdown转换为HTML
      convertMarkdownToHtml(currentMarkdownContent).then(html => {
        editor.commands.setContent(html)
      })
    }
    
    isSourceMode = false
    sourceBtn.innerHTML = '<i class="ri-code-s-slash-line"></i>'
    sourceBtn.title = '切换到源代码模式'
  } else {
    // 切换到源代码模式
    editorElement.classList.add('hidden')
    sourceEditor.classList.remove('hidden')
    
    // 获取当前编辑器的Markdown内容
    currentMarkdownContent = htmlToMarkdown(editor.getHTML())
    sourceEditor.value = currentMarkdownContent
    
    isSourceMode = true
    sourceBtn.innerHTML = '<i class="ri-eye-line"></i>'
    sourceBtn.title = '切换到预览模式'
    
    // 自动聚焦
    sourceEditor.focus()
  }
}

// 获取当前模式
export function getIsSourceMode(): boolean {
  return isSourceMode
}

// 显示源代码对话框
function showSourceDialog(type: string, element: HTMLElement): void {
  let sourceCode = ''
  let title = ''
  
  switch (type) {
    case 'image':
      const imgSrc = (element as HTMLImageElement).src
      const imgAlt = (element as HTMLImageElement).alt || ''
      sourceCode = `![${imgAlt}](${imgSrc})`
      title = '图片源代码'
      break
    case 'link':
      const linkHref = (element as HTMLAnchorElement).href
      const linkText = element.textContent || ''
      sourceCode = `[${linkText}](${linkHref})`
      title = '链接源代码'
      break
    case 'code':
      const pre = element.querySelector('pre')
      if (pre) {
        const lang = element.getAttribute('data-language') || ''
        sourceCode = '```' + lang + '\n' + (pre.textContent || '') + '\n```'
        title = '代码块源代码'
      }
      break
  }
  
  // 创建对话框
  const dialog = document.createElement('div')
  dialog.className = 'source-dialog'
  dialog.innerHTML = `
    <div class="source-dialog-content">
      <div class="source-dialog-header">
        <h3>${title}</h3>
        <button class="source-dialog-close"><i class="ri-close-line"></i></button>
      </div>
      <div class="source-dialog-body">
        <textarea readonly>${sourceCode}</textarea>
        <button class="source-dialog-edit">编辑源代码</button>
      </div>
    </div>
  `
  
  document.body.appendChild(dialog)
  
  // 关闭对话框
  const closeBtn = dialog.querySelector('.source-dialog-close') as HTMLElement
  closeBtn.addEventListener('click', () => {
    dialog.remove()
  })
  
  // 编辑源代码
  const editBtn = dialog.querySelector('.source-dialog-edit') as HTMLElement
  editBtn.addEventListener('click', () => {
    toggleSourceMode()
    dialog.remove()
  })
  
  // 点击对话框外部关闭
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.remove()
    }
  })
}

// HTML转Markdown（简单实现）
function htmlToMarkdown(_html: string): string {
  // 这里应该使用专门的HTML到Markdown转换库
  // 暂时返回原始内容
  return currentMarkdownContent || ''
}

// Markdown转HTML（需要后端支持）
async function convertMarkdownToHtml(markdown: string): Promise<string> {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return await invoke<string>('render_markdown_to_html', { markdown })
  } catch (error) {
    console.error('转换Markdown失败:', error)
    return '<p>转换失败</p>'
  }
} 