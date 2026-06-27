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
  renderRequestTable(requests, selectedIndex, onSelect) {
    const $tbody = $('#request-table tbody');
    const $count = $('#count');
    if ($count.length) {
      $count.text(requests.length + ' request' + (requests.length !== 1 ? 's' : ''));
    }
  
    $tbody.empty();
    if (requests.length === 0) {
      $tbody.append('<tr><td colspan="7" class="text-center text-muted py-3">No requests captured yet.<br>Reload the page or trigger network activity.</td></tr>');
      return;
    }
  
    // Get hidden column indices
    const $ths = $('#request-table thead th');
    const hiddenIndices = new Set();
    $ths.each(function (i) {
      if ($(this).hasClass('d-none')) hiddenIndices.add(i);
    });
  
    requests.forEach((req, index) => {
      const status = req.response ? req.response.status : 0;
      let badgeClass = 'bg-success';
      if (status >= 400) badgeClass = 'bg-danger';
      else if (status >= 300) badgeClass = 'bg-warning text-dark';
      else if (status === 0) badgeClass = 'bg-secondary';
  
      let host = '', urlPath = '';
      try {
        const u = new URL(req.request.url);
        host = u.hostname;
        urlPath = u.pathname + u.search;
      } catch {
        urlPath = req.request.url;
      }
  
      const contentLength = req.response && req.response.content ? req.response.content.size : '';
      const time = req.time ? Math.round(req.time) + 'ms' : '';
  
      const cells = [
        `<td${hiddenIndices.has(0) ? ' class="d-none"' : ''}>${index + 1}</td>`,
        `<td${hiddenIndices.has(1) ? ' class="d-none"' : ''}><strong>${StringUtils.escapeHtml(req.request.method)}</strong></td>`,
        `<td${hiddenIndices.has(2) ? ' class="d-none"' : ''} title="${StringUtils.escapeHtml(host)}">${StringUtils.escapeHtml(host)}</td>`,
        `<td${hiddenIndices.has(3) ? ' class="d-none"' : ''} title="${StringUtils.escapeHtml(req.request.url)}">${StringUtils.escapeHtml(urlPath)}</td>`,
        `<td${hiddenIndices.has(4) ? ' class="d-none"' : ''}><span class="badge ${badgeClass}">${status}</span></td>`,
        `<td${hiddenIndices.has(5) ? ' class="d-none"' : ''}>${contentLength}</td>`,
        `<td${hiddenIndices.has(6) ? ' class="d-none"' : ''}>${time}</td>`
      ];
  
      const $tr = $('<tr>')
        .toggleClass('table-active', index === selectedIndex)
        .css('cursor', 'pointer')
        .on('click', () => onSelect(index))
        .html(cells.join(''));
      $tbody.append($tr);
    });
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
        if (window.hljs && text && text !== 'Loading...') {
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
    this.updatePaneContent(pane, 'raw', 'Loading...');
    this.updatePaneContent(pane, 'pretty', { content: 'Loading...', language: 'plaintext' });
    this.updatePaneContent(pane, 'hex', 'Loading...');
  }
};

export default UiRenderer;
