import { invoke } from '@tauri-apps/api/core';
import { Editor } from '@tiptap/core';
import { convertToTauriUrl } from './imagePathHelper';

// 处理粘贴的图片
export async function handlePastedImage(
  file: File,
  editor: Editor,
  currentFilePath?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const base64Data = e.target?.result as string;
        
        // 调用后端保存图片（返回绝对路径）
        const absolutePath = await invoke<string>('save_image_from_base64', {
          base64Data,
          currentFilePath
        });
        
        // 将文件路径转换为 Tauri 可访问的 URL
        const tauriUrl = convertToTauriUrl(absolutePath);
        
        // 在编辑器中插入图片
        editor.chain().focus().setImage({ 
          src: tauriUrl, 
          alt: '粘贴的图片'
        }).run();
        
        resolve();
      } catch (error) {
        console.error('保存图片失败:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取图片文件失败'));
    };
    
    reader.readAsDataURL(file);
  });
}

// 设置粘贴事件处理
export function setupPasteHandler(editor: Editor): void {
  editor.view.dom.addEventListener('paste', async (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    
    // 查找粘贴的图片
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        
        const file = item.getAsFile();
        if (file) {
          // 获取当前文件路径（如果有）
          const currentFilePath = (window as any).currentFilePath;
          
          try {
            await handlePastedImage(file, editor, currentFilePath);
          } catch (error) {
            console.error('处理粘贴图片失败:', error);
            // 可以显示错误提示
          }
        }
        
        return;
      }
    }
  });
}

// 处理拖拽的图片
export function setupDragDropHandler(editor: Editor): void {
  editor.view.dom.addEventListener('drop', async (event: DragEvent) => {
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    // 检查是否有图片文件
    let hasImage = false;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.type.startsWith('image/')) {
        hasImage = true;
        event.preventDefault();
        event.stopPropagation();
        
        // 获取当前文件路径（如果有）
        const currentFilePath = (window as any).currentFilePath;
        
        try {
          await handlePastedImage(file, editor, currentFilePath);
        } catch (error) {
          console.error('处理拖拽图片失败:', error);
        }
      }
    }
    
    // 如果处理了图片，阻止事件继续传播
    if (hasImage) {
      return;
    }
  });
  
  // 防止默认的拖拽行为（仅对图片）
  editor.view.dom.addEventListener('dragover', (event: DragEvent) => {
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      // 检查是否包含图片
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
    }
  });
}

// 图片大小调整功能
export function createImageResizeExtension() {
  // 这个功能将在下一步实现
  return null;
}