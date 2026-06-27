import NetworkHandler from './modules/network-handler.js';
import ContentFormatter from './modules/content-formatter.js';
import UiRenderer from './modules/ui-renderer.js';
import LayoutManager from './modules/layout-manager.js';
import SearchHighlighter from './modules/search-highlighter.js';
import SessionExtractor from './modules/session-extractor.js';
import SessionStorage from './modules/session-storage.js';
import ClipboardUtils from './utils/clipboard-utils.js';
import DomUtils from './utils/dom-utils.js';

(function() {
  'use strict';

  let selectedIndex = -1;
  let currentRequest = null;
  let currentResponseBody = '';
  let schemes = [];
  let activeScheme = null;
  let editingSchemeId = null;

  // Per-pane search state
  const paneSearchState = {
    req: { matches: [], currentIndex: -1 },
    res: { matches: [], currentIndex: -1 }
  };

  // DOM refs (jQuery)
  const $reqText = $('#raw-request');
  const $prettyReqText = $('#pretty-request');
  const $resText = $('#raw-response');
  const $prettyResText = $('#pretty-response');
  const $hexReq = $('#hex-request');
  const $hexRes = $('#hex-response');

  // Init
  NetworkHandler.initNetworkListener((request) => {
    UiRenderer.renderRequestList(NetworkHandler.getRequests(), selectedIndex, selectRequest);
    checkSessionExtraction(request);
  });

  loadSchemes();

  // Layout
  LayoutManager.initLayoutButtons($('.layout-bar'), (layout) => {
    // LayoutManager.switchLayout already handles class and pane visibility
  });

  // Resizer drag
  initResizer();

  // Pane-local searches
  initPaneSearch('req');
  initPaneSearch('res');

  // Tab switching
  $('.tab-btn').on('click', function() {
    const pane = $(this).attr('data-pane');
    const tab = $(this).attr('data-tab');
    UiRenderer.switchTab(pane, tab);
    if (currentRequest) {
      refreshSearchForActiveTab();
    }
  });

  // Tab layout pane switching
  $('#switch-to-res').on('click', () => {
    LayoutManager.showResponsePane();
  });
  $('#switch-to-req').on('click', () => {
    LayoutManager.showRequestPane();
  });

  // Copy / Download
  $('#copy-req').on('click', () => {
    const pane = 'request';
    const tab = UiRenderer.getActiveTab(pane);
    const text = getPaneText(pane, tab);
    ClipboardUtils.copyText(text, 'Request copied!');
  });

  $('#copy-res').on('click', () => {
    const pane = 'response';
    const tab = UiRenderer.getActiveTab(pane);
    const text = getPaneText(pane, tab);
    ClipboardUtils.copyText(text, 'Response copied!');
  });

  $('#download-req').on('click', () => {
    const request = NetworkHandler.getRequest(selectedIndex);
    const pane = 'request';
    const tab = UiRenderer.getActiveTab(pane);
    const text = getPaneText(pane, tab);
    const filename = request ? 'request_' + (request.request.method || 'HTTP') + '.txt' : 'request.txt';
    ClipboardUtils.downloadText(text, filename);
  });

  $('#download-res').on('click', () => {
    const request = NetworkHandler.getRequest(selectedIndex);
    const pane = 'response';
    const tab = UiRenderer.getActiveTab(pane);
    const text = getPaneText(pane, tab);
    const filename = request ? 'response_' + (request.response ? request.response.status : 'HTTP') + '.txt' : 'response.txt';
    ClipboardUtils.downloadText(text, filename);
  });

  $('#clear').on('click', () => {
    NetworkHandler.clearRequests();
    selectedIndex = -1;
    currentRequest = null;
    currentResponseBody = '';
    $reqText.val('');
    $prettyReqText.val('');
    $resText.val('');
    $prettyResText.val('');
    $hexReq.text('');
    $hexRes.text('');
    UiRenderer.renderRequestList(NetworkHandler.getRequests(), selectedIndex, selectRequest);
  });

  // Session UI
  $('#new-scheme-btn').on('click', () => {
    editingSchemeId = null;
    $('#scheme-name').val('');
    $('#scheme-domains').val('');
    $('#scheme-regex').val('');
    $('#scheme-desc').val('');
    $('#scheme-editor').show();
    renderFieldList([]);
  });

  $('#cancel-scheme-btn').on('click', () => {
    $('#scheme-editor').hide();
    editingSchemeId = null;
  });

  $('#save-scheme-btn').on('click', async () => {
    const name = $('#scheme-name').val().trim();
    if (!name) {
      ClipboardUtils.showToast('Scheme name is required');
      return;
    }
    const domains = $('#scheme-domains').val().split(',').map(s => s.trim()).filter(Boolean);
    const scheme = {
      id: editingSchemeId || 'scheme_' + Date.now(),
      name: name,
      targetDomains: domains,
      domainRegex: $('#scheme-regex').val().trim(),
      description: $('#scheme-desc').val().trim(),
      isActive: false,
      persist: true
    };
    if (editingSchemeId) {
      await SessionStorage.updateScheme(scheme);
    } else {
      const result = await SessionStorage.saveScheme(scheme);
      if (!result.success) {
        ClipboardUtils.showToast(result.message);
        return;
      }
    }
    await loadSchemes();
    $('#scheme-editor').hide();
    editingSchemeId = null;
  });

  $('#add-field-btn').on('click', async () => {
    if (!editingSchemeId) {
      ClipboardUtils.showToast('Please save scheme first');
      return;
    }
    const name = $('#field-name').val().trim();
    const locationType = $('#field-location').val();
    const locationName = $('#field-location-name').val().trim();
    const mode = $('#field-mode').val();
    const pattern = $('#field-pattern').val().trim();
    if (!name || !pattern) {
      ClipboardUtils.showToast('Field name and pattern are required');
      return;
    }
    const field = {
      name: name,
      location: { type: locationType, name: locationName },
      mode: mode,
      pattern: pattern,
      persist: true
    };
    const result = await SessionStorage.saveField(editingSchemeId, field);
    if (!result.success) {
      ClipboardUtils.showToast(result.message);
      return;
    }
    $('#field-name').val('');
    $('#field-pattern').val('');
    const fields = await SessionStorage.loadFields(editingSchemeId);
    renderFieldList(fields);
    // Update activeScheme.fields if editing the active scheme
    if (activeScheme && activeScheme.id === editingSchemeId) {
      activeScheme.fields = fields;
    }
  });

  $('#copy-session-btn').on('click', async () => {
    if (!activeScheme || !currentRequest) {
      ClipboardUtils.showToast('No active scheme or request');
      return;
    }
    // Ensure fields are loaded (B1 fix)
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

  // Core functions
  function selectRequest(index) {
    selectedIndex = index;
    const request = NetworkHandler.getRequest(index);
    currentRequest = request;

    // B8 fix: clear old search highlights before loading new content
    clearPaneHighlights('req');
    clearPaneHighlights('res');

    UiRenderer.renderRequestList(NetworkHandler.getRequests(), selectedIndex, selectRequest);

    if (!request) return;

    // Build request contents
    const rawReq = ContentFormatter.buildRawRequest(request.request);
    const prettyReq = ContentFormatter.buildPrettyRequest(request.request);
    const hexReqText = ContentFormatter.buildHexRequest(request.request);

    UiRenderer.updatePaneContent('request', 'raw', rawReq);
    UiRenderer.updatePaneContent('request', 'pretty', prettyReq);
    UiRenderer.updatePaneContent('request', 'hex', hexReqText);

    // Response loading
    UiRenderer.updatePaneContent('response', 'raw', 'Loading response body...');
    UiRenderer.updatePaneContent('response', 'pretty', 'Loading response body...');
    UiRenderer.updatePaneContent('response', 'hex', 'Loading response body...');

    request.getContent((body, encoding) => {
      currentResponseBody = body || '';
      const rawRes = ContentFormatter.buildRawResponse(request.response, body);
      const prettyRes = ContentFormatter.buildPrettyResponse(request.response, body);
      const hexResText = ContentFormatter.buildHexResponse(request.response, body);

      UiRenderer.updatePaneContent('response', 'raw', rawRes);
      UiRenderer.updatePaneContent('response', 'pretty', prettyRes);
      UiRenderer.updatePaneContent('response', 'hex', hexResText);

      // Smart tab switching
      const resContentType = ContentFormatter.detectContentType(request.response ? request.response.headers : []);
      if (resContentType === 'json' || resContentType === 'xml') {
        UiRenderer.setActiveTab('response', 'pretty');
      } else if (resContentType === 'binary') {
        UiRenderer.setActiveTab('response', 'hex');
      } else {
        UiRenderer.setActiveTab('response', 'raw');
      }

      const reqContentType = ContentFormatter.detectContentType(request.request.headers);
      if (reqContentType === 'json' || reqContentType === 'xml') {
        UiRenderer.setActiveTab('request', 'pretty');
      } else if (reqContentType === 'binary') {
        UiRenderer.setActiveTab('request', 'hex');
      } else {
        UiRenderer.setActiveTab('request', 'raw');
      }

      refreshSearchForActiveTab();
    });
  }

  function getPaneText(pane, tab) {
    if (pane === 'request') {
      if (tab === 'raw') return $reqText.val();
      if (tab === 'pretty') return $prettyReqText.val();
      if (tab === 'hex') return $hexReq.text();
    } else {
      if (tab === 'raw') return $resText.val();
      if (tab === 'pretty') return $prettyResText.val();
      if (tab === 'hex') return $hexRes.text();
    }
    return '';
  }

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
    const $count = $('#' + prefix + '-search-count');
    if (!$count.length) return;
    const state = paneSearchState[prefix];
    if (state.matches.length > 0 && state.currentIndex >= 0) {
      $count.text(`${state.currentIndex + 1}/${state.matches.length}`);
    } else {
      $count.text('0/0');
    }
  }

  function navigatePaneMatch(prefix, direction) {
    const state = paneSearchState[prefix];
    if (state.matches.length === 0) return;
    if (direction === 'next') {
      state.currentIndex = (state.currentIndex + 1) % state.matches.length;
    } else {
      state.currentIndex = (state.currentIndex - 1 + state.matches.length) % state.matches.length;
    }
    updatePaneSearchCount(prefix);
    scrollToPaneMatch(prefix);
  }

  function scrollToPaneMatch(prefix) {
    const pane = prefix === 'req' ? 'request' : 'response';
    const $pane = $('#' + pane + '-pane');
    if (!$pane.length) return;
    const state = paneSearchState[prefix];
    const $marks = $pane.find('.highlight-overlay mark.search-highlight');
    const $mark = $marks.eq(state.currentIndex);
    if ($mark.length) {
      $mark[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function refreshSearchForActiveTab() {
    // Refresh both pane searches
    ['req', 'res'].forEach(prefix => {
      const $input = $('#' + prefix + '-search-input');
      if ($input.length && $input.val()) {
        const $regexBtn = $('#' + prefix + '-search-regex');
        const $caseBtn = $('#' + prefix + '-search-case');
        const options = {
          useRegex: $regexBtn.hasClass('active'),
          caseSensitive: $caseBtn.hasClass('active')
        };
        performPaneSearch(prefix, $input.val(), options);
      }
    });
  }

  function initPaneSearch(prefix) {
    const $input = $('#' + prefix + '-search-input');
    const $regexToggle = $('#' + prefix + '-search-regex');
    const $caseToggle = $('#' + prefix + '-search-case');
    const $prevBtn = $('#' + prefix + '-search-prev');
    const $nextBtn = $('#' + prefix + '-search-next');
    const $countEl = $('#' + prefix + '-search-count');

    const isToggleActive = ($btn) => $btn.hasClass('active');

    const doSearch = () => {
      const text = $input.length ? $input.val() : '';
      const options = {
        useRegex: isToggleActive($regexToggle),
        caseSensitive: isToggleActive($caseToggle)
      };
      if (!text) {
        clearPaneHighlights(prefix);
        paneSearchState[prefix].matches = [];
        paneSearchState[prefix].currentIndex = -1;
        if ($countEl.length) $countEl.text('0/0');
        return;
      }
      performPaneSearch(prefix, text, options);
    };

    if ($input.length) $input.on('input', DomUtils.debounce(doSearch, 300));
    if ($regexToggle.length) {
      $regexToggle.on('click', () => {
        $regexToggle.toggleClass('active');
        doSearch();
      });
    }
    if ($caseToggle.length) {
      $caseToggle.on('click', () => {
        $caseToggle.toggleClass('active');
        doSearch();
      });
    }
    if ($prevBtn.length) $prevBtn.on('click', () => navigatePaneMatch(prefix, 'prev'));
    if ($nextBtn.length) $nextBtn.on('click', () => navigatePaneMatch(prefix, 'next'));
  }

  function clearPaneHighlights(prefix) {
    const pane = prefix === 'req' ? 'request' : 'response';
    const $pane = $('#' + pane + '-pane');
    if (!$pane.length) return;
    $pane.find('.highlight-overlay').empty();
    $pane.find('.hex-display').each(function() {
      const $el = $(this);
      if ($el.html() !== $el.text()) {
        $el.text($el.text());
      }
    });
  }

  function initResizer() {
    const $resizer = $('#resizer');
    const $content = $('.content');
    if (!$resizer.length || !$content.length) return;

    let isDragging = false;
    let startPos = 0;
    let startSizeReq = 0;
    let startSizeRes = 0;

    const $reqPane = $('#request-pane');
    const $resPane = $('#response-pane');
    if (!$reqPane.length || !$resPane.length) return;

    const onDown = (e) => {
      e.preventDefault(); // B6 fix: prevent text selection during drag
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
    };

    const onMove = (e) => {
      if (!isDragging) return;
      let delta;
      if (LayoutManager.getCurrentLayout() === 'horizontal') {
        delta = e.clientX - startPos;
      } else {
        delta = e.clientY - startPos;
      }
      const total = startSizeReq + startSizeRes;
      let reqRatio = ((startSizeReq + delta) / total) * 100;
      reqRatio = Math.max(10, Math.min(90, reqRatio));
      const resRatio = 100 - reqRatio;
      $reqPane.css('flex', `0 0 ${reqRatio}%`);
      $resPane.css('flex', `0 0 ${resRatio}%`);
    };

    const onUp = () => {
      isDragging = false;
      $resizer.removeClass('dragging');
      $('body').css('user-select', '');
    };

    $resizer.on('mousedown', onDown);
    $(document).on('mousemove', onMove);
    $(document).on('mouseup', onUp);
  }

  function applyHighlights(pane, tab, matches) {
    clearPaneHighlights(pane === 'request' ? 'req' : 'res');
    if (!matches || matches.length === 0) return;

    const $pane = $('#' + pane + '-pane');
    if (!$pane.length) return;
    const $content = $pane.find(`.tab-content[data-tab="${tab}"]`);
    if (!$content.length) return;

    if (tab === 'hex') {
      const $hexDisplay = $content.find('.hex-display');
      if ($hexDisplay.length) {
        SearchHighlighter.highlightHexMatches($hexDisplay[0], matches);
      }
    } else {
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
  }

  async function loadSchemes() {
    schemes = await SessionStorage.loadSchemes();
    const activeId = await SessionStorage.getActiveScheme();
    activeScheme = schemes.find(s => s.id === activeId) || null;
    // B1 fix: load fields for active scheme so session extraction works
    if (activeScheme) {
      activeScheme.fields = await SessionStorage.loadFields(activeScheme.id);
    }
    renderSchemeList();
  }

  function renderSchemeList() {
    const $list = $('#scheme-list');
    if (!$list.length) return;
    $list.empty();
    schemes.forEach(scheme => {
      const activeBadge = scheme.isActive ? '<span class="badge bg-primary">Active</span>' : '';
      const $item = $('<div>')
        .addClass('list-group-item list-group-item-action d-flex justify-content-between align-items-center')
        .html(`
          <div>
            <strong>${scheme.name}</strong> ${activeBadge}
            <div class="text-muted small">${scheme.description || ''}</div>
          </div>
          <div>
            <button class="btn btn-sm btn-outline-primary edit-scheme" data-id="${scheme.id}">Edit</button>
            <button class="btn btn-sm btn-outline-success activate-scheme" data-id="${scheme.id}">Activate</button>
            <button class="btn btn-sm btn-outline-danger delete-scheme" data-id="${scheme.id}">Delete</button>
          </div>
        `);

      $item.find('.edit-scheme').on('click', async function(e) {
        e.stopPropagation();
        const id = $(this).attr('data-id');
        const scheme = schemes.find(s => s.id === id);
        if (!scheme) return;
        editingSchemeId = id;
        $('#scheme-name').val(scheme.name);
        $('#scheme-domains').val((scheme.targetDomains || []).join(', '));
        $('#scheme-regex').val(scheme.domainRegex || '');
        $('#scheme-desc').val(scheme.description || '');
        $('#scheme-editor').show();
        const fields = await SessionStorage.loadFields(id);
        renderFieldList(fields);
      });

      $item.find('.activate-scheme').on('click', async function(e) {
        e.stopPropagation();
        const id = $(this).attr('data-id');
        await SessionStorage.setActiveScheme(id);
        await loadSchemes();
      });

      $item.find('.delete-scheme').on('click', async function(e) {
        e.stopPropagation();
        const id = $(this).attr('data-id');
        await SessionStorage.deleteScheme(id);
        await loadSchemes();
      });

      $list.append($item);
    });
  }

  function renderFieldList(fields) {
    const $list = $('#field-list');
    if (!$list.length) return;
    $list.empty();
    fields.forEach(field => {
      const $item = $('<div>')
        .addClass('list-group-item d-flex justify-content-between align-items-center')
        .html(`
          <div>
            <strong>${field.name}</strong> <span class="badge bg-secondary">${field.mode}</span>
            <div class="text-muted small">${field.location.type}: ${field.location.name || '-'} | ${field.pattern}</div>
          </div>
          <button class="btn btn-sm btn-outline-danger delete-field" data-id="${field.id}">Delete</button>
        `);

      $item.find('.delete-field').on('click', async function(e) {
        e.stopPropagation();
        const fieldId = $(this).attr('data-id');
        if (editingSchemeId) {
          await SessionStorage.deleteField(editingSchemeId, fieldId);
          const fields = await SessionStorage.loadFields(editingSchemeId);
          renderFieldList(fields);
          // Update activeScheme.fields if editing the active scheme
          if (activeScheme && activeScheme.id === editingSchemeId) {
            activeScheme.fields = fields;
          }
        }
      });

      $list.append($item);
    });
  }

  async function checkSessionExtraction(request) {
    if (!activeScheme) return;
    // Ensure fields are loaded
    if (!activeScheme.fields) {
      activeScheme.fields = await SessionStorage.loadFields(activeScheme.id);
    }
    const result = SessionExtractor.applySchemeToRequest(request, activeScheme);
    if (result) {
      const keys = Object.keys(result).join(', ');
      ClipboardUtils.showToast(`Session extracted: ${keys}`, 3000);
    }
  }

  // Initial render
  UiRenderer.renderRequestList(NetworkHandler.getRequests(), selectedIndex, selectRequest);
})();
