'use strict';
/* Lietuva 1918 — low-poly 3D models built from boxes, roofs, cylinders and cones, with colours baked into the vertices.
   Units are km like the world. Models are written at twice the size they are drawn: geometry() scales every vertex by MS,
   and model() scales the extra data (smoke, fields, flags) the same way. Local +z is the front, the side that faces the road.
   Needs THREE (vendor/three.min.js). */
const MS = 0.5;

const LIN = {};
/* sRGB hex to the linear colour three.js works in */
function lc(hex) { let v = LIN[hex]; if (!v) { const c = new THREE.Color(hex); v = LIN[hex] = [c.r, c.g, c.b]; } return v; }

/* Mesh builder: collects flat-shaded triangles with vertex colours under a movable local transform. */
class MB {
  constructor() { this.p = []; this.c = []; this.t = [0, 0, 1, 0, 0]; this.st = []; }
  at(x, z, rot, y) { this.t = [x || 0, z || 0, Math.cos(rot || 0), Math.sin(rot || 0), y || 0]; return this; }
  push(x, z, rot, y) {
    this.st.push(this.t);
    const t = this.t, w = this.v(x, 0, z), a = Math.atan2(t[3], t[2]) + (rot || 0);
    this.t = [w[0], w[2], Math.cos(a), Math.sin(a), t[4] + (y || 0)];
    return this;
  }
  pop() { this.t = this.st.pop(); return this; }
  v(x, y, z) { const t = this.t; return [t[0] + x * t[2] + z * t[3], y + t[4], t[1] - x * t[3] + z * t[2]]; }
  tri(a, b, c, col) {
    const C = lc(col);
    for (const q of [a, b, c]) { const w = this.v(q[0], q[1], q[2]); this.p.push(w[0], w[1], w[2]); this.c.push(C[0], C[1], C[2]); }
    return this;
  }
  quad(a, b, c, d, col) { this.tri(a, b, c, col); return this.tri(a, c, d, col); }
  /* box from (x0, y0, z0) to (x1, y1, z1), without a bottom */
  box(x0, y0, z0, x1, y1, z1, side, top) {
    top = top || side;
    this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], top);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], side);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], side);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], side);
    return this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], side);
  }
  /* box centred on (x, z), w wide (x) and d deep (z) */
  cb(x, z, w, d, y0, y1, side, top) { return this.box(x - w / 2, y0, z - d / 2, x + w / 2, y1, z + d / 2, side, top); }
  /* gable roof over a w × d rectangle, eaves at y, ridge h higher, ridge along x (or along z) */
  gable(x, z, w, d, y, h, roof, end, alongZ, o) {
    if (alongZ) { this.push(x, z, Math.PI / 2); this.gable(0, 0, d, w, y, h, roof, end, false, o); return this.pop(); }
    o = o === undefined ? 0.014 : o;
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, y1 = y + h, yo = y - o * 0.7;
    this.quad([x0 - o, yo, z1 + o], [x1 + o, yo, z1 + o], [x1 + o, y1, z], [x0 - o, y1, z], roof);
    this.quad([x1 + o, yo, z0 - o], [x0 - o, yo, z0 - o], [x0 - o, y1, z], [x1 + o, y1, z], roof);
    this.tri([x1, y, z1], [x1, y, z0], [x1, y1, z], end);
    return this.tri([x0, y, z0], [x0, y, z1], [x0, y1, z], end);
  }
  /* pyramid (hip) roof */
  hip(x, z, w, d, y, h, col, o) {
    o = o || 0;
    const x0 = x - w / 2 - o, x1 = x + w / 2 + o, z0 = z - d / 2 - o, z1 = z + d / 2 + o, ap = [x, y + h, z];
    this.tri([x0, y, z1], [x1, y, z1], ap, col); this.tri([x1, y, z1], [x1, y, z0], ap, col);
    this.tri([x1, y, z0], [x0, y, z0], ap, col); return this.tri([x0, y, z0], [x0, y, z1], ap, col);
  }
  /* vertical cylinder with a top cap; r1 lets it taper */
  cyl(x, z, r, y0, y1, side, top, n, r1) {
    n = n || 10; r1 = r1 === undefined ? r : r1;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, s0 = Math.sin(a0), c0 = Math.cos(a0), s1 = Math.sin(a1), c1 = Math.cos(a1);
      this.quad([x + s0 * r, y0, z + c0 * r], [x + s1 * r, y0, z + c1 * r], [x + s1 * r1, y1, z + c1 * r1], [x + s0 * r1, y1, z + c0 * r1], side);
      if (top) this.tri([x, y1, z], [x + s0 * r1, y1, z + c0 * r1], [x + s1 * r1, y1, z + c1 * r1], top);
    }
    return this;
  }
  cone(x, z, r, y0, h, col, n) {
    n = n || 7;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      this.tri([x + Math.sin(a0) * r, y0, z + Math.cos(a0) * r], [x + Math.sin(a1) * r, y0, z + Math.cos(a1) * r], [x, y0 + h, z], col);
    }
    return this;
  }
  /* surface of revolution: prof = [[radius, y], ...] from bottom to top */
  lathe(x, z, prof, col, n) {
    n = n || 14;
    for (let k = 0; k + 1 < prof.length; k++) {
      const [ra, ya] = prof[k], [rb, yb] = prof[k + 1];
      for (let i = 0; i < n; i++) {
        const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, s0 = Math.sin(a0), c0 = Math.cos(a0), s1 = Math.sin(a1), c1 = Math.cos(a1);
        this.quad([x + s0 * ra, ya, z + c0 * ra], [x + s1 * ra, ya, z + c1 * ra], [x + s1 * rb, yb, z + c1 * rb], [x + s0 * rb, yb, z + c0 * rb], col);
      }
    }
    return this;
  }
  /* rough sphere (for tree crowns, cows) */
  blob(x, y, z, rx, ry, rz, col) {
    const g = new THREE.IcosahedronGeometry(1, 0), p = g.attributes.position, ix = g.index;
    const tri = (i, j, k) => this.tri([x + p.getX(i) * rx, y + p.getY(i) * ry, z + p.getZ(i) * rz], [x + p.getX(j) * rx, y + p.getY(j) * ry, z + p.getZ(j) * rz], [x + p.getX(k) * rx, y + p.getY(k) * ry, z + p.getZ(k) * rz], col);
    if (ix) for (let n = 0; n < ix.count; n += 3) tri(ix.getX(n), ix.getX(n + 1), ix.getX(n + 2));
    else for (let n = 0; n < p.count; n += 3) tri(n, n + 1, n + 2);
    g.dispose();
    return this;
  }
  /* flat quad on the ground (y), centred */
  pad(x, z, w, d, y, col) { return this.quad([x - w / 2, y, z - d / 2], [x - w / 2, y, z + d / 2], [x + w / 2, y, z + d / 2], [x + w / 2, y, z - d / 2], col); }
  /* windows along a wall from (x0, z0) to (x1, z1), facing outward to the right of that direction */
  wins(x0, z0, x1, z1, y0, y1, rows, cols, col, wf) {
    wf = wf || 0.45;
    const L = Math.hypot(x1 - x0, z1 - z0), dx = (x1 - x0) / L, dz = (z1 - z0) / L, nx = -dz * 0.003, nz = dx * 0.003, hh = (y1 - y0) / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const u0 = (c + 0.5 - wf / 2) / cols * L, u1 = (c + 0.5 + wf / 2) / cols * L, v0 = y0 + hh * (r + 0.28), v1 = y0 + hh * (r + 0.78);
      const p = u => [x0 + dx * u + nx, z0 + dz * u + nz];
      const a = p(u0), b = p(u1);
      this.quad([a[0], v0, a[1]], [b[0], v0, b[1]], [b[0], v1, b[1]], [a[0], v1, a[1]], col);
    }
    return this;
  }
  /* windows on all four walls of a centred box */
  boxWins(x, z, w, d, y0, y1, rows, cf, cs, col, wf) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    if (cf) { this.wins(x0, z1, x1, z1, y0, y1, rows, cf, col, wf); this.wins(x1, z0, x0, z0, y0, y1, rows, cf, col, wf); }
    if (cs) { this.wins(x1, z1, x1, z0, y0, y1, rows, cs, col, wf); this.wins(x0, z0, x0, z1, y0, y1, rows, cs, col, wf); }
    return this;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p.map(v => v * MS), 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

/* ---------- colours ---------- */
const MC = {
  white: '#ffffff', glass: '#3b4652', dglass: '#2c333b', door: '#4a3526', cream: '#e6dfcf', cream2: '#f2ede3', lime: '#d9d3c4',
  brick: '#b8573f', brick2: '#a24a35', redRoof: '#8f3a2a', greyRoof: '#5e5852', slate: '#4f555b', green: '#4f7a62', copper: '#5f8f76',
  wood: '#8a6446', wood2: '#6d4a31', plank: '#a07a52', hay: '#d8b55a', concrete: '#b9bab4', concrete2: '#a3a5a1', steel: '#8b949b',
  yellow: '#d2a62c', ochre: '#d9b26a', blueWall: '#6d889b', smokeStack: '#8d3f2e', soot: '#2b2b2b', panel: '#d8d4c8', panel2: '#c7c2b4',
  tarmac: '#8b8a85', dirt: '#a88d62'
};

/* ---------- buildings ---------- */
/* Each model: geo, h (height for picking), smoke [[x, y, z, kind]], fields [[x, z, w, d, crop]], flag [x, z, y] */
function M_hall(cap) {
  const m = new MB(), k = cap ? 1.25 : 1;
  m.pad(0, 0.05, 0.92, 0.82, 0.002, '#cbbf9f');
  m.cb(-0.04, -0.08, 0.3, 0.5, 0, 0.17 * k, MC.cream, MC.cream).gable(-0.04, -0.08, 0.3, 0.5, 0.17 * k, 0.13 * k, MC.redRoof, MC.cream2, true);
  m.wins(-0.19, -0.3, -0.19, 0.14, 0.03, 0.15 * k, 1, 4, MC.glass, 0.3);
  m.wins(0.11, 0.14, 0.11, -0.3, 0.03, 0.15 * k, 1, 4, MC.glass, 0.3);
  m.cb(-0.04, 0.24, 0.15, 0.15, 0, 0.42 * k, MC.cream2, MC.lime).hip(-0.04, 0.24, 0.15, 0.15, 0.42 * k, 0.24 * k, MC.green, 0.01);
  m.wins(-0.115, 0.316, 0.035, 0.316, 0.27 * k, 0.38 * k, 1, 1, MC.dglass, 0.5);
  m.quad([-0.07, 0, 0.3155], [-0.01, 0, 0.3155], [-0.01, 0.07, 0.3155], [-0.07, 0.07, 0.3155], MC.door);
  m.cyl(0.3, 0.3, 0.006, 0, 0.3, '#d9d4c7', null, 5);
  return { geo: m.geometry(), h: 0.66 * k, flag: [0.3, 0.3, 0.3] };
}
function M_farm() {
  const m = new MB();
  m.pad(-0.62, 0.55, 0.85, 0.7, 0.002, '#b7a37c');
  m.cb(-0.8, 0.62, 0.3, 0.2, 0, 0.09, '#b5523a').gable(-0.8, 0.62, 0.3, 0.2, 0.09, 0.08, MC.greyRoof, '#b5523a').boxWins(-0.8, 0.62, 0.3, 0.2, 0, 0.09, 1, 2, 1, MC.glass);
  m.cb(-0.45, 0.42, 0.42, 0.26, 0, 0.12, MC.wood).gable(-0.45, 0.42, 0.42, 0.26, 0.12, 0.1, '#6a5a4a', MC.wood);
  m.cone(-0.85, 0.3, 0.07, 0, 0.12, MC.hay).cone(-0.68, 0.24, 0.06, 0, 0.1, MC.hay);
  return { geo: m.geometry(), h: 0.25, fields: [[0.45, 0, 1.2, 1.9, 'grain'], [-0.55, -0.45, 1.05, 1.0, 'grain2']] };
}
function M_potato() {
  const m = new MB();
  m.pad(-0.65, 0.65, 0.6, 0.6, 0.002, '#b7a37c');
  m.cb(-0.7, 0.7, 0.32, 0.2, 0, 0.08, '#8a7560').gable(-0.7, 0.7, 0.32, 0.2, 0.08, 0.07, '#56504a', '#8a7560', true);
  for (let q = 0; q < 3; q++) m.cb(-0.48 + q * 0.07, 0.5, 0.05, 0.05, 0, 0.03, '#a07a48', '#b88d55');
  return { geo: m.geometry(), h: 0.18, fields: [[0.35, 0, 1.25, 1.9, 'potato'], [-0.6, -0.35, 0.75, 1.2, 'potato']] };
}
function M_flax() {
  const m = new MB();
  m.pad(-0.65, 0.65, 0.6, 0.6, 0.002, '#b7a37c');
  m.cb(-0.7, 0.68, 0.34, 0.22, 0, 0.09, '#9d8c74').gable(-0.7, 0.68, 0.34, 0.22, 0.09, 0.07, '#5b5550', '#9d8c74');
  return { geo: m.geometry(), h: 0.18, fields: [[0.35, 0, 1.25, 1.9, 'flax'], [-0.6, -0.35, 0.75, 1.2, 'flax']] };
}
function M_peat() {
  const m = new MB();
  m.cb(-0.65, 0.7, 0.3, 0.2, 0, 0.08, '#7f6a55').gable(-0.65, 0.7, 0.3, 0.2, 0.08, 0.06, '#3f3a36', '#7f6a55');
  for (let r = 0; r < 3; r++) for (let q = 0; q < 6; q++) m.cb(-0.35 + q * 0.12, 0.65 - r * 0.12, 0.07, 0.05, 0, 0.035, '#4a382b', '#5a4434');
  return { geo: m.geometry(), h: 0.15, fields: [[0.2, -0.3, 1.5, 1.3, 'peat']] };
}
function M_dairy() {
  const m = new MB();
  m.pad(-0.45, 0.45, 1.0, 0.75, 0.002, '#b7a37c');
  m.cb(-0.55, 0.45, 0.5, 0.28, 0, 0.11, '#a08060').gable(-0.55, 0.45, 0.5, 0.28, 0.11, 0.1, '#5e6a72', '#a08060').boxWins(-0.55, 0.45, 0.5, 0.28, 0.02, 0.09, 1, 4, 0, MC.dglass);
  m.cyl(-0.18, 0.5, 0.07, 0, 0.3, '#c9ccce', '#9aa0a5', 10).hip(-0.18, 0.5, 0.14, 0.14, 0.3, 0.05, '#9aa0a5');
  return { geo: m.geometry(), h: 0.36, fields: [[0.4, -0.1, 1.15, 1.55, 'pasture'], [-0.55, -0.45, 0.85, 0.85, 'grain']], cows: [[0.4, -0.1, 0.9, 1.3]] };
}
function M_pigs() {
  const m = new MB();
  m.cb(0, -0.1, 0.62, 0.3, 0, 0.08, '#9c7a60').gable(0, -0.1, 0.62, 0.3, 0.08, 0.07, '#7a4d3a', '#9c7a60');
  m.pad(0, 0.25, 0.7, 0.3, 0.003, '#8a6e4e');
  for (const [x0, z0, x1, z1] of [[-0.35, 0.1, 0.35, 0.1], [-0.35, 0.4, 0.35, 0.4], [-0.35, 0.1, -0.35, 0.4], [0.35, 0.1, 0.35, 0.4]])
    m.cb((x0 + x1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0) + 0.008, Math.abs(z1 - z0) + 0.008, 0, 0.025, MC.plank);
  return { geo: m.geometry(), h: 0.16, pigs: [[0, 0.25, 0.6, 0.22]] };
}
function M_fishery() {
  const m = new MB();
  m.cb(0, 0, 0.36, 0.26, 0, 0.09, MC.blueWall).gable(0, 0, 0.36, 0.26, 0.09, 0.07, '#3f4a52', MC.blueWall, true);
  m.cb(0.25, 0.15, 0.12, 0.2, 0, 0.02, MC.plank);
  for (let q = 0; q < 3; q++) m.cyl(-0.25, -0.12 + q * 0.09, 0.025, 0, 0.03, '#6b4a2e', '#7d5a3a', 6);
  return { geo: m.geometry(), h: 0.17, boat: 1 };
}
function M_forestry() {
  const m = new MB();
  m.cb(0.05, 0.1, 0.34, 0.24, 0, 0.09, '#7f5639').gable(0.05, 0.1, 0.34, 0.24, 0.09, 0.08, '#4b3a2c', '#7f5639');
  for (let r = 0; r < 2; r++) for (let q = 0; q < 4; q++) m.push(-0.25, -0.15 + q * 0.04, Math.PI / 2, 0.022 + r * 0.04).cyl(0, 0, 0.02, -0.12, 0.12, '#b07b4f', '#d2a271', 6).pop();
  m.cone(-0.3, 0.32, 0.06, 0, 0.2, '#2f5a35').cone(0.32, -0.3, 0.05, 0, 0.17, '#2f5a35');
  return { geo: m.geometry(), h: 0.2 };
}
function M_brick() {
  const m = new MB();
  m.cb(-0.08, 0, 0.62, 0.42, 0, 0.12, MC.brick2, '#7d4a3a').boxWins(-0.08, 0, 0.62, 0.42, 0.02, 0.1, 1, 5, 3, MC.dglass, 0.35);
  m.cyl(0.36, -0.2, 0.05, 0, 0.55, MC.smokeStack, MC.soot, 10, 0.04);
  for (let q = 0; q < 4; q++) m.cb(0.3 + (q % 2) * 0.12, 0.25 + Math.floor(q / 2) * 0.12, 0.09, 0.09, 0, 0.05, '#c96a4c', '#d9805f');
  return { geo: m.geometry(), h: 0.56, smoke: [[0.36, 0.56, -0.2, 'dark']] };
}
function M_warehouse() {
  const m = new MB();
  m.cb(0, -0.12, 1.3, 0.7, 0, 0.14, '#9c7a5a').gable(0, -0.12, 1.3, 0.7, 0.14, 0.12, '#6b6f72', '#9c7a5a');
  m.wins(-0.65, 0.23, 0.65, 0.23, 0.0, 0.11, 1, 4, '#4a3a2c', 0.5);
  const cols = ['#e7bd55', '#b08850', '#c48d5c', '#e07a55', '#86aef0', '#8fb7c9'];
  for (let q = 0; q < 6; q++) m.cb(-0.5 + q * 0.2, 0.43, 0.14, 0.12, 0, 0.04 + (q % 3) * 0.02, cols[q]);
  return { geo: m.geometry(), h: 0.27 };
}
function M_station() {
  const m = new MB();
  m.cb(0, -0.04, 0.8, 0.26, 0, 0.12, MC.ochre, '#c99f57').gable(0, -0.04, 0.8, 0.26, 0.12, 0.08, '#5c5a57', MC.ochre).boxWins(0, -0.04, 0.8, 0.26, 0.01, 0.11, 1, 6, 1, MC.glass);
  m.cb(0, -0.04, 0.12, 0.12, 0.12, 0.26, MC.ochre).hip(0, -0.04, 0.12, 0.12, 0.26, 0.08, '#3f5b4c', 0.01);
  m.cb(0, 0.36, 1.25, 0.14, 0, 0.025, '#a6a39c', '#c4c1b9');
  m.cb(0, 0.36, 0.7, 0.1, 0.1, 0.11, '#6b5a4a');
  for (const x of [-0.3, 0, 0.3]) m.cb(x, 0.36, 0.015, 0.015, 0.025, 0.1, '#6b5a4a');
  return { geo: m.geometry(), h: 0.34 };
}
function M_port() {
  const m = new MB();
  m.cb(-0.35, -0.3, 0.9, 0.5, 0, 0.16, '#c2654b').gable(-0.35, -0.3, 0.9, 0.5, 0.16, 0.1, '#6d5d52', '#c2654b');
  m.pad(0.2, 0.25, 1.6, 0.9, 0.003, '#9c9a94');
  [['#c0392b', 0.2, 0.15], ['#2e6f9e', 0.42, 0.15], ['#d9a441', 0.2, 0.35], ['#3d7a4a', 0.64, 0.15], ['#c0392b', 0.42, 0.35]].forEach(([c, x, z]) => m.cb(x, z, 0.18, 0.1, 0, 0.08, c));
  for (const x of [-0.3, 0.6]) {
    m.cb(x, 0.6, 0.08, 0.08, 0, 0.42, MC.yellow).push(x, 0.6, 0, 0.42).cb(0, 0.12, 0.05, 0.42, 0, 0.04, MC.yellow).pop();
  }
  return { geo: m.geometry(), h: 0.5, boat: 2 };
}
function M_school() {
  const m = new MB();
  m.pad(0, 0.25, 0.9, 0.25, 0.002, '#c9b98f');
  m.cb(0, -0.08, 0.72, 0.36, 0, 0.18, '#c2654b').gable(0, -0.08, 0.72, 0.36, 0.18, 0.1, '#5b5550', '#c2654b').boxWins(0, -0.08, 0.72, 0.36, 0.01, 0.17, 2, 6, 2, '#f3e6c4', 0.4);
  m.cyl(0.4, 0.3, 0.006, 0, 0.32, '#d9d4c7', null, 5);
  return { geo: m.geometry(), h: 0.3, flag: [0.4, 0.3, 0.32] };
}
function M_clinic() {
  const m = new MB();
  m.cb(0, -0.05, 0.62, 0.42, 0, 0.16, '#f2efe8', '#d9d6ce').boxWins(0, -0.05, 0.62, 0.42, 0.02, 0.15, 2, 5, 3, '#9fc3d6', 0.4);
  m.quad([-0.02, 0.06, 0.1615], [0.02, 0.06, 0.1615], [0.02, 0.15, 0.1615], [-0.02, 0.15, 0.1615], '#c1272d');
  m.quad([-0.045, 0.085, 0.1616], [0.045, 0.085, 0.1616], [0.045, 0.125, 0.1616], [-0.045, 0.125, 0.1616], '#c1272d');
  return { geo: m.geometry(), h: 0.17 };
}
function M_power() {
  const m = new MB();
  m.cb(-0.2, 0.05, 1.1, 1.0, 0, 0.3, '#a4a7ab', '#6d7074').boxWins(-0.2, 0.05, 1.1, 1.0, 0.04, 0.27, 2, 6, 5, '#d9d0a8', 0.35);
  m.cyl(0.6, -0.45, 0.07, 0, 0.95, '#b8b2a8', MC.soot, 10, 0.055).cyl(0.6, 0.0, 0.07, 0, 0.95, '#b8b2a8', MC.soot, 10, 0.055);
  m.cb(0.55, 0.6, 0.5, 0.35, 0, 0.08, '#4a3a2c', '#3e3026');
  return { geo: m.geometry(), h: 0.96, smoke: [[0.6, 0.96, -0.45, 'dark'], [0.6, 0.96, 0, 'dark']] };
}
function M_factory(wall) {
  return () => {
    const m = new MB();
    m.cb(0, -0.05, 1.6, 1.1, 0, 0.16, wall).boxWins(0, -0.05, 1.6, 1.1, 0.02, 0.13, 1, 8, 5, '#e8dcc0', 0.4);
    for (let q = 0; q < 5; q++) {
      const x0 = -0.8 + q * 0.32, x1 = x0 + 0.32, z0 = -0.6, z1 = 0.5;
      m.quad([x0, 0.16, z1], [x1, 0.26, z1], [x1, 0.26, z0], [x0, 0.16, z0], '#77736d');
      m.quad([x1, 0.16, z0], [x1, 0.16, z1], [x1, 0.26, z1], [x1, 0.26, z0], '#8fb3c4');
      m.tri([x0, 0.16, z1], [x1, 0.16, z1], [x1, 0.26, z1], wall); m.tri([x1, 0.16, z0], [x0, 0.16, z0], [x1, 0.26, z0], wall);
    }
    m.cyl(0.65, -0.45, 0.04, 0.16, 0.45, MC.smokeStack, MC.soot, 8);
    return { geo: m.geometry(), h: 0.45, smoke: [[0.65, 0.45, -0.45, 'grey']] };
  };
}
function M_hydro() {
  const m = new MB();
  m.cb(0, 0, 0.95, 0.22, -0.02, 0.2, MC.concrete2, MC.concrete);
  for (let q = 0; q < 4; q++) m.quad([-0.36 + q * 0.24, 0.02, 0.111], [-0.24 + q * 0.24, 0.02, 0.111], [-0.24 + q * 0.24, 0.17, 0.111], [-0.36 + q * 0.24, 0.17, 0.111], '#7ea6bf');
  m.cb(0, 0.42, 0.5, 0.36, 0, 0.14, '#a2a7aa', '#7b8084').boxWins(0, 0.42, 0.5, 0.36, 0.02, 0.12, 1, 4, 2, MC.glass);
  return { geo: m.geometry(), h: 0.22 };
}
function M_nuclear() {
  const m = new MB(), prof = [[0.38, 0], [0.31, 0.35], [0.24, 0.75], [0.25, 0.95], [0.28, 1.05]];
  m.lathe(-0.6, -0.6, prof, '#d9d6cf', 16).lathe(0.55, -0.7, prof, '#d9d6cf', 16);
  m.cb(-0.3, 0.6, 1.0, 0.8, 0, 0.32, '#d6d3cb', '#c4c1b9').cyl(-0.4, 0.6, 0.22, 0.32, 0.44, '#e9e6de', '#f4f2ec', 14);
  m.cb(0.75, 0.55, 0.8, 0.7, 0, 0.2, '#9da3a8', '#868c91').boxWins(0.75, 0.55, 0.8, 0.7, 0.03, 0.18, 1, 5, 4, '#5f7891');
  return { geo: m.geometry(), h: 1.05, smoke: [[-0.6, 1.05, -0.6, 'steam'], [0.55, 1.05, -0.7, 'steam']] };
}
function M_elec() {
  const m = new MB();
  m.cb(0, -0.05, 1.4, 1.1, 0, 0.26, '#86a6bd', '#5a6b78').boxWins(0, -0.05, 1.4, 1.1, 0.02, 0.25, 3, 1, 1, '#cfe3ef', 0.92);
  m.cb(-0.4, 0.62, 0.5, 0.2, 0, 0.1, '#d4dde3', '#9fb0bc');
  return { geo: m.geometry(), h: 0.27 };
}
/* border post: a customs house, a flagpole and a striped barrier across the road */
function M_customs() {
  const m = new MB();
  m.pad(0, 0.12, 0.8, 0.36, 0.002, '#b9ae8c');
  m.cb(-0.12, -0.12, 0.42, 0.26, 0, 0.12, '#d9cba6', '#b9ab88').gable(-0.12, -0.12, 0.42, 0.26, 0.12, 0.09, '#6b4f3c', '#d9cba6').boxWins(-0.12, -0.12, 0.42, 0.26, 0.02, 0.1, 1, 3, 1, MC.glass);
  m.cb(0.3, 0.2, 0.03, 0.03, 0, 0.08, '#5a4434').cb(0.07, 0.2, 0.44, 0.02, 0.07, 0.085, '#f3efe6');
  for (let q = 0; q < 4; q++) m.cb(-0.1 + q * 0.11, 0.2, 0.05, 0.021, 0.07, 0.086, '#c1272d');
  m.cyl(0.3, -0.25, 0.006, 0, 0.3, '#d9d4c7', null, 5);
  return { geo: m.geometry(), h: 0.3, flag: [0.3, -0.25, 0.3] };
}
/* village chapel: a wooden church with a bell tower, a roadside cross and a few graves */
function M_chapel() {
  const m = new MB(), wood = '#8f6b4c', wood2 = '#7a5a3f', roof = '#4f4a43';
  m.pad(0, 0, 0.9, 0.9, 0.002, '#a9a07c');
  m.cb(0, -0.08, 0.28, 0.5, 0, 0.15, wood, wood2).gable(0, -0.08, 0.28, 0.5, 0.15, 0.17, roof, wood2, true, 0.02);
  m.wins(0.14, 0.12, 0.14, -0.28, 0.05, 0.12, 1, 3, MC.dglass, 0.35).wins(-0.14, -0.28, -0.14, 0.12, 0.05, 0.12, 1, 3, MC.dglass, 0.35);
  m.cb(0, 0.24, 0.16, 0.16, 0, 0.36, wood, wood2).hip(0, 0.24, 0.16, 0.16, 0.36, 0.06, roof, 0.01);
  m.cb(0, 0.24, 0.09, 0.09, 0.42, 0.5, wood2).hip(0, 0.24, 0.09, 0.09, 0.5, 0.1, MC.copper, 0.005);
  m.cb(0, 0.24, 0.008, 0.008, 0.6, 0.68, '#e8dcb0').cb(0, 0.24, 0.04, 0.008, 0.645, 0.655, '#e8dcb0');
  m.quad([-0.035, 0, 0.3205], [0.035, 0, 0.3205], [0.035, 0.1, 0.3205], [-0.035, 0.1, 0.3205], MC.door);
  m.cb(0.32, 0.36, 0.014, 0.014, 0, 0.3, '#6d4a31').cb(0.32, 0.36, 0.12, 0.014, 0.21, 0.225, '#6d4a31').hip(0.32, 0.36, 0.05, 0.05, 0.3, 0.04, '#5a4434');
  for (const [x, z] of [[-0.33, -0.2], [-0.33, -0.06], [-0.24, -0.32], [0.3, -0.25]]) m.cb(x, z, 0.008, 0.008, 0, 0.06, '#d9d4c7').cb(x, z, 0.035, 0.008, 0.035, 0.045, '#d9d4c7');
  return { geo: m.geometry(), h: 0.68 };
}
/* ---------- landmarks (LANDMARKS in land.js), each fitting its own footprint: model units are twice the footprint in km ---------- */
const LMC = { whiteWall: '#ece6d8', whiteShade: '#d6cfbf', redBrick: '#a8492f', redBrick2: '#8e3c27', castleBrick: '#9c4a33', tinRoof: '#6f7a72', darkRoof: '#4a3f38',
  green: '#5f8f6e', grass: '#7f9d5a', gold: '#d8b54a', stone: '#b9b0a0', paving: '#c9bea2' };
/* a row of columns along x at z, from x0 to x1 */
function colonnade(m, x0, x1, z, n, r, h, col) { for (let i = 0; i < n; i++) m.cyl(x0 + (x1 - x0) * i / (n - 1), z, r, 0, h, col, col, 6); return m; }
/* a pediment: a low triangular gable facing +z over a front w wide at height y */
function pediment(m, x, z, w, d, y, h, col) { return m.gable(x, z, w, d, y, h, col, col, false, 0.004); }
function spire(m, x, z, r, y, h, col) { return m.cone(x, z, r, y, h, col, 8); }
/* Gediminas Tower: the steep castle hill, a path up, and the octagonal brick tower with a flag */
function LM_gedim() {
  const m = new MB();
  m.lathe(0, 0, [[0.26, 0], [0.24, 0.06], [0.19, 0.17], [0.13, 0.25], [0.1, 0.27], [0, 0.27]], LMC.grass, 16);
  m.cb(0.02, 0.02, 0.2, 0.1, 0.25, 0.28, LMC.stone);
  m.cyl(-0.02, -0.03, 0.055, 0.27, 0.5, LMC.castleBrick, LMC.redBrick2, 8);
  m.cyl(-0.02, -0.03, 0.06, 0.5, 0.53, '#8a3f2c', '#7b3827', 8);
  m.wins(-0.075, 0.025, 0.035, 0.025, 0.33, 0.48, 2, 2, MC.dglass, 0.3);
  m.cb(0.12, 0.13, 0.01, 0.01, 0.24, 0.28, LMC.stone);
  m.cyl(-0.02, -0.03, 0.004, 0.53, 0.66, '#d9d4c7', null, 4);
  return { geo: m.geometry(), h: 0.66, flag: [-0.02, -0.03, 0.66] };
}
/* Vilnius Cathedral: a classical temple with a portico of six columns, statues on the pediment, and the bell tower in front */
function LM_cath() {
  const m = new MB(), W = LMC.whiteWall, S2 = LMC.whiteShade;
  m.pad(0, 0.04, 0.28, 0.4, 0.002, LMC.paving);
  m.cb(0, -0.06, 0.24, 0.32, 0, 0.27, W, S2).gable(0, -0.06, 0.24, 0.32, 0.27, 0.08, LMC.tinRoof, W, true, 0.01);
  m.wins(0.12, 0.08, 0.12, -0.2, 0.06, 0.22, 1, 4, MC.dglass, 0.35).wins(-0.12, -0.2, -0.12, 0.08, 0.06, 0.22, 1, 4, MC.dglass, 0.35);
  m.cb(0, 0.14, 0.2, 0.08, 0, 0.025, S2);
  colonnade(m, -0.085, 0.085, 0.165, 6, 0.011, 0.25, W);
  m.cb(0, 0.135, 0.21, 0.07, 0.25, 0.28, W);
  pediment(m, 0, 0.135, 0.21, 0.07, 0.28, 0.06, W);
  for (const x of [-0.08, 0, 0.08]) m.cb(x, 0.155, 0.014, 0.014, x ? 0.29 : 0.34, (x ? 0.29 : 0.34) + 0.04, '#e9e2d0');
  /* the bell tower, to the south-west front */
  m.cb(0.115, 0.2, 0.06, 0.06, 0, 0.3, W, S2).cyl(0.115, 0.2, 0.026, 0.3, 0.48, W, S2, 8).cyl(0.115, 0.2, 0.02, 0.48, 0.6, W, S2, 8);
  spire(m, 0.115, 0.2, 0.021, 0.6, 0.08, LMC.tinRoof);
  return { geo: m.geometry(), h: 0.68 };
}
/* St Anne's: a narrow Gothic front of red brick with three slender towers */
function LM_onos() {
  const m = new MB(), B = LMC.redBrick, B2 = LMC.redBrick2;
  m.cb(0, -0.02, 0.1, 0.18, 0, 0.17, B, B2).gable(0, -0.02, 0.1, 0.18, 0.17, 0.09, LMC.darkRoof, B, true, 0.006);
  m.cb(0, 0.09, 0.12, 0.03, 0, 0.24, B, B2);
  pediment(m, 0, 0.09, 0.12, 0.03, 0.24, 0.06, B);
  for (const x of [-0.05, 0, 0.05]) { m.cb(x, 0.1, 0.022, 0.022, 0, x ? 0.3 : 0.34, B2); spire(m, x, 0.1, 0.014, x ? 0.3 : 0.34, 0.06, B2); }
  m.wins(-0.04, 0.106, 0.04, 0.106, 0.05, 0.2, 2, 2, MC.dglass, 0.25);
  return { geo: m.geometry(), h: 0.4 };
}
/* Vilnius Town Hall: a classical block with a portico of six Doric columns to the square and a tower behind */
function LM_vrot() {
  const m = new MB(), W = LMC.whiteWall, S2 = LMC.whiteShade;
  m.pad(0, 0.1, 0.4, 0.28, 0.002, LMC.paving);
  m.cb(0, -0.04, 0.34, 0.3, 0, 0.19, W, S2).hip(0, -0.04, 0.34, 0.3, 0.19, 0.06, LMC.tinRoof, 0.01);
  m.boxWins(0, -0.04, 0.34, 0.3, 0.03, 0.17, 2, 5, 4, MC.glass, 0.4);
  colonnade(m, -0.1, 0.1, 0.15, 6, 0.012, 0.17, W);
  m.cb(0, 0.135, 0.24, 0.06, 0.17, 0.2, W);
  pediment(m, 0, 0.135, 0.24, 0.06, 0.2, 0.05, W);
  m.cb(0, -0.15, 0.08, 0.08, 0.19, 0.31, W, S2).cyl(0, -0.15, 0.03, 0.31, 0.37, W, S2, 8);
  m.lathe(0, -0.15, [[0.034, 0.37], [0.03, 0.4], [0.015, 0.42], [0, 0.44]], LMC.tinRoof, 8);
  return { geo: m.geometry(), h: 0.44, flag: [0.16, 0.12, 0.25] };
}
/* Kaunas Town Hall, the White Swan: a white baroque body with a slender tower of 53 m */
function LM_krot() {
  const m = new MB(), W = '#f3f0e8', S2 = '#dcd6c8';
  m.pad(0, 0.06, 0.36, 0.44, 0.002, LMC.paving);
  m.cb(0, 0.05, 0.22, 0.3, 0, 0.17, W, S2).gable(0, 0.05, 0.22, 0.3, 0.17, 0.1, LMC.redBrick2, W, true, 0.01);
  m.boxWins(0, 0.05, 0.22, 0.3, 0.03, 0.16, 2, 3, 6, MC.glass, 0.35);
  m.cb(0, 0.205, 0.22, 0.012, 0.17, 0.24, W);
  m.cb(0, -0.15, 0.09, 0.09, 0, 0.4, W, S2).cb(0, -0.15, 0.07, 0.07, 0.4, 0.52, W, S2);
  m.wins(-0.035, -0.105, 0.035, -0.105, 0.42, 0.5, 1, 1, MC.dglass, 0.5);
  m.lathe(0, -0.15, [[0.05, 0.52], [0.045, 0.55], [0.022, 0.6], [0.012, 0.66], [0, 0.7]], '#5f7f73', 8);
  return { geo: m.geometry(), h: 0.7, flag: [0.13, 0.19, 0.24] };
}
/* Kaunas Castle: a round tower and a stretch of broken wall */
function LM_kpil() {
  const m = new MB(), B = LMC.castleBrick, B2 = '#7f3a28';
  m.pad(0, 0, 0.26, 0.26, 0.002, LMC.grass);
  m.cyl(-0.05, -0.04, 0.06, 0, 0.24, B, B2, 10).cone(-0.05, -0.04, 0.066, 0.24, 0.1, '#7a3a2a', 10);
  m.cb(0.04, -0.06, 0.16, 0.035, 0, 0.13, B, B2).cb(0.1, 0.02, 0.035, 0.14, 0, 0.09, B, B2).cb(0.1, 0.1, 0.035, 0.05, 0, 0.05, B, B2);
  return { geo: m.geometry(), h: 0.34 };
}
/* St Michael the Archangel: neo-Byzantine, a high central dome on a drum, four small domes, and a portico */
function LM_mykl() {
  const m = new MB(), W = '#ecebe6', S2 = '#d2d0c8', D = '#4f6e7d';
  m.pad(0, 0, 0.3, 0.42, 0.002, LMC.paving);
  m.cb(0, -0.02, 0.24, 0.3, 0, 0.22, W, S2).hip(0, -0.02, 0.24, 0.3, 0.22, 0.03, D, 0.01);
  m.boxWins(0, -0.02, 0.24, 0.3, 0.05, 0.19, 1, 3, 4, MC.dglass, 0.3);
  colonnade(m, -0.07, 0.07, 0.165, 4, 0.012, 0.2, W);
  m.cb(0, 0.15, 0.17, 0.05, 0.2, 0.23, W); pediment(m, 0, 0.15, 0.17, 0.05, 0.23, 0.05, W);
  m.cyl(0, -0.02, 0.07, 0.25, 0.38, W, S2, 12);
  m.lathe(0, -0.02, [[0.075, 0.38], [0.07, 0.42], [0.05, 0.47], [0.02, 0.5], [0, 0.51]], D, 12);
  m.cb(0, -0.02, 0.006, 0.006, 0.51, 0.58, LMC.gold).cb(0, -0.02, 0.03, 0.006, 0.55, 0.56, LMC.gold);
  for (const [x, z] of [[-0.09, -0.12], [0.09, -0.12], [-0.09, 0.08], [0.09, 0.08]]) { m.cyl(x, z, 0.03, 0.25, 0.31, W, S2, 8); m.lathe(x, z, [[0.033, 0.31], [0.025, 0.35], [0, 0.37]], D, 8); }
  return { geo: m.geometry(), h: 0.58 };
}
/* Klaipėda theatre: a classical front with a pediment, and the Ännchen fountain in the square before it */
function LM_ktea() {
  const m = new MB(), W = '#efe3c8', S2 = '#d8caa8';
  m.pad(0, 0.08, 0.28, 0.08, 0.002, LMC.paving);
  m.cb(0, -0.05, 0.26, 0.14, 0, 0.18, W, S2).hip(0, -0.05, 0.26, 0.14, 0.18, 0.05, LMC.redBrick2, 0.01);
  m.boxWins(0, -0.05, 0.26, 0.14, 0.03, 0.16, 2, 6, 3, MC.glass, 0.4);
  m.cb(0, 0.035, 0.12, 0.03, 0, 0.21, W, S2); pediment(m, 0, 0.035, 0.12, 0.03, 0.21, 0.05, W);
  m.cyl(0, 0.1, 0.025, 0, 0.012, LMC.stone, '#7ea6b5', 10).cyl(0, 0.1, 0.005, 0.012, 0.05, LMC.stone, null, 5).blob(0, 0.058, 0.1, 0.006, 0.008, 0.006, '#3f4a42');
  return { geo: m.geometry(), h: 0.26 };
}
/* Šiauliai Cathedral: a white Renaissance church whose front tower carries a spire of 70 m */
function LM_scat() {
  const m = new MB(), W = '#f2efe6', S2 = '#d8d3c6';
  m.cb(0, -0.05, 0.18, 0.3, 0, 0.2, W, S2).gable(0, -0.05, 0.18, 0.3, 0.2, 0.08, LMC.darkRoof, W, true, 0.01);
  m.wins(0.09, 0.08, 0.09, -0.18, 0.06, 0.17, 1, 4, MC.dglass, 0.3).wins(-0.09, -0.18, -0.09, 0.08, 0.06, 0.17, 1, 4, MC.dglass, 0.3);
  m.cb(0, 0.15, 0.1, 0.1, 0, 0.42, W, S2).cb(0, 0.15, 0.07, 0.07, 0.42, 0.5, W, S2);
  spire(m, 0, 0.15, 0.05, 0.5, 0.36, LMC.darkRoof);
  m.cb(0, 0.15, 0.004, 0.004, 0.86, 0.9, LMC.gold);
  return { geo: m.geometry(), h: 0.9 };
}
/* Hill of Crosses: a grassy hill fort covered in wooden crosses */
function LM_kryz() {
  const m = new MB(), rnd = rng(1863);
  m.lathe(0, 0, [[0.28, 0], [0.24, 0.05], [0.16, 0.1], [0, 0.11]], LMC.grass, 14);
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.24, x = Math.sin(a) * r, z = Math.cos(a) * r, y = 0.11 * Math.max(0, 1 - (r / 0.28) ** 2) - 0.005, h = 0.03 + rnd() * 0.05, c = rnd() < 0.7 ? '#6d4a31' : '#cfc7b6';
    m.cb(x, z, 0.005, 0.005, y, y + h, c).cb(x, z, 0.022, 0.005, y + h * 0.7, y + h * 0.7 + 0.005, c);
  }
  return { geo: m.geometry(), h: 0.2 };
}
/* Trakai Island Castle, in ruins: walls and towers of red brick around a court, and the keep, on its island */
function LM_trak() {
  const m = new MB(), B = LMC.castleBrick, B2 = '#7f3a28';
  m.lathe(0, 0, [[0.2, 0], [0.19, 0.012], [0, 0.014]], '#8d9a63', 14);
  m.cb(0, 0.05, 0.26, 0.02, 0.014, 0.13, B, B2).cb(-0.12, -0.02, 0.02, 0.16, 0.014, 0.1, B, B2).cb(0.12, -0.02, 0.02, 0.12, 0.014, 0.08, B, B2);
  for (const [x, z, h] of [[-0.12, 0.05, 0.19], [0.12, 0.05, 0.16], [-0.12, -0.1, 0.14]]) m.cyl(x, z, 0.028, 0.014, h, B, B2, 8);
  m.cb(0, -0.1, 0.16, 0.1, 0.014, 0.26, B, B2).cb(0.05, -0.1, 0.05, 0.05, 0.26, 0.34, B, B2);
  m.wins(-0.08, -0.05, 0.08, -0.05, 0.08, 0.24, 2, 3, '#3a2a22', 0.3);
  return { geo: m.geometry(), h: 0.34 };
}
/* Tiškevičius Palace in Palanga: a long two-storey front with a raised centre and terrace, in its park */
function LM_palg() {
  const m = new MB(), W = '#f1ece0', S2 = '#d9d2c2';
  m.pad(0, 0, 0.4, 0.28, 0.002, '#6f9a52');
  m.cb(0, -0.03, 0.36, 0.13, 0, 0.17, W, S2).hip(0, -0.03, 0.36, 0.13, 0.17, 0.05, LMC.tinRoof, 0.008);
  m.boxWins(0, -0.03, 0.36, 0.13, 0.025, 0.155, 2, 9, 3, MC.glass, 0.45);
  m.cb(0, 0.05, 0.1, 0.04, 0, 0.21, W, S2); pediment(m, 0, 0.05, 0.1, 0.04, 0.21, 0.04, W);
  m.cb(0, 0.1, 0.16, 0.06, 0, 0.02, LMC.stone);
  return { geo: m.geometry(), h: 0.25 };
}
/* Anykščiai: a neo-Gothic church of red brick with two spires at the front */
function LM_anyk() {
  const m = new MB(), B = '#b2563a', B2 = '#96462f';
  m.cb(0, -0.04, 0.16, 0.24, 0, 0.21, B, B2).gable(0, -0.04, 0.16, 0.24, 0.21, 0.1, LMC.darkRoof, B, true, 0.008);
  m.wins(0.08, 0.06, 0.08, -0.14, 0.05, 0.19, 1, 4, MC.dglass, 0.3).wins(-0.08, -0.14, -0.08, 0.06, 0.05, 0.19, 1, 4, MC.dglass, 0.3);
  for (const x of [-0.05, 0.05]) { m.cb(x, 0.11, 0.06, 0.06, 0, 0.5, B, B2); spire(m, x, 0.11, 0.035, 0.5, 0.45, LMC.darkRoof); }
  m.cb(0, 0.12, 0.04, 0.04, 0, 0.3, B, B2);
  return { geo: m.geometry(), h: 0.95 };
}
const MODEL_FN = { hall: () => M_hall(false), hallCap: () => M_hall(true), chapel: M_chapel, customs: M_customs, farm: M_farm, potato: M_potato, flax: M_flax, peat: M_peat, dairy: M_dairy, pigs: M_pigs,
  fishery: M_fishery, forestry: M_forestry, brick: M_brick, warehouse: M_warehouse, station: M_station, port: M_port, school: M_school, clinic: M_clinic,
  power: M_power, linen: M_factory('#cdb99a'), furniture: M_factory('#9b7652'), hydro: M_hydro, nuclear: M_nuclear, elec: M_elec,
  landmark: LM_kpil, lm_gedim: LM_gedim, lm_cath: LM_cath, lm_onos: LM_onos, lm_vrot: LM_vrot, lm_krot: LM_krot, lm_kpil: LM_kpil, lm_mykl: LM_mykl,
  lm_ktea: LM_ktea, lm_scat: LM_scat, lm_kryz: LM_kryz, lm_trak: LM_trak, lm_palg: LM_palg, lm_anyk: LM_anyk };
const MODELS = {};
/* A model with its extra data scaled to the drawn size. */
function model(key) {
  if (MODELS[key]) return MODELS[key];
  const M = MODEL_FN[key](), s = q => q.map(v => typeof v === 'number' ? v * MS : v);
  M.h *= MS;
  for (const k of ['smoke', 'fields', 'cows', 'pigs']) if (M[k]) M[k] = M[k].map(s);
  if (M.flag) M.flag = s(M.flag);
  return MODELS[key] = M;
}
function modelKey(b) {
  if (b.lm && MODEL_FN['lm_' + b.lm]) return 'lm_' + b.lm;
  if (b.t !== 'hall' || b.ti === undefined || !S.towns[b.ti]) return b.t;
  const t = S.towns[b.ti];
  return t.vil ? 'chapel' : t.capital ? 'hallCap' : 'hall';
}

/* ---------- houses on a lot: small instanced parts ---------- */
const HOUSE_PARTS = {};
function housePart(k) {
  if (HOUSE_PARTS[k]) return HOUSE_PARTS[k];
  const m = new MB();
  if (k === 'woodWalls') { m.cb(0, 0, 0.3, 0.23, 0, 0.1, MC.white).boxWins(0, 0, 0.3, 0.23, 0.014, 0.088, 1, 3, 2, '#3b3328', 0.38); m.quad([-0.025, 0, 0.1155], [0.03, 0, 0.1155], [0.03, 0.065, 0.1155], [-0.025, 0.065, 0.1155], '#5a4030'); }
  else if (k === 'woodRoof') { m.gable(0, 0, 0.3, 0.23, 0.1, 0.1, MC.white, MC.white, false, 0.02); m.cb(0.08, -0.04, 0.03, 0.03, 0.12, 0.22, '#b7a99a'); }
  else if (k === 'shed') { m.cb(0, 0, 0.14, 0.12, 0, 0.06, '#8a6a48').gable(0, 0, 0.14, 0.12, 0.06, 0.05, '#6d5038', '#8a6a48', true); }
  else if (k === 'far') { for (const [x, z, r] of [[-0.2, 0.2, 0], [0.2, 0.21, 0], [-0.19, -0.17, Math.PI / 2], [0.2, -0.18, 0]]) m.push(x, z, r).cb(0, 0, 0.3, 0.23, 0, 0.1, MC.white).gable(0, 0, 0.3, 0.23, 0.1, 0.1, '#8a6a58', MC.white, false, 0.02).pop(); }
  else if (k === 'farmFar') { m.push(-0.1, 0.2).cb(0, 0, 0.3, 0.23, 0, 0.1, MC.white).gable(0, 0, 0.3, 0.23, 0.1, 0.1, '#8a6a58', MC.white, false, 0.02).pop(); m.cb(0, -0.2, 0.34, 0.2, 0, 0.1, '#9a7a5e').gable(0, -0.2, 0.34, 0.2, 0.1, 0.12, '#9a8a62', '#9a7a5e', false, 0.02); }
  else if (k === 'barn') { m.cb(0, 0, 0.34, 0.2, 0, 0.1, '#7d5c40', '#6a4c34').gable(0, 0, 0.34, 0.2, 0.1, 0.12, '#9a8a62', '#7d5c40', false, 0.02); m.quad([-0.05, 0, 0.1005], [0.05, 0, 0.1005], [0.05, 0.08, 0.1005], [-0.05, 0.08, 0.1005], '#4a3526'); }
  else if (k === 'brick') { m.cb(0, 0, 0.36, 0.26, 0, 0.24, '#b05a42', '#7d6a5c').boxWins(0, 0, 0.36, 0.26, 0.01, 0.23, 3, 4, 3, '#f1deb2', 0.45).hip(0, 0, 0.36, 0.26, 0.24, 0.07, '#7d6a5c', 0.014); }
  else if (k === 'panel') { m.cb(0, 0, 0.62, 0.22, 0, 0.55, MC.panel, MC.panel2).boxWins(0, 0, 0.62, 0.22, 0.02, 0.54, 9, 7, 2, '#5f7891', 0.55).cb(0.2, 0, 0.08, 0.08, 0.55, 0.6, MC.panel2); }
  return HOUSE_PARTS[k] = m.geometry();
}
/* Positions of the parts on a house lot, in the lot's local frame at drawn size: [part, x, z, rot, tint index]. */
function lotLayout(b) { return lotLayout2(b).map(q => [q[0], q[1] * MS, q[2] * MS, q[3], q[4]]); }
function lotLayout2(b) {
  const h = q => hash2(b.id, q, 77), out = [];
  if (b.lv === 1 && b.f) {
    /* a farmstead: one or two cottages, a barn, a shed and trees */
    const two = h(1) < 0.45, spots = two ? [[-0.2, 0.2], [0.21, 0.17]] : [[-0.08 + (h(2) - 0.5) * 0.2, 0.2]];
    spots.forEach((s, q) => { const r = (h(30 + q) - 0.5) * 0.2, tint = Math.floor(h(40 + q) * 6); out.push(['woodWalls', s[0], s[1], r, tint], ['woodRoof', s[0], s[1], r, Math.floor(h(50 + q) * 4)]); });
    out.push(['barn', (h(3) - 0.5) * 0.16, -0.2, (h(4) - 0.5) * 0.12], ['shed', h(5) < 0.5 ? 0.3 : -0.3, -0.02, Math.PI / 2 + (h(6) - 0.5) * 0.3]);
    out.push(['tree', -0.36 + h(7) * 0.06, -0.38, h(8) * 6], ['tree', 0.34, -0.36 + h(9) * 0.08, h(11) * 6]);
    if (h(12) < 0.6) out.push(['tree', 0.36, 0.34, h(13) * 6]);
  } else if (b.lv === 1) {
    const spots = [[-0.2, 0.2, 0], [0.2, 0.21, 0], [-0.19, -0.17, Math.PI / 2], [0.2, -0.18, 0]], n = h(1) < 0.55 ? 4 : 3;
    for (let q = 0; q < n; q++) {
      const s = spots[q], x = s[0] + (h(10 + q) - 0.5) * 0.05, z = s[1] + (h(20 + q) - 0.5) * 0.04, r = s[2] + (h(30 + q) - 0.5) * 0.14;
      out.push(['woodWalls', x, z, r, Math.floor(h(40 + q) * 6)], ['woodRoof', x, z, r, Math.floor(h(50 + q) * 4)]);
    }
    if (n < 4) out.push(['shed', 0.22, -0.2, h(5) * 0.3]);
    out.push(['tree', -0.36 + h(6) * 0.08, -0.36 + h(7) * 0.06, h(8) * 6]);
    if (h(9) < 0.6) out.push(['tree', 0.02 + h(11) * 0.06, -0.38, h(12) * 6]);
  } else if (b.lv === 2) {
    out.push(['brick', -0.2, 0.15, 0], ['brick', 0.2, 0.15, 0], ['brick', 0.02, -0.2, Math.PI]);
  } else {
    out.push(['panel', 0, 0.18, 0], ['panel', 0, -0.2, Math.PI]);
  }
  return out;
}
const WALL_TINT = ['#c4955a', '#9fb07f', '#8aa7c2', '#b8735a', '#d8c08a', '#e2dccb'], ROOF_TINT = ['#7a3a2b', '#5d5048', '#8b4a2d', '#4f5d4a'];

/* ---------- trees ---------- */
const TREE_GEO = {};
function treeGeo(k) {
  if (TREE_GEO[k]) return TREE_GEO[k];
  const m = new MB();
  if (k === 'pine') { m.cb(0, 0, 0.012, 0.012, 0, 0.05, '#4e3626'); m.cone(0, 0, 0.06, 0.035, 0.13, '#2d5636', 7).cone(0, 0, 0.045, 0.1, 0.12, '#2f5a35', 7); }
  else if (k === 'spruce') { m.cb(0, 0, 0.012, 0.012, 0, 0.04, '#4e3626'); m.cone(0, 0, 0.05, 0.03, 0.11, '#26503a', 6).cone(0, 0, 0.04, 0.09, 0.1, '#29543c', 6).cone(0, 0, 0.028, 0.15, 0.09, '#2b583e', 6); }
  else if (k === 'crown') { m.blob(0, 0.13, 0, 0.07, 0.085, 0.07, '#ffffff'); }
  else if (k === 'trunk') { m.cb(0, 0, 0.012, 0.012, 0, 0.13, '#e9e4d8'); m.cone(0, 0, 0.04, 0.1, 0.1, '#8a8580', 4); }
  return TREE_GEO[k] = m.geometry();
}

/* ---------- people, animals and vehicles ---------- */
const AGENT_GEO = {};
function agentGeo(k) {
  if (AGENT_GEO[k]) return AGENT_GEO[k];
  const m = new MB();
  switch (k) {
    case 'body': m.cb(0, 0, 0.018, 0.012, 0.018, 0.045, MC.white); break;
    case 'legs': m.cb(0, 0, 0.016, 0.01, 0, 0.019, '#3a3530').cb(0, 0, 0.011, 0.011, 0.045, 0.057, '#f0c9a0'); break;
    case 'cart': m.cb(0, -0.02, 0.05, 0.09, 0.015, 0.04, '#7a5536', '#8e6644').cb(0, 0.065, 0.024, 0.06, 0.02, 0.045, '#5a3d28').cb(0, 0.095, 0.014, 0.022, 0.035, 0.06, '#5a3d28');
      for (const x of [-0.028, 0.028]) for (const z of [-0.05, 0.01]) m.cb(x, z, 0.006, 0.024, 0, 0.024, '#2b2420'); break;
    case 'load': m.cb(0, -0.02, 0.044, 0.08, 0.04, 0.058, MC.white); break;
    case 'truck': m.cb(0, 0.05, 0.05, 0.035, 0.012, 0.055, '#3d6b8a').cb(0, -0.025, 0.054, 0.1, 0.012, 0.035, '#5b5a55').wins(-0.025, 0.0675, 0.025, 0.0675, 0.03, 0.05, 1, 1, '#9fc3d6', 0.8);
      for (const x of [-0.028, 0.028]) for (const z of [-0.055, 0.045]) m.cb(x, z, 0.008, 0.02, 0, 0.02, '#1e1e1e'); break;
    case 'bus': m.cb(0, 0, 0.055, 0.15, 0.012, 0.06, '#d9b26a', '#f2e6c8').boxWins(0, 0, 0.055, 0.15, 0.03, 0.055, 1, 1, 5, '#3b4652', 0.7);
      for (const x of [-0.029, 0.029]) for (const z of [-0.05, 0.05]) m.cb(x, z, 0.008, 0.02, 0, 0.02, '#1e1e1e'); break;
    case 'steam': m.push(0, 0.01, Math.PI / 2, 0.042).cyl(0, 0, 0.026, -0.06, 0.06, '#26332d', '#1e2925', 8).pop();
      m.cb(0, -0.06, 0.06, 0.05, 0.015, 0.085, '#26332d', '#1e2925').cb(0, 0.0, 0.05, 0.16, 0, 0.018, '#2b2420').cyl(0, 0.05, 0.01, 0.06, 0.1, '#1e1e1e', '#111111', 6); break;
    case 'eloco': m.cb(0, 0, 0.055, 0.16, 0.012, 0.075, '#a8323a', '#e8dcc6').wins(-0.027, 0.0805, 0.027, 0.0805, 0.045, 0.07, 1, 1, '#3b4652', 0.8); break;
    case 'wagon': m.cb(0, 0, 0.052, 0.15, 0.012, 0.055, '#835a3d', '#6e4a32'); break;
    case 'coach': m.cb(0, 0, 0.052, 0.15, 0.012, 0.062, '#3b7059', '#c9c2b0').boxWins(0, 0, 0.052, 0.15, 0.03, 0.055, 1, 0, 6, '#e8dcb0', 0.6); break;
    case 'cow': m.blob(0, 0.03, 0, 0.018, 0.016, 0.032, MC.white).cb(0, 0.025, 0.012, 0.014, 0.03, 0.05, MC.white); break;
    case 'pig': m.blob(0, 0.018, 0, 0.016, 0.013, 0.026, '#f0b3b0'); break;
    case 'boat': m.cb(0, 0, 0.05, 0.14, 0, 0.022, '#6b4a2e', '#7d5a3a').cyl(0, 0, 0.004, 0.022, 0.13, '#5a4434', null, 4).quad([0, 0.03, 0.005], [0, 0.03, 0.06], [0, 0.125, 0.008], [0, 0.125, 0.008], '#f4efe2').quad([0, 0.03, 0.06], [0, 0.03, 0.005], [0, 0.125, 0.008], [0, 0.125, 0.008], '#f4efe2'); break;
    case 'ship': m.cb(0, 0, 0.11, 0.42, 0, 0.05, '#2b3640', '#384652').cb(0, -0.1, 0.08, 0.12, 0.05, 0.12, '#f4f1ea', '#c9c4b8').cyl(0, -0.1, 0.018, 0.12, 0.17, '#c0392b', MC.soot, 8); break;
    case 'flag': m.quad([0, 0.0, 0], [0, 0.0, 0.08], [0, 0.017, 0.08], [0, 0.017, 0], '#c1272d').quad([0, 0.017, 0], [0, 0.017, 0.08], [0, 0.034, 0.08], [0, 0.034, 0], '#0f7b4f')
      .quad([0, 0.034, 0], [0, 0.034, 0.08], [0, 0.051, 0.08], [0, 0.051, 0], '#fdb913');
      m.quad([0, 0.0, 0.08], [0, 0.0, 0], [0, 0.017, 0], [0, 0.017, 0.08], '#c1272d').quad([0, 0.017, 0.08], [0, 0.017, 0], [0, 0.034, 0], [0, 0.034, 0.08], '#0f7b4f')
      .quad([0, 0.034, 0.08], [0, 0.034, 0], [0, 0.051, 0], [0, 0.051, 0.08], '#fdb913'); break;
  }
  return AGENT_GEO[k] = m.geometry();
}
