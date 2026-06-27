/**
 * clipboard-utils.js - 剪贴板与文件下载操作（jQuery 辅助封装）
 */

const ClipboardUtils = {
  copyText(text, msg) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(msg || 'Copied!');
    }).catch(() => {
      const $ta = $('<textarea>').val(text).appendTo('body');
      $ta[0].select();
      document.execCommand('copy');
      $ta.remove();
      this.showToast(msg || 'Copied!');
    });
  },

  downloadText(text, filename) {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const $a = $('<a>').attr({ href: url, download: filename }).appendTo('body');
    $a[0].click();
    $a.remove();
    URL.revokeObjectURL(url);
    this.showToast(filename + ' downloaded!');
  },

  showToast(msg, duration = 2000) {
    let $toast = $('#toast');
    if ($toast.length === 0) {
      $toast = $('<div id="toast"></div>').appendTo('body');
    }
    $toast.text(msg).css('opacity', '1');
    setTimeout(() => { $toast.css('opacity', '0'); }, duration);
  }
};

export default ClipboardUtils;
