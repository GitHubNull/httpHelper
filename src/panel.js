import NetworkHandler from './modules/network-handler.js';
import ContentFormatter from './modules/content-formatter.js';
import UiRenderer from './modules/ui-renderer.js';
import LayoutManager from './modules/layout-manager.js';
import SearchHighlighter from './modules/search-highlighter.js';
import SessionExtractor from './modules/session-extractor.js';
import SessionStorage from './modules/session-storage.js';
import TableManager from './modules/table-manager.js';
import ClipboardUtils from './utils/clipboard-utils.js';
import DomUtils from './utils/dom-utils.js';
import StringUtils from './utils/string-utils.js';

(function () {
  'use strict';

  // === State ===
  let selectedIndex = -1;
  let currentRequest = null;
  let currentResponseBody = '';
  let schemes = [];
  let activeScheme = null;
  let editingFieldId = null;
  let editingSchemeId = null;

  // === Filter / Sort / Display State ===
  let displayedRequests = [];
  let editingNoteUid = null;
  const sortState = { column: null, direction: 'asc' };
  const filterState = {
    method: '', type: '', color: '', keyword: '',
    useRegex: false, caseSensitive: false, invert: false
  };

  // Per-pane search state
  const paneSearchState = {
    req: { matches: [], currentIndex: -1 },
    res: { matches: [], currentIndex: -1 }
  };

  // === DOM Refs ===
  const $reqText = $('#raw-request');
  const $resText = $('#raw-response');
  const $hexReq = $('#hex-request');
  const $hexRes = $('#hex-response');

  // === Init ===
  UiRenderer.setMetaMap(NetworkHandler.requestMeta);
  NetworkHandler.initNetworkListener((request) => {
    refreshTable();
    checkSessionExtraction(request);
  });

  loadSchemes().then(() => {
    renderSchemesTable();
    renderFieldsTable();
  });

  // Layout
  LayoutManager.initLayoutButtons($('.layout-bar'), (layout) => {
    // Show/hide tab-pane-switcher based on layout mode
    if (layout === 'tabs') {
      $('.tab-pane-switcher').removeClass('d-none').addClass('d-flex');
    } else {
      $('.tab-pane-switcher').addClass('d-none').removeClass('d-flex');
    }
  });

  // Tab pane switching (in tabs layout mode)
  $(document).on('click', '.pane-tab-btn', function () {
    const target = $(this).attr('data-target');
    $('.pane-tab-btn').removeClass('btn-primary active').addClass('btn-outline-primary');
    $(this).removeClass('btn-outline-primary').addClass('btn-primary active');
    if (target === 'request') {
      LayoutManager.showRequestPane();
    } else {
      LayoutManager.showResponsePane();
    }
  });

  // Pane searches
  initPaneSearch('req');
  initPaneSearch('res');

  // Tab switching (Raw/Pretty/Hex)
  $(document).on('click', '.tab-btn', function () {
    const pane = $(this).attr('data-pane');
    const tab = $(this).attr('data-tab');
    UiRenderer.switchTab(pane, tab);
    if (currentRequest) refreshSearchForActiveTab();
  });

  // Resizers
  initTableResizer();
  initPaneResizer();

  // Copy / Download
  $('#copy-req').on('click', () => {
    const text = getPaneText('request', UiRenderer.getActiveTab('request'));
    ClipboardUtils.copyText(text, '请求已复制！');
  });
  $('#copy-res').on('click', () => {
    const text = getPaneText('response', UiRenderer.getActiveTab('response'));
    ClipboardUtils.copyText(text, '响应已复制！');
  });
  $('#download-req').on('click', () => {
    const req = currentRequest;
    const text = getPaneText('request', UiRenderer.getActiveTab('request'));
    const name = req ? 'request_' + (req.request.method || 'HTTP') + '.txt' : 'request.txt';
    ClipboardUtils.downloadText(text, name);
  });
  $('#download-res').on('click', () => {
    const req = currentRequest;
    const text = getPaneText('response', UiRenderer.getActiveTab('response'));
    const name = req ? 'response_' + (req.response ? req.response.status : 'HTTP') + '.txt' : 'response.txt';
    ClipboardUtils.downloadText(text, name);
  });

  // Copy Headers / Copy Body
  $('#copy-req-headers').on('click', () => {
    if (!currentRequest) return;
    const raw = ContentFormatter.buildRawRequest(currentRequest.request);
    const headers = raw.split('\r\n\r\n')[0];
    ClipboardUtils.copyText(headers, '请求头已复制！');
  });
  $('#copy-res-headers').on('click', () => {
    if (!currentRequest) return;
    const raw = ContentFormatter.buildRawResponse(currentRequest.response, currentResponseBody);
    const headers = raw.split('\r\n\r\n')[0];
    ClipboardUtils.copyText(headers, '响应头已复制！');
  });
  $('#copy-req-body').on('click', () => {
    if (!currentRequest) return;
    const body = currentRequest.request.postData ? currentRequest.request.postData.text : '';
    ClipboardUtils.copyText(body || '', body ? '请求体已复制！' : '无主体内容');
  });
  $('#copy-res-body').on('click', () => {
    ClipboardUtils.copyText(currentResponseBody || '', currentResponseBody ? '响应体已复制！' : '无主体内容');
  });

  // Clear
  $('#clear').on('click', () => {
    NetworkHandler.clearRequests();
    selectedIndex = -1;
    currentRequest = null;
    currentResponseBody = '';
    displayedRequests = [];
    $reqText.val('');
    $resText.val('');
    $hexReq.text('');
    $hexRes.text('');
    $('#pretty-request').text('');
    $('#pretty-response').text('');
    refreshTable();
  });

  // === Session Config Tab Events ===
  // Add Field
  $('#add-field-btn').on('click', () => showFieldEditor(null));
  // Add Scheme
  $('#add-scheme-btn').on('click', () => showSchemeEditor(null));
  // Copy Session (in pane headers)
  $(document).on('click', '.copy-session-btn', async () => {
    if (!activeScheme || !currentRequest) {
      ClipboardUtils.showToast('无激活方案或请求');
      return;
    }
    if (!activeScheme.fields) {
      activeScheme.fields = await SessionStorage.getSchemeFields(activeScheme.id);
    }
    const result = SessionExtractor.applySchemeToRequest(currentRequest, activeScheme);
    if (result) {
      const text = Object.entries(result).map(([k, v]) => `${k}: ${v}`).join('\n');
      ClipboardUtils.copyText(text, '会话已复制！');
    } else {
      ClipboardUtils.showToast('未提取到会话数据');
    }
  });

  // Save Field (modal) - N:N model, no scheme association
  $('#save-field-btn').on('click', async () => {
    const name = $('#edit-field-name').val().trim();
    const pattern = $('#edit-field-pattern').val().trim();
    if (!name || !pattern) {
      ClipboardUtils.showToast('名称和匹配规则为必填项');
      return;
    }
    const field = {
      id: editingFieldId || undefined,
      name,
      location: { type: $('#edit-field-location').val(), name: $('#edit-field-location-name').val().trim() },
      mode: $('#edit-field-mode').val(),
      pattern,
      enabled: true
    };
    if (editingFieldId) {
      field.id = editingFieldId;
      await SessionStorage.updateField(field);
    } else {
      const result = await SessionStorage.saveField(field);
      if (!result.success) { ClipboardUtils.showToast(result.message); return; }
    }
    bootstrap.Modal.getInstance($('#fieldEditorModal')[0]).hide();
    editingFieldId = null;
    await loadSchemes();
    renderFieldsTable();
  });

  // Save Scheme (modal) - with fieldIds from dual-list selector
  $('#save-scheme-btn').on('click', async () => {
    const name = $('#edit-scheme-name').val().trim();
    if (!name) { ClipboardUtils.showToast('方案名称为必填项'); return; }
    const domains = $('#edit-scheme-domains').val().split(',').map(s => s.trim()).filter(Boolean);
    // Collect selected fieldIds from right-side list
    const fieldIds = [];
    $('#selected-fields-list option').each(function () {
      fieldIds.push($(this).val());
    });
    const scheme = {
      id: editingSchemeId || 'scheme_' + Date.now(),
      name,
      targetDomains: domains,
      domainRegex: $('#edit-scheme-regex').val().trim(),
      description: $('#edit-scheme-desc').val().trim(),
      fieldIds,
      isActive: false
    };
    if (editingSchemeId) {
      const existing = schemes.find(s => s.id === editingSchemeId);
      if (existing) {
        scheme.isActive = existing.isActive;
      }
      await SessionStorage.updateScheme(scheme);
    } else {
      const result = await SessionStorage.saveScheme(scheme);
      if (!result.success) { ClipboardUtils.showToast(result.message); return; }
    }
    bootstrap.Modal.getInstance($('#schemeEditorModal')[0]).hide();
    editingSchemeId = null;
    await loadSchemes();
    renderSchemesTable();
  });

  // Field table event delegation: toggle enabled
  $('#fields-table').on('change', '.toggle-enabled', async function () {
    const fieldId = $(this).attr('data-id');
    const enabled = $(this).prop('checked');
    await SessionStorage.toggleFieldEnabled(fieldId, enabled);
  });

  // Field table: edit/delete
  $('#fields-table').on('click', '.edit-field-btn', async function () {
    const fieldId = $(this).attr('data-id');
    const allFields = await SessionStorage.loadAllFields();
    const field = allFields.find(f => f.id === fieldId);
    if (field) showFieldEditor(field);
  });
  $('#fields-table').on('click', '.delete-field-btn', async function () {
    const fieldId = $(this).attr('data-id');
    await SessionStorage.deleteField(fieldId);
    await loadSchemes();
    renderFieldsTable();
  });

  // Scheme table event delegation: toggle enabled
  $('#schemes-table').on('change', '.toggle-enabled', async function () {
    const schemeId = $(this).attr('data-id');
    const enabled = $(this).prop('checked');
    if (enabled) {
      await SessionStorage.setActiveScheme(schemeId);
    } else {
      await SessionStorage.setActiveScheme(null);
    }
    await loadSchemes();
    renderSchemesTable();
  });

  // Scheme table: edit/delete
  $('#schemes-table').on('click', '.edit-scheme-btn', function () {
    const id = $(this).attr('data-id');
    const scheme = schemes.find(s => s.id === id);
    if (scheme) showSchemeEditor(scheme);
  });
  $('#schemes-table').on('click', '.delete-scheme-btn', async function () {
    const id = $(this).attr('data-id');
    await SessionStorage.deleteScheme(id);
    await loadSchemes();
    renderSchemesTable();
    renderFieldsTable();
  });

  // Init tables with column features
  TableManager.initColumnResize($('#request-table'));
  TableManager.initColumnReorder($('#request-table'));
  TableManager.initColumnResize($('#fields-table'));
  TableManager.initColumnReorder($('#fields-table'));
  TableManager.initColumnResize($('#schemes-table'));
  TableManager.initColumnReorder($('#schemes-table'));

  // Column visibility config
  initColumnConfig();

  // === HTTP History Feature Init ===
  initRecording();
  initFilters();
  initSorting();
  initColorPicker();
  initNoteEditor();

  // Session table search filters
  $('#fields-search-input').on('input', DomUtils.debounce(() => renderFieldsTable(), 300));
  $('#schemes-search-input').on('input', DomUtils.debounce(() => renderSchemesTable(), 300));

  // Dual-list selector events
  $('#field-move-right').on('click', () => {
    $('#available-fields-list option:selected').appendTo('#selected-fields-list');
    updateDualListButtons();
  });
  $('#field-move-left').on('click', () => {
    $('#selected-fields-list option:selected').appendTo('#available-fields-list');
    updateDualListButtons();
  });
  $('#field-move-all-right').on('click', () => {
    $('#available-fields-list option').appendTo('#selected-fields-list');
    updateDualListButtons();
  });
  $('#field-move-all-left').on('click', () => {
    $('#selected-fields-list option').appendTo('#available-fields-list');
    updateDualListButtons();
  });

  // Refresh session tables when tab shown
  $('#main-tabs button[data-bs-target="#tab-session-config"]').on('shown.bs.tab', () => {
    renderFieldsTable();
    renderSchemesTable();
  });
  // Refresh schemes table when sub-tab shown
  $('#session-sub-tabs button[data-bs-target="#session-schemes-tab"]').on('shown.bs.tab', () => {
    renderSchemesTable();
  });
  $('#session-sub-tabs button[data-bs-target="#session-fields-tab"]').on('shown.bs.tab', () => {
    renderFieldsTable();
  });

  // === Core Functions ===
  function selectRequest(index) {
    selectedIndex = index;
    const request = displayedRequests[index];
    currentRequest = request;

    clearPaneHighlights('req');
    clearPaneHighlights('res');
    refreshTable();

    if (!request) return;

    // Build request
    const rawReq = ContentFormatter.buildRawRequest(request.request);
    const prettyReq = ContentFormatter.buildPrettyRequest(request.request);
    const hexReqText = ContentFormatter.buildHexRequest(request.request);

    UiRenderer.updatePaneContent('request', 'raw', rawReq);
    UiRenderer.updatePaneContent('request', 'pretty', prettyReq);
    UiRenderer.updatePaneContent('request', 'hex', hexReqText);

    // Response loading
    UiRenderer.updatePaneContent('response', 'raw', '加载中...');
    UiRenderer.updatePaneContent('response', 'pretty', { content: '加载中...', language: 'plaintext' });
    UiRenderer.updatePaneContent('response', 'hex', '加载中...');

    request.getContent((body) => {
      currentResponseBody = body || '';
      const rawRes = ContentFormatter.buildRawResponse(request.response, body);
      const prettyRes = ContentFormatter.buildPrettyResponse(request.response, body);
      const hexResText = ContentFormatter.buildHexResponse(request.response, body);

      UiRenderer.updatePaneContent('response', 'raw', rawRes);
      UiRenderer.updatePaneContent('response', 'pretty', prettyRes);
      UiRenderer.updatePaneContent('response', 'hex', hexResText);

      // Smart tab switching
      const resType = ContentFormatter.detectContentType(request.response ? request.response.headers : []);
      if (resType === 'json' || resType === 'xml') UiRenderer.setActiveTab('response', 'pretty');
      else if (resType === 'binary') UiRenderer.setActiveTab('response', 'hex');
      else UiRenderer.setActiveTab('response', 'raw');

      const reqType = ContentFormatter.detectContentType(request.request.headers);
      if (reqType === 'json' || reqType === 'xml') UiRenderer.setActiveTab('request', 'pretty');
      else if (reqType === 'binary') UiRenderer.setActiveTab('request', 'hex');
      else UiRenderer.setActiveTab('request', 'raw');

      // Enable/disable Copy Body buttons based on content type
      $('#copy-req-body').prop('disabled', reqType === 'binary' || !request.request.postData);
      $('#copy-res-body').prop('disabled', resType === 'binary' || !body);

      refreshSearchForActiveTab();
    });
  }

  function getPaneText(pane, tab) {
    if (pane === 'request') {
      if (tab === 'raw') return $reqText.val();
      if (tab === 'pretty') return $('#pretty-request').text();
      if (tab === 'hex') return $hexReq.text();
    } else {
      if (tab === 'raw') return $resText.val();
      if (tab === 'pretty') return $('#pretty-response').text();
      if (tab === 'hex') return $hexRes.text();
    }
    return '';
  }

  // === Session CRUD ===
  async function loadSchemes() {
    await SessionStorage.migrateIfNeeded();
    schemes = await SessionStorage.loadSchemes();
    const activeId = await SessionStorage.getActiveScheme();
    activeScheme = schemes.find(s => s.id === activeId) || null;
    if (activeScheme) {
      activeScheme.fields = await SessionStorage.getSchemeFields(activeScheme.id);
    }
  }

  async function renderFieldsTable() {
    const allFields = await SessionStorage.loadAllFields();
    // Build used-by info for each field
    const fieldsWithUsedBy = allFields.map(f => {
      const usedBySchemes = schemes.filter(s => s.fieldIds && s.fieldIds.includes(f.id));
      return { ...f, usedByNames: usedBySchemes.map(s => s.name) };
    });
    // Apply search filter
    const filterText = ($('#fields-search-input').val() || '').toLowerCase().trim();
    const filteredFields = filterText
      ? fieldsWithUsedBy.filter(f => {
          return (f.name || '').toLowerCase().includes(filterText)
            || (f.mode || '').toLowerCase().includes(filterText)
            || (f.pattern || '').toLowerCase().includes(filterText)
            || (f.location && f.location.name || '').toLowerCase().includes(filterText);
        })
      : fieldsWithUsedBy;
    const columns = [
      { key: 'index', render: (row, index) => `<span class="text-muted">${index + 1}</span>` },
      { key: 'enabled', render: (row) => `<div class="form-check form-switch d-flex justify-content-center mb-0"><input class="form-check-input toggle-enabled" type="checkbox" data-id="${row.id}" ${row.enabled !== false ? 'checked' : ''}></div>` },
      { key: 'name', render: (row) => row.name },
      { key: 'locationType', render: (row) => row.location ? row.location.type : '' },
      { key: 'locationName', render: (row) => row.location ? (row.location.name || '-') : '' },
      { key: 'mode', render: (row) => `<span class="badge bg-secondary">${row.mode}</span>` },
      { key: 'pattern', render: (row) => `<code class="small">${escapeHtml(row.pattern || '')}</code>` },
      { key: 'usedBy', render: (row) => row.usedByNames.length > 0 ? escapeHtml(row.usedByNames.join(', ')) : '<span class="text-muted">-</span>' },
      { key: 'actions', render: (row) => `<button class="btn btn-sm btn-outline-primary py-0 px-1 edit-field-btn" data-id="${row.id}" title="编辑"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger py-0 px-1 delete-field-btn" data-id="${row.id}" title="删除"><i class="bi bi-trash"></i></button>` }
    ];
    TableManager.renderTableBody($('#fields-table'), columns, filteredFields, {});
  }

  function renderSchemesTable() {
    // Apply search filter
    const filterText = ($('#schemes-search-input').val() || '').toLowerCase().trim();
    const filteredSchemes = filterText
      ? schemes.filter(s => {
          return (s.name || '').toLowerCase().includes(filterText)
            || (s.targetDomains || []).join(', ').toLowerCase().includes(filterText)
            || (s.description || '').toLowerCase().includes(filterText);
        })
      : schemes;
    const columns = [
      { key: 'index', render: (row, index) => `<span class="text-muted">${index + 1}</span>` },
      { key: 'enabled', render: (row) => `<div class="form-check form-switch d-flex justify-content-center mb-0"><input class="form-check-input toggle-enabled" type="checkbox" data-id="${row.id}" ${row.isActive ? 'checked' : ''}></div>` },
      { key: 'name', render: (row) => `<strong>${escapeHtml(row.name)}</strong>` },
      { key: 'domains', render: (row) => escapeHtml((row.targetDomains || []).join(', ')) },
      { key: 'regex', render: (row) => `<code class="small">${escapeHtml(row.domainRegex || '')}</code>` },
      { key: 'description', render: (row) => escapeHtml(row.description || '') },
      { key: 'fieldCount', render: (row) => (row.fieldIds || []).length },
      { key: 'actions', render: (row) => `<button class="btn btn-sm btn-outline-primary py-0 px-1 edit-scheme-btn" data-id="${row.id}" title="编辑"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger py-0 px-1 delete-scheme-btn" data-id="${row.id}" title="删除"><i class="bi bi-trash"></i></button>` }
    ];
    TableManager.renderTableBody($('#schemes-table'), columns, filteredSchemes, {});
  }

  function showFieldEditor(field) {
    editingFieldId = field ? field.id : null;
    if (field) {
      $('#edit-field-name').val(field.name);
      $('#edit-field-location').val(field.location ? field.location.type : 'header');
      $('#edit-field-location-name').val(field.location ? field.location.name : '');
      $('#edit-field-mode').val(field.mode || 'substring');
      $('#edit-field-pattern').val(field.pattern || '');
    } else {
      $('#edit-field-name').val('');
      $('#edit-field-location').val('header');
      $('#edit-field-location-name').val('');
      $('#edit-field-mode').val('substring');
      $('#edit-field-pattern').val('');
    }
    new bootstrap.Modal($('#fieldEditorModal')[0]).show();
  }

  async function showSchemeEditor(scheme) {
    editingSchemeId = scheme ? scheme.id : null;
    if (scheme) {
      $('#edit-scheme-name').val(scheme.name);
      $('#edit-scheme-domains').val((scheme.targetDomains || []).join(', '));
      $('#edit-scheme-regex').val(scheme.domainRegex || '');
      $('#edit-scheme-desc').val(scheme.description || '');
    } else {
      $('#edit-scheme-name').val('');
      $('#edit-scheme-domains').val('');
      $('#edit-scheme-regex').val('');
      $('#edit-scheme-desc').val('');
    }
    // Populate dual-list field selector
    const allFields = await SessionStorage.loadAllFields();
    const selectedFieldIds = scheme ? (scheme.fieldIds || []) : [];
    const $available = $('#available-fields-list').empty();
    const $selected = $('#selected-fields-list').empty();
    allFields.forEach(f => {
      const optHtml = `<option value="${f.id}">${escapeHtml(f.name)} (${f.mode})</option>`;
      if (selectedFieldIds.includes(f.id)) {
        $selected.append(optHtml);
      } else {
        $available.append(optHtml);
      }
    });
    updateDualListButtons();
    new bootstrap.Modal($('#schemeEditorModal')[0]).show();
  }

  // Dual-list selector button state update
  function updateDualListButtons() {
    const availableCount = $('#available-fields-list option').length;
    const selectedCount = $('#selected-fields-list option').length;
    $('#field-move-all-right').prop('disabled', availableCount === 0);
    $('#field-move-all-left').prop('disabled', selectedCount === 0);
  }

  // === Search ===
  function performPaneSearch(prefix, pattern, options) {
    const pane = prefix === 'req' ? 'request' : 'response';
    const tab = UiRenderer.getActiveTab(pane);
    const text = getPaneText(pane, tab);
    const matches = SearchHighlighter.performSearch(text, pattern, options);
    paneSearchState[prefix].matches = matches;
    paneSearchState[prefix].currentIndex = matches.length > 0 ? 0 : -1;
    applyHighlights(pane, tab, matches);
    updatePaneSearchCount(prefix);
  }

  function updatePaneSearchCount(prefix) {
    const $count = $(`#${prefix}-search-count`);
    if (!$count.length) return;
    const state = paneSearchState[prefix];
    if (state.matches.length > 0 && state.currentIndex >= 0) {
      $count.text(`${state.currentIndex + 1}/${state.matches.length} 个高亮`);
    } else {
      $count.text('0 个高亮');
    }
  }

  function navigatePaneMatch(prefix, direction) {
    const state = paneSearchState[prefix];
    if (state.matches.length === 0) return;
    state.currentIndex = direction === 'next'
      ? (state.currentIndex + 1) % state.matches.length
      : (state.currentIndex - 1 + state.matches.length) % state.matches.length;
    updatePaneSearchCount(prefix);
    scrollToPaneMatch(prefix);
  }

  function scrollToPaneMatch(prefix) {
    const pane = prefix === 'req' ? 'request' : 'response';
    const $pane = $(`#${pane}-pane`);
    if (!$pane.length) return;
    const state = paneSearchState[prefix];
    const $marks = $pane.find('.highlight-overlay mark.search-highlight');
    const $mark = $marks.eq(state.currentIndex);
    if ($mark.length) $mark[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function refreshSearchForActiveTab() {
    ['req', 'res'].forEach(prefix => {
      const $input = $(`#${prefix}-search-input`);
      if ($input.length && $input.val()) {
        const options = {
          useRegex: $(`#${prefix}-search-regex`).hasClass('active'),
          caseSensitive: $(`#${prefix}-search-case`).hasClass('active')
        };
        performPaneSearch(prefix, $input.val(), options);
      }
    });
  }

  function initPaneSearch(prefix) {
    const $input = $(`#${prefix}-search-input`);
    const $icon = $(`#${prefix}-search-icon`);
    const $regexToggle = $(`#${prefix}-search-regex`);
    const $caseToggle = $(`#${prefix}-search-case`);
    const $prevBtn = $(`#${prefix}-search-prev`);
    const $nextBtn = $(`#${prefix}-search-next`);
    const $countEl = $(`#${prefix}-search-count`);

    // Dynamic icon state
    function updateSearchIcon() {
      const hasText = $input.val().length > 0;
      if (hasText) {
        $icon.html('<i class="bi bi-x-lg"></i>').attr('title', '清除').removeClass('search-icon-state').addClass('search-clear-state');
      } else {
        $icon.html('<i class="bi bi-search"></i>').attr('title', '搜索').removeClass('search-clear-state').addClass('search-icon-state');
      }
    }

    const doSearch = () => {
      const text = $input.val() || '';
      const options = { useRegex: $regexToggle.hasClass('active'), caseSensitive: $caseToggle.hasClass('active') };
      updateSearchIcon();
      if (!text) {
        clearPaneHighlights(prefix);
        paneSearchState[prefix] = { matches: [], currentIndex: -1 };
        $countEl.text('0 个高亮');
        return;
      }
      performPaneSearch(prefix, text, options);
    };

    // Click icon to clear
    $icon.on('click', () => {
      if ($input.val().length > 0) {
        $input.val('');
        clearPaneHighlights(prefix);
        paneSearchState[prefix] = { matches: [], currentIndex: -1 };
        $countEl.text('0 个高亮');
        updateSearchIcon();
      }
    });

    $input.on('input', DomUtils.debounce(doSearch, 300));
    $regexToggle.on('click', () => { $regexToggle.toggleClass('active'); doSearch(); });
    $caseToggle.on('click', () => { $caseToggle.toggleClass('active'); doSearch(); });
    $prevBtn.on('click', () => navigatePaneMatch(prefix, 'prev'));
    $nextBtn.on('click', () => navigatePaneMatch(prefix, 'next'));
  }

  function clearPaneHighlights(prefix) {
    const pane = prefix === 'req' ? 'request' : 'response';
    const $pane = $(`#${pane}-pane`);
    if (!$pane.length) return;
    $pane.find('.highlight-overlay').empty();
    $pane.find('.hex-display').each(function () {
      const $el = $(this);
      if ($el.html() !== $el.text()) $el.text($el.text());
    });
    // Clear pretty tab highlight marks
    $pane.find('.tab-content[data-tab="pretty"] code mark.search-highlight').each(function () {
      $(this).replaceWith($(this).text());
    });
  }

  function applyHighlights(pane, tab, matches) {
    clearPaneHighlights(pane === 'request' ? 'req' : 'res');
    if (!matches || matches.length === 0) return;
    const $pane = $(`#${pane}-pane`);
    if (!$pane.length) return;
    const $content = $pane.find(`.tab-content[data-tab="${tab}"]`);
    if (!$content.length) return;

    if (tab === 'hex') {
      const $hexDisplay = $content.find('.hex-display');
      if ($hexDisplay.length) SearchHighlighter.highlightHexMatches($hexDisplay[0], matches);
    } else if (tab === 'raw') {
      const $textarea = $content.find('textarea');
      if ($textarea.length) {
        DomUtils.createOverlayHighlighter($textarea[0]);
        const $overlay = $textarea.parent('.textarea-wrapper').find('.highlight-overlay');
        if ($overlay.length) {
          DomUtils.highlightOverlay($overlay[0], $textarea.val(), matches);
        }
      }
    } else if (tab === 'pretty') {
      // Highlight matches in the <code> element
      const $code = $content.find('code');
      if ($code.length) {
        const text = $code.text();
        let html = '';
        let lastIndex = 0;
        for (const match of matches) {
          html += escapeHtml(text.slice(lastIndex, match.start));
          html += `<mark class="search-highlight">${escapeHtml(text.slice(match.start, match.end))}</mark>`;
          lastIndex = match.end;
        }
        html += escapeHtml(text.slice(lastIndex));
        $code.html(html);
      }
    }
  }

  // === Resizers ===
  function initTableResizer() {
    const $resizer = $('#table-resizer');
    const $left = $('#request-table-area');
    const $right = $('#http-detail-area');
    if (!$resizer.length || !$left.length || !$right.length) return;

    let isDragging = false, startX = 0, startLeftW = 0;

    $resizer.on('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      startX = e.clientX;
      startLeftW = $left[0].getBoundingClientRect().width;
      $resizer.addClass('dragging');
      $('body').css('user-select', 'none');
    });

    $(document).on('mousemove.tableResize', (e) => {
      if (!isDragging) return;
      const container = $left[0].parentElement;
      const total = container.getBoundingClientRect().width - 4; // minus resizer
      const delta = e.clientX - startX;
      let leftW = startLeftW + delta;
      leftW = Math.max(200, Math.min(total * 0.7, leftW));
      $left.css('flex', `0 0 ${leftW}px`);
      $right.css('flex', '1 1 0');
    });

    $(document).on('mouseup.tableResize', () => {
      if (!isDragging) return;
      isDragging = false;
      $resizer.removeClass('dragging');
      $('body').css('user-select', '');
    });
  }

  function initPaneResizer() {
    const $resizer = $('#resizer');
    const $content = $('.content');
    if (!$resizer.length || !$content.length) return;

    const $reqPane = $('#request-pane');
    const $resPane = $('#response-pane');
    if (!$reqPane.length || !$resPane.length) return;

    let isDragging = false, startPos = 0, startSizeReq = 0, startSizeRes = 0;

    $resizer.on('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      $resizer.addClass('dragging');
      if (LayoutManager.getCurrentLayout() === 'horizontal') {
        startPos = e.clientX;
        startSizeReq = $reqPane[0].getBoundingClientRect().width;
        startSizeRes = $resPane[0].getBoundingClientRect().width;
      } else {
        startPos = e.clientY;
        startSizeReq = $reqPane[0].getBoundingClientRect().height;
        startSizeRes = $resPane[0].getBoundingClientRect().height;
      }
      $('body').css('user-select', 'none');
    });

    $(document).on('mousemove.paneResize', (e) => {
      if (!isDragging) return;
      const delta = LayoutManager.getCurrentLayout() === 'horizontal'
        ? e.clientX - startPos : e.clientY - startPos;
      const total = startSizeReq + startSizeRes;
      let reqRatio = ((startSizeReq + delta) / total) * 100;
      reqRatio = Math.max(10, Math.min(90, reqRatio));
      $reqPane.css('flex', `0 0 ${reqRatio}%`);
      $resPane.css('flex', `0 0 ${100 - reqRatio}%`);
    });

    $(document).on('mouseup.paneResize', () => {
      if (!isDragging) return;
      isDragging = false;
      $resizer.removeClass('dragging');
      $('body').css('user-select', '');
    });
  }

  // === Session Extraction ===
  async function checkSessionExtraction(request) {
    if (!activeScheme) return;
    if (!activeScheme.fields) {
      activeScheme.fields = await SessionStorage.getSchemeFields(activeScheme.id);
    }
    const result = SessionExtractor.applySchemeToRequest(request, activeScheme);
    if (result) {
      ClipboardUtils.showToast(`会话已提取：${Object.keys(result).join(', ')}`, 3000);
    }
  }

  // === Column Visibility Config ===
  function initColumnConfig() {
    const $btn = $('#col-config-btn');
    if (!$btn.length) return;
    let $dropdown = null;

    $btn.on('click', function (e) {
      e.stopPropagation();
      if ($dropdown && $dropdown.is(':visible')) {
        $dropdown.remove();
        $dropdown = null;
        return;
      }
      // Build dropdown
      const $table = $('#request-table');
      const $ths = $table.find('thead th');
      $dropdown = $('<div class="col-config-dropdown"></div>');

      $ths.each(function () {
        const $th = $(this);
        const col = $th.attr('data-col');
        const mandatory = $th.attr('data-mandatory') === 'true';
        const label = $th.text().trim();
        const isHidden = $th.hasClass('d-none');
        const disabled = mandatory ? 'disabled' : '';
        const checked = !isHidden ? 'checked' : '';
        $dropdown.append(`
          <div class="form-check">
            <input class="form-check-input" type="checkbox" value="${col}" id="col-vis-${col}" ${checked} ${disabled}>
            <label class="form-check-label" for="col-vis-${col}">${label}${mandatory ? ' *' : ''}</label>
          </div>
        `);
      });

      $dropdown.css({
        position: 'absolute',
        top: ($btn.offset().top + $btn.outerHeight()) + 'px',
        left: ($btn.offset().left - 60) + 'px'
      });
      $('body').append($dropdown);

      // Prevent dropdown close on internal click
      $dropdown.on('click', function (e) {
        e.stopPropagation();
      });

      // Handle changes
      $dropdown.on('change', 'input[type="checkbox"]', function () {
        const col = $(this).val();
        const visible = $(this).prop('checked');
        const colIndex = $table.find(`thead th[data-col="${col}"]`).index();
        if (colIndex < 0) return;
        // Toggle th
        $table.find(`thead th[data-col="${col}"]`).toggleClass('d-none', !visible);
        // Toggle all td in that column
        $table.find('tbody tr').each(function () {
          $(this).children('td').eq(colIndex).toggleClass('d-none', !visible);
        });
      });
    });

    // Close dropdown on outside click
    $(document).on('click', function () {
      if ($dropdown) { $dropdown.remove(); $dropdown = null; }
    });
  }

  // === HTTP History: Filter / Sort / Refresh ===
  function refreshTable() {
    displayedRequests = getFilteredRequests();
    displayedRequests = getSortedRequests(displayedRequests);
    // Re-find selected index by uid
    if (currentRequest && currentRequest._uid) {
      selectedIndex = displayedRequests.findIndex(r => r._uid === currentRequest._uid);
    } else {
      selectedIndex = -1;
    }
    UiRenderer.renderRequestTable(displayedRequests, selectedIndex, selectRequest, sortState, NetworkHandler.getRequestCount());
  }

  function getFilteredRequests() {
    const all = NetworkHandler.getRequests();
    let result = all.slice();
    const hasFilter = filterState.method || filterState.type || filterState.color || filterState.keyword;
    if (!hasFilter && !filterState.invert) return result;

    if (filterState.method) {
      result = result.filter(r => r.request.method === filterState.method);
    }
    if (filterState.type) {
      result = result.filter(r => StringUtils.getResourceCategory(r) === filterState.type);
    }
    if (filterState.color === 'none') {
      result = result.filter(r => !NetworkHandler.getRequestMeta(r._uid).color);
    } else if (filterState.color) {
      result = result.filter(r => NetworkHandler.getRequestMeta(r._uid).color === filterState.color);
    }
    if (filterState.keyword) {
      const kw = filterState.keyword;
      const flags = filterState.caseSensitive ? '' : 'i';
      result = result.filter(r => {
        const text = r.request.url + ' ' + r.request.method;
        if (filterState.useRegex) {
          try { return new RegExp(kw, flags).test(text); } catch { return false; }
        }
        return filterState.caseSensitive ? text.includes(kw) : text.toLowerCase().includes(kw.toLowerCase());
      });
    }
    if (filterState.invert) {
      const filteredSet = new Set(result);
      result = all.filter(r => !filteredSet.has(r));
    }
    return result;
  }

  function getSortedRequests(requests) {
    if (!sortState.column) return requests;
    const col = sortState.column;
    const dir = sortState.direction === 'asc' ? 1 : -1;
    return requests.slice().sort((a, b) => {
      let va, vb;
      switch (col) {
        case 'index':
          va = a._uid || 0; vb = b._uid || 0; break;
        case 'color':
          va = NetworkHandler.getRequestMeta(a._uid).color || '';
          vb = NetworkHandler.getRequestMeta(b._uid).color || '';
          break;
        case 'method':
          va = a.request.method || ''; vb = b.request.method || ''; break;
        case 'host':
          try { va = new URL(a.request.url).hostname; } catch { va = ''; }
          try { vb = new URL(b.request.url).hostname; } catch { vb = ''; }
          break;
        case 'url':
          try { const u = new URL(a.request.url); va = u.pathname + u.search; } catch { va = a.request.url; }
          try { const u = new URL(b.request.url); vb = u.pathname + u.search; } catch { vb = b.request.url; }
          break;
        case 'status':
          va = a.response ? a.response.status : 0;
          vb = b.response ? b.response.status : 0;
          break;
        case 'type':
          va = StringUtils.getResourceCategory(a);
          vb = StringUtils.getResourceCategory(b);
          break;
        case 'length':
          va = (a.response && a.response.content) ? a.response.content.size : 0;
          vb = (b.response && b.response.content) ? b.response.content.size : 0;
          break;
        case 'reqtime':
          va = a._reqStartTime ? new Date(a._reqStartTime).getTime() : 0;
          vb = b._reqStartTime ? new Date(b._reqStartTime).getTime() : 0;
          break;
        case 'restime':
          va = a._resEndTime ? new Date(a._resEndTime).getTime() : 0;
          vb = b._resEndTime ? new Date(b._resEndTime).getTime() : 0;
          break;
        case 'time':
          va = a.time || 0; vb = b.time || 0; break;
        case 'note':
          va = NetworkHandler.getRequestMeta(a._uid).note || '';
          vb = NetworkHandler.getRequestMeta(b._uid).note || '';
          break;
        default: return 0;
      }
      if (typeof va === 'string' && typeof vb === 'string') {
        return dir * va.localeCompare(vb);
      }
      return dir * (va < vb ? -1 : va > vb ? 1 : 0);
    });
  }

  // === Recording Toggle ===
  function initRecording() {
    $('#record-toggle').on('click', function () {
      const active = $(this).hasClass('active');
      if (active) {
        NetworkHandler.setRecording(false);
        $(this).removeClass('active').attr('title', '恢复录制');
        ClipboardUtils.showToast('录制已暂停');
      } else {
        NetworkHandler.setRecording(true);
        $(this).addClass('active').attr('title', '暂停录制');
        ClipboardUtils.showToast('录制已恢复');
      }
    });
  }

  // === Filter Controls ===
  function initFilters() {
    // Advanced filter toggle - expand/collapse advanced filter row
    $('#filter-advanced-toggle').on('click', function () {
      const $row = $('#filter-advanced-row');
      const isHidden = $row.hasClass('d-none');
      if (isHidden) {
        $row.removeClass('d-none').addClass('d-flex');
        $(this).addClass('active').attr('title', '隐藏高级过滤');
      } else {
        $row.removeClass('d-flex').addClass('d-none');
        $(this).removeClass('active').attr('title', '显示高级过滤');
      }
    });
    $('#filter-method').on('change', function () { filterState.method = $(this).val(); refreshTable(); });
    $('#filter-type').on('change', function () { filterState.type = $(this).val(); refreshTable(); });
    $('#filter-color').on('change', function () { filterState.color = $(this).val(); refreshTable(); });
    $('#filter-search').on('input', DomUtils.debounce(function () {
      filterState.keyword = $(this).val() || '';
      refreshTable();
    }, 300));
    $('#filter-regex').on('click', function () {
      $(this).toggleClass('active');
      filterState.useRegex = $(this).hasClass('active');
      refreshTable();
    });
    $('#filter-case').on('click', function () {
      $(this).toggleClass('active');
      filterState.caseSensitive = $(this).hasClass('active');
      refreshTable();
    });
    $('#filter-not').on('click', function () {
      $(this).toggleClass('active');
      filterState.invert = $(this).hasClass('active');
      refreshTable();
    });
  }

  // === Column Sorting ===
  function initSorting() {
    $('#request-table').on('click', 'thead th[data-sortable="true"]', function () {
      const col = $(this).attr('data-col');
      if (sortState.column === col) {
        if (sortState.direction === 'asc') {
          sortState.direction = 'desc';
        } else {
          sortState.column = null;
          sortState.direction = 'asc';
        }
      } else {
        sortState.column = col;
        sortState.direction = 'asc';
      }
      refreshTable();
    });
  }

  // === Color Picker ===
  function initColorPicker() {
    const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];
    const colorMap = {
      red: '#dc3545', orange: '#fd7e14', yellow: '#ffc107', green: '#198754',
      blue: '#0d6efd', purple: '#6f42c1', pink: '#d63384', gray: '#6c757d'
    };
    const colorNames = {
      red: '红色', orange: '橙色', yellow: '黄色', green: '绿色',
      blue: '蓝色', purple: '紫色', pink: '粉色', gray: '灰色'
    };
    let $dropdown = null;

    $('#request-table').on('click', '.color-tag', function (e) {
      e.stopPropagation();
      const uidStr = $(this).attr('data-uid');
      if (!uidStr) return;
      const uid = parseInt(uidStr, 10);

      if ($dropdown) { $dropdown.remove(); $dropdown = null; return; }

      $dropdown = $('<div class="color-picker-dropdown"></div>');
      colors.forEach(c => {
        $dropdown.append(`<span class="swatch" style="background:${colorMap[c]}" data-color="${c}" title="${colorNames[c] || c}"></span>`);
      });
      $dropdown.append('<span class="swatch swatch-clear" data-color="" title="清除标签">&times;</span>');

      const offset = $(this).offset();
      $dropdown.css({
        top: (offset.top + 18) + 'px',
        left: offset.left + 'px'
      });
      $('body').append($dropdown);

      $dropdown.on('click', '.swatch', function (e) {
        e.stopPropagation();
        const color = $(this).attr('data-color');
        NetworkHandler.setRequestColor(uid, color || null);
        $dropdown.remove(); $dropdown = null;
        refreshTable();
      });
    });

    $(document).on('click', function () {
      if ($dropdown) { $dropdown.remove(); $dropdown = null; }
    });
  }

  // === Note Editor ===
  function initNoteEditor() {
    $('#request-table').on('click', '.note-cell', function (e) {
      e.stopPropagation();
      const uidStr = $(this).attr('data-uid');
      if (!uidStr) return;
      editingNoteUid = parseInt(uidStr, 10);
      const meta = NetworkHandler.getRequestMeta(editingNoteUid);
      $('#edit-note-text').val(meta.note || '');
      new bootstrap.Modal($('#noteEditorModal')[0]).show();
    });

    $('#save-note-btn').on('click', function () {
      if (editingNoteUid === null) return;
      const text = $('#edit-note-text').val() || '';
      NetworkHandler.setRequestNote(editingNoteUid, text);
      editingNoteUid = null;
      bootstrap.Modal.getInstance($('#noteEditorModal')[0]).hide();
      refreshTable();
    });
  }

  // === Utility ===
  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // === Initial Render ===
  refreshTable();
})();
