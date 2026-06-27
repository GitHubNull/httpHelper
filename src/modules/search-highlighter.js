/**
 * search-highlighter.js - 搜索、高亮、匹配导航
 */
import DomUtils from '../utils/dom-utils.js';

const SearchHighlighter = {
  matches: [],
  currentMatchIndex: -1,
  lastSearchText: '',
  lastOptions: {},

  initSearch(container, onSearch) {
    if (!container) return;
    const searchInput = container.querySelector('#search-input');
    const regexToggle = container.querySelector('#search-regex');
    const caseToggle = container.querySelector('#search-case');
    const prevBtn = container.querySelector('#search-prev');
    const nextBtn = container.querySelector('#search-next');
    const countEl = container.querySelector('#search-count');

    const isToggleActive = (btn) => btn && (btn.classList ? btn.classList.contains('active') : btn.checked);

    const doSearch = () => {
      const text = searchInput ? searchInput.value : '';
      const options = {
        useRegex: isToggleActive(regexToggle),
        caseSensitive: isToggleActive(caseToggle)
      };
      this.lastSearchText = text;
      this.lastOptions = options;
      if (onSearch) onSearch(text, options);
      this._updateCount(countEl);
    };

    if (searchInput) {
      searchInput.addEventListener('input', DomUtils.debounce(doSearch, 300));
    }
    if (regexToggle) {
      const eventType = regexToggle.tagName === 'INPUT' ? 'change' : 'click';
      regexToggle.addEventListener(eventType, () => {
        if (regexToggle.tagName === 'BUTTON') regexToggle.classList.toggle('active');
        doSearch();
      });
    }
    if (caseToggle) {
      const eventType = caseToggle.tagName === 'INPUT' ? 'change' : 'click';
      caseToggle.addEventListener(eventType, () => {
        if (caseToggle.tagName === 'BUTTON') caseToggle.classList.toggle('active');
        doSearch();
      });
    }
    if (prevBtn) prevBtn.addEventListener('click', () => this.navigateMatch('prev'));
    if (nextBtn) nextBtn.addEventListener('click', () => this.navigateMatch('next'));
  },

  performSearch(text, pattern, options = {}) {
    this.matches = [];
    this.currentMatchIndex = -1;
    if (!text || !pattern) return this.matches;

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
      return this.matches;
    }

    let match;
    while ((match = regex.exec(text)) !== null) {
      this.matches.push({ start: match.index, end: match.index + match[0].length });
      if (match[0].length === 0) regex.lastIndex++;
    }
    if (this.matches.length > 0) this.currentMatchIndex = 0;
    return this.matches;
  },

  highlightMatches(container, matches) {
    if (!container) return;
    const overlay = container.querySelector('.highlight-overlay');
    if (overlay) {
      DomUtils.clearOverlay(overlay);
      const textarea = container.querySelector('textarea');
      if (textarea) {
        DomUtils.highlightOverlay(overlay, textarea.value, matches);
      }
    }
  },

  highlightHexMatches(hexDisplay, matches) {
    if (!hexDisplay || !matches || matches.length === 0) {
      if (hexDisplay) hexDisplay.innerHTML = hexDisplay.textContent;
      return;
    }
    // For hex mode, simple text-based highlighting is complex; use mark tags in a re-rendered div
    const text = hexDisplay.textContent || '';
    let html = '';
    let lastIndex = 0;
    for (const match of matches) {
      html += this._escapeHtml(text.slice(lastIndex, match.start));
      html += `<mark class="search-highlight">${this._escapeHtml(text.slice(match.start, match.end))}</mark>`;
      lastIndex = match.end;
    }
    html += this._escapeHtml(text.slice(lastIndex));
    hexDisplay.innerHTML = html;
  },

  navigateMatch(direction) {
    if (this.matches.length === 0) return;
    if (direction === 'next') {
      this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length;
    } else {
      this.currentMatchIndex = (this.currentMatchIndex - 1 + this.matches.length) % this.matches.length;
    }
    this._scrollToMatch();
  },

  getMatchCount() {
    return {
      total: this.matches.length,
      current: this.currentMatchIndex >= 0 ? this.currentMatchIndex + 1 : 0
    };
  },

  clearHighlights() {
    this.matches = [];
    this.currentMatchIndex = -1;
  },

  _updateCount(countEl) {
    if (!countEl) return;
    const count = this.getMatchCount();
    countEl.textContent = count.total > 0 ? `${count.current}/${count.total}` : '0/0';
  },

  _scrollToMatch() {
    // Scroll to match in any visible content area
    const overlays = document.querySelectorAll('.highlight-overlay');
    for (const overlay of overlays) {
      if (overlay.offsetParent === null) continue; // skip hidden overlays
      const marks = overlay.querySelectorAll('mark.search-highlight');
      if (marks[this.currentMatchIndex]) {
        marks[this.currentMatchIndex].scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
    }
  },

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

export default SearchHighlighter;
