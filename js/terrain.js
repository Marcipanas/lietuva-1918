'use strict';
/* Lietuva 1918 — terrain. A hidden raster of CELL-km cells holds terrain type and features (forest, soil, bog, clay, limestone)
   for the rules and the path planner. The player sees smooth 3D ground drawn from it; nothing snaps to it. */
const TT = new Uint8Array(GW * GH), TF = new Uint8Array(GW * GH), TF0 = new Uint8Array(GW * GH);
/* CTY: the country of each cell today, 0 for water. CTY_ID gives the codes; CTY_KEY the key in S.own for who held it then.
   Today's Poland is split on the old border of East Prussia: the Suwałki region (pl) and Masuria (ep, German until 1945). */
const CTY = new Uint8Array(GW * GH), CTY_ID = { lt: 1, lv: 2, by: 3, pl: 4, ru: 5, ep: 6 }, CTY_KEY = [null, 'lt', 'lv', 'by', 'pl', 'ru', 'ep'];
/* RGN: the part of today's Lithuania a cell lies in (RGN_KEY): 0 land that stayed Lithuanian, 1 the Klaipėda Region,
   2 the Palanga strip, 3 and 4 the Vilnius region (what came back in October 1939, and in November 1940).
   Who holds each part, and each neighbour's land (CTY_KEY), is S.own: history hands them over. */
const RGN = new Uint8Array(GW * GH), RGN_KEY = ['', 'kr', 'pal', 'vr', 'vr2'];
/* The holder of a cell: 'lt', a neighbour ('lv', 'pl', 'by', 'ru'), Germany 'de', the Allies 'al', the Red Army 'ra', or '' for open water. */
function ownerOf(k) { const c = CTY[k]; return c === 1 ? (RGN[k] ? S.own[RGN_KEY[RGN[k]]] : 'lt') : c > 1 ? S.own[CTY_KEY[c]] : ''; }
/* A cell of today's Lithuania that someone else holds now: nothing can be built there. */
function heldOff(k) { return !!RGN[k] && S.own[RGN_KEY[RGN[k]]] !== 'lt'; }
function heldOffAt(x, z) { const k = cellAt(x, z); return k >= 0 && heldOff(k); }
function rgnAt(x, z) { const k = cellAt(x, z); return k < 0 ? '' : RGN_KEY[RGN[k]]; }
/* BLK marks what is built on each cell for the path planner: 1 building, 2 road, 4 railway, 8 zoned lot. */
const BLK = new Uint8Array(GW * GH);
let terrainHook = null; // set by the renderer: called with a list of changed cells (forest cleared or deposits added)
let exactBlock = null;  // set by the world: true when a straight line would pass through a building

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
/* Scanline fill of a polygon with holes ({o, h} in lon/lat): cells inside the outer ring and outside every hole. */
function fillGeoPoly(w, fn) {
  const holes = new Set();
  w.h.forEach(h => fillPoly(polyXZ(h), k => holes.add(k)));
  fillPoly(polyXZ(w.o), k => { if (!holes.has(k)) fn(k); });
}
/* Cells within r km of a polyline. Below 0.36 km a stamped line can have diagonal gaps. */
function stampLine(pxz, r, fn) {
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
  /* the start map carries the raster it was made on: unpacking it takes milliseconds, building it a few seconds on a phone */
  if (typeof WORLD1918 !== 'undefined' && WORLD1918 && WORLD1918.ras && WORLD1918.ras.n === GW * GH) { rasUnpack(WORLD1918.ras); TF0.set(TF); TERRAIN_READY = true; return; }
  /* water first, then each country's land; cells left over from simplified outlines take a neighbour's value */
  const UNK = 255;
  TT.fill(UNK); TF.fill(0); CTY.fill(0);
  GEO_SEA.forEach(w => fillGeoPoly(w, k => { TT[k] = T_SEA; }));
  GEO_LAG.forEach(w => fillGeoPoly(w, k => { TT[k] = T_LAGOON; }));
  for (const c of ['lv', 'by', 'pl', 'ru']) GEO_C[c].forEach(r => fillPoly(polyXZ(r), k => { TT[k] = T_FOREIGN; CTY[k] = CTY_ID[c]; TF[k] = 0; }));
  GEO_EP.forEach(w => fillGeoPoly(w, k => { if (CTY[k] === CTY_ID.pl) CTY[k] = CTY_ID.ep; }));
  GEO_LT.forEach(r => fillPoly(polyXZ(r), k => { TT[k] = T_LAND; CTY[k] = 1; TF[k] = F_LT; }));
  for (let left = 1, pass = 0; left && pass < 8; pass++) {
    left = 0;
    for (let k = 0; k < GW * GH; k++) {
      if (TT[k] !== UNK) continue;
      const i = k % GW, j = (k / GW) | 0;
      const n = [i > 0 ? k - 1 : -1, i < GW - 1 ? k + 1 : -1, j > 0 ? k - GW : -1, j < GH - 1 ? k + GW : -1].find(q => q >= 0 && TT[q] !== UNK);
      if (n === undefined) { left++; continue; }
      TT[k] = TT[n]; CTY[k] = CTY[n]; TF[k] = TF[n] & F_LT;
    }
  }
  for (let k = 0; k < GW * GH; k++) if (TT[k] === UNK) TT[k] = T_FOREIGN;
  GEO_KR.forEach(r => fillPoly(polyXZ(r), k => { if (TF[k] & F_LT) TF[k] |= F_KR; }));
  [[GEO_KRW, 1], [GEO_PAL, 2], [GEO_V39, 3], [GEO_V40, 4]].forEach(([g, c]) => g.forEach(w => fillGeoPoly(w, k => { if ((TF[k] & F_LT) && !RGN[k]) RGN[k] = c; })));
  /* sandy shore along the open sea, and the dunes of the Curonian Spit */
  for (let k = 0; k < GW * GH; k++) {
    if (TT[k] !== T_LAND) continue;
    const i = k % GW, j = (k / GW) | 0;
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      const ii = i + di, jj = j + dj;
      if (ii >= 0 && jj >= 0 && ii < GW && jj < GH && TT[jj * GW + ii] === T_SEA) { TT[k] = T_SAND; dj = di = 9; }
    }
  }
  /* rivers wide enough for the raster: cells within half their width (at least 0.26 km) of the line */
  GEO_RIV.forEach(r => { if (!r.thin) stampLine(polyXZ(r.p), Math.max(0.26, r.w / 2), k => { if (TT[k] === T_LAND || TT[k] === T_FOREIGN || TT[k] === T_SAND) TT[k] = T_RIVER; }); });
  GEO_LAKES.forEach(r => fillPoly(polyXZ(r), k => { if (TT[k] === T_LAND || TT[k] === T_RIVER || TT[k] === T_FOREIGN) TT[k] = T_LAKE; }));
  LAKES.forEach(([lo, la, rx, ry, rot]) => {
    const c = ll2xz(lo, la), cs = Math.cos(-rot * Math.PI / 180), sn = Math.sin(-rot * Math.PI / 180);
    forDisk(c[0], c[1], Math.max(rx, ry) + 0.5, k => {
      if (TT[k] !== T_LAND && TT[k] !== T_RIVER && TT[k] !== T_FOREIGN) return;
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
  /* the coarse patterns follow the geography (scaled with the map); the finest one is the ragged edge seen near a town */
  const N1 = lattice(2 * MAPK, 24 * MAPK, 3), N2 = lattice(1.5 * MAPK, 9 * MAPK, 5), N3 = lattice(1, 2.4, 8);
  /* soils: fertile plains, the flax belt (centres converted to km once) */
  const toKm = (list, f) => list.map(([lo, la, r]) => { const c = ll2xz(lo, la); return [c[0], c[1], r * f * MAPK]; });
  const fields = toKm(FIELDS, 85), flaxr = toKm(FLAXR, 1), fors = toKm(FOR, 95), bogs = toKm(BOGS, 1), clays = toKm(CLAYS, 1), limes = toKm(LIMES, 1);
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
    if (near(x, z, limes, wb) > 0) TF[k] |= F_LIME;
  }
  TF0.set(TF); TERRAIN_READY = true;
}
/* The raster is coarse (0.5 km cells), so buildings and lots also test the drawn rivers and lakes exactly. */
let WATER_IX = null;
function waterIndex() {
  if (WATER_IX) return WATER_IX;
  const riv = new SpatialHash(2), lakes = [];
  GEO_RIV.forEach(r => { const p = polyXZ(r.p); for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i], h = r.w / 2; riv.add([a, b, h], Math.min(a[0], b[0]) - h, Math.min(a[1], b[1]) - h, Math.max(a[0], b[0]) + h, Math.max(a[1], b[1]) + h); } });
  GEO_LAKES.forEach(r => { const p = polyXZ(r); let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const q of p) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); } lakes.push({ p, bb: [x0, z0, x1, z1] }); });
  LAKES.forEach(([lo, la, rx, ry, rot]) => {
    const c = ll2xz(lo, la), a = rot * Math.PI / 180, p = [];
    for (let q = 0; q < 28; q++) { const t = q / 28 * Math.PI * 2, x = Math.cos(t) * rx, y = Math.sin(t) * ry; p.push([c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)]); }
    const r = Math.max(rx, ry); lakes.push({ p, bb: [c[0] - r, c[1] - r, c[0] + r, c[1] + r] });
  });
  return (WATER_IX = { riv, lakes });
}
/* Does a box (grown by pad) touch a drawn river or lake? */
function waterHit(o, pad) {
  const W = waterIndex(), bb = obbBounds(o, pad + 0.4);
  let hit = false;
  W.riv.query(bb[0], bb[1], bb[2], bb[3], s => { if (!hit && obbSegDist(o, s[0][0], s[0][1], s[1][0], s[1][1]) < s[2] + pad) hit = true; });
  if (hit) return true;
  const pts = obbCorners(o, pad).concat([[o.x, o.z]]);
  for (const L of W.lakes) {
    if (L.bb[0] > bb[2] || L.bb[2] < bb[0] || L.bb[1] > bb[3] || L.bb[3] < bb[1]) continue;
    if (pts.some(q => pip(L.p, q[0], q[1]))) return true;
  }
  return false;
}
/* ---------- the raster, packed for the start map ----------
   tools/build-world.js stores the generated raster in WORLD1918.ras: a palette of cell values (terrain, country, region and
   features as generated), then runs of [palette index, run length as a 7-bit varint], in base64. */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function rasPack() {
  const runs = [], pal = [], ix = new Map(), bytes = [];
  let cur = -1, len = 0;
  for (let k = 0; k < GW * GH; k++) {
    const v = TT[k] | CTY[k] << 4 | RGN[k] << 8 | TF0[k] << 12;
    if (v === cur) { len++; continue; }
    if (len) runs.push(cur, len);
    cur = v; len = 1;
  }
  runs.push(cur, len);
  for (let i = 0; i < runs.length; i += 2) if (!ix.has(runs[i])) { ix.set(runs[i], pal.length); pal.push(runs[i]); }
  const wide = pal.length > 255;
  for (let i = 0; i < runs.length; i += 2) {
    const p = ix.get(runs[i]);
    if (wide) bytes.push(p >> 8); bytes.push(p & 255);
    let n = runs[i + 1];
    for (; n >= 128; n = Math.floor(n / 128)) bytes.push(n % 128 + 128);
    bytes.push(n);
  }
  let d = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2], q = a << 16 | (b || 0) << 8 | (c || 0);
    d += B64[q >> 18 & 63] + B64[q >> 12 & 63] + (b === undefined ? '=' : B64[q >> 6 & 63]) + (c === undefined ? '=' : B64[q & 63]);
  }
  return { n: GW * GH, p: pal, d };
}
function rasUnpack(o) {
  const s = o.d, rev = new Uint8Array(128), pal = o.p, wide = pal.length > 255;
  for (let i = 0; i < 64; i++) rev[B64.charCodeAt(i)] = i;
  const pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0, b = new Uint8Array(s.length / 4 * 3 - pad);
  for (let i = 0, j = 0; i < s.length; i += 4) {
    const q = rev[s.charCodeAt(i)] << 18 | rev[s.charCodeAt(i + 1)] << 12 | rev[s.charCodeAt(i + 2)] << 6 | rev[s.charCodeAt(i + 3)];
    if (j < b.length) b[j++] = q >> 16 & 255; if (j < b.length) b[j++] = q >> 8 & 255; if (j < b.length) b[j++] = q & 255;
  }
  for (let i = 0, k = 0; k < o.n && i < b.length;) {
    const p = wide ? b[i++] << 8 | b[i++] : b[i++];
    let n = 0, m = 1, c;
    do { c = b[i++]; n += (c & 127) * m; m *= 128; } while (c & 128);
    const v = pal[p], e = Math.min(o.n, k + n);
    TT.fill(v & 15, k, e); CTY.fill(v >> 4 & 15, k, e); RGN.fill(v >> 8 & 15, k, e); TF.fill(v >> 12 & 255, k, e);
    k = e;
  }
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
const PL = { g: new Float32Array(GW * GH), par: new Int32Array(GW * GH), st: new Uint32Array(GW * GH), stamp: 1, reuse: 0.35 };
/* Cost of entering a cell; Infinity where a road or track cannot go. gen = world generation (builds in land held by others too). */
function planCost(k, mode, gen) {
  const t = TT[k], f = TF[k];
  if (!(f & F_LT) || t === T_SEA || t === T_LAGOON || t === T_LAKE || t === T_FOREIGN) return Infinity;
  if (!gen && heldOff(k)) return Infinity;
  const b = BLK[k];
  if (b & (mode === 'road' ? 2 : 4)) return t === T_RIVER ? 0.5 : PL.reuse; // reuse a line of the same kind (it has its bridges)
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
  while (hk.length && exp < 400000 * MAPK) {
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
      const ng = Math.fround(g + c); // G is Float32: compare in the same precision, or rounding makes endless tiny "improvements"
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
