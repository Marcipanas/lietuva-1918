'use strict';
/* Lietuva 1918 — icons and helpers. Loaded first. */
/* ---------- icons & helpers ---------- */
const ICON={
  grain:'<path d="M12 21V6"/><path d="M12 9c-3 0-4.5-2-4.5-4.5C10.5 4.5 12 6.5 12 9zM12 9c3 0 4.5-2 4.5-4.5C13.5 4.5 12 6.5 12 9zM12 14c-3 0-4.5-2-4.5-4.5 3 0 4.5 2 4.5 4.5zM12 14c3 0 4.5-2 4.5-4.5-3 0-4.5 2-4.5 4.5z"/>',
  timber:'<circle cx="7.5" cy="16" r="3.5"/><circle cx="16.5" cy="16" r="3.5"/><circle cx="12" cy="8.5" r="3.5"/><circle cx="12" cy="8.5" r=".7"/><circle cx="7.5" cy="16" r=".7"/><circle cx="16.5" cy="16" r=".7"/>',
  peat:'<rect x="3.5" y="13" width="17" height="6" rx="1.2"/><rect x="6.5" y="7" width="11" height="6" rx="1.2"/><path d="M8 16h2M14 16h2M10.5 10h3"/>',
  flax:'<circle cx="12" cy="7.5" r="1.8"/><path d="M12 3.2v1.6M12 10.2V21M7.7 7.5h1.6M14.7 7.5h1.6M9 4.5l1.1 1.1M13.9 9.4 15 10.5M15 4.5l-1.1 1.1M10.1 9.4 9 10.5M12 15.5c-2.2-.6-3.5-2-3.5-4M12 18c2.2-.6 3.5-2 3.5-4"/>',
  bricks:'<rect x="3" y="5.5" width="18" height="13" rx="1.2"/><path d="M3 9.8h18M3 14.2h18M9 5.5v4.3M15 9.8v4.4M9 14.2v4.3"/>',
  butter:'<path d="M3.5 12.5 12 8l8.5 4.5v4L12 21l-8.5-4.5z"/><path d="M3.5 12.5 12 17l8.5-4.5M12 17v4"/>',
  textiles:'<path d="M5 5h12a3.5 3.5 0 0 1 0 7H5"/><ellipse cx="5" cy="8.5" rx="1.6" ry="3.5"/><path d="M5 12v8h11"/>',
  furniture:'<path d="M7 3v18M7 12h10v9M7 8h8"/>',
  metal:'<path d="M3.5 18h17l-3-7.5h-11z"/><path d="M6.5 10.5 8.5 6h7l2 4.5"/>',
  chip:'<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3"/>',
  bolt:'<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
  house:'<path d="M4 11 12 4.5l8 6.5V20H4z"/><path d="M10 20v-5h4v5"/>',
  hall:'<path d="M12 2v4M10 4h4M6.5 21V11L12 7l5.5 4v10M4 21h16M10 21v-4h4v4"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5"/><circle cx="17" cy="9" r="2.3"/><path d="M15.5 14.6c2.8.1 5 2 5 5.4"/>',
  heart:'<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/>',
  tree:'<path d="M12 3 6.5 11h3.5l-4 6h12l-4-6h3.5z"/><path d="M12 17v4"/>',
  wave:'<path d="M3 8c2.2-2 4.3 2 6.5 0s4.3-2 6.5 0 4.3 2 5 0M3 13c2.2-2 4.3 2 6.5 0s4.3-2 6.5 0 4.3 2 5 0M3 18c2.2-2 4.3 2 6.5 0s4.3-2 6.5 0 4.3 2 5 0"/>',
  anchor:'<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13.5a7 7 0 0 0 14 0M8.5 10.5h7"/>',
  atom:'<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/>',
  rail:'<path d="M8.5 3 6 21M15.5 3 18 21M7.5 7.5h9M6.8 12.5h10.4M6.2 17.5h11.6"/>',
  road:'<path d="M9 3 5 21M15 3l4 18M12 5v2.5M12 11v2.5M12 17v2.5"/>',
  zone:'<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><path d="M8 17v-4l4-3 4 3v4z"/>',
  cursor:'<path d="M5 3l13 7.5-5.5 1.8L10 18z"/><path d="M13 13l5 5"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  factory:'<path d="M3 20V10l5 3v-3l5 3V5h3.5v15z"/><path d="M3 20h18"/>',
  lock:'<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  coin:'<circle cx="12" cy="12" r="8.5"/><path d="M10 8v8h4.5"/>',
  target:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  panel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14 4v16M16.5 8h2M16.5 11h2"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>',
  pause:'<path d="M9 6v12M15 6v12"/>',
  up:'<path d="M12 19V5M6 11l6-6 6 6"/>'
};
function ic(n,cls){return `<svg class="ic${cls?' '+cls:''}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]||''}</svg>`}
function bName(b){return b.t==='house'?HOUSE.n[b.lv]:BT[b.t].n}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmt(n){n=Math.round(n||0);const a=Math.abs(n);const s=a>=100000?Math.round(a/1000)+'k':a>=10000?(a/1000).toFixed(1)+'k':a.toLocaleString('en-US');return (n<0?'−':'')+s}
function fd(n){return Math.abs(n)<0.05?'0.0':(n>0?'+':'−')+Math.abs(n).toFixed(1)}
function num(q){return String(Math.round(q*10)/10)}
function popStr(u){u=u||0;return u>=1000?(u/1000).toFixed(2)+'M':Math.round(u)+'k'}
function dOf(day){return new Date(START+day*864e5)}
function dateStr(day){const t=dOf(day);return t.getUTCDate()+' '+MON[t.getUTCMonth()]+' '+t.getUTCFullYear()}
function ymd(day){return dOf(day).toISOString().slice(0,10)}
function rname(r){return RI[r].n.toLowerCase()}
function rng(seed){return()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646}}
function hash2(i,j,s){let h=(i*374761393+j*668265263+(s||0)*1013904223)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296}
function vnoise(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi,s),b=hash2(xi+1,yi,s),c=hash2(xi,yi+1,s),d=hash2(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function pip(poly,x,y){let ins=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)ins=!ins}return ins}
function b64enc(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
function b64dec(str,u8){const s=atob(str);for(let i=0;i<s.length&&i<u8.length;i++)u8[i]=s.charCodeAt(i);return u8}
function costTxt(cost){return Object.entries(cost).filter(([k,q])=>q>0).map(([k,q])=>k==='lt'?fmt(q)+' Lt':fmt(q)+' '+rname(k)).join(' · ')}
