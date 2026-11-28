const p=new URLSearchParams(location.search);
if(['setup','help','usage'].some(key=>p.get(key)==='true')){
  await import('./setup.js?v=2.1');
}else{
  if(p.get('preview')==='agenda'){document.documentElement.classList.add('agenda-preview');document.title='הדגמת לוח השיחות · ספארקו';}
  if(p.get('view')!=='table') document.querySelector('nav').append(document.getElementById('new'));
  await import('./house.js?v=2.2.2');
}
