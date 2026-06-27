/**
 * dom-utils.js - 通用 DOM 操作工具
 */

const DomUtils = {
  debounce(fn, delay) {
    let timer = null;
    return function(...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  updateLineNumbers(textarea, lineNumbersEl) {
    if (!textarea || !lineNumbersEl) return;
    const text = textarea.value || '';
    const lines = text.split('\n').length;
    lineNumbersEl.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
  },

  createOverlayHighlighter(textarea) {
    if (!textarea) return null;
    const container = textarea.parentElement;
    if (!container) return null;

    let overlay = container.querySelector('.highlight-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'highlight-overlay';
      overlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;overflow:hidden;white-space:pre;font-family:Consolas,Monaco,Courier New,monospace;font-size:11px;line-height:1.45;padding:8px;z-index:2;color:transparent;';
      container.style.position = 'relative';
      container.appendChild(overlay);
    }
    return overlay;
  },

  clearOverlay(overlay) {
    if (overlay) overlay.innerHTML = '';
  },

  highlightOverlay(overlay, text, matches) {
    if (!overlay) return;
    if (!matches || matches.length === 0) {
      overlay.innerHTML = '';
      return;
    }
    let html = '';
    let lastIndex = 0;
    for (const match of matches) {
      html += this._escapeHtml(text.slice(lastIndex, match.start));
      html += `<mark class="search-highlight">${this._escapeHtml(text.slice(match.start, match.end))}</mark>`;
      lastIndex = match.end;
    }
    html += this._escapeHtml(text.slice(lastIndex));
    overlay.innerHTML = html;
  },

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

export default DomUtils;
