# Raw HTTP Copier

一款 Chrome 开发者工具扩展，用于捕获、查看、复制和下载 HTTP 请求与响应的原生报文。

[English](#english) | 中文

---

## 功能特性

- 实时捕获浏览器发出的 HTTP 请求与响应
- 原生报文左侧显示行号，便于阅读与定位
- 支持一键复制报文到剪贴板
- 支持一键下载报文为 `.txt` 文件
- 自动适配系统亮/暗主题
- 最多保留最近 500 条请求记录

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

详细使用说明请参阅 [doc/usage-guide.md](doc/usage-guide.md)。

## 项目结构

```
raw-http-copier/
├── src/                    # 源码目录
│   ├── manifest.json       # 扩展清单
│   ├── devtools.html       # DevTools 入口页
│   ├── devtools.js         # DevTools 入口脚本
│   ├── panel.html          # 主面板 HTML
│   ├── panel.js            # 主面板逻辑
│   └── panel.css           # 主面板样式
├── doc/                    # 文档目录
│   └── usage-guide.md      # 使用教程
├── README.md               # 本文件
└── AGENTS.md               # 智能体开发指南
```

## 技术信息

- Manifest Version: 3
- 权限: 无需额外权限
- 支持浏览器: Chrome 88+

## 许可证

MIT License

---

## English

A Chrome DevTools extension for capturing, viewing, copying, and downloading raw HTTP request/response messages.

### Features

- Real-time capture of HTTP requests and responses
- Line numbers displayed on the left side of raw messages
- One-click copy to clipboard
- One-click download as `.txt` files
- Auto light/dark theme adaptation
- Keep up to 500 recent requests

### Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** in the top-right corner
3. Click **Load unpacked**
4. Select the project root directory (the folder containing `manifest.json`)

After installation, press `F12` to open DevTools and find the **Raw HTTP** tab.

### Quick Start

1. Open the **Raw HTTP** panel
2. Refresh the page or trigger network activity
3. Click any request in the left list
4. View raw request/response on the right, click **Copy** or **Download**

For detailed usage, see [doc/usage-guide.md](doc/usage-guide.md).

### Tech Info

- Manifest Version: 3
- Permissions: none required
- Supported browsers: Chrome 88+

### License

MIT License
