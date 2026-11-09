'use strict';
/* Lietuva 1918 — the tools, in world km: what Road, Railway, Zone, Remove and Build do with a tap, a stroke or a drag, and the
   plans they make before anything is built (PEND, shown by showBar() in ui.js and applied by doConfirm()).
   - Lines are lists of points (TRACE). The planner (planTrace in terrain.js) runs through them; routePieces() then splits the plan
     into stretches to build, old lines it follows (used, or upgraded when of a lower kind), and joins clear of buildings.
   - Zoning adds up street by street (ZONES); Remove takes what a tap or a stroke touches.
   - A building's ghost snaps to the nearest road and faces it; findSpot() finds a good place for it near a town.
   Tests drive these directly: tapTool(x, z), undoStep(), beginDraw → moveDraw → finishDraw, setGhost, findSpot, doConfirm. */
const TOOL = { k: 'inspect', bt: null, rot: 0, ti: -1, lv: { road: 0, rail: 0 }, built: '' };
let PEND = null, TRACE = [], K0 = 0, ZONES = [], lastPlan = 0, planTimer = 0;
const FIND_R = 15;
const isLine = () => TOOL.k === 'road' || TOOL.k === 'rail', isBrush = () => TOOL.k === 'zone' || TOOL.k === 'bull';
function roadMax() { return S.era >= 3 ? 3 : 2; }
function railMax() { return S.era >= 3 ? 2 : 1; }
/* the level the line tool builds: the player's choice, or else the best the era allows (for roads, the era's own kind:
   dirt roads in the first era, though paved roads can be picked, at a price in bricks) */
function lineLevel(k) { const mx = k === 'road' ? roadMax() : railMax(), c = TOOL.lv[k]; return c >= 1 && c <= mx ? c : k === 'road' ? Math.min(mx, S.era) : mx; }
/* what the ground overlay highlights while placing a building: where it can go, or where it does best */
function needKey(bt) { const T0 = BT[bt]; if (!T0) return null; return T0.need === 'clay' || T0.need === 'bog' || T0.need === 'forest' ? T0.need : T0.bonus || null; }

function setTool(k, bt, ti) {
  TOOL.k = k; TOOL.bt = bt || null; TOOL.rot = 0; TOOL.ti = ti >= 0 ? ti : -1; TOOL.built = '';
  clearPreview();
  document.body.classList.toggle('tooling', k !== 'inspect');
  VIEW.need = k === 'place' ? needKey(bt) : null; VIEW.ver++;
  if (k === 'place') findGhost(true);
  showBar();
}
function clearPreview() {
  VIEW.path = null; VIEW.lines = null; VIEW.hit = null; VIEW.snaps = []; VIEW.zone = null; VIEW.bull = null; VIEW.brush = null; VIEW.ghost = null; VIEW.ver++;
  PEND = null; TRACE = []; K0 = 0; ZONES = []; showBar();
}
const snapR = () => Math.max(0.12, cam.dist * 0.022), brushR = () => Math.max(0.28, cam.dist * 0.04);
/* km covered by one screen pixel at the middle of the view */
function kmPerPx() { return cam.dist * 2 * Math.tan(CAM3.fov * Math.PI / 360) / Math.max(1, ch); }
function onScreen(x, z) { const s = toScreen(x, 0, z); return s[2] && s[0] > 30 && s[0] < cw - 30 && s[1] > 40 && s[1] < ch - VOFF.ty * 2 - 30; }

/* ---------- the tools, in world km ---------- */
function tapTool(x, z) {
  if (isLine()) return addPoint(x, z);
  if (isBrush()) { beginDraw(x, z); return finishDraw(); }
  if (TOOL.k === 'place') {
    const g = VIEW.ghost;
    if (PTYPE === 'mouse' && g && g.ok && obbHas({ x: g.x, z: g.z, rot: g.rot, w: BT[g.t].fp[0], d: BT[g.t].fp[1] }, x, z, 0.1)) return doConfirm();
    setGhost(x, z);
  }
}
/* A road or railway is a list of points (TRACE). The planner runs through them, around water and buildings. */
function addPoint(x, z) {
  if (!TRACE.length) {
    clearPreview();
    TRACE = [[x, z]]; K0 = 0; planLine();
    const e = nearestEdge(x, z, TOOL.k, snapR());
    if (e && e.e.lv < lineLevel(TOOL.k)) prepareUpgrade(e.e); else showBar();
    return;
  }
  TRACE.push([x, z]);
  prepareLine();
}
function undoStep() {
  if (isLine()) {
    if (!TRACE.length) return;
    TRACE.pop(); K0 = Math.min(K0, Math.max(0, TRACE.length - 1));
    if (TRACE.length >= 2) prepareLine(); else if (TRACE.length === 1) { PEND = null; planLine(); showBar(); } else clearPreview();
    return;
  }
  if (TOOL.k === 'zone' && ZONES.length > 1) { ZONES.pop(); VIEW.zone = ZONES.flat(); VIEW.ver++; return prepareZone(); }
  clearPreview();
}
function beginDraw(x, z) {
  if (isLine()) {
    const last = TRACE[TRACE.length - 1];
    let near = false;
    if (last) { const a = toScreen(last[0], 0, last[1]), b = toScreen(x, 0, z); near = Math.hypot(a[0] - b[0], a[1] - b[1]) < 44; }
    if (near) K0 = TRACE.length - 1;
    else { clearPreview(); TRACE = [[x, z]]; K0 = 0; }
    PEND = null;
  } else TRACE = [[x, z]];
  updateDraw();
}
function moveDraw(x, z) {
  const l = TRACE[TRACE.length - 1];
  if (!l || Math.hypot(x - l[0], z - l[1]) < Math.max(0.02, cam.dist * 0.002)) return;
  TRACE.push([x, z]);
  const now = performance.now();
  if (now - lastPlan > 70) updateDraw();
  else { clearTimeout(planTimer); planTimer = setTimeout(updateDraw, 80); }
}
function finishDraw() {
  clearTimeout(planTimer);
  if (isLine()) {
    if (TRACE.length - K0 > 1) { const st = rdp(dedupe(TRACE.slice(K0), 0.02), Math.max(0.05, cam.dist * 0.008)); TRACE = TRACE.slice(0, K0).concat(st); }
    K0 = Math.max(0, TRACE.length - 1);
    if (TRACE.length >= 2) prepareLine(); else { PEND = null; planLine(); showBar(); }
  } else if (TOOL.k === 'zone') {
    const lots = zonePlan(TRACE, brushR(), false), n0 = ZONES.length;
    addZone(lots); TRACE = []; VIEW.brush = null;
    if (ZONES.length === n0 && n0) toast('Nothing more to zone there. Tap beside a street.');
    prepareZone();
  } else if (TOOL.k === 'bull') prepareBull();
}
function updateDraw() {
  lastPlan = performance.now();
  if (isLine()) planLine();
  else if (TOOL.k === 'zone') { const q = TRACE[TRACE.length - 1]; VIEW.brush = [q[0], q[1], brushR()]; VIEW.zone = ZONES.flat().concat(zonePlan(TRACE, brushR(), false)); VIEW.ver++; }
  else if (TOOL.k === 'bull') { const q = TRACE[TRACE.length - 1]; VIEW.brush = [q[0], q[1], brushR() * 0.6]; VIEW.bull = bullPlan(TRACE, brushR() * 0.6); VIEW.ver++; }
}
function moveHandle(i, x, z) {
  if (i < 0 || i >= TRACE.length) return;
  TRACE[i] = [x, z];
  const now = performance.now();
  if (now - lastPlan > 70) { lastPlan = now; planLine(); }
  else { clearTimeout(planTimer); planTimer = setTimeout(() => { lastPlan = performance.now(); planLine(); }, 80); }
}
function finishHandle() { clearTimeout(planTimer); if (TRACE.length >= 2) prepareLine(); else { planLine(); showBar(); } }
/* Where a line that starts on the network should leave it: the point of the network within r km of (x, z) nearest the target
   (tx, tz), from which the first stretch toward the target is clear of buildings. A road tapped inside a town then leaves from the
   town's edge instead of cutting through its houses; travel inside the town uses the streets there are. */
function exitPoint(x, z, tx, tz, k, r) {
  space(); blk();
  const cands = [], seen = new Set();
  EH.query(x - r, z - r, x + r, z + r, it => {
    const e = it[0];
    if (e.k !== k || seen.has(e)) return;
    seen.add(e);
    for (let s = 0; s <= e.L + 0.04; s += 0.08) { const q = polyAt(e.p, e.c, Math.min(s, e.L)); if (Math.hypot(q[0] - x, q[1] - z) <= r) cands.push([q[0], q[1], Math.hypot(tx - q[0], tz - q[1])]); }
  });
  cands.sort((a, b) => a[2] - b[2]);
  for (let i = 0; i < cands.length && i < 80; i++) {
    const c = cands[i], L = c[2];
    if (L < 0.05) return [c[0], c[1]];
    const f = Math.min(1, 0.7 / L);
    if (!exactBlock(c[0], c[1], c[0] + (tx - c[0]) * f, c[1] + (tz - c[1]) * f)) return [c[0], c[1]];
  }
  return null;
}
/* a tap on a town's middle (its hall or square) means the town: the line starts from its streets, or its tracks */
function snapEnd(x, z, k, r) {
  const sn = snapNet(x, z, k, r);
  if (sn) return sn;
  const ti = nearestTown(x, z);
  if (ti < 0) return null;
  const t = S.towns[ti];
  return Math.hypot(t.x - x, t.z - z) <= (t.R || 1) * 0.8 + 0.4 ? snapNet(x, z, k, k === 'rail' ? 2.5 : 1.2) : null;
}
function planLine() {
  const k = TOOL.k, r = snapR(), tr = TRACE.slice(), n = tr.length;
  const s0 = snapEnd(tr[0][0], tr[0][1], k, r), s1 = n > 1 ? snapEnd(tr[n - 1][0], tr[n - 1][1], k, r) : null;
  if (s0) tr[0] = [s0.x, s0.z];
  if (s1) tr[n - 1] = [s1.x, s1.z];
  /* ends on the network leave it where it faces the next point, clear of houses */
  const reach = (a, b) => clamp(Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.45, 0.3, 2.5);
  if (s0 && n > 1) { const ex = exitPoint(tr[0][0], tr[0][1], tr[1][0], tr[1][1], k, reach(tr[0], tr[1])); if (ex) tr[0] = ex; }
  if (s1 && n > 1) { const ex = exitPoint(tr[n - 1][0], tr[n - 1][1], tr[n - 2][0], tr[n - 2][1], k, reach(tr[n - 1], tr[n - 2])); if (ex) tr[n - 1] = ex; }
  VIEW.snaps = tr.map((q, i) => [q[0], q[1], i === 0 ? !!s0 : i === tr.length - 1 ? !!s1 : false, i > 0 && i < tr.length - 1]);
  let pts = null, pieces = null;
  if (tr.length > 1 && polyLen(tr) > 0.05) { blk(); pts = planTrace(tr, k, false, Math.max(0.06, cam.dist * 0.01)); if (pts) pieces = routePieces(pts, k); }
  VIEW.path = pts || (tr.length > 1 ? tr : null); VIEW.pathOk = !!pts; VIEW.pathMode = k; VIEW.hit = null;
  VIEW.lines = pieces ? pieces.map(q => ({ p: q.p, k: q.net ? (q.segs.some(g => g.e.lv < lineLevel(k)) ? 'up' : 'use') : 'new' })) : null;
  VIEW.ver++;
  return { pts, pieces, s0, s1 };
}
/* ---------- a planned line, split into what it builds and what it uses ----------
   The planner works on 0.5 km cells, so where it follows a line that exists, its path wanders off the real one. Those
   stretches are replaced by the true way along the network (the road or track it follows), which is used, or upgraded when
   it is of a lower kind. Only the stretches off the network are built, joined to it where the join is clear of buildings. */
/* the way along the network between two points on it, {e, s} each: {p, segs: [{e, s0, s1}], len}, or null */
function netPath(k, a, b) {
  if (a.e === b.e) { const s0 = Math.min(a.s, b.s), s1 = Math.max(a.s, b.s), p = polySlice(a.e.p, a.e.c, s0, s1); return { p: a.s > b.s ? p.reverse() : p, segs: [{ e: a.e, s0, s1 }], len: s1 - s0 }; }
  const src = [{ e: a.e, s: a.s, o: 0 }], R = dijkstra(src, k, [{ e: b.e, s: b.s }]), info = distTo(R, b.e, b.s, src);
  if (!(info.d < Infinity)) return null;
  const e = b.e, s = b.s;
  if (info.via && info.via.e) return netPath(k, a, { e: a.e, s: a.s });
  const parts = [info.via === 'a' ? polySlice(e.p, e.c, 0, s) : polySlice(e.p, e.c, s, e.L).reverse()], segs = [info.via === 'a' ? { e, s0: 0, s1: s } : { e, s0: s, s1: e.L }];
  let id = info.via === 'a' ? e.a : e.b, guard = 0;
  while (guard++ < 5000) {
    const pv = R.prev.get(id);
    if (!pv) break;
    const pe = EDGES.get(pv.e);
    if (pv.src) { parts.push(id === pe.a ? polySlice(pe.p, pe.c, 0, pv.src.s).reverse() : polySlice(pe.p, pe.c, pv.src.s, pe.L)); segs.push(id === pe.a ? { e: pe, s0: 0, s1: pv.src.s } : { e: pe, s0: pv.src.s, s1: pe.L }); break; }
    parts.push(pe.a === pv.from ? pe.p : pe.p.slice().reverse()); segs.push({ e: pe, s0: 0, s1: pe.L });
    id = pv.from;
  }
  parts.reverse();
  let out = [];
  for (const p of parts) out = out.length ? out.concat(p.slice(1)) : p.slice();
  return { p: dedupe(out, 0.001), segs, len: info.d };
}
/* the nearest point of the network to (x, z), within r, that a straight join from (x, z) reaches without hitting a building */
function joinPoint(x, z, k, r) {
  const cands = [], seen = new Set();
  EH.query(x - r, z - r, x + r, z + r, it => {
    const e = it[0];
    if (e.k !== k || seen.has(e)) return;
    seen.add(e);
    for (let s = 0; s <= e.L + 0.02; s += 0.05) { const q = polyAt(e.p, e.c, Math.min(s, e.L)), d = Math.hypot(q[0] - x, q[1] - z); if (d <= r) cands.push([q[0], q[1], d]); }
  });
  cands.sort((a, b) => a[2] - b[2]);
  for (let i = 0; i < cands.length && i < 60; i++) if (cands[i][2] < 0.02 || !exactBlock(x, z, cands[i][0], cands[i][1])) return [cands[i][0], cands[i][1]];
  return null;
}
function routePieces(pts, k) {
  const bit = k === 'road' ? 2 : 4, c = polyCum(pts), L = c[c.length - 1], sm = [];
  for (let s = 0; ; s += 0.1) {
    const ss = Math.min(s, L), q = polyAt(pts, c, ss), cell = cellAt(q[0], q[1]);
    sm.push({ s: ss, x: q[0], z: q[1], ne: cell >= 0 && (BLK[cell] & bit) ? nearestEdge(q[0], q[1], k, 0.5) : null });
    if (ss >= L) break;
  }
  /* runs on and off the network; a short touch in the middle is a crossing, not a stretch to follow */
  let runs = [];
  sm.forEach((p, i) => { const on = !!p.ne, r = runs[runs.length - 1]; if (r && r.on === on) r.i1 = i; else runs.push({ on, i0: i, i1: i }); });
  runs.forEach(r => { if (r.on && r.i0 > 0 && r.i1 < sm.length - 1 && sm[r.i1].s - sm[r.i0].s < 0.35) r.on = false; });
  runs = runs.reduce((a, r) => { const l = a[a.length - 1]; if (l && l.on === r.on) l.i1 = r.i1; else a.push({ ...r }); return a; }, []);
  const hw = ((k === 'road' ? ROADT : RAILT)[lineLevel(k)].w) / 2, pieces = [];
  runs.forEach(r => {
    const slice = polySlice(pts, c, sm[r.i0].s, sm[r.i1].s);
    if (!r.on) return pieces.push({ net: false, p: slice });
    const a = sm[r.i0].ne, b = sm[r.i1].ne, np = netPath(k, a, b);
    if (np && np.len <= Math.hypot(a.x - b.x, a.z - b.z) * 1.6 + 0.6) return pieces.push({ net: true, p: np.p, segs: np.segs });
    /* no sensible way along the network here: build it if it is clear, or else count on the streets there are */
    pieces.push(lineHitsBuilding(slice, hw) ? { net: true, p: slice, segs: [] } : { net: false, p: slice });
  });
  /* join new stretches to the network beside them */
  pieces.forEach((P, i) => {
    if (P.net) return;
    const prev = pieces[i - 1], next = pieces[i + 1];
    if (prev && prev.net) { const a = P.p[0], j = joinPoint(a[0], a[1], k, 0.7) || prev.p[prev.p.length - 1]; P.p = [j].concat(P.p); }
    if (next && next.net) { const a = P.p[P.p.length - 1], j = joinPoint(a[0], a[1], k, 0.7) || next.p[0]; P.p = P.p.concat([j]); }
    P.p = dedupe(P.p, 0.01);
  });
  return pieces.filter(P => P.net || polyLen(P.p) > 0.05);
}
function bridges(pts) {
  let n = 0, wet = false;
  for (let q = 1; q < pts.length; q++) {
    const a = pts[q - 1], b = pts[q], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L / 0.1));
    for (let s = 0; s < m; s++) { const w = terrAt(a[0] + (b[0] - a[0]) * (s + 0.5) / m, a[1] + (b[1] - a[1]) * (s + 0.5) / m) === T_RIVER; if (w && !wet) n++; wet = w; }
  }
  return n;
}
function lineHitsBuilding(pts, hw) {
  space();
  for (let q = 1; q < pts.length; q++) {
    const a = pts[q - 1], b = pts[q];
    let hit = null;
    BH.query(Math.min(a[0], b[0]) - 1, Math.min(a[1], b[1]) - 1, Math.max(a[0], b[0]) + 1, Math.max(a[1], b[1]) + 1, x => { if (!hit && obbSegDist(bOBB(x), a[0], a[1], b[0], b[1]) < hw) hit = x; });
    if (hit) return hit;
  }
  return null;
}
/* the town that pays: the one whose roads reach the spot (towns before villages), or the nearest town */
function payTown(x, z) { const t = townAtPoint(x, z, true); return t >= 0 ? t : nearestTown(x, z, true, true); }
/* a line is paid by a town at one of its ends that has the materials: the owner of the spot, or the nearest town */
function linePayer(cost, ends) {
  const c = [];
  ends.forEach(q => { [payTown(q[0], q[1]), nearestTown(q[0], q[1], true, true)].forEach(ti => { if (ti >= 0 && !c.includes(ti)) c.push(ti); }); });
  const ok = c.find(ti => !missing(cost, S.towns[ti]));
  return ok !== undefined ? ok : c.length ? c[0] : -1;
}
/* stretches of old lines a plan upgrades: merged spans per edge, {e, s0, s1} */
function upSpans(pieces, lv) {
  const m = new Map();
  pieces.forEach(P => { if (P.net) P.segs.forEach(g => { if (g.e.lv >= lv || !EDGES.has(g.e.id)) return; const o = m.get(g.e); if (o) { o.s0 = Math.min(o.s0, g.s0); o.s1 = Math.max(o.s1, g.s1); } else m.set(g.e, { e: g.e, s0: g.s0, s1: g.s1 }); }); });
  return [...m.values()].filter(g => g.s1 - g.s0 > 0.05);
}
function prepareLine() {
  const k = TOOL.k, plan = planLine(), pts = plan.pts;
  if (!pts) { PEND = { kind: 'line', bad: TRACE.length < 2 ? 'Tap where it goes.' : 'No way through: water, buildings or the border are in the way. Undo the last point or tap around them.' }; return showBar(); }
  if (polyLen(pts) < 0.12) { PEND = { kind: 'line', bad: 'Too short. Tap a little further away.' }; return showBar(); }
  const lv = lineLevel(k), spec = (k === 'road' ? ROADT : RAILT)[lv], mk = Object.keys(spec.mat)[0];
  const runs = plan.pieces.filter(P => !P.net).map(P => ({ p: P.p, km: polyLen(P.p) })), ups = upSpans(plan.pieces, lv);
  const km = runs.reduce((a, r) => a + r.km, 0), upKm = ups.reduce((a, g) => a + g.s1 - g.s0, 0);
  if (!runs.length && !ups.length) { PEND = { kind: 'line', bad: `This ${k === 'road' ? 'road' : 'railway'} is already there all the way.${lineLevel(k) < (k === 'road' ? roadMax() : railMax()) ? ' Pick a better kind above to upgrade it.' : ''}` }; return showBar(); }
  let w = 0, br = 0;
  runs.forEach(r => { w += waterKm(r.p); br += bridges(r.p); });
  ups.forEach(g => { w += waterKm(polySlice(g.e.p, g.e.c, g.s0, g.s1)) * 0.6; });
  const f = km + upKm * 0.6 + w * (BRIDGE - 1);
  const cost = { lt: Math.round(spec.lt * f), [mk]: Math.ceil(spec.mat[mk] * f) };
  PEND = { kind: 'line', mode: k, pts, runs, ups, lv, km, upKm, br, cost, ti: linePayer(cost, [TRACE[0], TRACE[TRACE.length - 1]]), name: spec.n };
  const hit = runs.map(r => lineHitsBuilding(r.p, spec.w / 2)).find(Boolean);
  VIEW.hit = hit || null;
  if (hit) { PEND.bad = `${hit.t === 'house' ? 'Houses are' : bName(hit) + ' is'} in the way. Drag a point around it, or tap to add a bend.`; VIEW.pathOk = false; VIEW.ver++; }
  showBar();
}
/* raise the level of the spans a plan follows; spans that cover part of an edge split it first, from the far end back */
function applyUps(ups, lv) {
  ups.forEach(g => {
    let e = g.e;
    if (!EDGES.has(e.id)) return;
    if (g.s1 < e.L - 0.05) splitEdge(e, g.s1);
    if (g.s0 > 0.05) { const n = splitEdge(e, g.s0); e = n.e.map(id => EDGES.get(id)).find(x => x && x !== e && x.a === n.id) || e; }
    if (e.lv < lv) e.lv = lv;
  });
  netChanged();
}
function prepareUpgrade(e) {
  const lv = lineLevel(e.k), spec = (e.k === 'road' ? ROADT : RAILT)[lv], mk = Object.keys(spec.mat)[0], f = (e.L + waterKm(e.p) * (BRIDGE - 1)) * 0.6;
  const cost = { lt: Math.round(spec.lt * f), [mk]: Math.ceil(spec.mat[mk] * f) };
  PEND = { kind: 'up', e, lv, km: e.L, cost, ti: linePayer(cost, [e.p[0], e.p[e.p.length - 1]]), name: spec.n };
  VIEW.path = e.p; VIEW.pathOk = true; VIEW.ver++;
  showBar();
}
/* zoning adds up: every tap or stroke adds the lots along the streets it touches */
function addZone(lots) {
  const all = ZONES.flat(), add = [];
  for (const c of lots) {
    const o = { x: c.x, z: c.z, rot: c.rot, w: LOT_W, d: LOT_D };
    if (all.some(p => Math.hypot(p.x - c.x, p.z - c.z) < LOT_W * 1.5 && obbOverlap(o, { x: p.x, z: p.z, rot: p.rot, w: LOT_W, d: LOT_D }, 0.01))) continue;
    add.push(c); all.push(c);
  }
  if (add.length) ZONES.push(add);
  VIEW.zone = ZONES.flat(); VIEW.ver++;
}
function prepareZone() {
  const lots = ZONES.flat();
  PEND = { kind: 'zone', lots, n: lots.length, cost: { lt: lots.length * ZONE_COST } };
  if (!lots.length) PEND.bad = 'Nothing here can be zoned. Tap beside a street, on dry land inside Lithuania.';
  else if (lots.every(c => townAtPoint(c.x, c.z) < 0)) PEND.warn = `These lots are more than ${TERRITORY} km by road from a town hall, so no town will build here.`;
  VIEW.brush = null; VIEW.ver++;
  showBar();
}
function prepareBull() {
  const p = VIEW.bull || { b: [], lots: [], segs: [], road: 0, rail: 0 };
  PEND = { kind: 'bull', plan: p };
  if (!p.b.length && !p.lots.length && !p.segs.length) PEND.bad = 'Nothing to remove here.';
  VIEW.brush = null; VIEW.ver++;
  showBar();
}
function bullThing(b) {
  clearPreview();
  VIEW.bull = { b: [b], lots: [], segs: [], road: 0, rail: 0 }; VIEW.ver++;
  prepareBull();
}
/* The ghost snaps to the nearest road (railway for a station) and turns to face it. With rot given, it stands exactly there. */
function setGhost(x, z, rot) {
  const t = TOOL.bt, T0 = BT[t];
  if (!T0) return;
  const [w, d] = T0.fp, kind = t === 'station' ? 'rail' : 'road';
  let gx = x, gz = z, r = TOOL.rot, v = null;
  if (rot !== undefined) { r = rot + TOOL.rot; v = validPlace(t, gx, gz, r); }
  else {
    const ne = t === 'hall' || t === 'hydro' ? null : nearestEdge(x, z, kind, Math.max(0.55, d + 0.35));
    if (ne) {
      /* face the road; if that spot is taken, slide along the road to the nearest spot that fits */
      const turn = Math.round(TOOL.rot / (Math.PI / 2)) % 2 !== 0, ext = turn ? w : d, off = espec(ne.e).w / 2 + 0.06 + ext / 2;
      const side0 = (() => { const q = polyAt(ne.e.p, ne.e.c, ne.s); return (x - q[0]) * -q[3] + (z - q[1]) * q[2] < 0 ? -1 : 1; })();
      search: for (const side of [side0, -side0]) for (const ds of [0, 0.18, -0.18, 0.35, -0.35, 0.55, -0.55, 0.8, -0.8, 1.1, -1.1]) {
        const s = ne.s + ds;
        if (ds && (s < 0 || s > ne.e.L)) continue;
        const q = polyAt(ne.e.p, ne.e.c, s), nx = -q[3] * side, nz = q[2] * side;
        const px = q[0] + nx * off, pz = q[1] + nz * off, pr = faceRot(-nx, -nz) + TOOL.rot, pv = validPlace(t, px, pz, pr);
        if (!v || pv.ok) { gx = px; gz = pz; r = pr; v = pv; }
        if (pv.ok) break search;
      }
    }
    if (!v) v = validPlace(t, gx, gz, r);
  }
  const ti = payTown(gx, gz), jt = t === 'hall' ? -1 : townAtPoint(gx, gz, true);
  VIEW.ghost = { t, x: gx, z: gz, rot: r, ok: v.ok }; VIEW.ver++;
  const acc = t === 'hall' || !!accessOf({ x: gx, z: gz, rot: r, w, d }, 'road');
  PEND = { kind: 'place', t, x: gx, z: gz, rot: r, ok: v.ok, why: v.why, bonus: v.bonus, ti, jt, acc, cost: T0.cost, fx: x, fz: z };
  TOOL.built = '';
  showBar();
}
function rotateGhost() {
  if (!PEND || PEND.kind !== 'place') return;
  TOOL.rot = (TOOL.rot + Math.PI / 2) % (Math.PI * 2);
  setGhost(PEND.fx, PEND.fz);
}
/* ---------- finding a spot for a building ----------
   Places that face a road (a railway for a station), within FIND_R km, nearest first, where the ground suits the building
   and a town will take it in. With a town given (ti), a spot of that town comes first. Returns [x, z, rot] or null. */
/* cells near the border, the coast, a lake or any water, worked out once: the quick test before the exact one */
const NEARM = {};
function nearMask(kind) {
  if (NEARM.v !== WV.own) { for (const q in NEARM) delete NEARM[q]; NEARM.v = WV.own; }
  if (NEARM[kind]) return NEARM[kind];
  const src = kind === 'border' ? k => CTY[k] > 1 || heldOff(k) : kind === 'coast' ? k => TT[k] === T_SEA || TT[k] === T_LAGOON : kind === 'lake' ? k => TT[k] === T_LAKE : k => isWaterT(TT[k]);
  const reach = Math.ceil((kind === 'border' ? 3 : kind === 'lake' ? 0.8 : kind === 'coast' ? 0.7 : 0.6) / CELL) + 1, d = new Uint8Array(GW * GH).fill(255), q = [];
  for (let k = 0; k < GW * GH; k++) if (src(k)) { d[k] = 0; q.push(k); }
  for (let h = 0; h < q.length; h++) {
    const k = q[h], v = d[k];
    if (v >= reach) continue;
    const i = k % GW, j = (k / GW) | 0;
    if (i > 0 && d[k - 1] > v + 1) { d[k - 1] = v + 1; q.push(k - 1); }
    if (i < GW - 1 && d[k + 1] > v + 1) { d[k + 1] = v + 1; q.push(k + 1); }
    if (j > 0 && d[k - GW] > v + 1) { d[k - GW] = v + 1; q.push(k - GW); }
    if (j < GH - 1 && d[k + GW] > v + 1) { d[k + GW] = v + 1; q.push(k + GW); }
  }
  return (NEARM[kind] = d.map(v => v <= reach ? 1 : 0));
}
function quickNeed(need, x, z) {
  const f = flagsAt(x, z);
  if (!(f & F_LT) || heldOffAt(x, z)) return false;
  if (need === 'border' || need === 'coast' || need === 'lake' || need === 'water') { const k = cellAt(x, z); return k >= 0 && nearMask(need)[k] === 1; }
  if (need === 'clay') { let c = 0; forDisk(x, z, 0.6, k => { if (TF[k] & F_CLAY) c++; }); return c > 0; }
  if (need === 'bog') return !!(f & F_BOG);
  if (need === 'forest') { let c = 0; forDisk(x, z, 0.9, k => { if (TF[k] & F_FOREST) c++; }); return c >= 3; }
  if (need === 'open') return !(f & F_BOG);
  return true;
}
function findSpot(t, x0, z0, ti, R) {
  const T0 = BT[t];
  if (!T0 || !unlocked(t)) return null;
  const t0 = performance.now(), over = () => performance.now() - t0 > 160;
  if (t === 'hall' || T0.need === 'river') {
    /* a new town or a dam: rings of open ground (river cells for a dam) around the point */
    for (let r = 0; r <= 25 && !over(); r += 0.5) {
      const n = r ? Math.ceil(r * 2 * Math.PI / 0.7) : 1;
      for (let q = 0; q < n; q++) {
        const a = q / n * Math.PI * 2, x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r;
        if (T0.need === 'river' && terrAt(x, z) !== T_RIVER) continue;
        for (const rot of t === 'hall' ? [0] : [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) if (validPlace(t, x, z, rot).ok && (t === 'hall' || townAtPoint(x, z, true) >= 0)) return [x, z, rot];
      }
    }
    return null;
  }
  R = R || FIND_R;
  const kind = t === 'station' ? 'rail' : 'road', d = T0.fp[1], edges = new Set(), cands = [];
  space();
  EH.query(x0 - R, z0 - R, x0 + R, z0 + R, it => { if (it[0].k === kind) edges.add(it[0]); });
  edges.forEach(e => {
    const off = espec(e).w / 2 + 0.06 + d / 2;
    for (let s = Math.min(0.25, e.L / 2); s < e.L; s += 0.35) {
      const q = polyAt(e.p, e.c, s), dd = Math.hypot(q[0] - x0, q[1] - z0);
      if (dd > R) continue;
      for (const side of [1, -1]) { const nx = -q[3] * side, nz = q[2] * side; cands.push({ x: q[0] + nx * off, z: q[1] + nz * off, rot: faceRot(-nx, -nz), e, s, dd }); }
    }
  });
  cands.sort((a, b) => a.dd - b.dd);
  let first = null, other = null;
  for (const c of cands) {
    if (over() || (first && c.dd > first.dd + 3)) break;
    if (!quickNeed(T0.need, c.x, c.z)) continue;
    let o = -1;
    if (kind === 'road') { const q = ownerAt(c.e, c.s, true); o = q.o >= 0 && q.d <= TERRITORY ? q.o : -1; } else o = townAtPoint(c.x, c.z, true);
    if (o < 0) continue;
    const v = validPlace(t, c.x, c.z, c.rot);
    if (!v.ok) continue;
    if (ti >= 0 && o !== ti) { if (!other) other = c; continue; }
    if (!T0.bonus || v.bonus) return [c.x, c.z, c.rot];
    if (!first) first = c;
  }
  const c = first || other;
  return c ? [c.x, c.z, c.rot] : null;
}
/* put the ghost on the best spot near the chosen town, or near the middle of the view */
function findGhost(initial) {
  const t = TOOL.bt, T = TOOL.ti >= 0 ? S.towns[TOOL.ti] : null;
  const from = !initial && PEND && PEND.kind === 'place' ? [PEND.x, PEND.z] : T ? [T.x, T.z] : [cam.x, cam.z];
  /* nothing near: look further out, for any town (bogs, clay pits and borders can be far away) */
  let s = findSpot(t, from[0], from[1], TOOL.ti);
  if (!s && BT[t].need) for (const R of [45, 90, 160, 260]) { s = findSpot(t, from[0], from[1], -1, R); if (s) break; }
  if (s) {
    setGhost(s[0], s[1], s[2]);
    const far = cam.dist > 14, d = Math.hypot(s[0] - from[0], s[1] - from[1]);
    if (far || !onScreen(s[0], s[1])) focusAt(s[0], s[1], far ? 8 : cam.dist);
    if (d > FIND_R) { const jt = PEND && PEND.jt >= 0 ? S.towns[PEND.jt] : null; toast(`The nearest good spot is ${Math.round(d)} km away${jt ? ', by ' + jt.n : ''}.`); }
  } else {
    setGhost(from[0], from[1]);
    /* the search above went 260 km out: no coast at all means others hold all of it (before 1921, or after losing it) */
    if (BT[t].need === 'coast') toast('Lithuania holds no sea coast now, so a sea port can’t be built.');
    else if (!initial) toast(`No spot for a ${BT[t].n.toLowerCase()} near here.${VIEW.need ? ' The lit ground suits it.' : ''} Try another town.`);
  }
}

function doConfirm() {
  const p = PEND;
  let placed = null;
  if (!p || p.bad) return;
  const town = p.ti >= 0 ? S.towns[p.ti] : null;
  if (p.kind === 'line' || p.kind === 'up') {
    if (!town) return toast('Found or unlock a town nearby first');
    const m = missing(p.cost, town);
    if (m) return toast(m);
    pay(p.cost, town);
    if (p.kind === 'up') { if (EDGES.has(p.e.id)) { p.e.lv = p.lv; netChanged(); } toast(`Upgraded ${num(p.km)} km to ${p.name.toLowerCase()}`); log(`${num(p.km)} km near ${town.n} upgraded to ${p.name.toLowerCase()}.`); }
    else {
      if (p.ups && p.ups.length) applyUps(p.ups, p.lv);
      p.runs.forEach(r => afterLine(buildLine(p.mode, p.lv, r.p, 0.12)));
      const what = [p.km > 0.05 ? `${num(p.km)} km built` : '', p.upKm > 0.05 ? `${num(p.upKm)} km upgraded` : ''].filter(Boolean).join(', ');
      toast(`${p.name}: ${what}`); log(`${p.name} near ${town.n}: ${what}.`); tutEvent(p.mode);
    }
    clearPreview();
  } else if (p.kind === 'zone') {
    if (S.funds < p.cost.lt) return toast(`Need ${fmt(p.cost.lt - S.funds)} more Lt`);
    S.funds -= p.cost.lt;
    let n = 0;
    p.lots.forEach(c => { if (lotOk(c, false)) { addLot(c.x, c.z, c.rot); n++; } });
    toast(`${n} lot${n === 1 ? '' : 's'} zoned for homes`); clearPreview(); NET.dirty = true; tutEvent('zone');
  } else if (p.kind === 'bull') {
    const q = p.plan, nb = q.b.length;
    applyBull(q);
    if (VIEW.sel && VIEW.sel.kind === 'b' && !BMAP.get(VIEW.sel.id)) VIEW.sel = null;
    toast(`Removed ${nb} building${nb === 1 ? '' : 's'}${q.road + q.rail > 0.05 ? `, ${num(q.road + q.rail)} km of line` : ''}${q.lots.length ? `, ${q.lots.length} lots` : ''}`);
    clearPreview();
  } else if (p.kind === 'place') {
    const v = validPlace(p.t, p.x, p.z, p.rot);
    if (!v.ok) return toast(v.why);
    if (!town) return toast('No town nearby to pay for it');
    const m = missing(p.cost, town);
    if (m) return toast(m);
    pay(p.cost, town);
    if (p.t === 'hall') newTownAt(p.x, p.z, p.rot);
    else { placed = addB(p.t, p.x, p.z, p.rot, 1); toast(`${BT[p.t].n} built`); log(`${BT[p.t].n} built near ${town.n}.`); tutEvent('build'); }
    VIEW.ghost = null; PEND = null; VIEW.ver++; TOOL.built = BT[p.t].n;
  }
  analyze(); save(); renderPanel(true); showBar();
  /* built with no road to a town: lay out the road to it, for the player to confirm */
  if (placed && placed.na === 'noroad' && offerAccess(placed)) toast(`${BT[placed.t].n} built. It needs a road to town: build the road shown, or draw your own.`);
}
/* A dirt road from a building that no road reaches to the nearest street of the town that would take it, planned in the Road
   tool. A station's front faces its track, so its road leaves from the back or a side. Returns true when there is a plan. */
function offerAccess(b) {
  const o = bOBB(b), [rx, rz, fx, fz] = obbAxes(o);
  let ti = townAtPoint(b.x, b.z, true);
  if (ti < 0) ti = nearestTown(b.x, b.z, true);
  if (ti < 0) return false;
  const sides = [[fx, fz, o.d / 2], [-fx, -fz, o.d / 2], [rx, rz, o.w / 2], [-rx, -rz, o.w / 2]].filter((q, i) => !(b.t === 'station' && i === 0));
  let best = null;
  sides.forEach(([dx, dz, h]) => {
    const px = b.x + dx * (h + 0.1), pz = b.z + dz * (h + 0.1), tg = nearestTownRoad(ti, px, pz);
    if (tg && (!best || tg.d < best.d)) best = { x: px, z: pz, tx: tg.x, tz: tg.z, d: tg.d };
  });
  if (!best || best.d > 6) return false;
  setTool('road'); TOOL.lv.road = 1;
  TRACE = [[best.x, best.z], [best.tx, best.tz]]; K0 = 1; prepareLine();
  return !!(PEND && !PEND.bad);
}
function newTownAt(x, z, rot) {
  const [lo, la] = xz2ll(x, z);
  let nm = null, bd = 1e9;
  PLACE_NAMES.forEach(([n, px, py]) => { if (S.towns.some(t => t.n === n)) return; const d = Math.hypot((px - lo) * 0.57, py - la); if (d < bd) { bd = d; nm = n; } });
  nm = nm && bd < 0.35 ? nm : 'New town ' + (S.towns.length + 1);
  const ti = foundTown(x, z, rot, nm);
  log(`${nm} is founded.`, 'good'); toast(`${nm} founded`);
  analyze(); setTool('inspect'); selectTown(ti);
}
