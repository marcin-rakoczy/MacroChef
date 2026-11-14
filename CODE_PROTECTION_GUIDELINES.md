# Code Protection & Anti-Copy Guidelines

## 🎯 Objective

Implement comprehensive technical and legal protections to prevent:
- ❌ Unauthorized code copying
- ❌ Public forks and redistribution
- ❌ Derivative product creation
- ❌ Source code decompilation
- ❌ Commercial use without permission

---

## 🔒 Technical Protection Measures

### 1. Build & Production Optimizations

#### A. Minification & Obfuscation

**In `build.js`:**

```javascript
// Minify JavaScript
function minifyJS() {
  // Strip comments, reduce variable names, compress code
  // Remove all development-only console.log statements
  // Use a tool like: terser, uglify-js, or babel-minify
}

// Minify CSS
function minifyCSS() {
  // Remove comments and unused styles
  // Compress whitespace
}

// Minify HTML
function minifyHTML() {
  // Remove extra whitespace
  // Compress inline styles
}
```

#### B. Remove Source Maps in Production

```javascript
// Never include .map files in production
// In build.js:
process.env.NODE_ENV = 'production';
// Don't generate source maps

// Verify production build:
// ✗ No app.js.map
// ✗ No styles.css.map
// ✗ All JS is minified
```

#### C. Remove Debug Information

```javascript
// Strip all development utilities before production
const buildForProduction = () => {
  // Remove localStorage debugging
  // Remove console.log() statements
  // Remove performance profiling
  // Remove Redux DevTools setup
  // Remove error stack traces
};
```

### 2. Runtime Protection

#### A. Copyright Notice in Footer

All pages should display:
```html
<footer class="text-xs text-slate-400">
  © 2024-2026 Marcin Rakoczy. MacroChef™ - All Rights Reserved.
  <a href="/LICENSE.txt" target="_blank">License</a>
</footer>
```

#### B. License Verification on Load

```javascript
// In js/app.js - executed first
(function() {
  // Verify license notice exists
  const licenseNotice = document.querySelector('[data-protected="true"]');
  if (!licenseNotice) {
    console.error('🔐 Security: License notice missing - unauthorized modification detected');
  }
  
  // Prevent direct access to sensitive files
  if (window.location.pathname === '/js/' || 
      window.location.pathname === '/styles/') {
    window.location.href = '/';
  }
  
  // Mark app as protected
  window.__APP_PROTECTED = true;
})();
```

#### C. Tamper Detection

```javascript
// Detect common tampering attempts
const detectTampering = () => {
  // Check if HTML structure has been modified
  const originalStructure = `...computed hash...`;
  
  // Disable common copy shortcuts
  document.addEventListener('copy', (e) => {
    // Log copy attempts for large code blocks
    console.warn('Copy detected - ensure compliance with LICENSE.txt');
  });
  
  // Prevent context menu inspection
  document.addEventListener('contextmenu', (e) => {
    // Don't completely disable - this is too aggressive
    // But you could disable "View Source" in production
  });
};
```

### 3. Network Security

#### A. Content Security Policy (CSP)

Add to production server headers:
```
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; 
  style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; 
  img-src 'self' data: https:; 
  font-src 'self' data:;
  frame-ancestors 'none';
  base-uri 'self';
```

#### B. Prevent Framing

```
X-Frame-Options: DENY
```

This prevents your app from being embedded in iframes.

#### C. HTTPS Only

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Requires HTTPS for all connections.

---

## 📋 Code Structure Best Practices

### 1. Copyright Headers in All Files

**Every `.js`, `.html`, `.css`, `.jsx` file should start with:**

```javascript
/**
 * MacroChef - Proprietary Fitness Application
 * © 2024-2026 Marcin Rakoczy. ALL RIGHTS RESERVED.
 * 
 * This file is part of MacroChef and is proprietary software.
 * Unauthorized copying, modification, or distribution of this file
 * is strictly prohibited and subject to civil and criminal penalties.
 * 
 * License: Proprietary
 * See LICENSE.txt in root directory
 */
```

### 2. Keep Sensitive Logic Hidden

**Algorithm implementations (e.g., nutrition calculations):**

```javascript
// ✅ GOOD - Logic hidden in utility function
const calculateMacros = (food, weight) => {
  // Complex calculations hidden
  // NEVER expose raw formulas
  return { protein, carbs, fats };
};

// ❌ BAD - Exposed algorithm
const raw_protein = food.protein_per_100g * (weight / 100);
```

### 3. Avoid Hardcoding Sensitive Data

```javascript
// ✅ GOOD - Use environment variables
const API_KEY = process.env.SUPABASE_KEY;

// ❌ BAD - Hardcoded in production
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### 4. Comment Only When Necessary

```javascript
// ✅ GOOD - Minimal comments
const BMR = weight * 10 + height * 6.25 - age * 5 + (isMale ? 5 : -161);

// ❌ BAD - Overly detailed comments (helps copiers)
// Calculate Mifflin-St Jeor BMR:
// weight (kg) * 10 + height (cm) * 6.25 - age (years) * 5 + sex adjustment
// This is a well-known formula for calculating basal metabolic rate
const BMR = weight * 10 + height * 6.25 - age * 5 + (isMale ? 5 : -161);
```

---

## 🛑 GitHub Repository Protection

### 1. Repository Settings

**Settings → General:**
- [ ] Make repository PRIVATE (if not already)
- [ ] Disable forking: `Settings → General → Uncheck "Allow forking"`
- [ ] Disable downloads
- [ ] Disable wikis/discussions (if not needed)

**Settings → Branches:**
- [ ] Enable branch protection on `main`
  - Require pull request reviews before merging
  - Require status checks to pass
  - Require branches to be up to date
  - Include administrators in restrictions
  - Allow force pushes: NO
  - Allow deletions: NO

**Settings → Collaborators:**
- [ ] Limit to minimal trusted team members
- [ ] Require 2FA for all collaborators
- [ ] Review access logs monthly
- [ ] Remove access immediately when unnecessary

### 2. Security Settings

**Settings → Code security and analysis:**
- [x] Enable Dependabot alerts
- [x] Enable Dependabot security updates
- [x] Enable secret scanning
- [x] Enable private vulnerability reporting

### 3. Git Configuration

**In `.gitignore`:**
```
# API Keys & Secrets
.env
.env.local
.env.*.local
*.key
*.pem
secrets/
private/

# Development artifacts
.vscode/
.idea/
*.log
node_modules/

# Build artifacts (optional - depends on your strategy)
dist/
build/
```

**In `.gitattributes`:**
```
# Treat all files as binary to prevent diffs
* binary

# Except necessary text files
*.md diff
LICENSE.txt diff
```

---

## 📚 Documentation Protection

### 1. License & Attribution

- ✅ `LICENSE.txt` - Comprehensive proprietary license
- ✅ `README.md` - License & Attribution section
- ✅ `SECURITY.md` - Security policy & IP notice
- ✅ `INTELLECTUAL_PROPERTY_PROTECTION.md` - Detailed IP strategy
- ✅ Copyright headers in all source files

### 2. DMCA Readiness

Have these templates ready:

**Template: DMCA Takedown Notice**
```
To: [GitHub Legal / Hosting Provider]

NOTICE OF CLAIMED INFRINGEMENT

I am the copyright owner of MacroChef, a proprietary fitness application.

I have discovered unauthorized distribution of my copyrighted software:
- Infringing URL: [full URL to fork/copy]
- Date discovered: [date]
- Nature of infringement: [copying my proprietary code / creating derivative]

This is a substantial portion or entire copy of my work.

Removing infringing material:
Please immediately remove or disable access to:
[list specific files, commits, or repository]

I declare under penalty of perjury that:
- The complaining party is the rightful copyright owner
- The infringing material is not authorized
- The information in this notice is accurate

Sincerely,
Marcin Rakoczy
[email]
[phone]
[address]
```

---

## 🔍 Monitoring & Detection

### 1. Google Alerts

Set up alerts for:
- "MacroChef"
- "MacroChef GitHub"
- "MacroChef fitness"
- Your domain name + "fitness"
- Your domain name + "repository"

### 2. GitHub Search Monitoring

Regularly check GitHub for:
```
# Search for public forks
language:javascript "MacroChef"
language:javascript "macrochef"

# Search for your unique algorithms
language:javascript "Mifflin-St Jeor"
language:javascript your_unique_function_name
```

### 3. Domain Monitoring

- Monitor for typosquatting domains
- Check WHOIS for suspicious registrations
- Search for similar project names
- Monitor for trademark usage

### 4. Create GitHub Action for Monitoring

```yaml
# .github/workflows/ip-monitor.yml
name: IP Monitoring

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - name: Search for unauthorized copies
        run: |
          # Use GitHub API to search
          # Alert if suspicious results found
```

---

## 📈 Continuous Improvement Checklist

### Before Each Release

- [ ] Remove all console.log() statements from production
- [ ] Minify and obfuscate JavaScript
- [ ] Verify no source maps in production
- [ ] Check for hardcoded secrets
- [ ] Run `npm audit` - fix security issues
- [ ] Verify copyright headers present
- [ ] Test CSP headers configured
- [ ] Verify HTTPS/TLS enabled
- [ ] Confirm X-Frame-Options header set

### Monthly

- [ ] Review GitHub access logs
- [ ] Check for unusual forks or copies
- [ ] Monitor security alerts
- [ ] Review dependency updates
- [ ] Audit browser console for warnings

### Quarterly

- [ ] Security audit of codebase
- [ ] Review & update LICENSE.txt
- [ ] Check GitHub security settings
- [ ] Monitor DMCA takedown opportunities
- [ ] Update IP protection documentation

### Annually

- [ ] Penetration testing (recommended)
- [ ] Legal review of licenses
- [ ] Trademark registration check
- [ ] Complete IP audit
- [ ] Update all protection measures

---

## 🚨 Response to Violations

**If you find unauthorized copies:**

1. **Immediate (same day):**
   - Document everything (screenshots, URLs, dates)
   - Take archived copies of evidence
   - Do not contact the violator yet

2. **Within 24 hours:**
   - File DMCA takedown with GitHub: https://github.com/github/dmca
   - File DMCA with hosting provider
   - Document in violation log

3. **Within 7 days:**
   - Send cease & desist letter (email)
   - Follow up if no response
   - Consider escalation

4. **If necessary:**
   - Consult intellectual property attorney
   - File civil lawsuit
   - Criminal referral (DMCA violation)

---

## ✅ Final Verification

Before going live, verify:

- [ ] LICENSE.txt exists and is current
- [ ] README.md has comprehensive license section
- [ ] SECURITY.md present in .github/
- [ ] INTELLECTUAL_PROPERTY_PROTECTION.md present
- [ ] CODE_PROTECTION_GUIDELINES.md present
- [ ] Copyright headers in all source files
- [ ] Production build is minified & obfuscated
- [ ] No source maps in production
- [ ] No console.log in production
- [ ] GitHub repository is private (if applicable)
- [ ] Forking is disabled on GitHub
- [ ] Branch protection enabled on main
- [ ] 2FA required for all collaborators
- [ ] CSP headers configured
- [ ] X-Frame-Options header set
- [ ] HSTS header configured
- [ ] HTTPS enabled on production domain
- [ ] No hardcoded secrets in code
- [ ] .gitignore protects sensitive files

---

## 📞 Support & Resources

**For Legal Questions:**
- Consult an intellectual property attorney
- Reference resources: WIPO, U.S. Copyright Office

**For Technical Implementation:**
- Use established security tools
- Follow OWASP guidelines
- Implement industry best practices

**For Monitoring & Enforcement:**
- Set up automated alerts
- Regular manual reviews
- Maintain detailed violation logs

---

**Last Updated:** November 14, 2026  
**Status:** ACTIVE ENFORCEMENT - DO NOT SKIP THESE MEASURES  
**Maintenance:** Quarterly review required

---

© 2024-2026 Marcin Rakoczy. ALL RIGHTS RESERVED.

🔐 **PROPRIETARY SOFTWARE - PROTECTED BY DMCA & COPYRIGHT LAW** 🔐
