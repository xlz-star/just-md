import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { getEditor } from './editor';

// 模板接口
interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  thumbnail?: string;
  isBuiltIn: boolean;
  createdAt: Date;
  author?: string;
  tags: string[];
}

// 模板类别
interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// 内置模板数据
const BUILTIN_TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: '空白文档',
    description: '从头开始创建文档',
    category: 'basic',
    content: '',
    isBuiltIn: true,
    createdAt: new Date(),
    tags: ['基础']
  },
  {
    id: 'article',
    name: '文章模板',
    description: '标准文章写作模板',
    category: 'writing',
    content: `# 文章标题

## 摘要

在此处写下文章的简要摘要...

## 引言

介绍文章的背景和目的...

## 正文

### 第一部分

详细描述第一个要点...

### 第二部分

详细描述第二个要点...

## 结论

总结文章的主要观点...

## 参考资料

1. 参考资料一
2. 参考资料二
`,
    isBuiltIn: true,
    createdAt: new Date(),
    tags: ['文章', '写作']
  },
  {
    id: 'blog-post',
    name: '博客文章',
    description: '博客文章写作模板',
    category: 'writing',
    content: `# 博客标题

*发布日期: ${new Date().toLocaleDateString('zh-CN')}*

![封面图片](image-url)

## 前言

引入话题，吸引读者注意...

## 主要内容

### 要点一

详细阐述第一个要点...

### 要点二

详细阐述第二个要点...

## 实践案例

分享一个具体的案例或例子...

## 总结

- 要点总结一
- 要点总结二
- 要点总结三

## 延伸阅读

推荐相关的文章或资源...

---

*感谢阅读！如果这篇文章对你有帮助，请分享给更多人。*
`,
    isBuiltIn: true,
    createdAt: new Date(),
    tags: ['博客', '写作', '分享']
  },
  {
    id: 'meeting-notes',
    name: '会议记录',
    description: '会议记录模板',
    category: 'business',
    content: `# 会议记录

**会议主题**: [会议主题]
**日期**: ${new Date().toLocaleDateString('zh-CN')}
**时间**: [开始时间] - [结束时间]
**地点**: [会议地点/在线会议]
**主持人**: [主持人姓名]

## 参会人员

- [姓名] - [职位]
- [姓名] - [职位]
- [姓名] - [职位]

## 会议议程

1. [议程项目一]
2. [议程项目二]
3. [议程项目三]

## 讨论内容

### 议题一: [议题标题]

**讨论要点**:
- 要点一
- 要点二

**决定事项**:
- 决定一
- 决定二

### 议题二: [议题标题]

**讨论要点**:
- 要点一
- 要点二

**决定事项**:
- 决定一
- 决定二

## 行动项目

| 任务 | 负责人 | 截止日期 | 状态 |
|------|--------|----------|------|
| [任务描述] | [负责人] | [日期] | 待完成 |
| [任务描述] | [负责人] | [日期] | 待完成 |

## 下次会议

**日期**: [下次会议日期]
**议题**: [下次会议议题]
`,
    isBuiltIn: true,
    createdAt: new Date(),
    tags: ['会议', '商务', '记录']
  },
  {
    id: 'project-plan',
    name: '项目计划',
    description: '项目规划文档模板',
    category: 'business',
    content: `# 项目计划书

## 项目概述

**项目名称**: [项目名称]
**项目经理**: [项目经理姓名]
**开始日期**: [开始日期]
**预计结束日期**: [结束日期]
**项目状态**: 计划中

## 项目目标

### 主要目标
- 目标一
- 目标二
- 目标三

### 成功标准
- 标准一
- 标准二
- 标准三

## 项目范围

### 包含内容
- 功能一
- 功能二
- 功能三

### 不包含内容
- 排除项一
- 排除项二

## 项目团队

| 角色 | 姓名 | 职责 | 联系方式 |
|------|------|------|----------|
| 项目经理 | [姓名] | 整体协调管理 | [邮箱] |
| 开发负责人 | [姓名] | 技术开发 | [邮箱] |
| 设计负责人 | [姓名] | 产品设计 | [邮箱] |

## 项目里程碑

| 里程碑 | 预计完成日期 | 描述 |
|--------|--------------|------|
| 需求分析完成 | [日期] | 完成所有需求文档 |
| 设计完成 | [日期] | 完成所有设计稿 |
| 开发完成 | [日期] | 完成所有功能开发 |
| 测试完成 | [日期] | 完成所有测试工作 |
| 项目上线 | [日期] | 正式发布上线 |

## 风险评估

### 高风险
- 风险一: [描述] - [应对措施]
- 风险二: [描述] - [应对措施]

### 中等风险
- 风险一: [描述] - [应对措施]
- 风险二: [描述] - [应对措施]

## 资源需求

### 人力资源
- 开发工程师: X人
- 设计师: X人
- 测试工程师: X人

### 技术资源
- 服务器资源
- 开发工具
- 第三方服务

## 预算估算

| 项目 | 预算 | 说明 |
|------|------|------|
| 人力成本 | ¥XX,XXX | [说明] |
| 设备成本 | ¥XX,XXX | [说明] |
| 其他成本 | ¥XX,XXX | [说明] |
| **总计** | **¥XX,XXX** | |
`,
    isBuiltIn: true,
    createdAt: new Date(),
    tags: ['项目', '计划', '管理']
  },
  {
    id: 'readme',
    name: 'README文档',
    description: '开源项目README模板',
    category: 'technical',
    content: `# 项目名称

简短描述项目的用途和特点。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/user/repo/releases)

## 特性

- ✨ 特性一
- 🚀 特性二  
- 💡 特性三
- 🎯 特性四

## 快速开始

### 安装

\`\`\`bash
# 使用 npm
npm install project-name

# 使用 yarn
yarn add project-name
\`\`\`

### 基本用法

\`\`\`javascript
import { ProjectName } from 'project-name';

const instance = new ProjectName({
  option1: 'value1',
  option2: 'value2'
});

instance.method();
\`\`\`

## API 文档

### 类: ProjectName

#### 构造函数

\`\`\`typescript
new ProjectName(options: ProjectOptions)
\`\`\`

**参数:**
- \`options\` (ProjectOptions): 配置选项

#### 方法

##### method()

描述方法的用途。

\`\`\`typescript
method(): ReturnType
\`\`\`

**返回值:**
- \`ReturnType\`: 返回值描述

## 示例

### 基础示例

\`\`\`javascript
// 示例代码
const result = instance.method();
console.log(result);
\`\`\`

### 高级示例

\`\`\`javascript
// 更复杂的示例
const advanced = new ProjectName({
  advanced: true,
  config: {
    feature: 'enabled'
  }
});
\`\`\`

## 贡献指南

我们欢迎所有形式的贡献！

1. Fork 项目
2. 创建功能分支 (\`git checkout -b feature/AmazingFeature\`)
3. 提交更改 (\`git commit -m 'Add some AmazingFeature'\`)
4. 推送分支 (\`git push origin feature/AmazingFeature\`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

- 作者: [你的名字](mailto:your.email@example.com)
- 项目链接: [https://github.com/user/repo](https://github.com/user/repo)

## 致谢

- 感谢 [贡献者1](https://github.com/contributor1)
- 感谢 [贡献者2](https://github.com/contributor2)
- 特别感谢 [某个项目](https://github.com/some/project) 提供的灵感
`,
    isBuiltIn: true,
    createdAt: new Date(),
    tags: ['技术', 'README', '开源']
  },
  {
    id: 'api-doc',
    name: 'API文档',
    description: 'API接口文档模板',
    category: 'technical',
    content: `# API 文档

## 概述

本文档描述了 [API名称] 的使用方法和接口定义。

**基础URL**: \`https://api.example.com/v1\`

## 认证

所有API请求都需要在请求头中包含认证信息：

\`\`\`http
Authorization: Bearer {your-api-token}
Content-Type: application/json
\`\`\`

## 响应格式

所有API响应都遵循统一的格式：

\`\`\`json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1234567890
}
\`\`\`

## 错误处理

当请求失败时，API会返回相应的错误码和错误信息：

| 错误码 | 描述 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 认证失败 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 接口列表

### 用户管理

#### 获取用户信息

**GET** \`/users/{id}\`

获取指定用户的详细信息。

**路径参数:**
- \`id\` (string): 用户ID

**响应示例:**
\`\`\`json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "12345",
    "username": "john_doe",
    "email": "john@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
\`\`\`

#### 创建用户

**POST** \`/users\`

创建新用户。

**请求体:**
\`\`\`json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
\`\`\`

**响应示例:**
\`\`\`json
{
  "code": 201,
  "message": "用户创建成功",
  "data": {
    "id": "12345",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
\`\`\`

#### 更新用户

**PUT** \`/users/{id}\`

更新用户信息。

**路径参数:**
- \`id\` (string): 用户ID

**请求体:**
\`\`\`json
{
  "username": "string",
  "email": "string"
}
\`\`\`

#### 删除用户

**DELETE** \`/users/{id}\`

删除指定用户。

**路径参数:**
- \`id\` (string): 用户ID

### 数据管理

#### 获取数据列表

**GET** \`/data\`

获取数据列表，支持分页和筛选。

**查询参数:**
- \`page\` (int): 页码，默认为1
- \`limit\` (int): 每页数量，默认为20
- \`keyword\` (string): 搜索关键词

**响应示例:**
\`\`\`json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
\`\`\`

## SDK示例

### JavaScript

\`\`\`javascript
const api = new APIClient({
  baseURL: 'https://api.example.com/v1',
  token: 'your-api-token'
});

// 获取用户信息
const user = await api.users.get('12345');

// 创建用户
const newUser = await api.users.create({
  username: 'john_doe',
  email: 'john@example.com',
  password: 'password123'
});
\`\`\`

### Python

\`\`\`python
from api_client import APIClient

client = APIClient(
    base_url='https://api.example.com/v1',
    token='your-api-token'
)

# 获取用户信息
user = client.users.get('12345')

# 创建用户
new_user = client.users.create({
    'username': 'john_doe',
    'email': 'john@example.com',
    'password': 'password123'
})
\`\`\`

## 变更日志

### v1.1.0 (2024-01-15)
- 新增用户头像上传接口
- 优化响应速度

### v1.0.0 (2024-01-01)
- 初始版本发布
- 支持基础用户管理功能
`,
    isBuiltIn: true,
    createdAt: new Date(),
    tags: ['技术', 'API', '文档']
  },
  {
    id: 'tutorial',
    name: '教程文档',
    description: '教学指南模板',
    category: 'educational',
    content: `# 教程标题

## 简介

本教程将教你如何...

**学习目标**:
- 目标一
- 目标二
- 目标三

**预备知识**:
- 前置知识一
- 前置知识二

**所需时间**: 约30分钟

## 准备工作

### 环境要求

- 软件/工具一
- 软件/工具二
- 软件/工具三

### 安装步骤

1. 第一步操作
   \`\`\`bash
   命令示例
   \`\`\`

2. 第二步操作
   \`\`\`bash
   命令示例
   \`\`\`

## 步骤详解

### 第一步: 步骤标题

详细描述第一步要做什么...

**注意事项**:
⚠️ 特别注意的地方

**代码示例**:
\`\`\`language
// 代码示例
\`\`\`

**预期结果**:
描述执行后应该看到的结果...

### 第二步: 步骤标题

详细描述第二步要做什么...

**截图说明**:
![步骤截图](image-url)

### 第三步: 步骤标题

详细描述第三步要做什么...

## 进阶技巧

### 技巧一

描述一个实用的技巧...

### 技巧二

描述另一个技巧...

## 常见问题

### Q: 问题一？

A: 答案一...

### Q: 问题二？

A: 答案二...

## 总结

通过本教程，你已经学会了：

- ✅ 学会内容一
- ✅ 学会内容二
- ✅ 学会内容三

## 下一步

建议继续学习：

- [相关教程一](link)
- [相关教程二](link)
- [相关教程三](link)

## 参考资源

- [官方文档](link)
- [社区讨论](link)
- [视频教程](link)

---

*如果这个教程对你有帮助，请给个⭐支持一下！*
`,
    isBuiltIn: true,
    createdAt: new Date(),
    tags: ['教程', '教学', '指南']
  },
  {
    id: 'changelog',
    name: '更新日志',
    description: '版本更新记录模板',
    category: 'technical',
    content: `# 更新日志

本文档记录了项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

## [未发布]

### 新增
- 即将发布的新功能

### 变更
- 即将发布的功能改进

### 修复
- 即将修复的问题

## [1.2.0] - 2024-01-15

### 新增
- 新增用户头像上传功能
- 支持深色主题切换
- 添加快捷键支持
- 新增数据导出功能

### 变更
- 优化加载性能，提升50%速度
- 改进用户界面设计
- 更新依赖库到最新版本

### 修复
- 修复文件上传时的内存泄漏问题
- 解决移动端显示异常的问题
- 修正数据同步延迟的bug

### 移除
- 移除已废弃的旧版API接口

## [1.1.0] - 2024-01-01

### 新增
- 添加搜索功能
- 支持批量操作
- 新增数据统计面板

### 变更
- 优化数据库查询性能
- 改进错误提示信息

### 修复
- 修复登录状态异常的问题
- 解决文件下载失败的bug

## [1.0.1] - 2023-12-15

### 修复
- 修复初始安装时的配置问题
- 解决特定情况下的崩溃问题

### 安全
- 更新安全依赖库
- 修复潜在的XSS漏洞

## [1.0.0] - 2023-12-01

### 新增
- 🎉 首个正式版本发布
- 用户注册和登录功能
- 基础数据管理功能
- 响应式用户界面
- 国际化支持（中文/英文）

### 技术特性
- 采用现代化技术栈
- 支持PWA（渐进式Web应用）
- 实现离线功能
- 自动备份和恢复

---

## 版本说明

### 版本号格式

本项目使用 \`主版本号.次版本号.修订号\` 的格式：

- **主版本号**: 不兼容的API修改
- **次版本号**: 向下兼容的功能性新增
- **修订号**: 向下兼容的问题修正

### 变更类型

- **新增**: 新功能
- **变更**: 对现有功能的变更
- **废弃**: 即将移除的功能
- **移除**: 已移除的功能
- **修复**: 问题修复
- **安全**: 安全性相关的修复

### 如何贡献

如果你发现了bug或有新功能建议，请：

1. 查看 [Issues](https://github.com/user/repo/issues) 确认问题未被报告
2. 创建新的Issue描述问题
3. 如果可能，提交Pull Request

### 获取更新

- 🔄 自动更新：应用会自动检查并提示更新
- 📥 手动下载：访问 [Releases](https://github.com/user/repo/releases) 页面
- 📱 移动端：通过应用商店更新

---

*感谢所有贡献者的努力！* 🙏
`,
    isBuiltIn: true,
    createdAt: new Date(),
    tags: ['技术', '版本', '日志']
  }
];

// 模板分类定义
const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'basic',
    name: '基础模板',
    description: '常用的基础文档模板',
    icon: 'ri-file-text-line'
  },
  {
    id: 'writing',
    name: '写作模板',
    description: '文章、博客等写作模板',
    icon: 'ri-quill-pen-line'
  },
  {
    id: 'business',
    name: '商务模板',
    description: '商务文档和项目管理模板',
    icon: 'ri-briefcase-line'
  },
  {
    id: 'technical',
    name: '技术模板',
    description: '技术文档和开发相关模板',
    icon: 'ri-code-line'
  },
  {
    id: 'educational',
    name: '教育模板',
    description: '教学和培训相关模板',
    icon: 'ri-book-open-line'
  },
  {
    id: 'custom',
    name: '自定义模板',
    description: '用户创建的自定义模板',
    icon: 'ri-user-line'
  }
];

// 模板管理器
export class TemplateManager {
  private templates: Template[] = [];
  private templatePanel: HTMLElement | null = null;
  private currentCategory = 'all';

  constructor() {
    this.loadTemplates();
    this.createTemplatePanel();
    this.createTemplateButton();
  }

  // 创建模板按钮
  private createTemplateButton(): void {
    const button = document.createElement('button');
    button.id = 'template-btn';
    button.className = 'floating-btn template-btn';
    button.title = '文档模板';
    button.innerHTML = '<i class="ri-file-add-line"></i>';

    document.getElementById('app')?.appendChild(button);

    button.addEventListener('click', () => this.showTemplates());
  }

  // 创建模板面板
  private createTemplatePanel(): void {
    const panel = document.createElement('div');
    panel.id = 'template-panel';
    panel.className = 'template-panel hidden';
    panel.innerHTML = `
      <div class="template-content">
        <div class="template-header">
          <h2>文档模板</h2>
          <div class="template-header-actions">
            <button class="template-create" id="template-create" title="创建模板">
              <i class="ri-add-line"></i>
            </button>
            <button class="template-close" id="template-close">
              <i class="ri-close-line"></i>
            </button>
          </div>
        </div>
        
        <div class="template-toolbar">
          <div class="template-categories" id="template-categories">
            <button class="category-btn active" data-category="all">全部</button>
            ${TEMPLATE_CATEGORIES.map(cat => `
              <button class="category-btn" data-category="${cat.id}">
                <i class="${cat.icon}"></i>
                ${cat.name}
              </button>
            `).join('')}
          </div>
          
          <div class="template-search">
            <input type="text" id="template-search" placeholder="搜索模板..." />
            <i class="ri-search-line"></i>
          </div>
        </div>
        
        <div class="template-body">
          <div class="template-grid" id="template-grid">
            <!-- 模板列表将在这里动态生成 -->
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.templatePanel = panel;

    this.setupPanelEventListeners();
  }

  // 设置面板事件监听器
  private setupPanelEventListeners(): void {
    if (!this.templatePanel) return;

    // 关闭按钮
    const closeBtn = this.templatePanel.querySelector('#template-close');
    closeBtn?.addEventListener('click', () => this.hideTemplates());

    // 创建模板按钮
    const createBtn = this.templatePanel.querySelector('#template-create');
    createBtn?.addEventListener('click', () => this.showCreateTemplateDialog());

    // 分类按钮
    const categoryBtns = this.templatePanel.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const category = target.getAttribute('data-category') || 'all';
        this.switchCategory(category);
      });
    });

    // 搜索框
    const searchInput = this.templatePanel.querySelector('#template-search') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      const keyword = (e.target as HTMLInputElement).value;
      this.filterTemplates(keyword);
    });

    // 点击外部关闭
    this.templatePanel.addEventListener('click', (e) => {
      if (e.target === this.templatePanel) {
        this.hideTemplates();
      }
    });

    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.templatePanel && !this.templatePanel.classList.contains('hidden')) {
        this.hideTemplates();
      }
    });
  }

  // 显示模板面板
  public showTemplates(): void {
    if (!this.templatePanel) return;

    this.templatePanel.classList.remove('hidden');
    this.renderTemplates();
  }

  // 隐藏模板面板
  public hideTemplates(): void {
    if (!this.templatePanel) return;

    this.templatePanel.classList.add('hidden');
  }

  // 切换分类
  private switchCategory(category: string): void {
    this.currentCategory = category;

    // 更新按钮状态
    if (this.templatePanel) {
      const categoryBtns = this.templatePanel.querySelectorAll('.category-btn');
      categoryBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-category') === category);
      });
    }

    this.renderTemplates();
  }

  // 筛选模板
  private filterTemplates(keyword: string): void {
    const filteredTemplates = this.getFilteredTemplates().filter(template =>
      template.name.toLowerCase().includes(keyword.toLowerCase()) ||
      template.description.toLowerCase().includes(keyword.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))
    );

    this.renderTemplateGrid(filteredTemplates);
  }

  // 获取筛选后的模板
  private getFilteredTemplates(): Template[] {
    if (this.currentCategory === 'all') {
      return this.templates;
    }
    return this.templates.filter(template => template.category === this.currentCategory);
  }

  // 渲染模板列表
  private renderTemplates(): void {
    const templates = this.getFilteredTemplates();
    this.renderTemplateGrid(templates);
  }

  // 渲染模板网格
  private renderTemplateGrid(templates: Template[]): void {
    if (!this.templatePanel) return;

    const grid = this.templatePanel.querySelector('#template-grid');
    if (!grid) return;

    if (templates.length === 0) {
      grid.innerHTML = `
        <div class="no-templates">
          <i class="ri-file-text-line"></i>
          <p>暂无模板</p>
          <button class="btn-primary" onclick="templateManager.showCreateTemplateDialog()">
            创建第一个模板
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = templates.map(template => `
      <div class="template-card" data-template-id="${template.id}">
        <div class="template-card-header">
          <div class="template-icon">
            ${this.getTemplateIcon(template.category)}
          </div>
          <div class="template-actions">
            ${!template.isBuiltIn ? `
              <button class="template-action-btn" onclick="templateManager.editTemplate('${template.id}')" title="编辑">
                <i class="ri-edit-line"></i>
              </button>
              <button class="template-action-btn" onclick="templateManager.deleteTemplate('${template.id}')" title="删除">
                <i class="ri-delete-bin-line"></i>
              </button>
            ` : ''}
          </div>
        </div>
        
        <div class="template-card-body">
          <h3 class="template-name">${template.name}</h3>
          <p class="template-description">${template.description}</p>
          <div class="template-tags">
            ${template.tags.map(tag => `<span class="template-tag">${tag}</span>`).join('')}
          </div>
        </div>
        
        <div class="template-card-footer">
          <div class="template-meta">
            <span class="template-author">${template.author || '系统'}</span>
            <span class="template-date">${this.formatDate(template.createdAt)}</span>
          </div>
          <button class="btn-primary template-use-btn" onclick="templateManager.useTemplate('${template.id}')">
            使用模板
          </button>
        </div>
      </div>
    `).join('');
  }

  // 获取模板图标
  private getTemplateIcon(category: string): string {
    const categoryObj = TEMPLATE_CATEGORIES.find(cat => cat.id === category);
    return categoryObj ? `<i class="${categoryObj.icon}"></i>` : '<i class="ri-file-line"></i>';
  }

  // 使用模板
  public useTemplate(templateId: string): void {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;

    const editor = getEditor();
    if (editor) {
      editor.commands.setContent(template.content);
      this.hideTemplates();
      
      // 触发内容变更事件
      const event = new CustomEvent('template-applied', {
        detail: { template }
      });
      window.dispatchEvent(event);
    }
  }

  // 显示创建模板对话框
  public showCreateTemplateDialog(): void {
    const dialog = document.createElement('div');
    dialog.className = 'template-dialog';
    dialog.innerHTML = `
      <div class="template-dialog-content">
        <div class="template-dialog-header">
          <h3>创建自定义模板</h3>
          <button class="template-dialog-close"><i class="ri-close-line"></i></button>
        </div>
        <div class="template-dialog-body">
          <div class="form-group">
            <label>模板名称</label>
            <input type="text" id="template-name" placeholder="请输入模板名称">
          </div>
          <div class="form-group">
            <label>模板描述</label>
            <input type="text" id="template-description" placeholder="请输入模板描述">
          </div>
          <div class="form-group">
            <label>分类</label>
            <select id="template-category">
              ${TEMPLATE_CATEGORIES.filter(cat => cat.id !== 'basic').map(cat => `
                <option value="${cat.id}">${cat.name}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>标签（用逗号分隔）</label>
            <input type="text" id="template-tags" placeholder="例如：文档,模板,自定义">
          </div>
          <div class="form-group">
            <label>模板内容</label>
            <textarea id="template-content" placeholder="请输入模板内容..." rows="10"></textarea>
          </div>
          <div class="form-actions">
            <button class="btn-secondary template-cancel">取消</button>
            <button class="btn-primary template-save">保存模板</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // 事件监听器
    const closeBtn = dialog.querySelector('.template-dialog-close');
    const cancelBtn = dialog.querySelector('.template-cancel');
    const saveBtn = dialog.querySelector('.template-save');

    const closeDialog = () => dialog.remove();

    closeBtn?.addEventListener('click', closeDialog);
    cancelBtn?.addEventListener('click', closeDialog);
    
    saveBtn?.addEventListener('click', () => {
      const name = (dialog.querySelector('#template-name') as HTMLInputElement)?.value;
      const description = (dialog.querySelector('#template-description') as HTMLInputElement)?.value;
      const category = (dialog.querySelector('#template-category') as HTMLSelectElement)?.value;
      const tagsStr = (dialog.querySelector('#template-tags') as HTMLInputElement)?.value;
      const content = (dialog.querySelector('#template-content') as HTMLTextAreaElement)?.value;
      
      if (name && description && content) {
        const tags = tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        const template: Template = {
          id: this.generateId(),
          name,
          description,
          category: category || 'custom',
          content,
          isBuiltIn: false,
          createdAt: new Date(),
          tags
        };
        
        this.addTemplate(template);
        closeDialog();
      }
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        closeDialog();
      }
    });
  }

  // 编辑模板
  public editTemplate(templateId: string): void {
    const template = this.templates.find(t => t.id === templateId);
    if (!template || template.isBuiltIn) return;

    const dialog = document.createElement('div');
    dialog.className = 'template-dialog';
    dialog.innerHTML = `
      <div class="template-dialog-content">
        <div class="template-dialog-header">
          <h3>编辑模板</h3>
          <button class="template-dialog-close"><i class="ri-close-line"></i></button>
        </div>
        <div class="template-dialog-body">
          <div class="form-group">
            <label>模板名称</label>
            <input type="text" id="template-name" value="${template.name}">
          </div>
          <div class="form-group">
            <label>模板描述</label>
            <input type="text" id="template-description" value="${template.description}">
          </div>
          <div class="form-group">
            <label>分类</label>
            <select id="template-category">
              ${TEMPLATE_CATEGORIES.filter(cat => cat.id !== 'basic').map(cat => `
                <option value="${cat.id}" ${cat.id === template.category ? 'selected' : ''}>${cat.name}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>标签（用逗号分隔）</label>
            <input type="text" id="template-tags" value="${template.tags.join(', ')}">
          </div>
          <div class="form-group">
            <label>模板内容</label>
            <textarea id="template-content" rows="10">${template.content}</textarea>
          </div>
          <div class="form-actions">
            <button class="btn-secondary template-cancel">取消</button>
            <button class="btn-primary template-save">保存修改</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // 事件监听器
    const closeBtn = dialog.querySelector('.template-dialog-close');
    const cancelBtn = dialog.querySelector('.template-cancel');
    const saveBtn = dialog.querySelector('.template-save');

    const closeDialog = () => dialog.remove();

    closeBtn?.addEventListener('click', closeDialog);
    cancelBtn?.addEventListener('click', closeDialog);
    
    saveBtn?.addEventListener('click', () => {
      const name = (dialog.querySelector('#template-name') as HTMLInputElement)?.value;
      const description = (dialog.querySelector('#template-description') as HTMLInputElement)?.value;
      const category = (dialog.querySelector('#template-category') as HTMLSelectElement)?.value;
      const tagsStr = (dialog.querySelector('#template-tags') as HTMLInputElement)?.value;
      const content = (dialog.querySelector('#template-content') as HTMLTextAreaElement)?.value;
      
      if (name && description && content) {
        const tags = tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        const updatedTemplate: Template = {
          ...template,
          name,
          description,
          category: category || 'custom',
          content,
          tags
        };
        
        this.updateTemplate(updatedTemplate);
        closeDialog();
      }
    });
  }

  // 删除模板
  public deleteTemplate(templateId: string): void {
    const template = this.templates.find(t => t.id === templateId);
    if (!template || template.isBuiltIn) return;

    if (confirm(`确定要删除模板"${template.name}"吗？此操作无法撤销。`)) {
      this.templates = this.templates.filter(t => t.id !== templateId);
      this.saveTemplates();
      this.renderTemplates();
    }
  }

  // 添加模板
  private addTemplate(template: Template): void {
    this.templates.push(template);
    this.saveTemplates();
    this.renderTemplates();
  }

  // 更新模板
  private updateTemplate(updatedTemplate: Template): void {
    const index = this.templates.findIndex(t => t.id === updatedTemplate.id);
    if (index !== -1) {
      this.templates[index] = updatedTemplate;
      this.saveTemplates();
      this.renderTemplates();
    }
  }

  // 导出模板
  public async exportTemplate(templateId: string): Promise<void> {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;

    try {
      const templateData = {
        ...template,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      const filePath = await save({
        filters: [
          {
            name: 'Template',
            extensions: ['json']
          }
        ],
        defaultPath: `${template.name}.json`
      });

      if (filePath) {
        const content = JSON.stringify(templateData, null, 2);
        await invoke('write_file', { path: filePath, content });
      }
    } catch (error) {
      console.error('导出模板失败:', error);
    }
  }

  // 导入模板
  public async importTemplate(): Promise<void> {
    try {
      // 这里可以添加文件选择和导入逻辑
      console.log('导入模板功能待实现');
    } catch (error) {
      console.error('导入模板失败:', error);
    }
  }

  // 格式化日期
  private formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN');
  }

  // 生成ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 加载模板
  private loadTemplates(): void {
    try {
      // 加载内置模板
      this.templates = [...BUILTIN_TEMPLATES];

      // 加载用户自定义模板
      const customTemplatesData = localStorage.getItem('just-md-custom-templates');
      if (customTemplatesData) {
        const customTemplates = JSON.parse(customTemplatesData);
        customTemplates.forEach((template: any) => {
          template.createdAt = new Date(template.createdAt);
        });
        this.templates.push(...customTemplates);
      }
    } catch (error) {
      console.error('加载模板失败:', error);
      this.templates = [...BUILTIN_TEMPLATES];
    }
  }

  // 保存模板
  private saveTemplates(): void {
    try {
      const customTemplates = this.templates.filter(t => !t.isBuiltIn);
      localStorage.setItem('just-md-custom-templates', JSON.stringify(customTemplates));
    } catch (error) {
      console.error('保存模板失败:', error);
    }
  }

  // 清理资源
  public destroy(): void {
    if (this.templatePanel) {
      this.templatePanel.remove();
      this.templatePanel = null;
    }
    
    const button = document.querySelector('#template-btn');
    if (button) {
      button.remove();
    }
  }
}

// 创建全局实例
export const templateManager = new TemplateManager();

// 初始化函数
export function initTemplates(): void {
  // 模板系统已通过构造函数初始化
  console.log('模板系统已初始化');
}

// 暴露给全局作用域
(window as any).templateManager = templateManager;