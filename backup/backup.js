// Tägliches Backup der SQLite Datenbank
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_PATH = path.join(__dirname, '..', 'db', 'fahrschulo.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const KEEP_DAYS = parseInt(process.env.BACKUP_KEEP_DAYS || '30');

function runBackup() {
  console.log(`[Backup] Start: ${new Date().toISOString()}`);

  // Backup-Verzeichnis erstellen
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Prüfen ob DB existiert
  if (!fs.existsSync(DB_PATH)) {
    console.log('[Backup] Keine Datenbank gefunden. Abbruch.');
    return;
  }

  // Backup erstellen
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupName = `fahrschulo_${timestamp}.db`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  try {
    fs.copyFileSync(DB_PATH, backupPath);
    const stats = fs.statSync(backupPath);
    console.log(`[Backup] Erstellt: ${backupName} (${(stats.size / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error('[Backup] Fehler beim Erstellen:', err.message);
    return;
  }

  // Alte Backups löschen
  cleanOldBackups();

  console.log(`[Backup] Fertig: ${new Date().toISOString()}`);
}

function cleanOldBackups() {
  const cutoff = Date.now() - (KEEP_DAYS * 24 * 60 * 60 * 1000);
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('fahrschulo_') && f.endsWith('.db'));

  let deleted = 0;
  for (const file of files) {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    if (stats.mtimeMs < cutoff) {
      fs.unlinkSync(filePath);
      deleted++;
    }
  }

  if (deleted > 0) {
    console.log(`[Backup] ${deleted} alte Backups gelöscht (älter als ${KEEP_DAYS} Tage)`);
  }
}

// Ausführen
runBackup();
