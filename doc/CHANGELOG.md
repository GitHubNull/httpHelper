# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2026-06-28 22:05:16

### Added
- 新增 GitHub Actions CI 构建检查工作流（push/PR 到 main 时自动执行 `pnpm build`）
- 新增 GitHub Actions 自动发布工作流（推送 `v*` tag 时自动构建、打包 zip 并创建 GitHub Release）
- 新增开发者文档「自动化发布流程」章节，说明触发机制和发布步骤

## [2.2.1] - 2026-06-28 14:00:00

### Fixed
- 修正所有版本条目的日期格式，统一为 `YYYY-MM-DD HH:mm:ss` 格式
- 使用 `git log` 查询实际 tag 提交时间替换所有猜测/占位日期

## [2.2.0] - 2026-06-28 13:49:37

### Changed
- 目录结构标准化：`vue_src/` 重命名为 `src/`，`vue_dst/` 重命名为 `dist/`
- 更新 `manifest.json`、`vite.config.ts`、`tsconfig.json` 等配置文件以适配新目录结构
- 更新 `README.md`、`README.en.md`、`AGENTS.md` 及开发者文档以反映新目录结构
- 清理旧版纯原生 JS 源码（原 `src/` 目录下的旧实现文件）

### Removed
- 移除旧版原生 HTML/CSS/JS 源码目录（原 `src/` 下的 devtools.js、panel.js、modules/、utils/、third_lib/ 等）

## [2.1.0] - 2026-06-28 12:43:50

### Added
- 新增全屏查看功能，支持 Raw / Pretty / Hex 视图全屏展示
- 新增 `FullscreenOverlay` 通用全屏覆盖组件与 `useFullscreenOverlay` 组合式函数
- 新增 FilterBar 高级过滤面板，支持多条件组合筛选

### Changed
- 优化 RequestPane / ResponsePane 布局结构与交互体验
- 优化 HttpDetailArea 与 RequestTableArea 的响应式适配
- 优化 LayoutBar 布局切换按钮状态管理
- 优化面板 CSS 样式，提升整体视觉一致性

## [2.0.1] - 2026-06-28 03:54:21

### Fixed
- 修复标签页布局下请求/响应面板切换时搜索高亮未实时清除的问题
- 修复标签页切换按钮使用原生 `<button>` 替代 PrimeVue `Button` 组件以提升样式可控性

## [2.0.0] - 2026-06-28 03:37:45

### Added
- 全新 Vue 3 + TypeScript 技术栈重构，替换原有纯原生 JS 实现
- 引入 PrimeVue 4.5 组件库，提升 UI 一致性与交互体验
- 引入 Pinia 状态管理，优化数据流与组件通信
- 新增 Vite 构建工具链，支持热更新与现代化开发流程
- 新增 `@crxjs/vite-plugin` 支持 Chrome 扩展 Manifest V3 的现代化构建

### Changed
- 项目构建系统从手动管理迁移至 Vite + Vue TSC
- 扩展入口页面与面板页面迁移至 `dist/` 构建输出目录（原 `vue_dst/`，已于 v2.2.0 重命名）
- 图标资源路径更新为 `dist/icons/`

### Removed
- 移除原有纯原生 HTML/CSS/JS 源码目录（已于 v2.2.0 正式删除，`vue_src/` 重命名为 `src/`）

## [1.3.4] - 2026-06-28 01:23:04

### Fixed
- UI/UX 全面修复与优化

## [1.3.3] - 2026-06-28 00:30:47

### Fixed
- 修复若干 UI 显示问题

## [1.3.2] - 2026-06-28 00:11:36

### Fixed
- 修复布局与样式问题

## [1.3.1] - 2026-06-27 23:05:11

### Fixed
- 修复 jQuery 迁移与 overlay 布局问题

## [1.3.0] - 2026-06-27 21:37:48

### Added
- 新增会话提取与管理功能
- 支持自定义 Scheme 与 Field 配置

## [1.2.0] - 2026-06-27 20:17:25

### Added
- 新增搜索高亮与导航功能
- 支持正则表达式与大小写敏感搜索

## [1.1.0] - 2026-06-27 19:50:24

### Added
- 新增布局切换功能（垂直/水平/标签页）
- 支持多种报文展示模式

## [1.0.0] - 2026-06-27 19:02:04

### Added
- 初始版本发布
- 支持在 Chrome DevTools 中捕获并展示 HTTP 请求与响应的原生报文
- 支持 Raw / Pretty / Hex 三种报文视图
- 支持请求列表展示与筛选
- 支持报文复制与下载

## [0.1.0] - 2026-06-26 18:19:33

### Added
- 项目原型与基础功能验证
