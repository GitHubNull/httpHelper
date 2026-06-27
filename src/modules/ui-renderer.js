/**
 * ui-renderer.js - 请求列表渲染、标签页切换、面板内容更新（jQuery 辅助封装）
 */
import StringUtils from '../utils/string-utils.js';
import DomUtils from '../utils/dom-utils.js';

const UiRenderer = {
  activeTabs: { request: 'raw', response: 'raw' },

  renderRequestList(requests, selectedIndex, onSelect) {
    const $list = $('#request-list');
    if (!$list.length) return;
    $list.empty();

    const $count = $('#count');
    if ($count.length) {
      $count.text(requests.length + ' request' + (requests.length !== 1 ? 's' : ''));
    }

    if (requests.length === 0) {
      $list.html('<div class="empty-state">No requests captured yet.<br>Reload the page or trigger network activity.</div>');
      return;
    }

    requests.forEach((req, index) => {
      const status = req.response ? req.response.status : 0;
      let statusClass = 'success';
      if (status >= 400) statusClass = 'error';
      else if (status >= 300) statusClass = 'redirect';

      const urlStr = StringUtils.truncateUrl(req.request.url);

      const $item = $('<div>')
        .addClass('request-item')
        .toggleClass('active', index === selectedIndex)
        .attr('data-index', index)
        .html(`
          <span class="method">${StringUtils.escapeHtml(req.request.method)}</span>
          <span class="status ${statusClass}">${status}</span>
          <span class="url" title="${StringUtils.escapeHtml(req.request.url)}">${StringUtils.escapeHtml(urlStr)}</span>
        `);
      $item.on('click', () => onSelect(index));
      $list.append($item);
    });
  },

  switchTab(pane, tabName) {
    this.activeTabs[pane] = tabName;
    const $pane = $('#' + pane + '-pane');
    if (!$pane.length) return;

    $pane.find('.tab-btn').removeClass('active').filter(`[data-tab="${tabName}"]`).addClass('active');
    $pane.find('.tab-content').removeClass('active').filter(`[data-tab="${tabName}"]`).addClass('active');
  },

  updatePaneContent(pane, tabName, content) {
    const $pane = $('#' + pane + '-pane');
    if (!$pane.length) return;

    const $content = $pane.find(`.tab-content[data-tab="${tabName}"]`);
    if (!$content.length) return;

    if (tabName === 'hex') {
      $content.find('.hex-display').text(content);
    } else {
      const $textarea = $content.find('textarea');
      const $lineNumbers = $content.find('.line-numbers');
      if ($textarea.length) {
        $textarea.val(content);
        DomUtils.updateLineNumbers($textarea[0], $lineNumbers[0]);
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
    this.updatePaneContent(pane, 'pretty', 'Loading...');
    this.updatePaneContent(pane, 'hex', 'Loading...');
  }
};

export default UiRenderer;
