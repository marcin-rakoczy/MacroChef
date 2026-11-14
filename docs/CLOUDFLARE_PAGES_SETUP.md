# Cloudflare Pages Configuration for test.macrochef.pl

## Overview

MacroChef now uses dual deployment strategy:
- **macrochef.pl** → GitHub Pages (production, manual version bumps)
- **test.macrochef.pl** → Cloudflare Pages (testing, automatic branch deploys)

This document covers setup and configuration.

---

## Prerequisites

1. ✅ GitHub repository: `marcin-rakoczy/MacroChef`
2. ✅ Domain: `macrochef.pl` (owned, with OVH access)
3. ✅ Cloudflare account (free tier works)
4. ✅ Supabase TEST project with TEST database

---

## Step 1: Create Cloudflare Project

### 1.1 Sign in to Cloudflare
1. Go to https://dash.cloudflare.com/
2. Log in or create account

### 1.2 Create Pages Project
1. **Pages** → **Create a project**
2. **Connect to Git** → Select GitHub account
3. Choose repository: `marcin-rakoczy/MacroChef`
4. Project name: `macrochef-test`
5. **Build settings:**
   - Build command: `npm run build`
   - Build output directory: `.`
   - Node version: `20.x`
6. **Create project**

---

## Step 2: Configure DNS in OVH

### 2.1 Get Cloudflare Pages Domain

After project creation, Cloudflare will show:
```
Default domain: macrochef-test.pages.dev
```

### 2.2 Configure OVH DNS

1. Log in to OVH Control Panel
2. Go to **Domain → macrochef.pl → DNS**
3. Add CNAME record for `test` subdomain:
   ```
   Record Type: CNAME
   Subdomain: test
   Target: macrochef-test.pages.dev
   TTL: 3600
   ```
4. **Save**

### 2.3 Verify DNS Propagation

```bash
# Wait ~5-10 minutes, then check:
dig test.macrochef.pl CNAME

# Should show:
# test.macrochef.pl.      3600    IN  CNAME   macrochef-test.pages.dev.
```

---

## Step 3: Configure Custom Domain in Cloudflare

### 3.1 Add Custom Domain

1. In Cloudflare Pages project
2. **Settings** → **Custom domains**
3. **Add custom domain**: `test.macrochef.pl`
4. **Activate domain**

### 3.2 Configure SSL/TLS

1. **SSL/TLS** → **Certificate Authorities**
2. **Enable Automatic HTTPS Rewrites**
3. **Minimum TLS Version**: 1.3

---

## Step 4: GitHub Secrets Setup

Add these secrets to GitHub repository:

1. Go to **Settings → Secrets and variables → Actions**
2. Add:
   ```
   CLOUDFLARE_API_TOKEN = <your-api-token>
   CLOUDFLARE_ACCOUNT_ID = <your-account-id>
   ```

### Get Cloudflare Credentials

**API Token:**
1. Cloudflare Dashboard → **My Profile**
2. **API Tokens** → **Create Token**
3. Use template: "Cloudflare Pages — Deploy"
4. **Permissions**: `Cloudflare Pages:Edit, Account.Pages:Edit`
5. Copy token

**Account ID:**
1. Cloudflare Dashboard → **Account Home**
2. Right sidebar → Copy "Account ID"

---

## Step 5: Configure Build & Deployment

### 5.1 Environment Detection

The app automatically detects environment by hostname:

| Hostname | Environment | Database | Ads |
|----------|-------------|----------|-----|
| `macrochef.pl` | PROD | Production | Off |
| `test.macrochef.pl` | TEST | Test | Off |
| `feature-*.test.macrochef.pl` | TEST | Test | Off |
| `localhost` | TEST | Test (local) | Off |
| `127.0.0.1` | TEST | Test (local) | Off |

**File:** `js/supabaseClient.js` (already configured)

### 5.2 Database Isolation

- **PROD** uses `MacroChefDB` (production Supabase)
- **TEST** uses `TEST_MacroChefDB` (Dexie IndexedDB with TEST prefix)

**File:** `js/db.js` (already configured with environment prefix)

### 5.3 Deployment Workflow

**On push to any branch:**
```
✓ Run tests
✓ Build application
✓ Deploy to Cloudflare Pages
  ├─ main → test.macrochef.pl (production branch)
  ├─ feature/xyz → feature-xyz.test.macrochef.pl
  └─ other branches → branch-name.test.macrochef.pl
```

**On push to main (without [skip ci]):**
```
✓ Run tests
✓ Bump version (npm package.json + js/data/appVersion.js)
✓ Build
✓ Deploy to GitHub Pages (macrochef.pl)
✓ Commit version bump with [skip ci]
```

**On manual workflow_dispatch from main:**
```
✓ Same as "push to main"
```

---

## Step 6: Configure _redirects for SPA

File `_redirects` is already in repository. It handles:
- ✅ Single Page App (SPA) client-side routing
- ✅ Serve index.html for all routes
- ✅ Preserve static files (dist/, sw.js, CNAME)

**File:** `_redirects` (auto-used by Cloudflare Pages)

---

## Step 7: Test Deployment

### 7.1 Test Branch Deploy

1. Create new branch:
   ```bash
   git checkout -b feature/test-deploy
   echo "// test" >> js/app.js
   git add js/app.js
   git commit -m "test: verify deployment"
   git push -u origin feature/test-deploy
   ```

2. Check GitHub Actions:
   - Go to repo → **Actions**
   - Should show "Build & Deploy" running
   - Wait for completion (~2 minutes)

3. Visit `https://feature-test-deploy.test.macrochef.pl`
   - Should show app with TEST environment badge
   - Check console for: `[MacroChef] Environment: TEST`

### 7.2 Test Main Deploy

1. Create PR: `feature/test-deploy` → `main`
2. Merge to main
3. GitHub Actions should:
   - Run tests
   - Bump version
   - Deploy to GitHub Pages
   - Commit with `[skip ci]`

4. Visit:
   - `https://test.macrochef.pl` (Cloudflare - main branch preview)
   - `https://macrochef.pl` (GitHub Pages - production)

---

## Monitoring & Troubleshooting

### Check Deployment Status

1. **Cloudflare Pages:**
   - Dashboard → **Pages** → `macrochef-test` → **Deployments**
   - Shows all branch deployments

2. **GitHub Pages:**
   - Repository → **Settings** → **Pages**
   - Shows production deployment

### Common Issues

**"Custom domain not working"**
- Wait 10-15 minutes for DNS propagation
- Check OVH DNS settings
- Verify Cloudflare SSL certificate is active

**"Environment not detected correctly"**
- Check `js/supabaseClient.js` hostname detection
- Open DevTools Console → look for `[MacroChef] Environment: X`

**"Deploy fails with build error"**
- Check GitHub Actions logs
- Ensure `npm run build` works locally
- Verify Node.js version is 20.x

**"Test database not isolated"**
- Check `js/db.js` for environment prefix
- Should be `TEST_MacroChefDB` for TEST env
- Clear browser IndexedDB and retry

---

## File Reference

| File | Purpose |
|------|---------|
| `.github/workflows/deploy.yml` | CI/CD pipeline (tests, build, deploy) |
| `wrangler.toml` | Cloudflare Pages configuration |
| `_redirects` | SPA routing rules |
| `js/supabaseClient.js` | Environment detection & Supabase config |
| `js/db.js` | Database initialization with env prefix |
| `CNAME` | GitHub Pages domain (macrochef.pl) |

---

## Next Steps

1. ✅ **Complete Cloudflare setup** (this document)
2. ✅ **Verify test.macrochef.pl works**
3. 🔄 **Test branch deployments** (feature/*)
4. 🔄 **Test main deployment** (version bump + macrochef.pl)
5. 📝 **Document in repo README**

---

## Support

If issues arise:
1. Check GitHub Actions logs for errors
2. Verify Cloudflare Pages deployment status
3. Check OVH DNS settings
4. Review environment variables in `js/supabaseClient.js`
5. Clear browser cache and local storage

---

**Last Updated:** 2026-11-14  
**Deployment Strategy:** Dual (GitHub Pages + Cloudflare Pages)  
**Tested On:** GitHub Actions, Cloudflare Pages, OVH DNS
