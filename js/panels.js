'use strict';
/* Lietuva 1918 — side panel content. Dynamic numbers go through v()/w() so the panel can update without re-rendering. */
let V={},W={};
const v=(k,t,flag)=>{t=String(t);V[k]=t;return `<span data-v="${k}"${flag?' data-'+flag:''}>${t}</span>`};
const w=(k,p)=>{W[k]=p;return `<i data-w="${k}" style="width:${p}%"></i>`};
function costHTML(c){return Object.entries(c).filter(([k,q])=>q>0).map(([k,q])=>k==='lt'?`<span style="--c:var(--amber)">${ic('coin')}${fmt(q)} Lt</span>`:`<span style="--c:var(--r-${k})">${ic(RI[k].ic)}${fmt(q)} ${rname(k)}</span>`).join('')}
function io(T0,lv,k){const p=[];if(T0.in)p.push('uses '+Object.entries(T0.in).map(([r,q])=>num(q*INM[lv])+' '+rname(r)).join(' + '));if(T0.powNeed)p.push(num(T0.powNeed*LV[lv])+' MW');
  if(T0.out)p.push('makes '+Object.entries(T0.out).map(([r,q])=>num(q*LV[lv]*(k||1))+' '+rname(r)).join(', '));if(T0.pow)p.push('makes '+num(T0.pow*LV[lv])+' MW');return p.join(' · ')}
function growthTxt(t){if(t.hint)return t.hint;if(t.fed<0.99)return t.pop>t.pop0?'Shrinking: short of food':'Not growing: short of food';if(t.h<45)return 'Not growing: morale too low';
  const fbal=FOOD.reduce((a,r)=>a+(t.dl[r]||0),0);if(t.pop>=t.pop0-0.05&&((t.fdays||0)<8||fbal<-0.01))return `Holding steady: its own fields feed ${popStr(t.pop0)}. More food lets it grow.`;
  return t.pop<t.house*0.92?'Moving into empty homes':'Building new homes on zoned land'}
function startPanel(){const next=OBJ.filter(o=>!S.obj[o.id]).slice(0,3);
  return `<section class="hero"><div class="eyebrow">16 February 1918</div><h2>Build Lithuania</h2><p class="lede">Tap a town or building to manage it. Every town and village feeds itself; to grow, it needs roads, homes, farms, industry and transport routes.</p></section>
  <ol class="steps2"><li><b>Feed the towns.</b> Five foods: the more kinds people eat, the happier they are. In winter every home burns peat or timber.</li>
  <li><b>Move goods on routes.</b> Nothing travels on its own. Open Routes to see the old railway lines and add carts, trucks or trains.</li>
  <li><b>Zone land.</b> Paint lots along streets with the Zone tool. Towns build houses there. Keep smoky industry away from homes.</li>
  <li><b>Store and staff.</b> Warehouses raise storage. Workers can commute on foot to nearby towns, or on routes that carry commuters.</li>
  <li><b>Trade and history.</b> Sell abroad through a border post or a sea port. On key dates history asks you to choose, and some choices can avoid what happened.</li>
  <li><b>Look around.</b> Drag to move. Pinch to zoom, twist two fingers to turn, slide two fingers up or down to tilt. The compass turns north up again.</li></ol>
  ${next.length?`<div class="sec"><h3>Ministry tasks</h3><ul class="objs">${next.map(o=>`<li>${ic('star')}<span>${o.t}</span><b>+${fmt(o.r)} Lt</b></li>`).join('')}</ul></div>`:''}
  <div class="row"><button class="btn" data-act="seltown" data-ti="0">${ic('target')}Go to Vilnius</button><button class="btn ghost" data-act="tab" data-tab="routes">${ic('route')}Routes</button></div>`}
function needsBlock(ti){const t=S.towns[ti],need=t.pop*0.1,sea=seasonOf(S.day);
  return `<div class="needs"><div class="need"><span class="nk">${ic('grain')}Food</span><span class="foods">${FOOD.map(f=>`<i class="${t.ate&&(t.ate[f]||0)>=need*0.08?'on':''}" style="--c:var(--r-${f})" title="${RI[f].n}">${ic(RI[f].ic)}</i>`).join('')}</span>
    <span class="nv">${v(ti+'fv',(t.vari||0)+' of 5 kinds · fed '+Math.round((t.fed||0)*100)+'%')}</span></div>
    <div class="need"><span class="nk">${ic('tree')}Own land</span><span class="nv">Feeds and heats ${popStr(t.pop0)}</span></div>
    <div class="need"><span class="nk">${ic('fire')}Heating</span><span class="nv">${v(ti+'ht',sea.heat>0.05?Math.round((t.heat||0)*100)+'% of homes warm':'Not needed this season')}</span></div>
    <div class="need"><span class="nk">${ic('school')}Services</span><span class="nv">${v(ti+'sv','Schools '+Math.round((t.edu||0)*100)+'% · clinics '+Math.round((t.med||0)*100)+'%')}</span></div>
    <div class="need"><span class="nk">${ic('smog')}Air</span><span class="nv">${v(ti+'pl',(t.pol||0)<0.3?'Clean':'Polluted near homes ('+num(t.pol)+')','stat2')}</span></div>
    <div class="need"><span class="nk">${ic('people')}Commuting</span><span class="nv">${v(ti+'cm',num(t.comIn||0)+'k in · '+num(t.comOut||0)+'k out · '+num(t.unemp||0)+'k jobless')}</span></div>
    <div class="need"><span class="nk">${ic('box')}Storage</span><span class="nv">${v(ti+'cap',fmt(t.cap||STORE_BASE)+' of each good')}</span></div></div>`}
function warehouseTiles(ti){const t=S.towns[ti],port=townPort(ti),cap=t.cap||STORE_BASE;let h=`<div class="sec"><h3>Stock<span>${S.hist.path==='soviet'?'state shops only':port?'Port prices: sell +40%, imports cheaper':'Local merchants buy and sell in lots of 25'}</span></h3><div class="tiles">`;
  RES.filter(r=>RI[r].era<=S.era).forEach(r=>{const s=t.stock[r]||0;h+=`<div class="tile" style="--c:var(--r-${r})"><div class="th">${ic(RI[r].ic)}${RI[r].n}</div>
    <div class="ta">${v(ti+'s'+r,fmt(s))}<small>${v(ti+'d'+r,fd(t.dl[r]||0)+'/d','sign')}</small></div><div class="sbar">${w(ti+'f'+r,Math.round(Math.min(1,s/cap)*100))}</div>
    ${S.hist.path==='soviet'?'':`<div class="tb"><button class="btn sm ghost" data-act="sell" data-ti="${ti}" data-r="${r}">Sell ${v(ti+'sv'+r,'+'+fmt(sellVal(ti,r)))}</button>${canBuyHere(ti,r)
      ?`<button class="btn sm ghost" data-act="buy" data-ti="${ti}" data-r="${r}">Buy ${v(ti+'bv'+r,'−'+fmt(buyVal(ti,r)))}</button>`:`<span class="note">Import via a port or border post</span>`}</div>`}</div>`});return h+'</div></div>'}
function townPanel(ti){const t=S.towns[ti];
  if(t.lock)return S.hist.lost?`<section class="hero"><div class="eyebrow">Klaipėda Region · ${t.reg}</div><h2>${t.n}</h2><p class="lede">Part of Germany since March 1939.</p></section>`
    :`<section class="hero"><div class="eyebrow">Klaipėda Region · ${t.reg}</div><h2>${t.n}</h2><p class="lede">Under Allied administration since 1920. On 16 February 1923 the region is transferred to Lithuania, bringing the country its only sea port.</p></section>
    <p class="note">Its railway runs only to Tilsit in Germany. Plan a railway from Telšiai, as built in 1932, or a paved road, to link the port once the region joins. You can’t build inside the region until then.</p>`;
  let h=`<section class="hero"><div class="eyebrow">${t.capital?'Capital':townPort(ti)?'Sea port':t.vil?'Village':'Town'}${t.reg?' · '+t.reg:''}</div><h2>${t.n}</h2><p class="lede">${t.d}</p>
    <div class="row"><button class="btn sm" data-act="focus" data-ti="${ti}">${ic('target')}Show on map</button><button class="btn sm ghost" data-act="tool" data-tool="zone">${ic('zone')}Zone land</button></div></section>`;
  h+=`<div class="kpis"><div class="kpi"><span class="k">${ic('people')}Residents</span><b>${v(ti+'p',popStr(t.pop))}</b><small>homes for ${v(ti+'hs',popStr(t.house))}</small></div>
    <div class="kpi"><span class="k">${ic('heart')}Morale</span><b>${v(ti+'h',Math.round(t.h)+'%')}</b><small>${v(ti+'n',t.note)}</small><div class="mbar">${w(ti+'hb',Math.round(t.h))}</div></div>
    <div class="kpi"><span class="k">${ic('factory')}Workers</span><b>${v(ti+'wf',popStr(t.wf))}</b><small>${v(ti+'jb',popStr(t.jobs))} jobs</small></div>
    ${S.era>=2?`<div class="kpi"><span class="k">${ic('bolt')}Grid</span><b>${v(ti+'pr',Math.round(t.pr*100)+'%')}</b><small>${v(ti+'gs',fmt(t.gS))} of ${v(ti+'gd',fmt(t.gD))} MW</small></div>`:''}</div>
    <p class="status">${ic('house')}${v(ti+'g',growthTxt(t))}</p>`+needsBlock(ti)+warehouseTiles(ti);
  const prod=S.bld.filter(b=>b.town===ti&&b.t!=='house'&&b.t!=='hall'&&b.t!=='landmark'),lms=S.bld.filter(b=>b.lm&&b.t==='landmark'&&LANDMARKS[b.lm].town===t.n);
  h+=`<div class="sec"><h3>Buildings<span>${prod.length?'tap to inspect':'nothing yet'}</span></h3><ul class="blist">${prod.map(b=>{const T0=BT[b.t],p=Math.round(b.eff*100),staffed=T0.w;
    return `<li><button class="bl" data-act="selb" data-id="${b.id}" style="--c:${bCol(b.t)}"><span class="bi">${ic(bIcon(b.t))}</span><span class="bn">${T0.n}${T0.noUp?'':` <em>Lv ${b.lv}</em>`}<span class="pct">${staffed?v('e'+b.id,p+'%'):''}</span></span>
      ${staffed?`<span class="meter">${w('m'+b.id,p)}</span><span class="bs">${v('y'+b.id,b.on?b.why:'Paused','stat')}</span>`:`<span class="bs">${T0.store?'Adds '+fmt(WH_CAP[b.lv])+' storage':'Links the town'}</span>`}</button></li>`}).join('')}</ul>
    ${prod.length?'':`<p class="note">Open Build to place farms, forestry camps or brickworks within ${TERRITORY} km of the town hall by road.</p>`}
    ${lms.length?`<p class="note">${ic('star')}Landmarks: ${lms.map(b=>`<button class="link sm" data-act="selb" data-id="${b.id}">${LANDMARKS[b.lm].n}</button>`).join(', ')}</p>`:''}</div>`;
  const ed=NET.adj[ti]||[],rs=S.routes.filter(r=>r.a===ti||r.b===ti);
  const lvOf=(k,o)=>{const p=pairPath(k,ti,o);return p?p.lv:1};
  h+=`<div class="sec"><h3>Neighbours<span>${ed.length?'start a route to trade':'not linked yet'}</span></h3><ul class="links">${ed.map(n=>{const e=NET.edges[n],o=e.a===ti?e.b:e.a;
    return `<li class="lk"><div><button class="link" data-act="seltown" data-ti="${o}">${S.towns[o].n}</button><div class="lks">${[e.road?ROADT[lvOf('road',o)].n+` · ${Math.round(e.road.len)} km`:'',e.rail?RAILT[Math.min(2,lvOf('rail',o))].n+` · ${Math.round(e.rail.len)} km`:''].filter(Boolean).join(' + ')}</div></div>
      <div class="row">${e.road?`<button class="btn sm" data-act="newroute" data-a="${ti}" data-b="${o}" data-m="road">${ic('cart')}Road route</button>`:''}${e.rail?`<button class="btn sm" data-act="newroute" data-a="${ti}" data-b="${o}" data-m="rail">${ic('train')}Rail route</button>`:''}</div></li>`}).join('')}</ul>
    ${ed.length?'':`<p class="note">Use the Road tool to draw a road from this town’s streets to another town, then start a route.</p>`}
    ${rs.length?`<p class="note">${rs.length} route${rs.length>1?'s':''} serve${rs.length>1?'':'s'} ${t.n}. <button class="link sm" data-act="tab" data-tab="routes">Open routes</button></p>`:''}</div>`;
  return h}
function buildingPanel(b){const T0=BT[b.t],t=b.town>=0?S.towns[b.town]:null;
  if(b.lm&&LANDMARKS[b.lm]){const L=LANDMARKS[b.lm],ti=S.towns.findIndex(x=>x.n===L.town);
    return `<section class="hero" style="--c:var(--amber)"><div class="eyebrow">Landmark${ti>=0?' · '+S.towns[ti].n:''}</div><h2>${L.n}</h2><p class="lede">${L.d}</p>
      <div class="row">${ti>=0?`<button class="btn sm" data-act="seltown" data-ti="${ti}">Open ${S.towns[ti].n}</button>`:''}</div></section>`}
  if(b.t==='house')return `<section class="hero"><div class="eyebrow">${t?t.n:'No town'}</div><h2>${bName(b)}</h2><p class="lede">Homes for ${popStr(houseCap(b))} people. ${b.lv<S.era?'The town will rebuild these bigger when it needs room.':''}${polAt(b.x,b.z)>0.3?' The air here is smoky.':''}</p>
    <div class="row">${t?`<button class="btn sm" data-act="seltown" data-ti="${b.town}">Open ${t.n}</button>`:''}</div></section>`;
  const p=Math.round(b.eff*100);let up='';
  if(!T0.noUp){if(b.lv>=3)up=`<span class="note">Fully modernized</span>`;else if(S.era<b.lv+1)up=`<span class="note">Lv ${b.lv+1} in the ${ERAS[b.lv+1].n} era</span>`;
    else up=`<button class="btn" data-act="up" data-id="${b.id}">${ic('up')}Modernize to Lv ${b.lv+1} <span class="bv">${costTxt(upCost(b))}</span></button>`}
  const status=b.town<0?naTxt(b.na):null,staffed=T0.w||T0.pow;
  return `<section class="hero" style="--c:${bCol(b.t)}"><div class="eyebrow">${t?t.n+(b.cd?' · '+Math.round(b.cd)+' km by road':''):'No town'}</div><h2>${T0.n}</h2>${T0.d?`<p class="lede">${T0.d}</p>`:''}</section>
    ${staffed?`<div class="kpis"><div class="kpi"><span class="k">${ic(bIcon(b.t))}Output</span><b>${v('e'+b.id,p+'%')}</b><div class="mbar">${w('m'+b.id,p)}</div></div>
      <div class="kpi"><span class="k">${ic('people')}Workers</span><b>${popStr(T0.w||0)}</b><small>needed</small></div></div>`:''}
    ${T0.store?`<p class="status">${ic('box')}Adds ${fmt(WH_CAP[b.lv])} storage for every good in ${t?t.n:'its town'}.</p>`:''}
    <p class="status">${v('y'+b.id,status||(b.on?b.why||'Running':'Paused'),'stat')}</p>
    ${T0.out||T0.pow?`<p class="note">At full output it ${io(T0,b.lv,b.k)} per day${b.k&&b.k!==1&&!T0.pow?` (land ×${num(b.k)})`:''}.</p>`:''}
    ${T0.pol?`<p class="note">${ic('smog')}Pollutes homes within ${POL_R} km.</p>`:''}
    <div class="row">${up}${staffed?`<button class="btn ghost" data-act="toggle" data-id="${b.id}">${b.on?'Pause':'Resume'}</button>`:''}${t?`<button class="btn ghost" data-act="seltown" data-ti="${b.town}">Open ${t.n}</button>`:''}</div>
    <div class="row">${S.confirmDemo===b.id?`<span class="note">Demolish ${T0.n}? Nothing is refunded.</span><button class="btn sm" data-act="demolish2" data-id="${b.id}">Demolish</button><button class="btn sm ghost" data-act="canceld">Keep</button>`
      :`<button class="btn sm ghost" data-act="demolish" data-id="${b.id}">${ic('trash')}Demolish</button>`}</div>`}
function movedTxt(r,dir){const m=dir==='ab'?r.mAB:r.mBA;if(!r.ok)return '';const e=Object.entries(m||{}).filter(([k,q])=>q>0.05).sort((a,b)=>b[1]-a[1]).slice(0,3);
  return e.length?e.map(([k,q])=>num(q)+' '+rname(k)).join(', ')+' a day':'nothing to carry'}
function cargoRow(r,dir,A,B0){const spec=r[dir],auto=spec==='auto';
  return `<div class="cg"><div class="cgh"><b>${A.n} → ${B0.n}</b>${v('rm'+r.id+dir,movedTxt(r,dir))}</div><div class="chips2"><button class="chipb${auto?' on':''}" data-act="rauto" data-r="${r.id}" data-dir="${dir}">Auto</button>${RES.filter(x=>RI[x].era<=S.era).map(x=>
    `<button class="chipb ico${!auto&&spec.includes(x)?' on':''}" data-act="rcargo" data-r="${r.id}" data-dir="${dir}" data-res="${x}" style="--c:var(--r-${x})" title="${RI[x].n}" aria-label="${RI[x].n}">${ic(RI[x].ic)}</button>`).join('')}</div></div>`}
function routeCard(r){routeEval(r);const A=S.towns[r.a],B0=S.towns[r.b],V0=VT[r.vt],vts=Object.keys(VT).filter(k=>VT[k].mode===r.mode&&VT[k].era<=S.era),nx=vts[(vts.indexOf(r.vt)+1)%vts.length];
  return `<li class="rc${VIEW.route===r.id?' on':''}"><div class="rh"><span class="rmode">${ic(r.mode==='rail'?'train':'cart')}</span><div class="rt"><b>${A.n} ⇄ ${B0.n}</b><div class="lks">${r.ok?`${Math.round(r.len)} km · round trip ${num(r.trip)} days`:`<span class="bad">${r.why}</span>`}</div></div>
    <button class="btn sm ghost" data-act="rshow" data-r="${r.id}" aria-label="Show on map">${ic('target')}</button></div>
    <div class="rv"><button class="btn sm ghost" data-act="rveh" data-r="${r.id}" data-d="-1" aria-label="Fewer">${ic('minus')}</button><span><b>${r.n}</b> ${r.n===1?V0.one:V0.n.toLowerCase()}</span>
      <button class="btn sm ghost" data-act="rveh" data-r="${r.id}" data-d="1" aria-label="More">${ic('plus')}</button><span class="note">${fmt(V0.cost)} Lt each · upkeep ${num(V0.up*r.n)} Lt a day</span>
      ${vts.length>1?`<button class="btn sm ghost" data-act="rvt" data-r="${r.id}">Use ${VT[nx].n.toLowerCase()}</button>`:''}</div>
    ${cargoRow(r,'ab',A,B0)}${cargoRow(r,'ba',B0,A)}
    <div class="row"><button class="chipb${r.pax?' on':''}" data-act="rpax" data-r="${r.id}">${ic('people')}Carry commuters</button><span class="note">${v('ru'+r.id,r.ok?`${fmt(r.cap)} loads a day each way · ${Math.round(r.used*100)}% used${r.pax?' · '+num(r.paxUsed||0)+'k commuters':''}`:'')}</span></div>
    <div class="row">${S.confirmRoute===r.id?`<span class="note">Remove this route? Half the vehicle cost comes back.</span><button class="btn sm" data-act="rdel2" data-r="${r.id}">Remove</button><button class="btn sm ghost" data-act="rkeep">Keep</button>`
      :`<button class="btn sm ghost" data-act="rdel" data-r="${r.id}">${ic('trash')}Remove route</button>`}</div></li>`}
function townOpts(){const by=v=>S.towns.map((t,n)=>[t,n]).filter(([t])=>!t.lock&&!!t.vil===v).sort((a,b)=>a[0].n.localeCompare(b[0].n,'lt')).map(([t,n])=>`<option value="${n}">${t.n}</option>`).join('');
  return `<optgroup label="Towns">${by(false)}</optgroup><optgroup label="Villages">${by(true)}</optgroup>`}
function routesPanel(){const opts=townOpts();
  return `<div class="sec"><h3>New route<span>needs a road, or a railway with a station in each town</span></h3><div class="newr"><select id="nrA" aria-label="From">${opts}</select><span>⇄</span><select id="nrB" aria-label="To">${opts}</select>
    <select id="nrM" aria-label="Mode"><option value="road">Road</option><option value="rail">Rail</option></select><button class="btn pri" data-act="rcreate">Create</button></div></div>
    <div class="sec"><h3>Routes<span>${S.routes.length} running · Auto carries what the other town is short of</span></h3><ul class="routes">${S.routes.map(routeCard).join('')}</ul></div>`}
function natPanel(){const t=totals();let h='';
  h+=S.won?`<div class="goal"><b>Plan fulfilled</b><span>Every town is linked and lit, and ${popStr(t.pop)} people live in them.</span></div>`
    :`<div class="goal"><b>Goal: light up Lithuania</b><span>Reach the Modern era with every town linked to Vilnius by rail or paved road and powered, and ${popStr(GOAL_POP)} residents.</span></div>`;
  const open=OBJ.filter(o=>!S.obj[o.id]).slice(0,4),done=OBJ.length-OBJ.filter(o=>!S.obj[o.id]).length;
  h+=`<div class="sec"><h3>Ministry tasks<span>${done} of ${OBJ.length} done</span></h3><ul class="objs">${open.map(o=>`<li>${ic('star')}<span>${o.t}</span><b>+${fmt(o.r)} Lt</b></li>`).join('')}</ul></div>`;
  h+=`<div class="ebox"><div><div class="eyebrow">Current era</div><div class="enow">${ERAS[S.era].n}</div></div><div class="eras">${[1,2,3].map(n=>`<div class="es${n<=S.era?' done':''}${n===S.era?' now':''}" style="--ec:${ERAS[n].c}"><i></i><b>${ERAS[n].n}</b></div>`).join('')}</div>`;
  const L0=eraReq();if(L0){const nx=ERAS[S.era+1];h+=`<div class="req">${L0.map((x,i)=>`<span class="m">${v('rq'+i,x.ok?'✓':'·','chk')}</span><span>${x.t}</span><span class="q">${v('rn'+i,x.q)}</span>`).join('')}</div>
    <p class="unl">Unlocks ${nx.unl.charAt(0).toLowerCase()+nx.unl.slice(1)}</p><div class="row"><button class="btn pri" data-act="era">Begin ${nx.n} · ${fmt(nx.req.lt)} Lt</button></div>`}
  h+=`</div><div class="kpis"><div class="kpi"><span class="k">${ic('people')}Residents</span><b>${v('tp',popStr(t.pop))}</b><small>${t.towns} towns, ${t.vils} villages</small></div>
    <div class="kpi"><span class="k">${ic('rail')}Linked</span><b>${v('tl',t.linked+' / '+t.towns)}</b><small>by rail or paved road</small></div><div class="kpi"><span class="k">${ic('coin')}Income</span><b>${v('ti',fd(S.inc))}</b><small>Lt a day</small></div></div>`;
  h+=secBlock();
  const tl=S.towns.map((x,n)=>[x,n]).filter(([x])=>!x.vil).sort((a,b)=>b[0].pop0-a[0].pop0);
  const tli=([x,n])=>`<li class="lk"><div><button class="link" data-act="seltown" data-ti="${n}">${x.n}</button><div class="lks">${x.lock?(S.hist.lost?'Part of Germany':'Joins in 1923'):v('tw'+n,popStr(x.pop)+' · '+x.note)}</div></div>${NET.linked.has(n)||x.capital||x.lock?'':`<span class="tag">not linked</span>`}</li>`;
  h+=`<div class="sec"><h3>Towns<span>${t.linked} of ${t.towns} linked to Vilnius</span></h3><ul class="links">${tl.slice(0,8).map(tli).join('')}</ul>
    <details class="more"><summary>All ${tl.length} towns</summary><ul class="links">${tl.slice(8).map(tli).join('')}</ul></details>
    <p class="note">${t.vils} villages with ${v('tvp',popStr(t.vpop))} people farm the land between the towns. Tap one on the map to open it.</p></div>`;
  h+=`<div class="sec"><h3>National stock<span>price per unit, normal in brackets</span></h3><div class="tw"><table><thead><tr><th>Good</th><th class="n">Stock</th><th class="n">Per day</th><th class="n">Price</th></tr></thead><tbody>${RES.filter(r=>RI[r].era<=S.era).map(r=>
    `<tr style="--c:var(--r-${r})"><td>${ic(RI[r].ic)}${RI[r].n}</td><td class="n">${v('ns'+r,fmt(t.stock[r]))}</td><td class="n">${v('nd'+r,fd(t.dl[r]),'sign')}</td><td class="n">${v('np'+r,S.prices[r].toFixed(1))} <span class="note">(${RI[r].p})</span></td></tr>`).join('')}</tbody></table></div></div>`;
  h+=`<details><summary>How it works</summary><ul><li>Each town has its own stock. Storage holds ${STORE_BASE} of each good, plus ${WH_CAP[1]} per warehouse. Full storage stops production.</li>
    <li>Goods move only on routes. Each route has vehicles; more vehicles and shorter distances carry more. Auto cargo sends what the other town is short of; or pick goods yourself.</li>
    <li>Every town and village feeds and heats its people of 1918 from its own fields and woodlots, so it keeps that size without help. Growth beyond it needs food from farms or routes, zoned land and work.</li>
    <li>Trade abroad goes through a border post near the border or a sea port, from that town’s stock. History opens and closes markets: the Depression, a German boycott, war.</li>
    <li>On key dates history asks you to decide. Some choices can avoid what happened, if Lithuania has enough security: allies, an army, friends in the West.</li>
    <li>People eat grain, potatoes, dairy, meat and fish. Each extra kind adds morale. In winter homes burn peat or timber.</li>
    <li>Workers fill local jobs first, then walk to towns within ${WALK_KM} km by road, or ride routes set to carry commuters.</li>
    <li>Factories and kilns pollute homes within ${POL_R} km. Schools raise output; clinics lift morale and growth.</li>
    <li>Buildings join a town when a road links them to its town hall within ${TERRITORY} km. Villages have few workers, so workplaces join a village only when no town is near.</li>
    <li>Dirt roads join every town and village. A town is linked to Vilnius when a railway or a paved road from Vilnius reaches its streets. Railways and paved roads also carry the power grid.</li>
    <li>Keys: R road, T rail, Z zone, X remove, B build, Space pause, [ and ] turn, Page Up and Down tilt, N north up.</li>
    <li><button class="link sm" data-act="tutorial">Show the tutorial again</button></li></ul></details>`;
  h+=S.confirmReset?`<div class="row"><span class="note">Start again from 1918? This game will be lost.</span><button class="btn sm" data-act="reset2">Start again</button><button class="btn sm ghost" data-act="cancelr">Keep playing</button></div>`
    :`<div class="row"><button class="btn sm ghost" data-act="reset">New game</button></div>`;return h}
function chronPanel(){return `<ul class="chron">${S.log.map(e=>`<li class="${e.k}"><time>${e.yo?dOf(e.d).getUTCFullYear():dateStr(e.d)}</time><p>${e.t}</p></li>`).join('')}</ul>`}

/* ---------- foreign trade, and the Soviet plan ---------- */
const MKT_ORDER=['gb','de','lv','pl','su'];
function dealRow(d){const t=S.towns[d.ti],M=MARKETS[d.m],out=d.dir==='out';
  return `<li class="dl"><div class="dlt"><b>${out?'Sell':'Buy'} ${num(d.q)} ${rname(d.r)} a day</b><span class="lks">${out?'from':'into'} ${t?t.n:'—'} · ${out?'to':'from'} ${M.n}</span>
    <span class="note">${v('dv'+d.id,d.why?d.why:(d.val>=0?'+':'−')+fmt(Math.abs(d.val))+' Lt a day','stat3')}</span></div>
    <div class="row"><button class="btn sm ghost" data-act="dq" data-d="${d.id}" data-q="-1" aria-label="Less">${ic('minus')}</button><button class="btn sm ghost" data-act="dq" data-d="${d.id}" data-q="1" aria-label="More">${ic('plus')}</button>
    <button class="btn sm ghost" data-act="ddel" data-d="${d.id}" aria-label="Remove deal">${ic('trash')}</button></div></li>`}
function priceChips(m){const M=MARKETS[m],ch=[];
  for(const r in M.buy)if(RI[r].era<=S.era)ch.push(`<span class="pc" style="--c:var(--r-${r})" title="They buy ${RI[r].n}">${ic(RI[r].ic)}${v('pb'+m+r,mktPrice(m,r,'out').toFixed(1))}</span>`);
  const sl=Object.keys(M.sell).filter(r=>RI[r].era<=S.era).map(r=>`<span class="pc in" style="--c:var(--r-${r})" title="They sell ${RI[r].n}">${ic(RI[r].ic)}${v('ps'+m+r,mktPrice(m,r,'in').toFixed(1))}</span>`);
  return `<div class="pcs"><span class="pl">They buy</span>${ch.join('')}</div>${sl.length?`<div class="pcs"><span class="pl">They sell</span>${sl.join('')}</div>`:''}`}
function dealForm(ms){const gt=S.towns.map((t,n)=>[t,n]).filter(([t,n])=>!t.lock&&townGates(n).size&&[...townGates(n)].some(g=>ms.some(m=>MARKETS[m].gate.includes(g)))).sort((a,b)=>a[0].n.localeCompare(b[0].n,'lt'));
  if(!gt.length)return `<p class="note">No town can trade yet. Build a border post within 3 km of the border, or a sea port on the coast.</p>`;
  return `<div class="newr nd"><select id="ndM" aria-label="Market">${ms.map(m=>`<option value="${m}">${MARKETS[m].n}</option>`).join('')}</select>
    <select id="ndD" aria-label="Sell or buy"><option value="out">Sell</option><option value="in">Buy</option></select>
    <select id="ndR" aria-label="Good">${RES.filter(r=>RI[r].era<=S.era).map(r=>`<option value="${r}">${RI[r].n}</option>`).join('')}</select>
    <select id="ndQ" aria-label="Loads a day">${[1,2,5,10,20].map(q=>`<option value="${q}"${q===5?' selected':''}>${q} a day</option>`).join('')}</select>
    <select id="ndT" aria-label="Through">${gt.map(([t,n])=>`<option value="${n}">via ${t.n}</option>`).join('')}</select>
    <button class="btn pri" data-act="dcreate">Add deal</button></div>`}
function tradePanel(){const h=S.hist,sov=h.path==='soviet';
  if(sov)return planPanel();
  const ms=MKT_ORDER.filter(m=>m!=='su'||S.mkt.su.open);let o=`<section class="hero"><div class="eyebrow">Foreign trade</div><h2>Markets abroad</h2>
    <p class="lede">Goods cross the border at a border post or a sea port, taken from that town’s stock. Routes bring them there. Prices are per load, after a 10% duty.</p></section>`;
  o+=`<ul class="mks">${ms.map(m=>{const s=S.mkt[m],gt=gateTowns(m);return `<li class="mk"><div class="mkh"><b>${MARKETS[m].n}</b><span class="tag${s.open?' ok':''}">${s.open?'Open':s.why}</span></div>
    <div class="lks">${gt.length?'Through '+gt.map(n=>S.towns[n].n).join(', '):'Needs '+MARKETS[m].gate.map(g=>GATE_N[g]).join(' or ')}</div>${s.open?priceChips(m):''}</li>`}).join('')}</ul>`;
  o+=`<div class="sec"><h3>Deals<span>${S.deals.length?'run every day':'none yet'}</span></h3><ul class="deals">${S.deals.map(dealRow).join('')}</ul>${dealForm(ms.filter(m=>S.mkt[m].open))}</div>`;
  if(DEPRESSION[dOf(S.day).getUTCFullYear()])o+=`<p class="note">${ic('coin')}The Depression has cut farm prices abroad to ${Math.round(depAt('dairy')*100)}% of normal.</p>`;
  return o}
function planPanel(){const h=S.hist,p=S.plan;let o=`<section class="hero"><div class="eyebrow">Soviet Lithuania${p?' · '+p.name:''}</div><h2>${p?'The plan for '+p.y:h.war?'War':'No plan this year'}</h2>
    <p class="lede">${h.war?'The war has stopped the plan. Factories and farms work at reduced strength.':'Moscow sets what the republic delivers to the Union each year. Deliver through towns with a railway station, with deals below.'}</p></section>`;
  if(p){o+=`<div class="kpis"><div class="kpi"><span class="k">${ic('plan')}Plan done</span><b>${v('pls',Math.round(planShare(p)*100)+'%')}</b><small>of the year’s target</small></div>
      <div class="kpi"><span class="k">${ic('star')}Party trust</span><b>${v('plt',Math.round(h.trust))}</b><small>of 100</small><div class="mbar">${w('pltb',Math.round(h.trust))}</div></div></div>
    <div class="tw"><table><thead><tr><th>Good</th><th class="n">Target</th><th class="n">Delivered</th></tr></thead><tbody>${Object.keys(p.tgt).map(r=>`<tr style="--c:var(--r-${r})"><td>${ic(RI[r].ic)}${RI[r].n}</td><td class="n">${fmt(p.tgt[r])}</td><td class="n">${v('pg'+r,fmt(p.got[r]||0))}</td></tr>`).join('')}</tbody></table></div>`}
  const pr=h.proj.filter(q=>!q.done);if(pr.length)o+=`<div class="sec"><h3>Union projects</h3><ul class="objs">${pr.map(q=>`<li>${ic(bIcon(q.type))}<span>${BT[q.type].n} within ${q.r} km of ${S.towns[tIdx(q.near)].n}</span><b>by ${new Date(q.by).getUTCFullYear()}</b></li>`).join('')}</ul></div>`;
  if(h.plans&&h.plans.length)o+=`<p class="note">Past plans: ${h.plans.slice(-6).map(q=>q.y+' '+q.share+'%').join(' · ')}</p>`;
  o+=`<div class="sec"><h3>Deliveries to the Union<span>through railway stations</span></h3><ul class="deals">${S.deals.map(dealRow).join('')}</ul>${dealForm(['su'].filter(m=>S.mkt[m].open))}</div>`;
  return o}
function secBlock(){const h=S.hist;if(h.path==='soviet')return `<div class="sec"><h3>Soviet rule<span>since 1940</span></h3><p class="note">Party trust ${v('trs',Math.round(h.trust))} of 100. Fulfil the plan and Moscow invests; fail it and inspectors come.</p></div>`;
  return `<div class="sec"><h3>Security<span>${h.path==='neutral'?'a neutral state':'can turn back ultimatums'}</span></h3><div class="secb"><b>${v('sec',Math.round(h.sec))}</b><span>of 100</span><div class="mbar">${w('secw',Math.round(h.sec))}</div></div>
    <p class="note">Allies, an army and trade with Britain make Lithuania harder to bully. Refusing the ultimatums of 1938 to 1940 works only with enough security.</p>
    <div class="row"><span class="note">Army budget</span>${[0,10,25,50].map(q=>`<button class="chipb${h.def===q?' on':''}" data-act="def" data-q="${q}">${q?q+' Lt a day':'None'}</button>`).join('')}</div>${h.ally?`<p class="note">Baltic alliance: ${h.ally} Lt a day.</p>`:''}</div>`}
