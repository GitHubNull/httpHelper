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
- **XHR Quick Filter**: One-click filter to show only Fetch/XHR requests
- **Session Extraction**: Customizable schemes to auto-extract session info (Full/Substring/Regex/Keyword/XPath/JSONPath, supports response headers/body)
- **Line Copy**: Click line number or use Ctrl+Shift+C to copy the current line
- **Soft Wrap & Line Break Markers**: Toggle long-line wrap and show/hide line break markers
- **Binary Download**: Auto-detect binary responses with smart file naming (Content-Disposition > URL path > Content-Type > timestamp fallback)
- **Toolbar Popup**: Click extension icon for version info and debug toggle panel
- **Debug Logging**: Modular debug logging with visual toggle in popup panel
- **One-click Copy**: Copy raw messages to clipboard
- **One-click Download**: Download messages as `.txt` files
- **Theme Adaptation**: Auto light/dark theme adaptation
- **Request Management**: Keep up to 500 recent requests

## Installation

1. Install dependencies and build:
   ```bash
   pnpm install
   pnpm build
   ```
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** in the top-right corner
4. Click **Load unpacked**
5. Select the `dist` directory (build output directory)

After installation, press `F12` to open DevTools and find the **http helper** tab.

## Quick Start

1. Open the **http helper** panel
2. Refresh the page or trigger network activity
3. Click any request in the left list
4. View raw request/response on the right, click **Copy** or **Download**
5. Use tab buttons to switch between Raw / Pretty / Hex views
6. Use layout buttons to switch between Vertical / Horizontal / Tab layouts

For detailed usage, see [doc/usage-guide.md](doc/usage-guide.md).

## Project Structure

```
httpHelper/
├── src/                        # Vite project root
│   ├── manifest.json           # Extension manifest (@crxjs build)
│   ├── panel.html              # Panel entry HTML
│   ├── devtools.html           # DevTools entry HTML
│   ├── popup.html              # Toolbar popup HTML
│   └── src/                    # Vue 3 source directory
│       ├── App.vue             # Root component
│       ├── main.ts             # App entry
│       ├── devtools.ts         # DevTools panel registration
│       ├── popup.ts            # Popup entry (version display / debug toggle)
│       ├── components/         # Vue components
│       │   ├── http-history/   # HTTP history components
│       │   ├── session-config/ # Session config components
│       │   ├── toolbar/        # Toolbar components
│       │   └── common/         # Common components
│       ├── composables/        # Composition API (5 modules)
│       ├── services/           # Business services (session extraction/storage)
│       ├── stores/             # Pinia state management
│       ├── utils/              # Utility functions (5 modules, incl. debug logging)
│       ├── types/              # TypeScript type definitions
│       └── styles/             # Global styles
├── dist/                       # Build output directory (load extension from here)
├── doc/                        # Documentation directory
├── vite.config.ts              # Vite build config
├── tsconfig.json               # TypeScript config
├── package.json                # Project dependencies and scripts
├── README.md                   # This file
└── AGENTS.md                   # Agent development guide
```

## Tech Info

- Manifest Version: 3
- Permissions: storage
- Supported browsers: Chrome 88+
- Frontend framework: Vue 3.5 + TypeScript
- State management: Pinia
- UI components: PrimeVue 4.5 + PrimeIcons
- Build tool: Vite 6 + @crxjs/vite-plugin
- Syntax highlighting: highlight.js
- Debug logging: debug-logger (modular logs, popup toggle control)

## Developer Guide

For development and maintenance guidance, see the [Developer Guide](doc/developer-guide/index.md).

## Changelog

See the [Changelog](doc/CHANGELOG.md) for the complete list of changes.

## License

This project is licensed under the [MIT License](LICENSE).
