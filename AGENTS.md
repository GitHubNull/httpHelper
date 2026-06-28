# AGENTS.md

## 项目概述

http helper 是一个基于 Chrome Manifest V3 的开发者工具扩展，用于在 Chrome DevTools 中捕获并展示 HTTP 请求与响应的原生报文。项目采用 Vue 3 + TypeScript 技术栈重构，使用 Pinia 状态管理、PrimeVue UI 组件库和 Vite 构建工具。

## 技术栈

- Vue 3.5 + TypeScript（前端框架与类型安全）
- Pinia（状态管理）
- PrimeVue 4.5 + PrimeIcons（UI 组件库）
- Vite 6 + @crxjs/vite-plugin（构建工具与 Chrome 扩展集成）
- highlight.js（代码语法高亮）
- Chrome Extension Manifest V3
- Chrome DevTools API（`chrome.devtools.network`、`chrome.devtools.panels`）

## 项目结构

```
httpHelper/
├── src/                        # Vite 项目根目录
│   ├── manifest.json           # 扩展清单（@crxjs 构建用）
│   ├── panel.html              # 面板入口 HTML
│   ├── devtools.html           # DevTools 入口 HTML
│   └── src/                    # Vue 3 源码目录
│       ├── App.vue             # 根组件（Tab 布局、全屏覆盖层）
│       ├── main.ts             # 应用入口（Pinia、PrimeVue、highlight.js 初始化）
│       ├── devtools.ts         # DevTools 面板注册
│       ├── components/         # Vue 组件目录
│       │   ├── http-history/   # HTTP 历史功能组件
│       │   │   ├── HttpHistoryTab.vue      # HTTP 历史主容器
│       │   │   ├── RequestTableArea.vue    # 请求表格区域
│       │   │   ├── RequestTable.vue        # 请求列表表格（PrimeVue DataTable）
│       │   │   ├── FilterBar.vue           # 基础过滤栏
│       │   │   ├── FilterBarAdvanced.vue    # 高级过滤栏
│       │   │   ├── LayoutBar.vue           # 布局切换栏
│       │   │   ├── HttpDetailArea.vue      # 报文详情区域
│       │   │   ├── RequestPane.vue         # 请求报文面板
│       │   │   ├── ResponsePane.vue        # 响应报文面板
│       │   │   ├── ContentPanes.vue        # 内容面板（Raw/Pretty/Hex 切换）
│       │   │   ├── RawView.vue             # Raw 原生视图
│       │   │   ├── PrettyView.vue          # Pretty 格式化视图
│       │   │   ├── HexView.vue             # Hex 十六进制视图
│       │   │   └── SearchBar.vue           # 搜索高亮栏
│       │   ├── session-config/ # 会话配置功能组件
│       │   │   ├── SessionConfigTab.vue    # 会话配置主容器
│       │   │   ├── SchemesManagement.vue   # 方案管理
│       │   │   ├── FieldsManagement.vue     # 字段管理
│       │   │   ├── SchemeEditorDialog.vue  # 方案编辑对话框
│       │   │   ├── FieldEditorDialog.vue   # 字段编辑对话框
│       │   │   ├── NoteEditorDialog.vue    # 备注编辑对话框
│       │   │   └── DualListSelector.vue    # 双列表选择器
│       │   ├── toolbar/        # 工具栏组件
│       │   │   └── ToolbarBar.vue           # 顶部工具栏
│       │   └── common/         # 通用组件
│       │       ├── FullscreenOverlay.vue    # 全屏覆盖层
│       │       ├── PaneResizer.vue          # 面板大小调整器
│       │       ├── ColorPicker.vue          # 颜色选择器
│       │       └── ColumnConfig.vue         # 列配置下拉
│       ├── composables/        # 组合式 API
│       │   ├── useNetworkListener.ts        # 网络监听初始化
│       │   ├── useSearchHighlight.ts        # 搜索高亮逻辑
│       │   ├── useResize.ts                 # 面板大小调整
│       │   └── useFullscreenOverlay.ts      # 全屏覆盖层
│       ├── services/           # 业务服务
│       │   ├── session-extractor.ts         # 会话信息提取
│       │   └── session-storage.ts           # 会话方案和字段持久化
│       ├── stores/             # Pinia 状态管理
│       │   ├── network.ts       # 网络请求捕获与存储
│       │   ├── filter.ts       # 请求过滤与排序
│       │   ├── selection.ts    # 请求选择与面板内容
│       │   ├── session.ts      # 会话方案管理
│       │   └── search.ts       # 搜索状态管理
│       ├── utils/              # 工具函数
│       │   ├── content-formatter.ts  # 报文格式化（Raw/Pretty/Hex）
│       │   ├── string-utils.ts       # 字符串处理（转义、JSON/XML 格式化、Hex 转换）
│       │   ├── dom-utils.ts          # DOM 工具（防抖、行号、高亮覆盖层）
│       │   └── clipboard-utils.ts    # 剪贴板与文件下载
│       ├── types/              # TypeScript 类型定义
│       │   └── har.d.ts        # HAR 数据类型定义
│       └── styles/             # 全局样式
│           └── panel.css       # 面板主样式（亮/暗主题自适应）
├── dist/                       # 构建输出目录
├── doc/                        # 文档目录
│   ├── developer-guide/        # 开发者文档
│   └── usage-guide.md          # 使用教程
├── vite.config.ts              # Vite 构建配置
├── tsconfig.json               # TypeScript 配置
├── tsconfig.node.json          # Node 环境 TypeScript 配置
├── package.json                # 项目依赖与脚本
├── manifest.json               # 扩展清单（加载用，指向 dist/）
├── README.md                   # 项目说明（中文）
├── README.en.md                # 项目说明（英文）
└── AGENTS.md                   # 本文件
```

## 核心架构

### 双 manifest 方案

项目使用两个 manifest.json：
- `src/manifest.json`：@crxjs 构建用清单，路径相对于 `src/` 目录
- 根目录 `manifest.json`：Chrome 扩展加载用清单，路径指向 `dist/` 构建产物

### 构建流程

1. Vite 以 `src/` 为 root，`@crxjs/vite-plugin` 处理 Chrome 扩展 manifest
2. 构建产物输出到 `dist/` 目录
3. Chrome 加载根目录 `manifest.json`，其中所有路径指向 `dist/`

### main.ts 应用入口

`main.ts` 负责应用初始化：
- 创建 Vue 应用实例
- 安装 Pinia 状态管理
- 配置 PrimeVue（Aura 主题，暗色模式自适应）
- 注册 Toast 服务和 Tooltip 指令
- 注册 highlight.js 语言（http、json、xml）
- 挂载到 `#app`

### App.vue 根组件

`App.vue` 使用 PrimeVue Tabs 组件实现两个主标签页：
- HTTP 历史：请求捕获、列表、详情查看
- 会话复制配置：方案与字段的增删改查

## 核心模块说明

### stores/ Pinia 状态管理

#### network.ts
- `initNetworkListener(callback)`：监听 `chrome.devtools.network.onRequestFinished`
- `getRequests()` / `getRequest(index)` / `getRequestByUid(uid)`：获取请求
- `clearRequests()`：清空请求列表
- `setRecording(enabled)`：录制开关控制
- `getRequestMeta(uid)` / `setRequestColor(uid, color)` / `setRequestNote(uid, note)`：请求元数据（颜色标记和备注）
- 最大保留 500 条请求，超出后丢弃最旧记录

#### filter.ts
- `refreshDisplay()`：重新计算过滤和排序后的显示列表
- `getFilteredRequests(networkStore)`：按 method/type/color/keyword 过滤
- `getSortedRequests(requests, networkStore)`：按列排序（支持升降序切换）
- `setFilter(key, value)` / `toggleFilter(key)`：过滤条件管理
- `toggleSort(column)`：排序切换（asc → desc → 无）

#### selection.ts
- `selectRequest(request)`：选中请求，构建 Raw/Pretty/Hex 三种视图内容
- `setLayout(layout)`：布局切换（vertical/horizontal/tabs）
- `setActiveTab(pane, tab)`：切换 Raw/Pretty/Hex 标签
- `getPaneText(pane, tab)`：获取面板文本内容
- 智能标签切换：根据 Content-Type 自动切换到 Pretty（JSON/XML）或 Hex（binary）

#### session.ts
- `loadAll()`：加载所有方案和字段，执行数据迁移
- `addField(field)` / `editField(field)` / `removeField(fieldId)`：字段 CRUD
- `addScheme(scheme)` / `editScheme(scheme)` / `removeScheme(schemeId)`：方案 CRUD
- `activateScheme(schemeId)`：设置激活方案
- `checkSessionExtraction(request)`：请求捕获时自动提取会话信息

#### search.ts
- `setSearchText(pane, text)`：设置搜索文本
- `toggleRegex(pane)` / `toggleCaseSensitive(pane)`：正则/大小写开关
- `setMatches(pane, matches)`：设置匹配结果
- `navigateMatch(pane, direction)`：上一个/下一个匹配导航
- `clearSearch(pane)`：清空搜索
- `getSearchCountText(pane)`：获取高亮计数文本

### services/ 业务服务

#### session-extractor.ts
- `extractSession(request, scheme)`：按方案提取会话字段
- `applySchemeToRequest(request, scheme)`：应用方案（检查激活状态和域名匹配）
- `extractByMode(source, field)`：按模式提取（substring/regex/keyword/xpath/jsonpath）
- `isSchemeApplicable(request, scheme)`：检查域名匹配（支持域名列表和正则）

#### session-storage.ts
- `loadAllFields()` / `saveField()` / `updateField()` / `deleteField()`：字段 CRUD
- `loadSchemes()` / `saveScheme()` / `updateScheme()` / `deleteScheme()`：方案 CRUD
- `getSchemeFields(schemeId)` / `setSchemeFields(schemeId, fieldIds)`：方案-字段关联
- `getActiveScheme()` / `setActiveScheme(schemeId)`：激活方案管理
- `migrateIfNeeded()`：旧格式数据迁移
- N:N 关系模型：Fields 独立存储，Schemes 通过 fieldIds 引用
- 使用 `chrome.storage.local` 持久化存储

### composables/ 组合式 API

#### useNetworkListener.ts
- 初始化网络监听，捕获请求后刷新过滤列表并检查会话提取
- 使用 PrimeVue Toast 显示会话提取通知

#### useSearchHighlight.ts
- `performSearch(text)`：执行正则/普通搜索，返回匹配位置数组
- `searchAndHighlight(textarea)`：在 textarea overlay 上高亮
- `highlightHexView(el)` / `highlightPrettyView(codeEl)`：Hex 和 Pretty 视图高亮
- `navigateMatch(direction)`：匹配导航与滚动定位
- `clearHighlights()`：清除高亮

#### useResize.ts
- 面板大小拖拽调整（支持垂直和水平方向）

#### useFullscreenOverlay.ts
- 全屏覆盖层状态管理

### utils/ 工具函数

#### content-formatter.ts
- `buildRawRequest(req)` / `buildRawResponse(res, body)`：构建原生 HTTP 报文
- `buildPrettyRequest(req)` / `buildPrettyResponse(res, body)`：格式化 JSON/XML 报文
- `buildHexRequest(req)` / `buildHexResponse(res, body)`：Hex 十六进制视图
- `detectContentType(headers)`：检测内容类型（json/xml/binary/text）
- `buildXxxFromEntry(entry)`：从 HAR Entry 构建报文的便捷方法

#### string-utils.ts
- `escapeHtml(text)`：HTML 实体转义
- `truncateUrl(url)`：截断 URL 显示路径部分
- `formatJson(body)` / `formatXml(body)`：格式化 JSON/XML
- `stringToHex(body)`：字符串转 Hex 十六进制显示（含 offset/ascii 列）
- `detectContentType(headers)`：根据 Content-Type 头部检测类型
- `formatTimestamp(date)`：格式化时间戳（YYYY-MM-DD HH:mm:ss.SSS）
- `getResourceCategory(request)`：获取资源分类（json/xml/html/js/css/image/font/binary/text/other）

#### dom-utils.ts
- `debounce(fn, delay)`：防抖函数
- `updateLineNumbers(textarea, lineNumbersEl, content?)`：同步行号
- `highlightOverlay(overlay, text, matches, currentIndex)`：在覆盖层上渲染高亮（支持当前匹配高亮）
- `clearOverlay(overlay)`：清除覆盖层

#### clipboard-utils.ts
- `copyText(text)`：写入剪贴板，降级使用 `document.execCommand`
- `downloadText(text, filename)`：通过 Blob 触发文件下载

## 编码规范

- Vue 源码文件采用三段式结构：`<template>`（4 空格缩进）、`<script lang="ts" setup>`、`<style scoped>`
- 使用 TypeScript 严格模式（`strict: true`）
- 组件命名采用 PascalCase，文件命名采用 PascalCase
- 模块/目录命名采用 `kebab-case`
- 常量/配置使用 `UPPER_SNAKE_CASE`
- 路径别名 `@` 映射到 `src/src/`
- 字符串拼接原生报文时使用 `\r\n` 作为 HTTP 行分隔符
- 所有 DOM 操作前检查元素存在性
- 异步操作（如 `getContent`）有 loading 状态提示
- Pinia store 采用 Options API 风格（state/getters/actions）

## 常见修改场景

### 修改报文格式
编辑 `src/src/utils/content-formatter.ts` 中的 `buildRawRequest()` 或 `buildRawResponse()` 函数，调整拼接逻辑。

### 调整 UI 布局
编辑对应 Vue 组件（如 `src/src/components/http-history/HttpHistoryTab.vue`）修改模板结构，`src/src/styles/panel.css` 调整全局样式。

### 新增功能按钮
1. 在对应 Vue 组件的 `<template>` 中添加按钮（使用 PrimeVue Button 组件）
2. 在 `<script setup>` 中添加事件处理逻辑
3. 如需状态管理，在对应 Pinia store 中添加 action

### 修改主题颜色
PrimeVue 主题通过 `@primeuix/themes/aura` 预设配置，暗色模式通过 `darkModeSelector` 自适应。自定义样式在 `src/src/styles/panel.css` 中修改。

### 新增第三方依赖
1. 通过 `pnpm add` 安装依赖
2. 在 `main.ts` 或对应组件中导入使用
3. 更新本文档的项目结构说明

## 测试与验证

- 修改源码后执行 `pnpm build` 重新构建
- 在 Chrome 扩展管理页面点击扩展卡片的 **刷新** 按钮生效
- 测试行号对齐：选中一个多行报文，检查左侧行号是否与右侧文本行一一对应
- 测试下载功能：点击 Download 按钮，确认浏览器下载了正确的 `.txt` 文件且内容完整
- 测试主题切换：修改操作系统主题，确认面板颜色正确切换
- 测试布局切换：点击布局按钮（垂直/水平/标签），确认面板布局正确变化
- 测试搜索功能：输入搜索词，确认高亮和导航正常工作
- 测试会话提取：创建 Scheme 并激活，确认请求捕获后自动提取会话信息

## 注意事项

- 根目录 `manifest.json` 中的路径指向 `dist/`，是 Chrome 加载扩展用的清单
- `src/manifest.json` 是 @crxjs 构建用的清单，路径相对于 `src/` 目录
- 两个 manifest 的 `version` 需保持一致
- `chrome.devtools` API 仅在 DevTools 页面上下文中可用
- 响应体通过 `request.getContent()` 异步获取，需处理 loading 状态
- 最大保留 500 条请求，超出后旧记录会被丢弃
- `chrome.storage.local` 有存储配额限制（约 5MB），大量 Scheme/Field 数据需注意
- Vite 构建配置 `base: './'` 确保生成相对路径，Chrome 扩展需要相对路径加载资源
- PrimeVue 组件按需引入，未使用全局注册全部组件
