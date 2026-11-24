(function () {
  const result = document.getElementById('result');
  result.textContent = [
    'RLS verification requires PostgreSQL; this page does not execute database tests.',
    'Run docs/sql/verify_rls_policies.sql in the intended database to apply the policies and run its rollback-safe checks.',
    'Run tests/sync-permission.test.js for client-side permission-error handling.',
    'Browser RLS checks: 0 passed, 0 failed, 1 skipped.'
  ].join('\n');
})();
