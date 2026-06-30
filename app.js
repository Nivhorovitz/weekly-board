const CONFIG = window.EVENTS_BOARD_CONFIG || {};
const urlParams = new URLSearchParams(window.location.search);
const COMMUNITY_ID = urlParams.get('community') || CONFIG.defaultCommunityId || 'default';
const STORAGE_KEY = `community-events-board-events-v1-${COMMUNITY_ID}`;
const AUTH_KEY = `community-events-board-admin-auth-v1-${COMMUNITY_ID}`;


const sampleEvents = [
  {
    communityId: COMMUNITY_ID,
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 1),
    title: 'מעגל פתיחה שבועי',
    description: 'מפגש קהילתי קצר לפתיחת השבוע, חיבור, כוונה ועדכונים חשובים.',
    date: nextDate(1),
    startTime: '20:30',
    endTime: '21:30',
    host: 'צוות הקהילה',
    category: 'מפגש קהילה',
    status: 'פתוח',
    roomUrl: CONFIG.defaultRoomUrl || '',
    registrationUrl: '',
    isFeatured: true,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    communityId: COMMUNITY_ID,
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 2),
    title: 'סדנת עומק למובילים',
    description: 'עבודה מעשית על יצירת שגרה קהילתית, אירועי שיא ומנוע אונבורדינג.',
    date: nextDate(4),
    startTime: '18:00',
    endTime: '19:30',
    host: 'ניב',
    category: 'סדנה',
    status: 'בקרוב',
    roomUrl: CONFIG.defaultRoomUrl || '',
    registrationUrl: '',
    isFeatured: false,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function nextDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function hasSupabaseConfig() {
  return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && window.supabase);
}

function getSupabaseClient() {
  if (!hasSupabaseConfig()) return null;
  return window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
}

function ensureSeedData() {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleEvents));
}

async function loadEvents({ includeUnpublished = false } = {}) {
  const client = getSupabaseClient();
  if (client) {
    let query = client.from('events').select('*').eq('community_id', COMMUNITY_ID).order('date', { ascending: true }).order('start_time', { ascending: true });
    if (!includeUnpublished) query = query.eq('is_published', true);
    const { data, error } = await query;
    if (error) {
      console.warn('Supabase load failed, falling back to localStorage', error);
    } else {
      return (data || []).map(fromDbEvent);
    }
  }

  ensureSeedData();
  const events = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  return includeUnpublished ? events : events.filter(e => e.isPublished);
}

async function saveEvent(event) {
  const now = new Date().toISOString();
  const normalized = {
    ...event,
    communityId: event.communityId || COMMUNITY_ID,
    updatedAt: now,
    createdAt: event.createdAt || now,
    id: event.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()))
  };

  const client = getSupabaseClient();
  if (client) {
    const { error } = await client.from('events').upsert(toDbEvent(normalized));
    if (error) throw error;
    return normalized;
  }

  ensureSeedData();
  const events = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const index = events.findIndex(e => e.id === normalized.id);
  if (index >= 0) events[index] = normalized;
  else events.push(normalized);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  window.dispatchEvent(new Event('events-updated'));
  return normalized;
}

async function deleteEvent(id) {
  const client = getSupabaseClient();
  if (client) {
    const { error } = await client.from('events').delete().eq('id', id).eq('community_id', COMMUNITY_ID);
    if (error) throw error;
    return;
  }
  ensureSeedData();
  const events = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  window.dispatchEvent(new Event('events-updated'));
}

function toDbEvent(e) {
  return {
    id: e.id,
    community_id: e.communityId || COMMUNITY_ID,
    title: e.title,
    description: e.description,
    date: e.date,
    start_time: e.startTime,
    end_time: e.endTime || null,
    host: e.host,
    category: e.category,
    status: e.status,
    room_url: e.roomUrl,
    registration_url: e.registrationUrl,
    is_featured: Boolean(e.isFeatured),
    is_published: Boolean(e.isPublished),
    created_at: e.createdAt,
    updated_at: e.updatedAt
  };
}

function fromDbEvent(e) {
  return {
    id: e.id,
    communityId: e.community_id || COMMUNITY_ID,
    title: e.title,
    description: e.description,
    date: e.date,
    startTime: e.start_time,
    endTime: e.end_time,
    host: e.host,
    category: e.category,
    status: e.status,
    roomUrl: e.room_url,
    registrationUrl: e.registration_url,
    isFeatured: e.is_featured,
    isPublished: e.is_published,
    createdAt: e.created_at,
    updatedAt: e.updated_at
  };
}

function formatDateParts(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return {
    day: new Intl.DateTimeFormat('he-IL', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('he-IL', { month: 'short' }).format(date),
    weekday: new Intl.DateTimeFormat('he-IL', { weekday: 'long' }).format(date),
    full: new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  };
}

function timeRange(event) {
  if (!event.startTime) return '';
  return event.endTime ? `${event.startTime}–${event.endTime}` : event.startTime;
}

function isPastEvent(event) {
  const end = event.endTime || event.startTime || '23:59';
  return new Date(`${event.date}T${end}`) < new Date();
}

function sortEvents(events) {
  return [...events].sort((a, b) => `${a.date} ${a.startTime || ''}`.localeCompare(`${b.date} ${b.startTime || ''}`));
}

function eventCard(event, { compact = false, featured = false } = {}) {
  const d = formatDateParts(event.date);
  const isPast = isPastEvent(event);
  const joinUrl = event.roomUrl || event.registrationUrl;
  return `
    <article class="event-card ${isPast ? 'past' : ''} ${featured ? 'featured-card' : ''}">
      <div class="card-top">
        <div>
          <div class="badges">
            <span class="badge">${escapeHtml(event.category || 'אירוע')}</span>
            <span class="badge">${escapeHtml(event.status || 'פתוח')}</span>
          </div>
          <h3 class="event-title">${escapeHtml(event.title)}</h3>
        </div>
        <div class="event-date" aria-label="${escapeHtml(d.full)}">
          <span class="event-day">${d.day}</span>
          <span class="event-month">${d.month}</span>
        </div>
      </div>
      ${event.description ? `<p class="event-description">${escapeHtml(event.description)}</p>` : ''}
      <div class="event-meta">
        <span>📅 ${escapeHtml(d.weekday)}, ${escapeHtml(d.full)}</span>
        ${timeRange(event) ? `<span>🕒 ${escapeHtml(timeRange(event))}</span>` : ''}
        ${event.host ? `<span>👤 ${escapeHtml(event.host)}</span>` : ''}
      </div>
      <div class="event-actions">
        ${joinUrl ? `<a class="event-action" href="${escapeAttr(joinUrl)}" target="_blank" rel="noopener">כניסה לאירוע</a>` : `<span class="event-action disabled">קישור יתווסף בקרוב</span>`}
        ${event.registrationUrl && event.roomUrl ? `<a class="event-action secondary" href="${escapeAttr(event.registrationUrl)}" target="_blank" rel="noopener">הרשמה</a>` : ''}
      </div>
    </article>
  `;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function escapeAttr(value = '') { return escapeHtml(value); }

async function renderPublicBoard() {
  const list = document.getElementById('eventsList');
  if (!list) return;

  const communitySettings = (CONFIG.communities && CONFIG.communities[COMMUNITY_ID]) || {};
  document.getElementById('communityName').textContent = communitySettings.communityName || CONFIG.communityName || 'לוח אירועים קהילתי';
  document.getElementById('communitySubtitle').textContent = communitySettings.communitySubtitle || CONFIG.communitySubtitle || 'מה קורה בקהילה ומתי כדאי להיכנס';
  const adminLink = document.querySelector('.admin-link');
  if (adminLink) adminLink.href = `admin.html?community=${encodeURIComponent(COMMUNITY_ID)}`;

  const allEvents = sortEvents(await loadEvents());
  const upcoming = allEvents.filter(e => !isPastEvent(e) && e.status !== 'עבר');
  const events = upcoming.length ? upcoming : allEvents;
  const activeFilter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
  const filtered = activeFilter === 'all' ? events : events.filter(e => e.category === activeFilter);

  const featured = events.find(e => e.isFeatured && !isPastEvent(e));
  const featuredEl = document.getElementById('featuredEvent');
  if (featured && activeFilter === 'all') {
    featuredEl.classList.remove('hidden');
    featuredEl.innerHTML = `<p class="eyebrow">אירוע מרכזי</p>${eventCard(featured, { featured: true })}`;
  } else {
    featuredEl.classList.add('hidden');
  }

  document.getElementById('eventsCount').textContent = filtered.length ? `${filtered.length} אירועים להצגה` : '';
  document.getElementById('emptyState').classList.toggle('hidden', filtered.length > 0);
  list.innerHTML = filtered.map(e => eventCard(e)).join('');
}

if (document.getElementById('eventsList')) {
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPublicBoard();
    });
  });
  window.addEventListener('events-updated', renderPublicBoard);
  renderPublicBoard();
}

window.EventsBoard = {
  getSupabaseClient,
  hasSupabaseConfig,
  loadEvents,
  saveEvent,
  deleteEvent,
  sortEvents,
  isPastEvent,
  formatDateParts,
  timeRange,
  STORAGE_KEY,
  AUTH_KEY,
  COMMUNITY_ID
};
