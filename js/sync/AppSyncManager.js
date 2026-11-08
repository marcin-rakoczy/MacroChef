window.MacroChef = window.MacroChef || {};

(function () {
  class AppSyncManager {
    start(scope) { throw new Error('start() must be implemented'); }
    requestSync() { throw new Error('requestSync() must be implemented'); }
    getStatus() { throw new Error('getStatus() must be implemented'); }
    subscribe(listener) { throw new Error('subscribe() must be implemented'); }
    stop() { throw new Error('stop() must be implemented'); }
  }

  window.MacroChef.AppSyncManager = AppSyncManager;
})();
