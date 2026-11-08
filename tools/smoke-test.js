#!/usr/bin/env node
/* Headless smoke test: loads every script in a stub browser (one vm context, one script at a time, exactly
   like separate <script> tags), boots the game, drives the build tools and route editor the way the UI does,
   plays about two in-game years, renders every panel and zoom level, then saves and reloads.
   Exit code 1 on any exception or failed assertion. Extend it whenever you add a system. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');let failed=0;
const assert=(c,m)=>{if(c)console.log('✓ '+m);else{console.error('✗ '+m);failed++}};

/* ---- stub browser ---- */
const noop=()=>{};
const ctx2d=new Proxy({},{get:(t,p)=>p==='measureText'?()=>({width:30}):(p==='createLinearGradient'||p==='createRadialGradient')?()=>({addColorStop:noop}):p in t?t[p]:noop,set:(t,p,v)=>{t[p]=v;return true}});
function el(id){return {id,hidden:true,innerHTML:'',textContent:'',value:'0',dataset:{},style:{},classList:{toggle:noop,add:noop,remove:noop,contains:()=>false},
  addEventListener:noop,setPointerCapture:noop,getContext:()=>ctx2d,getBoundingClientRect:()=>({width:800,height:600,left:0,top:0}),querySelectorAll:()=>[],closest:()=>null,width:0,height:0}}
const els={};
const sandbox={console,Math,Date,JSON,btoa,atob,performance,setTimeout:()=>0,clearTimeout:noop,
  document:{getElementById:id=>els[id]||(els[id]=el(id)),querySelector:s=>el(s),querySelectorAll:()=>[],createElement:()=>el('canvas'),addEventListener:noop,fonts:{ready:{then:noop}},hidden:false},
  window:{devicePixelRatio:1,innerWidth:400,addEventListener:noop,ResizeObserver:class{observe(){}}},
  localStorage:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)}},
  requestAnimationFrame:cb=>{sandbox.rafCb=cb}};
vm.createContext(sandbox);

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const order=[...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m=>m[1]);
for(const f of order){try{vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sandbox,{filename:f})}
  catch(e){console.error(`✗ ${f} failed to load: ${e.message}`);process.exit(1)}}
assert(true,`loaded ${order.length} scripts in index.html order`);

/* ---- play session (runs inside the game's global scope) ---- */
const session=`(function(){const out={};let t=0;const run=(n,dt)=>{for(let q=0;q<n;q++){t+=dt;rafCb(t)}};
  out.towns=S.towns.length;out.routes0=S.routes.length;out.histOk=S.routes.every(r=>{routeEval(r);return r.ok});
  run(20,16);S.speed=3;run(120,100);out.day1=S.day;out.walkers=WALK.length;out.vehicles=VEH.length;
  const kau=S.towns.find(x=>x.id==='kau'),aly=S.towns.find(x=>x.id==='aly'),ki=S.towns.indexOf(kau),ai=S.towns.indexOf(aly);
  setTool('road');beginDraw(hallSeeds(kau)[0]);moveDraw(hallSeeds(aly)[0]);finishDraw();out.roadPend=PEND&&!PEND.bad;doConfirm();analyze();out.alyLinked=NET.linked.has(ai);
  act({act:'newroute',a:String(ki),b:String(ai),m:'road'});const r=S.routes[S.routes.length-1];routeEval(r);out.newRouteOk=r.ok&&r.a===ki&&r.b===ai;
  act({act:'rveh',r:String(r.id),d:'1'});act({act:'rcargo',r:String(r.id),dir:'ab',res:'grain'});act({act:'rpax',r:String(r.id)});out.routeEdit=r.n===3&&Array.isArray(r.ab)&&r.pax;
  const place=(type,dx,dy)=>{setTool('place',type);for(let q=2;q<10;q++)for(let d=-q;d<=q;d++){setGhost(kau.i+dx*q+(dx?0:d),kau.j+dy*q+(dy?0:d));if(PEND.ok){doConfirm();return true}}return false};
  out.placed=[place('warehouse',1,0),place('school',-1,0),place('pigs',0,-1),place('dairy',0,1)];setTool('zone');const v=S.towns[0];beginDraw(ix(v.i+6,v.j-6));moveDraw(ix(v.i+9,v.j-3));finishDraw();doConfirm();
  setTool('inspect');run(500,100);const tt=totals();out.day2=S.day;out.pop=tt.pop;out.funds=S.funds;out.finite=S.towns.every(x=>isFinite(x.pop)&&RES.every(q=>isFinite(x.stock[q]||0)))&&isFinite(S.funds);
  out.moved=Object.values(r.mAB||{}).reduce((a,b)=>a+b,0);
  selectTown(ki,true);renderPanel(true);['routes','nat','chron','sel'].forEach(tb=>{S.tab=tb;renderPanel(true);renderPanel(false)});
  const wh=S.bld.find(x=>x.t==='warehouse');if(wh){selectBuilding(wh,true);renderPanel(true)}toggleDrawer(true);toggleDrawer(false);
  [0.1,0.3,0.6,1.5].forEach(zz=>{cam.z=zz;cam.tx=null;run(2,16)});
  const snap={day:S.day,b:S.bld.length,r:S.routes.length,f:Math.round(S.funds)},str=JSON.stringify(serialize());restore(JSON.parse(str));analyze();buildCache();run(3,16);
  out.roundtrip=S.day===snap.day&&S.bld.length===snap.b&&S.routes.length===snap.r&&Math.round(S.funds)===snap.f;out.saveKB=Math.round(str.length/1024);
  out.saved=!!localStorage.getItem(SAVE_KEY);return out})()`;
let o;try{o=vm.runInContext(session,sandbox,{filename:'session'})}catch(e){console.error('✗ play session threw: '+(e.stack||e));process.exit(1)}
assert(o.towns===11,'11 towns generated');
assert(o.routes0>=6&&o.histOk,`${o.routes0} historic routes, all running`);
assert(o.walkers>0&&o.vehicles>0,`residents (${o.walkers}) and route vehicles (${o.vehicles}) spawn`);
assert(o.roadPend&&o.alyLinked,'road tool links Alytus to the network');
assert(o.newRouteOk,'new road route Kaunas–Alytus is created and valid');
assert(o.routeEdit,'route editor: vehicles, cargo and commuters change');
assert(o.placed.every(Boolean),'warehouse, school, pig farm and dairy farm can be placed near Kaunas');
assert(o.day2>o.day1+500,`game time advances (day ${o.day2})`);
assert(o.finite,'no NaN or infinite values in towns or treasury');
assert(o.pop>400,`towns grow (${Math.round(o.pop)}k residents)`);
assert(o.moved>0,`the new route carries goods (${o.moved.toFixed(1)} a day)`);
assert(o.roundtrip,`save and reload keep the game intact (${o.saveKB} KB)`);
assert(o.saved,'autosave writes to localStorage');
if(failed){console.error(`\n${failed} check${failed>1?'s':''} failed`);process.exit(1)}
console.log('\nSmoke test passed.');
