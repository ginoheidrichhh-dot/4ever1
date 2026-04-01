// Fahrschulo - Fahrlehrer App
const API = '';
let currentUser = null;
let students = [];
let currentLesson = null;
let lessonErrors = {};
let errorCatalog = [];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch(`${API}/api/auth/me`);
    if (res.ok) {
      currentUser = await res.json();
      showApp();
    }
  } catch (e) {
    // Not logged in
  }
  document.getElementById('todayDate').textContent = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
});

// ===== AUTH =====
function showLogin() {
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('authSubtitle').textContent = 'Fahrlehrer Login';
}

function showRegister() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
  document.getElementById('authSubtitle').textContent = 'Neues Konto erstellen';
}

async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) return toast('Bitte alle Felder ausfüllen', 'error');

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return toast(data.error, 'error');
    currentUser = data;
    showApp();
    toast('Willkommen zurück!', 'success');
  } catch (e) {
    toast('Verbindungsfehler', 'error');
  }
}

async function register() {
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const phone = document.getElementById('regPhone').value;
  if (!name || !email || !password) return toast('Bitte alle Pflichtfelder ausfüllen', 'error');
  if (password.length < 6) return toast('Passwort muss mind. 6 Zeichen haben', 'error');

  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone }),
    });
    const data = await res.json();
    if (!res.ok) return toast(data.error, 'error');
    currentUser = data;
    showApp();
    toast('Konto erstellt!', 'success');
  } catch (e) {
    toast('Verbindungsfehler', 'error');
  }
}

async function logout() {
  await fetch(`${API}/api/auth/logout`, { method: 'POST' });
  currentUser = null;
  document.getElementById('appScreen').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
}

function showApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'block';
  document.getElementById('instructorName').textContent = currentUser.name;
  loadDashboard();
  loadStudents();
  loadErrorCatalog();
}

// ===== NAVIGATION =====
function switchSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`sec-${name}`).classList.add('active');
  document.querySelectorAll('.nav-tab')[['dashboard','students','lesson','history'].indexOf(name)].classList.add('active');

  if (name === 'students') loadStudents();
  if (name === 'history') loadHistory();
  if (name === 'lesson') populateLessonStudents();
  if (name === 'dashboard') loadDashboard();
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [studentsRes, lessonsRes] = await Promise.all([
      fetch(`${API}/api/students`),
      fetch(`${API}/api/lessons?date=${today}`),
    ]);
    const studentsData = await studentsRes.json();
    const lessonsData = await lessonsRes.json();
    students = studentsData;

    document.getElementById('statStudents').textContent = studentsData.length;
    document.getElementById('statLessons').textContent = lessonsData.length;

    const container = document.getElementById('todayLessons');
    if (lessonsData.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">Keine Fahrstunden heute</div></div>';
    } else {
      container.innerHTML = lessonsData.map(l => `
        <div class="lesson-item" onclick="viewLesson('${l.id}')">
          <div class="lesson-date">${l.first_name} ${l.last_name}</div>
          <div class="lesson-details">${l.start_time} - ${l.lesson_type} - ${l.duration_minutes} min</div>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error('Dashboard error:', e);
  }
}

// ===== STUDENTS =====
async function loadStudents() {
  try {
    const res = await fetch(`${API}/api/students`);
    students = await res.json();
    renderStudents();
  } catch (e) {
    toast('Fehler beim Laden der Schüler', 'error');
  }
}

function renderStudents() {
  const container = document.getElementById('studentList');
  if (students.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👤</div><div class="empty-state-text">Noch keine Schüler</div></div>';
    return;
  }
  container.innerHTML = students.map(s => `
    <div class="student-item" onclick="openStudentDetail('${s.id}')">
      <div class="student-avatar">${s.first_name[0]}${s.last_name[0]}</div>
      <div class="student-info">
        <div class="student-name">${s.first_name} ${s.last_name}</div>
        <div class="student-meta">${s.email || 'Keine Email'} ${s.phone ? '| ' + s.phone : ''}</div>
      </div>
      <span class="student-badge ${s.portal_activated ? 'badge-active' : 'badge-pending'}">
        ${s.portal_activated ? 'Portal aktiv' : 'Einladen'}
      </span>
    </div>
  `).join('');
}

function openAddStudent() {
  openModal(`
    <h3 style="margin-bottom:20px;">Neuer Schüler</h3>
    <div class="form-group">
      <label class="form-label">Vorname *</label>
      <input type="text" class="form-input" id="newFirstName">
    </div>
    <div class="form-group">
      <label class="form-label">Nachname *</label>
      <input type="text" class="form-input" id="newLastName">
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input type="email" class="form-input" id="newEmail">
    </div>
    <div class="form-group">
      <label class="form-label">Telefon</label>
      <input type="tel" class="form-input" id="newPhone">
    </div>
    <div class="form-group">
      <label class="form-label">Notizen</label>
      <textarea class="form-textarea" id="newNotes"></textarea>
    </div>
    <button class="btn btn-primary btn-block" onclick="addStudent()">Schüler anlegen</button>
  `);
}

async function addStudent() {
  const data = {
    first_name: document.getElementById('newFirstName').value,
    last_name: document.getElementById('newLastName').value,
    email: document.getElementById('newEmail').value,
    phone: document.getElementById('newPhone').value,
    notes: document.getElementById('newNotes').value,
  };
  if (!data.first_name || !data.last_name) return toast('Vor- und Nachname erforderlich', 'error');

  try {
    const res = await fetch(`${API}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const d = await res.json(); return toast(d.error, 'error'); }
    closeModalDirect();
    toast('Schüler angelegt', 'success');
    loadStudents();
  } catch (e) {
    toast('Fehler', 'error');
  }
}

function openStudentDetail(id) {
  const s = students.find(st => st.id === id);
  if (!s) return;
  openModal(`
    <h3 style="margin-bottom:20px;">${s.first_name} ${s.last_name}</h3>
    <div style="margin-bottom:16px;">
      <div style="font-size:13px;color:var(--text-secondary);">Email: ${s.email || '-'}</div>
      <div style="font-size:13px;color:var(--text-secondary);">Telefon: ${s.phone || '-'}</div>
      <div style="font-size:13px;color:var(--text-secondary);">Portal: ${s.portal_activated ? 'Aktiv' : 'Nicht aktiviert'}</div>
    </div>
    ${s.email && !s.portal_activated ? `<button class="btn btn-primary btn-block" onclick="inviteStudent('${s.id}')" style="margin-bottom:8px;">Portal-Einladung senden</button>` : ''}
    <button class="btn btn-outline btn-block" onclick="startLessonWith('${s.id}')" style="margin-bottom:8px;">Fahrstunde starten</button>
    <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.id}')" style="margin-top:12px;">Schüler löschen</button>
  `);
}

async function inviteStudent(id) {
  try {
    const res = await fetch(`${API}/api/students/${id}/invite`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return toast(data.error, 'error');
    toast('Einladung gesendet!', 'success');
    closeModalDirect();
    loadStudents();
  } catch (e) {
    toast('Fehler beim Senden', 'error');
  }
}

async function deleteStudent(id) {
  if (!confirm('Schüler und alle Fahrstunden wirklich löschen?')) return;
  try {
    await fetch(`${API}/api/students/${id}`, { method: 'DELETE' });
    toast('Schüler gelöscht', 'success');
    closeModalDirect();
    loadStudents();
  } catch (e) {
    toast('Fehler', 'error');
  }
}

// ===== LESSONS =====
function populateLessonStudents() {
  const select = document.getElementById('lessonStudent');
  select.innerHTML = '<option value="">-- Schüler wählen --</option>' +
    students.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`).join('');
}

function startLessonWith(studentId) {
  closeModalDirect();
  switchSection('lesson');
  document.getElementById('lessonStudent').value = studentId;
}

async function startLesson() {
  const studentId = document.getElementById('lessonStudent').value;
  const lessonType = document.getElementById('lessonType').value;
  const duration = document.getElementById('lessonDuration').value;
  if (!studentId) return toast('Bitte Schüler wählen', 'error');

  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().slice(0, 5);

  try {
    const res = await fetch(`${API}/api/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        date,
        start_time: time,
        lesson_type: lessonType,
        duration_minutes: parseInt(duration),
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast(data.error, 'error');

    currentLesson = data;
    lessonErrors = {};
    const student = students.find(s => s.id === studentId);
    showActiveLesson(student);
    toast('Fahrstunde gestartet', 'success');
  } catch (e) {
    toast('Fehler', 'error');
  }
}

function showActiveLesson(student) {
  document.getElementById('lessonSetup').style.display = 'none';
  document.getElementById('activeLesson').style.display = 'block';
  document.getElementById('activeLessonStudent').textContent = `${student.first_name} ${student.last_name}`;

  const typeNames = { normal: 'Normal', ueberlandfahrt: 'Überland', autobahnfahrt: 'Autobahn', nachtfahrt: 'Nacht', pruefung: 'Prüfung' };
  document.getElementById('activeLessonInfo').textContent =
    `${currentLesson.start_time} | ${typeNames[currentLesson.lesson_type]} | ${currentLesson.duration_minutes} min`;

  renderErrorGrid();
  renderBvfChecklists();
  renderRatingStars();
}

// ===== ERROR GRID (28 Buttons) =====
async function loadErrorCatalog() {
  try {
    const res = await fetch(`${API}/api/lessons/meta/errors`);
    errorCatalog = await res.json();
  } catch (e) {
    console.error('Error catalog load failed:', e);
  }
}

function renderErrorGrid() {
  const grid = document.getElementById('errorGrid');
  grid.innerHTML = errorCatalog.map(err => `
    <button class="error-btn ${lessonErrors[err.code] ? 'has-errors' : ''}"
            data-category="${err.category}"
            onclick="toggleError('${err.code}')"
            oncontextmenu="removeError(event, '${err.code}')">
      <span class="error-icon">${err.icon}</span>
      <span class="error-label">${err.name}</span>
      ${lessonErrors[err.code] ? `<span class="error-count">${lessonErrors[err.code]}</span>` : ''}
    </button>
  `).join('');
  updateErrorCount();
}

async function toggleError(code) {
  if (!currentLesson) return;
  try {
    const res = await fetch(`${API}/api/lessons/${currentLesson.id}/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error_code: code }),
    });
    const errors = await res.json();
    lessonErrors = {};
    errors.forEach(e => lessonErrors[e.error_code] = e.count);
    renderErrorGrid();
  } catch (e) {
    toast('Fehler beim Speichern', 'error');
  }
}

async function removeError(event, code) {
  event.preventDefault();
  if (!currentLesson || !lessonErrors[code]) return;
  try {
    const res = await fetch(`${API}/api/lessons/${currentLesson.id}/errors/${code}`, { method: 'DELETE' });
    const errors = await res.json();
    lessonErrors = {};
    errors.forEach(e => lessonErrors[e.error_code] = e.count);
    renderErrorGrid();
  } catch (e) {
    toast('Fehler', 'error');
  }
}

function updateErrorCount() {
  const total = Object.values(lessonErrors).reduce((a, b) => a + b, 0);
  document.getElementById('totalErrorCount').textContent = `${total} Fehler`;
}

// ===== BVF TABS =====
function switchBvfTab(name) {
  document.querySelectorAll('.bvf-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.bvf-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`bvf-${name}`).classList.add('active');
  const tabs = ['fehler', 'grundfahraufgaben', 'verkehr', 'bewertung'];
  document.querySelectorAll('.bvf-tab')[tabs.indexOf(name)].classList.add('active');

  if (name === 'bewertung') renderErrorSummary();
}

function renderBvfChecklists() {
  const grundItems = [
    'Fahrzeug sicher starten', 'Gang richtig einlegen', 'Kupplung korrekt betätigen',
    'Anfahren am Berg', 'Lenktechnik', 'Bremsbereitschaft', 'Notbremsung durchgeführt',
    'Rückwärts einparken', 'Seitwärts einparken', 'Wenden (3-Punkt)',
  ];
  const verkehrItems = [
    'Vorfahrt beachtet', 'Ampel korrekt', 'Kreisverkehr gemeistert',
    'Rechts abbiegen', 'Links abbiegen', 'Spurwechsel sicher',
    'Überholen korrekt', 'Geschwindigkeit angepasst', 'Abstand gehalten',
    'Verkehrszeichen beachtet',
  ];

  document.getElementById('grundChecklist').innerHTML = renderChecklist(grundItems, 'grund');
  document.getElementById('verkehrChecklist').innerHTML = renderChecklist(verkehrItems, 'verkehr');
}

function renderChecklist(items, prefix) {
  return items.map((item, i) => `
    <label style="display:flex;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;gap:10px;">
      <input type="checkbox" id="${prefix}_${i}" style="width:20px;height:20px;accent-color:var(--primary);">
      <span style="font-size:14px;">${item}</span>
    </label>
  `).join('');
}

// ===== RATING =====
function renderRatingStars() {
  const container = document.getElementById('lessonRating');
  container.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    star.textContent = '★';
    star.onclick = () => setRating(i);
    container.appendChild(star);
  }
}

function setRating(rating) {
  document.querySelectorAll('#lessonRating .star').forEach((s, i) => {
    s.classList.toggle('active', i < rating);
  });
  currentLesson._rating = rating;
}

function renderErrorSummary() {
  const container = document.getElementById('lessonErrorSummary');
  const errorList = Object.entries(lessonErrors);
  if (errorList.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);font-size:13px;">Keine Fehler erfasst</p>';
    return;
  }
  container.innerHTML = `
    <div class="card-title" style="margin-bottom:12px;">Fehler-Zusammenfassung</div>
    ${errorList.map(([code, count]) => {
      const err = errorCatalog.find(e => e.code === code);
      return `<div class="error-summary-item">
        <span>${err ? err.icon : ''} ${err ? err.name : code}</span>
        <span style="font-weight:700;color:var(--danger);">${count}x</span>
      </div>`;
    }).join('')}
  `;
}

// ===== END & SYNC LESSON =====
async function endLesson() {
  if (!currentLesson) return;
  if (!confirm('Fahrstunde beenden?')) return;

  const now = new Date();
  const endTime = now.toTimeString().slice(0, 5);
  const notes = document.getElementById('lessonNotes').value;
  const rating = currentLesson._rating || null;

  // Collect BVF checklist data
  const grundData = {};
  document.querySelectorAll('[id^="grund_"]').forEach(cb => {
    grundData[cb.id] = cb.checked;
  });
  const verkehrData = {};
  document.querySelectorAll('[id^="verkehr_"]').forEach(cb => {
    verkehrData[cb.id] = cb.checked;
  });

  try {
    await fetch(`${API}/api/lessons/${currentLesson.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        end_time: endTime,
        rating,
        notes,
        tab_grundfahraufgaben: grundData,
        tab_verkehr: verkehrData,
        tab_bewertung: { rating, notes },
      }),
    });

    toast('Fahrstunde gespeichert', 'success');
    currentLesson = null;
    lessonErrors = {};
    document.getElementById('activeLesson').style.display = 'none';
    document.getElementById('lessonSetup').style.display = 'block';
  } catch (e) {
    toast('Fehler beim Speichern', 'error');
  }
}

async function syncLesson() {
  if (!currentLesson) return;
  try {
    const res = await fetch(`${API}/api/lessons/${currentLesson.id}/sync`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return toast(data.error, 'error');
    toast('Zum Portal synchronisiert!', 'success');
  } catch (e) {
    toast('Sync fehlgeschlagen', 'error');
  }
}

// ===== HISTORY =====
async function loadHistory() {
  try {
    const res = await fetch(`${API}/api/lessons`);
    const lessons = await res.json();
    const container = document.getElementById('historyList');

    if (lessons.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Noch keine Fahrstunden</div></div>';
      return;
    }

    const typeNames = { normal: 'Normal', ueberlandfahrt: 'Überland', autobahnfahrt: 'Autobahn', nachtfahrt: 'Nacht', pruefung: 'Prüfung' };
    container.innerHTML = lessons.map(l => `
      <div class="lesson-item" onclick="viewLesson('${l.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="lesson-date">${l.first_name} ${l.last_name}</div>
          <span class="sync-badge ${l.synced_to_portal ? 'synced' : 'not-synced'}">
            ${l.synced_to_portal ? '✓ Synced' : 'Nicht synced'}
          </span>
        </div>
        <div class="lesson-details">
          ${new Date(l.date).toLocaleDateString('de-DE')} | ${l.start_time}${l.end_time ? ' - ' + l.end_time : ''} | ${typeNames[l.lesson_type]} | ${l.duration_minutes} min
          ${l.rating ? ' | ★ ' + l.rating : ''}
        </div>
      </div>
    `).join('');
  } catch (e) {
    toast('Fehler beim Laden', 'error');
  }
}

async function viewLesson(id) {
  try {
    const res = await fetch(`${API}/api/lessons/${id}`);
    const lesson = await res.json();
    const typeNames = { normal: 'Normal', ueberlandfahrt: 'Überland', autobahnfahrt: 'Autobahn', nachtfahrt: 'Nacht', pruefung: 'Prüfung' };

    openModal(`
      <h3 style="margin-bottom:16px;">${lesson.first_name} ${lesson.last_name}</h3>
      <div style="font-size:14px;color:var(--text-secondary);margin-bottom:16px;">
        ${new Date(lesson.date).toLocaleDateString('de-DE')} | ${lesson.start_time}${lesson.end_time ? ' - ' + lesson.end_time : ''}<br>
        ${typeNames[lesson.lesson_type]} | ${lesson.duration_minutes} min
        ${lesson.rating ? '<br>Bewertung: ' + '★'.repeat(lesson.rating) + '☆'.repeat(5 - lesson.rating) : ''}
      </div>
      ${lesson.notes ? `<div class="card" style="margin-bottom:12px;"><div class="card-title" style="margin-bottom:8px;">Notizen</div><p style="font-size:14px;">${lesson.notes}</p></div>` : ''}
      ${lesson.errors && lesson.errors.length > 0 ? `
        <div class="card">
          <div class="card-title" style="margin-bottom:12px;">Fehler (${lesson.errors.reduce((a, e) => a + e.count, 0)})</div>
          ${lesson.errors.map(e => `
            <div class="error-summary-item">
              <span>${e.error_name}</span>
              <span style="font-weight:700;color:var(--danger);">${e.count}x</span>
            </div>
          `).join('')}
        </div>
      ` : '<p style="color:var(--text-secondary);">Keine Fehler erfasst</p>'}
      ${!lesson.synced_to_portal ? `<button class="btn btn-warning btn-block" onclick="syncLessonById('${lesson.id}')" style="margin-top:12px;">Zum Portal synchronisieren</button>` : ''}
    `);
  } catch (e) {
    toast('Fehler', 'error');
  }
}

async function syncLessonById(id) {
  try {
    await fetch(`${API}/api/lessons/${id}/sync`, { method: 'POST' });
    toast('Synchronisiert!', 'success');
    closeModalDirect();
    loadHistory();
  } catch (e) {
    toast('Sync fehlgeschlagen', 'error');
  }
}

// ===== MODAL =====
function openModal(content) {
  document.getElementById('modalContent').innerHTML = content;
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal(event) {
  if (event.target === document.getElementById('modalOverlay')) {
    closeModalDirect();
  }
}

function closeModalDirect() {
  document.getElementById('modalOverlay').classList.remove('active');
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
