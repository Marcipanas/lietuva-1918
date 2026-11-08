'use strict';
/* Lietuva 1918 — the world model, all in km with no grid:
   - a road graph and a rail graph (nodes, and edges that are polylines; crossings become junctions)
   - buildings and zoned lots as oriented boxes {x, z, rot, w, d}
   - network analysis: which town owns what, town-to-town paths, the power grid, pollution
   - generation of the 1918 map
   Saved state lives in S (nodes, edges, bld, lots); this file keeps the fast lookups. */
const NODES = new Map(), EDGES = new Map(), BMAP = new Map(), LOTS = new Map();
const EH = new SpatialHash(2), BH = new SpatialHash(2), LH = new SpatialHash(2);
/* Version counters: the renderer rebuilds what changed. */
const WV = { net: 0, bld: 0, lots: 0, kr: 0 };
let SPACE_DIRTY = true, BLK_DIRTY = true;

const espec = e => (e.k === 'road' ? ROADT : RAILT)[e.lv];
function edgeRT(e) { e.c = polyCum(e.p); e.L = e.c[e.c.length - 1]; }
function bOBB(b) { const f = b.fp || BT[b.t].fp; return { x: b.x, z: b.z, rot: b.rot, w: f[0], d: f[1] }; }
function lotOBB(l) { return { x: l.x, z: l.z, rot: l.rot, w: LOT_W, d: LOT_D }; }
function segBox(a, b) { return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; }

/* ---------- indexes ---------- */
function indexEdge(e) { for (let i = 1; i < e.p.length; i++) { const bb = segBox(e.p[i - 1], e.p[i]); EH.add([e, i], bb[0], bb[1], bb[2], bb[3]); } }
function unindexEdge(e) {
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
  for (const q of e.p) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < z0) z0 = q[1]; if (q[1] > z1) z1 = q[1]; }
  removeFromHash(EH, x0, z0, x1, z1, it => it[0] === e);
}
function removeFromHash(H, x0, z0, x1, z1, pred) {
  const c = H.c;
  for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++)
    for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) {
      const k = i * 100003 + j, a = H.m.get(k);
      if (!a) continue;
      const f = a.filter(it => !pred(it));
      if (f.length) H.m.set(k, f); else H.m.delete(k);
    }
}
function rebuildIndex() {
  NODES.clear(); EDGES.clear(); BMAP.clear(); LOTS.clear();
  for (const n of S.nodes) { n.e = []; NODES.set(n.id, n); }
  for (const e of S.edges) { edgeRT(e); EDGES.set(e.id, e); NODES.get(e.a).e.push(e.id); NODES.get(e.b).e.push(e.id); }
  for (const b of S.bld) BMAP.set(b.id, b);
  for (const l of S.lots) LOTS.set(l.id, l);
  SPACE_DIRTY = BLK_DIRTY = true; NET.dirty = true; WV.net++; WV.bld++; WV.lots++;
}
function space() {
  if (!SPACE_DIRTY) return;
  SPACE_DIRTY = false; EH.clear(); BH.clear(); LH.clear();
  EDGES.forEach(indexEdge);
  BMAP.forEach(b => { const bb = obbBounds(bOBB(b)); BH.add(b, bb[0], bb[1], bb[2], bb[3]); });
  LOTS.forEach(l => { const bb = obbBounds(lotOBB(l)); LH.add(l, bb[0], bb[1], bb[2], bb[3]); });
}
/* The planner's view of what is built where. */
function blk() {
  if (!BLK_DIRTY) return;
  BLK_DIRTY = false; BLK.fill(0);
  EDGES.forEach(e => {
    const bit = e.k === 'road' ? 2 : 4;
    for (let s = 0; s <= e.L; s += 0.2) { const q = polyAt(e.p, e.c, s), k = cellAt(q[0], q[1]); if (k >= 0) BLK[k] |= bit; }
  });
  BMAP.forEach(b => forCellsIn(bOBB(b), 0.05, k => { BLK[k] |= 1; }));
  LOTS.forEach(l => forCellsIn(lotOBB(l), 0, k => { BLK[k] |= 8; }));
}
/* exact test used by the planner: does a straight piece of road pass through a building? */
exactBlock = (ax, az, bx, bz) => {
  space();
  let hit = false;
  BH.query(Math.min(ax, bx) - 1, Math.min(az, bz) - 1, Math.max(ax, bx) + 1, Math.max(az, bz) + 1, b => { if (!hit && obbSegDist(bOBB(b), ax, az, bx, bz) < 0.04) hit = true; });
  return hit;
};
function netChanged() { BLK_DIRTY = true; NET.dirty = true; WV.net++; }

/* ---------- the graph ---------- */
function addNode(x, z) { const n = { id: S.gid++, x, z, e: [] }; S.nodes.push(n); NODES.set(n.id, n); return n; }
function addEdge(k, lv, A, B, p) {
  p = dedupe(p.map(q => [q[0], q[1]]), 0.001);
  if (p.length < 2) p = [[A.x, A.z], [B.x, B.z]];
  p[0] = [A.x, A.z]; p[p.length - 1] = [B.x, B.z];
  p = densify(p, 0.8);
  const e = { id: S.gid++, k, lv, a: A.id, b: B.id, p };
  edgeRT(e); S.edges.push(e); EDGES.set(e.id, e); A.e.push(e.id); B.e.push(e.id);
  if (SPACE_DIRTY) space(); else indexEdge(e);
  netChanged();
  return e;
}
/* No segment longer than max km, so spatial lookups stay local. */
function densify(p, max) {
  const out = [p[0]];
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / max);
    for (let q = 1; q < n; q++) out.push([a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n]);
    out.push(b);
  }
  return out;
}
function dropNode(n) {
  if (n.e.length) return;
  NODES.delete(n.id);
  const i = S.nodes.indexOf(n); if (i >= 0) S.nodes.splice(i, 1);
}
function detachEdge(e) {
  space(); unindexEdge(e);
  EDGES.delete(e.id);
  const i = S.edges.indexOf(e); if (i >= 0) S.edges.splice(i, 1);
  for (const id of [e.a, e.b]) { const n = NODES.get(id); if (!n) continue; const q = n.e.indexOf(e.id); if (q >= 0) n.e.splice(q, 1); }
}
function removeEdge(e) {
  detachEdge(e); netChanged();
  for (const id of [e.a, e.b]) { const n = NODES.get(id); if (!n) continue; dropNode(n); if (NODES.has(id)) mergeNode(n); }
}
/* Join the two edges at a node that has exactly two of the same kind and level. */
function mergeNode(n) {
  if (n.e.length !== 2) return;
  const e1 = EDGES.get(n.e[0]), e2 = EDGES.get(n.e[1]);
  if (!e1 || !e2 || e1 === e2 || e1.k !== e2.k || e1.lv !== e2.lv || e1.a === e1.b || e2.a === e2.b) return;
  const A = NODES.get(e1.a === n.id ? e1.b : e1.a), B = NODES.get(e2.a === n.id ? e2.b : e2.a);
  if (A === B) return;
  const p1 = e1.b === n.id ? e1.p : e1.p.slice().reverse(), p2 = e2.a === n.id ? e2.p : e2.p.slice().reverse();
  detachEdge(e1); detachEdge(e2); dropNode(n);
  addEdge(e1.k, e1.lv, A, B, p1.concat(p2.slice(1)));
}
/* Split an edge at arc length s and return the node there. */
function splitEdge(e, s) {
  if (s < 0.03) return NODES.get(e.a);
  if (s > e.L - 0.03) return NODES.get(e.b);
  space(); unindexEdge(e);
  const pa = polySlice(e.p, e.c, 0, s), pb = polySlice(e.p, e.c, s, e.L), P = pa[pa.length - 1];
  const n = addNode(P[0], P[1]), nb = NODES.get(e.b);
  nb.e.splice(nb.e.indexOf(e.id), 1);
  e.b = n.id; e.p = pa; e.p[e.p.length - 1] = [n.x, n.z]; edgeRT(e); n.e.push(e.id); indexEdge(e);
  addEdge(e.k, e.lv, n, nb, pb);
  return n;
}
/* Closest edge of kind k within r of a point: {e, s, d, x, z}. */
function nearestEdge(x, z, k, r, skip) {
  space();
  let best = null;
  EH.query(x - r, z - r, x + r, z + r, it => {
    const e = it[0], i = it[1];
    if ((k && e.k !== k) || (skip && skip(e))) return;
    const a = e.p[i - 1], b = e.p[i], q = segClosest(x, z, a[0], a[1], b[0], b[1]);
    if (q[3] <= r && (!best || q[3] < best.d)) best = { e, s: e.c[i - 1] + (e.c[i] - e.c[i - 1]) * q[0], d: q[3], x: q[1], z: q[2] };
  });
  return best;
}
/* Where a new line would attach: an existing node {n}, a point on an edge {e, s}, or null. */
function snapNet(x, z, k, r) {
  const ne = nearestEdge(x, z, k, r);
  if (!ne) return null;
  const A = NODES.get(ne.e.a), B = NODES.get(ne.e.b), da = Math.hypot(A.x - x, A.z - z), db = Math.hypot(B.x - x, B.z - z);
  if (da <= r * 1.2 && da <= db) return { n: A, x: A.x, z: A.z, d: da };
  if (db <= r * 1.2) return { n: B, x: B.x, z: B.z, d: db };
  return ne;
}
function linked(A, B) { return A.e.some(id => { const e = EDGES.get(id); return e && (e.a === B.id || e.b === B.id); }); }
/* Build a road or railway along pts. Ends snap to the network; crossings of the same kind become junctions.
   Road and rail cross each other on the level. Returns the new edges. */
function buildLine(k, lv, pts, snapR) {
  snapR = snapR === undefined ? 0.15 : snapR;
  pts = dedupe(pts.map(q => [q[0], q[1]]), 0.01);
  if (pts.length < 2) return [];
  const endNode = q => {
    const sn = snapR > 0 ? snapNet(q[0], q[1], k, snapR) : null;
    if (!sn) return addNode(q[0], q[1]);
    return sn.n || splitEdge(sn.e, sn.s);
  };
  const A = endNode(pts[0]), B = endNode(pts[pts.length - 1]);
  pts[0] = [A.x, A.z]; pts[pts.length - 1] = [B.x, B.z];
  const c = polyCum(pts), L = c[c.length - 1];
  if (L < 0.08) { dropNode(A); dropNode(B); return []; }
  const cuts = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], bb = segBox(a, b);
    EH.query(bb[0], bb[1], bb[2], bb[3], it => {
      const e = it[0], j = it[1];
      if (e.k !== k) return;
      const p0 = e.p[j - 1], p1 = e.p[j], x = segX(a[0], a[1], b[0], b[1], p0[0], p0[1], p1[0], p1[1]);
      if (!x) return;
      const sn = c[i - 1] + (c[i] - c[i - 1]) * x[0];
      if (sn < 0.06 || sn > L - 0.06) return;
      cuts.push({ sn, e, se: e.c[j - 1] + (e.c[j] - e.c[j - 1]) * x[1] });
    });
  }
  /* split crossed edges from their far end backwards, so earlier positions stay valid */
  const byEdge = new Map();
  for (const q of cuts) { if (!byEdge.has(q.e)) byEdge.set(q.e, []); byEdge.get(q.e).push(q); }
  byEdge.forEach((list, e) => { list.sort((p, q) => q.se - p.se); for (const q of list) q.node = splitEdge(e, q.se); });
  cuts.sort((p, q) => p.sn - q.sn);
  const stops = [{ sn: 0, node: A }];
  for (const q of cuts) {
    const last = stops[stops.length - 1];
    if (q.sn - last.sn < 0.05) {
      if (q.node !== last.node && !linked(q.node, last.node)) addEdge(k, lv, last.node, q.node, [[last.node.x, last.node.z], [q.node.x, q.node.z]]);
      continue;
    }
    stops.push(q);
  }
  if (L - stops[stops.length - 1].sn < 0.05 && stops.length > 1) {
    const last = stops.pop();
    if (last.node !== B && !linked(last.node, B)) addEdge(k, lv, last.node, B, [[last.node.x, last.node.z], [B.x, B.z]]);
  }
  stops.push({ sn: L, node: B });
  const made = [];
  for (let q = 1; q < stops.length; q++) {
    const s0 = stops[q - 1], s1 = stops[q];
    if (s0.node === s1.node) continue;
    const seg = polySlice(pts, c, s0.sn, s1.sn), len = polyLen(seg);
    const dup = s0.node.e.map(id => EDGES.get(id)).find(e => e && e.k === k && (e.a === s1.node.id || e.b === s1.node.id) && Math.abs(e.L - len) < 0.15);
    if (dup) { if (dup.lv < lv) { dup.lv = lv; netChanged(); } made.push(dup); continue; }
    made.push(addEdge(k, lv, s0.node, s1.node, seg));
  }
  return made;
}
/* The parts of a planned line that do not already run along a line of the same kind, slightly overlapping
   the existing line so they snap onto it. Returns [{p, km}]. */
function newRuns(pts, k) {
  const c = polyCum(pts), L = c[c.length - 1], step = 0.05, out = [];
  let s0 = -1;
  const close = s1 => { const a = Math.max(0, s0 - step * 2), b = Math.min(L, s1 + step * 2); if (b - a > 0.08) out.push({ p: polySlice(pts, c, a, b), km: s1 - s0 }); s0 = -1; };
  for (let s = 0; s <= L + 1e-6; s += step) {
    const q = polyAt(pts, c, Math.min(s, L)), on = !!nearestEdge(q[0], q[1], k, 0.07);
    if (!on && s0 < 0) s0 = s;
    if (on && s0 >= 0) close(s);
  }
  if (s0 >= 0) close(L);
  return out;
}
/* Clear trees and zoned lots under new roads or tracks. */
function afterLine(edges) {
  space();
  const cells = [], gone = new Set();
  for (const e of edges) {
    const r = espec(e).w / 2 + 0.1;
    for (let s = 0; s <= e.L; s += 0.15) { const q = polyAt(e.p, e.c, s); forDisk(q[0], q[1], r, k => { if (TF[k] & F_FOREST) cells.push(k); }); }
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
    for (const q of e.p) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
    LH.query(x0 - 1, z0 - 1, x1 + 1, z1 + 1, l => { if (obbPolyDist(lotOBB(l), e.p) < espec(e).w / 2 + 0.02) gone.add(l); });
  }
  if (cells.length) setFlags(cells, 0, F_FOREST);
  gone.forEach(removeLot);
}

/* ---------- buildings and lots ---------- */
/* fp: a footprint of its own (landmarks), instead of the type's */
function addB(t, x, z, rot, lv, quiet, fp) {
  const b = { id: S.nid++, t, x, z, rot: rot || 0, lv: lv || 1, on: true, eff: 0, why: 'Starting', town: -1, cd: 0, k: 1 };
  if (fp) b.fp = fp;
  S.bld.push(b); BMAP.set(b.id, b);
  const o = bOBB(b);
  space(); const bb = obbBounds(o); BH.add(b, bb[0], bb[1], bb[2], bb[3]);
  clearForest(o, 0.03); removeLotsIn(o);
  BLK_DIRTY = true; WV.bld++; if (!quiet) NET.dirty = true;
  return b;
}
function removeB(b) {
  BMAP.delete(b.id);
  const i = S.bld.indexOf(b); if (i >= 0) S.bld.splice(i, 1);
  space(); const bb = obbBounds(bOBB(b)); removeFromHash(BH, bb[0], bb[1], bb[2], bb[3], x => x === b);
  BLK_DIRTY = true; WV.bld++; NET.dirty = true;
}
function clearForest(o, pad) {
  const cells = [];
  forCellsIn(o, pad, k => { if (TF[k] & F_FOREST) cells.push(k); });
  if (cells.length) setFlags(cells, 0, F_FOREST);
}
function addLot(x, z, rot) {
  const l = { id: S.lid++, x, z, rot, town: -1, cd: 0 };
  S.lots.push(l); LOTS.set(l.id, l);
  space(); const bb = obbBounds(lotOBB(l)); LH.add(l, bb[0], bb[1], bb[2], bb[3]);
  BLK_DIRTY = true; WV.lots++;
  return l;
}
function removeLot(l) {
  if (!LOTS.has(l.id)) return;
  LOTS.delete(l.id);
  const i = S.lots.indexOf(l); if (i >= 0) S.lots.splice(i, 1);
  space(); const bb = obbBounds(lotOBB(l)); removeFromHash(LH, bb[0], bb[1], bb[2], bb[3], x => x === l);
  BLK_DIRTY = true; WV.lots++;
}
function removeLotsIn(o, pad) {
  space();
  const bb = obbBounds(o, 0.2), gone = [];
  LH.query(bb[0], bb[1], bb[2], bb[3], l => { if (obbOverlap(o, lotOBB(l), pad || 0)) gone.push(l); });
  gone.forEach(removeLot);
  return gone.length;
}
function bAt(x, z) { space(); let hit = null; BH.query(x, z, x, z, b => { if (!hit && obbHas(bOBB(b), x, z)) hit = b; }); return hit; }
function lotAt(x, z) { space(); let hit = null; LH.query(x, z, x, z, l => { if (!hit && obbHas(lotOBB(l), x, z)) hit = l; }); return hit; }
/* Nearest edge of kind k that a footprint can reach: {e, s, d} or null. */
function accessOf(o, k, reach) {
  space();
  reach = reach === undefined ? ACCESS : reach;
  const bb = obbBounds(o, reach + 0.3), hd = Math.hypot(o.w, o.d) / 2;
  let best = null;
  EH.query(bb[0], bb[1], bb[2], bb[3], it => {
    const e = it[0], i = it[1];
    if (e.k !== k) return;
    const a = e.p[i - 1], b = e.p[i], hw = espec(e).w / 2, cd = segClosest(o.x, o.z, a[0], a[1], b[0], b[1])[3] - hd - hw;
    if (cd > reach || (best && cd > best.d)) return;  /* too far even from the box's corners: skip the exact test */
    const d = obbSegDist(o, a[0], a[1], b[0], b[1]) - hw;
    if (d <= reach && (!best || d < best.d)) {
      const q = segClosest(o.x, o.z, a[0], a[1], b[0], b[1]);
      best = { e, s: e.c[i - 1] + (e.c[i] - e.c[i - 1]) * q[0], d };
    }
  });
  return best;
}
const bad = why => ({ ok: false, why });
function inKR(x, z) { return !!(flagsAt(x, z) & F_KR); }
function validPlace(t, x, z, rot, gen) {
  const B0 = BT[t];
  if (!gen && !unlocked(t)) return bad(`Unlocks in the ${ERAS[B0.era].n} era`);
  const o = { x, z, rot, w: B0.fp[0], d: B0.fp[1] };
  let n = 0, fert = 0, flx = 0, bog = 0, clay = 0, riv = 0, err = '';
  forCellsIn(o, 0, k => {
    n++;
    const tt = TT[k], f = TF[k];
    if (!(f & F_LT)) { err = err || 'Outside Lithuania'; return; }
    if (!gen && (f & F_KR) && S.kr) { err = err || (S.hist.lost ? 'The Klaipėda Region belongs to Germany' : 'The Klaipėda Region joins Lithuania in 1923'); return; }
    if (tt === T_RIVER) riv++;
    else if (tt !== T_LAND && tt !== T_SAND) { err = err || 'Cannot build on water'; return; }
    if (f & F_FERTILE) fert++; if (f & F_FLAX) flx++; if (f & F_BOG) bog++; if (f & F_CLAY) clay++;
  });
  if (err) return bad(err);
  if (B0.need === 'river') { if (!riv) return bad('Must be built across a river'); }
  else if (riv || waterHit(o, 0.01)) return bad('Cannot build on water');
  space();
  const bb = obbBounds(o, 0.4);
  let hit = null, line = null;
  BH.query(bb[0], bb[1], bb[2], bb[3], b => { if (!hit && obbOverlap(o, bOBB(b), 0.04)) hit = b; });
  if (hit) return bad('Something is already built here');
  EH.query(bb[0], bb[1], bb[2], bb[3], it => {
    if (line) return;
    const e = it[0], i = it[1], a = e.p[i - 1], b = e.p[i];
    if (obbSegDist(o, a[0], a[1], b[0], b[1]) < espec(e).w / 2 + 0.02) line = e;
  });
  if (line) return bad(line.k === 'road' ? 'A road is in the way' : 'A railway is in the way');
  const ring = (r, test) => { let c = 0; forCellsIn(o, r, k => { if (test(TT[k], TF[k])) c++; }); return c; };
  switch (B0.need) {
    case 'forest': if (ring(0.6, (tt, f) => f & F_FOREST) < 3) return bad('Needs forest around it'); break;
    case 'bog': if (bog < Math.max(2, n * 0.4)) return bad('Needs peat bog under it'); break;
    case 'clay': if (!clay) return bad('Needs clay ground'); break;
    case 'open': if (bog > n * 0.25) return bad('Too wet: this is bog'); break;
    case 'rail': if (!gen && !accessOf(o, 'rail', 0.25)) return bad('Must be next to a railway track'); break;
    case 'coast': if (!ring(0.7, tt => tt === T_SEA || tt === T_LAGOON)) return bad('Must be on the coast'); break;
    case 'lake': if (!ring(0.8, tt => tt === T_LAKE)) return bad('Must be next to a lake'); break;
    case 'water': if (!ring(0.6, tt => isWaterT(tt))) return bad('Must be on a shore'); break;
    case 'border': { let c = 0; forCellsIn(o, 3, k => { if (CTY[k] > 1) c++; }); if (!c) return bad('Must be within 3 km of the border'); break; }
  }
  if (t === 'hall') for (const tw of S.towns) if (Math.hypot(tw.x - x, tw.z - z) < HALL_GAP) return bad(`Too close to ${tw.n}`);
  return { ok: true, bonus: (B0.bonus === 'fertile' && fert >= n * 0.4) || (B0.bonus === 'flaxland' && flx >= n * 0.4) };
}
/* Lot spots along both sides of a road, facing it. */
function lotSpots(e) {
  if (e.k !== 'road') return [];
  const out = [], off = espec(e).w / 2 + 0.04 + LOT_D / 2, n = Math.floor((e.L + 0.1) / LOT_GAP);
  if (n < 1) return out;
  const s0 = (e.L - (n - 1) * LOT_GAP) / 2;
  for (let q = 0; q < n; q++) {
    const s = s0 + q * LOT_GAP, p = polyAt(e.p, e.c, s);
    for (const side of [1, -1]) {
      const nx = -p[3] * side, nz = p[2] * side;
      out.push({ x: p[0] + nx * off, z: p[1] + nz * off, rot: faceRot(-nx, -nz), e: e.id, s });
    }
  }
  return out;
}
function lotOk(c, gen) {
  const o = { x: c.x, z: c.z, rot: c.rot, w: LOT_W, d: LOT_D };
  let no = false;
  forCellsIn(o, 0, k => { const tt = TT[k], f = TF[k]; if (!(f & F_LT) || (tt !== T_LAND && tt !== T_SAND) || (!gen && (f & F_KR) && S.kr)) no = true; });
  if (no || waterHit(o, 0.01)) return false;
  space();
  const bb = obbBounds(o, 0.4);
  BH.query(bb[0], bb[1], bb[2], bb[3], b => { if (!no && obbOverlap(o, bOBB(b), 0.02)) no = true; });
  if (!no) LH.query(bb[0], bb[1], bb[2], bb[3], l => { if (!no && obbOverlap(o, lotOBB(l), 0.01)) no = true; });
  if (!no) EH.query(bb[0], bb[1], bb[2], bb[3], it => {
    if (no) return;
    const e = it[0], i = it[1], a = e.p[i - 1], b = e.p[i];
    if (obbSegDist(o, a[0], a[1], b[0], b[1]) < espec(e).w / 2 + 0.02) no = true;
  });
  return !no;
}
function traceBox(tr, r) {
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
  for (const q of tr) { x0 = Math.min(x0, q[0]); z0 = Math.min(z0, q[1]); x1 = Math.max(x1, q[0]); z1 = Math.max(z1, q[1]); }
  return [x0 - r, z0 - r, x1 + r, z1 + r];
}
const asLine = tr => tr.length > 1 ? tr : [tr[0], [tr[0][0] + 1e-3, tr[0][1]]];
/* Lots that zoning along a finger trace would create. */
function zonePlan(trace, R, gen) {
  if (!trace.length) return [];
  space();
  const tr = asLine(trace), tc = polyCum(tr), bb = traceBox(tr, R + 0.6), edges = new Set(), cands = [], out = [];
  EH.query(bb[0], bb[1], bb[2], bb[3], it => { if (it[0].k === 'road') edges.add(it[0]); });
  edges.forEach(e => lotSpots(e).forEach(c => { const d = polyClosest(tr, tc, c.x, c.z).d; if (d <= R + LOT_D * 0.7) { c.dd = d; cands.push(c); } }));
  cands.sort((a, b) => a.dd - b.dd);
  for (const c of cands) {
    if (!lotOk(c, gen)) continue;
    const o = { x: c.x, z: c.z, rot: c.rot, w: LOT_W, d: LOT_D };
    if (out.some(p => obbOverlap(o, { x: p.x, z: p.z, rot: p.rot, w: LOT_W, d: LOT_D }, 0.01))) continue;
    out.push(c);
  }
  return out;
}
/* What removing along a finger trace would take away. Edges are cut only where the brush touches them. */
function bullPlan(trace, R) {
  space();
  const tr = asLine(trace), tc = polyCum(tr), bb = traceBox(tr, R + 0.5), b = [], lots = [], segs = [], seen = new Set();
  BH.query(bb[0], bb[1], bb[2], bb[3], x => { if (x.t !== 'hall' && x.t !== 'landmark' && obbPolyDist(bOBB(x), tr) <= R) b.push(x); });
  LH.query(bb[0], bb[1], bb[2], bb[3], l => { if (obbPolyDist(lotOBB(l), tr) <= R) lots.push(l); });
  EH.query(bb[0], bb[1], bb[2], bb[3], it => {
    const e = it[0];
    if (seen.has(e)) return;
    seen.add(e);
    const R2 = R + espec(e).w / 2;
    let s0 = Infinity, s1 = -Infinity;
    for (let s = 0; s <= e.L + 0.03; s += 0.05) {
      const ss = Math.min(s, e.L), q = polyAt(e.p, e.c, ss);
      if (polyClosest(tr, tc, q[0], q[1]).d <= R2) { if (ss < s0) s0 = ss; if (ss > s1) s1 = ss; }
    }
    if (s1 >= s0) segs.push({ e, s0: s0 < 0.15 ? 0 : s0, s1: s1 > e.L - 0.15 ? e.L : s1 });
  });
  let road = 0, rail = 0;
  segs.forEach(q => { if (q.e.k === 'road') road += q.s1 - q.s0; else rail += q.s1 - q.s0; });
  return { b, lots, segs, road, rail };
}
function applyBull(plan) {
  plan.b.forEach(removeB);
  plan.lots.forEach(removeLot);
  for (const q of plan.segs) {
    const e = q.e;
    if (!EDGES.has(e.id)) continue;
    if (q.s1 < e.L - 0.03) splitEdge(e, q.s1);
    if (q.s0 > 0.03) {
      const n = splitEdge(e, q.s0), mid = n.e.map(id => EDGES.get(id)).find(x => x && x !== e && x.a === n.id);
      if (mid) removeEdge(mid);
    } else removeEdge(e);
  }
  NET.dirty = true;
}

/* ---------- network analysis ---------- */
const NET = { dirty: true, ver: 0, hall: [], R: null, R0: null, srcs: [], src0: [], off: [], edges: [], adj: [], comp: [], grid: [], linked: new Set(), rail: new Set(),
  cache: new Map(), cacheVer: -1, km: { road: [0, 0, 0, 0], rail: [0, 0, 0] }, up: 0, pol: [] };
/* Shortest distances over the graph of kind k from point sources {e, s, o, d0} (d0: head start, 0 if missing).
   With targets [{e, s}], it stops once nothing can beat the best way to a target. */
function dijkstra(srcs, k, tg) {
  const d = new Map(), o = new Map(), prev = new Map(), hk = [], hv = [];
  const push = (id, f) => { hk.push(f); hv.push(id); let n = hk.length - 1; while (n > 0) { const p = (n - 1) >> 1; if (hk[p] <= hk[n]) break; [hk[p], hk[n]] = [hk[n], hk[p]]; [hv[p], hv[n]] = [hv[n], hv[p]]; n = p; } };
  const pop = () => { const v = hv[0], f = hk[0], lk = hk.pop(), lv = hv.pop(); if (hk.length) { hk[0] = lk; hv[0] = lv; let n = 0; for (;;) { const l = 2 * n + 1, r = l + 1; let m = n; if (l < hk.length && hk[l] < hk[m]) m = l; if (r < hk.length && hk[r] < hk[m]) m = r; if (m === n) break; [hk[m], hk[n]] = [hk[n], hk[m]]; [hv[m], hv[n]] = [hv[n], hv[m]]; n = m; } } return [v, f]; };
  let best = Infinity;
  const near = tg ? new Map() : null;
  if (tg) for (const t of tg) {
    for (const [id, c] of [[t.e.a, t.s], [t.e.b, t.e.L - t.s]]) { if (!near.has(id)) near.set(id, []); near.get(id).push(c); }
    for (const s of srcs) if (s.e === t.e) best = Math.min(best, Math.abs(s.s - t.s) + (s.d0 || 0));
  }
  const relax = (id, nd, own, pv) => {
    const cur = d.get(id); if (cur !== undefined && cur <= nd) return;
    d.set(id, nd); o.set(id, own); prev.set(id, pv); push(id, nd);
    if (near && near.has(id)) for (const c of near.get(id)) if (nd + c < best) best = nd + c;
  };
  for (const s of srcs) { const h = s.d0 || 0; relax(s.e.a, s.s + h, s.o, { src: s, e: s.e.id }); relax(s.e.b, s.e.L - s.s + h, s.o, { src: s, e: s.e.id }); }
  while (hk.length) {
    const [id, dd] = pop();
    if (dd > d.get(id)) continue;
    if (dd >= best) break;
    const n = NODES.get(id), own = o.get(id);
    for (const eid of n.e) {
      const e = EDGES.get(eid);
      if (e.k !== k || e.a === e.b) continue;
      relax(e.a === id ? e.b : e.a, dd + e.L, own, { from: id, e: eid });
    }
  }
  return { d, o, prev };
}
/* Distance from the sources to a point (e, s), head starts included. via: 'a', 'b' or the source on the same edge. */
function distTo(R, e, s, srcs) {
  let best = Infinity, own = -1, via = null;
  const da = R.d.get(e.a), db = R.d.get(e.b);
  if (da !== undefined && da + s < best) { best = da + s; own = R.o.get(e.a); via = 'a'; }
  if (db !== undefined && db + e.L - s < best) { best = db + e.L - s; own = R.o.get(e.b); via = 'b'; }
  if (srcs) for (const q of srcs) if (q.e === e && Math.abs(q.s - s) + (q.d0 || 0) < best) { best = Math.abs(q.s - s) + (q.d0 || 0); own = q.o; via = q; }
  return { d: best, o: own, via };
}
/* Polyline from the sources to (e, s), and the weakest level on the way. */
function pathTo(R, e, s, info) {
  if (info.via && info.via.e) {
    const q = info.via, p = polySlice(e.p, e.c, Math.min(q.s, s), Math.max(q.s, s));
    return { p: q.s > s ? p.reverse() : p, lv: e.lv };
  }
  const parts = [info.via === 'a' ? polySlice(e.p, e.c, 0, s) : polySlice(e.p, e.c, s, e.L).reverse()];
  let lv = e.lv, id = info.via === 'a' ? e.a : e.b, guard = 0;
  while (guard++ < 20000) {
    const pv = R.prev.get(id);
    if (!pv) break;
    const pe = EDGES.get(pv.e);
    lv = Math.min(lv, pe.lv);
    if (pv.src) { parts.push(id === pe.a ? polySlice(pe.p, pe.c, 0, pv.src.s).reverse() : polySlice(pe.p, pe.c, pv.src.s, pe.L)); break; }
    parts.push(pe.a === pv.from ? pe.p : pe.p.slice().reverse());
    id = pv.from;
  }
  parts.reverse();
  let out = [];
  for (const p of parts) out = out.length ? out.concat(p.slice(1)) : p.slice();
  return { p: dedupe(out, 0.001), lv };
}
/* Where goods enter and leave a town's network: its town hall's road, or the tracks by its stations. */
function townSrc(k, n) {
  if (k === 'road') { const h = NET.hall[n]; return h ? [{ e: h.e, s: h.s, o: n }] : []; }
  return NET.stSrc.filter(q => q.o === n);
}
/* Shortest road or rail path between two towns, worked out when first asked for and kept until the network changes:
   {len, lv (weakest level on the way), path} or null. */
function pairPath(k, a, b) {
  if (NET.cacheVer !== NET.ver) { NET.cache.clear(); NET.cacheVer = NET.ver; }
  const lo = Math.min(a, b), hi = Math.max(a, b), key = k + lo + '_' + hi;
  if (NET.cache.has(key)) return NET.cache.get(key);
  let res = null;
  const sa = townSrc(k, lo), sb = townSrc(k, hi);
  if (lo !== hi && sa.length && sb.length && NET.comp[lo] >= 0 && NET.comp[lo] === NET.comp[hi]) {
    const R = dijkstra(sa, k, sb);
    let best = null;
    for (const t of sb) { const info = distTo(R, t.e, t.s, sa); if (info.d < Infinity && (!best || info.d < best.info.d)) best = { info, t }; }
    if (best) { const p = pathTo(R, best.t.e, best.t.s, best.info); res = { len: best.info.d, lv: p.lv, path: p.p }; }
  }
  NET.cache.set(key, res);
  return res;
}
/* Owner of a road point and the true road distance to its town hall: {o, d}. pref = workplaces, which prefer towns over villages. */
function ownerAt(e, s, pref) {
  const R = pref ? NET.R : NET.R0, srcs = pref ? NET.srcs : NET.src0;
  if (!R) return { o: -1, d: Infinity };
  const q = distTo(R, e, s, srcs);
  if (q.o < 0) return { o: -1, d: Infinity };
  return { o: q.o, d: q.d - (pref ? NET.off[q.o] : 0) };
}
function analyze() {
  space();
  const tw = S.towns, act = tw.map(t => !t.lock), halls = tw.map(() => null);
  S.bld.forEach(b => { if (b.t === 'hall' && b.ti !== undefined) halls[b.ti] = b; });
  NET.hall = tw.map((t, n) => halls[n] && act[n] ? accessOf(bOBB(halls[n]), 'road', ACCESS + 0.15) : null);
  NET.off = tw.map(t => t.vil ? VIL_OFF : 0);
  /* two sweeps from every town hall: homes belong to the nearest settlement, workplaces prefer towns */
  NET.src0 = []; NET.srcs = [];
  NET.hall.forEach((a, n) => { if (a) { NET.src0.push({ e: a.e, s: a.s, o: n }); NET.srcs.push({ e: a.e, s: a.s, o: n, d0: NET.off[n] }); } });
  NET.R0 = dijkstra(NET.src0, 'road'); NET.R = dijkstra(NET.srcs, 'road');
  const own = (o, pref) => { const a = accessOf(o, 'road'); if (!a) return null; const q = ownerAt(a.e, a.s, pref); return q.o >= 0 && q.d <= TERRITORY ? q : { d: q.d, o: -1 }; };
  S.bld.forEach(b => {
    b.na = ''; b.k = 1;
    if (b.t === 'hall') { b.town = act[b.ti] ? b.ti : -1; return; }
    const lock = S.kr && inKR(b.x, b.z), q = lock ? null : own(bOBB(b), b.t !== 'house');
    if (!q || q.o < 0) { b.town = -1; b.cd = 0; b.na = lock ? 'locked' : q ? 'far' : 'noroad'; return; }
    b.town = q.o; b.cd = q.d;
    if (b.t === 'customs') b.gate = borderOf(b.x, b.z);
    else if (b.t === 'forestry') { let c = 0; forDisk(b.x, b.z, 1.6, k => { if (TF[k] & F_FOREST) c++; }); b.k = clamp(c / 20, 0.3, 1.4); }
    else if (BT[b.t].bonus) {
      const bit = BT[b.t].bonus === 'fertile' ? F_FERTILE : F_FLAX;
      let c = 0, n = 0;
      forCellsIn(bOBB(b), 0, k => { n++; if (TF[k] & bit) c++; });
      if (c >= n * 0.4) b.k = b.t === 'flax' ? 1.4 : 1.35;
    }
  });
  S.lots.forEach(l => { l.town = -1; l.cd = 0; const q = S.kr && inKR(l.x, l.z) ? null : own(lotOBB(l), false); if (q && q.o >= 0) { l.town = q.o; l.cd = q.d; } });
  /* stations: where trains stop for each town */
  NET.stSrc = [];
  S.bld.forEach(b => { if (b.t !== 'station' || b.town < 0) return; const a = accessOf(bOBB(b), 'rail', 0.35); if (a) NET.stSrc.push({ e: a.e, s: a.s, o: b.town }); });
  /* comp: settlements joined by any road or railway (goods can travel between them).
     grid: settlements joined by railways and paved roads, which also carry the power lines; linked: those in the capital's.
     A settlement reaches the paved network when one starts within its streets (by road from the hall). */
  const comps = good => {
    const up = new Map(), find = x => { let r = x; while (up.get(r) !== r) r = up.get(r); while (up.get(x) !== r) { const n = up.get(x); up.set(x, r); x = n; } return r; };
    NODES.forEach(n => up.set(n.id, n.id));
    EDGES.forEach(e => { if (good && !(e.k === 'rail' || e.lv >= 2)) return; const ra = find(e.a), rb = find(e.b); if (ra !== rb) up.set(ra, rb); });
    const tu = tw.map((t, n) => n), tf = x => { while (tu[x] !== x) { tu[x] = tu[tu[x]]; x = tu[x]; } return x; };
    const first = new Map(), join = (n, id) => { const r = find(id); if (first.has(r)) { const a = tf(first.get(r)), b = tf(n); if (a !== b) tu[a] = b; } else first.set(r, n); };
    NET.hall.forEach((a, n) => { if (!a) return; if (!good) join(n, a.e.a); else reachGood(a, (tw[n].R || 1) * 1.6 + 1.5).forEach(id => join(n, id)); });
    NET.stSrc.forEach(q => join(q.o, q.e.a));
    return tw.map((t, n) => act[n] ? tf(n) : -1);
  };
  NET.comp = comps(false); NET.grid = comps(true);
  const cap = tw.findIndex(t => t.capital);
  NET.linked = new Set(tw.map((t, n) => n).filter(n => act[n] && NET.grid[n] === NET.grid[cap]));
  /* rail: towns whose stations are on the capital's railway network */
  {
    const up = new Map(), find = x => { while (up.get(x) !== x) { up.set(x, up.get(up.get(x))); x = up.get(x); } return x; };
    NODES.forEach(n => up.set(n.id, n.id));
    EDGES.forEach(e => { if (e.k === 'rail') { const a = find(e.a), b = find(e.b); if (a !== b) up.set(a, b); } });
    const capR = new Set(NET.stSrc.filter(q => q.o === cap).map(q => find(q.e.a)));
    NET.rail = new Set(NET.stSrc.filter(q => act[q.o] && capR.has(find(q.e.a))).map(q => q.o));
  }
  /* neighbours: towns whose catchments meet along a road or a railway, with the length of the way between them */
  const pairs = new Map();
  const note = (k, a, b, d) => {
    if (a === b || a < 0 || b < 0 || a === undefined || b === undefined || !(d < Infinity)) return;
    const key = Math.min(a, b) + '_' + Math.max(a, b);
    let p = pairs.get(key);
    if (!p) pairs.set(key, p = { a: Math.min(a, b), b: Math.max(a, b), road: null, rail: null });
    if (!p[k] || d < p[k].len) p[k] = { len: d };
  };
  const meet = (k, R, src) => {
    EDGES.forEach(e => {
      if (e.k !== k || e.a === e.b) return;
      const oa = R.o.get(e.a), ob = R.o.get(e.b);
      if (oa !== undefined && ob !== undefined && oa !== ob) note(k, oa, ob, R.d.get(e.a) + e.L + R.d.get(e.b));
    });
    const byEdge = new Map();
    src.forEach(q => { if (!byEdge.has(q.e)) byEdge.set(q.e, []); byEdge.get(q.e).push(q); });
    byEdge.forEach((list, e) => {
      const oa = R.o.get(e.a), ob = R.o.get(e.b);
      for (const q of list) {
        if (oa !== undefined && oa !== q.o) note(k, q.o, oa, q.s + R.d.get(e.a));
        if (ob !== undefined && ob !== q.o) note(k, q.o, ob, e.L - q.s + R.d.get(e.b));
        for (const r of list) if (r.o !== q.o) note(k, q.o, r.o, Math.abs(q.s - r.s));
      }
    });
  };
  meet('road', NET.R0, NET.src0);
  meet('rail', dijkstra(NET.stSrc, 'rail'), NET.stSrc);
  NET.edges = [...pairs.values()];
  NET.adj = tw.map(() => []);
  NET.edges.forEach((e, n) => { NET.adj[e.a].push(n); NET.adj[e.b].push(n); });
  NET.km = { road: [0, 0, 0, 0], rail: [0, 0, 0] }; NET.up = 0;
  EDGES.forEach(e => { NET.km[e.k][e.lv] += e.L; NET.up += e.L * espec(e).up; });
  NET.pol = S.bld.filter(b => BT[b.t].pol).map(b => ({ x: b.x, z: b.z, p: BT[b.t].pol }));
  NET.ver++; NET.dirty = false;
}
/* Nodes on railways or paved roads within lim km by road of a hall's access point {e, s}. */
function reachGood(a, lim) {
  const d = new Map(), out = [], todo = [[a.e.a, a.s], [a.e.b, a.e.L - a.s]];
  while (todo.length) {
    const [id, f] = todo.pop();
    if (f > lim || (d.has(id) && d.get(id) <= f)) continue;
    d.set(id, f);
    const n = NODES.get(id);
    let good = false;
    for (const eid of n.e) { const e = EDGES.get(eid); if (e.k === 'rail' || e.lv >= 2) good = true; else todo.push([e.a === id ? e.b : e.a, f + e.L]); }
    if (good) out.push(id);
  }
  return out;
}
function polAt(x, z) {
  let p = 0;
  for (const s of NET.pol) { const d = Math.hypot(s.x - x, s.z - z); if (d < POL_R) p += s.p * (1 - d / POL_R); }
  return p;
}
/* The settlement that owns a point next to a road, or -1. pref: as a workplace would (towns before villages). */
function townAtPoint(x, z, pref) {
  const ne = nearestEdge(x, z, 'road', 0.6);
  if (!ne) return -1;
  const q = ownerAt(ne.e, ne.s, pref);
  return q.o >= 0 && q.d <= TERRITORY ? q.o : -1;
}
function nearestTown(x, z, activeOnly, townsOnly) {
  let best = -1, bd = 1e9;
  S.towns.forEach((t, n) => { if ((activeOnly && t.lock) || (townsOnly && t.vil)) return; const d = Math.hypot(t.x - x, t.z - z); if (d < bd) { bd = d; best = n; } });
  return best;
}

/* ---------- the 1918 map ----------
   Every town and village of PLACES at its real place; the big cities laid out from their main streets with their landmarks;
   the railways and paved highways of 1918; dirt roads joining every settlement to its neighbours. The game loads the result
   from js/world1918.js (tools/build-world.js runs genWorld once), since generating it takes a while. */
const isLandT = t => t === T_LAND || t === T_SAND;
function passable(x, z) { const k = cellAt(x, z); return k >= 0 && !!(TF[k] & F_LT) && (isLandT(TT[k]) || TT[k] === T_RIVER); }
function landNear(x, z) {
  const k = cellAt(x, z);
  if (k >= 0 && isLandT(TT[k])) return [x, z];
  for (let r = 0.5; r < 8; r += 0.5) {
    let best = null, bd = 1e9;
    forDisk(x, z, r, (kk, d) => { if (isLandT(TT[kk]) && d < bd) { bd = d; best = [cellX(kk), cellZ(kk)]; } });
    if (best) return best;
  }
  return [x, z];
}
/* Cut a polyline where it first leaves dry land or a river. */
function clipLine(p) {
  const out = [p[0]];
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.06));
    for (let q = 1; q <= n; q++) {
      const x = a[0] + (b[0] - a[0]) * q / n, z = a[1] + (b[1] - a[1]) * q / n;
      if (!passable(x, z)) { if (q > 1) out.push([a[0] + (b[0] - a[0]) * (q - 1) / n, a[1] + (b[1] - a[1]) * (q - 1) / n]); return out.length > 1 ? out : null; }
    }
    out.push(b);
  }
  return out;
}
/* Is (x, z) within pad of a building? */
function nearBld(x, z, pad) { space(); let hit = false; BH.query(x - pad, z - pad, x + pad, z + pad, b => { if (!hit && obbHas(bOBB(b), x, z, pad)) hit = true; }); return hit; }
/* The parts of a polyline over dry land (no rivers) and clear of buildings, each at least min km long. */
function clearRuns(p, min) {
  const runs = [], pts = densify(p, 0.06);
  let cur = [];
  const end = () => { if (cur.length > 1 && polyLen(cur) >= min) runs.push(cur); cur = []; };
  for (const q of pts) {
    const k = cellAt(q[0], q[1]);
    if (k >= 0 && (TF[k] & F_LT) && isLandT(TT[k]) && !nearBld(q[0], q[1], 0.06) && !waterHit({ x: q[0], z: q[1], rot: 0, w: 0, d: 0 }, 0.05)) cur.push(q); else end();
  }
  end();
  return runs;
}
const dirAt = (cx, cz, a, r) => [cx + Math.sin(a) * r, cz + Math.cos(a) * r];
function dryBox(x, z, size) { const o = { x, z, rot: 0, w: size, d: size }; let good = true; forCellsIn(o, 0, k => { if (!isLandT(TT[k]) || !(TF[k] & F_LT)) good = false; }); return good && !waterHit(o, 0.02); }
/* A spot near (x, z) with dry land all around and no building, for a town hall and its square. */
function dryNear(x, z, size) {
  size = size || 1.1;
  const free = (px, pz) => dryBox(px, pz, size) && !nearBld(px, pz, size / 2 + 0.05);
  if (free(x, z)) return [x, z];
  for (let r = 0.25; r < 4; r += 0.25) for (let q = 0; q < 16; q++) {
    const a = q / 16 * Math.PI * 2, px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r;
    if (free(px, pz)) return [px, pz];
  }
  return landNear(x, z);
}
/* Houses along the streets, nearest the centre first, then zoned lots beyond them. */
function settle(edges, cx, cz, R, houses, lots, rnd, farm) {
  const spots = [];
  edges.forEach(e => { if (e.k === 'road' && polyClosest(e.p, e.c, cx, cz).d < R + 0.5) lotSpots(e).forEach(c => { c.sc = Math.hypot(c.x - cx, c.z - cz) + rnd() * 0.4; if (c.sc < R + 0.6) spots.push(c); }); });
  spots.sort((a, b) => a.sc - b.sc);
  let h = 0, z = 0;
  for (const c of spots) {
    if (h >= houses && z >= lots) break;
    if (!lotOk(c, true)) continue;
    if (h < houses) { const b = addB('house', c.x, c.z, c.rot, 1, true); if (farm) b.f = 1; h++; } else { addLot(c.x, c.z, c.rot); z++; }
  }
  return h;
}
const homesFor = pop => Math.max(1, Math.ceil(pop / HOUSE.cap[1] - 0.01));
const townRadius = pop => { const need = homesFor(pop); return 0.5 + Math.sqrt(need + Math.max(3, Math.ceil(need * 0.5))) * 0.36; };
function roadsNear(cx, cz, r) { const out = []; EDGES.forEach(e => { if (e.k === 'road' && polyClosest(e.p, e.c, cx, cz).d < r) out.push(e); }); return out; }
/* A town: the hall on its market square, and streets out from the square, gently curved. Homes come later (settleTown). */
function layoutTown(t, n) {
  const rnd = rng(1000 + n * 7919), pop = t.pop0;
  const [cx, cz] = dryNear(t.x, t.z);
  t.x = cx; t.z = cz;
  const need = homesFor(pop), R = townRadius(pop), rot0 = rnd() * Math.PI * 2;
  t.R = R;
  const hall = addB('hall', cx, cz, rot0, 1, true);
  hall.ti = n;
  const made = [], nR = pop > 80 ? 6 : pop > 20 ? 5 : pop > 5 ? 4 : 3, ang = [], rr = 0.45;
  for (let k = 0; k < nR; k++) ang.push(rot0 + Math.PI / nR + k * 2 * Math.PI / nR + (rnd() - 0.5) * 0.35);
  const ring = ang.map(a => { const p = dirAt(cx, cz, a, rr); return passable(p[0], p[1]) && !nearBld(p[0], p[1], 0.05) ? addNode(p[0], p[1]) : null; });
  for (let k = 0; k < nR; k++) {
    const A = ring[k], B = ring[(k + 1) % nR];
    if (!A || !B) continue;
    let a0 = ang[k], a1 = ang[(k + 1) % nR];
    if (a1 < a0) a1 += Math.PI * 2;
    const pts = [];
    for (let q = 0; q <= 8; q++) pts.push(dirAt(cx, cz, a0 + (a1 - a0) * q / 8, rr));
    const c = clipLine(pts);
    if (c && c.length === pts.length && !pts.some(q => nearBld(q[0], q[1], 0.03) && Math.hypot(q[0] - cx, q[1] - cz) > 0.3)) made.push(addEdge('road', 1, A, B, pts));
  }
  const radial = [];
  for (let k = 0; k < nR; k++) {
    if (!ring[k]) continue;
    const bend = (rnd() - 0.5) * 0.5, len = R * (0.8 + rnd() * 0.3), pts = [];
    for (let r = rr; r <= len + 1e-6; r += 0.2) pts.push(dirAt(cx, cz, ang[k] + bend * (r - rr) / len, r));
    const run = clearRuns(pts, 0.45)[0];
    if (!run || Math.hypot(run[0][0] - pts[0][0], run[0][1] - pts[0][1]) > 0.1) continue;
    run[0] = [ring[k].x, ring[k].z];
    const end = addNode(run[run.length - 1][0], run[run.length - 1][1]), e = addEdge('road', 1, ring[k], end, run);
    made.push(e); radial.push({ e, a: ang[k], bend, len });
  }
  const zoneN = Math.max(3, Math.ceil(need * 0.5)), rings = need + zoneN > 50 ? [0.82, 0.45] : need + zoneN > 18 ? [0.55] : [];
  for (const f of rings) {
    if (radial.length < 3) break;
    const r2 = rr + (R - rr) * f, nodes = [];
    for (const q of radial) {
      if (q.e.L < r2 - rr + 0.15) { nodes.push(null); continue; }
      nodes.push({ n: splitEdge(q.e, r2 - rr), a: q.a + q.bend * (r2 - rr) / q.len });
    }
    for (let k = 0; k < nodes.length; k++) {
      const A = nodes[k], B = nodes[(k + 1) % nodes.length];
      if (!A || !B || A.n === B.n) continue;
      let a0 = A.a, a1 = B.a;
      if (a1 < a0) a1 += Math.PI * 2;
      if (a1 - a0 > Math.PI * 0.9) continue;
      const pts = [];
      for (let q = 0; q <= 12; q++) pts.push(dirAt(cx, cz, a0 + (a1 - a0) * q / 12, r2));
      pts[0] = [A.n.x, A.n.z]; pts[pts.length - 1] = [B.n.x, B.n.z];
      const runs = clearRuns(pts, 0.3);
      if (runs.length === 1 && Math.abs(polyLen(runs[0]) - polyLen(pts)) < 0.15) made.push(...buildLine('road', 1, pts, 0.08));
    }
  }
  ring.forEach(nd => { if (nd) dropNode(nd); });
  afterLine(made);
}
/* A big city: its landmarks are already standing; the town hall, the real main streets, then a street grid around them. */
function layoutCity(t, n, plan) {
  let hall = S.bld.find(b => b.t === 'hall' && b.lm && LANDMARKS[b.lm].town === t.n);
  if (!hall) {
    const [cx, cz] = dryNear(t.x, t.z, 0.9);
    hall = addB('hall', cx, cz, 0, 1, true);
  }
  hall.ti = n; t.x = hall.x; t.z = hall.z;
  const R = townRadius(t.pop0) + 0.4;
  t.R = R;
  const made = [];
  plan.streets.forEach(s => made.push(...buildLine('road', 2, s.map(p => ll2xz(p[0], p[1])), 0.06)));
  afterLine(made);
  /* the grid: streets 1 km apart, a block of houses on each side, kept away from the main streets */
  const a = plan.a * Math.PI / 180, ux = Math.cos(a), uz = -Math.sin(a), SP = 1.0, K = Math.ceil(R / SP) + 1, grid = [];
  for (const [dx, dz, px, pz] of [[ux, uz, -uz, ux], [-uz, ux, ux, uz]]) for (let k = -K; k < K; k++) {
    const off = (k + 0.5) * SP, L = Math.sqrt(Math.max(0, (R + 0.3) ** 2 - off * off));
    if (L < 0.4) continue;
    const ox = t.x + px * off, oz = t.z + pz * off;
    for (const run of clearRuns([[ox - dx * L, oz - dz * L], [ox + dx * L, oz + dz * L]], 0.6)) {
      let near = 0;
      for (const q of run) { const ne = nearestEdge(q[0], q[1], 'road', 0.4); if (ne) { const tg = polyAt(ne.e.p, ne.e.c, ne.s); if (Math.abs(tg[2] * dx + tg[3] * dz) > 0.8) near++; } }
      if (near > run.length * 0.4) continue;
      grid.push(...buildLine('road', 1, [run[0], run[run.length - 1]], 0.1));
    }
  }
  /* streets cut off by water (across a river with no bridge, out on the spit) are dropped */
  const ha = accessOf(bOBB(hall), 'road', ACCESS + 0.15);
  if (ha) {
    const seen = new Set([ha.e.a, ha.e.b]), todo = [ha.e.a, ha.e.b];
    while (todo.length) for (const eid of NODES.get(todo.pop()).e) { const e = EDGES.get(eid); if (e.k === 'road') for (const id of [e.a, e.b]) if (!seen.has(id)) { seen.add(id); todo.push(id); } }
    roadsNear(t.x, t.z, R + 1).forEach(e => { if (EDGES.has(e.id) && !seen.has(e.a)) removeEdge(e); });
  }
  afterLine(grid.filter(e => EDGES.has(e.id)));
}
/* Roads near a town that its hall reaches by road within lim km: homes go only where the town can reach them. */
function townRoads(n, r, lim) {
  const t = S.towns[n], h = S.bld.find(b => b.t === 'hall' && b.ti === n), a = h && accessOf(bOBB(h), 'road', ACCESS + 0.15), near = roadsNear(t.x, t.z, r);
  if (!a) return near;
  const d = new Map(), todo = [[a.e.a, a.s], [a.e.b, a.e.L - a.s]];
  while (todo.length) {
    const [id, f] = todo.pop();
    if (f > lim || (d.has(id) && d.get(id) <= f)) continue;
    d.set(id, f);
    for (const eid of NODES.get(id).e) { const e = EDGES.get(eid); if (e.k === 'road') todo.push([e.a === id ? e.b : e.a, f + e.L]); }
  }
  return near.filter(e => d.has(e.a) || d.has(e.b));
}
/* Homes and zoned lots for a town or city, with side streets when its streets are full. */
function settleTown(t, n) {
  const rnd = rng(7000 + n * 613), need = homesFor(t.pop0), zoneN = Math.max(3, Math.ceil(need * 0.5)), R = t.R || 1;
  let h = settle(townRoads(n, R + 1.5, R * 2 + 3), t.x, t.z, R + 0.6, need, zoneN, rnd, false);
  for (let k = 0; k < 12 && h < need; k++) {
    const a = rnd() * Math.PI * 2, pts = [];
    for (let r = 0.45; r <= R + 0.8; r += 0.2) pts.push(dirAt(t.x, t.z, a, r));
    const run = clearRuns(pts, 0.6)[0];
    if (!run) continue;
    afterLine(buildLine('road', 1, run, 0.12));
    h += settle(townRoads(n, R + 2, R * 2 + 4), t.x, t.z, R + 1, need - h, 0, rnd, false);
  }
}
/* A village: one street (sometimes a side lane), a wooden chapel by the street, and a few farmsteads. */
function layoutVillage(t, n, pop) {
  const rnd = rng(3000 + n * 4111);
  const [cx, cz] = dryNear(t.x, t.z, 0.9);
  t.x = cx; t.z = cz;
  let pts = null, a = rnd() * Math.PI;
  const L = 0.8 + rnd() * 0.4, bend = (rnd() - 0.5) * 0.5;
  for (let tries = 0; tries < 8 && !pts; tries++, a += Math.PI / 8) {
    const half = dir => { const p = []; for (let r = 0; r <= L + 1e-6; r += 0.15) p.push(dirAt(cx, cz, a + (dir < 0 ? Math.PI : 0) + bend * r / L * dir, r)); return clearRuns(p, 0.15)[0] || null; };
    const h1 = half(1), h2 = half(-1);
    const ok1 = h1 && Math.hypot(h1[0][0] - cx, h1[0][1] - cz) < 0.05, ok2 = h2 && Math.hypot(h2[0][0] - cx, h2[0][1] - cz) < 0.05;
    const p = (ok2 ? h2.slice().reverse() : [[cx, cz]]).concat(ok1 ? h1.slice(1) : []);
    if (p.length > 1 && polyLen(p) >= (tries < 4 ? 0.5 : 0.3)) pts = p;
  }
  t.R = L;
  if (!pts) return;
  const made = buildLine('road', 1, pts, 0.1);
  if (rnd() < 0.45) {
    const s = rnd() < 0.5 ? 1 : -1, la = a + Math.PI / 2 * s, len = 0.45 + rnd() * 0.3, side = [];
    for (let r = 0; r <= len + 1e-6; r += 0.15) side.push(dirAt(cx, cz, la + (rnd() - 0.5) * 0.08, r));
    const c = clearRuns(side, 0.3)[0];
    if (c && Math.hypot(c[0][0] - cx, c[0][1] - cz) < 0.05) made.push(...buildLine('road', 1, c, 0.1));
  }
  afterLine(made);
  /* the chapel faces the street beside the village centre, on whichever side is clear */
  const c = polyCum(pts), m = polyClosest(pts, c, cx, cz), q = polyAt(pts, c, m.s), sd0 = rnd() < 0.5 ? 1 : -1, sh0 = (rnd() - 0.5) * 0.3;
  const off = ROADT[1].w / 2 + 0.05 + BT.hall.fp[1] / 2;
  let spot = null;
  for (const sd of [sd0, -sd0]) for (const sh of [sh0, 0, -sh0]) {
    if (spot) break;
    const nx = -q[3] * sd, nz = q[2] * sd, x = q[0] + nx * off + q[2] * sh, z = q[1] + nz * off + q[3] * sh, rot = faceRot(-nx, -nz);
    const o = { x, z, rot, w: BT.hall.fp[0], d: BT.hall.fp[1] }, bb = obbBounds(o, 0.3);
    let hit = !dryBox(x, z, 0.5);
    EH.query(bb[0], bb[1], bb[2], bb[3], it => { const e = it[0], i = it[1]; if (!hit && obbSegDist(o, e.p[i - 1][0], e.p[i - 1][1], e.p[i][0], e.p[i][1]) < espec(e).w / 2 + 0.02) hit = true; });
    BH.query(bb[0], bb[1], bb[2], bb[3], b => { if (!hit && obbOverlap(o, bOBB(b), 0.02)) hit = true; });
    if (!hit || (sd === -sd0 && sh === -sh0)) spot = [x, z, rot];
  }
  const [hx, hz] = spot, hall = addB('hall', hx, hz, spot[2], 1, true);
  hall.ti = n;
  const need = Math.max(2, Math.ceil(pop / FARMSTEAD_CAP - 0.01));
  const near = () => roadsNear(cx, cz, L + 1.2);
  let h = settle(near(), hx, hz, L + 0.3, need, 0, rnd, true);
  for (let k = 0; k < 8 && h < need; k++) {
    const an = rnd() * Math.PI * 2, p = [], o = polyAt(pts, c, rnd() * c[c.length - 1]);
    for (let r = 0; r <= 0.9; r += 0.15) p.push(dirAt(o[0], o[1], an, r));
    const cl = clearRuns(p, 0.45)[0];
    if (!cl || Math.hypot(cl[0][0] - o[0], cl[0][1] - o[1]) > 0.1) continue;
    afterLine(buildLine('road', 1, cl, 0.1));
    h += settle(near(), hx, hz, L + 1, need - h, 0, rnd, true);
  }
}
/* Nearest point of town n's roads to (x, z). */
function nearestTownRoad(n, x, z) {
  const t = S.towns[n];
  let best = null;
  EDGES.forEach(e => {
    if (e.k !== 'road') return;
    const q = polyClosest(e.p, e.c, x, z);
    if (Math.hypot(q.x - t.x, q.z - t.z) > (t.R || 1) + 6) return;
    if (!best || q.d < best.d) best = { x: q.x, z: q.z, d: q.d };
  });
  return best;
}
/* Give a building a road to town n, from its front (side 1) or back (side -1). */
function connectToTown(b, n, side) {
  const o = bOBB(b);
  if (accessOf(o, 'road')) return true;
  const [, , fx, fz] = obbAxes(o), s = side || 1, d = o.d / 2 + 0.16, px = b.x + fx * d * s, pz = b.z + fz * d * s;
  const tgt = nearestTownRoad(n, px, pz);
  if (!tgt) return false;
  blk();
  const p = planPath(px, pz, tgt.x, tgt.z, 'road', true);
  if (!p) return false;
  afterLine(buildLine('road', 1, p, 0.15));
  return !!accessOf(o, 'road');
}
function placeNear(n, type) {
  const t = S.towns[n], rnd = rng(5000 + n * 131 + S.bld.length * 7), need = BT[type].need, r0 = (t.R || 1) + 0.6;
  for (let tries = 0; tries < 2; tries++) {
    for (let r = r0; r <= r0 + 5; r += 0.35) {
      const a0 = rnd() * Math.PI * 2;
      for (let q = 0; q < 14; q++) {
        const a = a0 + q * Math.PI * 2 / 14, [x, z] = dirAt(t.x, t.z, a, r), rot = faceRot(t.x - x, t.z - z);
        if (!validPlace(type, x, z, rot, true).ok) continue;
        const b = addB(type, x, z, rot, 1, true);
        if (connectToTown(b, n, 1)) return b;
        removeB(b);
      }
    }
    const bit = need === 'forest' ? F_FOREST : need === 'bog' ? F_BOG : need === 'clay' ? F_CLAY : 0;
    if (!bit) return null;
    blk();
    for (let q = 0; q < 12; q++) {
      const [x, z] = dirAt(t.x, t.z, rnd() * Math.PI * 2, r0 + 1 + rnd() * 1.5), cells = [];
      forDisk(x, z, 1.0, k => { if (TT[k] === T_LAND && (TF[k] & F_LT) && !BLK[k]) cells.push(k); });
      if (cells.length < 8) continue;
      setFlags(cells, bit, bit === F_BOG ? F_FOREST : 0);
      break;
    }
  }
  return null;
}
/* A station near (x, z) whose platform track runs along direction (vx, vz); null if there is no room. */
function stationTry(n, x, z, vx, vz) {
  const rot = Math.atan2(-vz, vx);
  if (!validPlace('station', x, z, rot, true).ok) return null;
  const fx = -vz, fz = vx, ax = x + fx * 0.31, az = z + fz * 0.31, p0 = [ax - vx * 0.6, az - vz * 0.6], p1 = [ax + vx * 0.6, az + vz * 0.6];
  blk();
  if (!lineCheck(p0[0], p0[1], p1[0], p1[1], 'rail', true).ok) return null;
  const b = addB('station', x, z, rot, 1, true);
  b.ti = n;
  if (!connectToTown(b, n, -1)) { removeB(b); return null; }
  afterLine(buildLine('rail', 1, [p0, p1], 0));
  return b;
}
/* Station for town n, on the side facing another place; its platform track runs toward that place. */
function stationFor(n, toward) {
  const old = S.bld.find(b => b.t === 'station' && b.ti === n);
  if (old) return old;
  const t = S.towns[n], plan = CITY_PLAN[t.n];
  if (plan && plan.station) {
    const [x0, z0] = ll2xz(plan.station[0], plan.station[1]), a = plan.station[2] * Math.PI / 180, vx = Math.cos(a), vz = -Math.sin(a);
    for (let r = 0; r <= 0.6; r += 0.15) for (let q = 0; q < (r ? 8 : 1); q++) {
      const [x, z] = dirAt(x0, z0, q / 8 * Math.PI * 2, r);
      for (const s of [1, -1]) { const b = stationTry(n, x, z, vx * s, vz * s); if (b) return b; }
    }
  }
  const L = Math.hypot(toward.x - t.x, toward.z - t.z), ux = (toward.x - t.x) / L, uz = (toward.z - t.z) / L;
  for (let r = (t.R || 1) * 0.6 + 0.5; r <= 6; r += 0.25) for (const off of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9, 1.2, -1.2]) {
    const ca = Math.cos(off), sa = Math.sin(off), vx = ux * ca - uz * sa, vz = ux * sa + uz * ca;
    const b = stationTry(n, t.x + vx * r, t.z + vz * r, vx, vz);
    if (b) return b;
  }
  return null;
}
function trackEnd(st, toward) {
  const a = accessOf(bOBB(st), 'rail', 0.35);
  if (!a) return null;
  const A = NODES.get(a.e.a), B = NODES.get(a.e.b);
  return Math.hypot(A.x - toward.x, A.z - toward.z) <= Math.hypot(B.x - toward.x, B.z - toward.z) ? A : B;
}
/* Lay a planned line: the parts near a line of the same kind are moved onto it, and only the new parts are built. */
function buildPlanned(k, lv, p) {
  const pts = [];
  for (const q of densify(p, 0.05)) { const ne = nearestEdge(q[0], q[1], k, 0.3); pts.push(ne ? [ne.x, ne.z] : q); }
  const made = [];
  for (const run of newRuns(dedupe(pts, 0.01), k)) made.push(...buildLine(k, lv, rdp(run.p, 0.004), 0.12));
  afterLine(made);
  return made;
}
function railBetween(ia, ib) {
  const A = S.towns[ia], B = S.towns[ib], sA = stationFor(ia, B), sB = stationFor(ib, A);
  if (!sA || !sB) return false;
  const ea = trackEnd(sA, B), eb = trackEnd(sB, A);
  if (!ea || !eb) return false;
  blk();
  const p = planPath(ea.x, ea.z, eb.x, eb.z, 'rail', true);
  if (!p) return false;
  buildPlanned('rail', 1, smoothLine(p, 'rail', true, 2));
  return true;
}
/* The last point inside Lithuania on the way from (x, z) toward a place abroad. */
function borderPoint(x, z, tx, tz) {
  const L = Math.hypot(tx - x, tz - z);
  let last = null;
  for (let s = 0; s <= L; s += 0.25) {
    const px = x + (tx - x) * s / L, pz = z + (tz - z) * s / L;
    if (passable(px, pz)) last = [px, pz, s]; else if (last && s - last[2] > 3) break;
  }
  if (!last) return null;
  const back = Math.min(0.6, last[2]);
  return [x + (tx - x) * (last[2] - back) / L, z + (tz - z) * (last[2] - back) / L];
}
function railToBorder(ia, lon, lat) {
  const [tx, tz] = ll2xz(lon, lat), st = stationFor(ia, { x: tx, z: tz });
  if (!st) return false;
  const e = trackEnd(st, { x: tx, z: tz }), bp = e && borderPoint(e.x, e.z, tx, tz);
  if (!bp) return false;
  blk();
  const p = planPath(e.x, e.z, bp[0], bp[1], 'rail', true);
  if (!p) return false;
  buildPlanned('rail', 1, smoothLine(p, 'rail', true, 2));
  return true;
}
/* The road node of town n nearest to another place. */
function townExit(n, toward) {
  const t = S.towns[n], lim = (t.R || 1) + 1.5;
  let best = null, bd = 1e9;
  NODES.forEach(nd => {
    if (Math.hypot(nd.x - t.x, nd.z - t.z) > lim || !nd.e.some(id => EDGES.get(id).k === 'road')) return;
    const d = Math.hypot(nd.x - toward.x, nd.z - toward.z);
    if (d < bd) { bd = d; best = nd; }
  });
  return best;
}
function roadBetween(ia, ib, lv) {
  const A = S.towns[ia], B = S.towns[ib], na = townExit(ia, B), nb = townExit(ib, A);
  if (!na || !nb) return false;
  blk();
  const p = planPath(na.x, na.z, nb.x, nb.z, 'road', true);
  if (!p) return false;
  buildPlanned('road', lv || 1, smoothLine(p, 'road', true, 2));
  return true;
}
function roadToBorder(ia, lon, lat, lv) {
  const [tx, tz] = ll2xz(lon, lat), na = townExit(ia, { x: tx, z: tz }), bp = na && borderPoint(na.x, na.z, tx, tz);
  if (!bp) return false;
  blk();
  const p = planPath(na.x, na.z, bp[0], bp[1], 'road', true);
  if (!p) return false;
  buildPlanned('road', lv || 1, smoothLine(p, 'road', true, 2));
  return true;
}
/* Road distance between the halls of two settlements, searched no further than lim km (Infinity if further). */
function roadDist(ia, ib, lim) {
  const hall = n => { const h = S.bld.find(b => b.t === 'hall' && b.ti === n); return h && accessOf(bOBB(h), 'road', ACCESS + 0.15); };
  const a = hall(ia), b = hall(ib);
  if (!a || !b) return Infinity;
  if (a.e === b.e) return Math.abs(a.s - b.s);
  const d = new Map(), hk = [], hv = [];
  const push = (id, f) => { const cur = d.get(id); if (cur !== undefined && cur <= f) return; d.set(id, f); hk.push(f); hv.push(id); };
  push(a.e.a, a.s); push(a.e.b, a.e.L - a.s);
  let best = Infinity;
  while (hk.length) {
    let m = 0;
    for (let i = 1; i < hk.length; i++) if (hk[i] < hk[m]) m = i;
    const f = hk[m], id = hv[m];
    hk[m] = hk[hk.length - 1]; hv[m] = hv[hv.length - 1]; hk.pop(); hv.pop();
    if (f > d.get(id) || f > lim || f >= best) continue;
    if (id === b.e.a) best = Math.min(best, f + b.s);
    if (id === b.e.b) best = Math.min(best, f + b.e.L - b.s);
    for (const eid of NODES.get(id).e) { const e = EDGES.get(eid); if (e.k === 'road') push(e.a === id ? e.b : e.a, f + e.L); }
  }
  return best;
}
/* Dirt roads between neighbouring settlements: the relative neighbourhood graph of the settlements (two places are joined when
   no third one is nearer to both), shortest first, skipping pairs already joined by a road not much longer than the straight line. */
function linkSettlements() {
  const T = S.towns, n = T.length, near = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const d = Math.hypot(T[i].x - T[j].x, T[i].z - T[j].z);
    if (d < 32) near.push([i, j, d]);
  }
  const dist = (i, j) => Math.hypot(T[i].x - T[j].x, T[i].z - T[j].z), pairs = [];
  for (const [i, j, d] of near) {
    let rng = true;
    for (let k = 0; k < n && rng; k++) if (k !== i && k !== j && dist(i, k) < d && dist(j, k) < d) rng = false;
    if (rng) pairs.push([i, j, d]);
  }
  pairs.sort((p, q) => p[2] - q[2]);
  let built = 0;
  for (const [i, j, d] of pairs) {
    if (roadDist(i, j, d * 1.35 + 1.5) <= d * 1.35 + 1.5) continue;
    if (roadBetween(i, j, 1)) built++;
  }
  /* settlements still cut off from the capital: try their nearest neighbours */
  const cap = T.findIndex(t => t.capital);
  let comp = roadComps();
  for (let i = 0; i < n; i++) {
    if (comp(i) === comp(cap)) continue;
    const order = T.map((t, j) => [j, dist(i, j)]).filter(q => q[0] !== i && comp(q[0]) !== comp(i)).sort((p, q) => p[1] - q[1]).slice(0, 6);
    for (const [j] of order) if (roadBetween(i, j, 1)) { built++; comp = roadComps(); break; }
  }
  return built;
}
/* Which road network each settlement's hall stands on: comp(n) is the same for settlements joined by road. */
function roadComps() {
  const up = new Map(), find = x => { while (up.get(x) !== x) { up.set(x, up.get(up.get(x))); x = up.get(x); } return x; };
  NODES.forEach(nd => up.set(nd.id, nd.id));
  EDGES.forEach(e => { if (e.k === 'road') { const a = find(e.a), b = find(e.b); if (a !== b) up.set(a, b); } });
  const root = S.towns.map((t, n) => { const h = S.bld.find(b => b.t === 'hall' && b.ti === n), a = h && accessOf(bOBB(h), 'road', ACCESS + 0.15); return a ? find(a.e.a) : -1 - n; });
  return n => root[n];
}
function newTown(id, n, x, z, o) {
  return Object.assign({ id, n, reg: '', capital: 0, cap: STORE_BASE, orig: 0, lock: 0, kr: 0, vil: 0, R: 1, x, z, d: '', pop: 3, pop0: 3, h: 62, stock: {}, dl: {}, dem: {}, house: 0, wf: 0, jobs: 0,
    fill: 1, pm: 1, powS: 0, powD: 0, pr: 1, gS: 0, gD: 0, note: 'Content', lastWarn: -999, dev: 0, hint: '' }, o || {});
}
/* The region of a spot: inside the Klaipėda Region, or that of the nearest town with a known region. */
function regionAt(x, z) {
  if (inKR(x, z)) return 'Mažoji Lietuva';
  let best = '', bd = 1e9;
  S.towns.forEach(t => { if (!t.reg || t.vil) return; const d = Math.hypot(t.x - x, t.z - z); if (d < bd) { bd = d; best = t.reg; } });
  return best;
}
let RIV_XZ = null;
/* The river within r km of a spot, by name, or ''. */
function riverAt(x, z, r) {
  if (!RIV_XZ) RIV_XZ = GEO_RIV.map(q => { const p = polyXZ(q.p); return { n: q.n, p, c: polyCum(p) }; });
  let best = '', bd = r;
  for (const q of RIV_XZ) { const d = polyClosest(q.p, q.c, x, z).d; if (d < bd) { bd = d; best = q.n; } }
  return best;
}
/* What a village is like, from the land around it. */
function villageText(x, z) {
  let n = 0, forest = 0, fert = 0, water = 0;
  forDisk(x, z, 2, (k, d) => { n++; if (TF[k] & F_FOREST) forest++; if (TF[k] & F_FERTILE) fert++; if (d < 1.4 && isWaterT(TT[k])) water++; });
  const riv = riverAt(x, z, 1.5);
  if (riv) return `A village on the ${riv}, of farmers and boatmen.`;
  if (water) return 'A village of farmers and fishermen by the water.';
  if (forest > n * 0.4) return 'A forest village. People farm small clearings and cut firewood.';
  if (fert > n * 0.4) return 'A farming village on good soil.';
  return 'A farming village of a few homesteads.';
}
/* A few words on a town without a written description. */
function townText(t) {
  const riv = riverAt(t.x, t.z, 2);
  let lake = false;
  forDisk(t.x, t.z, 2, k => { if (TT[k] === T_LAKE) lake = true; });
  return `${t.pop0 >= 2 ? 'A market town' : 'A small market town'} of ${t.reg || 'Lithuania'}${riv ? ` on the ${riv}` : lake ? ', by a lake' : ''}.`;
}
/* Written descriptions of towns that are not among the main ones (TOWNS0, TOWNS1). */
const TOWN_TXT = {
  'Rietavas': 'Seat of the Oginskis princes, who lit the first electric lamps in Lithuania here in 1892.',
  'Birštonas': 'Spa town in a loop of the Nemunas, known for its mineral springs.',
  'Lentvaris': 'Railway junction west of Vilnius, where the line to Kaunas leaves the line to Warsaw.',
  'Švenčionėliai': 'Railway town on the Žeimena that grew up around its station.',
  'Garliava': 'Town on the old highway south of Kaunas.',
  'Žiežmariai': 'Market town on the old road between Kaunas and Vilnius.',
  'Virbalis': 'Old town on the border with East Prussia, beside Kybartai.',
  'Šeduva': 'Market town on the railway from Radviliškis to Panevėžys.',
  'Turmantas': 'The last station before the Latvian border, on the line to Daugavpils.',
  'Naujoji Vilnia': 'Railway junction east of Vilnius, where the lines to Daugavpils and to Minsk part.'
};
const SLUG = { ą: 'a', č: 'c', ę: 'e', ė: 'e', į: 'i', š: 's', ų: 'u', ū: 'u', ž: 'z' };
const slugOf = n => n.toLowerCase().replace(/[ąčęėįšųūž]/g, c => SLUG[c]).replace(/[^a-z]+/g, '_');
/* The settlements of 1918: every place in PLACES, with the game's details for the main towns. */
function settlements() {
  const t0 = {}, t1 = {};
  TOWNS0.forEach(d => t0[d.n] = d);
  TOWNS1.forEach(a => t1[a[1]] = a);
  const order = PLACES.map((p, i) => [p, i]).sort((A, B) => {
    const rank = p => t0[p[0]] ? 0 : t1[p[0]] && !(t1[p[0]][5] || '').includes('v') ? 1 : p[3] && !t1[p[0]] ? 2 : 3;
    return rank(A[0]) - rank(B[0]) || (t0[A[0][0]] ? TOWNS0.indexOf(t0[A[0][0]]) - TOWNS0.indexOf(t0[B[0][0]]) : 0) || B[0][4] - A[0][4] || A[1] - B[1];
  });
  const out = [], ids = new Set();
  order.forEach(([[name, lon, lat, town, rs, gp], i]) => {
    const [x, z] = ll2xz(lon, lat), kr = inKR(...landNear(x, z)) ? 1 : 0, d0 = t0[name], d1 = t1[name];
    let o;
    if (d0) o = { id: d0.id, reg: d0.reg, capital: d0.cap || 0, d: d0.d, pop0: d0.pop, stock: { ...d0.st }, vil: 0 };
    else if (d1) {
      const vil = (d1[5] || '').includes('v') ? 1 : 0, pop = d1[2];
      o = { id: d1[0], reg: d1[3], d: d1[4], pop0: pop, vil, stock: vil ? { grain: 4, potatoes: 4, timber: 5 } : { grain: Math.round(10 + pop * 3), potatoes: Math.round(6 + pop * 2), timber: Math.round(12 + pop * 2) } };
    } else if (town) {
      const pop = Math.round(clamp(gp ? 0.8 + gp / 1000 * 0.12 : 1.4, 1, 3) * 10) / 10;
      o = { id: slugOf(name), d: TOWN_TXT[name] || '', pop0: pop, vil: 0, stock: { grain: Math.round(10 + pop * 3), potatoes: Math.round(6 + pop * 2), timber: Math.round(12 + pop * 2) } };
    } else {
      const k = cellAt(x, z), pop = Math.round((0.4 + Math.min(0.6, (rs - 94) / 300) + (k >= 0 && TF[k] & F_FERTILE ? 0.2 : 0)) * 10) / 10;
      o = { id: 'v' + i, d: '', pop0: pop, vil: 1, stock: { grain: 3, potatoes: 3, timber: 4 } };
    }
    if (ids.has(o.id)) o.id += '_' + i;
    ids.add(o.id);
    out.push(newTown(o.id, name, x, z, Object.assign(o, { orig: 1, kr, lock: kr, pop: kr ? 0 : o.pop0 })));
  });
  return out;
}
const FACE = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
function genWorld(log) {
  const say = log || (() => {});
  genTerrain();
  S.nodes = []; S.edges = []; S.bld = []; S.lots = []; S.towns = [];
  rebuildIndex();
  S.towns = settlements();
  S.towns.forEach(t => { if (!t.reg) t.reg = regionAt(t.x, t.z); });
  say(`${S.towns.length} settlements`);
  /* landmarks first, at their real places: streets go around them */
  for (const key in LANDMARKS) {
    const L = LANDMARKS[key], [x, z] = ll2xz(L.lon, L.lat), f = FACE[L.face], ti = S.towns.findIndex(t => t.n === L.town);
    const b = addB(L.hall ? 'hall' : 'landmark', x, z, faceRot(f[0], f[1]), 1, true, L.fp.slice());
    b.lm = key;
    if (L.hall) b.ti = ti;
  }
  S.towns.forEach((t, n) => { if (CITY_PLAN[t.n]) layoutCity(t, n, CITY_PLAN[t.n]); });
  S.towns.forEach((t, n) => { if (!t.vil && !CITY_PLAN[t.n]) layoutTown(t, n); });
  S.towns.forEach((t, n) => { if (t.vil) layoutVillage(t, n, t.pop0); });
  S.towns.forEach(t => { if (!t.d) t.d = t.vil ? villageText(t.x, t.z) : townText(t); });
  say(`laid out: ${S.edges.length} streets, ${S.bld.length} buildings`);
  const at = s => s[0] === '@' ? s.slice(1).split(',').map(Number) : S.towns.findIndex(t => t.n === s);
  const lines = (list, between, toBorder, what) => {
    let bad = 0;
    for (const line of list) for (let q = 1; q < line.length; q++) {
      const a = at(line[q - 1]), b = at(line[q]);
      if (a === -1 || b === -1) { say(`  ${what}: no place ${a === -1 ? line[q - 1] : line[q]}`); bad++; continue; }
      const ok = Array.isArray(a) ? toBorder(b, a[0], a[1]) : Array.isArray(b) ? toBorder(a, b[0], b[1]) : between(a, b);
      if (!ok) { bad++; say(`  ${what}: could not build ${line[q - 1]} – ${line[q]}`); }
    }
    return bad;
  };
  lines(RAIL1918, railBetween, railToBorder, 'railway');
  say(`railways: ${Math.round(S.edges.filter(e => e.k === 'rail').reduce((a, e) => a + e.L, 0))} km`);
  lines(ROAD1918, (a, b) => roadBetween(a, b, 2), (a, lo, la) => roadToBorder(a, lo, la, 2), 'highway');
  say(`highways: ${Math.round(S.edges.filter(e => e.k === 'road' && e.lv === 2).reduce((a, e) => a + e.L, 0))} km`);
  PL.reuse = 0.75;
  const built = linkSettlements();
  PL.reuse = 0.35;
  lines(BORDER_ROADS, (a, b) => roadBetween(a, b, 1), (a, lo, la) => roadToBorder(a, lo, la, 1), 'border road');
  say(`dirt roads: ${built} links, ${Math.round(S.edges.filter(e => e.k === 'road' && e.lv === 1).reduce((a, e) => a + e.L, 0))} km`);
  S.towns.forEach((t, n) => { if (!t.vil) settleTown(t, n); });
  TOWNS0.forEach(d => { const n = tIdx(d.id); d.ind.forEach(type => placeNear(n, type)); });
  say(`homes: ${S.bld.filter(b => b.t === 'house').length}, lots: ${S.lots.length}, buildings: ${S.bld.length}`);
  NET.dirty = true;
}

/* A town founded by the player: hall, two short streets, one house and a few zoned lots. */
function foundTown(x, z, rot, name) {
  const n = S.towns.length;
  S.towns.push(newTown('t' + S.nid, name, x, z, { d: 'A new town founded by the planning ministry.', reg: regionAt(x, z), R: 1.2, pop: 2, pop0: 2, stock: { grain: 40, timber: 24 } }));
  const hall = addB('hall', x, z, rot, 1);
  hall.ti = n;
  const fx = Math.sin(rot), fz = Math.cos(rot), rx = Math.cos(rot), rz = -Math.sin(rot), px = x + fx * 0.5, pz = z + fz * 0.5;
  const made = [];
  for (const line of [[[px - rx * 0.9, pz - rz * 0.9], [px + rx * 0.9, pz + rz * 0.9]], [[px, pz], [px + fx * 1.2, pz + fz * 1.2]]]) {
    const c = clipLine(line);
    if (c && polyLen(c) > 0.3) made.push(...buildLine('road', 1, c, 0.15));
  }
  afterLine(made);
  const spots = [];
  made.forEach(e => lotSpots(e).forEach(c => { c.sc = Math.hypot(c.x - x, c.z - z); spots.push(c); }));
  spots.sort((a, b) => a.sc - b.sc);
  let h = 0, zz = 0;
  for (const c of spots) {
    if (!lotOk(c, false)) continue;
    if (!h) { addB('house', c.x, c.z, c.rot, 1, true); h++; } else if (zz < 6) { addLot(c.x, c.z, c.rot); zz++; }
  }
  NET.dirty = true;
  return n;
}
