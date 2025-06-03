# Just MD - 类Typora的现代Markdown编辑器

<div align="center">
  <img src="https://raw.githubusercontent.com/remixicon/remixicon/master/icons/Document/markdown-line.svg" width="120" height="120" alt="Just MD Logo">
  
  <h3>🎉 v1.0.0 正式发布！</h3>
  <p>一个轻量级、高性能的Markdown编辑器，提供类似Typora的编辑体验</p>
</div>

## ✨ 核心特性

### 📝 类Typora编辑体验
- **所见即所得编辑** - 实时渲染Markdown，无需分屏预览
- **源代码模式** - 随时切换到纯文本编辑模式，完全掌控文档
- **智能交互** - 点击图片、链接查看源代码，Alt+点击代码块查看原始内容

### 🎨 丰富的编辑功能
- **代码高亮** - 支持20+编程语言的语法高亮
- **表格编辑** - 可视化表格编辑，支持调整列宽
- **图片渲染** - 本地/网络图片即时预览
- **智能链接** - 自动识别和美化链接

### 🚀 高效的工作流
- **文档大纲** - 自动生成文档结构，快速导航
- **文件树浏览** - 项目级文档管理，轻松切换
- **多文件标签** - 同时编辑多个文档，高效工作
- **自动保存** - 防止意外丢失，安心创作

### 🌙 贴心的用户体验
- **夜间模式** - 精心设计的暗色主题，保护视力
- **响应式布局** - 自适应窗口大小，任意调整
- **快捷键支持** - 常用操作触手可及
- **拖放打开** - 直接拖放.md文件即可编辑

## 🖥️ 快速开始

### 安装使用

1. 从[发布页面](https://github.com/yourusername/just-md/releases)下载最新版本
2. 安装并启动应用
3. 开始您的Markdown创作之旅！

### 常用快捷键

| 功能 | 快捷键 |
|------|--------|
| 打开文件 | `Ctrl/Cmd + O` |
| 保存文件 | `Ctrl/Cmd + S` |
| 打开文件夹 | `Ctrl/Cmd + K` |
| 撤销 | `Ctrl/Cmd + Z` |
| 重做 | `Ctrl/Cmd + Y` |
| 插入表格 | `Ctrl/Cmd + T` |
| 源代码模式 | 点击右下角按钮 |

## 🔧 技术架构

### 前端技术栈
- **框架**: TypeScript + Vite
- **编辑器**: Tiptap 2.0 (基于ProseMirror)
- **UI**: 原生CSS + 响应式设计
- **语法高亮**: Highlight.js + Lowlight

### 后端技术栈
- **框架**: Tauri 2.0
- **语言**: Rust
- **Markdown解析**: pulldown-cmark
- **文件系统**: 原生系统API

## 💡 特色功能详解

### 源代码模式切换
点击右下角的源代码按钮，即可在富文本编辑和源代码编辑之间无缝切换。编辑器会自动保存当前内容，确保不丢失任何更改。

### 智能元素交互
- **图片**: 点击查看Markdown源代码
- **链接**: 点击查看源格式
- **代码块**: Alt+点击查看原始代码

### 表格编辑
通过菜单或快捷键插入表格，支持：
- 可视化编辑单元格内容
- 拖动调整列宽
- 添加/删除行列

### 文件关联
支持系统级文件关联，双击.md文件直接用Just MD打开。

## ⚡ 性能优势

### 对比Electron应用
- **安装包**: 小10倍以上 (~10MB vs ~100MB)
- **内存占用**: 少80%以上 (~50MB vs ~300MB)
- **启动速度**: 快5倍以上 (<1s vs ~5s)
- **CPU使用**: 原生性能，极低占用

### 大文件处理
- 优化的渲染算法
- 虚拟滚动支持
- 增量更新机制

## 🛡️ 安全特性

- 沙箱化的文件访问
- 最小权限原则
- 无网络追踪
- 本地数据存储

## 🌈 开发指南

### 环境要求
- Rust 1.70+
- Node.js 18+
- Bun 1.0+ (推荐)

### 本地开发
```bash
# 克隆仓库
git clone https://github.com/yourusername/just-md.git
cd just-md

# 安装依赖
bun install

# 开发模式
bun run tauri:dev

# 构建应用
bun run tauri:build
```

## 🚧 路线图

### v1.1 计划
- [ ] 实时预览面板
- [ ] 数学公式支持
- [ ] Mermaid图表
- [ ] 自定义CSS主题

### v1.2 计划
- [ ] 插件系统
- [ ] 云同步
- [ ] 导出PDF/HTML
- [ ] 模板功能

### 长期目标
- [ ] 协作编辑
- [ ] 版本控制集成
- [ ] AI写作助手
- [ ] 移动端支持

## 🤝 贡献指南

欢迎提交Issue和Pull Request！请确保：
- 遵循现有代码风格
- 添加必要的测试
- 更新相关文档

## 📄 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

特别感谢以下开源项目：
- [Tauri](https://tauri.app/) - 构建轻量级桌面应用
- [Tiptap](https://tiptap.dev/) - 模块化富文本编辑器
- [pulldown-cmark](https://github.com/raphlinus/pulldown-cmark) - 高性能Markdown解析器

---

<div align="center">
  <p>如果觉得 Just MD 对您有帮助，请给个 ⭐ Star 支持一下！</p>
  <p>Made with ❤️ by <a href="https://github.com/yourusername">Your Name</a></p>
</div>