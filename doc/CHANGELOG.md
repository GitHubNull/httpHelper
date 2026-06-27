# 变更日志

所有版本变更记录按时间倒序排列。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [1.0.0] - 2026-06-27

### Added
- 模块化重构：将单文件 `panel.js` 拆分为多个 ES Module 模块
- 新增 `src/modules/` 目录，包含 7 个功能模块：
  - `network-handler.js` — 网络请求捕获与存储
  - `content-formatter.js` — 报文格式化（Raw/Pretty/Hex）
  - `ui-renderer.js` — UI 渲染与标签页切换
  - `layout-manager.js` — 三种布局模式切换（垂直/水平/标签页）
  - `search-highlighter.js` — 全文搜索、高亮与导航
  - `session-extractor.js` — 会话信息提取核心逻辑
  - `session-storage.js` — Scheme 和字段的持久化存储
- 新增 `src/utils/` 目录，包含 3 个通用工具模块：
  - `clipboard-utils.js` — 剪贴板与文件下载
  - `dom-utils.js` — DOM 操作工具（防抖、行号、高亮覆盖层）
  - `string-utils.js` — 字符串处理（HTML 转义、JSON/XML 格式化、Hex 转换）
- 多视图展示：支持 Raw（原生）、Pretty（格式化）、Hex（十六进制）三种视图
- 智能标签切换：根据 Content-Type 自动选择最佳视图
- 布局切换：支持垂直布局、水平布局、标签页布局
- 搜索高亮：支持全文搜索、正则表达式、大小写敏感、匹配导航
- 会话提取功能：
  - 支持自定义 Scheme 定义提取规则
  - 支持 5 种提取模式：Substring、Regex、Keyword、XPath、JSONPath
  - 支持域名匹配和正则匹配
  - 数据通过 `chrome.storage.local` 持久化存储
- 第三方依赖本地化管理：
  - 新增 `src/third_lib/` 目录
  - 引入 Bootstrap 5.3.8（`bootstrap.min.css`、`bootstrap.bundle.min.js`）
  - 引入 jQuery 4.0.0（`jquery.min.js`）
  - 移除外部 CDN 依赖，确保离线可用
- 新增开发者文档：
  - `doc/developer-guide/index.md` — 开发者指南
  - `doc/developer-guide/architecture.md` — 架构设计文档
  - `doc/developer-guide/module-api.md` — 模块 API 参考
  - `doc/developer-guide/contributing.md` — 贡献指南
- 更新用户文档：
  - `doc/usage-guide.md` — 新增多视图、布局切换、搜索、会话提取使用教程
  - `README.md` — 更新功能特性和项目结构
  - `AGENTS.md` — 更新为反映新架构的完整开发指南

### Changed
- `panel.js` 重构为 ES Module 入口模块，负责模块协调
- `panel.html` 重构为支持多视图标签和布局切换的新结构
- `panel.css` 新增多视图、布局模式、搜索高亮、Modal 暗色主题等样式
- `manifest.json` 从 `src/` 目录移动到项目根目录

### Deprecated
- 旧版单文件 `panel.js` 代码结构（已拆分为模块）

### Removed
- 无

### Fixed
- 无

### Security
- 无

---

## [1.1.0] - 2026-06-27

### Added
- 新增 LICENSE 文件
- 新增英文 README（`README.en.md`）

### Changed
- 优化布局管理器（`layout-manager.js`）
- 优化搜索高亮功能（`search-highlighter.js`）
- 更新面板样式（`panel.css`）
- 更新面板 HTML 结构（`panel.html`）
- 更新主入口模块（`panel.js`）
- 更新 README.md

---

## [1.2.0] - 2026-06-27

### Added
- 无

### Changed
- 优化布局管理器（`layout-manager.js`）
- 优化搜索高亮功能（`search-highlighter.js`）
- 优化 UI 渲染器（`ui-renderer.js`）
- 更新面板样式（`panel.css`）
- 更新主入口模块（`panel.js`）
- 优化剪贴板工具（`clipboard-utils.js`）
- 优化 DOM 工具（`dom-utils.js`）
- 优化字符串工具（`string-utils.js`）
- 更新 `manifest.json`

---

## [1.3.0] - 2026-06-27

### Added
- 新增 `table-manager.js` 表格管理模块
- 新增 `Sortable.min.js` 第三方拖拽库
- 新增 `highlight/` 代码高亮库目录

### Changed
- 优化内容格式化器（`content-formatter.js`）
- 优化会话存储（`session-storage.js`）
- 优化 UI 渲染器（`ui-renderer.js`）
- 更新面板样式（`panel.css`）
- 更新面板 HTML 结构（`panel.html`）
- 更新主入口模块（`panel.js`）
- 更新 `.gitignore`

---

## [Unreleased]

### Added
- 无

### Changed
- 无

### Deprecated
- 无

### Removed
- 无

### Fixed
- 无

### Security
- 无

---

## [1.3.3] - 2026-06-27

### Fixed
- 修复 UI 渲染器（`ui-renderer.js`）面板渲染和交互问题
- 修复面板样式（`panel.css`）样式兼容性和布局问题
- 修复面板 HTML 结构（`panel.html`）组件嵌套和布局容器调整
- 修复主入口模块（`panel.js`）事件绑定和模块协调逻辑
- 修复剪贴板工具（`clipboard-utils.js`）复制和下载功能
- 新增 Bootstrap Icons 图标库（`src/third_lib/bootstrap-icons/`）

---

## [1.3.2] - 2026-06-27

### Fixed
- 修复网络处理器（`network-handler.js`）请求捕获和存储逻辑
- 修复 UI 渲染器（`ui-renderer.js`）面板渲染和标签切换问题
- 修复面板样式（`panel.css`）样式兼容性和暗色主题问题
- 修复面板 HTML 结构（`panel.html`）布局容器和组件嵌套问题
- 修复主入口模块（`panel.js`）事件绑定和模块协调逻辑
- 修复字符串工具（`string-utils.js`）格式化处理问题
- 更新开发者文档（`module-api.md`）模块 API 参考

---

## [1.3.1] - 2026-06-27

### Fixed
- 修复会话存储模块（`session-storage.js`）字段持久化和 Scheme 激活逻辑
- 修复 UI 渲染器（`ui-renderer.js`）标签切换和面板内容更新问题
- 修复布局管理器（`layout-manager.js`）布局切换边界处理
- 修复面板样式（`panel.css`）暗色主题和搜索栏样式兼容性
- 修复面板 HTML 结构（`panel.html`）标签页和布局容器嵌套问题
- 修复主入口模块（`panel.js`）模块初始化和事件绑定顺序

---

## [0.1.0] - 2024-XX-XX

### Added
- 初始版本发布
- 实时捕获 Chrome DevTools Network 请求
- 展示原生 HTTP 请求/响应报文
- 左侧行号显示
- 一键复制报文到剪贴板
- 一键下载报文为 `.txt` 文件
- 自动适配系统亮/暗主题
- 最大保留 500 条请求
