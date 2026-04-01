const { getDb } = require('../db/database');

// Fahrlehrer muss eingeloggt sein
function requireInstructor(req, res, next) {
  if (!req.session || !req.session.instructorId) {
    return res.status(401).json({ error: 'Nicht autorisiert. Bitte einloggen.' });
  }
  req.instructorId = req.session.instructorId;
  next();
}

// Schüler-Portal: PIN-basierte Auth
function requireStudent(req, res, next) {
  if (!req.session || !req.session.studentId) {
    return res.status(401).json({ error: 'Nicht autorisiert. Bitte PIN eingeben.' });
  }
  req.studentId = req.session.studentId;
  next();
}

module.exports = { requireInstructor, requireStudent };
