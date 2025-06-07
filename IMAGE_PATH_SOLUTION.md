# 图片路径问题完整解决方案

## 问题描述

在 Tauri 应用中，图片加载失败的根本原因：

1. **相对路径无法访问**：在 Vite 开发服务器中，`./images/xxx.png` 这样的相对路径无法访问文件系统中的图片
2. **Web 安全限制**：浏览器不允许直接访问 `file://` 协议的本地文件
3. **路径不一致**：保存时使用文件系统路径，加载时需要 Web 可访问的 URL

## 解决方案

### 1. 后端返回绝对路径

修改 `src-tauri/src/main.rs` 中的 `save_image_from_base64` 函数，返回绝对路径而不是相对路径：

```rust
// 返回绝对路径
match file_path.to_str() {
    Some(path) => Ok(path.to_string()),
    None => Err("无法获取文件路径".to_string()),
}
```

### 2. 使用 Tauri 的 convertFileSrc API

Tauri 提供了 `convertFileSrc` API，可以将文件系统路径转换为 webview 可以访问的 `asset://` 协议 URL：

```typescript
import { convertFileSrc } from '@tauri-apps/api/core';

// 将文件系统路径转换为 Tauri URL
const tauriUrl = convertFileSrc('/path/to/image.png');
// 结果: asset://localhost/path/to/image.png
```

### 3. 创建路径映射系统

为了在保存 Markdown 时能够还原为相对路径，我们创建了 `imagePathHelper.ts`：

```typescript
// 存储 Tauri URL 到文件系统路径的映射
const imagePathMap = new Map<string, string>();

// 转换并记录映射
export function convertToTauriUrl(absolutePath: string): string {
  const tauriUrl = convertFileSrc(absolutePath);
  imagePathMap.set(tauriUrl, absolutePath);
  return tauriUrl;
}
```

### 4. 处理 HTML 中的图片路径

在加载 Markdown 文件时，需要处理渲染后 HTML 中的图片路径：

```typescript
export function processHtmlImagePaths(html: string, documentPath: string): string {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  
  return html.replace(imgRegex, (match, src) => {
    // 将相对路径转换为绝对路径
    const absolutePath = resolveImagePath(src, documentPath);
    // 转换为 Tauri URL
    const tauriUrl = convertToTauriUrl(absolutePath);
    return match.replace(src, tauriUrl);
  });
}
```

## 实现细节

### 图片保存流程

1. 用户粘贴/拖拽图片
2. 读取图片为 Base64
3. 调用 Rust 后端保存图片（使用内容哈希作为文件名）
4. 后端返回绝对路径
5. 前端转换为 Tauri URL
6. 插入到编辑器

### 图片加载流程

1. 打开 Markdown 文件
2. 后端渲染 Markdown 为 HTML
3. 前端处理 HTML 中的图片路径
4. 将相对路径转换为 Tauri URL
5. 图片通过 `asset://` 协议加载

### 保存文档时的处理

当保存文档时，需要将 Tauri URL 还原为相对路径：

```typescript
// 获取所有图片的 Tauri URL
const images = editor.getHTML().match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);

// 将 Tauri URL 转换回相对路径
images.forEach(img => {
  const tauriUrl = extractSrcFromImg(img);
  const absolutePath = getFileSystemPath(tauriUrl);
  const relativePath = convertToRelativePath(absolutePath, documentPath);
  // 替换为相对路径
});
```

## 测试验证

1. **新图片粘贴**：粘贴图片应该能正常显示
2. **重复图片**：粘贴相同图片不会创建新文件
3. **打开文档**：包含图片的 Markdown 文档能正常显示图片
4. **保存文档**：保存后的 Markdown 使用相对路径，便于分享
5. **路径兼容**：支持 Windows 和 Unix 路径格式

## 注意事项

1. **开发环境 vs 生产环境**：确保在两种环境下都能正常工作
2. **路径分隔符**：处理跨平台路径分隔符差异（`/` vs `\`）
3. **性能考虑**：避免频繁的路径转换操作
4. **内存管理**：定期清理不再使用的路径映射

## 相关文件

- `src-tauri/src/main.rs` - 图片保存逻辑
- `src/imageHandler.ts` - 图片粘贴/拖拽处理
- `src/imagePathHelper.ts` - 路径转换辅助函数
- `src/fileManager.ts` - 文件加载时的路径处理
- `src/editor.ts` - 图片错误处理和重试机制

---

*更新日期：2025-01-06*