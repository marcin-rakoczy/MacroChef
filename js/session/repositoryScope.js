window.MacroChef = window.MacroChef || {};

(function () {
  function validateScope(scope) {
    if (!scope || typeof scope !== 'object') throw new TypeError('Account scope is required');
    ['issuer', 'tenantId', 'userId'].forEach((key) => {
      if (typeof scope[key] !== 'string' || !scope[key].trim()) {
        throw new TypeError(`Account scope ${key} must be a non-empty string`);
      }
    });
  }

  async function createScopedRepository(scope) {
    validateScope(scope);
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto is required to derive an account database name');
    }
    const identity = JSON.stringify([scope.issuer, scope.tenantId, scope.userId]);
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
    const suffix = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const env = window.MacroChef.ENV;
    const legacyName = `MacroChef-account-${suffix}`;
    return {
      repository: new window.MacroChef.DexieCalorieRepository(`${env}_account-${suffix}`, {
        exactDatabaseName: true, legacyDatabaseName: env === 'PROD' ? legacyName : `${env}_${legacyName}`,
        seedDefaults: true, userId: scope.userId, role: scope.role
      }),
      shoppingStorageKey: `macrochef_checked_${suffix}`
    };
  }

  function createGuestRepository(options = {}) {
    const env = window.MacroChef.ENV;
    return new window.MacroChef.DexieCalorieRepository(`${env}_guest_MacroChefDB`, {
      ...options, exactDatabaseName: true,
      legacyDatabaseName: env === 'PROD' ? 'MacroChefDB' : `${env}_MacroChefDB`, userId: 'guest'
    });
  }

  class RepositoryScopeLifecycle {
    constructor() {
      this.current = null;
      this.pending = Promise.resolve();
      this.generation = 0;
    }

    stopCurrent() {
      const current = this.current;
      if (current && current.syncManager && !current.stopping) {
        current.stopping = current.syncManager.stop();
        current.stopping.catch((error) => console.error('Could not stop account synchronization:', error));
      }
    }

    async dispose(scope) {
      if (scope.syncManager) await (scope.stopping || scope.syncManager.stop());
      scope.repository.disposeSubscriptions();
      await scope.repository.close();
    }

    switchTo(create) {
      const generation = ++this.generation;
      this.stopCurrent();
      const stale = () => generation !== this.generation;
      const operation = this.pending.then(async () => {
        if (this.current) {
          await this.dispose(this.current);
          this.current = null;
        }
        if (stale() || !create) return null;
        const next = await create(stale);
        if (!next) return null;
        if (stale()) {
          await this.dispose(next);
          return null;
        }
        this.current = next;
        return next;
      });
      this.pending = operation.catch(() => {});
      return operation;
    }
  }

  window.MacroChef.createScopedRepository = createScopedRepository;
  window.MacroChef.createGuestRepository = createGuestRepository;
  window.MacroChef.RepositoryScopeLifecycle = RepositoryScopeLifecycle;
})();
