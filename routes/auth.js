const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { loginLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Fahrlehrer Registrierung
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, Email und Passwort sind erforderlich.' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM instructors WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email bereits registriert.' });
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 12);

    db.prepare(
      'INSERT INTO instructors (id, name, email, password_hash, phone) VALUES (?, ?, ?, ?, ?)'
    ).run(id, name, email, password_hash, phone || null);

    req.session.instructorId = id;
    res.status(201).json({ id, name, email });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen.' });
  }
});

// Fahrlehrer Login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Passwort erforderlich.' });
    }

    const db = getDb();
    const instructor = db.prepare('SELECT * FROM instructors WHERE email = ?').get(email);
    if (!instructor) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
    }

    const valid = await bcrypt.compare(password, instructor.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
    }

    req.session.instructorId = instructor.id;
    res.json({ id: instructor.id, name: instructor.name, email: instructor.email });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login fehlgeschlagen.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout fehlgeschlagen.' });
    res.json({ message: 'Erfolgreich abgemeldet.' });
  });
});

// Session prüfen
router.get('/me', (req, res) => {
  if (!req.session || !req.session.instructorId) {
    return res.status(401).json({ error: 'Nicht eingeloggt.' });
  }
  const db = getDb();
  const instructor = db.prepare('SELECT id, name, email, phone FROM instructors WHERE id = ?').get(req.session.instructorId);
  if (!instructor) {
    return res.status(401).json({ error: 'Nicht eingeloggt.' });
  }
  res.json(instructor);
});

module.exports = router;
