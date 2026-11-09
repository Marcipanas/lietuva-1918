'use strict';
/* Lietuva 1918 — dashboards: what each town and the whole country make, use and lack, the problems to fix, and one-tap fixes.
   No DOM and no THREE: plain data for panels.js. Problems come from the figures the day tick leaves on each town
   (fed, heat, house, jobs, pr, pol, hint, note) and from its buildings (why, lack). A fix is a button: {t: label, a: act data}. */
const PRODUCER={grain:'farm',potatoes:'potato',dairy:'dairy',meat:'pigs',fish:'fishery',timber:'forestry',peat:'peat',flax:'flax',bricks:'brick',textiles:'linen',furniture:'furniture',electronics:'elec'};
const pct=q=>Math.round((q||0)*100)+'%';
/* buildings of a settlement: the day tick's grouping when there is one */
function bOfTown(ti){return BYT[ti]||S.bld.filter(b=>b.town===ti)}
/* "Brickworks ×2, Linen mill" */
function typeList(bs){const c=new Map();bs.forEach(b=>c.set(b.t,(c.get(b.t)||0)+1));return [...c].map(([t,n])=>BT[t].n+(n>1?' ×'+n:'')).join(', ')}

/* The neighbour with the most to spare of these goods: a route to start, or a vehicle to add to the route there is. */
function suggestRoute(ti,goods){let best=null;
  for(const n of NET.adj[ti]||[]){const e=NET.edges[n],o=e.a===ti?e.b:e.a,T=S.towns[o];if(!T||T.lock)continue;
    let sp=0;goods.forEach(r=>{sp+=Math.max(0,(T.stock[r]||0)-(T.dem[r]||0)*6)});
    if(sp>=8&&(!best||sp>best.sp))best={o,sp,m:e.rail&&pairPath('rail',ti,o)?'rail':'road'}}
  if(!best)return null;
  const r=S.routes.find(q=>(q.a===ti&&q.b===best.o)||(q.b===ti&&q.a===best.o)),nm=S.towns[best.o].n;
  if(r)return {t:`Add a ${VT[r.vt].one} from ${nm}`,a:{act:'rveh',r:r.id,d:1}};
  return {t:`Route from ${nm}`,a:{act:'newroute',a:best.o,b:ti,m:best.m}}}
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
  if(!t.vil&&S.era>=2&&t.pr!==undefined&&t.pr<0.95)add('power',t.pr<0.8?2:1,'bolt','Short of power',`It gets ${pct(t.pr)} of the power it needs.`,
    [NET.linked.has(ti)?F(buildFix,'power',ti):{t:'Link it by paved road',a:{act:'tool',tool:'road',ti}}]);
  if(t.pop>(t.house||0)+0.3)add('crowd',1,'house','Overcrowded',`${popStr(t.pop-t.house)} more people than homes.`,[zone]);
  else if(t.hint&&t.hint.startsWith('No room'))add('room',1,'zone','No land to build on','Every zoned lot has houses. Zone land along its streets so it can keep growing.',[zone]);
  if(t.hint&&t.hint.startsWith('Needs')){const r=S.era>=2?'bricks':'timber';add('mat',1,RI[r].ic,'Can’t build homes',t.hint+'.',[F(suggestRoute,ti,[r]),F(buildFix,PRODUCER[r],ti)])}
  if((t.unemp||0)>(t.wf||0)*0.25+1&&S.hist.path!=='soviet')add('jobless',1,'people','People out of work',`${popStr(t.unemp)} people have no work.`,[{t:'Build a workplace',a:{act:'buildmenu',ti},b:1}]);
  const miss={},staff=[],full=[];
  bOfTown(ti).forEach(b=>{if(b.t==='house'||b.t==='hall'||b.t==='landmark'||!b.on)return;
    if(b.lack&&b.why&&b.why.startsWith('Missing '))(miss[b.lack]=miss[b.lack]||[]).push(b);
    else if(b.why==='Short of workers'&&b.eff<0.8)staff.push(b);else if(b.why==='Storage full')full.push(b)});
  for(const r in miss){const L0=miss[r];add('in:'+r,1,RI[r].ic,'Missing '+rname(r),`${typeList(L0)} ${L0.length>1?'wait':'waits'} for ${rname(r)}.`,
    [F(suggestRoute,ti,[r]),RI[r].port?null:F(buildFix,PRODUCER[r],ti)])}
  if(staff.length){const r=S.routes.find(q=>(q.a===ti||q.b===ti)&&q.ok&&!q.pax);
    add('staff',1,'people','Short of workers',`${typeList(staff)} ${staff.length>1?'run':'runs'} below strength.`,[r?{t:'Carry commuters',a:{act:'rpax',r:r.id}}:null,zone])}
  /* a full store: send the surplus where it is needed, sell it, or store more */
  if(full.length){const cap=t.cap||STORE_BASE,gs=RES.filter(r=>(t.stock[r]||0)>=cap*0.97),g0=gs[0],q=g0?Math.max(25,Math.min(100,Math.floor((t.stock[g0]||0)-cap*0.6))):0;
    add('full',1,'box','Storage full',`${typeList(full)} ${full.length>1?'have':'has'} stopped: the stores are full${gs.length?' of '+gs.map(rname).join(' and '):''}.`,
      [g0?F(suggestOutlet,ti,g0):null,g0&&S.hist.path!=='soviet'?{t:`Sell ${q} ${rname(g0)}`,a:{act:'sell',ti,r:g0,q},b:1}:null,F(buildFix,'warehouse',ti,'Warehouse')])}
  if(t.pol>0.3)add('smog',1,'smog','Smoky air','Industry pollutes its homes, and morale suffers.',[]);
  if(S.era>=2&&t.note==='Want linen cloth')add('want:textiles',1,'textiles','Wants linen cloth','Morale suffers without it.',[F(suggestRoute,ti,['textiles']),F(buildFix,'linen',ti)]);
  if(S.era>=3&&t.note==='Want electronics')add('want:electronics',1,'chip','Wants electronics','Morale suffers without them.',[F(suggestRoute,ti,['electronics']),F(buildFix,'elec',ti)]);
  if(t.h<45)add('morale',1,'heart','Low morale',`Morale is ${Math.round(t.h)}%. Below 45% a town stops growing.`,[]);
  /* dirt roads never link a town: before industrialization only a railway does */
  if(!t.vil&&!t.capital&&!NET.linked.has(ti))add('link',0,'rail','Not linked to '+capital().n,S.era>=2?'Bring a railway or a paved road to its streets.':'Bring a railway to its streets. Paved roads come with industrialization.',
    [S.era>=2?{t:'Build a paved road',a:{act:'tool',tool:'road',ti}}:null,{t:'Lay track',a:{act:'tool',tool:'rail',ti}}]);
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
  if(t.fed<0.97||(heatOn&&t.heat<0.9)||(!t.vil&&S.era>=2&&t.pr<0.8))return 2;
  if(t.vil)return 0;
  const note=t.note||'';
  if(t.pop>(t.house||0)+0.3||t.h<45||t.pol>0.3||(t.hint&&t.hint.length)||note==='Unemployment'||note==='Blackouts'||note.startsWith('Want'))return 1;
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
