# 架构设计文档

## 设计目标

http helper 的设计目标是提供一个轻量、高效、可扩展的 Chrome DevTools 扩展，用于捕获和展示 HTTP 请求/响应的原生报文。项目基于 Vue 3 + TypeScript + Pinia 技术栈构建。

## 核心原则

1. **单一职责**：每个组件/store/service 只负责一个功能领域
2. **低耦合**：模块间通过 Pinia store 和 props/emits 交互，不直接访问内部状态
3. **可扩展**：新增功能只需添加组件或 store，无需修改现有代码
4. **类型安全**：全面使用 TypeScript，HAR 数据有完整类型定义
5. **响应式驱动**：UI 更新由 Pinia 响应式状态驱动，无需手动 DOM 操作

## 技术栈

- **前端框架**：Vue 3.5（Composition API + `<script setup>`）
- **状态管理**：Pinia（Options API 风格 store）
- **UI 组件库**：PrimeVue 4.5 + PrimeIcons 7.0
- **构建工具**：Vite 6 + @crxjs/vite-plugin
- **类型系统**：TypeScript 5.7（strict 模式）
- **代码高亮**：highlight.js 11.x

## 数据流

```
Chrome Network API
       ↓
useNetworkListener (composable)
       ↓
networkStore (捕获 & 存储)
       ↓
filterStore.refreshDisplay() (过滤 & 排序)
       ↓
Vue 组件响应式渲染
       ├── RequestTable.vue ──→ 请求列表
       ├── ContentPanes.vue ──→ Raw/Pretty/Hex 视图
       ├── SearchBar.vue ──→ 搜索高亮
       └── SessionConfigTab ──→ 会话管理
```

### 请求选择数据流

```
RequestTable 行点击
       ↓
selectionStore.selectRequest(request)
       ├── buildRawRequestFromEntry() ──→ requestContent.raw
       ├── buildPrettyRequestFromEntry() ──→ requestContent.pretty
       ├── buildHexRequestFromEntry() ──→ requestContent.hex
       └── request.getContent() (异步)
              ├── buildRawResponseFromEntry() ──→ responseContent.raw
              ├── buildPrettyResponseFromEntry() ──→ responseContent.pretty
              ├── buildHexResponseFromEntry() ──→ responseContent.hex
              └── 智能标签切换（根据 Content-Type）
```

## 状态管理

本项目采用 **Pinia 集中式状态管理**，5 个 store 协调各功能模块：

| Store | 职责 | 关键状态 |
|-------|------|----------|
| `network` | 网络请求捕获与存储 | requests[], isRecording, requestMeta |
| `filter` | 请求过滤与排序 | filterState, sortState, displayedRequests |
| `selection` | 请求选择与面板内容 | currentRequest, requestContent, responseContent, activeTab |
| `session` | 会话方案与字段管理 | schemes[], fields[], activeScheme |
| `search` | 搜索状态（双面板独立） | req/res: { text, matches, currentIndex } |

### Store 间依赖关系

```
network  ← filter     (过滤读取请求列表和 requestMeta)
network  ← selection  (选择读取请求数据)
filter   ← selection  (selectRequest 调用 setSelectedUid 更新选中索引)
network  ← session    (会话提取依赖请求数据)
selection ← search    (搜索高亮依赖面板内容)
filter   ← network    (refreshDisplay 调用 getRequestMeta 用于颜色过滤)
```

## 组件架构

### 主要组件层次

```
App.vue
├── ToolbarBar.vue              # 顶部工具栏（录制切换+脉冲动画、清空、请求计数）
├── Tabs (PrimeVue)
│   ├── TabPanel: HTTP 历史
│   │   └── HttpHistoryTab.vue
│   │       ├── RequestTableArea.vue
│   │       │   ├── FilterBar.vue           # 基础过滤 + 全屏按钮
│   │       │   ├── RequestTable.vue       # PrimeVue DataTable（内联列配置 Popover + ColorPicker）
│   │       │   └── FullscreenOverlay.vue  # 请求列表面板全屏
│   │       ├── PaneResizer.vue            # 水平拖拽分隔条
│   │       └── HttpDetailArea.vue
│   │           ├── LayoutBar.vue          # 布局切换 + 全屏按钮
│   │           ├── ContentPanes.vue       # 布局容器（vertical/horizontal/tabs）
│   │           │   ├── RequestPane.vue
│   │           │   │   ├── RawView.vue
│   │           │   │   ├── PrettyView.vue
│   │           │   │   ├── HexView.vue
│   │           │   │   └── SearchBar.vue   # 搜索高亮栏
│   │           │   ├── PaneResizer.vue    # 垂直/水平拖拽分隔条
│   │           │   └── ResponsePane.vue
│   │           │       ├── RawView.vue
│   │           │       ├── PrettyView.vue
│   │           │       ├── HexView.vue
│   │           │       └── SearchBar.vue
│   │           └── FullscreenOverlay.vue  # 报文详情面板全屏
│   └── TabPanel: 会话复制配置
│       └── SessionConfigTab.vue
│           ├── Tabs (PrimeVue)
│           │   ├── TabPanel: 字段管理
│           │   │   └── FieldsManagement.vue
│           │   └── TabPanel: 方案管理
│           │       └── SchemesManagement.vue
│           └── FullscreenOverlay.vue      # 会话配置面板全屏（可选）
├── FieldEditorDialog.vue       # 字段编辑对话框（全局渲染）
├── SchemeEditorDialog.vue      # 方案编辑对话框（含 DualListSelector）
├── NoteEditorDialog.vue        # 备注编辑对话框（全局渲染）
└── Toast (PrimeVue)            # 操作反馈通知
```

## 构建与部署

### 双 manifest 方案

| 文件 | 用途 | 路径基准 |
|------|------|----------|
| `src/manifest.json` | @crxjs 构建输入 | 相对于 `src/` |
| 根目录 `manifest.json` | Chrome 扩展加载 | 指向 `dist/` |

### Vite 构建配置

```typescript
// vite.config.ts 核心配置
{
  root: 'src',               // Vite 项目根目录
  base: './',                // 相对路径（Chrome 扩展必需）
  build: {
    outDir: '../dist',       // 输出到 dist/
    emptyOutDir: true,
    minify: false,           // 不压缩（便于调试）
    sourcemap: true,         // 生成 sourcemap
    rollupOptions: {
      input: { panel: resolve(__dirname, 'src/panel.html') },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src/src') }  // Vue 源码路径别名
  },
  plugins: [vue(), crx({ manifest })]
}
```

## 扩展点

### 新增视图类型

1. 在 `src/src/utils/content-formatter.ts` 中新增构建函数
2. 在 `ContentPanes.vue` 中新增 Tab 选项
3. 创建对应的 View 组件
4. 在 `selectionStore` 中新增对应内容字段

### 新增提取模式

1. 在 `src/src/services/session-extractor.ts` 的 `extractByMode()` switch 中新增 case
2. 在 `FieldEditorDialog.vue` 的 Mode 下拉框中新增选项

### 新增布局模式

1. 在 `selectionStore` 的 `LayoutType` 类型中新增
2. 在 `LayoutBar.vue` 中新增布局按钮
3. 在 `HttpHistoryTab.vue` 中新增布局样式类

## 性能考虑

- 请求列表最多保留 500 条，防止内存无限增长
- 搜索使用防抖（300ms），避免频繁高亮重绘
- Hex 视图对大内容分段渲染，避免 DOM 阻塞
- `chrome.storage.local` 异步读写，不阻塞主线程
- Vue 响应式系统自动优化 DOM 更新，仅重渲染变更部分
- PrimeVue DataTable 虚拟滚动支持大量数据
- 全屏模式使用 Vue Teleport + FullscreenOverlay 组件，支持 ESC 栈式退出
- 面板拖拽通过 `useResize` composable 实时计算比例，使用 CSS flex 布局
- 会话数据迁移（`migrateIfNeeded`）仅在首次加载时执行一次
