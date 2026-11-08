'use strict';
/* Lietuva 1918 — terrain. A hidden raster of CELL-km cells holds terrain type and features (forest, soil, bog, clay)
   for the rules and the path planner. The player sees smooth 3D ground drawn from it; nothing snaps to it. */
const TT = new Uint8Array(GW * GH), TF = new Uint8Array(GW * GH), TF0 = new Uint8Array(GW * GH);
/* BLK marks what is built on each cell for the path planner: 1 building, 2 road, 4 railway, 8 zoned lot. */
const BLK = new Uint8Array(GW * GH);
let terrainHook = null; // set by the renderer: called with a list of changed cells (forest cleared or deposits added)
let exactBlock = null;  // set by the world: true when a straight line would pass through a building
const RIVW = [0.62, 0.48, 0.36, 0.34, 0.28, 0.32, 0.28, 0.28, 0.28]; // river widths in km, same order as RIV

function ll2xz(lon, lat) { return [(lon - LON0) * KMX, (LAT1 - lat) * KMY]; }
function xz2ll(x, z) { return [x / KMX + LON0, LAT1 - z / KMY]; }
function cellAt(x, z) {
  const i = Math.floor(x / CELL), j = Math.floor(z / CELL);
  return i >= 0 && j >= 0 && i < GW && j < GH ? j * GW + i : -1;
}
const cellX = k => (k % GW + 0.5) * CELL, cellZ = k => (((k / GW) | 0) + 0.5) * CELL;
const isWaterT = t => t === T_SEA || t === T_LAGOON || t === T_LAKE || t === T_RIVER;
function terrAt(x, z) { const k = cellAt(x, z); return k < 0 ? T_FOREIGN : TT[k]; }
function flagsAt(x, z) { const k = cellAt(x, z); return k < 0 ? 0 : TF[k]; }
function polyXZ(ll) { return ll.map(p => ll2xz(p[0], p[1])); }

/* Scanline fill: calls fn(k) for every cell whose centre lies inside the polygon. */
function fillPoly(pxz, fn) {
  let z0 = 1e9, z1 = -1e9;
  for (const p of pxz) { if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1]; }
  const j0 = Math.max(0, Math.floor(z0 / CELL)), j1 = Math.min(GH - 1, Math.floor(z1 / CELL)), xs = [];
  for (let j = j0; j <= j1; j++) {
    const z = (j + 0.5) * CELL; xs.length = 0;
    for (let a = 0, b = pxz.length - 1; a < pxz.length; b = a++) {
      const pa = pxz[a], pb = pxz[b];
      if ((pa[1] > z) !== (pb[1] > z)) xs.push(pa[0] + (z - pa[1]) * (pb[0] - pa[0]) / (pb[1] - pa[1]));
    }
    xs.sort((p, q) => p - q);
    for (let q = 0; q + 1 < xs.length; q += 2) {
      const i0 = Math.max(0, Math.ceil(xs[q] / CELL - 0.5)), i1 = Math.min(GW - 1, Math.floor(xs[q + 1] / CELL - 0.5));
      for (let i = i0; i <= i1; i++) fn(j * GW + i);
    }
  }
}
/* Cells within r km of a polyline. r is at least 0.36 so a stamped line has no diagonal gaps. */
function stampLine(pxz, r, fn) {
  r = Math.max(r, 0.36);
  for (let s = 1; s < pxz.length; s++) {
    const a = pxz[s - 1], b = pxz[s];
    const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - r) / CELL)), i1 = Math.min(GW - 1, Math.floor((Math.max(a[0], b[0]) + r) / CELL));
    const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - r) / CELL)), j1 = Math.min(GH - 1, Math.floor((Math.max(a[1], b[1]) + r) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (segClosest((i + 0.5) * CELL, (j + 0.5) * CELL, a[0], a[1], b[0], b[1])[3] <= r) fn(j * GW + i);
    }
  }
}
function forDisk(x, z, r, fn) {
  const i0 = Math.max(0, Math.floor((x - r) / CELL)), i1 = Math.min(GW - 1, Math.floor((x + r) / CELL));
  const j0 = Math.max(0, Math.floor((z - r) / CELL)), j1 = Math.min(GH - 1, Math.floor((z + r) / CELL));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const d = Math.hypot((i + 0.5) * CELL - x, (j + 0.5) * CELL - z);
    if (d <= r) fn(j * GW + i, d);
  }
}
/* Cells whose centres lie inside an oriented box grown by pad (always at least the centre cell). */
function forCellsIn(o, pad, fn) {
  const bb = obbBounds(o, pad);
  const i0 = Math.max(0, Math.floor(bb[0] / CELL)), i1 = Math.min(GW - 1, Math.floor(bb[2] / CELL));
  const j0 = Math.max(0, Math.floor(bb[1] / CELL)), j1 = Math.min(GH - 1, Math.floor(bb[3] / CELL));
  let n = 0;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (obbHas(o, (i + 0.5) * CELL, (j + 0.5) * CELL, pad)) { fn(j * GW + i); n++; }
  }
  if (!n) { const k = cellAt(o.x, o.z); if (k >= 0) fn(k); }
}

let TERRAIN_READY = false;
/* The terrain is the same in every game, so it is generated once; later calls only reset the features. */
function genTerrain() {
  if (TERRAIN_READY) { TF.set(TF0); return; }
  TT.fill(T_FOREIGN); TF.fill(0);
  fillPoly(polyXZ(LT), k => { TT[k] = T_LAND; TF[k] |= F_LT; });
  fillPoly(polyXZ(KR), k => { if (TF[k] & F_LT) TF[k] |= F_KR; });
  fillPoly(polyXZ(SEA), k => { TT[k] = T_SEA; TF[k] = 0; });
  fillPoly(polyXZ(LAG), k => { TT[k] = T_LAGOON; TF[k] = 0; });
  stampLine(polyXZ(SPIT), 0.5, k => {
    if (TT[k] !== T_SEA && TT[k] !== T_LAGOON) return;
    if (xz2ll(cellX(k), cellZ(k))[1] > 55.28) { TT[k] = T_SAND; TF[k] = F_LT | F_KR; } else { TT[k] = T_FOREIGN; TF[k] = 0; }
  });
  /* sandy shore along the open sea */
  const shoreRows = Math.min(GH, Math.ceil((LAT1 - 55.74) * KMY / CELL));
  for (let k = 0; k < shoreRows * GW; k++) {
    if (TT[k] !== T_LAND) continue;
    const i = k % GW, j = (k / GW) | 0;
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      const ii = i + di, jj = j + dj;
      if (ii >= 0 && jj >= 0 && ii < GW && jj < GH && TT[jj * GW + ii] === T_SEA) { TT[k] = T_SAND; dj = di = 9; }
    }
  }
  RIV.forEach((r, n) => stampLine(polyXZ(r.p), (RIVW[n] || 0.3) / 2, k => {
    if (TT[k] === T_LAND || TT[k] === T_FOREIGN || TT[k] === T_SAND) TT[k] = T_RIVER;
  }));
  LAKES.forEach(([lo, la, rx, ry, rot]) => {
    const c = ll2xz(lo, la), cs = Math.cos(-rot * Math.PI / 180), sn = Math.sin(-rot * Math.PI / 180);
    forDisk(c[0], c[1], Math.max(rx, ry) + 0.5, k => {
      if (TT[k] !== T_LAND && TT[k] !== T_RIVER) return;
      const x = cellX(k) - c[0], y = cellZ(k) - c[1], xr = x * cs - y * sn, yr = x * sn + y * cs;
      if ((xr / rx) ** 2 + (yr / ry) ** 2 <= 1) TT[k] = T_LAKE;
    });
  });
  /* value noise sampled on coarse lattices and interpolated: much faster than per cell */
  const lattice = (step, per, seed) => {
    const nw = Math.ceil(MAPU / step) + 2, nh = Math.ceil(MAPV / step) + 2, g = new Float32Array(nw * nh);
    for (let j = 0; j < nh; j++) for (let i = 0; i < nw; i++) g[j * nw + i] = vnoise(i * step / per, j * step / per, seed);
    return (x, z) => {
      const fx = x / step, fz = z / step, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, o = j * nw + i;
      const a = g[o], b = g[o + 1], c = g[o + nw], d = g[o + nw + 1];
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  };
  const N1 = lattice(2, 24, 3), N2 = lattice(1.5, 9, 5), N3 = lattice(1, 2.4, 8);
  /* soils: fertile plains, the flax belt (centres converted to km once) */
  const toKm = (list, f) => list.map(([lo, la, r]) => { const c = ll2xz(lo, la); return [c[0], c[1], r * f]; });
  const fields = toKm(FIELDS, 85), flaxr = toKm(FLAXR, 1), fors = toKm(FOR, 95), bogs = toKm(BOGS, 1), clays = toKm(CLAYS, 1);
  /* distance to the nearest centre, with wobbly edges so soils and bogs are not circles */
  const wobble = (x, z) => 0.62 + N2(x, z) * 0.55 + N3(x, z) * 0.2;
  const near = (x, z, list, wob) => {
    let best = -1;
    for (const [cx, cz, r0] of list) {
      const r = r0 * 1.25, dx = x - cx, dz = z - cz;
      if (dx > r || dx < -r || dz > r || dz < -r) continue;
      const d = Math.hypot(dx, dz) / wob;
      if (d < r0) best = Math.max(best, 1 - d / r0);
    }
    return best;
  };
  const land = [];
  for (let k = 0; k < GW * GH; k++) {
    if (!(TF[k] & F_LT)) continue;
    const x = cellX(k), z = cellZ(k), wb = wobble(x, z);
    if (near(x, z, fields, wb) > 0) TF[k] |= F_FERTILE;
    if (near(x, z, flaxr, wb) > 0) TF[k] |= F_FLAX;
    if (TT[k] === T_LAND) land.push(k);
  }
  /* forests: the wettest, sandiest third of the land, clustered where the real big forests are */
  const score = new Float32Array(land.length);
  for (let n = 0; n < land.length; n++) {
    const k = land[n], x = cellX(k), z = cellZ(k);
    let sc = N1(x, z) * 0.6 + N2(x, z) * 0.3 + N3(x, z) * 0.12;
    for (const [cx, cz, r] of fors) { const dx = x - cx, dz = z - cz; if (dx > r || dx < -r || dz > r || dz < -r) continue; const d = Math.hypot(dx, dz); if (d < r) sc += 0.38 * (1 - d / r); }
    if (TF[k] & F_FERTILE) sc -= 0.22;
    score[n] = sc;
  }
  const sorted = score.slice().sort(), thr = sorted[Math.floor(sorted.length * 0.66)];
  for (let n = 0; n < land.length; n++) if (score[n] >= thr) TF[land[n]] |= F_FOREST;
  for (const k of land) {
    const x = cellX(k), z = cellZ(k), wb = wobble(x, z);
    if (near(x, z, bogs, wb) > 0) { TF[k] |= F_BOG; TF[k] &= ~F_FOREST; }
    if (near(x, z, clays, wb) > 0) TF[k] |= F_CLAY;
  }
  TF0.set(TF); TERRAIN_READY = true;
}
/* Saved games store only the cells whose features changed since generation: pairs of [cells skipped, new value]. */
function tfDiff() {
  const out = []; let skip = 0;
  for (let k = 0; k < TF.length; k++) { if (TF[k] !== TF0[k]) { out.push(skip, TF[k]); skip = 0; } else skip++; }
  return out;
}
function tfApply(d) {
  if (!d) return;
  let k = -1;
  for (let n = 0; n + 1 < d.length; n += 2) { k += d[n] + 1; if (k < TF.length) TF[k] = d[n + 1]; }
}
function setFlags(cells, set, clear) {
  const ch = [];
  for (const k of cells) { const v = (TF[k] | set) & ~clear; if (v !== TF[k]) { TF[k] = v; ch.push(k); } }
  if (ch.length && terrainHook) terrainHook(ch);
  return ch.length;
}

/* ---------- path planning on the hidden raster ---------- */
const PL = { g: new Float32Array(GW * GH), par: new Int32Array(GW * GH), st: new Uint32Array(GW * GH), stamp: 1 };
/* Cost of entering a cell; Infinity where a road or track cannot go. gen = world generation (ignores the 1923 lock). */
function planCost(k, mode, gen) {
  const t = TT[k], f = TF[k];
  if (!(f & F_LT) || t === T_SEA || t === T_LAGOON || t === T_LAKE || t === T_FOREIGN) return Infinity;
  if (!gen && (f & F_KR) && S.kr) return Infinity;
  const b = BLK[k];
  if (b & (mode === 'road' ? 2 : 4)) return t === T_RIVER ? 0.5 : 0.35; // reuse a line of the same kind (it has its bridges)
  if (b & 1) return Infinity;
  let c = 1;
  if (t === T_RIVER) c = BRIDGE * 1.4;
  if (f & F_FOREST) c += 0.3;
  if (f & F_BOG) c += 0.8;
  if (b & 8) c += 1.2;
  if (b & (mode === 'road' ? 4 : 2)) c += 0.4;
  return c;
}
/* Straight line check. Returns {ok, water} where water is km over rivers. */
function lineCheck(ax, az, bx, bz, mode, gen) {
  const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 0.2));
  let water = 0;
  for (let q = 0; q <= n; q++) {
    const k = cellAt(ax + (bx - ax) * q / n, az + (bz - az) * q / n);
    if (k < 0) return { ok: false, water };
    const c = planCost(k, mode, gen);
    if (c === Infinity) return { ok: false, water, at: k };
    if (TT[k] === T_RIVER && q > 0) water += L / n;
  }
  if (exactBlock && exactBlock(ax, az, bx, bz)) return { ok: false, water };
  return { ok: true, water };
}
const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
/* A* between two points. Returns a simplified polyline [[x, z], ...] or null. */
function planPath(ax, az, bx, bz, mode, gen) {
  const a = cellAt(ax, az), b = cellAt(bx, bz);
  if (a < 0 || b < 0) return null;
  if (a === b) return [[ax, az], [bx, bz]];
  const ai = a % GW, aj = (a / GW) | 0, bi = b % GW, bj = (b / GW) | 0, span = Math.max(Math.abs(ai - bi), Math.abs(aj - bj));
  const m = 24 + Math.round(span * 0.35);
  const wi0 = Math.max(0, Math.min(ai, bi) - m), wi1 = Math.min(GW - 1, Math.max(ai, bi) + m);
  const wj0 = Math.max(0, Math.min(aj, bj) - m), wj1 = Math.min(GH - 1, Math.max(aj, bj) + m);
  const st = ++PL.stamp, G = PL.g, P = PL.par, ST = PL.st, hk = [], hv = [];
  const push = (k, f) => { hk.push(f); hv.push(k); let n = hk.length - 1; while (n > 0) { const p = (n - 1) >> 1; if (hk[p] <= hk[n]) break; [hk[p], hk[n]] = [hk[n], hk[p]]; [hv[p], hv[n]] = [hv[n], hv[p]]; n = p; } };
  const pop = () => { const v = hv[0], lk = hk.pop(), lv = hv.pop(); if (hk.length) { hk[0] = lk; hv[0] = lv; let n = 0; for (;;) { const l = 2 * n + 1, r = l + 1; let mm = n; if (l < hk.length && hk[l] < hk[mm]) mm = l; if (r < hk.length && hk[r] < hk[mm]) mm = r; if (mm === n) break; [hk[mm], hk[n]] = [hk[n], hk[mm]]; [hv[mm], hv[n]] = [hv[n], hv[mm]]; n = mm; } } return v; };
  const h = (i, j) => { const dx = Math.abs(i - bi), dy = Math.abs(j - bj); return (Math.max(dx, dy) + 0.414 * Math.min(dx, dy)) * 1.25; };
  const cost = k => (k === a || k === b) ? Math.min(1, planCost(k, mode, gen)) || 1 : planCost(k, mode, gen);
  ST[a] = st; G[a] = 0; P[a] = -1; push(a, h(ai, aj));
  let exp = 0;
  while (hk.length && exp < 400000) {
    const k = pop(); exp++;
    if (k === b) break;
    const i = k % GW, j = (k / GW) | 0, g = G[k];
    for (const [di, dj] of D8) {
      const ni = i + di, nj = j + dj;
      if (ni < wi0 || nj < wj0 || ni > wi1 || nj > wj1) continue;
      const nk = nj * GW + ni;
      let c = cost(nk);
      if (c === Infinity) continue;
      if (di && dj) { if (cost(j * GW + ni) === Infinity || cost(nj * GW + i) === Infinity) continue; c *= 1.414; }
      const ng = g + c;
      if (ST[nk] === st && G[nk] <= ng) continue;
      ST[nk] = st; G[nk] = ng; P[nk] = k; push(nk, ng + h(ni, nj));
    }
  }
  if (ST[b] !== st) return null;
  const cells = [];
  for (let k = b; k >= 0; k = P[k]) cells.push(k);
  cells.reverse();
  const pts = cells.map(k => [cellX(k), cellZ(k)]);
  pts[0] = [ax, az]; pts[pts.length - 1] = [bx, bz];
  return straighten(pts, mode, gen);
}
/* Replace runs of cells by straight lines where the straight line is clear and crosses no more water. */
function straighten(pts, mode, gen) {
  const out = [pts[0]];
  const water = (i, j) => { let w = 0; for (let q = i + 1; q <= j; q++) if (TT[cellAt(pts[q][0], pts[q][1])] === T_RIVER) w += Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]); return w; };
  let i = 0;
  while (i < pts.length - 1) {
    let best = i + 1;
    for (const step of [200, 120, 72, 44, 26, 15, 8, 4, 2]) {
      const j = Math.min(pts.length - 1, i + step);
      if (j <= i + 1 || j <= best) continue;
      const lc = lineCheck(pts[i][0], pts[i][1], pts[j][0], pts[j][1], mode, gen);
      if (lc.ok && lc.water <= water(i, j) + 0.3) { best = j; break; }
    }
    out.push(pts[best]); i = best;
  }
  return out;
}
/* Smooth corners and keep the result only if it is still clear. */
function smoothLine(pts, mode, gen, iters) {
  if (pts.length < 3) return pts;
  const s = chaikin(pts, iters || 2);
  for (let q = 1; q < s.length; q++) if (!lineCheck(s[q - 1][0], s[q - 1][1], s[q][0], s[q][1], mode, gen).ok) return pts;
  return s;
}
/* Plan along a finger trace: straight where clear, around obstacles where not, smoothed. */
function planTrace(trace, mode, gen, eps) {
  const wp = rdp(dedupe(trace, 0.05), eps || 0.3);
  if (wp.length < 2) return null;
  let out = [wp[0]];
  for (let q = 1; q < wp.length; q++) {
    const a = out[out.length - 1], b = wp[q];
    if (lineCheck(a[0], a[1], b[0], b[1], mode, gen).ok) { out.push(b); continue; }
    const p = planPath(a[0], a[1], b[0], b[1], mode, gen);
    if (!p) return null;
    out = out.concat(p.slice(1));
  }
  return smoothLine(dedupe(out, 0.02), mode, gen, 2);
}
/* Length in km of a polyline that runs over rivers (bridges). */
function waterKm(pts) {
  let w = 0;
  for (let q = 1; q < pts.length; q++) {
    const a = pts[q - 1], b = pts[q], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.1));
    for (let s = 0; s < n; s++) { const t = TT[cellAt(a[0] + (b[0] - a[0]) * (s + 0.5) / n, a[1] + (b[1] - a[1]) * (s + 0.5) / n)]; if (t === T_RIVER) w += L / n; }
  }
  return w;
}
