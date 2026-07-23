const CONFIG = window.EVENTS_BOARD_CONFIG || {};
const urlParams = new URLSearchParams(window.location.search);
const COMMUNITY_ID = urlParams.get('community') || CONFIG.defaultCommunityId || 'default';
const THEME = urlParams.get('theme') || '';
const LANG = urlParams.get('lang') || (THEME === 'hlc' ? 'en' : 'he');
const IS_EN = LANG === 'en';
const IS_HLC = THEME === 'hlc' || COMMUNITY_ID === 'her-last-call';
const STORAGE_KEY = `community-events-board-events-v1-${COMMUNITY_ID}`;
const AUTH_KEY = `community-events-board-admin-auth-v1-${COMMUNITY_ID}`;

if (IS_EN) {
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
}
if (IS_HLC) {
  document.body.classList.add('theme-hlc');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'hlc.css';
  document.head.appendChild(link);
}

const TEXT = IS_EN ? {
  eyebrow: 'Her Last Call Academy',
  titleFallback: 'Her Last Call Weekly Board',
  subtitleFallback: 'Your weekly rhythm for practice, connection and high-ticket sales mastery',
  admin: 'Admin',
  all: 'All',
  filters: [
    ['all', 'All'],
    ['Weekly Call', 'Weekly Calls'],
    ['Pitch Practice', 'Pitch Practice'],
    ['Role Play', 'Role Play'],
    ['Hot Seat', 'Hot Seats'],
    ['Accountability', 'Accountability'],
    ['Guest Training', 'Guest Training'],
    ['Community Session', 'Community Sessions']
  ],
  featured: 'Featured Session',
  thisWeek: 'This Week',
  comingUp: 'Coming Up',
  count: n => `${n} sessions`,
  emptyTitle: 'No sessions to show yet',
  emptyText: 'Once the admin updates the board, sessions will appear here.',
  join: 'Enter Session',
  register: 'Register',
  linkSoon: 'Link coming soon',
  dateLocale: 'en-US',
  defaultCategory: 'Session',
  defaultStatus: 'Open'
} : {
  eyebrow: 'Community Events Board',
  titleFallback: 'לוח אירועים קהילתי',
  subtitleFallback: 'מה קורה בקהילה ומתי כדאי להיכנס',
  admin: 'אדמין',
  all: 'הכל',
  filters: [
    ['all', 'הכל'],
    ['מפגש קהילה', 'מפגשי קהילה'],
    ['סדנה', 'סדנאות'],
    ['מעגל', 'מעגלים'],
    ['שיחה פתוחה', 'שיחות פתוחות'],
    ['אירוע מיוחד', 'אירועים מיוחדים']
  ],
  featured: 'אירוע מרכזי',
  upcoming: 'האירועים הקרובים',
  count: n => `${n} אירועים להצגה`,
  emptyTitle: 'אין אירועים להצגה כרגע',
  emptyText: 'ברגע שהאדמין יעדכן את הלוח, האירועים יופיעו כאן.',
  join: 'כניסה לאירוע',
  register: 'הרשמה',
  linkSoon: 'קישור יתווסף בקרוב',
  dateLocale: 'he-IL',
  defaultCategory: 'אירוע',
  defaultStatus: 'פתוח'
};

const categoryMap = {
  'מפגש קהילה': 'Community Session',
  'סדנה': 'Guest Training',
  'מעגל': 'Hot Seat',
  'שיחה פתוחה': 'Community Session',
  'אירוע מיוחד': 'Special Session'
};

const statusMap = { 'פתוח': 'Open', 'בקרוב': 'Coming Soon', 'מלא': 'Full', 'עבר': 'Past' };

const sampleEvents = [
  {
    communityId: COMMUNITY_ID,
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 1),
    title: IS_EN ? 'Weekly Opening Call' : 'מעגל פתיחה שבועי',
    description: IS_EN ? 'A short weekly gathering for focus, connection and community updates.' : 'מפגש קהילתי קצר לפתיחת השבוע, חיבור, כוונה ועדכונים חשובים.',
    date: nextDate(1),
    startTime: '20:30',
    endTime: '21:30',
    host: IS_EN ? 'Community Team' : 'צוות הקהילה',
    category: IS_EN ? 'Weekly Call' : 'מפגש קהילה',
    status: IS_EN ? 'Open' : 'פתוח',
    roomUrl: CONFIG.defaultRoomUrl || '',
    registrationUrl: '',
    isFeatured: true,
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
    if (error) console.warn('Supabase load failed, falling back to localStorage', error);
    else return (data || []).map(fromDbEvent);
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
  const locale = TEXT.dateLocale;
  return {
    day: new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date),
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date),
    full: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
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

function isWithinDays(event, days) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(today.getDate() + days);
  const eventDate = new Date(`${event.date}T12:00:00`);
  return eventDate >= today && eventDate <= limit;
}

function sortEvents(events) {
  return [...events].sort((a, b) => `${a.date} ${a.startTime || ''}`.localeCompare(`${b.date} ${b.startTime || ''}`));
}

function displayCategory(value) { return IS_EN ? (categoryMap[value] || value || TEXT.defaultCategory) : (value || TEXT.defaultCategory); }
function displayStatus(value) { return IS_EN ? (statusMap[value] || value || TEXT.defaultStatus) : (value || TEXT.defaultStatus); }

function isSparkcoRoomUrl(url = '') {
  return /https?:\/\/app\.sparkco\.space\//.test(url) || url.startsWith('/s/');
}

function eventCard(event, { featured = false } = {}) {
  const d = formatDateParts(event.date);
  const isPast = isPastEvent(event);
  const joinUrl = event.roomUrl || event.registrationUrl;
  const joinTarget = event.roomUrl && isSparkcoRoomUrl(event.roomUrl) ? '_top' : '_blank';
  const joinRel = joinTarget === '_blank' ? 'rel="noopener"' : '';
  return `
    <article class="event-card ${isPast ? 'past' : ''} ${featured ? 'featured-card' : ''}">
      <div class="card-top">
        <div>
          <div class="badges">
            <span class="badge">${escapeHtml(displayCategory(event.category))}</span>
            <span class="badge">${escapeHtml(displayStatus(event.status))}</span>
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
        ${joinUrl ? `<a class="event-action" href="${escapeAttr(joinUrl)}" target="${joinTarget}" ${joinRel}>${TEXT.join}</a>` : `<span class="event-action disabled">${TEXT.linkSoon}</span>`}
        ${event.registrationUrl && event.roomUrl ? `<a class="event-action secondary" href="${escapeAttr(event.registrationUrl)}" target="_blank" rel="noopener">${TEXT.register}</a>` : ''}
      </div>
    </article>
  `;
}

function renderGroup(title, events, countLabel = true) {
  if (!events.length) return '';
  return `
    <section class="section-group">
      <div class="section-group-header">
        <h2>${escapeHtml(title)}</h2>
        ${countLabel ? `<p>${escapeHtml(TEXT.count(events.length))}</p>` : ''}
      </div>
      <div class="events-grid">${events.map(e => eventCard(e)).join('')}</div>
    </section>
  `;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function escapeAttr(value = '') { return escapeHtml(value); }

function setupPublicText() {
  const eyebrow = document.querySelector('.hero .eyebrow');
  if (eyebrow) eyebrow.textContent = TEXT.eyebrow;
  const communitySettings = (CONFIG.communities && CONFIG.communities[COMMUNITY_ID]) || {};
  document.getElementById('communityName').textContent = communitySettings.communityName || CONFIG.communityName || TEXT.titleFallback;
  document.getElementById('communitySubtitle').textContent = communitySettings.communitySubtitle || CONFIG.communitySubtitle || TEXT.subtitleFallback;
  const adminLink = document.querySelector('.admin-link');
  if (adminLink) {
    adminLink.textContent = TEXT.admin;
    adminLink.href = `admin.html?community=${encodeURIComponent(COMMUNITY_ID)}&theme=${encodeURIComponent(THEME)}&lang=${encodeURIComponent(LANG)}`;
  }
  const toolbar = document.querySelector('.toolbar');
  if (toolbar) toolbar.innerHTML = TEXT.filters.map(([value, label], i) => `<button class="filter-chip ${i === 0 ? 'active' : ''}" data-filter="${escapeAttr(value)}">${escapeHtml(label)}</button>`).join('');
  const heading = document.querySelector('.section-heading h2');
  if (heading) heading.textContent = IS_EN ? TEXT.thisWeek : TEXT.upcoming;
  const emptyTitle = document.querySelector('#emptyState h3');
  const emptyText = document.querySelector('#emptyState p');
  if (emptyTitle) emptyTitle.textContent = TEXT.emptyTitle;
  if (emptyText) emptyText.textContent = TEXT.emptyText;
}

async function renderPublicBoard() {
  const list = document.getElementById('eventsList');
  if (!list) return;

  setupPublicText();
  const allEvents = sortEvents(await loadEvents());
  const upcoming = allEvents.filter(e => !isPastEvent(e) && e.status !== 'עבר' && e.status !== 'Past');
  const events = upcoming.length ? upcoming : allEvents;
  const activeFilter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
  const filtered = activeFilter === 'all' ? events : events.filter(e => e.category === activeFilter || displayCategory(e.category) === activeFilter);

  const featured = events.find(e => e.isFeatured && !isPastEvent(e));
  const featuredEl = document.getElementById('featuredEvent');
  if (featured && activeFilter === 'all') {
    featuredEl.classList.remove('hidden');
    featuredEl.innerHTML = `<p class="eyebrow">${TEXT.featured}</p>${eventCard(featured, { featured: true })}`;
  } else {
    featuredEl.classList.add('hidden');
  }

  document.getElementById('eventsCount').textContent = filtered.length ? TEXT.count(filtered.length) : '';
  document.getElementById('emptyState').classList.toggle('hidden', filtered.length > 0);

  if (IS_EN) {
    const thisWeek = filtered.filter(e => isWithinDays(e, 7));
    const comingUp = filtered.filter(e => !isWithinDays(e, 7));
    list.innerHTML = renderGroup(TEXT.thisWeek, thisWeek) + renderGroup(TEXT.comingUp, comingUp);
  } else {
    list.innerHTML = filtered.map(e => eventCard(e)).join('');
  }
}

if (document.getElementById('eventsList')) {
  setupPublicText();
  document.querySelector('.toolbar')?.addEventListener('click', (event) => {
    const btn = event.target.closest('.filter-chip');
    if (!btn) return;
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPublicBoard();
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
