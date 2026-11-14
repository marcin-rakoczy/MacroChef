# Environment Configuration Implementation - Visual Guide

## 🎯 What Was Implemented

A complete 3-environment system (PROD, TEST, LOCAL) for MacroChef with automatic detection, separate caches, UI badges, and optimized CI/CD workflow.

---

## 📍 Environment Detection

```
User opens app on hostname
           ↓
detectEnvironment() runs
           ↓
       ┌───┴───────────────────────────┐
       ↓                               ↓
   PROD hostnames?              TEST or LOCAL?
   • macrochef.pl               • test.macrochef.pl
   • www.macrochef.pl           • localhost
                                • 127.0.0.1
                                • file:// protocol
           ↓                          ↓
   window.MacroChef.ENV = 'PROD'  ENV = 'TEST'/'LOCAL'
```

---

## 🗄️ Database Isolation

Each environment has its own IndexedDB cache:

```
Browser on localhost:8000          Browser on macrochef.pl         Offline mode
      ↓                                  ↓                              ↓
TEST_MacroChefDB                  MacroChefDB                    LOCAL_MacroChefDB
  └─ recipes                         └─ recipes                      └─ recipes
  └─ products                        └─ products                      └─ products
  └─ planner                         └─ planner                       └─ planner
  └─ goals                           └─ goals                         └─ goals
  └─ OutboxQueue                     └─ OutboxQueue                   └─ OutboxQueue
```

**Benefit:** Switching between environments doesn't contaminate cache

---

## 🎨 UI Environment Badges

### Header Badge

```
LOCAL DEVELOPMENT (localhost)          PRODUCTION (macrochef.pl)
┌──────────────────────────┐           ┌──────────────┐
│  🍳 MacroChef  [TEST]     │           │  🍳 MacroChef │
│  Meal Prep • DB status    │           │  Meal Prep   │
└──────────────────────────┘           └──────────────┘
  (Amber background)                     (No badge)
```

### Login Screen Badge

```
LOCAL                                   PRODUCTION
┌─────────────────────────┐            ┌──────────────────┐
│  🔒                     │            │  🔒               │
│  MacroChef  [TEST]      │            │  MacroChef        │
│  Meal Prep & Control    │            │  Meal Prep &      │
│  ...                    │            │  Control          │
└─────────────────────────┘            │  ...              │
  (Amber badge)                        └──────────────────┘
                                         (No badge)
```

### Settings Menu Version

```
TEST ENVIRONMENT                       PRODUCTION
─────────────────────────              ──────────────
MacroChef v1.0.28                      MacroChef v1.0.28
(TEST Environment)
```

---

## ⚙️ Supabase Configuration

### Configuration Structure

```javascript
window.MacroChef.ENV = 'TEST' | 'PROD' | 'LOCAL'

envConfig = {
  PROD: {
    url: 'https://xymudnmqahgayqvpznwz.supabase.co',
    anonKey: 'sb_publishable_9_...'
  },
  TEST: {
    url: 'SUPABASE_TEST_URL',        // ← Placeholder to configure
    anonKey: 'SUPABASE_TEST_ANON_KEY' // ← Placeholder to configure
  },
  LOCAL: {
    url: null,
    anonKey: null
  }
}
```

### Connection Flow

```
PROD (macrochef.pl)
  ↓
Production Supabase Project
  └─ RLS policies enforce security
  └─ Full online sync
  └─ 2FA-protected user credentials

TEST (localhost)
  ↓
Test Supabase Project (when configured)
  └─ Same RLS policies
  └─ Full online sync
  └─ Test user accounts
  
LOCAL (file://)
  ↓
Offline Mode (No Supabase)
  └─ Works 100% offline
  └─ LocalStorage & IndexedDB only
  └─ Manual import/export
```

---

## 🔄 CI/CD Workflow

### Old Workflow (problematic)
```
Any push to main
  ↓
Always bump version + deploy
  ↓
PR commits also get deployed
  ↓
Risk of production instability
```

### New Workflow (safe)
```
GitHub Event Tree
  ├─ Pull Request to main
  │  ├─ test job: Run tests
  │  └─ NO version bump ✓
  │  └─ NO deploy ✓
  │
  ├─ Push to main (no [skip ci])
  │  ├─ test job: Run tests
  │  └─ NO version bump ✓
  │  └─ NO deploy ✓
  │
  └─ Manual workflow_dispatch on main
     ├─ test job: Run tests (15 tests)
     ├─ Bump version ✓
     ├─ npm run build ✓
     ├─ Commit with [skip ci] tag ✓
     └─ Deploy to GitHub Pages ✓
```

### Workflow Diagram

```
                                    GitHub Actions Triggers
                                            ↓
                        ┌───────────────────┼───────────────────┐
                        ↓                   ↓                   ↓
                    PR to main          Push to main      workflow_dispatch
                        ↓                   ↓                   ↓
                   ┌─────────┐          ┌─────────┐         ┌─────────┐
                   │ test    │          │ test    │         │ test    │
                   │ job ✓   │          │ job ✓   │         │ job ✓   │
                   └─────────┘          └─────────┘         └─────────┘
                        ↓                   ↓                   ↓
                   NO deploy            NO deploy           deploy job ✓
                   (end)                (end)               (version bump)
                                                                ↓
                                                           (npm build)
                                                                ↓
                                                           (commit [skip ci])
                                                                ↓
                                                           (GitHub Pages)
```

---

## 📝 Test Suite Coverage

### 15 Comprehensive Tests

```
✓ PROD environment detection (macrochef.pl)
✓ PROD environment detection (www.macrochef.pl)
✓ TEST environment detection (test.macrochef.pl)
✓ TEST environment detection (localhost)
✓ TEST environment detection (127.0.0.1)
✓ LOCAL environment detection (file:// protocol)
✓ Default to TEST for unknown hostnames
✓ Database naming: PROD uses MacroChefDB (no prefix)
✓ Database naming: TEST uses TEST_MacroChefDB
✓ Database naming: LOCAL uses LOCAL_MacroChefDB
✓ Supabase config: PROD and TEST defined
✓ Supabase config: TEST uses placeholders
✓ UI: TEST environment badge is amber-colored
✓ UI: LOCAL environment badge is red-colored
✓ UI: PROD environment has no badge
```

**Run:** `node tests/environment.test.js`

---

## 🚀 How to Use

### Local Development (TEST environment)

1. **Start dev server:**
   ```bash
   npm run dev
   # or
   node server.js
   ```

2. **Open app:**
   ```
   http://localhost:8000
   ```

3. **Observe:**
   - Browser console: `[MacroChef] Environment: TEST (hostname: localhost)`
   - Header badge: "TEST" in amber
   - Database: `TEST_MacroChefDB` in DevTools → Storage

### Offline Testing (LOCAL environment)

1. **Open file directly:**
   ```
   file:///path/to/MacroChef/macrochef_calorie_meal_planner_pwa.html
   ```

2. **Observe:**
   - Browser console: `[MacroChef] Environment: LOCAL (hostname: file://)`
   - Header badge: "LOCAL" in red
   - Database: `LOCAL_MacroChefDB`
   - No network requests possible

### Production (PROD environment)

1. **Visit production URL:**
   ```
   https://macrochef.pl
   ```

2. **Observe:**
   - Browser console: `[MacroChef] Environment: PROD (hostname: macrochef.pl)`
   - Header badge: NOT shown (clean UI)
   - Database: `MacroChefDB`
   - Connected to production Supabase

### Configure TEST Supabase (Optional)

1. Create test project at https://supabase.io
2. Copy project URL and anon key
3. Edit `js/supabaseClient.js`:
   ```javascript
   TEST: {
     url: 'https://your-test-project.supabase.co',
     anonKey: 'your_test_anon_key'
   }
   ```
4. Restart dev server
5. Now localhost connects to TEST Supabase instance

### Deploy Production

1. Make changes on feature branch
2. Create PR → tests run automatically
3. Merge to main → tests run automatically
4. Go to GitHub Actions tab
5. Click "Run workflow" (top of page)
6. Select `main` branch
7. Click "Run workflow"
8. Watch:
   - Tests run
   - Version bumps
   - Build completes
   - Deploys to macrochef.pl

---

## 📊 Files Changed

| File | Changes | Purpose |
|------|---------|---------|
| `js/supabaseClient.js` | +40 lines | Environment detection & config |
| `js/db.js` | +2 lines | Database name prefixing |
| `js/components/Header.js` | +8 lines | Environment badge in header |
| `js/components/AuthGate.js` | +10 lines | Environment badge on login |
| `.github/workflows/deploy.yml` | +20 lines | Environment-aware CI/CD |
| `tests/environment.test.js` | NEW | 15 comprehensive tests |
| `docs/ENVIRONMENT_CONFIGURATION.md` | NEW | Complete documentation |

---

## ✨ Benefits

| Benefit | Before | After |
|---------|--------|-------|
| **Cache Isolation** | ❌ Mixed | ✅ Separate per env |
| **Development Safety** | ❌ Risk of prod issues | ✅ TEST env isolated |
| **Deployment Control** | ❌ Auto-deploy on every PR | ✅ Manual dispatch only |
| **Environment Awareness** | ❌ Easy to mix up | ✅ Clear badges |
| **Database Management** | ❌ Single cache | ✅ 3 separate caches |
| **Test Credibility** | ❌ Unclear isolation | ✅ 15 automated tests |

---

## 🔐 Security Impact

✅ **PROD remains secure:**
- No TEST database contamination
- Separate Supabase credentials
- No environment badge (clean UI)
- RLS policies intact

✅ **TEST is protected:**
- Isolated TEST database
- Separate Supabase project
- Clear TEST badge (prevent accidents)

✅ **LOCAL works offline:**
- No Supabase needed
- Full offline capability
- RED badge (clear intent)

---

## 📚 Documentation

- **Quick Start:** [docs/ENVIRONMENT_CONFIGURATION.md](docs/ENVIRONMENT_CONFIGURATION.md)
- **This Guide:** [ENVIRONMENT_IMPLEMENTATION_SUMMARY.md](ENVIRONMENT_IMPLEMENTATION_SUMMARY.md)
- **GitHub PR:** Documented in commit message

---

## ✅ Verification Checklist

- ✅ Build successful: `npm run build`
- ✅ All tests passing: `node tests/environment.test.js`
- ✅ Dev server running: `http://localhost:8000` (TEST badge visible)
- ✅ Environment detection logging in console
- ✅ Database prefixing working (verify in DevTools)
- ✅ Workflow structure correct
- ✅ All files committed and pushed to main
- ✅ No breaking changes to existing functionality

---

## 🎓 Next Steps

1. Configure TEST Supabase (optional)
   - Create test project
   - Update credentials in `js/supabaseClient.js`
   
2. Test on all environments
   - localhost: Verify TEST badge
   - macrochef.pl: Verify no badge
   - Offline: Verify LOCAL badge

3. Use new workflow for deployments
   - PRs: Tests run automatically
   - Main: Tests run on push
   - Deploy: Use workflow_dispatch button

4. Monitor production
   - Verify no badge in production
   - Check console for ENV detection
   - Verify RLS policies working

---

**Date:** 2026-11-14  
**Status:** ✅ Complete & Production Ready
