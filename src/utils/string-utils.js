/**
 * string-utils.js - 字符串处理与格式化工具
 */

const StringUtils = {
  escapeHtml(text) {
    if (!text) return '';
    return $('<div>').text(text).html();
  },

  truncateUrl(url) {
    try {
      const u = new URL(url);
      return u.pathname + u.search;
    } catch {
      return url;
    }
  },

  formatJson(body) {
    if (!body) return body;
    try {
      const obj = JSON.parse(body);
      return JSON.stringify(obj, null, 2);
    } catch {
      return body;
    }
  },

  formatXml(body) {
    if (!body) return body;
    let formatted = '';
    let indent = 0;
    const tab = '  ';
    const lines = body.replace(/>\s*</g, '><').split('<');
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;
      if (line.startsWith('/')) {
        indent = Math.max(indent - 1, 0);
        formatted += tab.repeat(indent) + '<' + line + '\n';
      } else if (line.endsWith('/>')) {
        formatted += tab.repeat(indent) + '<' + line + '\n';
      } else if (line.indexOf('</') !== -1) {
        formatted += tab.repeat(indent) + '<' + line + '\n';
        const closeTag = line.match(/<\/([^>]+)>/);
        if (closeTag) {
          const openTag = line.match(/<([^\s>/]+)/);
          if (openTag && openTag[1] !== closeTag[1]) {
            indent = Math.max(indent - 1, 0);
          }
        }
      } else {
        formatted += tab.repeat(indent) + '<' + line + '\n';
        if (!line.endsWith('/>') && !line.match(/\/>$/)) {
          indent++;
        }
      }
    }
    return formatted.trim();
  },

  stringToHex(body) {
    if (!body) return '';
    const encoder = new TextEncoder();
    const bytes = encoder.encode(body);
    let result = '';
    const bytesPerLine = 16;
    for (let i = 0; i < bytes.length; i += bytesPerLine) {
      const offset = i.toString(16).padStart(8, '0');
      let hexPart = '';
      let asciiPart = '';
      for (let j = 0; j < bytesPerLine; j++) {
        if (i + j < bytes.length) {
          const b = bytes[i + j];
          hexPart += b.toString(16).padStart(2, '0') + ' ';
          asciiPart += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
        } else {
          hexPart += '   ';
        }
      }
      result += `${offset}  ${hexPart}  ${asciiPart}\n`;
    }
    return result;
  },

  detectContentType(headers) {
    if (!headers || !Array.isArray(headers)) return 'text';
    const ctHeader = headers.find(h => h.name.toLowerCase() === 'content-type');
    if (!ctHeader) return 'text';
    const ct = ctHeader.value.toLowerCase();
    if (ct.includes('application/json') || ct.includes('text/json') || ct.includes('+json')) return 'json';
    if (ct.includes('application/xml') || ct.includes('text/xml') || ct.includes('+xml') || ct.includes('text/html')) return 'xml';
    if (ct.includes('image/') || ct.includes('application/pdf') || ct.includes('application/octet-stream') || ct.includes('audio/') || ct.includes('video/') || ct.includes('application/zip') || ct.includes('application/gzip')) return 'binary';
    return 'text';
  },

  /**
   * 格式化时间戳为本地时间字符串
   * @param {Date|string|number} date - Date 对象或 ISO 字符串或时间戳
   * @returns {string} 格式 "YYYY-MM-DD HH:mm:ss.SSS"
   */
  formatTimestamp(date) {
    if (!date) return '';
    const d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    const Y = d.getFullYear();
    const Mo = pad(d.getMonth() + 1);
    const Da = pad(d.getDate());
    const H = pad(d.getHours());
    const Mi = pad(d.getMinutes());
    const S = pad(d.getSeconds());
    const ms = pad(d.getMilliseconds(), 3);
    return `${Y}-${Mo}-${Da} ${H}:${Mi}:${S}.${ms}`;
  },

  /**
   * 获取请求的资源分类（比 detectContentType 更细粒度）
   * @param {Object} request - Chrome DevTools HAR Entry
   * @returns {string} 'json'|'xml'|'html'|'js'|'css'|'image'|'font'|'binary'|'text'|'other'
   */
  getResourceCategory(request) {
    if (!request) return 'other';
    const headers = (request.response && request.response.headers) || [];
    const ctHeader = Array.isArray(headers) ? headers.find(h => h.name.toLowerCase() === 'content-type') : null;
    const ct = ctHeader ? ctHeader.value.toLowerCase() : '';
    if (ct.includes('json') || ct.includes('+json')) return 'json';
    if (ct.includes('html')) return 'html';
    if (ct.includes('xml') || ct.includes('+xml')) return 'xml';
    if (ct.includes('javascript') || ct.includes('ecmascript')) return 'js';
    if (ct.includes('css')) return 'css';
    if (ct.includes('image/')) return 'image';
    if (ct.includes('font') || ct.includes('woff') || ct.includes('ttf') || ct.includes('otf')) return 'font';
    if (ct.includes('octet-stream') || ct.includes('pdf') || ct.includes('zip') || ct.includes('gzip') || ct.includes('audio') || ct.includes('video')) return 'binary';
    if (ct.includes('text/')) return 'text';
    // Fallback: _resourceType (Chrome 扩展字段)
    const rt = request._resourceType || '';
    if (rt === 'script') return 'js';
    if (rt === 'stylesheet') return 'css';
    if (rt === 'image') return 'image';
    if (rt === 'font') return 'font';
    if (rt === 'fetch' || rt === 'xhr') return 'json';
    return 'other';
  }
};

export default StringUtils;
