'use strict';
/* Lietuva 1918 — isometric objects: buildings, shadows, seasons, trees, animals, boats. Uses cam/ctx/cw/ch from render.js. */
let SEASON={snow:0,aut:0,heat:0,m:1};
function P3(gi,gj,h){const z=cam.z;return [((gi-gj)*32-cam.x)*z+cw/2,((gi+gj)*16-cam.y)*z+ch/2-h*z]}
function poly(pts,fill,stroke){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let n=1;n<pts.length;n++)ctx.lineTo(pts[n][0],pts[n][1]);ctx.closePath();
  ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=Math.max(0.5,0.7*cam.z);ctx.stroke()}}
const EDGE='rgba(40,30,22,0.35)';
function hexRGB(h){const n=parseInt(h.slice(1),16);return [n>>16&255,n>>8&255,n&255]}
function mixHex(a,b,f){const x=hexRGB(a),y=hexRGB(b);return `rgb(${Math.round(x[0]+(y[0]-x[0])*f)},${Math.round(x[1]+(y[1]-x[1])*f)},${Math.round(x[2]+(y[2]-x[2])*f)})`}
function shade(hex,f){const n=parseInt(hex.slice(1),16);return `rgb(${Math.min(255,Math.round((n>>16&255)*f))},${Math.min(255,Math.round((n>>8&255)*f))},${Math.min(255,Math.round((n&255)*f))})`}
function roof(c){return SEASON.snow>0.1?mixHex(c,'#f1f5f8',Math.min(0.88,SEASON.snow*0.9)):c}
function roof2(c){return SEASON.snow>0.1?mixHex(c,'#d9e2e8',Math.min(0.8,SEASON.snow*0.85)):shade(c,0.8)}
function box(a0,b0,a1,b1,h0,h1,cl,cr,ct){
  poly([P3(a0,b1,h0),P3(a1,b1,h0),P3(a1,b1,h1),P3(a0,b1,h1)],cl,EDGE);poly([P3(a1,b1,h0),P3(a1,b0,h0),P3(a1,b0,h1),P3(a1,b1,h1)],cr,EDGE);
  if(ct)poly([P3(a0,b0,h1),P3(a1,b0,h1),P3(a1,b1,h1),P3(a0,b1,h1)],ct,EDGE)}
function gableI(a0,b0,a1,b1,h,rh,rf,wall){const m=(b0+b1)/2;poly([P3(a0,b0,h),P3(a1,b0,h),P3(a1,m,h+rh),P3(a0,m,h+rh)],roof2(rf),EDGE);
  poly([P3(a1,b0,h),P3(a1,b1,h),P3(a1,m,h+rh)],wall,EDGE);poly([P3(a0,b1,h),P3(a1,b1,h),P3(a1,m,h+rh),P3(a0,m,h+rh)],roof(rf),EDGE)}
function gableJ(a0,b0,a1,b1,h,rh,rf,wall){const m=(a0+a1)/2;poly([P3(a0,b0,h),P3(a0,b1,h),P3(m,b1,h+rh),P3(m,b0,h+rh)],roof2(rf),EDGE);
  poly([P3(a0,b1,h),P3(a1,b1,h),P3(m,b1,h+rh)],wall,EDGE);poly([P3(a1,b0,h),P3(a1,b1,h),P3(m,b1,h+rh),P3(m,b0,h+rh)],roof(rf),EDGE)}
function pyramid(a0,b0,a1,b1,h,ph,cl,cr){const ap=P3((a0+a1)/2,(b0+b1)/2,h+ph);poly([P3(a0,b1,h),P3(a1,b1,h),ap],roof(cl),EDGE);poly([P3(a1,b1,h),P3(a1,b0,h),ap],roof(cr),EDGE)}
function cyl(ci,cj,r,h0,h1,cs,ct){const b=P3(ci,cj,h0),t=P3(ci,cj,h1),rx=r*cam.z,ry=rx/2;ctx.fillStyle=cs;ctx.beginPath();ctx.ellipse(b[0],b[1],rx,ry,0,0,6.283);ctx.fill();
  ctx.fillRect(t[0]-rx,t[1],rx*2,b[1]-t[1]);ctx.fillStyle='rgba(0,0,0,0.13)';ctx.fillRect(t[0],t[1],rx,b[1]-t[1]);ctx.fillStyle=roof(ct);ctx.beginPath();ctx.ellipse(t[0],t[1],rx,ry,0,0,6.283);ctx.fill()}
function wins(face,a0,b0,a1,b1,h0,h1,rows,cols,col){if(cam.z<0.55)return;ctx.fillStyle=col;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const u0=(c+0.3)/cols,u1=(c+0.7)/cols,v0=h0+(h1-h0)*(r+0.3)/rows,v1=h0+(h1-h0)*(r+0.75)/rows;
    const pt=(u,h)=>face==='L'?P3(a0+(a1-a0)*u,b1,h):P3(a1,b1-(b1-b0)*u,h);const p=[pt(u0,v0),pt(u1,v0),pt(u1,v1),pt(u0,v1)];
    ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);for(let n=1;n<4;n++)ctx.lineTo(p[n][0],p[n][1]);ctx.closePath();ctx.fill()}}
function shadow(a0,b0,a1,b1,h){if(cam.z<0.22)return;const ox=h*cam.z*0.55,oy=h*cam.z*0.16,T0=P3(a0,b0,0),Rr=P3(a1,b0,0),Bb=P3(a1,b1,0),Lf=P3(a0,b1,0);
  ctx.fillStyle='rgba(18,32,22,0.2)';ctx.beginPath();ctx.moveTo(T0[0],T0[1]);ctx.lineTo(T0[0]+ox,T0[1]+oy);ctx.lineTo(Rr[0]+ox,Rr[1]+oy);ctx.lineTo(Bb[0]+ox,Bb[1]+oy);ctx.lineTo(Bb[0],Bb[1]);ctx.lineTo(Lf[0],Lf[1]);ctx.closePath();ctx.fill()}
function puff(ci,cj,h,seed,grey,a,size){if(cam.z<0.3)return;for(let q=0;q<3;q++){const ph=((NOW/2600)+q/3+seed)%1,p=P3(ci+ph*0.25,cj-ph*0.1,h+ph*46),r=(size||3+ph*9)*cam.z*(0.5+ph);
  ctx.fillStyle=`rgba(${grey},${grey},${grey},${(a||0.5)*(1-ph)})`;ctx.beginPath();ctx.arc(p[0],p[1],r,0,6.283);ctx.fill()}}
function flag(gi,gj,h0,h1){const b=P3(gi,gj,h0),t=P3(gi,gj,h1),z=cam.z;ctx.strokeStyle='#d9d4c7';ctx.lineWidth=Math.max(0.8,z);ctx.beginPath();ctx.moveTo(b[0],b[1]);ctx.lineTo(t[0],t[1]);ctx.stroke();
  if(z<0.45)return;const w=11*z,s=2.4*z,wave=Math.sin(NOW/300+gi)*1.2*z;[['#fdb913',0],['#0f7b4f',1],['#c1272d',2]].forEach(([c,q])=>{ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(t[0],t[1]+q*s);
    ctx.lineTo(t[0]+w,t[1]+q*s+wave);ctx.lineTo(t[0]+w,t[1]+(q+1)*s+wave);ctx.lineTo(t[0],t[1]+(q+1)*s);ctx.closePath();ctx.fill()})}
function waterSide(b){const s=bSize(b.t);for(let a=-1;a<=s;a++)for(let c=-1;c<=s;c++){if(a>=0&&a<s&&c>=0&&c<s)continue;const i=b.i+a,j=b.j+c;if(!inb(i,j))continue;const t=T[ix(i,j)];
  if(t===T_SEA||t===T_LAGOON||t===T_LAKE||t===T_RIVER)return [i,j]}return null}

const WALLS=['#c4955a','#7e9a6a','#7393b3','#a8654a','#cdb27a'],ROOFS=['#7a3a2b','#5d5048','#8b4a2d','#4f5d4a'];
function drawHouse(b,hs){const i=b.i,j=b.j;
  if(b.lv===1){const m=0.16+hs*0.06,c=WALLS[Math.floor(hs*5)],rf=ROOFS[Math.floor(hash2(b.id,3,2)*4)];shadow(i+m,j+m+0.1,i+0.8,j+0.86,20);
    if(cam.z>=0.3)box(i+0.62,j+0.12,i+0.88,j+0.38,0,7,shade('#8a6a48',0.85),'#8a6a48',roof('#6d5038'));
    box(i+m,j+m+0.1,i+0.8,j+0.86,0,11,shade(c,0.78),shade(c,0.95));(hs<0.5?gableI:gableJ)(i+m,j+m+0.1,i+0.8,j+0.86,11,10,rf,shade(c,0.95));
    if(hs<0.5)wins('L',i+m,j+m+0.1,i+0.8,j+0.86,0,11,1,2,SEASON.snow>0.3?'#f2d488':'#3b3328');else wins('R',i+m,j+m+0.1,i+0.8,j+0.86,0,11,1,2,SEASON.snow>0.3?'#f2d488':'#3b3328');
    if(SEASON.heat>0.25&&cam.z>=0.5)puff(i+0.45,j+0.5,24,hs,215,0.35,3)}
  else if(b.lv===2){shadow(i+0.12,j+0.12,i+0.88,j+0.88,34);box(i+0.12,j+0.12,i+0.88,j+0.88,0,30,'#a9533c','#c2654b',roof('#7d6a5c'));box(i+0.2,j+0.2,i+0.8,j+0.8,30,33,'#6e5d50','#7f6c5e',roof('#8a786a'));
    wins('L',i+0.12,j+0.12,i+0.88,j+0.88,0,30,3,3,'#f1deb2');wins('R',i+0.12,j+0.12,i+0.88,j+0.88,0,30,3,3,'#e6cf9c');if(SEASON.heat>0.25&&cam.z>=0.5)puff(i+0.5,j+0.5,36,hs,215,0.3,4)}
  else{shadow(i+0.14,j+0.14,i+0.86,j+0.86,80);box(i+0.14,j+0.14,i+0.86,j+0.86,0,78,'#cfc9bb','#e6e1d4',roof('#9a958c'));wins('L',i+0.14,j+0.14,i+0.86,j+0.86,0,78,9,3,'#5f7891');wins('R',i+0.14,j+0.14,i+0.86,j+0.86,0,78,9,3,'#6f88a1')}}
function drawHall(b){const i=b.i,j=b.j,t=S.towns[b.town>=0?b.town:nearestTown(i,j)],k=t&&t.cap?1.25:1;shadow(i+0.1,j+0.22,i+0.88,j+0.86,60*k);
  box(i+0.1,j+0.22,i+0.62,j+0.86,0,24*k,'#ddd6c8','#efeae0');gableI(i+0.1,j+0.22,i+0.62,j+0.86,24*k,16*k,'#9a3b2c','#efeae0');wins('L',i+0.1,j+0.22,i+0.62,j+0.86,4,22*k,1,3,'#5a4b3c');
  box(i+0.62,j+0.4,i+0.88,j+0.66,0,58*k,'#ddd6c8','#f2ede3','#cfc8ba');wins('R',i+0.62,j+0.4,i+0.88,j+0.66,36*k,52*k,1,1,'#4a3d30');pyramid(i+0.62,j+0.4,i+0.88,j+0.66,58*k,30*k,'#4f7a62','#64927a')}
function cow(gi,gj,c){const p=P3(gi,gj,0),z=cam.z;ctx.fillStyle='rgba(0,0,0,0.15)';ctx.beginPath();ctx.ellipse(p[0],p[1],4*z,1.6*z,0,0,6.283);ctx.fill();
  ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(p[0],p[1]-3*z,4*z,2.4*z,0,0,6.283);ctx.fill();ctx.beginPath();ctx.arc(p[0]+3.6*z,p[1]-4.2*z,1.5*z,0,6.283);ctx.fill();
  if(c==='#f4f1ea'){ctx.fillStyle='#2c2a28';ctx.beginPath();ctx.arc(p[0]-1*z,p[1]-3.4*z,1.2*z,0,6.283);ctx.fill()}}
function fields(b){const i=b.i,j=b.j,z=cam.z;
  if(b.t==='farm'){shadow(i+0.15,j+0.15,i+0.8,j+0.6,22);box(i+0.15,j+0.15,i+0.8,j+0.6,0,15,'#9f442f','#b5523a');gableI(i+0.15,j+0.15,i+0.8,j+0.6,15,10,'#5b5550','#b5523a');
    if(z>=0.4&&SEASON.snow<0.3){pyramid(i+1.25,j+1.2,i+1.5,j+1.45,0,10,'#c9a54a','#dcb85a');pyramid(i+0.95,j+1.55,i+1.2,j+1.8,0,10,'#c9a54a','#dcb85a')}}
  else if(b.t==='potato'){shadow(i+0.12,j+0.12,i+0.5,j+0.45,10);box(i+0.12,j+0.12,i+0.5,j+0.45,0,8,'#7a6650','#8a7560');gableJ(i+0.12,j+0.12,i+0.5,j+0.45,8,6,'#56504a','#8a7560');
    if(z>=0.45&&SEASON.snow<0.3)for(let q=0;q<3;q++){const a=i+1.1+q*0.22;box(a,j+1.5,a+0.14,j+1.64,0,4,'#8a6a3f','#a07a48','#b88d55')}}
  else if(b.t==='flax'){box(i+0.12,j+0.12,i+0.55,j+0.45,0,10,'#8a7a64','#9d8c74');gableJ(i+0.12,j+0.12,i+0.55,j+0.45,10,7,'#5b5550','#9d8c74')}
  else if(b.t==='dairy'){shadow(i+0.12,j+0.15,i+0.95,j+0.7,24);box(i+0.12,j+0.15,i+0.95,j+0.7,0,15,'#8d6e52','#a08060');gableI(i+0.12,j+0.15,i+0.95,j+0.7,15,11,'#5e6a72','#a08060');
    cyl(i+1.15,j+0.35,7,0,36,'#c9ccce','#9aa0a5');
    if(z>=0.4&&SEASON.snow<0.5)for(let q=0;q<4;q++){const ph=NOW/9000+q*1.7+b.id;cow(i+0.9+0.45*Math.sin(ph)+q*0.12,j+1.15+0.3*Math.cos(ph*0.8)+(q%2)*0.3,q%2?'#f4f1ea':'#7a4a2c')}}
  else{shadow(i+0.1,j+0.1,i+0.5,j+0.4,12);box(i+0.1,j+0.1,i+0.5,j+0.4,0,9,'#6d5a48','#7f6a55');gableI(i+0.1,j+0.1,i+0.5,j+0.4,9,6,'#3f3a36','#7f6a55');
    if(z>=0.4)for(let q=0;q<4;q++){const a=i+0.9+q*0.22,c=j+1.2;box(a,c,a+0.14,c+0.24,0,6,'#4a382b','#5a4434',roof('#3c2d23'))}}}
function warehouse(b){const i=b.i,j=b.j,t=S.towns[b.town];shadow(i+0.15,j+0.2,i+1.85,j+1.15,30);box(i+0.15,j+0.2,i+1.85,j+1.15,0,18,'#8a6b4e','#9c7a5a');
  gableI(i+0.15,j+0.2,i+1.85,j+1.15,18,12,'#6b6f72','#9c7a5a');wins('L',i+0.15,j+0.2,i+1.85,j+1.15,2,14,1,4,'#4a3a2c');
  if(!t||cam.z<0.35)return;const top=RES.map(r=>[r,(t.stock[r]||0)/(t.cap||STORE_BASE)]).filter(x=>x[1]>0.05).sort((x,y)=>y[1]-x[1]).slice(0,6);
  top.forEach(([r,f],q)=>{const a=i+0.2+(q%3)*0.55,c=j+1.3+Math.floor(q/3)*0.3,h=4+f*14,col=RCOL[r]||'#a07a48';box(a,c,a+0.4,c+0.22,0,h,shade(col,0.75),shade(col,0.9),roof(col))})}
const RCOL={grain:'#e7bd55',potatoes:'#b08850',dairy:'#f3e3a8',meat:'#c96a5a',fish:'#8fb7c9',timber:'#c48d5c',peat:'#7a6650',flax:'#86aef0',bricks:'#e07a55',textiles:'#d9a7cd',furniture:'#9fcf9c',metal:'#adbdca',electronics:'#62d6c8'};
function drawBuilding(b){const t=b.t,i=b.i,j=b.j,hs=hash2(b.id,7,1),run=b.eff>0.25;const dim=b.town<0&&t!=='house';if(dim)ctx.globalAlpha=0.75;
  switch(t){
    case 'house':drawHouse(b,hs);break;
    case 'hall':drawHall(b);flag(i+0.2,j+0.3,24,52);break;
    case 'farm':case 'flax':case 'peat':case 'potato':case 'dairy':fields(b);break;
    case 'pigs':shadow(i+0.12,j+0.3,i+0.8,j+0.75,14);box(i+0.12,j+0.3,i+0.8,j+0.75,0,9,'#8a6a52','#9c7a60');gableI(i+0.12,j+0.3,i+0.8,j+0.75,9,7,'#7a4d3a','#9c7a60');
      if(cam.z>=0.45&&SEASON.snow<0.5)for(let q=0;q<3;q++){const ph=NOW/7000+q*2.1+b.id,p=P3(i+0.3+q*0.2+0.05*Math.sin(ph),j+0.88+0.04*Math.cos(ph),0),z=cam.z;
        ctx.fillStyle='#f0b3b0';ctx.beginPath();ctx.ellipse(p[0],p[1]-2*z,3.2*z,2*z,0,0,6.283);ctx.fill()}break;
    case 'fishery':{const w0=waterSide(b);shadow(i+0.2,j+0.3,i+0.7,j+0.75,14);box(i+0.2,j+0.3,i+0.7,j+0.75,0,10,'#5b7486','#6d889b');gableJ(i+0.2,j+0.3,i+0.7,j+0.75,10,7,'#3f4a52','#6d889b');
      if(w0&&cam.z>=0.35){const ph=NOW/3000+b.id,p=P3(w0[0]+0.5+0.22*Math.cos(ph),w0[1]+0.5+0.22*Math.sin(ph),0),z=cam.z;
        ctx.fillStyle='#6b4a2e';ctx.beginPath();ctx.moveTo(p[0]-6*z,p[1]);ctx.lineTo(p[0]+6*z,p[1]);ctx.lineTo(p[0]+4*z,p[1]+2.5*z);ctx.lineTo(p[0]-4*z,p[1]+2.5*z);ctx.closePath();ctx.fill();
        ctx.fillStyle='#f4efe2';ctx.beginPath();ctx.moveTo(p[0],p[1]-12*z);ctx.lineTo(p[0]+5*z,p[1]-1*z);ctx.lineTo(p[0],p[1]-1*z);ctx.closePath();ctx.fill()}break}
    case 'forestry':drawTree(i+0.25,j+0.2,0);drawTree(i+0.75,j+0.28,1);shadow(i+0.3,j+0.45,i+0.7,j+0.8,14);box(i+0.3,j+0.45,i+0.7,j+0.8,0,10,'#6d4a31','#7f5639');
      gableI(i+0.3,j+0.45,i+0.7,j+0.8,10,8,'#4b3a2c','#7f5639');if(cam.z>=0.4)box(i+0.12,j+0.55,i+0.28,j+0.9,0,5,'#9b6b43','#b07b4f',roof('#d2a271'));break;
    case 'brick':shadow(i+0.12,j+0.25,i+0.72,j+0.85,40);box(i+0.12,j+0.25,i+0.72,j+0.85,0,14,'#a24a35','#b85a42',roof('#7d4a3a'));cyl(i+0.82,j+0.3,4,0,52,'#8d3f2e','#2b2b2b');if(run)puff(i+0.82,j+0.3,54,hs,110);break;
    case 'warehouse':warehouse(b);break;
    case 'school':shadow(i+0.12,j+0.2,i+0.88,j+0.8,40);box(i+0.12,j+0.2,i+0.88,j+0.8,0,26,'#a9533c','#c2654b');gableI(i+0.12,j+0.2,i+0.88,j+0.8,26,12,'#5b5550','#c2654b');
      wins('L',i+0.12,j+0.2,i+0.88,j+0.8,2,24,2,4,'#f3e6c4');wins('R',i+0.12,j+0.2,i+0.88,j+0.8,2,24,2,3,'#ecdcb5');flag(i+0.9,j+0.9,0,48);break;
    case 'clinic':{shadow(i+0.15,j+0.2,i+0.85,j+0.8,26);box(i+0.15,j+0.2,i+0.85,j+0.8,0,22,'#e3e0d8','#f2efe8',roof('#b9b6ae'));wins('R',i+0.15,j+0.2,i+0.85,j+0.8,3,20,2,3,'#9fc3d6');
      if(cam.z>=0.4){const p=P3(i+0.5,j+0.8,14),z=cam.z;ctx.fillStyle='#c1272d';ctx.fillRect(p[0]-1.2*z,p[1]-4*z,2.4*z,8*z);ctx.fillRect(p[0]-4*z,p[1]-1.2*z,8*z,2.4*z)}break}
    case 'station':shadow(i+0.1,j+0.3,i+0.9,j+0.7,30);box(i+0.1,j+0.3,i+0.9,j+0.7,0,18,'#c99f57','#d9b26a',roof('#5c5a57'));box(i+0.4,j+0.42,i+0.6,j+0.58,18,30,'#c99f57','#d9b26a');
      pyramid(i+0.4,j+0.42,i+0.6,j+0.58,30,8,'#3f5b4c','#4f6d5c');box(i+0.08,j+0.72,i+0.92,j+0.94,0,3,'#9c9a96','#b1afab',roof('#c4c2be'));break;
    case 'port':{const w0=waterSide(b);shadow(i+0.1,j+0.2,i+1.2,j+0.9,30);box(i+0.1,j+0.2,i+1.2,j+0.9,0,22,'#a9533c','#c2654b',roof('#6d5d52'));
      if(cam.z>=0.3){[['#c0392b',1.3,1.05],['#2e6f9e',1.55,1.05],['#d9a441',1.3,1.35]].forEach(([c,a,d])=>box(a,d,a+0.22,d+0.26,0,9,shade(c,0.8),c,roof(c)));
        const p0=P3(i+1.8,j+1.6,0),p1=P3(i+1.8,j+1.6,64),p2=P3(i+1.25,j+1.95,60);ctx.strokeStyle='#d2a62c';ctx.lineWidth=Math.max(1,2.2*cam.z);ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.lineTo(p2[0],p2[1]);ctx.stroke()}
      if(w0&&cam.z>=0.3){const a=w0[0]+0.15,c=w0[1]+0.3;box(a,c,a+0.75,c+0.32,0,8,'#2b3640','#384652','#56636e');box(a+0.45,c+0.06,a+0.68,c+0.26,8,18,'#e8e4da','#f4f1ea',roof('#c9c4b8'))}break}
    case 'power':shadow(i+0.15,j+0.2,i+1.9,j+1.8,70);cyl(i+1.75,j+0.35,6,0,96,'#b8b2a8','#3a3a3a');cyl(i+1.75,j+0.95,6,0,96,'#b8b2a8','#3a3a3a');
      box(i+0.15,j+0.2,i+1.5,j+1.8,0,38,'#8c8f93','#a4a7ab',roof('#6d7074'));wins('L',i+0.15,j+0.2,i+1.5,j+1.8,6,34,2,5,'#d9d0a8');
      if(run){puff(i+1.75,j+0.35,98,hs,90,0.55,8);puff(i+1.75,j+0.95,98,hs+0.5,90,0.55,8)}break;
    case 'linen':case 'furniture':{const w0=t==='linen'?'#cdb99a':'#9b7652';shadow(i+0.1,j+0.3,i+1.9,j+1.7,34);box(i+0.1,j+0.3,i+1.9,j+1.7,0,22,shade(w0,0.85),w0);
      for(let q=0;q<4;q++){const a0=i+0.1+q*0.45,a1=a0+0.45;poly([P3(a0,j+0.3,22),P3(a1,j+0.3,34),P3(a1,j+1.7,34),P3(a0,j+1.7,22)],roof('#77736d'),EDGE);
        poly([P3(a1,j+1.7,22),P3(a1,j+0.3,22),P3(a1,j+0.3,34),P3(a1,j+1.7,34)],'#8fb3c4',EDGE)}wins('L',i+0.1,j+0.3,i+1.9,j+1.7,4,18,1,6,'#e8dcc0');break}
    case 'hydro':box(i+0.05,j+0.38,i+0.95,j+0.6,0,20,'#a7abad','#babdbf',roof('#cfd2d3'));box(i+0.3,j+0.62,i+0.7,j+0.9,0,12,'#8d9295','#a2a7aa',roof('#7b8084'));
      if(cam.z>=0.4){ctx.strokeStyle='rgba(255,255,255,0.75)';ctx.lineWidth=Math.max(1,1.4*cam.z);for(let q=1;q<5;q++){const a=P3(i+0.05+q*0.18,j+0.6,16),c=P3(i+0.05+q*0.18,j+0.6,2);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(c[0],c[1]);ctx.stroke()}}break;
    case 'nuclear':tower(i+0.9,j+0.75,24,118);tower(i+2.25,j+0.9,24,118);shadow(i+0.2,j+1.5,i+2.8,j+2.8,50);
      box(i+0.2,j+1.5,i+1.6,j+2.8,0,40,'#d6d3cb','#e4e1d9',roof('#c4c1b9'));cyl(i+0.9,j+2.15,15,40,52,'#e9e6de','#f4f2ec');box(i+1.6,j+1.7,i+2.8,j+2.8,0,26,'#9da3a8','#b3b9be',roof('#868c91'));
      if(run){steam(i+0.9,j+0.75,120,hs);steam(i+2.25,j+0.9,120,hs+0.4)}break;
    case 'elec':shadow(i+0.15,j+0.2,i+1.85,j+1.8,46);box(i+0.15,j+0.2,i+1.85,j+1.8,0,36,'#6f8ea6','#86a6bd',roof('#5a6b78'));wins('L',i+0.15,j+0.2,i+1.85,j+1.8,4,34,3,1,'#cfe3ef');wins('R',i+0.15,j+0.2,i+1.85,j+1.8,4,34,3,1,'#d9ecf6');break;
    default:box(i+0.15,j+0.15,i+0.85,j+0.85,0,16,'#999','#bbb','#888');
  }
  ctx.globalAlpha=1;
  const T0=BT[t];if(b.id!==9e6&&(T0.w||t==='station'||t==='port'||t==='warehouse')&&cam.z>=0.3&&(b.town<0||(T0.w&&b.eff<0.35)||b.why==='Storage full')){const s=bSize(t),p=P3(i+s/2,j+s/2,(s>1?62:36)),r=Math.max(5,7*cam.z);
    ctx.fillStyle=b.na==='locked'?'#97ada4':b.why==='Storage full'?'#f2a93b':'#ef7b58';ctx.beginPath();ctx.arc(p[0],p[1],r,0,6.283);ctx.fill();ctx.fillStyle='#fff';ctx.font=`700 ${Math.round(r*1.4)}px Jost, sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.na==='locked'?'·':'!',p[0],p[1]+0.5);ctx.textBaseline='alphabetic'}}
function tower(ci,cj,r,h){const b=P3(ci,cj,0),t=P3(ci,cj,h),m=P3(ci,cj,h*0.72),z=cam.z,rb=r*z,rm=r*0.62*z,rt=r*0.7*z;
  ctx.fillStyle='#d9d6cf';ctx.beginPath();ctx.moveTo(b[0]-rb,b[1]);ctx.quadraticCurveTo(m[0]-rm*0.8,m[1],t[0]-rt,t[1]);ctx.lineTo(t[0]+rt,t[1]);ctx.quadraticCurveTo(m[0]+rm*0.8,m[1],b[0]+rb,b[1]);
  ctx.ellipse(b[0],b[1],rb,rb/2,0,0,Math.PI);ctx.fill();ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(t[0],t[1],rt*0.9,b[1]-t[1]);ctx.fillStyle='#8f8c86';ctx.beginPath();ctx.ellipse(t[0],t[1],rt,rt/2,0,0,6.283);ctx.fill()}
function steam(ci,cj,h,seed){if(cam.z<0.2)return;for(let q=0;q<4;q++){const ph=((NOW/4200)+q/4+seed)%1,p=P3(ci+ph*0.4,cj-ph*0.2,h+ph*60),r=(14+ph*22)*cam.z;
  ctx.fillStyle=`rgba(250,250,248,${0.55*(1-ph)})`;ctx.beginPath();ctx.arc(p[0],p[1],r,0,6.283);ctx.fill()}}

/* ---------- trees: pre-drawn sprites per season (summer, autumn, winter) ---------- */
function mkSprite(w,h,fn){const c=document.createElement('canvas');c.width=w*2;c.height=h*2;const g=c.getContext('2d');g.scale(2,2);fn(g);return c}
function pineArt(tall,snow){return g=>{const H=tall?36:32,W=tall?16:18;g.fillStyle='rgba(0,0,0,0.18)';g.beginPath();g.ellipse(W/2,H-2,W*0.38,2.4,0,0,6.283);g.fill();g.fillStyle='#4e3626';g.fillRect(W/2-1,H-8,2,7);
  const tiers=tall?3:1;for(let q=0;q<tiers;q++){const y0=tall?1+q*8:2,y1=tall?14+q*8:H-7;g.fillStyle=tall?'#29503a':'#2f5a35';g.beginPath();g.moveTo(W/2,y0);g.lineTo(W-1,y1);g.lineTo(1,y1);g.closePath();g.fill();
    if(snow){g.fillStyle='rgba(245,248,250,0.92)';g.beginPath();g.moveTo(W/2,y0);g.lineTo(W/2+(W/2-1)*0.55,y0+(y1-y0)*0.55);g.lineTo(W/2-(W/2-1)*0.4,y0+(y1-y0)*0.45);g.closePath();g.fill()}}
  g.fillStyle='rgba(255,255,255,0.08)';g.beginPath();g.moveTo(W/2,1);g.lineTo(W/2,H-7);g.lineTo(1,H-7);g.closePath();g.fill()}}
function birchArt(season){return g=>{g.fillStyle='rgba(0,0,0,0.18)';g.beginPath();g.ellipse(10,28,7,2.5,0,0,6.283);g.fill();g.fillStyle='#e9e4d8';g.fillRect(9,14,2.2,15);g.fillStyle='#3a3a3a';g.fillRect(9,19,2.2,1);g.fillRect(9,24,2.2,1);
  if(season===2){g.strokeStyle='#8a8580';g.lineWidth=0.9;g.beginPath();[[10,15,4,6],[10,15,16,7],[10,18,5,11],[10,18,15,10],[10,13,10,3]].forEach(([a,b,c,d])=>{g.moveTo(a,b);g.lineTo(c,d)});g.stroke();
    g.fillStyle='rgba(245,248,250,0.9)';g.fillRect(4,6,3,1.2);g.fillRect(13,7,3,1.2);return}
  const c1=season===1?'#d9a23a':'#6f9a45',c2=season===1?'#ecc35a':'#86b153';g.fillStyle=c1;g.beginPath();g.arc(10,11,8,0,6.283);g.fill();g.fillStyle=c2;g.beginPath();g.arc(8,9,5,0,6.283);g.fill()}}
const TREES=[0,1,2].map(s=>[mkSprite(18,32,pineArt(false,s===2)),mkSprite(16,36,pineArt(true,s===2)),mkSprite(20,30,birchArt(s))]);
const TSZ=[[18,32],[16,36],[20,30]];
function drawTree(gi,gj,v){const p=P3(gi,gj,0),z=cam.z,s=TSZ[v],w=s[0]*z*1.15,h=s[1]*z*1.15,sea=SEASON.snow>0.45?2:SEASON.aut>0.45?1:0;ctx.drawImage(TREES[sea][v],p[0]-w/2,p[1]-h+2*z,w,h)}
function drawTrees(i,j){const n=cam.z<0.6?2:3;const pts=[];for(let q=0;q<n;q++)pts.push([i+0.18+hash2(i,j,20+q)*0.64,j+0.18+hash2(i,j,40+q)*0.64,Math.floor(hash2(i,j,60+q)*3)]);
  pts.sort((a,b)=>a[0]+a[1]-b[0]-b[1]);pts.forEach(p=>drawTree(p[0],p[1],p[2]))}
