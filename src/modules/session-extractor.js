/**
 * session-extractor.js - 会话信息提取核心逻辑
 */

const SessionExtractor = {
  extractSession(request, scheme) {
    if (!request || !scheme || !scheme.fields) return null;
    const result = {};
    for (const field of scheme.fields) {
      const source = this.getFieldSource(request, field.location);
      if (source === null) continue;
      const value = this.extractByMode(source, field);
      if (value !== null) {
        result[field.name] = value;
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  },

  extractByMode(source, field) {
    if (!source || !field || !field.pattern) return null;
    const mode = field.mode;
    const pattern = field.pattern;
    const options = field.options || {};

    switch (mode) {
      case 'substring':
        return this._extractSubstring(source, pattern, options);
      case 'regex':
        return this._extractRegex(source, pattern, options);
      case 'keyword':
        return this._extractKeyword(source, pattern, options);
      case 'xpath':
        return this._extractXPath(source, pattern, options);
      case 'jsonpath':
        return this._extractJsonPath(source, pattern, options);
      default:
        return null;
    }
  },

  getFieldSource(request, location) {
    if (!location || !location.type) return null;
    if (location.type === 'header') {
      if (!request.request || !request.request.headers) return null;
      const header = request.request.headers.find(h => h.name.toLowerCase() === location.name.toLowerCase());
      return header ? header.value : null;
    }
    if (location.type === 'body') {
      if (request.request && request.request.postData && request.request.postData.text) {
        return request.request.postData.text;
      }
    }
    return null;
  },

  applySchemeToRequest(request, scheme) {
    if (!scheme || !scheme.isActive) return null;
    if (!this.isSchemeApplicable(request, scheme)) return null;
    return this.extractSession(request, scheme);
  },

  isSchemeApplicable(request, scheme) {
    if (!request || !scheme) return false;
    if (!scheme.targetDomains && !scheme.domainRegex) return true;
    const url = request.request ? request.request.url : '';
    let hostname = '';
    try {
      hostname = new URL(url).hostname;
    } catch { return false; }

    if (scheme.targetDomains && scheme.targetDomains.length > 0) {
      if (scheme.targetDomains.some(d => hostname === d || hostname.endsWith('.' + d))) return true;
    }
    if (scheme.domainRegex) {
      try {
        const regex = new RegExp(scheme.domainRegex);
        if (regex.test(hostname)) return true;
      } catch { /* ignore invalid regex */ }
    }
    return false;
  },

  _extractSubstring(source, pattern, options) {
    const idx = source.indexOf(pattern);
    if (idx === -1) return null;
    const start = idx + (options.startOffset || 0);
    const end = options.endOffset !== undefined ? idx + options.endOffset : source.length;
    return source.substring(start, end);
  },

  _extractRegex(source, pattern, options) {
    try {
      const regex = new RegExp(pattern, options.caseSensitive ? '' : 'i');
      const match = regex.exec(source);
      if (!match) return null;
      const groupIndex = options.groupIndex || 0;
      return match[groupIndex] || null;
    } catch {
      return null;
    }
  },

  _extractKeyword(source, pattern, options) {
    const idx = source.indexOf(pattern);
    if (idx === -1) return null;
    const context = options.context || 50;
    const start = Math.max(0, idx - context);
    const end = Math.min(source.length, idx + pattern.length + context);
    return source.substring(start, end);
  },

  _extractXPath(source, pattern, options) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(source, 'application/xml');
      const result = doc.evaluate(pattern, doc, null, XPathResult.STRING_TYPE, null);
      return result.stringValue || null;
    } catch {
      return null;
    }
  },

  _extractJsonPath(source, pattern, options) {
    try {
      const obj = JSON.parse(source);
      return this._resolveJsonPath(obj, pattern);
    } catch {
      return null;
    }
  },

  _resolveJsonPath(obj, path) {
    if (!path || path === '$') return JSON.stringify(obj);
    const parts = path.replace(/^\$\.?/, '').split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return null;
      const arrMatch = part.match(/^([^\[]+)\[(\d+)\]$/);
      if (arrMatch) {
        const key = arrMatch[1];
        const idx = parseInt(arrMatch[2], 10);
        current = current[key];
        if (Array.isArray(current)) {
          current = current[idx];
        } else {
          return null;
        }
      } else {
        current = current[part];
      }
    }
    if (current === null || current === undefined) return null;
    return typeof current === 'object' ? JSON.stringify(current) : String(current);
  }
};

export default SessionExtractor;
