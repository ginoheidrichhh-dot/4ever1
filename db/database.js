const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'fahrschulo.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDb() {
  const database = getDb();

  database.exec(`
    -- Fahrlehrer (Driving Instructors)
    CREATE TABLE IF NOT EXISTS instructors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Fahrschüler (Students)
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      pin_hash TEXT,
      pin_attempts INTEGER DEFAULT 0,
      pin_locked_until DATETIME,
      instructor_id TEXT NOT NULL,
      invitation_token TEXT,
      invitation_sent_at DATETIME,
      portal_activated INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instructor_id) REFERENCES instructors(id)
    );

    -- Fahrstunden (Driving Lessons)
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      instructor_id TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_minutes INTEGER DEFAULT 45,
      lesson_type TEXT NOT NULL DEFAULT 'normal',
      -- BVF Tabs: grundfahraufgaben, verkehr, technik, bewertung
      tab_grundfahraufgaben TEXT DEFAULT '{}',
      tab_verkehr TEXT DEFAULT '{}',
      tab_technik TEXT DEFAULT '{}',
      tab_bewertung TEXT DEFAULT '{}',
      rating INTEGER,
      notes TEXT,
      synced_to_portal INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (instructor_id) REFERENCES instructors(id)
    );

    -- Fehler pro Fahrstunde (Errors per Lesson)
    CREATE TABLE IF NOT EXISTS lesson_errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_id TEXT NOT NULL,
      error_code TEXT NOT NULL,
      error_name TEXT NOT NULL,
      error_category TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    );

    -- Portal-Sync Log
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_id TEXT NOT NULL,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'success',
      FOREIGN KEY (lesson_id) REFERENCES lessons(id)
    );
  `);

  console.log('Datenbank initialisiert');
  return database;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, initDb, closeDb, DB_PATH };
