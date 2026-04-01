const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { requireInstructor } = require('../middleware/auth');
const { DRIVING_ERRORS } = require('../db/errors');
const router = express.Router();

// Lesson Types
const LESSON_TYPES = ['normal', 'ueberlandfahrt', 'autobahnfahrt', 'nachtfahrt', 'pruefung'];

// Alle Fahrstunden (optional per Student)
router.get('/', requireInstructor, (req, res) => {
  const db = getDb();
  let query = `
    SELECT l.*, s.first_name, s.last_name
    FROM lessons l
    JOIN students s ON l.student_id = s.id
    WHERE l.instructor_id = ?
  `;
  const params = [req.instructorId];

  if (req.query.student_id) {
    query += ' AND l.student_id = ?';
    params.push(req.query.student_id);
  }
  if (req.query.date) {
    query += ' AND l.date = ?';
    params.push(req.query.date);
  }

  query += ' ORDER BY l.date DESC, l.start_time DESC';

  const lessons = db.prepare(query).all(...params);
  res.json(lessons);
});

// Einzelne Fahrstunde mit Fehlern
router.get('/:id', requireInstructor, (req, res) => {
  const db = getDb();
  const lesson = db.prepare(`
    SELECT l.*, s.first_name, s.last_name
    FROM lessons l
    JOIN students s ON l.student_id = s.id
    WHERE l.id = ? AND l.instructor_id = ?
  `).get(req.params.id, req.instructorId);

  if (!lesson) {
    return res.status(404).json({ error: 'Fahrstunde nicht gefunden.' });
  }

  const errors = db.prepare('SELECT * FROM lesson_errors WHERE lesson_id = ? ORDER BY timestamp').all(req.params.id);
  lesson.errors = errors;

  res.json(lesson);
});

// Neue Fahrstunde starten
router.post('/', requireInstructor, (req, res) => {
  const { student_id, date, start_time, lesson_type, duration_minutes } = req.body;
  if (!student_id || !date || !start_time) {
    return res.status(400).json({ error: 'Schüler, Datum und Startzeit erforderlich.' });
  }

  const db = getDb();
  const student = db.prepare('SELECT id FROM students WHERE id = ? AND instructor_id = ?').get(student_id, req.instructorId);
  if (!student) {
    return res.status(404).json({ error: 'Schüler nicht gefunden.' });
  }

  const id = uuidv4();
  const type = LESSON_TYPES.includes(lesson_type) ? lesson_type : 'normal';

  db.prepare(`
    INSERT INTO lessons (id, student_id, instructor_id, date, start_time, lesson_type, duration_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, student_id, req.instructorId, date, start_time, type, duration_minutes || 45);

  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
  res.status(201).json(lesson);
});

// Fahrstunde aktualisieren (BVF-Tabs)
router.put('/:id', requireInstructor, (req, res) => {
  const db = getDb();
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ? AND instructor_id = ?').get(req.params.id, req.instructorId);
  if (!lesson) {
    return res.status(404).json({ error: 'Fahrstunde nicht gefunden.' });
  }

  const {
    end_time, duration_minutes, lesson_type, rating, notes,
    tab_grundfahraufgaben, tab_verkehr, tab_technik, tab_bewertung,
  } = req.body;

  db.prepare(`
    UPDATE lessons SET
      end_time = COALESCE(?, end_time),
      duration_minutes = COALESCE(?, duration_minutes),
      lesson_type = COALESCE(?, lesson_type),
      rating = COALESCE(?, rating),
      notes = COALESCE(?, notes),
      tab_grundfahraufgaben = COALESCE(?, tab_grundfahraufgaben),
      tab_verkehr = COALESCE(?, tab_verkehr),
      tab_technik = COALESCE(?, tab_technik),
      tab_bewertung = COALESCE(?, tab_bewertung)
    WHERE id = ?
  `).run(
    end_time || null, duration_minutes || null, lesson_type || null,
    rating || null, notes || null,
    tab_grundfahraufgaben ? JSON.stringify(tab_grundfahraufgaben) : null,
    tab_verkehr ? JSON.stringify(tab_verkehr) : null,
    tab_technik ? JSON.stringify(tab_technik) : null,
    tab_bewertung ? JSON.stringify(tab_bewertung) : null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Fehler hinzufügen
router.post('/:id/errors', requireInstructor, (req, res) => {
  const { error_code } = req.body;
  const db = getDb();

  const lesson = db.prepare('SELECT id FROM lessons WHERE id = ? AND instructor_id = ?').get(req.params.id, req.instructorId);
  if (!lesson) {
    return res.status(404).json({ error: 'Fahrstunde nicht gefunden.' });
  }

  const errorDef = DRIVING_ERRORS.find(e => e.code === error_code);
  if (!errorDef) {
    return res.status(400).json({ error: 'Ungültiger Fehler-Code.' });
  }

  // Prüfen ob Fehler schon existiert -> count erhöhen
  const existing = db.prepare('SELECT * FROM lesson_errors WHERE lesson_id = ? AND error_code = ?').get(req.params.id, error_code);

  if (existing) {
    db.prepare('UPDATE lesson_errors SET count = count + 1 WHERE id = ?').run(existing.id);
  } else {
    db.prepare(
      'INSERT INTO lesson_errors (lesson_id, error_code, error_name, error_category) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, errorDef.code, errorDef.name, errorDef.category);
  }

  const errors = db.prepare('SELECT * FROM lesson_errors WHERE lesson_id = ?').all(req.params.id);
  res.json(errors);
});

// Fehler entfernen (count -1)
router.delete('/:id/errors/:errorCode', requireInstructor, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM lesson_errors WHERE lesson_id = ? AND error_code = ?').get(req.params.id, req.params.errorCode);

  if (!existing) {
    return res.status(404).json({ error: 'Fehler nicht gefunden.' });
  }

  if (existing.count > 1) {
    db.prepare('UPDATE lesson_errors SET count = count - 1 WHERE id = ?').run(existing.id);
  } else {
    db.prepare('DELETE FROM lesson_errors WHERE id = ?').run(existing.id);
  }

  const errors = db.prepare('SELECT * FROM lesson_errors WHERE lesson_id = ?').all(req.params.id);
  res.json(errors);
});

// Portal-Sync: Fahrstunde für Portal freigeben
router.post('/:id/sync', requireInstructor, (req, res) => {
  const db = getDb();
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ? AND instructor_id = ?').get(req.params.id, req.instructorId);
  if (!lesson) {
    return res.status(404).json({ error: 'Fahrstunde nicht gefunden.' });
  }

  db.prepare('UPDATE lessons SET synced_to_portal = 1 WHERE id = ?').run(req.params.id);
  db.prepare('INSERT INTO sync_log (lesson_id) VALUES (?)').run(req.params.id);

  res.json({ message: 'Fahrstunde zum Portal synchronisiert.' });
});

// Fehler-Katalog
router.get('/meta/errors', (req, res) => {
  res.json(DRIVING_ERRORS);
});

module.exports = router;
