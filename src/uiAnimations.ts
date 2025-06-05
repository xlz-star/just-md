// UI 动画和过渡效果优化

// 动画配置
const ANIMATION_CONFIG = {
  // 快速动画（按钮点击等）
  fast: {
    duration: 150,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // easeOutQuad
  },
  // 中等动画（面板切换等）
  medium: {
    duration: 250,
    easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', // easeInOutCubic
  },
  // 慢速动画（页面转换等）
  slow: {
    duration: 350,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)', // Material Design standard
  },
  // 弹性动画（确认操作等）
  bounce: {
    duration: 400,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // easeInOutBack
  }
};

// 动画工具类
export class UIAnimations {
  private static animationObserver: IntersectionObserver | null = null;

  // 初始化动画系统
  static init(): void {
    this.setupScrollAnimations();
    this.enhanceButtonAnimations();
    this.enhanceModalAnimations();
    this.enhancePanelAnimations();
    this.setupRippleEffect();
  }

  // 设置滚动动画
  private static setupScrollAnimations(): void {
    // 创建交叉观察器
    this.animationObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '20px',
      }
    );

    // 观察所有可动画元素
    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      this.animationObserver!.observe(el);
    });
  }

  // 增强按钮动画
  private static enhanceButtonAnimations(): void {
    document.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest('.btn, button, .dropdown-item, .floating-btn');
      if (button && !button.classList.contains('no-animation')) {
        this.animateClick(button as HTMLElement);
      }
    });
  }

  // 点击动画
  private static animateClick(element: HTMLElement): void {
    element.style.transform = 'scale(0.95)';
    element.style.transition = `transform ${ANIMATION_CONFIG.fast.duration}ms ${ANIMATION_CONFIG.fast.easing}`;
    
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, ANIMATION_CONFIG.fast.duration / 2);
    
    setTimeout(() => {
      element.style.transform = '';
      element.style.transition = '';
    }, ANIMATION_CONFIG.fast.duration);
  }

  // 增强模态框动画
  private static enhanceModalAnimations(): void {
    // 监听模态框显示
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (element.classList?.contains('modal') || 
                element.id?.includes('dialog') || 
                element.id?.includes('overlay')) {
              this.animateModalIn(element);
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 模态框进入动画
  private static animateModalIn(modal: HTMLElement): void {
    const dialog = modal.querySelector('[id*="dialog"]') as HTMLElement;
    
    if (modal.style.background?.includes('rgba')) {
      // 背景淡入
      modal.style.opacity = '0';
      modal.style.transition = `opacity ${ANIMATION_CONFIG.medium.duration}ms ${ANIMATION_CONFIG.medium.easing}`;
      
      requestAnimationFrame(() => {
        modal.style.opacity = '1';
      });
    }

    if (dialog) {
      // 对话框弹入
      dialog.style.transform = 'scale(0.9) translateY(-20px)';
      dialog.style.opacity = '0';
      dialog.style.transition = `
        transform ${ANIMATION_CONFIG.medium.duration}ms ${ANIMATION_CONFIG.bounce.easing},
        opacity ${ANIMATION_CONFIG.medium.duration}ms ${ANIMATION_CONFIG.medium.easing}
      `;
      
      requestAnimationFrame(() => {
        dialog.style.transform = 'scale(1) translateY(0)';
        dialog.style.opacity = '1';
      });
    }
  }

  // 增强面板动画
  private static enhancePanelAnimations(): void {
    // 大纲面板动画
    const outlinePanel = document.getElementById('outline-panel');
    if (outlinePanel) {
      this.observePanel(outlinePanel);
    }

    // 文件树面板动画
    const fileTreeContainer = document.getElementById('file-tree-container');
    if (fileTreeContainer) {
      this.observePanel(fileTreeContainer);
    }
  }

  // 观察面板变化
  private static observePanel(panel: HTMLElement): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target as HTMLElement;
          if (target.classList.contains('hidden')) {
            this.animatePanelOut(target);
          } else {
            this.animatePanelIn(target);
          }
        }
      });
    });

    observer.observe(panel, { attributes: true });
  }

  // 面板进入动画
  private static animatePanelIn(panel: HTMLElement): void {
    panel.style.transform = 'translateX(-100%)';
    panel.style.opacity = '0';
    panel.style.transition = `
      transform ${ANIMATION_CONFIG.medium.duration}ms ${ANIMATION_CONFIG.medium.easing},
      opacity ${ANIMATION_CONFIG.medium.duration}ms ${ANIMATION_CONFIG.medium.easing}
    `;
    
    requestAnimationFrame(() => {
      panel.style.transform = 'translateX(0)';
      panel.style.opacity = '1';
    });
  }

  // 面板退出动画
  private static animatePanelOut(panel: HTMLElement): void {
    panel.style.transition = `
      transform ${ANIMATION_CONFIG.fast.duration}ms ${ANIMATION_CONFIG.fast.easing},
      opacity ${ANIMATION_CONFIG.fast.duration}ms ${ANIMATION_CONFIG.fast.easing}
    `;
    panel.style.transform = 'translateX(-100%)';
    panel.style.opacity = '0';
  }

  // 设置涟漪效果
  private static setupRippleEffect(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.btn-ripple, .ripple');
      
      if (button && !button.querySelector('.ripple-effect')) {
        this.createRipple(e, button as HTMLElement);
      }
    });
  }

  // 创建涟漪效果
  private static createRipple(e: MouseEvent, element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple ${ANIMATION_CONFIG.medium.duration * 2}ms ease-out;
      pointer-events: none;
      z-index: 1;
    `;

    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);

    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, ANIMATION_CONFIG.medium.duration * 2);
  }

  // 平滑滚动到元素
  static scrollToElement(element: HTMLElement, offset = 0): void {
    const targetPosition = element.offsetTop - offset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime: number | null = null;

    function animation(currentTime: number) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / ANIMATION_CONFIG.slow.duration, 1);
      
      // 使用 easeInOutCubic 缓动
      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : (progress - 1) * (2 * progress - 2) * (2 * progress - 2) + 1;
      
      window.scrollTo(0, startPosition + distance * ease);
      
      if (timeElapsed < ANIMATION_CONFIG.slow.duration) {
        requestAnimationFrame(animation);
      }
    }

    requestAnimationFrame(animation);
  }

  // 淡入元素
  static fadeIn(element: HTMLElement, duration = ANIMATION_CONFIG.medium.duration): Promise<void> {
    return new Promise((resolve) => {
      element.style.opacity = '0';
      element.style.transition = `opacity ${duration}ms ${ANIMATION_CONFIG.medium.easing}`;
      element.style.display = 'block';
      
      requestAnimationFrame(() => {
        element.style.opacity = '1';
        setTimeout(resolve, duration);
      });
    });
  }

  // 淡出元素
  static fadeOut(element: HTMLElement, duration = ANIMATION_CONFIG.medium.duration): Promise<void> {
    return new Promise((resolve) => {
      element.style.transition = `opacity ${duration}ms ${ANIMATION_CONFIG.medium.easing}`;
      element.style.opacity = '0';
      
      setTimeout(() => {
        element.style.display = 'none';
        resolve();
      }, duration);
    });
  }

  // 滑入元素
  static slideIn(element: HTMLElement, direction: 'up' | 'down' | 'left' | 'right' = 'up'): Promise<void> {
    return new Promise((resolve) => {
      const transforms = {
        up: 'translateY(20px)',
        down: 'translateY(-20px)',
        left: 'translateX(20px)',
        right: 'translateX(-20px)'
      };

      element.style.transform = transforms[direction];
      element.style.opacity = '0';
      element.style.transition = `
        transform ${ANIMATION_CONFIG.medium.duration}ms ${ANIMATION_CONFIG.medium.easing},
        opacity ${ANIMATION_CONFIG.medium.duration}ms ${ANIMATION_CONFIG.medium.easing}
      `;
      element.style.display = 'block';
      
      requestAnimationFrame(() => {
        element.style.transform = 'translate(0, 0)';
        element.style.opacity = '1';
        
        setTimeout(() => {
          element.style.transform = '';
          element.style.transition = '';
          resolve();
        }, ANIMATION_CONFIG.medium.duration);
      });
    });
  }

  // 抖动效果（错误提示等）
  static shake(element: HTMLElement): void {
    element.style.animation = `shake ${ANIMATION_CONFIG.fast.duration * 3}ms ease-in-out`;
    
    setTimeout(() => {
      element.style.animation = '';
    }, ANIMATION_CONFIG.fast.duration * 3);
  }

  // 脉冲效果（提示用户注意）
  static pulse(element: HTMLElement, count = 3): void {
    let pulseCount = 0;
    
    function doPulse() {
      if (pulseCount >= count) return;
      
      element.style.transform = 'scale(1.05)';
      element.style.transition = `transform ${ANIMATION_CONFIG.fast.duration}ms ${ANIMATION_CONFIG.fast.easing}`;
      
      setTimeout(() => {
        element.style.transform = 'scale(1)';
        pulseCount++;
        
        if (pulseCount < count) {
          setTimeout(doPulse, ANIMATION_CONFIG.fast.duration);
        } else {
          setTimeout(() => {
            element.style.transform = '';
            element.style.transition = '';
          }, ANIMATION_CONFIG.fast.duration);
        }
      }, ANIMATION_CONFIG.fast.duration);
    }
    
    doPulse();
  }

  // 清理动画
  static cleanup(): void {
    if (this.animationObserver) {
      this.animationObserver.disconnect();
    }
  }
}