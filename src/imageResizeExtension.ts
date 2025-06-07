import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface ImageResizeOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
  allowResize: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageResize: {
      setImage: (options: { src: string; alt?: string; title?: string; width?: string | number; height?: string | number }) => ReturnType;
    };
  }
}

// 创建调整大小的装饰器
function createResizeDecorations(view: any, imageElements: NodeList) {
  const decorations: Decoration[] = [];
  
  imageElements.forEach((img: any) => {
    const pos = view.posAtDOM(img, 0);
    if (pos === null) return;
    
    // 创建包装器元素
    const wrapper = document.createElement('div');
    wrapper.className = 'image-resize-wrapper';
    wrapper.style.cssText = `
      position: relative;
      display: inline-block;
      max-width: 100%;
    `;
    
    // 创建调整手柄
    const handles = ['nw', 'ne', 'sw', 'se'].map(position => {
      const handle = document.createElement('div');
      handle.className = `resize-handle resize-handle-${position}`;
      handle.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: #007acc;
        border: 1px solid white;
        border-radius: 50%;
        cursor: ${position === 'nw' || position === 'se' ? 'nw-resize' : 'ne-resize'};
        z-index: 10;
        opacity: 0;
        transition: opacity 0.2s;
        ${getHandlePosition(position)}
      `;
      
      // 添加拖拽事件
      addResizeHandler(handle, img, position, view);
      
      return handle;
    });
    
    // 鼠标悬停显示手柄
    wrapper.addEventListener('mouseenter', () => {
      handles.forEach(handle => handle.style.opacity = '1');
    });
    
    wrapper.addEventListener('mouseleave', () => {
      handles.forEach(handle => handle.style.opacity = '0');
    });
    
    // 包装图片
    if (img.parentNode && !img.closest('.image-resize-wrapper')) {
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);
      handles.forEach(handle => wrapper.appendChild(handle));
    }
  });
  
  return decorations;
}

// 获取手柄位置样式
function getHandlePosition(position: string): string {
  switch (position) {
    case 'nw': return 'top: -4px; left: -4px;';
    case 'ne': return 'top: -4px; right: -4px;';
    case 'sw': return 'bottom: -4px; left: -4px;';
    case 'se': return 'bottom: -4px; right: -4px;';
    default: return '';
  }
}

// 添加调整大小的处理器
function addResizeHandler(handle: HTMLElement, img: HTMLImageElement, position: string, view: any) {
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  let startHeight = 0;
  let aspectRatio = 1;
  
  handle.addEventListener('mousedown', (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    isResizing = true;
    startX = e.clientX;
    startWidth = img.offsetWidth;
    startHeight = img.offsetHeight;
    aspectRatio = startWidth / startHeight;
    
    // 添加全局鼠标事件
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // 防止拖拽图片
    img.style.pointerEvents = 'none';
    document.body.style.userSelect = 'none';
  });
  
  function onMouseMove(e: MouseEvent) {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    
    let newWidth = startWidth;
    let newHeight = startHeight;
    
    // 根据手柄位置计算新尺寸
    switch (position) {
      case 'se':
        newWidth = startWidth + deltaX;
        break;
      case 'sw':
        newWidth = startWidth - deltaX;
        break;
      case 'ne':
        newWidth = startWidth + deltaX;
        break;
      case 'nw':
        newWidth = startWidth - deltaX;
        break;
    }
    
    // 保持宽高比
    if (e.shiftKey) {
      newHeight = newWidth / aspectRatio;
    } else {
      // 如果不按Shift，也保持比例（更自然的体验）
      newHeight = newWidth / aspectRatio;
    }
    
    // 设置最小尺寸
    const minSize = 50;
    if (newWidth < minSize) {
      newWidth = minSize;
      newHeight = minSize / aspectRatio;
    }
    
    // 设置最大尺寸（编辑器宽度）
    const editorWidth = view.dom.offsetWidth - 40; // 留一些边距
    if (newWidth > editorWidth) {
      newWidth = editorWidth;
      newHeight = newWidth / aspectRatio;
    }
    
    // 应用新尺寸
    img.style.width = `${newWidth}px`;
    img.style.height = `${newHeight}px`;
  }
  
  function onMouseUp() {
    if (!isResizing) return;
    
    isResizing = false;
    
    // 移除全局事件
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    // 恢复样式
    img.style.pointerEvents = '';
    document.body.style.userSelect = '';
    
    // 更新编辑器内容
    updateImageInEditor(img, view);
  }
}

// 更新编辑器中的图片属性
function updateImageInEditor(img: HTMLImageElement, view: any) {
  const pos = view.posAtDOM(img, 0);
  if (pos === null) return;
  
  const node = view.state.doc.nodeAt(pos);
  if (!node || node.type.name !== 'image') return;
  
  const tr = view.state.tr;
  const newAttrs = {
    ...node.attrs,
    width: `${img.offsetWidth}px`,
    height: `${img.offsetHeight}px`,
  };
  
  tr.setNodeMarkup(pos, null, newAttrs);
  view.dispatch(tr);
}

// 创建插件
const resizePlugin = new Plugin({
  key: new PluginKey('imageResize'),
  
  state: {
    init: () => DecorationSet.empty,
    apply: (tr, decorationSet) => {
      return decorationSet.map(tr.mapping, tr.doc);
    },
  },
  
  view: () => ({
    update: (view) => {
      // 查找所有图片元素并添加调整功能
      setTimeout(() => {
        const images = view.dom.querySelectorAll('img.markdown-image');
        createResizeDecorations(view, images);
      }, 0);
    },
  }),
});

// 图片调整大小扩展
export const ImageResize = Node.create<ImageResizeOptions>({
  name: 'imageResize',
  
  addOptions() {
    return {
      inline: false,
      allowBase64: true,
      HTMLAttributes: {},
      allowResize: true,
    };
  },
  
  inline() {
    return this.options.inline;
  },
  
  group() {
    return this.options.inline ? 'inline' : 'block';
  },
  
  draggable: true,
  
  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'img[src]:not([src^="data:image/svg+xml"])',
        getAttrs: element => ({
          src: (element as HTMLElement).getAttribute('src'),
          alt: (element as HTMLElement).getAttribute('alt'),
          title: (element as HTMLElement).getAttribute('title'),
          width: (element as HTMLElement).getAttribute('width'),
          height: (element as HTMLElement).getAttribute('height'),
        }),
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    // Add retry logic for image loading
    const imgAttrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
    
    // Add data attributes for retry logic
    imgAttrs['data-retry-count'] = '0';
    imgAttrs['data-max-retries'] = '3';
    imgAttrs['data-original-src'] = imgAttrs.src;
    
    return ['img', imgAttrs];
  },
  
  addCommands() {
    return {
      setImage: options => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
  
  addInputRules() {
    return [
      nodeInputRule({
        find: /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/,
        type: this.type,
        getAttributes: match => {
          const [, alt, src, title] = match;
          return { src, alt, title };
        },
      }),
    ];
  },
  
  addProseMirrorPlugins() {
    return this.options.allowResize ? [resizePlugin] : [];
  },
});

export default ImageResize;