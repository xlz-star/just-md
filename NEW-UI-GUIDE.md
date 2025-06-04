# Just MD 新UI设计指南

## 设计理念

新的UI设计融合了现代Markdown编辑器的最佳实践：
- **Typora** 的极简美学和无缝编辑体验
- **Obsidian** 的强大功能和灵活布局
- **Notion** 的现代化交互设计

## 主要特性

### 1. 精简的标题栏
- 移除传统菜单栏，采用图标按钮设计
- 文档标题居中显示，一目了然
- 常用功能（新建、打开、保存、搜索、设置）直接可达

### 2. 智能侧边栏
- **文件树视图**：浏览和管理文件
- **大纲视图**：快速导航文档结构
- 支持收起/展开，节省编辑空间
- 可调整宽度，适应不同需求

### 3. 标签页系统
- 支持同时编辑多个文件
- 未保存文件有明显标记（•）
- 中键点击快速关闭标签
- 平滑的切换动画

### 4. 浮动格式工具栏
- 选中文本时自动出现
- 快速应用常用格式（粗体、斜体、标题、链接等）
- 不干扰正常编辑流程

### 5. 快速命令面板
- **Ctrl+Shift+P** 打开命令面板
- 快速访问所有功能
- 模糊搜索，支持拼音
- 显示快捷键提示

### 6. 底部状态栏
- 实时显示光标位置（行/列）
- 字数和字符统计
- 文件保存状态
- 编码信息

### 7. 浮动操作按钮（FAB）
- 右下角的快速操作入口
- 点击展开常用插入选项
- 优雅的动画效果

## 快捷键

### 文件操作
- `Ctrl+N` - 新建文件
- `Ctrl+O` - 打开文件
- `Ctrl+S` - 保存文件
- `Ctrl+Shift+S` - 另存为

### 编辑操作
- `Ctrl+F` - 查找
- `Ctrl+H` - 替换
- `Ctrl+/` - 编辑源码
- `Alt+Click` - 编辑元素源码

### 格式化
- `Ctrl+B` - 粗体
- `Ctrl+I` - 斜体
- `Ctrl+1/2/3` - 标题级别
- `Ctrl+K` - 插入链接

### 视图控制
- `Ctrl+\` - 分屏视图
- `Ctrl+,` - 打开设置
- `Ctrl+Shift+P` - 命令面板

## 如何应用新UI

1. 运行应用脚本：
   ```bash
   ./apply-new-ui.sh
   ```

2. 或手动操作：
   ```bash
   # 备份原文件
   cp index.html index-backup.html
   cp src/styles.css src/styles-backup.css
   cp src/main.ts src/main-backup.ts
   
   # 应用新文件
   mv index-new.html index.html
   mv src/styles-new.css src/styles.css
   mv src/main-new.ts src/main.ts
   ```

3. 重新启动开发服务器：
   ```bash
   bun run dev
   ```

## 恢复原UI

如果需要恢复原来的UI：
```bash
mv index-backup.html index.html
mv src/styles-backup.css src/styles.css
mv src/main-backup.ts src/main.ts
```

## 自定义主题

新UI支持CSS变量，可以轻松自定义主题：

```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #1f2328;
  --accent-primary: #0969da;
  /* 更多变量见 styles-new.css */
}
```

## 反馈与建议

新UI设计旨在提供更好的编辑体验。如有任何问题或建议，欢迎反馈！