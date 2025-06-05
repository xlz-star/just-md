import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// 拼写检查配置
interface SpellCheckOptions {
  enabled: boolean;
  language: string;
  customDictionary: Set<string>;
  ignoreUppercase: boolean;
  ignoreNumbers: boolean;
  contextMenuSuggestions: number;
}


// 内置的常用中文词汇（基础词典）
const CHINESE_COMMON_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '到', '说', '要', '去', '你', '会', '着', '没', '看', '好', '自己', '这', '上', '来', '很', '还', '以', '下', '过', '也', '什么', '时候', '现在', '那', '这个', '怎么', '知道', '可以', '但是', '如果', '只是', '这样', '那样', '因为', '所以', '虽然', '然后', '或者', '不过', '而且', '另外', '特别', '尤其', '当然', '确实', '其实', '可能', '应该', '需要', '希望', '想要', '觉得', '认为', '以为', '听说', '据说', '看来', '似乎', '好像', '大概', '差不多', '左右', '之间', '以前', '以后', '最近', '刚才', '马上', '立刻', '一直', '总是', '经常', '有时', '偶尔', '从来', '永远', '已经', '还是', '依然', '仍然', '继续', '开始', '结束', '完成', '成功', '失败', '问题', '办法', '方法', '措施', '计划', '想法', '意见', '建议', '要求', '条件', '原因', '结果', '影响', '作用', '效果', '好处', '坏处', '优点', '缺点', '特点', '特色', '风格', '方式', '类型', '种类', '形式', '内容', '材料', '工具', '设备', '技术', '方法', '系统', '网络', '平台', '软件', '程序', '应用', '功能', '服务', '产品', '商品', '价格', '质量', '数量', '大小', '长度', '高度', '重量', '速度', '时间', '地点', '位置', '方向', '距离', '范围', '区域', '空间', '环境', '条件', '情况', '状态', '变化', '发展', '进步', '提高', '增加', '减少', '扩大', '缩小'
]);

// 常用英文单词（基础版）
const ENGLISH_COMMON_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had', 'were', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'if', 'up', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'into', 'him', 'two', 'more', 'very', 'what', 'know', 'just', 'first', 'get', 'over', 'think', 'where', 'much', 'go', 'good', 'new', 'write', 'our', 'used', 'me', 'man', 'day', 'too', 'any', 'may', 'say', 'she', 'or', 'an', 'my', 'one', 'all', 'would', 'there', 'their'
]);

// 拼写检查管理器
export class SpellChecker {
  private options: SpellCheckOptions;
  private customDictionary: Set<string>;
  private isEnabled: boolean = false;

  constructor(options?: Partial<SpellCheckOptions>) {
    this.options = {
      enabled: true,
      language: 'zh-CN',
      customDictionary: new Set(),
      ignoreUppercase: true,
      ignoreNumbers: true,
      contextMenuSuggestions: 5,
      ...options
    };
    
    this.customDictionary = new Set(this.options.customDictionary);
    this.isEnabled = this.options.enabled;
    
    // 加载用户自定义词典
    this.loadCustomDictionary();
  }

  // 检查单词是否正确
  checkWord(word: string): boolean {
    if (!this.isEnabled) return true;
    
    // 忽略规则
    if (this.options.ignoreUppercase && /^[A-Z]+$/.test(word)) return true;
    if (this.options.ignoreNumbers && /^\d+$/.test(word)) return true;
    if (word.length < 2) return true;
    
    // 检查自定义词典
    if (this.customDictionary.has(word.toLowerCase())) return true;
    
    // 检查内置词典
    if (this.options.language === 'zh-CN') {
      return this.checkChineseWord(word);
    } else if (this.options.language === 'en-US') {
      return this.checkEnglishWord(word);
    }
    
    return true;
  }

  // 检查中文单词
  private checkChineseWord(word: string): boolean {
    // 检查是否包含中文字符
    const containsChinese = /[\u4e00-\u9fff]/.test(word);
    if (!containsChinese) return true;
    
    // 检查常用词汇
    if (CHINESE_COMMON_WORDS.has(word)) return true;
    
    // 简单的中文词汇验证（基于字符组合的合理性）
    return this.isValidChineseWord(word);
  }

  // 检查英文单词
  private checkEnglishWord(word: string): boolean {
    const lowerWord = word.toLowerCase();
    
    // 检查常用词汇
    if (ENGLISH_COMMON_WORDS.has(lowerWord)) return true;
    
    // 检查浏览器内置拼写检查（如果可用）
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      // 使用简单的启发式规则
      return this.isValidEnglishWord(word);
    }
    
    return true;
  }

  // 简单的中文词汇验证
  private isValidChineseWord(word: string): boolean {
    // 基本的中文词汇模式匹配
    if (word.length === 1) return true; // 单个汉字通常是有效的
    if (word.length === 2) {
      // 双字词的简单验证
      return /^[\u4e00-\u9fff]{2}$/.test(word);
    }
    if (word.length >= 3 && word.length <= 4) {
      // 三到四字词的验证
      return /^[\u4e00-\u9fff]+$/.test(word);
    }
    return word.length <= 6; // 较长的词汇暂时认为有效
  }

  // 简单的英文单词验证
  private isValidEnglishWord(word: string): boolean {
    // 基本的英文单词模式
    if (!/^[a-zA-Z]+$/.test(word)) return false;
    if (word.length < 2) return false;
    
    // 简单的英文单词规则
    const hasVowel = /[aeiouAEIOU]/.test(word);
    const hasConsonant = /[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/.test(word);
    
    return hasVowel && hasConsonant;
  }

  // 获取单词建议
  getSuggestions(word: string): string[] {
    const suggestions: string[] = [];
    
    if (this.options.language === 'zh-CN') {
      suggestions.push(...this.getChineseSuggestions(word));
    } else if (this.options.language === 'en-US') {
      suggestions.push(...this.getEnglishSuggestions(word));
    }
    
    return suggestions.slice(0, this.options.contextMenuSuggestions);
  }

  // 获取中文建议
  private getChineseSuggestions(word: string): string[] {
    const suggestions: string[] = [];
    
    // 查找相似的常用词汇
    for (const dictWord of CHINESE_COMMON_WORDS) {
      if (this.calculateSimilarity(word, dictWord) > 0.6) {
        suggestions.push(dictWord);
      }
    }
    
    return suggestions.slice(0, 5);
  }

  // 获取英文建议
  private getEnglishSuggestions(word: string): string[] {
    const suggestions: string[] = [];
    const lowerWord = word.toLowerCase();
    
    // 查找相似的常用词汇
    for (const dictWord of ENGLISH_COMMON_WORDS) {
      if (this.calculateSimilarity(lowerWord, dictWord) > 0.7) {
        suggestions.push(dictWord);
      }
    }
    
    return suggestions.slice(0, 5);
  }

  // 计算字符串相似度（简单的编辑距离）
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;
    
    const matrix: number[][] = [];
    
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const maxLen = Math.max(len1, len2);
    return 1 - matrix[len1][len2] / maxLen;
  }

  // 添加到自定义词典
  addToCustomDictionary(word: string): void {
    this.customDictionary.add(word.toLowerCase());
    this.saveCustomDictionary();
  }

  // 从自定义词典移除
  removeFromCustomDictionary(word: string): void {
    this.customDictionary.delete(word.toLowerCase());
    this.saveCustomDictionary();
  }

  // 保存自定义词典
  private saveCustomDictionary(): void {
    try {
      const dictArray = Array.from(this.customDictionary);
      localStorage.setItem('just-md-custom-dictionary', JSON.stringify(dictArray));
    } catch (error) {
      console.error('保存自定义词典失败:', error);
    }
  }

  // 加载自定义词典
  private loadCustomDictionary(): void {
    try {
      const stored = localStorage.getItem('just-md-custom-dictionary');
      if (stored) {
        const dictArray = JSON.parse(stored);
        this.customDictionary = new Set(dictArray);
      }
    } catch (error) {
      console.error('加载自定义词典失败:', error);
      this.customDictionary = new Set();
    }
  }

  // 启用/禁用拼写检查
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('just-md-spell-check-enabled', enabled.toString());
  }

  // 检查是否启用
  getEnabled(): boolean {
    return this.isEnabled;
  }

  // 设置语言
  setLanguage(language: string): void {
    this.options.language = language;
    localStorage.setItem('just-md-spell-check-language', language);
  }

  // 获取语言
  getLanguage(): string {
    return this.options.language;
  }
}

// 创建全局拼写检查器实例
export const spellChecker = new SpellChecker();

// TipTap 拼写检查扩展
export const SpellCheckExtension = Extension.create({
  name: 'spellCheck',
  
  addOptions() {
    return {
      spellChecker: spellChecker,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('spellCheck'),
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, decorationSet, _oldState, newState) => {
            if (!spellChecker.getEnabled()) {
              return DecorationSet.empty;
            }
            
            // 如果文档没有变化，保持现有装饰
            if (!tr.docChanged) {
              return decorationSet.map(tr.mapping, tr.doc);
            }
            
            // 重新检查拼写错误
            const decorations: Decoration[] = [];
            const doc = newState.doc;
            
            doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                const text = node.text;
                const words = extractWords(text);
                
                words.forEach(({ word, start, end }: { word: string; start: number; end: number }) => {
                  if (!spellChecker.checkWord(word)) {
                    const decoration = Decoration.inline(
                      pos + start, 
                      pos + end, 
                      {
                        class: 'spell-error',
                        'data-word': word
                      }
                    );
                    decorations.push(decoration);
                  }
                });
              }
            });
            
            return DecorationSet.create(doc, decorations);
          }
        },
        
        props: {
          decorations: (state) => {
            const pluginKey = new PluginKey('spellCheck');
            const pluginState = pluginKey.getState(state);
            return pluginState || DecorationSet.empty;
          },
          
          handleDOMEvents: {
            contextmenu: (view, event) => {
              const target = event.target as HTMLElement;
              if (target.classList.contains('spell-error')) {
                event.preventDefault();
                showSpellCheckMenu(view, target, event);
                return true;
              }
              return false;
            }
          }
        }
      })
    ];
  },

});

// 提取文本中的单词
function extractWords(text: string): Array<{ word: string; start: number; end: number }> {
    const words: Array<{ word: string; start: number; end: number }> = [];
    
    // 匹配中英文单词
    const wordRegex = /[\u4e00-\u9fff]+|[a-zA-Z]+/g;
    let match;
    
    while ((match = wordRegex.exec(text)) !== null) {
      words.push({
        word: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    return words;
}

// 显示拼写检查菜单
function showSpellCheckMenu(view: any, target: HTMLElement, event: MouseEvent): void {
    const word = target.getAttribute('data-word');
    if (!word) return;
    
    const suggestions = spellChecker.getSuggestions(word);
    
    // 创建上下文菜单
    const menu = document.createElement('div');
    menu.className = 'spell-check-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${event.clientX}px;
      top: ${event.clientY}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      min-width: 150px;
      max-width: 250px;
    `;

    // 添加建议
    suggestions.forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'spell-check-menu-item';
      item.textContent = suggestion;
      item.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid #f0f0f0;
        font-weight: 500;
      `;
      
      item.addEventListener('click', () => {
        replaceWord(view, target, suggestion);
        document.body.removeChild(menu);
      });
      
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f0f8ff';
      });
      
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
      });
      
      menu.appendChild(item);
    });

    // 添加分隔线
    if (suggestions.length > 0) {
      const separator = document.createElement('div');
      separator.style.cssText = 'height: 1px; background: #e0e0e0; margin: 4px 0;';
      menu.appendChild(separator);
    }

    // 添加到词典
    const addToDictItem = document.createElement('div');
    addToDictItem.className = 'spell-check-menu-item';
    addToDictItem.textContent = `添加 "${word}" 到词典`;
    addToDictItem.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      color: #007acc;
      font-size: 13px;
    `;
    
    addToDictItem.addEventListener('click', () => {
      spellChecker.addToCustomDictionary(word);
      document.body.removeChild(menu);
      // 刷新拼写检查
      view.dispatch(view.state.tr.setMeta('spellCheck', 'refresh'));
    });
    
    menu.appendChild(addToDictItem);

    // 忽略此单词
    const ignoreItem = document.createElement('div');
    ignoreItem.className = 'spell-check-menu-item';
    ignoreItem.textContent = `忽略 "${word}"`;
    ignoreItem.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      color: #666;
      font-size: 13px;
    `;
    
    ignoreItem.addEventListener('click', () => {
      // 临时添加到会话词典
      spellChecker.addToCustomDictionary(word);
      document.body.removeChild(menu);
      // 刷新拼写检查
      view.dispatch(view.state.tr.setMeta('spellCheck', 'refresh'));
    });
    
    menu.appendChild(ignoreItem);

    // 添加到页面
    document.body.appendChild(menu);

    // 点击其他地方关闭菜单
    const closeMenu = (e: Event) => {
      if (!menu.contains(e.target as Node)) {
        if (menu.parentNode) {
          menu.parentNode.removeChild(menu);
        }
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
}

// 替换单词
function replaceWord(view: any, target: HTMLElement, newWord: string): void {
    const pos = view.posAtDOM(target, 0);
    const word = target.getAttribute('data-word');
    if (!word) return;
    
    const tr = view.state.tr;
    tr.replaceWith(pos, pos + word.length, view.state.schema.text(newWord));
    view.dispatch(tr);
}

// 初始化拼写检查
export function initSpellCheck(): void {
  // 从本地存储加载设置
  const enabled = localStorage.getItem('just-md-spell-check-enabled');
  if (enabled !== null) {
    spellChecker.setEnabled(enabled === 'true');
  }
  
  const language = localStorage.getItem('just-md-spell-check-language');
  if (language) {
    spellChecker.setLanguage(language);
  }
}