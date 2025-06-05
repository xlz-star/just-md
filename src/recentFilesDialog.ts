import { recentFilesManager } from './recentFiles';

// 显示最近文件对话框
export function showRecentFilesDialog(): void {
  // 检查是否已存在对话框
  const existingDialog = document.getElementById('recent-files-dialog');
  if (existingDialog) {
    existingDialog.focus();
    return;
  }

  // 创建背景遮罩
  const overlay = document.createElement('div');
  overlay.id = 'recent-files-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  // 创建对话框
  const dialog = document.createElement('div');
  dialog.id = 'recent-files-dialog';
  dialog.style.cssText = `
    background: white;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    width: 90%;
    max-width: 600px;
    max-height: 80%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;

  // 创建标题栏
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid #e1e5e9;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
  `;

  const title = document.createElement('h3');
  title.textContent = '最近文件';
  title.style.cssText = `
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  `;

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    font-size: 18px;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
  `;

  closeBtn.addEventListener('click', closeDialog);
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.backgroundColor = '#e9ecef';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.backgroundColor = 'transparent';
  });

  header.appendChild(title);
  header.appendChild(closeBtn);

  // 创建内容区域
  const content = document.createElement('div');
  content.id = 'recent-files-content';
  content.style.cssText = `
    flex: 1;
    overflow-y: auto;
    min-height: 300px;
  `;

  // 创建底部按钮区域
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 16px 20px;
    border-top: 1px solid #e1e5e9;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    background: #f8f9fa;
  `;

  const clearAllBtn = document.createElement('button');
  clearAllBtn.textContent = '清空所有';
  clearAllBtn.style.cssText = `
    padding: 8px 16px;
    border: 1px solid #dc3545;
    background: white;
    color: #dc3545;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;

  clearAllBtn.addEventListener('click', async () => {
    if (confirm('确定要清空所有最近文件吗？此操作不可撤销。')) {
      await recentFilesManager.clearRecentFiles();
      updateDialogContent();
    }
  });

  clearAllBtn.addEventListener('mouseenter', () => {
    clearAllBtn.style.backgroundColor = '#dc3545';
    clearAllBtn.style.color = 'white';
  });

  clearAllBtn.addEventListener('mouseleave', () => {
    clearAllBtn.style.backgroundColor = 'white';
    clearAllBtn.style.color = '#dc3545';
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '关闭';
  cancelBtn.style.cssText = `
    padding: 8px 16px;
    border: 1px solid #6c757d;
    background: white;
    color: #6c757d;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;

  cancelBtn.addEventListener('click', closeDialog);
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.backgroundColor = '#6c757d';
    cancelBtn.style.color = 'white';
  });

  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.backgroundColor = 'white';
    cancelBtn.style.color = '#6c757d';
  });

  footer.appendChild(clearAllBtn);
  footer.appendChild(cancelBtn);

  // 组装对话框
  dialog.appendChild(header);
  dialog.appendChild(content);
  dialog.appendChild(footer);

  overlay.appendChild(dialog);

  // 添加到页面
  document.body.appendChild(overlay);

  // 设置最近文件管理器的容器并渲染
  recentFilesManager.setContainer(content);

  // 添加键盘事件
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDialog();
    }
  });

  // 点击背景关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeDialog();
    }
  });

  // 让对话框获得焦点
  dialog.focus();
  dialog.tabIndex = -1;

  // 更新内容
  function updateDialogContent() {
    recentFilesManager.setContainer(content);
  }

  function closeDialog() {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  // 应用夜间模式样式（如果启用）
  if (document.body.classList.contains('dark-mode')) {
    dialog.style.background = '#2a2a2a';
    dialog.style.color = '#e0e0e0';
    
    header.style.background = '#353535';
    header.style.borderColor = '#404040';
    
    title.style.color = '#e0e0e0';
    closeBtn.style.color = '#e0e0e0';
    
    footer.style.background = '#353535';
    footer.style.borderColor = '#404040';
  }
}