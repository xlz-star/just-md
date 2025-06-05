import { Editor } from '@tiptap/core';

// 表格工具栏类
export class TableToolbar {
  private toolbar: HTMLElement | null = null;
  private editor: Editor;
  private currentTable: HTMLElement | null = null;

  constructor(editor: Editor) {
    this.editor = editor;
    this.createToolbar();
    this.setupEventListeners();
  }

  private createToolbar(): void {
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'table-toolbar';
    this.toolbar.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 6px;
      padding: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      display: none;
      gap: 4px;
      flex-wrap: wrap;
    `;

    // 创建工具栏按钮
    const buttons = [
      { icon: '📝', title: '编辑表格', action: () => this.editTable() },
      { icon: '➕↕️', title: '在上方插入行', action: () => this.addRowBefore() },
      { icon: '➕↕️', title: '在下方插入行', action: () => this.addRowAfter() },
      { icon: '❌↕️', title: '删除行', action: () => this.deleteRow() },
      { icon: '➕↔️', title: '在左侧插入列', action: () => this.addColumnBefore() },
      { icon: '➕↔️', title: '在右侧插入列', action: () => this.addColumnAfter() },
      { icon: '❌↔️', title: '删除列', action: () => this.deleteColumn() },
      { icon: '🗑️', title: '删除表格', action: () => this.deleteTable() },
    ];

    buttons.forEach(({ icon, title, action }) => {
      const button = document.createElement('button');
      button.className = 'table-toolbar-btn';
      button.innerHTML = icon;
      button.title = title;
      button.style.cssText = `
        padding: 6px 8px;
        border: none;
        background: #f8f9fa;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: background-color 0.2s;
      `;
      
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#e9ecef';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = '#f8f9fa';
      });
      
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        action();
      });

      this.toolbar!.appendChild(button);
    });

    document.body.appendChild(this.toolbar);
  }

  private setupEventListeners(): void {
    // 监听编辑器选择变化
    this.editor.on('selectionUpdate', () => {
      this.handleSelectionUpdate();
    });

    // 监听鼠标移动，显示/隐藏工具栏
    this.editor.view.dom.addEventListener('mousemove', (e: MouseEvent) => {
      this.handleMouseMove(e);
    });

    // 点击其他地方隐藏工具栏
    document.addEventListener('click', (e: MouseEvent) => {
      if (!this.toolbar?.contains(e.target as Node) && 
          !this.currentTable?.contains(e.target as Node)) {
        this.hideToolbar();
      }
    });
  }

  private handleSelectionUpdate(): void {
    const { $from } = this.editor.state.selection;
    
    // 检查当前是否在表格中
    let tableDepth = -1;
    for (let i = $from.depth; i > 0; i--) {
      if ($from.node(i).type.name === 'table') {
        tableDepth = i;
        break;
      }
    }

    if (tableDepth === -1) {
      this.hideToolbar();
      this.currentTable = null;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const table = target.closest('table.markdown-table');
    
    if (table && table !== this.currentTable) {
      this.currentTable = table as HTMLElement;
      this.showToolbar(table as HTMLElement);
    } else if (!table) {
      // 延迟隐藏，给用户时间移动到工具栏
      setTimeout(() => {
        if (!this.isMouseOverTableOrToolbar(e)) {
          this.hideToolbar();
          this.currentTable = null;
        }
      }, 100);
    }
  }

  private isMouseOverTableOrToolbar(e: MouseEvent): boolean {
    const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
    return !!(elementUnderMouse && (
      elementUnderMouse.closest('table.markdown-table') ||
      elementUnderMouse.closest('.table-toolbar')
    ));
  }

  private showToolbar(table: HTMLElement): void {
    if (!this.toolbar) return;

    const rect = table.getBoundingClientRect();
    this.toolbar.style.display = 'flex';
    this.toolbar.style.left = `${rect.left}px`;
    this.toolbar.style.top = `${rect.top - this.toolbar.offsetHeight - 8}px`;

    // 确保工具栏不会超出视窗
    const toolbarRect = this.toolbar.getBoundingClientRect();
    if (toolbarRect.right > window.innerWidth) {
      this.toolbar.style.left = `${window.innerWidth - toolbarRect.width - 16}px`;
    }
    if (toolbarRect.top < 0) {
      this.toolbar.style.top = `${rect.bottom + 8}px`;
    }
  }

  private hideToolbar(): void {
    if (this.toolbar) {
      this.toolbar.style.display = 'none';
    }
  }

  // 表格操作方法
  private editTable(): void {
    // 显示表格编辑对话框
    this.showTableEditDialog();
  }

  private addRowBefore(): void {
    this.editor.chain().focus().addRowBefore().run();
  }

  private addRowAfter(): void {
    this.editor.chain().focus().addRowAfter().run();
  }

  private deleteRow(): void {
    this.editor.chain().focus().deleteRow().run();
  }

  private addColumnBefore(): void {
    this.editor.chain().focus().addColumnBefore().run();
  }

  private addColumnAfter(): void {
    this.editor.chain().focus().addColumnAfter().run();
  }

  private deleteColumn(): void {
    this.editor.chain().focus().deleteColumn().run();
  }

  private deleteTable(): void {
    this.editor.chain().focus().deleteTable().run();
    this.hideToolbar();
  }

  private showTableEditDialog(): void {
    // 创建表格编辑对话框
    const dialog = document.createElement('div');
    dialog.className = 'table-edit-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      min-width: 300px;
    `;

    const title = document.createElement('h3');
    title.textContent = '插入表格';
    title.style.marginBottom = '16px';

    const rowsLabel = document.createElement('label');
    rowsLabel.textContent = '行数: ';
    const rowsInput = document.createElement('input');
    rowsInput.type = 'number';
    rowsInput.value = '3';
    rowsInput.min = '1';
    rowsInput.max = '20';
    rowsInput.style.cssText = 'width: 60px; margin-left: 8px; margin-right: 16px;';

    const colsLabel = document.createElement('label');
    colsLabel.textContent = '列数: ';
    const colsInput = document.createElement('input');
    colsInput.type = 'number';
    colsInput.value = '3';
    colsInput.min = '1';
    colsInput.max = '20';
    colsInput.style.cssText = 'width: 60px; margin-left: 8px;';

    const inputContainer = document.createElement('div');
    inputContainer.style.marginBottom = '16px';
    inputContainer.appendChild(rowsLabel);
    inputContainer.appendChild(rowsInput);
    inputContainer.appendChild(colsLabel);
    inputContainer.appendChild(colsInput);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = 'padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;';

    const createBtn = document.createElement('button');
    createBtn.textContent = '创建';
    createBtn.style.cssText = 'padding: 8px 16px; border: none; background: #007acc; color: white; border-radius: 4px; cursor: pointer;';

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
      document.body.removeChild(overlay);
    });

    createBtn.addEventListener('click', () => {
      const rows = parseInt(rowsInput.value);
      const cols = parseInt(colsInput.value);
      this.insertTable(rows, cols);
      document.body.removeChild(dialog);
      document.body.removeChild(overlay);
    });

    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(createBtn);

    dialog.appendChild(title);
    dialog.appendChild(inputContainer);
    dialog.appendChild(buttonContainer);

    // 创建背景遮罩
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
    `;

    overlay.addEventListener('click', () => {
      document.body.removeChild(dialog);
      document.body.removeChild(overlay);
    });

    document.body.appendChild(overlay);
    document.body.appendChild(dialog);

    rowsInput.focus();
  }

  private insertTable(rows: number, cols: number): void {
    this.editor.chain().focus().insertTable({ 
      rows, 
      cols, 
      withHeaderRow: true 
    }).run();
  }

  // 销毁工具栏
  public destroy(): void {
    if (this.toolbar && this.toolbar.parentNode) {
      this.toolbar.parentNode.removeChild(this.toolbar);
    }
  }
}

// 表格快捷键处理
export function setupTableShortcuts(editor: Editor): void {
  const editorElement = editor.view.dom;

  editorElement.addEventListener('keydown', (e: KeyboardEvent) => {
    // 检查是否在表格中
    const { $from } = editor.state.selection;
    let inTable = false;
    
    for (let i = $from.depth; i > 0; i--) {
      if ($from.node(i).type.name === 'table') {
        inTable = true;
        break;
      }
    }

    if (!inTable) return;

    // Tab 键在表格中的处理
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        editor.chain().focus().goToPreviousCell().run();
      } else {
        editor.chain().focus().goToNextCell().run();
      }
    }

    // Enter 键在表格中的处理
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      editor.chain().focus().addRowAfter().run();
    }
  });
}