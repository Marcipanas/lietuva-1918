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
function bOBB(b) { const f = BT[b.t].fp; return { x: b.x, z: b.z, rot: b.rot, w: f[0], d: f[1] }; }
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
function addB(t, x, z, rot, lv, quiet) {
  const b = { id: S.nid++, t, x, z, rot: rot || 0, lv: lv || 1, on: true, eff: 0, why: 'Starting', town: -1, cd: 0, k: 1 };
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
  const bb = obbBounds(o, reach + 0.3);
  let best = null;
  EH.query(bb[0], bb[1], bb[2], bb[3], it => {
    const e = it[0], i = it[1];
    if (e.k !== k) return;
    const a = e.p[i - 1], b = e.p[i], d = obbSegDist(o, a[0], a[1], b[0], b[1]) - espec(e).w / 2;
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
  else if (riv) return bad('Cannot build on water');
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
    case 'border': if (!ring(3, tt => tt === T_FOREIGN)) return bad('Must be within 3 km of the border'); break;
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
  if (no) return false;
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
  BH.query(bb[0], bb[1], bb[2], bb[3], x => { if (x.t !== 'hall' && obbPolyDist(bOBB(x), tr) <= R) b.push(x); });
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
const NET = { dirty: true, ver: 0, hall: [], R: null, R0: null, srcs: [], src0: [], off: [], edges: [], adj: [], comp: [], linked: new Set(),
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
  /* linked towns: connected parts of the graph, joined through each town's hall road and stations */
  const up = new Map(), find = x => { let r = x; while (up.get(r) !== r) r = up.get(r); while (up.get(x) !== r) { const n = up.get(x); up.set(x, r); x = n; } return r; };
  NODES.forEach(n => up.set(n.id, n.id));
  EDGES.forEach(e => { const ra = find(e.a), rb = find(e.b); if (ra !== rb) up.set(ra, rb); });
  const tu = tw.map((t, n) => n), tf = x => { while (tu[x] !== x) { tu[x] = tu[tu[x]]; x = tu[x]; } return x; };
  const first = new Map(), join = (n, e) => { const r = find(e.a); if (first.has(r)) { const a = tf(first.get(r)), b = tf(n); if (a !== b) tu[a] = b; } else first.set(r, n); };
  NET.hall.forEach((a, n) => { if (a) join(n, a.e); });
  NET.stSrc.forEach(q => join(q.o, q.e));
  NET.comp = tw.map((t, n) => act[n] ? tf(n) : -1);
  const cap = tw.findIndex(t => t.capital);
  NET.linked = new Set(tw.map((t, n) => n).filter(n => act[n] && NET.comp[n] === NET.comp[cap]));
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

/* ---------- the 1918 map ---------- */
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
const dirAt = (cx, cz, a, r) => [cx + Math.sin(a) * r, cz + Math.cos(a) * r];
function dryBox(x, z, size) { let good = true; forCellsIn({ x, z, rot: 0, w: size, d: size }, 0, k => { if (!isLandT(TT[k]) || !(TF[k] & F_LT)) good = false; }); return good; }
/* A spot near (x, z) with dry land all around, for a town hall and its square. */
function dryNear(x, z, size) {
  size = size || 1.1;
  if (dryBox(x, z, size)) return [x, z];
  for (let r = 0.25; r < 4; r += 0.25) for (let q = 0; q < 16; q++) {
    const a = q / 16 * Math.PI * 2, px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r;
    if (dryBox(px, pz, size)) return [px, pz];
  }
  return landNear(x, z);
}
/* Houses along the new streets, nearest the centre first, then zoned lots beyond them. */
function settle(edges, cx, cz, R, houses, lots, rnd, farm) {
  const spots = [];
  edges.forEach(e => { if (e.k === 'road' && Math.hypot(e.p[0][0] - cx, e.p[0][1] - cz) < R + 1) lotSpots(e).forEach(c => { c.sc = Math.hypot(c.x - cx, c.z - cz) + rnd() * 0.4; spots.push(c); }); });
  spots.sort((a, b) => a.sc - b.sc);
  let h = 0, z = 0;
  for (const c of spots) {
    if (h >= houses && z >= lots) break;
    if (!lotOk(c, true)) continue;
    if (h < houses) { const b = addB('house', c.x, c.z, c.rot, 1, true); if (farm) b.f = 1; h++; } else { addLot(c.x, c.z, c.rot); z++; }
  }
  return h;
}
function layoutTown(t, n, pop) {
  const rnd = rng(1000 + n * 7919);
  const [cx, cz] = dryNear(t.x, t.z);
  t.x = cx; t.z = cz;
  const need = Math.max(1, Math.ceil(pop / HOUSE.cap[1] - 0.01)), zoneN = Math.max(3, Math.ceil(need * 0.5));
  const R = 0.5 + Math.sqrt(need + zoneN) * 0.36, rot0 = rnd() * Math.PI * 2;
  t.R = R;
  const hall = addB('hall', cx, cz, rot0, 1, true);
  hall.ti = n;
  const made = [], nR = pop > 80 ? 6 : pop > 20 ? 5 : pop > 5 ? 4 : 3, ang = [], rr = 0.45;
  for (let k = 0; k < nR; k++) ang.push(rot0 + Math.PI / nR + k * 2 * Math.PI / nR + (rnd() - 0.5) * 0.35);
  const ring = ang.map(a => { const p = dirAt(cx, cz, a, rr); return passable(p[0], p[1]) ? addNode(p[0], p[1]) : null; });
  /* the market square around the town hall */
  for (let k = 0; k < nR; k++) {
    const A = ring[k], B = ring[(k + 1) % nR];
    if (!A || !B) continue;
    let a0 = ang[k], a1 = ang[(k + 1) % nR];
    if (a1 < a0) a1 += Math.PI * 2;
    const pts = [];
    for (let q = 0; q <= 8; q++) pts.push(dirAt(cx, cz, a0 + (a1 - a0) * q / 8, rr));
    const c = clipLine(pts);
    if (c && c.length === pts.length) made.push(addEdge('road', 1, A, B, pts));
  }
  /* streets out from the square, gently curved */
  const radial = [];
  for (let k = 0; k < nR; k++) {
    if (!ring[k]) continue;
    const bend = (rnd() - 0.5) * 0.5, len = R * (0.8 + rnd() * 0.3), pts = [];
    for (let r = rr; r <= len + 1e-6; r += 0.2) pts.push(dirAt(cx, cz, ang[k] + bend * (r - rr) / len, r));
    const c = clipLine(pts);
    if (!c || polyLen(c) < 0.45) continue;
    const end = addNode(c[c.length - 1][0], c[c.length - 1][1]), e = addEdge('road', 1, ring[k], end, c);
    made.push(e); radial.push({ e, a: ang[k], bend, len });
  }
  /* ring roads for bigger towns, outermost first so each split keeps the inner part of a street */
  const rings = need + zoneN > 50 ? [0.82, 0.45] : need + zoneN > 18 ? [0.55] : [];
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
      const c = clipLine(pts);
      if (c && c.length === pts.length) made.push(...buildLine('road', 1, pts, 0.08));
    }
  }
  ring.forEach(nd => { if (nd) dropNode(nd); });
  afterLine(made);
  const near = () => { const out = []; EDGES.forEach(e => { if (e.k === 'road' && Math.hypot(e.p[0][0] - cx, e.p[0][1] - cz) < R + 2) out.push(e); }); return out; };
  let h = settle(near(), cx, cz, R + 0.6, need, zoneN, rnd, false);
  /* rivers and lakes can leave too little room: add side streets until every home fits */
  for (let k = 0; k < 10 && h < need; k++) {
    const a = rnd() * Math.PI * 2, pts = [];
    for (let r = rr; r <= R + 0.8; r += 0.2) pts.push(dirAt(cx, cz, a, r));
    const c = clipLine(pts);
    if (!c || polyLen(c) < 0.6) continue;
    const e = buildLine('road', 1, c, 0.1);
    afterLine(e);
    h += settle(near(), cx, cz, R + 1, need - h, 0, rnd, false);
  }
}
/* A village: one street (sometimes a side lane), a wooden chapel by the street, and a few farmsteads. */
function layoutVillage(t, n, pop) {
  const rnd = rng(3000 + n * 4111);
  const [cx, cz] = dryNear(t.x, t.z, 0.9);
  t.x = cx; t.z = cz;
  let pts = null, a = rnd() * Math.PI;
  const L = 0.8 + rnd() * 0.4, bend = (rnd() - 0.5) * 0.5;
  for (let tries = 0; tries < 4 && !pts; tries++, a += Math.PI / 4) {
    const half = dir => { const p = []; for (let r = 0; r <= L + 1e-6; r += 0.15) p.push(dirAt(cx, cz, a + (dir < 0 ? Math.PI : 0) + bend * r / L * dir, r)); return clipLine(p); };
    const h1 = half(1), h2 = half(-1), p = (h2 ? h2.slice().reverse() : [[cx, cz]]).concat(h1 ? h1.slice(1) : []);
    if (p.length > 1 && polyLen(p) >= 0.5) pts = p;
  }
  t.R = L;
  if (!pts) return;
  const made = buildLine('road', 1, pts, 0.1);
  if (rnd() < 0.45) {
    const s = rnd() < 0.5 ? 1 : -1, la = a + Math.PI / 2 * s, len = 0.45 + rnd() * 0.3, side = [];
    for (let r = 0; r <= len + 1e-6; r += 0.15) side.push(dirAt(cx, cz, la + (rnd() - 0.5) * 0.08, r));
    const c = clipLine(side);
    if (c && polyLen(c) > 0.3) made.push(...buildLine('road', 1, c, 0.1));
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
  const near = () => { const out = []; EDGES.forEach(e => { if (e.k === 'road' && Math.hypot(e.p[0][0] - cx, e.p[0][1] - cz) < L + 1.5) out.push(e); }); return out; };
  let h = settle(near(), hx, hz, L + 0.3, need, 0, rnd, true);
  /* not enough room along the street: lanes out to more farmsteads */
  for (let k = 0; k < 8 && h < need; k++) {
    const an = rnd() * Math.PI * 2, p = [], o = polyAt(pts, c, rnd() * c[c.length - 1]);
    for (let r = 0; r <= 0.9; r += 0.15) p.push(dirAt(o[0], o[1], an, r));
    const cl = clipLine(p);
    if (!cl || polyLen(cl) < 0.45) continue;
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
    if (Math.hypot(q.x - t.x, q.z - t.z) > 7) return;
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
/* Station for town n, on the side facing another town; its platform track runs toward that town. */
function stationFor(n, toward) {
  const old = S.bld.find(b => b.t === 'station' && b.ti === n);
  if (old) return old;
  const t = S.towns[n], L = Math.hypot(toward.x - t.x, toward.z - t.z), ux = (toward.x - t.x) / L, uz = (toward.z - t.z) / L;
  for (let r = (t.R || 1) * 0.6 + 0.5; r <= 6; r += 0.25) for (const off of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9, 1.2, -1.2]) {
    const ca = Math.cos(off), sa = Math.sin(off), vx = ux * ca - uz * sa, vz = ux * sa + uz * ca;
    const x = t.x + vx * r, z = t.z + vz * r, rot = Math.atan2(-vz, vx);
    if (!validPlace('station', x, z, rot, true).ok) continue;
    const fx = -vz, fz = vx, ax = x + fx * 0.31, az = z + fz * 0.31, p0 = [ax - vx * 0.6, az - vz * 0.6], p1 = [ax + vx * 0.6, az + vz * 0.6];
    blk();
    if (!lineCheck(p0[0], p0[1], p1[0], p1[1], 'rail', true).ok) continue;
    const b = addB('station', x, z, rot, 1, true);
    b.ti = n;
    if (!connectToTown(b, n, -1)) { removeB(b); continue; }
    afterLine(buildLine('rail', 1, [p0, p1], 0));
    return b;
  }
  return null;
}
function trackEnd(st, toward) {
  const a = accessOf(bOBB(st), 'rail', 0.35);
  if (!a) return null;
  const A = NODES.get(a.e.a), B = NODES.get(a.e.b);
  return Math.hypot(A.x - toward.x, A.z - toward.z) <= Math.hypot(B.x - toward.x, B.z - toward.z) ? A : B;
}
function railBetween(ia, ib) {
  const A = S.towns[ia], B = S.towns[ib], sA = stationFor(ia, B), sB = stationFor(ib, A);
  if (!sA || !sB) return false;
  const ea = trackEnd(sA, B), eb = trackEnd(sB, A);
  if (!ea || !eb) return false;
  blk();
  const p = planPath(ea.x, ea.z, eb.x, eb.z, 'rail', true);
  if (!p) return false;
  afterLine(buildLine('rail', 1, smoothLine(p, 'rail', true, 2), 0.1));
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
function roadBetween(ia, ib) {
  const A = S.towns[ia], B = S.towns[ib], na = townExit(ia, B), nb = townExit(ib, A);
  if (!na || !nb) return false;
  blk();
  const p = planPath(na.x, na.z, nb.x, nb.z, 'road', true);
  if (!p) return false;
  afterLine(buildLine('road', 1, smoothLine(p, 'road', true, 2), 0.1));
  return true;
}
function newTown(id, n, x, z, o) {
  return Object.assign({ id, n, reg: '', capital: 0, cap: STORE_BASE, orig: 0, lock: 0, kr: 0, vil: 0, R: 1, x, z, d: '', pop: 3, pop0: 3, h: 62, stock: {}, dl: {}, dem: {}, house: 0, wf: 0, jobs: 0,
    fill: 1, pm: 1, powS: 0, powD: 0, pr: 1, gS: 0, gD: 0, note: 'Content', lastWarn: -999, dev: 0, hint: '' }, o || {});
}
/* The region of a spot: inside the Klaipėda Region, or that of the nearest named town. */
function regionAt(x, z) {
  if (inKR(x, z)) return 'Mažoji Lietuva';
  let best = '', bd = 1e9;
  S.towns.forEach(t => { if (!t.reg || t.vil) return; const d = Math.hypot(t.x - x, t.z - z); if (d < bd) { bd = d; best = t.reg; } });
  return best;
}
/* Villages spread over the farmland, away from towns and from each other. */
function placeVillages() {
  const rnd = rng(4242), cand = [], gap = 14.5, names = VIL_NAMES.slice();
  for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
  for (let z = 3; z < MAPV - 3; z += 2.5) for (let x = 3; x < MAPU - 3; x += 2.5) cand.push([x + (rnd() - 0.5) * 2.2, z + (rnd() - 0.5) * 2.2]);
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
  const out = [], near = new SpatialHash(gap);
  S.towns.forEach(t => near.add(t, t.x, t.z, t.x, t.z));
  for (const [x, z] of cand) {
    if (out.length >= names.length) break;
    const k = cellAt(x, z);
    if (k < 0 || !(TF[k] & F_LT) || !isLandT(TT[k]) || (TF[k] & F_BOG)) continue;
    let clash = false;
    near.query(x - gap, z - gap, x + gap, z + gap, t => { if (!clash && Math.hypot(t.x - x, t.z - z) < (t.vil ? gap : (t.R || 1) + 7.5)) clash = true; });
    if (clash || !dryBox(x, z, 1.6)) continue;
    const v = { x, z, vil: 1, n: names[out.length] };
    out.push(v); near.add(v, x, z, x, z);
  }
  return out;
}
/* What a village is like, from the land around it. */
function villageText(x, z) {
  let n = 0, forest = 0, fert = 0, water = 0;
  forDisk(x, z, 2, (k, d) => { n++; if (TF[k] & F_FOREST) forest++; if (TF[k] & F_FERTILE) fert++; if (d < 1.4 && isWaterT(TT[k])) water++; });
  if (water) return 'A village of farmers and fishermen by the water.';
  if (forest > n * 0.4) return 'A forest village. People farm small clearings and cut firewood.';
  if (fert > n * 0.4) return 'A farming village on good soil.';
  return 'A farming village of a few homesteads.';
}
function genWorld() {
  genTerrain();
  S.nodes = []; S.edges = []; S.bld = []; S.lots = []; S.towns = [];
  rebuildIndex();
  TOWNS0.forEach(d => {
    const [x, z] = ll2xz(d.lon, d.lat);
    S.towns.push(newTown(d.id, d.n, x, z, { reg: d.reg, capital: d.cap || 0, orig: 1, lock: d.lock ? 1 : 0, kr: d.lock ? 1 : 0, d: d.d, pop: d.lock ? 0 : d.pop, pop0: d.pop, stock: { ...d.st } }));
  });
  TOWNS1.forEach(([id, nm, lon, lat, pop, reg, d, fl]) => {
    const [x, z] = ll2xz(lon, lat), vil = (fl || '').includes('v') ? 1 : 0, kr = (fl || '').includes('k') ? 1 : 0;
    const st = vil ? { grain: 4, potatoes: 4, timber: 5 } : { grain: Math.round(10 + pop * 3), potatoes: Math.round(6 + pop * 2), timber: Math.round(12 + pop * 2) };
    S.towns.push(newTown(id, nm, x, z, { reg, orig: 1, vil, kr, lock: kr, d, pop: kr ? 0 : pop, pop0: pop, stock: st }));
  });
  S.towns.forEach((t, n) => t.vil ? layoutVillage(t, n, t.pop0) : layoutTown(t, n, t.pop0));
  HIST_RAIL.forEach(([a, b]) => railBetween(tIdx(a), tIdx(b)));
  TOWNS0.forEach((d, n) => d.ind.forEach(type => placeNear(n, type)));
  HIST_ROAD.forEach(([a, b]) => roadBetween(tIdx(a), tIdx(b)));
  const rnd = rng(99);
  placeVillages().forEach(v => {
    const n = S.towns.length, kr = inKR(v.x, v.z) ? 1 : 0, k = cellAt(v.x, v.z), pop = Math.round((0.5 + rnd() + (TF[k] & F_FERTILE ? 0.3 : 0)) * 10) / 10;
    const t = newTown('v' + n, v.n, v.x, v.z, { vil: 1, orig: 1, kr, lock: kr, reg: regionAt(v.x, v.z), d: villageText(v.x, v.z), pop: kr ? 0 : pop, pop0: pop, stock: { grain: 3, potatoes: 3, timber: 4 } });
    S.towns.push(t);
    layoutVillage(t, n, pop);
  });
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
