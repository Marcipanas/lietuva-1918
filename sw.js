/* Lietuva 1918 — offline support (service worker).
   Bump VERSION whenever any shipped file changes, and keep SHELL in sync with the files the game loads.
   tools/check.js fails if a js/ file is missing from SHELL. */
const VERSION='l1918-0.4.1';
const FONTS='l1918-fonts';
const SHELL=['./','index.html','css/style.css','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png',
  'vendor/three.min.js','js/common.js','js/data.js','js/geo.js','js/geom.js','js/terrain.js','js/world.js','js/sim.js','js/models.js','js/scene.js','js/agents.js',
  'js/input.js','js/panels.js','js/tutorial.js','js/ui.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION&&k!==FONTS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url);
  if(url.origin===self.location.origin){
    // Game files: cache first, so the game starts instantly and works in flight mode.
    e.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy))}return res})));
  }else if(/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    // Web fonts: serve the cached copy, refresh it in the background when online.
    e.respondWith(caches.open(FONTS).then(c=>c.match(req).then(hit=>{const net=fetch(req).then(res=>{c.put(req,res.clone());return res}).catch(()=>hit);return hit||net})));
  }
});
