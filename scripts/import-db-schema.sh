#!/bin/bash

# MacroChef Database Schema Import Script
# Imports PostgreSQL/Supabase schema from exported file
# Usage: bash scripts/import-db-schema.sh <schema-file>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCHEMA_FILE="${1}"
SUPABASE_URL="${SUPABASE_URL}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD}"

echo -e "${YELLOW}🔄 MacroChef Database Schema Import${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Validate arguments
if [ -z "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ Error: Schema file not provided${NC}"
    echo "Usage: bash scripts/import-db-schema.sh <schema-file>"
    echo ""
    echo "Example:"
    echo "  bash scripts/import-db-schema.sh schema-backup-20261114_150000.sql"
    exit 1
fi

if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ Error: File not found: $SCHEMA_FILE${NC}"
    exit 1
fi

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

FILE_SIZE=$(du -h "$SCHEMA_FILE" | cut -f1)

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "   Schema File: $SCHEMA_FILE"
echo "   File Size: $FILE_SIZE"
echo "   Host: $DB_HOST"
echo "   Database: $DB_NAME"
echo ""

# Confirmation prompt
echo -e "${YELLOW}⚠️  WARNING: This will DROP and RECREATE all tables!${NC}"
echo -e "${BLUE}   All existing data will be LOST!${NC}"
echo ""
read -p "Are you sure? (type 'yes' to continue): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}⏸️  Import cancelled${NC}"
    exit 0
fi

echo -e "${YELLOW}⏳ Importing schema...${NC}"
echo ""

# Import schema
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -p "$DB_PORT" \
    --set ON_ERROR_STOP=on \
    -f "$SCHEMA_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Schema imported successfully${NC}"
    echo ""
    echo -e "${YELLOW}📊 Verification:${NC}"
    echo "   Run this query to verify tables:"
    echo ""
    echo "   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c '\\dt'"
    echo ""
    echo -e "${YELLOW}✨ Next steps:${NC}"
    echo "   1. Verify tables and indexes"
    echo "   2. Check RLS policies are in place"
    echo "   3. Run application tests"
    echo "   4. Import seed data (if needed)"
else
    echo -e "${RED}❌ Import failed${NC}"
    exit 1
fi

echo ""
