(function() {
  'use strict';

  let requests = [];
  const MAX_REQUESTS = 500;
  let selectedIndex = -1;

  const listEl = document.getElementById('request-list');
  const reqText = document.getElementById('raw-request');
  const resText = document.getElementById('raw-response');
  const reqLineNumbers = document.getElementById('req-line-numbers');
  const resLineNumbers = document.getElementById('res-line-numbers');
  const countEl = document.getElementById('count');
  const toastEl = document.getElementById('toast');

  // Listen for network requests
  chrome.devtools.network.onRequestFinished.addListener((request) => {
    requests.unshift(request);
    if (requests.length > MAX_REQUESTS) {
      requests.pop();
    }
    renderList();
  });

  function renderList() {
    listEl.innerHTML = '';
    countEl.textContent = requests.length + ' request' + (requests.length !== 1 ? 's' : '');

    if (requests.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No requests captured yet.<br>Reload the page or trigger network activity.</div>';
      return;
    }

    requests.forEach((req, index) => {
      const item = document.createElement('div');
      item.className = 'request-item' + (index === selectedIndex ? ' active' : '');
      item.dataset.index = index;

      const status = req.response ? req.response.status : 0;
      let statusClass = 'success';
      if (status >= 400) statusClass = 'error';
      else if (status >= 300) statusClass = 'redirect';

      const urlStr = truncateUrl(req.request.url);

      item.innerHTML = `
        <span class="method">${escapeHtml(req.request.method)}</span>
        <span class="status ${statusClass}">${status}</span>
        <span class="url" title="${escapeHtml(req.request.url)}">${escapeHtml(urlStr)}</span>
      `;

      item.addEventListener('click', () => selectRequest(index));
      listEl.appendChild(item);
    });
  }

  function selectRequest(index) {
    selectedIndex = index;
    const request = requests[index];

    // Update active state in list
    document.querySelectorAll('.request-item').forEach(el => el.classList.remove('active'));
    const activeItem = document.querySelector(`[data-index="${index}"]`);
    if (activeItem) activeItem.classList.add('active');

    // Build raw request immediately (we have the data)
    const rawReq = buildRawRequest(request.request);
    reqText.value = rawReq;
    updateLineNumbers(reqText, reqLineNumbers);

    // Get response body asynchronously
    resText.value = 'Loading response body...';
    updateLineNumbers(resText, resLineNumbers);
    request.getContent((body, encoding) => {
      const rawRes = buildRawResponse(request.response, body);
      resText.value = rawRes;
      updateLineNumbers(resText, resLineNumbers);
    });
  }

  function buildRawRequest(req) {
    try {
      const url = new URL(req.url);
      const path = url.pathname + url.search + url.hash;

      let raw = `${req.method} ${path} HTTP/1.1\r\n`;
      raw += `Host: ${url.host}\r\n`;

      const seen = new Set(['host']);
      if (req.headers && Array.isArray(req.headers)) {
        for (const h of req.headers) {
          const name = h.name.toLowerCase();
          if (!seen.has(name)) {
            seen.add(name);
            raw += `${h.name}: ${h.value}\r\n`;
          }
        }
      }

      raw += `\r\n`;

      if (req.postData) {
        if (req.postData.text) {
          raw += req.postData.text;
        } else if (req.postData.params && Array.isArray(req.postData.params)) {
          const params = req.postData.params.map(p => {
            const name = encodeURIComponent(p.name);
            const value = encodeURIComponent(p.value);
            return `${name}=${value}`;
          }).join('&');
          raw += params;
        }
      }

      return raw;
    } catch (e) {
      return `Error building request: ${e.message}\n\n${JSON.stringify(req, null, 2)}`;
    }
  }

  function buildRawResponse(res, body) {
    try {
      if (!res) return 'No response data available';

      let raw = `HTTP/1.1 ${res.status} ${res.statusText || ''}\r\n`;

      if (res.headers && Array.isArray(res.headers)) {
        for (const h of res.headers) {
          raw += `${h.name}: ${h.value}\r\n`;
        }
      }

      raw += `\r\n`;

      if (body) {
        raw += body;
      }

      return raw;
    } catch (e) {
      return `Error building response: ${e.message}\n\n${JSON.stringify(res, null, 2)}`;
    }
  }

  function truncateUrl(url) {
    try {
      const u = new URL(url);
      return u.pathname + u.search;
    } catch {
      return url;
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function updateLineNumbers(textarea, lineNumbersEl) {
    const text = textarea.value || '';
    const lines = text.split('\n').length;
    lineNumbersEl.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
  }

  function copyText(text, msg) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast(msg || 'Copied!');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(msg || 'Copied!');
    });
  }

  function downloadText(text, filename) {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(filename + ' downloaded!');
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    setTimeout(() => { toastEl.style.opacity = '0'; }, 2000);
  }

  // Event listeners
  document.getElementById('copy-req').addEventListener('click', () => {
    copyText(reqText.value, 'Request copied!');
  });

  document.getElementById('copy-res').addEventListener('click', () => {
    copyText(resText.value, 'Response copied!');
  });

  document.getElementById('download-req').addEventListener('click', () => {
    const request = requests[selectedIndex];
    const filename = request ? 'request_' + (request.request.method || 'HTTP') + '.txt' : 'request.txt';
    downloadText(reqText.value, filename);
  });

  document.getElementById('download-res').addEventListener('click', () => {
    const request = requests[selectedIndex];
    const filename = request ? 'response_' + (request.response ? request.response.status : 'HTTP') + '.txt' : 'response.txt';
    downloadText(resText.value, filename);
  });

  document.getElementById('clear').addEventListener('click', () => {
    requests = [];
    selectedIndex = -1;
    reqText.value = '';
    resText.value = '';
    renderList();
  });

  // Initial render
  renderList();
})();