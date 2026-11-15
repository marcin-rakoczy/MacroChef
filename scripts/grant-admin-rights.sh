#!/bin/bash
# Grant Admin Rights - Interactive Shell Script
# 
# Usage:
#   bash scripts/grant-admin-rights.sh
#
# Supports: macOS, Linux, Git Bash (Windows)

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 MacroChef - Grant Admin Rights"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Prompt for email
read -p "📧 Enter email address: " email

if [ -z "$email" ]; then
    echo "❌ Error: Email cannot be empty"
    exit 1
fi

# Prompt for environment
echo ""
echo "Select environment:"
echo "  1) TEST (macrochef-test) - Default"
echo "  2) PROD (macrochef-prod)"
read -p "Choose [1-2] (default=1): " env_choice

case "$env_choice" in
    2) ENV="PROD" ;;
    *) ENV="TEST" ;;
esac

echo ""
echo "🔄 Checking for Service Key..."

# Check for Service Key environment variable
if [ -z "${SUPABASE_${ENV}_SERVICE_KEY}" ]; then
    echo ""
    echo "⚠️  Service Key for $ENV not set."
    echo ""
    echo "To set it now, run:"
    echo ""
    if [ "$ENV" = "PROD" ]; then
        echo '  export SUPABASE_PROD_SERVICE_KEY="your_service_key_here"'
    else
        echo '  export SUPABASE_TEST_SERVICE_KEY="your_service_key_here"'
    fi
    echo ""
    echo "Then run this script again."
    echo ""
    echo "💡 How to get Service Key:"
    echo "  1. Go to https://app.supabase.com/"
    echo "  2. Select your project"
    echo "  3. Settings → API"
    echo "  4. Copy 'Service Role Secret' under Project API keys"
    exit 1
fi

echo "✅ Service Key found"
echo ""

# Run Node.js script
echo "🚀 Granting admin rights to: $email (Environment: $ENV)"
echo ""

if [ "$ENV" = "PROD" ]; then
    node scripts/grant-admin-rights.js --email "$email" --env PROD
else
    node scripts/grant-admin-rights.js --email "$email" --env TEST
fi

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "✅ Done!"
else
    echo ""
    echo "❌ Script failed with exit code $exit_code"
    exit $exit_code
fi
