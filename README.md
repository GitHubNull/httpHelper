# http helper

一款 Chrome 开发者工具扩展，用于捕获、查看、复制和下载 HTTP 请求与响应的原生报文。

[English](README.en.md) | 中文

---

## 功能特性

- **实时捕获**：自动捕获浏览器发出的 HTTP 请求与响应
- **多视图展示**：支持 Raw（原生）、Pretty（格式化）、Hex（十六进制）三种视图
- **智能切换**：根据 Content-Type 自动切换到最合适的视图（JSON/XML 自动格式化）
- **布局切换**：支持垂直布局、水平布局、标签页布局三种模式
- **搜索高亮**：支持全文搜索，支持正则表达式，匹配结果高亮并支持导航
- **会话提取**：可自定义 Scheme，自动从请求中提取会话信息（支持 Substring/Regex/Keyword/XPath/JSONPath）
- **一键复制**：一键复制报文到剪贴板
- **一键下载**：一键下载报文为 `.txt` 文件
- **主题适配**：自动适配系统亮/暗主题
- **请求管理**：最多保留最近 500 条请求记录

## 安装

1. 安装依赖并构建：
   ```bash
   pnpm install
   pnpm build
   ```
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角 **开发者模式**
4. 点击 **加载已解压的扩展程序**
5. 选择 `dist` 目录（构建输出目录）

安装完成后，按 `F12` 打开开发者工具，在顶部标签栏找到 **http helper** 即可使用。

## 快速开始

1. 打开 **http helper** 面板
2. 刷新页面或触发网络请求
3. 在左侧列表中点击任意请求
4. 右侧查看原始请求/响应报文，可点击 **Copy** 复制或 **Download** 下载
5. 使用标签按钮切换 Raw / Pretty / Hex 视图
6. 使用布局按钮切换垂直/水平/标签页布局

详细使用说明请参阅 [doc/usage-guide.md](doc/usage-guide.md)。

## 项目结构

```
httpHelper/
├── src/                        # Vite 项目根目录
│   ├── manifest.json           # 扩展清单（@crxjs 构建用）
│   ├── panel.html              # 面板入口 HTML
│   ├── devtools.html            # DevTools 入口 HTML
│   └── src/                    # Vue 3 源码目录
│       ├── App.vue             # 根组件
│       ├── main.ts             # 应用入口
│       ├── devtools.ts         # DevTools 面板注册
│       ├── components/         # Vue 组件
│       │   ├── http-history/   # HTTP 历史组件
│       │   ├── session-config/ # 会话配置组件
│       │   ├── toolbar/        # 工具栏组件
│       │   └── common/         # 通用组件
│       ├── composables/        # 组合式 API
│       ├── services/           # 业务服务（会话提取/存储）
│       ├── stores/             # Pinia 状态管理
│       ├── utils/              # 工具函数
│       ├── types/              # TypeScript 类型定义
│       └── styles/             # 全局样式
├── dist/                       # 构建输出目录（加载扩展时选择此目录）
├── doc/                        # 文档目录
├── vite.config.ts              # Vite 构建配置
├── tsconfig.json               # TypeScript 配置
├── package.json                # 项目依赖与脚本
├── README.md                   # 本文件
└── AGENTS.md                   # 智能体开发指南
```

## 技术信息

- Manifest Version: 3
- 权限: storage
- 支持浏览器: Chrome 88+
- 前端框架: Vue 3.5 + TypeScript
- 状态管理: Pinia
- UI 组件库: PrimeVue 4.5 + PrimeIcons
- 构建工具: Vite 6 + @crxjs/vite-plugin
- 代码高亮: highlight.js

## 开发指南

开发维护指导文档请参阅 [开发者指南](doc/developer-guide/index.md)。

## 变更日志

查看项目的完整变更记录请参阅 [变更日志](doc/CHANGELOG.md)。

## 许可证

本项目采用 [MIT License](LICENSE) 开源协议。
