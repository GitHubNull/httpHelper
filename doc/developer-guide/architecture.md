# 架构设计文档

## 设计目标

Raw HTTP Copier 的设计目标是提供一个轻量、高效、可扩展的 Chrome DevTools 扩展，用于捕获和展示 HTTP 请求/响应的原生报文。

## 核心原则

1. **单一职责**：每个模块只负责一个功能领域
2. **低耦合**：模块间通过明确的 API 交互，不直接访问内部状态
3. **可扩展**：新增功能只需添加模块，无需修改现有代码
4. **零外部依赖**：第三方库通过 `src/third_lib/` 本地引入，不依赖 CDN

## 数据流

```
Chrome Network API
       ↓
NetworkHandler (捕获 & 存储)
       ↓
panel.js (协调 & 路由)
       ↓
├─→ UiRenderer ──→ 请求列表渲染
├─→ ContentFormatter ──→ 报文构建
├─→ LayoutManager ──→ 布局控制
├─→ SearchHighlighter ──→ 搜索高亮
├─→ SessionExtractor ──→ 会话提取
└─→ SessionStorage ──→ 数据持久化
```

## 状态管理

本项目采用**去中心化状态管理**，各模块维护自身状态：

| 状态 | 归属模块 | 说明 |
|------|----------|------|
| 请求列表 | `NetworkHandler` | 内存数组，最大 500 条 |
| 当前选中索引 | `panel.js` | 全局状态 |
| 布局模式 | `LayoutManager` | vertical/horizontal/tabs |
| 搜索状态 | `SearchHighlighter` | 关键词、匹配列表、当前索引 |
| Scheme 数据 | `SessionStorage` | `chrome.storage.local` 持久化 |
| 激活 Scheme | `SessionStorage` | 当前生效的提取方案 |

## 扩展点

### 新增视图类型

1. 在 `ContentFormatter` 中新增 `buildXxxRequest/Response` 方法
2. 在 `panel.html` 的 `.tab-nav` 中新增标签按钮
3. 在 `panel.js` 的 `selectRequest()` 中增加视图切换逻辑

### 新增提取模式

1. 在 `SessionExtractor.extractByMode()` 的 switch 中新增 case
2. 在 `panel.html` 的 Mode 下拉框中新增选项

### 新增布局模式

1. 在 `LayoutManager.switchLayout()` 中新增分支
2. 在 `panel.css` 中新增布局样式类

## 性能考虑

- 请求列表最多保留 500 条，防止内存无限增长
- 搜索使用防抖（300ms），避免频繁高亮重绘
- Hex 视图对大内容分段渲染，避免 DOM 阻塞
- `chrome.storage.local` 异步读写，不阻塞主线程
