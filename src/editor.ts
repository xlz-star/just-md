import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { updateOutlineIfNeeded } from './outline.ts'

// 全局编辑器变量
let editor: Editor

// 初始化编辑器
export function initEditor(content: string = '', onContentChange?: (isDirty: boolean, currentContent: string) => void): Editor {
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
      StarterKit,
    ],
    content: content || defaultContent,
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
    onSelectionUpdate: ({ editor }) => {
      // 触发大纲更新
      updateOutlineIfNeeded()
    },
  })
  
  // 如果使用了默认内容，添加特殊标记类
  if (isUsingDefault) {
    const proseMirror = document.querySelector('.ProseMirror') as HTMLElement
    if (proseMirror) {
      proseMirror.classList.add('using-default-content')
    }
  }
  
  // 监听编辑器内容变化
  editor.on('update', ({ editor: updatedEditor }) => {
    // 获取当前内容
    const currentContent = updatedEditor.getHTML()
    
    // 如果设置了内容变化回调，调用它
    if (onContentChange) {
      onContentChange(true, currentContent)
    }
    
    // 触发大纲更新
    updateOutlineIfNeeded()
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
    // 如果编辑器已经获得焦点，不需要处理
    if (editor.isFocused) return
    
    // 获取焦点并将光标移动到末尾
    editor.commands.focus('end')
  })
  
  return editor
}

// 获取编辑器实例
export function getEditor(): Editor | null {
  return editor || null
}

// 获取编辑器内容
export function getEditorContent(): string {
  return editor ? editor.getHTML() : ''
}

// 设置编辑器内容
export function setEditorContent(content: string): void {
  if (editor) {
    // 设置内容
    editor.commands.setContent(content)
    
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
  currentFilePath = path
  currentFileName = name
  
  // 更新窗口标题
  if (name) {
    document.title = `${name} - Just MD`
  } else {
    document.title = 'Just MD - Markdown 编辑器'
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