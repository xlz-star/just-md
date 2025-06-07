import { getEditor } from './editor';

// 写作统计接口
interface WritingStats {
  characters: number;
  charactersWithoutSpaces: number;
  words: number;
  paragraphs: number;
  sentences: number;
  readingTime: number; // 分钟
  typingTime: number; // 分钟
  averageWordsPerSentence: number;
  averageSentencesPerParagraph: number;
  complexity: 'simple' | 'medium' | 'complex';
  mostUsedWords: Array<{ word: string; count: number }>;
}

// 写作目标接口
interface WritingGoal {
  id: string;
  type: 'words' | 'characters' | 'time' | 'pages';
  target: number;
  current: number;
  deadline?: Date;
  description: string;
  completed: boolean;
}

// 写作会话接口
interface WritingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  wordsAdded: number;
  charactersAdded: number;
  timeSpent: number; // 毫秒
  document: string; // 文档路径或标识
}

// 写作统计管理器
export class WritingStatsManager {
  private currentSession: WritingSession | null = null;
  private goals: WritingGoal[] = [];
  private sessions: WritingSession[] = [];
  private statsPanel: HTMLElement | null = null;
  private isTracking = false;
  private lastContent = '';
  private updateInterval: number | null = null;

  constructor() {
    this.loadData();
    this.createStatsPanel();
    this.setupEventListeners();
  }

  // 创建统计面板
  private createStatsPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'writing-stats-panel';
    panel.className = 'writing-stats-panel hidden';
    panel.innerHTML = `
      <div class="stats-content">
        <div class="stats-header">
          <h2>写作统计</h2>
          <div class="stats-header-actions">
            <button class="stats-tab-btn active" data-tab="overview">概览</button>
            <button class="stats-tab-btn" data-tab="goals">目标</button>
            <button class="stats-tab-btn" data-tab="sessions">历史</button>
            <button class="stats-close" id="stats-close">
              <i class="ri-close-line"></i>
            </button>
          </div>
        </div>
        
        <div class="stats-body">
          <!-- 概览标签页 -->
          <div class="stats-tab active" id="overview-tab">
            <div class="stats-grid">
              <div class="stats-card">
                <div class="stats-card-icon">📝</div>
                <div class="stats-card-content">
                  <div class="stats-card-value" id="word-count">0</div>
                  <div class="stats-card-label">单词</div>
                </div>
              </div>
              
              <div class="stats-card">
                <div class="stats-card-icon">📄</div>
                <div class="stats-card-content">
                  <div class="stats-card-value" id="char-count">0</div>
                  <div class="stats-card-label">字符</div>
                </div>
              </div>
              
              <div class="stats-card">
                <div class="stats-card-icon">⏱️</div>
                <div class="stats-card-content">
                  <div class="stats-card-value" id="reading-time">0分钟</div>
                  <div class="stats-card-label">阅读时间</div>
                </div>
              </div>
              
              <div class="stats-card">
                <div class="stats-card-icon">⌨️</div>
                <div class="stats-card-content">
                  <div class="stats-card-value" id="typing-time">0分钟</div>
                  <div class="stats-card-label">写作时间</div>
                </div>
              </div>
            </div>
            
            <div class="stats-details">
              <div class="stats-detail-section">
                <h3>详细统计</h3>
                <div class="stats-detail-grid">
                  <div class="stats-detail-item">
                    <span class="stats-detail-label">段落:</span>
                    <span class="stats-detail-value" id="paragraph-count">0</span>
                  </div>
                  <div class="stats-detail-item">
                    <span class="stats-detail-label">句子:</span>
                    <span class="stats-detail-value" id="sentence-count">0</span>
                  </div>
                  <div class="stats-detail-item">
                    <span class="stats-detail-label">不含空格字符:</span>
                    <span class="stats-detail-value" id="char-no-spaces-count">0</span>
                  </div>
                  <div class="stats-detail-item">
                    <span class="stats-detail-label">复杂度:</span>
                    <span class="stats-detail-value" id="complexity-level">简单</span>
                  </div>
                  <div class="stats-detail-item">
                    <span class="stats-detail-label">平均句长:</span>
                    <span class="stats-detail-value" id="avg-sentence-length">0</span>
                  </div>
                  <div class="stats-detail-item">
                    <span class="stats-detail-label">平均段长:</span>
                    <span class="stats-detail-value" id="avg-paragraph-length">0</span>
                  </div>
                </div>
              </div>
              
              <div class="stats-detail-section">
                <h3>常用词汇</h3>
                <div class="frequent-words" id="frequent-words">
                  <div class="no-data">暂无数据</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 目标标签页 -->
          <div class="stats-tab" id="goals-tab">
            <div class="goals-header">
              <h3>写作目标</h3>
              <button class="btn-primary" id="add-goal-btn">
                <i class="ri-add-line"></i> 添加目标
              </button>
            </div>
            <div class="goals-list" id="goals-list">
              <div class="no-data">暂无目标，点击上方按钮添加第一个目标</div>
            </div>
          </div>
          
          <!-- 历史标签页 -->
          <div class="stats-tab" id="sessions-tab">
            <div class="sessions-header">
              <h3>写作历史</h3>
              <div class="sessions-summary">
                <div class="session-summary-item">
                  <span class="session-summary-label">今日写作:</span>
                  <span class="session-summary-value" id="today-words">0 词</span>
                </div>
                <div class="session-summary-item">
                  <span class="session-summary-label">本周写作:</span>
                  <span class="session-summary-value" id="week-words">0 词</span>
                </div>
                <div class="session-summary-item">
                  <span class="session-summary-label">总写作时间:</span>
                  <span class="session-summary-value" id="total-time">0 小时</span>
                </div>
              </div>
            </div>
            <div class="sessions-list" id="sessions-list">
              <div class="no-data">暂无写作记录</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.statsPanel = panel;

    this.setupPanelEventListeners();
  }

  // 设置面板事件监听器
  private setupPanelEventListeners(): void {
    if (!this.statsPanel) return;

    // 关闭按钮
    const closeBtn = this.statsPanel.querySelector('#stats-close');
    closeBtn?.addEventListener('click', () => this.hideStats());

    // 标签页切换
    const tabBtns = this.statsPanel.querySelectorAll('.stats-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tabId = target.getAttribute('data-tab');
        if (tabId) {
          this.switchTab(tabId);
        }
      });
    });

    // 添加目标按钮
    const addGoalBtn = this.statsPanel.querySelector('#add-goal-btn');
    addGoalBtn?.addEventListener('click', () => this.showAddGoalDialog());

    // 点击外部关闭
    this.statsPanel.addEventListener('click', (e) => {
      if (e.target === this.statsPanel) {
        this.hideStats();
      }
    });
  }

  // 设置事件监听器
  private setupEventListeners(): void {
    // 创建统计按钮
    this.createStatsButton();

    // 监听编辑器内容变化
    if (typeof window !== 'undefined') {
      // 使用定时器定期更新统计信息
      this.updateInterval = setInterval(() => {
        this.updateStats();
      }, 1000) as unknown as number;
    }
  }

  // 创建统计按钮
  private createStatsButton(): void {
    const button = document.createElement('button');
    button.id = 'writing-stats-btn';
    button.className = 'floating-btn stats-btn hidden';
    button.title = '写作统计';
    button.innerHTML = '<i class="ri-bar-chart-line"></i>';
    button.style.display = 'none';

    document.getElementById('app')?.appendChild(button);

    button.addEventListener('click', () => this.toggleStats());
  }

  // 切换统计面板显示
  public toggleStats(): void {
    if (!this.statsPanel) return;

    if (this.statsPanel.classList.contains('hidden')) {
      this.showStats();
    } else {
      this.hideStats();
    }
  }

  // 显示统计面板
  public showStats(): void {
    if (!this.statsPanel) return;

    this.statsPanel.classList.remove('hidden');
    this.updateAllStats();
  }

  // 隐藏统计面板
  public hideStats(): void {
    if (!this.statsPanel) return;

    this.statsPanel.classList.add('hidden');
  }

  // 切换标签页
  private switchTab(tabId: string): void {
    if (!this.statsPanel) return;

    // 更新按钮状态
    const tabBtns = this.statsPanel.querySelectorAll('.stats-tab-btn');
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // 更新标签页显示
    const tabs = this.statsPanel.querySelectorAll('.stats-tab');
    tabs.forEach(tab => {
      const shouldShow = tab.id === `${tabId}-tab`;
      tab.classList.toggle('active', shouldShow);
    });

    // 根据标签页更新数据
    switch (tabId) {
      case 'overview':
        this.updateOverviewTab();
        break;
      case 'goals':
        this.updateGoalsTab();
        break;
      case 'sessions':
        this.updateSessionsTab();
        break;
    }
  }

  // 更新所有统计信息
  private updateAllStats(): void {
    this.updateOverviewTab();
    this.updateGoalsTab();
    this.updateSessionsTab();
  }

  // 更新概览标签页
  private updateOverviewTab(): void {
    const stats = this.calculateStats();
    this.updateStatsDisplay(stats);
  }

  // 更新目标标签页
  private updateGoalsTab(): void {
    if (!this.statsPanel) return;

    const goalsList = this.statsPanel.querySelector('#goals-list');
    if (!goalsList) return;

    if (this.goals.length === 0) {
      goalsList.innerHTML = '<div class="no-data">暂无目标，点击上方按钮添加第一个目标</div>';
      return;
    }

    const stats = this.calculateStats();
    goalsList.innerHTML = this.goals.map(goal => {
      const progress = this.calculateGoalProgress(goal, stats);
      const progressPercent = Math.min((progress / goal.target) * 100, 100);
      
      return `
        <div class="goal-item ${goal.completed ? 'completed' : ''}">
          <div class="goal-header">
            <div class="goal-info">
              <h4 class="goal-title">${goal.description}</h4>
              <div class="goal-meta">
                ${goal.type === 'words' ? '词汇目标' : 
                  goal.type === 'characters' ? '字符目标' : 
                  goal.type === 'time' ? '时间目标' : '页面目标'}
                ${goal.deadline ? ` · 截止 ${this.formatDate(goal.deadline)}` : ''}
              </div>
            </div>
            <button class="goal-remove" onclick="writingStatsManager.removeGoal('${goal.id}')">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
          <div class="goal-progress">
            <div class="goal-progress-bar">
              <div class="goal-progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <div class="goal-progress-text">${progress} / ${goal.target}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 更新历史标签页
  private updateSessionsTab(): void {
    if (!this.statsPanel) return;

    // 更新汇总信息
    const todayWords = this.getTodayWords();
    const weekWords = this.getWeekWords();
    const totalTime = this.getTotalTime();

    this.updateElementText('#today-words', `${todayWords} 词`);
    this.updateElementText('#week-words', `${weekWords} 词`);
    this.updateElementText('#total-time', `${Math.round(totalTime / 3600000)} 小时`);

    // 更新会话列表
    const sessionsList = this.statsPanel.querySelector('#sessions-list');
    if (!sessionsList) return;

    if (this.sessions.length === 0) {
      sessionsList.innerHTML = '<div class="no-data">暂无写作记录</div>';
      return;
    }

    const recentSessions = this.sessions
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 10);

    sessionsList.innerHTML = recentSessions.map(session => `
      <div class="session-item">
        <div class="session-date">${this.formatDateTime(session.startTime)}</div>
        <div class="session-stats">
          <span class="session-stat">
            <i class="ri-font-size"></i> ${session.wordsAdded} 词
          </span>
          <span class="session-stat">
            <i class="ri-time-line"></i> ${Math.round(session.timeSpent / 60000)} 分钟
          </span>
        </div>
      </div>
    `).join('');
  }

  // 开始写作会话
  public startSession(documentPath: string = 'untitled'): void {
    if (this.currentSession) {
      this.endSession();
    }

    this.currentSession = {
      id: this.generateId(),
      startTime: new Date(),
      wordsAdded: 0,
      charactersAdded: 0,
      timeSpent: 0,
      document: documentPath
    };

    this.isTracking = true;
    this.lastContent = this.getCurrentContent();
  }

  // 结束写作会话
  public endSession(): void {
    if (!this.currentSession) return;

    this.currentSession.endTime = new Date();
    this.currentSession.timeSpent = this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();

    this.sessions.push(this.currentSession);
    this.saveData();

    this.currentSession = null;
    this.isTracking = false;
  }

  // 更新统计信息
  private updateStats(): void {
    if (!this.isTracking || !this.currentSession) return;

    const currentContent = this.getCurrentContent();
    if (currentContent !== this.lastContent) {
      const currentStats = this.calculateStats();
      const lastStats = this.calculateStatsForContent(this.lastContent);

      this.currentSession.wordsAdded += Math.max(0, currentStats.words - lastStats.words);
      this.currentSession.charactersAdded += Math.max(0, currentStats.characters - lastStats.characters);

      this.lastContent = currentContent;
    }
  }

  // 计算统计信息
  private calculateStats(): WritingStats {
    const content = this.getCurrentContent();
    return this.calculateStatsForContent(content);
  }

  // 为指定内容计算统计信息
  private calculateStatsForContent(content: string): WritingStats {
    // 移除HTML标签，获取纯文本
    const textContent = this.stripHtml(content);
    
    // 计算基础统计
    const characters = textContent.length;
    const charactersWithoutSpaces = textContent.replace(/\s/g, '').length;
    
    // 计算单词数（支持中英文）
    const words = this.countWords(textContent);
    
    // 计算段落数
    const paragraphs = this.countParagraphs(textContent);
    
    // 计算句子数
    const sentences = this.countSentences(textContent);
    
    // 计算阅读时间（假设每分钟250个英文单词或150个中文字符）
    const readingTime = this.calculateReadingTime(textContent);
    
    // 计算写作时间
    const typingTime = this.calculateTypingTime();
    
    // 计算平均值
    const averageWordsPerSentence = sentences > 0 ? words / sentences : 0;
    const averageSentencesPerParagraph = paragraphs > 0 ? sentences / paragraphs : 0;
    
    // 计算复杂度
    const complexity = this.calculateComplexity(averageWordsPerSentence);
    
    // 计算最常用词汇
    const mostUsedWords = this.getMostUsedWords(textContent);

    return {
      characters,
      charactersWithoutSpaces,
      words,
      paragraphs,
      sentences,
      readingTime,
      typingTime,
      averageWordsPerSentence,
      averageSentencesPerParagraph,
      complexity,
      mostUsedWords
    };
  }

  // 获取当前编辑器内容
  private getCurrentContent(): string {
    const editor = getEditor();
    return editor ? editor.getHTML() : '';
  }

  // 移除HTML标签
  private stripHtml(html: string): string {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  }

  // 计算单词数
  private countWords(text: string): number {
    if (!text.trim()) return 0;
    
    // 匹配中文字符和英文单词
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    
    return chineseChars + englishWords;
  }

  // 计算段落数
  private countParagraphs(text: string): number {
    if (!text.trim()) return 0;
    return text.split(/\n\s*\n/).filter(p => p.trim()).length;
  }

  // 计算句子数
  private countSentences(text: string): number {
    if (!text.trim()) return 0;
    return (text.match(/[.!?。！？]/g) || []).length || 1;
  }

  // 计算阅读时间
  private calculateReadingTime(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    
    // 中文每分钟150字，英文每分钟250词
    const minutes = (chineseChars / 150) + (englishWords / 250);
    return Math.max(1, Math.round(minutes));
  }

  // 计算写作时间
  private calculateTypingTime(): number {
    if (!this.currentSession) return 0;
    return Math.round((Date.now() - this.currentSession.startTime.getTime()) / 60000);
  }

  // 计算复杂度
  private calculateComplexity(avgWordsPerSentence: number): 'simple' | 'medium' | 'complex' {
    if (avgWordsPerSentence < 10) return 'simple';
    if (avgWordsPerSentence < 20) return 'medium';
    return 'complex';
  }

  // 获取最常用词汇
  private getMostUsedWords(text: string): Array<{ word: string; count: number }> {
    const words = text.toLowerCase()
      .match(/[\u4e00-\u9fff]+|[a-zA-Z]+/g) || [];
    
    const wordCount = new Map<string, number>();
    
    words.forEach(word => {
      if (word.length > 1) { // 忽略单个字符
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });
    
    return Array.from(wordCount.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // 更新显示统计信息
  private updateStatsDisplay(stats: WritingStats): void {
    this.updateElementText('#word-count', stats.words.toString());
    this.updateElementText('#char-count', stats.characters.toString());
    this.updateElementText('#reading-time', `${stats.readingTime}分钟`);
    this.updateElementText('#typing-time', `${stats.typingTime}分钟`);
    this.updateElementText('#paragraph-count', stats.paragraphs.toString());
    this.updateElementText('#sentence-count', stats.sentences.toString());
    this.updateElementText('#char-no-spaces-count', stats.charactersWithoutSpaces.toString());
    
    const complexityText = stats.complexity === 'simple' ? '简单' : 
                          stats.complexity === 'medium' ? '中等' : '复杂';
    this.updateElementText('#complexity-level', complexityText);
    
    this.updateElementText('#avg-sentence-length', Math.round(stats.averageWordsPerSentence).toString());
    this.updateElementText('#avg-paragraph-length', Math.round(stats.averageSentencesPerParagraph).toString());

    // 更新常用词汇
    this.updateFrequentWords(stats.mostUsedWords);
  }

  // 更新常用词汇显示
  private updateFrequentWords(words: Array<{ word: string; count: number }>): void {
    if (!this.statsPanel) return;

    const container = this.statsPanel.querySelector('#frequent-words');
    if (!container) return;

    if (words.length === 0) {
      container.innerHTML = '<div class="no-data">暂无数据</div>';
      return;
    }

    container.innerHTML = words.map(({ word, count }) => `
      <div class="frequent-word">
        <span class="word">${word}</span>
        <span class="count">${count}</span>
      </div>
    `).join('');
  }

  // 更新元素文本
  private updateElementText(selector: string, text: string): void {
    if (!this.statsPanel) return;
    const element = this.statsPanel.querySelector(selector);
    if (element) {
      element.textContent = text;
    }
  }

  // 计算目标进度
  private calculateGoalProgress(goal: WritingGoal, stats: WritingStats): number {
    switch (goal.type) {
      case 'words':
        return stats.words;
      case 'characters':
        return stats.characters;
      case 'time':
        return stats.typingTime;
      case 'pages':
        return Math.ceil(stats.words / 250); // 假设每页250词
      default:
        return 0;
    }
  }

  // 显示添加目标对话框
  private showAddGoalDialog(): void {
    const dialog = document.createElement('div');
    dialog.className = 'goal-dialog';
    dialog.innerHTML = `
      <div class="goal-dialog-content">
        <div class="goal-dialog-header">
          <h3>添加写作目标</h3>
          <button class="goal-dialog-close"><i class="ri-close-line"></i></button>
        </div>
        <div class="goal-dialog-body">
          <div class="form-group">
            <label>目标描述</label>
            <input type="text" id="goal-description" placeholder="例如：完成第一章">
          </div>
          <div class="form-group">
            <label>目标类型</label>
            <select id="goal-type">
              <option value="words">词汇数量</option>
              <option value="characters">字符数量</option>
              <option value="time">写作时间（分钟）</option>
              <option value="pages">页数</option>
            </select>
          </div>
          <div class="form-group">
            <label>目标数值</label>
            <input type="number" id="goal-target" placeholder="1000" min="1">
          </div>
          <div class="form-group">
            <label>截止日期（可选）</label>
            <input type="date" id="goal-deadline">
          </div>
          <div class="form-actions">
            <button class="btn-secondary goal-cancel">取消</button>
            <button class="btn-primary goal-save">保存</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // 事件监听器
    const closeBtn = dialog.querySelector('.goal-dialog-close');
    const cancelBtn = dialog.querySelector('.goal-cancel');
    const saveBtn = dialog.querySelector('.goal-save');

    const closeDialog = () => dialog.remove();

    closeBtn?.addEventListener('click', closeDialog);
    cancelBtn?.addEventListener('click', closeDialog);
    
    saveBtn?.addEventListener('click', () => {
      const description = (dialog.querySelector('#goal-description') as HTMLInputElement)?.value;
      const type = (dialog.querySelector('#goal-type') as HTMLSelectElement)?.value as WritingGoal['type'];
      const target = parseInt((dialog.querySelector('#goal-target') as HTMLInputElement)?.value);
      const deadlineInput = (dialog.querySelector('#goal-deadline') as HTMLInputElement)?.value;
      
      if (description && target > 0) {
        const goal: WritingGoal = {
          id: this.generateId(),
          type,
          target,
          current: 0,
          deadline: deadlineInput ? new Date(deadlineInput) : undefined,
          description,
          completed: false
        };
        
        this.addGoal(goal);
        closeDialog();
      }
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        closeDialog();
      }
    });
  }

  // 添加目标
  private addGoal(goal: WritingGoal): void {
    this.goals.push(goal);
    this.saveData();
    this.updateGoalsTab();
  }

  // 移除目标
  public removeGoal(goalId: string): void {
    this.goals = this.goals.filter(goal => goal.id !== goalId);
    this.saveData();
    this.updateGoalsTab();
  }

  // 获取今日写作词数
  private getTodayWords(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.sessions
      .filter(session => new Date(session.startTime) >= today)
      .reduce((total, session) => total + session.wordsAdded, 0);
  }

  // 获取本周写作词数
  private getWeekWords(): number {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    return this.sessions
      .filter(session => new Date(session.startTime) >= weekStart)
      .reduce((total, session) => total + session.wordsAdded, 0);
  }

  // 获取总写作时间
  private getTotalTime(): number {
    return this.sessions.reduce((total, session) => total + session.timeSpent, 0);
  }

  // 格式化日期
  private formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN');
  }

  // 格式化日期时间
  private formatDateTime(date: Date): string {
    return date.toLocaleString('zh-CN');
  }

  // 生成ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 保存数据
  private saveData(): void {
    try {
      localStorage.setItem('just-md-writing-goals', JSON.stringify(this.goals));
      localStorage.setItem('just-md-writing-sessions', JSON.stringify(this.sessions));
    } catch (error) {
      console.error('保存写作统计数据失败:', error);
    }
  }

  // 加载数据
  private loadData(): void {
    try {
      const goalsData = localStorage.getItem('just-md-writing-goals');
      if (goalsData) {
        this.goals = JSON.parse(goalsData);
        // 转换日期字符串为Date对象
        this.goals.forEach(goal => {
          if (goal.deadline) {
            goal.deadline = new Date(goal.deadline);
          }
        });
      }

      const sessionsData = localStorage.getItem('just-md-writing-sessions');
      if (sessionsData) {
        this.sessions = JSON.parse(sessionsData);
        // 转换日期字符串为Date对象
        this.sessions.forEach(session => {
          session.startTime = new Date(session.startTime);
          if (session.endTime) {
            session.endTime = new Date(session.endTime);
          }
        });
      }
    } catch (error) {
      console.error('加载写作统计数据失败:', error);
      this.goals = [];
      this.sessions = [];
    }
  }

  // 清理资源
  public destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.currentSession) {
      this.endSession();
    }
    
    if (this.statsPanel) {
      this.statsPanel.remove();
      this.statsPanel = null;
    }
  }
}

// 创建全局实例
export const writingStatsManager = new WritingStatsManager();

// 初始化函数
export function initWritingStats(): void {
  // 自动开始会话
  writingStatsManager.startSession();
  
  // 在文件打开时重新开始会话
  window.addEventListener('file-opened', (event: any) => {
    const filePath = event.detail?.path || 'untitled';
    writingStatsManager.startSession(filePath);
  });
  
  // 页面卸载时结束会话
  window.addEventListener('beforeunload', () => {
    writingStatsManager.destroy();
  });
}

// 暴露给全局作用域
(window as any).writingStatsManager = writingStatsManager;