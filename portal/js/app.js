// Fahrschulo - Schüler Portal
const API = '';
let currentStudent = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  // Check for activation token in URL
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('activateForm').style.display = 'block';
    document.getElementById('authSubtitle').textContent = 'Portal aktivieren';
    window._activationToken = token;
    return;
  }

  // Check existing session
  try {
    const res = await fetch(`${API}/api/portal/me`);
    if (res.ok) {
      const data = await res.json();
      currentStudent = data;
      showPortal();
    }
  } catch (e) {
    // Not logged in
  }
});

// ===== ACTIVATION =====
async function activate() {
  const pin = document.getElementById('activatePin').value;
  const pinConfirm = document.getElementById('activatePinConfirm').value;

  if (!pin || pin.length < 4) return toast('PIN muss mind. 4 Ziffern haben', 'error');
  if (pin !== pinConfirm) return toast('PINs stimmen nicht überein', 'error');

  try {
    const res = await fetch(`${API}/api/portal/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: window._activationToken, pin }),
    });
    const data = await res.json();
    if (!res.ok) return toast(data.error, 'error');

    currentStudent = data.student;
    toast('Portal aktiviert!', 'success');
    // Remove token from URL
    window.history.replaceState({}, '', window.location.pathname);
    showPortal();
  } catch (e) {
    toast('Fehler bei der Aktivierung', 'error');
  }
}

// ===== LOGIN =====
async function login() {
  const email = document.getElementById('loginEmail').value;
  const pin = document.getElementById('loginPin').value;
  if (!email || !pin) return toast('Bitte alle Felder ausfüllen', 'error');

  try {
    const res = await fetch(`${API}/api/portal/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin }),
    });
    const data = await res.json();
    if (!res.ok) return toast(data.error, 'error');

    currentStudent = data.student;
    toast('Willkommen!', 'success');
    showPortal();
  } catch (e) {
    toast('Verbindungsfehler', 'error');
  }
}

async function logout() {
  await fetch(`${API}/api/portal/logout`, { method: 'POST' });
  currentStudent = null;
  document.getElementById('portalScreen').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
}

// ===== PORTAL =====
async function showPortal() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('portalScreen').style.display = 'block';
  document.getElementById('welcomeText').textContent = `Hallo, ${currentStudent.first_name}!`;
  loadProfile();
  loadLessons();
}

async function loadProfile() {
  try {
    const res = await fetch(`${API}/api/portal/me`);
    const data = await res.json();
    currentStudent = data;

    document.getElementById('statLessons').textContent = data.stats.total_lessons || 0;
    document.getElementById('statHours').textContent = data.stats.total_minutes ? Math.round(data.stats.total_minutes / 60) : 0;
    document.getElementById('statRating').textContent = data.stats.avg_rating ? data.stats.avg_rating.toFixed(1) : '-';

    // Top Errors
    if (data.topErrors && data.topErrors.length > 0) {
      document.getElementById('topErrorsCard').style.display = 'block';
      const maxCount = Math.max(...data.topErrors.map(e => e.total));
      document.getElementById('topErrors').innerHTML = data.topErrors.map(e => `
        <div class="error-bar">
          <span class="error-bar-name">${e.error_name}</span>
          <div class="error-bar-visual">
            <div class="error-bar-fill" style="width: ${(e.total / maxCount) * 100}%"></div>
          </div>
          <span class="error-bar-count">${e.total}x</span>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error('Profile error:', e);
  }
}

async function loadLessons() {
  try {
    const res = await fetch(`${API}/api/portal/lessons`);
    const lessons = await res.json();
    const container = document.getElementById('lessonList');

    if (lessons.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div>Noch keine Fahrstunden synchronisiert</div></div>';
      return;
    }

    const typeNames = { normal: 'Normal', ueberlandfahrt: 'Überland', autobahnfahrt: 'Autobahn', nachtfahrt: 'Nacht', pruefung: 'Prüfung' };
    container.innerHTML = lessons.map(l => `
      <div class="lesson-card">
        <div class="lesson-card-header">
          <span class="lesson-date">${new Date(l.date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <span class="lesson-type">${typeNames[l.lesson_type] || l.lesson_type}</span>
        </div>
        <div class="lesson-info">
          ${l.start_time}${l.end_time ? ' - ' + l.end_time : ''} | ${l.duration_minutes} min<br>
          Fahrlehrer: ${l.instructor_name}
        </div>
        ${l.rating ? `<div class="lesson-rating">${'★'.repeat(l.rating)}${'☆'.repeat(5 - l.rating)}</div>` : ''}
        ${l.errors && l.errors.length > 0 ? `
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid #f0f0f0;">
            <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">Fehler:</div>
            ${l.errors.map(e => `
              <span style="display:inline-block;padding:2px 8px;margin:2px;border-radius:6px;font-size:11px;background:#fef2f2;color:var(--danger);font-weight:600;">
                ${e.error_name} (${e.count}x)
              </span>
            `).join('')}
          </div>
        ` : ''}
        ${l.notes ? `<div style="margin-top:8px;font-size:13px;color:var(--text-secondary);font-style:italic;">${l.notes}</div>` : ''}
      </div>
    `).join('');
  } catch (e) {
    toast('Fehler beim Laden', 'error');
  }
}

// ===== TOAST =====
function toast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
