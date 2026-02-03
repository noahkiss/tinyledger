# Backup and Restore Guide

This guide covers backup and restore procedures for TinyLedger data.

## Data Locations

TinyLedger stores two types of data in separate locations:

| Type | Container Path | Docker Volume | Contents |
|------|---------------|---------------|----------|
| Databases | `/data/db` | `ledger-db` | SQLite files (one per workspace) |
| Attachments | `/data/attachments` | `ledger-attachments` | Receipt images and documents |

Each workspace has its own database file: `/data/db/workspaces/{workspace-id}.db`

Attachments are stored as: `/data/attachments/{workspace-id}/{attachment-id}.{ext}`

## Why VACUUM INTO?

SQLite databases in WAL (Write-Ahead Logging) mode cannot be safely copied with standard file copy commands while the application is running. Copying a WAL-mode database file directly can result in:

- Corrupted backup if a write occurs during copy
- Missing recent transactions still in the WAL file
- Inconsistent state between the main file and WAL

**VACUUM INTO** solves this by creating a transactionally-consistent snapshot:

- Safe to run while the application is active (hot backup)
- Captures all committed transactions including WAL contents
- Produces a compact, defragmented backup file
- Does not block application reads or writes

## Database Backup Methods

### Method 1: Using sqlite3 CLI (Recommended)

This method works on a running container without stopping the application.

```bash
# Enter the container
docker exec -it tinyledger-app-1 /bin/sh

# Navigate to workspaces directory
cd /data/db/workspaces

# List available workspaces
ls -la *.db

# Backup a single workspace (replace my-workspace with actual ID)
sqlite3 my-workspace.db "VACUUM INTO '/tmp/my-workspace-backup.db'"

# Exit container
exit

# Copy backup from container to host
docker cp tinyledger-app-1:/tmp/my-workspace-backup.db ./backups/
```

### Method 2: Direct Volume Access (Container Stopped)

When the container is stopped, you can safely copy files directly.

```bash
# Stop the container
docker compose down

# Copy entire db volume to backup location
docker run --rm \
  -v ledger-db:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine cp -r /source/. /backup/db/

# Restart the container
docker compose up -d
```

### Method 3: Backup All Workspaces Script

Save this as `backup-all.sh` for comprehensive backup:

```bash
#!/bin/bash
# backup-all.sh - Backup all TinyLedger workspaces

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/tinyledger_$TIMESTAMP"

mkdir -p "$BACKUP_PATH/db"
mkdir -p "$BACKUP_PATH/attachments"

echo "Starting backup to $BACKUP_PATH..."

# Backup databases using VACUUM INTO (safe hot backup)
docker exec tinyledger-app-1 /bin/sh -c '
  cd /data/db/workspaces
  for db in *.db; do
    if [ -f "$db" ]; then
      workspace="${db%.db}"
      echo "Backing up database: $workspace"
      sqlite3 "$db" "VACUUM INTO \"/tmp/$db\""
    fi
  done
'

# Copy database backups from container
docker exec tinyledger-app-1 ls /tmp/*.db 2>/dev/null | while read dbfile; do
  docker cp "tinyledger-app-1:$dbfile" "$BACKUP_PATH/db/"
done

# Clean up temp files in container
docker exec tinyledger-app-1 rm -f /tmp/*.db

# Backup attachments (direct copy is safe - files are immutable)
docker cp tinyledger-app-1:/data/attachments/. "$BACKUP_PATH/attachments/"

# Create manifest
echo "Backup completed: $(date)" > "$BACKUP_PATH/manifest.txt"
echo "Databases:" >> "$BACKUP_PATH/manifest.txt"
ls -la "$BACKUP_PATH/db/" >> "$BACKUP_PATH/manifest.txt"
echo "Attachments:" >> "$BACKUP_PATH/manifest.txt"
du -sh "$BACKUP_PATH/attachments/" >> "$BACKUP_PATH/manifest.txt"

echo "Backup complete: $BACKUP_PATH"
echo "Contents:"
ls -la "$BACKUP_PATH"
```

Make it executable: `chmod +x backup-all.sh`

Usage: `./backup-all.sh [backup-directory]`

## Attachment Backup

Attachments are regular files (JPEG, PNG, PDF, GIF) and can be safely copied at any time. They are never modified after upload.

```bash
# Backup attachments while container is running
docker cp tinyledger-app-1:/data/attachments/. ./backups/attachments/

# Or backup specific workspace attachments
docker cp tinyledger-app-1:/data/attachments/my-workspace/. ./backups/my-workspace-attachments/
```

## Complete Backup Script

For a full backup including both databases and attachments:

```bash
#!/bin/bash
# full-backup.sh - Complete TinyLedger backup

set -e

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/tinyledger_$TIMESTAMP"

echo "=== TinyLedger Full Backup ==="
echo "Timestamp: $TIMESTAMP"
echo "Destination: $BACKUP_PATH"
echo ""

# Create backup directory structure
mkdir -p "$BACKUP_PATH"/{db,attachments}

# Step 1: Backup databases with VACUUM INTO
echo "[1/3] Backing up databases..."
docker exec tinyledger-app-1 /bin/sh -c '
  mkdir -p /tmp/backup
  cd /data/db/workspaces
  for db in *.db 2>/dev/null; do
    if [ -f "$db" ]; then
      echo "  - $db"
      sqlite3 "$db" "VACUUM INTO \"/tmp/backup/$db\""
    fi
  done
' || echo "No databases found"

# Copy to host
docker cp tinyledger-app-1:/tmp/backup/. "$BACKUP_PATH/db/" 2>/dev/null || true
docker exec tinyledger-app-1 rm -rf /tmp/backup

# Step 2: Backup attachments
echo "[2/3] Backing up attachments..."
docker cp tinyledger-app-1:/data/attachments/. "$BACKUP_PATH/attachments/" 2>/dev/null || echo "No attachments found"

# Step 3: Backup registry
echo "[3/3] Backing up workspace registry..."
docker cp tinyledger-app-1:/data/workspaces.json "$BACKUP_PATH/" 2>/dev/null || echo "No registry found"

# Create backup summary
echo ""
echo "=== Backup Summary ==="
echo "Databases: $(ls -1 "$BACKUP_PATH/db/" 2>/dev/null | wc -l) files"
echo "Attachments: $(find "$BACKUP_PATH/attachments" -type f 2>/dev/null | wc -l) files"
echo "Total size: $(du -sh "$BACKUP_PATH" | cut -f1)"
echo ""
echo "Backup location: $BACKUP_PATH"
```

## Restore Procedures

### Restore Single Workspace Database

```bash
# Stop the container (recommended but not required)
docker compose down

# Copy backup to container
docker cp ./backups/my-workspace.db tinyledger-app-1:/data/db/workspaces/my-workspace.db

# Restart container
docker compose up -d
```

### Restore with VACUUM INTO (Live Restore)

If you need to restore while the app is running, use VACUUM INTO to avoid corruption:

```bash
# Copy backup into container temporarily
docker cp ./backups/my-workspace.db tinyledger-app-1:/tmp/restore.db

# Enter container
docker exec -it tinyledger-app-1 /bin/sh

# Close any existing connections by the app (optional - restart is cleaner)
# Then restore using VACUUM INTO
sqlite3 /tmp/restore.db "VACUUM INTO '/data/db/workspaces/my-workspace.db'"

# Clean up
rm /tmp/restore.db
exit
```

### Restore Attachments

```bash
# Restore all attachments
docker cp ./backups/attachments/. tinyledger-app-1:/data/attachments/

# Or restore specific workspace attachments
docker cp ./backups/my-workspace-attachments/. tinyledger-app-1:/data/attachments/my-workspace/
```

### Full Restore from Backup

```bash
#!/bin/bash
# restore.sh - Restore TinyLedger from backup

BACKUP_PATH="${1:?Usage: restore.sh <backup-path>}"

if [ ! -d "$BACKUP_PATH" ]; then
  echo "Error: Backup path not found: $BACKUP_PATH"
  exit 1
fi

echo "=== TinyLedger Full Restore ==="
echo "Restoring from: $BACKUP_PATH"
echo ""

# Stop container
echo "[1/4] Stopping container..."
docker compose down

# Start container to mount volumes
echo "[2/4] Starting container..."
docker compose up -d
sleep 3

# Restore databases
echo "[3/4] Restoring databases..."
if [ -d "$BACKUP_PATH/db" ]; then
  for db in "$BACKUP_PATH/db"/*.db; do
    if [ -f "$db" ]; then
      filename=$(basename "$db")
      echo "  - $filename"
      docker cp "$db" "tinyledger-app-1:/data/db/workspaces/$filename"
    fi
  done
fi

# Restore attachments
echo "[4/4] Restoring attachments..."
if [ -d "$BACKUP_PATH/attachments" ]; then
  docker cp "$BACKUP_PATH/attachments/." tinyledger-app-1:/data/attachments/
fi

# Restore registry
if [ -f "$BACKUP_PATH/workspaces.json" ]; then
  docker cp "$BACKUP_PATH/workspaces.json" tinyledger-app-1:/data/
fi

# Restart to pick up restored data
echo ""
echo "Restarting container..."
docker compose restart

echo ""
echo "=== Restore Complete ==="
echo "Verify by visiting the application."
```

## Verification Checklist

After restoring a backup, verify the restore was successful:

### Database Verification

```bash
# Enter container
docker exec -it tinyledger-app-1 /bin/sh

# Check database integrity
sqlite3 /data/db/workspaces/my-workspace.db "PRAGMA integrity_check"
# Expected output: ok

# Verify table structure
sqlite3 /data/db/workspaces/my-workspace.db ".tables"
# Expected: history, transactions, etc.

# Check transaction count
sqlite3 /data/db/workspaces/my-workspace.db "SELECT COUNT(*) FROM transactions"

# Verify WAL mode
sqlite3 /data/db/workspaces/my-workspace.db "PRAGMA journal_mode"
# Expected: wal

exit
```

### Application Verification

1. Open the application in a browser
2. Navigate to the restored workspace
3. Verify transactions are visible
4. Check that attachments display correctly
5. Generate a report to confirm data integrity
6. Verify tag assignments are intact

### Attachment Verification

```bash
# Count attachments for workspace
docker exec tinyledger-app-1 ls -la /data/attachments/my-workspace/ | wc -l

# Verify files are readable
docker exec tinyledger-app-1 file /data/attachments/my-workspace/*
```

## Backup Best Practices

### Frequency

- **Daily:** If recording transactions daily
- **Weekly:** For typical small business use
- **Before major changes:** Always backup before imports or bulk operations

### Storage

- Keep backups on a separate physical device or cloud storage
- Maintain at least 3 backup generations (e.g., daily, weekly, monthly)
- Store offsite for disaster recovery

### Automation (External)

TinyLedger does not include automated backup scheduling. Use external tools:

```bash
# Example cron job for daily backup at 2 AM
0 2 * * * /path/to/backup-all.sh /path/to/backups >> /var/log/tinyledger-backup.log 2>&1

# Example systemd timer (tinyledger-backup.timer)
[Unit]
Description=Daily TinyLedger backup

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

### Testing

- Periodically test restores to a separate environment
- Verify backup integrity after each backup
- Document any restore issues and update procedures

## Troubleshooting

### "database is locked" Error

The database is in use by another process.

```bash
# Option 1: Use VACUUM INTO (works with locked database)
sqlite3 mydb.db "VACUUM INTO '/tmp/backup.db'"

# Option 2: Restart container to release locks
docker compose restart
```

### Backup File is Empty or Zero Bytes

The VACUUM INTO target path may have issues.

```bash
# Check available disk space
df -h

# Verify path is writable
touch /tmp/test-write && rm /tmp/test-write

# Use absolute path for backup
sqlite3 mydb.db "VACUUM INTO '/tmp/backup.db'"
```

### Corrupted Backup

Run integrity check on the backup file:

```bash
sqlite3 backup.db "PRAGMA integrity_check"
```

If integrity check fails:

1. Do not use this backup for restore
2. Check original database integrity
3. Create a new backup
4. Investigate disk or hardware issues

### WAL File Missing After Backup

This is expected. VACUUM INTO creates a standalone database file without WAL. The backup contains all data from both the main database and WAL file.

### Permission Denied

Container user may not have write access:

```bash
# Check container user
docker exec tinyledger-app-1 id
# Expected: uid=1001(nodejs) gid=1001(nodejs)

# Backup to /tmp which is world-writable
sqlite3 mydb.db "VACUUM INTO '/tmp/backup.db'"
```

---

## Programmatic Backup (Advanced)

The application includes a backup utility for programmatic use:

```typescript
import { backupDatabase, backupDatabaseAsync, verifyBackup } from '$lib/server/db/backup';

// Synchronous backup using VACUUM INTO
backupDatabase('my-workspace', '/backups/my-workspace-2024-01-15.db');

// Async backup with progress for large databases
await backupDatabaseAsync('my-workspace', '/backups/large-workspace.db', (percent) => {
  console.log(`Progress: ${percent}%`);
});

// Verify backup integrity
if (verifyBackup('/backups/my-workspace-2024-01-15.db')) {
  console.log('Backup verified successfully');
}
```

See `src/lib/server/db/backup.ts` for implementation details.
