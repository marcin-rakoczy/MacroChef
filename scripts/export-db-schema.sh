#!/bin/bash

# MacroChef Database Schema Export Script
# Exports PostgreSQL/Supabase schema (structure only, no data)
# Usage: bash scripts/export-db-schema.sh <output-file>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
OUTPUT_FILE="${1:-schema-backup-$(date +%Y%m%d_%H%M%S).sql}"
SUPABASE_URL="${SUPABASE_URL}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD}"

echo -e "${YELLOW}🔄 MacroChef Database Schema Export${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Validate environment variables
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ Error: SUPABASE_URL not set${NC}"
    echo "   Set it with: export SUPABASE_URL='your-project-url'"
    exit 1
fi

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${RED}❌ Error: SUPABASE_DB_PASSWORD not set${NC}"
    echo "   Set it with: export SUPABASE_DB_PASSWORD='your-db-password'"
    exit 1
fi

# Extract database URL components
DB_HOST=$(echo "$SUPABASE_URL" | sed -E 's/https:\/\/([^:]+).*$/\1/')
DB_NAME="postgres"
DB_USER="postgres"
DB_PORT=5432

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "   Host: $DB_HOST"
echo "   Database: $DB_NAME"
echo "   Output: $OUTPUT_FILE"
echo ""

# Export schema only (no data)
echo -e "${YELLOW}⏳ Exporting schema...${NC}"

PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -p "$DB_PORT" \
    --schema-only \
    --no-owner \
    --no-acl \
    --verbose \
    --compress=0 \
    > "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo -e "${GREEN}✅ Schema exported successfully${NC}"
    echo "   File: $OUTPUT_FILE"
    echo "   Size: $FILE_SIZE"
    echo ""
    echo -e "${YELLOW}📝 File contains:${NC}"
    echo "   • Table definitions"
    echo "   • Indexes"
    echo "   • Triggers"
    echo "   • Functions"
    echo "   • Row Level Security policies"
    echo "   • NO data rows"
else
    echo -e "${RED}❌ Export failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "   1. Review the exported schema"
echo "   2. Use scripts/import-db-schema.sh to restore"
echo "   3. Commit to version control (optional)"
echo ""
