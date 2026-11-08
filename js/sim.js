'use strict';
/* Lietuva 1918 — economy: towns, routes, food, heating, commuting, eras, events, objectives, saving. */
let S;
const tIdx=id=>S.towns.findIndex(t=>t.id===id);
function newGame(){
  S={v:5,day:0,funds:3000,inc:0,era:1,speed:1,kr:true,nid:1,rid:1,gid:1,lid:1,did:1,prices:{},log:[],won:false,ms:{},mod:{farm:1},ev:{},nextRnd:220,
    towns:[],bld:[],routes:[],nodes:[],edges:[],lots:[],deals:[],plan:null,obj:{},stats:{portSales:0,routesMade:0},sel:null,tab:'sel',cam:null};
  S.hist=newHistory();S.mkt=newMarkets();
  RES.forEach(r=>S.prices[r]=RI[r].p);
  genWorld();analyze();
  HIST_ROUTES.forEach(([a,b,m,vt,n])=>addRoute(tIdx(a),tIdx(b),m,vt,n,true));
  S.log=[
    {d:0,t:'Goods only move on transport routes. Open the Routes tab to see the old railway lines and cart routes, and add your own.',k:''},
    {d:0,t:'Every town and village feeds and heats its people from its own fields and woodlots, so it keeps its size without help. To grow it needs more food, homes and work.',k:''},
    {d:0,t:'Alytus, Tauragė and Utena have no road to the rest of the country. Link them so they can trade.',k:''},
    {d:0,t:'People are happier with more kinds of food on the table: grain, potatoes, dairy, meat and fish. In winter every home burns peat or timber.',k:''},
    {d:0,t:'The Council of Lithuania signs the Act of Independence in Vilnius. The new state must build an economy almost from nothing.',k:'hist'}];
}
/* Saved games: the graph and lots as compact arrays (coordinates to 10 m), and only the terrain cells that changed. */
const r2=v=>Math.round(v*100)/100;
function serialize(){if(typeof camSave==='function')S.cam=camSave();const o={...S};
  o.nodes=S.nodes.map(n=>[n.id,r2(n.x),r2(n.z)]);
  o.edges=S.edges.map(e=>[e.id,e.k==='rail'?1:0,e.lv,e.a,e.b,e.p.map(q=>[r2(q[0]),r2(q[1])])]);
  o.lots=S.lots.map(l=>[l.id,r2(l.x),r2(l.z),Math.round(l.rot*1000)/1000]);o.tf=tfDiff();return o}
function restore(o){const tf=o.tf;S=o;delete S.tf;
  S.nodes=o.nodes.map(a=>({id:a[0],x:a[1],z:a[2]}));
  S.edges=o.edges.map(a=>({id:a[0],k:a[1]?'rail':'road',lv:a[2],a:a[3],b:a[4],p:a[5]}));
  S.lots=o.lots.map(a=>({id:a[0],x:a[1],z:a[2],rot:a[3],town:-1,cd:0}));
  genTerrain();tfApply(tf);rebuildIndex();NET.dirty=true}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(serialize()))}catch(e){}}
function load(){try{const t=localStorage.getItem(SAVE_KEY);if(!t)return null;const o=JSON.parse(t);return o&&o.v===5&&o.edges&&o.towns?o:null}catch(e){return null}}
/* yo: only the year of this event is known, so the chronicle shows the year alone */
function log(t,k,yo){S.log.unshift({d:S.day,t,k:k||'',yo:yo?1:0});if(S.log.length>150)S.log.length=150}

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
function routeEval(r){const p=routePath(r),V=VT[r.vt],A=S.towns[r.a],B0=S.towns[r.b];r.ok=false;r.why='';r.len=0;r.cap=0;r.trip=0;
  if(!A||!B0){r.why='A town is missing';return}if(A.lock||B0.lock){r.why=`${(A.lock?A:B0).n} is not part of Lithuania`;return}
  if(!p){r.why=r.mode==='rail'?'No railway between their stations':'No road between them';return}
  if(V.elec&&p.lv<2){r.why='Electric trains need electric railway all the way';return}
  const sf=r.mode==='road'&&r.vt!=='cart'?ROADT[p.lv].spd:1,trips=V.spd*sf/(2*p.len+TRIP_OVERHEAD);r.len=p.len;r.trip=1/trips;r.cap=r.n*V.cap*trips;r.ok=true}
const isMat=r=>r==='timber'||r==='bricks';
function moveCargo(A,B0,spec,cap,rec){if(cap<=0)return 0;let left=cap;const auto=spec==='auto',list=auto?RES:spec;
  const cand=[];list.forEach(r=>{const sa=A.stock[r]||0,da=A.dem[r]||0,db=B0.dem[r]||0,sb=B0.stock[r]||0,sp=room(B0,r);let amt;
    if(auto){amt=0;if(db>0.01&&sb/db<(sa/(da+1e-3))*0.8)amt=Math.min((sa*db-sb*da)/(da+db),db*25-sb);
      if(isMat(r)&&sb<40&&sa>60)amt=Math.max(amt,Math.min(40-sb,sa-60));amt=Math.min(amt,sa-da*5,sp)}
    else amt=Math.min(sa-da*5,sp);if(amt>0.05)cand.push([r,amt,db>0?sb/db:99])});
  if(auto)cand.sort((x,y)=>x[2]-y[2]);
  cand.forEach(([r,amt])=>{const m=Math.min(amt,left);if(m<=0)return;A.stock[r]-=m;B0.stock[r]=(B0.stock[r]||0)+m;rec[r]=(rec[r]||0)+m;left-=m});return cap-left}
function runRoutes(){S.routes.forEach(r=>{r.mAB={};r.mBA={};r.used=0;if(!r.ok)return;const A=S.towns[r.a],B0=S.towns[r.b],gc=r.pax?r.cap*0.5:r.cap;
  const u=moveCargo(A,B0,r.ab,gc,r.mAB)+moveCargo(B0,A,r.ba,gc,r.mBA);r.used=gc>0?u/(2*gc):0})}

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
function useInputs(b,e,st,dem,fill){const T0=BT[b.t];if(!T0.in)return 1;const im=INM[b.lv];let ir=1;b.lack='';
  for(const r in T0.in){dem[r]=(dem[r]||0)+T0.in[r]*im*fill;const need=T0.in[r]*im*e;if(need>0){const q=(st[r]||0)/need;if(q<ir){ir=q;b.lack=r}}}
  ir=clamp(ir,0,1);for(const r in T0.in)st[r]=(st[r]||0)-T0.in[r]*im*e*ir;return ir}
function why(b,fill,pr,ir){if(ir<0.9)return 'Missing '+rname(b.lack);if(pr<0.9)return 'Not enough power';if(fill<0.9)return 'Short of workers';return 'Running'}
const NA_TXT={noroad:'No road to a town',far:'Too far from a town hall',locked:'Klaipėda joins Lithuania in 1923'};
function naTxt(na){return na==='locked'&&S.hist.lost?'The Klaipėda Region belongs to Germany':NA_TXT[na]||'Not connected'}
let BYT=[];
function phase1(ti){const t=S.towns[ti];let house=0,jobs=0,cap=STORE_BASE,sch=0,cli=0,pol=0,hn=0;
  BYT[ti].forEach(b=>{const T0=BT[b.t];if(b.t==='house'){house+=houseCap(b);pol+=polAt(b.x,b.z);hn++}else if(T0.w&&b.on)jobs+=T0.w;
    if(T0.store)cap+=WH_CAP[b.lv];if(T0.svc==='school'&&b.on)sch++;if(T0.svc==='clinic'&&b.on)cli++});
  t.house=house;t.cap=cap;t.wf=t.pop*0.5;t.jobs=jobs;t.pol=hn?pol/hn:0;t.nsch=sch;t.ncli=cli;t.dem={}}
function phase1b(ti){const t=S.towns[ti],st=t.stock;t.edu=Math.min(1,t.nsch*50*t.fill/Math.max(1,t.pop));t.med=Math.min(1,t.ncli*70*t.fill/Math.max(1,t.pop));
  t.pm=(0.7+0.6*t.h/100)*(1+0.1*t.edu);t.powS=0;t.powD=0;
  BYT[ti].forEach(b=>{const T0=BT[b.t];if(!T0.pow)return;if(!b.on){b.eff=0;b.why='Paused';return}
    const ir=useInputs(b,t.fill,st,t.dem,t.fill);t.powS+=T0.pow*LV[b.lv]*t.fill*ir;b.eff=t.fill*ir;b.why=why(b,t.fill,1,ir)});
  BYT[ti].forEach(b=>{const T0=BT[b.t];if(T0.powNeed&&b.on)t.powD+=T0.powNeed*LV[b.lv]*t.fill;if(T0.svc){b.eff=b.on?t.fill:0;b.why=b.on?(t.fill<0.9?'Short of workers':'Running'):'Paused'}});
  if(S.era>=2&&!t.vil)t.powD+=t.pop*(S.era>=3?0.06:0.03)}
function phase2(ti,sea){const t=S.towns[ti],st=t.stock,era=S.era,pr=t.pr,fill=t.fill,hp=histProd();
  BYT[ti].forEach(b=>{const T0=BT[b.t];if(!T0.out)return;if(!b.on){b.eff=0;b.why='Paused';return}
    const p=T0.powNeed?pr:1,e0=fill*p,ir=useInputs(b,e0,st,t.dem,fill),mod=(b.t==='farm'||b.t==='potato'?S.mod.farm:1)*(b.k||1)*hp;let full=false;
    for(const r in T0.out){const made=T0.out[r]*LV[b.lv]*e0*ir*t.pm*mod,sp=room(t,r);if(sp<made*0.5)full=true;st[r]=(st[r]||0)+Math.min(made,sp)}
    b.eff=e0*ir;b.why=full?'Storage full':why(b,fill,p,ir)});
  /* the settlement's own fields and woodlots: they feed its 1918 population and heat their homes, so it never shrinks below that size */
  const base=t.pop0||0,sub=histSub(t);['grain','potatoes'].forEach(r=>{st[r]=(st[r]||0)+Math.min(base*0.05*sub,room(t,r))});
  const need=t.pop*0.1;FOOD.forEach(r=>{t.dem[r]=(t.dem[r]||0)+need*0.3});
  t.ate={};let rem=need,pool=FOOD.filter(r=>(st[r]||0)>1e-4);
  while(rem>1e-6&&pool.length){const share=rem/pool.length,next=[];pool.forEach(r=>{const take=Math.min(share,st[r]);st[r]-=take;rem-=take;t.ate[r]=(t.ate[r]||0)+take;if(st[r]>1e-4)next.push(r)});pool=next}
  const fed=need?(need-rem)/need:1;t.vari=FOOD.filter(r=>(t.ate[r]||0)>=need*0.08).length;
  t.fdays=need>0?FOOD.reduce((a,r)=>a+(st[r]||0),0)/need:99;
  const hm=t.pop*0.03*sea.heat*(era>=3&&pr>0.9?0.5:1),hsub=Math.min(t.pop,base)*0.03*sea.heat*(era>=3&&pr>0.9?0.5:1),hneed=hm-hsub;
  t.dem.peat=(t.dem.peat||0)+hneed*0.6;t.dem.timber=(t.dem.timber||0)+hneed*0.4;
  let hr=hneed;['peat','timber'].forEach(r=>{const take=Math.min(hr,st[r]||0);st[r]=(st[r]||0)-take;hr-=take});t.heat=hm>0?1-hr/hm:1;
  const eat=(r,per)=>{const nd=t.pop*per;t.dem[r]=(t.dem[r]||0)+nd;const got=Math.min(st[r]||0,nd);st[r]=(st[r]||0)-got;return nd?got/nd:1};
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
  /* growth needs spare food: a few days' stock, and no more eaten than comes in, unless the town is still below its old size */
  const fbal=FOOD.reduce((a,r)=>a+(t.dl[r]||0),0);
  if(fed>=0.99&&t.pop<t.house&&(t.pop<base||(t.fdays>=8&&fbal>=-0.01)))t.pop=Math.min(t.house,t.pop+Math.max(0.01,t.pop*0.004)*hf*(1+0.3*t.med));
  if(fed<0.999)t.pop-=t.pop*(1-fed)*0.02;if(t.pop>t.house)t.pop-=(t.pop-t.house)*0.03;t.pop=Math.max(Math.min(base,0.2),t.pop);
  S.funds+=t.pop*(t.vil?0.04:0.08)*Math.min(1.4,hf)*histTax();
  BYT[ti].forEach(b=>{if(b.t!=='house'&&b.t!=='hall')S.funds-=(BT[b.t].store?0.3:0.4)*b.lv*(b.on?1:0.3)});
  if(fed<0.9&&S.day-t.lastWarn>45){t.lastWarn=S.day;log(`Food is running out in ${t.n}. People are leaving.`,'warn')}
  else if(t.heat<0.7&&S.day-t.lastWarn>45){t.lastWarn=S.day;log(`Homes in ${t.n} are cold. Send peat or timber.`,'warn')}
  RES.forEach(r=>{if((st[r]||0)<1e-4)st[r]=0;if(st[r]>t.cap)st[r]=t.cap})}
/* towns grow into zoned lots along their streets, nearest and cleanest first; in later eras old houses are rebuilt bigger */
function develop(ti){const t=S.towns[ti],lv=S.era,cost=HOUSE.cost[lv],n=1+Math.floor(t.pop/50);
  for(let q=0;q<n;q++){let best=null,bd=1e9;
    for(const l of S.lots){if(l.town!==ti)continue;const sc=l.cd*0.5+hash2(l.id,7,3)*1.5+polAt(l.x,l.z)*4;if(sc<bd){bd=sc;best=l}}
    if(best){if(missing(cost,t)){t.hint=`Needs ${costTxt(cost)} to build homes`;return}
      pay(cost,t);removeLot(best);const b=addB('house',best.x,best.z,best.rot,lv,true);b.town=ti;b.cd=best.cd;t.hint='';continue}
    if(lv>=2){const old=BYT[ti].filter(b=>b.t==='house'&&b.lv<lv);if(old.length){const b=old[Math.floor(Math.random()*old.length)];
      if(missing(cost,t)){t.hint=`Needs ${costTxt(cost)} to rebuild homes`;return}pay(cost,t);b.lv=lv;b.f=0;WV.bld++;t.hint='';continue}}
    t.hint='No room to grow: zone more land along its streets';return}}

/* ---------- history, chance and ministry tasks ---------- */
function unlockKla(){S.kr=false;S.towns.forEach(t=>{if(t.kr&&t.lock){t.lock=0;t.pop=t.pop0;t.h=62}});NET.dirty=true;WV.kr++}
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
const OBJ=[
  {id:'aly',t:'Link Alytus to the rest of the country',r:600,ok:()=>NET.linked.has(tIdx('aly'))},
  {id:'route',t:'Set up a new transport route',r:400,ok:()=>S.stats.routesMade>0},
  {id:'ute',t:'Link Utena',r:600,ok:()=>NET.linked.has(tIdx('ute'))},
  {id:'food3',t:'Give a town three kinds of food',r:800,ok:()=>S.towns.some(t=>!t.lock&&t.vari>=3)},
  {id:'tau',t:'Link Tauragė',r:600,ok:()=>NET.linked.has(tIdx('tau'))},
  {id:'wh',t:'Build a warehouse',r:300,ok:()=>S.bld.some(b=>b.t==='warehouse')},
  {id:'school',t:'Open a school',r:400,ok:()=>S.bld.some(b=>b.t==='school')},
  {id:'town',t:'Found a new town',r:1000,ok:()=>S.towns.some(t=>!t.orig)},
  {id:'p800',t:'Reach 800k residents',r:1500,ok:()=>totals().pop>=800},
  {id:'kla',t:'Link Klaipėda after it joins in 1923',r:1500,ok:()=>NET.linked.has(tIdx('kla'))},
  {id:'port',t:'Sell goods through the port',r:800,ok:()=>S.stats.portSales>0},
  {id:'trade',t:'Sell goods abroad through a border post or a port',r:600,ok:()=>S.deals.some(d=>d.dir==='out'&&d.done>0)},
  {id:'era2',t:'Enter the Industrialization era',r:2000,ok:()=>S.era>=2},
  {id:'lit',t:'Power every town',r:3000,ok:()=>S.era>=2&&S.towns.every(t=>t.lock||t.vil||t.pr>=0.95)},
  {id:'era3',t:'Reach Modern Lithuania',r:5000,ok:()=>S.era>=3}];
function checkObj(){OBJ.forEach(o=>{if(!S.obj[o.id]&&o.ok()){S.obj[o.id]=1;S.funds+=o.r;log(`Ministry task done: ${o.t}. +${fmt(o.r)} Lt`,'good')}})}

function tick(){
  if(NET.dirty)analyze();
  S.day++;const f0=S.funds,act=activeIdx(),before={},sea=seasonOf(S.day);
  RES.forEach(r=>{const base=RI[r].p*depAt(r);let p=S.prices[r]*(1+(Math.random()-0.5)*0.04);p+=(base-p)*0.012;S.prices[r]=clamp(p,base*0.6,base*1.6)});
  BYT=S.towns.map(()=>[]);S.bld.forEach(b=>{if(b.town>=0&&!S.towns[b.town].lock)BYT[b.town].push(b);else if(b.t!=='house'&&b.t!=='hall'){b.eff=0;b.why=naTxt(b.na)}});
  act.forEach(n=>{before[n]={...S.towns[n].stock};phase1(n)});
  S.routes.forEach(routeEval);commute(act);act.forEach(phase1b);
  const sup={},dem={};act.forEach(n=>{const t=S.towns[n],c=NET.comp[n];sup[c]=(sup[c]||0)+t.powS;dem[c]=(dem[c]||0)+t.powD});
  act.forEach(n=>{const t=S.towns[n],c=NET.comp[n];t.pr=dem[c]>0?Math.min(1,sup[c]/dem[c]):1;t.gS=sup[c];t.gD=dem[c]});
  act.forEach(n=>phase2(n,sea));
  runRoutes();runDeals();
  act.forEach(n=>{const t=S.towns[n];if(t.pop>=t.house*0.92&&t.fed>=0.99&&t.h>=45){if(++t.dev>=5){t.dev=0;develop(n)}}else if(t.pop<t.house*0.85)t.hint=''});
  act.forEach(n=>{const t=S.towns[n];RES.forEach(r=>{const d=(t.stock[r]||0)-(before[n][r]||0);t.dl[r]=(t.dl[r]||0)*0.8+d*0.2})});
  S.funds-=NET.up;S.routes.forEach(r=>{S.funds-=r.n*VT[r.vt].up});
  S.inc=S.inc*0.9+(S.funds-f0)*0.1;
  histTick();
  if(S.day>=S.nextRnd){S.nextRnd=S.day+170+Math.floor(Math.random()*170);const r=pick(REV)();if(r)log(r[0],r[1])}
  if(S.day%10===0)checkObj();
  const t=totals();
  [750,1000,1500,2000,2500].forEach(x=>{if(t.pop>=x&&!S.ms['p'+x]){S.ms['p'+x]=1;log(`${popStr(x)} people now live in Lithuania's towns and villages.`,'good')}});
  if(!S.won&&S.era===3&&t.pop>=GOAL_POP&&t.linked===t.towns&&t.lit){S.won=true;log(`Every town is linked and lit, and ${popStr(GOAL_POP)} people live in the towns and villages. The plan is fulfilled.`,'good')}
}
/* National totals. towns and linked count towns only; villages are counted apart. */
function totals(){const t={pop:0,towns:0,vils:0,vpop:0,linked:0,lit:true,stock:{},dl:{}};RES.forEach(r=>{t.stock[r]=0;t.dl[r]=0});
  S.towns.forEach((x,n)=>{if(x.lock)return;t.pop+=x.pop;if(x.vil){t.vils++;t.vpop+=x.pop}else{t.towns++;if(NET.linked.has(n))t.linked++;if(x.pr<0.95)t.lit=false}
    RES.forEach(r=>{t.stock[r]+=x.stock[r]||0;t.dl[r]+=x.dl[r]||0})});return t}
function eraReq(){const n=S.era+1;if(n>3)return null;const R0=ERAS[n].req,t=totals(),L0=[];
  L0.push({t:`${popStr(R0.pop)} residents`,ok:t.pop>=R0.pop,q:popStr(t.pop)});
  L0.push({t:`${R0.linked} towns linked to Vilnius`,ok:t.linked>=R0.linked,q:t.linked+' of '+t.towns});
  if(R0.bricks)L0.push({t:`${R0.bricks} bricks in stock`,ok:t.stock.bricks>=R0.bricks,q:fmt(t.stock.bricks)});
  if(R0.textiles)L0.push({t:`${R0.textiles} linen cloth in stock`,ok:t.stock.textiles>=R0.textiles,q:fmt(t.stock.textiles)});
  L0.push({t:`${fmt(R0.lt)} Lt to invest`,ok:S.funds>=R0.lt,q:fmt(S.funds)});return L0}
function eraReady(){const x=eraReq();return !!x&&x.every(q=>q.ok)}
