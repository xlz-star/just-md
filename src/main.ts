import { initEditor, initDragAndDrop, setEditorContent, setCurrentFile } from './editor'
import { initOutlineFeature, resetOutlineState, updateOutlineIfNeeded } from './outline'
import { initMenus, initKeyboardShortcuts } from './menu'
import { handleFileDrop, saveFile, addFileTab, generateId } from './fileManager'
import { initFindReplace } from './findReplace'
import { initWordCount } from './wordCount'
import { initThemes } from './themes'
import { initSplitView } from './splitView'
import { initAutoSave } from './autoSave'
import { initCodeFolding } from './codeFolding'
import { initPrintPreview } from './printPreview'
import { initTocGenerator } from './tocGenerator'
import { initFocusMode } from './focusMode'
import { initSettings } from './settings'
import { initSourceEditor } from './sourceEditor'
import { UIAnimations } from './uiAnimations'
import { OpenedFile } from './types'
import { invoke } from '@tauri-apps/api/core'
import './styles.css'

// 应用程序入口函数
async function main() {
  try {
    // 初始化编辑器，并添加内容变化回调
    initEditor('', (isDirty: boolean) => {
      // 在此处理编辑器内容变化
      // 例如标记文件为已编辑
      console.log('编辑器内容已变化，脏状态:', isDirty)
    })

    // 初始化拖放文件功能
    initDragAndDrop(handleFileDrop)

    // 初始化大纲功能
    initOutlineFeature()

    // 初始化菜单
    initMenus()

    // 初始化键盘快捷键
    initKeyboardShortcuts()
    
    // 初始化查找替换功能
    initFindReplace()
    
    // 初始化主题系统
    initThemes()
    
    // 初始化分屏视图
    initSplitView()
    
    // 初始化自动保存
    initAutoSave()
    
    // 初始化代码折叠
    initCodeFolding()
    
    // 初始化打印预览
    initPrintPreview()
    
    // 初始化目录生成器
    initTocGenerator()
    
    // 初始化专注模式和打字机模式
    initFocusMode()
    
    // 初始化设置窗口
    initSettings()
    
    // 初始化UI动画系统
    UIAnimations.init()
    
    // 初始化源码编辑器
    initSourceEditor()
    
    // 延迟初始化字数统计功能，确保编辑器已创建
    setTimeout(() => {
      initWordCount()
    }, 100)

    // 添加窗口关闭事件处理，保存当前文件
    window.addEventListener('beforeunload', () => {
      saveFile().catch((err: Error) => console.error('保存失败:', err))
    })

    // 检查是否有通过命令行参数传入的文件路径
    try {
      const initialFile = await invoke<string | null>('get_initial_file')
      if (initialFile) {
        // 从路径中提取文件名
        const pathParts = initialFile.split(/[/\\]/)
        const fileName = pathParts[pathParts.length - 1]
        
        try {
          // 读取渲染后的HTML内容用于显示
          const htmlContent = await invoke<string>('read_markdown', { path: initialFile })
          
          // 同时获取原始Markdown内容用于保存
          const markdownContent = await invoke<string>('get_raw_markdown', { path: initialFile })
          
          if (htmlContent && markdownContent) {
            // 创建文件对象，保存原始Markdown内容
            const file: OpenedFile = {
              id: generateId(),
              path: initialFile,
              name: fileName,
              content: markdownContent, // 保存原始Markdown
              isDirty: false
            }
            
            // 添加到标签列表并设置编辑器内容
            addFileTab(file, false) // 先添加到标签，但不激活
            
            // 手动设置当前文件信息
            setCurrentFile(file.path, file.name)
            
            // 重置大纲结构
            resetOutlineState()
            
            // 设置编辑器内容为渲染后的HTML，同时保存原始Markdown
            setEditorContent(htmlContent, markdownContent)
            
            // 确保编辑器内容不是默认样式
            const proseMirror = document.querySelector('.ProseMirror') as HTMLElement
            if (proseMirror) {
              proseMirror.classList.remove('using-default-content')
            }
            
            // 更新大纲
            updateOutlineIfNeeded()
          }
        } catch (err) {
          console.error('读取初始文件内容失败:', err)
        }
      }
    } catch (err) {
      console.error('获取初始文件失败:', err)
    }


    // 其他样式初始化
    document.head.insertAdjacentHTML('beforeend', `
      <style>
        .drag-over {
          background-color: rgba(0, 120, 255, 0.1);
          border: 2px dashed #0078ff !important;
        }
      </style>
    `)

    console.log('应用程序初始化完成')
  } catch (error) {
    console.error('应用程序初始化失败:', error)
  }
}

// 启动应用
main().catch(console.error)