/**
 * RLS Error Handling Enhancement for AppSyncManager.js
 * 
 * Purpose: Properly handle PostgreSQL RLS policy violations (42501) and HTTP permission errors
 * 
 * Current Implementation:
 * - Line 192: `if (!response.ok) throw new Error(...)`
 * - Errors thrown are caught in sync() method (line 246)
 * - blocked.add(key) prevents retry on same key (line 250)
 * - conflicts.push() logs error message (line 251)
 * 
 * RLS Error Codes & HTTP Status:
 * - PostgreSQL 42501: insufficient_privilege (RLS policy violation)
 * - HTTP 403: Forbidden (Supabase RLS blocked the request)
 * - HTTP 401: Unauthorized (JWT expired or invalid)
 * 
 * Enhancement Strategy:
 * 1. Detect RLS errors from Supabase response
 * 2. Extract PostgreSQL error code from response body
 * 3. Mark request as permanently blocked (don't retry)
 * 4. Log permission error with clear message
 * 5. Surface status as 'conflict' with permission details
 */

// ============================================================================
// PROPOSED ENHANCEMENT: Enhanced RLS Error Detection
// ============================================================================

// Step 1: Enhanced request() method to detect RLS errors
async request(table, params, method = 'GET', body) {
  this.checkActive();
  const { client } = this.scope;
  const url = new URL(`/rest/v1/${table}`, client.supabaseUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url.href, {
    method,
    headers: {
      apikey: client.supabaseKey,
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Prefer: method === 'GET' ? 'count=exact' : 'return=representation'
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: this.controller.signal,
    cache: 'no-store'
  });
  this.checkActive();
  
  // ENHANCEMENT: Detect RLS & permission errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorCode = errorData.code || '';
    const errorMsg = errorData.message || '';
    
    // PostgreSQL RLS error 42501: insufficient_privilege
    if (response.status === 403 && errorCode === '42501') {
      const msg = `RLS policy denied ${method} on ${table}: ${errorMsg}`;
      const error = new Error(msg);
      error.isPermanent = true; // Don't retry
      error.isPermissionError = true;
      throw error;
    }
    
    // HTTP 401/403 without specific error code
    if (response.status === 401 || response.status === 403) {
      const msg = `Permission denied (HTTP ${response.status}) on ${table}: ${errorMsg || 'Unauthorized'}`;
      const error = new Error(msg);
      error.isPermanent = true; // Don't retry
      error.isPermissionError = true;
      throw error;
    }
    
    // Other errors (retry possible)
    throw new Error(`Supabase ${table}: HTTP ${response.status} - ${errorMsg}`);
  }
  
  const data = await response.json();
  this.checkActive();
  return { status: response.status, data, range: response.headers.get('content-range') };
}

// Step 2: Enhanced sync() method to handle permanent errors
async sync() {
  // ... existing code ...
  
  const conflicts = [];
  const blocked = new Set();
  const permanentErrors = new Set(); // Track permanent (permission) errors
  
  for (const queued of queue) {
    this.checkActive();
    const entry = await db.OutboxQueue.get(queued.id);
    if (!entry) continue;
    if (!remoteTables[entry.table]) {
      conflicts.push(`Unsupported queued table: ${entry.table}`);
      continue;
    }
    
    const key = `${entry.table}:${entry.payload.id}`;
    
    // Don't retry entries that hit permanent errors
    if (permanentErrors.has(key)) {
      conflicts.push(`Permission denied (previous attempt): ${key}`);
      continue;
    }
    
    if (blocked.has(key)) continue;
    
    try {
      await this.push(entry, remote);
    } catch (error) {
      if (this.stopped) throw error;
      
      // ENHANCEMENT: Distinguish permanent vs. temporary errors
      if (error.isPermanent || error.isPermissionError) {
        permanentErrors.add(key);
        conflicts.push(`🔐 ${error.message}`); // Mark as permission error with emoji
      } else {
        blocked.add(key); // Temporary error, retry next sync
        conflicts.push(error.message);
      }
    }
  }
  
  // ... rest of sync() ...
  
  this.checkActive();
  this.setStatus(conflicts.length ? 'conflict' : 'synced', conflicts.join('; ') || null);
}

// ============================================================================
// TESTING STRATEGY
// ============================================================================

/**
 * Test 1: Admin Successfully Writes
 * - Admin role INSERT to products
 * - Admin role UPDATE recipes (owned)
 * - Admin role DELETE products
 * Expected: Success (HTTP 200/201)
 */

/**
 * Test 2: Non-Admin Blocked by RLS
 * - Tester INSERT to products → RLS error (HTTP 403, error code 42501)
 * - Tester UPDATE products → RLS error (HTTP 403, error code 42501)
 * - Tester DELETE products → RLS error (HTTP 403, error code 42501)
 * Expected: Error marked as permanent, not retried
 */

/**
 * Test 3: Permission Error Prevents Infinite Retry
 * - Non-Admin attempts write that violates RLS
 * - requestSync() called multiple times
 * - Error should be logged once, not retried infinitely
 * Expected: Conflicts status with permission error message
 */

/**
 * Test 4: Non-Admin Can Still Read
 * - Tester SELECT from products
 * - Tester SELECT from recipes
 * Expected: Success (HTTP 200)
 */

/**
 * Test 5: JWT Expired (401 Unauthorized)
 * - Request with expired token
 * - Supabase returns HTTP 401
 * Expected: Error marked as permanent, sync stops gracefully
 */

// ============================================================================
// CURRENT IMPLEMENTATION NOTES
// ============================================================================

/**
 * Current Status in codebase:
 * 
 * ✓ RLS policies ARE implemented in initial_schema.sql
 * ✓ Policies block non-Admin writes correctly
 * ✓ AppSyncManager DOES catch errors in push() (line 304-307)
 * ✓ Errors ARE added to conflicts array
 * 
 * ⚠ NEEDS ENHANCEMENT:
 * ✗ No distinction between temporary & permanent errors
 * ✗ All errors currently treated as temporary (blocked.add only)
 * ✗ No extraction of PostgreSQL error code
 * ✗ No permission-specific error messages
 * 
 * IMPACT: If RLS error occurs, entry will be retried next sync cycle
 * This is ACCEPTABLE because:
 * 1. The error WILL fail again (same RLS policy)
 * 2. Entry accumulates in OutboxQueue until manual cleanup
 * 3. User sees 'conflict' status with error message
 * 4. Not ideal UX, but prevents data loss
 * 
 * RECOMMENDATION: Implement the enhancement above to:
 * - Provide better UX with permanent error marking
 * - Avoid unnecessary retry attempts
 * - Give users clear "permission denied" messages
 */
