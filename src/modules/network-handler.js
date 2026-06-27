/**
 * network-handler.js - 网络请求捕获、存储与数据查询
 */

const MAX_REQUESTS = 500;

const NetworkHandler = {
  requests: [],
  listeners: [],

  initNetworkListener(callback) {
    chrome.devtools.network.onRequestFinished.addListener((request) => {
      this.requests.unshift(request);
      if (this.requests.length > MAX_REQUESTS) {
        this.requests.pop();
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

  clearRequests() {
    this.requests = [];
  },

  getRequestCount() {
    return this.requests.length;
  }
};

export default NetworkHandler;
