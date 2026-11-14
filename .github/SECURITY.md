# Security Policy

## 🔐 Reporting Vulnerabilities

**IMPORTANT:** Please do NOT open public issues for security vulnerabilities.

If you discover a security vulnerability in MacroChef, please report it **privately** to:

📧 **Email:** [Add your security contact email]

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

We take security seriously and will respond within 48 hours.

---

## 🛡️ Security Best Practices

### For Users

1. **Keep your account secure**
   - Use strong, unique passwords
   - Enable 2FA on your account
   - Never share your credentials
   - Log out after use

2. **Data privacy**
   - Review your privacy settings
   - Understand data stored locally (IndexedDB)
   - Use HTTPS when accessing the app
   - Be cautious with sensitive dietary information

3. **Report issues responsibly**
   - Do not publicly disclose vulnerabilities
   - Give the maintainer time to fix (30+ days)
   - Provide detailed reproduction steps
   - Be respectful and professional

### For Contributors & Developers

1. **Code security**
   - Never commit secrets or API keys
   - Use `.env.local` for local configuration
   - Implement input validation
   - Sanitize user-provided data
   - Use parameterized queries

2. **Dependency management**
   - Keep dependencies updated
   - Review security advisories regularly
   - Use `npm audit` before releases
   - Document why security patches are critical

3. **Access control**
   - Use 2FA for GitHub account
   - Limit repository access to trusted collaborators only
   - Review access logs regularly
   - Revoke access immediately when team members leave

4. **Deployment security**
   - Use HTTPS/TLS (minimum TLS 1.2)
   - Configure security headers (CSP, X-Frame-Options, HSTS)
   - Enable GitHub's security features
   - Secure all API endpoints
   - Validate all environment variables

---

## 🚨 Known Issues & Limitations

Currently, we are not aware of any known security issues. However, be aware of:

1. **Client-side storage**: Data stored in IndexedDB is only protected by browser security model
2. **Offline mode**: Offline functionality may have reduced validation
3. **Third-party dependencies**: Security depends on upstream dependencies

---

## 📊 Security & Privacy Standards

MacroChef implements the following security standards:

- ✅ HTTPS/TLS encryption for all network traffic
- ✅ Client-side data validation
- ✅ Supabase Row-Level Security (RLS) for backend
- ✅ JWT-based authentication
- ✅ GDPR-compliant data handling
- ✅ Regular security reviews
- ✅ Dependency vulnerability scanning

---

## ⚖️ Intellectual Property Protection

**IMPORTANT:** MacroChef is a **PROPRIETARY APPLICATION** with restricted IP rights.

### What This Means

This repository contains **proprietary and confidential software** owned by Marcin Rakoczy.

**PROHIBITED:**
- ❌ Copying or cloning the source code
- ❌ Creating forks for public distribution
- ❌ Modifying and distributing modified versions
- ❌ Using the code as reference for derivative products
- ❌ Commercial use without written permission
- ❌ Reverse engineering or decompilation
- ❌ Removing copyright notices

**PERMITTED:**
- ✅ Viewing this repository on GitHub (read-only)
- ✅ Running the application for personal use
- ✅ Reporting security vulnerabilities
- ✅ Using as educational reference (not copying code)

### Legal Protection

Unauthorized copying or use of MacroChef is protected by:
- **U.S. Copyright Law** & Digital Millennium Copyright Act (DMCA)
- **Trade Secret Protection Laws** (UTSA)
- **International Copyright Treaties** (Berne Convention)

Violations may result in:
- ⚖️ Civil litigation with damages up to **$150,000+ per violation**
- ⚠️ Criminal prosecution under DMCA
- 🔗 DMCA takedown notices on GitHub/hosting platforms
- 💰 Recovery of attorney fees and court costs

### Full License Terms

See [LICENSE.txt](../LICENSE.txt) and [INTELLECTUAL_PROPERTY_PROTECTION.md](../INTELLECTUAL_PROPERTY_PROTECTION.md) for complete terms.

---

## 📝 Supported Versions

| Version | Status | Security Updates |
|---------|--------|------------------|
| Current (Live) | ✅ Supported | Yes - Priority |
| Previous | ⚠️ Limited | Yes - If Critical |
| Older | ❌ Unsupported | No |

---

## 🔄 Security Update Policy

1. **Critical Security Fixes** - Deployed within 24-48 hours
2. **High Severity Fixes** - Deployed within 7 days
3. **Medium Severity Fixes** - Deployed within 30 days
4. **Low Severity Fixes** - Included in next regular release

All security fixes will be deployed to production first, then documented.

---

## 🔍 Security Monitoring & Auditing

MacroChef implements:

1. **GitHub Security Features**
   - Dependabot alerts enabled
   - Secret scanning enabled
   - Code scanning enabled

2. **Monitoring**
   - Deployment logs reviewed
   - Access logs audited monthly
   - Dependency updates tracked
   - Security advisories monitored

3. **Regular Reviews**
   - Quarterly security assessment
   - Annual penetration testing (recommended)
   - Code review for security issues
   - Dependency audit

---

## 🤝 Responsible Disclosure

We respect security researchers and follow responsible disclosure practices:

1. **Embargoed Disclosure**
   - Report vulnerability privately to: [email]
   - Allow 30 days for fix development
   - Coordinate public disclosure date

2. **Public Disclosure**
   - Publish security advisory
   - Document the vulnerability
   - Credit the researcher (if desired)
   - Release patched version

3. **Credit & Recognition**
   - We acknowledge responsible security researchers
   - Can be listed in SECURITY_RESEARCHERS.md
   - May include bug bounty rewards (case-by-case)

---

## 📞 Contact & Resources

**Security Reporting:**
- Email: [Add your security contact]
- Response time: Within 48 hours
- Please allow 30 days for fix before public disclosure

**Additional Resources:**
- [LICENSE.txt](../LICENSE.txt) - Complete license terms
- [README.md](../README.md) - License & Attribution section
- [INTELLECTUAL_PROPERTY_PROTECTION.md](../INTELLECTUAL_PROPERTY_PROTECTION.md) - IP protection details
- [Supabase Security Docs](https://supabase.com/docs/guides/security)
- [OWASP Security Guidelines](https://owasp.org/)

---

## ⚠️ Disclaimer

MacroChef is provided "AS IS" without warranty of any kind.

We do not warrant:
- Fitness for a particular purpose
- Merchantability
- Non-infringement of third-party rights
- Security against all attacks
- Uninterrupted service

**Use at your own risk.** By using this application, you agree to comply with all terms and conditions in [LICENSE.txt](../LICENSE.txt).

---

**Last Updated:** November 14, 2026  
**Status:** ACTIVE - Security First  
**Review Frequency:** Quarterly

---

© 2024-2026 Marcin Rakoczy. ALL RIGHTS RESERVED.

🔐 **PROPRIETARY - DO NOT COPY - PROTECTED BY DMCA** 🔐
