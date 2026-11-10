#!/usr/bin/env node
/* Headless smoke test. Loads every script in a stub browser (tools/headless.js: one vm context, one script at a time,
   exactly like separate <script> tags). three.js runs for real and builds every mesh; only the WebGL renderer is replaced.
   It boots the game, drives the tools and the route editor the way the UI does, plays about two in-game years,
   walks history through its borders and decisions (as they happened, and the other ways), renders every panel and
   zoom level, then saves and reloads. Exit code 1 on any exception or failed assertion.
   Extend it whenever you add a system. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
let failed = 0;
const assert = (c, m) => { if (c) console.log('✓ ' + m); else { console.error('✗ ' + m); failed++; } };

/* ---- the game in a stub browser (tools/headless.js) ---- */
const { sandbox, order } = require('./headless.js')(root);
assert(true, `loaded ${order.length} scripts in index.html order`);

/* ---- play session (runs inside the game's global scope) ---- */
const session = `(function(){const out={};let t=0;
  /* the player answers each decision card as history went */
  const hopt=id=>Math.max(0,CARDS[id].opts.findIndex(o=>o.h));out.news=[];
  /* news cards (history that moves a border) are read; decision cards are answered as history went */
  const answer=()=>{for(;;){if(S.hist.news.length){out.news.push(S.hist.news[0].id);act({act:'newsok'})}else if(S.hist.cards.length)act({act:'card',o:String(hopt(S.hist.cards[0]))});else break}};
  const run=(n,dt)=>{for(let q=0;q<n;q++){t+=dt;rafCb(t);answer()}};
  /* history without the economy, a day at a time, answering cards as history went unless pick says otherwise */
  const jump=(ds,pick)=>{const end=Math.round((Date.parse(ds)-START)/864e5)-1;while(S.day<end){S.day++;histTick();while(S.hist.news.length)readNews();while(S.hist.cards.length){const id=S.hist.cards[0];pickCard(pick&&pick[id]!==undefined?pick[id]:hopt(id))}}};
  const keep=()=>JSON.stringify(serialize(),SAVE_NUM),back=s=>{restore(JSON.parse(s));analyze()},T=n=>S.towns.find(x=>x.n===n);
  /* a new game opens on its intro, paused on 16 February 1918, with every town housed and a first ministry task */
  showCard();out.intro=S.intro===1&&S.speed===0&&S.day===0&&document.getElementById('card').innerHTML.includes('Act of Independence');{const K=T('Kaunas');out.kauHomes=K.house>=K.pop0&&K.note!=='Overcrowded'}
  out.task0=(curTask()||{}).id;act({act:'intro'});out.introGone=!S.intro;
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
  cam.dist=12;cam.x=kau.x;cam.z=kau.z;applyCam();kau.stock.timber=600;kau.stock.planks=600;S.funds+=4000;
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
  /* no hunger from a village's starting stock, no cold homes in summer, one warning line a day, and routes to lost land cost nothing */
  out.hungry=S.towns.filter(x=>!x.lock&&x.fed<0.97).length;out.coldSummer=S.log.filter(l=>/are cold/.test(l.t)&&[5,6,7].includes(dOf(l.d).getUTCMonth())).length;
  {const days={};S.log.filter(l=>/Food is running out/.test(l.t)).forEach(l=>{days[l.d]=(days[l.d]||0)+1});out.warnDays=Math.max(0,...Object.values(days))}
  {const r=S.routes.find(q=>S.towns[q.a].id==='vil'||S.towns[q.b].id==='vil');out.heldRoute=!!r&&r.held===1&&/at no cost/.test(r.why)}
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
  const ky=S.towns.find(x=>x.id==='kyb'),kyi=S.towns.indexOf(ky);cam.dist=8;cam.x=ky.x;cam.z=ky.z;applyCam();ky.stock.planks=200;ky.stock.grain=140;S.funds+=2000;
  const post=(()=>{setTool('place','customs');for(let rr=0.4;rr<4;rr+=0.2)for(let q=0;q<24;q++){const an=q/24*Math.PI*2;setGhost(ky.x+Math.sin(an)*rr,ky.z+Math.cos(an)*rr);
    if(PEND&&PEND.ok&&PEND.ti===kyi&&!missing(PEND.cost,ky)){const n=S.bld.length;doConfirm();return S.bld.length===n+1?S.bld[S.bld.length-1]:null}}return null})();
  /* the post is a building site first: it trades only once the builders are done */
  setTool('inspect');analyze();out.postSite=!!post&&!!post.c&&!townGates(kyi).has('de');for(let q=0;q<40&&post&&post.c;q++)tick();analyze();
  out.post=!!post&&!post.c&&post.town===kyi&&post.gate==='de';out.postWhy=post?post.gate+' town '+post.town:'not placed';
  addDeal('de','grain','out',5,kyi);S.speed=0;const f0=S.funds;for(let q=0;q<3;q++)tick();const dl=S.deals[0];out.deal=dl.done>0&&dl.val>0;out.tb=sumVals(S.tb.ex)>0&&S.tb.eg.grain>0&&S.tb.ex.de>0;out.dealWhy=dl.why||dl.done.toFixed(1)+' a day for '+dl.val.toFixed(0)+' Lt';
  S.tab='trade';renderPanel(true);renderPanel(false);out.tb=out.tb&&document.getElementById('pbody').innerHTML.includes('Trade balance');
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
  out.drop=dropOldSaves()&&localStorage.getItem('lietuva1918-v6')===null&&localStorage.getItem('lietuva1918-tutorial')==='done'&&!!localStorage.getItem(SAVE_KEY)&&!dropOldSaves();
  /* ---- v0.11, on a fresh game ---- */
  newGame();analyze();S.intro=0;S.speed=0;setTool('inspect');
  /* the army's budget is paid before the day's balance is counted, so the balance shows it */
  S.hist.def=25;for(let q=0;q<60;q++)tick();out.budArmy=Math.round(S.bud.army);out.budGap=Math.abs(Object.entries(S.bud).reduce((a,[k,x])=>a+(k==='build'||k==='homes'?0:x),0)-S.inc);S.hist.def=0;
  /* stations, warehouses and border posts say what they do */
  out.idle=S.bld.filter(b=>IDLE.has(b.t)&&b.town>=0&&!S.towns[b.town].lock).map(b=>b.why);
  /* a drawn map twice the real size, shown in real km, its terrain shipped packed; paved roads from 1918, dirt by default */
  out.km=[MAPK,kmTxt(TERRITORY),Math.round(MAPU)].join(',');out.ras=!!(WORLD1918.ras&&WORLD1918.ras.n===GW*GH);out.paved1=S.era===1&&roadMax()===2&&lineLevel('road')===1;
  /* houses by place: city tenements, town houses, farmsteads */
  out.sty=[...new Set(S.bld.filter(b=>b.t==='house'&&b.lv===1).map(lotStyle))].sort().join('');
  /* streets: in towns, few loose ends that serve nothing */
  {space();const used=new Set();S.bld.forEach(b=>{const a=accessOf(bOBB(b),'road');if(a)used.add(a.e.id)});S.lots.forEach(l=>{const a=accessOf(lotOBB(l),'road');if(a)used.add(a.e.id)});let loose=0;
   EDGES.forEach(e=>{if(e.k!=='road'||used.has(e.id))return;const A=NODES.get(e.a),B=NODES.get(e.b);if((A.e.length===1)!==(B.e.length===1)){const n=A.e.length===1?A:B,t=S.towns[nearestTown(n.x,n.z)];if(t&&!t.vil&&Math.hypot(n.x-t.x,n.z-t.z)<(t.R||1)+0.5)loose++}});out.loose=loose}
  /* a deal keeps half the store; a sale by sea counts for the port task */
  {setOwner('kr','lt');analyze();const kl=S.towns.findIndex(t=>t.n==='Klaipėda'),KL=S.towns[kl];KL.stock.timber=KL.cap;S.deals=[];const d=addDeal('gb','timber','out',100,kl);
   for(let q=0;q<3;q++){runDeals();checkObj()}out.keep=Math.round((KL.stock.timber||0)/KL.cap*100);out.portTask=!!S.obj.port&&S.stats.portSales>0;S.deals=[]}
  /* merchants carry a full store's dairy to its neighbours; a route in auto mode moves a full store's surplus */
  {const kd=S.towns.findIndex(t=>t.n==='Kėdainiai'),KD=S.towns[kd];KD.stock.dairy=KD.cap;let mv=0;for(let q=0;q<10;q++){tick();TRADES.forEach(([L,r,qq])=>{if(r==='dairy')mv+=Math.abs(qq)})}out.trade=mv;
   const jn=S.towns.findIndex(t=>t.n==='Jonava'),r=addRoute(kd,jn,'rail','steam',1,false);routeEval(r);KD.stock.timber=KD.cap;S.towns[jn].stock.timber=5;for(let q=0;q<10;q++)tick();out.surplus=[Math.round(KD.stock.timber),Math.round(S.towns[jn].stock.timber)];S.routes.splice(S.routes.indexOf(r),1)}
  /* a new railway into old track curves onto it, like a switch */
  {let best=null;EDGES.forEach(e=>{if(e.k!=='rail'||e.L<12||e.off)return;const q=polyAt(e.p,e.c,e.L/2),ti=nearestTown(q[0],q[1]),d=Math.hypot(S.towns[ti].x-q[0],S.towns[ti].z-q[1]);if(d>6&&(!best||e.L>best.e.L))best={e,q}});
   const {q}=best,P=[q[0]-q[3]*4,q[1]+q[2]*4];S.funds+=1e5;S.towns.forEach(t=>{t.stock.timber=600});cam.dist=12;setTool('rail');tapTool(P[0],P[1]);tapTool(q[0],q[1]);const before=new Set(EDGES.keys());doConfirm();analyze();setTool('inspect');
   const made=[...EDGES.values()].filter(x=>x.k==='rail'&&!before.has(x.id)),nl=made.find(m=>NODES.get(m.a).e.length===1||NODES.get(m.b).e.length===1),ang=[];
   if(nl){const jid=NODES.get(nl.a).e.length===1?nl.b:nl.a,tm=nl.a===jid?polyAt(nl.p,nl.c,0.05):polyAt(nl.p,nl.c,nl.L-0.05);
     NODES.get(jid).e.map(i=>EDGES.get(i)).filter(x=>x!==nl&&x.k==='rail').forEach(o=>{const to=o.a===jid?polyAt(o.p,o.c,0.05):polyAt(o.p,o.c,o.L-0.05);ang.push(Math.acos(Math.min(1,Math.abs(tm[2]*to[2]+tm[3]*to[3])))*180/Math.PI)})}
   out.turn=ang.length?Math.min(...ang):99}
  /* a station placed away from the streets gets its road laid out in the Road tool */
  {cam.dist=12;setTool('place','station');let spot=null;
   for(const e of EDGES.values()){if(spot)break;if(e.k!=='rail'||e.off)continue;for(let s=0.3;s<e.L&&!spot;s+=0.4){const q=polyAt(e.p,e.c,s);setGhost(q[0]-q[3]*0.3,q[1]+q[2]*0.3);if(PEND&&PEND.ok&&PEND.jt>=0&&!PEND.acc)spot=PEND}}
   out.ghostAcc=spot?spot.acc:null;if(spot){S.towns[spot.ti].stock.timber=600;S.funds+=1e4;doConfirm()}out.access=TOOL.k==='road'&&!!PEND&&PEND.kind==='line'&&!PEND.bad;setTool('inspect')}
  /* a decision card waits for a choice and a confirm; a shown route can be hidden from its pill; the production view draws */
  {S.hist.cards=['volunteers'];showCard();const h=document.getElementById('card').innerHTML;out.confirm=h.includes('data-confirm')&&h.includes('data-pick');S.hist.cards=[];showCard();
   VIEW.route=S.routes[0].id;VIEW.sheet=0;updateTask();out.pill=document.getElementById('task').dataset.k==='route';VIEW.route=null;
   VIEW.prod='all';for(const d of [10,300]){cam.dist=d;applyCam();draw(0.016)}VIEW.prod='grain';draw(0.016);VIEW.prod=null;out.prodOk=true}
  /* ---- v0.12, on a fresh game: building sites, carters, chains, winter fuel, the state ---- */
  newGame();analyze();S.intro=0;S.speed=0;setTool('inspect');
  {const html=()=>document.getElementById('pbody').innerHTML;
   const plan=(type,town)=>{const ti=S.towns.indexOf(town);setTool('place',type,ti);let b=null;if(PEND&&PEND.kind==='place'&&PEND.ok&&PEND.jt===ti){const n=S.bld.length;doConfirm();if(S.bld.length===n+1)b=S.bld[S.bld.length-1]}setTool('inspect');return b};
   let K=T('Kaunas'),kk=S.towns.indexOf(K);
   /* a plan with no money to take (the whole treasury is kept back): it stands as a site, gives no work and takes nothing */
   S.keep=1e9;K.stock.planks=200;const dairy=plan('dairy',K);for(let q=0;q<3;q++)tick();
   out.sitePlan=!!dairy&&isSite(dairy)&&!(dairy.c.g.lt>0)&&dairy.cw==='Waiting for money'&&siteInfo(dairy).st==='wait'&&!BYT[kk].includes(dairy)&&townIssues(kk).some(x=>x.k==='site:lt');
   /* the reserve lifted: money and the town's planks arrive, the builders need their days, then it works */
   S.keep=0;{const d0=S.day;let n=0;while(dairy.c&&n++<80)tick();out.siteDays=S.day-d0}
   checkObj();out.siteDone=!dairy.c&&S.stats.built===1&&S.obj.built===1&&out.siteDays>=BT.dairy.bd&&out.siteDays<=BT.dairy.bd+2;for(let q=0;q<4;q++)tick();out.siteWorks=dairy.eff>0&&BYT[kk].includes(dairy);
   /* carters: a town with no planks gets them from the nearest town with some to spare, a few loads a day */
   const P=T('Prienai'),pi=S.towns.indexOf(P);P.stock.planks=0;const sch=plan('school',P);tick();
   out.cart=!!sch&&!!sch.hf&&sch.hf.planks!==undefined&&sch.c.g.planks>0&&sch.c.g.planks<=HAUL+1e-6&&/Carts bring planks from /.test(siteTxt(sch));out.cartFrom=sch&&sch.hf?S.towns[sch.hf.planks].n+' '+sch.c.g.planks.toFixed(1):'';
   /* with no planks anywhere and no sawmill at work, the site waits and the town says so */
   {const saws=S.bld.filter(b=>b.t==='sawmill');saws.forEach(b=>{b.on=false});const old=S.towns.map(t=>t.stock.planks||0);S.towns.forEach(t=>{t.stock.planks=0});for(let q=0;q<14;q++)tick();
    out.dry=sch.cw==='Waiting for planks'&&siteInfo(sch).st==='wait'&&townIssues(pi).some(x=>x.k==='site:planks'&&x.fix.length>0);out.dryWhy=sch.cw;saws.forEach(b=>{b.on=true});S.towns.forEach((t,i)=>{t.stock.planks=old[i]})}
   /* a plan given up returns what its site had taken */
   {const got={...sch.c.g},fb=S.funds,pb=P.stock.planks||0;act({act:'scancel',id:String(sch.id)});out.cancel=!BMAP.has(sch.id)&&Math.abs(S.funds-fb-(got.lt||0))<0.01&&Math.abs((P.stock.planks||0)-pb-(got.planks||0))<0.01}
   /* hold and build first; the site's card and the country's works list */
   K.stock.planks=200;const wh=plan('warehouse',K);act({act:'shold',id:String(wh.id)});tick();out.hold=wh.c.hold===1&&!(wh.c.g.lt>0)&&siteInfo(wh).st==='hold';
   act({act:'shold',id:String(wh.id)});act({act:'spri',id:String(wh.id)});tick();out.pri=wh.c.pri===1&&wh.c.g.lt>0&&SITES[0]===wh;
   selectBuilding(wh,true);renderPanel(true);out.siteCard=html().includes('On site')&&html().includes('Cancel the plan');
   {const seen=[];navTo('nat');['over','eco','works','towns','state'].forEach(k=>{act({act:'nseg',k});renderPanel(false);seen.push(html().length>300)});
    act({act:'nseg',k:'works'});out.worksView=html().includes('Building sites')&&html().includes('Keep in the treasury')&&html().includes('Warehouse');
    act({act:'nseg',k:'state'});out.stateView=html().includes('Public trust')&&html().includes('What moves trust')&&html().includes('Taxes')&&html().includes('Road gangs');
    act({act:'nseg',k:'eco'});out.ecoView=html().includes('Money a day')&&html().includes('Goods in Lithuania a day')&&html().includes('From field to shop');
    act({act:'good',r:'planks'});out.goodView=VIEW.good==='planks'&&html().includes('Sawmill')&&html().includes('Used for');act({act:'goodback'});out.segs=seen.every(Boolean)&&VIEW.good===null&&VIEW.nseg==='eco'}
   /* goods and chains: sawmills saw planks, Šiauliai brews beer, cement waits for its era */
   for(let q=0;q<8;q++)tick();{const gi=goodInfo('planks');out.chain=gi.makers.join()==='sawmill'&&gi.users.includes('furniture')&&gi.mk>0&&goodOpen('planks')&&!goodOpen('cement')&&CHAINS.some(c=>c.join()==='timber,planks,furniture')&&(T('Šiauliai').mk.beer||0)>0;out.chainWhy=gi.mk.toFixed(1)+' planks a day';
    /* shops: towns fetch the beer they want from Šiauliai, which brews more than it drinks */
    out.shops=S.towns.filter(t=>!t.lock&&!t.vil&&t.n!=='Šiauliai'&&(t.want.beer||0)>=0.99).length}
   /* a site kept through save and load */
   {const p0=wh.c.p,g0=wh.c.g.lt,id=wh.id,s0=keep();back(s0);const w2=BMAP.get(id);out.siteSave=!!w2&&!!w2.c&&Math.abs(w2.c.p-p0)<1e-3&&Math.abs(w2.c.g.lt-g0)<0.01&&w2.c.pri===1;tick();out.siteSave=out.siteSave&&!!BMAP.get(id).c;K=T('Kaunas');kk=S.towns.indexOf(K)}
   /* a modernization is a site on a building that keeps working */
   {S.era=2;S.eraDay=S.day;const saw=S.bld.find(b=>b.t==='sawmill'&&b.town===kk&&!b.c);K.stock.bricks=100;K.stock.metal=20;K.stock.timber=400;act({act:'up',id:String(saw.id)});
    out.upSite=!!saw.c&&saw.c.up===1&&!isSite(saw);tick();out.upWorks=saw.eff>0&&BYT[kk].includes(saw);let n=0;while(saw.c&&n++<60)tick();out.upDone=!saw.c&&saw.lv===2;out.upDays=n;out.eraLit=eraReq().some(x=>/Power for every linked town/.test(x.t)&&!x.ok)&&eraReq().some(x=>/sold abroad/.test(x.t));
    /* a new era is not a cliff: its wants set in over WANT_YEARS */
    S.eraDay=S.day;for(let q=0;q<25;q++)tick();const h0=K.h,n0=K.note;S.eraDay=S.day-WANT_YEARS*365;for(let q=0;q<25;q++)tick();
    out.wants=wantK()===1&&!/^Want|Blackouts/.test(n0)&&/^Want|Blackouts/.test(K.note)&&K.h<h0-3;out.wantsWhy=n0+' '+h0.toFixed(0)+' → '+K.note+' '+K.h.toFixed(0);S.era=1;S.eraDay=0}
   /* winter fuel: a town that outgrew its woodlots keeps a winter's fuel, which its sawmill may not burn, and takes in no one until it has it */
   {const saw=S.bld.find(b=>b.t==='sawmill'&&b.town===kk&&!b.c);K.pop=K.pop0+20;K.stock.peat=0;K.stock.timber=40;tick();const iss=townIssues(kk);
    out.fuel=K.fkeep>80&&K.nofuel===1&&saw.why==='Fuel kept for homes'&&K.stock.timber>=38&&iss.some(x=>x.k==='kept')&&iss.some(x=>x.k==='fuel');out.fuelWhy=[Math.round(K.fkeep),K.nofuel,saw.why,Math.round(K.stock.timber)].join(' ');
    K.stock.peat=K.cap;K.stock.timber=K.cap;tick();tick();out.fuelOk=K.nofuel===0&&saw.why!=='Fuel kept for homes';K.pop=K.pop0}
   /* the fix for a town that is not linked lays out a paved road from the nearest linked town, hall to hall; the road paves the
      streets up to both halls, so the town is linked, and its bricks may come from a third town */
   {const B=T('Kudirkos Naumiestis'),bi=S.towns.indexOf(B),fx=(townIssues(bi).find(x=>x.k==='link')||{fix:[]}).fix.find(f=>f.a.act==='linkroad');S.funds+=3000;out.linkFixTxt=fx?fx.t:'';
    if(fx)act(fx.a);out.linkPlan=TOOL.k==='road'&&!!PEND&&PEND.kind==='line'&&!PEND.bad&&TOOL.lv.road===2;
    if(out.linkPlan){S.towns[PEND.ti].stock.bricks=0;B.stock.bricks=0;prepareLine();showBar()}
    const tp=PEND&&PEND.ti>=0?takePlan(PEND.cost,PEND.ti):null;out.farPay=!!tp&&tp.ok&&tp.far;out.linkUp=PEND&&PEND.upKm||0;const l0=NET.linked.has(bi);doConfirm();analyze();setTool('inspect');TOOL.lv.road=1;out.linkTown=!l0&&NET.linked.has(bi)}
   /* power: stations that stand without peat are named before another station is asked for, and the fix is a route from
      the nearest town that has peat to spare, though it is no neighbour (or one more train on the route there is); in the
      Modern era homes come to need twice the power over four years, not on the first day */
   {const s0=keep();K=T('Kaunas');kk=S.towns.indexOf(K);S.era=2;S.eraDay=S.day;S.funds+=20000;K.stock.planks=300;
    const p1=plan('power',K),p2=plan('power',K);[p1,p2].forEach(b=>{if(b)delete b.c});const Sh=T('Šiauliai'),si=S.towns.indexOf(Sh),Tg=T('Tauragė'),gi=S.towns.indexOf(Tg),only=X=>{S.towns.forEach(t=>{t.stock.peat=0});X.stock.peat=500};
    only(Tg);tick();only(Tg);const far=o=>!(NET.adj[kk]||[]).some(n=>{const e=NET.edges[n];return (e.a===kk?e.b:e.a)===o});
    const x=townIssues(kk).find(q=>q.k==='power'),rf=x&&x.fix.find(f=>f.a.act==='newroute');out.gridWhy=x?x.d+' → '+x.fix.map(f=>f.t).join(' | '):'no power problem';
    out.gridWeak=!!p1&&!!p2&&!!x&&/could make 60 MW and makes 0[.] 2 of its 2 power stations are not at full strength: the one in Kaunas is missing peat/.test(x.d)&&!x.fix.some(f=>f.a.act==='build'&&f.a.bt==='power');
    out.farRoute=!!rf&&/^Route from Tauragė, [0-9]+ km$/.test(rf.t)&&+rf.a.a===gi&&+rf.a.b===kk&&far(gi);
    only(Sh);const x2=townIssues(kk).find(q=>q.k==='power'),f2=x2&&x2.fix.find(f=>(f.a.act==='newroute'||f.a.act==='rveh')&&/Šiauliai/.test(f.t));out.gridWhy+=' → '+(f2?f2.t:'no fix from Šiauliai');
    if(f2){const rt=()=>S.routes.find(q=>(q.a===si&&q.b===kk)||(q.a===kk&&q.b===si)),n0=rt()?rt().n:0;act(f2.a);out.farMade=far(si)&&!!rt()&&rt().ok&&rt().n>n0;for(let q=0;q<12;q++)tick();
     out.farFed=p1.eff>0.3&&p2.eff>0.3&&!/peat/.test(p1.why+p2.why)&&(K.pr||0)>0.95;out.gridWhy+=', and the stations run at '+Math.round(p1.eff*100)+'%'}
    S.era=3;S.eraDay=S.day;tick();const d1=K.powD,pp=K.pop;S.eraDay=S.day-WANT_YEARS*365;tick();const d2=K.powD;out.powRamp=d1>0&&Math.abs(d2-d1-pp*0.03)<pp*0.005;out.rampWhy=d1.toFixed(1)+' → '+d2.toFixed(1)+' MW for '+Math.round(pp)+'k';
    setTool('inspect');back(s0);K=T('Kaunas');kk=S.towns.indexOf(K)}
   /* the state: taxes, a policy, public trust */
   {const t0=histTax(),v0=trustParts().v;act({act:'tax',q:'2'});out.tax=histTax()>t0*1.25&&trustParts().v<v0;act({act:'tax',q:'1'});
    act({act:'pol',k:'roads'});tick();out.pol=polOn('roads')&&lineDisc('road')===0.75&&Math.round(BUD.policy)===-POLICY.roads.cost&&!polOpen('schools')&&S.hist.gov==='council';act({act:'pol',k:'roads'})}
   /* the next era asks for more than size: goods sold abroad within a year, and schools for all, which the law allows from October 1922 */
   {const q=eraReq(),ex=q.find(x=>/sold abroad/.test(x.t)),sc=q.find(x=>/Primary schools/.test(x.t));out.eraReq=q.length===6&&!!ex&&!ex.ok&&!!sc&&!sc.ok&&/Oct 1922/.test(sc.q)&&!eraReady();out.eraReqWhy=q.map(x=>x.t+' ['+x.q+']').join('; ');
    const was=S.tb.ex.de;S.tb.ex.de=(was||0)+20000;out.eraEx=eraReq().find(x=>/sold abroad/.test(x.t)).ok;if(was===undefined)delete S.tb.ex.de;else S.tb.ex.de=was}
   /* chance: every random event runs */
   {let bad='';REV.forEach((f,i)=>{try{f()}catch(e){bad+=i+': '+e+' '}});out.rev=!bad;out.revWhy=bad;S.fx=[]}
   /* history: the Bermontians, the Seimas, land reform, the coup of 1926 both ways */
   jump('1919-11-21');tick();out.bermont=S.hist.cards[0]==='bermont';{const s=keep(),sec=S.hist.sec;act({act:'card',o:'1'});out.bermontWait=S.hist.sec===sec-3&&S.hist.mood.some(m=>m.n==='Bermontian looting'&&!!m.at);back(s);act({act:'card',o:'0'});out.bermontWin=S.hist.sec===sec+5}
   jump('1920-05-17');out.seimas=S.hist.gov==='dem'&&!!S.ev.elect20;
   jump('1922-02-15');tick();out.landCard=S.hist.cards[0]==='land';act({act:'card',o:'0'});out.land=S.mod.farm===1.15&&S.hist.ptm.some(m=>m.n==='Land reform');
   jump('1926-12-17');tick();out.coupCard=S.hist.cards[0]==='coup';{const s=keep();S.hist.pt=70;act({act:'card',o:'1'});out.coupHeld=S.hist.gov==='dem'&&S.hist.risk.coup===1;back(s);S.hist.pt=40;act({act:'card',o:'1'});out.coupLost=S.hist.gov==='auth'&&S.hist.risk.coup===0;back(s);act({act:'card',o:'0'});out.coup=S.hist.gov==='auth'}
   act({act:'pol',k:'schools'});out.eraPol=eraReq().find(x=>/Primary schools/.test(x.t)).ok;
   /* September 1939: marching on Vilnius, which did not happen, takes the city and breaks with Britain */
   jump('1939-09-10');tick();out.marchCard=S.hist.cards[0]==='march39';{const s=keep();act({act:'card',o:'1'});out.march=S.own.vr==='lt'&&!S.mkt.gb.open&&capital().n==='Vilnius';back(s);act({act:'card',o:'0'})}
   /* and on through the Soviet years to the restored republic: Union projects, privatization, the litas of 1993 */
   jump('1994-01-01');const pk=S.hist.picks;out.late=S.hist.path==='free'&&S.hist.restored===1&&S.hist.gov==='dem'&&S.hist.priv===1&&pk.cement===0&&pk.chem===0&&pk.privat===0&&pk.litas93===0&&unlocked('cement')&&unlocked('fert');
   out.lateWhy=[S.hist.path,S.hist.restored,S.hist.gov,S.hist.priv,Object.keys(pk).length].join(' ');
   jump('2005-01-01');tick();navTo('nat');act({act:'nseg',k:'state'});renderPanel(true);out.end=isFinite(S.funds)&&ymd(S.day)>='2005-01-01'&&html().includes('Republic of Lithuania');S.tab='chron';renderPanel(true)}
  /* New game waits on its intro, paused, whatever the clock did before */
  S.speed=3;act({act:'reset'});act({act:'reset2'});out.restart=S.speed===0&&S.intro===1&&S.day===0;
  return out})()`;
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
assert(o.postSite && o.post, `a border post in Kybartai is a building site first, then trades with Germany (${o.postWhy})`);
assert(o.deal, `a deal sells grain to Germany (${o.dealWhy})`);
assert(o.vil19 === 'pl,pl,pl,lv,lv,' + (o.sejny ? 'pl' : 'de') + ',Kaunas,1' && o.red19, `the government moves to Kaunas, the Red Army takes Vilnius in January 1919 and Poland in April; Latvia takes the Palanga coast (${o.vil19})`);
assert(['gov19', 'red19', 'pl19'].every(k => o.news.includes(k)), `a card explains each change: the government in Kaunas, the Red Army and then Poland in Vilnius (${o.news.join(', ')})`);
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
assert(o.intro && o.introGone && o.kauHomes && o.task0 === 'route', `a new game opens on the Act of Independence, paused, with Kaunas housed and a first ministry task (${o.task0})`);
assert(o.hungry <= 3 && o.coldSummer === 0 && o.warnDays <= 1 && o.heldRoute, `no hunger from starting stocks (${o.hungry} hungry in March 1920), no cold homes in summer, one warning line a day, and the route to Vilnius waits at no cost`);
assert(o.tut0 && o.tut >= 1, `the first-time tutorial starts and follows the player (reached step ${o.tut + 1})`);
/* ---- v0.12 ---- */
assert(o.tb, 'the year’s trade balance counts what was sold abroad, by market and by good, and the Trade view shows it');
assert(o.sitePlan, 'a building is planned with no money in hand: the site waits, gives no work, and its town lists it as waiting for money');
assert(o.siteDone && o.siteWorks, `once paid and supplied the builders need their days (${o.siteDays} for a dairy farm), then it works and the first-building task is done`);
assert(o.cart, `carters bring a site the planks its town lacks, a few loads a day (${o.cartFrom})`);
assert(o.dry, `with no planks anywhere the site waits, and the town offers fixes (${o.dryWhy})`);
assert(o.cancel, 'a cancelled plan returns its money to the treasury and its materials to the town');
assert(o.hold && o.pri, 'a site on hold takes nothing; one marked "build first" is served first');
assert(o.siteCard && o.worksView && o.stateView && o.ecoView && o.goodView && o.segs, `the site card, the five parts of the Lithuania view and the view of one good render (${[o.siteCard, o.worksView, o.stateView, o.ecoView, o.goodView, o.segs].join(', ')})`);
assert(o.chain, `sawmills saw timber into planks, Šiauliai brews beer, and the chains know what is made of what (${o.chainWhy})`);
assert(o.shops >= 5, `shops in ${o.shops} other towns fetch beer from Šiauliai's brewery`);
assert(o.siteSave, 'save and load keep a building site with its progress');
assert(o.upSite && o.upWorks && o.upDone, `a modernization is a site on a building that keeps working, then it is Lv 2 (${o.upDays} days)`);
assert(o.wants, `a new era's wants set in over four years: no cliff on the first day (${o.wantsWhy})`);
assert(o.fuel && o.fuelOk, `a town that outgrew its woodlots keeps a winter's fuel: the sawmill leaves it, and growth waits for it (${o.fuelWhy})`);
assert(o.linkPlan && o.farPay && o.linkTown && o.linkUp > 1, `the fix "${o.linkFixTxt}" lays out a road that links Kudirkos Naumiestis: it paves ${(o.linkUp || 0).toFixed(1)} km of streets on the way, with bricks from other towns`);
assert(o.gridWeak && o.farRoute && o.farMade && o.farFed, `a grid whose stations stand without peat says so and offers a route from the nearest town with peat to spare, which feeds them (${o.gridWhy})`);
assert(o.powRamp, `homes in the Modern era come to need twice the power over four years (${o.rampWhy})`);
assert(o.tax && o.pol, 'high taxes bring in more and cost public trust; road gangs cost 6 Lt a day and make roads cheaper');
assert(o.eraReq && o.eraEx && o.eraLit && o.eraPol, `Industrialization asks for goods sold abroad and primary schools (open from October 1922), the Modern era for power in every linked town (${o.eraReqWhy})`);
assert(o.rev, `every random event runs${o.revWhy ? ': ' + o.revWhy : ''}`);
assert(o.bermont && o.bermontWait && o.bermontWin, 'the Bermontians: attacking at Radviliškis adds security, waiting costs it and brings looting around Šiauliai');
assert(o.seimas && o.landCard && o.land, 'the Constituent Assembly makes Lithuania a democracy, and the land reform card raises farm output');
assert(o.coupCard && o.coupHeld && o.coupLost && o.coup, 'the coup of 1926: loyal troops hold only with public trust of 60, giving way ends the democracy');
assert(o.marchCard && o.march, 'September 1939: the march on Vilnius, which did not happen, takes the city and loses the British market');
assert(o.late, `history runs on to the restored republic: the cement and fertiliser projects, privatization, the litas of 1993 (${o.lateWhy})`);
assert(o.end, 'the game runs to 2005 and the State view names the Republic of Lithuania');
assert(o.budArmy <= -24 && o.budGap < 0.5, `the army's 25 Lt a day is in the day's balance, which adds up from its parts without one-off building (army ${o.budArmy}, off by ${o.budGap.toFixed(2)})`);
assert(o.idle.length > 0 && o.idle.every(w => w && w !== 'Starting'), `stations, warehouses and border posts say what they do (${[...new Set(o.idle)].slice(0, 2).join('; ')})`);
assert(o.km === '2,15,800' && o.ras && o.paved1, `the map is drawn twice its size and shown in real km (${o.km}), its terrain ships packed, and paved roads can be built from 1918`);
assert(o.sty === 'ctv' || o.sty === 'cmtv', `house lots take their place's style: city tenements, town houses and farmsteads (${o.sty})`);
assert(o.loose <= 12, `few streets in towns end without serving anything (${o.loose})`);
assert(o.keep >= 49 && o.portTask, `a sale abroad keeps half the store (${o.keep}% left), and selling by sea counts for the port task`);
assert(o.trade > 0.3 && o.surplus[0] < 140 && o.surplus[1] > 30, `merchants carry dairy from a full store (${o.trade.toFixed(1)} in 10 days), and a route takes a full store's timber to a town with room (${o.surplus.join(' and ')})`);
assert(o.turn < 15, `a new railway curves onto old track at ${o.turn.toFixed(1)} degrees`);
assert(o.ghostAcc === false && o.access, 'a station with no road to town gets a road laid out to confirm');
assert(o.confirm && o.pill && o.prodOk && o.restart, 'decision cards wait for Confirm, a shown route hides from its pill, the production view draws, and New game starts paused');
if (failed) { console.error(`\n${failed} check${failed > 1 ? 's' : ''} failed`); process.exit(1); }
console.log('\nSmoke test passed.');
