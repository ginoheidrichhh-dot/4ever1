// 28 Fehler-Buttons für Fahrstunden-Bewertung
// Kategorien: Grundfahraufgaben, Verkehr, Technik, Verhalten

const DRIVING_ERRORS = [
  // Grundfahraufgaben (Basic Driving Tasks) - 7
  { code: 'E01', name: 'Lenkradhaltung', category: 'grundfahraufgaben', icon: '🔄' },
  { code: 'E02', name: 'Sitzposition', category: 'grundfahraufgaben', icon: '💺' },
  { code: 'E03', name: 'Anfahren', category: 'grundfahraufgaben', icon: '🚗' },
  { code: 'E04', name: 'Gangwahl', category: 'grundfahraufgaben', icon: '⚙️' },
  { code: 'E05', name: 'Kupplung', category: 'grundfahraufgaben', icon: '🦶' },
  { code: 'E06', name: 'Bremsen', category: 'grundfahraufgaben', icon: '🛑' },
  { code: 'E07', name: 'Berganfahrt', category: 'grundfahraufgaben', icon: '⛰️' },

  // Verkehr (Traffic) - 7
  { code: 'E08', name: 'Vorfahrt', category: 'verkehr', icon: '🔺' },
  { code: 'E09', name: 'Ampel', category: 'verkehr', icon: '🚦' },
  { code: 'E10', name: 'Kreisverkehr', category: 'verkehr', icon: '🔵' },
  { code: 'E11', name: 'Abbiegen', category: 'verkehr', icon: '↪️' },
  { code: 'E12', name: 'Spurwechsel', category: 'verkehr', icon: '↔️' },
  { code: 'E13', name: 'Überholen', category: 'verkehr', icon: '⏩' },
  { code: 'E14', name: 'Verkehrszeichen', category: 'verkehr', icon: '🪧' },

  // Technik (Technical) - 7
  { code: 'E15', name: 'Spiegelblick', category: 'technik', icon: '👀' },
  { code: 'E16', name: 'Schulterblick', category: 'technik', icon: '👤' },
  { code: 'E17', name: 'Blinker', category: 'technik', icon: '💡' },
  { code: 'E18', name: 'Geschwindigkeit', category: 'technik', icon: '⚡' },
  { code: 'E19', name: 'Abstand', category: 'technik', icon: '📏' },
  { code: 'E20', name: 'Einparken', category: 'technik', icon: '🅿️' },
  { code: 'E21', name: 'Rückwärtsfahren', category: 'technik', icon: '⬅️' },

  // Verhalten (Behavior) - 7
  { code: 'E22', name: 'Autobahn', category: 'verhalten', icon: '🛣️' },
  { code: 'E23', name: 'Landstraße', category: 'verhalten', icon: '🌄' },
  { code: 'E24', name: 'Nachtfahrt', category: 'verhalten', icon: '🌙' },
  { code: 'E25', name: 'Notbremsung', category: 'verhalten', icon: '🆘' },
  { code: 'E26', name: 'Ausweichen', category: 'verhalten', icon: '↩️' },
  { code: 'E27', name: 'Wenden', category: 'verhalten', icon: '🔃' },
  { code: 'E28', name: 'Gefahrenbremsung', category: 'verhalten', icon: '⚠️' },
];

const ERROR_CATEGORIES = {
  grundfahraufgaben: { name: 'Grundfahraufgaben', color: '#4A90D9' },
  verkehr: { name: 'Verkehr', color: '#E74C3C' },
  technik: { name: 'Technik', color: '#F39C12' },
  verhalten: { name: 'Verhalten', color: '#27AE60' },
};

module.exports = { DRIVING_ERRORS, ERROR_CATEGORIES };
