# 模块 API 参考

## network-handler.js

### 类：`NetworkHandler`

#### `initNetworkListener(callback)`

初始化网络请求监听。

- **参数**：
  - `callback(requests, newRequest)` — 新请求到达时的回调
- **说明**：内部调用 `chrome.devtools.network.onRequestFinished.addListener()`

#### `getRequests()`

获取所有已捕获的请求列表。

- **返回**：`Array<Request>` — 请求对象数组

#### `getRequest(index)`

获取指定索引的请求。

- **参数**：
  - `index` — 请求索引
- **返回**：`Request` — 请求对象

#### `clearRequests()`

清空所有请求。

---

## content-formatter.js

### 类：`ContentFormatter`

#### `buildRawRequest(req)`

构建原生 HTTP 请求报文。

- **参数**：
  - `req` — Chrome DevTools Request 对象
- **返回**：`String` — 原生报文字符串

#### `buildRawResponse(res, body)`

构建原生 HTTP 响应报文。

- **参数**：
  - `res` — Response 对象
  - `body` — 响应体内容
- **返回**：`String` — 原生报文字符串

#### `buildPrettyRequest(req)`

构建格式化请求报文（JSON/XML 自动缩进）。

- **返回**：`String`

#### `buildPrettyResponse(res, body)`

构建格式化响应报文。

- **返回**：`String`

#### `buildHexRequest(req)`

构建请求 Hex 视图。

- **返回**：`String`

#### `buildHexResponse(res, body)`

构建响应 Hex 视图。

- **返回**：`String`

#### `detectContentType(headers)`

检测内容类型。

- **参数**：
  - `headers` — HTTP 头部数组
- **返回**：`'json' | 'xml' | 'binary' | 'text'`

---

## ui-renderer.js

### 类：`UiRenderer`

#### `renderRequestList(requests, selectedIndex, onSelect)`

渲染请求列表。

- **参数**：
  - `requests` — 请求数组
  - `selectedIndex` — 当前选中索引
  - `onSelect(index)` — 点击回调

#### `switchTab(pane, tabName)`

切换指定面板的标签页。

- **参数**：
  - `pane` — `'request'` 或 `'response'`
  - `tabName` — `'raw' | 'pretty' | 'hex'`

#### `updatePaneContent(pane, tabName, content)`

更新面板内容并同步行号。

- **参数**：
  - `pane` — `'request'` 或 `'response'`
  - `tabName` — 当前标签名
  - `content` — 要显示的内容

#### `getActiveTab(pane)` / `setActiveTab(pane, tabName)`

获取/设置活动标签。

---

## layout-manager.js

### 类：`LayoutManager`

#### `switchLayout(layout)`

切换布局模式。

- **参数**：
  - `layout` — `'vertical' | 'horizontal' | 'tabs'`

#### `initLayoutButtons(container)`

初始化布局按钮事件绑定。

- **参数**：
  - `container` — 按钮容器 DOM 元素

#### `showRequestPane()` / `showResponsePane()`

在标签页布局下切换显示请求/响应面板。

---

## search-highlighter.js

### 类：`SearchHighlighter`

#### `initSearch(container, onSearch)`

初始化搜索控件。

- **参数**：
  - `container` — 搜索控件容器
  - `onSearch(pattern, options)` — 搜索回调

#### `performSearch(text, pattern, options)`

执行搜索。

- **参数**：
  - `text` — 搜索文本
  - `pattern` — 搜索关键词/正则
  - `options` — `{ regex: boolean, caseSensitive: boolean }`
- **返回**：`Array<Match>` — 匹配结果数组

#### `highlightMatches()` / `highlightHexMatches()`

高亮匹配结果。

#### `navigateMatch(direction)`

导航到上一个/下一个匹配。

- **参数**：
  - `direction` — `'prev' | 'next'`

---

## session-extractor.js

### 类：`SessionExtractor`

#### `extractSession(request, scheme)`

按方案提取会话字段。

- **参数**：
  - `request` — HTTP 请求对象
  - `scheme` — Scheme 配置对象
- **返回**：`Object` — 提取结果 `{ fieldName: value, ... }`

#### `applySchemeToRequest(request, scheme)`

应用方案到请求（检查激活状态和域名匹配）。

- **返回**：`boolean` — 是否匹配并提取

#### `extractByMode(source, field)`

按模式提取内容。

- **参数**：
  - `source` — 源字符串（Header 值或 Body）
  - `field` — 字段配置 `{ mode, pattern, ... }`
- **返回**：`String` — 提取结果

#### `isSchemeApplicable(request, scheme)`

检查请求是否匹配 Scheme 的域名规则。

- **返回**：`boolean`

---

## session-storage.js

### 类：`SessionStorage`

#### `loadSchemes()`

加载所有 Scheme。

- **返回**：`Promise<Array<Scheme>>`

#### `saveScheme(scheme)`

保存新 Scheme。

- **返回**：`Promise<Scheme>`

#### `updateScheme(scheme)`

更新 Scheme。

#### `deleteScheme(schemeId)`

删除 Scheme。

#### `loadFields(schemeId)`

加载 Scheme 的字段列表。

- **返回**：`Promise<Array<Field>>`

#### `saveField(schemeId, field)` / `updateField(schemeId, field)` / `deleteField(schemeId, fieldId)`

字段的增删改。

#### `getActiveScheme()` / `setActiveScheme(schemeId)`

获取/设置激活的 Scheme。

---

## clipboard-utils.js

### 类：`ClipboardUtils`

#### `copyText(text, msg)`

复制文本到剪贴板。

- **参数**：
  - `text` — 要复制的文本
  - `msg` — 成功提示消息（可选）

#### `downloadText(text, filename)`

下载文本为文件。

- **参数**：
  - `text` — 文件内容
  - `filename` — 文件名

#### `showToast(msg, duration)`

显示右下角提示。

- **参数**：
  - `msg` — 提示文本
  - `duration` — 显示时长（毫秒，默认 2000）

---

## dom-utils.js

### 类：`DomUtils`

#### `debounce(fn, delay)`

防抖函数。

- **参数**：
  - `fn` — 原函数
  - `delay` — 延迟毫秒数
- **返回**：防抖后的函数

#### `updateLineNumbers(textarea, lineNumbersEl)`

同步更新行号。

- **参数**：
  - `textarea` — 文本域元素
  - `lineNumbersEl` — 行号容器元素

#### `createOverlayHighlighter(textarea)`

创建搜索高亮覆盖层。

- **返回**：覆盖层 DOM 元素

#### `highlightOverlay(overlay, text, matches)`

在覆盖层上渲染高亮。

---

## string-utils.js

### 类：`StringUtils`

#### `escapeHtml(text)`

HTML 实体转义。

#### `truncateUrl(url, maxLength)`

截断 URL 显示路径部分。

- **默认**：`maxLength = 60`

#### `formatJson(body)` / `formatXml(body)`

格式化 JSON/XML。

#### `stringToHex(body)`

字符串转 Hex 十六进制显示。

- **返回**：带偏移量和 ASCII 的格式化字符串

#### `detectContentType(headers)`

根据 Content-Type 检测内容类型。

- **返回**：`'json' | 'xml' | 'binary' | 'text'`
