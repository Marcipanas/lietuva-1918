'use strict';
/* Lietuva 1918 — isometric renderer: camera, seasonal ground, fields, roads, rails, overlays, labels. */
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
let cw=0,ch=0,dpr=1,NOW=0;
const cam={x:0,y:2000,z:0.75,tx:null,ty:null,tz:null},ZMIN=0.08,ZMAX=2.2,CT=16,CHt=8;
let CACHE=null,COL=null,SKEY='';const SB={s:0,a:0};const LABELS=[];
const VIEW={sel:null,ghost:null,path:null,pathMode:null,start:-1,rect:null,rectMode:null,route:null};

function resize(){const r=cv.getBoundingClientRect();if(!r.width||!r.height)return;cw=r.width;ch=r.height;dpr=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr)}
function s2g(sx,sy){const wx=(sx-cw/2)/cam.z+cam.x,wy=(sy-ch/2)/cam.z+cam.y;return [wy/TH+wx/TW,wy/TH-wx/TW]}
function tileAt(sx,sy){const g=s2g(sx,sy),i=Math.floor(g[0]),j=Math.floor(g[1]);return inb(i,j)?ix(i,j):-1}
function clampCam(){cam.z=clamp(cam.z,ZMIN,ZMAX);cam.x=clamp(cam.x,-2900,2900);cam.y=clamp(cam.y,1100,3500)}
function focusTile(i,j,z){cam.tx=(i-j)*32;cam.ty=(i+j+1)*16;cam.tz=z||Math.max(cam.z,0.7)}
function zoomAt(sx,sy,f){const a=s2g(sx,sy);cam.z=clamp(cam.z*f,ZMIN,ZMAX);const b=s2g(sx,sy);cam.x+=((a[0]-a[1])-(b[0]-b[1]))*32;cam.y+=((a[0]+a[1])-(b[0]+b[1]))*16;cam.tx=null;clampCam()}
function panBy(dx,dy){cam.x-=dx/cam.z;cam.y-=dy/cam.z;cam.tx=null;clampCam()}
function animCam(dt){if(cam.tx===null)return;const f=Math.min(1,dt*7);cam.x+=(cam.tx-cam.x)*f;cam.y+=(cam.ty-cam.y)*f;cam.z+=(cam.tz-cam.z)*f;
  if(Math.abs(cam.tx-cam.x)<1&&Math.abs(cam.ty-cam.y)<1&&Math.abs(cam.tz-cam.z)<0.002)cam.tx=null;clampCam()}

/* ---------- seasonal ground colours and the zoomed-out cache ---------- */
function hx(c){const n=parseInt(c.slice(1),16);return [n>>16&255,n>>8&255,n&255]}
const PAL={land:hx('#89ae63'),fert:hx('#a6b764'),forest:hx('#5d8c4b'),bog:hx('#857f57'),clay:hx('#a59b6c'),sand:hx('#e3d4a4'),sea:hx('#3b7997'),lagoon:hx('#4b8eab'),
  lake:hx('#4f97b4'),river:hx('#5ea6c3'),foreign:hx('#aeb0a0')},SNW=hx('#edf2f5'),AUTC=hx('#b8a457'),ICE=hx('#d3e5ec');
const mix3=(a,b,f)=>[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f];
function tileCol(k){const t=T[k],f=F[k],i=ti_(k),j=tj_(k),wet=t===T_SEA||t===T_LAGOON||t===T_LAKE||t===T_RIVER;const n=wet?0.98+hash2(i,j,3)*0.04:0.93+hash2(i,j,11)*0.12;
  let c=t===T_FOREIGN?PAL.foreign:t===T_SEA?PAL.sea:t===T_LAGOON?PAL.lagoon:t===T_LAKE?PAL.lake:t===T_RIVER?PAL.river:t===T_SAND?PAL.sand:
    f&F_BOG?PAL.bog:f&F_FOREST?PAL.forest:f&F_FERTILE?PAL.fert:f&F_CLAY?PAL.clay:PAL.land;
  if(!wet&&SB.a)c=mix3(c,AUTC,f&F_FOREST?0.25:0.45);
  if(SB.s){if(t===T_LAKE||t===T_RIVER){if(SB.s===2)c=ICE}else if(t===T_LAGOON){if(SB.s===2)c=mix3(c,ICE,0.6)}else if(t!==T_SEA)c=mix3(c,SNW,(SB.s===2?0.9:hash2(i,j,9)<0.55?0.82:0.18)*(f&F_FOREST?0.75:1))}
  return `rgb(${Math.round(c[0]*n)},${Math.round(c[1]*n)},${Math.round(c[2]*n)})`}
function cachePt(gi,gj){return [(gi-gj)*CT/2+N*CT/2,(gi+gj)*CHt/2]}
function cacheTile(g,k){const i=ti_(k),j=tj_(k),[x,y]=cachePt(i,j);g.beginPath();g.moveTo(x,y);g.lineTo(x+CT/2,y+CHt/2);g.lineTo(x,y+CHt);g.lineTo(x-CT/2,y+CHt/2);g.closePath();
  g.fillStyle=COL[k];g.strokeStyle=COL[k];g.lineWidth=0.7;g.fill();g.stroke();if((F[k]&F_KR)&&S.kr){g.fillStyle='rgba(110,80,140,0.22)';g.fill()}}
function borderEdges(k,pt,out){const i=ti_(k),j=tj_(k);const ok=(a,b)=>!inb(a,b)||(F[ix(a,b)]&F_LT)||T[ix(a,b)]===T_SEA||T[ix(a,b)]===T_LAGOON;
  if(!ok(i+1,j))out.push([pt(i+1,j),pt(i+1,j+1)]);if(!ok(i-1,j))out.push([pt(i,j),pt(i,j+1)]);if(!ok(i,j+1))out.push([pt(i,j+1),pt(i+1,j+1)]);if(!ok(i,j-1))out.push([pt(i,j),pt(i+1,j)])}
function buildCache(){SB.s=SEASON.snow>0.75?2:SEASON.snow>0.3?1:0;SB.a=SEASON.aut>0.5?1:0;SKEY=SB.s+'-'+SB.a;
  COL=new Array(NN);for(let k=0;k<NN;k++)COL[k]=tileCol(k);if(!CACHE){CACHE=document.createElement('canvas');CACHE.width=N*CT;CACHE.height=N*CHt+2}
  const g=CACHE.getContext('2d');g.clearRect(0,0,CACHE.width,CACHE.height);for(let k=0;k<NN;k++)cacheTile(g,k);const E=[];for(let k=0;k<NN;k++)if(F[k]&F_LT)borderEdges(k,cachePt,E);
  g.strokeStyle='rgba(70,52,34,0.9)';g.lineWidth=1.4;g.setLineDash([3,2]);g.beginPath();E.forEach(([a,b])=>{g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1])});g.stroke();g.setLineDash([])}
tileHook=k=>{if(!CACHE)return;COL[k]=tileCol(k);cacheTile(CACHE.getContext('2d'),k)};
function drawCache(){const s=cam.z*TW/CT,o=P3(0,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(CACHE,o[0]-N*CT/2*s,o[1],CACHE.width*s,CACHE.height*s)}

/* ---------- per-tile passes ---------- */
function visRange(m){const c=[s2g(0,0),s2g(cw,0),s2g(0,ch+140*cam.z),s2g(cw,ch+140*cam.z)];let i0=1e9,i1=-1e9,j0=1e9,j1=-1e9;
  c.forEach(([a,b])=>{i0=Math.min(i0,a);i1=Math.max(i1,a);j0=Math.min(j0,b);j1=Math.max(j1,b)});
  return [Math.max(0,Math.floor(i0)-m),Math.min(N-1,Math.ceil(i1)+m),Math.max(0,Math.floor(j0)-m),Math.min(N-1,Math.ceil(j1)+m)]}
function onScr(i,j,below){const z=cam.z,x=((i-j)*32-cam.x)*z+cw/2,y=((i+j)*16-cam.y)*z+ch/2;return x>-40*z-20&&x<cw+40*z+20&&y>-40*z-20&&y<ch+(below||20)}
function diamond(i,j){const z=cam.z,x=((i-j)*32-cam.x)*z+cw/2,y=((i+j)*16-cam.y)*z+ch/2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+32*z,y+16*z);ctx.lineTo(x,y+32*z);ctx.lineTo(x-32*z,y+16*z);ctx.closePath()}
function groundPass(i0,i1,j0,j1){ctx.lineWidth=1;const E=[],pt=(a,b)=>P3(a,b,0);
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){if(!onScr(i,j))continue;const k=ix(i,j);diamond(i,j);ctx.fillStyle=COL[k];ctx.strokeStyle=COL[k];ctx.fill();ctx.stroke();
    if((F[k]&F_KR)&&S.kr){ctx.fillStyle='rgba(110,80,140,0.2)';ctx.fill()}
    const t=T[k];if((t===T_SEA||t===T_LAGOON||(t===T_LAKE&&SB.s<2))&&cam.z>=0.6&&hash2(i,j,5)<0.35){const ph=Math.sin(NOW/900+hash2(i,j,6)*6)*0.12,a=P3(i+0.3+ph,j+0.5,0),b=P3(i+0.6+ph,j+0.5,0);
      ctx.strokeStyle='rgba(255,255,255,0.25)';ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
    if(F[k]&F_LT)borderEdges(k,pt,E)}
  if(E.length){ctx.strokeStyle='rgba(70,52,34,0.85)';ctx.lineWidth=Math.max(1.2,2*cam.z);ctx.setLineDash([6*cam.z,4*cam.z]);ctx.beginPath();E.forEach(([a,b])=>{ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1])});ctx.stroke();ctx.setLineDash([])}}
/* crop colours: [summer A, summer B, autumn, winter], row colour */
const FIELD={farm:[['#d2b95c','#a8c36a','#8c6a45','#e6ebee'],'rgba(90,70,30,0.3)'],potato:[['#6f9a4a','#7aa452','#7a5a3a','#e6ebee'],'rgba(60,40,20,0.45)'],
  flax:[['#9db7e6','#a9c0ea','#c9b27a','#e6ebee'],'rgba(60,80,140,0.35)'],peat:[['#5e4a3a','#5e4a3a','#5e4a3a','#cfd3d2'],'rgba(35,25,18,0.55)'],dairy:[['#8fbf5f','#96c463','#b5ad5e','#e9eef1'],'rgba(255,255,255,0.18)']};
function fieldCol(b){const f=FIELD[b.t][0];return SB.s===2?f[3]:SB.a?f[2]:f[hash2(b.id,1,1)<0.5?0:1]}
function decalsZones(i0,i1,j0,j1){const z=cam.z;
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=ix(i,j);if(BD[k]<0&&!Z[k])continue;if(!onScr(i,j))continue;
    if(BD[k]>=0){const b=BMAP.get(BD[k]);if(!b||!FIELD[b.t])continue;diamond(i,j);ctx.fillStyle=fieldCol(b);ctx.fill();
      if(z>=0.25){ctx.strokeStyle=FIELD[b.t][1];ctx.lineWidth=Math.max(0.6,(b.t==='potato'?1.6:1)*z);ctx.beginPath();const rows=b.t==='potato'?5:4;
        for(let q=1;q<rows;q++){const a=P3(i,j+q/rows,0),c=P3(i+1,j+q/rows,0);ctx.moveTo(a[0],a[1]);ctx.lineTo(c[0],c[1]);if(b.t==='peat'){const d=P3(i+q/rows,j,0),e=P3(i+q/rows,j+1,0);ctx.moveTo(d[0],d[1]);ctx.lineTo(e[0],e[1])}}
        ctx.stroke()}}
    else{diamond(i,j);ctx.fillStyle='rgba(130,214,122,0.32)';ctx.fill();if(z>=0.35){ctx.setLineDash([3,3]);ctx.strokeStyle='rgba(56,140,60,0.75)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([])}}}}
function linkSegs(layer,i0,i1,j0,j1){const segs=[];
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=ix(i,j),lv=layer[k];if(!lv)continue;let con=0;
    for(const [di,dj] of D8){const ni=i+di,nj=j+dj;if(!inb(ni,nj))continue;const nk=ix(ni,nj);if(!layer[nk])continue;if(di&&dj&&(layer[ix(i+di,j)]||layer[ix(i,j+dj)]))continue;con++;
      const inside=ni>=i0&&ni<=i1&&nj>=j0&&nj<=j1;if(nk>k||!inside)segs.push([i,j,ni,nj,Math.min(lv,layer[nk]),T[k]===T_RIVER||T[nk]===T_RIVER])}
    if(!con)segs.push([i,j,i,j,lv,T[k]===T_RIVER])}return segs}
function seg(s){const a=P3(s[0]+0.5,s[1]+0.5,0),b=P3(s[2]+0.5,s[3]+0.5,0);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0]+(s[0]===s[2]&&s[1]===s[3]?0.5:0),b[1])}
function drawRoads(S0){if(!S0.length)return;const z=cam.z,W=[0,9,11,15],C=['',SB.s===2?'#ddd6c6':'#c4a678','#7a7671','#4c4c50'],O=['','#8f7752','#56534f','#2e2e32'];ctx.lineCap='round';ctx.lineJoin='round';
  const br=S0.filter(s=>s[5]);if(br.length){ctx.strokeStyle='#5d4934';ctx.lineWidth=Math.max(2.5,17*z);ctx.beginPath();br.forEach(seg);ctx.stroke()}
  for(let lv=1;lv<=3;lv++){const l=S0.filter(s=>s[4]===lv);if(!l.length)continue;ctx.strokeStyle=O[lv];ctx.lineWidth=Math.max(1.8,(W[lv]+3)*z);ctx.beginPath();l.forEach(seg);ctx.stroke();
    ctx.strokeStyle=C[lv];ctx.lineWidth=Math.max(1.1,W[lv]*z);ctx.beginPath();l.forEach(seg);ctx.stroke();
    if(lv>=2&&z>=0.7){ctx.strokeStyle='rgba(255,255,255,0.6)';ctx.lineWidth=Math.max(0.6,z);ctx.setLineDash([4*z,5*z]);ctx.beginPath();l.forEach(seg);ctx.stroke();ctx.setLineDash([])}}}
function drawRails(S0){if(!S0.length)return;const z=cam.z;ctx.lineCap='butt';ctx.lineJoin='round';
  const br=S0.filter(s=>s[5]);if(br.length){ctx.strokeStyle='#5d4934';ctx.lineWidth=Math.max(2.5,15*z);ctx.beginPath();br.forEach(seg);ctx.stroke()}
  if(z<0.35){ctx.strokeStyle='#3b322e';ctx.lineWidth=Math.max(2.2,4*z);ctx.beginPath();S0.forEach(seg);ctx.stroke();ctx.strokeStyle='#f3ecd9';ctx.lineWidth=Math.max(1,2*z);
    ctx.setLineDash([4,4]);ctx.beginPath();S0.forEach(seg);ctx.stroke();ctx.setLineDash([]);return}
  ctx.strokeStyle=SB.s===2?'#c9ccc9':'#8f8779';ctx.lineWidth=10*z;ctx.beginPath();S0.forEach(seg);ctx.stroke();
  ctx.strokeStyle='#5b4636';ctx.lineWidth=8*z;ctx.setLineDash([1.8*z,3.4*z]);ctx.beginPath();S0.forEach(seg);ctx.stroke();ctx.setLineDash([]);
  ctx.lineWidth=Math.max(0.8,1.3*z);S0.forEach(s=>{const a=P3(s[0]+0.5,s[1]+0.5,0),b=P3(s[2]+0.5,s[3]+0.5,0),dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nx=-dy/l*2.4*z,ny=dx/l*2.4*z;
    ctx.strokeStyle=s[4]>=2?'#bcd6ea':'#dadcde';ctx.beginPath();ctx.moveTo(a[0]+nx,a[1]+ny);ctx.lineTo(b[0]+nx,b[1]+ny);ctx.moveTo(a[0]-nx,a[1]-ny);ctx.lineTo(b[0]-nx,b[1]-ny);ctx.stroke()})}

/* ---------- overlays, previews, selection, labels ---------- */
function tint(k,col){diamond(ti_(k),tj_(k));ctx.fillStyle=col;ctx.fill()}
function polluterTool(){return typeof TOOL!=='undefined'&&(TOOL.k==='zone'||(TOOL.k==='place'&&(BT[TOOL.bt].pol||BT[TOOL.bt].svc)))}
function drawOverlays(i0,i1,j0,j1){
  if(polluterTool()){for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=ix(i,j),p=POL[k];if(p>0.15&&onScr(i,j))tint(k,`rgba(115,72,40,${Math.min(0.5,p*0.18)})`)}}
  const r=VIEW.route!=null?S.routes.find(x=>x.id===VIEW.route):null;if(r){const p=routePath(r);if(p){ctx.lineCap='round';ctx.lineJoin='round';
    const pts=p.path.map(k=>P3(ti_(k)+0.5,tj_(k)+0.5,0));[['rgba(242,169,59,0.35)',12],['#f2a93b',4]].forEach(([c,w0])=>{ctx.strokeStyle=c;ctx.lineWidth=w0;ctx.beginPath();pts.forEach((q,n)=>n?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.stroke()});
    [pts[0],pts[pts.length-1]].forEach(q=>{ctx.fillStyle='#f2a93b';ctx.beginPath();ctx.arc(q[0],q[1],6,0,6.283);ctx.fill();ctx.fillStyle='#2a1903';ctx.beginPath();ctx.arc(q[0],q[1],2.5,0,6.283);ctx.fill()})}}}
function drawPreviews(){const z=cam.z;
  if(VIEW.rect)VIEW.rect.forEach(k=>tint(k,VIEW.rectMode==='bull'?'rgba(239,123,88,0.4)':'rgba(120,220,120,0.4)'));
  if(VIEW.path){VIEW.path.forEach(k=>tint(k,VIEW.pathOk===false?'rgba(239,123,88,0.45)':'rgba(242,169,59,0.45)'));
    ctx.strokeStyle=VIEW.pathMode==='rail'?'#3b322e':'#8f7752';ctx.lineWidth=Math.max(2,6*z);ctx.lineCap='round';ctx.beginPath();
    VIEW.path.forEach((k,n)=>{const p=P3(ti_(k)+0.5,tj_(k)+0.5,0);n?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])});ctx.stroke()}
  if(VIEW.start>=0){diamond(ti_(VIEW.start),tj_(VIEW.start));ctx.strokeStyle='#f2a93b';ctx.lineWidth=2.5;ctx.stroke()}}
function drawGhost(){const g=VIEW.ghost;if(!g)return;const s=bSize(g.t);for(let a=0;a<s;a++)for(let c=0;c<s;c++)if(inb(g.i+a,g.j+c))tint(ix(g.i+a,g.j+c),g.ok?'rgba(120,220,120,0.45)':'rgba(239,123,88,0.5)');
  if(BT[g.t].pol){const p=P3(g.i+s/2,g.j+s/2,0),rx=5*32*cam.z*1.41;ctx.strokeStyle='rgba(160,90,40,0.8)';ctx.setLineDash([6,5]);ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p[0],p[1],rx,rx/2,0,0,6.283);ctx.stroke();ctx.setLineDash([])}
  ctx.globalAlpha=0.7;drawBuilding({id:9e6,t:g.t,i:g.i,j:g.j,lv:1,eff:1,town:-2,na:''});ctx.globalAlpha=1}
function drawSel(){const s=VIEW.sel;if(!s)return;const pulse=0.6+0.4*Math.sin(NOW/250);ctx.strokeStyle=`rgba(242,169,59,${pulse})`;ctx.lineWidth=2.5;
  if(s.kind==='b'){const b=BMAP.get(s.id);if(!b)return;const n=bSize(b.t),pts=[P3(b.i,b.j,0),P3(b.i+n,b.j,0),P3(b.i+n,b.j+n,0),P3(b.i,b.j+n,0)];
    ctx.beginPath();pts.forEach((p,q)=>q?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.stroke()}
  else if(s.kind==='t'){const t=S.towns[s.ti];if(!t)return;const p=P3(t.i+0.5,t.j+0.5,0),rx=COMMUTE*32*cam.z*1.41;ctx.setLineDash([8,6]);ctx.beginPath();ctx.ellipse(p[0],p[1],rx,rx/2,0,0,6.283);ctx.stroke();ctx.setLineDash([])}}
let CLOUD=null;function cloudSprite(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(15,30,25,0.16)');gr.addColorStop(0.6,'rgba(15,30,25,0.08)');gr.addColorStop(1,'rgba(15,30,25,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return c}
function drawClouds(){if(!CLOUD)CLOUD=cloudSprite();const t=NOW/1000;for(let q=0;q<7;q++){const wx=((q*1700+t*(14+q*3))%7000)-3500,wy=1200+((q*913)%2300),p=[(wx-cam.x)*cam.z+cw/2,(wy-cam.y)*cam.z+ch/2],
  r=(520+q*90)*cam.z;if(p[0]<-r||p[0]>cw+r||p[1]<-r||p[1]>ch+r)continue;ctx.drawImage(CLOUD,p[0]-r,p[1]-r*0.55,r*2,r*1.1)}}
function drawLabels(){LABELS.length=0;const z=cam.z;ctx.textBaseline='middle';
  if(z<0.32){ctx.textAlign='center';NLAB.forEach(([s,lo,la])=>{const [i,j]=llTile(lo,la),p=P3(i,j,0);ctx.save();ctx.letterSpacing='4px';
    if(s==='BALTIJOS JŪRA'){ctx.fillStyle='rgba(230,240,245,0.6)';ctx.font='italic 13px Spectral, Georgia, serif'}else{ctx.fillStyle='rgba(40,50,45,0.45)';ctx.font='600 12px "Josefin Sans", sans-serif'}
    ctx.fillText(s,p[0],p[1]);ctx.restore()})}
  S.towns.forEach((t,ti)=>{const p=P3(t.i+0.5,t.j+0.5,0),y=p[1]-Math.max(20,(t.cap?118:96)*z),sb=VIEW.sel&&VIEW.sel.kind==='b'?BMAP.get(VIEW.sel.id):null,sel=VIEW.sel&&((VIEW.sel.kind==='t'&&VIEW.sel.ti===ti)||(sb&&sb.town===ti));
    const name=t.n.toUpperCase(),sub=t.lock?'1923':popStr(t.pop),bad=!t.lock&&(t.note==='Hungry'||t.note==='Cold homes'),good=!t.lock&&t.note==='Thriving',dot=bad||good;
    ctx.font=`700 ${t.cap?13:12}px "Josefin Sans", sans-serif`;ctx.letterSpacing='1.2px';const w1=ctx.measureText(name).width;ctx.letterSpacing='0px';ctx.font='500 11px Jost, sans-serif';
    const w2=ctx.measureText(sub).width,W=w1+w2+24+(dot?10:0),H=22,x=p[0]-W/2;
    ctx.fillStyle=sel?'rgba(242,169,59,0.95)':t.lock?'rgba(30,40,38,0.6)':'rgba(15,33,29,0.86)';ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y-H/2,W,H,11):ctx.rect(x,y-H/2,W,H);ctx.fill();
    let tx=x+9;if(dot){ctx.fillStyle=bad?'#ef7b58':'#8fd19e';ctx.beginPath();ctx.arc(tx+3,y,3.5,0,6.283);ctx.fill();tx+=10}
    ctx.textAlign='left';ctx.font=`700 ${t.cap?13:12}px "Josefin Sans", sans-serif`;ctx.letterSpacing='1.2px';ctx.fillStyle=sel?'#2a1903':t.lock?'#b9c4bd':'#f1ead8';ctx.fillText(name,tx,y+1);ctx.letterSpacing='0px';
    ctx.font='500 11px Jost, sans-serif';ctx.fillStyle=sel?'rgba(42,25,3,0.75)':'rgba(241,234,216,0.7)';ctx.fillText(sub,tx+6+w1,y+1);LABELS.push({x,y:y-H/2,w:W,h:H,ti})});
  ctx.textBaseline='alphabetic'}
function labelAt(sx,sy){for(let n=LABELS.length-1;n>=0;n--){const l=LABELS[n];if(sx>=l.x&&sx<=l.x+l.w&&sy>=l.y&&sy<=l.y+l.h)return l.ti}return -1}

/* ---------- frame ---------- */
function draw(dt){NOW=performance.now();if(!cw||!S)return;SEASON=seasonOf(S.day);const key=(SEASON.snow>0.75?2:SEASON.snow>0.3?1:0)+'-'+(SEASON.aut>0.5?1:0);if(!COL||key!==SKEY)buildCache();
  animCam(dt);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0f1f1b';ctx.fillRect(0,0,cw,ch);
  const z=cam.z,[i0,i1,j0,j1]=visRange(3);
  if(z<0.5)drawCache();else groundPass(i0,i1,j0,j1);
  decalsZones(i0,i1,j0,j1);drawRoads(linkSegs(R,i0,i1,j0,j1));drawRails(linkSegs(L,i0,i1,j0,j1));drawOverlays(i0,i1,j0,j1);drawPreviews();
  const B0=z>=0.45?bucketAgents():null,trees=z>=0.3,below=150*z+20;
  for(let s=i0+j0;s<=i1+j1;s++){const ia=Math.max(i0,s-j1),ib=Math.min(i1,s-j0);
    for(let i=ia;i<=ib;i++){const j=s-i;if(!onScr(i,j,below))continue;const k=ix(i,j),id=ANCH[k];
      if(id>=0){const b=BMAP.get(id);if(b)drawBuilding(b)}else if(trees&&(F[k]&F_FOREST)&&BD[k]<0&&!R[k]&&!L[k])drawTrees(i,j)}
    if(B0){const a=B0.get(s);if(a)a.forEach(drawAgent)}}
  if(!B0&&VEH.length){VEH.forEach(v=>{const [gi,gj]=pathPos(v.path,v.u),p=P3(gi,gj,0);ctx.fillStyle=v.r.mode==='rail'?'#fff3c4':'#ffe0a0';ctx.fillRect(p[0]-2,p[1]-2,4,4)})}
  drawClouds();drawSel();drawGhost();drawLabels()}
