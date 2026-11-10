'use strict';
/* Lietuva 1918 — dashboards: what each town and the whole country make, use and lack, the problems to fix, and one-tap fixes.
   No DOM and no THREE: plain data for panels.js. Problems come from the figures the day tick leaves on each town
   (fed, heat, house, jobs, pr, pol, hint, note) and from its buildings (why, lack). A fix is a button: {t: label, a: act data}. */
const PRODUCER={grain:'farm',potatoes:'potato',dairy:'dairy',meat:'pigs',fish:'fishery',timber:'forestry',peat:'peat',flax:'flax',beet:'beet',planks:'sawmill',bricks:'brick',beer:'brewery',sugar:'sugar',textiles:'linen',
  furniture:'furniture',cement:'cement',fertiliser:'fert',electronics:'elec'};
const pct=q=>Math.round((q||0)*100)+'%';
/* working buildings of a settlement (the day tick's grouping when there is one); building sites are listed apart (sitesOf) */
function bOfTown(ti){return BYT[ti]||S.bld.filter(b=>b.town===ti&&!isSite(b))}
/* "Brickworks ×2, Linen mill" */
function typeList(bs){const c=new Map();bs.forEach(b=>c.set(b.t,(c.get(b.t)||0)+1));return [...c].map(([t,n])=>BT[t].n+(n>1?' ×'+n:'')).join(', ')}

/* The neighbour with the most to spare of these goods, or, when no neighbour has any, the nearest town on the roads and
   railways that has (peat is dug in a few places only): a route to start, or a vehicle to add to the route there is.
   What a town keeps for its winter is not to spare. */
function suggestRoute(ti,goods){let best=null;
  const spare=T=>{let sp=0;goods.forEach(r=>{sp+=Math.max(0,(T.stock[r]||0)-Math.max((T.dem[r]||0)*6,keptOf(T,r)))});return sp};
  for(const n of NET.adj[ti]||[]){const e=NET.edges[n],o=e.a===ti?e.b:e.a,T=S.towns[o];if(!T||T.lock)continue;
    const sp=spare(T);if(sp>=8&&(!best||sp>best.sp))best={o,sp,m:e.rail&&pairPath('rail',ti,o)?'rail':'road'}}
  if(!best)for(const [o] of haulFrom(ti)){const T=S.towns[o];if(!T||T.lock||T.vil||spare(T)<20)continue;
    const pr=pairPath('rail',ti,o),p=pr||pairPath('road',ti,o);if(p){best={o,m:pr?'rail':'road',km:p.len};break}}
  if(!best)return null;
  const r=S.routes.find(q=>(q.a===ti&&q.b===best.o)||(q.b===ti&&q.a===best.o)),nm=S.towns[best.o].n;
  if(r)return r.ok?{t:`Add a ${VT[r.vt].one} from ${nm}`,a:{act:'rveh',r:r.id,d:1}}:null;
  return {t:`Route from ${nm}`+(best.km?`, ${Math.round(best.km/MAPK)} km`:''),a:{act:'newroute',a:best.o,b:ti,m:best.m}}}
/* The neighbour that needs this good most (fewest days of it in stock): a route to send a surplus there, or a vehicle for the route there is. */
function suggestOutlet(ti,r){let best=null;
  for(const n of NET.adj[ti]||[]){const e=NET.edges[n],o=e.a===ti?e.b:e.a,T=S.towns[o];if(!T||T.lock)continue;
    const dem=T.dem[r]||0;if(dem<0.05)continue;const days=(T.stock[r]||0)/dem;if(days>=20)continue;
    if(!best||days<best.days)best={o,days,m:e.rail&&pairPath('rail',ti,o)?'rail':'road'}}
  if(!best)return null;
  const rt=S.routes.find(q=>(q.a===ti&&q.b===best.o)||(q.b===ti&&q.a===best.o)),nm=S.towns[best.o].n;
  if(rt)return rt.ok?{t:`Add a ${VT[rt.vt].one} to ${nm}`,a:{act:'rveh',r:rt.id,d:1}}:null;
  return {t:`Route to ${nm}`,a:{act:'newroute',a:ti,b:best.o,m:best.m}}}
function buildFix(bt,ti,label){return bt&&BT[bt]&&unlocked(bt)?{t:label||BT[bt].n,a:{act:'build',bt,ti},b:1}:null}
/* buy a lot of 25 from the local merchants, where they trade and the town may buy this good */
function buyFix(ti,r){return S.hist.path!=='soviet'&&canBuyHere(ti,r)&&RI[r].era<=S.era?{t:`Buy 25 ${rname(r)}`,a:{act:'buy',ti,r},b:1}:null}
/* A paved road from the nearest linked town, laid out in the Road tool for the player to confirm (act 'linkroad'). */
function linkFrom(ti){const t=S.towns[ti];let best=-1,bd=1e9;S.towns.forEach((u,ui)=>{if(u.lock||u.vil||ui===ti||!NET.linked.has(ui))return;const d=Math.hypot(u.x-t.x,u.z-t.z);if(d<bd){bd=d;best=ui}});return best}
function linkFix(ti){const o=linkFrom(ti);return o<0?null:{t:`Paved road from ${S.towns[o].n}`,a:{act:'linkroad',ti}}}
/* goods that only come from abroad: open the Trade view */
function importFix(ti,r){return {t:`Import ${rname(r)}`,a:{act:'nav',tab:'trade'},b:1}}
/* the material the homes of each era are built of */
const HOUSE_MAT=[null,'planks','bricks','cement'];

/* Problems of one settlement, worst first: {k, sev (2 urgent, 1 holds it back, 0 a note), ic, t, d, fix}.
   lite: skip the fixes (the national list only counts). */
function townIssues(ti,lite){const t=S.towns[ti],out=[];if(!t||t.lock)return out;
  const heatOn=seasonOf(S.day).heat>0.05,fbal=FOOD.reduce((a,r)=>a+(t.dl[r]||0),0);
  const add=(k,sev,i,tt,d,fix)=>out.push({k,sev,ic:i,t:tt,d,fix:lite?[]:(fix||[]).filter(Boolean)});
  const F=lite?()=>null:(f,...a)=>f(...a);
  const zone={t:'Zone land',a:{act:'tool',tool:'zone',ti}};
  if(t.fed!==undefined&&t.fed<0.97)add('hungry',2,'grain','Hungry',`${pct(t.fed)} fed. People are leaving.`,[F(suggestRoute,ti,FOOD),F(buildFix,'farm',ti),F(buildFix,'potato',ti)]);
  else if((t.fdays||99)<6&&fbal<-0.01)add('lowfood',1,'grain','Food runs low',`Food for ${num(t.fdays)} days, and stocks are falling.`,[F(suggestRoute,ti,FOOD),F(buildFix,'farm',ti)]);
  if(heatOn&&t.heat!==undefined&&t.heat<0.9)add('cold',2,'fire','Cold homes',`${pct(t.heat)} of homes are warm. Homes burn peat or timber.`,[F(suggestRoute,ti,FUEL),F(buildFix,'forestry',ti),F(buildFix,'peat',ti)]);
  /* power: no line reaches it, no station on its grid, stations that stand short of fuel or hands, or too few of them */
  if(!t.vil&&S.era>=2&&t.pr!==undefined&&t.pr<0.95){const G=gridInfo(ti),sev=t.pr<0.8&&darkNow()?2:1;let d,fix;
    if(!G.st.length){const lk=NET.linked.has(ti);d=lk?`No power station feeds the grid ${t.n} is on.`:'No power line reaches it. Railways and paved roads carry the grid.';
      fix=lk?[F(buildFix,'power',ti)]:[F(linkFix,ti),F(buildFix,'power',ti,'A station of its own')]}
    else{const enough=G.cap>=G.D*0.95,soon=G.cap+G.sites.reduce((a,b)=>a+BT[b.t].pow,0)>=G.D*0.95;
      /* stations that stand short come first, the one that loses most at their head: a station with nothing to burn is no
         reason to build another */
      if(G.weak.length){const lost=b=>BT[b.t].pow*LV[b.lv]*(1-b.eff),b=G.weak.slice().sort((p,q)=>lost(q)-lost(p))[0],bt=S.towns[b.town],
          wy=b.why==='Fuel kept for homes'?'left without peat, which the town keeps for its homes':b.why.toLowerCase();
        d=(enough?`Its grid could make ${num(G.cap)} MW and makes ${num(G.S)}`:`Its grid makes ${num(G.S)} MW and needs ${num(G.D)}`)+
          (G.weak.length>1?`. ${G.weak.length} of its ${G.work.length} power stations are not at full strength: the one in ${bt.n} is ${wy}.`:`: the ${BT[b.t].n.toLowerCase()} in ${bt.n} is ${wy}.`);
        const rf=b.lack?F(suggestRoute,b.town,[b.lack]):null;if(rf&&b.town!==ti&&rf.a.act==='newroute')rf.t=`Route from ${S.towns[rf.a.a].n} to ${bt.n}`;
        fix=[rf,b.lack?F(buildFix,PRODUCER[b.lack],b.town):null,{t:'Open '+bt.n,a:{act:'seltown',ti:b.town}},soon?null:F(buildFix,'power',ti)]}
      else if(G.sites.length&&soon){d=`It gets ${pct(t.pr)} of the power it needs. A power station is being built.`;fix=[{t:'Open the works',a:{act:'works'}}]}
      else{d=`Its grid makes ${num(G.S)} MW and needs ${num(G.D)}.`;fix=[F(buildFix,'power',ti),F(buildFix,'hydro',ti)]}}
    add('power',sev,'bolt','Short of power',d,fix)}
  if(t.pop>(t.house||0)+0.3)add('crowd',1,'house','Overcrowded',`${popStr(t.pop-t.house)} more people than homes.`,[zone]);
  else if(t.hint&&t.hint.startsWith('No room'))add('room',1,'zone','No land to build on','Every zoned lot has houses. Zone land along its streets so it can keep growing.',[zone]);
  if(t.hint&&t.hint.startsWith('Needs')){const r=t.hmat&&RI[t.hmat]?t.hmat:HOUSE_MAT[S.era];add('mat',1,RI[r].ic,'Can’t build homes',t.hint+'.',[F(suggestRoute,ti,[r]),F(buildFix,PRODUCER[r],ti),F(buyFix,ti,r)])}
  /* fuel put by: a town takes in no more people than it can keep warm */
  if(t.nofuel&&t.pop-t.pop0>=0.3&&!(heatOn&&t.heat<0.9))add('fuel',1,'fire','No fuel for more homes',`Its own woodlots heat ${popStr(t.pop0)}. For the ${popStr(t.pop-t.pop0)} beyond that it keeps ${fmt(Math.round(t.fkeep||0))} peat and timber for winter, and has ${pct(Math.min(1,t.fuelw||0))} of it. It takes in no one new until the store is full.`,
    [F(suggestRoute,ti,FUEL),F(buildFix,'forestry',ti),F(buildFix,'peat',ti)]);
  /* building sites that wait: for a material, for money, or for a road */
  {const waits={};S.bld.forEach(b=>{if(!b.c||b.c.hold||b.town!==ti||b.cw==='Building')return;(b.wait||[]).forEach(k=>{if(k==='lt'||!b.hf||b.hf[k]===undefined)(waits[k]=waits[k]||[]).push(b)})});
    for(const k in waits){const L0=waits[k],lack=L0.reduce((a,b)=>a+Math.max(0,b.c.n[k]-(b.c.g[k]||0)),0);
      if(k==='lt')add('site:lt',1,'coin','Building waits for money',`${typeList(L0)} ${L0.length>1?'need':'needs'} ${fmt(lack)} Lt more. Sites take what the treasury has above the reserve you keep.`,[{t:'Open the works',a:{act:'works'}}]);
      else add('site:'+k,1,RI[k].ic,'Building waits for '+rname(k),`${typeList(L0)} ${L0.length>1?'need':'needs'} ${fmt(Math.ceil(lack))} more ${rname(k)}. ${t.n} has none to give, and no town within ${HAUL_MAX} km by road has any to spare.`,
        [RI[k].port?F(importFix,ti,k):F(buildFix,PRODUCER[k],ti),F(buyFix,ti,k),{t:'See '+rname(k),a:{act:'good',r:k}}])}}
  if((t.unemp||0)>(t.wf||0)*0.25+1&&S.hist.path!=='soviet')add('jobless',1,'people','People out of work',`${popStr(t.unemp)} people have no work.`,[{t:'Build a workplace',a:{act:'buildmenu',ti},b:1}]);
  const miss={},staff=[],full=[],kept=[];
  bOfTown(ti).forEach(b=>{if(b.t==='house'||b.t==='hall'||b.t==='landmark'||!b.on)return;
    if(b.lack&&b.why==='Fuel kept for homes')kept.push(b);
    else if(b.lack&&b.why&&b.why.startsWith('Missing '))(miss[b.lack]=miss[b.lack]||[]).push(b);
    else if(b.why==='Short of workers'&&b.eff<0.8)staff.push(b);else if(b.why==='Storage full')full.push(b)});
  for(const r in miss){const L0=miss[r];add('in:'+r,1,RI[r].ic,'Missing '+rname(r),`${typeList(L0)} ${L0.length>1?'wait':'waits'} for ${rname(r)}.`,
    [F(suggestRoute,ti,[r]),RI[r].port?F(importFix,ti,r):F(buildFix,PRODUCER[r],ti),RI[r].port?F(buyFix,ti,r):null])}
  if(kept.length){const rs=[...new Set(kept.map(b=>b.lack))];add('kept',1,'fire','Fuel kept for homes',`${typeList(kept)} ${kept.length>1?'wait':'waits'}: ${t.n} keeps its last ${fmt(Math.round(t.fkeep||0))} peat and timber to heat homes in winter.`,
    [F(suggestRoute,ti,rs),...rs.map(r=>F(buildFix,PRODUCER[r],ti))])}
  if(staff.length){const r=S.routes.find(q=>(q.a===ti||q.b===ti)&&q.ok&&!q.pax);
    add('staff',1,'people','Short of workers',`${typeList(staff)} ${staff.length>1?'run':'runs'} below strength.`,[r?{t:'Carry commuters',a:{act:'rpax',r:r.id}}:null,zone])}
  /* a full store: send the surplus where it is needed, sell it, or store more */
  if(full.length){const cap=t.cap||STORE_BASE,gs=RES.filter(r=>(t.stock[r]||0)>=cap*0.9),g0=gs[0],q=g0?Math.max(25,Math.min(100,Math.floor((t.stock[g0]||0)-cap*0.6))):0;
    add('full',1,'box','Storage full',`${typeList(full)} ${full.length>1?'have':'has'} stopped: the stores are full${gs.length?' of '+gs.map(rname).join(' and '):''}.`,
      [g0?F(suggestOutlet,ti,g0):null,g0&&S.hist.path!=='soviet'?{t:`Sell ${q} ${rname(g0)}`,a:{act:'sell',ti,r:g0,q},b:1}:null,F(buildFix,'warehouse',ti,'Warehouse')])}
  if(t.pol>0.3)add('smog',1,'smog','Smoky air','Industry pollutes its homes, and morale suffers.',[]);
  if(!t.vil&&t.want){const k0=wantK();WANTS.forEach(W=>{const got=t.want[W.r];if(got===undefined||got>=0.99||!W.down||(W.era===S.era&&k0<=0.3))return;
    /* its shops fetch the good from the nearest town with plenty: the fix is more of it in the country, or a route for a far town */
    const bt=PRODUCER[W.r],staff=(t.wf||0)>=BT[bt].w*0.6;
    add('want:'+W.r,1,RI[W.r].ic,'Wants '+rname(W.r),`It gets ${pct(got)} of the ${rname(W.r)} it wants, and morale suffers. Its shops fetch it from the nearest town with some to spare, up to ${HAUL_MAX} km away.`,
      [F(suggestRoute,ti,[W.r]),staff?F(buildFix,bt,ti):null,{t:'See '+rname(W.r),a:{act:'good',r:W.r}}])})}
  if(t.h<GROW_H)add('morale',1,'heart','Low morale',`Morale is ${Math.round(t.h)}%. Below ${GROW_H}% a town builds no homes.`,[]);
  /* dirt roads never link a town: before industrialization only a railway does */
  if(!t.vil&&!t.capital&&!NET.linked.has(ti))add('link',0,'rail','Not linked to '+capital().n,'Bring a railway or a paved road to its streets. Dirt roads do not count.',
    [F(linkFix,ti),{t:'Lay track',a:{act:'tool',tool:'rail',ti}}]);
  /* the Vilnius region before a loss history brought: build there knowing it */
  if(t.rg==='vr'||t.rg==='vr2'){const d=ymd(S.day);
    if(d<'1919-01-05')add('front',0,'flag','Front line','In history the Red Army took Vilnius in January 1919, and Poland held it for most of the years until 1939. What is built here may be lost for years.');
    else if(d>='1920-08-26'&&d<'1920-10-08')add('front',0,'flag','Front line','In history Polish troops took Vilnius in October 1920 and held it until 1939.')}
  if(!lite&&!t.vil&&!bOfTown(ti).some(b=>b.t==='station')&&nearestEdge(t.x,t.z,'rail',(t.R||1)*1.2+1))
    add('station',0,'rail','No railway station','A railway passes, but trains cannot stop here. Build a station beside the track.',[buildFix('station',ti,'Station')]);
  return out.sort((a,b)=>b.sev-a.sev)}

/* How a settlement looks on the map: 2 red (hungry, cold, blackouts), 1 amber (held back), -1 thriving, 0 nothing to say.
   Villages show only red: most of them are held back by something small, and dots on hundreds of them would hide what matters. */
function townAlert(t,heatOn){if(t.lock||t.fed===undefined)return 0;
  if(t.fed<0.97||(heatOn&&t.heat<0.9)||(!t.vil&&S.era>=2&&t.pr<0.8&&darkNow()))return 2;
  if(t.vil)return 0;
  const note=t.note||'';
  if(t.pop>(t.house||0)+0.3||t.h<GROW_H||t.pol>0.3||(t.hint&&t.hint.length)||(t.nofuel&&t.pop-t.pop0>=0.3)||note==='Unemployment'||note==='Blackouts'||note.startsWith('Want'))return 1;
  return note==='Thriving'?-1:0}

/* The country's problems: each kind with the settlements that have it, worst and most common first. Kept for the day. */
let NATC={k:'',v:[]};
function natIssues(){const key=S.day+':'+NET.ver+':'+S.towns.length+':'+S.era;if(NATC.k===key)return NATC.v;
  const g=new Map();
  S.towns.forEach((t,ti)=>{if(t.lock)return;townIssues(ti,true).forEach(x=>{if(x.sev<1)return;let q=g.get(x.k);
    if(!q)g.set(x.k,q={k:x.k,sev:0,ic:x.ic,t:x.t,towns:[],vils:0});q.sev=Math.max(q.sev,x.sev);q.towns.push(ti);if(t.vil)q.vils++})});
  const v=[...g.values()].map(q=>{q.towns.sort((a,b)=>S.towns[b].pop-S.towns[a].pop);return q}).sort((a,b)=>b.sev-a.sev||b.towns.length-a.towns.length);
  NATC={k:key,v};return v}
/* settlements with an urgent problem (the red badge on the Lithuania button) */
function urgentCount(){return natIssues().filter(q=>q.sev>=2).reduce((a,q)=>a+q.towns.length,0)}

/* Goods of one settlement (ti) or of the whole country (-1) per day: made, used, net change (routes and trade included), stock. */
function goodsRows(ti){const towns=ti>=0?[S.towns[ti]]:S.towns.filter(t=>!t.lock),rows=[];
  RES.forEach(r=>{let mk=0,us=0,dl=0,st=0;towns.forEach(t=>{mk+=t.mk?t.mk[r]||0:0;us+=t.us?t.us[r]||0:0;dl+=t.dl[r]||0;st+=t.stock[r]||0});
    if(RI[r].era>S.era&&st<0.5)return;
    if(mk<0.05&&us<0.05&&st<0.5&&Math.abs(dl)<0.05)return;rows.push({r,mk,us,dl,st})});return rows}

/* Trend lines: an SVG path through up to n evenly picked values, scaled to w by h. */
function sparkPath(vals,w,h,n){if(vals.length<2)return '';n=n||60;
  const pick=vals.length>n?Array.from({length:n},(x,i)=>vals[Math.round(i*(vals.length-1)/(n-1))]):vals;
  let lo=Infinity,hi=-Infinity;pick.forEach(x=>{if(x<lo)lo=x;if(x>hi)hi=x});if(hi-lo<1e-9){lo-=1;hi+=1}
  return pick.map((x,i)=>(i?'L':'M')+(i/(pick.length-1)*w).toFixed(1)+' '+(h-1.5-(x-lo)/(hi-lo)*(h-3)).toFixed(1)).join('')}
/* change of residents per month, from the weekly samples */
function popTrend(){const L0=S.series||[];if(L0.length<2)return 0;const a=L0[Math.max(0,L0.length-9)],b=L0[L0.length-1];return b[0]>a[0]?(b[1]-a[1])/(b[0]-a[0])*30:0}
function trendTxt(perMonth){return Math.abs(perMonth)<0.05?'steady':(perMonth>0?'+':'−')+popStr(Math.abs(perMonth))+' a month'}

/* towns expect electric light: at once in the Modern era, and from a year or so into Industrialization (see wantK) */
const darkNow=()=>S.era>2||wantK()>0.3;
/* The power grid a town is on: its stations (st), those at work (work) and what they could make (cap, MW), those that stand
   short of fuel or hands (weak), stations being built (sites), and the grid's supply and demand today (S, D). */
function gridInfo(ti){const g=NET.grid[ti],st=[];S.bld.forEach(b=>{if(BT[b.t].pow&&b.town>=0&&!S.towns[b.town].lock&&NET.grid[b.town]===g)st.push(b)});
  const work=st.filter(b=>!isSite(b)&&b.on);
  return {st,work,sites:st.filter(isSite),cap:work.reduce((a,b)=>a+BT[b.t].pow*LV[b.lv],0),weak:work.filter(b=>b.eff<0.8),S:S.towns[ti].gS||0,D:S.towns[ti].gD||0}}

/* ---------- building sites ---------- */
/* How a site stands: {b, st: 'build' | 'wait' | 'hold' | 'road', lack: what it waits for, days: days of work left, pc: percent built} */
function siteInfo(b){const c=b.c,lack=(b.wait||Object.keys(c.n).filter(k=>(c.g[k]||0)<c.n[k]-1e-6)),got=siteGot(c),hf=b.hf||{},dry=lack.filter(k=>k==='lt'||hf[k]===undefined);
  const st=c.hold?'hold':b.town<0?'road':c.p<got-1e-9||!lack.length?'build':dry.length?'wait':'haul';
  return {b,st,lack,dry,days:siteDays(b),pc:Math.round(c.p*100)}}
const lackTxt=L0=>L0.map(k=>k==='lt'?'money':rname(k)).join(' and ');
/* where the carts that supply a site come from: " from Kaunas" when it is one town */
function cartsFrom(b){const s=new Set(Object.values(b.hf||{}));return s.size===1&&S.towns[[...s][0]]?' from '+S.towns[[...s][0]].n:''}
/* "Building, 43% done · 8 days left", "Carts bring planks from Kaunas", "Waits for bricks and money" */
function siteTxt(b){const q=siteInfo(b);if(q.st==='hold')return 'On hold';if(q.st==='road')return b.na==='locked'?naTxt(b):b.na==='far'?'Too far from a town hall':'Waits for a road to a town';
  if(q.st==='wait')return 'Waits for '+lackTxt(q.dry);
  if(q.st==='haul')return `Carts bring ${lackTxt(q.lack)}${cartsFrom(b)}`;
  return q.lack.length?`Building, ${q.pc}% done. ${q.dry.length?'Still short of '+lackTxt(q.dry):'Carts bring '+lackTxt(q.lack)+cartsFrom(b)}`:`Building, ${q.pc}% done · ${q.days} day${q.days===1?'':'s'} left`}
/* what all sites of the country still need: {lt, planks, …} */
function siteNeeds(ti){const n={};sitesOf(ti===undefined?-1:ti).forEach(b=>{if(b.c.hold)return;for(const k in b.c.n){const m=b.c.n[k]-(b.c.g[k]||0);if(m>0.01)n[k]=(n[k]||0)+m}});return n}

/* ---------- goods and chains ---------- */
/* Which good is made from which, shown as rows in the Economy view */
const CHAINS=[['grain','beer'],['grain','dairy'],['potatoes','meat'],['timber','planks','furniture'],['peat','bricks'],['flax','textiles'],['beet','sugar'],['peat','cement'],['peat','fertiliser'],['metal','electronics']];
/* a good is in play once its era has come, or there is some of it, or a Union project opened its works early */
function goodOpen(r){return RI[r].era<=S.era||(PRODUCER[r]&&unlocked(PRODUCER[r]))||S.towns.some(t=>!t.lock&&(t.stock[r]||0)>=1)}
/* Everything about one good in the whole country: made, used, net and stock a day, the buildings that make it and what holds
   them back, and the towns that make, use and hold the most. */
function goodInfo(r){const o={r,mk:0,us:0,dl:0,st:0,cap:0,run:0,idle:0,sites:0,why:{},mkT:[],usT:[],stT:[],lowT:[]};
  S.towns.forEach((t,ti)=>{if(t.lock)return;const mk=t.mk?t.mk[r]||0:0,us=t.us?t.us[r]||0:0,st=t.stock[r]||0,dem=t.dem?t.dem[r]||0:0;o.mk+=mk;o.us+=us;o.dl+=t.dl[r]||0;o.st+=st;o.cap+=t.cap||STORE_BASE;
    if(mk>=0.05)o.mkT.push([ti,mk]);if(us>=0.05)o.usT.push([ti,us]);if(st>=1)o.stT.push([ti,st]);if(!t.vil&&dem>=0.05&&st<dem*5)o.lowT.push([ti,dem?st/dem:0])});
  S.bld.forEach(b=>{const T0=BT[b.t];if(!T0.out||!T0.out[r]||b.town<0||S.towns[b.town].lock)return;if(isSite(b)){o.sites++;return}
    if(b.on&&b.eff>=0.35)o.run++;else{o.idle++;const w=b.on?b.why:'Paused';o.why[w]=(o.why[w]||0)+1}});
  const by=(L0,asc)=>L0.sort((a,b)=>asc?a[1]-b[1]:b[1]-a[1]).slice(0,6);o.mkT=by(o.mkT);o.usT=by(o.usT);o.stT=by(o.stT);o.lowT=by(o.lowT,true);
  o.makers=Object.keys(BT).filter(t=>BT[t].out&&BT[t].out[r]);o.users=Object.keys(BT).filter(t=>BT[t].in&&BT[t].in[r]);
  o.want=WANTS.find(W=>W.r===r)||null;o.days=o.us>0.05?o.st/o.us:Infinity;
  /* what the towns want of it a day, all together */
  o.wantD=o.want?S.towns.reduce((a,t)=>a+(t.lock||t.vil?0:t.pop*o.want.per),0):0;return o}
/* the country's work: people who can work, jobs, and how many of each go unfilled */
function workStats(){const o={wf:0,jobs:0,vac:0,un:0,com:0};S.towns.forEach(t=>{if(t.lock)return;o.wf+=t.wf||0;o.jobs+=t.jobs||0;o.vac+=Math.max(0,(t.vac||0));o.un+=t.unemp||0;o.com+=t.comOut||0});return o}
