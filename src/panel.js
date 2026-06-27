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
  NetworkHandler.initNetworkListener((request) => {
    UiRenderer.renderRequestTable(NetworkHandler.getRequests(), selectedIndex, selectRequest);
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
    ClipboardUtils.copyText(text, 'Request copied!');
  });
  $('#copy-res').on('click', () => {
    const text = getPaneText('response', UiRenderer.getActiveTab('response'));
    ClipboardUtils.copyText(text, 'Response copied!');
  });
  $('#download-req').on('click', () => {
    const req = NetworkHandler.getRequest(selectedIndex);
    const text = getPaneText('request', UiRenderer.getActiveTab('request'));
    const name = req ? 'request_' + (req.request.method || 'HTTP') + '.txt' : 'request.txt';
    ClipboardUtils.downloadText(text, name);
  });
  $('#download-res').on('click', () => {
    const req = NetworkHandler.getRequest(selectedIndex);
    const text = getPaneText('response', UiRenderer.getActiveTab('response'));
    const name = req ? 'response_' + (req.response ? req.response.status : 'HTTP') + '.txt' : 'response.txt';
    ClipboardUtils.downloadText(text, name);
  });

  // Copy Headers / Copy Body
  $('#copy-req-headers').on('click', () => {
    if (!currentRequest) return;
    const raw = ContentFormatter.buildRawRequest(currentRequest.request);
    const headers = raw.split('\r\n\r\n')[0];
    ClipboardUtils.copyText(headers, 'Request headers copied!');
  });
  $('#copy-res-headers').on('click', () => {
    if (!currentRequest) return;
    const raw = ContentFormatter.buildRawResponse(currentRequest.response, currentResponseBody);
    const headers = raw.split('\r\n\r\n')[0];
    ClipboardUtils.copyText(headers, 'Response headers copied!');
  });
  $('#copy-req-body').on('click', () => {
    if (!currentRequest) return;
    const body = currentRequest.request.postData ? currentRequest.request.postData.text : '';
    ClipboardUtils.copyText(body || '', body ? 'Request body copied!' : 'No body');
  });
  $('#copy-res-body').on('click', () => {
    ClipboardUtils.copyText(currentResponseBody || '', currentResponseBody ? 'Response body copied!' : 'No body');
  });

  // Clear
  $('#clear').on('click', () => {
    NetworkHandler.clearRequests();
    selectedIndex = -1;
    currentRequest = null;
    currentResponseBody = '';
    $reqText.val('');
    $resText.val('');
    $hexReq.text('');
    $hexRes.text('');
    $('#pretty-request').text('');
    $('#pretty-response').text('');
    UiRenderer.renderRequestTable(NetworkHandler.getRequests(), selectedIndex, selectRequest);
  });

  // === Session Config Tab Events ===
  // Add Field
  $('#add-field-btn').on('click', () => showFieldEditor(null));
  // Add Scheme
  $('#add-scheme-btn').on('click', () => showSchemeEditor(null));
  // Copy Session (in pane headers)
  $(document).on('click', '.copy-session-btn', async () => {
    if (!activeScheme || !currentRequest) {
      ClipboardUtils.showToast('No active scheme or request');
      return;
    }
    if (!activeScheme.fields) {
      activeScheme.fields = await SessionStorage.getSchemeFields(activeScheme.id);
    }
    const result = SessionExtractor.applySchemeToRequest(currentRequest, activeScheme);
    if (result) {
      const text = Object.entries(result).map(([k, v]) => `${k}: ${v}`).join('\n');
      ClipboardUtils.copyText(text, 'Session copied!');
    } else {
      ClipboardUtils.showToast('No session data extracted');
    }
  });

  // Save Field (modal) - N:N model, no scheme association
  $('#save-field-btn').on('click', async () => {
    const name = $('#edit-field-name').val().trim();
    const pattern = $('#edit-field-pattern').val().trim();
    if (!name || !pattern) {
      ClipboardUtils.showToast('Name and pattern are required');
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
    if (!name) { ClipboardUtils.showToast('Scheme name is required'); return; }
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
    const request = NetworkHandler.getRequest(index);
    currentRequest = request;

    clearPaneHighlights('req');
    clearPaneHighlights('res');
    UiRenderer.renderRequestTable(NetworkHandler.getRequests(), selectedIndex, selectRequest);

    if (!request) return;

    // Build request
    const rawReq = ContentFormatter.buildRawRequest(request.request);
    const prettyReq = ContentFormatter.buildPrettyRequest(request.request);
    const hexReqText = ContentFormatter.buildHexRequest(request.request);

    UiRenderer.updatePaneContent('request', 'raw', rawReq);
    UiRenderer.updatePaneContent('request', 'pretty', prettyReq);
    UiRenderer.updatePaneContent('request', 'hex', hexReqText);

    // Response loading
    UiRenderer.updatePaneContent('response', 'raw', 'Loading...');
    UiRenderer.updatePaneContent('response', 'pretty', { content: 'Loading...', language: 'plaintext' });
    UiRenderer.updatePaneContent('response', 'hex', 'Loading...');

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
      { key: 'actions', render: (row) => `<button class="btn btn-sm btn-outline-primary py-0 px-1 edit-field-btn" data-id="${row.id}">Edit</button> <button class="btn btn-sm btn-outline-danger py-0 px-1 delete-field-btn" data-id="${row.id}">Del</button>` }
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
      { key: 'actions', render: (row) => `<button class="btn btn-sm btn-outline-primary py-0 px-1 edit-scheme-btn" data-id="${row.id}">Edit</button> <button class="btn btn-sm btn-outline-danger py-0 px-1 delete-scheme-btn" data-id="${row.id}">Del</button>` }
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
      $count.text(`${state.currentIndex + 1}/${state.matches.length} highlights`);
    } else {
      $count.text('0 highlights');
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
        $icon.html('&#10005;').attr('title', 'Clear').removeClass('search-icon-state').addClass('search-clear-state');
      } else {
        $icon.html('&#128269;').attr('title', 'Search').removeClass('search-clear-state').addClass('search-icon-state');
      }
    }

    const doSearch = () => {
      const text = $input.val() || '';
      const options = { useRegex: $regexToggle.hasClass('active'), caseSensitive: $caseToggle.hasClass('active') };
      updateSearchIcon();
      if (!text) {
        clearPaneHighlights(prefix);
        paneSearchState[prefix] = { matches: [], currentIndex: -1 };
        $countEl.text('0 highlights');
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
        $countEl.text('0 highlights');
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
      ClipboardUtils.showToast(`Session extracted: ${Object.keys(result).join(', ')}`, 3000);
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

  // === Utility ===
  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // === Initial Render ===
  UiRenderer.renderRequestTable(NetworkHandler.getRequests(), selectedIndex, selectRequest);
})();
