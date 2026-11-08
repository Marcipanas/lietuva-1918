'use strict';
/* Lietuva 1918 — input: pan, pinch, wheel, keyboard, and the build tools. */
const TOOL={k:'inspect',bt:null};
const PTR=new Map();let G=null,PEND=null,rectStart=-1,lastLineEnd=-1;
const HINTS={road:'Drag from one point to another to plan a road. Use two fingers to move the map.',rail:'Drag to plan a railway. Towns need a station next to the track.',
  zone:'Drag over empty land next to streets. Towns grow into zoned land when people are fed.',bull:'Drag over roads, tracks or buildings to remove them.',place:'Tap where to build. Green means it fits; tap again or press Build.'};
const PLACE_NAMES=[['Jonava',24.28,55.08],['Kėdainiai',23.97,55.29],['Druskininkai',23.97,54.02],['Palanga',21.07,55.92],['Mažeikiai',22.34,56.31],['Rokiškis',25.59,55.96],
  ['Biržai',24.75,56.20],['Kretinga',21.24,55.89],['Šilutė',21.48,55.35],['Visaginas',26.43,55.60],['Raseiniai',23.12,55.37],['Prienai',23.95,54.63],['Kupiškis',24.98,55.84],
  ['Plungė',21.85,55.91],['Anykščiai',25.10,55.53],['Varėna',24.57,54.22],['Lazdijai',23.52,54.23],['Joniškis',23.62,56.24],['Pasvalys',24.40,56.06],['Zarasai',26.25,55.73],
  ['Molėtai',25.42,55.23],['Ignalina',26.16,55.34],['Trakai',24.93,54.64],['Elektrėnai',24.66,54.79],['Radviliškis',23.53,55.81],['Jurbarkas',22.77,55.08],['Kelmė',22.93,55.63],
  ['Šalčininkai',25.38,54.31],['Švenčionys',26.16,55.13],['Kaišiadorys',24.47,54.86],['Vilkaviškis',23.03,54.65],['Kazlų Rūda',23.49,54.75],['Skuodas',21.53,56.27],
  ['Akmenė',22.88,56.25],['Pakruojis',23.86,55.98],['Širvintos',24.95,55.04],['Šakiai',23.05,54.95],['Kalvarija',23.22,54.41],['Gargždai',21.40,55.71],['Nida',21.00,55.30]];

function setTool(k,bt){TOOL.k=k;TOOL.bt=bt||null;clearPreview();hint(HINTS[k]||'');renderTools()}
function clearPreview(){VIEW.path=null;VIEW.start=-1;VIEW.rect=null;VIEW.ghost=null;VIEW.pathOk=undefined;PEND=null;rectStart=-1;lastLineEnd=-1;showConfirm()}
function pos(e){const r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]}
const isLine=()=>TOOL.k==='road'||TOOL.k==='rail',isRect=()=>TOOL.k==='zone'||TOOL.k==='bull';

cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);const [x,y]=pos(e);PTR.set(e.pointerId,{x,y});
  if(PTR.size===2){const [a,b]=[...PTR.values()];G={mode:'pinch',d:Math.hypot(a.x-b.x,a.y-b.y)||1,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};
    if(isLine()&&!PEND){VIEW.path=null;VIEW.start=-1}if(isRect()&&!PEND){VIEW.rect=null;rectStart=-1;VIEW.start=-1}return}
  if(PTR.size>2)return;G={mode:'press',x0:x,y0:y,draw:(isLine()||isRect())&&e.button===0,moved:false,tile:tileAt(x,y)}});
cv.addEventListener('pointermove',e=>{const [x,y]=pos(e),p=PTR.get(e.pointerId);
  if(!p){if(e.pointerType==='mouse')hover(x,y);return}
  const px=p.x,py=p.y;p.x=x;p.y=y;if(!G)return;
  if(G.mode==='pinch'){if(PTR.size<2)return;const [a,b]=[...PTR.values()],d=Math.hypot(a.x-b.x,a.y-b.y)||1,cx2=(a.x+b.x)/2,cy2=(a.y+b.y)/2;
    zoomAt(cx2,cy2,d/G.d);panBy(cx2-G.cx,cy2-G.cy);G.d=d;G.cx=cx2;G.cy=cy2;return}
  if(G.mode==='press'&&Math.hypot(x-G.x0,y-G.y0)>7){G.moved=true;if(G.draw&&G.tile>=0){G.mode='draw';beginDraw(G.tile)}else G.mode='pan'}
  if(G.mode==='pan')panBy(x-px,y-py);else if(G.mode==='draw')moveDraw(tileAt(x,y))});
function endPtr(e,cancel){const [x,y]=pos(e);PTR.delete(e.pointerId);if(!G)return;
  if(!cancel){if(G.mode==='press')tap(x,y);else if(G.mode==='draw')finishDraw()}
  if(PTR.size===0)G=null;else G={mode:'idle'}}
cv.addEventListener('pointerup',e=>endPtr(e,false));cv.addEventListener('pointercancel',e=>endPtr(e,true));
cv.addEventListener('wheel',e=>{e.preventDefault();const [x,y]=pos(e);zoomAt(x,y,Math.exp(-e.deltaY*0.0016))},{passive:false});
cv.addEventListener('contextmenu',e=>e.preventDefault());

function beginDraw(k){clearPreview();if(isLine()){VIEW.start=k;lineTo(k)}else{rectStart=k;VIEW.start=k;rectTo(k)}}
function moveDraw(k){if(k<0)return;if(isLine())lineTo(k);else rectTo(k)}
function finishDraw(){if(isLine()){if(VIEW.path)preparePend()}else if(rectStart>=0)prepareRect()}
function lineTo(k){if(k<0||k===lastLineEnd)return;lastLineEnd=k;const p=findPath(VIEW.start,k,TOOL.k);VIEW.pathMode=TOOL.k;
  if(p){VIEW.path=p;VIEW.pathOk=true}else{VIEW.path=[VIEW.start,k];VIEW.pathOk=false}}
function rectTo(k){if(k<0)return;const all=rectTiles(rectStart,k);VIEW.rectMode=TOOL.k;VIEW.rect=TOOL.k==='zone'?all.filter(zoneable):all.filter(q=>(BD[q]>=0&&bAt(q).t!=='hall')||R[q]||L[q]||Z[q]);VIEW.rectAll=all}
function preparePend(){const t=nearestTown(ti_(VIEW.start),tj_(VIEW.start),true);
  if(!VIEW.pathOk){PEND={kind:'line',bad:'No route: water, buildings or the border are in the way.'};showConfirm();return}
  const lc=lineCost(VIEW.path,TOOL.k);PEND={kind:'line',mode:TOOL.k,path:VIEW.path,lv:lc.lv,cost:lc.cost,n:lc.n,br:lc.br,ti:t,name:lc.spec.n};
  if(!lc.n)PEND.bad=`This is already a ${lc.spec.n.toLowerCase()}.`;showConfirm()}
function prepareRect(){const tiles=VIEW.rect||[];if(TOOL.k==='zone')PEND={kind:'zone',tiles,n:tiles.length,cost:{lt:tiles.length*ZONE_COST}};
  else{const inf=bullInfo(VIEW.rectAll||[]);PEND={kind:'bull',tiles:VIEW.rectAll||[],inf}}
  if(!tiles.length)PEND.bad=TOOL.k==='zone'?'Nothing here can be zoned. Pick empty land inside Lithuania.':'Nothing to remove here.';showConfirm()}
function setGhost(i,j){const s=bSize(TOOL.bt),o=Math.floor((s-1)/2),ai=i-o,aj=j-o,v=validPlace(TOOL.bt,ai,aj);
  const t=nearestTown(ai,aj,true);VIEW.ghost={t:TOOL.bt,i:ai,j:aj,ok:v.ok};PEND={kind:'place',t:TOOL.bt,i:ai,j:aj,ok:v.ok,why:v.why,bonus:v.bonus,ti:t,cost:BT[TOOL.bt].cost};showConfirm()}
let hoverK=-1;
function hover(x,y){const k=tileAt(x,y);if(k===hoverK)return;hoverK=k;if(k<0)return;
  if(TOOL.k==='place')setGhost(ti_(k),tj_(k));else if(isLine()&&VIEW.start>=0&&!PEND)lineTo(k);else if(isRect()&&rectStart>=0&&!PEND)rectTo(k);
  cv.style.cursor=TOOL.k==='inspect'?(labelAt(x,y)>=0||bAt(k)?'pointer':'grab'):'crosshair'}
function tap(x,y){const k=tileAt(x,y);
  if(TOOL.k==='inspect'){const lt=labelAt(x,y);if(lt>=0)return selectTown(lt,true);if(k<0)return select(null);const b=bAt(k);if(b)return b.t==='hall'&&b.town>=0?selectTown(b.town):selectBuilding(b);
    if(R[k]&&NET.own[k]>=0)return selectTown(NET.own[k]);const nt=nearestTown(ti_(k),tj_(k));if(nt>=0&&Math.hypot(S.towns[nt].i-ti_(k),S.towns[nt].j-tj_(k))<4)return selectTown(nt);return select(null)}
  if(k<0)return;
  if(isLine()){if(VIEW.start<0||PEND){clearPreview();VIEW.start=k;hint(`Now tap where the ${TOOL.k==='road'?'road':'railway'} should end.`);return}lastLineEnd=-1;lineTo(k);preparePend();hint(HINTS[TOOL.k]);return}
  if(isRect()){if(rectStart<0||PEND){clearPreview();rectStart=k;VIEW.start=k;rectTo(k);hint('Tap the opposite corner, or the same tile again.');return}rectTo(k);prepareRect();hint(HINTS[TOOL.k]);return}
  if(TOOL.k==='place'){const g=VIEW.ghost,s=bSize(TOOL.bt),o=Math.floor((s-1)/2);if(g&&g.i===ti_(k)-o&&g.j===tj_(k)-o&&g.ok)return doConfirm();setGhost(ti_(k),tj_(k))}}

function doConfirm(){const p=PEND;if(!p||p.bad)return;
  if(p.kind==='line'){if(p.ti<0)return toast('Found or unlock a town nearby first');const t=S.towns[p.ti],m=missing(p.cost,t);if(m)return toast(m);
    pay(p.cost,t);applyLine(p.path,p.mode,p.lv);toast(`${p.name} built: ${p.n} tiles`);log(`${p.name} built from near ${t.n}, ${p.n} tiles long.`);clearPreview();hint(HINTS[TOOL.k])}
  else if(p.kind==='zone'){if(S.funds<p.cost.lt)return toast(`Need ${fmt(p.cost.lt-S.funds)} more Lt`);S.funds-=p.cost.lt;const n=applyZone(p.tiles);toast(`${n} tiles zoned for homes`);clearPreview();hint(HINTS.zone)}
  else if(p.kind==='bull'){const inf=applyBull(p.tiles);if(VIEW.sel&&VIEW.sel.kind==='b'&&!BMAP.get(VIEW.sel.id))VIEW.sel=null;toast(`Cleared ${inf.b.size} buildings and ${inf.r+inf.l} track or road tiles`);clearPreview();hint(HINTS.bull)}
  else if(p.kind==='place'){const v=validPlace(p.t,p.i,p.j);if(!v.ok)return toast(v.why);if(p.ti<0)return toast('No town nearby to pay for it');const t=S.towns[p.ti],m=missing(p.cost,t);if(m)return toast(m);
    pay(p.cost,t);if(p.t==='hall'){foundTown(p.i,p.j)}else{const b=addB(p.t,p.i,p.j,1);toast(`${BT[p.t].n} built`);log(`${BT[p.t].n} built near ${t.n}.`)}
    VIEW.ghost=null;PEND=null;showConfirm()}
  analyze();save();renderPanel(true)}
function foundTown(i,j){const [lo,la]=tileLL(i,j);let nm=null,bd=1e9;PLACE_NAMES.forEach(([n,x,y])=>{if(S.towns.some(t=>t.n===n))return;const d=Math.hypot((x-lo)*0.57,y-la);if(d<bd){bd=d;nm=n}});
  nm=nm&&bd<0.35?nm:'New town '+(S.towns.length+1);
  const t={id:'t'+S.nid,n:nm,reg:'',cap:0,orig:0,lock:0,i,j,d:'A new town founded by the planning ministry.',pop:3,pop0:3,h:62,stock:{grain:40,timber:24},dl:{},dem:{},house:0,wf:0,jobs:0,
    fill:1,pm:1,powS:0,powD:0,pr:1,gS:0,gD:0,note:'Content',lastWarn:-999,dev:0,hint:''};S.towns.push(t);addB('hall',i,j,1);
  D4.forEach(([di,dj])=>{for(let q=1;q<=2;q++){const a=i+di*q,b=j+dj*q;if(!inb(a,b))continue;const k=ix(a,b);if((T[k]===T_LAND||T[k]===T_SAND||T[k]===T_RIVER)&&BD[k]<0&&(F[k]&F_LT)){R[k]=Math.max(R[k],1);Z[k]=0;F[k]&=~F_FOREST;touch(k)}}});
  let placed=false;for(let dj=-2;dj<=2;dj++)for(let di=-2;di<=2;di++){const a=i+di,b=j+dj;if(!inb(a,b))continue;const k=ix(a,b);if(!zoneable(k))continue;
    if(!D4.some(([x,y])=>inb(a+x,b+y)&&R[ix(a+x,b+y)]))continue;if(!placed){addB('house',a,b,1);placed=true}else Z[k]=1;touch(k)}
  log(`${nm} is founded.`,'good');toast(`${nm} founded`);NET.dirty=true;selectTown(S.towns.length-1)}
document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const k=e.key.toLowerCase();
  if(k==='escape'){if(PEND||VIEW.start>=0)clearPreview();else setTool('inspect')}
  else if(k===' '){e.preventDefault();S.speed=S.speed?0:1;updateTop()}
  else if(k==='r')setTool('road');else if(k==='t')setTool('rail');else if(k==='z')setTool('zone');else if(k==='x')setTool('bull');else if(k==='q')setTool('inspect');
  else if(k==='b')toggleDrawer();else if(k==='+'||k==='=')zoomAt(cw/2,ch/2,1.25);else if(k==='-')zoomAt(cw/2,ch/2,0.8);
  else if(k==='enter')doConfirm();
  else if(e.key.startsWith('Arrow')){const d=80;panBy(k==='arrowleft'?d:k==='arrowright'?-d:0,k==='arrowup'?d:k==='arrowdown'?-d:0)}});
