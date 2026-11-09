#!/usr/bin/env node
/* Headless smoke test. Loads every script in a stub browser (one vm context, one script at a time, exactly like
   separate <script> tags). three.js runs for real and builds every mesh; only the WebGL renderer is replaced.
   It boots the game, drives the tools and the route editor the way the UI does, plays about two in-game years,
   walks history through its borders and decisions (as they happened, and the other ways), renders every panel and
   zoom level, then saves and reloads. Exit code 1 on any exception or failed assertion.
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
  const kids = [], full = id === 'cv' || id === 'stage';
  return {
    id, hidden: true, innerHTML: '', textContent: '', value: '0', className: '', dataset: {}, style: { setProperty: noop }, width: 300, height: 150,
    classList: { toggle: noop, add: noop, remove: noop, contains: () => false },
    addEventListener: noop, setPointerCapture: noop, appendChild: c => { kids.push(c); return c; }, firstElementChild: { style: {} },
    setAttribute: noop, getAttribute: () => null, scrollIntoView: noop,
    getContext: () => ctx2d(),
    /* the map fills a 390 by 700 phone screen; panels are closed (no height) */
    getBoundingClientRect: () => full ? { width: 390, height: 700, left: 0, top: 0, right: 390, bottom: 700 } : { width: 390, height: 0, left: 0, top: 700, right: 390, bottom: 700 },
    querySelector: () => el('q'), querySelectorAll: () => [], closest: () => null
  };
}
const els = {};
const sandbox = {
  console, Math, Date, JSON, btoa, atob, performance, setTimeout: () => 0, clearTimeout: noop,
  document: { getElementById: id => els[id] || (els[id] = el(id)), querySelector: s => el(s), querySelectorAll: () => [], createElement: t => el(t), addEventListener: noop,
    body: el('body'), documentElement: el('html'), fonts: { ready: { then: noop } }, hidden: false },
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  window: { devicePixelRatio: 2, innerWidth: 390, addEventListener: noop, ResizeObserver: class { observe() {} } },
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; },
    key(i) { return Object.keys(this._d)[i] ?? null; }, get length() { return Object.keys(this._d).length; } },
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
const session = `(function(){const out={};let t=0;
  /* the player answers each decision card as history went */
  const hopt=id=>Math.max(0,CARDS[id].opts.findIndex(o=>o.h)),answer=()=>{while(S.hist.cards.length)act({act:'card',o:String(hopt(S.hist.cards[0]))})};
  const run=(n,dt)=>{for(let q=0;q<n;q++){t+=dt;rafCb(t);answer()}};
  /* history without the economy, a day at a time, answering cards as history went unless pick says otherwise */
  const jump=(ds,pick)=>{const end=Math.round((Date.parse(ds)-START)/864e5)-1;while(S.day<end){S.day++;histTick();while(S.hist.cards.length){const id=S.hist.cards[0];pickCard(pick&&pick[id]!==undefined?pick[id]:hopt(id))}}};
  const keep=()=>JSON.stringify(serialize(),SAVE_NUM),back=s=>{restore(JSON.parse(s));analyze()},T=n=>S.towns.find(x=>x.n===n);
  /* the borders of 16 February 1918: the Klaipėda Region German, the Palanga coast in German-held Courland, the Vilnius region
     ours, and German troops all around (Ober Ost); today's Poland split on the old border of East Prussia */
  out.own0=['kr','pal','vr','vr2','by'].map(k=>S.own[k]).join(',');out.nb0=['lv','pl','ep','ru'].map(k=>S.own[k]).join(',');out.ep=CTY.filter(c=>c===CTY_ID.ep).length;
  out.lbl1=[nlText({k:'c',s:'LATVIJA'}),nlText({k:'c',s:'MOZŪRIJA'}),nlText({k:'c',s:'BALTARUSIJA'})].join('|');out.lock0=[T('Klaipėda').lock,T('Palanga').lock,T('Vilnius').lock,T('Švenčionys').lock].join('');out.cap0=capital().n;
  {const P=T('Palanga');out.palMsg=validPlace('farm',P.x+0.3,P.z+0.5,0).why;out.rg0=[T('Perloja').rg,T('Varėna').rg,T('Vievis').rg,T('Turmantas').rg,T('Druskininkai').rg].join(',')}
  out.lbl0=nlText({k:'r',rg:'kr'});{let lt=0,old=0;for(const q of borderPieces()){const a=sideOwner(q.a),b=sideOwner(q.b);if(a!==b&&(a==='lt'||b==='lt'))lt++;if(q.a.c&&q.b.c&&[q.a.c,q.b.c].sort().join()==='ep,pl')old++}out.bord0=lt;out.oldBord=old}
  out.tut0=TUT.on&&TUT.step===0;out.towns=S.towns.length;out.vils=S.towns.filter(x=>x.vil).length;out.named=TOWNS0.length+TOWNS1.length;const pop00=S.towns.map(x=>x.pop);
  out.halls=S.towns.every((x,n)=>S.bld.some(b=>b.t==='hall'&&b.ti===n));out.homes=S.towns.every((x,n)=>x.lock||S.bld.some(b=>b.t==='house'&&b.town===n));out.routes0=S.routes.length;out.histOk=S.routes.every(r=>{routeEval(r);return r.ok});
  out.edges=S.edges.length;out.houses=S.bld.filter(b=>b.t==='house').length;out.lots=S.lots.length;
  /* the 1918 map: every place of PLACES, landmarks, road links everywhere, rail and highways to the main towns, neighbours by country */
  const cap0=S.towns.findIndex(x=>x.capital);out.places=S.towns.length===PLACES.length&&typeof WORLD1918!=='undefined';out.lm=S.bld.filter(b=>b.lm).length;
  out.roadAll=S.towns.filter((x,n)=>!x.lock&&NET.comp[n]!==NET.comp[cap0]).map(x=>x.n);out.linked0=totals().linked;out.railKm=Math.round(NET.km.rail[1]);out.paved=Math.round(NET.km.road[2]);
  const kh=S.bld.find(b=>b.lm==='krot'),kp=ll2xz(23.8857,54.8968);out.kauHall=!!kh&&Math.hypot(kh.x-kp[0],kh.z-kp[1])<0.05;
  const bp=(lo,la)=>{const p=ll2xz(lo,la);return borderOf(p[0],p[1])};out.gates=[bp(22.78,54.65),bp(24.4,56.38),bp(26.0,54.95),bp(23.5,54.05),bp(21.25,55.85)].join(',');
  run(20,16);S.speed=3;run(120,100);out.day1=S.day;out.walkers=WALK.length;out.vehicles=VEH.length;out.renders=R3.calls;
  const kau=S.towns.find(x=>x.id==='kau'),aly=S.towns.find(x=>x.id==='aly'),ki=S.towns.indexOf(kau),ai=S.towns.indexOf(aly);
  /* a road from Kaunas to Alytus, drawn as a finger trace */
  const a=townExit(ki,aly),b=townExit(ai,kau);cam.dist=140;applyCam();setTool('road');
  beginDraw(a.x,a.z);moveDraw(a.x+(b.x-a.x)*0.5,a.z+(b.z-a.z)*0.5);moveDraw(b.x,b.z);finishDraw();
  const road0=NET.km.road[1];out.roadPend=!!(PEND&&PEND.kind==='line'&&!PEND.bad);out.roadWhy=PEND&&PEND.bad;out.roadKm=PEND&&PEND.km;doConfirm();analyze();out.roadAdded=NET.km.road[1]-road0;
  /* the same by taps: a start, a bend that is undone, an end; the action bar shows each state */
  const ra=townExit(ki,S.towns[tIdx('jon')]),rb=townExit(tIdx('jon'),kau);setTool('road');tapTool(ra.x,ra.z);out.tap1=TRACE.length===1&&!PEND;showBar();
  tapTool(ra.x+3,ra.z-6);undoStep();out.undo=TRACE.length===1;tapTool(rb.x,rb.z);showBar();out.tapRoad=TRACE.length===2&&!!PEND&&PEND.kind==='line';out.tapWhy=PEND&&PEND.bad||'';
  const road1=NET.km.road[1];doConfirm();analyze();out.tapAdded=NET.km.road[1]-road1;setTool('inspect');
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
  /* zoning by taps adds up, street by street, and undo takes the last street back */
  out.zoneTaps=[];{const vil=S.towns[0];setTool('zone');let tried=0;for(const e of EDGES.values()){if(e.k!=='road'||tried>=40)continue;const c=lotSpots(e).find(q=>lotOk(q,false)&&Math.hypot(q.x-vil.x,q.z-vil.z)<6);if(!c)continue;tried++;
    const n0=PEND&&PEND.n||0;tapTool(c.x,c.z);const n1=PEND&&PEND.n||0;if(n1>n0)out.zoneTaps.push(n1);if(out.zoneTaps.length>=2)break}
    const nz=PEND&&PEND.n||0;undoStep();out.zoneUndo=(PEND&&PEND.n||0)<nz;showBar();setTool('inspect')}
  /* a railway spur from the Kaunas station */
  const st=S.bld.find(x=>x.t==='station'&&x.town===ki),te=st&&trackEnd(st,aly),rail0=NET.km.rail[1];
  if(te){setTool('rail');beginDraw(te.x,te.z);moveDraw(te.x+1.5,te.z+2.5);moveDraw(te.x+3,te.z+5);finishDraw();out.railWhy=PEND&&PEND.bad;doConfirm()}out.railAdded=NET.km.rail[1]-rail0;
  /* remove the pig farm again */
  const pig=placed[2];if(pig){setTool('bull');bullThing(pig);doConfirm()}out.pigGone=!!pig&&!BMAP.has(pig.id);
  /* the build menu finds a good spot near the town it was opened from */
  S.funds+=3000;kau.stock.timber=600;out.spots={};['farm','forestry','fishery','warehouse','school','brick','peat'].forEach(t=>{setTool('place',t,ki);showBar();out.spots[t]=!!(PEND&&PEND.kind==='place'&&PEND.ok&&PEND.jt>=0)});
  setTool('inspect');run(500,100);
  /* history on the way: the government in Kaunas, the Red Army in Vilnius in January 1919, Poland from April, Latvia's coast */
  out.vil19=[S.own.vr,S.own.vr2,S.own.by,S.own.lv,S.own.pal,S.own.pl,capital().n,T('Vilnius').lock].join(',');out.sejny=ymd(S.day)>='1919-08-23';
  out.red19=S.log.some(l=>/Red Army takes Vilnius/.test(l.t))&&S.log.some(l=>/Vilnius region is lost/.test(l.t));
  /* growth, counted on the towns Lithuania holds now */
  const openT=S.towns.map((x,n)=>n).filter(n=>!S.towns[n].lock),tt={pop:openT.reduce((a,n)=>a+S.towns[n].pop,0)};out.pop0=openT.reduce((a,n)=>a+pop00[n],0);
  /* dashboards: problems with fixes, goods made and used, the country's view, and the camera offset under a panel */
  const iss=townIssues(ki),nat=natIssues(),gr=goodsRows(-1),grain=gr.find(x=>x.r==='grain');out.dash={iss:iss.length,fixes:iss.reduce((a,x)=>a+x.fix.length,0),nat:nat.length,goods:gr.length,
    grainMade:grain?Math.round(grain.mk):0,grainUsed:grain?Math.round(grain.us):0,urgent:urgentCount(),series:S.series.length,trend:popTrend()};
  S.towns.forEach((x,n)=>{if(!x.lock)townIssues(n)});out.alerts=S.towns.filter(x=>townAlert(x,true)>0).length;
  navTo('build');renderPanel(true);CATS.forEach(([c])=>{act({act:'bcat',cat:c});renderPanel(false)});act({act:'bback'});navTo('nat');act({act:'iss',k:nat.length?nat[0].k:'x'});act({act:'tsort',k:'size'});act({act:'tall'});renderPanel(false);
  {VOFF.ty=VOFF.y=120;applyCam();const g=groundAt(cw/2,ch/2-120);out.voff=!!g&&Math.hypot(g[0]-cam.x,g[1]-cam.z)<cam.dist*0.01;VOFF.ty=VOFF.y=0;applyCam()}out.day2=S.day;out.pop=tt.pop;out.funds=S.funds;out.inc=S.inc;
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
  /* history: Żeligowski marches on Vilnius in October 1920. Defending it works only with enough security; holding the line at
     Širvintos, as happened, loses the Vilnius region to Poland and makes Kaunas the temporary capital */
  out.vol=S.hist.picks.volunteers===0;jump('1920-07-15');out.red20=[S.own.vr,S.own.by,capital().n].join(',');
  jump('1920-08-27');out.back20=[S.own.vr,S.own.vr2,capital().n,T('Vilnius').lock].join(',');jump('1920-10-08');S.speed=2;tick();out.card0=S.hist.cards[0];const s20=keep();
  S.hist.sec=40;act({act:'card',o:'1'});out.defend=S.own.vr==='lt'&&!T('Vilnius').lock&&capital().n==='Vilnius';back(s20);
  S.hist.sec=10;act({act:'card',o:'1'});out.defendFail=S.own.vr==='pl'&&T('Vilnius').lock===1;back(s20);
  const vb=S.bld.find(b=>b.t!=='house'&&b.t!=='hall'&&b.t!=='landmark'&&b.town===tIdx('vil'));act({act:'card',o:'0'});analyze();tick();
  out.lost=[S.own.vr,S.own.vr2,S.own.by,capital().n,T('Vilnius').lock,T('Kaunas').capital].join(',');out.lostB=vb?vb.town===-1&&/Poland/.test(vb.why):true;
  out.vilRoute=(S.routes.find(r=>S.towns[r.a].id==='vil'||S.towns[r.b].id==='vil')||{}).why||'';out.offEdges=[...EDGES.values()].filter(e=>e.off).length;
  out.gates1=[bp(24.95,54.75),bp(26.0,54.95)].join(',');out.req=eraReq()[0].t;
  /* the Hymans plan: a union with Poland brings Vilnius back, and takes Lithuania into Poland's war in 1939 */
  jump('1921-09-03');tick();out.card4=S.hist.cards[0];const s21=keep();act({act:'card',o:'1'});out.union=S.own.vr==='lt'&&S.hist.union===1&&S.mkt.pl.open;
  jump('1939-09-18');out.unionWar=S.hist.path==='soviet';back(s21);act({act:'card',o:'0'});
  /* the litas, and what keeping the German mark would have cost */
  jump('1922-10-02');S.funds=20000;tick();const s22=keep();act({act:'card',o:'1'});jump('1923-11-21');const fm=S.funds;back(s22);out.litasCard=S.hist.cards[0];act({act:'card',o:'0'});
  jump('1923-11-21');out.markLoss=[Math.round(fm),Math.round(S.funds)];
  out.pal=[S.own.pal,T('Palanga').lock].join(',');out.kr=[S.own.kr,T('Klaipėda').lock].join(',');
  /* history: the Klaipėda trial card in December 1934 pauses the game; letting it go ahead closes the German market */
  jump('1934-12-14');S.speed=2;tick();out.card1=S.hist.cards[0];out.paused=S.speed===0;act({act:'card',o:'0'});out.trial=!S.mkt.de.open&&S.speed===2&&S.hist.picks.trial===0;
  /* Vilnius comes back in October 1939 with the Soviet bases, the rest of its region in November 1940 */
  jump('1939-10-29');out.back39=[S.own.kr,S.own.vr,S.own.vr2,capital().n,T('Švenčionys').lock,S.own.pl].join(',');
  /* the Soviet ultimatum, accepted as in 1940: a planned economy with deliveries to the Union */
  jump('1940-06-14');tick();out.card2=S.hist.cards[0];act({act:'card',o:'0'});out.soviet=S.hist.path==='soviet'&&!S.mkt.gb.open&&S.mkt.su.open&&!S.deals.length;
  jump('1940-11-07');out.back40=[S.own.vr2,T('Švenčionys').lock].join(',');out.dec=decisions().map(d=>d.as).join('');
  jump('1946-01-01');out.potsdam=[S.own.ep,S.own.ru,S.own.pl].join(',');tick();out.plan=!!S.plan&&S.plan.y===1946&&Object.keys(S.plan.tgt).length>=5;
  const sti=S.towns.findIndex((x,n)=>!x.lock&&townGates(n).has('rail'));if(sti>=0){S.towns[sti].stock.grain=140;addDeal('su','grain','out',4,sti)}
  for(let q=0;q<3;q++)tick();out.planGot=S.plan?(S.plan.got.grain||0):0;S.tab='trade';renderPanel(true);renderPanel(false);
  jump('1947-01-01');tick();out.plans=(S.hist.plans||[]).length;out.card3=S.hist.cards[0];act({act:'card',o:'0'});out.collect=S.hist.collect===1&&S.plan&&S.plan.y===1947;
  out.finite2=S.towns.every(x=>isFinite(x.pop)&&x.pop>=0&&RES.every(q=>isFinite(x.stock[q]||0)))&&isFinite(S.funds);
  /* paving: in the Industrialization era a road drawn between two towns upgrades the old dirt road it follows */
  {const e0=S.era;S.era=2;setTool('road');const U=S.towns[tIdx('ukm')],A=S.towns[tIdx('any')];tapTool(U.x,U.z);tapTool(A.x,A.z);out.pave={up:PEND&&PEND.upKm||0,km:PEND&&PEND.km||0,bad:PEND&&PEND.bad||''};
    S.funds+=5000;S.towns.forEach(t=>{t.stock.bricks=200});const p2=NET.km.road[2];doConfirm();analyze();out.pave.added=NET.km.road[2]-p2;setTool('inspect');S.era=e0}
  selectTown(ki,true);renderPanel(true);['routes','trade','nat','chron','sel'].forEach(tb=>{S.tab=tb;renderPanel(true);renderPanel(false)});
  const wh=S.bld.find(x=>x.t==='warehouse');if(wh){selectBuilding(wh,true);renderPanel(true)}navTo('build');act({act:'bcat',cat:'industry'});act({act:'close'});
  ['road','rail','zone','bull'].forEach(k=>{setTool(k);showBar()});setTool('inspect');
  [2,8,30,90,400].forEach(d=>{cam.dist=d;cam.anim=null;run(3,16)});
  out.tut=TUT.step;S.speed=0;const snap={day:S.day,b:S.bld.length,r:S.routes.length,f:Math.round(S.funds),e:S.edges.length,l:S.lots.length},str=JSON.stringify(serialize(),SAVE_NUM);
  restore(JSON.parse(str));analyze();initScene();run(3,16);
  out.roundtrip=S.day===snap.day&&S.bld.length===snap.b&&S.routes.length===snap.r&&Math.round(S.funds)===snap.f&&S.edges.length===snap.e&&S.lots.length===snap.l;
  out.saveKB=Math.round(str.length/1024);out.saved=!!localStorage.getItem(SAVE_KEY);
  /* a new version drops the saves of older ones and keeps the tutorial's note */
  localStorage.setItem('lietuva1918-v6','{}');localStorage.setItem('lietuva1918-tutorial','done');
  out.drop=dropOldSaves()&&localStorage.getItem('lietuva1918-v6')===null&&localStorage.getItem('lietuva1918-tutorial')==='done'&&!!localStorage.getItem(SAVE_KEY)&&!dropOldSaves();return out})()`;
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
assert(o.gates === 'de,de,de,de,de', `in 1918 every border post faces German-held land: East Prussia, Courland, Belarus, the Suwałki region, the Klaipėda Region (${o.gates})`);
assert(o.own0 === 'de,de,lt,lt,de' && o.nb0 === 'de,de,de,de' && o.lock0 === '1100' && o.cap0 === 'Vilnius', `the borders of 1918: the Klaipėda Region German, the Palanga coast and the neighbours German-held, the Vilnius region Lithuanian, Vilnius the capital (${o.own0}; ${o.nb0}; locks ${o.lock0})`);
assert(o.palMsg === 'The Palanga coast is held by Germany' && o.rg0 === ',vr,,vr,vr2', `nothing can be built on land others hold, and the 1920 line puts each town on its side (${o.palMsg}; Perloja, Varėna, Vievis, Turmantas, Druskininkai: ${o.rg0})`);
assert(o.lbl0 === 'MAŽOJI LIETUVA\nVokietija' && o.bord0 > 300, `the map names the Klaipėda Region as part of Germany and draws Lithuania's border of the day (${o.bord0} pieces)`);
assert(o.ep > 20000 && o.oldBord > 40 && o.lbl1 === 'LATVIJA\nVokietijos užimta|MOZŪRIJA\nVokietija|BALTARUSIJA\nVokietijos užimta', `today's Poland splits on the old border of East Prussia (${o.ep} cells of Masuria, ${o.oldBord} pieces of the old line), and the map names who holds each neighbour (${o.lbl1.replace(/\n/g, ' / ')})`);
assert(o.roadPend && o.roadAdded > 0.5, `road tool builds a road from Kaunas toward Alytus${o.roadWhy ? ': ' + o.roadWhy : ` (${(o.roadAdded || 0).toFixed(1)} km new)`}`);
assert(o.tap1 && o.undo && o.tapRoad && o.tapAdded > 0.5, `a road drawn by taps: start, a bend undone, an end (${o.tapWhy || (o.tapAdded || 0).toFixed(1) + ' km new'})`);
assert(o.newRouteOk, 'new road route Kaunas–Alytus is created and valid');
assert(o.routeEdit, 'route editor: vehicles, cargo and commuters change');
assert(o.placed.every(Boolean), `warehouse, school, pig farm and dairy farm can be placed near Kaunas (${o.placed.join(', ')})`);
assert(o.zoneN > 0, `zone tool zones lots along a street (${o.zoneN})`);
assert(o.zoneTaps.length === 2 && o.zoneTaps[1] > o.zoneTaps[0] && o.zoneUndo, `zoning by taps adds street after street, and undo takes one back (${o.zoneTaps.join(' then ')} lots)`);
assert(Object.values(o.spots).filter(Boolean).length >= 5 && o.spots.farm && o.spots.warehouse, `the build menu finds a spot near Kaunas that a town takes in (${Object.entries(o.spots).map(([k, x]) => k + (x ? ' ✓' : ' ✗')).join(', ')})`);
assert(o.dash.goods >= 5 && o.dash.grainMade > 0 && o.dash.grainUsed > 0 && o.dash.series > 50, `dashboards: ${o.dash.goods} goods tracked, grain ${o.dash.grainMade} made and ${o.dash.grainUsed} used a day, ${o.dash.series} weekly samples`);
assert(o.dash.iss >= 0 && o.dash.nat >= 0 && isFinite(o.dash.trend), `problems found: ${o.dash.iss} in Kaunas with ${o.dash.fixes} fixes, ${o.dash.nat} kinds nationwide, ${o.dash.urgent} places urgent, ${o.alerts} flagged on the map`);
assert(o.voff, 'with a panel open, the camera centres its target in the part of the map that stays visible');
assert(o.railAdded > 0.5, `rail tool lays track from a station${o.railWhy ? ': ' + o.railWhy : ` (${(o.railAdded || 0).toFixed(1)} km)`}`);
assert(o.pigGone, 'remove tool demolishes a building');
assert(o.day2 > o.day1 + 500, `game time advances (day ${o.day2})`);
assert(o.finite, 'no NaN or infinite values in towns or treasury');
assert(o.pop > o.pop0, `towns grow (${Math.round(o.pop0)}k to ${Math.round(o.pop)}k residents, ${o.housesNow} house lots, income ${o.inc.toFixed(1)} Lt a day)`);
assert(o.steady, `towns and villages keep their 1918 size without help${o.low ? ' (shrank: ' + o.low + ')' : ''}`);
assert(o.moved > 0, `the new route carries goods (${o.moved.toFixed(1)} a day)`);
assert(o.post, `a border post in Kybartai trades with Germany (${o.postWhy})`);
assert(o.deal, `a deal sells grain to Germany (${o.dealWhy})`);
assert(o.vil19 === 'pl,pl,pl,lv,lv,' + (o.sejny ? 'pl' : 'de') + ',Kaunas,1' && o.red19, `the government moves to Kaunas, the Red Army takes Vilnius in January 1919 and Poland in April; Latvia takes the Palanga coast (${o.vil19})`);
assert(o.red20 === 'ra,ra,Kaunas' && o.back20 === 'lt,lt,Kaunas,0', `the Red Army takes Vilnius in July 1920 and hands it to Lithuania in August, while the government stays in Kaunas (${o.red20}; ${o.back20})`);
assert(o.vol && o.card0 === 'vilnius', `the 1918 volunteers card is answered in play, and Żeligowski's march on Vilnius comes on 8 October 1920 (${o.card0})`);
assert(o.defend && o.defendFail, 'defending Vilnius holds the city with security 40, and fails with security 10');
assert(o.lost === 'pl,pl,pl,Kaunas,1,1' && o.lostB && /Poland/.test(o.vilRoute), `holding the line at Širvintos, as happened, loses the Vilnius region to Poland, and Kaunas stays the temporary capital (${o.lost}; ${o.vilRoute})`);
assert(o.offEdges > 300 && o.gates1 === 'pl,pl' && /^6\d0k/.test(o.req), `nothing travels through the lost region (${o.offEdges} lines), border posts face Poland, and the next era asks less: ${o.req}`);
assert(o.card4 === 'hymans' && o.union && o.unionWar, 'the Hymans plan: a union with Poland brings Vilnius back, and Soviet occupation in September 1939');
assert(o.litasCard === 'litas' && o.markLoss[0] < o.markLoss[1], `keeping the German mark costs half the treasury in 1923 (${o.markLoss.join(' Lt against ')} Lt with the litas)`);
assert(o.pal === 'lt,0' && o.kr === 'lt,0', 'Palanga joins in March 1921, and the Klaipėda Region after the revolt of January 1923');
assert(o.back39 === 'de,lt,by,Vilnius,1,de' && o.back40 === 'lt,0' && o.potsdam === 'pl,ru,pl', `Vilnius returns in October 1939 and is the capital again; Švenčionys follows in November 1940; Masuria goes to Poland and Königsberg to the Soviet Union in 1945 (${o.back39}; ${o.back40}; ${o.potsdam})`);
assert(/^1+$/.test(o.dec), `the chronicle counts every decision as history went (${o.dec})`);
assert(o.card1 === 'trial' && o.paused && o.trial, `the Klaipėda trial card pauses the game, and holding the trial closes the German market (${o.card1})`);
assert(o.card2 === 'ultimatum' && o.soviet, `accepting the Soviet ultimatum starts Soviet rule and closes Western markets (${o.card2})`);
assert(o.plan && o.planGot > 0, `the state plan sets targets and deliveries count (${o.planGot.toFixed(1)} grain)`);
assert(o.plans === 1 && o.card3 === 'collect' && o.collect, `a plan year closes, and collectivization comes in 1947 (${o.card3})`);
assert(o.finite2, 'no NaN or infinite values after the jumps through history');
assert(o.pave.up > 1 && o.pave.added > (o.pave.up + o.pave.km) * 0.8, `a paved road from Ukmergė to Anykščiai upgrades ${(o.pave.up || 0).toFixed(1)} km of old road and builds ${(o.pave.km || 0).toFixed(1)} km${o.pave.bad ? ': ' + o.pave.bad : ''} (paved km +${(o.pave.added || 0).toFixed(1)})`);
assert(o.roundtrip, `save and reload keep the game intact (${o.saveKB} KB)`);
assert(o.saved, 'autosave writes to localStorage');
assert(o.drop, 'a new version removes saves of older versions and keeps the tutorial note');
assert(o.tut0 && o.tut >= 1, `the first-time tutorial starts and follows the player (reached step ${o.tut + 1})`);
if (failed) { console.error(`\n${failed} check${failed > 1 ? 's' : ''} failed`); process.exit(1); }
console.log('\nSmoke test passed.');
