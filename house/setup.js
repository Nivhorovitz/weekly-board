const params=new URLSearchParams(location.search);
const fields=[
  {name:'start',label:'תחילת האירוע',type:'datetime-local'},
  {name:'duration',label:'משך האירוע בדקות',type:'number',min:1,max:1440,value:120},
  {name:'round',label:'משך סבב בדקות',type:'number',min:1,max:240,value:30},
  {name:'rooms',label:'מספר החדרים הפעילים שיוצעו לשיבוץ',type:'number',min:1,max:999}
];
document.body.replaceChildren();
const main=document.createElement('main');document.body.append(main);
document.documentElement.className='';
if(params.get('usage')==='true'){const pre=document.createElement('pre');pre.textContent=JSON.stringify({name:'Open Space',parameters:fields},null,2);main.append(pre);}
else{
  const form=document.createElement('form'),title=document.createElement('h1');title.textContent='הגדרות לוח השיחות';main.append(title,form);
  const tz=document.createElement('p');tz.textContent='שעת ההתחלה לפי '+Intl.DateTimeFormat().resolvedOptions().timeZone+'. ללא תאריך, הלוח פתוח לשיחות שמתחילות עכשיו.';form.append(tz);
  for(const field of fields){
    const label=document.createElement('label'),input=document.createElement('input');label.textContent=field.label;input.name=field.name;input.type=field.type;
    if(field.min){input.min=field.min;input.max=field.max;}
    const saved=params.get(field.name);
    if(field.type==='datetime-local' && saved && Number.isFinite(Date.parse(saved))){const d=new Date(saved);input.value=new Date(+d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
    else input.value=saved||field.value||'';
    label.append(input);form.append(label);
  }
  const submit=document.createElement('button');submit.textContent='להחיל הגדרות';form.append(submit);
  const output=document.createElement('textarea');output.readOnly=true;output.hidden=true;output.setAttribute('aria-label','כתובת להטמעה');form.append(output);
  const protocol='sparkco-plugin-setup-v1',host='https://app.sparkco.space';
  if(parent!==window)parent.postMessage({protocol,type:'plugin.setup_ready'},host);
  form.onsubmit=e=>{e.preventDefault();const q=new URLSearchParams({view:'wall',room:'@@room-uid@@',room_name:'@@room-name@@',transparent:'@@is-transparent@@'});
    for(const [key,val] of new FormData(form))if(val)q.set(key,key==='start'?new Date(val).toISOString():val);
    const url=new URL('./',location.href).href+'?'+q.toString().replaceAll('%40','@');
    output.hidden=false;output.value=url;if(parent!==window)parent.postMessage({protocol,type:'plugin.setup_result',url},host);
  };
}
