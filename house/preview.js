// Isolated examples for the settings preview. No network or persistent storage.
import {rounds} from './timing.js';
export function previewData(params,here) {
  const roomIds=[here,'OpenSpacePreview0002'];
  const desks=['זית','גפן','חצר','כרם','הבוסתן'];
  const titles=['איך מזמינים קולות חדשים?','מקום ליוזמות קטנות','מה למדנו מן המפגש?','קהילה בין מפגשים','שותפויות מקומיות','איך מתחילים יחד?','מקום למחלוקת','למידה בין עמיתים','אירוח קהילה חדשה','הצעד הבא שלנו'];
  const now=Date.now();
  const configured=Number.isFinite(Date.parse(params.get('start')||''));
  const slots=configured?rounds(params,Date.parse(params.get('start'))):params.get('sample')==='4h'
    ?Array.from({length:8},(_,i)=>({start:now+i*1800000,end:now+(i+1)*1800000}))
    :rounds(params);
  if(!slots.length)slots.push({start:now,end:now+1800000});
  const iso=t=>new Date(t).toISOString();
  const roomCount=params.get('rooms')==='1'?1:2;
  const rooms=roomIds.slice(0,roomCount).map((room,i)=>({room,label:'מרחב פתוח #'+(i+1),desks,seen_at:iso(Date.now())}));
  const talks=slots.flatMap((slot,round)=>titles.slice(0,roomCount*5).map((title,i)=>({id:'preview-'+round+'-'+i,title:titles[(i+round)%titles.length],host:'דוגמה',room:roomIds[Math.floor(i/5)],desk:desks[i%5],
    opened:iso(slot.start),starts_at:iso(slot.start),ends_at:iso(slot.end),mine:false,closed:false})));
  return {rooms,talks,cards:[]};
}
