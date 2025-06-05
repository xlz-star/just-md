// 性能监控和优化模块

// 性能指标接口
interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  bundleSize: number;
  operationCounts: Map<string, number>;
  lastUpdate: Date;
}

// 性能监控器
export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private observers: Map<string, PerformanceObserver> = new Map();
  private memoryCheckInterval: number | null = null;

  constructor() {
    this.metrics = {
      loadTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      bundleSize: 0,
      operationCounts: new Map(),
      lastUpdate: new Date()
    };
    
    this.setupPerformanceObservers();
    this.startMemoryMonitoring();
  }

  // 设置性能观察器
  private setupPerformanceObservers(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      // 观察导航性能
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.loadTime = navEntry.loadEventEnd - navEntry.fetchStart;
          }
        });
      });
      
      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navObserver);
      } catch (error) {
        console.warn('Navigation performance observer not supported:', error);
      }

      // 观察资源性能
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            if (resourceEntry.name.includes('.js') || resourceEntry.name.includes('.css')) {
              this.metrics.bundleSize += resourceEntry.transferSize || 0;
            }
          }
        });
      });
      
      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', resourceObserver);
      } catch (error) {
        console.warn('Resource performance observer not supported:', error);
      }

      // 观察测量性能
      const measureObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.startsWith('render-')) {
            this.metrics.renderTime = Math.max(this.metrics.renderTime, entry.duration);
          }
        });
      });
      
      try {
        measureObserver.observe({ entryTypes: ['measure'] });
        this.observers.set('measure', measureObserver);
      } catch (error) {
        console.warn('Measure performance observer not supported:', error);
      }
    }
  }

  // 开始内存监控
  private startMemoryMonitoring(): void {
    if (typeof (performance as any).memory !== 'undefined') {
      this.memoryCheckInterval = setInterval(() => {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        this.metrics.lastUpdate = new Date();
      }, 5000) as unknown as number;
    }
  }

  // 记录操作
  public recordOperation(operation: string): void {
    const count = this.metrics.operationCounts.get(operation) || 0;
    this.metrics.operationCounts.set(operation, count + 1);
  }

  // 测量渲染时间
  public measureRender(componentName: string, renderFn: () => void): void {
    const measureName = `render-${componentName}`;
    performance.mark(`${measureName}-start`);
    
    renderFn();
    
    performance.mark(`${measureName}-end`);
    performance.measure(measureName, `${measureName}-start`, `${measureName}-end`);
  }

  // 获取性能指标
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // 生成性能报告
  public generateReport(): string {
    const metrics = this.getMetrics();
    
    return `
# 性能报告

**生成时间**: ${metrics.lastUpdate.toLocaleString('zh-CN')}

## 基础指标
- **页面加载时间**: ${metrics.loadTime.toFixed(2)}ms
- **最大渲染时间**: ${metrics.renderTime.toFixed(2)}ms
- **内存使用**: ${metrics.memoryUsage.toFixed(2)}MB
- **资源大小**: ${(metrics.bundleSize / 1024).toFixed(2)}KB

## 操作统计
${Array.from(metrics.operationCounts.entries())
  .map(([operation, count]) => `- **${operation}**: ${count}次`)
  .join('\n')}

## 建议
${this.generateRecommendations(metrics)}
    `.trim();
  }

  // 生成优化建议
  private generateRecommendations(metrics: PerformanceMetrics): string {
    const recommendations: string[] = [];
    
    if (metrics.loadTime > 3000) {
      recommendations.push('- 页面加载时间较长，建议优化资源加载');
    }
    
    if (metrics.renderTime > 100) {
      recommendations.push('- 渲染时间较长，建议优化DOM操作');
    }
    
    if (metrics.memoryUsage > 100) {
      recommendations.push('- 内存使用较高，建议检查内存泄漏');
    }
    
    if (metrics.bundleSize > 1024 * 1024) {
      recommendations.push('- 资源文件较大，建议启用代码分割');
    }
    
    return recommendations.length > 0 ? recommendations.join('\n') : '- 性能表现良好，无需优化';
  }

  // 清理资源
  public destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }
}

// 懒加载管理器
export class LazyLoadManager {
  private loadedModules: Map<string, any> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();

  // 懒加载模块
  async loadModule<T>(moduleName: string, importFn: () => Promise<T>): Promise<T> {
    // 如果已经加载，直接返回
    if (this.loadedModules.has(moduleName)) {
      return this.loadedModules.get(moduleName);
    }

    // 如果正在加载，返回已有的Promise
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }

    // 开始加载
    const loadingPromise = importFn().then(module => {
      this.loadedModules.set(moduleName, module);
      this.loadingPromises.delete(moduleName);
      return module;
    }).catch(error => {
      this.loadingPromises.delete(moduleName);
      throw error;
    });

    this.loadingPromises.set(moduleName, loadingPromise);
    return loadingPromise;
  }

  // 预加载模块
  async preloadModule<T>(moduleName: string, importFn: () => Promise<T>): Promise<void> {
    if (!this.loadedModules.has(moduleName) && !this.loadingPromises.has(moduleName)) {
      // 在空闲时间预加载
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          this.loadModule(moduleName, importFn).catch(console.warn);
        });
      } else {
        // 回退到setTimeout
        setTimeout(() => {
          this.loadModule(moduleName, importFn).catch(console.warn);
        }, 100);
      }
    }
  }

  // 清理缓存
  clearCache(): void {
    this.loadedModules.clear();
    this.loadingPromises.clear();
  }
}

// 内存管理器
export class MemoryManager {
  private cleanupTasks: Set<() => void> = new Set();
  private weakRefs: Set<any> = new Set();

  // 注册清理任务
  registerCleanup(cleanupFn: () => void): void {
    this.cleanupTasks.add(cleanupFn);
  }

  // 创建弱引用
  createWeakRef<T extends object>(obj: T): any {
    if (typeof (globalThis as any).WeakRef !== 'undefined') {
      const weakRef = new (globalThis as any).WeakRef(obj);
      this.weakRefs.add(weakRef);
      return weakRef;
    }
    return { deref: () => obj }; // 降级处理
  }

  // 执行垃圾回收
  runGC(): void {
    // 执行清理任务
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.warn('Cleanup task failed:', error);
      }
    });

    // 清理失效的弱引用
    this.weakRefs.forEach(weakRef => {
      if (!weakRef.deref()) {
        this.weakRefs.delete(weakRef);
      }
    });

    // 手动触发垃圾回收（仅在开发环境）
    if (process.env.NODE_ENV === 'development' && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }

  // 监控内存使用
  monitorMemory(): void {
    setInterval(() => {
      if (typeof (performance as any).memory !== 'undefined') {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
        
        // 如果内存使用超过80%，触发清理
        if (usedMB / limitMB > 0.8) {
          this.runGC();
        }
      }
    }, 30000); // 每30秒检查一次
  }
}

// 防抖和节流工具
export class PerformanceUtils {
  // 防抖函数
  static debounce<T extends (...args: any[]) => any>(
    func: T, 
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // 节流函数
  static throttle<T extends (...args: any[]) => any>(
    func: T, 
    wait: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, wait);
      }
    };
  }

  // 批量DOM更新
  static batchDOMUpdates(updates: (() => void)[]): void {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        updates.forEach(update => update());
      });
    } else {
      updates.forEach(update => update());
    }
  }

  // 虚拟滚动优化
  static createVirtualScroller(
    container: HTMLElement,
    items: any[],
    itemHeight: number,
    renderItem: (item: any, index: number) => HTMLElement
  ): void {
    const visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2;
    let scrollTop = 0;
    let startIndex = 0;

    const updateVisibleItems = PerformanceUtils.throttle(() => {
      scrollTop = container.scrollTop;
      startIndex = Math.floor(scrollTop / itemHeight);
      
      const endIndex = Math.min(startIndex + visibleCount, items.length);
      
      // 清空容器
      container.innerHTML = '';
      
      // 创建顶部占位符
      if (startIndex > 0) {
        const topSpacer = document.createElement('div');
        topSpacer.style.height = `${startIndex * itemHeight}px`;
        container.appendChild(topSpacer);
      }
      
      // 渲染可见项目
      for (let i = startIndex; i < endIndex; i++) {
        const itemElement = renderItem(items[i], i);
        container.appendChild(itemElement);
      }
      
      // 创建底部占位符
      if (endIndex < items.length) {
        const bottomSpacer = document.createElement('div');
        bottomSpacer.style.height = `${(items.length - endIndex) * itemHeight}px`;
        container.appendChild(bottomSpacer);
      }
    }, 16);

    container.addEventListener('scroll', updateVisibleItems);
    updateVisibleItems();
  }
}

// 缓存管理器
export class CacheManager {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
    this.startCleanupTimer();
  }

  // 设置缓存
  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    // 如果缓存已满，删除最旧的项目
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // 获取缓存
  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  // 删除缓存
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // 清空缓存
  clear(): void {
    this.cache.clear();
  }

  // 启动清理定时器
  private startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now - item.timestamp > item.ttl) {
          this.cache.delete(key);
        }
      }
    }, 60000); // 每分钟清理一次
  }
}

// 全局性能管理器实例
export const performanceMonitor = new PerformanceMonitor();
export const lazyLoadManager = new LazyLoadManager();
export const memoryManager = new MemoryManager();
export const cacheManager = new CacheManager();

// 性能优化初始化函数
export function initPerformanceOptimizations(): void {
  // 启动内存监控
  memoryManager.monitorMemory();

  // 预加载常用模块
  lazyLoadManager.preloadModule('outline', () => import('./outline'));
  lazyLoadManager.preloadModule('findReplace', () => import('./findReplace'));
  lazyLoadManager.preloadModule('wordCount', () => import('./wordCount'));

  // 注册全局错误处理
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    performanceMonitor.recordOperation('error');
  });

  // 注册未处理的Promise拒绝
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    performanceMonitor.recordOperation('unhandled-rejection');
  });

  // 页面卸载时清理资源
  window.addEventListener('beforeunload', () => {
    performanceMonitor.destroy();
    memoryManager.runGC();
    cacheManager.clear();
  });

  // 开发环境下添加性能调试工具
  if (process.env.NODE_ENV === 'development') {
    (window as any).performanceMonitor = performanceMonitor;
    (window as any).memoryManager = memoryManager;
    (window as any).cacheManager = cacheManager;
    
    // 添加快捷键查看性能报告
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        console.log(performanceMonitor.generateReport());
      }
    });
  }

  console.log('Performance optimizations initialized');
}