/**
 * layout-manager.js - 布局切换管理（上下/左右/标签页）（jQuery 辅助封装）
 */

const LayoutManager = {
  currentLayout: 'vertical',
  activeTabPane: 'request',

  switchLayout(layout) {
    this.currentLayout = layout;
    const $content = $('.content');
    if (!$content.length) return;

    $content.removeClass('layout-vertical layout-horizontal layout-tabs')
      .addClass('layout-' + layout);

    const $reqPane = $('#request-pane');
    const $resPane = $('#response-pane');
    const $resizer = $('#resizer');
    if (!$reqPane.length || !$resPane.length) return;

    // Update layout button active state
    $('.layout-bar .layout-btn').removeClass('active')
      .filter(`[data-layout="${layout}"]`).addClass('active');

    if (layout === 'tabs') {
      // In tabs mode, show the active pane
      $reqPane.toggleClass('active-tab-pane', this.activeTabPane === 'request');
      $resPane.toggleClass('active-tab-pane', this.activeTabPane === 'response');
      $reqPane.css('flex', '');
      $resPane.css('flex', '');
      $resizer.hide();
    } else {
      // In vertical/horizontal mode, both panes visible
      $reqPane.addClass('active-tab-pane');
      $resPane.addClass('active-tab-pane');
      $reqPane.css({ display: '', flex: '' });
      $resPane.css({ display: '', flex: '' });
      $resizer.show();
    }

    this._updateResizerDirection(layout);
  },

  getCurrentLayout() {
    return this.currentLayout;
  },

  initLayoutButtons(container, onLayoutChange) {
    const $container = $(container);
    if (!$container.length) return;
    const self = this;

    // Set initial active button (B5 fix)
    $container.find('.layout-btn').removeClass('active')
      .filter(`[data-layout="${this.currentLayout}"]`).addClass('active');

    $container.find('.layout-btn').on('click', function() {
      const layout = $(this).attr('data-layout');
      self.switchLayout(layout);
      if (onLayoutChange) onLayoutChange(layout);
    });
  },

  showRequestPane() {
    this.activeTabPane = 'request';
    if (this.currentLayout === 'tabs') {
      $('#request-pane').addClass('active-tab-pane');
      $('#response-pane').removeClass('active-tab-pane');
    }
  },

  showResponsePane() {
    this.activeTabPane = 'response';
    if (this.currentLayout === 'tabs') {
      $('#request-pane').removeClass('active-tab-pane');
      $('#response-pane').addClass('active-tab-pane');
    }
  },

  _updateResizerDirection(layout) {
    const $resizer = $('#resizer');
    if (!$resizer.length) return;
    $resizer.removeClass('resizer-vertical resizer-horizontal');
    if (layout === 'horizontal') {
      $resizer.addClass('resizer-horizontal');
    } else {
      $resizer.addClass('resizer-vertical');
    }
  }
};

export default LayoutManager;
