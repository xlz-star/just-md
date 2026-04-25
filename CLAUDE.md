# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

本项目统一使用 Bun。

- 安装依赖：`bun install`
- 前端开发：`bun run dev`
- Tauri 桌面开发：`bun run tauri:dev`
- 前端构建：`bun run build`
- Tauri 桌面构建：`bun run tauri:build`
- 运行测试：`bun run test`
- 非交互测试：`bun run test:run`
- 打开 Vitest UI：`bun run test:ui`
- 运行单个测试文件：`bunx vitest run test/outline.test.ts`
- 运行单个测试用例：`bunx vitest run test/outline.test.ts -t "用例名"`

仓库当前没有单独的 lint 脚本。做静态检查时优先使用：

- TypeScript 检查/前端构建校验：`bun run build`
- Rust 检查：`cargo check --manifest-path src-tauri/Cargo.toml`

## 项目结构与架构

这是一个 **Tauri 2 + TypeScript + Tiptap** 的桌面 Markdown 编辑器：前端负责富文本/源码编辑体验，Rust 后端负责真实文件系统访问、Markdown 渲染和桌面集成。

### 启动入口

- 默认 Web/Tauri 入口是 `index.html`，加载 `src/main.ts`。
- Rust 入口在 `src-tauri/src/main.rs`。

### 前端大图景

`src/main.ts` 负责组装应用。它会按顺序初始化编辑器、文件管理、菜单/快捷键、大纲、设置、自动保存、目录生成、写作统计、模板、源码模式、图片右键菜单等能力。

前端的核心分层可以这样理解：

- `src/editor.ts`：编辑器核心。封装 Tiptap 实例、扩展注册、源码模式切换、当前文档内容读写，以及编辑事件到其他 UI 功能的同步。
- `src/fileManager.ts`：文件工作流核心。负责打开/保存、标签页、拖放打开、外部文件打开事件，以及把“后端返回的 Markdown/HTML”送进编辑器。
- `src/outline.ts` + `src/tocGenerator.ts`：一个负责从编辑器状态提取/渲染文档大纲并做导航，另一个负责把目录写回文档。
- `src/filetree.ts`：文件树 UI，依赖 Rust 命令获取目录和子目录内容；和大纲面板共用一块侧边区域。
- `src/recentFiles.ts`：最近文件列表 UI，数据由 Rust 侧持久化。
- `src/settings.ts`：设置面板入口，协调主题、专注模式、打字机模式、代码折叠、自动保存、拼写检查等前端状态。
- `src/menu.ts`：菜单和快捷键绑定层，通常是用户操作流的入口。

### 编辑器模型

编辑器不是“纯文本框 + 预览面板”，而是 **Tiptap 所见即所得编辑器 + 源码模式** 的双表示：

- 打开文件时，前端会同时取回渲染后的 HTML 和原始 Markdown。
- 编辑时，大纲、字数统计、自动保存、文件 dirty 状态等能力围绕编辑器事件联动。
- 很多功能以 Tiptap extension 形式存在，例如数学公式、脚注、自动图片、SVG、拼写检查、表格工具栏、搜索等。

因此，改动编辑行为时，优先检查 `src/editor.ts` 里的扩展注册和 update/selection 回调，再看对应功能模块是否依赖这些事件。

### Tauri / Rust 后端职责

`src-tauri/src/main.rs` 主要暴露 Tauri commands 给前端调用，职责包括：

- Markdown 文件读取、保存、原始 Markdown 获取
- Markdown 到 HTML 的转换
- 文件树与目录子项读取
- 最近文件列表持久化（保存在系统配置目录）
- 启动时接收外部/命令行传入文件
- 部分图片/文件辅助能力

前端和后端的典型调用边界是：**凡是涉及真实文件系统或桌面集成，都尽量先看 Rust command，而不是只在前端猜行为。**

### 典型事件流

- 应用启动：`src/main.ts` 初始化各模块，然后监听 `file-opened` 事件，并通过 `get_initial_file` 处理系统/命令行打开的文件。
- 打开文件：`src/fileManager.ts` 调用 Rust 的 `read_markdown` / `get_raw_markdown`，处理图片路径后写入编辑器，再刷新大纲、标签和最近文件。
- 编辑内容：`src/editor.ts` 的 update/selection 事件驱动 dirty 状态更新和大纲刷新。
- 文件树切换：`src/outline.ts` 与 `src/filetree.ts` 通过动态导入互相切换，避免循环依赖。

### 测试结构

测试使用 **Vitest + jsdom**。

- 配置文件：`vitest.config.ts`
- 全局测试初始化：`test/setup.ts`
- Tauri API 在测试里通过 `test/mocks/*` 做 alias mock

这意味着大部分测试都是前端单元测试/DOM 测试，而不是跑真实 Tauri Runtime。改动文件打开、设置、大纲、文件树等前端逻辑时，优先补 Vitest 测试；如果改的是 Rust command，本仓库当前没有成体系的 Rust 测试基建，需要谨慎用 `cargo check` 和手动联调验证。

### 修改时的注意点

- 默认入口是 `src/main.ts`。
- `src/fileManager.ts`、`src/editor.ts`、`src/outline.ts`、`src/filetree.ts` 之间耦合较强，改其中一个时要连带检查文件打开、大纲刷新、侧边栏切换是否受影响。
- 测试环境里的 Tauri API 是 mock；如果代码依赖真实桌面行为，单元测试通过不代表 Tauri 运行时一定正常。
- Vite 开发端口固定在 `1420`，Tauri dev 会依赖这个端口。