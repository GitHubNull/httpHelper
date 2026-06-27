/**
 * session-storage.js - 会话方案和字段的持久化存储与管理
 */

const STORAGE_KEY_SCHEMES = 'httpHelper_sessionSchemes';
const STORAGE_KEY_FIELDS = 'httpHelper_sessionFields';
const STORAGE_KEY_ACTIVE = 'httpHelper_activeSchemeId';

const SessionStorage = {
  async loadSchemes() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY_SCHEMES], (result) => {
        resolve(result[STORAGE_KEY_SCHEMES] || []);
      });
    });
  },

  async saveScheme(scheme) {
    const schemes = await this.loadSchemes();
    const existing = schemes.find(s =>
      s.name === scheme.name &&
      JSON.stringify(s.targetDomains || []) === JSON.stringify(scheme.targetDomains || []) &&
      s.domainRegex === scheme.domainRegex
    );
    if (existing) {
      return { success: false, message: '相关数据已存在' };
    }
    scheme.id = scheme.id || 'scheme_' + Date.now();
    scheme.createdAt = scheme.createdAt || Date.now();
    scheme.updatedAt = Date.now();
    scheme.isActive = scheme.isActive || false;
    scheme.persist = scheme.persist !== false;
    schemes.push(scheme);
    await this._setSchemes(schemes);
    return { success: true, scheme };
  },

  async updateScheme(scheme) {
    const schemes = await this.loadSchemes();
    const idx = schemes.findIndex(s => s.id === scheme.id);
    if (idx === -1) return { success: false, message: '方案不存在' };
    scheme.updatedAt = Date.now();
    schemes[idx] = scheme;
    await this._setSchemes(schemes);
    return { success: true };
  },

  async deleteScheme(schemeId) {
    const schemes = await this.loadSchemes();
    const filtered = schemes.filter(s => s.id !== schemeId);
    await this._setSchemes(filtered);
    // Also delete associated fields
    const fields = await this.loadFields(schemeId);
    for (const f of fields) {
      await this.deleteField(schemeId, f.id);
    }
    return { success: true };
  },

  async loadFields(schemeId) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY_FIELDS], (result) => {
        const allFields = result[STORAGE_KEY_FIELDS] || {};
        resolve(allFields[schemeId] || []);
      });
    });
  },

  async saveField(schemeId, field) {
    const fields = await this.loadFields(schemeId);
    const existing = fields.find(f =>
      f.name === field.name &&
      JSON.stringify(f.location) === JSON.stringify(field.location) &&
      f.mode === field.mode &&
      f.pattern === field.pattern
    );
    if (existing) {
      return { success: false, message: '相关数据已存在' };
    }
    field.id = field.id || 'field_' + Date.now();
    field.schemeId = schemeId;
    field.createdAt = field.createdAt || Date.now();
    field.updatedAt = Date.now();
    field.enabled = field.enabled !== false;
    field.persist = field.persist !== false;
    fields.push(field);
    await this._setFields(schemeId, fields);
    return { success: true, field };
  },

  async updateField(schemeId, field) {
    const fields = await this.loadFields(schemeId);
    const idx = fields.findIndex(f => f.id === field.id);
    if (idx === -1) return { success: false, message: '字段不存在' };
    field.updatedAt = Date.now();
    field.schemeId = schemeId;
    fields[idx] = { ...fields[idx], ...field };
    await this._setFields(schemeId, fields);
    return { success: true };
  },

  async deleteField(schemeId, fieldId) {
    const fields = await this.loadFields(schemeId);
    const filtered = fields.filter(f => f.id !== fieldId);
    await this._setFields(schemeId, filtered);
    return { success: true };
  },

  async toggleFieldEnabled(schemeId, fieldId, enabled) {
    const fields = await this.loadFields(schemeId);
    const field = fields.find(f => f.id === fieldId);
    if (!field) return { success: false };
    field.enabled = enabled;
    field.updatedAt = Date.now();
    await this._setFields(schemeId, fields);
    return { success: true };
  },

  async getActiveScheme() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY_ACTIVE], (result) => {
        resolve(result[STORAGE_KEY_ACTIVE] || null);
      });
    });
  },

  async setActiveScheme(schemeId) {
    const schemes = await this.loadSchemes();
    for (const s of schemes) {
      s.isActive = (s.id === schemeId);
      s.updatedAt = Date.now();
    }
    await this._setSchemes(schemes);
    await new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY_ACTIVE]: schemeId }, resolve);
    });
    return { success: true };
  },

  async _setSchemes(schemes) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY_SCHEMES]: schemes }, resolve);
    });
  },

  async _setFields(schemeId, fields) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY_FIELDS], (result) => {
        const allFields = result[STORAGE_KEY_FIELDS] || {};
        allFields[schemeId] = fields;
        chrome.storage.local.set({ [STORAGE_KEY_FIELDS]: allFields }, resolve);
      });
    });
  }
};

export default SessionStorage;
