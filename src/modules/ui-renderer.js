/**
 * ui-renderer.js - 请求列表渲染、标签页切换、面板内容更新
 */
import StringUtils from '../utils/string-utils.js';
import DomUtils from '../utils/dom-utils.js';

const UiRenderer = {
  activeTabs: { request: 'raw', response: 'raw' },

  renderRequestList(requests, selectedIndex, onSelect) {
    const listEl = document.getElementById('request-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const countEl = document.getElementById('count');
    if (countEl) {
      countEl.textContent = requests.length + ' request' + (requests.length !== 1 ? 's' : '');
    }

    if (requests.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No requests captured yet.<br>Reload the page or trigger network activity.</div>';
      return;
    }

    requests.forEach((req, index) => {
      const item = document.createElement('div');
      item.className = 'request-item' + (index === selectedIndex ? ' active' : '');
      item.dataset.index = index;

      const status = req.response ? req.response.status : 0;
      let statusClass = 'success';
      if (status >= 400) statusClass = 'error';
      else if (status >= 300) statusClass = 'redirect';

      const urlStr = StringUtils.truncateUrl(req.request.url);

      item.innerHTML = `
        <span class="method">${StringUtils.escapeHtml(req.request.method)}</span>
        <span class="status ${statusClass}">${status}</span>
        <span class="url" title="${StringUtils.escapeHtml(req.request.url)}">${StringUtils.escapeHtml(urlStr)}</span>
      `;

      item.addEventListener('click', () => onSelect(index));
      listEl.appendChild(item);
    });
  },

  switchTab(pane, tabName) {
    this.activeTabs[pane] = tabName;
    const paneEl = document.getElementById(pane + '-pane');
    if (!paneEl) return;

    paneEl.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    paneEl.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tab === tabName);
    });
  },

  updatePaneContent(pane, tabName, content) {
    const paneEl = document.getElementById(pane + '-pane');
    if (!paneEl) return;

    const contentEl = paneEl.querySelector(`.tab-content[data-tab="${tabName}"]`);
    if (!contentEl) return;

    if (tabName === 'hex') {
      const hexDiv = contentEl.querySelector('.hex-display');
      if (hexDiv) hexDiv.textContent = content;
    } else {
      const textarea = contentEl.querySelector('textarea');
      const lineNumbers = contentEl.querySelector('.line-numbers');
      if (textarea) {
        textarea.value = content;
        DomUtils.updateLineNumbers(textarea, lineNumbers);
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
