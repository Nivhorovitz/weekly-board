'use strict';
const form = document.querySelector('form');
const { topic, slot, desk } = form.elements;
const statusLine = document.querySelector('#status');
const submit = form.querySelector('button');
const {supabaseUrl, supabaseAnonKey} = window.EVENTS_BOARD_CONFIG;
const endpoint = supabaseUrl + '/rest/v1/open_space_topics';
const headers = {apikey:supabaseAnonKey, Authorization:'Bearer ' + supabaseAnonKey};
const timezone = new Intl.DateTimeFormat('he-IL', {timeZone:'Asia/Jerusalem', weekday:'short',day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'});
const seats = [10,10,6,6,6];
let rows = [];
let online = false;
let saving = false;
let refreshing = false;
function refreshDesks() {
  const previous = desk.value;
  desk.replaceChildren();
  seats.forEach((capacity, i) => {
    const number = i + 1;
    const taken = rows.some(row => Date.parse(row.starts_at) === Date.parse(slot.value) && row.table_no === number);
    if (!taken) desk.add(new Option('שולחן ' + number + ' · ' + capacity + ' מקומות', number));
  });
  if ([...desk.options].some(option => option.value === previous)) desk.value = previous;
  submit.disabled = saving || !online || !desk.value;
}
function refreshSlots() {
  const previous = slot.value;
  const hour = 3600000;
  const first = (Math.floor(Date.now()/hour) + 1) * hour;
  slot.replaceChildren();
  for (let i=0;i<168;i++) {
    const time = new Date(first + i*hour);
    slot.add(new Option(timezone.format(time), time.toISOString()));
  }
  if ([...slot.options].some(option => option.value === previous)) slot.value = previous;
}
async function refresh() {
  if (refreshing) return;
  refreshing = true;
  try {
    const query = new URLSearchParams({select:'topic,starts_at,table_no',starts_at:'gte.' + new Date(Date.now()-3600000).toISOString(),order:'starts_at.asc,table_no.asc'});
    const response = await fetch(endpoint + '?' + query, {headers,cache:'no-store'});
    if (!response.ok) throw Error();
    rows = await response.json();
    const list = document.querySelector('ul');
    list.replaceChildren();
    for (const row of rows) {
      const item = document.createElement('li');
      item.textContent = row.topic;
      const details = document.createElement('small');
      details.textContent = timezone.format(new Date(row.starts_at)) + ' · שולחן ' + row.table_no;
      item.append(details); list.append(item);
    }
    if (!rows.length) list.textContent = 'הלוח פתוח לשיחה הראשונה.';
    if (!online) statusLine.textContent = '';
    online = true;
  } catch {
    online = false;
    statusLine.textContent = 'אין כרגע חיבור ללוח המשותף. ננסה להתחבר שוב.';
  } finally {
    refreshing = false;
    refreshSlots(); refreshDesks();
  }
}
slot.onchange = refreshDesks;
form.onsubmit = async event => {
  event.preventDefault();
  if (submit.disabled || !topic.value.trim()) return;
  saving = true; submit.disabled = true;
  const payload = {id:crypto.randomUUID(), topic:topic.value.trim(), starts_at:slot.value, table_no:Number(desk.value)};
  try {
    const response = await fetch(endpoint,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if (response.status === 409) statusLine.textContent = 'השולחן כבר תפוס בשעה הזאת. אפשר לבחור שולחן אחר.';
    else if (response.ok) { topic.value=''; statusLine.textContent='המפגש פורסם לקהילה.'; }
    else throw Error();
  } catch { statusLine.textContent='לא התקבל אישור פרסום. בדקו את הלוח לפני ניסיון נוסף.'; }
  finally { saving=false; await refresh(); refreshDesks(); }
};
refresh();
setInterval(refresh, 10000);
