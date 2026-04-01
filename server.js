require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const { initDb, closeDb } = require('./db/database');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Database =====
initDb();

// ===== Middleware =====
app.use(cors({
  origin: [
    process.env.APP_URL || 'https://fahrschulo.com',
    process.env.PORTAL_URL || 'https://meine.fahrschulo.com',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'fahrschulo-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 Stunden
    sameSite: 'lax',
  },
}));
app.use(generalLimiter);

// ===== Security Headers =====
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ===== Static Files =====
// Fahrlehrer-App (fahrschulo.com)
app.use(express.static(path.join(__dirname, 'public')));
// Schüler-Portal (meine.fahrschulo.com)
app.use('/portal', express.static(path.join(__dirname, 'portal')));

// ===== API Routes =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/portal', require('./routes/portal'));

// ===== Portal SPA Fallback =====
app.get('/portal/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'portal', 'index.html'));
});

// ===== Instructor SPA Fallback =====
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route nicht gefunden.' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== Start Server =====
const server = app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║         🚗 Fahrschulo Server         ║
  ║                                      ║
  ║  Fahrlehrer-App:  http://localhost:${PORT}  ║
  ║  Schüler-Portal:  http://localhost:${PORT}/portal  ║
  ║                                      ║
  ║  Status: Läuft                       ║
  ╚══════════════════════════════════════╝
  `);
});

// ===== Graceful Shutdown =====
process.on('SIGINT', () => {
  console.log('\nServer wird gestoppt...');
  closeDb();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  closeDb();
  server.close(() => process.exit(0));
});
