# 图片无限重试问题修复方案

## 问题根源

图片无限重试的根本原因是：**每次保存图片时都会生成一个新的随机文件名**。

### 原始代码问题

在 `src-tauri/src/main.rs` 的 `save_image_from_base64` 函数中：

```rust
// 原始代码 - 使用时间戳生成唯一文件名
let timestamp = Local::now().format("%Y%m%d_%H%M%S_%3f");
let filename = format!("image_{}.{}", timestamp, extension);
```

这导致：
1. 同一张图片每次粘贴都会生成不同的文件名（如 `image_20250106_142530_123.png`）
2. 前端的全局重试管理器无法识别这是同一张图片
3. 每个图片实例都被当作新的URL处理，重试计数无法共享
4. 结果是同一张图片的多个实例同时进行重试，造成无限循环

## 解决方案

### 方案一：基于内容哈希的文件名（已实施）

修改后的代码使用图片内容的SHA256哈希值作为文件名：

```rust
// 使用图片内容的哈希值生成文件名
let mut hasher = Sha256::new();
hasher.update(&image_data);
let hash = hasher.finalize();
let hash_str = format!("{:x}", hash);
let filename = format!("image_{}.{}", &hash_str[0..16], extension);

// 如果文件已存在，直接返回路径（避免重复保存）
if file_path.exists() {
    return Ok(format!("./images/{}", filename));
}
```

**优点：**
- 相同的图片内容总是得到相同的文件名
- 避免重复保存相同的图片
- 前端重试机制可以正确工作
- 节省磁盘空间

**实施步骤：**
1. 添加 `sha2` 依赖到 `Cargo.toml`
2. 修改 `save_image_from_base64` 函数使用哈希值
3. 添加文件存在性检查，避免重复保存

### 方案二：前端映射管理（备选）

如果不想修改后端，可以在前端维护原始图片和生成路径的映射：

```typescript
// 维护原始图片数据到生成路径的映射
const imagePathMap = new Map<string, string>();

// 在粘贴图片时记录映射
async function handlePastedImage(file: File, editor: Editor) {
  const base64Data = await readAsDataURL(file);
  const hash = await calculateHash(base64Data);
  
  // 检查是否已经有映射
  if (imagePathMap.has(hash)) {
    const existingPath = imagePathMap.get(hash);
    editor.chain().focus().setImage({ src: existingPath }).run();
    return;
  }
  
  // 保存新图片
  const imagePath = await invoke('save_image_from_base64', { base64Data });
  imagePathMap.set(hash, imagePath);
  editor.chain().focus().setImage({ src: imagePath }).run();
}
```

## 测试验证

修复后，应该验证以下场景：

1. **重复粘贴同一张图片**
   - 应该得到相同的文件路径
   - 不应该创建新文件
   - 重试机制应该共享状态

2. **图片加载失败时的重试**
   - 应该最多重试3次
   - 所有相同URL的图片应该共享重试计数
   - 不应该出现无限循环

3. **性能影响**
   - 计算哈希值的性能开销很小
   - 避免了重复保存的IO开销
   - 整体性能应该有所提升

## 相关文件

- `src-tauri/src/main.rs` - 后端图片保存逻辑
- `src/imageHandler.ts` - 前端图片处理逻辑
- `src/editor.ts` - 图片重试机制实现
- `src-tauri/Cargo.toml` - 添加 sha2 依赖

## 注意事项

1. 确保更新 Cargo.lock 文件：`cd src-tauri && cargo update`
2. 重新编译 Tauri 应用：`npm run tauri:build`
3. 清理旧的重复图片文件（可选）

---

*修复日期：2025-01-06*