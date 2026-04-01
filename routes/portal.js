const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { requireStudent } = require('../middleware/auth');
const { pinLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

const MAX_PIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

// Portal aktivieren (über Einladungslink)
router.post('/activate', async (req, res) => {
  try {
    const { token, pin } = req.body;
    if (!token || !pin) {
      return res.status(400).json({ error: 'Token und PIN erforderlich.' });
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN muss 4-6 Ziffern haben.' });
    }

    const db = getDb();
    const student = db.prepare('SELECT * FROM students WHERE invitation_token = ?').get(token);
    if (!student) {
      return res.status(404).json({ error: 'Ungültiger oder abgelaufener Einladungslink.' });
    }

    const pin_hash = await bcrypt.hash(pin, 12);
    db.prepare(
      'UPDATE students SET pin_hash = ?, portal_activated = 1, invitation_token = NULL WHERE id = ?'
    ).run(pin_hash, student.id);

    req.session.studentId = student.id;
    res.json({
      message: 'Portal aktiviert!',
      student: { id: student.id, first_name: student.first_name, last_name: student.last_name },
    });
  } catch (err) {
    console.error('Activate error:', err);
    res.status(500).json({ error: 'Aktivierung fehlgeschlagen.' });
  }
});

// PIN Login
router.post('/login', pinLimiter, async (req, res) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin) {
      return res.status(400).json({ error: 'Email und PIN erforderlich.' });
    }

    const db = getDb();
    const student = db.prepare('SELECT * FROM students WHERE email = ? AND portal_activated = 1').get(email);
    if (!student) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
    }

    // Brute-Force Check: Account gesperrt?
    if (student.pin_locked_until) {
      const lockUntil = new Date(student.pin_locked_until);
      if (lockUntil > new Date()) {
        const minutesLeft = Math.ceil((lockUntil - new Date()) / 60000);
        return res.status(429).json({
          error: `Zugang gesperrt. Versuche es in ${minutesLeft} Minuten erneut.`,
        });
      }
      // Lock abgelaufen -> Reset
      db.prepare('UPDATE students SET pin_attempts = 0, pin_locked_until = NULL WHERE id = ?').run(student.id);
    }

    const valid = await bcrypt.compare(pin, student.pin_hash);
    if (!valid) {
      const attempts = student.pin_attempts + 1;
      if (attempts >= MAX_PIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60000).toISOString();
        db.prepare('UPDATE students SET pin_attempts = ?, pin_locked_until = ? WHERE id = ?').run(attempts, lockUntil, student.id);
        return res.status(429).json({
          error: `Zu viele Fehlversuche. Zugang für ${LOCK_DURATION_MINUTES} Minuten gesperrt.`,
        });
      }
      db.prepare('UPDATE students SET pin_attempts = ? WHERE id = ?').run(attempts, student.id);
      return res.status(401).json({
        error: `Falsche PIN. Noch ${MAX_PIN_ATTEMPTS - attempts} Versuche.`,
      });
    }

    // Erfolg -> Attempts zurücksetzen
    db.prepare('UPDATE students SET pin_attempts = 0, pin_locked_until = NULL WHERE id = ?').run(student.id);
    req.session.studentId = student.id;

    res.json({
      student: { id: student.id, first_name: student.first_name, last_name: student.last_name },
    });
  } catch (err) {
    console.error('Portal login error:', err);
    res.status(500).json({ error: 'Login fehlgeschlagen.' });
  }
});

// Meine Fahrstunden (nur synchronisierte)
router.get('/lessons', requireStudent, (req, res) => {
  const db = getDb();
  const lessons = db.prepare(`
    SELECT l.*, i.name as instructor_name
    FROM lessons l
    JOIN instructors i ON l.instructor_id = i.id
    WHERE l.student_id = ? AND l.synced_to_portal = 1
    ORDER BY l.date DESC, l.start_time DESC
  `).all(req.studentId);

  // Fehler pro Fahrstunde laden
  const lessonIds = lessons.map(l => l.id);
  if (lessonIds.length > 0) {
    const placeholders = lessonIds.map(() => '?').join(',');
    const allErrors = db.prepare(
      `SELECT * FROM lesson_errors WHERE lesson_id IN (${placeholders})`
    ).all(...lessonIds);

    const errorMap = {};
    for (const err of allErrors) {
      if (!errorMap[err.lesson_id]) errorMap[err.lesson_id] = [];
      errorMap[err.lesson_id].push(err);
    }
    for (const lesson of lessons) {
      lesson.errors = errorMap[lesson.id] || [];
    }
  }

  res.json(lessons);
});

// Mein Profil
router.get('/me', requireStudent, (req, res) => {
  const db = getDb();
  const student = db.prepare(
    'SELECT id, first_name, last_name, email FROM students WHERE id = ?'
  ).get(req.studentId);
  if (!student) {
    return res.status(404).json({ error: 'Nicht gefunden.' });
  }

  // Statistiken
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_lessons,
      SUM(duration_minutes) as total_minutes,
      AVG(rating) as avg_rating
    FROM lessons WHERE student_id = ? AND synced_to_portal = 1
  `).get(req.studentId);

  const errorStats = db.prepare(`
    SELECT error_name, SUM(count) as total
    FROM lesson_errors
    WHERE lesson_id IN (SELECT id FROM lessons WHERE student_id = ? AND synced_to_portal = 1)
    GROUP BY error_code
    ORDER BY total DESC
    LIMIT 5
  `).all(req.studentId);

  res.json({ ...student, stats, topErrors: errorStats });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout fehlgeschlagen.' });
    res.json({ message: 'Abgemeldet.' });
  });
});

module.exports = router;
