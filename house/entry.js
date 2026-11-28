const p=new URLSearchParams(location.search);
if(['setup','help','usage'].some(key=>p.get(key)==='true')){
  await import('./setup.js');
}else{
  if(p.get('view')!=='table') document.querySelector('nav').append(document.getElementById('new'));
  await import('./house.js?v=2');
}
