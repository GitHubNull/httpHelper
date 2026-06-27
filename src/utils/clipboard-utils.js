/**
 * clipboard-utils.js - 剪贴板与文件下载操作
 */

const ClipboardUtils = {
  copyText(text, msg) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(msg || 'Copied!');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.showToast(msg || 'Copied!');
    });
  },

  downloadText(text, filename) {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast(filename + ' downloaded!');
  },

  showToast(msg, duration = 2000) {
    let toastEl = document.getElementById('toast');
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'toast';
      toastEl.style.cssText = 'position:fixed;bottom:12px;right:12px;background:var(--fg);color:var(--bg);padding:6px 12px;border-radius:4px;opacity:0;transition:opacity 0.3s;pointer-events:none;z-index:100;';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    setTimeout(() => { toastEl.style.opacity = '0'; }, duration);
  }
};

export default ClipboardUtils;
