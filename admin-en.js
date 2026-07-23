const adminCommunityId = window.EventsBoard.COMMUNITY_ID;
const viewLink = document.querySelector('.admin-link');
if (viewLink) viewLink.href = `hlc.html?community=${encodeURIComponent(adminCommunityId)}&theme=hlc&lang=en`;

const loginPanel = document.getElementById('loginPanel');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const eventForm = document.getElementById('eventForm');
const adminEventsList = document.getElementById('adminEventsList');
const adminStatus = document.getElementById('adminStatus');
const resetFormBtn = document.getElementById('resetFormBtn');
const deleteBtn = document.getElementById('deleteBtn');
const formTitle = document.getElementById('formTitle');
const emailLabel = document.getElementById('emailLabel');

if (window.EventsBoard.hasSupabaseConfig()) {
  emailLabel.classList.remove('hidden');
  document.getElementById('emailInput').required = true;
}

async function isLoggedIn() {
  if (window.EventsBoard.hasSupabaseConfig()) {
    const client = window.EventsBoard.getSupabaseClient();
    const { data } = await client.auth.getSession();
    return Boolean(data.session);
  }
  return sessionStorage.getItem(window.EventsBoard.AUTH_KEY) === 'true';
}

function setLocalLoggedIn(value) {
  if (value) sessionStorage.setItem(window.EventsBoard.AUTH_KEY, 'true');
  else sessionStorage.removeItem(window.EventsBoard.AUTH_KEY);
}

async function showAdmin() {
  loginPanel.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  await renderAdminList();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  const password = document.getElementById('passwordInput').value;

  if (window.EventsBoard.hasSupabaseConfig()) {
    const email = document.getElementById('emailInput').value;
    const client = window.EventsBoard.getSupabaseClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      loginError.textContent = 'Login failed. Check your email and password.';
      loginError.classList.remove('hidden');
      return;
    }
    await showAdmin();
    return;
  }

  if (password === (CONFIG.adminPassword || 'sparkco-admin')) {
    setLocalLoggedIn(true);
    await showAdmin();
  } else {
    loginError.textContent = 'Incorrect password.';
    loginError.classList.remove('hidden');
  }
});

function getFormData() {
  return {
    id: document.getElementById('eventId').value || undefined,
    title: document.getElementById('title').value.trim(),
    description: document.getElementById('description').value.trim(),
    date: document.getElementById('date').value,
    startTime: document.getElementById('startTime').value,
    endTime: document.getElementById('endTime').value,
    host: document.getElementById('host').value.trim(),
    category: document.getElementById('category').value,
    status: document.getElementById('status').value,
    roomUrl: document.getElementById('roomUrl').value.trim(),
    registrationUrl: document.getElementById('registrationUrl').value.trim(),
    isFeatured: document.getElementById('isFeatured').checked,
    isPublished: document.getElementById('isPublished').checked
  };
}

function fillForm(event) {
  formTitle.textContent = 'Edit Session';
  document.getElementById('eventId').value = event.id || '';
  document.getElementById('title').value = event.title || '';
  document.getElementById('description').value = event.description || '';
  document.getElementById('date').value = event.date || '';
  document.getElementById('startTime').value = event.startTime || '';
  document.getElementById('endTime').value = event.endTime || '';
  document.getElementById('host').value = event.host || '';
  document.getElementById('category').value = event.category || 'Weekly Call';
  document.getElementById('status').value = event.status || 'Open';
  document.getElementById('roomUrl').value = event.roomUrl || '';
  document.getElementById('registrationUrl').value = event.registrationUrl || '';
  document.getElementById('isFeatured').checked = Boolean(event.isFeatured);
  document.getElementById('isPublished').checked = event.isPublished !== false;
  deleteBtn.classList.remove('hidden');
  window.scrollTo({ top: eventForm.offsetTop - 20, behavior: 'smooth' });
}

function resetForm() {
  formTitle.textContent = 'New Session';
  eventForm.reset();
  document.getElementById('eventId').value = '';
  document.getElementById('category').value = 'Weekly Call';
  document.getElementById('status').value = 'Open';
  document.getElementById('isPublished').checked = true;
  deleteBtn.classList.add('hidden');
}

async function renderAdminList() {
  const events = window.EventsBoard.sortEvents(await window.EventsBoard.loadEvents({ includeUnpublished: true }));
  adminStatus.textContent = events.length ? `${events.length} sessions in this board` : 'No sessions yet';
  adminEventsList.innerHTML = events.map(event => {
    const d = window.EventsBoard.formatDateParts(event.date);
    return `
      <article class="admin-event-item" data-id="${event.id}">
        <header>
          <strong>${escapeHtml(event.title)}</strong>
          <span class="badge">${event.isPublished ? 'Published' : 'Hidden'}</span>
        </header>
        <p>${escapeHtml(d.full)} · ${escapeHtml(window.EventsBoard.timeRange(event))} · ${escapeHtml(event.category || '')}</p>
        <div class="admin-item-actions">
          <button class="small-btn edit-event" data-id="${event.id}">Edit</button>
          <button class="small-btn duplicate-event" data-id="${event.id}">Duplicate</button>
        </div>
      </article>
    `;
  }).join('');

  document.querySelectorAll('.edit-event').forEach(btn => {
    btn.addEventListener('click', async () => {
      const all = await window.EventsBoard.loadEvents({ includeUnpublished: true });
      const event = all.find(e => e.id === btn.dataset.id);
      if (event) fillForm(event);
    });
  });

  document.querySelectorAll('.duplicate-event').forEach(btn => {
    btn.addEventListener('click', async () => {
      const all = await window.EventsBoard.loadEvents({ includeUnpublished: true });
      const event = all.find(e => e.id === btn.dataset.id);
      if (!event) return;
      const copy = { ...event, id: undefined, title: `${event.title} - Copy`, isFeatured: false };
      await window.EventsBoard.saveEvent(copy);
      await renderAdminList();
    });
  });
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'\"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = getFormData();
  if (!data.title || !data.date || !data.startTime) return;
  try {
    await window.EventsBoard.saveEvent(data);
    resetForm();
    await renderAdminList();
    adminStatus.textContent = 'Session saved successfully';
  } catch (err) {
    adminStatus.textContent = `Save failed: ${err.message || err}`;
  }
});

resetFormBtn.addEventListener('click', resetForm);

deleteBtn.addEventListener('click', async () => {
  const id = document.getElementById('eventId').value;
  if (!id) return;
  if (!confirm('Delete this session?')) return;
  try {
    await window.EventsBoard.deleteEvent(id);
    resetForm();
    await renderAdminList();
    adminStatus.textContent = 'Session deleted';
  } catch (err) {
    adminStatus.textContent = `Delete failed: ${err.message || err}`;
  }
});

(async function initAdmin() {
  if (await isLoggedIn()) await showAdmin();
})();
