/**
 * dom-utils.js - 通用 DOM 操作工具（jQuery 辅助封装）
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
    const $ta = $(textarea);
    const $ln = $(lineNumbersEl);
    if (!$ta.length || !$ln.length) return;
    const text = $ta.val() || '';
    const lines = text.split('\n').length;
    $ln.text(Array.from({ length: lines }, (_, i) => i + 1).join('\n'));
  },

  createOverlayHighlighter(textarea) {
    if (!textarea) return null;
    const $ta = $(textarea);
    if (!$ta.length) return null;

    // Wrap textarea in a .textarea-wrapper if not already wrapped
    let $wrapper = $ta.parent('.textarea-wrapper');
    if ($wrapper.length === 0) {
      $ta.wrap('<div class="textarea-wrapper"></div>');
      $wrapper = $ta.parent('.textarea-wrapper');
    }

    // Create overlay inside the wrapper (so it aligns with textarea, not line-numbers)
    let $overlay = $wrapper.find('.highlight-overlay');
    if ($overlay.length === 0) {
      $overlay = $('<div class="highlight-overlay"></div>');
      $wrapper.append($overlay);
    }

    // Sync overlay scroll position with textarea
    const overlayEl = $overlay[0];
    $ta.off('scroll.overlay').on('scroll.overlay', function() {
      overlayEl.scrollTop = this.scrollTop;
      overlayEl.scrollLeft = this.scrollLeft;
    });

    return overlayEl;
  },

  clearOverlay(overlay) {
    if (overlay) $(overlay).empty();
  },

  highlightOverlay(overlay, text, matches) {
    if (!overlay) return;
    const $overlay = $(overlay);
    if (!matches || matches.length === 0) {
      $overlay.empty();
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
    $overlay.html(html);
  },

  _escapeHtml(text) {
    if (!text) return '';
    return $('<div>').text(text).html();
  }
};

export default DomUtils;
