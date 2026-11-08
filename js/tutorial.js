'use strict';
/* Lietuva 1918 — first-time tutorial: a hint card that walks a new player through the basics.
   A step finishes when the player does the thing, or taps Next. Progress is kept per device in localStorage,
   so the tutorial shows only the first time; the Lithuania tab can start it again. */
const TUT_KEY = 'lietuva1918-tutorial';
const TUT = { on: false, step: 0, cam0: null, ev: {} };
const TUT_STEPS = [
  { t: 'Welcome to 1918', d: 'You lead Lithuania from 16 February 1918. Drag to look around, pinch to zoom and twist two fingers to turn the map.', done: () => tutCamMoved() },
  { t: 'Your towns', d: 'Tap a town’s name to open it. You see its people, its stock and what it is short of.', done: () => !!(VIEW.sel && VIEW.sel.kind === 't') },
  { t: 'Routes move goods', d: 'Nothing travels on its own. Open the Routes tab to see the old railways and cart roads that keep towns fed.', done: () => S.tab === 'routes' },
  { t: 'Build a road', d: 'Every town and village feeds itself, but Alytus, Tauragė and Utena have no road, so they cannot trade or grow. Choose Road and drag from one town’s streets to another’s.', done: () => !!TUT.ev.road },
  { t: 'Start a route', d: 'A road alone moves nothing. Open a town, find its new neighbour under Neighbours and tap Road route.', done: () => S.stats.routesMade > 0 },
  { t: 'Room for homes', d: 'Towns grow into zoned lots. Choose Zone and paint along a street.', done: () => !!TUT.ev.zone },
  { t: 'Farms and industry', d: 'Choose Build to place farms, forestry camps and brickworks. Each needs a road to a town hall within 15 km.', done: () => !!TUT.ev.build },
  { t: 'Time and history', d: 'Speed up time with 2× or 4×. On key dates history stops the clock and asks you to choose. The Lithuania tab lists ministry tasks that pay rewards. Good luck!', done: () => S.speed >= 2, last: true }
];
function tutRead() { try { return localStorage.getItem(TUT_KEY); } catch (e) { return 'done'; } }
function tutWrite(v) { try { localStorage.setItem(TUT_KEY, String(v)); } catch (e) { /* storage blocked: the tutorial just shows again */ } }
function tutCamMoved() {
  const a = TUT.cam0;
  if (!a) return false;
  return Math.abs(Math.log(cam.dist / a.dist)) > 0.25 || Math.abs(cam.yaw - a.yaw) > 0.25 || Math.hypot(cam.x - a.x, cam.z - a.z) > a.dist * 0.3;
}
/* Start for a first-time player, resume an unfinished one, or restart (force). Returns true when it shows. */
function tutStart(force) {
  const v = force ? '0' : tutRead();
  if (v === 'done') return false;
  TUT.on = true; TUT.step = clamp(Math.floor(+v || 0), 0, TUT_STEPS.length - 1); TUT.cam0 = camSave(); TUT.ev = {};
  tutWrite(TUT.step); tutShow();
  return true;
}
function tutShow() {
  const el = $('tut');
  document.body.classList.toggle('tut', TUT.on);
  if (!TUT.on) { el.hidden = true; return; }
  const s = TUT_STEPS[TUT.step];
  el.innerHTML = `<div class="th"><span>${TUT.step + 1} of ${TUT_STEPS.length}</span><b>${s.t}</b></div><p>${s.d}</p>
    <div class="tb"><button class="link sm" data-tut="skip">Skip tutorial</button><button class="btn sm pri" data-tut="next">${s.last ? 'Done' : 'Next'}</button></div>`;
  el.hidden = false;
}
function tutNext() {
  if (!TUT.on) return;
  if (TUT.step >= TUT_STEPS.length - 1) return tutEnd();
  TUT.step++; TUT.cam0 = camSave(); tutWrite(TUT.step); tutShow();
}
function tutEnd() { TUT.on = false; tutWrite('done'); tutShow(); }
/* The tools report what the player built: 'road', 'zone', 'build'. */
function tutEvent(k) { TUT.ev[k] = true; }
/* Called a few times a second from the main loop. */
function tutTick() { if (TUT.on && TUT_STEPS[TUT.step].done()) tutNext(); }
