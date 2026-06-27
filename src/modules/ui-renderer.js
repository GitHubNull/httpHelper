/**
 * ui-renderer.js - 请求表格渲染、标签页切换、面板内容更新（jQuery）
 */
import StringUtils from '../utils/string-utils.js';
import DomUtils from '../utils/dom-utils.js';

const UiRenderer = {
  activeTabs: { request: 'raw', response: 'raw' },

  /**
   * 渲染请求列表为表格
   */
  renderRequestTable(requests, selectedIndex, onSelect, sortState, totalRequests) {
    const $tbody = $('#request-table tbody');
    const $count = $('#count');
    const $ths = $('#request-table thead th');

    // Update count display (filtered / total)
    if ($count.length) {
      const total = totalRequests !== undefined ? totalRequests : requests.length;
      const filtered = requests.length;
      if (total !== filtered) {
        $count.text(filtered + '/' + total + ' 个请求');
      } else {
        $count.text(filtered + ' 个请求');
      }
    }

    // Clear sort indicators
    $ths.removeClass('sort-asc sort-desc');
    if (sortState && sortState.column) {
      $ths.filter(`[data-col="${sortState.column}"]`).addClass(sortState.direction === 'asc' ? 'sort-asc' : 'sort-desc');
    }

    $tbody.empty();
    if (requests.length === 0) {
      const colCount = $ths.length;
      $tbody.append(`<tr><td colspan="${colCount}" class="text-center text-muted py-3">尚未捕获请求。<br>刷新页面或触发网络活动。</td></tr>`);
      return;
    }

    // Read column order and hidden state from thead (column-key driven)
    const colKeys = [];
    const hiddenCols = new Set();
    $ths.each(function () {
      const key = $(this).attr('data-col');
      colKeys.push(key);
      if ($(this).hasClass('d-none')) hiddenCols.add(key);
    });

    const esc = StringUtils.escapeHtml;

    requests.forEach((req, index) => {
      const cells = colKeys.map(key => {
        const hidden = hiddenCols.has(key) ? ' class="d-none"' : '';
        let html = '';

        switch (key) {
          case 'index':
            html = index + 1;
            break;
          case 'color': {
            const meta = req._uid ? this._getMeta(req._uid) : null;
            const color = meta ? meta.color : null;
            html = `<span class="color-tag${color ? ' color-' + color : ''}" data-uid="${req._uid || ''}"></span>`;
            break;
          }
          case 'method':
            html = `<strong>${esc(req.request.method)}</strong>`;
            break;
          case 'host': {
            let host = '';
            try { host = new URL(req.request.url).hostname; } catch { host = ''; }
            html = `<span title="${esc(host)}">${esc(host)}</span>`;
            break;
          }
          case 'url': {
            let urlPath = '';
            try { const u = new URL(req.request.url); urlPath = u.pathname + u.search; } catch { urlPath = req.request.url; }
            html = `<span title="${esc(req.request.url)}">${esc(urlPath)}</span>`;
            break;
          }
          case 'status': {
            const status = req.response ? req.response.status : 0;
            let badgeClass = 'bg-success';
            if (status >= 400) badgeClass = 'bg-danger';
            else if (status >= 300) badgeClass = 'bg-warning text-dark';
            else if (status === 0) badgeClass = 'bg-secondary';
            html = `<span class="badge ${badgeClass}">${status}</span>`;
            break;
          }
          case 'type': {
            const cat = StringUtils.getResourceCategory(req);
            html = `<span class="badge bg-secondary">${esc(cat)}</span>`;
            break;
          }
          case 'length': {
            const contentLength = req.response && req.response.content ? req.response.content.size : '';
            html = contentLength;
            break;
          }
          case 'reqtime':
            html = req._reqStartTime ? StringUtils.formatTimestamp(req._reqStartTime) : '';
            break;
          case 'restime':
            html = req._resEndTime ? StringUtils.formatTimestamp(req._resEndTime) : '';
            break;
          case 'time':
            html = req.time ? Math.round(req.time) + 'ms' : '';
            break;
          case 'note': {
            const noteMeta = req._uid ? this._getMeta(req._uid) : null;
            const note = noteMeta ? noteMeta.note : '';
            if (note) {
              html = `<span class="note-cell" title="${esc(note)}" data-uid="${req._uid || ''}">${esc(note)}</span>`;
            } else {
              html = `<span class="note-cell note-empty" data-uid="${req._uid || ''}">+</span>`;
            }
            break;
          }
          default:
            html = '';
        }
        return `<td${hidden}>${html}</td>`;
      });

      const $tr = $('<tr>')
        .toggleClass('table-active', index === selectedIndex)
        .css('cursor', 'pointer')
        .on('click', function (e) {
          // Skip row selection when clicking color tag or note cell
          if (e.target && $(e.target).closest('.color-tag, .note-cell').length) return;
          onSelect(index);
        })
        .html(cells.join(''));
      $tbody.append($tr);
    });
  },

  _metaMap: null,

  setMetaMap(metaMap) {
    this._metaMap = metaMap;
  },

  _getMeta(uid) {
    if (!this._metaMap || !uid) return null;
    return this._metaMap.get(uid) || null;
  },

  /**
   * 切换标签页 (Raw/Pretty/Hex)
   */
  switchTab(pane, tabName) {
    this.activeTabs[pane] = tabName;
    const $pane = $(`#${pane}-pane`);
    if (!$pane.length) return;

    $pane.find('.tab-btn').removeClass('active').filter(`[data-tab="${tabName}"]`).addClass('active');
    $pane.find('.tab-content').removeClass('active').filter(`[data-tab="${tabName}"]`).addClass('active');
  },

  /**
   * 更新面板内容
   */
  updatePaneContent(pane, tabName, content) {
    const $pane = $(`#${pane}-pane`);
    if (!$pane.length) return;
    const $content = $pane.find(`.tab-content[data-tab="${tabName}"]`);
    if (!$content.length) return;

    if (tabName === 'hex') {
      $content.find('.hex-display').text(content);
    } else if (tabName === 'pretty') {
      // content can be {content, language} or plain string
      const $code = $content.find('code');
      if ($code.length) {
        let text, lang;
        if (typeof content === 'object' && content !== null && content.content !== undefined) {
          text = content.content;
          lang = content.language || 'plaintext';
        } else {
          text = content;
          lang = 'plaintext';
        }
        // Set text and class
        $code.text(text);
        $code.removeClass();
        $code.addClass(`hljs language-${lang}`);
        // Apply highlight.js
        if (window.hljs && text && text !== '加载中...') {
          try {
            window.hljs.highlightElement($code[0]);
          } catch (e) {
            // Fallback: keep plain text
            console.warn('hljs highlight failed:', e);
          }
        }
        // Update line numbers
        const $lineNumbers = $content.find('.line-numbers');
        if ($lineNumbers.length && text) {
          const lines = text.split('\n').length;
          const nums = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
          $lineNumbers.text(nums);
        }
      }
    } else {
      // raw
      const $textarea = $content.find('textarea');
      const $lineNumbers = $content.find('.line-numbers');
      if ($textarea.length) {
        $textarea.val(content);
        if ($lineNumbers.length) {
          DomUtils.updateLineNumbers($textarea[0], $lineNumbers[0]);
        }
      }
    }
  },

  getActiveTab(pane) {
    return this.activeTabs[pane] || 'raw';
  },

  setActiveTab(pane, tabName) {
    this.switchTab(pane, tabName);
  },

  showLoading(pane) {
    this.updatePaneContent(pane, 'raw', '加载中...');
    this.updatePaneContent(pane, 'pretty', { content: '加载中...', language: 'plaintext' });
    this.updatePaneContent(pane, 'hex', '加载中...');
  }
};

export default UiRenderer;
