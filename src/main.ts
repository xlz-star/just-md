import { initEditor, initDragAndDrop } from './editor'
import { initOutlineFeature } from './outline'
import { initMenus, initKeyboardShortcuts } from './menu'
import { handleFileDrop, saveFile } from './fileManager'
import './styles.css'

// 应用程序入口函数
async function main() {
  try {
    // 初始化编辑器，并添加内容变化回调
    initEditor('', (isDirty: boolean, currentContent: string) => {
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

    // 添加窗口关闭事件处理，保存当前文件
    window.addEventListener('beforeunload', () => {
      saveFile().catch((err: Error) => console.error('保存失败:', err))
    })

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