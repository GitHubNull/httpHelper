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

  // DOM refs
  const reqText = document.getElementById('raw-request');
  const prettyReqText = document.getElementById('pretty-request');
  const resText = document.getElementById('raw-response');
  const prettyResText = document.getElementById('pretty-response');
  const hexReq = document.getElementById('hex-request');
  const hexRes = document.getElementById('hex-response');

  // Init
  NetworkHandler.initNetworkListener((request) => {
    UiRenderer.renderRequestList(NetworkHandler.getRequests(), selectedIndex, selectRequest);
    checkSessionExtraction(request);
  });

  loadSchemes();

  // Layout
  LayoutManager.initLayoutButtons(document.querySelector('.layout-controls'), (layout) => {
    document.querySelector('.content').className = 'content layout-' + layout;
  });

  // Search
  SearchHighlighter.initSearch(document.querySelector('.search-controls'), (text, options) => {
    performGlobalSearch(text, options);
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pane = btn.dataset.pane;
      const tab = btn.dataset.tab;
      UiRenderer.switchTab(pane, tab);
      if (currentRequest) {
        refreshSearchForActiveTab();
      }
    });
  });

  // Copy / Download
  document.getElementById('copy-req').addEventListener('click', () => {
    const pane = 'request';
    const tab = UiRenderer.getActiveTab(pane);
    const text = getPaneText(pane, tab);
    ClipboardUtils.copyText(text, 'Request copied!');
  });

  document.getElementById('copy-res').addEventListener('click', () => {
    const pane = 'response';
    const tab = UiRenderer.getActiveTab(pane);
    const text = getPaneText(pane, tab);
    ClipboardUtils.copyText(text, 'Response copied!');
  });

  document.getElementById('download-req').addEventListener('click', () => {
    const request = NetworkHandler.getRequest(selectedIndex);
    const pane = 'request';
    const tab = UiRenderer.getActiveTab(pane);
    const text = getPaneText(pane, tab);
    const filename = request ? 'request_' + (request.request.method || 'HTTP') + '.txt' : 'request.txt';
    ClipboardUtils.downloadText(text, filename);
  });

  document.getElementById('download-res').addEventListener('click', () => {
    const request = NetworkHandler.getRequest(selectedIndex);
    const pane = 'response';
    const tab = UiRenderer.getActiveTab(pane);
    const text = getPaneText(pane, tab);
    const filename = request ? 'response_' + (request.response ? request.response.status : 'HTTP') + '.txt' : 'response.txt';
    ClipboardUtils.downloadText(text, filename);
  });

  document.getElementById('clear').addEventListener('click', () => {
    NetworkHandler.clearRequests();
    selectedIndex = -1;
    currentRequest = null;
    currentResponseBody = '';
    reqText.value = '';
    prettyReqText.value = '';
    resText.value = '';
    prettyResText.value = '';
    hexReq.textContent = '';
    hexRes.textContent = '';
    UiRenderer.renderRequestList(NetworkHandler.getRequests(), selectedIndex, selectRequest);
  });

  // Session UI
  document.getElementById('new-scheme-btn').addEventListener('click', () => {
    editingSchemeId = null;
    document.getElementById('scheme-name').value = '';
    document.getElementById('scheme-domains').value = '';
    document.getElementById('scheme-regex').value = '';
    document.getElementById('scheme-desc').value = '';
    document.getElementById('scheme-editor').style.display = 'block';
    renderFieldList([]);
  });

  document.getElementById('cancel-scheme-btn').addEventListener('click', () => {
    document.getElementById('scheme-editor').style.display = 'none';
    editingSchemeId = null;
  });

  document.getElementById('save-scheme-btn').addEventListener('click', async () => {
    const name = document.getElementById('scheme-name').value.trim();
    if (!name) {
      ClipboardUtils.showToast('Scheme name is required');
      return;
    }
    const domains = document.getElementById('scheme-domains').value.split(',').map(s => s.trim()).filter(Boolean);
    const scheme = {
      id: editingSchemeId || 'scheme_' + Date.now(),
      name: name,
      targetDomains: domains,
      domainRegex: document.getElementById('scheme-regex').value.trim(),
      description: document.getElementById('scheme-desc').value.trim(),
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
    document.getElementById('scheme-editor').style.display = 'none';
    editingSchemeId = null;
  });

  document.getElementById('add-field-btn').addEventListener('click', async () => {
    if (!editingSchemeId) {
      ClipboardUtils.showToast('Please save scheme first');
      return;
    }
    const name = document.getElementById('field-name').value.trim();
    const locationType = document.getElementById('field-location').value;
    const locationName = document.getElementById('field-location-name').value.trim();
    const mode = document.getElementById('field-mode').value;
    const pattern = document.getElementById('field-pattern').value.trim();
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
    document.getElementById('field-name').value = '';
    document.getElementById('field-pattern').value = '';
    const fields = await SessionStorage.loadFields(editingSchemeId);
    renderFieldList(fields);
  });

  document.getElementById('copy-session-btn').addEventListener('click', async () => {
    if (!activeScheme || !currentRequest) {
      ClipboardUtils.showToast('No active scheme or request');
      return;
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
      if (tab === 'raw') return reqText ? reqText.value : '';
      if (tab === 'pretty') return prettyReqText ? prettyReqText.value : '';
      if (tab === 'hex') return hexReq ? hexReq.textContent : '';
    } else {
      if (tab === 'raw') return resText ? resText.value : '';
      if (tab === 'pretty') return prettyResText ? prettyResText.value : '';
      if (tab === 'hex') return hexRes ? hexRes.textContent : '';
    }
    return '';
  }

  function performGlobalSearch(pattern, options) {
    if (!pattern) {
      SearchHighlighter.clearHighlights();
      clearAllHighlights();
      return;
    }
    const pane = 'request';
    const tab = UiRenderer.getActiveTab(pane);
    const text = getPaneText(pane, tab);
    const matches = SearchHighlighter.performSearch(text, pattern, options);
    applyHighlights(pane, tab, matches);
  }

  function refreshSearchForActiveTab() {
    const text = SearchHighlighter.lastSearchText;
    const options = SearchHighlighter.lastOptions;
    if (text) {
      performGlobalSearch(text, options);
    }
  }

  function applyHighlights(pane, tab, matches) {
    clearAllHighlights();
    if (!matches || matches.length === 0) return;

    const paneEl = document.getElementById(pane + '-pane');
    if (!paneEl) return;
    const contentEl = paneEl.querySelector(`.tab-content[data-tab="${tab}"]`);
    if (!contentEl) return;

    if (tab === 'hex') {
      const hexDisplay = contentEl.querySelector('.hex-display');
      if (hexDisplay) {
        SearchHighlighter.highlightHexMatches(hexDisplay, matches);
      }
    } else {
      const textarea = contentEl.querySelector('textarea');
      if (textarea) {
        let overlay = contentEl.querySelector('.highlight-overlay');
        if (!overlay) {
          overlay = DomUtils.createOverlayHighlighter(textarea);
        }
        DomUtils.highlightOverlay(overlay, textarea.value, matches);
      }
    }
  }

  function clearAllHighlights() {
    document.querySelectorAll('.highlight-overlay').forEach(el => el.innerHTML = '');
    document.querySelectorAll('.hex-display').forEach(el => {
      if (el.innerHTML !== el.textContent) {
        el.textContent = el.textContent;
      }
    });
  }

  async function loadSchemes() {
    schemes = await SessionStorage.loadSchemes();
    const activeId = await SessionStorage.getActiveScheme();
    activeScheme = schemes.find(s => s.id === activeId) || null;
    renderSchemeList();
  }

  function renderSchemeList() {
    const list = document.getElementById('scheme-list');
    if (!list) return;
    list.innerHTML = '';
    schemes.forEach(scheme => {
      const item = document.createElement('div');
      item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
      const activeBadge = scheme.isActive ? '<span class="badge bg-primary">Active</span>' : '';
      item.innerHTML = `
        <div>
          <strong>${scheme.name}</strong> ${activeBadge}
          <div class="text-muted small">${scheme.description || ''}</div>
        </div>
        <div>
          <button class="btn btn-sm btn-outline-primary edit-scheme" data-id="${scheme.id}">Edit</button>
          <button class="btn btn-sm btn-outline-success activate-scheme" data-id="${scheme.id}">Activate</button>
          <button class="btn btn-sm btn-outline-danger delete-scheme" data-id="${scheme.id}">Delete</button>
        </div>
      `;
      list.appendChild(item);
    });

    list.querySelectorAll('.edit-scheme').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const scheme = schemes.find(s => s.id === id);
        if (!scheme) return;
        editingSchemeId = id;
        document.getElementById('scheme-name').value = scheme.name;
        document.getElementById('scheme-domains').value = (scheme.targetDomains || []).join(', ');
        document.getElementById('scheme-regex').value = scheme.domainRegex || '';
        document.getElementById('scheme-desc').value = scheme.description || '';
        document.getElementById('scheme-editor').style.display = 'block';
        const fields = await SessionStorage.loadFields(id);
        renderFieldList(fields);
      });
    });

    list.querySelectorAll('.activate-scheme').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        await SessionStorage.setActiveScheme(id);
        await loadSchemes();
      });
    });

    list.querySelectorAll('.delete-scheme').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        await SessionStorage.deleteScheme(id);
        await loadSchemes();
      });
    });
  }

  function renderFieldList(fields) {
    const list = document.getElementById('field-list');
    if (!list) return;
    list.innerHTML = '';
    fields.forEach(field => {
      const item = document.createElement('div');
      item.className = 'list-group-item d-flex justify-content-between align-items-center';
      item.innerHTML = `
        <div>
          <strong>${field.name}</strong> <span class="badge bg-secondary">${field.mode}</span>
          <div class="text-muted small">${field.location.type}: ${field.location.name || '-'} | ${field.pattern}</div>
        </div>
        <button class="btn btn-sm btn-outline-danger delete-field" data-id="${field.id}">Delete</button>
      `;
      list.appendChild(item);
    });

    list.querySelectorAll('.delete-field').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const fieldId = btn.dataset.id;
        if (editingSchemeId) {
          await SessionStorage.deleteField(editingSchemeId, fieldId);
          const fields = await SessionStorage.loadFields(editingSchemeId);
          renderFieldList(fields);
        }
      });
    });
  }

  async function checkSessionExtraction(request) {
    if (!activeScheme) return;
    const result = SessionExtractor.applySchemeToRequest(request, activeScheme);
    if (result) {
      const keys = Object.keys(result).join(', ');
      ClipboardUtils.showToast(`Session extracted: ${keys}`, 3000);
    }
  }

  // Initial render
  UiRenderer.renderRequestList(NetworkHandler.getRequests(), selectedIndex, selectRequest);
})();
