'use strict';
/* Lietuva 1918 — 2D geometry on the ground plane. Points are [x, z] in km (x east, z south).
   Pure functions, no DOM. Used by the world model, the tools and the renderer. */

/* ---------- points and segments ---------- */
/* Closest point on segment AB to P. Returns [t, x, z, distance]. */
function segClosest(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
  let t = L > 0 ? ((px - ax) * dx + (pz - az) * dz) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = ax + dx * t, z = az + dz * t;
  return [t, x, z, Math.hypot(px - x, pz - z)];
}
/* Intersection of segments AB and CD. Returns [t, u] (positions along AB and CD, 0..1) or null. */
function segX(ax, az, bx, bz, cx, cz, dx, dz) {
  const rx = bx - ax, rz = bz - az, sx = dx - cx, sz = dz - cz, den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-12) return null;
  const qx = cx - ax, qz = cz - az, t = (qx * sz - qz * sx) / den, u = (qx * rz - qz * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [t, u] : null;
}

/* ---------- polylines ---------- */
function polyCum(p) {
  const c = new Float64Array(p.length);
  for (let i = 1; i < p.length; i++) c[i] = c[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return c;
}
function polyLen(p) {
  let L = 0;
  for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return L;
}
/* Point and unit tangent at arc length s. Returns [x, z, tx, tz, segment index]. */
function polyAt(p, c, s) {
  const n = p.length;
  if (n < 2) return [p[0][0], p[0][1], 1, 0, 1];
  const L = c[n - 1];
  if (s < 0) s = 0; else if (s > L) s = L;
  let lo = 1, hi = n - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (c[m] < s) lo = m + 1; else hi = m; }
  const a = p[lo - 1], b = p[lo], sl = (c[lo] - c[lo - 1]) || 1e-9, f = (s - c[lo - 1]) / sl;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, (b[0] - a[0]) / sl, (b[1] - a[1]) / sl, lo];
}
/* Closest point on a polyline. Returns {d, s, x, z, i}. */
function polyClosest(p, c, px, pz) {
  let best = 1e18, bs = 0, bx = p[0][0], bz = p[0][1], bi = 1;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], r = segClosest(px, pz, a[0], a[1], b[0], b[1]);
    if (r[3] < best) { best = r[3]; bs = c[i - 1] + (c[i] - c[i - 1]) * r[0]; bx = r[1]; bz = r[2]; bi = i; }
  }
  return { d: best, s: bs, x: bx, z: bz, i: bi };
}
function dedupe(p, eps) {
  eps = eps || 1e-4;
  const out = [p[0]];
  for (let i = 1; i < p.length; i++) {
    const l = out[out.length - 1];
    if (Math.abs(p[i][0] - l[0]) > eps || Math.abs(p[i][1] - l[1]) > eps) out.push(p[i]);
  }
  if (out.length === 1 && p.length > 1) out.push(p[p.length - 1]);
  return out;
}
/* Part of a polyline between arc lengths s0 and s1 (s0 < s1). */
function polySlice(p, c, s0, s1) {
  const a = polyAt(p, c, s0), b = polyAt(p, c, s1), out = [[a[0], a[1]]];
  for (let i = a[4]; i < b[4]; i++) out.push(p[i]);
  out.push([b[0], b[1]]);
  return dedupe(out);
}
/* Points every `step` km, keeping both ends exact. */
function resample(p, step) {
  const c = polyCum(p), L = c[c.length - 1], n = Math.max(1, Math.round(L / step)), out = [];
  for (let k = 0; k <= n; k++) { const q = polyAt(p, c, L * k / n); out.push([q[0], q[1]]); }
  return out;
}
/* Corner cutting, ends fixed. */
function chaikin(p, iters) {
  for (let k = 0; k < iters; k++) {
    if (p.length < 3) return p;
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      if (i > 0) q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      if (i < p.length - 2) q.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  return p;
}
/* Ramer–Douglas–Peucker simplification. */
function rdp(p, eps) {
  if (p.length < 3) return p.slice();
  const keep = new Uint8Array(p.length), st = [[0, p.length - 1]];
  keep[0] = keep[p.length - 1] = 1;
  while (st.length) {
    const [a, b] = st.pop();
    let md = 0, mi = -1;
    for (let i = a + 1; i < b; i++) {
      const d = segClosest(p[i][0], p[i][1], p[a][0], p[a][1], p[b][0], p[b][1])[3];
      if (d > md) { md = d; mi = i; }
    }
    if (md > eps && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return p.filter((q, i) => keep[i]);
}
/* Offset a polyline sideways by `off` km (positive = to the right of travel, with z pointing south). */
function polyOffset(p, off) {
  const out = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1];
    const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    out.push([p[i][0] - tz * off, p[i][1] + tx * off]);
  }
  return out;
}

/* ---------- oriented boxes {x, z, rot, w, d} ----------
   rot turns the box about the vertical axis like three.js rotation.y. Local +x (width) is the right side,
   local +z (depth) is the front. World direction of the front: (sin rot, cos rot). */
function obbAxes(o) { const c = Math.cos(o.rot), s = Math.sin(o.rot); return [c, -s, s, c]; }
function obbCorners(o, pad) {
  pad = pad || 0;
  const [rx, rz, fx, fz] = obbAxes(o), hw = o.w / 2 + pad, hd = o.d / 2 + pad;
  return [[o.x - rx * hw - fx * hd, o.z - rz * hw - fz * hd], [o.x + rx * hw - fx * hd, o.z + rz * hw - fz * hd],
    [o.x + rx * hw + fx * hd, o.z + rz * hw + fz * hd], [o.x - rx * hw + fx * hd, o.z - rz * hw + fz * hd]];
}
function toLocal(o, px, pz) {
  const [rx, rz, fx, fz] = obbAxes(o), dx = px - o.x, dz = pz - o.z;
  return [dx * rx + dz * rz, dx * fx + dz * fz];
}
function toWorld(o, lx, lz) {
  const [rx, rz, fx, fz] = obbAxes(o);
  return [o.x + rx * lx + fx * lz, o.z + rz * lx + fz * lz];
}
function obbHas(o, px, pz, pad) {
  const l = toLocal(o, px, pz); pad = pad || 0;
  return Math.abs(l[0]) <= o.w / 2 + pad && Math.abs(l[1]) <= o.d / 2 + pad;
}
function obbBounds(o, pad) {
  const c = obbCorners(o, pad || 0);
  let x0 = 1e18, x1 = -1e18, z0 = 1e18, z1 = -1e18;
  for (const p of c) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1]; }
  return [x0, z0, x1, z1];
}
/* Separating-axis test. pad grows both boxes. */
function obbOverlap(A, B, pad) {
  pad = pad || 0;
  const ca = obbCorners(A, pad / 2), cb = obbCorners(B, pad / 2), aa = obbAxes(A), ab = obbAxes(B);
  for (const [vx, vz] of [[aa[0], aa[1]], [aa[2], aa[3]], [ab[0], ab[1]], [ab[2], ab[3]]]) {
    let a0 = 1e18, a1 = -1e18, b0 = 1e18, b1 = -1e18;
    for (const p of ca) { const d = p[0] * vx + p[1] * vz; if (d < a0) a0 = d; if (d > a1) a1 = d; }
    for (const p of cb) { const d = p[0] * vx + p[1] * vz; if (d < b0) b0 = d; if (d > b1) b1 = d; }
    if (a1 < b0 || b1 < a0) return false;
  }
  return true;
}
function ptRectDist(x, z, hw, hd) {
  const dx = Math.max(Math.abs(x) - hw, 0), dz = Math.max(Math.abs(z) - hd, 0);
  return Math.hypot(dx, dz);
}
function segRectHit(a, b, hw, hd) {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dz = b[1] - a[1], p = [-dx, dx, -dz, dz], q = [a[0] + hw, hw - a[0], a[1] + hd, hd - a[1]];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; continue; }
    const r = q[i] / p[i];
    if (p[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}
/* Distance from segment AB to the box, 0 when they touch. */
function obbSegDist(o, ax, az, bx, bz) {
  const a = toLocal(o, ax, az), b = toLocal(o, bx, bz), hw = o.w / 2, hd = o.d / 2;
  if (segRectHit(a, b, hw, hd)) return 0;
  let m = Math.min(ptRectDist(a[0], a[1], hw, hd), ptRectDist(b[0], b[1], hw, hd));
  for (const [cx, cz] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]) {
    const d = segClosest(cx, cz, a[0], a[1], b[0], b[1])[3];
    if (d < m) m = d;
  }
  return m;
}
function obbPolyDist(o, p) {
  let m = 1e18;
  for (let i = 1; i < p.length; i++) {
    const d = obbSegDist(o, p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]);
    if (d < m) { m = d; if (m === 0) break; }
  }
  return m;
}
/* Angle that turns a box so its front faces direction (dx, dz). */
function faceRot(dx, dz) { return Math.atan2(dx, dz); }

/* ---------- spatial hash: items inserted by bounding box ---------- */
class SpatialHash {
  constructor(cell) { this.c = cell; this.m = new Map(); }
  clear() { this.m.clear(); }
  add(item, x0, z0, x1, z1) {
    const c = this.c;
    for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++)
      for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) {
        const k = i * 100003 + j;
        let a = this.m.get(k);
        if (!a) this.m.set(k, a = []);
        a.push(item);
      }
  }
  query(x0, z0, x1, z1, fn) {
    const c = this.c, seen = new Set();
    for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++)
      for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) {
        const a = this.m.get(i * 100003 + j);
        if (a) for (const it of a) if (!seen.has(it)) { seen.add(it); fn(it); }
      }
  }
}
