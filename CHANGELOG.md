# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2026-06-28

### Fixed
- 修复标签页布局下请求/响应面板切换时搜索高亮未实时清除的问题
- 修复标签页切换按钮使用原生 `<button>` 替代 PrimeVue `Button` 组件以提升样式可控性

## [2.0.0] - 2026-06-28

### Added
- 全新 Vue 3 + TypeScript 技术栈重构，替换原有纯原生 JS 实现
- 引入 PrimeVue 4.5 组件库，提升 UI 一致性与交互体验
- 引入 Pinia 状态管理，优化数据流与组件通信
- 新增 Vite 构建工具链，支持热更新与现代化开发流程
- 新增 `@crxjs/vite-plugin` 支持 Chrome 扩展 Manifest V3 的现代化构建

### Changed
- 项目构建系统从手动管理迁移至 Vite + Vue TSC
- 扩展入口页面与面板页面迁移至 `vue_dst/` 构建输出目录
- 图标资源路径更新为 `vue_dst/icons/`

### Removed
- 移除原有纯原生 HTML/CSS/JS 源码目录（保留 `src/` 作为历史参考）

## [1.3.4] - 2025-06-28

### Fixed
- UI/UX 全面修复与优化

## [1.3.3] - 2025-06-27

### Fixed
- 修复若干 UI 显示问题

## [1.3.2] - 2025-06-27

### Fixed
- 修复布局与样式问题

## [1.3.1] - 2025-06-26

### Fixed
- 修复 jQuery 迁移与 overlay 布局问题

## [1.3.0] - 2025-06-26

### Added
- 新增会话提取与管理功能
- 支持自定义 Scheme 与 Field 配置

## [1.2.0] - 2025-06-25

### Added
- 新增搜索高亮与导航功能
- 支持正则表达式与大小写敏感搜索

## [1.1.0] - 2025-06-24

### Added
- 新增布局切换功能（垂直/水平/标签页）
- 支持多种报文展示模式

## [1.0.0] - 2025-06-23

### Added
- 初始版本发布
- 支持在 Chrome DevTools 中捕获并展示 HTTP 请求与响应的原生报文
- 支持 Raw / Pretty / Hex 三种报文视图
- 支持请求列表展示与筛选
- 支持报文复制与下载

## [0.1.0] - 2025-06-22

### Added
- 项目原型与基础功能验证
