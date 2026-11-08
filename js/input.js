'use strict';
/* Lietuva 1918 — input: camera gestures and keys. The tools themselves are in tools.js.
   One finger always moves the map; two fingers pinch to zoom, twist to turn, and slide up or down together to tilt.
   With a tool, a tap acts: it adds a point to a road or railway, zones a street, picks something to remove, or moves the building.
   Holding still for a moment and then dragging draws a line freehand or paints. Dragging the building or a point of a line moves it.
   Mouse: wheel zooms at the cursor, right-drag turns and tilts, the building follows the pointer and a click on it builds. */
const PTR = new Map();
let G = null, PTYPE = 'touch';
const HOLD_MS = 320;
function pos(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
/* ---------- pointer gestures ---------- */
cv.addEventListener('pointerdown', e => {
  try { cv.setPointerCapture(e.pointerId); } catch (x) { /* a pointer the browser did not start (tests, some pens) */ }
  const [x, y] = pos(e);
  PTYPE = e.pointerType || 'touch';
  PTR.set(e.pointerId, { x, y });
  if (PTR.size === 2) {
    if (G) { clearTimeout(G.timer); if (G.mode === 'draw' || G.mode === 'hold') finishDraw(); }
    const [a, b] = [...PTR.values()];
    G = { mode: 'two', pa: { ...a }, pb: { ...b }, acc: 0, tilt: null };
    return;
  }
  if (PTR.size > 2) return;
  if (e.button === 2 || e.button === 1) { G = { mode: 'orbit', px: x, py: y }; return; }
  if (TOOL.k === 'place' && PTYPE !== 'mouse') { const off = hitGhost(x, y); if (off) { G = { mode: 'ghost', off, px: x, py: y }; return; } }
  if (isLine()) { const i = hitHandle(x, y); if (i >= 0) { G = { mode: 'handle', i, px: x, py: y }; return; } }
  G = { mode: 'press', x0: x, y0: y, px: x, py: y };
  if (isLine() || isBrush()) G.timer = setTimeout(holdStart, HOLD_MS);
});
/* held still: from here the finger draws (lines) or paints (zone, remove) */
function holdStart() {
  if (!G || G.mode !== 'press' || PTR.size !== 1) return;
  const g = groundAt(G.x0, G.y0);
  if (!g) return;
  G.mode = 'hold';
  beginDraw(g[0], g[1]);
  try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* no vibration */ }
}
cv.addEventListener('pointermove', e => {
  const [x, y] = pos(e), p = PTR.get(e.pointerId);
  if (!p) { if (e.pointerType === 'mouse') hover(x, y); return; }
  p.x = x; p.y = y;
  if (!G) return;
  if (G.mode === 'two') { if (PTR.size === 2) twoFinger(); return; }
  if (G.mode === 'orbit') { rotateBy((x - G.px) * 0.006); tiltBy((y - G.py) * 0.004); G.px = x; G.py = y; return; }
  if (G.mode === 'press' && Math.hypot(x - G.x0, y - G.y0) > 8) { clearTimeout(G.timer); G.mode = 'pan'; }
  if (G.mode === 'hold' && Math.hypot(x - G.x0, y - G.y0) > 3) G.mode = 'draw';
  if (G.mode === 'pan') panBy(G.px, G.py, x, y);
  else if (G.mode === 'draw' || G.mode === 'ghost' || G.mode === 'handle') {
    const g = groundAt(x, y);
    if (g) {
      if (G.mode === 'draw') moveDraw(g[0], g[1]);
      else if (G.mode === 'ghost') setGhost(g[0] + G.off[0], g[1] + G.off[1]);
      else moveHandle(G.i, g[0], g[1]);
    }
    edgePan(x, y);
  }
  G.px = x; G.py = y;
});
/* dragging a building or a point near the edge of the view moves the map along */
function edgePan(x, y) {
  const m = 36, bottom = ch - VOFF.ty * 2, dx = x < m ? m - x : x > cw - m ? cw - m - x : 0, dy = y < m ? m - y : y > bottom - m ? bottom - m - y : 0;
  if (dx || dy) panBy(cw / 2, ch / 2, cw / 2 + dx * 0.25, ch / 2 + dy * 0.25);
}
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
  clearTimeout(G.timer);
  if (!cancel && PTR.size === 0) {
    if (G.mode === 'press') tap(x, y);
    else if (G.mode === 'hold' || G.mode === 'draw') finishDraw();
    else if (G.mode === 'handle') finishHandle();
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
/* the building's ghost under a screen point: the offset from the finger to its centre, or null */
function hitGhost(sx, sy) {
  const g = VIEW.ghost, p = groundAt(sx, sy);
  if (!g || !p) return null;
  const T0 = BT[g.t];
  if (!obbHas({ x: g.x, z: g.z, rot: g.rot, w: T0.fp[0], d: T0.fp[1] }, p[0], p[1], Math.max(0.05, kmPerPx() * 26))) return null;
  return [g.x - p[0], g.z - p[1]];
}
/* the point of the planned line nearest a screen point, within reach of a finger, or -1 */
function hitHandle(sx, sy) {
  let best = -1, bd = 30;
  (VIEW.snaps || []).forEach((q, i) => { const s = toScreen(q[0], 0, q[1]), d = Math.hypot(s[0] - sx, s[1] - sy); if (s[2] && d < bd) { bd = d; best = i; } });
  return best < TRACE.length ? best : -1;
}
function tap(sx, sy) {
  const g = groundAt(sx, sy);
  if (TOOL.k === 'inspect') {
    const b = pickBuilding(sx, sy);
    if (b) return b.t === 'hall' && b.town >= 0 ? selectTown(b.town) : selectBuilding(b);
    if (!g) return select(null);
    if (nearestEdge(g[0], g[1], 'road', snapR())) { const ti = townAtPoint(g[0], g[1]); if (ti >= 0) return selectTown(ti); }
    const nt = nearestTown(g[0], g[1]);
    if (nt >= 0 && Math.hypot(S.towns[nt].x - g[0], S.towns[nt].z - g[1]) < (S.towns[nt].R || 1) * 0.6 + 0.4) return selectTown(nt);
    return select(null);
  }
  if (!g) return;
  if (TOOL.k === 'bull') { const b = pickBuilding(sx, sy); if (b && b.t !== 'hall' && b.t !== 'landmark') return bullThing(b); }
  tapTool(g[0], g[1]);
}

/* ---------- keys ---------- */
document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { if (PEND || TRACE.length || ZONES.length) clearPreview(); else if (TOOL.k !== 'inspect') setTool('inspect'); else if (VIEW.sel) select(null); }
  else if (k === 'backspace') { e.preventDefault(); undoStep(); }
  else if (k === ' ') { e.preventDefault(); setSpeed(S.speed ? 0 : VIEW.spd || 1); }
  else if (k === '1' || k === '2' || k === '3') setSpeed(+k);
  else if (k === 'r') startTool('road'); else if (k === 't') startTool('rail'); else if (k === 'z') startTool('zone'); else if (k === 'x') startTool('bull'); else if (k === 'q') setTool('inspect');
  else if (k === 'b') navTo('build');
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
