/**
 * layout-manager.js - 布局切换管理（上下/左右/标签页）
 */

const LayoutManager = {
  currentLayout: 'vertical',

  switchLayout(layout) {
    this.currentLayout = layout;
    const contentEl = document.querySelector('.content');
    if (!contentEl) return;

    contentEl.classList.remove('layout-vertical', 'layout-horizontal', 'layout-tabs');
    contentEl.classList.add('layout-' + layout);

    const reqPane = document.getElementById('request-pane');
    const resPane = document.getElementById('response-pane');
    if (!reqPane || !resPane) return;

    if (layout === 'tabs') {
      reqPane.style.display = 'block';
      resPane.style.display = 'none';
    } else {
      reqPane.style.display = 'flex';
      resPane.style.display = 'flex';
    }
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
    const reqPane = document.getElementById('request-pane');
    const resPane = document.getElementById('response-pane');
    if (reqPane && resPane) {
      reqPane.style.display = 'flex';
      resPane.style.display = 'none';
    }
  },

  showResponsePane() {
    const reqPane = document.getElementById('request-pane');
    const resPane = document.getElementById('response-pane');
    if (reqPane && resPane) {
      reqPane.style.display = 'none';
      resPane.style.display = 'flex';
    }
  }
};

export default LayoutManager;
