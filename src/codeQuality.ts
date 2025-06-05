// 代码质量和最佳实践工具

// 错误边界接口
interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

// 全局错误处理器
export class ErrorHandler {
  private errorQueue: Array<{ error: Error; info?: ErrorInfo; timestamp: Date }> = [];
  private maxErrors = 50;

  // 注册全局错误处理
  init(): void {
    // 捕获未处理的错误
    window.addEventListener('error', (event) => {
      this.logError(event.error, {
        componentStack: event.filename + ':' + event.lineno
      });
    });

    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
        componentStack: 'Promise rejection'
      });
    });

    // 定期清理错误队列
    setInterval(() => this.cleanupErrors(), 60000);
  }

  // 记录错误
  logError(error: Error, info?: ErrorInfo): void {
    const errorEntry = {
      error,
      info,
      timestamp: new Date()
    };

    this.errorQueue.push(errorEntry);

    // 限制错误队列大小
    if (this.errorQueue.length > this.maxErrors) {
      this.errorQueue.shift();
    }

    // 在开发环境下输出详细错误信息
    if (process.env.NODE_ENV === 'development') {
      console.group('🔴 Error Details');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      if (info) {
        console.error('Component Stack:', info.componentStack);
      }
      console.error('Timestamp:', errorEntry.timestamp);
      console.groupEnd();
    }

    // 在生产环境下可以发送到错误监控服务
    if (process.env.NODE_ENV === 'production') {
      this.reportError(errorEntry);
    }
  }

  // 上报错误到监控服务
  private reportError(errorEntry: any): void {
    // 这里可以集成第三方错误监控服务
    // 例如 Sentry, LogRocket 等
    console.warn('Error reported:', errorEntry);
  }

  // 清理过期错误
  private cleanupErrors(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.errorQueue = this.errorQueue.filter(entry => entry.timestamp > oneHourAgo);
  }

  // 获取错误报告
  getErrorReport(): string {
    if (this.errorQueue.length === 0) {
      return '✅ No errors reported';
    }

    return `
# 错误报告

**总错误数**: ${this.errorQueue.length}
**最近错误时间**: ${this.errorQueue[this.errorQueue.length - 1]?.timestamp.toLocaleString()}

## 错误详情

${this.errorQueue.slice(-10).map((entry, index) => `
### 错误 ${index + 1}
- **时间**: ${entry.timestamp.toLocaleString()}
- **消息**: ${entry.error.message}
- **组件**: ${entry.info?.componentStack || 'Unknown'}
- **堆栈**: 
\`\`\`
${entry.error.stack || 'No stack trace'}
\`\`\`
`).join('\n')}
    `.trim();
  }
}

// 代码规范检查器
export class CodeQualityChecker {
  // 检查函数复杂度
  static checkFunctionComplexity(functionCode: string): {
    complexity: number;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let complexity = 1; // 基础复杂度

    // 检查控制结构
    const controlStructures = [
      /if\s*\(/g,
      /else\s+if\s*\(/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /switch\s*\(/g,
      /case\s+/g,
      /catch\s*\(/g,
      /&&|\|\|/g
    ];

    controlStructures.forEach((pattern) => {
      const matches = functionCode.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    // 生成警告
    if (complexity > 10) {
      warnings.push('函数复杂度过高，建议重构');
    }

    if (functionCode.length > 1000) {
      warnings.push('函数过长，建议拆分');
    }

    if (functionCode.split('\n').length > 50) {
      warnings.push('函数行数过多，建议拆分');
    }

    return { complexity, warnings };
  }

  // 检查命名规范
  static checkNamingConventions(code: string): string[] {
    const issues: string[] = [];

    // 检查变量命名
    const variablePattern = /(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let match;
    
    while ((match = variablePattern.exec(code)) !== null) {
      const variableName = match[1];
      
      if (!/^[a-z][a-zA-Z0-9]*$/.test(variableName) && variableName !== '_') {
        issues.push(`变量名 "${variableName}" 不符合驼峰命名规范`);
      }
      
      if (variableName.length < 3 && !['i', 'j', 'k', 'x', 'y', 'z'].includes(variableName)) {
        issues.push(`变量名 "${variableName}" 过短，建议使用更描述性的名称`);
      }
    }

    // 检查函数命名
    const functionPattern = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    
    while ((match = functionPattern.exec(code)) !== null) {
      const functionName = match[1];
      
      if (!/^[a-z][a-zA-Z0-9]*$/.test(functionName)) {
        issues.push(`函数名 "${functionName}" 不符合驼峰命名规范`);
      }
    }

    return issues;
  }

  // 检查性能反模式
  static checkPerformanceAntiPatterns(code: string): string[] {
    const issues: string[] = [];

    // 检查同步的localStorage使用
    if (code.includes('localStorage.getItem') || code.includes('localStorage.setItem')) {
      issues.push('发现同步localStorage使用，建议使用异步方式或缓存');
    }

    // 检查频繁的DOM查询
    const domQueryPattern = /document\.(getElementById|querySelector|querySelectorAll|getElementsBy)/g;
    const domQueries = code.match(domQueryPattern);
    if (domQueries && domQueries.length > 5) {
      issues.push('频繁的DOM查询，建议缓存DOM元素');
    }

    // 检查在循环中的DOM操作
    const loopDOMPattern = /(for|while)[\s\S]*?(appendChild|insertBefore|removeChild)/g;
    if (loopDOMPattern.test(code)) {
      issues.push('在循环中进行DOM操作，建议使用DocumentFragment或批量操作');
    }

    // 检查未优化的事件监听器
    if (code.includes('addEventListener') && !code.includes('removeEventListener')) {
      issues.push('添加了事件监听器但未清理，可能导致内存泄漏');
    }

    return issues;
  }
}

// 代码格式化器
export class CodeFormatter {
  // 格式化JavaScript代码
  static formatJS(code: string): string {
    // 简单的代码格式化（实际项目中建议使用Prettier）
    return code
      .replace(/;\s*\n/g, ';\n')
      .replace(/{\s*\n/g, '{\n  ')
      .replace(/}\s*\n/g, '}\n')
      .replace(/,\s*\n/g, ',\n  ');
  }

  // 格式化CSS代码
  static formatCSS(code: string): string {
    return code
      .replace(/{\s*/g, ' {\n  ')
      .replace(/;\s*/g, ';\n  ')
      .replace(/}\s*/g, '\n}\n');
  }

  // 格式化Markdown代码
  static formatMarkdown(code: string): string {
    return code
      .replace(/\n{3,}/g, '\n\n') // 移除多余的空行
      .replace(/^\s+/gm, '') // 移除行首空格
      .replace(/\s+$/gm, ''); // 移除行尾空格
  }
}

// 依赖分析器
export class DependencyAnalyzer {
  // 分析模块依赖
  static analyzeDependencies(code: string): {
    imports: string[];
    exports: string[];
    circularDeps: string[];
  } {
    const imports: string[] = [];
    const exports: string[] = [];

    // 提取import语句
    const importPattern = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importPattern.exec(code)) !== null) {
      imports.push(match[1]);
    }

    // 提取export语句
    const exportPattern = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    
    while ((match = exportPattern.exec(code)) !== null) {
      exports.push(match[1]);
    }

    // 简单的循环依赖检测（实际实现会更复杂）
    const circularDeps: string[] = [];
    // 这里可以实现更复杂的循环依赖检测算法

    return { imports, exports, circularDeps };
  }

  // 计算代码耦合度
  static calculateCoupling(modules: Array<{ name: string; code: string }>): Map<string, number> {
    const coupling = new Map<string, number>();
    
    modules.forEach(module => {
      const deps = this.analyzeDependencies(module.code);
      coupling.set(module.name, deps.imports.length);
    });

    return coupling;
  }
}

// 代码审查工具
export class CodeReviewer {
  private static rules: Array<{
    name: string;
    check: (code: string) => string[];
  }> = [
    {
      name: 'console.log检查',
      check: (code) => {
        const matches = code.match(/console\.log/g);
        return matches ? ['发现console.log语句，生产环境前请移除'] : [];
      }
    },
    {
      name: 'TODO检查',
      check: (code) => {
        const matches = code.match(/\/\/\s*TODO/g);
        return matches ? [`发现${matches.length}个TODO，请及时处理`] : [];
      }
    },
    {
      name: '硬编码检查',
      check: (code) => {
        const issues: string[] = [];
        if (code.includes('localhost')) {
          issues.push('发现硬编码的localhost，建议使用配置');
        }
        if (code.match(/['"](?:admin|password|secret)['"]:/)) {
          issues.push('发现可能的硬编码凭据，建议使用环境变量');
        }
        return issues;
      }
    }
  ];

  // 执行代码审查
  static review(code: string): {
    issues: Array<{ rule: string; messages: string[] }>;
    score: number;
  } {
    const issues: Array<{ rule: string; messages: string[] }> = [];
    let totalIssues = 0;

    this.rules.forEach(rule => {
      const messages = rule.check(code);
      if (messages.length > 0) {
        issues.push({ rule: rule.name, messages });
        totalIssues += messages.length;
      }
    });

    // 计算质量分数（100分制）
    const score = Math.max(0, 100 - totalIssues * 5);

    return { issues, score };
  }

  // 生成审查报告
  static generateReport(files: Array<{ name: string; code: string }>): string {
    let totalScore = 0;
    let reportContent = '# 代码质量报告\n\n';

    files.forEach(file => {
      const review = this.review(file.code);
      const complexity = CodeQualityChecker.checkFunctionComplexity(file.code);
      const naming = CodeQualityChecker.checkNamingConventions(file.code);
      const performance = CodeQualityChecker.checkPerformanceAntiPatterns(file.code);

      totalScore += review.score;

      reportContent += `## ${file.name}\n\n`;
      reportContent += `**质量分数**: ${review.score}/100\n`;
      reportContent += `**复杂度**: ${complexity.complexity}\n\n`;

      if (review.issues.length > 0) {
        reportContent += '### 代码审查问题\n';
        review.issues.forEach(issue => {
          reportContent += `- **${issue.rule}**:\n`;
          issue.messages.forEach(msg => {
            reportContent += `  - ${msg}\n`;
          });
        });
        reportContent += '\n';
      }

      if (complexity.warnings.length > 0) {
        reportContent += '### 复杂度警告\n';
        complexity.warnings.forEach(warning => {
          reportContent += `- ${warning}\n`;
        });
        reportContent += '\n';
      }

      if (naming.length > 0) {
        reportContent += '### 命名规范问题\n';
        naming.forEach(issue => {
          reportContent += `- ${issue}\n`;
        });
        reportContent += '\n';
      }

      if (performance.length > 0) {
        reportContent += '### 性能问题\n';
        performance.forEach(issue => {
          reportContent += `- ${issue}\n`;
        });
        reportContent += '\n';
      }
    });

    const averageScore = files.length > 0 ? Math.round(totalScore / files.length) : 0;
    reportContent = `**整体质量分数**: ${averageScore}/100\n\n` + reportContent;

    return reportContent;
  }
}

// 初始化代码质量系统
export const errorHandler = new ErrorHandler();

export function initCodeQuality(): void {
  errorHandler.init();
  
  // 在开发环境下暴露质量检查工具
  if (process.env.NODE_ENV === 'development') {
    (window as any).codeQuality = {
      CodeQualityChecker,
      CodeFormatter,
      DependencyAnalyzer,
      CodeReviewer,
      errorHandler
    };
    
    // 添加快捷键生成质量报告
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
        console.log(errorHandler.getErrorReport());
      }
    });
  }

  console.log('Code quality system initialized');
}