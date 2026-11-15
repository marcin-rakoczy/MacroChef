# Admin Rights Grant Script - Implementation Summary

## 📝 Overview

Comprehensive suite of tools to grant admin rights to users in MacroChef without manual database editing. Supports both quick SQL execution and automated Node.js tooling.

## 📦 New Files Created

### SQL Script
- **`grant-admin-rights.sql`** - Pure SQL template for direct database execution via Supabase SQL Editor
  - Updates existing profiles or creates new ones
  - Includes verification queries
  - Zero dependencies

### JavaScript Tools
- **`grant-admin-rights.js`** - CLI tool for automated admin grants
  - Non-interactive mode with `--email` and `--env` flags
  - Supports PROD and TEST environments
  - Service Role authentication
  - Detailed error handling and logging
  
- **`grant-admin-rights-interactive.js`** - Interactive CLI wrapper
  - Prompts user for email and environment
  - Helpful guidance for missing credentials
  - User-friendly confirmation dialog
  
- **`grant-admin-rights.sh`** - Bash wrapper script
  - macOS/Linux/Git Bash support
  - Interactive prompts
  - Service key validation

### Documentation
- **`GRANT_ADMIN_RIGHTS_README.md`** - Comprehensive documentation
  - 3 implementation methods
  - SQL Editor step-by-step guide
  - Node.js setup and configuration
  - Troubleshooting guide
  
- **`GRANT_ADMIN_RIGHTS_QUICKSTART.md`** - Quick reference
  - 2-minute Supabase method
  - Real examples
  - Common issues and solutions
  - Service key locations
  
- **`.env.example`** - Environment configuration template
  - Service key placeholders
  - Documentation for obtaining credentials
  - CI/CD configuration guidance

## 🎯 Usage Methods

### Method 1: Supabase SQL Editor (Fastest - 2 min)
```
No setup required. Go to https://app.supabase.com/ and paste SQL.
```

### Method 2: Node.js CLI (Automated)
```bash
node scripts/grant-admin-rights.js --email admin@example.com --env PROD
```

### Method 3: Interactive CLI
```bash
node scripts/grant-admin-rights-interactive.js
```

### Method 4: Bash Script
```bash
bash scripts/grant-admin-rights.sh
```

## 🔧 Technical Details

### Database Schema Used
- Table: `public.user_profiles`
- Column: `role` (enum: 'Admin', 'Tester', 'UserWithAdvertisement')
- Foreign Key: `user_id` references `auth.users(id)`

### Supabase Environments
- **PROD**: `xymudnmqahgayqvpznwz.supabase.co`
- **TEST**: `pcjlrcuyhtqoijtkrlyj.supabase.co`

### Authentication
- Uses Service Role Secret (requires administrative access)
- Environment variables: `SUPABASE_PROD_SERVICE_KEY`, `SUPABASE_TEST_SERVICE_KEY`

## ⚙️ Configuration

1. **Get Service Keys**
   - Go to Supabase project → Settings → API
   - Copy "Service Role Secret"

2. **Set Environment Variables**
   ```bash
   # Windows (PowerShell)
   $env:SUPABASE_PROD_SERVICE_KEY = "your_key"
   $env:SUPABASE_TEST_SERVICE_KEY = "your_key"
   
   # Linux/macOS
   export SUPABASE_PROD_SERVICE_KEY="your_key"
   export SUPABASE_TEST_SERVICE_KEY="your_key"
   ```

3. **Or use .env.local**
   - Copy `.env.example` to `.env.local`
   - Fill with actual service keys
   - Never commit to git

## ✅ Features

- ✅ Fast SQL method (no dependencies)
- ✅ Automated CLI tools (for CI/CD integration)
- ✅ Interactive prompts (user-friendly)
- ✅ Multiple environment support (PROD/TEST)
- ✅ Error handling and validation
- ✅ Comprehensive documentation
- ✅ Cross-platform support (Windows/macOS/Linux)
- ✅ Bash script wrapper for shell automation

## 🧪 Verification

All scripts include verification queries that show:
```
user_id | email | role | created_at
```

Confirms admin rights were successfully granted.

## 📋 Next Steps

1. Choose your preferred method (SQL Editor is fastest)
2. Follow `GRANT_ADMIN_RIGHTS_QUICKSTART.md`
3. Run the appropriate script/query
4. Verify the output shows `role = 'Admin'`

## 🔒 Security Notes

- ⚠️ Never share Service Keys publicly
- ⚠️ Always use `.env.local` for local development (gitignored)
- ⚠️ Anon Key is public; use Service Role Key for admin operations
- ⚠️ Keep credentials in environment variables or `.env.local`

## 📚 Related Files

- Schema migration: `supabase/migrations/20261113210000_initial_schema.sql`
- Auth configuration: `js/auth.js`
- Permissions: `js/permissions.js`
- Admin panel: `js/components/AdminPanel.js`

## 🆘 Troubleshooting

See `GRANT_ADMIN_RIGHTS_README.md` section "🐛 Troubleshooting" for:
- User not found errors
- Foreign key violations
- Permission denied issues
- Connection problems
