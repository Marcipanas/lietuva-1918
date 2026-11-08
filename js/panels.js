'use strict';
/* Lietuva 1918 — side panel content. Dynamic numbers go through v()/w() so the panel can update without re-rendering. */
let V={},W={};
const v=(k,t,flag)=>{t=String(t);V[k]=t;return `<span data-v="${k}"${flag?' data-'+flag:''}>${t}</span>`};
const w=(k,p)=>{W[k]=p;return `<i data-w="${k}" style="width:${p}%"></i>`};
function costHTML(c){return Object.entries(c).filter(([k,q])=>q>0).map(([k,q])=>k==='lt'?`<span style="--c:var(--amber)">${ic('coin')}${fmt(q)} Lt</span>`:`<span style="--c:var(--r-${k})">${ic(RI[k].ic)}${fmt(q)} ${rname(k)}</span>`).join('')}
function io(T0,lv,k){const p=[];if(T0.in)p.push('uses '+Object.entries(T0.in).map(([r,q])=>num(q*INM[lv])+' '+rname(r)).join(' + '));if(T0.powNeed)p.push(num(T0.powNeed*LV[lv])+' MW');
  if(T0.out)p.push('makes '+Object.entries(T0.out).map(([r,q])=>num(q*LV[lv]*(k||1))+' '+rname(r)).join(', '));if(T0.pow)p.push('makes '+num(T0.pow*LV[lv])+' MW');return p.join(' · ')}
function growthTxt(t){if(t.hint)return t.hint;if(t.fed<0.99)return 'Not growing: short of food';if(t.h<45)return 'Not growing: morale too low';return t.pop<t.house*0.92?'Moving into empty homes':'Building new homes on zoned land'}
function startPanel(){const next=OBJ.filter(o=>!S.obj[o.id]).slice(0,3);
  return `<section class="hero"><div class="eyebrow">16 February 1918</div><h2>Build Lithuania</h2><p class="lede">Tap a town or building to manage it. Lay roads and railways, zone land for homes, place farms and industry, then run transport routes to move goods between towns.</p></section>
  <ol class="steps2"><li><b>Feed the towns.</b> Five foods: the more kinds people eat, the happier they are. In winter every home burns peat or timber.</li>
  <li><b>Move goods on routes.</b> Nothing travels on its own. Open Routes to see the old railway lines and add carts, trucks or trains.</li>
  <li><b>Zone land.</b> Paint lots along streets with the Zone tool. Towns build houses there. Keep smoky industry away from homes.</li>
  <li><b>Store and staff.</b> Warehouses raise storage. Workers can commute on foot to nearby towns, or on routes that carry commuters.</li>
  <li><b>Look around.</b> Drag to move. Pinch to zoom, twist two fingers to turn, slide two fingers up or down to tilt. The compass turns north up again.</li></ol>
  ${next.length?`<div class="sec"><h3>Ministry tasks</h3><ul class="objs">${next.map(o=>`<li>${ic('star')}<span>${o.t}</span><b>+${fmt(o.r)} Lt</b></li>`).join('')}</ul></div>`:''}
  <div class="row"><button class="btn" data-act="seltown" data-ti="0">${ic('target')}Go to Vilnius</button><button class="btn ghost" data-act="tab" data-tab="routes">${ic('route')}Routes</button></div>`}
function needsBlock(ti){const t=S.towns[ti],need=t.pop*0.1,sea=seasonOf(S.day);
  return `<div class="needs"><div class="need"><span class="nk">${ic('grain')}Food</span><span class="foods">${FOOD.map(f=>`<i class="${t.ate&&(t.ate[f]||0)>=need*0.08?'on':''}" style="--c:var(--r-${f})" title="${RI[f].n}">${ic(RI[f].ic)}</i>`).join('')}</span>
    <span class="nv">${v(ti+'fv',(t.vari||0)+' of 5 kinds · fed '+Math.round((t.fed||0)*100)+'%')}</span></div>
    <div class="need"><span class="nk">${ic('fire')}Heating</span><span class="nv">${v(ti+'ht',sea.heat>0.05?Math.round((t.heat||0)*100)+'% of homes warm':'Not needed this season')}</span></div>
    <div class="need"><span class="nk">${ic('school')}Services</span><span class="nv">${v(ti+'sv','Schools '+Math.round((t.edu||0)*100)+'% · clinics '+Math.round((t.med||0)*100)+'%')}</span></div>
    <div class="need"><span class="nk">${ic('smog')}Air</span><span class="nv">${v(ti+'pl',(t.pol||0)<0.3?'Clean':'Polluted near homes ('+num(t.pol)+')','stat2')}</span></div>
    <div class="need"><span class="nk">${ic('people')}Commuting</span><span class="nv">${v(ti+'cm',num(t.comIn||0)+'k in · '+num(t.comOut||0)+'k out · '+num(t.unemp||0)+'k jobless')}</span></div>
    <div class="need"><span class="nk">${ic('box')}Storage</span><span class="nv">${v(ti+'cap',fmt(t.cap||STORE_BASE)+' of each good')}</span></div></div>`}
function warehouseTiles(ti){const t=S.towns[ti],port=townPort(ti),cap=t.cap||STORE_BASE;let h=`<div class="sec"><h3>Stock<span>${port?'Port prices: sell +40%, imports cheaper':'Trade in lots of 25'}</span></h3><div class="tiles">`;
  RES.filter(r=>RI[r].era<=S.era).forEach(r=>{const s=t.stock[r]||0;h+=`<div class="tile" style="--c:var(--r-${r})"><div class="th">${ic(RI[r].ic)}${RI[r].n}</div>
    <div class="ta">${v(ti+'s'+r,fmt(s))}<small>${v(ti+'d'+r,fd(t.dl[r]||0)+'/d','sign')}</small></div><div class="sbar">${w(ti+'f'+r,Math.round(Math.min(1,s/cap)*100))}</div>
    <div class="tb"><button class="btn sm ghost" data-act="sell" data-ti="${ti}" data-r="${r}">Sell ${v(ti+'sv'+r,'+'+fmt(sellVal(ti,r)))}</button>${canBuyHere(ti,r)
      ?`<button class="btn sm ghost" data-act="buy" data-ti="${ti}" data-r="${r}">Buy ${v(ti+'bv'+r,'−'+fmt(buyVal(ti,r)))}</button>`:`<span class="note">Import via a port</span>`}</div></div>`});return h+'</div></div>'}
function townPanel(ti){const t=S.towns[ti];
  if(t.lock)return `<section class="hero"><div class="eyebrow">Klaipėda Region · ${t.reg}</div><h2>${t.n}</h2><p class="lede">Under Allied administration since 1920. On 16 February 1923 the region is transferred to Lithuania, bringing the country its only sea port.</p></section>
    <p class="note">Plan ahead: a road or railway from Telšiai or Tauragė will connect the port once the region joins. You can’t build inside the region until then.</p>`;
  let h=`<section class="hero"><div class="eyebrow">${t.cap?'Capital':townPort(ti)?'Sea port':'Town'}${t.reg?' · '+t.reg:''}</div><h2>${t.n}</h2><p class="lede">${t.d}</p>
    <div class="row"><button class="btn sm" data-act="focus" data-ti="${ti}">${ic('target')}Show on map</button><button class="btn sm ghost" data-act="tool" data-tool="zone">${ic('zone')}Zone land</button></div></section>`;
  h+=`<div class="kpis"><div class="kpi"><span class="k">${ic('people')}Residents</span><b>${v(ti+'p',popStr(t.pop))}</b><small>homes for ${v(ti+'hs',popStr(t.house))}</small></div>
    <div class="kpi"><span class="k">${ic('heart')}Morale</span><b>${v(ti+'h',Math.round(t.h)+'%')}</b><small>${v(ti+'n',t.note)}</small><div class="mbar">${w(ti+'hb',Math.round(t.h))}</div></div>
    <div class="kpi"><span class="k">${ic('factory')}Workers</span><b>${v(ti+'wf',popStr(t.wf))}</b><small>${v(ti+'jb',popStr(t.jobs))} jobs</small></div>
    ${S.era>=2?`<div class="kpi"><span class="k">${ic('bolt')}Grid</span><b>${v(ti+'pr',Math.round(t.pr*100)+'%')}</b><small>${v(ti+'gs',fmt(t.gS))} of ${v(ti+'gd',fmt(t.gD))} MW</small></div>`:''}</div>
    <p class="status">${ic('house')}${v(ti+'g',growthTxt(t))}</p>`+needsBlock(ti)+warehouseTiles(ti);
  const prod=S.bld.filter(b=>b.town===ti&&b.t!=='house'&&b.t!=='hall');
  h+=`<div class="sec"><h3>Buildings<span>${prod.length?'tap to inspect':'nothing yet'}</span></h3><ul class="blist">${prod.map(b=>{const T0=BT[b.t],p=Math.round(b.eff*100),staffed=T0.w;
    return `<li><button class="bl" data-act="selb" data-id="${b.id}" style="--c:${bCol(b.t)}"><span class="bi">${ic(bIcon(b.t))}</span><span class="bn">${T0.n}${T0.noUp?'':` <em>Lv ${b.lv}</em>`}<span class="pct">${staffed?v('e'+b.id,p+'%'):''}</span></span>
      ${staffed?`<span class="meter">${w('m'+b.id,p)}</span><span class="bs">${v('y'+b.id,b.on?b.why:'Paused','stat')}</span>`:`<span class="bs">${T0.store?'Adds '+fmt(WH_CAP[b.lv])+' storage':'Links the town'}</span>`}</button></li>`}).join('')}</ul>
    ${prod.length?'':`<p class="note">Open Build to place farms, forestry camps or brickworks within ${TERRITORY} km of the town hall by road.</p>`}</div>`;
  const ed=NET.adj[ti]||[],rs=S.routes.filter(r=>r.a===ti||r.b===ti);
  h+=`<div class="sec"><h3>Neighbours<span>${ed.length?'start a route to trade':'not linked yet'}</span></h3><ul class="links">${ed.map(n=>{const e=NET.edges[n],o=e.a===ti?e.b:e.a;
    return `<li class="lk"><div><button class="link" data-act="seltown" data-ti="${o}">${S.towns[o].n}</button><div class="lks">${[e.road?ROADT[e.road.lv].n+` · ${Math.round(e.road.len)} km`:'',e.rail?RAILT[Math.min(2,e.rail.lv)].n+` · ${Math.round(e.rail.len)} km`:''].filter(Boolean).join(' + ')}</div></div>
      <div class="row">${e.road?`<button class="btn sm" data-act="newroute" data-a="${ti}" data-b="${o}" data-m="road">${ic('cart')}Road route</button>`:''}${e.rail?`<button class="btn sm" data-act="newroute" data-a="${ti}" data-b="${o}" data-m="rail">${ic('train')}Rail route</button>`:''}</div></li>`}).join('')}</ul>
    ${ed.length?'':`<p class="note">Use the Road tool to draw a road from this town’s streets to another town, then start a route.</p>`}
    ${rs.length?`<p class="note">${rs.length} route${rs.length>1?'s':''} serve${rs.length>1?'':'s'} ${t.n}. <button class="link sm" data-act="tab" data-tab="routes">Open routes</button></p>`:''}</div>`;
  return h}
function buildingPanel(b){const T0=BT[b.t],t=b.town>=0?S.towns[b.town]:null;
  if(b.t==='house')return `<section class="hero"><div class="eyebrow">${t?t.n:'No town'}</div><h2>${bName(b)}</h2><p class="lede">Homes for ${popStr(HOUSE.cap[b.lv])} people. ${b.lv<S.era?'The town will rebuild these bigger when it needs room.':''}${polAt(b.x,b.z)>0.3?' The air here is smoky.':''}</p>
    <div class="row">${t?`<button class="btn sm" data-act="seltown" data-ti="${b.town}">Open ${t.n}</button>`:''}</div></section>`;
  const p=Math.round(b.eff*100);let up='';
  if(!T0.noUp){if(b.lv>=3)up=`<span class="note">Fully modernized</span>`;else if(S.era<b.lv+1)up=`<span class="note">Lv ${b.lv+1} in the ${ERAS[b.lv+1].n} era</span>`;
    else up=`<button class="btn" data-act="up" data-id="${b.id}">${ic('up')}Modernize to Lv ${b.lv+1} <span class="bv">${costTxt(upCost(b))}</span></button>`}
  const status=b.town<0?(NA_TXT[b.na]||'Not connected'):null,staffed=T0.w||T0.pow;
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
function routesPanel(){const opts=S.towns.map((t,n)=>t.lock?'':`<option value="${n}">${t.n}</option>`).join('');
  return `<div class="sec"><h3>New route<span>needs a road, or a railway with a station in each town</span></h3><div class="newr"><select id="nrA" aria-label="From">${opts}</select><span>⇄</span><select id="nrB" aria-label="To">${opts}</select>
    <select id="nrM" aria-label="Mode"><option value="road">Road</option><option value="rail">Rail</option></select><button class="btn pri" data-act="rcreate">Create</button></div></div>
    <div class="sec"><h3>Routes<span>${S.routes.length} running · Auto carries what the other town is short of</span></h3><ul class="routes">${S.routes.map(routeCard).join('')}</ul></div>`}
function natPanel(){const t=totals();let h='';
  h+=S.won?`<div class="goal"><b>Plan fulfilled</b><span>Every town is linked and lit, and ${popStr(t.pop)} people live in them.</span></div>`
    :`<div class="goal"><b>Goal: light up Lithuania</b><span>Reach the Modern era with every town linked to Vilnius and powered, and 1.5 million town residents.</span></div>`;
  const open=OBJ.filter(o=>!S.obj[o.id]).slice(0,4),done=OBJ.length-OBJ.filter(o=>!S.obj[o.id]).length;
  h+=`<div class="sec"><h3>Ministry tasks<span>${done} of ${OBJ.length} done</span></h3><ul class="objs">${open.map(o=>`<li>${ic('star')}<span>${o.t}</span><b>+${fmt(o.r)} Lt</b></li>`).join('')}</ul></div>`;
  h+=`<div class="ebox"><div><div class="eyebrow">Current era</div><div class="enow">${ERAS[S.era].n}</div></div><div class="eras">${[1,2,3].map(n=>`<div class="es${n<=S.era?' done':''}${n===S.era?' now':''}" style="--ec:${ERAS[n].c}"><i></i><b>${ERAS[n].n}</b></div>`).join('')}</div>`;
  const L0=eraReq();if(L0){const nx=ERAS[S.era+1];h+=`<div class="req">${L0.map((x,i)=>`<span class="m">${v('rq'+i,x.ok?'✓':'·','chk')}</span><span>${x.t}</span><span class="q">${v('rn'+i,x.q)}</span>`).join('')}</div>
    <p class="unl">Unlocks ${nx.unl.charAt(0).toLowerCase()+nx.unl.slice(1)}</p><div class="row"><button class="btn pri" data-act="era">Begin ${nx.n} · ${fmt(nx.req.lt)} Lt</button></div>`}
  h+=`</div><div class="kpis"><div class="kpi"><span class="k">${ic('people')}Residents</span><b>${v('tp',popStr(t.pop))}</b><small>in ${t.towns} towns</small></div>
    <div class="kpi"><span class="k">${ic('rail')}Linked</span><b>${v('tl',t.linked+' / '+t.towns)}</b><small>to Vilnius</small></div><div class="kpi"><span class="k">${ic('coin')}Income</span><b>${v('ti',fd(S.inc))}</b><small>Lt a day</small></div></div>`;
  h+=`<div class="sec"><h3>Towns<span>tap to visit</span></h3><ul class="links">${S.towns.map((x,n)=>`<li class="lk"><div><button class="link" data-act="seltown" data-ti="${n}">${x.n}</button><div class="lks">${x.lock?'Joins in 1923':v('tw'+n,popStr(x.pop)+' · '+x.note)}</div></div>${NET.linked.has(n)||x.cap||x.lock?'':`<span class="tag">not linked</span>`}</li>`).join('')}</ul></div>`;
  h+=`<div class="sec"><h3>National stock<span>price per unit, normal in brackets</span></h3><div class="tw"><table><thead><tr><th>Good</th><th class="n">Stock</th><th class="n">Per day</th><th class="n">Price</th></tr></thead><tbody>${RES.filter(r=>RI[r].era<=S.era).map(r=>
    `<tr style="--c:var(--r-${r})"><td>${ic(RI[r].ic)}${RI[r].n}</td><td class="n">${v('ns'+r,fmt(t.stock[r]))}</td><td class="n">${v('nd'+r,fd(t.dl[r]),'sign')}</td><td class="n">${v('np'+r,S.prices[r].toFixed(1))} <span class="note">(${RI[r].p})</span></td></tr>`).join('')}</tbody></table></div></div>`;
  h+=`<details><summary>How it works</summary><ul><li>Each town has its own stock. Storage holds ${STORE_BASE} of each good, plus ${WH_CAP[1]} per warehouse. Full storage stops production.</li>
    <li>Goods move only on routes. Each route has vehicles; more vehicles and shorter distances carry more. Auto cargo sends what the other town is short of; or pick goods yourself.</li>
    <li>People eat grain, potatoes, dairy, meat and fish. Each extra kind adds morale. In winter homes burn peat or timber.</li>
    <li>Workers fill local jobs first, then walk to towns within ${WALK_KM} km by road, or ride routes set to carry commuters.</li>
    <li>Factories and kilns pollute homes within ${POL_R} km. Schools raise output; clinics lift morale and growth.</li>
    <li>Buildings join a town when a road links them to its town hall within ${TERRITORY} km.</li>
    <li>Keys: R road, T rail, Z zone, X remove, B build, Space pause, [ and ] turn, Page Up and Down tilt, N north up.</li>
    <li><button class="link sm" data-act="tutorial">Show the tutorial again</button></li></ul></details>`;
  h+=S.confirmReset?`<div class="row"><span class="note">Start again from 1918? This game will be lost.</span><button class="btn sm" data-act="reset2">Start again</button><button class="btn sm ghost" data-act="cancelr">Keep playing</button></div>`
    :`<div class="row"><button class="btn sm ghost" data-act="reset">New game</button></div>`;return h}
function chronPanel(){return `<ul class="chron">${S.log.map(e=>`<li class="${e.k}"><time>${dateStr(e.d)}</time><p>${e.t}</p></li>`).join('')}</ul>`}
