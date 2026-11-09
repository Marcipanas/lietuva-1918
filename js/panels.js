'use strict';
/* Lietuva 1918 — sheet content: the header, the town and country dashboards, the build menu, routes, trade and the chronicle.
   Everything that changes while the panel is open goes through v() (text), w() (bar width), pd() (chart path) or sc() (a state
   such as good, warn or bad), so the panel patches values in place and only rebuilds when its structure changes. */
let V={},W={},D={},C={};
const v=(k,t,flag)=>{t=String(t);V[k]=t;return `<span data-v="${k}"${flag?' data-'+flag:''}>${t}</span>`};
const w=(k,p)=>{W[k]=p;return `<i data-w="${k}" style="width:${p}%"></i>`};
const pd=(k,d)=>{D[k]=d;return ` data-d="${k}" d="${d}"`};
const sc=(k,c)=>{C[k]=c;return ` data-s="${k}" data-c="${c}"`};
function costHTML(c){return Object.entries(c).filter(([k,q])=>q>0).map(([k,q])=>k==='lt'?`<span style="--c:var(--amber)">${ic('coin')}${fmt(q)} Lt</span>`:`<span style="--c:var(--r-${k})">${ic(RI[k].ic)}${fmt(q)} ${rname(k)}</span>`).join('')}
function io(T0,lv,k){const p=[];if(T0.in)p.push('uses '+Object.entries(T0.in).map(([r,q])=>num(q*INM[lv])+' '+rname(r)).join(' + '));if(T0.powNeed)p.push(num(T0.powNeed*LV[lv])+' MW');
  if(T0.out)p.push('makes '+Object.entries(T0.out).map(([r,q])=>num(q*LV[lv]*(k||1))+' '+rname(r)).join(', '));if(T0.pow)p.push('makes '+num(T0.pow*LV[lv])+' MW');return p.join(' · ')}
function growthTxt(t){if(t.hint)return t.hint;if(t.fed<0.99)return t.pop>t.pop0?'Shrinking: short of food':'Not growing: short of food';if(t.h<45)return 'Not growing: morale too low';
  const fbal=FOOD.reduce((a,r)=>a+(t.dl[r]||0),0);if(t.pop>=t.pop0-0.05&&((t.fdays||0)<8||fbal<-0.01))return `Holding steady: its own fields feed ${popStr(t.pop0)}. More food lets it grow.`;
  return t.pop<t.house*0.92?'Moving into empty homes':'Building new homes on zoned land'}
const attrs=a=>Object.entries(a).map(([k,x])=>`data-${k}="${x}"`).join(' ');
const fixBtn=f=>`<button class="btn sm${f.b?' ghost':''}" ${attrs(f.a)}>${f.a.act==='newroute'||f.a.act==='rveh'?ic('route'):f.a.act==='build'||f.a.act==='buildmenu'?ic('factory'):f.a.act==='tool'?ic(f.a.tool==='zone'?'zone':f.a.tool):''}${f.t}</button>`;

/* ---------- the sheet header ---------- */
function sheetHead(){const s=VIEW.sel;let eb='',tt='',x='',back='';
  if(S.tab==='sel'&&s&&s.kind==='t'&&S.towns[s.ti]){const t=S.towns[s.ti];eb=(t.capital?(t.id==='vil'?'Capital':'Temporary capital'):townPort(s.ti)?'Sea port':t.vil?'Village':'Town')+(t.reg?' · '+t.reg:'');tt=t.n;
    x=`<button class="ib" data-act="focus" data-ti="${s.ti}" aria-label="Show on map">${ic('target')}</button>`}
  else if(S.tab==='sel'&&s&&s.kind==='b'&&BMAP.get(s.id)){const b=BMAP.get(s.id),t=b.town>=0?S.towns[b.town]:null;
    eb=b.lm&&LANDMARKS[b.lm]?'Landmark · '+LANDMARKS[b.lm].town:t?t.n+(b.cd?' · '+Math.round(b.cd)+' km by road':''):'No town';tt=bName(b)}
  else if(S.tab==='build'){const bt=VIEW.bti>=0&&S.towns[VIEW.bti]?S.towns[VIEW.bti]:null;eb=bt?'Build near '+bt.n:'Build';
    if(VIEW.bcat){tt=(CATS.find(c=>c[0]===VIEW.bcat)||['',''])[1];back=`<button class="ib" data-act="bback" aria-label="Back">${ic('back')}</button>`}else tt='What to build'}
  else if(S.tab==='routes'){eb=S.routes.length+' running';tt='Routes'}
  else if(S.tab==='trade'){const sov=S.hist.path==='soviet';eb=sov?'Soviet Lithuania':'Foreign trade';tt=sov?'The plan':'Markets abroad'}
  else if(S.tab==='chron'){eb=dateStr(S.day);tt='Chronicle'}
  else {eb=ERAS[S.era].n+' era';tt='Lithuania'}
  return `<div class="shb">${back}<div class="sht"><div class="eyebrow">${eb}</div><h2>${tt}</h2></div>${x}<button class="ib" data-act="close" aria-label="Close">${ic('close')}</button></div>`}

/* ---------- the build menu: categories, then buildings ---------- */
const CAT_IC={food:'grain',raw:'timber',industry:'factory',power:'bolt',transport:'box',civic:'school'};
const CAT_COL={food:'var(--r-grain)',raw:'var(--r-timber)',industry:'var(--r-bricks)',power:'#ffd84d',transport:'var(--r-flax)',civic:'#9fd3e8'};
const NEED_TXT={open:'Open land',forest:'In a forest',bog:'On a peat bog',clay:'On clay ground',water:'On a shore',coast:'On the sea coast',lake:'Next to a lake',
  river:'Across a river',rail:'Next to a railway',border:'Within 3 km of the border'};
function needTxt(t){const T0=BT[t],p=[];if(T0.need)p.push(NEED_TXT[T0.need]);if(T0.bonus==='fertile')p.push('35% more on fertile soil');if(T0.bonus==='flaxland')p.push('40% more in the flax belt');
  if(T0.pol)p.push('Smoky');return p.join(' · ')}
function whatTxt(t){const T0=BT[t];if(T0.store)return `Adds ${fmt(WH_CAP[1])} storage for every good`;if(T0.svc==='school')return 'Raises output in its town';if(T0.svc==='clinic')return 'Lifts morale and growth';
  if(t==='hall')return 'Founds a new town';if(t==='station')return 'Joins its town to the railway';if(t==='customs')return 'Trade across the border';if(t==='port')return 'Trade by sea';
  const s=io(T0,1);return (s.charAt(0).toUpperCase()+s.slice(1))+(T0.w?` · ${popStr(T0.w)} workers`:'')}
function lineCost(k){const sp=(k==='road'?ROADT:RAILT)[k==='road'?roadMax():railMax()],m=Object.keys(sp.mat)[0];return `${fmt(sp.lt*MAPK)} Lt + ${num(sp.mat[m]*MAPK)} ${rname(m)} a km`}
function buildPanel(){const c=VIEW.bcat;
  if(!c){const tools=[['road','road','Road',lineCost('road')],['rail','rail','Railway',lineCost('rail')],['zone','zone','Zone homes',`${ZONE_COST} Lt a lot`],['bull','trash','Remove','Nothing is refunded']];
    return `<div class="sec"><h3>Lines and land</h3><div class="tgrid">${tools.map(([k,i,n,d])=>`<button class="ttile" data-act="tool" data-tool="${k}"${VIEW.bti>=0?` data-ti="${VIEW.bti}"`:''}><span class="ci">${ic(i)}</span><b>${n}</b><small>${d}</small></button>`).join('')}</div></div>
    <div class="sec"><h3>Buildings</h3><div class="cgrid">${CATS.map(([k,n])=>{const all=Object.keys(BT).filter(t=>BT[t].cat===k),open=all.filter(unlocked).length;
      return `<button class="ctile${open?'':' lock'}" data-act="bcat" data-cat="${k}" style="--c:${CAT_COL[k]}"><span class="ci">${ic(CAT_IC[k])}</span><b>${n}</b><small>${open?open+' of '+all.length+' open':'Later eras'}</small></button>`}).join('')}</div></div>`}
  const items=Object.keys(BT).filter(t=>BT[t].cat===c).sort((a,b)=>(unlocked(a)?0:1)-(unlocked(b)?0:1)||BT[a].era-BT[b].era);
  return `<ul class="bpick">${items.map(t=>{const T0=BT[t],lk=!unlocked(t),poor=!lk&&S.funds<T0.cost.lt;
    return `<li><button class="brow${lk?' lock':''}" data-act="pick" data-bt="${t}"${lk?' disabled':''} style="--c:${bCol(t)}"><span class="bi">${ic(lk?'lock':bIcon(t))}</span>
      <span class="bt"><b>${T0.n}</b><small>${lk?'Opens in the '+ERAS[T0.era].n+' era':whatTxt(t)}</small>${needTxt(t)?`<small class="nd">${needTxt(t)}</small>`:''}</span>
      <span class="bc${poor?' bad':''}">${costTxt(T0.cost).split(' · ').join('<br>')}</span></button></li>`}).join('')}</ul>
    ${c==='power'&&S.era<2?`<p class="note">Power stations open in the Industrialization era. Open the Lithuania view to see what it takes.</p>`:''}`}

/* ---------- town dashboard ---------- */
function healthTiles(ti){const t=S.towns[ti],heatOn=seasonOf(S.day).heat>0.05,fbal=FOOD.reduce((a,r)=>a+(t.dl[r]||0),0),cap=t.cap||STORE_BASE;
  const tile=(k,i,label,val,sub,st)=>`<div class="ht"${sc(ti+k,st)}><span class="hk">${ic(i)}${label}</span><b>${v(ti+k+'v',val)}</b><small>${v(ti+k+'s',sub)}</small></div>`;
  const fed=t.fed===undefined?1:t.fed,crowd=t.pop>(t.house||0)+0.3,full=RES.reduce((a,r)=>Math.max(a,(t.stock[r]||0)/cap),0);
  let h=tile('f','grain','Food',pct(fed)+' fed',`${t.vari||0} of 5 kinds`+((t.fdays||99)<60?` · ${Math.round(t.fdays)} days`:''),fed<0.97?'bad':(t.fdays||99)<6&&fbal<-0.01?'warn':'good');
  h+=tile('w','fire','Heat',heatOn?pct(t.heat===undefined?1:t.heat)+' warm':'Not needed',heatOn?'peat or timber':'until autumn',!heatOn?'off':t.heat<0.9?'bad':t.heat<0.99?'warn':'good');
  h+=tile('o','house','Homes',popStr(t.house||0),crowd?popStr(t.pop-t.house)+' too few':(t.house||0)-t.pop<0.1?'all full':'room for '+popStr((t.house||0)-t.pop),crowd?'bad':t.hint&&t.hint.startsWith('No room')?'warn':'good');
  const jl=(t.unemp||0)>(t.wf||0)*0.25+1;
  h+=tile('j','factory','Jobs',popStr(t.jobs||0),jl?popStr(t.unemp)+' out of work':(t.vac||0)>0.3?popStr(t.vac)+' unfilled':'all filled',jl?'warn':(t.vac||0)>1?'warn':'good');
  if(S.era>=2&&!t.vil)h+=tile('p','bolt','Power',pct(t.pr===undefined?1:t.pr),`${fmt(t.gS||0)} of ${fmt(t.gD||0)} MW`,t.pr<0.8?'bad':t.pr<0.95?'warn':'good');
  else h+=tile('s','box','Storage',fmt(cap)+' each',`fullest ${Math.round(full*100)}% full`,full>=0.97?'warn':'good');
  h+=tile('a','smog','Air',(t.pol||0)<0.3?'Clean':'Smoky',(t.pol||0)<0.3?'no smoke at home':'from industry nearby',(t.pol||0)<0.3?'good':'warn');
  return `<div class="hgrid">${h}</div>`}
function issuesHTML(iss,key){return `<ul class="iss">${iss.map(x=>`<li data-sev="${x.sev}"><span class="ii">${ic(x.ic)}</span><div class="ib2"><b>${x.t}</b><p>${v('iq'+key+x.k,x.d)}</p>
  ${x.fix.length?`<div class="row">${x.fix.map(fixBtn).join('')}</div>`:''}</div></li>`).join('')}</ul>`}
function goodsHTML(rows,key,title){if(!rows.length)return '';
  return `<div class="sec"><h3>${title||'Goods a day'}<span>net counts routes and trade</span></h3><div class="gt" role="table">
    <div class="gr gh" role="row"><span>Good</span><span>Made</span><span>Used</span><span>Net</span><span>Stock</span></div>
    ${rows.map(x=>`<div class="gr" role="row" style="--c:var(--r-${x.r})"><button class="gn link" data-act="prodshow" data-r="${x.r}" aria-label="Show where ${RI[x.r].n.toLowerCase()} is made">${ic(RI[x.r].ic)}${RI[x.r].n}</button><span>${v(key+'m'+x.r,num(x.mk))}</span><span>${v(key+'u'+x.r,num(x.us))}</span><span>${v(key+'n'+x.r,fd(x.dl),'sign')}</span><span>${v(key+'s'+x.r,fmt(x.st))}</span></div>`).join('')}</div></div>`}
function marketTiles(ti){const t=S.towns[ti],port=townPort(ti),cap=t.cap||STORE_BASE;let h=`<p class="note">${S.hist.path==='soviet'?'State shops only.':port?'Port prices: sell for 40% more, imports cheaper.':'Local merchants buy and sell in lots of 25.'}</p><div class="tiles">`;
  RES.filter(r=>RI[r].era<=S.era).forEach(r=>{const s=t.stock[r]||0;h+=`<div class="tile" style="--c:var(--r-${r})"><div class="th">${ic(RI[r].ic)}${RI[r].n}</div>
    <div class="ta">${v(ti+'s'+r,fmt(s))}<small>${v(ti+'d'+r,fd(t.dl[r]||0)+'/d','sign')}</small></div><div class="sbar">${w(ti+'f'+r,Math.round(Math.min(1,s/cap)*100))}</div>
    ${S.hist.path==='soviet'?'':`<div class="tb"><button class="btn sm ghost" data-act="sell" data-ti="${ti}" data-r="${r}">Sell ${v(ti+'sv'+r,'+'+fmt(sellVal(ti,r)))}</button>${canBuyHere(ti,r)
      ?`<button class="btn sm ghost" data-act="buy" data-ti="${ti}" data-r="${r}">Buy ${v(ti+'bv'+r,'−'+fmt(buyVal(ti,r)))}</button>`:`<span class="note">Import via a port or border post</span>`}</div>`}</div>`});return h+'</div>'}
/* Short names of who holds land, for lists and map labels */
const OWN_SHORT={de:'Germany',al:'Allies',lv:'Latvia',pl:'Poland',ra:'Red Army',by:'USSR',ru:'USSR',lt:'Lithuania'};
/* A settlement in land others hold: who holds it and since when. It keeps what it had and comes back with its land. */
function lockHTML(t){const o=S.own[t.rg],d=ymd(S.day),y=+d.slice(0,4),wait='<p class="note">Nothing can be built here while others hold it. What you built stays, and works again if the land comes back.</p>';
  if(t.rg==='kr'){if(o==='al')return `<p class="lede">Under Allied rule since 15 February 1920, after Germany gave the region up at Versailles. Lithuania and the Allies argue over its future.</p>
      <p class="note">Its railway runs only to Tilsit in Germany. If the region joins Lithuania, link its port by a railway from Telšiai, as built in 1932, or by a paved road.</p>${wait}`;
    return y>=1939?`<p class="lede">Part of Germany since March 1939.</p>${wait}`
      :`<p class="lede">Part of Germany: the north of East Prussia, the land Lithuanians call Lithuania Minor. The peace treaty after the war will decide its future.</p>${wait}`}
  if(t.rg==='pal')return o==='de'?`<p class="lede">Palanga has belonged to Courland since 1819, and German troops have held Courland since 1915.</p>${wait}`
    :`<p class="lede">Palanga has belonged to Courland since 1819, and so now to Latvia. Lithuania claims it as its only piece of open sea coast.</p>${wait}`;
  /* the Vilnius region, as it changed hands */
  if(o==='ra')return `<p class="lede">${d<'1920-01-01'?'Held by the Red Army since 5 January 1919. The Bolsheviks run a Soviet government from Vilnius.'
    :'Held by the Red Army since 14 July 1920. Under the Moscow treaty, Soviet Russia is to hand it over to Lithuania.'}</p>${wait}`;
  if(o==='pl')return `<p class="lede">${d<'1920-07-14'?'Held by the Polish army since April 1919. Poland and Lithuania both claim it.'
    :d<'1922-03-24'?'Held since October 1920 by Żeligowski’s troops, as the Republic of Central Lithuania, a state run from Warsaw. Lithuania keeps no relations with Poland.'
    :d>='1938-03-19'&&S.mkt.pl.open?'Part of Poland since 1922. Lithuania still claims it, though it has kept relations with Poland since March 1938.'
    :'Part of Poland since 1922. Lithuania never accepts the loss and keeps no relations with Poland.'}</p>${wait}`;
  if(o==='by')return `<p class="lede">Held by the Soviet Union since September 1939, as part of Soviet Belarus.</p>${wait}`;
  return `<p class="lede">${heldTxt(t.rg)}.</p>${wait}`}
/* what private merchants bring to a town and take from it, a day */
function tradersTxt(t){const tr=t.tr||{},inn=[],out=[];RES.forEach(r=>{const q=tr[r]||0;if(q>0.02)inn.push([q,r]);else if(q<-0.02)out.push([-q,r])});
  if(!inn.length&&!out.length)return 'Merchants carry nothing here now. They bring goods a town runs short of from neighbours with plenty, slowly.';
  const ls=L0=>L0.sort((a,b)=>b[0]-a[0]).slice(0,3).map(([q,r])=>num(q)+' '+rname(r)).join(', ');
  return `Merchants ${inn.length?'bring '+ls(inn):''}${inn.length&&out.length?' and ':''}${out.length?'take '+ls(out):''} a day.`}
function townPanel(ti){const t=S.towns[ti];
  if(t.lock)return lockHTML(t);
  const iss=townIssues(ti),link=t.capital?(t.id==='vil'?'The capital':'The temporary capital'):NET.rail.has(ti)?'Linked by rail':NET.linked.has(ti)?'Linked by paved road':t.vil?'Village':'Not linked to '+capital().n;
  let h=`<div class="tsum"><div class="tpop"><b>${v(ti+'p',popStr(t.pop))}</b><span>residents · ${v(ti+'gr',trendTxt((t.gr||0)*30))}</span></div>
    <div class="tmor"><span>Morale ${v(ti+'h',Math.round(t.h)+'%')}</span><div class="mbar">${w(ti+'hb',Math.round(t.h))}</div></div>
    <span class="chip"${sc(ti+'nc',t.note==='Thriving'||t.note==='Content'?'good':t.note==='Hungry'||t.note==='Cold homes'||t.note==='Blackouts'?'bad':'warn')}>${v(ti+'n',t.note||'Content')}</span>
    <span class="chip lnk" data-c="${NET.linked.has(ti)||t.capital?'good':'off'}">${ic('rail')}${link}</span></div>
    ${healthTiles(ti)}`;
  const urgent=iss.filter(x=>x.sev>0),notes=iss.filter(x=>x.sev===0);
  h+=urgent.length?`<div class="sec"><h3>To fix<span>${urgent.length} problem${urgent.length>1?'s':''}</span></h3>${issuesHTML(urgent,ti)}</div>`
    :`<p class="okline">${ic('heart')}<span>Nothing urgent. ${v(ti+'g',growthTxt(t))}</span></p>`;
  if(urgent.length&&!t.hint)h+=`<p class="status">${ic('house')}${v(ti+'g',growthTxt(t))}</p>`;
  if(notes.length)h+=issuesHTML(notes,ti);
  h+=goodsHTML(goodsRows(ti),'t'+ti);
  h+=`<p class="note tradn">${ic('cart')}${v('trd'+ti,tradersTxt(t))}</p>`;
  const prod=bOfTown(ti).filter(b=>b.t!=='house'&&b.t!=='hall'&&b.t!=='landmark'),lms=S.bld.filter(b=>b.lm&&b.t==='landmark'&&LANDMARKS[b.lm].town===t.n);
  h+=`<div class="sec"><h3>Buildings<span>${prod.length?prod.length+' · tap to manage':'nothing yet'}</span></h3><ul class="blist">${prod.map(b=>{const T0=BT[b.t],p=Math.round(b.eff*100),staffed=T0.w;
    return `<li><button class="bl" data-act="selb" data-id="${b.id}" style="--c:${bCol(b.t)}"><span class="bi">${ic(bIcon(b.t))}</span><span class="bn">${T0.n}${T0.noUp?'':` <em>Lv ${b.lv}</em>`}<span class="pct">${staffed?v('e'+b.id,p+'%'):''}</span></span>
      ${staffed?`<span class="meter">${w('m'+b.id,p)}</span><span class="bs">${v('y'+b.id,b.on?b.why:'Paused','stat')}</span>`:`<span class="bs">${T0.store?'Adds '+fmt(WH_CAP[b.lv])+' storage':'Links the town'}</span>`}</button></li>`}).join('')}</ul>
    <div class="row"><button class="btn sm" data-act="buildmenu" data-ti="${ti}">${ic('plus')}Build near ${t.n}</button><button class="btn sm ghost" data-act="tool" data-tool="zone" data-ti="${ti}">${ic('zone')}Zone land</button></div>
    ${lms.length?`<p class="note">${ic('star')}Landmarks: ${lms.map(b=>`<button class="link sm" data-act="selb" data-id="${b.id}">${LANDMARKS[b.lm].n}</button>`).join(', ')}</p>`:''}</div>`;
  const ed=NET.adj[ti]||[],rs=S.routes.filter(r=>r.a===ti||r.b===ti);
  const lvOf=(k,o)=>{const p=pairPath(k,ti,o);return p?p.lv:1};
  h+=`<div class="sec"><h3>Neighbours<span>${ed.length?'start a route to trade':'not linked yet'}</span></h3><ul class="links">${ed.map(n=>{const e=NET.edges[n],o=e.a===ti?e.b:e.a;
    return `<li class="lk"><div><button class="link" data-act="seltown" data-ti="${o}">${S.towns[o].n}</button><div class="lks">${[e.road?ROADT[lvOf('road',o)].n+` · ${Math.round(e.road.len/MAPK)} km`:'',e.rail?RAILT[Math.min(2,lvOf('rail',o))].n+` · ${Math.round(e.rail.len/MAPK)} km`:''].filter(Boolean).join(' + ')}</div></div>
      <div class="row">${e.road?`<button class="btn sm" data-act="newroute" data-a="${ti}" data-b="${o}" data-m="road">${ic('cart')}Road route</button>`:''}${e.rail?`<button class="btn sm" data-act="newroute" data-a="${ti}" data-b="${o}" data-m="rail">${ic('train')}Rail route</button>`:''}</div></li>`}).join('')}</ul>
    ${ed.length?'':`<p class="note">Use the Road tool to draw a road from this town’s streets to another town, then start a route.</p>`}
    ${rs.length?`<p class="note">${rs.length} route${rs.length>1?'s':''} serve${rs.length>1?'':'s'} ${t.n}. <button class="link sm" data-act="nav" data-tab="routes">Open routes</button></p>`:''}</div>`;
  h+=`<details class="more" data-k="mkt${ti}"><summary>Stock, buy and sell</summary>${marketTiles(ti)}</details>`;
  if(t.d)h+=`<p class="lede">${t.d}</p>`;
  return h}
function buildingPanel(b){const T0=BT[b.t],t=b.town>=0?S.towns[b.town]:null;
  if(b.lm&&LANDMARKS[b.lm]){const L=LANDMARKS[b.lm],ti=S.towns.findIndex(x=>x.n===L.town);
    return `<p class="lede">${L.d}</p><div class="row">${ti>=0?`<button class="btn sm" data-act="seltown" data-ti="${ti}">Open ${S.towns[ti].n}</button>`:''}</div>`}
  if(b.t==='house')return `<p class="lede">Homes for ${popStr(houseCap(b))} people. ${b.lv<S.era?'The town will rebuild these bigger when it needs room.':''}${polAt(b.x,b.z)>0.3?' The air here is smoky.':''}</p>
    <div class="row">${t?`<button class="btn sm" data-act="seltown" data-ti="${b.town}">Open ${t.n}</button>`:''}</div>`;
  const p=Math.round(b.eff*100);let up='';
  if(!T0.noUp){if(b.lv>=3)up=`<span class="note">Fully modernized</span>`;else if(S.era<b.lv+1)up=`<span class="note">Lv ${b.lv+1} in the ${ERAS[b.lv+1].n} era</span>`;
    else up=`<button class="btn" data-act="up" data-id="${b.id}">${ic('up')}Modernize to Lv ${b.lv+1} <span class="bv">${costTxt(upCost(b))}</span></button>`}
  const status=b.town<0?naTxt(b):null,staffed=T0.w||T0.pow;
  /* the town's problems that hold this building back, with their fixes */
  const key=b.why==='Storage full'?'full':b.why==='Short of workers'?'staff':b.lack&&b.why&&b.why.startsWith('Missing ')?'in:'+b.lack:'',iss=key&&b.on?townIssues(b.town).filter(x=>x.k===key):[];
  return `${T0.d?`<p class="lede">${T0.d}</p>`:''}
    <p class="status big">${v('y'+b.id,status||(b.on?b.why||'Running':'Paused'),'stat')}</p>
    ${iss.length?issuesHTML(iss,'b'+b.id):b.town<0&&b.na!=='locked'?`<p class="note">A building joins a town when a road links it to the town hall within ${kmTxt(TERRITORY)} km. Build a road to it.</p>`:''}
    ${staffed?`<div class="kpis"><div class="kpi"><span class="k">${ic(bIcon(b.t))}Output</span><b>${v('e'+b.id,p+'%')}</b><div class="mbar">${w('m'+b.id,p)}</div></div>
      <div class="kpi"><span class="k">${ic('people')}Workers</span><b>${popStr(T0.w||0)}</b><small>needed</small></div></div>`:''}
    ${T0.store?`<p class="status">${ic('box')}Adds ${fmt(WH_CAP[b.lv])} storage for every good in ${t?t.n:'its town'}.</p>`:''}
    ${T0.out||T0.pow?`<p class="note">At full output it ${io(T0,b.lv,b.k)} per day${b.k&&b.k!==1&&!T0.pow?` (land ×${num(b.k)})`:''}.</p>`:''}
    ${T0.pol?`<p class="note">${ic('smog')}Pollutes homes within ${kmTxt(POL_R)} km.</p>`:''}
    <div class="row">${up}${staffed?`<button class="btn ghost" data-act="toggle" data-id="${b.id}">${b.on?'Pause':'Resume'}</button>`:''}${t?`<button class="btn ghost" data-act="seltown" data-ti="${b.town}">Open ${t.n}</button>`:''}</div>
    <div class="row">${S.confirmDemo===b.id?`<span class="note">Demolish ${T0.n}? Nothing is refunded.</span><button class="btn sm" data-act="demolish2" data-id="${b.id}">Demolish</button><button class="btn sm ghost" data-act="canceld">Keep</button>`
      :`<button class="btn sm ghost" data-act="demolish" data-id="${b.id}">${ic('trash')}Demolish</button>`}</div>`}

/* ---------- routes ---------- */
function movedTxt(r,dir){const m=dir==='ab'?r.mAB:r.mBA;if(!r.ok)return '';const e=Object.entries(m||{}).filter(([k,q])=>q>0.05).sort((a,b)=>b[1]-a[1]).slice(0,3);
  return e.length?e.map(([k,q])=>num(q)+' '+rname(k)).join(', ')+' a day':'nothing to carry'}
function cargoRow(r,dir,A,B0){const spec=r[dir],auto=spec==='auto';
  return `<div class="cg"><div class="cgh"><b>${A.n} → ${B0.n}</b>${v('rm'+r.id+dir,movedTxt(r,dir))}</div><div class="chips2"><button class="chipb${auto?' on':''}" data-act="rauto" data-r="${r.id}" data-dir="${dir}">Auto</button>${RES.filter(x=>RI[x].era<=S.era).map(x=>
    `<button class="chipb ico${!auto&&spec.includes(x)?' on':''}" data-act="rcargo" data-r="${r.id}" data-dir="${dir}" data-res="${x}" style="--c:var(--r-${x})" title="${RI[x].n}" aria-label="${RI[x].n}">${ic(RI[x].ic)}</button>`).join('')}</div></div>`}
function routeCard(r){routeEval(r);const A=S.towns[r.a],B0=S.towns[r.b],V0=VT[r.vt],vts=Object.keys(VT).filter(k=>VT[k].mode===r.mode&&VT[k].era<=S.era),nx=vts[(vts.indexOf(r.vt)+1)%vts.length];
  return `<li class="rc${VIEW.route===r.id?' on':''}"><div class="rh"><span class="rmode">${ic(r.mode==='rail'?'train':'cart')}</span><div class="rt"><b>${A.n} ⇄ ${B0.n}</b><div class="lks">${r.ok?`${Math.round(r.len/MAPK)} km · round trip ${num(r.trip)} days`:`<span class="bad">${r.why}</span>`}</div></div>
    <button class="btn sm ghost" data-act="rshow" data-r="${r.id}" aria-label="Show on map">${ic('target')}</button></div>
    <div class="rv"><button class="btn sm ghost" data-act="rveh" data-r="${r.id}" data-d="-1" aria-label="Fewer">${ic('minus')}</button><span><b>${r.n}</b> ${r.n===1?V0.one:V0.n.toLowerCase()}</span>
      <button class="btn sm ghost" data-act="rveh" data-r="${r.id}" data-d="1" aria-label="More">${ic('plus')}</button><span class="note">${fmt(V0.cost)} Lt each · upkeep ${num(V0.up*r.n)} Lt a day</span>
      ${vts.length>1?`<button class="btn sm ghost" data-act="rvt" data-r="${r.id}">Use ${VT[nx].n.toLowerCase()}</button>`:''}</div>
    ${cargoRow(r,'ab',A,B0)}${cargoRow(r,'ba',B0,A)}
    <div class="row"><button class="chipb${r.pax?' on':''}" data-act="rpax" data-r="${r.id}">${ic('people')}Carry commuters</button><span class="note">${v('ru'+r.id,r.ok?`${fmt(r.cap)} loads a day each way · ${Math.round(r.used*100)}% used${r.pax?' · '+num(r.paxUsed||0)+'k commuters':''}`:'')}</span></div>
    <div class="row">${S.confirmRoute===r.id?`<span class="note">Remove this route? Half the vehicle cost comes back.</span><button class="btn sm" data-act="rdel2" data-r="${r.id}">Remove</button><button class="btn sm ghost" data-act="rkeep">Keep</button>`
      :`<button class="btn sm ghost" data-act="rdel" data-r="${r.id}">${ic('trash')}Remove route</button>`}</div></li>`}
function townOpts(sel){const by=v0=>S.towns.map((t,n)=>[t,n]).filter(([t])=>!t.lock&&!!t.vil===v0).sort((a,b)=>a[0].n.localeCompare(b[0].n,'lt')).map(([t,n])=>`<option value="${n}"${n===sel?' selected':''}>${t.n}</option>`).join('');
  return `<optgroup label="Towns">${by(false)}</optgroup><optgroup label="Villages">${by(true)}</optgroup>`}
function routesPanel(){const s=VIEW.sel&&VIEW.sel.kind==='t'?VIEW.sel.ti:0;
  return `<p class="note">Goods move only on routes. The quickest way to start one: open a town and tap a neighbour.</p>
    <div class="sec"><h3>New route<span>needs a road, or a railway with a station in each town</span></h3><div class="newr"><select id="nrA" aria-label="From">${townOpts(s)}</select><span>⇄</span><select id="nrB" aria-label="To">${townOpts(-1)}</select>
    <select id="nrM" aria-label="Mode"><option value="road">Road</option><option value="rail">Rail</option></select><button class="btn pri" data-act="rcreate">Create</button></div></div>
    <div class="sec"><h3>Routes<span>Auto carries what the other town is short of</span></h3><ul class="routes">${S.routes.map(routeCard).join('')}</ul></div>`}

/* ---------- the country dashboard ---------- */
function kpiTile(k,i,label,val,sub,spark,act){return `<${act?'button':'div'} class="kt"${act?` ${attrs(act)}`:''}><span class="k">${ic(i)}${label}</span><b>${val}</b><small>${sub}</small>${spark||''}</${act?'button':'div'}>`}
function sparkSvg(k,vals){const d=sparkPath(vals,120,30);return d?`<svg class="spark" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true"><path${pd(k,d)}/></svg>`:''}
function natIssuesHTML(){const iss=natIssues();
  if(!iss.length)return `<p class="okline">${ic('heart')}<span>Every town and village is fed, warm and housed.</span></p>`;
  return `<div class="sec"><h3>Needs attention<span>tap a problem to see where</span></h3><ul class="niss">${iss.map(g=>{const open=VIEW.iss===g.k,n=g.towns.length;
    return `<li data-sev="${g.sev}"><button class="nih" data-act="iss" data-k="${g.k}" aria-expanded="${open}"><span class="ii">${ic(g.ic)}</span><b>${g.t}</b><span class="cnt">${n} ${n===1?'place':'places'}</span>${ic(open?'up':'down')}</button>
      ${open?`<div class="chips3">${g.towns.slice(0,24).map(n=>`<button class="tchip" data-act="seltown" data-ti="${n}">${S.towns[n].n}<small>${popStr(S.towns[n].pop)}</small></button>`).join('')}${n>24?`<span class="note">and ${n-24} more</span>`:''}</div>`
        :`<p class="note">${g.towns.slice(0,3).map(n=>S.towns[n].n).join(', ')}${n>3?` and ${n-3} more`:''}</p>`}</li>`}).join('')}</ul></div>`}
function townsBlock(){const sort=VIEW.tsort||'need',heatOn=seasonOf(S.day).heat>0.05;
  let L0=S.towns.map((t,n)=>n).filter(n=>!S.towns[n].vil);
  const al=n=>townAlert(S.towns[n],heatOn);
  if(sort==='need')L0.sort((a,b)=>al(b)-al(a)||S.towns[b].pop-S.towns[a].pop);else if(sort==='size')L0.sort((a,b)=>S.towns[b].pop-S.towns[a].pop);else L0.sort((a,b)=>S.towns[a].n.localeCompare(S.towns[b].n,'lt'));
  const show=VIEW.tall?L0:L0.slice(0,10),vils=S.towns.map((t,n)=>n).filter(n=>S.towns[n].vil&&!S.towns[n].lock),vp=vils.filter(n=>al(n)>0);
  const row=n=>{const t=S.towns[n],a=al(n);return `<li><button class="trow" data-act="seltown" data-ti="${n}"><i class="dot"${sc('td'+n,a>=2?'bad':a===1?'warn':a<0?'good':'off')}></i><b>${t.n}</b>
    <span class="tp">${t.lock?OWN_SHORT[S.own[t.rg]]||'':v('tw'+n,popStr(t.pop))}</span><span class="ts">${t.lock?'':v('tn'+n,t.note||'')}</span>${NET.linked.has(n)||t.capital?ic('rail','on'):ic('rail','off')}</button></li>`};
  return `<div class="sec"><h3>Towns<span>${S.towns.filter((t,n)=>!t.vil&&NET.linked.has(n)).length} of ${L0.filter(n=>!S.towns[n].lock).length} linked to ${capital().n}</span></h3>
    <div class="seg" role="group" aria-label="Sort towns">${[['need','Needs help'],['size','Largest'],['name','A to Z']].map(([k,l])=>`<button data-act="tsort" data-k="${k}" aria-pressed="${sort===k}">${l}</button>`).join('')}</div>
    <ul class="tlist">${show.map(row).join('')}</ul>
    ${L0.length>10?`<button class="btn sm ghost wide" data-act="tall">${VIEW.tall?'Show fewer':'Show all '+L0.length+' towns'}</button>`:''}
    <p class="note">${vils.length} villages with ${v('tvp',popStr(vils.reduce((a,n)=>a+S.towns[n].pop,0)))} people farm the land between the towns${vp.length?`. ${vp.length} need help: ${vp.slice(0,6).map(n=>`<button class="link sm" data-act="seltown" data-ti="${n}">${S.towns[n].n}</button>`).join(', ')}${vp.length>6?' and more':''}`:''}.</p></div>`}
/* where the treasury's money comes from and goes, a day (smoothed over about ten days) */
const BUD_ROWS=[['tax','Taxes'],['trade','Trade abroad'],['bld','Building upkeep'],['lines','Roads and railways'],['routes','Route vehicles'],['army','Army and allies']];
function budgetHTML(){const b=S.bud||{},st=x=>x<-0.05?'neg':x>0.05?'pos':'';
  return `<div class="sec"><h3>Money a day</h3><div class="bud">${BUD_ROWS.map(([k,n])=>`<span>${n}</span><b${sc('bc'+k,st(b[k]||0))}>${v('bu'+k,fd(b[k]||0)+' Lt')}</b>`).join('')}
    <span class="tot">Balance</span><b class="tot"${sc('bctot',st(S.inc))}>${v('butot',fd(S.inc)+' Lt')}</b></div></div>`}
function natPanel(){const t=totals(),ser=S.series||[],L0=eraReq(),done=L0?L0.filter(x=>x.ok).length:0;let h='';
  h+=`<div class="kgrid">${kpiTile('p','people','Residents',v('tp',popStr(t.pop)),v('tpg',trendTxt(popTrend())),sparkSvg('sp',ser.map(x=>x[1])))}
    ${kpiTile('f','coin','Treasury',v('tf',fmt(S.funds)+' Lt'),v('tfi',fd(S.inc)+' Lt a day'),sparkSvg('sf',ser.map(x=>x[2])))}
    ${kpiTile('l','rail','Linked towns',v('tl',t.linked+' of '+t.towns),'by rail or paved road',`<div class="mbar">${w('tlb',Math.round(t.linked/Math.max(1,t.towns)*100))}</div>`)}
    ${L0?kpiTile('e','star','Next era',v('te',done+' of '+L0.length),'requirements met',`<div class="mbar">${w('teb',Math.round(done/L0.length*100))}</div>`,{act:'goto',k:'era'}):kpiTile('e','star','Era',ERAS[S.era].n,'the last era','')}</div>`;
  h+=natIssuesHTML();
  h+=budgetHTML();
  h+=goodsHTML(goodsRows(-1),'N','Goods in Lithuania a day');
  h+=townsBlock();
  h+=S.won?`<div class="goal"><b>Plan fulfilled</b><span>Every town is linked and lit, and ${popStr(t.pop)} people live in them.</span></div>`
    :`<div class="goal"><b>Goal: light up Lithuania</b><span>Reach the Modern era with every town linked to the capital by rail or paved road and powered, and ${popStr(goalPop())} residents.</span></div>`;
  const open=OBJ.filter(o=>!S.obj[o.id]&&(!o.can||o.can())).slice(0,4),nd=OBJ.length-OBJ.filter(o=>!S.obj[o.id]).length;
  h+=`<div class="sec" id="tasks"><h3>Ministry tasks<span>${nd} of ${OBJ.length} done</span></h3><ul class="objs">${open.map(o=>`<li>${ic('star')}<span>${o.t}</span><b>+${fmt(o.r)} Lt</b></li>`).join('')}</ul></div>`;
  h+=`<div class="ebox" id="era"><div><div class="eyebrow">Current era</div><div class="enow">${ERAS[S.era].n}</div></div><div class="eras">${[1,2,3].map(n=>`<div class="es${n<=S.era?' done':''}${n===S.era?' now':''}" style="--ec:${ERAS[n].c}"><i></i><b>${ERAS[n].n}</b></div>`).join('')}</div>`;
  if(L0){const nx=ERAS[S.era+1];h+=`<div class="req">${L0.map((x,i)=>`<span class="m">${v('rq'+i,x.ok?'✓':'·','chk')}</span><span>${x.t}</span><span class="q">${v('rn'+i,x.q)}</span>`).join('')}</div>
    <p class="unl">Unlocks ${nx.unl.charAt(0).toLowerCase()+nx.unl.slice(1)}</p><div class="row"><button class="btn pri" data-act="era">Begin ${nx.n} · ${fmt(nx.req.lt)} Lt</button></div>`}
  h+='</div>'+secBlock();
  h+=`<details data-k="how"><summary>How it works</summary><ul><li>Each town has its own stock. Storage holds ${STORE_BASE} of each good, plus ${WH_CAP[1]} per warehouse. Full storage stops production.</li>
    <li>Goods move only on routes. Each route has vehicles; more vehicles and shorter distances carry more. Auto cargo sends what the other town is short of; or pick goods yourself.</li>
    <li>Every town and village feeds and heats its people of 1918 from its own fields and woodlots, so it keeps that size without help. Growth beyond it needs food from farms or routes, zoned land and work.</li>
    <li>Trade abroad goes through a border post near the border or a sea port, from that town’s stock. History opens and closes markets: the Depression, a German boycott, war.</li>
    <li>On key dates history asks you to decide. Some choices can avoid what happened, if Lithuania has enough security: allies, an army, friends in the West.</li>
    <li>People eat grain, potatoes, dairy, meat and fish. Each extra kind adds morale. In winter homes burn peat or timber.</li>
    <li>Merchants carry goods on their own between neighbouring towns, from one with plenty to one that runs short, a few loads a day at most: more by paved road, most by rail. Routes move goods in bulk.</li>
    <li>Workers fill local jobs first, then walk to towns within ${kmTxt(WALK_KM)} km by road, or ride routes set to carry commuters.</li>
    <li>Factories and kilns pollute homes within ${kmTxt(POL_R)} km. Schools raise output; clinics lift morale and growth.</li>
    <li>Buildings join a town when a road links them to its town hall within ${kmTxt(TERRITORY)} km. Villages have few workers, so workplaces join a village only when no town is near.</li>
    <li>Dirt roads join every town and village. A town is linked to the capital when a railway or a paved road from it reaches its streets. The capital is Vilnius, or Kaunas from January 1919 until Vilnius is back for good. Railways and paved roads also carry the power grid.</li>
    <li>The map shows the borders of the day. Land others hold, like Vilnius for most of the years between the wars or the Klaipėda Region until 1923, can’t be built on, and nothing travels through it. Its towns wait, with all you built there, until it comes back.</li>
    <li>On the map: one finger moves it, two fingers zoom, turn and tilt. With a tool, tap to act; hold and drag to draw or paint.</li>
    <li>Keys: R road, T rail, Z zone, X remove, B build, Esc cancel, Enter build, Backspace undo, Space pause, [ and ] turn, Page Up and Down tilt, N north up.</li>
    <li><button class="link sm" data-act="tutorial">Show the tutorial again</button></li></ul></details>`;
  h+=S.confirmReset?`<div class="row"><span class="note">Start again from 1918? This game will be lost.</span><button class="btn sm" data-act="reset2">Start again</button><button class="btn sm ghost" data-act="cancelr">Keep playing</button></div>`
    :`<div class="row"><button class="btn sm ghost" data-act="reset">New game</button></div>`;return h}
/* The intro of a new game: 16 February 1918, and the player's part in what follows */
function introHTML(){return `<div class="cbox intro"><div class="eyebrow">Vilnius · 16 February 1918</div><h2 id="cardt">The Act of Independence</h2>
  <p>The twenty members of the Council of Lithuania sign the Act of Independence. It restores an independent, democratic Lithuania, with Vilnius as its capital.</p>
  <p>German troops still hold the country, and the war has left it poor. There is no army yet, no money of its own, and no border anyone has agreed.</p>
  <p class="lead">What happens next is up to you. Build the economy, link the towns, and answer history when it calls.</p>
  <div class="opts"><button class="btn pri big" data-intro="1">${ic('play')}Begin</button></div></div>`}
/* A new era: what it brings, under a stripe in the era's colour */
function eraHTML(n){const E=ERAS[n];return `<div class="cbox intro era" style="--ec:${E.c}"><div class="eyebrow">A new era · ${dateStr(S.day)}</div><h2 id="cardt">${E.n}</h2>
  <p>${E.unl}</p><p class="lead">${n===2?'Plan the power grid as you grow: towns without electric light lose heart.':'The last era. Light up every town and link it to the capital to fulfil the plan.'}</p>
  <div class="opts"><button class="btn pri big" data-eraok="1">Continue</button></div></div>`}
/* History that moved a border or the capital: what happened, what changed hands, and what it means for the player */
function newsHTML(nw){const e=HEV.find(x=>x.id===nw.id)||{},d=e.d||'';return `<div class="cbox intro news"><div class="eyebrow">${cardDate(e.y?d.slice(0,4):d)}</div><h2 id="cardt">${e.news||''}</h2>
  <p>${e.t||''}</p>${nw.more?`<p class="more">${nw.more}</p>`:''}${e.nd?`<p class="lead">${e.nd}</p>`:''}
  <div class="opts"><button class="btn pri big" data-newsok="1">Continue</button></div></div>`}
/* The decisions taken so far, each marked as history went or not, then the chronicle itself */
function chronPanel(){const D=decisions(),as=D.filter(x=>x.as===1).length,off=D.filter(x=>x.as===0).length;
  const dec=D.length?`<details class="more" data-k="decisions"${D.length<=3?' open':''}><summary>Your decisions<span>${as} as in history${off?`, ${off} not`:''}</span></summary><ul class="decs">${D.map(x=>
    `<li${sc('dc'+x.id,x.as===1?'good':x.as===0?'warn':'off')}><time>${x.when.length===4?x.when:dateStr(Math.round((Date.parse(x.when)-START)/864e5))}</time><b>${x.t}</b><span>${x.o}${x.failed?' (failed)':''}</span><em>${x.as===1?'As in history':x.as===0?'Not as in history':'History was mixed'}</em></li>`).join('')}</ul></details>`:'';
  return dec+`<ul class="chron">${S.log.map(e=>`<li class="${e.k}"><time>${e.yo?dOf(e.d).getUTCFullYear():dateStr(e.d)}</time><p>${e.t}</p></li>`).join('')}</ul>`}

/* ---------- foreign trade, and the Soviet plan ---------- */
const MKT_ORDER=['gb','de','lv','pl','su'];
function dealRow(d){const t=S.towns[d.ti],M=MARKETS[d.m],out=d.dir==='out';
  return `<li class="dl"><div class="dlt"><b>${out?'Sell':'Buy'} ${num(d.q)} ${rname(d.r)} a day</b><span class="lks">${out?'from':'into'} ${t?t.n:'—'} · ${out?'to':'from'} ${M.n}</span>
    <span class="note">${v('dv'+d.id,d.why?d.why:(d.val>=0?'+':'−')+fmt(Math.abs(d.val))+' Lt a day','stat3')}</span></div>
    <div class="row"><button class="btn sm ghost" data-act="dq" data-d="${d.id}" data-q="-1" aria-label="Less">${ic('minus')}</button><button class="btn sm ghost" data-act="dq" data-d="${d.id}" data-q="1" aria-label="More">${ic('plus')}</button>
    <button class="btn sm ghost" data-act="ddel" data-d="${d.id}" aria-label="Remove deal">${ic('trash')}</button></div>
    <div class="row lim"><span class="note">${out?'Keep in store':'Fill store to'}</span>${DEAL_LIM[d.dir].map(q=>`<button class="chipb${(d.lim===undefined?(out?0.5:1):d.lim)===q?' on':''}" data-act="dlim" data-d="${d.id}" data-q="${q}">${Math.round(q*100)}%</button>`).join('')}</div></li>`}
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
  const ms=MKT_ORDER.filter(m=>m!=='su'||S.mkt.su.open);let o=`<p class="lede">Goods cross the border at a border post or a sea port, taken from that town’s stock. Routes bring them there. Prices are per load, after a 10% duty.</p>`;
  o+=`<ul class="mks">${ms.map(m=>{const s=S.mkt[m],gt=gateTowns(m);return `<li class="mk"><div class="mkh"><b>${MARKETS[m].n}</b><span class="tag${s.open?' ok':''}">${s.open?'Open':s.why}</span></div>
    <div class="lks">${gt.length?'Through '+gt.map(n=>S.towns[n].n).join(', '):'Needs '+MARKETS[m].gate.map(g=>GATE_N[g]).join(' or ')}</div>${s.open?priceChips(m):''}</li>`}).join('')}</ul>`;
  o+=`<div class="sec"><h3>Deals<span>${S.deals.length?'run every day':'none yet'}</span></h3><ul class="deals">${S.deals.map(dealRow).join('')}</ul>${dealForm(ms.filter(m=>S.mkt[m].open))}</div>`;
  if(DEPRESSION[dOf(S.day).getUTCFullYear()])o+=`<p class="note">${ic('coin')}The Depression has cut farm prices abroad to ${Math.round(depAt('dairy')*100)}% of normal.</p>`;
  return o}
function planPanel(){const h=S.hist,p=S.plan;let o=`<h3 class="ph">${p?p.name+': the plan for '+p.y:h.war?'War':'No plan this year'}</h3>
    <p class="lede">${h.war?'The war has stopped the plan. Factories and farms work at reduced strength.':'Moscow sets what the republic delivers to the Union each year. Deliver through towns with a railway station, with deals below.'}</p>`;
  if(p){o+=`<div class="kpis"><div class="kpi"><span class="k">${ic('plan')}Plan done</span><b>${v('pls',Math.round(planShare(p)*100)+'%')}</b><small>of the year’s target</small></div>
      <div class="kpi"><span class="k">${ic('star')}Party trust</span><b>${v('plt',Math.round(h.trust))}</b><small>of 100</small><div class="mbar">${w('pltb',Math.round(h.trust))}</div></div></div>
    <div class="tw"><table><thead><tr><th>Good</th><th class="n">Target</th><th class="n">Delivered</th></tr></thead><tbody>${Object.keys(p.tgt).map(r=>`<tr style="--c:var(--r-${r})"><td>${ic(RI[r].ic)}${RI[r].n}</td><td class="n">${fmt(p.tgt[r])}</td><td class="n">${v('pg'+r,fmt(p.got[r]||0))}</td></tr>`).join('')}</tbody></table></div>`}
  const pr=h.proj.filter(q=>!q.done);if(pr.length)o+=`<div class="sec"><h3>Union projects</h3><ul class="objs">${pr.map(q=>`<li>${ic(bIcon(q.type))}<span>${BT[q.type].n} within ${q.r} km of ${S.towns[tIdx(q.near)].n}</span><b>by ${new Date(q.by).getUTCFullYear()}</b></li>`).join('')}</ul></div>`;
  if(h.plans&&h.plans.length)o+=`<p class="note">Past plans: ${h.plans.slice(-6).map(q=>q.y+' '+q.share+'%').join(' · ')}</p>`;
  o+=`<div class="sec"><h3>Deliveries to the Union<span>through railway stations</span></h3><ul class="deals">${S.deals.map(dealRow).join('')}</ul>${dealForm(['su'].filter(m=>S.mkt[m].open))}</div>`;
  return o}
function secBlock(){const h=S.hist;if(h.path==='soviet')return `<div class="sec"><h3>Soviet rule<span>since 1940</span></h3><p class="note">Party trust ${v('trs',Math.round(h.trust))} of 100. Fulfil the plan and Moscow invests; fail it and inspectors come.</p></div>`;
  return `<div class="sec"><h3>Security<span>${h.path==='neutral'?'a neutral state':'can turn back ultimatums'}</span></h3><div class="secb"><b>${v('sec',Math.round(h.sec))}</b><span>of 100</span><div class="mbar">${w('secw',Math.round(h.sec))}</div></div>
    <p class="note">Allies, an army and trade with Britain make Lithuania harder to bully. Holding Vilnius in 1920 and refusing the ultimatums of 1938 to 1940 work only with enough security.</p>
    <div class="row"><span class="note">Army budget</span>${[0,10,25,50].map(q=>`<button class="chipb${h.def===q?' on':''}" data-act="def" data-q="${q}">${q?q+' Lt a day':'None'}</button>`).join('')}</div>${h.ally?`<p class="note">Baltic alliance: ${h.ally} Lt a day.</p>`:''}</div>`}
