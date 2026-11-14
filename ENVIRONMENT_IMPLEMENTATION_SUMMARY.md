# Environment Configuration Implementation Summary

## Overview

Zaimplementowałem pełną obsługę 3 środowisk (LOCAL, TEST, PROD) w aplikacji MacroChef, zachowując architekturę bez bundlera (CDN + `build.js` + `window.MacroChef`).

---

## Changes Made

### 1. ✅ `js/supabaseClient.js` - Environment Detection & Configuration

**Key Features:**
- Automatic environment detection based on `window.location.hostname`
- Exposed `window.MacroChef.ENV` ('PROD' | 'TEST' | 'LOCAL')
- Separate Supabase instances for PROD and TEST
- TEST credentials kept as placeholders for configuration

**Environment Mapping:**
- PROD: `macrochef.pl`, `www.macrochef.pl` → Production Supabase
- TEST: `test.macrochef.pl`, `localhost`, `127.0.0.1` → Test Supabase (placeholder)
- LOCAL: `file://` protocol → Offline mode (no Supabase)

**Console Logging:**
```
[MacroChef] Environment: PROD (hostname: macrochef.pl)
[MacroChef] Environment: TEST (hostname: localhost)
[MacroChef] Environment: LOCAL (hostname: file://)
```

### 2. ✅ `js/db.js` - IndexedDB Database Name Prefixing

**Key Features:**
- Database name automatically prefixed with environment (except PROD)
- Prevents cache contamination between environments
- Enables simultaneous development on TEST and PROD locally

**Database Names:**
- PROD: `MacroChefDB`
- TEST: `TEST_MacroChefDB`
- LOCAL: `LOCAL_MacroChefDB`

**Code Change:**
```javascript
const prefixedDbName = env !== 'PROD' ? `${env}_${databaseName}` : databaseName;
```

### 3. ✅ `js/components/Header.js` - Environment Badge in Header

**Key Features:**
- Colored badge displays when not in PROD environment
- Badge appears next to app title ("MacroChef" + "TEST" or "LOCAL")
- Responsive design (visible on all screen sizes)

**Badge Colors:**
- TEST: Amber (bg-amber-50, text-amber-700)
- LOCAL: Red (bg-red-50, text-red-700)
- PROD: No badge shown

### 4. ✅ `js/components/AuthGate.js` - Environment Badge on Login Screen

**Key Features:**
- Environment badge displays above login form header
- Same styling as header badge
- Prevents accidental login to wrong environment

**Placement:**
```
🔒 MacroChef  [TEST]
Meal Prep, Macro Control & Zero Waste
```

### 5. ✅ Settings Menu Version Display

**Key Features:**
- Version number shown at bottom of settings menu
- Additional line shows environment name when not PROD
- Example: "MacroChef v1.0.28 (TEST Environment)"

### 6. ✅ `.github/workflows/deploy.yml` - Environment-Aware CI/CD

**Key Changes:**

**New `test` Job (runs on all PRs & pushes):**
```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - Run tests only:
      - node tests/nutrition.test.js
      - node tests/sw.test.js
      - node tests/environment.test.js
```

**Updated `deploy` Job (requires `test` job success):**
- Only runs on:
  - `workflow_dispatch` (manual trigger from main)
  - `push` to main (when NOT `[skip ci]`)
- Executes:
  1. Run all tests
  2. Bump version
  3. Build
  4. Commit with `[skip ci]`
  5. Deploy to GitHub Pages

**Workflow Behavior:**
- PR: Tests only (✅ no deploy)
- Push to main: Tests only (✅ no deploy unless workflow_dispatch)
- Manual dispatch: Full pipeline with deploy (✅)

### 7. ✅ `tests/environment.test.js` - Comprehensive Test Suite

**Test Coverage (15 tests):**
- ✅ PROD detection (macrochef.pl, www.macrochef.pl)
- ✅ TEST detection (test.macrochef.pl, localhost, 127.0.0.1)
- ✅ LOCAL detection (file:// protocol)
- ✅ Default to TEST for unknown hostnames
- ✅ Database naming for all environments
- ✅ Supabase config validation
- ✅ UI badge styling verification

**All Tests Passing:**
```
✓ PROD environment: macrochef.pl
✓ PROD environment: www.macrochef.pl
✓ TEST environment: test.macrochef.pl
✓ TEST environment: localhost
✓ TEST environment: 127.0.0.1
✓ LOCAL environment: file:// protocol
✓ TEST environment: unknown hostname defaults to TEST
✓ Database naming: PROD uses MacroChefDB (no prefix)
✓ Database naming: TEST uses TEST_MacroChefDB
✓ Database naming: LOCAL uses LOCAL_MacroChefDB
✓ Supabase config: PROD and TEST configurations defined
✓ Supabase config: TEST uses placeholders
✓ UI: TEST environment badge is amber-colored
✓ UI: LOCAL environment badge is red-colored
✓ UI: PROD environment has no badge
```

### 8. ✅ `docs/ENVIRONMENT_CONFIGURATION.md` - Complete Documentation

**Covers:**
- Environment detection logic
- Configuration for each environment
- UI indicators (headers, badges, menus)
- Development setup instructions
- Supabase configuration
- CI/CD workflow behavior
- Troubleshooting guide
- Best practices

---

## How It Works

### Environment Detection Flow

```
1. User loads app on specific hostname
2. supabaseClient.js runs detectEnvironment()
3. Hostname matched against rules:
   - macrochef.pl / www.macrochef.pl → PROD
   - test.macrochef.pl / localhost / 127.0.0.1 → TEST
   - file:// protocol → LOCAL
   - Other → TEST (default)
4. window.MacroChef.ENV set
5. Appropriate Supabase config loaded
6. db.js uses ENV for database name prefixing
7. UI components read ENV and show badges
```

### Database Isolation Example

On same machine, switching between environments:
- Visit `localhost:8000` → uses `TEST_MacroChefDB`
- Visit `macrochef.pl` → uses `MacroChefDB`
- Open offline HTML → uses `LOCAL_MacroChefDB`

Each environment has its own IndexedDB cache, preventing contamination.

### CI/CD Workflow

```
pull_request to main
├─ test job: Run tests ✓
└─ NO deploy ✗

push to main (non-[skip ci])
├─ test job: Run tests ✓
└─ NO deploy ✗

workflow_dispatch from main
├─ test job: Run tests ✓
├─ deploy job: Bump version ✓
├─ deploy job: Build ✓
├─ deploy job: Commit [skip ci] ✓
└─ deploy job: Deploy to macrochef.pl ✓
```

---

## How to Use

### Configure TEST Supabase (Optional)

If you want to test with TEST Supabase:

1. Create test project at https://supabase.io
2. Copy URL and anon key
3. Edit `js/supabaseClient.js`:
   ```javascript
   TEST: {
     url: 'https://your-test-project.supabase.co',
     anonKey: 'your_test_anon_key'
   }
   ```
4. Restart dev server

### Test Environments Locally

**Test on localhost (TEST env):**
```bash
npm run dev
# http://localhost:8000 → TEST environment
```

**Test offline mode (LOCAL env):**
```
file:///path/to/MacroChef/macrochef_calorie_meal_planner_pwa.html
# LOCAL environment, no Supabase
```

### Deploy to Production

1. Make changes on feature branch
2. Create pull request → tests run only
3. Merge to main → tests run only
4. Go to GitHub Actions
5. Click "Run workflow" button
6. Select main branch
7. Workflow:
   - Runs all tests
   - Bumps version
   - Builds app
   - Deploys to macrochef.pl

---

## Files Modified/Created

| File | Type | Status |
|------|------|--------|
| js/supabaseClient.js | Modified | ✅ |
| js/db.js | Modified | ✅ |
| js/components/Header.js | Modified | ✅ |
| js/components/AuthGate.js | Modified | ✅ |
| .github/workflows/deploy.yml | Modified | ✅ |
| tests/environment.test.js | Created | ✅ |
| docs/ENVIRONMENT_CONFIGURATION.md | Created | ✅ |

---

## Verification

All changes verified:
- ✅ Build successful: `npm run build`
- ✅ Tests passing: `node tests/environment.test.js`
- ✅ Development server running: `http://localhost:8000` (TEST environment)
- ✅ Environment detection logging in console
- ✅ Database prefixing working correctly
- ✅ UI badges displaying correctly
- ✅ Workflow structure correct and optimized

---

## Benefits

1. **Safe Development**: Separate caches for TEST and PROD prevent accidental data mixing
2. **Controlled Deployment**: Manual workflow_dispatch prevents accidental deployments
3. **Clear Environment Awareness**: Badges remind developers which environment they're on
4. **CI/CD Optimization**: Tests run on all PRs; deployment only on manual trigger
5. **Production Stability**: PROD environment has no badges, clean UI
6. **Easy Onboarding**: Documentation explains setup and troubleshooting

---

Date: 2026-11-14
