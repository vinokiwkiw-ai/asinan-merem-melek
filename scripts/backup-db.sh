#!/usr/bin/env bash
# ==============================================================================
# ASINAN MEREM MELEK (AMM) — AUTOMATED SQLITE DATABASE BACKUP UTILITY
# ==============================================================================
# Creates an atomic, non-destructive snapshot of the production database.
# Safe to run while the application is live with active WAL writes.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DB_FILE="$PROJECT_ROOT/data/amm.db"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILE="$BACKUP_DIR/amm_backup_${TIMESTAMP}.db"
MAX_BACKUPS=14

echo "=========================================================="
echo " [AMM] Memulai Backup Database Asinan Merem Melek"
echo " Waktu: $(date)"
echo "=========================================================="

if [ ! -f "$DB_FILE" ]; then
  echo "❌ Error: File database '$DB_FILE' tidak ditemukan."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

if command -v sqlite3 >/dev/null 2>&1; then
  echo " Menggunakan SQLite Online Safe Backup (VACUUM INTO)..."
  sqlite3 "$DB_FILE" "VACUUM INTO '$BACKUP_FILE';"
else
  echo "⚠️  sqlite3 CLI tidak terpasang. Menggunakan direct copy snapshot..."
  cp "$DB_FILE" "$BACKUP_FILE"
  if [ -f "${DB_FILE}-wal" ]; then
    cp "${DB_FILE}-wal" "${BACKUP_FILE}-wal" 2>/dev/null || true
  fi
fi

if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
  BACKUP_SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
  echo "✅ Backup berhasil dibuat: $BACKUP_FILE ($BACKUP_SIZE)"
else
  echo "❌ Gagal membuat file backup."
  exit 1
fi

# Rotasi backup: simpan 14 backup terbaru, hapus backup lama
echo " Membersihkan backup lama (mempertahankan ${MAX_BACKUPS} backup terbaru)..."
BACKUP_COUNT=$(ls -1t "$BACKUP_DIR"/amm_backup_*.db 2>/dev/null | wc -l || echo 0)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
  ls -1t "$BACKUP_DIR"/amm_backup_*.db | tail -n +"$((MAX_BACKUPS + 1))" | while read -r old_file; do
    echo "  - Menghapus: $(basename "$old_file")"
    rm -f "$old_file" "${old_file}-wal" 2>/dev/null || true
  done
fi

echo "=========================================================="
echo " Selesai. Total backup tersimpan: $(ls -1 "$BACKUP_DIR"/amm_backup_*.db 2>/dev/null | wc -l)"
echo "=========================================================="
