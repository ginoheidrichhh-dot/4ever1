const rateLimit = require('express-rate-limit');

// Allgemeiner Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100,
  message: { error: 'Zu viele Anfragen. Bitte warte 15 Minuten.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login Brute-Force Schutz - Fahrlehrer
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 5, // Max 5 Login-Versuche
  message: { error: 'Zu viele Login-Versuche. Bitte warte 15 Minuten.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// PIN Brute-Force Schutz - Schüler Portal
// Zusätzlich zum Rate Limiter: DB-basierte Sperre nach 5 Versuchen
const pinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Max 10 PIN-Versuche pro IP
  message: { error: 'Zu viele PIN-Versuche. Zugang gesperrt für 15 Minuten.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { generalLimiter, loginLimiter, pinLimiter };
