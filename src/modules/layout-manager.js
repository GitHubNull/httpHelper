/**
 * layout-manager.js - 布局切换管理（上下/左右/标签页）
 */

const LayoutManager = {
  currentLayout: 'vertical',
  activeTabPane: 'request',

  switchLayout(layout) {
    this.currentLayout = layout;
    const contentEl = document.querySelector('.content');
    if (!contentEl) return;

    contentEl.classList.remove('layout-vertical', 'layout-horizontal', 'layout-tabs');
    contentEl.classList.add('layout-' + layout);

    const reqPane = document.getElementById('request-pane');
    const resPane = document.getElementById('response-pane');
    const resizer = document.getElementById('resizer');
    if (!reqPane || !resPane) return;

    // Update layout button active state
    document.querySelectorAll('.layout-bar .layout-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.layout === layout);
    });

    if (layout === 'tabs') {
      reqPane.classList.toggle('active-tab-pane', this.activeTabPane === 'request');
      resPane.classList.toggle('active-tab-pane', this.activeTabPane === 'response');
      if (resizer) resizer.style.display = 'none';
    } else {
      reqPane.classList.add('active-tab-pane');
      resPane.classList.add('active-tab-pane');
      reqPane.style.display = '';
      resPane.style.display = '';
      // Reset flex from potential resizer drag
      reqPane.style.flex = '';
      resPane.style.flex = '';
      if (resizer) resizer.style.display = '';
    }

    this._updateResizerDirection(layout);
  },

  getCurrentLayout() {
    return this.currentLayout;
  },

  initLayoutButtons(container, onLayoutChange) {
    if (!container) return;
    container.querySelectorAll('.layout-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const layout = btn.dataset.layout;
        this.switchLayout(layout);
        if (onLayoutChange) onLayoutChange(layout);
      });
    });
  },

  showRequestPane() {
    this.activeTabPane = 'request';
    if (this.currentLayout === 'tabs') {
      const reqPane = document.getElementById('request-pane');
      const resPane = document.getElementById('response-pane');
      if (reqPane) reqPane.classList.add('active-tab-pane');
      if (resPane) resPane.classList.remove('active-tab-pane');
    }
  },

  showResponsePane() {
    this.activeTabPane = 'response';
    if (this.currentLayout === 'tabs') {
      const reqPane = document.getElementById('request-pane');
      const resPane = document.getElementById('response-pane');
      if (reqPane) reqPane.classList.remove('active-tab-pane');
      if (resPane) resPane.classList.add('active-tab-pane');
    }
  },

  _updateResizerDirection(layout) {
    const resizer = document.getElementById('resizer');
    if (!resizer) return;
    resizer.classList.remove('resizer-vertical', 'resizer-horizontal');
    if (layout === 'horizontal') {
      resizer.classList.add('resizer-horizontal');
    } else {
      resizer.classList.add('resizer-vertical');
    }
  }
};

export default LayoutManager;
