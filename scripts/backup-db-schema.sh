#!/bin/bash

# MacroChef Quick Database Backup Script (Bash version)
# Creates dated schema backups in backups/ directory
#
# Usage:
#   ./scripts/backup-db-schema.sh
#   ./scripts/backup-db-schema.sh prod
#   ./scripts/backup-db-schema.sh test
#   DATABASE_URL='postgresql://...' ./scripts/backup-db-schema.sh myenv

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_error() {
    echo -e "${RED}❌ Error: $1${NC}" >&2
    exit 1
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

log_header() {
    echo -e "\n${YELLOW}📦 MacroChef Database Schema Backup${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Environment or use argument
ENV="${1:-default}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%S")
BACKUP_DIR="backups"

# Create backups directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    log_info "Created backup directory: $BACKUP_DIR/"
fi

# Get database credentials from environment
DATABASE_URL="${DATABASE_URL:-}"

# Parse DATABASE_URL if provided
if [ -n "$DATABASE_URL" ]; then
    # Extract credentials from postgresql://user:password@host:port/database
    DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)|\3|')
    DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)|\4|')
    DB_USER=$(echo "$DATABASE_URL" | sed -E 's|postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)|\1|')
    DB_PASS=$(echo "$DATABASE_URL" | sed -E 's|postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)|\2|')
    DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)|\5|')
else
    # Try environment variables
    DB_HOST="${SUPABASE_HOST:-}"
    DB_PORT="${SUPABASE_PORT:-5432}"
    DB_USER="${SUPABASE_USER:-postgres}"
    DB_PASS="${SUPABASE_PASSWORD:-}"
    DB_NAME="${SUPABASE_DB:-postgres}"
fi

# Backup filename
BACKUP_FILE="$BACKUP_DIR/schema-${ENV}-${TIMESTAMP}.sql"

log_header
log_info "Environment: $ENV"
log_info "Backup file: $BACKUP_FILE"
echo "   Host: ${DB_HOST:-Not configured}"
echo "   Database: ${DB_NAME:-Not configured}"
echo "   User: ${DB_USER:-Not configured}"
echo ""

# Validate configuration
if [ -z "$DB_HOST" ]; then
    log_error "Database host not configured. Set DATABASE_URL or SUPABASE_HOST"
fi

if [ -z "$DB_PASS" ]; then
    log_error "Database password not configured. Set DATABASE_URL or SUPABASE_PASSWORD"
fi

# Run export
log_info "⏳ Creating backup...\n"

# Export password for pg_dump
export PGPASSWORD="$DB_PASS"

# Run pg_dump
if pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -p "$DB_PORT" \
    --schema-only \
    --no-owner \
    --no-acl \
    > "$BACKUP_FILE"; then
    
    # Verify backup was created
    if [ -f "$BACKUP_FILE" ]; then
        SIZE_KB=$(du -k "$BACKUP_FILE" | cut -f1)
        
        log_success "Backup created successfully"
        echo "   File: $BACKUP_FILE"
        echo "   Size: $SIZE_KB KB"
        echo ""
        
        # Create latest symlink
        LATEST_FILE="$BACKUP_DIR/schema-${ENV}-latest.sql"
        ln -sf "$(basename "$BACKUP_FILE")" "$LATEST_FILE" 2>/dev/null || \
            cp "$BACKUP_FILE" "$LATEST_FILE"
        log_info "Latest link: $LATEST_FILE"
        
        # List recent backups
        echo ""
        log_info "Recent backups for '$ENV':"
        COUNT=0
        for backup in $(ls -1rt "$BACKUP_DIR"/schema-${ENV}-*.sql 2>/dev/null | tail -5); do
            COUNT=$((COUNT + 1))
            SIZE_KB=$(du -k "$backup" | cut -f1)
            MTIME=$(date -r "$backup" "+%Y-%m-%d %H:%M:%S")
            echo "   $COUNT. $(basename "$backup") ($SIZE_KB KB, $MTIME)"
        done
        
        echo ""
        log_info "Next steps:"
        echo "   1. Restore with: ./scripts/import-db-schema.sh $BACKUP_FILE"
        echo "   2. Commit backup: git add $BACKUP_FILE"
        echo "   3. Track versions for disaster recovery"
        echo ""
    else
        log_error "Backup file was not created"
    fi
else
    log_error "pg_dump failed. Check your credentials and database host."
fi

# Clean up
unset PGPASSWORD
