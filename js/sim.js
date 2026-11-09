'use strict';
/* Lietuva 1918 — economy: towns, routes, food, heating, commuting, eras, events, objectives, saving. */
let S;
const tIdx=id=>S.towns.findIndex(t=>t.id===id);
function newGame(){
  S={day:0,funds:3000,inc:0,era:1,speed:0,intro:1,own:startOwners(),nid:1,rid:1,gid:1,lid:1,did:1,prices:{},log:[],won:false,ms:{},mod:{farm:1},ev:{},nextRnd:220,
    towns:[],bld:[],routes:[],nodes:[],edges:[],lots:[],deals:[],plan:null,obj:{},stats:{portSales:0,routesMade:0},sel:null,tab:'nat',cam:null,series:[]};
  S.hist=newHistory();S.mkt=newMarkets();
  RES.forEach(r=>S.prices[r]=RI[r].p);
  if(typeof WORLD1918!=='undefined'&&WORLD1918)loadStartMap(WORLD1918);else{genWorld();settleOwners()}
  analyze();homesAtStart();
  HIST_ROUTES.forEach(([a,b,m,vt,n])=>addRoute(tIdx(a),tIdx(b),m,vt,n,true));
  S.log=[
    {d:0,t:'Merchants carry a little between neighbouring towns on their own, slowly. Routes move goods in bulk: open the Routes tab to see the old railway lines and cart routes, and add your own.',k:''},
    {d:0,t:'Every town and village feeds and heats its people from its own fields and woodlots, so it keeps its size without help. To grow it needs more food, homes and work.',k:''},
    {d:0,t:'Dirt roads join every town and village. Railways and the old paved highways link the main towns to Vilnius. Bring them to the rest.',k:''},
    {d:0,t:'People are happier with more kinds of food on the table: grain, potatoes, dairy, meat and fish. In winter every home burns peat or timber.',k:''},
    {d:0,t:'Borders move with history. Vilnius will change hands several times from 1919, and the Klaipėda Region and the Palanga coast are not yet Lithuanian. Nothing can be built where others hold the land.',k:''},
    {d:0,t:'The Council of Lithuania signs the Act of Independence in Vilnius. The new state must build an economy almost from nothing.',k:'hist'}];
  /* one day of figures for the dashboards, without moving the date: the game starts paused on 16 February */
  const f0=S.funds;tick();S.inc=S.funds-f0;S.bud={...BUD};S.day=0;
}
/* The start map puts some of a city's houses nearer a village hall. A town with fewer homes than people on the first day gets
   houses on its own zoned lots, nearest first, so no one starts overcrowded. */
function homesAtStart(){let n=0;
  S.towns.forEach((t,ti)=>{if(t.lock)return;let cap=0;S.bld.forEach(b=>{if(b.t==='house'&&b.town===ti)cap+=houseCap(b)});
    const lots=S.lots.filter(l=>l.town===ti).sort((a,b)=>a.cd-b.cd);
    while(cap<t.pop0-0.05&&lots.length){const l=lots.shift();removeLot(l);const b=addB('house',l.x,l.z,l.rot,1,true);b.town=ti;b.cd=l.cd;cap+=houseCap(b);n++}});
  if(n)analyze()}
/* News the interface shows as a toast (sim.js has no DOM): ministry tasks done, and the like */
const NOTES=[];
/* Saved games and the 1918 start map (js/world1918.js) share one compact form: coordinates in 10 m steps, lines as steps from
   the previous point (straight runs simplified away, densified again on load), buildings and lots as short arrays, and only
   the terrain cells that changed. */
const r2=v=>Math.round(v*100)/100,r3=v=>Math.round(v*1000)/1000;
function encLine(p){const o=[];let px=0,pz=0;for(const q of rdp(p,0.01)){const x=Math.round(q[0]*100),z=Math.round(q[1]*100);o.push(x-px,z-pz);px=x;pz=z}return o}
function decLine(a){const o=[];let x=0,z=0;for(let i=0;i<a.length;i+=2){x+=a[i];z+=a[i+1];o.push([x/100,z/100])}return densify(o,0.8)}
const BKEEP=['ti','lm','fp','f'];
function encB(b){const x={};BKEEP.forEach(k=>{if(b[k]!==undefined)x[k]=b[k]});return [b.id,b.t,r2(b.x),r2(b.z),r3(b.rot),b.lv,b.on?1:0,Object.keys(x).length?x:0]}
function decB(a){return Object.assign({id:a[0],t:a[1],x:a[2],z:a[3],rot:a[4],lv:a[5],on:!!a[6],eff:0,why:'Starting',town:-1,cd:0,k:1},a[7]||{})}
function encWorld(){return {nodes:S.nodes.map(n=>[n.id,r2(n.x),r2(n.z)]),edges:S.edges.map(e=>[e.id,e.k==='rail'?1:0,e.lv,e.a,e.b,encLine(e.p)]),
  bld:S.bld.map(encB),lots:S.lots.map(l=>[l.id,r2(l.x),r2(l.z),r3(l.rot)]),tf:tfDiff()}}
function decWorld(o){S.nodes=o.nodes.map(a=>({id:a[0],x:a[1],z:a[2]}));const N=new Map(S.nodes.map(n=>[n.id,n]));
  S.edges=o.edges.map(a=>{const p=decLine(a[5]),A=N.get(a[3]),B=N.get(a[4]);p[0]=[A.x,A.z];p[p.length-1]=[B.x,B.z];return {id:a[0],k:a[1]?'rail':'road',lv:a[2],a:a[3],b:a[4],p}});
  S.bld=o.bld.map(decB);S.lots=o.lots.map(a=>({id:a[0],x:a[1],z:a[2],rot:a[3],town:-1,cd:0}));
  genTerrain();tfApply(o.tf);rebuildIndex();NET.dirty=true}
/* The start map: the world, its counters, and the settlements (flags: 1 capital, 2 from 1918, 4 locked, 8 Klaipėda Region, 16 village) */
function encStartMap(){return Object.assign({gid:S.gid,nid:S.nid,lid:S.lid,towns:S.towns.map(t=>[t.id,t.n,t.reg,(t.capital?1:0)|(t.orig?2:0)|(t.lock?4:0)|(t.kr?8:0)|(t.vil?16:0),
  r2(t.R),r2(t.x),r2(t.z),t.d,t.pop0,t.stock])},encWorld())}
function loadStartMap(W){S.gid=W.gid;S.nid=W.nid;S.lid=W.lid;
  S.towns=W.towns.map(a=>{const f=a[3];return newTown(a[0],a[1],a[5],a[6],{reg:a[2],capital:f&1,orig:f&2?1:0,kr:f&8?1:0,vil:f&16?1:0,R:a[4],d:a[7],pop0:a[8],pop:a[8],stock:{...a[9]}})});
  decWorld(W);settleOwners()}
/* Towns are saved without what every day recomputes (dem, ate, and the made, used and growth figures the dashboards show),
   without empty stock, and without the 1918 descriptions, which come back from the start map. */
const slimMap=m=>{const r={};for(const k in m)if(Math.abs(m[k])>=1e-3)r[k]=m[k];return r};
const DAILY=new Set(['dem','ate','mk','us','gr','_mk','_us','rg','tr','_tr']);
/* the day's money by kind (the tick fills it; S.bud keeps a smoothed copy for the Lithuania view) */
const BUD={tax:0,trade:0,bld:0,lines:0,routes:0,army:0};
function serialize(){if(typeof camSave==='function')S.cam=camSave();const o=Object.assign({...S},encWorld());
  o.towns=S.towns.map(t=>{const c={};for(const k in t){if(DAILY.has(k)||(k==='d'&&t.orig))continue;c[k]=k==='stock'||k==='dl'?slimMap(t[k]):t[k]}return c});return o}
/* A save of this version back into S: the world is decoded, and what the save leaves out (DAILY, the 1918 descriptions) is
   filled in. Saves of older versions are never loaded (SAVE_KEY carries the version). */
function restore(o){const W={nodes:o.nodes,edges:o.edges,bld:o.bld,lots:o.lots,tf:o.tf};S=o;delete S.tf;
  const desc=new Map(typeof WORLD1918!=='undefined'&&WORLD1918?WORLD1918.towns.map(a=>[a[0],a[7]]):[]);
  S.towns.forEach(t=>{t.dem=t.dem||{};t.ate=t.ate||{};t.stock=t.stock||{};t.dl=t.dl||{};t.mk={};t.us={};t.gr=0;if(t.d===undefined)t.d=desc.get(t.id)||''});
  decWorld(W);settleOwners()}
const SAVE_NUM=(k,v)=>typeof v==='number'&&!Number.isInteger(v)?Math.round(v*1e4)/1e4:v;
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(serialize(),SAVE_NUM))}catch(e){}lastSave=Date.now()}
/* the frame loop saves at most every 20 seconds: the map makes a save of a few hundred KB */
let lastSave=0;
function autosave(){if(Date.now()-lastSave>20000)save()}
function load(){try{const t=localStorage.getItem(SAVE_KEY);if(!t)return null;const o=JSON.parse(t);return o&&o.edges&&o.towns&&o.hist?o:null}catch(e){return null}}
/* A new version starts a new game: saves of older versions are removed, so they do not fill the browser's storage.
   Returns true if one was found. The first-time tutorial keeps its own key. */
function dropOldSaves(){let found=false;try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);
  if(k&&k.startsWith('lietuva1918')&&k!==SAVE_KEY&&!k.endsWith('-tutorial')){localStorage.removeItem(k);found=true}}}catch(e){}return found}
/* yo: only the year of this event is known, so the chronicle shows the year alone */
/* The chronicle keeps every line of history; other news is trimmed to the latest 150. */
function log(t,k,yo){S.log.unshift({d:S.day,t,k:k||'',yo:yo?1:0});
  if(S.log.length>150+S.log.filter(e=>e.k==='hist').length)for(let i=S.log.length-1;i>=0;i--)if(S.log[i].k!=='hist'){S.log.splice(i,1);break}}

/* ---------- seasons ---------- */
const SNOW=[1,1,0.85,0.1,0,0,0,0,0,0,0.3,0.8],AUT=[0,0,0,0,0,0,0,0.15,0.6,1,0.5,0],HEAT=[1,1,0.8,0.35,0,0,0,0,0.1,0.45,0.8,1];
function seasonOf(day){const d=dOf(day),m=d.getUTCMonth(),f=(d.getUTCDate()-1)/30,n=(m+1)%12,L0=(a)=>a[m]+(a[n]-a[m])*f;return {snow:L0(SNOW),aut:L0(AUT),heat:L0(HEAT),m}}

/* ---------- money, storage and trade ---------- */
function townPort(ti){return S.bld.some(b=>b.t==='port'&&b.town===ti)}
/* a building type the player may build now: its era has come, or a Union project unlocked it early */
function unlocked(t){return BT[t].era<=S.era||!!(S.hist&&S.hist.unl[t])}
function canPay(cost,t){for(const k in cost){if(k==='lt'){if(S.funds<cost.lt)return false}else if(!t||(t.stock[k]||0)<cost[k])return false}return true}
function missing(cost,t){for(const k in cost){const have=k==='lt'?S.funds:(t?t.stock[k]||0:0);if(have<cost[k])return k==='lt'?`Need ${fmt(cost[k]-have)} more Lt`:`Need ${Math.ceil(cost[k]-have)} more ${rname(k)} in ${t?t.n:'a town'}`}return ''}
function pay(cost,t){for(const k in cost){if(k==='lt')S.funds-=cost.lt;else t.stock[k]-=cost[k]}}
function upCost(b){const T0=BT[b.t];return b.lv===1?{lt:Math.round(T0.cost.lt*1.2),bricks:20}:{lt:Math.round(T0.cost.lt*2.5),bricks:40,metal:10}}
function sellVal(ti,r){return 25*S.prices[r]*(townPort(ti)?1.4:1)}
function buyVal(ti,r){return 25*S.prices[r]*(townPort(ti)?1.25:1.6)}
function canBuyHere(ti,r){return !RI[r].port||townPort(ti)||S.bld.some(b=>b.t==='customs'&&b.town===ti)}
function room(t,r){return Math.max(0,(t.cap||STORE_BASE)-(t.stock[r]||0))}

/* ---------- transport routes: vehicles carry goods (and commuters) between two towns ---------- */
function addRoute(a,b,mode,vt,n,free){if(a<0||b<0||a===b)return null;const r={id:S.rid++,a,b,mode,vt,n,ab:'auto',ba:'auto',pax:false};S.routes.push(r);if(!free)S.stats.routesMade++;routeEval(r);return r}
function routePath(r){return pairPath(r.mode,r.a,r.b)}
function routeEval(r){const p=routePath(r),V=VT[r.vt],A=S.towns[r.a],B0=S.towns[r.b];r.ok=false;r.why='';r.len=0;r.cap=0;r.trip=0;r.held=0;
  if(!A||!B0){r.why='A town is missing';return}
  /* a route to land others hold waits, and its vehicles cost nothing until the land comes back */
  if(A.lock||B0.lock){const X=A.lock?A:B0;r.held=1;r.why=`${X.n} ${heldBy(X.rg,S.own[X.rg])}. The route waits, at no cost`;return}
  if(!p){r.why=r.mode==='rail'?'No railway between their stations':'No road between them';return}
  if(V.elec&&p.lv<2){r.why='Electric trains need electric railway all the way';return}
  const sf=r.mode==='road'&&r.vt!=='cart'?ROADT[p.lv].spd:1,trips=V.spd*sf/(2*p.len+TRIP_OVERHEAD);r.len=p.len;r.trip=1/trips;r.cap=r.n*V.cap*trips;r.ok=true}
const isMat=r=>r==='timber'||r==='bricks';
function moveCargo(A,B0,spec,cap,rec){if(cap<=0)return 0;let left=cap;const auto=spec==='auto',list=auto?RES:spec;
  const cand=[];list.forEach(r=>{const sa=A.stock[r]||0,da=A.dem[r]||0,db=B0.dem[r]||0,sb=B0.stock[r]||0,sp=room(B0,r);let amt;
    if(auto){amt=0;if(db>0.01&&sb/db<(sa/(da+1e-3))*0.8)amt=Math.min((sa*db-sb*da)/(da+db),db*25-sb);
      if(isMat(r)&&sb<40&&sa>60)amt=Math.max(amt,Math.min(40-sb,sa-60));
      /* a store filling up sends its surplus on to a town with room (only from the fuller to the emptier, so nothing goes back) */
      const ca=A.cap||STORE_BASE,cb=B0.cap||STORE_BASE,fa=sa/ca,fb=sb/cb;if(fa>0.75&&fa-fb>0.25)amt=Math.max(amt,Math.min((fa-fb)/2*Math.min(ca,cb),sa-ca*0.6));
      amt=Math.min(amt,sa-da*5,sp)}
    else amt=Math.min(sa-da*5,sp);if(amt>0.05)cand.push([r,amt,db>0?sb/db:99])});
  if(auto)cand.sort((x,y)=>x[2]-y[2]);
  cand.forEach(([r,amt])=>{const m=Math.min(amt,left);if(m<=0)return;A.stock[r]-=m;B0.stock[r]=(B0.stock[r]||0)+m;rec[r]=(rec[r]||0)+m;left-=m});return cap-left}
function runRoutes(){S.routes.forEach(r=>{r.mAB={};r.mBA={};r.used=0;if(!r.ok)return;const A=S.towns[r.a],B0=S.towns[r.b],gc=r.pax?r.cap*0.5:r.cap;
  const u=moveCargo(A,B0,r.ab,gc,r.mAB)+moveCargo(B0,A,r.ba,gc,r.mBA);r.used=gc>0?u/(2*gc):0})}
/* ---------- private traders ----------
   Merchants carry goods on their own between neighbouring towns joined by road or rail: from a town with plenty (more than a
   month of stock, or a store filling up) to one that runs short (under two weeks). They close a twentieth of the gap a day, and a
   link carries only so many loads a day: TRADE_CAP by the kind of road where the towns' lands meet, more by rail. Routes stay the
   fast way. The state neither pays nor earns. TRADES lists the day's flows for the carts on the map. */
const TRADE_CAP=[0,0.35,0.9,1.3],TRADE_RAIL=1.5,TRADES=[];
function runTraders(){TRADES.length=0;
  for(const L of NET.edges){const A=S.towns[L.a],B0=S.towns[L.b];if(!A||!B0||A.lock||B0.lock)continue;
    let left=Math.max(L.road?TRADE_CAP[Math.min(3,L.road.lv||1)]:0,L.rail?TRADE_RAIL:0);if(left<=0)continue;
    const cand=[];
    for(const r of RES)for(const [X,Y,dir] of [[A,B0,1],[B0,A,-1]]){
      /* short: under two weeks of stock and falling (or under three days); plenty: over a month of the town's own use, or a store
         a quarter full of a good the town does not use */
      const dy=Y.dem[r]||0;if(dy<0.01)continue;const sy=Y.stock[r]||0;if(sy>=dy*14||((Y.dl[r]||0)>=-dy*0.02&&sy>=dy*3))continue;
      const sx=X.stock[r]||0,dx=X.dem[r]||0,cx=X.cap||STORE_BASE,spare=sx-Math.max(dx*30,dx>0.01?0:cx*0.25);
      if(spare<=0.05)continue;
      const q=Math.min(spare,dy*20-sy,room(Y,r))*0.05;if(q>0.005)cand.push([r,X,Y,dir,q,sy/dy])}
    cand.sort((p,q)=>p[5]-q[5]);
    for(const [r,X,Y,dir,q0] of cand){const q=Math.min(q0,left);if(q<=0.005)break;X.stock[r]-=q;Y.stock[r]=(Y.stock[r]||0)+q;left-=q;
      const tx=X._tr||(X._tr={}),ty=Y._tr||(Y._tr={});tx[r]=(tx[r]||0)-q;ty[r]=(ty[r]||0)+q;TRADES.push([L,r,q*dir])}}}

/* ---------- labour: local jobs first, then commuting on foot or by passenger route ---------- */
function commute(act){act.forEach(n=>{const t=S.towns[n];t.comIn=0;t.comOut=0;t.free=Math.max(0,t.wf-t.jobs);t.vac=Math.max(0,t.jobs-t.wf)});
  S.routes.forEach(r=>r.paxUsed=0);const links=[];
  NET.edges.forEach(e=>{if(e.road&&e.road.len<=WALK_KM)links.push({a:e.a,b:e.b,cap:3,len:e.road.len})});
  S.routes.forEach(r=>{if(r.ok&&r.pax)links.push({a:r.a,b:r.b,cap:r.cap*0.5,len:r.len,r})});links.sort((x,y)=>x.len-y.len);
  links.forEach(l=>{const A=S.towns[l.a],B0=S.towns[l.b];if(A.lock||B0.lock)return;let c=l.cap;
    [[A,B0],[B0,A]].forEach(([x,y])=>{const m=Math.min(x.free,y.vac,c);if(m>0){x.free-=m;y.vac-=m;x.comOut+=m;y.comIn+=m;c-=m;if(l.r)l.r.paxUsed+=m}})});
  act.forEach(n=>{const t=S.towns[n];t.fill=t.jobs?Math.min(1,(Math.min(t.wf,t.jobs)+t.comIn)/t.jobs):1})}

/* ---------- production and town life ---------- */
/* residents a house lot holds: village farmsteads hold fewer than town houses */
function houseCap(b){return b.f&&b.lv===1?FARMSTEAD_CAP:HOUSE.cap[b.lv]}
function useInputs(b,e,st,dem,fill,us){const T0=BT[b.t];if(!T0.in)return 1;const im=INM[b.lv];let ir=1;b.lack='';
  for(const r in T0.in){dem[r]=(dem[r]||0)+T0.in[r]*im*fill;const need=T0.in[r]*im*e;if(need>0){const q=(st[r]||0)/need;if(q<ir){ir=q;b.lack=r}}}
  ir=clamp(ir,0,1);for(const r in T0.in){const q=T0.in[r]*im*e*ir;st[r]=(st[r]||0)-q;us[r]=(us[r]||0)+q}return ir}
/* buildings that make nothing themselves: what they do for their town */
const IDLE=new Set(['station','warehouse','customs','port']);
function idleWhy(b,t){if(!b.on)return 'Paused';
  if(b.t==='station')return `Trains stop here for ${t.n}`;
  if(b.t==='warehouse')return `Stores goods for ${t.n}`;
  if(b.t==='port')return `Ships load here for ${t.n}`;
  const m=b.gate?Object.keys(MARKETS).filter(k=>MARKETS[k].gate.includes(b.gate)).map(k=>MARKETS[k].n):[];
  return m.length?`Trade with ${m.join(' and ')} crosses here`:'No border near'}
function why(b,fill,pr,ir){if(ir<0.9)return 'Missing '+rname(b.lack);if(pr<0.9)return 'Not enough power';if(fill<0.9)return 'Short of workers';return 'Running'}
const NA_TXT={noroad:'No road to a town',far:'Too far from a town hall'};
function naTxt(b){return b.na==='locked'?heldTxt(rgnAt(b.x,b.z)):NA_TXT[b.na]||'Not connected'}
let BYT=[];
function phase1(ti){const t=S.towns[ti];let house=0,jobs=0,cap=STORE_BASE,sch=0,cli=0,pol=0,hn=0;
  BYT[ti].forEach(b=>{const T0=BT[b.t];if(b.t==='house'){house+=houseCap(b);pol+=polAt(b.x,b.z);hn++}else if(T0.w&&b.on)jobs+=T0.w;
    if(T0.store)cap+=WH_CAP[b.lv];if(T0.svc==='school'&&b.on)sch++;if(T0.svc==='clinic'&&b.on)cli++});
  t.house=house;t.cap=cap;t.wf=t.pop*0.5;t.jobs=jobs;t.pol=hn?pol/hn:0;t.nsch=sch;t.ncli=cli;t.dem={};t._mk={};t._us={};t._tr={}}
function phase1b(ti){const t=S.towns[ti],st=t.stock;t.edu=Math.min(1,t.nsch*50*t.fill/Math.max(1,t.pop));t.med=Math.min(1,t.ncli*70*t.fill/Math.max(1,t.pop));
  t.pm=(0.7+0.6*t.h/100)*(1+0.1*t.edu);t.powS=0;t.powD=0;
  BYT[ti].forEach(b=>{const T0=BT[b.t];if(!T0.pow)return;if(!b.on){b.eff=0;b.why='Paused';return}
    const ir=useInputs(b,t.fill,st,t.dem,t.fill,t._us);t.powS+=T0.pow*LV[b.lv]*t.fill*ir;b.eff=t.fill*ir;b.why=why(b,t.fill,1,ir)});
  BYT[ti].forEach(b=>{const T0=BT[b.t];if(T0.powNeed&&b.on)t.powD+=T0.powNeed*LV[b.lv]*t.fill;if(T0.svc){b.eff=b.on?t.fill:0;b.why=b.on?(t.fill<0.9?'Short of workers':'Running'):'Paused'}});
  if(S.era>=2&&!t.vil)t.powD+=t.pop*(S.era>=3?0.06:0.03)}
function phase2(ti,sea){const t=S.towns[ti],st=t.stock,era=S.era,pr=t.pr,fill=t.fill,hp=histProd(),mk=t._mk,us=t._us;
  BYT[ti].forEach(b=>{const T0=BT[b.t];if(!T0.out)return;if(!b.on){b.eff=0;b.why='Paused';return}
    const p=T0.powNeed?pr:1,e0=fill*p,ir=useInputs(b,e0,st,t.dem,fill,us),mod=(b.t==='farm'||b.t==='potato'?S.mod.farm:1)*(b.k||1)*hp;let full=false;
    for(const r in T0.out){const made=T0.out[r]*LV[b.lv]*e0*ir*t.pm*mod,sp=room(t,r),q=Math.min(made,sp);if(sp<made*0.5)full=true;st[r]=(st[r]||0)+q;mk[r]=(mk[r]||0)+q}
    b.eff=e0*ir;b.why=full?'Storage full':why(b,fill,p,ir)});
  /* the settlement's own fields and woodlots: they feed its 1918 population and heat their homes, so it never shrinks below that size */
  const base=t.pop0||0,sub=histSub(t);['grain','potatoes'].forEach(r=>{const q=Math.min(base*0.05*sub,room(t,r));st[r]=(st[r]||0)+q;mk[r]=(mk[r]||0)+q});
  const need=t.pop*0.1;FOOD.forEach(r=>{t.dem[r]=(t.dem[r]||0)+need*0.3});
  t.ate={};let rem=need,pool=FOOD.filter(r=>(st[r]||0)>1e-4);
  while(rem>1e-6&&pool.length){const share=rem/pool.length,next=[];pool.forEach(r=>{const take=Math.min(share,st[r]);st[r]-=take;rem-=take;t.ate[r]=(t.ate[r]||0)+take;us[r]=(us[r]||0)+take;if(st[r]>1e-4)next.push(r)});pool=next}
  const fed=need?(need-rem)/need:1;t.vari=FOOD.filter(r=>(t.ate[r]||0)>=need*0.08).length;
  t.fdays=need>0?FOOD.reduce((a,r)=>a+(st[r]||0),0)/need:99;
  const hm=t.pop*0.03*sea.heat*(era>=3&&pr>0.9?0.5:1),hsub=Math.min(t.pop,base)*0.03*sea.heat*(era>=3&&pr>0.9?0.5:1),hneed=hm-hsub;
  t.dem.peat=(t.dem.peat||0)+hneed*0.6;t.dem.timber=(t.dem.timber||0)+hneed*0.4;
  let hr=hneed;['peat','timber'].forEach(r=>{const take=Math.min(hr,st[r]||0);st[r]=(st[r]||0)-take;us[r]=(us[r]||0)+take;hr-=take});t.heat=hm>0?1-hr/hm*Math.min(1,sea.heat/0.35):1;
  const eat=(r,per)=>{const nd=t.pop*per;t.dem[r]=(t.dem[r]||0)+nd;const got=Math.min(st[r]||0,nd);st[r]=(st[r]||0)-got;us[r]=(us[r]||0)+got;return nd?got/nd:1};
  const gm=era>=2?eat('textiles',0.012):1,em=era>=3?eat('electronics',0.004):1;
  let h=58,note='Content';const unemp=Math.max(0,t.wf-Math.min(t.wf,t.jobs)-t.comOut-Math.min(t.pop,base)*0.5);
  h+=Math.max(0,t.vari-1)*4;h+=6*t.med;h+=histMood(t);
  if(unemp>t.wf*0.25+1&&S.hist.path!=='soviet'){h-=6;note='Unemployment'}
  if(t.pol>0.3){h-=Math.min(15,t.pol*5);note='Polluted'}
  if(era>=2&&!t.vil){if(pr>=0.95)h+=6;else if(pr<0.8){h-=8;note='Blackouts'}}
  if(era>=3){h+=em>=0.99?8:-8*(1-em);if(em<0.99)note='Want electronics'}
  if(era>=2){h+=gm>=0.99?10:-10*(1-gm);if(gm<0.99)note='Want linen cloth'}
  if(t.heat<0.95){h-=14*(1-t.heat);note='Cold homes'}
  if(t.pop>t.house+0.3){h-=12;note='Overcrowded'}
  if(fed<1){h-=50*(1-fed);if(fed<0.97)note='Hungry'}
  if(note==='Content'&&h>=70)note='Thriving';
  t.note=note;t.fed=fed;t.unemp=unemp;t.h+=(clamp(h,5,100)-t.h)*0.08;
  const hf=t.h/62;
  /* growth needs spare food: a few days' stock, and more coming in than is eaten (or a food that fills its store), unless the
     town is still below its old size. A starting stock alone does not make a village grow, only to go hungry when it runs out. */
  const fbal=FOOD.reduce((a,r)=>a+(t.dl[r]||0),0),full=FOOD.some(r=>(st[r]||0)>=t.cap*0.95);
  if(fed>=0.99&&t.pop<t.house&&(t.pop<base||(t.fdays>=8&&(fbal>=need*0.015||full))))t.pop=Math.min(t.house,t.pop+Math.max(0.01,t.pop*0.004)*hf*(1+0.3*t.med));
  if(fed<0.999)t.pop-=t.pop*(1-fed)*0.02;if(t.pop>t.house)t.pop-=(t.pop-t.house)*0.03;t.pop=Math.max(Math.min(base,0.2),t.pop);
  const tax=t.pop*(t.vil?0.04:0.08)*Math.min(1.4,hf)*histTax();S.funds+=tax;BUD.tax+=tax;
  BYT[ti].forEach(b=>{if(b.t!=='house'&&b.t!=='hall'&&b.t!=='landmark'&&b.t!=='station'){const c=(BT[b.t].store?0.3:0.4)*b.lv*(b.on?1:0.3);S.funds-=c;BUD.bld-=c}});
  if(fed<0.9&&S.day-t.lastWarn>45){t.lastWarn=S.day;WARN.food.push(t.n)}
  else if(t.heat<0.7&&S.day-t.lastWarn>45){t.lastWarn=S.day;WARN.cold.push(t.n)}
  RES.forEach(r=>{if((st[r]||0)<1e-4)st[r]=0;if(st[r]>t.cap)st[r]=t.cap})}
/* Places that ran short today, told in one line each: "Food is running out in Lėnas, Gruzdžiai and 9 other places." */
const WARN={food:[],cold:[]};
function placesTxt(L0){return L0.length<=3?L0.slice(0,-1).join(', ')+(L0.length>1?' and ':'')+L0[L0.length-1]:`${L0.slice(0,2).join(', ')} and ${L0.length-2} other places`}
function warnLog(){if(WARN.food.length)log(`Food is running out in ${placesTxt(WARN.food)}. People are leaving.`,'warn');
  if(WARN.cold.length)log(`Homes in ${placesTxt(WARN.cold)} are cold. Send peat or timber.`,'warn');WARN.food=[];WARN.cold=[]}
/* building materials a town spends on its own homes count as goods used */
function useMat(t,cost){if(!t._us)return;for(const k in cost)if(k!=='lt')t._us[k]=(t._us[k]||0)+cost[k]}
/* towns grow into zoned lots along their streets, nearest and cleanest first; in later eras old houses are rebuilt bigger */
function develop(ti){const t=S.towns[ti],lv=S.era,cost=HOUSE.cost[lv],n=1+Math.floor(t.pop/50);
  for(let q=0;q<n;q++){let best=null,bd=1e9;
    for(const l of S.lots){if(l.town!==ti)continue;const sc=l.cd*0.5+hash2(l.id,7,3)*1.5+polAt(l.x,l.z)*4;if(sc<bd){bd=sc;best=l}}
    if(best){if(missing(cost,t)){t.hint=`Needs ${costTxt(cost)} to build homes`;return}
      pay(cost,t);useMat(t,cost);removeLot(best);const b=addB('house',best.x,best.z,best.rot,lv,true);b.town=ti;b.cd=best.cd;t.hint='';continue}
    if(lv>=2){const old=BYT[ti].filter(b=>b.t==='house'&&b.lv<lv);if(old.length){const b=old[Math.floor(Math.random()*old.length)];
      if(missing(cost,t)){t.hint=`Needs ${costTxt(cost)} to rebuild homes`;return}pay(cost,t);useMat(t,cost);b.lv=lv;b.f=0;WV.bld++;t.hint='';continue}}
    t.hint='No room to grow: zone more land along its streets';return}}

/* ---------- history, chance and ministry tasks ---------- */
/* ---------- who holds which land ----------
   S.own: the holder of each part of today's Lithuania (REGIONS) and of each neighbour's land (lv, by, pl, ru). */
/* "belongs to Poland", "is held by the Red Army": how a part of Lithuania stands with its holder */
function heldBy(rg,o){return o==='al'?'is under Allied rule':o==='ra'||o==='pl'||(o==='de'&&rg!=='kr')?`is held by ${OWNERS[o]}`:`belongs to ${OWNERS[o]||'another country'}`}
function heldTxt(rg){const R0=REGIONS[rg];return R0?`${R0.n} ${heldBy(rg,S.own[rg])}`:'Outside Lithuania'}
/* Each settlement's part of the country, from where it stands; its lock follows the holder. */
function settleOwners(){S.towns.forEach(t=>{t.rg=rgnAt(...landNear(t.x,t.z))});splitAtRegions();
  S.towns.forEach(t=>{t.lock=t.rg&&S.own[t.rg]!=='lt'?1:0});fixCapital();NET.dirty=true;WV.own++}
/* Kaunas is the temporary capital while others hold Vilnius, and while the government sits there (S.hist.kaunas: it moved
   in January 1919 and stays until Vilnius is back for good). */
function fixCapital(){const V0=S.towns[tIdx('vil')],K=S.towns[tIdx('kau')],want=V0&&!V0.lock&&!(S.hist&&S.hist.kaunas)?V0:K;if(!want)return;S.towns.forEach(t=>{if(t.capital&&t!==want)t.capital=0});want.capital=1}
function capital(){return S.towns.find(t=>t.capital)||S.towns[0]}
/* Hand a part of Lithuania or a neighbour's land to a new holder. Returns what Lithuania lost or gained there:
   {n settlements, pop thousands, b buildings}. Towns keep what they had and wait, locked, until the land comes back. */
function setOwner(rg,own){const was=S.own[rg],out={n:0,pop:0,b:0};if(was===own)return out;S.own[rg]=own;
  if(REGIONS[rg]){const lose=was==='lt',gain=own==='lt';
    if(lose||gain){splitAtRegions();
      S.towns.forEach((t,n)=>{if(t.rg!==rg)return;out.n++;out.pop+=Math.max(t.pop,t.pop0);out.b+=S.bld.filter(b=>b.town===n&&b.t!=='house'&&b.t!=='hall'&&b.t!=='landmark').length;
        if(gain){t.lock=0;t.pop=Math.max(t.pop,t.pop0);t.h=Math.max(t.h,55);t.lastWarn=S.day}else t.lock=1});
      S.deals=S.deals.filter(d=>S.towns[d.ti]&&!S.towns[d.ti].lock);fixCapital()}}
  NET.dirty=true;WV.own++;return out}
/* The eras ask less of a smaller Lithuania: the share of the 1918 residents and towns that live in the land it holds now,
   against the land it held at the start. */
function landShare(){let p=0,p0=0,n=0,n0=0;const st=startOwners();
  S.towns.forEach(t=>{const base=!t.rg||st[t.rg]==='lt';if(base){p0+=t.pop0;if(!t.vil)n0++}if(!t.lock){p+=t.pop0;if(!t.vil)n++}});
  return {pop:clamp(p0?p/p0:1,0.6,1.3),towns:clamp(n0?n/n0:1,0.6,1.3)}}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function activeIdx(){return S.towns.map((t,n)=>n).filter(n=>!S.towns[n].lock)}
const REV=[
  ()=>{const t=S.towns[pick(activeIdx())],r=pick(['grain','potatoes']);t.stock[r]=Math.min(t.cap||STORE_BASE,(t.stock[r]||0)+40);return [`Bumper ${r==='grain'?'grain':'potato'} harvest around ${t.n}.`,'good']},
  ()=>{S.prices.dairy=Math.min(RI.dairy.p*1.6,S.prices.dairy*1.3);return ['Butter prices rise on the London market.','']},
  ()=>{S.prices.meat=Math.min(RI.meat.p*1.6,S.prices.meat*1.3);return ['British buyers want Lithuanian bacon. Meat prices rise.','']},
  ()=>{S.prices.timber=Math.min(RI.timber.p*1.6,S.prices.timber*1.3);return ['Sawmills abroad are short of logs. Timber prices rise.','']},
  ()=>{const t=S.towns[tIdx('kau')],l=Math.floor((t.stock.timber||0)*0.3);if(l<1)return null;t.stock.timber-=l;return [`A spring flood on the Nemunas washes away ${l} timber in Kaunas.`,'warn']},
  ()=>{const t=S.towns[pick(activeIdx())],l=Math.floor((t.stock.grain||0)*0.25);if(l<1)return null;t.stock.grain-=l;return [`A wet harvest spoils ${l} grain in ${t.n}.`,'warn']},
  ()=>{if(S.era<2)return null;S.prices.textiles=Math.min(RI.textiles.p*1.6,S.prices.textiles*1.3);return ['Linen is in fashion in Western Europe. Cloth prices rise.','']}];
/* Ministry tasks, roughly from easy to hard. can: the task makes sense now (the map shows the first open one that does). */
const OBJ=[
  {id:'route',t:'Set up a new transport route',r:400,ok:()=>S.stats.routesMade>0},
  {id:'wh',t:'Build a warehouse',r:300,ok:()=>S.bld.some(b=>b.t==='warehouse')},
  {id:'food4',t:'Give a town four kinds of food',r:800,ok:()=>S.towns.some(t=>!t.lock&&t.vari>=4)},
  {id:'school',t:'Open a school',r:400,ok:()=>S.bld.some(b=>b.t==='school')},
  {id:'trade',t:'Sell goods abroad through a border post or a port',r:600,ok:()=>S.deals.some(d=>d.dir==='out'&&d.done>0)},
  {id:'mar',t:'Bring the railway to Marijampolė (it came in 1924)',r:800,ok:()=>NET.rail.has(tIdx('mar'))},
  {id:'tel',t:'Bring the railway to Telšiai (it came in 1926)',r:800,ok:()=>NET.rail.has(tIdx('tel'))},
  {id:'bir',t:'Link Biržai to the capital by rail or paved road',r:600,ok:()=>NET.linked.has(tIdx('bir'))},
  {id:'town',t:'Found a new town',r:1000,ok:()=>S.towns.some(t=>!t.orig)},
  {id:'port',t:'Sell goods through the port',r:800,ok:()=>S.stats.portSales>0,can:()=>S.own.pal==='lt'||S.own.kr==='lt'},
  {id:'kla',t:'Link Klaipėda to the railways of Lithuania (it was done in 1932, through Telšiai)',r:1500,ok:()=>NET.rail.has(tIdx('kla')),can:()=>S.own.kr==='lt'},
  {id:'p800',t:'Reach 800k residents',r:1500,ok:()=>totals().pop>=800},
  {id:'era2',t:'Enter the Industrialization era',r:2000,ok:()=>S.era>=2},
  {id:'lit',t:'Power every town',r:3000,ok:()=>S.era>=2&&S.towns.every(t=>t.lock||t.vil||t.pr>=0.95),can:()=>S.era>=2},
  {id:'era3',t:'Reach Modern Lithuania',r:5000,ok:()=>S.era>=3,can:()=>S.era>=2}];
function checkObj(){OBJ.forEach(o=>{if(!S.obj[o.id]&&o.ok()){S.obj[o.id]=1;S.funds+=o.r;log(`Ministry task done: ${o.t}. +${fmt(o.r)} Lt`,'good');NOTES.push(`Task done: ${o.t.replace(/ \(.*\)$/,'')} · +${fmt(o.r)} Lt`)}})}
/* the task the map shows: the first open one that makes sense now */
function curTask(){return OBJ.find(o=>!S.obj[o.id]&&(!o.can||o.can()))||null}

function tick(){
  if(NET.dirty)analyze();
  S.day++;const f0=S.funds,act=activeIdx(),before={},sea=seasonOf(S.day);for(const k in BUD)BUD[k]=0;
  RES.forEach(r=>{const base=RI[r].p*depAt(r);let p=S.prices[r]*(1+(Math.random()-0.5)*0.04);p+=(base-p)*0.012;S.prices[r]=clamp(p,base*0.6,base*1.6)});
  BYT=S.towns.map(()=>[]);S.bld.forEach(b=>{if(b.town>=0&&!S.towns[b.town].lock){BYT[b.town].push(b);if(IDLE.has(b.t)){b.eff=b.on?1:0;b.why=idleWhy(b,S.towns[b.town])}}else if(b.t!=='house'&&b.t!=='hall'){b.eff=0;b.why=naTxt(b)}});
  act.forEach(n=>{before[n]={...S.towns[n].stock};before[n].pop=S.towns[n].pop;phase1(n)});
  S.routes.forEach(routeEval);commute(act);act.forEach(phase1b);
  const sup={},dem={};act.forEach(n=>{const t=S.towns[n],c=NET.grid[n];sup[c]=(sup[c]||0)+t.powS;dem[c]=(dem[c]||0)+t.powD});
  act.forEach(n=>{const t=S.towns[n],c=NET.grid[n];t.pr=dem[c]>0?Math.min(1,sup[c]/dem[c]):1;t.gS=sup[c];t.gD=dem[c]});
  act.forEach(n=>phase2(n,sea));
  runRoutes();runTraders();runDeals();warnLog();
  act.forEach(n=>{const t=S.towns[n];if(t.pop>=t.house*0.92&&t.fed>=0.99&&t.h>=45){if(++t.dev>=5){t.dev=0;develop(n)}}else if(t.pop<t.house*0.85)t.hint=''});
  /* smoothed per-day figures: net change of each good (routes and trade included), made, used, and population growth */
  act.forEach(n=>{const t=S.towns[n],b0=before[n],mk=t.mk||(t.mk={}),us=t.us||(t.us={}),tr=t.tr||(t.tr={});RES.forEach(r=>{const d=(t.stock[r]||0)-(b0[r]||0);t.dl[r]=(t.dl[r]||0)*0.8+d*0.2;
    mk[r]=(mk[r]||0)*0.8+(t._mk[r]||0)*0.2;us[r]=(us[r]||0)*0.8+(t._us[r]||0)*0.2;tr[r]=(tr[r]||0)*0.8+((t._tr||{})[r]||0)*0.2});t.gr=(t.gr||0)*0.9+(t.pop-b0.pop)*0.1});
  S.funds-=NET.up;BUD.lines=-NET.up;S.routes.forEach(r=>{if(!r.held){const c=r.n*VT[r.vt].up;S.funds-=c;BUD.routes-=c}});
  /* the army, allies and support schemes are paid before the day's balance is counted, so the top bar shows them */
  const hs=histSpend();S.funds-=hs;BUD.army=-hs;
  S.inc=S.inc*0.9+(S.funds-f0)*0.1;
  const bu=S.bud||(S.bud={});for(const k in BUD)bu[k]=(bu[k]||0)*0.9+BUD[k]*0.1;
  if(S.funds<0&&S.day-(S.ms.broke||-999)>90){S.ms.broke=S.day;log('The treasury is empty and upkeep runs up a debt. Remove routes or buildings you do not need, or sell goods abroad.','warn');NOTES.push('The treasury is empty')}
  histTick();
  if(S.day>=S.nextRnd){S.nextRnd=S.day+170+Math.floor(Math.random()*170);const r=pick(REV)();if(r)log(r[0],r[1])}
  if(S.day%10===0)checkObj();
  const t=totals();
  /* a weekly sample of residents and treasury for the trend charts; halved in resolution when it grows long */
  if(S.day%7===0){const L0=S.series||(S.series=[]);L0.push([S.day,Math.round(t.pop*10)/10,Math.round(S.funds)]);if(L0.length>520)S.series=L0.filter((x,i)=>i%2===0||i===L0.length-1)}
  [750,1000,1500,2000,2500].forEach(x=>{if(t.pop>=x&&!S.ms['p'+x]){S.ms['p'+x]=1;log(`${popStr(x)} people now live in Lithuania's towns and villages.`,'good');NOTES.push(`${popStr(x)} people now live in Lithuania`)}});
  if(!S.won&&S.era===3&&t.pop>=goalPop()&&t.linked===t.towns&&t.lit){S.won=true;log(`Every town is linked and lit, and ${popStr(goalPop())} people live in the towns and villages. The plan is fulfilled.`,'good')}
}
function goalPop(){return Math.round(GOAL_POP*landShare().pop/10)*10}
/* National totals. towns and linked count towns only; villages are counted apart. */
function totals(){const t={pop:0,towns:0,vils:0,vpop:0,linked:0,lit:true,stock:{},dl:{}};RES.forEach(r=>{t.stock[r]=0;t.dl[r]=0});
  S.towns.forEach((x,n)=>{if(x.lock)return;t.pop+=x.pop;if(x.vil){t.vils++;t.vpop+=x.pop}else{t.towns++;if(NET.linked.has(n))t.linked++;if(x.pr<0.95)t.lit=false}
    RES.forEach(r=>{t.stock[r]+=x.stock[r]||0;t.dl[r]+=x.dl[r]||0})});return t}
function eraReq(){const n=S.era+1;if(n>3)return null;const R0=ERAS[n].req,t=totals(),L0=[],sh=landShare(),pop=Math.round(R0.pop*sh.pop/10)*10,lk=Math.round(R0.linked*sh.towns);
  L0.push({t:`${popStr(pop)} residents`,ok:t.pop>=pop,q:popStr(t.pop)});
  L0.push({t:`${lk} towns linked to ${capital().n} by rail or paved road`,ok:t.linked>=lk,q:t.linked+' of '+t.towns});
  if(R0.bricks)L0.push({t:`${R0.bricks} bricks in stock`,ok:t.stock.bricks>=R0.bricks,q:fmt(t.stock.bricks)});
  if(R0.textiles)L0.push({t:`${R0.textiles} linen cloth in stock`,ok:t.stock.textiles>=R0.textiles,q:fmt(t.stock.textiles)});
  L0.push({t:`${fmt(R0.lt)} Lt to invest`,ok:S.funds>=R0.lt,q:fmt(S.funds)});return L0}
function eraReady(){const x=eraReq();return !!x&&x.every(q=>q.ok)}
