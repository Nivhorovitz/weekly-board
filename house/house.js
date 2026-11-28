const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const initialRoom = 'SiP9e8gVkEFw6zkqYuDW';
let room = params.get('room') || initialRoom;
const bridge = window.SparkcoBridge;
const launcher = $('launcher');
launcher.href = location.href;
function setLauncher(nativeOpen) {
  const label = nativeOpen ? 'פתיחת לוח השיחות' : 'לוח השיחות בחלון נפרד';
  launcher.title = label;
  launcher.setAttribute('aria-label', label);
  launcher.onclick = nativeOpen ? async event => {
    event.preventDefault();
    try {
      const result = await bridge.setPresence('expanded', {audience:'self'});
      if (result?.ok) return;
    } catch { /* The host can decline expansion. Keep a regular link available. */ }
    setLauncher(false);
    launcher.focus();
  } : null;
}
const signFeed = typeof BroadcastChannel === 'function' ? new BroadcastChannel('olive-house/table-topics/v1') : null;
function publishTitles() {
  if (!board || !signFeed) return;
  const titles = board.talks.filter(t => !t.closed && t.room === room)
    .map(t => ({desk:t.desk, title:t.title}));
  signFeed.postMessage({type:'titles', room, titles});
}
if (signFeed) signFeed.onmessage = ({data}) => {
  if (data?.type === 'read' && data.room === room) publishTitles();
};
if (bridge && window.parent !== window) {
  bridge.onInit(message => {
    room = message.room_id || room;
    setLauncher(message.widget?.visibility === 'plugin_controlled');
  });
  bridge.onViewport?.(message => { room = message.room_id || room; });
  bridge.ready('1.1.0');
}
const storageKey = 'open-house/device';
let device, storageAvailable = true;
try {
  device = localStorage.getItem(storageKey) || crypto.randomUUID();
  localStorage.setItem(storageKey, device);
} catch { storageAvailable = false; }
const endpoint = 'https://cmtbwohbktirmplieeeq.supabase.co/rest/v1/rpc/';
const headers = {apikey:'sb_publishable_tk18F8g4AS7oQF9eV9qGQw_nONj_xiX','Content-Type':'application/json'};
let board, view = 'live', selected = null, lastData = '', refreshing = false;
let onSave, saving = false;
const dialog = document.querySelector('dialog');
const form = dialog.querySelector('form');
function node(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
function button(text, action, cls) {
  const n = node('button',text,cls); n.type='button';
  n.onclick=async()=>{n.disabled=true;try{await action();}catch(error){$('status').textContent=error.message;}finally{n.disabled=false;}};
  return n;
}
async function rpc(name, values) {
  const response = await fetch(endpoint+name,{method:'POST',headers,body:JSON.stringify({device,...values}),signal:AbortSignal.timeout(10000)});
  if(!response.ok) {
    const data=await response.json().catch(()=>({}));
    throw Error(data.code==='23505'?'השולחן נתפס בינתיים. בחרו שולחן אחר.':'הפעולה לא נשמרה. בדקו את החיבור ונסו שוב.');
  }
  return response.json();
}
function activeRoom(r) {
  return r.room===initialRoom || r.room===room || Date.now()-Date.parse(r.seen_at)<180000;
}
let lastSeen=0;
async function refresh() {
  if(refreshing)return;
  refreshing=true;
  try {
    if (room!==initialRoom && window.parent!==window && Date.now()-lastSeen>30000) {
      const label=params.get('room_name') || '';
      const presence=await fetch(endpoint+'os_house_presence',{method:'POST',headers,body:JSON.stringify({room_id:room,room_label:label}),signal:AbortSignal.timeout(8000)});
      if(presence.ok && await presence.json())lastSeen=Date.now();
    }
    const data=await rpc('os_house_board',{});
    const json=JSON.stringify(data); board=data;
    publishTitles();
    if(json!==lastData){lastData=json;render();}
    $('new').disabled=!storageAvailable;
    if($('status').dataset.connection!=='ok'){
      $('status').textContent=storageAvailable?'':'כדי לפרסם, יש לאפשר אחסון בדפדפן.';
      $('status').dataset.connection='ok';
    }
  } catch { $('status').textContent='החיבור ללוח נקטע. מנסים שוב…'; $('status').dataset.connection='offline'; }
  finally{refreshing=false;}
}
function field(name,title,type='input',max=140,value='') {
  const label=node('label',title), input=node(type);
  input.name=name;input.required=true;input.maxLength=max;input.value=value;
  label.append(input);$('fields').append(label);return input;
}
function showForm(title,saveLabel,setup,fn) {
  if(!storageAvailable)throw Error('יש לאפשר אחסון כדי לפרסם.');
  $('heading').textContent=title;$('save').textContent=saveLabel;$('error').textContent='';
  $('fields').replaceChildren();setup();onSave=fn;dialog.showModal();
}
$('cancel').onclick=()=>dialog.close();
form.onsubmit=async e=>{
  e.preventDefault();if(saving)return;saving=true;$('save').disabled=true;
  try{await onSave(Object.fromEntries(new FormData(form)));dialog.close();await refresh();render();}
  catch(error){$('error').textContent=error.message;}
  finally{saving=false;$('save').disabled=false;}
};
async function write(op,item,extra={}) {
  if(!await rpc('os_house_write',{op,item,...extra}))throw Error('השינוי לא אושר.');
}
function freeDesks(){
  const copies=board.rooms.filter(r=>r.room!==initialRoom && activeRoom(r));
  const visible=copies.length ? copies : board.rooms.filter(r=>r.room===initialRoom);
  return visible.sort((a,b)=>Number(b.room===room)-Number(a.room===room)).flatMap(r=>r.desks.filter(d=>!board.talks.some(t=>!t.closed&&t.room===r.room&&t.desk===d)).map(d=>({room:r.room,desk:d,label:r.label+' · '+d})));
}
function newTalk(parent=null) {
  const desks=freeDesks();
  if(!desks.length)throw Error('כל השולחנות בשיחה. אפשר להצטרף או לחזור כשיתפנה שולחן.');
  const id=crypto.randomUUID();
  showForm(parent?'שיחת המשך':'על מה תרצו לדבר?','לפתוח שיחה',()=>{
    field('title','נושא השיחה');field('name','מי מזמין או מזמינה?','input',60);
    const select=field('desk','איפה נפגשים?','select');
    desks.forEach((d,i)=>select.add(new Option(d.label,i)));
  },async v=>{
    const dest=desks[Number(v.desk)];
    await write('talk',id,{target:parent,body:v.title,display_name:v.name,room_id:dest.room,desk_name:dest.desk});
    selected=id;view='live';
  });
}
function contribute(t,kind,initial=''){
  const id=crypto.randomUUID(),initiative=kind==='initiative';
  showForm(({note:'תובנה מהשולחן',harvest:'תוצר לשוק הרעיונות',initiative:'הזמנה ליוזמה'})[kind],kind==='note'?'לשמור בשיחה':'לפרסם בשוק',()=>{
    field('body',initiative?'מה הצעד הראשון שננסה?':'מה תרצו לשתף?','textarea',400,initial);
    if(initiative){field('invite','מי מוזמן להצטרף ולמה?','textarea',240);field('name','מי מזמין או מזמינה?','input',60);}
  },v=>write(kind,id,{target:t.id,body:v.body,invitation:v.invite||'',display_name:v.name||''}));
}
function visit(t){
  if(t.closed){$('status').textContent='השיחה הסתיימה. התוצרים נשארו כאן.';return;}
  const dest=board.rooms.find(r=>r.room===t.room);
  if(!dest || !activeRoom(dest)){ $('status').textContent='העותק אינו פעיל כרגע. תוצרי השיחה זמינים כאן.';return; }
  if(room!==t.room && bridge?.navigate(t.room)){
    $('status').textContent='עוברים אל '+dest.label+' · '+t.desk;
    setTimeout(()=>{if(room!==t.room)$('status').textContent='המעבר לחדר לא אושר. נשארתם בשיחה הנוכחית.';},4500);
    return;
  }
  $('status').textContent='השיחה מתקיימת בשולחן '+t.desk+' · '+(board.rooms.find(r=>r.room===t.room)?.label||'')+'. אפשר להתיישב בגרירת האווטר.';
}
function talkLocation(t) {
  const label = board.rooms.find(r => r.room === t.room)?.label || '';
  const location = node('small', t.host + ' · ');
  const map = node('a', t.desk + ' · ' + label + ' ↗');
  const url = new URL('sign-preview.html', window.location.href);
  url.searchParams.set('room', t.room);
  map.href = url.href;
  map.target = '_blank';
  map.rel = 'noopener';
  map.title = 'הצגת מפת השיחות בחלון נפרד';
  map.setAttribute('aria-label', map.title + ' · ' + t.desk + ' · ' + label);
  location.append(map);
  if (t.closed) location.append(' · הסתיימה');
  return location;
}
function record(t) {
  const area=node('article');
  area.append(button(t.title,()=>{selected=t.id;view='live';render();if(!t.closed)visit(t);},'topic'),talkLocation(t));
  if(t.parent){const p=board.talks.find(x=>x.id===t.parent);if(p)area.append(node('small','המשך לשיחה ״'+p.title+'״'));}
  return area;
}
function render(){
  if(!board)return;
  const list=$('list');list.replaceChildren();
  for(const id of ['live','market'])$(id).setAttribute('aria-pressed',String(view===id));
  if(view==='market'){
    const products=board.cards.filter(c=>c.kind!=='note');
    if(!products.length)list.append(node('p','כאן יופיעו תוצרים והזמנות שהשולחנות יפרסמו.'));
    for(const c of products.slice().reverse()){
      const t=board.talks.find(x=>x.id===c.talk);if(!t)continue;
      const a=node('article');a.append(node('small',t.title+' · '+t.desk),node('h3',c.body));
      if(c.kind==='initiative'){
        a.append(node('p',c.invitation),node('small','בהזמנת '+c.host));
        if(!t.closed)a.append(button('לבקר בשולחן',()=>visit(t)));
        a.append(button(c.joined?'לבטל הצטרפות':'להצטרף לצעד הבא',()=>{
          if(c.joined)return write('leave',c.id).then(refresh);
          showForm('הצטרפות ליוזמה','להצטרף',()=>field('name','איך להציג את שמך למשתתפים?','input',60),v=>write('join',c.id,{display_name:v.name}));
        },'primary'));
        if(c.members.length)a.append(node('small','מצטרפים: '+c.members.join(' · ')));
      }list.append(a);
    }return;
  }
  const t=board.talks.find(x=>x.id===selected);
  if(!t){
    if(!board.talks.length)list.append(node('p','איזו שיחה תרצו לפתוח?'));
    for(const talk of board.talks.slice().sort((a,b)=>Number(a.closed)-Number(b.closed)))list.append(record(talk));
    return;
  }
  list.append(button('חזרה ללוח',()=>{selected=null;render();}),node('h2',t.title),talkLocation(t));
  if(!t.closed){
    const actions=node('div',undefined,'actions');
    actions.append(button('אל השולחן',()=>visit(t)),button('להוסיף תובנה',()=>contribute(t,'note')),button('לפרסם תוצר',()=>contribute(t,'harvest')),button('להזמין ליוזמה',()=>contribute(t,'initiative'),'primary'),button('לפתוח שיחת המשך',()=>newTalk(t.id)));
    if(t.mine)actions.append(button('לסיים ולפנות שולחן',()=>showForm('לסיים את השיחה?','לסיים ולשמור תוצרים',()=>$('fields').append(node('p','השולחן יתפנה וכל מה שנכתב יישאר זמין.')),()=>write('close',t.id))));
    list.append(actions);
  }else list.append(node('p','השיחה הסתיימה.'));
  for(const c of board.cards.filter(c=>c.talk===t.id)){
    const a=node('article');a.append(node('p',c.body));
    if(c.kind==='note'&&!t.closed)a.append(button('להביא לשוק',()=>contribute(t,'harvest',c.body)));
    list.append(a);
  }
}
$('new').onclick=()=>{try{newTalk();}catch(e){$('status').textContent=e.message;}};
for(const id of ['live','market'])$(id).onclick=()=>{view=id;selected=null;render();};
refresh();setInterval(()=>{if(!document.hidden)refresh();},4000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
