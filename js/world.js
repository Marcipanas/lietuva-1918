'use strict';
/* Lietuva 1918 — the tile world: terrain, placement rules, pathfinding, network analysis. */
const NN=N*N, F_LT=64;
const T=new Uint8Array(NN), F=new Uint8Array(NN), R=new Uint8Array(NN), L=new Uint8Array(NN), Z=new Uint8Array(NN);
const BD=new Int32Array(NN).fill(-1), ANCH=new Int32Array(NN).fill(-1), BMAP=new Map();
const D4=[[1,0],[-1,0],[0,1],[0,-1]], D8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const ix=(i,j)=>j*N+i, inb=(i,j)=>i>=0&&j>=0&&i<N&&j<N, ti_=k=>k%N, tj_=k=>(k/N)|0;
let tileHook=null; // set by the renderer to refresh cached ground tiles
function touch(k){if(tileHook)tileHook(k)}

/* projection: lon/lat → km (u east, v south) → fractional grid coords */
function ll2uv(lon,lat){return [(lon-LON0)*KMX,(LAT1-lat)*KMY]}
function uv2g(u,v){const a=(u-MAPU/2)/DK,b=(v+MAPU/2)/DK;return [(a+b)/2,(b-a)/2]}
function g2uv(gi,gj){return [(gi-gj)*DK+MAPU/2,(gi+gj)*DK-MAPU/2]}
function tileLL(i,j){const [u,v]=g2uv(i+0.5,j+0.5);return [u/KMX+LON0,LAT1-v/KMY]}
function llTile(lon,lat){const g=uv2g(...ll2uv(lon,lat));return [Math.floor(g[0]),Math.floor(g[1])]}
function tileUV(k){return g2uv(ti_(k)+0.5,tj_(k)+0.5)}
function stamp(pts,step,fn){for(let s=0;s<pts.length-1;s++){const a=ll2uv(...pts[s]),b=ll2uv(...pts[s+1]),d=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(d/step));
  for(let q=0;q<=n;q++){const u=a[0]+(b[0]-a[0])*q/n,v=a[1]+(b[1]-a[1])*q/n,g=uv2g(u,v),i=Math.floor(g[0]),j=Math.floor(g[1]);if(inb(i,j))fn(ix(i,j))}}}
function nearKm(k,lon,lat,r){const [u,v]=tileUV(k),c=ll2uv(lon,lat),d=Math.hypot(u-c[0],v-c[1]);return d<r?1-d/r:-1}

function genTerrain(){
  T.fill(0);F.fill(0);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=ix(i,j),[lo,la]=tileLL(i,j);
    if(pip(SEA,lo,la))T[k]=T_SEA;else if(pip(LAG,lo,la))T[k]=T_LAGOON;
    else if(pip(LT,lo,la)){T[k]=T_LAND;F[k]|=F_LT;if(pip(KR,lo,la))F[k]|=F_KR}}
  stamp(SPIT,0.4,k=>{if(T[k]===T_SEA||T[k]===T_LAGOON){const la=tileLL(ti_(k),tj_(k))[1];if(la>55.28){T[k]=T_SAND;F[k]|=F_LT|F_KR}else T[k]=T_FOREIGN}});
  for(let k=0;k<NN;k++){if(T[k]!==T_LAND)continue;const i=ti_(k),j=tj_(k);
    if(tileLL(i,j)[1]>55.74&&D4.some(([a,b])=>inb(i+a,j+b)&&T[ix(i+a,j+b)]===T_SEA))T[k]=T_SAND}
  RIV.forEach(r=>stamp(r.p,0.5,k=>{if(T[k]===T_LAND||T[k]===T_FOREIGN||T[k]===T_SAND)T[k]=T_RIVER}));
  LAKES.forEach(([lo,la,rx,ry,rot])=>{const c=ll2uv(lo,la),[ci,cj]=llTile(lo,la),rr=Math.ceil((Math.max(rx,ry)+4)/DK),cs=Math.cos(-rot*Math.PI/180),sn=Math.sin(-rot*Math.PI/180);
    for(let dj=-rr;dj<=rr;dj++)for(let di=-rr;di<=rr;di++){const i=ci+di,j=cj+dj;if(!inb(i,j))continue;const k=ix(i,j);if(T[k]!==T_LAND)continue;
      const [u,v]=tileUV(k),x=u-c[0],y=v-c[1],xr=x*cs-y*sn,yr=x*sn+y*cs;if((xr/rx)**2+(yr/ry)**2<=1||(di===0&&dj===0))T[k]=T_LAKE}});
  const land=[];
  for(let k=0;k<NN;k++){if(!(F[k]&F_LT))continue;
    FIELDS.forEach(([lo,la,r])=>{if(nearKm(k,lo,la,r*85)>0)F[k]|=F_FERTILE});
    FLAXR.forEach(([lo,la,r])=>{if(nearKm(k,lo,la,r)>0)F[k]|=F_FLAX});
    if(T[k]===T_LAND)land.push(k)}
  const score=new Float32Array(NN);
  land.forEach(k=>{const i=ti_(k),j=tj_(k);let s=vnoise(i/7,j/7,3)*0.65+vnoise(i/2.6,j/2.6,5)*0.35;
    FOR.forEach(([lo,la,r])=>{const q=nearKm(k,lo,la,r*95);if(q>0)s+=0.38*q});if(F[k]&F_FERTILE)s-=0.22;score[k]=s});
  const sorted=land.map(k=>score[k]).sort((a,b)=>a-b),thr=sorted[Math.floor(sorted.length*0.66)];
  land.forEach(k=>{if(score[k]>=thr)F[k]|=F_FOREST});
  for(let k=0;k<NN;k++){if(T[k]!==T_LAND&&T[k]!==T_SAND)continue;if(!(F[k]&F_LT))continue;
    BOGS.forEach(([lo,la,r])=>{if(nearKm(k,lo,la,r)>0&&T[k]===T_LAND){F[k]|=F_BOG;F[k]&=~F_FOREST}});
    CLAYS.forEach(([lo,la,r])=>{if(nearKm(k,lo,la,r)>0)F[k]|=F_CLAY})}
}

/* ---------- buildings ---------- */
function bSize(t){return BT[t].sz||1}
function occupy(b){BMAP.set(b.id,b);const s=bSize(b.t);for(let a=0;a<s;a++)for(let c=0;c<s;c++){const k=ix(b.i+a,b.j+c);BD[k]=b.id;Z[k]=0;
  if(b.t!=='forestry'&&(F[k]&F_FOREST)){F[k]&=~F_FOREST;touch(k)}}ANCH[ix(b.i+s-1,b.j+s-1)]=b.id}
function addB(t,i,j,lv){const b={id:S.nid++,t,i,j,lv:lv||1,on:true,eff:0,why:'Starting',town:-1,cd:0,k:1};S.bld.push(b);occupy(b);NET.dirty=true;return b}
function removeB(b){const s=bSize(b.t);for(let a=0;a<s;a++)for(let c=0;c<s;c++)BD[ix(b.i+a,b.j+c)]=-1;ANCH[ix(b.i+s-1,b.j+s-1)]=-1;
  BMAP.delete(b.id);const n=S.bld.indexOf(b);if(n>=0)S.bld.splice(n,1);NET.dirty=true}
function rebuildIndex(){BD.fill(-1);ANCH.fill(-1);BMAP.clear();S.bld.forEach(occupy)}
function bAt(k){return BD[k]>=0?BMAP.get(BD[k]):null}
function adjAny(i,j,s,test){for(let a=-1;a<=s;a++)for(let c=-1;c<=s;c++){const edge=a===-1||a===s||c===-1||c===s,corner=(a===-1||a===s)&&(c===-1||c===s);
  if(!edge||corner)continue;const ii=i+a,jj=j+c;if(inb(ii,jj)&&test(ix(ii,jj)))return true}return false}
function krLocked(k){return (F[k]&F_KR)&&S.kr}
function validPlace(t,i,j,gen){
  const B0=BT[t],s=bSize(t);if(!gen&&B0.era>S.era)return {ok:false,why:`Unlocks in the ${ERAS[B0.era].n} era`};
  let fert=0,flx=0,bog=0,clay=0,forest=0;
  for(let a=0;a<s;a++)for(let c=0;c<s;c++){const ii=i+a,jj=j+c;if(!inb(ii,jj))return {ok:false,why:'Off the map'};const k=ix(ii,jj),tt=T[k];
    if(!(F[k]&F_LT))return {ok:false,why:'Outside Lithuania'};
    if(BD[k]>=0)return {ok:false,why:'Something is already built here'};
    if(R[k]||L[k])return {ok:false,why:'A road or track is in the way'};
    if(gen&&Z[k])return {ok:false,why:'zone'};
    if(!gen&&krLocked(k))return {ok:false,why:'The Klaipėda Region joins Lithuania in 1923'};
    if(B0.need==='river'){if(tt!==T_RIVER)return {ok:false,why:'Must be built across a river'}}
    else if(tt!==T_LAND&&tt!==T_SAND)return {ok:false,why:'Cannot build on water'};
    if(F[k]&F_FERTILE)fert++;if(F[k]&F_FLAX)flx++;if(F[k]&F_BOG)bog++;if(F[k]&F_CLAY)clay++;if(F[k]&F_FOREST)forest++}
  switch(B0.need){
    case 'forest':if(!forest)return {ok:false,why:'Needs a forest tile'};break;
    case 'bog':if(bog<2)return {ok:false,why:'Needs peat bog under it'};break;
    case 'clay':if(!clay)return {ok:false,why:'Needs clay ground'};break;
    case 'open':if(bog)return {ok:false,why:'Too wet: this is bog'};break;
    case 'rail':if(!gen&&!adjAny(i,j,s,k=>L[k]>0))return {ok:false,why:'Must be next to a railway track'};break;
    case 'coast':if(!adjAny(i,j,s,k=>T[k]===T_SEA||T[k]===T_LAGOON))return {ok:false,why:'Must be on the coast'};break;
    case 'lake':if(!adjAny(i,j,s,k=>T[k]===T_LAKE))return {ok:false,why:'Must be next to a lake'};break;
    case 'water':if(!adjAny(i,j,s,k=>T[k]===T_SEA||T[k]===T_LAGOON||T[k]===T_LAKE||T[k]===T_RIVER))return {ok:false,why:'Must be on a shore'};break;
  }
  if(t==='hall'){for(const tw of S.towns)if(Math.max(Math.abs(tw.i-i),Math.abs(tw.j-j))<9)return {ok:false,why:`Too close to ${tw.n}`}}
  return {ok:true,bonus:(B0.bonus==='fertile'&&fert>=2)||(B0.bonus==='flaxland'&&flx>=2)};
}

/* ---------- pathfinding (A*, 8 directions) ---------- */
const GB=new Float32Array(NN),PAR=new Int32Array(NN),STAMP=new Uint32Array(NN),QBUF=new Int32Array(NN),DST2=new Int32Array(NN);let stampN=1;
function stepCost(k,mode,gen){const t=T[k];if(!(F[k]&F_LT)||t===T_SEA||t===T_LAGOON||t===T_LAKE||BD[k]>=0)return Infinity;
  if(!gen&&krLocked(k))return Infinity;
  if(mode==='road'&&R[k])return 0.35;if(mode==='rail'&&L[k])return 0.35;
  let c=1;if(t===T_RIVER)c=BRIDGE*1.4;if(F[k]&F_FOREST)c+=0.3;if(F[k]&F_BOG)c+=0.8;if(Z[k])c+=2;if(mode==='rail'&&R[k])c+=1.5;if(mode==='road'&&L[k])c+=1.5;return c}
function findPath(a,b,mode,gen){
  if(a===b)return [a];if(stepCost(a,mode,gen)===Infinity||stepCost(b,mode,gen)===Infinity)return null;
  stampN++;const hk=[],hv=[];const push=(k,f)=>{hk.push(f);hv.push(k);let n=hk.length-1;while(n>0){const p=(n-1)>>1;if(hk[p]<=hk[n])break;[hk[p],hk[n]]=[hk[n],hk[p]];[hv[p],hv[n]]=[hv[n],hv[p]];n=p}};
  const pop=()=>{const v=hv[0],lk=hk.pop(),lv=hv.pop();if(hk.length){hk[0]=lk;hv[0]=lv;let n=0;for(;;){const l=2*n+1,r=l+1;let m=n;if(l<hk.length&&hk[l]<hk[m])m=l;if(r<hk.length&&hk[r]<hk[m])m=r;if(m===n)break;[hk[m],hk[n]]=[hk[n],hk[m]];[hv[m],hv[n]]=[hv[n],hv[m]];n=m}}return v};
  const bi=ti_(b),bj=tj_(b),h=k=>{const dx=Math.abs(ti_(k)-bi),dy=Math.abs(tj_(k)-bj);return (Math.max(dx,dy)+0.414*Math.min(dx,dy))*0.6};
  STAMP[a]=stampN;GB[a]=0;PAR[a]=-1;push(a,h(a));let exp=0;
  while(hk.length&&exp<80000){const k=pop();exp++;if(k===b)break;const i=ti_(k),j=tj_(k),g=GB[k];
    for(const [di,dj] of D8){const ni=i+di,nj=j+dj;if(!inb(ni,nj))continue;const nk=ix(ni,nj);let c=stepCost(nk,mode,gen);if(c===Infinity)continue;
      if(di&&dj){if(BD[ix(i+di,j)]>=0&&BD[ix(i,j+dj)]>=0)continue;c*=1.414}
      const ng=g+c;if(STAMP[nk]===stampN&&GB[nk]<=ng)continue;STAMP[nk]=stampN;GB[nk]=ng;PAR[nk]=k;push(nk,ng+h(nk))}}
  if(STAMP[b]!==stampN)return null;const p=[];for(let k=b;k>=0;k=PAR[k])p.push(k);return p.reverse();
}
function roadLevel(){return S.era>=3?3:S.era>=2?2:1}
function railLevel(){return S.era>=3?2:1}
function lineCost(path,mode){const lv=mode==='road'?roadLevel():railLevel(),spec=(mode==='road'?ROADT:RAILT)[lv],mk=Object.keys(spec.mat)[0];
  let lt=0,mat=0,n=0,br=0;path.forEach(k=>{const cur=mode==='road'?R[k]:L[k];if(cur>=lv)return;const m=T[k]===T_RIVER?BRIDGE:1,f=cur?0.6:1;if(m>1)br++;
    lt+=spec.lt*m*f;mat+=spec.mat[mk]*m*f;n++});return {cost:{lt:Math.round(lt),[mk]:Math.ceil(mat)},n,br,lv,spec}}
function applyLine(path,mode,lv){path.forEach(k=>{if(mode==='road'){if(R[k]<lv)R[k]=lv}else if(L[k]<lv)L[k]=lv;Z[k]=0;if(F[k]&F_FOREST)F[k]&=~F_FOREST;touch(k)});NET.dirty=true}
function rectTiles(a,b){const out=[],i0=Math.min(ti_(a),ti_(b)),i1=Math.max(ti_(a),ti_(b)),j0=Math.min(tj_(a),tj_(b)),j1=Math.max(tj_(a),tj_(b));
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++)out.push(ix(i,j));return out}
function zoneable(k){return (F[k]&F_LT)&&(T[k]===T_LAND||T[k]===T_SAND)&&BD[k]<0&&!R[k]&&!L[k]&&!Z[k]&&!krLocked(k)}
function applyZone(tiles){let n=0;tiles.forEach(k=>{if(zoneable(k)){Z[k]=1;touch(k);n++}});return n}
function bullInfo(tiles){const b=new Set();let r=0,l=0,z=0;tiles.forEach(k=>{const x=bAt(k);if(x&&x.t!=='hall')b.add(x);if(R[k]&&!(x&&x.t==='hall'))r++;if(L[k])l++;if(Z[k])z++});return {b,r,l,z}}
function applyBull(tiles){const inf=bullInfo(tiles);inf.b.forEach(removeB);tiles.forEach(k=>{if(R[k]||L[k]||Z[k]){R[k]=0;L[k]=0;Z[k]=0;touch(k)}});NET.dirty=true;return inf}

/* ---------- 1918 world ---------- */
function nearestTown(i,j,activeOnly){let best=-1,bd=1e9;S.towns.forEach((t,n)=>{if(activeOnly&&t.lock)return;const d=Math.hypot(t.i-i,t.j-j);if(d<bd){bd=d;best=n}});return best}
function connectTo(b,t){const s=bSize(b.t);let st=-1,sd=1e9;
  for(let a=-1;a<=s;a++)for(let c=-1;c<=s;c++){const ii=b.i+a,jj=b.j+c;if(!inb(ii,jj)||(a>=0&&a<s&&c>=0&&c<s))continue;if((a===-1||a===s)&&(c===-1||c===s))continue;
    const k=ix(ii,jj);if(R[k]){st=-2;break}if(stepCost(k,'road',true)===Infinity)continue;const d=Math.hypot(ii-t.i,jj-t.j);if(d<sd){sd=d;st=k}}
  if(st<0)return;const hs=hallSeeds(t);if(!hs.length)return;const p=findPath(st,hs[0],'road',true);if(p)applyLine(p,'road',1)}
function placeNear(ti,type){const t=S.towns[ti];
  for(let r=2;r<=COMMUTE-3;r++){const cand=[];for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;
      if(validPlace(type,t.i+di,t.j+dj,true).ok)cand.push([t.i+di,t.j+dj])}
    if(cand.length){const [i,j]=cand[Math.floor(hash2(ti,r,type.length)*cand.length)];const b=addB(type,i,j,1);connectTo(b,t);return b}}
  const need=BT[type].need,bit=need==='forest'?F_FOREST:need==='bog'?F_BOG:need==='clay'?F_CLAY:0;
  for(let r=3;r<=10&&bit;r++)for(const [di,dj] of [[r,0],[0,r],[-r,0],[0,-r],[r,r],[-r,-r]]){const i=t.i+di,j=t.j+dj,s=bSize(type);let ok=true;
    for(let a=0;a<s;a++)for(let c=0;c<s;c++){const k=ix(i+a,j+c);if(!inb(i+a,j+c)||T[k]!==T_LAND||BD[k]>=0||R[k]||L[k]||Z[k]||!(F[k]&F_LT))ok=false}
    if(!ok)continue;for(let a=0;a<s;a++)for(let c=0;c<s;c++){const k=ix(i+a,j+c);F[k]|=bit;if(bit===F_BOG)F[k]&=~F_FOREST}
    const b=addB(type,i,j,1);connectTo(b,t);return b}
  return null}
function layoutTown(t,pop,seed){
  let ci=t.i,cj=t.j;if(!(T[ix(ci,cj)]===T_LAND||T[ix(ci,cj)]===T_SAND)){outer:for(let r=1;r<4;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){const k=ix(ci+di,cj+dj);
    if(T[k]===T_LAND||T[k]===T_SAND){ci+=di;cj+=dj;break outer}}t.i=ci;t.j=cj}
  const need=Math.ceil(pop*1.05/HOUSE.cap[1]),zoneN=Math.max(5,Math.ceil(need*0.6)),Rs=Math.max(2,Math.ceil(Math.sqrt((need+zoneN)*0.72)));
  const hall=addB('hall',ci,cj,1);
  for(let dj=-Rs;dj<=Rs;dj++)for(let di=-Rs;di<=Rs;di++){if(di*di+dj*dj>Rs*Rs+1)continue;if(di%3!==0&&dj%3!==0)continue;const i=ci+di,j=cj+dj;if(!inb(i,j))continue;const k=ix(i,j);
    if(BD[k]>=0||!(F[k]&F_LT))continue;if(T[k]===T_LAND||T[k]===T_SAND||T[k]===T_RIVER){R[k]=1;if(F[k]&F_FOREST)F[k]&=~F_FOREST}}
  const cand=[];for(let dj=-Rs-1;dj<=Rs+1;dj++)for(let di=-Rs-1;di<=Rs+1;di++){const i=ci+di,j=cj+dj;if(!inb(i,j))continue;const k=ix(i,j);
    if(BD[k]>=0||R[k]||!(F[k]&F_LT)||(T[k]!==T_LAND&&T[k]!==T_SAND))continue;if(!D4.some(([a,b])=>inb(i+a,j+b)&&R[ix(i+a,j+b)]))continue;
    cand.push([k,Math.hypot(di,dj)+hash2(i,j,seed)*1.2])}
  cand.sort((a,b)=>a[1]-b[1]);
  cand.forEach(([k],n)=>{if(n<need)addB('house',ti_(k),tj_(k),1);else if(n<need+zoneN)Z[k]=1});
}
function railBetween(a,b){const A=S.towns.find(t=>t.id===a),B2=S.towns.find(t=>t.id===b);
  const stA=stationFor(A,B2),stB=stationFor(B2,A);if(!stA||!stB)return;
  const from=freeAdj(stA,B2),to=freeAdj(stB,A);if(from<0||to<0)return;const p=findPath(from,to,'rail',true);if(p)applyLine(p,'rail',1)}
function stationFor(t,other){let st=S.bld.find(x=>x.t==='station'&&nearestTown(x.i,x.j)===S.towns.indexOf(t));if(st)return st;
  const ang=Math.atan2(other.j-t.j,other.i-t.i);
  for(let r=4;r<10;r++)for(let d=0;d<7;d++){const a2=ang+(d%2?1:-1)*Math.ceil(d/2)*0.3,i=Math.round(t.i+Math.cos(a2)*r),j=Math.round(t.j+Math.sin(a2)*r);
    if(validPlace('station',i,j,true).ok){const s=addB('station',i,j,1);connectTo(s,t);return s}}
  return null}
function freeAdj(b,toward){let best=-1,bd=1e9;D4.forEach(([di,dj])=>{const i=b.i+di,j=b.j+dj;if(!inb(i,j))return;const k=ix(i,j);if(stepCost(k,'rail',true)===Infinity)return;
  const d=Math.hypot(i-toward.i,j-toward.j)+(R[k]?3:0);if(d<bd){bd=d;best=k}});return best}
function roadBetween(a,b){const A=S.towns.find(t=>t.id===a),B2=S.towns.find(t=>t.id===b),sa=hallSeeds(A),sb=hallSeeds(B2);if(!sa.length||!sb.length)return;
  const p=findPath(sa[0],sb[0],'road',true);if(p)applyLine(p,'road',1)}
function genWorld(){
  genTerrain();R.fill(0);L.fill(0);Z.fill(0);BD.fill(-1);ANCH.fill(-1);BMAP.clear();S.towns=[];S.bld=[];
  TOWNS0.forEach(d=>{const [i,j]=llTile(d.lon,d.lat);S.towns.push({id:d.id,n:d.n,reg:d.reg,cap:d.cap||0,orig:1,lock:d.lock?1:0,i,j,d:d.d,
    pop:d.lock?0:d.pop,pop0:d.pop,h:62,stock:{...d.st},dl:{},dem:{},house:0,wf:0,jobs:0,fill:1,pm:1,powS:0,powD:0,pr:1,gS:0,gD:0,note:'Content',lastWarn:-999,dev:0,hint:''})});
  S.towns.forEach((t,n)=>layoutTown(t,TOWNS0[n].pop,n+3));
  HIST_RAIL.forEach(([a,b])=>railBetween(a,b));
  TOWNS0.forEach((d,n)=>d.ind.forEach(type=>placeNear(n,type)));
  HIST_ROAD.forEach(([a,b])=>roadBetween(a,b));
  NET.dirty=true;
}

/* ---------- network analysis: which buildings belong to which town, and how towns are linked ---------- */
const NET={dirty:true,own:new Int16Array(NN),dst:new Int16Array(NN),edges:[],adj:[],roadN:0,railN:0,linked:new Set(),comp:[],pairs:{road:{},rail:{}},ver:0};
const POL=new Float32Array(NN);
function hallSeeds(t){const out=[];D4.forEach(([di,dj])=>{const i=t.i+di,j=t.j+dj;if(inb(i,j)&&R[ix(i,j)])out.push(ix(i,j))});return out}
function bfs(seeds,layer){DST2.fill(-1);let h=0,tl=0;seeds.forEach(k=>{if(DST2[k]<0){DST2[k]=0;PAR[k]=-1;QBUF[tl++]=k}});
  while(h<tl){const k=QBUF[h++],d=DST2[k],i=ti_(k),j=tj_(k);for(const [di,dj] of D8){const ni=i+di,nj=j+dj;if(!inb(ni,nj))continue;const nk=ix(ni,nj);
    if(!layer[nk]||DST2[nk]>=0)continue;DST2[nk]=d+1;PAR[nk]=k;QBUF[tl++]=nk}}}
function analyze(){
  const tw=S.towns,act=tw.map(t=>!t.lock);NET.own.fill(-1);NET.dst.fill(-1);let h=0,tl=0;
  tw.forEach((t,n)=>{if(act[n])hallSeeds(t).forEach(k=>{if(NET.dst[k]<0){NET.dst[k]=1;NET.own[k]=n;QBUF[tl++]=k}})});
  while(h<tl){const k=QBUF[h++],d=NET.dst[k];if(d>=COMMUTE)continue;const i=ti_(k),j=tj_(k);for(const [di,dj] of D8){const ni=i+di,nj=j+dj;if(!inb(ni,nj))continue;const nk=ix(ni,nj);
    if(!R[nk]||NET.dst[nk]>=0)continue;NET.dst[nk]=d+1;NET.own[nk]=NET.own[k];QBUF[tl++]=nk}}
  S.bld.forEach(b=>{const s=bSize(b.t);b.na='';b.k=1;
    if(b.t==='hall'){b.town=tw.findIndex(t=>t.i===b.i&&t.j===b.j);if(b.town>=0&&!act[b.town])b.town=-1;return}
    let best=-1,bd=99,road=false;for(let a=-1;a<=s;a++)for(let c=-1;c<=s;c++){if(a>=0&&a<s&&c>=0&&c<s)continue;if((a===-1||a===s)&&(c===-1||c===s))continue;
      const ii=b.i+a,jj=b.j+c;if(!inb(ii,jj))continue;const k=ix(ii,jj);if(!R[k])continue;road=true;if(NET.dst[k]>0&&NET.dst[k]<bd){bd=NET.dst[k];best=NET.own[k]}}
    b.town=best;b.cd=best>=0?bd:0;if(best<0)b.na=krLocked(ix(b.i,b.j))?'locked':road?'far':'noroad';
    if(b.t==='forestry'){let c=0;for(let dj=-2;dj<=2;dj++)for(let di=-2;di<=2;di++){const ii=b.i+di,jj=b.j+dj;if(inb(ii,jj)&&(F[ix(ii,jj)]&F_FOREST))c++}b.k=clamp(c/10,0.3,1.4)}
    else if(BT[b.t].bonus){const v=validPlaceBonus(b);if(v)b.k=b.t==='farm'?1.35:1.4}});
  const pair=(mode)=>{const out={};const seedsOf=n=>mode==='road'?hallSeeds(tw[n]):railSeeds(n),layer=mode==='road'?R:L;
    tw.forEach((A,a)=>{if(!act[a])return;const sa=seedsOf(a);if(!sa.length)return;bfs(sa,layer);
      tw.forEach((B2,b)=>{if(b<=a||!act[b])return;let best=-1,bd=1e9;seedsOf(b).forEach(k=>{if(DST2[k]>=0&&DST2[k]<bd){bd=DST2[k];best=k}});
        if(best<0)return;const path=[];for(let k=best;k>=0;k=PAR[k])path.push(k);let lv=3;path.forEach(k=>{lv=Math.min(lv,layer[k])});out[a+'_'+b]={len:bd+1,lv,path:path.reverse()}})});
    const keep={};for(const kk in out){const [a,b]=kk.split('_').map(Number),d=out[kk].len;let via=false;
      tw.forEach((C2,c)=>{if(c===a||c===b)return;const ac=out[Math.min(a,c)+'_'+Math.max(a,c)],cb=out[Math.min(c,b)+'_'+Math.max(c,b)];if(ac&&cb&&ac.len+cb.len<=d*1.06)via=true});
      if(!via)keep[kk]=out[kk]}NET.pairs[mode]=out;return keep};
  const st=tw.map(()=>[]);S.bld.forEach(b=>{if(b.t==='station'&&b.town>=0)st[b.town].push(b)});
  function railSeeds(n){const out=[];st[n].forEach(b=>D4.forEach(([di,dj])=>{const i=b.i+di,j=b.j+dj;if(inb(i,j)&&L[ix(i,j)])out.push(ix(i,j))}));return out}
  const rd=pair('road'),rl=pair('rail'),E=[];
  new Set([...Object.keys(rd),...Object.keys(rl)]).forEach(kk=>{const [a,b]=kk.split('_').map(Number),road=rd[kk]||null,rail=rl[kk]||null;
    E.push({a,b,road,rail})});
  NET.edges=E;NET.adj=tw.map(()=>[]);E.forEach((e,n)=>{NET.adj[e.a].push(n);NET.adj[e.b].push(n)});
  NET.comp=tw.map(()=>-1);let cc=0;tw.forEach((t,n)=>{if(!act[n]||NET.comp[n]>=0)return;const q=[n];NET.comp[n]=cc;while(q.length){const x=q.pop();NET.adj[x].forEach(e=>{const y=E[e].a===x?E[e].b:E[e].a;if(NET.comp[y]<0){NET.comp[y]=cc;q.push(y)}})}cc++});
  const cap=tw.findIndex(t=>t.cap);NET.linked=new Set(tw.map((t,n)=>n).filter(n=>act[n]&&NET.comp[n]===NET.comp[cap]));
  let rn=0,ln=0;for(let k=0;k<NN;k++){if(R[k])rn+=R[k];if(L[k])ln+=L[k]}NET.roadN=rn;NET.railN=ln;
  POL.fill(0);S.bld.forEach(b=>{const p=BT[b.t].pol;if(!p)return;const s=bSize(b.t),ci=b.i+s/2,cj=b.j+s/2;
    for(let dj=-5;dj<=5+s;dj++)for(let di=-5;di<=5+s;di++){const i=b.i+di,j=b.j+dj;if(!inb(i,j))continue;const d=Math.hypot(i+0.5-ci,j+0.5-cj);if(d<5)POL[ix(i,j)]+=p*(1-d/5)}});
  NET.ver++;NET.dirty=false;
}
function validPlaceBonus(b){const s=bSize(b.t),bit=BT[b.t].bonus==='fertile'?F_FERTILE:F_FLAX;let c=0;for(let a=0;a<s;a++)for(let d=0;d<s;d++)if(F[ix(b.i+a,b.j+d)]&bit)c++;return c>=2}
