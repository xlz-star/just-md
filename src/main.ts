import { initEditor, initDragAndDrop } from './editor'
import { initOutlineFeature } from './outline'
import { initMenus, initKeyboardShortcuts } from './menu'
import { handleFileDrop, saveFile, openFileByPath, initializeExternalFileOpenListener, getActiveFile, updateFileDirtyState } from './fileManager'
import { initFindReplace } from './findReplace'
import { initWordCount } from './wordCount'
import { initThemes } from './themes'
import { initAutoSave } from './autoSave'
import { initCodeFolding } from './codeFolding'
import { initPrintPreview } from './printPreview'
import { initTocGenerator } from './tocGenerator'
import { initFocusMode } from './focusMode'
import { initSettings } from './settings'
import { initSourceEditor } from './sourceEditor'
import { initImageContextMenu } from './imageContextMenu'
import { UIAnimations } from './uiAnimations'
import { initSpellCheck } from './spellCheck'
import { initWritingStats } from './writingStats'
import { initDocumentComparison } from './documentComparison'
import { initTemplates } from './templates'
import { initPerformanceOptimizations } from './performance'
import { initCodeQuality } from './codeQuality'
import { invoke } from '@tauri-apps/api/core'
import './styles.css'

async function initializeFileOpenFlow(): Promise<void> {
  await initializeExternalFileOpenListener()

  try {
    const initialFile = await invoke<string | null>('get_initial_file')
    if (initialFile) {
      await openFileByPath(initialFile)
    }
  } catch (err) {
    console.error('获取初始文件失败:', err)
  }
}

// 应用程序入口函数
async function main() {
  try {
    // 初始化性能优化系统
    initPerformanceOptimizations()
    
    // 初始化代码质量系统
    initCodeQuality()
    
    // 初始化编辑器，并添加内容变化回调
    initEditor('', (_isDirty: boolean) => {
      // 标记当前活动文件为已编辑（dirty）
      const activeFile = getActiveFile()
      if (activeFile && !activeFile.isDirty) {
        updateFileDirtyState(activeFile.id, true)
      }
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
    
    // 初始化拼写检查
    initSpellCheck()
    
    // 初始化写作统计
    initWritingStats()
    
    // 初始化文档比较
    initDocumentComparison()
    
    // 初始化模板系统
    initTemplates()
    
    // 初始化源码编辑器
    initSourceEditor()
    
    // 初始化图片右键菜单
    initImageContextMenu()
    
    // 延迟初始化字数统计功能，确保编辑器已创建
    setTimeout(() => {
      initWordCount()
    }, 100)

    // 添加窗口关闭事件处理，保存当前文件
    window.addEventListener('beforeunload', () => {
      saveFile().catch((err: Error) => console.error('保存失败:', err))
    })

    await initializeFileOpenFlow()


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