# AGENTS.md

## 项目概述

http helper 是一个基于 Chrome Manifest V3 的开发者工具扩展，用于在 Chrome DevTools 中捕获并展示 HTTP 请求与响应的原生报文。

## 技术栈

- 纯原生前端技术（HTML / CSS / JavaScript），无框架依赖
- Chrome Extension Manifest V3
- Chrome DevTools API (`chrome.devtools.network`, `chrome.devtools.panels`)
- 第三方库：Bootstrap 5.3.8（UI 组件）、jQuery 4.0.0（DOM 操作）

## 项目结构

```
httpHelper/
├── src/                        # 源码目录
│   ├── manifest.json           # 扩展清单，定义扩展元信息和入口
│   ├── devtools.html           # DevTools 入口页，加载 devtools.js
│   ├── devtools.js             # 注册 DevTools 自定义面板 "http helper"
│   ├── panel.html              # 主面板 HTML 结构
│   ├── panel.js                # 主面板入口模块：初始化、事件绑定、模块协调
│   ├── panel.css               # 主面板样式，支持亮/暗主题自适应
│   ├── third_lib/              # 开源第三方依赖库
│   │   ├── bootstrap.min.css   # Bootstrap 5.3.8 样式
│   │   ├── bootstrap.bundle.min.js  # Bootstrap 5.3.8 JS Bundle
│   │   └── jquery.min.js       # jQuery 4.0.0
│   ├── modules/                # 功能模块目录
│   │   ├── network-handler.js      # 网络请求捕获、存储与数据查询
│   │   ├── content-formatter.js  # 内容类型检测、报文体格式化、Hex 转换
│   │   ├── ui-renderer.js        # 请求列表渲染、标签页切换、面板内容更新
│   │   ├── layout-manager.js     # 布局切换管理（上下/左右/标签页）
│   │   ├── search-highlighter.js # 搜索、高亮、匹配导航
│   │   ├── session-extractor.js  # 会话信息提取核心逻辑
│   │   └── session-storage.js    # 会话方案和字段的持久化存储与管理
│   └── utils/                  # 通用工具模块目录
│       ├── clipboard-utils.js  # 剪贴板与文件下载操作
│       ├── dom-utils.js        # 通用 DOM 操作工具（防抖、行号、高亮覆盖层）
│       └── string-utils.js     # 字符串处理与格式化工具（HTML 转义、URL 截断、JSON/XML 格式化、Hex 转换）
├── doc/                        # 文档目录
│   └── usage-guide.md          # 用户使用教程
├── README.md                   # 项目说明（中英文）
└── AGENTS.md                   # 本文件
```

## 核心模块说明

### manifest.json
- `manifest_version`: 3
- `devtools_page`: 指向 `src/devtools.html`（相对于扩展根目录的路径）
- 无需任何额外权限

### devtools.js
- 调用 `chrome.devtools.panels.create()` 注册名为 "http helper" 的自定义面板
- 面板内容指向 `src/panel.html`

### panel.js 主入口模块

`panel.js` 作为应用入口，负责初始化各模块并协调它们之间的交互：

| 职责 | 说明 |
|------|------|
| 模块导入 | 使用 ES Module 导入所有功能模块和工具模块 |
| 网络监听初始化 | 调用 `NetworkHandler.initNetworkListener()` |
| 布局控制初始化 | 调用 `LayoutManager.initLayoutButtons()` |
| 搜索功能初始化 | 调用 `SearchHighlighter.initSearch()` |
| 标签页切换 | 绑定 `.tab-btn` 点击事件，调用 `UiRenderer.switchTab()` |
| 复制/下载 | 绑定按钮事件，调用 `ClipboardUtils.copyText()` / `downloadText()` |
| 会话管理 | 绑定 Scheme/Field 的增删改查事件，调用 `SessionStorage` 和 `SessionExtractor` |
| 请求选择 | `selectRequest()` 协调报文构建、内容更新、智能标签切换 |

### modules/ 功能模块

#### network-handler.js
- `initNetworkListener(callback)`：监听 `chrome.devtools.network.onRequestFinished`
- `getRequests()` / `getRequest(index)`：获取请求列表或单个请求
- `clearRequests()`：清空请求列表
- 最大保留 500 条请求

#### content-formatter.js
- `buildRawRequest(req)` / `buildRawResponse(res, body)`：构建原生 HTTP 报文
- `buildPrettyRequest(req)` / `buildPrettyResponse(res, body)`：格式化 JSON/XML 报文
- `buildHexRequest(req)` / `buildHexResponse(res, body)`：Hex 十六进制视图
- `detectContentType(headers)`：检测内容类型（json/xml/binary/text）

#### ui-renderer.js
- `renderRequestList(requests, selectedIndex, onSelect)`：渲染左侧请求列表
- `switchTab(pane, tabName)`：切换标签页
- `updatePaneContent(pane, tabName, content)`：更新面板内容（含行号同步）
- `getActiveTab(pane)` / `setActiveTab(pane, tabName)`：获取/设置活动标签

#### layout-manager.js
- `switchLayout(layout)`：切换布局（vertical/horizontal/tabs）
- `initLayoutButtons(container)`：初始化布局按钮事件
- `showRequestPane()` / `showResponsePane()`：标签布局下切换显示

#### search-highlighter.js
- `initSearch(container, onSearch)`：初始化搜索控件事件
- `performSearch(text, pattern, options)`：执行搜索（支持正则、大小写敏感）
- `highlightMatches()` / `highlightHexMatches()`：高亮匹配结果
- `navigateMatch(direction)`：上一个/下一个匹配导航

#### session-extractor.js
- `extractSession(request, scheme)`：按方案提取会话字段
- `applySchemeToRequest(request, scheme)`：应用方案到请求（检查激活状态和域名匹配）
- `extractByMode(source, field)`：按模式提取（substring/regex/keyword/xpath/jsonpath）
- `isSchemeApplicable(request, scheme)`：检查域名匹配（支持域名列表和正则）

#### session-storage.js
- `loadSchemes()` / `saveScheme()` / `updateScheme()` / `deleteScheme()`：方案 CRUD
- `loadFields(schemeId)` / `saveField()` / `deleteField()`：字段 CRUD
- `getActiveScheme()` / `setActiveScheme()`：激活方案管理
- 使用 `chrome.storage.local` 持久化存储

### utils/ 通用工具模块

#### clipboard-utils.js
- `copyText(text, msg)`：写入剪贴板，降级使用 `document.execCommand`
- `downloadText(text, filename)`：通过 Blob 触发文件下载
- `showToast(msg, duration)`：右下角显示操作反馈提示

#### dom-utils.js
- `debounce(fn, delay)`：防抖函数
- `updateLineNumbers(textarea, lineNumbersEl)`：同步行号
- `createOverlayHighlighter(textarea)`：创建搜索高亮覆盖层
- `highlightOverlay(overlay, text, matches)`：在覆盖层上渲染高亮

#### string-utils.js
- `escapeHtml(text)`：HTML 实体转义
- `truncateUrl(url)`：截断 URL 显示路径部分
- `formatJson(body)` / `formatXml(body)`：格式化 JSON/XML
- `stringToHex(body)`：字符串转 Hex 十六进制显示
- `detectContentType(headers)`：根据 Content-Type 头部检测类型

## 编码规范

- 使用 ES Module (`import`/`export`) 组织代码，模块职责单一
- `panel.js` 使用 IIFE 包裹，避免全局污染
- 字符串拼接原生报文时使用 `\r\n` 作为 HTTP 行分隔符
- 所有 DOM 操作前检查元素存在性
- 异步操作（如 `getContent`）有 loading 状态提示
- 模块命名采用 `kebab-case`，常量/配置使用 `UPPER_SNAKE_CASE`

## 常见修改场景

### 修改报文格式
编辑 `src/modules/content-formatter.js` 中的 `buildRawRequest()` 或 `buildRawResponse()` 函数，调整拼接逻辑。

### 调整 UI 布局
编辑 `src/panel.html` 修改结构，`src/panel.css` 调整样式。注意保持 `.line-numbers` 与 `textarea` 的 `line-height` 一致。

### 新增功能按钮
1. 在 `src/panel.html` 的 `.pane-header` 或 `.toolbar` 中添加按钮
2. 在 `src/panel.js` 中绑定事件监听器
3. 如需新增功能函数，建议创建新模块放入 `src/modules/` 或 `src/utils/`，在 `panel.js` 中导入使用

### 修改主题颜色
编辑 `src/panel.css` 中 `:root` 和 `@media (prefers-color-scheme: dark)` 下的 CSS 变量值。

### 新增第三方依赖
1. 将库文件放入 `src/third_lib/` 目录
2. 在 `src/panel.html` 中通过 `<script>` 或 `<link>` 引入
3. 更新本文档的项目结构说明

## 测试与验证

- 修改源码后，在 Chrome 扩展管理页面点击扩展卡片的 **刷新** 按钮即可生效
- 测试行号对齐：选中一个多行报文，检查左侧行号是否与右侧文本行一一对应
- 测试下载功能：点击 Download 按钮，确认浏览器下载了正确的 `.txt` 文件且内容完整
- 测试主题切换：修改操作系统主题，确认面板颜色正确切换
- 测试布局切换：点击布局按钮（垂直/水平/标签），确认面板布局正确变化
- 测试搜索功能：输入搜索词，确认高亮和导航正常工作
- 测试会话提取：创建 Scheme 并激活，确认请求捕获后自动提取会话信息

## 注意事项

- `manifest.json` 中的路径是相对于扩展根目录的，移动文件后需同步更新
- `chrome.devtools` API 仅在 DevTools 页面上下文中可用，普通 content script 无法使用
- 响应体通过 `request.getContent()` 异步获取，需处理 loading 状态和回调时机
- 最大保留 500 条请求，超出后旧记录会被丢弃
- `chrome.storage.local` 有存储配额限制（约 5MB），大量 Scheme/Field 数据需注意
- 第三方库（Bootstrap/jQuery）通过 `src/third_lib/` 引入，不依赖外部 CDN
