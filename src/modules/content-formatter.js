/**
 * content-formatter.js - 内容类型检测、报文体格式化、Hex 转换
 */
import StringUtils from '../utils/string-utils.js';

const ContentFormatter = {
  detectContentType(headers) {
    return StringUtils.detectContentType(headers);
  },

  formatBody(body, contentType) {
    if (!body) return body;
    if (contentType === 'json') return StringUtils.formatJson(body);
    if (contentType === 'xml') return StringUtils.formatXml(body);
    return body;
  },

  buildRawRequest(req) {
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
  },

  buildRawResponse(res, body) {
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
  },

  buildPrettyRequest(req) {
    const raw = this.buildRawRequest(req);
    if (!req.postData || !req.postData.text) return raw;
    const ct = this.detectContentType(req.headers);
    if (ct === 'json' || ct === 'xml') {
      const formattedBody = this.formatBody(req.postData.text, ct);
      const parts = raw.split('\r\n\r\n');
      if (parts.length >= 2) {
        return parts[0] + '\r\n\r\n' + formattedBody;
      }
    }
    return raw;
  },

  buildPrettyResponse(res, body) {
    const raw = this.buildRawResponse(res, body);
    if (!body) return raw;
    const ct = this.detectContentType(res.headers);
    if (ct === 'json' || ct === 'xml') {
      const formattedBody = this.formatBody(body, ct);
      const parts = raw.split('\r\n\r\n');
      if (parts.length >= 2) {
        return parts[0] + '\r\n\r\n' + formattedBody;
      }
    }
    return raw;
  },

  buildHexRequest(req) {
    const raw = this.buildRawRequest(req);
    if (!req.postData || !req.postData.text) return raw;
    const hexBody = StringUtils.stringToHex(req.postData.text);
    const parts = raw.split('\r\n\r\n');
    if (parts.length >= 2) {
      return parts[0] + '\r\n\r\n' + hexBody;
    }
    return raw;
  },

  buildHexResponse(res, body) {
    const raw = this.buildRawResponse(res, body);
    if (!body) return raw;
    const hexBody = StringUtils.stringToHex(body);
    const parts = raw.split('\r\n\r\n');
    if (parts.length >= 2) {
      return parts[0] + '\r\n\r\n' + hexBody;
    }
    return raw;
  }
};

export default ContentFormatter;
