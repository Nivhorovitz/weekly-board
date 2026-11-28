// The public courtyard sign is outside the seating zones. Sparkco refreshes its
// viewer_desk URL token when this viewer sits or leaves, including free seating.
const protocol = 'olive-house/seating/v1';
const origin = location.origin;

function siblings(message) {
  for (let i = 0; i < parent.length; i++) {
    const frame = parent.frames[i];
    if (frame !== window) frame.postMessage(message, origin);
  }
}
function isPeer(event, room) {
  return event.origin === origin && event.source && event.source !== window &&
    event.source.parent === parent && event.data?.protocol === protocol && event.data.room === room;
}
export function announceSeat(room, params) {
  if (window === parent || params.get('desk') !== 'חצר') return;
  // A previously installed sign without the token retains the host's native gate.
  const state = {protocol,room,type:'seat',generation:performance.timeOrigin,
    managed:params.has('viewer_desk'),desk:params.get('viewer_desk') || ''};
  const publish = () => siblings(state);
  window.addEventListener('message',event => {
    if (isPeer(event,room) && event.data.type === 'ask') event.source.postMessage(state,origin);
  });
  window.addEventListener('pageshow',publish);
  window.addEventListener('pagehide',() => siblings({...state,managed:true,desk:''}));
  publish();
}
export function watchSeat(room, desk, setVisible) {
  let generation = 0, lastReply = 0;
  function ask() {
    if (Date.now()-lastReply > 5000) setVisible(false);
    siblings({protocol,room,type:'ask'});
  }
  window.addEventListener('message',event => {
    if (!isPeer(event,room) || event.data.type !== 'seat') return;
    const state = event.data;
    if (!Number.isFinite(state.generation) || state.generation < generation) return;
    generation=state.generation;
    lastReply=Date.now();
    setVisible(state.managed === false || (state.managed === true && state.desk === desk));
  });
  window.addEventListener('pagehide',() => setVisible(false));
  window.addEventListener('pageshow',ask);
  document.addEventListener('visibilitychange',() => {if (!document.hidden) ask();});
  ask();
  setInterval(() => {if (!document.hidden) ask();},2500);
}
