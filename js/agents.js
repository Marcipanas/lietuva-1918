'use strict';
/* Lietuva 1918 — residents, commuters and route vehicles. Visual only: the economy runs in sim.js. */
const WALK=[],VEH=[];let agentVer=-1,vehKey='';
const PREV=new Int32Array(NN),VSTAMP=new Uint32Array(NN);let vst=1;
function roadRoute(a,b,ti){vst++;const q=[a];VSTAMP[a]=vst;PREV[a]=-1;let h=0;
  while(h<q.length&&q.length<2500){const k=q[h++];if(k===b)break;const i=ti_(k),j=tj_(k);for(const [di,dj] of D8){const ni=i+di,nj=j+dj;if(!inb(ni,nj))continue;const nk=ix(ni,nj);
    if(!R[nk]||VSTAMP[nk]===vst||(ti>=0&&NET.own[nk]!==ti))continue;VSTAMP[nk]=vst;PREV[nk]=k;q.push(nk)}}
  if(VSTAMP[b]!==vst)return null;const p=[];for(let k=b;k>=0;k=PREV[k])p.push(k);return p.reverse()}
function roadNextTo(b){const s=bSize(b.t);for(let a=-1;a<=s;a++)for(let c=-1;c<=s;c++){if(a>=0&&a<s&&c>=0&&c<s)continue;const ii=b.i+a,jj=b.j+c;if(inb(ii,jj)&&R[ix(ii,jj)])return ix(ii,jj)}return -1}
const SHIRTS=[['#5b4a3a','#2f3f5a','#e8e2d0','#6b2f2a','#4a5a3a'],['#3d5a8a','#8a3d3d','#d9b26a','#e8e2d0','#3d6b5a'],['#e05d44','#3a86c8','#f2c14e','#7bbf6a','#e8e2d0','#9b59b6']];
function pathPos(path,u){const n=Math.min(path.length-2,Math.max(0,Math.floor(u))),f=clamp(u-n,0,1),a=path[n],b=path[Math.min(path.length-1,n+1)];
  const ai=ti_(a)+0.5,aj=tj_(a)+0.5,bi=ti_(b)+0.5,bj=tj_(b)+0.5;return [ai+(bi-ai)*f,aj+(bj-aj)*f,bi-ai,bj-aj]}
function rebuildVeh(){VEH.length=0;S.routes.forEach(r=>{if(!r.ok)return;const p=routePath(r);if(!p||p.path.length<2)return;const n=Math.min(r.n,6),L0=p.path.length-1;
  for(let q=0;q<n;q++)VEH.push({r,path:p.path,u:L0*(q+0.5)/n,d:q%2?-1:1,wait:0,s:r.mode==='rail'?3.6:r.vt==='cart'?1.2:2.8,seed:Math.random()})})}
function spawnCommuter(){const keys=Object.keys(NET.pairs.road).filter(k=>NET.pairs.road[k].len<=WALK_COMMUTE);if(!keys.length)return;const k=pick(keys),[a,b]=k.split('_').map(Number),A=S.towns[a],B0=S.towns[b];
  if(!A||!B0||A.lock||B0.lock)return;const ab=A.comOut>0.1&&B0.comIn>0.1,ba=B0.comOut>0.1&&A.comIn>0.1;if(!ab&&!ba)return;if(WALK.filter(w=>w.cm).length>16)return;
  const p=NET.pairs.road[k].path;WALK.push({t:-1,cm:1,p,u:ab?0:p.length-1,d:ab?1:-1,s:0.9,o:0.22,c:pick(SHIRTS[S.era-1]),life:2})}
function updateAgents(dt){
  if(agentVer!==NET.ver){agentVer=NET.ver;WALK.length=0;vehKey=''}
  const key=S.routes.map(r=>r.id+':'+r.n+':'+r.vt+':'+(r.ok?1:0)).join(',');if(key!==vehKey){vehKey=key;rebuildVeh()}
  const f=[0,1,1.5,2.2][S.speed];
  S.towns.forEach((t,ti)=>{if(t.lock)return;const want=Math.min(12,2+Math.floor(Math.sqrt(t.pop)*0.9));let have=0;WALK.forEach(w=>{if(w.t===ti)have++});if(have>=want)return;
    const homes=S.bld.filter(b=>b.town===ti&&b.t==='house'),works=S.bld.filter(b=>b.town===ti&&b.t!=='house');if(!homes.length||!works.length)return;
    const a=roadNextTo(pick(homes)),c=roadNextTo(pick(works));if(a<0||c<0||a===c)return;const p=roadRoute(a,c,ti);if(!p||p.length<2)return;
    WALK.push({t:ti,p,u:0,d:1,s:0.5+Math.random()*0.5,o:(Math.random()-0.5)*0.36,c:pick(SHIRTS[S.era-1]),life:2+Math.floor(Math.random()*3)})});
  if(f>0&&Math.random()<0.03)spawnCommuter();
  for(let n=WALK.length-1;n>=0;n--){const w=WALK[n];w.u+=dt*w.s*f*w.d;if(w.u>=w.p.length-1||w.u<=0){w.u=clamp(w.u,0,w.p.length-1);w.d=-w.d;if(--w.life<=0||(!w.cm&&NET.own[w.p[0]]!==w.t))WALK.splice(n,1)}}
  VEH.forEach(v=>{if(v.wait>0){v.wait-=dt*f;return}v.u+=dt*v.s*f*v.d;const L0=v.path.length-1;if(v.u>=L0){v.u=L0;v.d=-1;v.wait=1.2}else if(v.u<=0){v.u=0;v.d=1;v.wait=1.2}})}
function bucketAgents(){const M=new Map(),add=(s,o)=>{let a=M.get(s);if(!a){a=[];M.set(s,a)}a.push(o)};
  WALK.forEach(w=>{const [gi,gj,di,dj]=pathPos(w.p,w.u),ln=Math.hypot(di,dj)||1,x=gi-dj/ln*w.o,y=gj+di/ln*w.o;w.x=x;w.y=y;add(Math.floor(x+y),w)});
  VEH.forEach(v=>{const [gi,gj,di,dj]=pathPos(v.path,v.u);v.x=gi;v.y=gj;v.di=di*v.d;v.dj=dj*v.d;add(Math.floor(gi+gj),v)});return M}
function cargoCol(r,d){const rec=d>0?r.mAB:r.mBA;let best=null,bv=0.3;if(rec)for(const k in rec)if(rec[k]>bv){bv=rec[k];best=k}return best?RCOL[best]:'#8a6a48'}
function drawAgent(o){const z=cam.z;
  if(o.c){const p=P3(o.x,o.y,0),bob=Math.abs(Math.sin(NOW*0.012+o.o*40))*1.2*z;ctx.fillStyle='#3a3530';ctx.fillRect(p[0]-1.2*z,p[1]-4*z,2.4*z,4*z);
    ctx.fillStyle=SEASON.snow>0.4?shade(o.c.length===7?o.c:'#5b4a3a',0.8):o.c;ctx.fillRect(p[0]-1.8*z,p[1]-9*z-bob,3.6*z,5.2*z);ctx.fillStyle=SEASON.snow>0.4?'#6b4a3a':'#f0c9a0';
    ctx.beginPath();ctx.arc(p[0],p[1]-10.6*z-bob,1.6*z,0,6.283);ctx.fill();return}
  const r=o.r,alongI=Math.abs(o.di)>=Math.abs(o.dj),ln=Math.hypot(o.di,o.dj)||1,ux=o.di/ln,uy=o.dj/ln,cg=cargoCol(r,o.d);
  const seg=(gi,gj,L0,W0,h,c1,c2,c3)=>{const a0=alongI?gi-L0:gi-W0,a1=alongI?gi+L0:gi+W0,b0=alongI?gj-W0:gj-L0,b1=alongI?gj+W0:gj+L0;box(a0,b0,a1,b1,0,h,c1,c2,c3)};
  if(r.mode==='rail'){for(let q=3;q>=0;q--){const [gi,gj]=pathPos(o.path,clamp(o.u-q*0.75*o.d,0,o.path.length-1));
      if(q===0){if(r.vt==='etrain')seg(gi,gj,0.32,0.1,11,'#a8323a','#c23b45',roof('#e8dcc6'));else{seg(gi,gj,0.3,0.1,10,'#26332d','#33443b',roof('#1e2925'));if(z>=0.3&&S.speed>0)puff(gi,gj,14,o.seed,235,0.55,4)}}
      else if(r.pax)seg(gi,gj,0.3,0.1,10,'#2f5d4a','#3b7059',roof('#c9c2b0'));else seg(gi,gj,0.3,0.1,7,'#6e4a32','#835a3d',roof(cg))}return}
  if(r.vt==='cart'){seg(o.x,o.y,0.16,0.09,5,'#7a5536','#8e6644',roof(r.pax?'#d9cfb8':cg));seg(o.x+ux*0.27,o.y+uy*0.27,0.08,0.045,6,'#5a3d28','#6b4a32','#4a3020');return}
  const body=r.pax?'#d9b26a':r.vt==='lorry'?'#e8e4da':'#3d6b8a';seg(o.x,o.y,0.22,0.09,8,shade(body.startsWith('#')?body:'#3d6b8a',0.8),body,roof(r.pax?'#f2e6c8':cg))}
