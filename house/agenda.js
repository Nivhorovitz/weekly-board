import {rounds,timeRange} from './timing.js';

const minute = time => Math.floor(time / 60000) * 60000;
const slotKey = (start,end) => start == null ? 'open' : minute(start) + '/' + minute(end);
const deskOrder = ['זית','הבוסתן','גפן','חצר','כרם'];
const roomOrder = new Intl.Collator('he',{numeric:true});
let savedScroll = null;
let stopWatching = () => {};

export function rememberAgenda() {
  const pane = document.querySelector('.agenda-scroll');
  if (pane) savedScroll = {left:pane.scrollLeft, top:pane.scrollTop};
  stopWatching();
}

function columnsFor(talks,params) {
  const columns = new Map();
  const start = Date.parse(params.get('start') || '');
  if (Number.isFinite(start)) {
    for (const slot of rounds(params,start)) columns.set(slotKey(slot.start,slot.end),slot);
  }
  for (const talk of talks) {
    const start = talk.starts_at ? Date.parse(talk.starts_at) : null;
    const end = talk.ends_at ? Date.parse(talk.ends_at) : null;
    columns.set(slotKey(start,end),{start,end});
  }
  return [...columns.values()].sort((a,b)=>(a.start ?? -Infinity)-(b.start ?? -Infinity));
}

function makeArrow(direction) {
  const arrow = document.createElement('button');
  const earlier = direction === 'earlier';
  arrow.type = 'button';
  arrow.className = 'schedule-arrow ' + direction;
  arrow.setAttribute('aria-label',earlier?'לשעות קודמות':'לשעות הבאות');
  arrow.title=arrow.getAttribute('aria-label');
  const chevron = document.createElement('span');
  chevron.setAttribute('aria-hidden','true');
  arrow.append(chevron);
  return arrow;
}

function wireScrolling(pane,earlier,later,slots) {
  let pointer = null;
  let suppressClick = false;
  const step = () => Math.max(160,pane.clientWidth - (pane.querySelector('th')?.offsetWidth || 100) - 40);
  const slide = distance => pane.scrollBy({left:distance,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  function updateArrows() {
    const max = Math.max(0,pane.scrollWidth-pane.clientWidth);
    const offset = Math.max(0,-pane.scrollLeft);
    earlier.hidden = offset < 2;
    later.hidden = max-offset < 2;
  }
  earlier.onclick = () => slide(step());
  later.onclick = () => slide(-step());
  pane.addEventListener('scroll',updateArrows,{passive:true});
  const size = new ResizeObserver(updateArrows);
  size.observe(pane);
  stopWatching = () => size.disconnect();
  pane.addEventListener('keydown',event=>{
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key==='ArrowRight' || event.key==='ArrowLeft') {
      event.preventDefault();
      slide(event.key==='ArrowRight'?step():-step());
    }
  });
  pane.addEventListener('pointerdown',event=>{
    if(event.button!==0 || event.pointerType!=='mouse' || pane.scrollWidth<=pane.clientWidth+1)return;
    pointer={id:event.pointerId,x:event.clientX,y:event.clientY,left:pane.scrollLeft,dragging:false};
    suppressClick=false;
  });
  pane.addEventListener('pointermove',event=>{
    if(!pointer || event.pointerId!==pointer.id)return;
    if(!(event.buttons&1)){pointer=null;return;}
    const dx=event.clientX-pointer.x;
    if(!pointer.dragging){
      if(Math.abs(dx)<5 || Math.abs(dx)<=Math.abs(event.clientY-pointer.y))return;
      pointer.dragging=true;
      pane.setPointerCapture(event.pointerId);
      pane.classList.add('dragging');
    }
    event.preventDefault();
    pane.scrollLeft=pointer.left-dx;
  });
  function end(event){
    if(!pointer || pointer.id!==event.pointerId)return;
    suppressClick=pointer.dragging;
    if(pane.hasPointerCapture(event.pointerId))pane.releasePointerCapture(event.pointerId);
    pane.classList.remove('dragging');
    pointer=null;
    if(suppressClick)setTimeout(()=>{suppressClick=false;},0);
  }
  pane.addEventListener('pointerup',end);
  pane.addEventListener('pointercancel',end);
  pane.addEventListener('click',event=>{
    if(suppressClick){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  if(savedScroll){pane.scrollLeft=savedScroll.left;pane.scrollTop=savedScroll.top;}
  else {
    const now=Date.now();
    const active=slots.findIndex(s=>s.start!=null && s.start<=now && now<s.end);
    if(active>0){
      const cell=pane.querySelectorAll('thead th')[active+1];
      const previousCorner=pane.querySelector('thead th');
      if(cell && previousCorner)pane.scrollLeft-=previousCorner.getBoundingClientRect().left-cell.getBoundingClientRect().right;
    }
  }
  updateArrows();
}

// Return false to keep the small public list when there is only one time block.
export function timeline(list,talks,rooms,params,topicButton) {
  const slots=columnsFor(talks,params);
  if(slots.length<2) return false;
  const planned=Number.isFinite(Date.parse(params.get('start')||''));
  if(!planned && slots.length<3 && talks.length<6)return false;
  const grouped=new Map();
  const roomLabel=id=>rooms.find(r=>r.room===id)?.label || '';
  for(const t of talks){
    const id=t.room+'/'+t.desk;
    if(!grouped.has(id))grouped.set(id,{room:t.room,desk:t.desk,bySlot:new Map()});
    const cells=grouped.get(id).bySlot, key=slotKey(t.starts_at?Date.parse(t.starts_at):null,t.ends_at?Date.parse(t.ends_at):null);
    if(!cells.has(key))cells.set(key,[]);
    cells.get(key).push(t);
  }
  if(!grouped.size && !rooms.length)return false;
  if(planned){
    const active=rooms.filter(r=>r.room!=='SiP9e8gVkEFw6zkqYuDW' && Date.now()-Date.parse(r.seen_at)<180000);
    const candidates=active.length?active:rooms.filter(r=>r.room==='SiP9e8gVkEFw6zkqYuDW');
    candidates.sort((a,b)=>roomOrder.compare(a.label,b.label));
    for(const r of candidates.slice(0,Number(params.get('rooms'))||999)){
      for(const desk of r.desks){const k=r.room+'/'+desk;if(!grouped.has(k))grouped.set(k,{room:r.room,desk,bySlot:new Map()});}
    }
  }
  const shell=document.createElement('div'),pane=document.createElement('div'),table=document.createElement('table');
  shell.className='agenda-timeline';pane.className='agenda-scroll';pane.tabIndex=0;pane.dir='rtl';
  pane.setAttribute('role','region');pane.setAttribute('aria-label','לוח שיחות לפי שעה ושולחן');
  table.className='schedule-grid';table.setAttribute('aria-label','שיבוץ השיחות');
  const header=table.createTHead().insertRow();
  function th(row,text,scope){const cell=document.createElement('th');cell.scope=scope;cell.textContent=text;row.append(cell);return cell;}
  th(header,'שולחן','col');
  for(const slot of slots){
    const cell=th(header,slot.start==null?'זמן פתוח':timeRange(slot.start,slot.end),'col');
    cell.dir='auto';
  }
  const body=table.createTBody();
  const rows=[...grouped.values()].sort((a,b)=>roomOrder.compare(roomLabel(a.room),roomLabel(b.room)) || deskOrder.indexOf(a.desk)-deskOrder.indexOf(b.desk));
  for(const item of rows){
    const row=body.insertRow(),label=roomLabel(item.room);
    const h=th(row,item.desk,'row');
    if(label){const tag=document.createElement('small');tag.textContent=label.replace('מרחב פתוח #','#');h.append(' ',tag);}
    for(const slot of slots){
      const cell=row.insertCell();
      for(const talk of item.bySlot.get(slotKey(slot.start,slot.end))||[])cell.append(topicButton(talk));
    }
  }
  const earlier=makeArrow('earlier'),later=makeArrow('later');
  earlier.hidden=later.hidden=true;
  pane.append(table);shell.append(pane,earlier,later);list.append(shell);
  wireScrolling(pane,earlier,later,slots);
  return true;
}
