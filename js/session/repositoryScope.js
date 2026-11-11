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
    const databaseName = `MacroChef-account-${suffix}`;
    return {
      repository: new window.MacroChef.DexieCalorieRepository(databaseName, { seedDefaults: false, userId: scope.userId }),
      shoppingStorageKey: `macrochef_checked_${suffix}`
    };
  }

  window.MacroChef.createScopedRepository = createScopedRepository;
})();
