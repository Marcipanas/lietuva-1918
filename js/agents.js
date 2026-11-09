'use strict';
/* Lietuva 1918 — residents, commuters and route vehicles, drawn as instanced meshes.
   Visual only: the economy runs in sim.js; these show what it is doing. */
const WALK = [], VEH = [];
let agentVer = -1, vehKey = '';
const AG = new Pool(7, false);
const SHIRTS = [['#5b4a3a', '#2f3f5a', '#e8e2d0', '#6b2f2a', '#4a5a3a'], ['#3d5a8a', '#8a3d3d', '#d9b26a', '#e8e2d0', '#3d6b5a'],
  ['#e05d44', '#3a86c8', '#f2c14e', '#7bbf6a', '#e8e2d0', '#9b59b6']];
const RCOL = { grain: '#e7bd55', potatoes: '#b08850', dairy: '#f3e3a8', meat: '#c96a5a', fish: '#8fb7c9', timber: '#c48d5c', peat: '#7a6650', flax: '#86aef0',
  bricks: '#e07a55', textiles: '#d9a7cd', furniture: '#9fcf9c', metal: '#adbdca', electronics: '#62d6c8', beet: '#b7c98a', planks: '#f0cf9a', beer: '#f0a030', sugar: '#f4f2ea',
  cement: '#c9c4b4', fertiliser: '#b6e36a' };

/* a walk along town streets between two road points */
function streetPath(a, b) {
  const src = [{ e: a.e, s: a.s, o: 0 }], R = dijkstra(src, 'road'), info = distTo(R, b.e, b.s, src);
  if (!(info.d < 30)) return null;
  return pathTo(R, b.e, b.s, info).p;
}
function mover(p, speed, life) { const c = polyCum(p); return { p, c, L: c[c.length - 1], s: 0, dir: 1, speed, life, wait: 0 }; }
function spawnWalker(ti) {
  const homes = [], works = [];
  for (const b of S.bld) { if (b.town !== ti) continue; (b.t === 'house' ? homes : works).push(b); }
  if (!homes.length || !works.length) return;
  const h = homes[Math.floor(Math.random() * homes.length)], w = works[Math.floor(Math.random() * works.length)];
  const a = accessOf(bOBB(h), 'road'), b = accessOf(bOBB(w), 'road');
  if (!a || !b) return;
  const p = streetPath(a, b);
  if (!p || p.length < 2 || polyLen(p) < 0.15) return;
  const m = mover(p, 0.025 + Math.random() * 0.02, 2 + Math.floor(Math.random() * 3));
  m.t = ti; m.off = (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.015); m.col = SHIRTS[S.era - 1][Math.floor(Math.random() * SHIRTS[S.era - 1].length)];
  WALK.push(m);
}
function spawnCommuter() {
  const links = NET.edges.filter(e => e.road && e.road.len <= WALK_KM);
  if (!links.length || WALK.filter(w => w.cm).length > 10) return;
  const e = links[Math.floor(Math.random() * links.length)], A = S.towns[e.a], B = S.towns[e.b];
  if (!A || !B || A.lock || B.lock) return;
  const ab = A.comOut > 0.1 && B.comIn > 0.1, ba = B.comOut > 0.1 && A.comIn > 0.1;
  if (!ab && !ba) return;
  const p = pairPath('road', e.a, e.b);
  if (!p || p.path.length < 2) return;
  const m = mover(p.path, 0.06, 1);
  m.cm = 1; m.t = -1; m.off = 0.035; m.col = SHIRTS[S.era - 1][0];
  if (!ab) { m.s = m.L; m.dir = -1; }
  WALK.push(m);
}
function rebuildVeh() {
  VEH.length = 0;
  S.routes.forEach(r => {
    if (!r.ok) return;
    const p = routePath(r);
    if (!p || p.path.length < 2) return;
    const n = Math.min(r.n, 6), c = polyCum(p.path), L = c[c.length - 1];
    for (let q = 0; q < n; q++) VEH.push({ r, p: p.path, c, L, s: L * (q + 0.5) / n, dir: q % 2 ? -1 : 1, wait: 0, speed: r.mode === 'rail' ? 1.6 : r.vt === 'cart' ? 0.35 : 0.9, puff: Math.random() });
  });
}
function step(m, dt) {
  if (m.wait > 0) { m.wait -= dt; return false; }
  m.s += m.speed * dt * m.dir;
  if (m.s >= m.L) { m.s = m.L; m.dir = -1; m.wait = 1; return true; }
  if (m.s <= 0) { m.s = 0; m.dir = 1; m.wait = 1; return true; }
  return false;
}
/* Merchants' carts: one on each of the busiest trading links (TRADES, from the day tick), refreshed every few seconds. They carry
   the colour of the good that moves most. */
const TVEH = [];
let tvehT = 0;
function rebuildTraders() {
  const by = new Map();
  for (const [L, r, q] of TRADES) { const o = by.get(L) || { L, q: 0, r: null, best: 0, dir: q > 0 ? 1 : -1 }; o.q += Math.abs(q); if (Math.abs(q) > o.best) { o.best = Math.abs(q); o.r = r; o.dir = q > 0 ? 1 : -1; } by.set(L, o); }
  const top = [...by.values()].filter(o => o.q > 0.04).sort((a, b) => b.q - a.q).slice(0, 24), keep = new Set(top.map(o => o.L));
  for (let n = TVEH.length - 1; n >= 0; n--) if (!keep.has(TVEH[n].L)) TVEH.splice(n, 1);
  for (const o of top) {
    const old = TVEH.find(v => v.L === o.L);
    if (old) { old.r.mAB = { [o.r]: 1 }; old.r.mBA = { [o.r]: 1 }; continue; }
    const p = pairPath(o.L.road ? 'road' : 'rail', o.L.a, o.L.b);
    if (!p || p.path.length < 2) continue;
    const c = polyCum(p.path), L = c[c.length - 1], rail = !o.L.road;
    TVEH.push({ L: o.L, r: { mode: rail ? 'rail' : 'road', vt: rail ? 'steam' : 'cart', pax: 0, mAB: { [o.r]: 1 }, mBA: { [o.r]: 1 } }, p: p.path, c, L, s: Math.random() * L, dir: o.dir, wait: 0, speed: rail ? 1.2 : 0.3, puff: Math.random() });
  }
}
function updateAgents(dt) {
  if (agentVer !== NET.ver) { agentVer = NET.ver; WALK.length = 0; vehKey = ''; TVEH.length = 0; }
  if ((tvehT -= dt) <= 0) { tvehT = 6; rebuildTraders(); }
  const key = S.routes.map(r => r.id + ':' + r.n + ':' + r.vt + ':' + (r.ok ? 1 : 0) + ':' + Math.round(r.len || 0)).join(',');
  if (key !== vehKey) { vehKey = key; rebuildVeh(); }
  const f = [0, 1, 1.5, 2.2][S.speed];
  if (cam.dist < 11 && f > 0) S.towns.forEach((t, ti) => {
    if (t.lock || Math.hypot(t.x - cam.x, t.z - cam.z) > cam.dist * 2 + 3) return;
    const want = Math.min(14, 3 + Math.floor(Math.sqrt(t.pop) * 0.9));
    let have = 0;
    for (const w of WALK) if (w.t === ti) have++;
    if (have < want && Math.random() < 0.25) spawnWalker(ti);
  });
  if (f > 0 && Math.random() < 0.02) spawnCommuter();
  for (let n = WALK.length - 1; n >= 0; n--) {
    const w = WALK[n];
    if (step(w, dt * f) && --w.life <= 0) WALK.splice(n, 1);
  }
  for (const v of VEH) step(v, dt * f);
  for (const v of TVEH) step(v, dt * f);
}
/* draw: called by the renderer each frame */
function drawAgents() {
  AG.begin();
  const walkers = cam.dist < 11, vehicles = cam.dist < 70, sc = cam.dist > 12 ? cam.dist / 12 : 1;
  if (walkers) for (const w of WALK) {
    const q = polyAt(w.p, w.c, w.s), d = w.dir, x = q[0] - q[3] * w.off * d, z = q[1] + q[2] * w.off * d, rot = Math.atan2(q[2] * d, q[3] * d);
    const bob = Math.abs(Math.sin(NOW * 0.012 + w.off * 180)) * 0.002 * (w.wait > 0 ? 0 : 1);
    AG.add('legs', agentGeo('legs'), MAT.agent, x, bob, z, rot, 1, 1, 1);
    AG.add('body', agentGeo('body'), MAT.agent, x, bob, z, rot, 1, 1, 1, SEASON.snow > 0.4 ? '#5b4a3a' : w.col);
  }
  if (vehicles) for (const v of VEH.concat(TVEH)) {
    const r = v.r, rec = v.dir > 0 ? r.mAB : r.mBA;
    let best = null, bv = 0.3;
    if (rec) for (const k in rec) if (rec[k] > bv) { bv = rec[k]; best = k; }
    const cargo = best ? RCOL[best] : '#9a7a58';
    const at = s => { const q = polyAt(v.p, v.c, clamp(s, 0, v.L)); return [q[0], q[1], Math.atan2(q[2] * v.dir, q[3] * v.dir)]; };
    if (r.mode === 'rail') {
      const [x, z, rot] = at(v.s);
      AG.add(r.vt === 'etrain' ? 'eloco' : 'steam', agentGeo(r.vt === 'etrain' ? 'eloco' : 'steam'), MAT.agent, x, 0, z, rot, sc, sc, sc);
      for (let q = 1; q <= 4; q++) {
        const [wx, wz, wr] = at(v.s - v.dir * q * 0.085 * sc);
        if (r.pax) AG.add('coach', agentGeo('coach'), MAT.agent, wx, 0, wz, wr, sc, sc, sc);
        else AG.add('wagon', agentGeo('wagon'), MAT.agent, wx, 0, wz, wr, sc, sc, sc, q === 1 || q === 3 ? cargo : '#ffffff');
      }
      if (r.vt === 'steam' && S.speed && cam.dist < 40 && v.wait <= 0) { v.puff += 0.016 * 3; if (v.puff > 1) { v.puff = 0; puff(x, 0.055 * sc, z, 'loco'); } }
    } else {
      const [x, z, rot] = at(v.s);
      if (r.vt === 'cart') { AG.add('cart', agentGeo('cart'), MAT.agent, x, 0, z, rot, sc, sc, sc); AG.add('load', agentGeo('load'), MAT.agent, x, 0, z, rot, sc, sc, sc, r.pax ? '#d9cfb8' : cargo); }
      else if (r.pax) AG.add('bus', agentGeo('bus'), MAT.agent, x, 0, z, rot, sc, sc, sc);
      else AG.add('truck', agentGeo('truck'), MAT.agent, x, 0, z, rot, sc, sc, sc);
    }
  }
  AG.end();
}
