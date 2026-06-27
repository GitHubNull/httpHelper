/**
 * table-manager.js - 通用表格交互管理（列宽调整、列拖拽排序、数据渲染）
 */

const TableManager = {
  /**
   * 初始化列宽调整
   * 在每个 th 右边缘添加 resize handle，拖拽调整列宽
   * @param {jQuery} $table
   */
  initColumnResize($table) {
    const $ths = $table.find('thead th');
    $ths.each(function () {
      const $th = $(this);
      if ($th.find('.col-resize-handle').length) return;
      $th.css('position', 'relative');
      const $handle = $('<div class="col-resize-handle"></div>');
      $th.append($handle);
    });

    let isDragging = false;
    let startX = 0;
    let $currentTh = null;
    let startWidth = 0;

    $table.on('mousedown', '.col-resize-handle', function (e) {
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      $currentTh = $(this).closest('th');
      startX = e.clientX;
      startWidth = $currentTh.outerWidth();
      $('body').css('cursor', 'col-resize').css('user-select', 'none');
    });

    $(document).on('mousemove.colResize', function (e) {
      if (!isDragging || !$currentTh) return;
      const delta = e.clientX - startX;
      const newWidth = Math.max(30, startWidth + delta);
      $currentTh.css('width', newWidth + 'px');
      $currentTh.css('min-width', newWidth + 'px');
    });

    $(document).on('mouseup.colResize', function () {
      if (!isDragging) return;
      isDragging = false;
      $currentTh = null;
      $('body').css('cursor', '').css('user-select', '');
    });
  },

  /**
   * 初始化列拖拽排序（使用 SortableJS）
   * @param {jQuery} $table
   */
  initColumnReorder($table) {
    const theadRow = $table.find('thead tr')[0];
    if (!theadRow || typeof Sortable === 'undefined') return;

    Sortable.create(theadRow, {
      animation: 150,
      delay: 100,
      filter: '.col-resize-handle',
      onEnd: (evt) => {
        if (evt.oldIndex === evt.newIndex) return;
        // Sync tbody column order
        $table.find('tbody tr').each(function () {
          const $tr = $(this);
          const $tds = $tr.children('td');
          if ($tds.length <= evt.oldIndex || $tds.length <= evt.newIndex) return;
          const $moved = $tds.eq(evt.oldIndex).detach();
          if (evt.newIndex >= $tds.length - 1) {
            $tr.append($moved);
          } else {
            const targetIndex = evt.newIndex > evt.oldIndex ? evt.newIndex : evt.newIndex;
            $tr.children('td').eq(targetIndex).before($moved);
          }
        });
      }
    });
  },

  /**
   * 渲染表格 tbody 数据
   * @param {jQuery} $table
   * @param {Array} columns - [{key, render(row, index)}]
   * @param {Array} data - 数据行数组
   * @param {Object} options - {onRowClick, selectedIndex}
   */
  renderTableBody($table, columns, data, options = {}) {
    const $tbody = $table.find('tbody');
    $tbody.empty();

    if (!data || data.length === 0) {
      const colCount = $table.find('thead th').length;
      $tbody.append(`<tr><td colspan="${colCount}" class="text-center text-muted py-2">No data</td></tr>`);
      return;
    }

    // Get current column order from thead
    const $ths = $table.find('thead th');
    const colOrder = [];
    $ths.each(function () {
      colOrder.push($(this).attr('data-col'));
    });

    data.forEach((row, index) => {
      const $tr = $('<tr>');
      if (options.selectedIndex === index) {
        $tr.addClass('table-active');
      }
      // Build cells in column order
      colOrder.forEach((colKey) => {
        const col = columns.find(c => c.key === colKey);
        if (col) {
          const cellHtml = col.render(row, index);
          $tr.append($('<td>').html(cellHtml));
        }
      });
      if (options.onRowClick) {
        $tr.css('cursor', 'pointer').on('click', () => options.onRowClick(index));
      }
      $tbody.append($tr);
    });
  },

  /**
   * 获取当前列顺序
   * @param {jQuery} $table
   * @returns {Array} data-col 值数组
   */
  getColumnOrder($table) {
    const order = [];
    $table.find('thead th').each(function () {
      order.push($(this).attr('data-col'));
    });
    return order;
  }
};

export default TableManager;
