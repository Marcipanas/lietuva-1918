'use strict';
/* Lietuva 1918 — interface core: top bar, tools, build drawer, confirm bar, side panel, actions, loop and boot. */
const $=id=>document.getElementById(id);
let lastStruct='',tt=0,ht=0;
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2400)}
function hint(m){const h=$('hint');if(!m){h.hidden=true;return}h.textContent=m;h.hidden=false;clearTimeout(ht);ht=setTimeout(()=>{h.hidden=true},7000)}

/* ---------- tools ---------- */
const TOOLS=[['inspect','cursor','Select'],['road','road','Road'],['rail','rail','Rail'],['zone','zone','Zone'],['build','factory','Build'],['bull','trash','Remove']];
function renderTools(){$('tools').innerHTML=TOOLS.map(([k,i,l])=>{const on=k==='build'?TOOL.k==='place'||!$('drawer').hidden:TOOL.k===k;
  const lab=k==='build'&&TOOL.k==='place'?BT[TOOL.bt].n.split(' ')[0]:l;return `<button data-tool="${k}" aria-pressed="${on}" title="${l}">${ic(k==='build'&&TOOL.k==='place'?bIcon(TOOL.bt):i)}<span>${lab}</span></button>`}).join('')}
function toggleDrawer(force){const d=$('drawer'),open=force!==undefined?force:d.hidden;
  if(open)d.innerHTML=CATS.map(([c,cn])=>{const items=Object.entries(BT).filter(([t,T0])=>T0.cat===c&&(T0.era<=S.era+1||unlocked(t)));if(!items.length)return '';
    return `<div class="dcat">${cn}</div>`+items.map(([t,T0])=>{const lk=!unlocked(t);return `<button class="bcard${lk?' lock':''}${TOOL.bt===t&&TOOL.k==='place'?' on':''}" data-bt="${t}" ${lk?'disabled':''} style="--c:${bCol(t)}">${ic(bIcon(t))}<b>${T0.n}</b><small>${lk?ERAS[T0.era].n+' era':costTxt(T0.cost)}</small></button>`}).join('')}).join('');
  d.hidden=!open;renderTools()}
function showConfirm(){const c=$('confirm'),p=PEND;if(!p){c.hidden=true;return}let h='',ok=!p.bad;const town=p.ti>=0&&S.towns[p.ti]?S.towns[p.ti]:null;
  if(p.bad)h=`<div class="ct">${p.kind==='place'?BT[p.t].n:p.kind==='bull'?'Remove':'Can’t build here'}</div><div class="cd">${p.bad}</div>`;
  else if(p.kind==='line'){const m=missing(p.cost,town);ok=!m;h=`<div class="ct">${p.name} · ${num(p.km)} km${p.br?` · ${p.br} bridge${p.br>1?'s':''}`:''}</div><div class="cost">${costHTML(p.cost)}</div><div class="cd">${m||('Materials from '+(town?town.n:'—'))}</div>`}
  else if(p.kind==='up'){const m=missing(p.cost,town);ok=!m;h=`<div class="ct">Upgrade ${num(p.km)} km to ${p.name.toLowerCase()}</div><div class="cost">${costHTML(p.cost)}</div><div class="cd">${m||'Or tap elsewhere to draw a new line from here.'}</div>`}
  else if(p.kind==='zone'){ok=S.funds>=p.cost.lt;h=`<div class="ct">Zone ${p.n} lot${p.n===1?'':'s'} for homes</div><div class="cost">${costHTML(p.cost)}</div><div class="cd">${p.warn||'Brown tint marks smoky air. Towns build houses here when they need room.'}</div>`}
  else if(p.kind==='bull'){const i=p.plan;h=`<div class="ct">Remove</div><div class="cd">${[i.b.length?`${i.b.length} building${i.b.length>1?'s':''}`:'',i.road>0.05?`${num(i.road)} km of road`:'',i.rail>0.05?`${num(i.rail)} km of track`:'',i.lots.length?`${i.lots.length} zoned lot${i.lots.length>1?'s':''}`:''].filter(Boolean).join(' · ')}. Nothing is refunded.</div>`}
  else if(p.kind==='place'){const m=p.ok?missing(p.cost,town):'';ok=p.ok&&!m;h=`<div class="ct">${BT[p.t].n}${p.ok&&p.bonus?' · good land':''}</div><div class="cost">${costHTML(p.cost)}</div><div class="cd">${!p.ok?p.why:m||('Paid from '+(town?town.n:'—'))}</div>`}
  const lab=p.kind==='bull'?'Remove':p.kind==='zone'?'Zone':p.kind==='up'?'Upgrade':'Build';
  c.innerHTML=`<div class="cbody">${h}</div><div class="cbtn">${p.kind==='place'?`<button class="btn ghost" data-act="rotg" aria-label="Turn">${ic('turn')}</button>`:''}${p.bad?'':`<button class="btn pri" data-act="confirm" ${ok?'':'disabled'}>${lab}</button>`}<button class="btn ghost" data-act="cancelp" aria-label="Cancel">${ic('close')}</button></div>`;c.hidden=false}

/* ---------- selection & side panel ---------- */
function openSide(on){$('side').classList.toggle('open',on)}
function select(s){VIEW.sel=s;S.tab='sel';S.confirmDemo=null;renderPanel(true);if(!s&&window.innerWidth<960)openSide(false)}
function selectTown(ti,focus){VIEW.sel={kind:'t',ti};S.tab='sel';S.confirmDemo=null;if(focus){const t=S.towns[ti];focusAt(t.x,t.z,Math.min(cam.dist,Math.max(3.5,(t.R||1)*3)))}openSide(true);renderPanel(true)}
function selectBuilding(b,focus){VIEW.sel={kind:'b',id:b.id};S.tab='sel';S.confirmDemo=null;if(focus)focusAt(b.x,b.z,Math.min(cam.dist,4));openSide(true);renderPanel(true)}
function selTitle(){const s=VIEW.sel;if(!s)return 'Start';if(s.kind==='t')return S.towns[s.ti].n;const b=BMAP.get(s.id);return b?bName(b):'Start'}
function renderTabs(){const T0=[['sel',selTitle()],['routes','Routes'],['trade',S.hist.path==='soviet'?'Plan':'Trade'],['nat','Lithuania'],['chron','Chronicle']];
  $('tabs').innerHTML=T0.map(([k,l])=>`<button role="tab" aria-selected="${S.tab===k}" data-act="tab" data-tab="${k}">${l}${k==='chron'?`<span class="cnt" id="logcnt">${S.log.length}</span>`:k==='routes'?`<span class="cnt">${S.routes.length}</span>`:''}</button>`).join('')}
function renderPanel(force){V={};W={};const s=VIEW.sel;let html;
  if(S.tab==='nat')html=natPanel();else if(S.tab==='chron')html=chronPanel();else if(S.tab==='routes')html=routesPanel();else if(S.tab==='trade')html=tradePanel();
  else if(!s)html=startPanel();else if(s.kind==='t')html=townPanel(s.ti);else{const b=BMAP.get(s.id);html=b?buildingPanel(b):startPanel()}
  const st=html.replace(/(<span data-v="[^"]*"(?: data-\w+)?>)[^<]*(<\/span>)/g,'$1$2').replace(/(<i data-w="[^"]*") style="[^"]*"/g,'$1'),body=$('pbody');
  if(force||st!==lastStruct){const sel=[...body.querySelectorAll('select')].map(x=>[x.id,x.value]);body.innerHTML=html;lastStruct=st;renderTabs();sel.forEach(([id,val])=>{const x=$(id);if(x)x.value=val})}
  else{body.querySelectorAll('[data-v]').forEach(el=>{const t=V[el.dataset.v];if(t!==undefined&&el.textContent!==t)el.textContent=t});
    body.querySelectorAll('[data-w]').forEach(el=>{const p=W[el.dataset.w];if(p!==undefined)el.style.width=p+'%'})}
  body.querySelectorAll('[data-sign]').forEach(el=>{const t=el.textContent;el.classList.toggle('neg',t.startsWith('−'));el.classList.toggle('zero',t.startsWith('0.0'))});
  body.querySelectorAll('[data-stat]').forEach(el=>el.classList.toggle('bad',!(el.textContent==='Running')));
  body.querySelectorAll('[data-stat2]').forEach(el=>el.classList.toggle('bad',el.textContent.startsWith('Polluted')));
  body.querySelectorAll('[data-stat3]').forEach(el=>el.classList.toggle('bad',!/^[+−]/.test(el.textContent)));
  body.querySelectorAll('[data-chk]').forEach(el=>el.parentElement.classList.toggle('ok',el.textContent==='✓'))}
function updateTop(){$('t-date').textContent=dateStr(S.day);$('t-funds').textContent=fmt(S.funds)+' Lt';const i=$('t-inc');i.textContent=fd(S.inc)+'/d';i.classList.toggle('neg',S.inc<0);
  $('t-pop').textContent=popStr(totals().pop);$('t-era').textContent=ERAS[S.era].n;const sea=seasonOf(S.day);$('t-sea').innerHTML=ic(sea.snow>0.45?'snow':sea.aut>0.45?'tree':'grain');
  document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.speed===S.speed)));const lc=$('logcnt');if(lc)lc.textContent=S.log.length}

/* ---------- actions ---------- */
const RT_=id=>S.routes.find(r=>r.id===+id);
function createRoute(a,b,m){if(a===b)return toast('Pick two different towns');const A=S.towns[a],B0=S.towns[b];if(!A||!B0||A.lock||B0.lock)return toast('Both towns must be part of Lithuania');
  const p=pairPath(m,a,b);if(!p)return toast(m==='rail'?'No railway joins their stations. Lay track and build a station in each town.':'No road joins them yet. Draw one with the Road tool.');
  const vts=Object.keys(VT).filter(k=>VT[k].mode===m&&VT[k].era<=S.era&&(!VT[k].elec||p.lv>=2)),vt=vts[vts.length-1],n=m==='rail'?1:2,cost=VT[vt].cost*n;
  if(S.funds<cost)return toast(`Need ${fmt(cost-S.funds)} more Lt for the vehicles`);S.funds-=cost;const r=addRoute(a,b,m,vt,n,false);VIEW.route=r.id;S.tab='routes';openSide(true);
  log(`New ${m==='rail'?'rail':'road'} route between ${A.n} and ${B0.n}.`);toast('Route created');save();renderPanel(true)}
function act(d){const ti=d.ti!==undefined?+d.ti:-1,b=d.id!==undefined?BMAP.get(+d.id):null,r=d.r!==undefined?RT_(d.r):null;
  switch(d.act){
    case 'tab':S.tab=d.tab;S.confirmReset=false;S.confirmRoute=null;break;
    case 'seltown':return selectTown(ti,true);
    case 'selb':if(b)selectBuilding(b,true);return;
    case 'focus':{const t=S.towns[ti];focusAt(t.x,t.z,Math.min(cam.dist,Math.max(3.5,(t.R||1)*3)));if(window.innerWidth<960)openSide(false);return}
    case 'tool':setTool(d.tool);if(window.innerWidth<960)openSide(false);return;
    case 'sell':{const t=S.towns[ti],rs=d.r,a=Math.min(25,Math.floor(t.stock[rs]||0));if(a<1)return toast(`No ${rname(rs)} in ${t.n} to sell`);const port=townPort(ti),val=a*S.prices[rs]*(port?1.4:1);
      t.stock[rs]-=a;S.funds+=val;if(port)S.stats.portSales+=val;S.prices[rs]=Math.max(RI[rs].p*0.6,S.prices[rs]*0.985);toast(`Sold ${a} ${rname(rs)} for ${fmt(val)} Lt`);break}
    case 'buy':{const t=S.towns[ti],rs=d.r,c=buyVal(ti,rs);if(!canBuyHere(ti,rs))return toast('Metal can only be imported through a sea port');if(S.funds<c)return toast(`Need ${fmt(c-S.funds)} more Lt`);
      if(room(t,rs)<25)return toast(`No storage room in ${t.n}. Build a warehouse.`);S.funds-=c;t.stock[rs]=(t.stock[rs]||0)+25;S.prices[rs]=Math.min(RI[rs].p*1.6,S.prices[rs]*1.01);toast(`Bought 25 ${rname(rs)} for ${t.n}`);break}
    case 'up':{if(!b)return;if(b.town<0)return toast('Connect it to a town first');const c=upCost(b),t=S.towns[b.town],m=missing(c,t);if(m)return toast(m);pay(c,t);b.lv++;log(`${BT[b.t].n} near ${t.n} modernized to Lv ${b.lv}.`,'good');break}
    case 'toggle':if(b)b.on=!b.on;break;
    case 'demolish':S.confirmDemo=b?b.id:null;break;case 'canceld':S.confirmDemo=null;break;
    case 'demolish2':if(b){removeB(b);analyze();VIEW.sel=null;toast('Demolished')}S.confirmDemo=null;break;
    case 'era':{if(!eraReady())return toast('Not every requirement is met yet');S.funds-=ERAS[S.era+1].req.lt;S.era++;log(`Lithuania enters the ${ERAS[S.era].n} era.`,'hist');toast(`${ERAS[S.era].n} era begins`);if(!$('drawer').hidden)toggleDrawer(true);break}
    case 'newroute':return createRoute(+d.a,+d.b,d.m);
    case 'rcreate':return createRoute(+$('nrA').value,+$('nrB').value,$('nrM').value);
    case 'rveh':{if(!r)return;const V0=VT[r.vt];if(+d.d>0){if(S.funds<V0.cost)return toast(`Need ${fmt(V0.cost-S.funds)} more Lt`);S.funds-=V0.cost;r.n++}
      else{if(r.n<=1)return toast('A route needs at least one vehicle. Remove the route instead.');r.n--;S.funds+=V0.cost*0.5}break}
    case 'rvt':{if(!r)return;const vts=Object.keys(VT).filter(k=>VT[k].mode===r.mode&&VT[k].era<=S.era),nx=vts[(vts.indexOf(r.vt)+1)%vts.length],c=r.n*VT[nx].cost-r.n*VT[r.vt].cost*0.5;
      if(c>0&&S.funds<c)return toast(`Need ${fmt(c-S.funds)} more Lt to switch`);S.funds-=c;r.vt=nx;toast(`Now running ${VT[nx].n.toLowerCase()}`);break}
    case 'rauto':if(r)r[d.dir]='auto';break;
    case 'rcargo':{if(!r)return;let s=r[d.dir];s=s==='auto'?[]:s.slice();const q=s.indexOf(d.res);if(q>=0)s.splice(q,1);else s.push(d.res);r[d.dir]=s.length?s:'auto';break}
    case 'rpax':if(r)r.pax=!r.pax;break;
    case 'rshow':{if(!r)return;VIEW.route=VIEW.route===r.id?null:r.id;const p=routePath(r);if(p&&VIEW.route!==null){const m=p.path[p.path.length>>1];focusAt(m[0],m[1],Math.max(cam.dist,Math.min(300,p.len*0.9)));if(window.innerWidth<960)openSide(false)}break}
    case 'rdel':S.confirmRoute=r?r.id:null;break;case 'rkeep':S.confirmRoute=null;break;
    case 'rdel2':if(r){S.funds+=r.n*VT[r.vt].cost*0.5;S.routes.splice(S.routes.indexOf(r),1);if(VIEW.route===r.id)VIEW.route=null;toast('Route removed')}S.confirmRoute=null;break;
    case 'tutorial':tutStart(true);if(window.innerWidth<960)openSide(false);return;
    case 'card':{if(!pickCard(+d.o))return;showCard();break}
    case 'def':S.hist.def=+d.q;toast(S.hist.def?`The army gets ${S.hist.def} Lt a day`:'No money for the army');break;
    case 'dcreate':{const m=$('ndM').value,dir=$('ndD').value,rs=$('ndR').value,q=+$('ndQ').value,ti2=+$('ndT').value;
      if(!mktPrice(m,rs,dir))return toast(`${MARKETS[m].n} does not ${dir==='out'?'buy':'sell'} ${rname(rs)}`);
      if(![...townGates(ti2)].some(g=>MARKETS[m].gate.includes(g)))return toast(`${S.towns[ti2].n} needs ${GATE_N[MARKETS[m].gate[0]]} to trade with ${MARKETS[m].n}`);
      const old=S.deals.find(x=>x.m===m&&x.r===rs&&x.dir===dir&&x.ti===ti2);if(old)old.q+=q;else addDeal(m,rs,dir,q,ti2);toast('Deal added');break}
    case 'dq':{const x=S.deals.find(y=>y.id===+d.d);if(x)x.q=Math.max(1,x.q+(+d.q>0?(x.q>=10?5:1):(x.q>10?-5:-1)));break}
    case 'ddel':S.deals=S.deals.filter(y=>y.id!==+d.d);toast('Deal ended');break;
    case 'reset':S.confirmReset=true;break;case 'cancelr':S.confirmReset=false;break;
    case 'reset2':{const sp=S.speed;newGame();S.speed=sp;analyze();initScene();VIEW.sel=null;VIEW.route=null;clearPreview();camHome();toast('A new republic: 16 February 1918');break}
    case 'confirm':return doConfirm();case 'cancelp':return clearPreview();case 'rotg':return rotateGhost();
  }
  save();renderPanel(true);updateTop()}

/* ---------- decision cards: history waits for the player ---------- */
function cardDate(w){if(w.length===4)return w;const d=new Date(w+'T00:00:00Z');return d.getUTCDate()+' '+['January','February','March','April','May','June','July','August','September','October','November','December'][d.getUTCMonth()]+' '+d.getUTCFullYear()}
let cardShown='';
function showCard(){const el=$('card'),id=S.hist.cards[0];if(id===cardShown&&!el.hidden===!!id)return;cardShown=id||'';
  if(!id){el.hidden=true;document.body.classList.remove('carded');return}
  const c=CARDS[id],sec=Math.round(S.hist.sec);
  el.innerHTML=`<div class="cbox"><div class="eyebrow">${cardDate(c.when)}</div><h2 id="cardt">${c.t}</h2><p>${c.txt}</p><div class="opts">${c.opts.map((o,i)=>{const r=o.risk,ok=r&&sec>=r.sec;
    return `<button class="opt" data-card="${i}"><b>${o.t}</b><span>${o.d}</span>${r?`<em class="${ok?'ok':'bad'}">${ic('shield')}Security ${sec} of ${r.sec} needed</em>`:''}</button>`}).join('')}</div></div>`;
  el.hidden=false;document.body.classList.add('carded')}

/* ---------- loop & boot ---------- */
let last=0,acc=0,pT=0;
function frame(now){const dt=Math.min(0.1,(now-(last||now))/1000);last=now;acc+=dt*TPS[S.speed];let n=0;
  if(S.hist.cards.length)acc=0;
  while(acc>=1&&n<16){tick();acc-=1;n++;if(S.day%30===0)autosave();if(S.hist.cards.length){acc=0;save();break}}if(NET.dirty)analyze();showCard();
  updateAgents(dt);draw(dt);const cp=$('compass');if(cp)cp.firstElementChild.style.transform=`rotate(${-cam.yaw}rad)`;
  pT+=dt;if(pT>0.3){pT=0;updateTop();renderPanel(false);tutTick()}requestAnimationFrame(frame)}
/* the opening view: Vilnius from the south-west, slightly tilted */
function camHome(){const v0=S.towns[0];camLoad({x:v0.x+0.2,z:v0.z+0.3,dist:6,yaw:-0.35,pitch:0.74})}
function start(data){const saved=data&&data.save?data.save:load();let fresh=false;
  if(saved){try{restore(saved)}catch(e){newGame();fresh=true}}else{newGame();fresh=true}
  analyze();S.routes.forEach(routeEval);if(S.cam&&isFinite(S.cam.dist))camLoad(S.cam);else camHome();initScene();
  document.addEventListener('click',e=>{const t=e.target.closest('[data-tool]');if(t&&t.closest('#tools')){const k=t.dataset.tool;if(k==='build')toggleDrawer();else{toggleDrawer(false);setTool(TOOL.k===k&&k!=='inspect'?'inspect':k)}return}
    const bc=e.target.closest('[data-bt]');if(bc){toggleDrawer(false);setTool('place',bc.dataset.bt);if(window.innerWidth<960)openSide(false);return}
    const a=e.target.closest('[data-act]');if(a&&(a.closest('#pbody')||a.closest('#tabs')||a.closest('#confirm')))act(a.dataset);
    const tl=e.target.closest('.tl');if(tl&&tl.closest('#labels'))selectTown(+tl.dataset.ti,true)});
  $('compass').addEventListener('click',()=>northUp());
  document.querySelector('.speed').addEventListener('click',e=>{const b=e.target.closest('[data-speed]');if(!b)return;S.speed=+b.dataset.speed;updateTop();save()});
  $('fab').addEventListener('click',()=>openSide(!$('side').classList.contains('open')));$('sideClose').addEventListener('click',()=>openSide(false));
  $('hint').addEventListener('click',()=>hint(''));
  if(window.ResizeObserver)new window.ResizeObserver(()=>resize()).observe(cv);else window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
  renderTools();renderPanel(true);updateTop();
  $('tut').addEventListener('click',e=>{const b=e.target.closest('[data-tut]');if(!b)return;if(b.dataset.tut==='next')tutNext();else tutEnd()});
  $('card').addEventListener('click',e=>{const b=e.target.closest('[data-card]');if(b)act({act:'card',o:b.dataset.card})});
  if(!tutStart(false)&&fresh)hint('Vilnius, 16 February 1918. Pinch to zoom, twist two fingers to turn, slide them up or down to tilt. Goods move on routes: open the Routes tab.');
  requestAnimationFrame(frame)}
try{window.claude?.hot?.snapshot?.(()=>({save:serialize()}))}catch(e){}
(function(){const hot=window.claude?.hot;hot?.ready?hot.ready(start):start(hot?.data??{})})();
