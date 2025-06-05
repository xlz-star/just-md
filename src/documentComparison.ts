import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

// 差异类型
type DiffType = 'equal' | 'insert' | 'delete' | 'replace';

// 差异项接口
interface DiffItem {
  type: DiffType;
  oldText?: string;
  newText?: string;
  oldStart?: number;
  oldEnd?: number;
  newStart?: number;
  newEnd?: number;
}

// 文档比较结果接口
interface ComparisonResult {
  leftDocument: {
    path: string;
    name: string;
    content: string;
  };
  rightDocument: {
    path: string;
    name: string;
    content: string;
  };
  differences: DiffItem[];
  statistics: {
    insertions: number;
    deletions: number;
    modifications: number;
    unchanged: number;
  };
}

// 文档比较管理器
export class DocumentComparisonManager {
  private comparisonPanel: HTMLElement | null = null;
  private currentComparison: ComparisonResult | null = null;

  constructor() {
    this.createComparisonPanel();
    this.createComparisonButton();
  }

  // 创建比较按钮
  private createComparisonButton(): void {
    const button = document.createElement('button');
    button.id = 'document-comparison-btn';
    button.className = 'floating-btn comparison-btn';
    button.title = '文档比较';
    button.innerHTML = '<i class="ri-file-copy-line"></i>';

    document.getElementById('app')?.appendChild(button);

    button.addEventListener('click', () => this.showDocumentSelection());
  }

  // 创建比较面板
  private createComparisonPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'comparison-panel';
    panel.className = 'comparison-panel hidden';
    panel.innerHTML = `
      <div class="comparison-content">
        <div class="comparison-header">
          <h2>文档比较</h2>
          <div class="comparison-header-actions">
            <button class="comparison-export" id="comparison-export" title="导出报告">
              <i class="ri-download-line"></i>
            </button>
            <button class="comparison-close" id="comparison-close">
              <i class="ri-close-line"></i>
            </button>
          </div>
        </div>
        
        <div class="comparison-toolbar">
          <div class="comparison-file-info">
            <div class="file-info-item">
              <span class="file-label">原文档:</span>
              <span class="file-name" id="left-file-name">未选择</span>
            </div>
            <div class="file-info-item">
              <span class="file-label">对比文档:</span>
              <span class="file-name" id="right-file-name">未选择</span>
            </div>
          </div>
          
          <div class="comparison-stats" id="comparison-stats" style="display: none;">
            <div class="stat-item insertions">
              <span class="stat-label">新增:</span>
              <span class="stat-value" id="insertions-count">0</span>
            </div>
            <div class="stat-item deletions">
              <span class="stat-label">删除:</span>
              <span class="stat-value" id="deletions-count">0</span>
            </div>
            <div class="stat-item modifications">
              <span class="stat-label">修改:</span>
              <span class="stat-value" id="modifications-count">0</span>
            </div>
            <div class="stat-item unchanged">
              <span class="stat-label">未变更:</span>
              <span class="stat-value" id="unchanged-count">0</span>
            </div>
          </div>
        </div>
        
        <div class="comparison-body">
          <div class="comparison-view" id="comparison-view">
            <div class="document-selector">
              <div class="selector-section">
                <h3>选择要比较的文档</h3>
                <div class="selector-actions">
                  <button class="btn-primary" id="select-left-file">
                    <i class="ri-file-line"></i>
                    选择原文档
                  </button>
                  <button class="btn-primary" id="select-right-file">
                    <i class="ri-file-copy-line"></i>
                    选择对比文档
                  </button>
                </div>
                <div class="selector-hint">
                  <p>选择两个Markdown文档进行比较，系统将高亮显示它们之间的差异</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.comparisonPanel = panel;

    this.setupPanelEventListeners();
  }

  // 设置面板事件监听器
  private setupPanelEventListeners(): void {
    if (!this.comparisonPanel) return;

    // 关闭按钮
    const closeBtn = this.comparisonPanel.querySelector('#comparison-close');
    closeBtn?.addEventListener('click', () => this.hideComparison());

    // 导出按钮
    const exportBtn = this.comparisonPanel.querySelector('#comparison-export');
    exportBtn?.addEventListener('click', () => this.exportComparison());

    // 文件选择按钮
    const selectLeftBtn = this.comparisonPanel.querySelector('#select-left-file');
    const selectRightBtn = this.comparisonPanel.querySelector('#select-right-file');

    selectLeftBtn?.addEventListener('click', () => this.selectFile('left'));
    selectRightBtn?.addEventListener('click', () => this.selectFile('right'));

    // 点击外部关闭
    this.comparisonPanel.addEventListener('click', (e) => {
      if (e.target === this.comparisonPanel) {
        this.hideComparison();
      }
    });

    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.comparisonPanel && !this.comparisonPanel.classList.contains('hidden')) {
        this.hideComparison();
      }
    });
  }

  // 显示文档选择界面
  public showDocumentSelection(): void {
    if (!this.comparisonPanel) return;

    this.comparisonPanel.classList.remove('hidden');
    this.resetComparison();
  }

  // 隐藏比较面板
  public hideComparison(): void {
    if (!this.comparisonPanel) return;

    this.comparisonPanel.classList.add('hidden');
  }

  // 重置比较状态
  private resetComparison(): void {
    this.currentComparison = null;
    
    if (!this.comparisonPanel) return;

    // 重置文件名显示
    const leftFileName = this.comparisonPanel.querySelector('#left-file-name');
    const rightFileName = this.comparisonPanel.querySelector('#right-file-name');
    if (leftFileName) leftFileName.textContent = '未选择';
    if (rightFileName) rightFileName.textContent = '未选择';

    // 隐藏统计信息
    const statsContainer = this.comparisonPanel.querySelector('#comparison-stats');
    if (statsContainer) {
      (statsContainer as HTMLElement).style.display = 'none';
    }

    // 显示选择界面
    const comparisonView = this.comparisonPanel.querySelector('#comparison-view');
    if (comparisonView) {
      comparisonView.innerHTML = `
        <div class="document-selector">
          <div class="selector-section">
            <h3>选择要比较的文档</h3>
            <div class="selector-actions">
              <button class="btn-primary" id="select-left-file">
                <i class="ri-file-line"></i>
                选择原文档
              </button>
              <button class="btn-primary" id="select-right-file">
                <i class="ri-file-copy-line"></i>
                选择对比文档
              </button>
            </div>
            <div class="selector-hint">
              <p>选择两个Markdown文档进行比较，系统将高亮显示它们之间的差异</p>
            </div>
          </div>
        </div>
      `;

      // 重新绑定事件
      const selectLeftBtn = comparisonView.querySelector('#select-left-file');
      const selectRightBtn = comparisonView.querySelector('#select-right-file');
      selectLeftBtn?.addEventListener('click', () => this.selectFile('left'));
      selectRightBtn?.addEventListener('click', () => this.selectFile('right'));
    }
  }

  // 选择文件
  private async selectFile(side: 'left' | 'right'): Promise<void> {
    try {
      const filePath = await open({
        filters: [
          {
            name: 'Markdown',
            extensions: ['md', 'markdown', 'txt']
          }
        ]
      });

      if (filePath && typeof filePath === 'string') {
        await this.loadFile(side, filePath);
      }
    } catch (error) {
      console.error('选择文件失败:', error);
    }
  }

  // 加载文件
  private async loadFile(side: 'left' | 'right', filePath: string): Promise<void> {
    try {
      // 读取文件内容
      const content = await invoke<string>('get_raw_markdown', { path: filePath });
      
      // 获取文件名
      const fileName = filePath.split(/[/\\]/).pop() || filePath;

      // 更新界面显示
      if (this.comparisonPanel) {
        const fileNameElement = this.comparisonPanel.querySelector(
          side === 'left' ? '#left-file-name' : '#right-file-name'
        );
        if (fileNameElement) {
          fileNameElement.textContent = fileName;
        }
      }

      // 创建或更新比较结果
      if (!this.currentComparison) {
        this.currentComparison = {
          leftDocument: side === 'left' ? { path: filePath, name: fileName, content } : { path: '', name: '未选择', content: '' },
          rightDocument: side === 'right' ? { path: filePath, name: fileName, content } : { path: '', name: '未选择', content: '' },
          differences: [],
          statistics: { insertions: 0, deletions: 0, modifications: 0, unchanged: 0 }
        };
      } else {
        if (side === 'left') {
          this.currentComparison.leftDocument = { path: filePath, name: fileName, content };
        } else {
          this.currentComparison.rightDocument = { path: filePath, name: fileName, content };
        }
      }

      // 如果两个文件都已选择，执行比较
      if (this.currentComparison.leftDocument.content && this.currentComparison.rightDocument.content) {
        await this.performComparison();
      }
    } catch (error) {
      console.error('加载文件失败:', error);
    }
  }

  // 执行文档比较
  private async performComparison(): Promise<void> {
    if (!this.currentComparison) return;

    try {
      // 使用简单的逐行比较算法
      const leftLines = this.currentComparison.leftDocument.content.split('\n');
      const rightLines = this.currentComparison.rightDocument.content.split('\n');

      const differences = this.calculateDifferences(leftLines, rightLines);
      this.currentComparison.differences = differences;

      // 计算统计信息
      this.currentComparison.statistics = this.calculateStatistics(differences);

      // 渲染比较结果
      this.renderComparison();
    } catch (error) {
      console.error('比较文档失败:', error);
    }
  }

  // 计算差异
  private calculateDifferences(leftLines: string[], rightLines: string[]): DiffItem[] {
    const differences: DiffItem[] = [];

    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < leftLines.length || rightIndex < rightLines.length) {
      const leftLine = leftIndex < leftLines.length ? leftLines[leftIndex] : undefined;
      const rightLine = rightIndex < rightLines.length ? rightLines[rightIndex] : undefined;

      if (leftLine === undefined) {
        // 右侧有新行
        differences.push({
          type: 'insert',
          newText: rightLine,
          newStart: rightIndex,
          newEnd: rightIndex + 1
        });
        rightIndex++;
      } else if (rightLine === undefined) {
        // 左侧行被删除
        differences.push({
          type: 'delete',
          oldText: leftLine,
          oldStart: leftIndex,
          oldEnd: leftIndex + 1
        });
        leftIndex++;
      } else if (leftLine === rightLine) {
        // 行相同
        differences.push({
          type: 'equal',
          oldText: leftLine,
          newText: rightLine,
          oldStart: leftIndex,
          oldEnd: leftIndex + 1,
          newStart: rightIndex,
          newEnd: rightIndex + 1
        });
        leftIndex++;
        rightIndex++;
      } else {
        // 行不同，视为替换
        differences.push({
          type: 'replace',
          oldText: leftLine,
          newText: rightLine,
          oldStart: leftIndex,
          oldEnd: leftIndex + 1,
          newStart: rightIndex,
          newEnd: rightIndex + 1
        });
        leftIndex++;
        rightIndex++;
      }
    }

    return differences;
  }

  // 计算统计信息
  private calculateStatistics(differences: DiffItem[]): ComparisonResult['statistics'] {
    const stats = { insertions: 0, deletions: 0, modifications: 0, unchanged: 0 };

    differences.forEach(diff => {
      switch (diff.type) {
        case 'insert':
          stats.insertions++;
          break;
        case 'delete':
          stats.deletions++;
          break;
        case 'replace':
          stats.modifications++;
          break;
        case 'equal':
          stats.unchanged++;
          break;
      }
    });

    return stats;
  }

  // 渲染比较结果
  private renderComparison(): void {
    if (!this.comparisonPanel || !this.currentComparison) return;

    // 更新统计信息
    this.updateStatistics();

    // 渲染比较视图
    const comparisonView = this.comparisonPanel.querySelector('#comparison-view');
    if (!comparisonView) return;

    comparisonView.innerHTML = `
      <div class="comparison-container">
        <div class="comparison-pane left-pane">
          <div class="pane-header">
            <h4>${this.currentComparison.leftDocument.name}</h4>
            <span class="pane-label">原文档</span>
          </div>
          <div class="pane-content" id="left-content"></div>
        </div>
        
        <div class="comparison-divider"></div>
        
        <div class="comparison-pane right-pane">
          <div class="pane-header">
            <h4>${this.currentComparison.rightDocument.name}</h4>
            <span class="pane-label">对比文档</span>
          </div>
          <div class="pane-content" id="right-content"></div>
        </div>
      </div>
    `;

    // 渲染左右内容
    this.renderPaneContent('left');
    this.renderPaneContent('right');
  }

  // 渲染面板内容
  private renderPaneContent(side: 'left' | 'right'): void {
    if (!this.comparisonPanel || !this.currentComparison) return;

    const contentElement = this.comparisonPanel.querySelector(`#${side}-content`);
    if (!contentElement) return;

    const lines: string[] = [];
    
    this.currentComparison.differences.forEach((diff, index) => {
      const text = side === 'left' ? diff.oldText : diff.newText;
      
      if (text !== undefined) {
        let cssClass = '';
        switch (diff.type) {
          case 'insert':
            cssClass = side === 'right' ? 'diff-insert' : '';
            break;
          case 'delete':
            cssClass = side === 'left' ? 'diff-delete' : '';
            break;
          case 'replace':
            cssClass = 'diff-replace';
            break;
          case 'equal':
            cssClass = 'diff-equal';
            break;
        }

        if (side === 'left' && diff.type === 'insert') {
          // 左侧不显示插入的行
          return;
        }
        if (side === 'right' && diff.type === 'delete') {
          // 右侧不显示删除的行
          return;
        }

        lines.push(`<div class="diff-line ${cssClass}" data-diff-index="${index}">${this.escapeHtml(text)}</div>`);
      }
    });

    contentElement.innerHTML = lines.join('');
  }

  // 更新统计信息
  private updateStatistics(): void {
    if (!this.comparisonPanel || !this.currentComparison) return;

    const statsContainer = this.comparisonPanel.querySelector('#comparison-stats');
    if (statsContainer) {
      (statsContainer as HTMLElement).style.display = 'flex';

      const stats = this.currentComparison.statistics;
      this.updateStatElement('#insertions-count', stats.insertions.toString());
      this.updateStatElement('#deletions-count', stats.deletions.toString());
      this.updateStatElement('#modifications-count', stats.modifications.toString());
      this.updateStatElement('#unchanged-count', stats.unchanged.toString());
    }
  }

  // 更新统计元素
  private updateStatElement(selector: string, value: string): void {
    if (!this.comparisonPanel) return;
    const element = this.comparisonPanel.querySelector(selector);
    if (element) {
      element.textContent = value;
    }
  }

  // 导出比较报告
  private async exportComparison(): Promise<void> {
    if (!this.currentComparison) {
      return;
    }

    try {
      const report = this.generateComparisonReport();
      
      // 保存报告到文件
      const blob = new Blob([report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `comparison-report-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出报告失败:', error);
    }
  }

  // 生成比较报告
  private generateComparisonReport(): string {
    if (!this.currentComparison) return '';

    const { leftDocument, rightDocument, statistics, differences } = this.currentComparison;
    const timestamp = new Date().toLocaleString('zh-CN');

    let report = `# 文档比较报告

**生成时间:** ${timestamp}

## 文档信息

| 项目 | 原文档 | 对比文档 |
|------|-------|----------|
| 文件名 | ${leftDocument.name} | ${rightDocument.name} |
| 路径 | ${leftDocument.path} | ${rightDocument.path} |

## 差异统计

| 类型 | 数量 |
|------|------|
| 新增行 | ${statistics.insertions} |
| 删除行 | ${statistics.deletions} |
| 修改行 | ${statistics.modifications} |
| 未变更行 | ${statistics.unchanged} |

## 详细差异

`;

    differences.forEach((diff, index) => {
      switch (diff.type) {
        case 'insert':
          report += `### 第 ${index + 1} 处差异 - 新增\n\n`;
          report += `**新增内容:**\n\`\`\`\n${diff.newText}\n\`\`\`\n\n`;
          break;
        case 'delete':
          report += `### 第 ${index + 1} 处差异 - 删除\n\n`;
          report += `**删除内容:**\n\`\`\`\n${diff.oldText}\n\`\`\`\n\n`;
          break;
        case 'replace':
          report += `### 第 ${index + 1} 处差异 - 修改\n\n`;
          report += `**原内容:**\n\`\`\`\n${diff.oldText}\n\`\`\`\n\n`;
          report += `**新内容:**\n\`\`\`\n${diff.newText}\n\`\`\`\n\n`;
          break;
      }
    });

    return report;
  }

  // HTML转义
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 清理资源
  public destroy(): void {
    if (this.comparisonPanel) {
      this.comparisonPanel.remove();
      this.comparisonPanel = null;
    }
    
    const button = document.querySelector('#document-comparison-btn');
    if (button) {
      button.remove();
    }
  }
}

// 创建全局实例
export const documentComparisonManager = new DocumentComparisonManager();

// 初始化函数
export function initDocumentComparison(): void {
  // 文档比较功能已通过构造函数初始化
  console.log('文档比较功能已初始化');
}

// 暴露给全局作用域
(window as any).documentComparisonManager = documentComparisonManager;