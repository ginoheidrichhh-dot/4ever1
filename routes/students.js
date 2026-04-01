const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { requireInstructor } = require('../middleware/auth');
const { sendInvitation } = require('../email/mailer');
const router = express.Router();

// Alle Schüler des Fahrlehrers
router.get('/', requireInstructor, (req, res) => {
  const db = getDb();
  const students = db.prepare(
    'SELECT id, first_name, last_name, email, phone, portal_activated, created_at FROM students WHERE instructor_id = ? ORDER BY last_name'
  ).all(req.instructorId);
  res.json(students);
});

// Schüler anlegen
router.post('/', requireInstructor, (req, res) => {
  const { first_name, last_name, email, phone, notes } = req.body;
  if (!first_name || !last_name) {
    return res.status(400).json({ error: 'Vor- und Nachname sind erforderlich.' });
  }

  const db = getDb();
  const id = uuidv4();

  db.prepare(
    'INSERT INTO students (id, first_name, last_name, email, phone, instructor_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, first_name, last_name, email || null, phone || null, req.instructorId, notes || null);

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  res.status(201).json(student);
});

// Schüler bearbeiten
router.put('/:id', requireInstructor, (req, res) => {
  const { first_name, last_name, email, phone, notes } = req.body;
  const db = getDb();

  const student = db.prepare('SELECT * FROM students WHERE id = ? AND instructor_id = ?').get(req.params.id, req.instructorId);
  if (!student) {
    return res.status(404).json({ error: 'Schüler nicht gefunden.' });
  }

  db.prepare(
    'UPDATE students SET first_name = ?, last_name = ?, email = ?, phone = ?, notes = ? WHERE id = ?'
  ).run(
    first_name || student.first_name,
    last_name || student.last_name,
    email !== undefined ? email : student.email,
    phone !== undefined ? phone : student.phone,
    notes !== undefined ? notes : student.notes,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Schüler löschen
router.delete('/:id', requireInstructor, (req, res) => {
  const db = getDb();
  const student = db.prepare('SELECT * FROM students WHERE id = ? AND instructor_id = ?').get(req.params.id, req.instructorId);
  if (!student) {
    return res.status(404).json({ error: 'Schüler nicht gefunden.' });
  }

  db.prepare('DELETE FROM lesson_errors WHERE lesson_id IN (SELECT id FROM lessons WHERE student_id = ?)').run(req.params.id);
  db.prepare('DELETE FROM lessons WHERE student_id = ?').run(req.params.id);
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);

  res.json({ message: 'Schüler gelöscht.' });
});

// Portal-Einladung senden
router.post('/:id/invite', requireInstructor, async (req, res) => {
  try {
    const db = getDb();
    const student = db.prepare('SELECT * FROM students WHERE id = ? AND instructor_id = ?').get(req.params.id, req.instructorId);
    if (!student) {
      return res.status(404).json({ error: 'Schüler nicht gefunden.' });
    }
    if (!student.email) {
      return res.status(400).json({ error: 'Schüler hat keine Email-Adresse.' });
    }

    const token = uuidv4();
    db.prepare('UPDATE students SET invitation_token = ?, invitation_sent_at = CURRENT_TIMESTAMP WHERE id = ?').run(token, student.id);

    const instructor = db.prepare('SELECT name FROM instructors WHERE id = ?').get(req.instructorId);

    await sendInvitation({
      to: student.email,
      studentName: `${student.first_name} ${student.last_name}`,
      instructorName: instructor.name,
      token,
    });

    res.json({ message: 'Einladung gesendet.' });
  } catch (err) {
    console.error('Invitation error:', err);
    res.status(500).json({ error: 'Einladung konnte nicht gesendet werden.' });
  }
});

module.exports = router;
