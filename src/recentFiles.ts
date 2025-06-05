import { invoke } from '@tauri-apps/api/core';

// 最近文件类型
export interface RecentFile {
  path: string;
  name: string;
  last_opened: string;
}

// 最近文件管理器
export class RecentFilesManager {
  private recentFiles: RecentFile[] = [];
  private container: HTMLElement | null = null;

  constructor() {
    this.loadRecentFiles();
  }

  // 加载最近文件列表
  async loadRecentFiles(): Promise<void> {
    try {
      this.recentFiles = await invoke<RecentFile[]>('get_recent_files');
    } catch (error) {
      console.error('加载最近文件列表失败:', error);
      this.recentFiles = [];
    }
  }

  // 添加文件到最近文件列表
  async addRecentFile(filePath: string): Promise<void> {
    try {
      await invoke('add_recent_file', { filePath });
      await this.loadRecentFiles(); // 重新加载列表
      this.renderRecentFiles(); // 更新 UI
    } catch (error) {
      console.error('添加最近文件失败:', error);
    }
  }

  // 从最近文件列表移除文件
  async removeRecentFile(filePath: string): Promise<void> {
    try {
      await invoke('remove_recent_file', { filePath });
      await this.loadRecentFiles(); // 重新加载列表
      this.renderRecentFiles(); // 更新 UI
    } catch (error) {
      console.error('移除最近文件失败:', error);
    }
  }

  // 清空最近文件列表
  async clearRecentFiles(): Promise<void> {
    try {
      await invoke('clear_recent_files');
      await this.loadRecentFiles(); // 重新加载列表
      this.renderRecentFiles(); // 更新 UI
    } catch (error) {
      console.error('清空最近文件列表失败:', error);
    }
  }

  // 设置容器元素
  setContainer(container: HTMLElement): void {
    this.container = container;
    this.renderRecentFiles();
  }

  // 渲染最近文件列表
  private renderRecentFiles(): void {
    if (!this.container) return;

    this.container.innerHTML = '';

    if (this.recentFiles.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'recent-files-empty';
      emptyMessage.textContent = '暂无最近文件';
      emptyMessage.style.cssText = `
        padding: 20px;
        text-align: center;
        color: #999;
        font-style: italic;
      `;
      this.container.appendChild(emptyMessage);
      return;
    }

    // 创建标题和清空按钮的容器
    const header = document.createElement('div');
    header.className = 'recent-files-header';
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid #e1e5e9;
      background: #f8f9fa;
    `;

    const title = document.createElement('h4');
    title.textContent = '最近文件';
    title.style.cssText = `
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    `;

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '清空';
    clearBtn.className = 'recent-files-clear-btn';
    clearBtn.style.cssText = `
      padding: 4px 8px;
      font-size: 12px;
      border: 1px solid #ccc;
      background: white;
      border-radius: 3px;
      cursor: pointer;
      color: #666;
    `;
    clearBtn.addEventListener('click', () => {
      if (confirm('确定要清空最近文件列表吗？')) {
        this.clearRecentFiles();
      }
    });

    header.appendChild(title);
    header.appendChild(clearBtn);
    this.container.appendChild(header);

    // 创建文件列表
    const fileList = document.createElement('div');
    fileList.className = 'recent-files-list';

    this.recentFiles.forEach((file) => {
      const fileItem = this.createFileItem(file);
      fileList.appendChild(fileItem);
    });

    this.container.appendChild(fileList);
  }

  // 创建文件项
  private createFileItem(file: RecentFile): HTMLElement {
    const item = document.createElement('div');
    item.className = 'recent-file-item';
    item.style.cssText = `
      padding: 8px 12px;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    // 文件信息
    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    fileInfo.style.cssText = `
      flex: 1;
      min-width: 0;
    `;

    const fileName = document.createElement('div');
    fileName.className = 'file-name';
    fileName.textContent = file.name;
    fileName.style.cssText = `
      font-size: 13px;
      font-weight: 500;
      color: #333;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 2px;
    `;

    const filePath = document.createElement('div');
    filePath.className = 'file-path';
    filePath.textContent = file.path;
    filePath.title = file.path;
    filePath.style.cssText = `
      font-size: 11px;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    const lastOpened = document.createElement('div');
    lastOpened.className = 'last-opened';
    lastOpened.textContent = this.formatTime(file.last_opened);
    lastOpened.style.cssText = `
      font-size: 10px;
      color: #999;
      margin-top: 2px;
    `;

    fileInfo.appendChild(fileName);
    fileInfo.appendChild(filePath);
    fileInfo.appendChild(lastOpened);

    // 删除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '×';
    deleteBtn.className = 'recent-file-delete';
    deleteBtn.title = '从列表中移除';
    deleteBtn.style.cssText = `
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 16px;
      color: #999;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s, background-color 0.2s;
    `;

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeRecentFile(file.path);
    });

    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.backgroundColor = '#f0f0f0';
      deleteBtn.style.color = '#d73a49';
    });

    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.backgroundColor = 'transparent';
      deleteBtn.style.color = '#999';
    });

    // 鼠标悬停效果
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#f8f9fa';
      deleteBtn.style.opacity = '1';
    });

    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
      deleteBtn.style.opacity = '0';
    });

    // 点击打开文件
    item.addEventListener('click', () => {
      this.openRecentFile(file);
    });

    item.appendChild(fileInfo);
    item.appendChild(deleteBtn);

    return item;
  }

  // 格式化时间显示
  private formatTime(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    
    return date.toLocaleDateString();
  }

  // 打开最近文件
  private async openRecentFile(file: RecentFile): Promise<void> {
    try {
      // 检查文件是否仍然存在  
      if (!await this.fileExists(file.path)) {
        // 文件不存在，从列表中移除
        await this.removeRecentFile(file.path);
        alert('文件不存在或已被移动');
        return;
      }

      // 模拟文件选择事件来打开文件
      await this.openFileByPath(file.path);
      
    } catch (error) {
      console.error('打开最近文件失败:', error);
      alert('打开文件失败');
    }
  }

  // 检查文件是否存在
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await invoke('get_raw_markdown', { path: filePath });
      return true;
    } catch {
      return false;
    }
  }

  // 通过路径打开文件
  private async openFileByPath(filePath: string): Promise<void> {
    try {
      const pathParts = filePath.split(/[/\\]/);
      const fileName = pathParts[pathParts.length - 1];
      
      // 读取渲染后的HTML内容用于显示
      const htmlContent = await invoke<string>('read_markdown', { path: filePath });
      
      // 同时获取原始Markdown内容用于保存
      const markdownContent = await invoke<string>('get_raw_markdown', { path: filePath });
      
      if (htmlContent && markdownContent) {
        // 动态导入必要的模块
        const fileManagerModule = await import('./fileManager');

        // 创建文件对象
        const file = {
          id: fileManagerModule.generateId(),
          path: filePath,
          name: fileName,
          content: markdownContent,
          isDirty: false
        };
        
        // 通过文件管理器的内部方法处理文件打开
        // 这里需要调用文件管理器的方法，但为了避免循环依赖，我们触发一个自定义事件
        window.dispatchEvent(new CustomEvent('openRecentFile', { 
          detail: { file, htmlContent, markdownContent }
        }));
      }
    } catch (error) {
      console.error('打开文件失败:', error);
      throw error;
    }
  }

  // 获取最近文件列表
  getRecentFiles(): RecentFile[] {
    return [...this.recentFiles];
  }
}

// 创建全局实例
export const recentFilesManager = new RecentFilesManager();