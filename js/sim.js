'use strict';
/* Lietuva 1918 — economy: towns, routes, food, heating, commuting, eras, events, objectives, saving. */
let S;
const tIdx=id=>S.towns.findIndex(t=>t.id===id);
function newGame(){
  S={day:0,funds:3000,inc:0,era:1,eraDay:0,speed:0,intro:1,own:startOwners(),nid:1,rid:1,gid:1,lid:1,did:1,prices:{},log:[],won:false,ms:{},mod:{farm:1},ev:{},nextRnd:200,
    towns:[],bld:[],routes:[],nodes:[],edges:[],lots:[],deals:[],plan:null,obj:{},stats:{portSales:0,routesMade:0,built:0},sel:null,tab:'nat',cam:null,series:[],
    keep:500,fx:[],gs:{},tb:{y:1918,ex:{},im:{},eg:{},ig:{}},tb0:null};
  S.hist=newHistory();S.mkt=newMarkets();
  RES.forEach(r=>S.prices[r]=RI[r].p);
  if(typeof WORLD1918!=='undefined'&&WORLD1918)loadStartMap(WORLD1918);else{genWorld();settleOwners()}
  analyze();homesAtStart();
  HIST_ROUTES.forEach(([a,b,m,vt,n])=>addRoute(tIdx(a),tIdx(b),m,vt,n,true));
  S.log=[
    {d:0,t:'A building starts as a plan. Its site takes money from the treasury and materials from its town as they come, and the builders need some days. Planks from the sawmills are what most buildings are made of.',k:''},
    {d:0,t:'Merchants carry a little between neighbouring towns on their own, slowly. Routes move goods in bulk: open the Routes tab to see the old railway lines and cart routes, and add your own.',k:''},
    {d:0,t:'Every town and village feeds and heats its people from its own fields and woodlots, so it keeps its size without help. To grow it needs more food, homes and work.',k:''},
    {d:0,t:'Dirt roads join every town and village. Railways and the old paved highways link the main towns to Vilnius. Bring them to the rest.',k:''},
    {d:0,t:'People are happier with more kinds of food on the table: grain, potatoes, dairy, meat and fish. In winter every home burns peat or timber.',k:''},
    {d:0,t:'Borders move with history. Vilnius will change hands several times from 1919, and the Klaipėda Region and the Palanga coast are not yet Lithuanian. Nothing can be built where others hold the land.',k:''},
    {d:0,t:'The Council of Lithuania signs the Act of Independence in Vilnius. The new state must build an economy almost from nothing.',k:'hist'}];
  /* one day of figures for the dashboards, without moving the date: the game starts paused on 16 February */
  const f0=S.funds;tick();S.inc=S.funds-f0-BUD.build-BUD.homes;S.bud={...BUD};S.day=0;S.funds=f0;S.gs={};
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
const BKEEP=['ti','lm','fp','f','c'];
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
const DAILY=new Set(['dem','ate','mk','us','gr','_mk','_us','rg','tr','_tr','want']);
/* the day's money by kind (the tick fills it; S.bud keeps a smoothed copy for the Lithuania view) */
/* build and homes: what construction sites and new homes took today. They are investment, so the day's balance (S.inc) leaves them out. */
const BUD={tax:0,trade:0,bld:0,lines:0,routes:0,army:0,policy:0,homes:0,build:0};
function serialize(){if(typeof camSave==='function')S.cam=camSave();const o=Object.assign({...S},encWorld());
  o.towns=S.towns.map(t=>{const c={};for(const k in t){if(DAILY.has(k)||(k==='d'&&t.orig))continue;c[k]=k==='stock'||k==='dl'?slimMap(t[k]):t[k]}return c});return o}
/* A save of this version back into S: the world is decoded, and what the save leaves out (DAILY, the 1918 descriptions) is
   filled in. Saves of older versions are never loaded (SAVE_KEY carries the version). */
function restore(o){const W={nodes:o.nodes,edges:o.edges,bld:o.bld,lots:o.lots,tf:o.tf};S=o;delete S.tf;
  const desc=new Map(typeof WORLD1918!=='undefined'&&WORLD1918?WORLD1918.towns.map(a=>[a[0],a[7]]):[]);
  S.towns.forEach(t=>{t.dem=t.dem||{};t.ate=t.ate||{};t.stock=t.stock||{};t.dl=t.dl||{};t.mk={};t.us={};t.gr=0;t.want={};if(t.d===undefined)t.d=desc.get(t.id)||''});
  S.fx=S.fx||[];S.gs=S.gs||{};S.tb=S.tb||{y:dOf(S.day).getUTCFullYear(),ex:{},im:{},eg:{},ig:{}};
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
/* The chronicle keeps every line of history; other news is trimmed to the latest 150. */
/* yo: 1 only the year of this event is certain, 2 the month and the year: the chronicle shows no more than that */
function log(t,k,yo){S.log.unshift({d:S.day,t,k:k||'',yo:yo|0});
  if(S.log.length>150+S.log.filter(e=>e.k==='hist').length)for(let i=S.log.length-1;i>=0;i--)if(S.log[i].k!=='hist'){S.log.splice(i,1);break}}

/* ---------- seasons ---------- */
const SNOW=[1,1,0.85,0.1,0,0,0,0,0,0,0.3,0.8],AUT=[0,0,0,0,0,0,0,0.15,0.6,1,0.5,0],HEAT=[1,1,0.8,0.35,0,0,0,0,0.1,0.45,0.8,1];
function seasonOf(day){const d=dOf(day),m=d.getUTCMonth(),f=(d.getUTCDate()-1)/30,n=(m+1)%12,L0=(a)=>a[m]+(a[n]-a[m])*f;return {snow:L0(SNOW),aut:L0(AUT),heat:L0(HEAT),m}}

/* ---------- money, storage and trade ---------- */
function townPort(ti){return S.bld.some(b=>b.t==='port'&&b.town===ti&&!isSite(b))}
/* a building type the player may build now: its era has come, or a Union project unlocked it early */
function unlocked(t){return BT[t].era<=S.era||!!(S.hist&&S.hist.unl[t])}
function canPay(cost,t){for(const k in cost){if(k==='lt'){if(S.funds<cost.lt)return false}else if(!t||(t.stock[k]||0)<cost[k])return false}return true}
function missing(cost,t){for(const k in cost){const have=k==='lt'?S.funds:(t?t.stock[k]||0:0);if(have<cost[k])return k==='lt'?`Need ${fmt(cost[k]-have)} more Lt`:`Need ${Math.ceil(cost[k]-have)} more ${rname(k)} in ${t?t.n:'a town'}`}return ''}
function pay(cost,t){for(const k in cost){if(k==='lt')S.funds-=cost.lt;else t.stock[k]-=cost[k]}}
function upCost(b){const T0=BT[b.t];return b.lv===1?{lt:Math.round(T0.cost.lt*1.2),bricks:20,metal:5}:{lt:Math.round(T0.cost.lt*2.5),cement:30,metal:15}}
/* Local merchants: they pay SELL_F of the price (more at a port, where ships wait) and charge BUY_F of it. Deals abroad pay better. */
const SELL_F=0.8,SELL_PORT=1.3,BUY_F=1.5,BUY_PORT=1.2;
function sellUnit(ti,r){return S.prices[r]*SELL_F*(townPort(ti)?SELL_PORT:1)}
function sellVal(ti,r){return 25*sellUnit(ti,r)}
function buyVal(ti,r){return 25*S.prices[r]*(townPort(ti)?BUY_PORT:BUY_F)}
function canBuyHere(ti,r){return !RI[r].port||townPort(ti)||S.bld.some(b=>b.t==='customs'&&b.town===ti&&!isSite(b))}
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
const isMat=r=>MATS.includes(r);
function moveCargo(A,B0,spec,cap,rec){if(cap<=0)return 0;let left=cap;const auto=spec==='auto',list=auto?RES:spec;
  const cand=[];list.forEach(r=>{const sa=A.stock[r]||0,da=A.dem[r]||0,db=B0.dem[r]||0,sb=B0.stock[r]||0,sp=room(B0,r);let amt;
    if(auto){amt=0;if(db>0.01&&sb/db<(sa/(da+1e-3))*0.8)amt=Math.min((sa*db-sb*da)/(da+db),db*25-sb);
      if(isMat(r)&&sb<40&&sa>60)amt=Math.max(amt,Math.min(40-sb,sa-60));
      /* a store filling up sends its surplus on to a town with room (only from the fuller to the emptier, so nothing goes back) */
      const ca=A.cap||STORE_BASE,cb=B0.cap||STORE_BASE,fa=sa/ca,fb=sb/cb;if(fa>0.75&&fa-fb>0.25)amt=Math.max(amt,Math.min((fa-fb)/2*Math.min(ca,cb),sa-ca*0.6));
      amt=Math.min(amt,sa-Math.max(da*5,keptOf(A,r)),sp)}
    else amt=Math.min(sa-Math.max(da*5,keptOf(A,r)),sp);if(amt>0.05)cand.push([r,amt,db>0?sb/db:99])});
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

/* ---------- construction ----------
   A building starts as a plan. Its site (b.c) takes what the plan costs as it comes: money from the treasury, above the reserve
   the player keeps (S.keep), and materials from its town's stock, above five days of the town's own use. The builders then need
   c.d days, and work no further than the share of the plan that has been delivered, so a site half supplied stands half built.
   What a site still lacks counts as demand in its town, so routes on Auto and merchants bring it. A modernization (c.up) is a
   site on a building that keeps working. b.c = {n: needs, g: got, p: progress 0 to 1, d: days, up, hold, pri}; b.cw says how it
   stands and b.wait lists what it lacks (both worked out each day, not saved). */
const isSite=b=>!!b.c&&!b.c.up;
/* what a town holds back of a good: the fuel it keeps to heat its homes in winter (t.hold, set each morning). Industry,
   building sites, routes, deals and carters leave it alone. */
const keptOf=(t,r)=>(t.hold&&t.hold[r])||0;
let SITES=[];
function siteNew(b,cost,days,up){b.c={n:{...cost},g:{},p:0,d:Math.max(1,days||20)};if(up)b.c.up=1;else{b.eff=0;b.why='Planned'}b.cw='Planned';b.wait=Object.keys(cost);return b}
function startUpgrade(b){return siteNew(b,upCost(b),Math.max(10,Math.round((BT[b.t].bd||30)*(b.lv===1?0.5:0.8))),true)}
/* the share of a plan's needs that is on site */
function siteGot(c){let f=1;for(const k in c.n)if(c.n[k]>0)f=Math.min(f,(c.g[k]||0)/c.n[k]);return f}
const buildRate=()=>Math.max(0.2,histProd()*fxMul('build'));
/* days of work left once everything is delivered */
function siteDays(b){return Math.max(1,Math.ceil((1-b.c.p)*b.c.d/buildRate()-1e-6))}
function siteDone(b){const c=b.c,T0=BT[b.t],t=b.town>=0?S.towns[b.town]:null,at=t?' near '+t.n:'';delete b.c;b.cw='';b.wait=null;
  if(c.up){b.lv++;log(`${T0.n}${at} modernized to Lv ${b.lv}.`,'good')}
  else{b.eff=0;b.why='Starting';S.stats.built=(S.stats.built||0)+1;log(`${T0.n} finished${at}.`,'good')}
  if(NOTES.length<3)NOTES.push(c.up?`${T0.n}${at} is now Lv ${b.lv}`:`${T0.n} finished${at}`);
  NET.dirty=true;WV.bld++}
/* A plan given up: what its site had taken comes back, the money to the treasury and the materials to its town. */
function cancelSite(b){const c=b.c;if(!c)return;const ti=b.town>=0?b.town:nearestTown(b.x,b.z,true),t=S.towns[ti];
  for(const k in c.g){if(k==='lt')S.funds+=c.g[k];else if(t)t.stock[k]=(t.stock[k]||0)+c.g[k]}
  delete b.c;b.cw='';b.wait=null;if(c.up)WV.bld++;else removeB(b);NET.dirty=true}
/* Carters. What builders need and their own town cannot give comes from the nearest town along the roads and railways that
   has it to spare: HAUL loads a day of each material for each town, halved for every HAUL_KM real km of the way (a railway
   counts as half its length), from no further than HAUL_MAX km. Slow next to a route, but no site waits for ever while the
   country has what it needs. haulFrom(ti): the towns in reach, nearest first, as [town, km of the way]. */
const HAUL=4,HAUL_KM=50,HAUL_MAX=200;
let HAULC={ver:-1,m:new Map()},HAULD=new Map();
function haulFrom(ti){if(HAULC.ver!==NET.ver)HAULC={ver:NET.ver,m:new Map()};let out=HAULC.m.get(ti);if(out)return out;out=[];
  const dist=new Map([[ti,0]]),done=new Set(),max=HAUL_MAX*MAPK;
  for(;;){let u=-1,du=Infinity;dist.forEach((d,k)=>{if(d<du&&!done.has(k)){du=d;u=k}});if(u<0||du>max)break;done.add(u);if(u!==ti)out.push([u,du]);
    for(const n of (NET.adj[u]||[])){const e=NET.edges[n],o=e.a===u?e.b:e.a,T=S.towns[o];if(!T||T.lock||done.has(o))continue;
      const d=du+Math.min(e.road?e.road.len:Infinity,e.rail?e.rail.len*0.5:Infinity);if(d<(dist.has(o)?dist.get(o):Infinity))dist.set(o,d)}}
  HAULC.m.set(ti,out);return out}
/* bring up to `want` loads of k toward town ti today; returns {q, from: the town most of it came from} */
function haul(ti,k,want){const key=ti+':'+k;let left=HAULD.has(key)?HAULD.get(key):1,q=0,from=-1,most=0;
  if(left>1e-6&&want>1e-6)for(const [o,d] of haulFrom(ti)){const X=S.towns[o],rate=HAUL*Math.pow(0.5,d/(HAUL_KM*MAPK)),spare=(X.stock[k]||0)-Math.max(((X.dem&&X.dem[k])||0)*10,keptOf(X,k));
    if(spare<=0.01)continue;const x=Math.min(want-q,spare,rate*left);if(x<=1e-6)continue;
    X.stock[k]-=x;q+=x;left-=x/rate;if(x>most){most=x;from=o}if(want-q<=1e-6||left<=1e-6)break}
  HAULD.set(key,left);return {q,from}}
/* What is paid at once (a road, a railway, a new town): money from the treasury, materials from the paying town's store and
   then from the towns in the carters' reach that have some to spare, nearest first.
   takePlan(cost, ti) → {ok, why: what is missing, take: [[town, good, loads]], far: some of it comes from another town} */
function takePlan(cost,ti){const t=S.towns[ti],take=[];let far=false;
  if((cost.lt||0)>S.funds)return {ok:false,why:`Need ${fmt(cost.lt-S.funds)} more Lt`,take,far};
  for(const k in cost){if(k==='lt'||!(cost[k]>0))continue;let need=cost[k];
    if(t){const own=Math.min(need,Math.max(0,(t.stock[k]||0)-keptOf(t,k)));if(own>0){take.push([ti,k,own]);need-=own}
      if(need>1e-6)for(const [o] of haulFrom(ti)){const X=S.towns[o],sp=(X.stock[k]||0)-Math.max(((X.dem&&X.dem[k])||0)*10,keptOf(X,k));if(sp<=0.01)continue;
        const q=Math.min(need,sp);take.push([o,k,q]);need-=q;far=true;if(need<=1e-6)break}}
    if(need>1e-6)return {ok:false,why:`Need ${Math.ceil(need)} more ${rname(k)} within ${HAUL_MAX} km of ${t?t.n:'a town'} by road`,take,far}}
  return {ok:true,why:'',take,far}}
function payPlan(cost,ti){const p=takePlan(cost,ti);if(!p.ok)return false;S.funds-=cost.lt||0;p.take.forEach(([o,k,q])=>{const X=S.towns[o];X.stock[k]=Math.max(0,(X.stock[k]||0)-q)});return true}
function runSites(){HAULD.clear();const hp=buildRate(),own=new Map();let avail=Math.max(0,S.funds-(S.keep||0));
  SITES.sort((a,b)=>(b.c.pri||0)-(a.c.pri||0)||a.id-b.id);
  for(const b of SITES){const c=b.c,t=b.town>=0?S.towns[b.town]:null,lack=[];b.hf=null;
    if(c.hold){b.cw='On hold';b.wait=[]}
    else if(!t||t.lock){b.cw=naTxt(b);b.wait=[]}
    else{
      /* the town's own use today, before any site asked for more */
      let d0=own.get(t);if(!d0){d0={...t.dem};own.set(t,d0)}
      for(const k in c.n){const miss=c.n[k]-(c.g[k]||0);if(miss<=1e-6)continue;let q;
        if(k==='lt'){q=Math.min(miss,avail);avail-=q;S.funds-=q;BUD.build-=q}
        else{q=Math.max(0,Math.min(miss,(t.stock[k]||0)-Math.max((d0[k]||0)*5,keptOf(t,k))));t.stock[k]=(t.stock[k]||0)-q;
          /* the rest comes by cart from the nearest town with some to spare */
          if(miss-q>1e-6){const h=haul(b.town,k,miss-q);if(h.q>0){q+=h.q;(b.hf=b.hf||{})[k]=h.from}}
          if(t._us)t._us[k]=(t._us[k]||0)+q;
          /* what is still missing is wanted here, so routes and merchants bring it too */
          if(miss-q>1e-6)t.dem[k]=(t.dem[k]||0)+(miss-q)/10}
        c.g[k]=(c.g[k]||0)+q;if(miss-q>1e-6)lack.push(k)}
      const fr=siteGot(c);
      if(c.p<fr-1e-9){c.p=Math.min(fr,c.p+hp/c.d);b.cw='Building'}
      else{const dry=lack.filter(k=>k==='lt'||!b.hf||b.hf[k]===undefined);
        b.cw=!lack.length?'Building':dry.length?'Waiting for '+dry.map(k=>k==='lt'?'money':rname(k)).join(' and '):'Carts bring '+lack.map(rname).join(' and ')}
      b.wait=lack;
      if(c.p>=1-1e-6){siteDone(b);continue}}
    if(!c.up){b.eff=c.p;b.why=b.cw}}
  /* homes: a town that waits for the material of its houses gets it the same way, into its store */
  S.towns.forEach((t,ti)=>{if(t.lock||!t.hmat||!RI[t.hmat])return;const k=t.hmat,want=Math.min(12-(t.stock[k]||0),room(t,k));if(want<=0.01)return;
    const h=haul(ti,k,want);if(h.q>0)t.stock[k]=(t.stock[k]||0)+h.q})}
/* building sites and modernizations of one settlement, or of the whole country (ti < 0) */
function sitesOf(ti){return S.bld.filter(b=>b.c&&(ti<0||b.town===ti))}

/* ---------- labour: local jobs first, then commuting on foot or by passenger route ---------- */
function commute(act){act.forEach(n=>{const t=S.towns[n];t.comIn=0;t.comOut=0;t.free=Math.max(0,t.wf-t.jobs);t.vac=Math.max(0,t.jobs-t.wf)});
  S.routes.forEach(r=>r.paxUsed=0);const links=[];
  NET.edges.forEach(e=>{if(e.road&&e.road.len<=WALK_KM)links.push({a:e.a,b:e.b,cap:3,len:e.road.len})});
  S.routes.forEach(r=>{if(r.ok&&r.pax)links.push({a:r.a,b:r.b,cap:r.cap*0.5,len:r.len,r})});links.sort((x,y)=>x.len-y.len);
  links.forEach(l=>{const A=S.towns[l.a],B0=S.towns[l.b];if(A.lock||B0.lock)return;let c=l.cap;
    [[A,B0],[B0,A]].forEach(([x,y])=>{const m=Math.min(x.free,y.vac,c);if(m>0){x.free-=m;y.vac-=m;x.comOut+=m;y.comIn+=m;c-=m;if(l.r)l.r.paxUsed+=m}})});
  act.forEach(n=>{const t=S.towns[n];t.fill=t.jobs?Math.min(1,(Math.min(t.wf,t.jobs)+t.comIn)/t.jobs):1})}

/* ---------- passing effects of chance and history ----------
   S.fx: [{k (what it scales: farm, stock, fish, heat, build, prod, tax), f (factor), until (day), n (what the player reads),
   reg (one region) or ti (one settlement)}] */
function addFx(k,f,days,n,o){S.fx.push(Object.assign({k,f,until:S.day+days,n:n||''},o||{}))}
function fxMul(k,t){let m=1;for(const e of S.fx){if(e.k!==k||S.day>e.until)continue;if(e.reg&&(!t||e.reg!==t.reg))continue;if(e.ti!==undefined&&(!t||S.towns[e.ti]!==t))continue;m*=e.f}return m}
/* a winter of heating, in days of full frost (the seasons' heating factors add up to about this) */
const WINTER=150;
/* how far the current era's new wants have set in: 0 on the day it begins, 1 after WANT_YEARS */
function wantK(){return clamp((S.day-(S.eraDay||0))/(WANT_YEARS*365),0,1)}

/* ---------- production and town life ---------- */
/* residents a house lot holds: village farmsteads hold fewer than town houses */
function houseCap(b){return b.f&&b.lv===1?FARMSTEAD_CAP:HOUSE.cap[b.lv]}
function useInputs(b,e,st,dem,fill,us,hold){const T0=BT[b.t];if(!T0.in)return 1;const im=INM[b.lv];let ir=1;b.lack='';b.kept=0;
  for(const r in T0.in){dem[r]=(dem[r]||0)+T0.in[r]*im*fill;const need=T0.in[r]*im*e;if(need>0){const h=(hold&&hold[r])||0,q=Math.max(0,(st[r]||0)-h)/need;if(q<ir){ir=q;b.lack=r;b.kept=h>0.5&&(st[r]||0)>=need*0.9?1:0}}}
  ir=clamp(ir,0,1);for(const r in T0.in){const q=T0.in[r]*im*e*ir;st[r]=(st[r]||0)-q;us[r]=(us[r]||0)+q}return ir}
/* buildings that make nothing themselves: what they do for their town */
const IDLE=new Set(['station','warehouse','customs','port']);
function idleWhy(b,t){if(!b.on)return 'Paused';
  if(b.t==='station')return `Trains stop here for ${t.n}`;
  if(b.t==='warehouse')return `Stores goods for ${t.n}`;
  if(b.t==='port')return `Ships load here for ${t.n}`;
  const m=b.gate?Object.keys(MARKETS).filter(k=>MARKETS[k].gate.includes(b.gate)).map(k=>MARKETS[k].n):[];
  return m.length?`Trade with ${m.join(' and ')} crosses here`:'No market across this border now'}
function why(b,fill,pr,ir){if(ir<0.9)return b.kept?'Fuel kept for homes':'Missing '+rname(b.lack);if(pr<0.9)return 'Not enough power';if(fill<0.9)return 'Short of workers';return 'Running'}
const NA_TXT={noroad:'No road to a town',far:'Too far from a town hall'};
function naTxt(b){return b.na==='locked'?heldTxt(rgnAt(b.x,b.z)):NA_TXT[b.na]||'Not connected'}
let BYT=[];
function phase1(ti){const t=S.towns[ti];let house=0,jobs=0,cap=STORE_BASE,sch=0,cli=0,pol=0,hn=0;
  BYT[ti].forEach(b=>{const T0=BT[b.t];if(b.t==='house'){house+=houseCap(b);pol+=polAt(b.x,b.z);hn++}else if(T0.w&&b.on)jobs+=T0.w;
    if(T0.store)cap+=WH_CAP[b.lv];if(T0.svc==='school'&&b.on)sch++;if(T0.svc==='clinic'&&b.on)cli++});
  t.house=house;t.cap=cap;t.wf=t.pop*0.5;t.jobs=jobs;t.pol=hn?pol/hn:0;t.nsch=sch;t.ncli=cli;t.dem={};t._mk={};t._us={};t._tr={};
  /* fuel for winter: a town keeps a winter's peat and timber for everyone its own woodlots do not heat (as much as its store
     holds), peat first. Villages gather their own. */
  const fk=t.vil?0:Math.min(Math.max(0,t.pop-(t.pop0||0))*0.03*WINTER,cap*1.2),hp=Math.min(t.stock.peat||0,fk);
  t.fkeep=fk;t.hold={peat:hp,timber:Math.min(t.stock.timber||0,fk-hp)}}
function phase1b(ti){const t=S.towns[ti],st=t.stock;t.edu=Math.min(1,t.nsch*50*t.fill/Math.max(1,t.pop)+(polOn('schools')?0.25:0));t.med=Math.min(1,t.ncli*70*t.fill/Math.max(1,t.pop));
  t.pm=(0.7+0.6*t.h/100)*(1+0.1*t.edu);t.powS=0;t.powD=0;
  BYT[ti].forEach(b=>{const T0=BT[b.t];if(!T0.pow)return;if(!b.on){b.eff=0;b.why='Paused';return}
    const ir=useInputs(b,t.fill,st,t.dem,t.fill,t._us,t.hold);t.powS+=T0.pow*LV[b.lv]*t.fill*ir;b.eff=t.fill*ir;b.why=why(b,t.fill,1,ir)});
  BYT[ti].forEach(b=>{const T0=BT[b.t];if(T0.powNeed&&b.on)t.powD+=T0.powNeed*LV[b.lv]*t.fill;if(T0.svc){b.eff=b.on?t.fill:0;b.why=b.on?(t.fill<0.9?'Short of workers':'Running'):'Paused'}});
  if(S.era>=2&&!t.vil)t.powD+=t.pop*(S.era>=3?0.06:0.03)}
function phase2(ti,sea){const t=S.towns[ti],st=t.stock,era=S.era,pr=t.pr,fill=t.fill,hp=histProd()*fxMul('prod',t),mk=t._mk,us=t._us;
  const fxFarm=fxMul('farm',t),fxStock=fxMul('stock',t)*(polOn('coops')?1.15:1),fxFish=fxMul('fish',t);
  /* fields take fertiliser when the town has some (or can be sent some) */
  const fertOn=(st.fertiliser||0)>0.01||era>=3||!!S.hist.unl.fert;
  BYT[ti].forEach(b=>{const T0=BT[b.t];if(!T0.out)return;if(!b.on){b.eff=0;b.why='Paused';return}
    const p=T0.powNeed?pr:1,e0=fill*p,ir=useInputs(b,e0,st,t.dem,fill,us,t.hold);let full=false;
    let mod=(b.t==='farm'||b.t==='potato'?S.mod.farm:1)*(b.k||1)*hp*(T0.fert?fxFarm:1)*(b.t==='dairy'||b.t==='pigs'?fxStock:1)*(b.t==='fishery'?fxFish:1);
    b.fz=0;
    if(T0.fert&&fertOn){t.dem.fertiliser=(t.dem.fertiliser||0)+FERT_USE*fill;const q=FERT_USE*e0;if(q>0&&(st.fertiliser||0)>=q){st.fertiliser-=q;us.fertiliser=(us.fertiliser||0)+q;mod*=FERT_GAIN;b.fz=1}}
    for(const r in T0.out){const made=T0.out[r]*LV[b.lv]*e0*ir*t.pm*mod,sp=room(t,r),q=Math.min(made,sp);if(sp<made*0.5)full=true;st[r]=(st[r]||0)+q;mk[r]=(mk[r]||0)+q}
    b.eff=e0*ir;b.why=full?'Storage full':why(b,fill,p,ir)});
  /* the settlement's own fields and woodlots: they feed its 1918 population and heat their homes, so it never shrinks below that size */
  const base=t.pop0||0,sub=histSub(t);['grain','potatoes'].forEach(r=>{const q=Math.min(base*0.05*sub,room(t,r));st[r]=(st[r]||0)+q;mk[r]=(mk[r]||0)+q});
  const need=t.pop*0.1;FOOD.forEach(r=>{t.dem[r]=(t.dem[r]||0)+need*0.3});
  t.ate={};let rem=need,pool=FOOD.filter(r=>(st[r]||0)>1e-4);
  while(rem>1e-6&&pool.length){const share=rem/pool.length,next=[];pool.forEach(r=>{const take=Math.min(share,st[r]);st[r]-=take;rem-=take;t.ate[r]=(t.ate[r]||0)+take;us[r]=(us[r]||0)+take;if(st[r]>1e-4)next.push(r)});pool=next}
  const fed=need?(need-rem)/need:1;t.vari=FOOD.filter(r=>(t.ate[r]||0)>=need*0.08).length;
  t.fdays=need>0?FOOD.reduce((a,r)=>a+(st[r]||0),0)/need:99;
  /* heating: a village gathers its own firewood however it grows; a town's woodlots heat only its people of 1918 */
  const hk=0.03*sea.heat*(era>=3&&pr>0.9?0.5:1)*fxMul('heat',t),hm=t.pop*hk,hsub=(t.vil?t.pop:Math.min(t.pop,base))*hk,hneed=hm-hsub;
  /* a town wants its winter store full all year: twenty days of this demand make the store, so routes and merchants fill it */
  const fk=t.fkeep||0;t.dem.peat=(t.dem.peat||0)+Math.max(hneed*0.6,fk*0.6/20);t.dem.timber=(t.dem.timber||0)+Math.max(hneed*0.4,fk*0.4/20);
  let hr=hneed;['peat','timber'].forEach(r=>{const take=Math.min(hr,st[r]||0);st[r]=(st[r]||0)-take;us[r]=(us[r]||0)+take;hr-=take});t.heat=hm>0?1-hr/hm*Math.min(1,sea.heat/0.35):1;
  /* materials the town waits for to build homes */
  if(t.hmat)t.dem[t.hmat]=(t.dem[t.hmat]||0)+0.3;
  const eat=(r,per)=>{const nd=t.pop*per;t.dem[r]=(t.dem[r]||0)+nd;const got=Math.min(st[r]||0,nd);st[r]=(st[r]||0)-got;us[r]=(us[r]||0)+got;return nd?got/nd:1};
  /* what towns want beyond food and fuel (villages make their own) */
  t.want={};if(!t.vil)for(const W of WANTS)if(W.era<=era)t.want[W.r]=eat(W.r,W.per);
  let h=58,note='Content';const unemp=Math.max(0,t.wf-Math.min(t.wf,t.jobs)-t.comOut-Math.min(t.pop,base)*0.5),wk=wantK();
  h+=Math.max(0,t.vari-1)*4;h+=6*t.med;h+=histMood(t);
  if(unemp>t.wf*0.25+1&&S.hist.path!=='soviet'){h-=6;note='Unemployment'}
  if(t.pol>0.3){h-=Math.min(15,t.pol*5);note='Polluted'}
  if(era>=2&&!t.vil){const k=era>2?1:wk;if(pr>=0.95)h+=6;else if(pr<0.8){h-=8*k;if(k>0.3)note='Blackouts'}}
  if(!t.vil)for(let q=WANTS.length-1;q>=0;q--){const W=WANTS[q],got=t.want[W.r];if(got===undefined)continue;
    if(got>=0.99)h+=W.up;else if(W.down){const k=W.era<era?1:wk;h-=W.down*(1-got)*k;if(k>0.3)note='Want '+rname(W.r)}}
  if(t.heat<0.95){h-=14*(1-t.heat);note='Cold homes'}
  if(t.pop>t.house+0.3){h-=12;note='Overcrowded'}
  if(fed<1){h-=50*(1-fed);if(fed<0.97)note='Hungry'}
  if(note==='Content'&&h>=70)note='Thriving';
  t.note=note;t.fed=fed;t.unemp=unemp;t.h+=(clamp(h,5,100)-t.h)*0.08;
  const hf=t.h/62;
  /* growth needs spare food: a few days' stock, and more coming in than is eaten (or a food that fills its store), unless the
     town is still below its old size. A starting stock alone does not make a village grow, only to go hungry when it runs out. */
  const fbal=FOOD.reduce((a,r)=>a+(t.dl[r]||0),0),full=FOOD.some(r=>(st[r]||0)>=t.cap*0.95);
  /* a town also needs fuel put by before it takes in more people than its woodlots heat: a winter's worth for everyone beyond
     its 1918 size (t.fuelw: the share of that winter in store). Without it the town holds its size, and if homes go cold the
     newcomers leave again. */
  const over=t.vil?0:Math.max(0,t.pop-base);t.fuelw=fk>0.01?((st.peat||0)+(st.timber||0))/fk:9;t.nofuel=!t.vil&&t.pop>=base-0.05&&t.fuelw<0.9?1:0;
  if(fed>=0.99&&t.pop<t.house&&(t.pop<base||(!t.nofuel&&t.fdays>=8&&(fbal>=need*0.015||full))))t.pop=Math.min(t.house,t.pop+Math.max(0.01,t.pop*0.004)*hf*(1+0.3*t.med)*(polOn('health')?1.15:1));
  if(fed<0.999)t.pop-=t.pop*(1-fed)*0.02;if(t.heat<0.9&&over>0)t.pop-=over*(1-t.heat)*0.02;if(t.pop>t.house)t.pop-=(t.pop-t.house)*0.03;t.pop=Math.max(Math.min(base,0.2),t.pop);
  const tax=t.pop*(t.vil?0.04:0.08)*Math.min(1.4,hf)*histTax()*fxMul('tax',t);S.funds+=tax;BUD.tax+=tax;
  const upk=S.hist.priv?0.75:1;BYT[ti].forEach(b=>{if(b.t!=='house'&&b.t!=='hall'&&b.t!=='landmark'&&b.t!=='station'){const c=(BT[b.t].store?0.3:0.4)*b.lv*(b.on?1:0.3)*upk;S.funds-=c;BUD.bld-=c}});
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
/* Towns grow into zoned lots along their streets, nearest and cleanest first; in later eras old houses are rebuilt bigger.
   A town builds the homes of its era when it has the material, and plainer ones when it has not (t.hmat: what it waits for,
   which counts as demand so routes bring it). */
function homeLv(t){for(let lv=S.era;lv>=1;lv--)if(!missing(HOUSE.cost[lv],t))return lv;return 0}
function develop(ti){const t=S.towns[ti],top=S.era,n=1+Math.floor(t.pop/50),lacks=c=>Object.keys(c).find(k=>k!=='lt'&&(t.stock[k]||0)<c[k])||'';
  for(let q=0;q<n;q++){let best=null,bd=1e9;
    for(const l of S.lots){if(l.town!==ti)continue;const sc=l.cd*0.5+hash2(l.id,7,3)*1.5+polAt(l.x,l.z)*4;if(sc<bd){bd=sc;best=l}}
    if(best){const lv=homeLv(t);
      if(!lv){t.hmat=lacks(HOUSE.cost[top])||lacks(HOUSE.cost[1]);t.hint=`Needs ${costTxt(HOUSE.cost[top])} to build homes`;return}
      const cost=HOUSE.cost[lv];pay(cost,t);BUD.homes-=cost.lt||0;useMat(t,cost);removeLot(best);const b=addB('house',best.x,best.z,best.rot,lv,true);b.town=ti;b.cd=best.cd;
      t.hint='';t.hmat=lv<top?lacks(HOUSE.cost[top]):'';continue}
    if(top>=2){const old=BYT[ti].filter(b=>b.t==='house'&&b.lv<top);if(old.length){const b=old[Math.floor(Math.random()*old.length)],cost=HOUSE.cost[top];
      if(missing(cost,t)){t.hmat=lacks(cost);t.hint=`Needs ${costTxt(cost)} to rebuild homes`;return}pay(cost,t);BUD.homes-=cost.lt||0;useMat(t,cost);b.lv=top;b.f=0;b._sty=null;WV.bld++;t.hint='';t.hmat='';continue}}
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
/* Chance. Each event returns [text, kind] or null when it does not fit the day: harvests come in late summer, floods in spring,
   and markets abroad matter only while Lithuania trades there. */
const monthOf=()=>dOf(S.day).getUTCMonth(),inMonths=(a,b)=>{const m=monthOf();return a<=b?m>=a&&m<=b:m>=a||m<=b},westOpen=()=>S.hist.path!=='soviet'&&!S.hist.war&&S.mkt.gb.open;
const someTown=f=>{const L0=activeIdx().filter(n=>!S.towns[n].vil&&(!f||f(S.towns[n])));return L0.length?S.towns[pick(L0)]:null};
const REV=[
  ()=>{if(!inMonths(7,9))return null;const t=S.towns[pick(activeIdx())],r=pick(['grain','potatoes']);t.stock[r]=Math.min(t.cap||STORE_BASE,(t.stock[r]||0)+40);return [`Bumper ${r==='grain'?'grain':'potato'} harvest around ${t.n}.`,'good']},
  ()=>{if(!westOpen())return null;S.prices.dairy=Math.min(RI.dairy.p*1.6,S.prices.dairy*1.3);return ['Butter prices rise on the London market.','']},
  ()=>{if(!westOpen())return null;S.prices.meat=Math.min(RI.meat.p*1.6,S.prices.meat*1.3);return ['British buyers want Lithuanian bacon. Meat prices rise.','']},
  ()=>{if(S.hist.path==='soviet'||S.hist.war)return null;S.prices.timber=Math.min(RI.timber.p*1.6,S.prices.timber*1.3);S.prices.planks=Math.min(RI.planks.p*1.6,S.prices.planks*1.3);return ['Sawmills and builders abroad are short of wood. Timber and plank prices rise.','']},
  ()=>{if(!inMonths(2,3))return null;const t=S.towns[tIdx('kau')],l=Math.floor((t.stock.timber||0)*0.3);if(l<1)return null;t.stock.timber-=l;return [`A spring flood on the Nemunas washes away ${l} timber in Kaunas.`,'warn']},
  ()=>{if(!inMonths(7,9))return null;const t=S.towns[pick(activeIdx())],l=Math.floor((t.stock.grain||0)*0.25);if(l<1)return null;t.stock.grain-=l;return [`A wet harvest spoils ${l} grain in ${t.n}.`,'warn']},
  ()=>{if(S.era<2||!westOpen())return null;S.prices.textiles=Math.min(RI.textiles.p*1.6,S.prices.textiles*1.3);return ['Linen is in fashion in Western Europe. Cloth prices rise.','']},
  ()=>{if(!inMonths(5,6))return null;addFx('farm',0.8,90,'A dry summer: fields yield a fifth less');return ['A dry summer. Grain, potato, flax and beet fields yield a fifth less until autumn.','warn']},
  ()=>{if(!inMonths(11,0))return null;addFx('heat',1.3,60,'A hard frost: homes burn a third more');return ['A hard frost grips the country. Homes burn a third more peat and timber for two months.','warn']},
  ()=>{if(S.era>2)return null;const t=someTown(x=>x.pop0<20&&!x.capital);if(!t)return null;['planks','timber'].forEach(r=>{t.stock[r]=Math.floor((t.stock[r]||0)*0.6)});
    addMood(-4,90,{ti:S.towns.indexOf(t),n:`The fire in ${t.n}`});return [`Fire burns through the wooden streets of ${t.n}. Its stores of timber and planks are lost in part.`,'warn']},
  ()=>{addFx('stock',0.7,120,'Cattle and pigs are sick: dairy and pig farms make a third less');return ['Foot-and-mouth disease spreads through the herds. Dairy and pig farms make a third less for four months.','warn']},
  ()=>{if(S.hist.path!=='free'||ymd(S.day)>'1939-09-01')return null;const q=400+100*Math.floor(Math.random()*5);S.funds+=q;return [`Lithuanians in America collect money for the old country. The treasury receives ${fmt(q)} Lt.`,'good']},
  ()=>{if(!inMonths(3,8))return null;addFx('fish',1.3,60,'Good catches: fisheries land a third more');return ['The herring and the smelt run thick this year. Fisheries land a third more for two months.','good']},
  ()=>{if(ymd(S.day)>'1950-01-01')return null;const t=someTown(x=>x.pop>=3);if(!t)return null;
    if((t.med||0)>=0.5)return [`Typhus breaks out in ${t.n}. Its clinic contains the outbreak.`,''];
    addMood(-6,180,{ti:S.towns.indexOf(t),n:`Typhus in ${t.n}`});return [`Typhus breaks out in ${t.n}, which has no clinic to contain it. The town suffers for half a year.`,'warn']},
  ()=>{if(S.era<2||S.hist.path!=='free'||pubTrust()>=45)return null;const t=someTown(x=>(x.jobs||0)>=20);if(!t)return null;
    addFx('prod',0.75,30,`A strike in ${t.n}`,{ti:S.towns.indexOf(t)});return [`Workers in ${t.n} go on strike. Its workshops and farms make a quarter less for a month.`,'warn']}];
/* Ministry tasks, roughly from easy to hard. can: the task makes sense now (the map shows the first open one that does). */
const OBJ=[
  {id:'route',t:'Set up a new transport route',r:400,ok:()=>S.stats.routesMade>0},
  {id:'built',t:'Finish your first building',r:300,ok:()=>(S.stats.built||0)>0},
  {id:'wh',t:'Build a warehouse',r:300,ok:()=>S.bld.some(b=>b.t==='warehouse'&&!isSite(b))},
  {id:'food4',t:'Give a town four kinds of food',r:800,ok:()=>S.towns.some(t=>!t.lock&&t.vari>=4)},
  {id:'school',t:'Open a school',r:400,ok:()=>S.bld.some(b=>b.t==='school'&&!isSite(b))},
  {id:'trade',t:'Sell goods abroad through a border post or a port',r:600,ok:()=>S.deals.some(d=>d.dir==='out'&&d.done>0)},
  {id:'mar',t:'Bring the railway to Marijampolė (it came in 1924)',r:800,ok:()=>NET.rail.has(tIdx('mar'))},
  {id:'tel',t:'Bring the railway to Telšiai (it came in 1926)',r:800,ok:()=>NET.rail.has(tIdx('tel'))},
  {id:'bir',t:'Link Biržai to the capital by rail or paved road',r:600,ok:()=>NET.linked.has(tIdx('bir'))},
  {id:'town',t:'Found a new town',r:1000,ok:()=>S.towns.some(t=>!t.orig)},
  {id:'port',t:'Sell goods through the port',r:800,ok:()=>S.stats.portSales>0,can:()=>S.own.pal==='lt'||S.own.kr==='lt'},
  {id:'kla',t:'Link Klaipėda to the railways of Lithuania (it was done in 1932, through Telšiai)',r:1500,ok:()=>NET.rail.has(tIdx('kla')),can:()=>S.own.kr==='lt'},
  {id:'p800',t:'Reach 800k residents',r:1500,ok:()=>totals().pop>=800},
  {id:'era2',t:'Enter the Industrialization era',r:2000,ok:()=>S.era>=2},
  {id:'metal',t:'Bring in 40 metal from abroad for the first factories',r:800,ok:()=>totals().stock.metal>=40,can:()=>S.era>=2},
  {id:'sugar',t:'Open a sugar factory (the first opened in Marijampolė in 1931)',r:1500,ok:()=>S.bld.some(b=>b.t==='sugar'&&!isSite(b)),can:()=>S.era>=2},
  {id:'lit',t:'Power every town',r:3000,ok:()=>S.era>=2&&S.towns.every(t=>t.lock||t.vil||t.pr>=0.95),can:()=>S.era>=2},
  {id:'era3',t:'Reach Modern Lithuania',r:5000,ok:()=>S.era>=3,can:()=>S.era>=2},
  {id:'cement',t:'Open a cement works on limestone (Akmenė made its first cement in 1952)',r:3000,ok:()=>S.bld.some(b=>b.t==='cement'&&!isSite(b)),can:()=>unlocked('cement')}];
function checkObj(){OBJ.forEach(o=>{if(!S.obj[o.id]&&o.ok()){S.obj[o.id]=1;S.funds+=o.r;log(`Ministry task done: ${o.t}. +${fmt(o.r)} Lt`,'good');NOTES.push(`Task done: ${o.t.replace(/ \(.*\)$/,'')} · +${fmt(o.r)} Lt`)}})}
/* the task the map shows: the first open one that makes sense now */
function curTask(){return OBJ.find(o=>!S.obj[o.id]&&(!o.can||o.can()))||null}

function tick(){
  if(NET.dirty)analyze();
  S.day++;const f0=S.funds,act=activeIdx(),before={},sea=seasonOf(S.day);for(const k in BUD)BUD[k]=0;
  if(S.fx.length)S.fx=S.fx.filter(e=>S.day<=e.until);
  RES.forEach(r=>{const base=RI[r].p*depAt(r);let p=S.prices[r]*(1+(Math.random()-0.5)*0.04);p+=(base-p)*0.012;S.prices[r]=clamp(p,base*0.6,base*1.6)});
  /* building sites wait apart: they give no work, make nothing and cost no upkeep until the builders are done */
  BYT=S.towns.map(()=>[]);SITES=[];S.bld.forEach(b=>{if(b.c){SITES.push(b);if(!b.c.up)return}
    if(b.town>=0&&!S.towns[b.town].lock){BYT[b.town].push(b);if(IDLE.has(b.t)){b.eff=b.on?1:0;b.why=idleWhy(b,S.towns[b.town])}}else if(b.t!=='house'&&b.t!=='hall'){b.eff=0;b.why=naTxt(b)}});
  act.forEach(n=>{before[n]={...S.towns[n].stock};before[n].pop=S.towns[n].pop;phase1(n)});
  S.routes.forEach(routeEval);commute(act);act.forEach(phase1b);
  const sup={},dem={};act.forEach(n=>{const t=S.towns[n],c=NET.grid[n];sup[c]=(sup[c]||0)+t.powS;dem[c]=(dem[c]||0)+t.powD});
  act.forEach(n=>{const t=S.towns[n],c=NET.grid[n];t.pr=dem[c]>0?Math.min(1,sup[c]/dem[c]):1;t.gS=sup[c];t.gD=dem[c]});
  act.forEach(n=>phase2(n,sea));
  runSites();runRoutes();runTraders();runDeals();warnLog();
  act.forEach(n=>{const t=S.towns[n];if(t.pop>=t.house*0.92&&t.fed>=0.99&&t.h>=45){if(++t.dev>=5){t.dev=0;develop(n)}}else if(t.pop<t.house*0.85)t.hint=''});
  /* smoothed per-day figures: net change of each good (routes and trade included), made, used, and population growth */
  act.forEach(n=>{const t=S.towns[n],b0=before[n],mk=t.mk||(t.mk={}),us=t.us||(t.us={}),tr=t.tr||(t.tr={});RES.forEach(r=>{const d=(t.stock[r]||0)-(b0[r]||0);t.dl[r]=(t.dl[r]||0)*0.8+d*0.2;
    mk[r]=(mk[r]||0)*0.8+(t._mk[r]||0)*0.2;us[r]=(us[r]||0)*0.8+(t._us[r]||0)*0.2;tr[r]=(tr[r]||0)*0.8+((t._tr||{})[r]||0)*0.2});t.gr=(t.gr||0)*0.9+(t.pop-b0.pop)*0.1});
  S.funds-=NET.up;BUD.lines=-NET.up;S.routes.forEach(r=>{if(!r.held){const c=r.n*VT[r.vt].up;S.funds-=c;BUD.routes-=c}});
  /* the army, allies and support schemes are paid before the day's balance is counted, so the top bar shows them */
  S.funds-=histSpend();
  /* the day's balance leaves out what building sites and new homes took: that is investment, and Money a day lists it apart */
  S.inc=S.inc*0.9+(S.funds-f0-BUD.build-BUD.homes)*0.1;
  const bu=S.bud||(S.bud={});for(const k in BUD)bu[k]=(bu[k]||0)*0.9+BUD[k]*0.1;
  if(S.funds<0&&S.day-(S.ms.broke||-999)>90){S.ms.broke=S.day;log('The treasury is empty and upkeep runs up a debt. Remove routes or buildings you do not need, or sell goods abroad.','warn');NOTES.push('The treasury is empty')}
  histTick();
  if(S.day>=S.nextRnd){S.nextRnd=S.day+130+Math.floor(Math.random()*140);let r=null;for(let q=0;q<6&&!r;q++)r=pick(REV)();if(r)log(r[0],r[1])}
  if(S.day%10===0)checkObj();
  const t=totals();
  /* a weekly sample of residents and treasury for the trend charts; halved in resolution when it grows long */
  if(S.day%7===0){const L0=S.series||(S.series=[]);L0.push([S.day,Math.round(t.pop*10)/10,Math.round(S.funds)]);if(L0.length>520)S.series=L0.filter((x,i)=>i%2===0||i===L0.length-1)}
  /* each good's stock in the whole country, once a month, for its chart (S.gs: {d0, step in months, n, v: {good: [stock]}}) */
  if(dOf(S.day).getUTCDate()===1){const g=S.gs.v?S.gs:(S.gs={d0:S.day,step:1,n:0,v:{}});
    if(g.n++%g.step===0){RES.forEach(r=>{(g.v[r]||(g.v[r]=[])).push(Math.round(t.stock[r]))});
      if(g.v[RES[0]].length>240){RES.forEach(r=>{g.v[r]=g.v[r].filter((x,i)=>i%2===0)});g.step*=2}}}
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
