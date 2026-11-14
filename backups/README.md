# Database Backups

This directory stores PostgreSQL schema backups created with the backup scripts.

## Quick Start

Create a backup:
```bash
DATABASE_URL='postgresql://...' node ../scripts/backup-db-schema.js prod
```

Files created:
- `schema-{env}-{timestamp}.sql` - Timestamped backup
- `schema-{env}-latest.sql` - Always points to latest

## Restore from Backup

```bash
DATABASE_URL='postgresql://...' node ../scripts/import-db-schema.js schema-prod-latest.sql
```

## Using with Git

By default, backups are not committed (see `.gitignore`).

To save versioned backups:
```bash
git add schema-v1.0.0*.sql
git commit -m "Archive database schema v1.0.0"
```

## Documentation

- [Full Documentation](../docs/DATABASE_BACKUP_RESTORE.md)
- [Common Workflows & Examples](../docs/BACKUP_EXAMPLES.md)

---

**Typical backup size:** 10-500 KB (schema only, no data)
