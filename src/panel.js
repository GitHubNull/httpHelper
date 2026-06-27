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

  loadSchemes();

  // Layout
  LayoutManager.initLayoutButtons($('.layout-bar'), () => {});

  // Resizers
  initTableResizer();
  initPaneResizer();

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

  // Tab layout pane switching
  $('#switch-to-res').on('click', () => LayoutManager.showResponsePane());
  $('#switch-to-req').on('click', () => LayoutManager.showRequestPane());

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
  // Copy Session
  $('#copy-session-btn').on('click', async () => {
    if (!activeScheme || !currentRequest) {
      ClipboardUtils.showToast('No active scheme or request');
      return;
    }
    if (!activeScheme.fields) {
      activeScheme.fields = await SessionStorage.loadFields(activeScheme.id);
    }
    const result = SessionExtractor.applySchemeToRequest(currentRequest, activeScheme);
    if (result) {
      const text = Object.entries(result).map(([k, v]) => `${k}: ${v}`).join('\n');
      ClipboardUtils.copyText(text, 'Session copied!');
    } else {
      ClipboardUtils.showToast('No session data extracted');
    }
  });

  // Save Field (modal)
  $('#save-field-btn').on('click', async () => {
    const schemeId = $('#edit-field-scheme').val();
    const name = $('#edit-field-name').val().trim();
    const pattern = $('#edit-field-pattern').val().trim();
    if (!name || !pattern || !schemeId) {
      ClipboardUtils.showToast('Name, scheme, and pattern are required');
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
      await SessionStorage.updateField(schemeId, field);
    } else {
      const result = await SessionStorage.saveField(schemeId, field);
      if (!result.success) { ClipboardUtils.showToast(result.message); return; }
    }
    bootstrap.Modal.getInstance($('#fieldEditorModal')[0]).hide();
    editingFieldId = null;
    await loadSchemes();
    renderFieldsTable();
  });

  // Save Scheme (modal)
  $('#save-scheme-btn').on('click', async () => {
    const name = $('#edit-scheme-name').val().trim();
    if (!name) { ClipboardUtils.showToast('Scheme name is required'); return; }
    const domains = $('#edit-scheme-domains').val().split(',').map(s => s.trim()).filter(Boolean);
    const scheme = {
      id: editingSchemeId || 'scheme_' + Date.now(),
      name,
      targetDomains: domains,
      domainRegex: $('#edit-scheme-regex').val().trim(),
      description: $('#edit-scheme-desc').val().trim(),
      isActive: false
    };
    if (editingSchemeId) {
      const existing = schemes.find(s => s.id === editingSchemeId);
      if (existing) scheme.isActive = existing.isActive;
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
    const schemeId = $(this).attr('data-scheme');
    const enabled = $(this).prop('checked');
    const fields = await SessionStorage.loadFields(schemeId);
    const field = fields.find(f => f.id === fieldId);
    if (field) {
      field.enabled = enabled;
      await SessionStorage.updateField(schemeId, field);
      if (activeScheme && activeScheme.id === schemeId) {
        activeScheme.fields = await SessionStorage.loadFields(schemeId);
      }
    }
  });

  // Field table: edit/delete
  $('#fields-table').on('click', '.edit-field-btn', async function () {
    const fieldId = $(this).attr('data-id');
    const schemeId = $(this).attr('data-scheme');
    const fields = await SessionStorage.loadFields(schemeId);
    const field = fields.find(f => f.id === fieldId);
    if (field) showFieldEditor(field, schemeId);
  });
  $('#fields-table').on('click', '.delete-field-btn', async function () {
    const fieldId = $(this).attr('data-id');
    const schemeId = $(this).attr('data-scheme');
    await SessionStorage.deleteField(schemeId, fieldId);
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

  // Refresh session tables when tab shown
  $('#main-tabs button[data-bs-target="#tab-session-config"]').on('shown.bs.tab', () => {
    renderFieldsTable();
    renderSchemesTable();
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
    schemes = await SessionStorage.loadSchemes();
    const activeId = await SessionStorage.getActiveScheme();
    activeScheme = schemes.find(s => s.id === activeId) || null;
    if (activeScheme) {
      activeScheme.fields = await SessionStorage.loadFields(activeScheme.id);
    }
  }

  function renderFieldsTable() {
    const allFieldsData = [];
    const promises = schemes.map(async (scheme) => {
      const fields = await SessionStorage.loadFields(scheme.id);
      fields.forEach(f => allFieldsData.push({ ...f, schemeName: scheme.name, schemeId: scheme.id }));
    });
    Promise.all(promises).then(() => {
      const columns = [
        { key: 'enabled', render: (row) => `<div class="form-check form-switch d-flex justify-content-center mb-0"><input class="form-check-input toggle-enabled" type="checkbox" data-id="${row.id}" data-scheme="${row.schemeId}" ${row.enabled !== false ? 'checked' : ''}></div>` },
        { key: 'name', render: (row) => row.name },
        { key: 'schemeId', render: (row) => row.schemeName || '' },
        { key: 'locationType', render: (row) => row.location ? row.location.type : '' },
        { key: 'locationName', render: (row) => row.location ? (row.location.name || '-') : '' },
        { key: 'mode', render: (row) => `<span class="badge bg-secondary">${row.mode}</span>` },
        { key: 'pattern', render: (row) => `<code class="small">${escapeHtml(row.pattern || '')}</code>` },
        { key: 'actions', render: (row) => `<button class="btn btn-sm btn-outline-primary py-0 px-1 edit-field-btn" data-id="${row.id}" data-scheme="${row.schemeId}">Edit</button> <button class="btn btn-sm btn-outline-danger py-0 px-1 delete-field-btn" data-id="${row.id}" data-scheme="${row.schemeId}">Del</button>` }
      ];
      TableManager.renderTableBody($('#fields-table'), columns, allFieldsData, {});
    });
  }

  function renderSchemesTable() {
    const columns = [
      { key: 'enabled', render: (row) => `<div class="form-check form-switch d-flex justify-content-center mb-0"><input class="form-check-input toggle-enabled" type="checkbox" data-id="${row.id}" ${row.isActive ? 'checked' : ''}></div>` },
      { key: 'name', render: (row) => `<strong>${escapeHtml(row.name)}</strong>` },
      { key: 'domains', render: (row) => escapeHtml((row.targetDomains || []).join(', ')) },
      { key: 'regex', render: (row) => `<code class="small">${escapeHtml(row.domainRegex || '')}</code>` },
      { key: 'description', render: (row) => escapeHtml(row.description || '') },
      { key: 'fieldCount', render: (row) => row._fieldCount !== undefined ? row._fieldCount : '...' },
      { key: 'actions', render: (row) => `<button class="btn btn-sm btn-outline-primary py-0 px-1 edit-scheme-btn" data-id="${row.id}">Edit</button> <button class="btn btn-sm btn-outline-danger py-0 px-1 delete-scheme-btn" data-id="${row.id}">Del</button>` }
    ];
    // Load field counts
    const dataWithCounts = schemes.map(s => ({ ...s, _fieldCount: '...' }));
    TableManager.renderTableBody($('#schemes-table'), columns, dataWithCounts, {});
    // Async load field counts
    schemes.forEach(async (scheme, idx) => {
      const fields = await SessionStorage.loadFields(scheme.id);
      const $rows = $('#schemes-table tbody tr');
      if ($rows.eq(idx).length) {
        const countColIdx = TableManager.getColumnOrder($('#schemes-table')).indexOf('fieldCount');
        if (countColIdx >= 0) {
          $rows.eq(idx).find('td').eq(countColIdx).text(fields.length);
        }
      }
    });
  }

  function showFieldEditor(field, schemeId) {
    editingFieldId = field ? field.id : null;
    // Populate scheme dropdown
    const $select = $('#edit-field-scheme').empty();
    schemes.forEach(s => $select.append(`<option value="${s.id}">${escapeHtml(s.name)}</option>`));
    if (field) {
      $('#edit-field-name').val(field.name);
      $('#edit-field-scheme').val(schemeId || field.schemeId || '');
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

  function showSchemeEditor(scheme) {
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
    new bootstrap.Modal($('#schemeEditorModal')[0]).show();
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
    const $regexToggle = $(`#${prefix}-search-regex`);
    const $caseToggle = $(`#${prefix}-search-case`);
    const $prevBtn = $(`#${prefix}-search-prev`);
    const $nextBtn = $(`#${prefix}-search-next`);
    const $countEl = $(`#${prefix}-search-count`);

    const doSearch = () => {
      const text = $input.val() || '';
      const options = { useRegex: $regexToggle.hasClass('active'), caseSensitive: $caseToggle.hasClass('active') };
      if (!text) {
        clearPaneHighlights(prefix);
        paneSearchState[prefix] = { matches: [], currentIndex: -1 };
        $countEl.text('0 highlights');
        return;
      }
      performPaneSearch(prefix, text, options);
    };

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
        let $overlay = $content.find('.highlight-overlay');
        if (!$overlay.length) {
          DomUtils.createOverlayHighlighter($textarea[0]);
          $overlay = $content.find('.highlight-overlay');
        }
        DomUtils.highlightOverlay($overlay[0], $textarea.val(), matches);
      }
    }
    // Note: pretty tab uses hljs, search highlight on code not supported yet
  }

  // === Resizers ===
  function initTableResizer() {
    const $resizer = $('#table-resizer');
    const $top = $('#request-table-area');
    const $bottom = $('#http-detail-area');
    if (!$resizer.length || !$top.length || !$bottom.length) return;

    let isDragging = false, startY = 0, startTopH = 0, startBottomH = 0;

    $resizer.on('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      startY = e.clientY;
      startTopH = $top[0].getBoundingClientRect().height;
      startBottomH = $bottom[0].getBoundingClientRect().height;
      $resizer.addClass('dragging');
      $('body').css('user-select', 'none');
    });

    $(document).on('mousemove.tableResize', (e) => {
      if (!isDragging) return;
      const delta = e.clientY - startY;
      const total = startTopH + startBottomH;
      let topRatio = ((startTopH + delta) / total) * 100;
      topRatio = Math.max(10, Math.min(90, topRatio));
      $top.css('flex', `1 1 ${topRatio}%`);
      $bottom.css('flex', `1 1 ${100 - topRatio}%`);
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
      activeScheme.fields = await SessionStorage.loadFields(activeScheme.id);
    }
    const result = SessionExtractor.applySchemeToRequest(request, activeScheme);
    if (result) {
      ClipboardUtils.showToast(`Session extracted: ${Object.keys(result).join(', ')}`, 3000);
    }
  }

  // === Utility ===
  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // === Initial Render ===
  UiRenderer.renderRequestTable(NetworkHandler.getRequests(), selectedIndex, selectRequest);
})();
