'use strict';
/* Lietuva 1918 — interface core: the top bar, the bottom navigation, the sheet (a bottom sheet on phones, a side panel on wide
   screens), the action bar that replaces the navigation while a tool is in use, actions, the decision card dialog, loop and boot. */
const $=id=>document.getElementById(id);
let lastStruct='',lastHead='',lastNav='',lastBar='',lastFull=0,tt=0,ht=0;
Object.assign(ICON,{
  back:'<path d="M15 5l-7 7 7 7"/>', down:'<path d="M6 9l6 6 6-6"/>', check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  hammer:'<path d="M14.5 6.5 18 3l3 3-3.5 3.5"/><path d="M13 8l3 3-9.5 9.5a2.1 2.1 0 0 1-3-3z"/><path d="M11.5 3.5 16 8"/>',
  book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M8 7.5h8M8 11h6"/>',
  flag:'<path d="M5 21V4"/><path d="M5 4h13l-2.5 4L18 12H5"/>',
  play:'<path d="M8 5.5v13l10.5-6.5z"/>', fast:'<path d="M4 6v12l8-6zM12 6v12l8-6z"/>', spot:'<circle cx="12" cy="10" r="3"/><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/>'
});
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2600)}
const toastBusy=()=>$('toast').classList.contains('show');
function hint(m){const h=$('hint');if(!m){h.hidden=true;return}h.textContent=m;h.hidden=false;clearTimeout(ht);ht=setTimeout(()=>{h.hidden=true},8000)}
const WIDE=()=>window.innerWidth>=960;
Object.assign(VIEW,{sheet:0,prev:'nat',bcat:null,bti:-1,iss:null,tsort:'need',tall:false,seen:0,spd:1});

/* ---------- top bar and speed ---------- */
function setSpeed(n){if(n>0)VIEW.spd=n;S.speed=n;updateTop();save()}
function updateTop(){$('t-date').textContent=dateStr(S.day);$('t-funds').textContent=fmt(S.funds)+' Lt';const i=$('t-inc');i.textContent=fd(S.inc)+'/d';i.classList.toggle('neg',S.inc<0);
  $('t-pop').textContent=popStr(totals().pop);$('t-era').textContent=ERAS[S.era].n;const sea=seasonOf(S.day);$('t-sea').innerHTML=ic(sea.snow>0.45?'snow':sea.aut>0.45?'tree':'grain');
  const pl=$('sp-play'),fs=$('sp-fast');pl.innerHTML=ic(S.speed?'pause':'play');pl.setAttribute('aria-label',S.speed?'Pause':'Play');pl.classList.toggle('on',!S.speed);
  fs.textContent=['1×','1×','2×','4×'][VIEW.spd||1];fs.setAttribute('aria-label','Speed '+fs.textContent+'. Tap to change.');renderNav()}

/* ---------- bottom navigation ---------- */
const NAV=[['build','hammer','Build'],['routes','route','Routes'],['nat','flag','Lithuania'],['trade','globe','Trade'],['chron','book','Chronicle']];
function renderNav(){const open=WIDE()||VIEW.sheet>0,u=urgentCount(),nl=S.log.filter(e=>e.d>VIEW.seen).length;
  const h=NAV.map(([k,i,l])=>{const on=open&&S.tab===k,lab=k==='trade'&&S.hist.path==='soviet'?'Plan':l;
    const bd=k==='nat'&&u?`<i class="bd bad">${u>99?'99+':u}</i>`:k==='chron'&&nl?`<i class="bd">${nl>9?'9+':nl}</i>`:'';
    return `<button data-nav="${k}" aria-pressed="${on}">${ic(i)}<span>${lab}</span>${bd}</button>`}).join('');
  if(h!==lastNav){$('nav').innerHTML=h;lastNav=h}}
function navTo(k){if(TOOL.k!=='inspect')setTool('inspect');
  if(!WIDE()&&VIEW.sheet>0&&S.tab===k){setSheet(0);return}
  if(k==='build'){VIEW.bti=VIEW.sel&&VIEW.sel.kind==='t'?VIEW.sel.ti:-1;VIEW.bcat=null}
  if(k==='chron')VIEW.seen=S.day;
  S.tab=k;S.confirmReset=false;S.confirmRoute=null;openSide(true);renderPanel(true);$('pbody').scrollTop=0}

/* ---------- the sheet: closed, half or full on phones; always open beside the map on wide screens ---------- */
function setSheet(n){VIEW.sheet=n;const s=$('side');s.classList.toggle('open',n>0);s.classList.toggle('full',n===2);document.body.classList.toggle('sheeted',n>0&&!WIDE());renderNav()}
function openSide(on){setSheet(on?Math.max(1,VIEW.sheet):0)}
function sheetSizes(){const st=$('stage').getBoundingClientRect(),nav=$('dock').getBoundingClientRect(),room=Math.max(200,nav.top-st.top);
  document.documentElement.style.setProperty('--sh-half',Math.round(Math.min(room*0.56,room-120))+'px');document.documentElement.style.setProperty('--sh-full',Math.round(room-28)+'px')}
let SD=null;
function sheetDown(e){if(WIDE()||e.target.closest('button'))return;const s=$('side');SD={y0:e.clientY,h0:s.getBoundingClientRect().height,moved:false};s.classList.add('drag');
  try{e.currentTarget.setPointerCapture(e.pointerId)}catch(x){}}
function sheetMove(e){if(!SD)return;const dy=e.clientY-SD.y0;if(Math.abs(dy)>5)SD.moved=true;if(SD.moved)$('side').style.height=Math.max(60,SD.h0-dy)+'px'}
function sheetUp(e){if(!SD)return;const s=$('side'),h=s.getBoundingClientRect().height,half=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sh-half'))||300,
  full=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sh-full'))||600;s.classList.remove('drag');s.style.height='';
  if(!SD.moved)setSheet(VIEW.sheet===2?1:2);else if(h<half*0.6)closeSheet();else setSheet(h<(half+full)/2?1:2);SD=null}
function closeSheet(){if(S.tab==='sel'){VIEW.sel=null;S.tab=VIEW.prev&&VIEW.prev!=='sel'?VIEW.prev:'nat'}setSheet(0);renderPanel(true)}

/* ---------- selection ---------- */
function select(s){if(!s){VIEW.sel=null;if(S.tab==='sel')S.tab=VIEW.prev||'nat';if(!WIDE())setSheet(0);renderPanel(true);return}
  if(S.tab!=='sel')VIEW.prev=S.tab;VIEW.sel=s;S.tab='sel';S.confirmDemo=null;openSide(true);renderPanel(true)}
function selectTown(ti,focus){if(S.tab!=='sel')VIEW.prev=S.tab;VIEW.sel={kind:'t',ti};S.tab='sel';S.confirmDemo=null;
  if(focus){const t=S.towns[ti];focusAt(t.x,t.z,Math.min(cam.dist,Math.max(3.5,(t.R||1)*3)))}openSide(true);renderPanel(true);$('pbody').scrollTop=0}
function selectBuilding(b,focus){if(S.tab!=='sel')VIEW.prev=S.tab;VIEW.sel={kind:'b',id:b.id};S.tab='sel';S.confirmDemo=null;if(focus)focusAt(b.x,b.z,Math.min(cam.dist,4));openSide(true);renderPanel(true);$('pbody').scrollTop=0}

/* ---------- rendering the sheet: values patch in place; the whole body is rebuilt only when its structure changes ---------- */
const strip=h=>h.replace(/(<span data-v="[^"]*"(?: data-\w+)?>)[^<]*(<\/span>)/g,'$1$2').replace(/(<i data-w="[^"]*") style="[^"]*"/g,'$1')
  .replace(/( data-d="[^"]*") d="[^"]*"/g,'$1').replace(/( data-s="[^"]*") data-c="[^"]*"/g,'$1');
function renderPanel(force){if(!force&&!WIDE()&&VIEW.sheet===0)return;V={};W={};D={};C={};const s=VIEW.sel;let html;
  if(S.tab==='sel'&&!(s&&(s.kind==='t'?S.towns[s.ti]:BMAP.get(s.id))))S.tab='nat';
  if(S.tab==='nat')html=natPanel();else if(S.tab==='chron')html=chronPanel();else if(S.tab==='routes')html=routesPanel();else if(S.tab==='trade')html=tradePanel();
  else if(S.tab==='build')html=buildPanel();else if(s.kind==='t')html=townPanel(s.ti);else html=buildingPanel(BMAP.get(s.id));
  const hd=sheetHead();if(hd!==lastHead){$('shead').innerHTML=hd;lastHead=hd}
  const st=strip(html),body=$('pbody'),now=performance.now();
  if(force||(st!==lastStruct&&now-lastFull>1500)){const sel=[...body.querySelectorAll('select')].map(x=>[x.id,x.value]),open=[...body.querySelectorAll('details[open]')].map(x=>x.dataset.k);
    body.innerHTML=html;lastStruct=st;lastFull=now;sel.forEach(([id,val])=>{const x=$(id);if(x)x.value=val});open.forEach(k=>{const d=k&&body.querySelector(`details[data-k="${k}"]`);if(d)d.open=true})}
  else{body.querySelectorAll('[data-v]').forEach(el=>{const t=V[el.dataset.v];if(t!==undefined&&el.textContent!==t)el.textContent=t});
    body.querySelectorAll('[data-w]').forEach(el=>{const p=W[el.dataset.w];if(p!==undefined)el.style.width=p+'%'});
    body.querySelectorAll('[data-d]').forEach(el=>{const d=D[el.dataset.d];if(d!==undefined&&el.getAttribute('d')!==d)el.setAttribute('d',d)});
    body.querySelectorAll('[data-s]').forEach(el=>{const c=C[el.dataset.s];if(c!==undefined&&el.dataset.c!==c)el.dataset.c=c})}
  body.querySelectorAll('[data-sign]').forEach(el=>{const t=el.textContent;el.classList.toggle('neg',t.startsWith('−'));el.classList.toggle('zero',t.startsWith('0.0'))});
  body.querySelectorAll('[data-stat]').forEach(el=>el.classList.toggle('bad',!(el.textContent==='Running')));
  body.querySelectorAll('[data-stat3]').forEach(el=>el.classList.toggle('bad',!/^[+−]/.test(el.textContent)));
  body.querySelectorAll('[data-chk]').forEach(el=>el.parentElement.classList.toggle('ok',el.textContent==='✓'))}

/* ---------- the action bar: what the tool in hand will do, what it costs, and the buttons to do it ---------- */
function startTool(k,ti){setSheet(0);if(ti>=0&&S.towns[ti]){const t=S.towns[ti];focusAt(t.x,t.z,k==='zone'?Math.min(Math.max(3,(t.R||1)*2.5),9):Math.max(cam.dist,10))}setTool(k)}
function startPlace(bt,ti){setSheet(0);setTool('place',bt,ti)}
function showBar(){const bar=$('bar'),nav=$('nav');if(!bar)return;const k=TOOL.k;
  if(k==='inspect'){if(!bar.hidden){bar.hidden=true;nav.hidden=false;lastBar=''}return}
  nav.hidden=true;bar.hidden=false;
  const p=PEND,town=p&&p.ti>=0&&S.towns[p.ti]?S.towns[p.ti]:null;let icon='',title='',sub='',state='',cost='',btns='',extra='';
  const pri=(lab,i,dis,cls)=>`<button class="btn pri big${cls?' '+cls:''}" data-act="confirm"${dis?' disabled':''}>${ic(i)}${lab}</button>`,undo=`<button class="btn ghost" data-act="undo">${ic('undo')}Undo</button>`;
  if(k==='road'||k==='rail'){const spec=k==='road'?ROADT:RAILT,mx=k==='road'?roadMax():railMax(),lv=lineLevel(k),n=TRACE.length,what=k==='road'?'road':'railway';
    icon=k;title=spec[lv].n;
    if(mx>1)extra=`<div class="seg lvs" role="group" aria-label="Kind">${Array.from({length:mx},(x,i)=>i+1).map(l=>`<button data-act="lv" data-lv="${l}" aria-pressed="${l===lv}">${spec[l].n}</button>`).join('')}</div>`;
    if(!n)sub=`Tap where the ${what} starts, then tap where it goes. Hold and drag to draw it.`;
    else if(p&&p.kind==='up'){const m=missing(p.cost,town);sub=m||`Upgrade this ${num(p.km)} km stretch to ${p.name.toLowerCase()}, or tap where a new ${what} goes.`;state=m?'bad':'';cost=costHTML(p.cost);
      btns=undo+pri('Upgrade','up',!!m)}
    else if(n===1){sub=`Now tap where the ${what} goes. Drag the map to move around.`;btns=undo}
    else if(p&&p.bad){sub=p.bad;state='bad';btns=undo}
    else if(p&&p.kind==='line'){const m=missing(p.cost,town);sub=m||`${num(p.km)} km new${p.br?` · ${p.br} bridge${p.br>1?'s':''}`:''} · paid from ${town?town.n:'—'}. Tap to add a bend.`;state=m?'bad':'';
      cost=costHTML(p.cost);btns=undo+pri('Build','check',!!m)}
    else btns=undo}
  else if(k==='zone'){icon='zone';title='Zone homes';
    if(!p)sub='Tap a street to zone lots beside it. Hold and drag to paint along streets.';
    else if(p.bad){sub=p.bad;state='bad'}
    else{sub=p.warn||`${p.n} lot${p.n===1?'':'s'}. Tap more streets to add them. Towns build houses here when they need room.`;state=p.warn?'warn':S.funds<p.cost.lt?'bad':'';cost=costHTML(p.cost);
      btns=undo+pri('Zone','check',S.funds<p.cost.lt)}}
  else if(k==='bull'){icon='trash';title='Remove';
    if(!p)sub='Tap a building, road or lot. Hold and drag to paint over more.';
    else if(p.bad){sub=p.bad;state='bad'}
    else{const i=p.plan;sub=[i.b.length?`${i.b.length} building${i.b.length>1?'s':''}`:'',i.road>0.05?`${num(i.road)} km of road`:'',i.rail>0.05?`${num(i.rail)} km of track`:'',
      i.lots.length?`${i.lots.length} zoned lot${i.lots.length>1?'s':''}`:''].filter(Boolean).join(' · ')+'. Nothing is refunded.';state='warn';btns=`<button class="btn ghost" data-act="cancelp">${ic('close')}Clear</button>`+pri('Remove','trash',false,'danger')}}
  else if(k==='place'){const T0=BT[TOOL.bt];icon=bIcon(TOOL.bt);title=T0.n;extra=`<button class="btn sm ghost" data-act="buildmenu" data-cat="${T0.cat}"${TOOL.ti>=0?` data-ti="${TOOL.ti}"`:''}>Change</button>`;
    const turn=`<button class="btn ghost" data-act="rotg" aria-label="Turn">${ic('turn')}Turn</button>`,find=`<button class="btn ghost" data-act="find">${ic('spot')}Find a spot</button>`;
    if(!p||p.kind!=='place'){sub=TOOL.built?`${TOOL.built} built. Tap the map to place another, or close.`:'Tap the map to place it.';state=TOOL.built?'good':'';btns=find}
    else if(!p.ok){sub=p.why+(VIEW.need&&/^Needs|^Too wet/.test(p.why)?'. The lit ground suits it.':'.');state='bad';btns=turn+find+pri('Build','check',true)}
    else{const m=missing(p.cost,town),jt=p.jt>=0?S.towns[p.jt]:null;
      sub=m||(p.bonus?'Good land: it makes more here. ':T0.bonus?'It makes more on the lit ground. ':'')+(jt?`Joins ${jt.n}. `:`No town will take it here: it needs a road to a town hall within ${TERRITORY} km. `)+'Drag it to move.';
      state=m||!jt?'bad':p.bonus?'good':'';cost=costHTML(p.cost);btns=turn+pri('Build','check',!!m)}}
  const html=`<div class="bh"><span class="bico">${ic(icon)}</span>${extra&&extra.startsWith('<div class="seg')?'':`<b class="btitle">${title}</b>`}${extra}<button class="ib" data-act="tooloff" aria-label="Close the tool">${ic('close')}</button></div>
    <p class="bsub" data-c="${state}">${sub}</p>${cost||btns?`<div class="bfoot">${cost?`<div class="cost">${cost}</div>`:'<span></span>'}<div class="bbtn">${btns}</div></div>`:''}`;
  if(html!==lastBar){bar.innerHTML=html;lastBar=html}}

/* ---------- actions ---------- */
const RT_=id=>S.routes.find(r=>r.id===+id);
function createRoute(a,b,m){if(a===b)return toast('Pick two different towns');const A=S.towns[a],B0=S.towns[b];if(!A||!B0||A.lock||B0.lock)return toast('Both towns must be part of Lithuania');
  const p=pairPath(m,a,b);if(!p)return toast(m==='rail'?'No railway joins their stations. Lay track and build a station in each town.':'No road joins them yet. Draw one with the Road tool.');
  const vts=Object.keys(VT).filter(k=>VT[k].mode===m&&VT[k].era<=S.era&&(!VT[k].elec||p.lv>=2)),vt=vts[vts.length-1],n=m==='rail'?1:2,cost=VT[vt].cost*n;
  if(S.funds<cost)return toast(`Need ${fmt(cost-S.funds)} more Lt for the vehicles`);S.funds-=cost;const r=addRoute(a,b,m,vt,n,false);VIEW.route=r.id;
  log(`New ${m==='rail'?'rail':'road'} route between ${A.n} and ${B0.n}.`);toast(`Route created: ${A.n} ⇄ ${B0.n}`);save();
  if(S.tab!=='sel'){S.tab='routes';openSide(true)}renderPanel(true)}
function act(d){const ti=d.ti!==undefined?+d.ti:-1,b=d.id!==undefined?BMAP.get(+d.id):null,r=d.r!==undefined?RT_(d.r):null;
  switch(d.act){
    case 'tab':case 'nav':return navTo(d.tab);
    case 'close':return closeSheet();
    case 'seltown':return selectTown(ti,true);
    case 'selb':if(b)selectBuilding(b,true);return;
    case 'focus':{const t=S.towns[ti];if(VIEW.sheet===2)setSheet(1);focusAt(t.x,t.z,Math.min(cam.dist,Math.max(3.5,(t.R||1)*3)));return}
    case 'goto':{const el=$(d.k);if(el){if(VIEW.sheet===1)setSheet(2);el.scrollIntoView({behavior:'smooth',block:'start'})}return}
    case 'bcat':VIEW.bcat=d.cat;$('pbody').scrollTop=0;break;
    case 'bback':VIEW.bcat=null;break;
    case 'buildmenu':VIEW.bti=ti;VIEW.bcat=d.cat||null;if(TOOL.k!=='inspect')setTool('inspect');S.tab='build';openSide(true);renderPanel(true);$('pbody').scrollTop=0;return;
    case 'pick':return startPlace(d.bt,VIEW.bti);
    case 'build':return startPlace(d.bt,ti);
    case 'tool':return startTool(d.tool,ti);
    case 'tooloff':return setTool('inspect');
    case 'undo':return undoStep();
    case 'find':return findGhost(false);
    case 'lv':{TOOL.lv[TOOL.k]=+d.lv;const tr=TRACE.slice();if(tr.length>=2){prepareLine()}else if(tr.length===1){TRACE=[];addPoint(tr[0][0],tr[0][1])}else showBar();return}
    case 'iss':VIEW.iss=VIEW.iss===d.k?null:d.k;break;
    case 'tsort':VIEW.tsort=d.k;break;
    case 'tall':VIEW.tall=!VIEW.tall;break;
    case 'sell':{const t=S.towns[ti],rs=d.r,a=Math.min(+d.q||25,Math.floor(t.stock[rs]||0));if(a<1)return toast(`No ${rname(rs)} in ${t.n} to sell`);const port=townPort(ti),val=a*S.prices[rs]*(port?1.4:1);
      t.stock[rs]-=a;S.funds+=val;if(port)S.stats.portSales+=val;S.prices[rs]=Math.max(RI[rs].p*0.6,S.prices[rs]*Math.pow(0.985,a/25));toast(`Sold ${a} ${rname(rs)} for ${fmt(val)} Lt`);break}
    case 'buy':{const t=S.towns[ti],rs=d.r,c=buyVal(ti,rs);if(!canBuyHere(ti,rs))return toast('Metal can only be imported through a sea port');if(S.funds<c)return toast(`Need ${fmt(c-S.funds)} more Lt`);
      if(room(t,rs)<25)return toast(`No storage room in ${t.n}. Build a warehouse.`);S.funds-=c;t.stock[rs]=(t.stock[rs]||0)+25;S.prices[rs]=Math.min(RI[rs].p*1.6,S.prices[rs]*1.01);toast(`Bought 25 ${rname(rs)} for ${t.n}`);break}
    case 'up':{if(!b)return;if(b.town<0)return toast('Connect it to a town first');const c=upCost(b),t=S.towns[b.town],m=missing(c,t);if(m)return toast(m);pay(c,t);b.lv++;log(`${BT[b.t].n} near ${t.n} modernized to Lv ${b.lv}.`,'good');break}
    case 'toggle':if(b)b.on=!b.on;break;
    case 'demolish':S.confirmDemo=b?b.id:null;break;case 'canceld':S.confirmDemo=null;break;
    case 'demolish2':if(b){removeB(b);analyze();VIEW.sel=null;toast('Demolished')}S.confirmDemo=null;break;
    case 'era':{if(!eraReady())return toast('Not every requirement is met yet');S.funds-=ERAS[S.era+1].req.lt;S.era++;log(`Lithuania enters the ${ERAS[S.era].n} era.`,'hist');
      /* a card marks the new era and what it brings; the clock waits while it is open */
      S.eraCard=S.era;VIEW.eraSpd=S.speed;S.speed=0;showCard();break}
    case 'eraok':{S.eraCard=0;S.speed=VIEW.eraSpd||0;showCard();toast(`${ERAS[S.era].n} era begins`);break}
    case 'newroute':return createRoute(+d.a,+d.b,d.m);
    case 'rcreate':return createRoute(+$('nrA').value,+$('nrB').value,$('nrM').value);
    case 'rveh':{if(!r)return;const V0=VT[r.vt];if(+d.d>0){if(S.funds<V0.cost)return toast(`Need ${fmt(V0.cost-S.funds)} more Lt`);S.funds-=V0.cost;r.n++;toast(`${r.n} ${V0.n.toLowerCase()} on ${S.towns[r.a].n} ⇄ ${S.towns[r.b].n}`)}
      else{if(r.n<=1)return toast('A route needs at least one vehicle. Remove the route instead.');r.n--;S.funds+=V0.cost*0.5}break}
    case 'rvt':{if(!r)return;const vts=Object.keys(VT).filter(k=>VT[k].mode===r.mode&&VT[k].era<=S.era),nx=vts[(vts.indexOf(r.vt)+1)%vts.length],c=r.n*VT[nx].cost-r.n*VT[r.vt].cost*0.5;
      if(c>0&&S.funds<c)return toast(`Need ${fmt(c-S.funds)} more Lt to switch`);S.funds-=c;r.vt=nx;toast(`Now running ${VT[nx].n.toLowerCase()}`);break}
    case 'rauto':if(r)r[d.dir]='auto';break;
    case 'rcargo':{if(!r)return;let s=r[d.dir];s=s==='auto'?[]:s.slice();const q=s.indexOf(d.res);if(q>=0)s.splice(q,1);else s.push(d.res);r[d.dir]=s.length?s:'auto';break}
    case 'rpax':if(r){r.pax=!r.pax;toast(r.pax?'The route now carries commuters':'The route carries goods only')}break;
    case 'rshow':{if(!r)return;VIEW.route=VIEW.route===r.id?null:r.id;const p=routePath(r);if(p&&VIEW.route!==null){const m=p.path[p.path.length>>1];focusAt(m[0],m[1],Math.max(cam.dist,Math.min(300,p.len*0.9)));if(!WIDE())setSheet(0)}break}
    case 'rdel':S.confirmRoute=r?r.id:null;break;case 'rkeep':S.confirmRoute=null;break;
    case 'rdel2':if(r){S.funds+=r.n*VT[r.vt].cost*0.5;S.routes.splice(S.routes.indexOf(r),1);if(VIEW.route===r.id)VIEW.route=null;toast('Route removed')}S.confirmRoute=null;break;
    case 'tutorial':tutStart(true);if(!WIDE())setSheet(0);return;
    case 'card':{if(!pickCard(+d.o))return;showCard();break}
    /* the intro of a new game: the clock stays paused until the player starts it */
    case 'intro':{S.intro=0;showCard();if(!tutStart(false))hint(VIEW.oldSave?'A new version starts a new game: games saved by older versions can’t be loaded. Press ▶ at the top to start the clock.'
      :'The clock is paused. Look around, then press ▶ at the top to start it.');break}
    case 'def':S.hist.def=+d.q;toast(S.hist.def?`The army gets ${S.hist.def} Lt a day`:'No money for the army');break;
    case 'dcreate':{const m=$('ndM').value,dir=$('ndD').value,rs=$('ndR').value,q=+$('ndQ').value,ti2=+$('ndT').value;
      if(!mktPrice(m,rs,dir))return toast(`${MARKETS[m].n} does not ${dir==='out'?'buy':'sell'} ${rname(rs)}`);
      if(![...townGates(ti2)].some(g=>MARKETS[m].gate.includes(g)))return toast(`${S.towns[ti2].n} needs ${GATE_N[MARKETS[m].gate[0]]} to trade with ${MARKETS[m].n}`);
      const old=S.deals.find(x=>x.m===m&&x.r===rs&&x.dir===dir&&x.ti===ti2);if(old)old.q+=q;else addDeal(m,rs,dir,q,ti2);toast('Deal added');break}
    case 'dq':{const x=S.deals.find(y=>y.id===+d.d);if(x)x.q=Math.max(1,x.q+(+d.q>0?(x.q>=10?5:1):(x.q>10?-5:-1)));break}
    case 'ddel':S.deals=S.deals.filter(y=>y.id!==+d.d);toast('Deal ended');break;
    case 'reset':S.confirmReset=true;break;case 'cancelr':S.confirmReset=false;break;
    case 'reset2':{const sp=S.speed;newGame();S.speed=sp;analyze();initScene();VIEW.sel=null;VIEW.route=null;setTool('inspect');camHome();toast('A new republic: 16 February 1918');break}
    case 'confirm':return doConfirm();case 'cancelp':return clearPreview();case 'rotg':return rotateGhost();
  }
  if(!VIEW_ONLY.has(d.act))save();renderPanel(true);updateTop()}
/* taps that only change what the sheet shows: no need to save the game for them */
const VIEW_ONLY=new Set(['bcat','bback','iss','tsort','tall','rdel','rkeep','demolish','canceld','reset','cancelr']);

/* ---------- decision cards: history waits for the player ---------- */
function cardDate(w){if(w.length===4)return w;const d=new Date(w+'T00:00:00Z');return d.getUTCDate()+' '+['January','February','March','April','May','June','July','August','September','October','November','December'][d.getUTCMonth()]+' '+d.getUTCFullYear()}
let cardShown='';
function showCard(){const el=$('card'),id=S.intro?'intro':S.eraCard?'era'+S.eraCard:S.hist.cards[0];if(id===cardShown&&!el.hidden===!!id)return;cardShown=id||'';
  if(!id){el.hidden=true;document.body.classList.remove('carded');return}
  if(id==='intro'||S.eraCard){el.innerHTML=id==='intro'?introHTML():eraHTML(S.eraCard);el.hidden=false;document.body.classList.add('carded');return}
  const c=CARDS[id],sec=Math.round(S.hist.sec);
  el.innerHTML=`<div class="cbox"><div class="eyebrow">${cardDate(c.when)}</div><h2 id="cardt">${c.t}</h2><p>${cardTxt(c.txt)}</p><div class="opts">${c.opts.map((o,i)=>{const r=o.risk,ok=r&&sec>=r.sec;
    return `<button class="opt${o.h?' hist':''}" data-card="${i}"><b>${o.t}</b><span>${cardTxt(o.d)}</span>${r?`<em class="${ok?'ok':'bad'}">${ic('shield')}Security ${sec} of ${r.sec} needed</em>`:''}</button>`}).join('')}</div></div>`;
  el.hidden=false;document.body.classList.add('carded')}

/* ---------- loop & boot ---------- */
let last=0,acc=0,pT=0;
/* how much of the bottom of the view the sheet and the navigation cover: the camera centres on what stays visible */
function coverBottom(){const st=$('stage').getBoundingClientRect();let top=st.bottom;const dk=$('dock').getBoundingClientRect();if(dk.height&&!WIDE())top=Math.min(top,dk.top);
  if(!WIDE()&&VIEW.sheet>0)top=Math.min(top,$('side').getBoundingClientRect().top);return Math.max(0,st.bottom-top)}
function frame(now){const dt=Math.min(0.1,(now-(last||now))/1000);last=now;acc+=dt*TPS[S.speed];let n=0;
  if(S.hist.cards.length)acc=0;
  while(acc>=1&&n<16){tick();acc-=1;n++;if(S.day%30===0)autosave();if(S.hist.cards.length){acc=0;save();break}}if(NET.dirty)analyze();showCard();
  VOFF.ty=coverBottom()/2;updateAgents(dt);draw(dt);const cp=$('compass');if(cp)cp.firstElementChild.style.transform=`rotate(${-cam.yaw}rad)`;
  pT+=dt;if(pT>0.3){pT=0;updateTop();renderPanel(false);showBar();tutTick();updateTask();if(NOTES.length&&!toastBusy()&&!S.hist.cards.length&&!S.intro&&!S.eraCard)toast(NOTES.shift())}requestAnimationFrame(frame)}
/* the ministry task on the map, above the bottom bar: tap it to see all tasks */
let taskTxt=null;
function updateTask(){const el=$('task');if(!el)return;const o=curTask(),show=!!o&&!S.intro&&!S.eraCard&&!TUT.on&&TOOL.k==='inspect'&&(WIDE()||!VIEW.sheet)&&!S.hist.cards.length;
  if(el.hidden===show)el.hidden=!show;if(!o)return;const tx=o.t.replace(/ \(.*\)$/,'')+'|'+o.r;if(tx===taskTxt)return;taskTxt=tx;
  el.innerHTML=`${ic('star')}<span>${o.t.replace(/ \(.*\)$/,'')}</span><b>+${fmt(o.r)} Lt</b>`;el.setAttribute('aria-label','Ministry task: '+o.t+'. Reward '+fmt(o.r)+' Lt. Show all tasks.')}
/* the opening view: the capital from the south-west, slightly tilted */
function camHome(){const v0=capital();camLoad({x:v0.x+0.2,z:v0.z+0.3,dist:6,yaw:-0.35,pitch:0.74})}
function start(data){const old=dropOldSaves(),saved=data&&data.save?data.save:load();let fresh=false;VIEW.oldSave=old;
  if(saved){try{restore(saved)}catch(e){newGame();fresh=true}}else{newGame();fresh=true}
  analyze();S.routes.forEach(routeEval);if(S.cam&&isFinite(S.cam.dist))camLoad(S.cam);else camHome();initScene();
  VIEW.seen=S.day;VIEW.spd=S.speed||1;if(S.tab==='sel'||S.tab==='build')S.tab='nat';
  document.addEventListener('click',e=>{const nv=e.target.closest('[data-nav]');if(nv){navTo(nv.dataset.nav);return}
    const a=e.target.closest('[data-act]');if(a&&(a.closest('#pbody')||a.closest('#shead')||a.closest('#bar')))act(a.dataset);
    const tl=e.target.closest('.tl');if(tl&&tl.closest('#labels'))selectTown(+tl.dataset.ti,true)});
  $('compass').addEventListener('click',()=>northUp());
  $('sp-play').addEventListener('click',()=>setSpeed(S.speed?0:VIEW.spd||1));
  $('sp-fast').addEventListener('click',()=>{VIEW.spd=VIEW.spd>=3?1:(VIEW.spd||1)+1;if(S.speed)S.speed=VIEW.spd;updateTop();save()});
  ['grab','shead'].forEach(id=>{const el=$(id);el.addEventListener('pointerdown',sheetDown);el.addEventListener('pointermove',sheetMove);el.addEventListener('pointerup',sheetUp);el.addEventListener('pointercancel',sheetUp)});
  $('hint').addEventListener('click',()=>hint(''));
  const rs=()=>{resize();sheetSizes();setSheet(VIEW.sheet);lastNav=''};
  if(window.ResizeObserver)new window.ResizeObserver(rs).observe($('stage'));else window.addEventListener('resize',rs);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
  sheetSizes();setSheet(WIDE()?1:0);renderPanel(true);updateTop();showBar();
  $('tut').addEventListener('click',e=>{const b=e.target.closest('[data-tut]');if(!b)return;if(b.dataset.tut==='next')tutNext();else tutEnd()});
  $('card').addEventListener('click',e=>{const b=e.target.closest('[data-card]');if(b)act({act:'card',o:b.dataset.card});if(e.target.closest('[data-intro]'))act({act:'intro'});if(e.target.closest('[data-eraok]'))act({act:'eraok'})});
  $('task').addEventListener('click',()=>{navTo('nat');setTimeout(()=>act({act:'goto',k:'tasks'}),60)});
  /* a new game opens on its intro; a saved one goes straight on */
  if(!S.intro&&!tutStart(false)&&fresh)hint('Vilnius, 16 February 1918. Drag to move, pinch to zoom, twist two fingers to turn. Tap a town to see what it needs.');
  requestAnimationFrame(frame)}
try{window.claude?.hot?.snapshot?.(()=>({save:serialize()}))}catch(e){}
(function(){const hot=window.claude?.hot;hot?.ready?hot.ready(start):start(hot?.data??{})})();
