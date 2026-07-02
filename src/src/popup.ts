import { setDebugEnabled, isDebugEnabledAsync } from '@/utils/debug-logger'

const manifest = chrome.runtime.getManifest();
document.getElementById('version')!.textContent = 'v' + manifest.version;
(document.getElementById('icon') as HTMLImageElement).src = chrome.runtime.getURL('icons/icon48.png');

// ============ 调试模式开关 ============

const debugToggle = document.getElementById('debugToggle') as HTMLInputElement

// 加载初始状态
isDebugEnabledAsync().then((enabled) => {
    debugToggle.checked = enabled
})

// 绑定切换事件
debugToggle.addEventListener('change', () => {
    setDebugEnabled(debugToggle.checked)
})
