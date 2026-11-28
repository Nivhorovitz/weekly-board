export const desks = ['זית','הבוסתן','גפן','חצר','כרם'];
export function inSession(t, now=Date.now()) {
  return !t.closed && (!t.starts_at || Date.parse(t.starts_at)<=now) && (!t.ends_at || now<Date.parse(t.ends_at));
}
export function overlaps(t, slot) {
  return !t.closed && Date.parse(t.starts_at || t.opened)<slot.end && (!t.ends_at || Date.parse(t.ends_at)>slot.start);
}
export function numberOption(params, name, fallback, max) {
  const n=Number(params.get(name));
  return Number.isInteger(n) && n>=1 && n<=max ? n : fallback;
}
export function rounds(params, now=Date.now()) {
  const start=Date.parse(params.get('start')||''), length=numberOption(params,'duration',120,1440)*60000;
  const step=numberOption(params,'round',30,240)*60000;
  if (!Number.isFinite(start)) return [{start:now,end:now+step,immediate:true}];
  const slots=[];
  for(let s=start;s<start+length;s+=step) if(s+step>now && start+length>now) slots.push({start:s,end:Math.min(s+step,start+length)});
  return slots;
}
const clock=new Intl.DateTimeFormat('he-IL',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jerusalem'});
const day=new Intl.DateTimeFormat('he-IL',{day:'numeric',month:'numeric',timeZone:'Asia/Jerusalem'});
export function timeRange(start,end,now=Date.now()) {
  const stamp=new Date(start);
  return (day.format(stamp)!==day.format(now)?day.format(stamp)+' · ':'')+clock.format(stamp)+(end?'–'+clock.format(new Date(end)):'');
}
