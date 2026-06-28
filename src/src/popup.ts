const manifest = chrome.runtime.getManifest();
document.getElementById('version')!.textContent = 'v' + manifest.version;
(document.getElementById('icon') as HTMLImageElement).src = chrome.runtime.getURL('icons/icon48.png');
