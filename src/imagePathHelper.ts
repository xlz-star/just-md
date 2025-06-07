import { convertFileSrc } from '@tauri-apps/api/core';

// 存储图片路径映射：Tauri URL -> 文件系统路径
const imagePathMap = new Map<string, string>();

/**
 * 将文件系统路径转换为 Tauri URL，并记录映射关系
 */
export function convertToTauriUrl(absolutePath: string): string {
  const tauriUrl = convertFileSrc(absolutePath);
  // 记录映射关系，用于保存时转换回相对路径
  imagePathMap.set(tauriUrl, absolutePath);
  return tauriUrl;
}

/**
 * 获取图片的文件系统路径
 */
export function getFileSystemPath(tauriUrl: string): string | undefined {
  return imagePathMap.get(tauriUrl);
}

/**
 * 将绝对路径转换为相对路径（相对于文档）
 */
export function convertToRelativePath(absolutePath: string, documentPath?: string): string {
  if (!documentPath) {
    // 如果没有文档路径，返回文件名
    const parts = absolutePath.split(/[/\\]/);
    const filename = parts[parts.length - 1];
    return `./images/${filename}`;
  }

  // 获取文档目录
  const lastSlash = documentPath.lastIndexOf('/');
  const lastBackslash = documentPath.lastIndexOf('\\');
  const separatorIndex = Math.max(lastSlash, lastBackslash);
  
  if (separatorIndex === -1) {
    // 文档在根目录
    const parts = absolutePath.split(/[/\\]/);
    const filename = parts[parts.length - 1];
    return `./images/${filename}`;
  }

  const docDir = documentPath.substring(0, separatorIndex);
  
  // 如果图片路径包含文档目录，计算相对路径
  if (absolutePath.startsWith(docDir)) {
    let relativePath = absolutePath.substring(docDir.length);
    // 移除开头的斜杠
    if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
      relativePath = relativePath.substring(1);
    }
    return './' + relativePath.replace(/\\/g, '/');
  }

  // 否则返回基于文件名的相对路径
  const parts = absolutePath.split(/[/\\]/);
  const filename = parts[parts.length - 1];
  return `./images/${filename}`;
}

/**
 * 清理不再使用的映射
 */
export function cleanupImageMap(usedUrls: Set<string>): void {
  const keysToDelete: string[] = [];
  
  imagePathMap.forEach((_, key) => {
    if (!usedUrls.has(key)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => imagePathMap.delete(key));
}

/**
 * 处理 HTML 中的图片路径，将相对路径转换为 Tauri URL
 */
export function processHtmlImagePaths(html: string, documentPath: string): string {
  // 正则表达式匹配 img 标签
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  
  return html.replace(imgRegex, (match, src) => {
    // 如果已经是 Tauri URL 或 HTTP URL，不处理
    if (src.startsWith('asset://') || src.startsWith('http://') || src.startsWith('https://')) {
      return match;
    }
    
    // 构建绝对路径
    let absolutePath: string;
    
    if (src.startsWith('./') || src.startsWith('../')) {
      // 相对路径
      const lastSlash = documentPath.lastIndexOf('/');
      const lastBackslash = documentPath.lastIndexOf('\\');
      const separatorIndex = Math.max(lastSlash, lastBackslash);
      
      if (separatorIndex !== -1) {
        const docDir = documentPath.substring(0, separatorIndex);
        
        // 处理相对路径
        if (src.startsWith('./')) {
          absolutePath = docDir + '/' + src.substring(2);
        } else {
          // 处理 ../ 路径
          let relativePath = src;
          let currentDir = docDir;
          
          while (relativePath.startsWith('../')) {
            relativePath = relativePath.substring(3);
            const parentSlash = currentDir.lastIndexOf('/');
            const parentBackslash = currentDir.lastIndexOf('\\');
            const parentIndex = Math.max(parentSlash, parentBackslash);
            
            if (parentIndex !== -1) {
              currentDir = currentDir.substring(0, parentIndex);
            }
          }
          
          absolutePath = currentDir + '/' + relativePath;
        }
      } else {
        // 文档在根目录
        absolutePath = src.startsWith('./') ? src.substring(2) : src;
      }
    } else if (src.startsWith('/')) {
      // 绝对路径
      absolutePath = src;
    } else {
      // 假设是相对路径
      const lastSlash = documentPath.lastIndexOf('/');
      const lastBackslash = documentPath.lastIndexOf('\\');
      const separatorIndex = Math.max(lastSlash, lastBackslash);
      
      if (separatorIndex !== -1) {
        const docDir = documentPath.substring(0, separatorIndex);
        absolutePath = docDir + '/' + src;
      } else {
        absolutePath = src;
      }
    }
    
    // 标准化路径分隔符
    absolutePath = absolutePath.replace(/\\/g, '/');
    
    // 转换为 Tauri URL
    const tauriUrl = convertToTauriUrl(absolutePath);
    
    // 替换 src 属性
    return match.replace(src, tauriUrl);
  });
}