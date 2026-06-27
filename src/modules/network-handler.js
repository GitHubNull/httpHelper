/**
 * network-handler.js - 网络请求捕获、存储与数据查询
 */

const MAX_REQUESTS = 500;

const NetworkHandler = {
  requests: [],
  listeners: [],
  isRecording: true,
  uidCounter: 0,
  requestMeta: new Map(),

  initNetworkListener(callback) {
    chrome.devtools.network.onRequestFinished.addListener((request) => {
      // 录制开关：关闭时跳过捕获
      if (!this.isRecording) return;

      // 分配唯一 uid 并初始化元数据
      request._uid = ++this.uidCounter;
      this.requestMeta.set(request._uid, { color: null, note: '' });

      // 记录时间戳
      request._reqStartTime = request.startedDateTime || null;
      if (request.startedDateTime && typeof request.time === 'number') {
        const startTime = new Date(request.startedDateTime).getTime();
        request._resEndTime = new Date(startTime + request.time).toISOString();
      } else {
        request._resEndTime = null;
      }

      this.requests.unshift(request);
      if (this.requests.length > MAX_REQUESTS) {
        const dropped = this.requests.pop();
        if (dropped && dropped._uid) {
          this.requestMeta.delete(dropped._uid);
        }
      }
      if (callback) callback(request);
    });
  },

  getRequests() {
    return this.requests;
  },

  getRequest(index) {
    return this.requests[index] || null;
  },

  getRequestByUid(uid) {
    return this.requests.find(r => r._uid === uid) || null;
  },

  clearRequests() {
    this.requests = [];
    this.clearMeta();
  },

  getRequestCount() {
    return this.requests.length;
  },

  // === 录制控制 ===
  setRecording(enabled) {
    this.isRecording = enabled;
  },

  getRecording() {
    return this.isRecording;
  },

  // === 请求元数据管理（颜色标记和备注） ===
  getRequestMeta(uid) {
    if (!uid) return { color: null, note: '' };
    return this.requestMeta.get(uid) || { color: null, note: '' };
  },

  setRequestColor(uid, color) {
    const meta = this.requestMeta.get(uid);
    if (meta) meta.color = color;
  },

  setRequestNote(uid, note) {
    const meta = this.requestMeta.get(uid);
    if (meta) meta.note = note;
  },

  clearMeta() {
    this.requestMeta.clear();
    this.uidCounter = 0;
  }
};

export default NetworkHandler;
