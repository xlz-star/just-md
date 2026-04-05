import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Editor } from '@tiptap/core';
import { getCurrentFilePath } from './editor';

// 图片插入管理器
export class ImageInsertManager {
  constructor(private editor: Editor) {}

  // 显示插入选项对话框
  async showInsertDialog(): Promise<void> {
    // 创建自定义对话框
    const dialog = document.createElement('div');
    dialog.className = 'image-insert-dialog';
    dialog.innerHTML = `
      <div class="dialog-overlay">
        <div class="dialog-content">
          <h3>插入图片</h3>
          <div class="dialog-options">
            <button class="dialog-option" data-action="url">
              <i class="ri-link-line"></i>
              <span>网络图片 URL</span>
            </button>
            <button class="dialog-option" data-action="local">
              <i class="ri-folder-line"></i>
              <span>本地图片文件</span>
            </button>
            <button class="dialog-option" data-action="base64">
              <i class="ri-code-line"></i>
              <span>内嵌 Base64 图片</span>
            </button>
          </div>
          <button class="dialog-close">取消</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // 处理点击事件
    const handleClick = async (e: Event) => {
      const target = e.target as HTMLElement;
      const action = target.closest('[data-action]')?.getAttribute('data-action');
      
      if (action) {
        dialog.remove();
        switch (action) {
          case 'url':
            await this.insertUrlImage();
            break;
          case 'local':
            await this.insertLocalImage();
            break;
          case 'base64':
            await this.insertBase64Image();
            break;
        }
      }
      
      if (target.classList.contains('dialog-close') || target.classList.contains('dialog-overlay')) {
        dialog.remove();
      }
    };

    dialog.addEventListener('click', handleClick);
  }

  // 插入 URL 图片
  private async insertUrlImage(): Promise<void> {
    const url = prompt('请输入图片 URL:');
    if (!url) return;
    
    const alt = prompt('请输入图片描述 (可选):', '') || '';
    this.insertMarkdown(`![${alt}](${url})`);
  }

  // 插入本地图片
  private async insertLocalImage(): Promise<void> {
    try {
      // 打开文件选择对话框
      const selected = await open({
        multiple: false,
        filters: [{
          name: '图片',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
        }]
      });

      if (!selected || typeof selected !== 'string') return;

      // 获取当前文档路径
      const documentPath = getCurrentFilePath();
      if (!documentPath) {
        alert('请先保存文档后再插入图片');
        return;
      }

      // 复制图片到文档目录
      const relativePath = await invoke<string>('copy_image_to_document_dir', {
        imagePath: selected,
        documentPath: documentPath
      });

      const alt = prompt('请输入图片描述 (可选):', '') || '';
      this.insertMarkdown(`![${alt}](${relativePath})`);
    } catch (error) {
      console.error('插入本地图片失败:', error);
      alert(`插入图片失败: ${error}`);
    }
  }

  // 插入 Base64 图片
  private async insertBase64Image(): Promise<void> {
    try {
      // 打开文件选择对话框
      const selected = await open({
        multiple: false,
        filters: [{
          name: '图片',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
        }]
      });

      if (!selected || typeof selected !== 'string') return;

      // 读取图片为 Base64
      const dataUrl = await invoke<string>('read_image_as_base64', {
        imagePath: selected
      });

      const alt = prompt('请输入图片描述 (可选):', '') || '';
      this.insertMarkdown(`![${alt}](${dataUrl})`);
    } catch (error) {
      console.error('读取图片失败:', error);
      alert(`读取图片失败: ${error}`);
    }
  }

  // 在当前光标位置插入 Markdown 文本
  private insertMarkdown(markdown: string): void {
    const { from } = this.editor.state.selection;
    
    // 创建一个文本节点并插入
    this.editor.chain()
      .focus()
      .insertContentAt(from, markdown)
      .run();
  }
}

// 处理 HTML 中的图片路径
export function processImagePaths(html: string, documentPath: string): string {
  if (!documentPath) return html;

  // 创建一个临时 DOM 来处理 HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const images = doc.querySelectorAll('img');

  images.forEach(img => {
    let src = img.getAttribute('src');
    if (!src) return;

    // 跳过绝对 URL 和 data URL
    if (src.startsWith('http://') || 
        src.startsWith('https://') || 
        src.startsWith('data:') ||
        src.startsWith('asset://')) {
      return;
    }

    // 处理相对路径
    if (src.startsWith('./') || src.startsWith('../') || !src.startsWith('/')) {
      const absolutePath = resolveRelativePath(src, documentPath);
      // 使用 Tauri 的 convertFileSrc 转换为可访问的 URL
      const tauriUrl = convertFileSrc(absolutePath);
      img.setAttribute('src', tauriUrl);
    }
  });

  // 返回处理后的 HTML
  const bodyContent = doc.body.innerHTML;
  return bodyContent;
}

// 解析相对路径
function resolveRelativePath(relativePath: string, documentPath: string): string {
  // 获取文档目录，保留原始分隔符风格（Windows 用 \，Unix 用 /）
  const sep = documentPath.includes('\\') ? '\\' : '/';
  const parts = documentPath.split(/[/\\]/);
  parts.pop(); // 移除文件名
  const docDir = parts.join(sep);

  // 统一相对路径中的分隔符为当前平台风格
  const normalizedRelative = relativePath.replace(/\//g, sep);

  // 处理相对路径
  if (normalizedRelative.startsWith('.' + sep)) {
    return docDir + sep + normalizedRelative.substring(2);
  } else if (normalizedRelative.startsWith('..' + sep)) {
    let path = normalizedRelative;
    let dir = docDir;

    while (path.startsWith('..' + sep)) {
      path = path.substring(3);
      const dirParts = dir.split(sep);
      dirParts.pop();
      dir = dirParts.join(sep);
    }

    return dir + sep + path;
  } else if (!relativePath.startsWith('/') && !relativePath.startsWith('\\')) {
    // 相对路径但不以 ./ 或 ../ 开头
    return docDir + sep + normalizedRelative;
  }

  return relativePath;
}

// 添加样式
const style = document.createElement('style');
style.textContent = `
.image-insert-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
}

.dialog-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-content {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 24px;
  min-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dialog-content h3 {
  margin: 0 0 20px 0;
  color: var(--text-primary);
}

.dialog-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.dialog-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: var(--text-primary);
}

.dialog-option:hover {
  background: var(--bg-hover);
  border-color: var(--primary-color);
}

.dialog-option i {
  font-size: 20px;
  color: var(--primary-color);
}

.dialog-close {
  width: 100%;
  padding: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.dialog-close:hover {
  background: var(--bg-hover);
}
`;

document.head.appendChild(style);