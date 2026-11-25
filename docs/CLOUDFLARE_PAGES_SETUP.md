# Cloudflare Pages Configuration for test.macrochef.pl

## Overview

MacroChef now uses dual deployment strategy:
- **macrochef.pl** → GitHub Pages (production, manual version bumps)
- **test.macrochef.pl** → Cloudflare Pages (manual TEST deployments)

This document covers setup and configuration.

---

## Prerequisites

1. ✅ GitHub repository: `marcin-rakoczy/MacroChef`
2. ✅ Domain: `macrochef.pl` (owned, with OVH access)
3. ✅ Cloudflare account (free tier works)
4. ✅ Supabase TEST project with TEST database

---

## Step 1: Configure Cloudflare Project

### 1.1 Sign in to Cloudflare
1. Go to https://dash.cloudflare.com/
2. Log in or create account

### 1.2 Check Pages Project
1. Open **Workers & Pages**.
2. Select the existing `macrochef` project.
3. Confirm its production branch is `main` and its custom domain
   `test.macrochef.pl` is attached to the production deployment.
4. For manual-only deployments, open the project's **Build** → **Branch control**,
   disable automatic production deployments, and set preview branches to
   **None**. Git-integrated projects can still be deployed with Wrangler.

---

## Step 2: Configure DNS in OVH

### 2.1 Get Cloudflare Pages Domain

After project creation, Cloudflare will show:
```
Default domain: macrochef-3wo.pages.dev
```

### 2.2 Configure OVH DNS

1. Log in to OVH Control Panel
2. Go to **Domain → macrochef.pl → DNS**
3. Add CNAME record for `test` subdomain:
   ```
   Record Type: CNAME
   Subdomain: test
   Target: macrochef-3wo.pages.dev
   TTL: 3600
   ```
4. **Save**

### 2.3 Verify DNS Propagation

```bash
# Wait ~5-10 minutes, then check:
dig test.macrochef.pl CNAME

# Should show:
# test.macrochef.pl.      3600    IN  CNAME   macrochef-3wo.pages.dev.
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
| Cloudflare preview hostname | TEST | Test | Off |
| `localhost` | TEST | Test (local) | Off |
| `127.0.0.1` | TEST | Test (local) | Off |

**File:** `js/supabaseClient.js` (already configured)

### 5.2 Database Isolation

- **PROD** uses `MacroChefDB` (production Supabase)
- **TEST** uses `TEST_MacroChefDB` (Dexie IndexedDB with TEST prefix)

**File:** `js/db.js` (already configured with environment prefix)

### 5.3 Deployment Workflow

GitHub Actions has four workflows:

- **CI Tests**: tests and builds on pull requests and pushes to `main`.
- **Deploy to PROD**: manually releases `main` to GitHub Pages.
- **Deploy to TEST**: manually builds the selected source branch and deploys
  it to Cloudflare branch `main`, serving `https://test.macrochef.pl`.
- **Deploy to FEATURE**: manually builds the selected source branch and
  deploys to a Cloudflare preview branch named by `feature_name`.

The TEST and FEATURE workflows do not bump versions or push commits. All three
deployment workflows call shared CI first. Feature names must be 1–63 lowercase
letters or digits, optionally separated by single hyphens; `main` is reserved.
Both Cloudflare workflows verify the project's production branch is `main`
before deploying.
Use the URL returned in the GitHub Actions summary for the preview. The selected
source branch must contain these workflows and the shared CI workflow.

Disabling Cloudflare's automatic branch builds is a separate dashboard setting;
otherwise Cloudflare's Git integration can deploy independently of these
workflows, including on pushes that skip GitHub Actions.

---

## Step 6: Test Deployment

### 6.1 Test Branch Deploy

1. Open **Actions** → **Deploy to FEATURE** → **Run workflow**.
2. Select the source branch and enter a preview name such as `meal-filters`.
3. Wait for the workflow to succeed and open the preview URL in its summary.
4. Confirm the TEST badge and environment in the browser console.

### 6.2 Test Main Deploy

1. Open **Actions** → **Deploy to TEST** → **Run workflow**.
2. Select the source branch and start the workflow.
3. After it succeeds, visit `https://test.macrochef.pl`.

---

## Monitoring & Troubleshooting

### Check Deployment Status

1. **Cloudflare Pages:**
   - Dashboard → **Pages** → `macrochef` → **Deployments**
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
| `.github/workflows/ci.yml` | Shared test and build checks |
| `.github/workflows/deploy-prod.yml` | Manual GitHub Pages release |
| `.github/workflows/deploy-test.yml` | Manual TEST deployment |
| `.github/workflows/deploy-feature.yml` | Manual FEATURE preview deployment |
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
