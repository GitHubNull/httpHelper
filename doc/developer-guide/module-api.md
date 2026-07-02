# 模块 API 参考

本文档基于 Vue 3 + TypeScript + Pinia 技术栈，记录项目中所有 store、service、composable 和 utils 的完整 API 签名。

> 类型定义请参阅 [types/har.d.ts](#类型定义-hardts)

---

## Pinia Stores

### network.ts — `useNetworkStore`

网络请求捕获与存储管理。

#### State

| 属性 | 类型 | 说明 |
|------|------|------|
| `requests` | `HarEntry[]` | 已捕获的请求列表（最新在前） |
| `isRecording` | `boolean` | 是否正在录制（默认 `true`） |
| `uidCounter` | `number` | UID 自增计数器 |
| `requestMeta` | `Map<number, RequestMeta>` | 请求元数据（颜色标记和备注） |
| `onNewRequestCallback` | `((request: HarEntry) => void) \| null` | 新请求回调 |

#### Actions

##### `initNetworkListener(callback?: (request: HarEntry) => void): void`

初始化网络请求监听，注册 `chrome.devtools.network.onRequestFinished` 事件。

- 新请求到达时自动分配 `_uid`，初始化 `requestMeta`
- 记录 `_reqStartTime` 和 `_resEndTime` 用于时间列排序
- 超过 `MAX_REQUESTS`（500 条）时丢弃最旧记录并清理对应元数据

##### `getRequests(): HarEntry[]`

获取所有已捕获的请求列表。

##### `getRequest(index: number): HarEntry | null`

获取指定索引的请求。

##### `getRequestByUid(uid: number): HarEntry | null`

通过唯一标识获取请求。

##### `clearRequests(): void`

清空所有请求、元数据，并重置 UID 计数器。

##### `getRequestCount(): number`

获取已捕获请求总数。

##### `setRecording(enabled: boolean): void`

开启/关闭请求录制。暂停后新请求不会被捕获。

##### `getRequestMeta(uid?: number): RequestMeta`

获取请求的元数据（颜色标记和备注）。

- **参数**：`uid` — 请求唯一标识（可选，未提供时返回默认值）
- **返回**：`{ color: string | null, note: string }`

##### `setRequestColor(uid: number, color: string | null): void`

设置请求的颜色标记。

- **参数**：
  - `uid` — 请求唯一标识
  - `color` — 颜色名称（`'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'gray'`）或 `null` 清除

##### `setRequestNote(uid: number, note: string): void`

设置请求的备注文本。

#### 常量

- `MAX_REQUESTS = 500` — 最大保留请求数

---

### filter.ts — `useFilterStore`

请求过滤与排序管理。

#### 导出接口

```typescript
interface FilterState {
    method: string       // HTTP 方法过滤
    type: string         // 资源类型过滤
    color: string        // 颜色标记过滤（'none' 表示无颜色）
    keyword: string      // 关键词过滤
    useRegex: boolean    // 正则模式
    caseSensitive: boolean // 大小写敏感
    invert: boolean      // 反向过滤
}

interface SortState {
    column: string | null  // 排序列（null 表示不排序）
    direction: 'asc' | 'desc'  // 排序方向
}
```

#### State

| 属性 | 类型 | 说明 |
|------|------|------|
| `filterState` | `FilterState` | 当前过滤条件 |
| `sortState` | `SortState` | 当前排序状态 |
| `displayedRequests` | `HarEntry[]` | 过滤排序后的显示列表 |
| `selectedUid` | `number \| null` | 当前选中请求的 UID |
| `selectedIndex` | `number` | 选中请求在显示列表中的索引（-1 表示未选中） |

#### Actions

##### `refreshDisplay(): void`

重新计算过滤和排序后的显示列表，并更新 `selectedIndex`。

##### `getFilteredRequests(networkStore): HarEntry[]`

按 method/type/color/keyword 过滤请求。

- 支持 `useRegex`（正则模式）和 `caseSensitive`（大小写敏感）
- `invert` 为 `true` 时返回**不匹配**过滤条件的请求

##### `getSortedRequests(requests, networkStore): HarEntry[]`

按 `sortState.column` 排序请求。支持 12 列排序：

`index`, `color`, `method`, `host`, `url`, `status`, `type`, `length`, `reqtime`, `restime`, `time`, `note`

##### `setFilter(key: keyof FilterState, value: any): void`

设置单个过滤条件并刷新显示。

##### `toggleFilter(key: 'useRegex' | 'caseSensitive' | 'invert'): void`

切换布尔型过滤开关并刷新显示。

##### `clearFilters(): void`

清空所有过滤条件并刷新显示。

##### `toggleSort(column: string): void`

切换排序：同列点击循环 `asc → desc → 无`，新列点击设为 `asc`。

##### `setSelectedUid(uid: number | null): void`

设置选中请求 UID 并刷新显示（更新 `selectedIndex`）。

---

### selection.ts — `useSelectionStore`

请求选择与面板内容管理。

#### 导出类型

```typescript
type LayoutType = 'vertical' | 'horizontal' | 'tabs'
type TabType = 'raw' | 'pretty' | 'hex'
```

#### 导出常量

```typescript
const COLOR_LIST = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'] as const

const COLOR_MAP: Record<string, string> = {
    red: '#dc3545', orange: '#fd7e14', yellow: '#ffc107', green: '#198754',
    blue: '#0d6efd', purple: '#6f42c1', pink: '#d63384', gray: '#6c757d'
}

const COLOR_NAMES: Record<string, string> = {
    red: '红色', orange: '橙色', yellow: '黄色', green: '绿色',
    blue: '蓝色', purple: '紫色', pink: '粉色', gray: '灰色'
}
```

#### 导出接口

```typescript
interface PaneContent {
    raw: string
    pretty: string
    hex: string
}
```

#### State

| 属性 | 类型 | 说明 |
|------|------|------|
| `currentRequest` | `HarEntry \| null` | 当前选中的请求 |
| `currentResponseBody` | `string` | 当前响应体内容 |
| `currentLayout` | `LayoutType` | 当前布局模式（默认 `'vertical'`） |
| `activeTab` | `{ request: TabType, response: TabType }` | 各面板激活的标签页 |
| `activePaneTab` | `'request' \| 'response'` | 标签页布局下当前显示的面板 |
| `showAdvancedFilter` | `boolean` | 是否显示高级过滤面板 |
| `tableRatio` | `number` | 请求列表区域占比（百分比） |
| `paneRatio` | `number` | 请求/响应面板占比（百分比） |
| `isLoadingBody` | `boolean` | 是否正在异步加载响应体 |
| `requestContent` | `PaneContent` | 请求报文三视图内容 |
| `responseContent` | `PaneContent` | 响应报文三视图内容 |
| `editingNoteUid` | `number \| null` | 正在编辑备注的请求 UID |
| `noteText` | `string` | 备注编辑文本 |

#### Actions

##### `selectRequest(request: HarEntry | null): void`

选中请求，构建 Raw/Pretty/Hex 三种视图内容。

- 调用 `filterStore.setSelectedUid()` 同步选中状态
- 请求报文同步构建；响应报文通过 `request.getContent()` 异步获取
- 根据 Content-Type 智能切换标签：JSON/XML → `pretty`，binary → `hex`，其他 → `raw`

##### `clearSelection(): void`

清除当前选择和面板内容。

##### `setLayout(layout: LayoutType): void`

切换布局模式。

##### `setActiveTab(pane: 'request' | 'response', tab: TabType): void`

切换指定面板的标签页（Raw/Pretty/Hex）。

##### `switchPaneTab(pane: 'request' | 'response'): void`

在标签页布局下切换显示请求/响应面板。

##### `getPaneText(pane: 'request' | 'response', tab: TabType): string`

获取指定面板和标签页的文本内容。

##### `setNoteEditing(uid: number | null, text: string = ''): void`

设置备注编辑状态。

---

### session.ts — `useSessionStore`

会话方案与字段管理。

#### State

| 属性 | 类型 | 说明 |
|------|------|------|
| `schemes` | `SessionScheme[]` | 所有方案列表 |
| `fields` | `SessionField[]` | 所有字段列表（独立存储） |
| `activeScheme` | `SessionScheme \| null` | 当前激活的方案 |
| `activeSchemeId` | `string \| null` | 激活方案 ID |
| `editingFieldId` | `string \| null` | 正在编辑的字段 ID |
| `editingSchemeId` | `string \| null` | 正在编辑的方案 ID |
| `fieldsSearchText` | `string` | 字段搜索文本 |
| `schemesSearchText` | `string` | 方案搜索文本 |

#### Getters

##### `filteredFields: SessionField[]`

按 `fieldsSearchText` 过滤字段列表（匹配 name/mode/pattern/location.name）。

##### `filteredSchemes: SessionScheme[]`

按 `schemesSearchText` 过滤方案列表（匹配 name/targetDomains/description）。

#### Actions

##### `async loadAll(): Promise<void>`

加载所有方案和字段，执行数据迁移，设置激活方案。

##### `async addField(field: SessionField): Promise<OperationResult>`

添加新字段（执行去重检查：name + pattern + mode）。

##### `async editField(field: SessionField): Promise<OperationResult>`

更新字段。

##### `async removeField(fieldId: string): Promise<void>`

删除字段，并从所有引用该字段的方案中移除关联。

##### `async toggleField(fieldId: string, enabled: boolean): Promise<void>`

切换字段启用/禁用状态。

##### `async addScheme(scheme: SessionScheme): Promise<OperationResult>`

添加新方案（执行去重检查：name + targetDomains + domainRegex）。

##### `async editScheme(scheme: SessionScheme): Promise<OperationResult>`

更新方案。

##### `async removeScheme(schemeId: string): Promise<void>`

删除方案。

##### `async activateScheme(schemeId: string | null): Promise<void>`

激活指定方案（自动停用其他方案），加载方案关联字段。

##### `checkSessionExtraction(request: HarEntry): { keys: string[]; data: Record<string, string> } | null`

检查请求是否匹配激活方案并提取会话信息。

---

### search.ts — `useSearchStore`

搜索状态管理（请求/响应面板独立）。

#### 导出接口

```typescript
interface PaneSearchState {
    text: string
    useRegex: boolean
    caseSensitive: boolean
    matches: SearchMatch[]
    currentIndex: number
}
```

#### State

| 属性 | 类型 | 说明 |
|------|------|------|
| `req` | `PaneSearchState` | 请求面板搜索状态 |
| `res` | `PaneSearchState` | 响应面板搜索状态 |

#### Actions

##### `performSearch(pane: 'req' | 'res', text: string): void`

设置搜索文本并初始化匹配模式（实际匹配在 composable 中执行）。

##### `setSearchText(pane: 'req' | 'res', text: string): void`

设置搜索文本。

##### `toggleRegex(pane: 'req' | 'res'): void`

切换正则模式。

##### `toggleCaseSensitive(pane: 'req' | 'res'): void`

切换大小写敏感。

##### `setMatches(pane: 'req' | 'res', matches: SearchMatch[]): void`

设置匹配结果并重置当前索引。

##### `navigateMatch(pane: 'req' | 'res', direction: 'prev' | 'next'): void`

导航到上一个/下一个匹配（循环导航）。

##### `clearSearch(pane: 'req' | 'res'): void`

清空搜索文本和匹配结果。

##### `getMatchCount(pane: 'req' | 'res'): number`

获取匹配总数。

##### `getSearchCountText(pane: 'req' | 'res'): string`

获取高亮计数文本（格式如 `"1/5 个高亮"` 或 `"0 个高亮"`）。

---

## Services

### session-extractor.ts

会话信息提取核心逻辑。

#### 导出接口

```typescript
interface FieldLocation {
    type: string   // 'header' | 'body' | 'response-header' | 'response-body'
    name: string   // header 名称或 body 标识
}

interface ExtractResult {
    [key: string]: string
}

interface FieldOptions {
    startOffset?: number
    endOffset?: number
    caseSensitive?: boolean
    groupIndex?: number
    context?: number
}
```

#### 导出函数

##### `extractSession(request: HarEntry, scheme: SessionScheme): ExtractResult | null`

按方案提取会话字段，返回 `{ fieldName: value, ... }`。无匹配时返回 `null`。

> **注意**：同步方法不支持 `response-body` 类型字段，遇到时会输出警告日志并跳过。如需提取响应体，请使用 `extractSessionAsync`。

##### `extractSessionAsync(request: HarEntry, scheme: SessionScheme): Promise<ExtractResult | null>`

异步提取会话字段，支持 `response-body` 类型字段。

- 若 `scheme.fields` 为空，自动调用 `getSchemeFields()` 从存储填充
- 对 `response-body` 字段，通过 `request.getContent()` 异步获取响应体后提取
- 响应体获取超时时间 5000ms

##### `extractByMode(source: string, field: SessionField): string | null`

按字段配置的匹配模式提取内容。支持模式：

| 模式 | 说明 | options |
|------|------|---------|
| `full` | 完整值返回（不提取） | 无需 pattern |
| `substring` | 子字符串匹配 | `startOffset`, `endOffset` |
| `regex` | 正则表达式（支持捕获组） | `caseSensitive`, `groupIndex` |
| `keyword` | 关键词匹配（提取上下文） | `context`（默认 50 字符） |
| `xpath` | XPath 表达式（XML/HTML） | — |
| `jsonpath` | JSONPath 表达式（JSON） | — |

##### `getFieldSource(request: HarEntry, location: FieldLocation): string | null`

从请求中获取指定位置的数据源字符串。

- `'header'`：返回请求中指定 Header 的值
- `'body'`：返回请求体文本
- `'response-header'`：返回响应中指定 Header 的值
- `'response-body'`：不包括（`null`），需通过 `extractSessionAsync` 异步处理

##### `applySchemeToRequest(request: HarEntry, scheme: SessionScheme): ExtractResult | null`

应用方案到请求（检查激活状态和域名匹配），返回提取结果或 `null`。

> **已废弃**：请使用 `applySchemeToRequestAsync` 以支持响应体提取。

##### `applySchemeToRequestAsync(request: HarEntry, scheme: SessionScheme): Promise<ExtractResult | null>`

异步应用方案到请求，支持 `response-body` 字段提取。

##### `formatExtractResult(result: ExtractResult, scheme: SessionScheme): string`

按方案的输出格式配置格式化提取结果：
- `'key=value'`（默认）：`key=value\nkey=value...`
- `'json'`：JSON 格式化输出
- `'custom'`：使用 `scheme.outputTemplate` 模板（`{{fieldName}}` 占位符替换）

##### `isSchemeApplicable(request: HarEntry, scheme: SessionScheme): boolean`

检查请求是否匹配方案的域名规则。

- 支持域名列表匹配（含子域名）
- 支持域名正则匹配
- 未设置域名规则时默认匹配所有请求

---

### session-storage.ts

会话方案和字段的持久化存储（基于 `chrome.storage.local`）。

#### 导出接口

```typescript
interface OperationResult {
    success: boolean
    message?: string
    field?: SessionField
    scheme?: SessionScheme
}
```

#### 字段 CRUD

##### `async loadAllFields(): Promise<SessionField[]>`

加载所有字段。

##### `async saveField(field: SessionField): Promise<OperationResult>`

保存新字段（执行去重检查：name + pattern + mode 相同则拒绝）。

##### `async updateField(field: SessionField): Promise<OperationResult>`

更新字段。

##### `async deleteField(fieldId: string): Promise<OperationResult>`

删除字段，并从所有引用该字段的方案中移除关联。

##### `async toggleFieldEnabled(fieldId: string, enabled: boolean): Promise<OperationResult>`

切换字段启用/禁用状态。

#### 方案 CRUD

##### `async loadSchemes(): Promise<SessionScheme[]>`

加载所有方案。

##### `async saveScheme(scheme: SessionScheme): Promise<OperationResult>`

保存新方案（执行去重检查：name + targetDomains + domainRegex 相同则拒绝）。

##### `async updateScheme(scheme: SessionScheme): Promise<OperationResult>`

更新方案。

##### `async deleteScheme(schemeId: string): Promise<OperationResult>`

删除方案。

#### 方案-字段关联

##### `async getSchemeFields(schemeId: string): Promise<SessionField[]>`

获取方案关联的字段列表。

##### `async setSchemeFields(schemeId: string, fieldIds: string[]): Promise<OperationResult>`

设置方案的关联字段列表。

##### `async getFieldSchemes(fieldId: string): Promise<SessionScheme[]>`

获取引用指定字段的所有方案。

#### 激活方案管理

##### `async getActiveScheme(): Promise<string | null>`

获取当前激活方案 ID。

##### `async setActiveScheme(schemeId: string | null): Promise<OperationResult>`

激活指定方案（自动停用其他方案）。

#### 数据迁移

##### `async migrateIfNeeded(): Promise<void>`

检查并执行旧格式数据迁移（从 schemeId 嵌套字段迁移到独立字段存储）。

---

## Composables

### useFullscreenOverlay.ts

```typescript
function useFullscreenOverlay(): {
    isFullscreen: Ref<boolean>
    overlayRef: Ref<InstanceType<typeof FullscreenOverlay> | null>
    target: ComputedRef<HTMLElement | null>
    toggle: () => void
}
```

全屏覆盖层状态管理。`target` 为 Teleport 目标元素。

---

### useNetworkListener.ts

```typescript
function useNetworkListener(): {
    init: () => void
}
```

初始化网络监听。调用后注册 `chrome.devtools.network.onRequestFinished` 监听，新请求到达时：
1. 调用 `filterStore.refreshDisplay()` 刷新显示列表
2. 调用 `sessionStore.checkSessionExtraction()` 检查会话提取
3. 提取成功时通过 PrimeVue Toast 显示通知

使用 `initialized` 标志确保只初始化一次。

---

### useResize.ts

```typescript
function useResize(options: {
    direction: 'horizontal' | 'vertical'
    onResize: (ratio: number) => void
    minRatio?: number   // 默认 10
    maxRatio?: number   // 默认 90
}): {
    isDragging: Ref<boolean>
    startResize: (e: MouseEvent, elA: HTMLElement, elB: HTMLElement) => void
}
```

面板大小拖拽调整。`startResize` 接收两个相邻面板元素，拖拽时计算比例并回调。

---

### useLineCopy.ts

行复制功能和换行符可视化。

#### 导出常量

```typescript
const LINE_HEIGHT = 11 * 1.4  // 行高 ≈ 15.4px
```

#### 导出函数

```typescript
// 根据鼠标点击位置和内容文本计算所在行索引及内容
function getLineFromClick(
    e: MouseEvent,
    containerEl: HTMLElement,
    content: string
): { index: number; text: string } | null

// 根据 textarea 光标位置获取当前行
function getCurrentLineFromTextarea(
    el: HTMLTextAreaElement
): { index: number; text: string } | null

// 复制指定行到剪贴板（异步返回成功状态），自动去除行尾 ↵ 标记
async function copyLineContent(text: string, lineIdx: number): Promise<{ ok: boolean; lineIdx: number }>

// 为报文内容添加换行符可视化标记（在每行末尾追加 ↵）
function applyLineBreakMarkers(content: string, enabled: boolean): string

// 处理 Ctrl+Shift+C 快捷键复制当前行，返回 true 表示已处理
function handleLineCopyShortcut(e: KeyboardEvent, copyFn: () => void): boolean

// 将纯文本内容渲染为带换行符标记的 HTML
function renderContentWithLineBreaks(content: string, showBreaks: boolean): string
```

---

### useSearchHighlight.ts

```typescript
function useSearchHighlight(pane: 'req' | 'res'): {
    performSearch: (text: string) => SearchMatch[]
    searchAndHighlight: (textarea: HTMLTextAreaElement | null) => void
    highlightHexView: (el: HTMLElement | null) => void
    highlightPrettyView: (codeEl: HTMLElement | null) => void
    clearHighlights: () => void
    refreshHighlight: () => void
    navigateMatch: (direction: 'prev' | 'next') => void
}
```

搜索高亮逻辑。

- `performSearch(text)`：执行正则/普通搜索，返回匹配位置数组
- `searchAndHighlight(textarea)`：在 textarea overlay 上高亮（Raw 视图）
- `highlightHexView(el)`：在 Hex 视图元素上高亮
- `highlightPrettyView(codeEl)`：在 Pretty 视图 `<code>` 元素上高亮
- `clearHighlights()`：清除当前面板高亮
- `refreshHighlight()`：根据当前标签页类型刷新高亮
- `navigateMatch(direction)`：导航匹配并滚动定位

---

## Utils

### clipboard-utils.ts

```typescript
// 复制文本到剪贴板（降级使用 document.execCommand）
async function copyText(text: string): Promise<boolean>

// 下载文本为文件（通过 Blob 触发）
function downloadText(text: string, filename: string): void
```

---

### content-formatter.ts

```typescript
// 检测内容类型
function detectContentType(headers: HarHeader[]): string  // 'json' | 'xml' | 'binary' | 'text'

// 格式化 body
function formatBody(body: string, contentType: string): string

// 构建原生报文
function buildRawRequest(req: HarRequest): string
function buildRawResponse(res: HarResponse, body: string): string

// 构建格式化报文（JSON/XML 自动缩进）
function buildPrettyRequest(req: HarRequest): string
function buildPrettyResponse(res: HarResponse, body: string): string

// 构建 Hex 视图
function buildHexRequest(req: HarRequest): string
function buildHexResponse(res: HarResponse, body: string): string

// 从 HAR Entry 构建报文的便捷方法
function buildRawRequestFromEntry(entry: HarEntry): string
function buildRawResponseFromEntry(entry: HarEntry, body: string): string
function buildPrettyRequestFromEntry(entry: HarEntry): string
function buildPrettyResponseFromEntry(entry: HarEntry, body: string): string
function buildHexRequestFromEntry(entry: HarEntry): string
function buildHexResponseFromEntry(entry: HarEntry, body: string): string
```

---

### dom-utils.ts

#### 导出接口

```typescript
interface SearchMatch {
    start: number
    end: number
}
```

#### 导出函数

```typescript
// 防抖函数
function debounce<T extends (...args: any[]) => void>(
    fn: T, delay: number
): (...args: Parameters<T>) => void

// 同步行号（支持传入 content 覆盖 textarea.value）
function updateLineNumbers(
    textarea: HTMLTextAreaElement | null,
    lineNumbersEl: HTMLElement | null,
    content?: string
): void

// 在覆盖层上渲染高亮（支持当前匹配高亮）
function highlightOverlay(
    overlay: HTMLDivElement | null,
    text: string,
    matches: SearchMatch[],
    currentIndex?: number  // 默认 -1，高亮当前匹配
): void

// 清除覆盖层
function clearOverlay(overlay: HTMLDivElement | null): void
```

---

### string-utils.ts

```typescript
// HTML 实体转义
function escapeHtml(text: string): string

// 截断 URL 显示路径部分（pathname + search）
function truncateUrl(url: string): string

// 格式化 JSON（parse + stringify with 2-space indent）
function formatJson(body: string): string

// 格式化 XML（基于标签层级的缩进）
function formatXml(body: string): string

// 字符串转 Hex 十六进制显示（含 offset/ascii 列，每行 16 字节）
function stringToHex(body: string): string

// 根据 Content-Type 检测内容类型
function detectContentType(headers: HarHeader[]): string  // 'json' | 'xml' | 'binary' | 'text'

// 格式化时间戳（YYYY-MM-DD HH:mm:ss.SSS，毫秒精度）
function formatTimestamp(date: Date | string | number): string

// 获取资源分类（比 detectContentType 更细粒度）
function getResourceCategory(request: HarEntry | null): string
// 返回: 'json' | 'xml' | 'html' | 'js' | 'css' | 'image' | 'font' | 'binary' | 'text' | 'other'
```

---

### debug-logger.ts

调试日志工具模块，支持模块化日志与 popup 面板开关控制。

#### 导出接口

```typescript
interface DebugLogger {
    log(...args: unknown[]): void       // 普通日志（调试模式关闭时静默）
    warn(...args: unknown[]): void      // 警告日志（调试模式关闭时静默）
    error(...args: unknown[]): void     // 错误日志（始终输出）
    group(label: string): void          // 分组开始
    groupEnd(): void                    // 分组结束
    time(label: string): void           // 计时开始
    timeEnd(label: string): void        // 计时结束
    readonly moduleName: string         // 模块名
}
```

#### 导出函数

```typescript
// 创建带模块标识的调试 logger
// 使用: const logger = createLogger('extract'); logger.log('提取开始...')
function createLogger(moduleName: string): DebugLogger

// 同步获取调试模式状态（可能不准确，推荐异步方法）
function isDebugEnabled(): boolean

// 等待初始化完成后获取调试模式状态
async function isDebugEnabledAsync(): Promise<boolean>

// 设置调试模式并持久化到 chrome.storage.local
async function setDebugEnabled(enabled: boolean): Promise<void>

// 全局便捷调试日志（无模块标识）
function debugLog(...args: unknown[]): void

// 初始化调试状态监听（在应用入口 main.ts 调用，确保 panel 能响应 popup 中的状态变更）
function initDebugModeListener(): void
```

#### 日志格式

```
[http helper][模块名][HH:MM:SS.sss] 消息内容
```

---

## 类型定义 (har.d.ts)

```typescript
interface HarHeader {
    name: string
    value: string
}

interface HarPostData {
    text?: string
    params?: Array<{ name: string; value: string }>
}

interface HarContent {
    size: number
    mimeType: string
}

interface HarRequest {
    method: string
    url: string
    headers: HarHeader[]
    postData?: HarPostData
}

interface HarResponse {
    status: number
    statusText: string
    headers: HarHeader[]
    content?: HarContent
}

interface HarEntry {
    request: HarRequest
    response: HarResponse
    startedDateTime: string
    time: number
    getContent: (callback: (body: string, encoding: string) => void) => void
    _uid?: number
    _reqStartTime?: string | null
    _resEndTime?: string | null
    _resourceType?: string
}

interface SessionField {
    id: string
    name: string
    location: { type: string; name: string }
    mode: string
    pattern: string
    enabled: boolean
    createdAt?: number
    updatedAt?: number
    options?: {
        startOffset?: number
        endOffset?: number
        caseSensitive?: boolean
        groupIndex?: number
        context?: number
    }
}

interface SessionScheme {
    id: string
    name: string
    targetDomains: string[]
    domainRegex: string
    description: string
    fieldIds: string[]
    isActive: boolean
    fields?: SessionField[]
    outputFormat?: 'key=value' | 'json' | 'custom'
    outputTemplate?: string
    createdAt?: number
    updatedAt?: number
}

interface RequestMeta {
    color: string | null
    note: string
}
```

---

## 应用入口 (main.ts)

```typescript
// 初始化调试模式状态监听（确保 panel 能响应 popup 中的调试模式切换）
initDebugModeListener()

// 注册 highlight.js 语言（http、json、xml）
hljs.registerLanguage('http', http)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)

// 创建 Vue 应用
const app = createApp(App)

// 安装 Pinia 状态管理
app.use(createPinia())

// 配置 PrimeVue（Aura 主题，暗色模式自适应，禁用 Toast/Dialog 关闭按钮 autofocus）
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '@media (prefers-color-scheme: dark)'
        }
    },
    pt: {
        toast: {
            closeButton: { autofocus: false }
        },
        dialog: {
            pcCloseButton: { root: { autofocus: false } },
            pcMaximizeButton: { root: { autofocus: false } }
        }
    }
})

// 注册 Toast 服务和 Tooltip 指令
app.use(ToastService)
app.directive('tooltip', Tooltip)

// 挂载
app.mount('#app')
```
