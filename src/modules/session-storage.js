/**
 * session-storage.js - 会话方案和字段的持久化存储与管理
 * N:N 关系模型：Fields 独立存储，Schemes 通过 fieldIds 数组引用字段
 */

const STORAGE_KEY_SCHEMES = 'httpHelper_sessionSchemes';
const STORAGE_KEY_FIELDS = 'httpHelper_sessionFields_v2';
const STORAGE_KEY_ACTIVE = 'httpHelper_activeSchemeId';
const STORAGE_KEY_FIELDS_OLD = 'httpHelper_sessionFields';

const SessionStorage = {
  // === Fields CRUD (独立，不关联 scheme) ===

  async loadAllFields() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY_FIELDS], (result) => {
        resolve(result[STORAGE_KEY_FIELDS] || []);
      });
    });
  },

  async saveField(field) {
    const fields = await this.loadAllFields();
    const existing = fields.find(f =>
      f.name === field.name &&
      f.pattern === field.pattern &&
      f.mode === field.mode
    );
    if (existing) {
      return { success: false, message: '相关数据已存在' };
    }
    field.id = field.id || 'field_' + Date.now();
    field.createdAt = field.createdAt || Date.now();
    field.updatedAt = Date.now();
    field.enabled = field.enabled !== false;
    fields.push(field);
    await this._setAllFields(fields);
    return { success: true, field };
  },

  async updateField(field) {
    const fields = await this.loadAllFields();
    const idx = fields.findIndex(f => f.id === field.id);
    if (idx === -1) return { success: false, message: '字段不存在' };
    field.updatedAt = Date.now();
    fields[idx] = { ...fields[idx], ...field };
    await this._setAllFields(fields);
    return { success: true };
  },

  async deleteField(fieldId) {
    const fields = await this.loadAllFields();
    const filtered = fields.filter(f => f.id !== fieldId);
    await this._setAllFields(filtered);
    // 同时从所有 scheme 中移除此 fieldId 引用
    const schemes = await this.loadSchemes();
    let changed = false;
    for (const s of schemes) {
      if (s.fieldIds && s.fieldIds.includes(fieldId)) {
        s.fieldIds = s.fieldIds.filter(id => id !== fieldId);
        changed = true;
      }
    }
    if (changed) await this._setSchemes(schemes);
    return { success: true };
  },

  async toggleFieldEnabled(fieldId, enabled) {
    const fields = await this.loadAllFields();
    const field = fields.find(f => f.id === fieldId);
    if (!field) return { success: false };
    field.enabled = enabled;
    field.updatedAt = Date.now();
    await this._setAllFields(fields);
    return { success: true };
  },

  // === Schemes CRUD ===

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
    scheme.fieldIds = scheme.fieldIds || [];
    schemes.push(scheme);
    await this._setSchemes(schemes);
    return { success: true, scheme };
  },

  async updateScheme(scheme) {
    const schemes = await this.loadSchemes();
    const idx = schemes.findIndex(s => s.id === scheme.id);
    if (idx === -1) return { success: false, message: '方案不存在' };
    scheme.updatedAt = Date.now();
    schemes[idx] = { ...schemes[idx], ...scheme };
    await this._setSchemes(schemes);
    return { success: true };
  },

  async deleteScheme(schemeId) {
    const schemes = await this.loadSchemes();
    const filtered = schemes.filter(s => s.id !== schemeId);
    await this._setSchemes(filtered);
    // 不删除字段，字段独立存在
    return { success: true };
  },

  // === Scheme-Field 关联 ===

  async getSchemeFields(schemeId) {
    const schemes = await this.loadSchemes();
    const scheme = schemes.find(s => s.id === schemeId);
    if (!scheme || !scheme.fieldIds || scheme.fieldIds.length === 0) return [];
    const allFields = await this.loadAllFields();
    return allFields.filter(f => scheme.fieldIds.includes(f.id));
  },

  async setSchemeFields(schemeId, fieldIds) {
    const schemes = await this.loadSchemes();
    const scheme = schemes.find(s => s.id === schemeId);
    if (!scheme) return { success: false, message: '方案不存在' };
    scheme.fieldIds = fieldIds;
    scheme.updatedAt = Date.now();
    await this._setSchemes(schemes);
    return { success: true };
  },

  async getFieldSchemes(fieldId) {
    const schemes = await this.loadSchemes();
    return schemes.filter(s => s.fieldIds && s.fieldIds.includes(fieldId));
  },

  // === Active Scheme ===

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

  // === Data Migration ===

  async migrateIfNeeded() {
    const newFields = await this.loadAllFields();
    if (newFields.length > 0) return; // 已迁移或新安装
    // 读取旧格式数据
    const oldData = await new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY_FIELDS_OLD], (result) => {
        resolve(result[STORAGE_KEY_FIELDS_OLD] || {});
      });
    });
    if (Object.keys(oldData).length === 0) return;
    // 迁移：旧格式 { schemeId: [fields...] } -> 全局列表 + scheme.fieldIds
    const allFields = [];
    const schemes = await this.loadSchemes();
    for (const [schemeId, fields] of Object.entries(oldData)) {
      const scheme = schemes.find(s => s.id === schemeId);
      if (scheme) scheme.fieldIds = scheme.fieldIds || [];
      for (const f of fields) {
        delete f.schemeId;
        allFields.push(f);
        if (scheme) scheme.fieldIds.push(f.id);
      }
    }
    await this._setAllFields(allFields);
    await this._setSchemes(schemes);
  },

  // === Internal ===

  async _setAllFields(fields) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY_FIELDS]: fields }, resolve);
    });
  },

  async _setSchemes(schemes) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY_SCHEMES]: schemes }, resolve);
    });
  }
};

export default SessionStorage;
