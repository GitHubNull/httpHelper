# 开发者指南

## 目录

1. [开发环境搭建](#开发环境搭建)
2. [项目架构](#项目架构)
3. [模块开发规范](#模块开发规范)
4. [调试与测试](#调试与测试)
5. [发布流程](#发布流程)
6. [常见问题](#常见问题)

---

## 开发环境搭建

### 前置要求

- Chrome 浏览器 88+（支持 Manifest V3）
- 任意代码编辑器（推荐 VS Code）
- Git（版本管理）

### 本地加载开发

1. 克隆项目到本地
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角 **开发者模式**
4. 点击 **加载已解压的扩展程序**
5. 选择项目根目录（包含 `manifest.json` 的文件夹）
6. 在 DevTools 中找到 **Raw HTTP** 面板即可开始调试

### 热重载

修改源码后，在 `chrome://extensions/` 页面点击扩展卡片的 **刷新** 按钮（圆形箭头图标）即可重新加载。

> 注意：修改 `manifest.json` 后需要点击 **刷新** 才能生效；修改 JS/CSS/HTML 文件后，关闭并重新打开 DevTools 面板即可看到更新。

---

## 项目架构

### 目录结构

```
httpHelper/
├── src/                        # 源码目录
│   ├── manifest.json           # 扩展清单
│   ├── devtools.html           # DevTools 入口页
│   ├── devtools.js             # 注册 DevTools 面板
│   ├── panel.html              # 主面板 HTML
│   ├── panel.js                # 主入口模块（模块协调）
│   ├── panel.css               # 主面板样式
│   ├── third_lib/              # 第三方依赖（Bootstrap 5.3.8, jQuery 4.0.0）
│   ├── modules/                # 功能模块
│   │   ├── network-handler.js      # 网络请求捕获
│   │   ├── content-formatter.js    # 报文格式化
│   │   ├── ui-renderer.js          # UI 渲染
│   │   ├── layout-manager.js       # 布局管理
│   │   ├── search-highlighter.js   # 搜索高亮
│   │   ├── session-extractor.js    # 会话提取逻辑
│   │   └── session-storage.js      # 会话持久化存储
│   └── utils/                  # 通用工具模块
│       ├── clipboard-utils.js  # 剪贴板与下载
│       ├── dom-utils.js        # DOM 工具
│       └── string-utils.js     # 字符串处理
├── doc/                        # 文档目录
│   ├── usage-guide.md          # 用户使用教程
│   ├── developer-guide/        # 开发者文档
│   │   ├── index.md            # 本文件
│   │   ├── architecture.md     # 架构设计文档
│   │   ├── module-api.md       # 模块 API 参考
│   │   └── contributing.md     # 贡献指南
│   └── CHANGELOG.md            # 变更日志
├── README.md                   # 项目说明
└── AGENTS.md                   # 智能体开发指南
```

### 模块依赖关系

```
panel.js (入口)
  ├── NetworkHandler ──→ chrome.devtools.network
  ├── ContentFormatter
  ├── UiRenderer ──────→ LayoutManager
  ├── LayoutManager
  ├── SearchHighlighter
  ├── SessionExtractor ──→ SessionStorage
  ├── ClipboardUtils
  ├── DomUtils
  └── StringUtils
```

所有模块通过 ES Module `import`/`export` 导入导出，无循环依赖。

---

## 模块开发规范

### 创建新模块

1. 在 `src/modules/` 或 `src/utils/` 中创建新的 `.js` 文件
2. 使用默认导出：`export default class MyModule { ... }`
3. 在 `panel.js` 中导入：`import MyModule from './modules/my-module.js'`
4. 在 `panel.js` 的初始化逻辑中调用模块方法

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件 | kebab-case | `network-handler.js` |
| 类名 | PascalCase | `NetworkHandler` |
| 方法 | camelCase | `initNetworkListener()` |
| 常量 | UPPER_SNAKE_CASE | `MAX_REQUESTS` |
| 私有方法 | 下划线前缀 | `_privateMethod()` |

### 编码规范

- 使用 ES Module 组织代码，模块职责单一
- `panel.js` 使用 IIFE 包裹，避免全局污染
- 字符串拼接原生报文时使用 `\r\n` 作为 HTTP 行分隔符
- 所有 DOM 操作前检查元素存在性
- 异步操作（如 `getContent`）有 loading 状态提示
- 优先使用原生 API，减少对 jQuery 的依赖（jQuery 仅用于 Bootstrap 组件）

### 错误处理

```javascript
try {
  // 操作
} catch (err) {
  console.error('[ModuleName] Error:', err);
  showToast('操作失败: ' + err.message);
}
```

---

## 调试与测试

### Chrome DevTools 调试

1. 打开任意网页，按 `F12` 打开 DevTools
2. 切换到 **Raw HTTP** 面板
3. 右键点击面板内容，选择 **检查** 可打开嵌套 DevTools（DevTools 中的 DevTools）
4. 在 Console 中查看日志和错误

### 日志规范

```javascript
// 模块日志统一前缀
console.log('[NetworkHandler] Request captured:', req.url);
console.error('[SessionExtractor] Parse failed:', err);
```

### 手动测试清单

每次修改后，按以下清单验证：

- [ ] 扩展正常加载，无控制台报错
- [ ] 刷新页面，请求列表正常捕获
- [ ] 点击请求，右侧显示请求/响应报文
- [ ] 行号与文本行严格对齐
- [ ] Copy 按钮可复制内容到剪贴板
- [ ] Download 按钮可下载 `.txt` 文件
- [ ] Raw / Pretty / Hex 视图切换正常
- [ ] 垂直 / 水平 / 标签页 布局切换正常
- [ ] 搜索功能高亮和导航正常
- [ ] 会话提取 Scheme 创建/激活/提取正常
- [ ] 亮/暗主题切换正常

---

## 发布流程

### 版本号规范

采用语义化版本（SemVer）：`MAJOR.MINOR.PATCH`

- `MAJOR`：不兼容的 API 变更
- `MINOR`：向下兼容的功能新增
- `PATCH`：向下兼容的问题修复

### 发布步骤

1. 更新 `manifest.json` 中的 `version` 字段
2. 更新 `doc/CHANGELOG.md`，记录本次变更
3. 运行完整测试清单
4. 打包扩展：`chrome://extensions/` → **打包扩展程序**
5. 生成的 `.crx` 和 `.pem` 文件妥善保管
6. 在 Git 中打标签：`git tag v1.x.x`

---

## 常见问题

### Q1：修改代码后没有生效？

- 确认在 `chrome://extensions/` 页面点击了 **刷新** 按钮
- 确认修改的是正确的文件路径（注意 `src/` 前缀）
- 关闭并重新打开 DevTools 面板

### Q2：模块导入报错 `Cannot use import statement outside a module`？

- 确认 `panel.html` 中 `<script>` 标签包含 `type="module"`
- 确认文件路径正确（相对路径从 `panel.js` 出发）

### Q3：Bootstrap 组件不工作？

- 确认 `panel.html` 中先引入 jQuery，再引入 Bootstrap JS
- 确认 `bootstrap.bundle.min.js` 包含 Popper（用于 tooltip/dropdown）

### Q4：`chrome.storage.local` 数据读写失败？

- 确认 `manifest.json` 中声明了 `"permissions": ["storage"]`（如需要）
- 检查存储配额是否超限（约 5MB）
- 使用 `chrome.storage.local.get/set` 的回调或 Promise 处理异步结果

### Q5：如何调试 session-extractor 的提取逻辑？

在 Console 中手动测试：

```javascript
// 获取当前请求列表
const requests = NetworkHandler.getRequests();
const req = requests[0];

// 测试 Scheme 提取
const scheme = { name: 'Test', targetDomains: ['example.com'], fields: [...] };
const result = SessionExtractor.extractSession(req, scheme);
console.log(result);
```
