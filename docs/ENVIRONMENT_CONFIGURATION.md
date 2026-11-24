# MacroChef Environment Configuration

## Overview

MacroChef supports 3 distinct environments: **PROD**, **TEST**, and **LOCAL**. This document describes how environments are detected, configured, and how they affect the application behavior.

---

## Environment Detection

Environments are automatically detected based on `window.location.hostname`:

| Hostname | Environment | Supabase Instance |
|----------|-------------|-------------------|
| `macrochef.pl` | PROD | Production (xymudnmqahgayqvpznwz) |
| `www.macrochef.pl` | PROD | Production (xymudnmqahgayqvpznwz) |
| `test.macrochef.pl` | TEST | Test (pcjlrcuyhtqoijtkrlyj) |
| `localhost` | TEST | Test (pcjlrcuyhtqoijtkrlyj) |
| `127.0.0.1` | TEST | Test (pcjlrcuyhtqoijtkrlyj) |
| `file://` (file protocol) | LOCAL | None (offline mode) |
| Other hostnames | TEST | Test (pcjlrcuyhtqoijtkrlyj, for development) |

The detected environment is exposed as `window.MacroChef.ENV` and can be accessed anywhere in the application:

```javascript
console.log(window.MacroChef.ENV); // 'PROD' | 'TEST' | 'LOCAL'
```

---

## Environment-Specific Configuration

### 1. Supabase Client (`js/supabaseClient.js`)

PROD and TEST use their respective Supabase projects and public publishable keys.
Only public keys belong in browser code; authorization depends on correctly configured RLS.

**PROD Environment:**
```javascript
url: 'https://xymudnmqahgayqvpznwz.supabase.co',
anonKey: 'sb_publishable_9_ZBVJnYEoFr8OWbAE0dMQ_RP1v7VeJ'
```
- **URL:** Production Supabase project
- **Anon Key:** Production public key (RLS protects data)
- **Used by:** macrochef.pl, www.macrochef.pl

**TEST Environment:**
```javascript
url: 'https://pcjlrcuyhtqoijtkrlyj.supabase.co',
anonKey: 'sb_publishable_iSEcgBEq4yh2BTtX7C8CSw_FePyqrgj'
```
- **URL:** Test Supabase project
- **Anon Key:** Test public publishable key
- **Used by:** test.macrochef.pl, localhost, 127.0.0.1

**LOCAL Environment:**
- No Supabase instance
- Application runs in offline-only mode
- File:// protocol skips Supabase client initialization and uses Guest mode

### 2. IndexedDB Database (`js/db.js`)

Database name is prefixed with environment for isolation:

| Environment | Database Name | Purpose |
|-------------|---------------|---------|
| PROD | `MacroChefDB` | Production cache |
| TEST | `TEST_MacroChefDB` | Test environment cache |
| LOCAL | `LOCAL_MacroChefDB` | Offline/local cache |

This prevents cache mixing when testing different environments locally or switching between test.macrochef.pl and localhost.

**Example:**
```javascript
// On localhost: uses TEST_MacroChefDB
// On test.macrochef.pl: uses TEST_MacroChefDB
// On macrochef.pl: uses MacroChefDB
```

---

## UI Indicators

### Header Badge

When not in PROD environment, a colored badge displays next to the app name:

**TEST Environment:**
```html
<span class="bg-amber-50 text-amber-700 border-amber-200">TEST</span>
```
- Color: Amber (warning)
- Text: "TEST"

**LOCAL Environment:**
```html
<span class="bg-red-50 text-red-700 border-red-200">LOCAL</span>
```
- Color: Red (attention)
- Text: "LOCAL"

### Login Screen Badge

The same badge appears on the authentication screen (AuthGate):

```html
<h1>MacroChef</h1>
<span class="badge">TEST</span>
```

### Settings Menu

Environment and version info displayed at bottom of settings menu:

```
MacroChef v1.0.0
(TEST Environment)
```

---

## Development Setup

### Local Development (TEST Environment)

To develop locally with `localhost`:

1. **Start the development server:**
   ```bash
   node server.js
   ```

2. **Access the app:**
   ```
   http://localhost:8000
   ```
   - Environment: **TEST**
   - Database: **TEST_MacroChefDB**
   - Supabase: Test instance (pcjlrcuyhtqoijtkrlyj)

### Production Environment (PROD)

Production runs at `https://macrochef.pl` with production Supabase:

- Environment: **PROD**
- Database: **MacroChefDB**
- Supabase: Production instance (xymudnmqahgayqvpznwz)

### Offline Mode (LOCAL)

To test offline functionality:

1. **Open the app as file:// URL:**
   ```
   file:///path/to/MacroChef/macrochef_calorie_meal_planner_pwa.html
   ```

2. **Environment detected:**
   - Environment: **LOCAL**
   - Database: **LOCAL_MacroChefDB**
   - Supabase: Disabled
   - Mode: Guest (no Supabase client or Supabase requests)

---

## GitHub Actions Workflow

The deployment workflow respects environment configuration:

### On Pull Requests & Push (non-deploy)
- **Trigger:** Push to `main` (with `[skip ci]` ignored) or pull_request to `main`
- **Actions:**
  - ✅ Run tests only:
    - `node tests/nutrition.test.js`
    - `node tests/sw.test.js`
  - ❌ NO version bump
  - ❌ NO build
  - ❌ NO deploy

### On Manual Workflow Dispatch (main only)
- **Trigger:** Click "Run workflow" on `main` branch
- **Actions:**
  - ✅ Run full test suite
  - ✅ Bump version: `node scripts/bump-version.js`
  - ✅ Build: `npm run build`
  - ✅ Verify build: `node tests/sw.test.js`
  - ✅ Commit version bump with `[skip ci]` tag
  - ✅ Deploy to GitHub Pages (macrochef.pl)

---

## Troubleshooting

### "Supabase not configured" in TEST environment

**Problem:** Auth fails or you see "guest mode" notification

**Solution:** Check that the Supabase SDK loaded and that the configured TEST project
and public publishable key are available. Never put a service-role or secret key in
browser code.

### Database cache contamination

**Problem:** TEST environment using production cache or vice versa

**Solution:** Clear IndexedDB for affected environment:

```javascript
// In browser console on localhost:
// Lists all databases
indexedDB.databases().then(dbs => console.log(dbs));

// Delete TEST database
indexedDB.deleteDatabase('TEST_MacroChefDB');

// Reload page
location.reload();
```

### "Credentials not configured" on localhost

**Problem:** Supabase configuration is missing or still contains placeholders.

**Solution:** Restore the TEST project URL and public publishable key shown above.

In guest mode:
- ✅ App works fully offline
- ✅ Can create recipes and products locally
- ❌ Cannot sync to cloud
- ❌ Auth button shows "Guest" status

---

## Logging

Environment detection is logged to browser console:

```
[MacroChef] Environment: PROD (hostname: macrochef.pl)
[MacroChef] Environment: TEST (hostname: localhost)
[MacroChef] Environment: LOCAL (hostname: file://)
```

Check browser DevTools → Console to verify correct environment detection.

---

## Best Practices

1. **Always test in TEST environment first**
   - Use `localhost:8000` or `test.macrochef.pl`
   - Verify changes don't affect production

2. **Keep TEST Supabase separate**
   - Use dedicated test Supabase project
   - Separate user accounts for testing
   - Clear test data regularly

3. **Use [skip ci] for non-deploy commits**
   - Prevents unnecessary deployments
   - Commits version bumps use this tag automatically

4. **Deploy only via workflow_dispatch**
   - Use GitHub Actions "Run workflow" button
   - Ensures all tests pass before production deploy
   - Prevents accidental deployments

5. **Monitor environment badges**
   - Always verify you're on correct environment
   - TEST/LOCAL badges should only appear in development
   - Production should never show environment badge

---

## Related Files

- **js/supabaseClient.js** - Environment detection & Supabase config
- **js/db.js** - Database name prefixing by environment
- **js/components/Header.js** - Environment badge display
- **js/components/AuthGate.js** - Login screen environment badge
- **.github/workflows/deploy.yml** - Environment-aware CI/CD
- **js/data/appVersion.js** - App version display

---

Last updated: 2026-11-14
