# http helper

A Chrome DevTools extension for capturing, viewing, copying, and downloading raw HTTP request/response messages.

English | [中文](README.md)

---

## Features

- **Real-time Capture**: Automatically capture HTTP requests and responses
- **Multi-view Display**: Raw, Pretty (formatted), and Hex views
- **Smart Switching**: Auto-switch to the best view based on Content-Type
- **Layout Switching**: Vertical, Horizontal, and Tab layouts
- **Search & Highlight**: Full-text search with regex support, highlight and navigation
- **Session Extraction**: Customizable schemes to auto-extract session info from requests
- **One-click Copy**: Copy raw messages to clipboard
- **One-click Download**: Download messages as `.txt` files
- **Theme Adaptation**: Auto light/dark theme adaptation
- **Request Management**: Keep up to 500 recent requests

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** in the top-right corner
3. Click **Load unpacked**
4. Select the project root directory (the folder containing `manifest.json`)

After installation, press `F12` to open DevTools and find the **Raw HTTP** tab.

## Quick Start

1. Open the **Raw HTTP** panel
2. Refresh the page or trigger network activity
3. Click any request in the left list
4. View raw request/response on the right, click **Copy** or **Download**
5. Use tab buttons to switch between Raw / Pretty / Hex views
6. Use layout buttons to switch between Vertical / Horizontal / Tab layouts

For detailed usage, see [doc/usage-guide.md](doc/usage-guide.md).

## Project Structure

```
httpHelper/
├── src/                        # Source directory
│   ├── manifest.json           # Extension manifest
│   ├── devtools.html           # DevTools entry page
│   ├── devtools.js             # DevTools entry script
│   ├── panel.html              # Main panel HTML
│   ├── panel.js                # Main panel entry module
│   ├── panel.css               # Main panel styles
│   ├── third_lib/              # Open-source third-party libraries
│   │   ├── bootstrap.min.css   # Bootstrap 5.3.8
│   │   ├── bootstrap.bundle.min.js
│   │   └── jquery.min.js       # jQuery 4.0.0
│   ├── modules/                # Feature modules
│   │   ├── network-handler.js      # Network request capture
│   │   ├── content-formatter.js    # Message formatting
│   │   ├── ui-renderer.js          # UI rendering
│   │   ├── layout-manager.js       # Layout management
│   │   ├── search-highlighter.js   # Search highlighting
│   │   ├── session-extractor.js    # Session extraction
│   │   └── session-storage.js      # Session storage
│   └── utils/                  # Utility modules
│       ├── clipboard-utils.js  # Clipboard and download
│       ├── dom-utils.js        # DOM utilities
│       └── string-utils.js     # String processing
├── doc/                        # Documentation directory
│   └── usage-guide.md          # Usage guide
├── README.md                   # This file (Chinese)
└── AGENTS.md                   # Agent development guide
```

## Tech Info

- Manifest Version: 3
- Permissions: none required
- Supported browsers: Chrome 88+
- Third-party libraries: Bootstrap 5.3.8, jQuery 4.0.0

## License

This project is licensed under the [MIT License](LICENSE).
