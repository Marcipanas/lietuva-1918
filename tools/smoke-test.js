#!/usr/bin/env node
/* Headless smoke test. Loads every script in a stub browser (one vm context, one script at a time, exactly like
   separate <script> tags). three.js runs for real and builds every mesh; only the WebGL renderer is replaced.
   It boots the game, drives the tools and the route editor the way the UI does, plays about two in-game years,
   renders every panel and zoom level, then saves and reloads. Exit code 1 on any exception or failed assertion.
   Extend it whenever you add a system. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
let failed = 0;
const assert = (c, m) => { if (c) console.log('✓ ' + m); else { console.error('✗ ' + m); failed++; } };

/* ---- stub browser ---- */
const noop = () => {};
const ctx2d = () => new Proxy({}, {
  get: (t, p) => {
    if (p in t) return t[p];
    if (p === 'measureText') return () => ({ width: 30 });
    if (p === 'createImageData' || p === 'getImageData') return (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop: noop });
    return noop;
  },
  set: (t, p, v) => { t[p] = v; return true; }
});
function el(id) {
  const kids = [];
  return {
    id, hidden: true, innerHTML: '', textContent: '', value: '0', className: '', dataset: {}, style: {}, width: 300, height: 150,
    classList: { toggle: noop, add: noop, remove: noop, contains: () => false },
    addEventListener: noop, setPointerCapture: noop, appendChild: c => { kids.push(c); return c; }, firstElementChild: { style: {} },
    getContext: () => ctx2d(), getBoundingClientRect: () => ({ width: 390, height: 700, left: 0, top: 0 }),
    querySelector: () => el('q'), querySelectorAll: () => [], closest: () => null
  };
}
const els = {};
const sandbox = {
  console, Math, Date, JSON, btoa, atob, performance, setTimeout: () => 0, clearTimeout: noop,
  document: { getElementById: id => els[id] || (els[id] = el(id)), querySelector: s => el(s), querySelectorAll: () => [], createElement: t => el(t), addEventListener: noop,
    body: el('body'), fonts: { ready: { then: noop } }, hidden: false },
  window: { devicePixelRatio: 2, innerWidth: 390, addEventListener: noop, ResizeObserver: class { observe() {} } },
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } },
  requestAnimationFrame: cb => { sandbox.rafCb = cb; }
};
vm.createContext(sandbox);

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const order = [...html.matchAll(/<script src="((?:js|vendor)\/[^"]+)"><\/script>/g)].map(m => m[1]);
for (const f of order) {
  try { vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f }); }
  catch (e) { console.error(`✗ ${f} failed to load: ${e.stack || e.message}`); process.exit(1); }
  if (f.startsWith('vendor/three')) {
    /* no WebGL here: a renderer that draws nothing */
    sandbox.THREE.WebGLRenderer = class {
      constructor(o) { this.domElement = o && o.canvas; this.shadowMap = {}; this.capabilities = { getMaxAnisotropy: () => 4 }; this.calls = 0; }
      setPixelRatio() {} getPixelRatio() { return 2; } setSize() {} render() { this.calls++; } dispose() {}
    };
  }
}
assert(true, `loaded ${order.length} scripts in index.html order`);

/* ---- play session (runs inside the game's global scope) ---- */
const session = `(function(){const out={};let t=0;const run=(n,dt)=>{for(let q=0;q<n;q++){t+=dt;rafCb(t)}};
  out.towns=S.towns.length;out.routes0=S.routes.length;out.histOk=S.routes.every(r=>{routeEval(r);return r.ok});
  out.edges=S.edges.length;out.houses=S.bld.filter(b=>b.t==='house').length;out.lots=S.lots.length;
  run(20,16);S.speed=3;run(120,100);out.day1=S.day;out.walkers=WALK.length;out.vehicles=VEH.length;out.renders=R3.calls;
  const kau=S.towns.find(x=>x.id==='kau'),aly=S.towns.find(x=>x.id==='aly'),ki=S.towns.indexOf(kau),ai=S.towns.indexOf(aly);
  /* a road from Kaunas to Alytus, drawn as a finger trace */
  const a=townExit(ki,aly),b=townExit(ai,kau);cam.dist=140;applyCam();setTool('road');
  beginDraw(a.x,a.z);moveDraw(a.x+(b.x-a.x)*0.5,a.z+(b.z-a.z)*0.5);moveDraw(b.x,b.z);finishDraw();
  out.roadPend=!!(PEND&&PEND.kind==='line'&&!PEND.bad);out.roadWhy=PEND&&PEND.bad;out.roadKm=PEND&&PEND.km;doConfirm();analyze();out.alyLinked=NET.linked.has(ai);
  act({act:'newroute',a:String(ki),b:String(ai),m:'road'});const r=S.routes[S.routes.length-1];routeEval(r);out.newRouteOk=r.ok&&r.a===ki&&r.b===ai;
  act({act:'rveh',r:String(r.id),d:'1'});act({act:'rcargo',r:String(r.id),dir:'ab',res:'grain'});act({act:'rpax',r:String(r.id)});out.routeEdit=r.n===3&&Array.isArray(r.ab)&&r.pax;
  /* place buildings around Kaunas, the way the ghost follows a finger */
  cam.dist=12;cam.x=kau.x;cam.z=kau.z;applyCam();kau.stock.timber=600;S.funds+=4000;
  const place=type=>{setTool('place',type);for(let rr=2;rr<11;rr+=0.5)for(let q=0;q<24;q++){const an=q/24*Math.PI*2;setGhost(kau.x+Math.sin(an)*rr,kau.z+Math.cos(an)*rr);
    if(PEND&&PEND.ok&&PEND.ti>=0&&!missing(PEND.cost,S.towns[PEND.ti])){const n=S.bld.length;doConfirm();return S.bld.length===n+1?S.bld[S.bld.length-1]:null}}return null};
  const placed=['warehouse','school','pigs','dairy'].map(place);out.placed=placed.map(Boolean);
  /* zone lots along a Vilnius street */
  let spot=null;for(const e of EDGES.values()){if(e.k!=='road')continue;spot=lotSpots(e).find(c=>lotOk(c,false)&&townAtPoint(c.x,c.z)>=0);if(spot)break}
  out.zoneN=0;if(spot){cam.dist=10;applyCam();setTool('zone');beginDraw(spot.x,spot.z);moveDraw(spot.x+0.05,spot.z+0.05);finishDraw();out.zoneN=PEND&&PEND.n||0;doConfirm()}
  /* a railway spur from the Kaunas station */
  const st=S.bld.find(x=>x.t==='station'&&x.town===ki),te=st&&trackEnd(st,aly),rail0=NET.km.rail[1];
  if(te){setTool('rail');beginDraw(te.x,te.z);moveDraw(te.x+1.5,te.z+2.5);moveDraw(te.x+3,te.z+5);finishDraw();out.railWhy=PEND&&PEND.bad;doConfirm()}out.railAdded=NET.km.rail[1]-rail0;
  /* remove the pig farm again */
  const pig=placed[2];if(pig){setTool('bull');bullThing(pig);doConfirm()}out.pigGone=!!pig&&!BMAP.has(pig.id);
  setTool('inspect');run(500,100);const tt=totals();out.day2=S.day;out.pop=tt.pop;out.funds=S.funds;out.inc=S.inc;
  out.finite=S.towns.every(x=>isFinite(x.pop)&&RES.every(q=>isFinite(x.stock[q]||0)))&&isFinite(S.funds);
  out.moved=Object.values(r.mAB||{}).reduce((a,b)=>a+b,0);out.housesNow=S.bld.filter(b=>b.t==='house').length;
  selectTown(ki,true);renderPanel(true);['routes','nat','chron','sel'].forEach(tb=>{S.tab=tb;renderPanel(true);renderPanel(false)});
  const wh=S.bld.find(x=>x.t==='warehouse');if(wh){selectBuilding(wh,true);renderPanel(true)}toggleDrawer(true);toggleDrawer(false);
  [2,8,30,90,400].forEach(d=>{cam.dist=d;cam.anim=null;run(3,16)});
  S.speed=0;const snap={day:S.day,b:S.bld.length,r:S.routes.length,f:Math.round(S.funds),e:S.edges.length,l:S.lots.length},str=JSON.stringify(serialize());
  restore(JSON.parse(str));analyze();initScene();run(3,16);
  out.roundtrip=S.day===snap.day&&S.bld.length===snap.b&&S.routes.length===snap.r&&Math.round(S.funds)===snap.f&&S.edges.length===snap.e&&S.lots.length===snap.l;
  out.saveKB=Math.round(str.length/1024);out.saved=!!localStorage.getItem(SAVE_KEY);return out})()`;
let o;
try { o = vm.runInContext(session, sandbox, { filename: 'session' }); }
catch (e) { console.error('✗ play session threw: ' + (e.stack || e)); process.exit(1); }
assert(o.towns === 11, '11 towns generated');
assert(o.edges > 50 && o.houses > 60 && o.lots > 20, `towns laid out (${o.edges} road and rail edges, ${o.houses} house lots, ${o.lots} zoned lots)`);
assert(o.routes0 >= 6 && o.histOk, `${o.routes0} historic routes, all running`);
assert(o.renders > 0 && o.vehicles > 0, `3D frames render and route vehicles (${o.vehicles}) spawn`);
assert(o.roadPend && o.alyLinked, `road tool links Alytus to the network${o.roadWhy ? ': ' + o.roadWhy : ` (${(o.roadKm || 0).toFixed(1)} km)`}`);
assert(o.newRouteOk, 'new road route Kaunas–Alytus is created and valid');
assert(o.routeEdit, 'route editor: vehicles, cargo and commuters change');
assert(o.placed.every(Boolean), `warehouse, school, pig farm and dairy farm can be placed near Kaunas (${o.placed.join(', ')})`);
assert(o.zoneN > 0, `zone tool zones lots along a street (${o.zoneN})`);
assert(o.railAdded > 0.5, `rail tool lays track from a station${o.railWhy ? ': ' + o.railWhy : ` (${(o.railAdded || 0).toFixed(1)} km)`}`);
assert(o.pigGone, 'remove tool demolishes a building');
assert(o.day2 > o.day1 + 500, `game time advances (day ${o.day2})`);
assert(o.finite, 'no NaN or infinite values in towns or treasury');
assert(o.pop > 400, `towns grow (${Math.round(o.pop)}k residents, ${o.housesNow} house lots, income ${o.inc.toFixed(1)} Lt a day)`);
assert(o.moved > 0, `the new route carries goods (${o.moved.toFixed(1)} a day)`);
assert(o.roundtrip, `save and reload keep the game intact (${o.saveKB} KB)`);
assert(o.saved, 'autosave writes to localStorage');
if (failed) { console.error(`\n${failed} check${failed > 1 ? 's' : ''} failed`); process.exit(1); }
console.log('\nSmoke test passed.');
