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
  out.tut0=TUT.on&&TUT.step===0;out.towns=S.towns.length;out.vils=S.towns.filter(x=>x.vil).length;out.named=TOWNS0.length+TOWNS1.length;out.pop0=totals().pop;
  out.halls=S.towns.every((x,n)=>S.bld.some(b=>b.t==='hall'&&b.ti===n));out.homes=S.towns.every((x,n)=>x.lock||S.bld.some(b=>b.t==='house'&&b.town===n));out.routes0=S.routes.length;out.histOk=S.routes.every(r=>{routeEval(r);return r.ok});
  out.edges=S.edges.length;out.houses=S.bld.filter(b=>b.t==='house').length;out.lots=S.lots.length;
  /* the 1918 map: every place of PLACES, landmarks, road links everywhere, rail and highways to the main towns, neighbours by country */
  const cap0=S.towns.findIndex(x=>x.capital);out.places=S.towns.length===PLACES.length&&typeof WORLD1918!=='undefined';out.lm=S.bld.filter(b=>b.lm).length;
  out.roadAll=S.towns.filter((x,n)=>!x.lock&&NET.comp[n]!==NET.comp[cap0]).map(x=>x.n);out.linked0=totals().linked;out.railKm=Math.round(NET.km.rail[1]);out.paved=Math.round(NET.km.road[2]);
  const kh=S.bld.find(b=>b.lm==='krot'),kp=ll2xz(23.8857,54.8968);out.kauHall=!!kh&&Math.hypot(kh.x-kp[0],kh.z-kp[1])<0.05;
  const bp=(lo,la)=>{const p=ll2xz(lo,la);return borderOf(p[0],p[1])};out.gates=[bp(22.78,54.65),bp(24.4,56.38),bp(26.0,54.95),bp(23.5,54.05)].join(',');
  run(20,16);S.speed=3;run(120,100);out.day1=S.day;out.walkers=WALK.length;out.vehicles=VEH.length;out.renders=R3.calls;
  const kau=S.towns.find(x=>x.id==='kau'),aly=S.towns.find(x=>x.id==='aly'),ki=S.towns.indexOf(kau),ai=S.towns.indexOf(aly);
  /* a road from Kaunas to Alytus, drawn as a finger trace */
  const a=townExit(ki,aly),b=townExit(ai,kau);cam.dist=140;applyCam();setTool('road');
  beginDraw(a.x,a.z);moveDraw(a.x+(b.x-a.x)*0.5,a.z+(b.z-a.z)*0.5);moveDraw(b.x,b.z);finishDraw();
  const road0=NET.km.road[1];out.roadPend=!!(PEND&&PEND.kind==='line'&&!PEND.bad);out.roadWhy=PEND&&PEND.bad;out.roadKm=PEND&&PEND.km;doConfirm();analyze();out.roadAdded=NET.km.road[1]-road0;
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
  out.steady=S.towns.filter(x=>!x.lock).every(x=>x.pop>=x.pop0*0.95);out.low=S.towns.filter(x=>!x.lock&&x.pop<x.pop0*0.95).map(x=>x.n+' '+x.pop.toFixed(1)+'/'+x.pop0).join(', ');
  /* foreign trade: a border post in Kybartai, and a deal selling grain to Germany */
  const ky=S.towns.find(x=>x.id==='kyb'),kyi=S.towns.indexOf(ky);cam.dist=8;cam.x=ky.x;cam.z=ky.z;applyCam();ky.stock.timber=200;ky.stock.grain=140;S.funds+=2000;
  const post=(()=>{setTool('place','customs');for(let rr=0.4;rr<4;rr+=0.2)for(let q=0;q<24;q++){const an=q/24*Math.PI*2;setGhost(ky.x+Math.sin(an)*rr,ky.z+Math.cos(an)*rr);
    if(PEND&&PEND.ok&&PEND.ti===kyi&&!missing(PEND.cost,ky)){const n=S.bld.length;doConfirm();return S.bld.length===n+1?S.bld[S.bld.length-1]:null}}return null})();
  setTool('inspect');analyze();out.post=!!post&&post.town===kyi&&post.gate==='de';out.postWhy=post?post.gate+' town '+post.town:'not placed';
  addDeal('de','grain','out',5,kyi);S.speed=0;const f0=S.funds;for(let q=0;q<3;q++)tick();const dl=S.deals[0];out.deal=dl.done>0&&dl.val>0;out.dealWhy=dl.why||dl.done.toFixed(1)+' a day for '+dl.val.toFixed(0)+' Lt';
  S.tab='trade';renderPanel(true);renderPanel(false);
  /* history: the Klaipėda trial card in December 1934 pauses the game; letting it go ahead closes the German market */
  const jump=ds=>{HEV.forEach((e,i)=>{if(e.d<ds)S.ev[i]=1});S.day=Math.round((Date.parse(ds)-START)/864e5)-1};
  jump('1934-12-24');S.speed=2;tick();out.card1=S.hist.cards[0];out.paused=S.speed===0;act({act:'card',o:'0'});out.trial=!S.mkt.de.open&&S.speed===2&&S.hist.picks.trial===0;
  /* the Soviet ultimatum, accepted as in 1940: a planned economy with deliveries to the Union */
  jump('1940-06-14');tick();out.card2=S.hist.cards[0];act({act:'card',o:'0'});out.soviet=S.hist.path==='soviet'&&!S.mkt.gb.open&&S.mkt.su.open&&!S.deals.length;
  jump('1946-01-01');tick();out.plan=!!S.plan&&S.plan.y===1946&&Object.keys(S.plan.tgt).length>=5;
  const sti=S.towns.findIndex((x,n)=>!x.lock&&townGates(n).has('rail'));if(sti>=0){S.towns[sti].stock.grain=140;addDeal('su','grain','out',4,sti)}
  for(let q=0;q<3;q++)tick();out.planGot=S.plan?(S.plan.got.grain||0):0;S.tab='trade';renderPanel(true);renderPanel(false);
  jump('1947-01-01');tick();out.plans=(S.hist.plans||[]).length;out.card3=S.hist.cards[0];act({act:'card',o:'0'});out.collect=S.hist.collect===1&&S.plan&&S.plan.y===1947;
  out.finite2=S.towns.every(x=>isFinite(x.pop)&&x.pop>=0&&RES.every(q=>isFinite(x.stock[q]||0)))&&isFinite(S.funds);
  selectTown(ki,true);renderPanel(true);['routes','trade','nat','chron','sel'].forEach(tb=>{S.tab=tb;renderPanel(true);renderPanel(false)});
  const wh=S.bld.find(x=>x.t==='warehouse');if(wh){selectBuilding(wh,true);renderPanel(true)}toggleDrawer(true);toggleDrawer(false);
  [2,8,30,90,400].forEach(d=>{cam.dist=d;cam.anim=null;run(3,16)});
  out.tut=TUT.step;S.speed=0;const snap={day:S.day,b:S.bld.length,r:S.routes.length,f:Math.round(S.funds),e:S.edges.length,l:S.lots.length},str=JSON.stringify(serialize(),SAVE_NUM);
  restore(JSON.parse(str));analyze();initScene();run(3,16);
  out.roundtrip=S.day===snap.day&&S.bld.length===snap.b&&S.routes.length===snap.r&&Math.round(S.funds)===snap.f&&S.edges.length===snap.e&&S.lots.length===snap.l;
  out.saveKB=Math.round(str.length/1024);out.saved=!!localStorage.getItem(SAVE_KEY);return out})()`;
let o;
const LANDMARKS_N = vm.runInContext('LANDMARKS', sandbox);
try { o = vm.runInContext(session, sandbox, { filename: 'session' }); }
catch (e) { console.error('✗ play session threw: ' + (e.stack || e)); process.exit(1); }
assert(o.towns >= o.named + 100 && o.vils >= 100, `${o.towns} settlements generated (${o.towns - o.vils} towns, ${o.vils} villages)`);
assert(o.halls && o.homes, 'every settlement has a town hall or chapel, and every open one has homes');
assert(o.edges > 50 && o.houses > 60 && o.lots > 20, `towns laid out (${o.edges} road and rail edges, ${o.houses} house lots, ${o.lots} zoned lots)`);
assert(o.routes0 >= 6 && o.histOk, `${o.routes0} historic routes, all running`);
assert(o.renders > 0 && o.vehicles > 0, `3D frames render and route vehicles (${o.vehicles}) spawn`);
assert(o.places && o.lm === Object.keys(LANDMARKS_N).length && o.kauHall, `the start map loads with every place of 1918 and ${o.lm} landmarks at their real places`);
assert(!o.roadAll.length, `dirt roads join every open settlement to Vilnius${o.roadAll.length ? ' (cut off: ' + o.roadAll.join(', ') + ')' : ''}`);
assert(o.linked0 >= 30 && o.railKm > 1000 && o.paved > 400, `${o.linked0} towns linked to Vilnius by ${o.railKm} km of railway and ${o.paved} km of paved highway`);
assert(o.gates === 'de,lv,pl,pl', `border posts trade with the country across: East Prussia, Latvia, Belarus (Polish), Poland (${o.gates})`);
assert(o.roadPend && o.roadAdded > 0.5, `road tool builds a road from Kaunas toward Alytus${o.roadWhy ? ': ' + o.roadWhy : ` (${(o.roadAdded || 0).toFixed(1)} km new)`}`);
assert(o.newRouteOk, 'new road route Kaunas–Alytus is created and valid');
assert(o.routeEdit, 'route editor: vehicles, cargo and commuters change');
assert(o.placed.every(Boolean), `warehouse, school, pig farm and dairy farm can be placed near Kaunas (${o.placed.join(', ')})`);
assert(o.zoneN > 0, `zone tool zones lots along a street (${o.zoneN})`);
assert(o.railAdded > 0.5, `rail tool lays track from a station${o.railWhy ? ': ' + o.railWhy : ` (${(o.railAdded || 0).toFixed(1)} km)`}`);
assert(o.pigGone, 'remove tool demolishes a building');
assert(o.day2 > o.day1 + 500, `game time advances (day ${o.day2})`);
assert(o.finite, 'no NaN or infinite values in towns or treasury');
assert(o.pop > o.pop0, `towns grow (${Math.round(o.pop0)}k to ${Math.round(o.pop)}k residents, ${o.housesNow} house lots, income ${o.inc.toFixed(1)} Lt a day)`);
assert(o.steady, `towns and villages keep their 1918 size without help${o.low ? ' (shrank: ' + o.low + ')' : ''}`);
assert(o.moved > 0, `the new route carries goods (${o.moved.toFixed(1)} a day)`);
assert(o.post, `a border post in Kybartai trades with Germany (${o.postWhy})`);
assert(o.deal, `a deal sells grain to Germany (${o.dealWhy})`);
assert(o.card1 === 'trial' && o.paused && o.trial, `the Klaipėda trial card pauses the game, and holding the trial closes the German market (${o.card1})`);
assert(o.card2 === 'ultimatum' && o.soviet, `accepting the Soviet ultimatum starts Soviet rule and closes Western markets (${o.card2})`);
assert(o.plan && o.planGot > 0, `the state plan sets targets and deliveries count (${o.planGot.toFixed(1)} grain)`);
assert(o.plans === 1 && o.card3 === 'collect' && o.collect, `a plan year closes, and collectivization comes in 1947 (${o.card3})`);
assert(o.finite2, 'no NaN or infinite values after the jumps through history');
assert(o.roundtrip, `save and reload keep the game intact (${o.saveKB} KB)`);
assert(o.saved, 'autosave writes to localStorage');
assert(o.tut0 && o.tut >= 1, `the first-time tutorial starts and follows the player (reached step ${o.tut + 1})`);
if (failed) { console.error(`\n${failed} check${failed > 1 ? 's' : ''} failed`); process.exit(1); }
console.log('\nSmoke test passed.');
