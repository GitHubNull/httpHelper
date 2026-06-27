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
  LayoutManager.initLayoutButtons(document.querySelector('.layout-bar'), (layout) => {
    // LayoutManager.switchLayout already handles class and pane visibility
  });

  // Resizer drag
  initResizer();

  // Pane-local searches
  initPaneSearch('req');
  initPaneSearch('res');

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

  // Tab layout pane switching
  document.getElementById('switch-to-res')?.addEventListener('click', () => {
    LayoutManager.showResponsePane();
  });
  document.getElementById('switch-to-req')?.addEventListener('click', () => {
    LayoutManager.showRequestPane();
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
    const countEl = document.getElementById(prefix + '-search-count');
    if (!countEl) return;
    const state = paneSearchState[prefix];
    if (state.matches.length > 0 && state.currentIndex >= 0) {
      countEl.textContent = `${state.currentIndex + 1}/${state.matches.length}`;
    } else {
      countEl.textContent = '0/0';
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
    const paneEl = document.getElementById(pane + '-pane');
    if (!paneEl) return;
    const state = paneSearchState[prefix];
    const overlay = paneEl.querySelector('.highlight-overlay');
    if (overlay) {
      const marks = overlay.querySelectorAll('mark.search-highlight');
      if (marks[state.currentIndex]) {
        marks[state.currentIndex].scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }

  function refreshSearchForActiveTab() {
    // Refresh both pane searches
    ['req', 'res'].forEach(prefix => {
      const input = document.getElementById(prefix + '-search-input');
      if (input && input.value) {
        const regexBtn = document.getElementById(prefix + '-search-regex');
        const caseBtn = document.getElementById(prefix + '-search-case');
        const options = {
          useRegex: regexBtn ? regexBtn.classList.contains('active') : false,
          caseSensitive: caseBtn ? caseBtn.classList.contains('active') : false
        };
        performPaneSearch(prefix, input.value, options);
      }
    });
  }

  function initPaneSearch(prefix) {
    const input = document.getElementById(prefix + '-search-input');
    const regexToggle = document.getElementById(prefix + '-search-regex');
    const caseToggle = document.getElementById(prefix + '-search-case');
    const prevBtn = document.getElementById(prefix + '-search-prev');
    const nextBtn = document.getElementById(prefix + '-search-next');
    const countEl = document.getElementById(prefix + '-search-count');

    const isToggleActive = (btn) => btn && btn.classList.contains('active');

    const doSearch = () => {
      const text = input ? input.value : '';
      const options = {
        useRegex: isToggleActive(regexToggle),
        caseSensitive: isToggleActive(caseToggle)
      };
      if (!text) {
        clearPaneHighlights(prefix);
        paneSearchState[prefix].matches = [];
        paneSearchState[prefix].currentIndex = -1;
        if (countEl) countEl.textContent = '0/0';
        return;
      }
      performPaneSearch(prefix, text, options);
    };

    if (input) input.addEventListener('input', DomUtils.debounce(doSearch, 300));
    if (regexToggle) {
      regexToggle.addEventListener('click', () => {
        regexToggle.classList.toggle('active');
        doSearch();
      });
    }
    if (caseToggle) {
      caseToggle.addEventListener('click', () => {
        caseToggle.classList.toggle('active');
        doSearch();
      });
    }
    if (prevBtn) prevBtn.addEventListener('click', () => navigatePaneMatch(prefix, 'prev'));
    if (nextBtn) nextBtn.addEventListener('click', () => navigatePaneMatch(prefix, 'next'));
  }

  function clearPaneHighlights(prefix) {
    const pane = prefix === 'req' ? 'request' : 'response';
    const paneEl = document.getElementById(pane + '-pane');
    if (!paneEl) return;
    paneEl.querySelectorAll('.highlight-overlay').forEach(el => el.innerHTML = '');
    paneEl.querySelectorAll('.hex-display').forEach(el => {
      if (el.innerHTML !== el.textContent) {
        el.textContent = el.textContent;
      }
    });
  }

  function initResizer() {
    const resizer = document.getElementById('resizer');
    const content = document.querySelector('.content');
    if (!resizer || !content) return;

    let isDragging = false;
    let startPos = 0;
    let startSizeReq = 0;
    let startSizeRes = 0;

    const reqPane = document.getElementById('request-pane');
    const resPane = document.getElementById('response-pane');
    if (!reqPane || !resPane) return;

    const onDown = (e) => {
      isDragging = true;
      resizer.classList.add('dragging');
      if (LayoutManager.getCurrentLayout() === 'horizontal') {
        startPos = e.clientX;
        startSizeReq = reqPane.getBoundingClientRect().width;
        startSizeRes = resPane.getBoundingClientRect().width;
      } else {
        startPos = e.clientY;
        startSizeReq = reqPane.getBoundingClientRect().height;
        startSizeRes = resPane.getBoundingClientRect().height;
      }
      document.body.style.userSelect = 'none';
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
      reqPane.style.flex = `0 0 ${reqRatio}%`;
      resPane.style.flex = `0 0 ${resRatio}%`;
    };

    const onUp = () => {
      isDragging = false;
      resizer.classList.remove('dragging');
      document.body.style.userSelect = '';
    };

    resizer.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function applyHighlights(pane, tab, matches) {
    clearPaneHighlights(pane === 'request' ? 'req' : 'res');
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
