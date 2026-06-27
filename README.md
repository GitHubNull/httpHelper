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

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择本项目根目录（包含 `manifest.json` 的文件夹）

安装完成后，按 `F12` 打开开发者工具，在顶部标签栏找到 **Raw HTTP** 即可使用。

## 快速开始

1. 打开 **Raw HTTP** 面板
2. 刷新页面或触发网络请求
3. 在左侧列表中点击任意请求
4. 右侧查看原始请求/响应报文，可点击 **Copy** 复制或 **Download** 下载
5. 使用标签按钮切换 Raw / Pretty / Hex 视图
6. 使用布局按钮切换垂直/水平/标签页布局

详细使用说明请参阅 [doc/usage-guide.md](doc/usage-guide.md)。

## 项目结构

```
httpHelper/
├── src/                        # 源码目录
│   ├── manifest.json           # 扩展清单
│   ├── devtools.html           # DevTools 入口页
│   ├── devtools.js             # DevTools 入口脚本
│   ├── panel.html              # 主面板 HTML
│   ├── panel.js                # 主面板入口模块
│   ├── panel.css               # 主面板样式
│   ├── third_lib/              # 开源第三方依赖库
│   │   ├── bootstrap.min.css   # Bootstrap 5.3.8
│   │   ├── bootstrap.bundle.min.js
│   │   └── jquery.min.js       # jQuery 4.0.0
│   ├── modules/                # 功能模块
│   │   ├── network-handler.js      # 网络请求捕获
│   │   ├── content-formatter.js    # 报文格式化
│   │   ├── ui-renderer.js          # UI 渲染
│   │   ├── layout-manager.js       # 布局管理
│   │   ├── search-highlighter.js   # 搜索高亮
│   │   ├── session-extractor.js    # 会话提取
│   │   └── session-storage.js      # 会话存储
│   └── utils/                  # 通用工具模块
│       ├── clipboard-utils.js  # 剪贴板与下载
│       ├── dom-utils.js        # DOM 工具
│       └── string-utils.js     # 字符串处理
├── doc/                        # 文档目录
│   └── usage-guide.md          # 使用教程
├── README.md                   # 本文件
└── AGENTS.md                   # 智能体开发指南
```

## 技术信息

- Manifest Version: 3
- 权限: 无需额外权限
- 支持浏览器: Chrome 88+
- 第三方库: Bootstrap 5.3.8, jQuery 4.0.0

## 许可证

本项目采用 [MIT License](LICENSE) 开源协议。
