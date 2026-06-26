# AGENTS.md

## 项目概述

Raw HTTP Copier 是一个基于 Chrome Manifest V3 的开发者工具扩展，用于在 Chrome DevTools 中捕获并展示 HTTP 请求与响应的原生报文。

## 技术栈

- 纯原生前端技术（HTML / CSS / JavaScript），无框架依赖
- Chrome Extension Manifest V3
- Chrome DevTools API (`chrome.devtools.network`, `chrome.devtools.panels`)

## 项目结构

```
raw-http-copier/
├── src/                    # 源码目录
│   ├── manifest.json       # 扩展清单，定义扩展元信息和入口
│   ├── devtools.html       # DevTools 入口页，加载 devtools.js
│   ├── devtools.js         # 注册 DevTools 自定义面板 "Raw HTTP"
│   ├── panel.html          # 主面板 HTML 结构
│   ├── panel.js            # 主面板核心逻辑：捕获请求、构建报文、行号、复制、下载
│   └── panel.css           # 主面板样式，支持亮/暗主题自适应
├── doc/                    # 文档目录
│   └── usage-guide.md      # 用户使用教程
├── README.md               # 项目说明（中英文）
└── AGENTS.md               # 本文件
```

## 核心模块说明

### manifest.json
- `manifest_version`: 3
- `devtools_page`: 指向 `src/devtools.html`（相对于扩展根目录的路径）
- 无需任何额外权限

### devtools.js
- 调用 `chrome.devtools.panels.create()` 注册名为 "Raw HTTP" 的自定义面板
- 面板内容指向 `panel.html`

### panel.js 核心逻辑

| 函数 | 职责 |
|------|------|
| `renderList()` | 渲染左侧请求列表，显示 Method / Status / URL |
| `selectRequest(index)` | 选中请求，触发报文构建与展示 |
| `buildRawRequest(req)` | 将请求对象拼接为原生 HTTP 请求报文字符串 |
| `buildRawResponse(res, body)` | 将响应对象拼接为原生 HTTP 响应报文字符串 |
| `updateLineNumbers(textarea, lineNumbersEl)` | 根据 textarea 内容行数生成左侧行号 |
| `copyText(text, msg)` | 写入剪贴板，降级使用 `document.execCommand` |
| `downloadText(text, filename)` | 通过 Blob 和临时 `<a>` 标签触发文件下载 |
| `showToast(msg)` | 右下角显示操作反馈提示 |

### panel.css 样式要点

- 使用 CSS 变量定义颜色，通过 `@media (prefers-color-scheme: dark)` 切换亮/暗主题
- `.code-view` 为 flex 横向布局，左侧 `.line-numbers` + 右侧 `textarea`
- `.line-numbers` 与 `textarea` 使用相同的 `line-height: 1.45`，确保行号与文本行严格对齐
- 行号区域 `user-select: none`，避免干扰复制操作

## 编码规范

- 使用 IIFE 包裹 panel.js，避免全局污染
- 字符串拼接原生报文时使用 `\r\n` 作为 HTTP 行分隔符
- 所有 DOM 操作前检查元素存在性
- 异步操作（如 `getContent`）有 loading 状态提示

## 常见修改场景

### 修改报文格式
编辑 `panel.js` 中的 `buildRawRequest()` 或 `buildRawResponse()` 函数，调整拼接逻辑。

### 调整 UI 布局
编辑 `panel.html` 修改结构，`panel.css` 调整样式。注意保持 `.line-numbers` 与 `textarea` 的 `line-height` 一致。

### 新增功能按钮
1. 在 `panel.html` 的 `.pane-header` 或 `.toolbar` 中添加按钮
2. 在 `panel.js` 中绑定事件监听器
3. 如需新增功能函数，建议写在 `copyText` / `downloadText` 附近，保持逻辑分组

### 修改主题颜色
编辑 `panel.css` 中 `:root` 和 `@media (prefers-color-scheme: dark)` 下的 CSS 变量值。

## 测试与验证

- 修改源码后，在 Chrome 扩展管理页面点击扩展卡片的 **刷新** 按钮即可生效
- 测试行号对齐：选中一个多行报文，检查左侧行号是否与右侧文本行一一对应
- 测试下载功能：点击 Download 按钮，确认浏览器下载了正确的 `.txt` 文件且内容完整
- 测试主题切换：修改操作系统主题，确认面板颜色正确切换

## 注意事项

- `manifest.json` 中的路径是相对于扩展根目录的，移动文件后需同步更新
- `chrome.devtools` API 仅在 DevTools 页面上下文中可用，普通 content script 无法使用
- 响应体通过 `request.getContent()` 异步获取，需处理 loading 状态和回调时机
- 最大保留 500 条请求，超出后旧记录会被丢弃
