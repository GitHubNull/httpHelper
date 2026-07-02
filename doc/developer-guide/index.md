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

- Node.js 18+（推荐 LTS 版本）
- pnpm（包管理器）
- Chrome 浏览器 88+（支持 Manifest V3）
- 代码编辑器（推荐 VS Code + Volar 插件）
- Git（版本管理）

### 安装与构建

```bash
# 安装依赖
pnpm install

# 开发模式（带 HMR 热更新）
pnpm dev

# 生产构建
pnpm build
```

### 本地加载开发

1. 克隆项目到本地
2. 执行 `pnpm install && pnpm build`
3. 打开 Chrome，访问 `chrome://extensions/`
4. 开启右上角 **开发者模式**
5. 点击 **加载已解压的扩展程序**
6. 选择 `dist` 目录（构建输出目录）
7. 在 DevTools 中找到 **http helper** 面板即可开始调试

### 热重载

- **开发模式**：执行 `pnpm dev` 启动 Vite 开发服务器，支持 HMR 热更新
- **生产构建**：修改源码后执行 `pnpm build`，然后在 `chrome://extensions/` 点击扩展卡片的 **刷新** 按钮

> 注意：修改 `manifest.json` 后需要点击 **刷新** 才能生效；修改 Vue/TS 文件后，关闭并重新打开 DevTools 面板即可看到更新。

---

## 项目架构

### 目录结构

```
httpHelper/
├── src/                        # Vite 项目根目录
│   ├── manifest.json           # 扩展清单（@crxjs 构建用）
│   ├── panel.html              # 面板入口 HTML
│   ├── devtools.html           # DevTools 入口 HTML
│   ├── popup.html              # 工具栏弹出页 HTML（版本显示/调试开关）
│   └── src/                    # Vue 3 源码目录
│       ├── App.vue             # 根组件（Tab 布局、全屏覆盖层）
│       ├── main.ts             # 应用入口（Pinia、PrimeVue、highlight.js 初始化）
│       ├── devtools.ts         # DevTools 面板注册
│       ├── popup.ts            # 弹出页入口（版本显示/调试开关）
│       ├── components/         # Vue 组件目录
│       │   ├── http-history/   # HTTP 历史功能组件（14 个）
│       │   ├── session-config/ # 会话配置功能组件（7 个）
│       │   ├── toolbar/        # 工具栏组件（1 个）
│       │   └── common/         # 通用组件（4 个）
│       ├── composables/        # 组合式 API（5 个）
│       ├── services/           # 业务服务（会话提取/存储）
│       ├── stores/             # Pinia 状态管理（5 个 store）
│       ├── utils/              # 工具函数（5 个模块，含调试日志）
│       ├── types/              # TypeScript 类型定义
│       └── styles/             # 全局样式
├── dist/                       # 构建输出目录
├── doc/                        # 文档目录
├── vite.config.ts              # Vite 构建配置
├── tsconfig.json               # TypeScript 配置
├── package.json                # 项目依赖与脚本
├── README.md                   # 项目说明
└── AGENTS.md                   # 智能体开发指南
```

> 完整的模块说明和组件层次请参阅 [架构设计文档](architecture.md) 和 [AGENTS.md](../../AGENTS.md)。

### 模块依赖关系

```
main.ts (应用入口)
  ├── PrimeVue (UI 框架)
  ├── Pinia (状态管理)
  │   ├── networkStore ──→ chrome.devtools.network
  │   ├── filterStore ──→ networkStore (过滤读取请求和元数据)
  │   ├── selectionStore ──→ filterStore (选择同步选中索引)
  │   ├── sessionStore ──→ session-extractor / session-storage
  │   └── searchStore ──→ selectionStore (读取面板内容)
  ├── useNetworkListener (composable)
  │   └── 初始化网络监听 + 会话提取检查
  ├── debug-logger (util)
  │   └── 所有模块（store/service/composable）通过 createLogger 获取调试日志
  └── App.vue (根组件)
      ├── ToolbarBar.vue
      ├── HttpHistoryTab.vue
      └── SessionConfigTab.vue
```

> API 详细签名请参阅 [模块 API 参考](module-api.md)。

---

## 模块开发规范

### 创建新组件

1. 在 `src/src/components/` 对应子目录中创建 `.vue` 文件
2. 使用三段式结构：`<template>` → `<script lang="ts" setup>` → `<style scoped>`
3. 在父组件中导入使用
4. 如需状态管理，在对应 Pinia store 中添加 action

```vue
<template>
    <!-- 模板内容，4 空格缩进 -->
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
// 业务逻辑
</script>

<style scoped>
/* 组件样式 */
</style>
```

### 创建新 Pinia Store

1. 在 `src/src/stores/` 中创建 `.ts` 文件
2. 使用 Options API 风格（`state` / `getters` / `actions`）
3. 在组件中通过 `useXxxStore()` 获取实例

```typescript
import { defineStore } from 'pinia'

export const useXxxStore = defineStore('xxx', {
    state: () => ({
        // 状态
    }),
    getters: {
        // 计算属性
    },
    actions: {
        // 方法
    }
})
```

### 创建新 Composable

1. 在 `src/src/composables/` 中创建 `.ts` 文件
2. 导出 `useXxx` 函数，返回响应式状态和方法

### 创建新 Service

1. 在 `src/src/services/` 中创建 `.ts` 文件
2. 导出纯函数，不依赖 Vue 响应式系统
3. 在 store 的 actions 中调用

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| Vue 组件文件 | PascalCase | `RequestTable.vue` |
| TS 模块文件 | kebab-case | `session-extractor.ts` |
| 目录名 | kebab-case | `http-history/` |
| 组件名 | PascalCase | `RequestTable` |
| Store | camelCase + `Store` 后缀 | `useNetworkStore` |
| Composable | `use` 前缀 + PascalCase | `useSearchHighlight`、`useLineCopy` |
| 方法 | camelCase | `selectRequest()` |
| 常量 | UPPER_SNAKE_CASE | `MAX_REQUESTS`、`LINE_HEIGHT` |
| 类型/接口 | PascalCase | `HarEntry` |

### 编码规范

- 使用 TypeScript 严格模式（`strict: true`）
- Vue 组件使用 `<script setup>` 语法
- Pinia store 采用 Options API 风格（`state`/`getters`/`actions`）
- 路径别名 `@` 映射到 `src/src/`
- 字符串拼接原生报文时使用 `\r\n` 作为 HTTP 行分隔符
- 所有 DOM 操作前检查元素存在性
- 异步操作（如 `getContent`）有 loading 状态提示
- PrimeVue 组件按需引入，未使用全局注册全部组件

### 错误处理

```typescript
import { useToast } from 'primevue/usetoast'

const toast = useToast()

try {
    // 异步操作
} catch (err) {
    console.error('[ModuleName] Error:', err)
    toast.add({
        severity: 'error',
        summary: '操作失败',
        detail: String(err),
        life: 3000
    })
}
```

---

## 调试与测试

### Chrome DevTools 调试

1. 打开任意网页，按 `F12` 打开 DevTools
2. 切换到 **http helper** 面板
3. 右键点击面板内容，选择 **检查** 可打开嵌套 DevTools（DevTools 中的 DevTools）
4. 在 Console 中查看日志和错误

### 日志规范

```typescript
// 模块日志统一前缀（使用当前 store/service 名称）
console.log('[networkStore] Request captured:', request._uid)
console.error('[sessionExtractor] Parse failed:', err)
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
- [ ] 颜色标记功能正常（8 色 + 清除）
- [ ] 备注编辑功能正常
- [ ] 高级过滤功能正常（类型/颜色/正则/大小写/反向）
- [ ] 列配置功能正常（勾选可见列）
- [ ] 全屏模式正常（各面板全屏 + ESC 退出）
- [ ] 列头排序正常（三态：升序→降序→取消）
- [ ] 面板拖拽调整大小正常
- [ ] 录制暂停/恢复正常（脉冲动画指示）
- [ ] 行复制正常（点击行号 + Ctrl+Shift+C 快捷键）
- [ ] 软换行切换正常（长行自动换行）
- [ ] NL 换行符可视化标记切换正常
- [ ] XHR 快捷过滤按钮正常（仅显示 Fetch/XHR 类型）
- [ ] 二进制响应体识别与下载正常（图片/音频/视频/字体等）
- [ ] popup 弹出页正常显示（版本号、调试开关）
- [ ] 调试日志开关正常（开启后控制台输出带前缀日志）
- [ ] popup 页面显示正常（图标/名称/版本号/DevTools 指引）

---

## 发布流程

### 版本号规范

采用语义化版本（SemVer）：`MAJOR.MINOR.PATCH`

- `MAJOR`：不兼容的 API 变更
- `MINOR`：向下兼容的功能新增
- `PATCH`：向下兼容的问题修复

### 发布步骤

1. 同步版本号（两个文件必须一致）：
   - `package.json` 中的 `version`
   - `src/manifest.json` 中的 `version`
2. 更新 `doc/CHANGELOG.md`，记录本次变更
3. 运行完整测试清单
4. 执行 `pnpm build` 重新构建
5. 在 `chrome://extensions/` 点击 **刷新** 验证
6. 在 Git 中打标签：`git tag v2.x.x`
7. 推送标签：`git push origin v2.x.x`

---

## 常见问题

### Q1：修改代码后没有生效？

- 确认执行了 `pnpm build` 重新构建
- 确认在 `chrome://extensions/` 页面点击了 **刷新** 按钮
- 关闭并重新打开 DevTools 面板

### Q2：TypeScript 编译报错？

- 确认 `tsconfig.json` 中 `strict: true` 已启用
- 检查类型导入是否使用 `import type` 语法
- 确认路径别名 `@` 正确映射到 `src/src/`

### Q3：PrimeVue 组件样式异常？

- 确认 `main.ts` 中正确配置了 `@primeuix/themes/aura` 主题预设
- 确认 `darkModeSelector` 设置为 `@media (prefers-color-scheme: dark)`
- 检查 `panel.css` 中的自定义样式是否覆盖了 PrimeVue 默认样式

### Q4：`chrome.storage.local` 数据读写失败？

- 确认 `manifest.json` 中声明了 `"permissions": ["storage"]`
- 检查存储配额是否超限（约 5MB）
- 使用 Promise 包装异步操作，避免回调地狱

### Q5：如何调试 session-extractor 的提取逻辑？

在 Console 中手动测试：

```typescript
// 获取 Pinia store 实例
const sessionStore = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('session')

// 获取当前激活方案
const scheme = sessionStore.activeScheme

// 获取当前选中请求
const selectionStore = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('selection')
const request = selectionStore.currentRequest

// 测试提取
import { extractSession } from '@/services/session-extractor'
const result = extractSession(request, scheme)
console.log(result)
```

### Q6：新增 PrimeVue 组件后如何使用？

1. 在组件中按需导入：`import Button from 'primevue/button'`
2. 在 `<script setup>` 中注册后即可在 `<template>` 中使用
3. 如需全局注册，在 `main.ts` 中 `app.use()` 或 `app.component()`
4. 参阅 [PrimeVue 官方文档](https://primevue.org/) 获取组件列表和用法
