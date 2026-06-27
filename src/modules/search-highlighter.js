/**
 * search-highlighter.js - 搜索匹配与高亮（jQuery 辅助封装）
 */

const SearchHighlighter = {
  /**
   * 执行搜索，返回匹配位置数组
   * @param {string} text - 搜索目标文本
   * @param {string} pattern - 搜索模式
   * @param {object} options - { useRegex, caseSensitive }
   * @returns {Array<{start:number, end:number}>}
   */
  performSearch(text, pattern, options = {}) {
    const matches = [];
    if (!text || !pattern) return matches;

    const flags = options.caseSensitive ? 'g' : 'gi';
    let regex;
    try {
      if (options.useRegex) {
        regex = new RegExp(pattern, flags);
      } else {
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escaped, flags);
      }
    } catch (e) {
      return matches;
    }

    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length });
      if (match[0].length === 0) regex.lastIndex++;
    }
    return matches;
  },

  /**
   * 在 hex 显示区域中高亮匹配项
   */
  highlightHexMatches(hexDisplay, matches) {
    const $hexDisplay = $(hexDisplay);
    if (!$hexDisplay.length || !matches || matches.length === 0) {
      if ($hexDisplay.length) $hexDisplay.html($hexDisplay.text());
      return;
    }
    const text = $hexDisplay.text() || '';
    let html = '';
    let lastIndex = 0;
    for (const match of matches) {
      html += this._escapeHtml(text.slice(lastIndex, match.start));
      html += `<mark class="search-highlight">${this._escapeHtml(text.slice(match.start, match.end))}</mark>`;
      lastIndex = match.end;
    }
    html += this._escapeHtml(text.slice(lastIndex));
    $hexDisplay.html(html);
  },

  _escapeHtml(text) {
    if (!text) return '';
    return $('<div>').text(text).html();
  }
};

export default SearchHighlighter;
