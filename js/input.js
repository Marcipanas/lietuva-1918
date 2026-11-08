'use strict';
/* Lietuva 1918 — input: camera gestures (drag, pinch, twist, two-finger tilt, mouse wheel and right-drag), keys,
   and the build tools. The tools work in world km, so tests can drive them directly:
   beginDraw(x, z) → moveDraw(x, z) → finishDraw() → doConfirm(), setGhost(x, z), tapTool(x, z). */
const TOOL = { k: 'inspect', bt: null, rot: 0 };
const PTR = new Map();
let G = null, PEND = null, TRACE = [], lastPlan = 0, planTimer = 0;
const HINTS = {
  road: 'Drag where the road should run. It joins roads it touches and bridges rivers. Two fingers move the map.',
  rail: 'Drag where the railway should run. Towns need a station beside the track.',
  zone: 'Paint along streets to zone lots for homes. Towns build houses there while people are fed.',
  bull: 'Paint over roads, tracks or buildings to remove them, or tap one thing.',
  place: 'Drag to move it. Near a road it turns to face the road. Then press Build.'
};
const isLine = () => TOOL.k === 'road' || TOOL.k === 'rail', isBrush = () => TOOL.k === 'zone' || TOOL.k === 'bull';

function setTool(k, bt) {
  TOOL.k = k; TOOL.bt = bt || null; TOOL.rot = 0;
  clearPreview(); hint(HINTS[k] || ''); renderTools();
  document.body.classList.toggle('tooling', k !== 'inspect');
  if (k === 'place') { const p = groundAt(cw / 2, ch * 0.55); if (p) setGhost(p[0], p[1]); }
}
function clearPreview() {
  VIEW.path = null; VIEW.snaps = []; VIEW.zone = null; VIEW.bull = null; VIEW.brush = null; VIEW.ghost = null; VIEW.ver++;
  PEND = null; TRACE = []; showConfirm();
}
function pos(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
const snapR = () => Math.max(0.25, cam.dist * 0.022), brushR = () => Math.max(0.55, cam.dist * 0.04);

/* ---------- pointer gestures ---------- */
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  const [x, y] = pos(e);
  PTR.set(e.pointerId, { x, y });
  if (PTR.size === 2) {
    const [a, b] = [...PTR.values()];
    if (G && G.mode === 'draw' && !PEND) { TRACE = []; VIEW.path = null; VIEW.zone = null; VIEW.bull = null; VIEW.brush = null; VIEW.ver++; }
    G = { mode: 'two', pa: { ...a }, pb: { ...b }, acc: 0, tilt: null };
    return;
  }
  if (PTR.size > 2) return;
  G = { mode: e.button === 2 || e.button === 1 ? 'orbit' : 'press', x0: x, y0: y, px: x, py: y };
});
cv.addEventListener('pointermove', e => {
  const [x, y] = pos(e), p = PTR.get(e.pointerId);
  if (!p) { if (e.pointerType === 'mouse') hover(x, y); return; }
  p.x = x; p.y = y;
  if (!G) return;
  if (G.mode === 'two') { if (PTR.size === 2) twoFinger(); return; }
  if (G.mode === 'orbit') { rotateBy((x - G.px) * 0.006); tiltBy((y - G.py) * 0.004); G.px = x; G.py = y; return; }
  if (G.mode === 'press' && Math.hypot(x - G.x0, y - G.y0) > 7) {
    const g = groundAt(G.x0, G.y0);
    if ((isLine() || isBrush()) && g) { G.mode = 'draw'; beginDraw(g[0], g[1]); }
    else if (TOOL.k === 'place' && g) { G.mode = 'ghost'; setGhost(g[0], g[1]); }
    else G.mode = 'pan';
  }
  if (G.mode === 'pan') panBy(G.px, G.py, x, y);
  else if (G.mode === 'draw') { const g = groundAt(x, y); if (g) moveDraw(g[0], g[1]); }
  else if (G.mode === 'ghost') { const g = groundAt(x, y); if (g) setGhost(g[0], g[1]); }
  G.px = x; G.py = y;
});
function twoFinger() {
  const [a, b] = [...PTR.values()], pa = G.pa, pb = G.pb;
  const m0 = [(pa.x + pb.x) / 2, (pa.y + pb.y) / 2], m1 = [(a.x + b.x) / 2, (a.y + b.y) / 2];
  const d0 = Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1, d1 = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const an0 = Math.atan2(pb.y - pa.y, pb.x - pa.x), an1 = Math.atan2(b.y - a.y, b.x - a.x);
  const dya = a.y - pa.y, dyb = b.y - pb.y, dx = (a.x - pa.x + b.x - pb.x) / 2;
  if (G.tilt === null) {
    G.acc += Math.abs(dya) + Math.abs(dyb) + Math.abs(dx) * 2 + Math.abs(d1 - d0);
    if (G.acc > 14) G.tilt = dya * dyb > 0 && Math.abs(dya + dyb) > 3 * Math.abs(dx) && Math.abs(d1 - d0) < 6 && Math.abs(an1 - an0) < 0.05;
  }
  if (G.tilt) tiltBy((m1[1] - m0[1]) * 0.006);
  else if (G.tilt === false) {
    const g = groundAt(m0[0], m0[1]);
    let da = an1 - an0;
    if (da > Math.PI) da -= Math.PI * 2; else if (da < -Math.PI) da += Math.PI * 2;
    cam.dist /= d1 / d0; cam.yaw += da; cam.anim = null; applyCam();
    const g2 = groundAt(m1[0], m1[1]);
    if (g && g2) { cam.x += g[0] - g2[0]; cam.z += g[1] - g2[1]; applyCam(); }
  }
  G.pa = { ...a }; G.pb = { ...b };
}
function endPtr(e, cancel) {
  const [x, y] = pos(e);
  PTR.delete(e.pointerId);
  if (!G) return;
  if (!cancel && PTR.size === 0) {
    if (G.mode === 'press') tap(x, y);
    else if (G.mode === 'draw') finishDraw();
  }
  G = PTR.size === 0 ? null : { mode: 'idle' };
}
cv.addEventListener('pointerup', e => endPtr(e, false));
cv.addEventListener('pointercancel', e => endPtr(e, true));
cv.addEventListener('wheel', e => {
  e.preventDefault();
  const [x, y] = pos(e);
  if (e.shiftKey) rotateBy(e.deltaY * 0.003); else zoomAt(x, y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)));
}, { passive: false });
cv.addEventListener('contextmenu', e => e.preventDefault());
function hover(x, y) {
  if (TOOL.k === 'place') { const g = groundAt(x, y); if (g) setGhost(g[0], g[1]); }
  cv.style.cursor = TOOL.k === 'inspect' ? 'grab' : 'crosshair';
}
function tap(sx, sy) {
  const g = groundAt(sx, sy);
  if (TOOL.k === 'inspect') {
    const b = pickBuilding(sx, sy);
    if (b) return b.t === 'hall' && b.town >= 0 ? selectTown(b.town) : selectBuilding(b);
    if (!g) return select(null);
    if (nearestEdge(g[0], g[1], 'road', snapR())) { const ti = townAtPoint(g[0], g[1]); if (ti >= 0) return selectTown(ti); }
    const nt = nearestTown(g[0], g[1]);
    if (nt >= 0 && Math.hypot(S.towns[nt].x - g[0], S.towns[nt].z - g[1]) < 3) return selectTown(nt);
    return select(null);
  }
  if (!g) return;
  if (TOOL.k === 'bull') { const b = pickBuilding(sx, sy); if (b && b.t !== 'hall') return bullThing(b); }
  tapTool(g[0], g[1]);
}

/* ---------- the tools, in world km ---------- */
function beginDraw(x, z) {
  clearPreview();
  TRACE = [[x, z]];
  updateDraw(true);
}
function moveDraw(x, z) {
  const l = TRACE[TRACE.length - 1];
  if (!l || Math.hypot(x - l[0], z - l[1]) < Math.max(0.02, cam.dist * 0.002)) return;
  TRACE.push([x, z]);
  const now = performance.now();
  if (now - lastPlan > 70) updateDraw(false);
  else { clearTimeout(planTimer); planTimer = setTimeout(() => updateDraw(false), 80); }
}
function finishDraw() {
  clearTimeout(planTimer);
  if (isLine()) prepareLine();
  else if (TOOL.k === 'zone') prepareZone();
  else if (TOOL.k === 'bull') prepareBull();
}
function updateDraw() {
  lastPlan = performance.now();
  if (isLine()) planLine();
  else if (TOOL.k === 'zone') { const q = TRACE[TRACE.length - 1]; VIEW.brush = [q[0], q[1], brushR()]; VIEW.zone = zonePlan(TRACE, brushR(), false); VIEW.ver++; }
  else if (TOOL.k === 'bull') { const q = TRACE[TRACE.length - 1]; VIEW.brush = [q[0], q[1], brushR() * 0.6]; VIEW.bull = bullPlan(TRACE, brushR() * 0.6); VIEW.ver++; }
}
function tapTool(x, z) {
  if (isLine()) {
    if (TRACE.length === 1 && (!PEND || PEND.kind === 'up')) { TRACE.push([x, z]); return prepareLine(); }
    clearPreview();
    const e = nearestEdge(x, z, TOOL.k, snapR());
    TRACE = [[x, z]]; planLine();
    if (e && e.e.lv < (TOOL.k === 'road' ? roadLevel() : railLevel())) return prepareUpgrade(e.e);
    hint(`Now tap where the ${TOOL.k === 'road' ? 'road' : 'railway'} should end, or drag.`);
    return;
  }
  if (isBrush()) { TRACE = [[x, z]]; updateDraw(); return finishDraw(); }
  if (TOOL.k === 'place') {
    const g = VIEW.ghost;
    if (g && g.ok && obbHas({ x: g.x, z: g.z, rot: g.rot, w: BT[g.t].fp[0], d: BT[g.t].fp[1] }, x, z, 0.2)) return doConfirm();
    setGhost(x, z);
  }
}
function roadLevel() { return S.era >= 3 ? 3 : S.era >= 2 ? 2 : 1; }
function railLevel() { return S.era >= 3 ? 2 : 1; }
function planLine() {
  const k = TOOL.k, r = snapR(), tr = TRACE.slice();
  const s0 = snapNet(tr[0][0], tr[0][1], k, r), s1 = tr.length > 1 ? snapNet(tr[tr.length - 1][0], tr[tr.length - 1][1], k, r) : null;
  if (s0) tr[0] = [s0.x, s0.z];
  if (s1) tr[tr.length - 1] = [s1.x, s1.z];
  VIEW.snaps = [[tr[0][0], tr[0][1], !!s0]];
  if (tr.length > 1) VIEW.snaps.push([tr[tr.length - 1][0], tr[tr.length - 1][1], !!s1]);
  let pts = null;
  if (tr.length > 1 && Math.hypot(tr[tr.length - 1][0] - tr[0][0], tr[tr.length - 1][1] - tr[0][1]) > 0.05) { blk(); pts = planTrace(tr, k, false, Math.max(0.12, cam.dist * 0.01)); }
  VIEW.path = pts || (tr.length > 1 ? tr : null); VIEW.pathOk = !!pts; VIEW.pathMode = k; VIEW.ver++;
  return { pts, s0, s1 };
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
/* the town that pays: the one whose roads reach the spot, or the nearest one */
function payTown(x, z) { const t = townAtPoint(x, z); return t >= 0 ? t : nearestTown(x, z, true); }
function prepareLine() {
  const k = TOOL.k, plan = planLine(), pts = plan.pts;
  if (!pts) { PEND = { kind: 'line', bad: TRACE.length < 2 ? 'Drag to draw a line.' : 'No way through: water, buildings or the border are in the way.' }; return showConfirm(); }
  const runs = newRuns(pts, k), km = runs.reduce((a, r) => a + r.km, 0);
  if (polyLen(pts) < 0.25) { PEND = { kind: 'line', bad: 'Drag a little further.' }; return showConfirm(); }
  if (!runs.length) { PEND = { kind: 'line', bad: `This runs along an existing ${k === 'road' ? 'road' : 'railway'}. Tap a stretch to upgrade it.` }; return showConfirm(); }
  const lv = k === 'road' ? roadLevel() : railLevel(), spec = (k === 'road' ? ROADT : RAILT)[lv], mk = Object.keys(spec.mat)[0];
  let w = 0, br = 0;
  runs.forEach(r => { w += waterKm(r.p); br += bridges(r.p); });
  const f = km + w * (BRIDGE - 1);
  PEND = { kind: 'line', mode: k, pts, runs, lv, km, br, cost: { lt: Math.round(spec.lt * f), [mk]: Math.ceil(spec.mat[mk] * f) }, ti: payTown(pts[0][0], pts[0][1]), name: spec.n };
  const hit = runs.map(r => lineHitsBuilding(r.p, spec.w / 2)).find(Boolean);
  if (hit) PEND.bad = `${bName(hit)} is in the way.`;
  showConfirm();
}
function prepareUpgrade(e) {
  const lv = e.k === 'road' ? roadLevel() : railLevel(), spec = (e.k === 'road' ? ROADT : RAILT)[lv], mk = Object.keys(spec.mat)[0], f = (e.L + waterKm(e.p) * (BRIDGE - 1)) * 0.6;
  PEND = { kind: 'up', e, lv, km: e.L, cost: { lt: Math.round(spec.lt * f), [mk]: Math.ceil(spec.mat[mk] * f) }, ti: payTown(e.p[0][0], e.p[0][1]), name: spec.n };
  VIEW.path = e.p; VIEW.pathOk = true; VIEW.ver++;
  showConfirm();
}
function prepareZone() {
  const lots = VIEW.zone || [];
  PEND = { kind: 'zone', lots, n: lots.length, cost: { lt: lots.length * ZONE_COST } };
  if (!lots.length) PEND.bad = 'Nothing here can be zoned. Paint along a street, on dry land inside Lithuania.';
  else if (lots.every(c => townAtPoint(c.x, c.z) < 0)) PEND.warn = 'These lots are more than 15 km by road from a town hall, so no town will build here.';
  VIEW.brush = null; VIEW.ver++;
  showConfirm();
}
function prepareBull() {
  const p = VIEW.bull || { b: [], lots: [], segs: [], road: 0, rail: 0 };
  PEND = { kind: 'bull', plan: p };
  if (!p.b.length && !p.lots.length && !p.segs.length) PEND.bad = 'Nothing to remove here.';
  VIEW.brush = null; VIEW.ver++;
  showConfirm();
}
function bullThing(b) {
  clearPreview();
  VIEW.bull = { b: [b], lots: [], segs: [], road: 0, rail: 0 }; VIEW.ver++;
  prepareBull();
}
function setGhost(x, z) {
  const t = TOOL.bt, T0 = BT[t], [w, d] = T0.fp, kind = t === 'station' ? 'rail' : 'road';
  let gx = x, gz = z, rot = TOOL.rot;
  const ne = t === 'hall' || t === 'hydro' ? null : nearestEdge(x, z, kind, Math.max(1.1, d + 0.7));
  if (ne) {
    const q = polyAt(ne.e.p, ne.e.c, ne.s);
    let nx = -q[3], nz = q[2];
    if ((x - q[0]) * nx + (z - q[1]) * nz < 0) { nx = -nx; nz = -nz; }
    const turn = Math.round(TOOL.rot / (Math.PI / 2)) % 2 !== 0, ext = turn ? w : d, off = espec(ne.e).w / 2 + 0.12 + ext / 2;
    gx = q[0] + nx * off; gz = q[1] + nz * off; rot = faceRot(-nx, -nz) + TOOL.rot;
  }
  const v = validPlace(t, gx, gz, rot), ti = payTown(gx, gz);
  VIEW.ghost = { t, x: gx, z: gz, rot, ok: v.ok }; VIEW.ver++;
  PEND = { kind: 'place', t, x: gx, z: gz, rot, ok: v.ok, why: v.why, bonus: v.bonus, ti, cost: T0.cost, fx: x, fz: z };
  showConfirm();
}
function rotateGhost() {
  if (!PEND || PEND.kind !== 'place') return;
  TOOL.rot = (TOOL.rot + Math.PI / 2) % (Math.PI * 2);
  setGhost(PEND.fx, PEND.fz);
}

function doConfirm() {
  const p = PEND;
  if (!p || p.bad) return;
  const town = p.ti >= 0 ? S.towns[p.ti] : null;
  if (p.kind === 'line' || p.kind === 'up') {
    if (!town) return toast('Found or unlock a town nearby first');
    const m = missing(p.cost, town);
    if (m) return toast(m);
    pay(p.cost, town);
    if (p.kind === 'up') { if (EDGES.has(p.e.id)) { p.e.lv = p.lv; netChanged(); } toast(`Upgraded ${num(p.km)} km to ${p.name.toLowerCase()}`); log(`${num(p.km)} km near ${town.n} upgraded to ${p.name.toLowerCase()}.`); }
    else { p.runs.forEach(r => afterLine(buildLine(p.mode, p.lv, r.p, 0.3))); toast(`${p.name} built: ${num(p.km)} km`); log(`${p.name} built from near ${town.n}, ${num(p.km)} km long.`); }
    clearPreview(); hint(HINTS[TOOL.k]);
  } else if (p.kind === 'zone') {
    if (S.funds < p.cost.lt) return toast(`Need ${fmt(p.cost.lt - S.funds)} more Lt`);
    S.funds -= p.cost.lt;
    let n = 0;
    p.lots.forEach(c => { if (lotOk(c, false)) { addLot(c.x, c.z, c.rot); n++; } });
    toast(`${n} lot${n === 1 ? '' : 's'} zoned for homes`); clearPreview(); NET.dirty = true;
  } else if (p.kind === 'bull') {
    const q = p.plan, nb = q.b.length;
    applyBull(q);
    if (VIEW.sel && VIEW.sel.kind === 'b' && !BMAP.get(VIEW.sel.id)) VIEW.sel = null;
    toast(`Removed ${nb} building${nb === 1 ? '' : 's'}${q.road + q.rail > 0.05 ? `, ${num(q.road + q.rail)} km of line` : ''}${q.lots.length ? `, ${q.lots.length} lots` : ''}`);
    clearPreview(); hint(HINTS.bull);
  } else if (p.kind === 'place') {
    const v = validPlace(p.t, p.x, p.z, p.rot);
    if (!v.ok) return toast(v.why);
    if (!town) return toast('No town nearby to pay for it');
    const m = missing(p.cost, town);
    if (m) return toast(m);
    pay(p.cost, town);
    if (p.t === 'hall') newTownAt(p.x, p.z, p.rot);
    else { addB(p.t, p.x, p.z, p.rot, 1); toast(`${BT[p.t].n} built`); log(`${BT[p.t].n} built near ${town.n}.`); }
    VIEW.ghost = null; PEND = null; VIEW.ver++; showConfirm();
  }
  analyze(); save(); renderPanel(true);
}
function newTownAt(x, z, rot) {
  const [lo, la] = xz2ll(x, z);
  let nm = null, bd = 1e9;
  PLACE_NAMES.forEach(([n, px, py]) => { if (S.towns.some(t => t.n === n)) return; const d = Math.hypot((px - lo) * 0.57, py - la); if (d < bd) { bd = d; nm = n; } });
  nm = nm && bd < 0.35 ? nm : 'New town ' + (S.towns.length + 1);
  const ti = foundTown(x, z, rot, nm);
  log(`${nm} is founded.`, 'good'); toast(`${nm} founded`);
  analyze(); selectTown(ti);
}

/* ---------- keys ---------- */
document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { if (PEND || TRACE.length || VIEW.ghost) clearPreview(); else setTool('inspect'); }
  else if (k === ' ') { e.preventDefault(); S.speed = S.speed ? 0 : 1; updateTop(); }
  else if (k === 'r') setTool('road'); else if (k === 't') setTool('rail'); else if (k === 'z') setTool('zone'); else if (k === 'x') setTool('bull'); else if (k === 'q') setTool('inspect');
  else if (k === 'b') toggleDrawer();
  else if (k === '+' || k === '=') zoomAt(cw / 2, ch / 2, 1.25); else if (k === '-') zoomAt(cw / 2, ch / 2, 0.8);
  else if (k === '[') rotateBy(-0.2); else if (k === ']') rotateBy(0.2);
  else if (k === 'pageup') tiltBy(0.1); else if (k === 'pagedown') tiltBy(-0.1);
  else if (k === 'n') northUp();
  else if (k === 'enter') doConfirm();
  else if (e.key.startsWith('Arrow')) {
    const d = 90, dx = k === 'arrowleft' ? d : k === 'arrowright' ? -d : 0, dy = k === 'arrowup' ? d : k === 'arrowdown' ? -d : 0;
    panBy(cw / 2, ch / 2, cw / 2 + dx, ch / 2 + dy);
  }
});
