'use strict';
/* Lietuva 1918 — the 3D view (three.js): camera, sun, terrain and water, roads and railways, buildings, houses, fields,
   trees, seasons, overlays and labels. It reads the world and the simulation and never changes them. */
const cv = document.getElementById('cv');
let cw = 0, ch = 0, NOW = 0;
/* What the tools want shown: selection, ghost building, planned line, zoning or removal preview, highlighted route. */
const VIEW = { sel: null, ghost: null, path: null, pathOk: true, pathMode: null, snaps: [], zone: null, bull: null, brush: null, route: null, ver: 0 };
let SEASON = { snow: 0, aut: 0, heat: 0, m: 1 };

/* ---------- renderer, scene, camera, light ---------- */
const R3 = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
R3.shadowMap.enabled = true;
R3.shadowMap.type = THREE.PCFShadowMap;
const SCENE = new THREE.Scene(), SKY = new THREE.Color('#bfd0d4');
SCENE.background = SKY;
SCENE.fog = new THREE.Fog(SKY, 200, 900);
const CAM3 = new THREE.PerspectiveCamera(36, 1, 0.1, 3000);
const cam = { x: 285, z: 200, dist: 15, yaw: 0, pitch: 0.92, anim: null };
const HEMI = new THREE.HemisphereLight('#eef4f6', '#6d7a55', 1.25);
const SUN = new THREE.DirectionalLight('#fff1d6', 2.1);
SCENE.add(HEMI, SUN, SUN.target);
SUN.castShadow = true;
SUN.shadow.mapSize.set(2048, 2048);
SUN.shadow.bias = -0.0003;
SUN.shadow.normalBias = 0.008;
const SUN_DIR = new THREE.Vector3(-0.5, 0.78, 0.38).normalize();
const CAM_LIM = { dist: [0.6, 720], pitch: [0.42, 1.52] };

function resize() {
  const r = cv.getBoundingClientRect();
  if (!r.width || !r.height) return;
  cw = r.width; ch = r.height;
  R3.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  R3.setSize(cw, ch, false);
  CAM3.aspect = cw / ch; CAM3.updateProjectionMatrix();
  if (SMOKE) SMOKE.mat.uniforms.uScale.value = R3.getPixelRatio() * ch / (2 * Math.tan(CAM3.fov * Math.PI / 360));
}
function clampCam() {
  cam.dist = clamp(cam.dist, CAM_LIM.dist[0], CAM_LIM.dist[1]);
  cam.pitch = clamp(cam.pitch, CAM_LIM.pitch[0], CAM_LIM.pitch[1]);
  cam.x = clamp(cam.x, -30, MAPU + 30); cam.z = clamp(cam.z, -30, MAPV + 30);
}
function applyCam() {
  clampCam();
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  CAM3.position.set(cam.x + Math.sin(cam.yaw) * cp * cam.dist, sp * cam.dist, cam.z + Math.cos(cam.yaw) * cp * cam.dist);
  CAM3.lookAt(cam.x, 0, cam.z);
  CAM3.near = Math.max(0.02, cam.dist * 0.03); CAM3.far = cam.dist * 7 + 400;
  CAM3.updateProjectionMatrix(); CAM3.updateMatrixWorld();
  SCENE.fog.near = cam.dist * 2.4; SCENE.fog.far = cam.dist * 6 + 260;
  /* the sun's shadow box follows the view; far out, shadows stop updating */
  const near = cam.dist < 70, half = clamp(cam.dist * 1.15, 2, 75), D = 120;
  SUN.shadow.autoUpdate = near;
  if (near) {
    const snap = half / 512, tx = Math.round(cam.x / snap) * snap, tz = Math.round(cam.z / snap) * snap;
    SUN.target.position.set(tx, 0, tz); SUN.position.set(tx + SUN_DIR.x * D, SUN_DIR.y * D, tz + SUN_DIR.z * D);
    const sc = SUN.shadow.camera;
    if (sc.right !== half) { sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = 1; sc.far = D * 2.2; sc.updateProjectionMatrix(); }
    SUN.target.updateMatrixWorld();
  }
}
const _v = new THREE.Vector3(), _d = new THREE.Vector3();
function rayAt(sx, sy) {
  _v.set(sx / cw * 2 - 1, -(sy / ch) * 2 + 1, 0.5).unproject(CAM3);
  _d.copy(_v).sub(CAM3.position).normalize();
  return { o: CAM3.position.clone(), d: _d.clone() };
}
/* Ground point under a screen position, or null above the horizon. */
function groundAt(sx, sy) {
  const r = rayAt(sx, sy);
  if (r.d.y > -1e-4) return null;
  const t = -r.o.y / r.d.y;
  return [r.o.x + r.d.x * t, r.o.z + r.d.z * t];
}
function toScreen(x, y, z) { _v.set(x, y, z).project(CAM3); return [(_v.x + 1) / 2 * cw, (1 - _v.y) / 2 * ch, _v.z > -1 && _v.z < 1]; }
function panBy(sx0, sy0, sx1, sy1) {
  const a = groundAt(sx0, sy0), b = groundAt(sx1, sy1);
  if (!a || !b) return;
  cam.x += a[0] - b[0]; cam.z += a[1] - b[1]; cam.anim = null; applyCam();
}
function zoomAt(sx, sy, f) {
  const a = groundAt(sx, sy);
  cam.dist /= f; cam.anim = null; applyCam();
  const b = groundAt(sx, sy);
  if (a && b) { cam.x += a[0] - b[0]; cam.z += a[1] - b[1]; applyCam(); }
}
function rotateBy(da) { cam.yaw += da; cam.anim = null; applyCam(); }
function tiltBy(dp) { cam.pitch += dp; cam.anim = null; applyCam(); }
function focusAt(x, z, dist) { cam.anim = { x, z, dist: dist || cam.dist }; }
function camAnimate(dt) {
  const a = cam.anim;
  if (!a) return;
  const f = Math.min(1, dt * 5);
  cam.x += (a.x - cam.x) * f; cam.z += (a.z - cam.z) * f; cam.dist *= Math.pow(a.dist / cam.dist, f);
  if (a.yaw !== undefined) { cam.yaw += (a.yaw - cam.yaw) * f; cam.pitch += (a.pitch - cam.pitch) * f; }
  if (Math.hypot(a.x - cam.x, a.z - cam.z) < cam.dist * 0.002 && Math.abs(Math.log(a.dist / cam.dist)) < 0.01 && (a.yaw === undefined || Math.abs(a.yaw - cam.yaw) < 0.002)) cam.anim = null;
}
function camSave() { return { x: cam.x, z: cam.z, dist: cam.dist, yaw: cam.yaw, pitch: cam.pitch }; }
function camLoad(o) { if (o && isFinite(o.x) && isFinite(o.dist)) Object.assign(cam, { x: o.x, z: o.z, dist: o.dist, yaw: o.yaw || 0, pitch: o.pitch || 0.92, anim: null }); }
function northUp() { cam.anim = { x: cam.x, z: cam.z, dist: cam.dist, yaw: Math.round(cam.yaw / (Math.PI * 2)) * Math.PI * 2, pitch: 0.92 }; }

/* ---------- textures and materials ---------- */
function canvasTex(w, h, paint, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = Math.min(8, R3.capabilities.getMaxAnisotropy ? R3.capabilities.getMaxAnisotropy() : 1);
  return t;
}
/* tileable value noise for snow patches and ground detail */
const NOISE_TEX = (() => {
  const P = 8, N = 128;
  const t = canvasTex(N, N, (g) => {
    const img = g.createImageData(N, N), d = img.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let v = 0, amp = 0.55, per = P;
      for (let o = 0; o < 3; o++) {
        const fx = x / N * per, fy = y / N * per, xi = Math.floor(fx), yi = Math.floor(fy), u = fx - xi, w = fy - yi, su = u * u * (3 - 2 * u), sw = w * w * (3 - 2 * w);
        const h = (i, j) => hash2(((i % per) + per) % per, ((j % per) + per) % per, 31 + o);
        const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), e = h(xi + 1, yi + 1);
        v += amp * (a + (b - a) * su + (c - a) * sw + (a - b - c + e) * su * sw); amp *= 0.5; per *= 2;
      }
      const q = Math.round(clamp(v / 0.96, 0, 1) * 255), k = (y * N + x) * 4;
      d[k] = d[k + 1] = d[k + 2] = q; d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, true);
  t.colorSpace = THREE.NoColorSpace;
  return t;
})();
const SNOW_U = { value: 0 }, NOISE_U = { value: NOISE_TEX };
/* Snow settles on every upward-facing surface; patchy materials (the ground) melt in patches. */
function snowy(mat, mul, patchy) {
  const mu = { value: mul === undefined ? 1 : mul };
  mat.userData.snowMul = mu;
  mat.onBeforeCompile = sh => {
    sh.uniforms.uSnow = SNOW_U; sh.uniforms.uSnowMul = mu; sh.uniforms.uNoise = NOISE_U;
    sh.vertexShader = 'varying float vUp;\nvarying vec2 vWxz;\n' + sh.vertexShader
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\n  vUp = (vec4(transformedNormal, 0.0) * viewMatrix).y;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vWxz = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = 'uniform float uSnow;\nuniform float uSnowMul;\nuniform sampler2D uNoise;\nvarying float vUp;\nvarying vec2 vWxz;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
  float sCover = ${patchy ? 'smoothstep(-0.04, 0.12, uSnow * 1.25 - (texture2D(uNoise, vWxz * 0.045).r * 0.7 + texture2D(uNoise, vWxz * 0.29).r * 0.3))' : 'uSnow'};
  ${patchy ? 'diffuseColor.rgb *= 0.9 + 0.2 * texture2D(uNoise, vWxz * 1.3).r;' : ''}
  float sn = clamp(sCover * uSnowMul * smoothstep(0.45, 0.85, vUp), 0.0, 1.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.84, 0.88, 0.91), sn);`);
  };
  mat.customProgramCacheKey = () => 'snow' + (patchy ? 'p' : '');
  return mat;
}
const MAT = {
  bld: snowy(new THREE.MeshLambertMaterial({ vertexColors: true }), 0.9),
  tree: snowy(new THREE.MeshLambertMaterial({ vertexColors: true }), 0.8),
  agent: new THREE.MeshLambertMaterial({ vertexColors: true }),
  flag: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })
};

/* ---------- ground ---------- */
const GTEX_W = 2048, GTEX_H = Math.round(2048 * MAPV / MAPU);
const GCANVAS = document.createElement('canvas');
GCANVAS.width = GTEX_W; GCANVAS.height = GTEX_H;
const GTEX = new THREE.CanvasTexture(GCANVAS);
GTEX.colorSpace = THREE.SRGBColorSpace;
GTEX.anisotropy = Math.min(8, R3.capabilities.getMaxAnisotropy ? R3.capabilities.getMaxAnisotropy() : 1);
const PAL = { land: hx('#93b468'), fert: hx('#aebc6b'), forest: hx('#5f8a4b'), bog: hx('#8a8358'), clay: hx('#ab9f6d'), sand: hx('#e3d4a4'),
  sea: hx('#3b7997'), lagoon: hx('#4b8eab'), lake: hx('#7fa98a'), foreign: hx('#b3b5a4'), autumn: hx('#b8a457') };
function hx(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function cellRGB(k, aut) {
  const t = TT[k], f = TF[k];
  let c = t === T_SEA ? PAL.sea : t === T_LAGOON ? PAL.lagoon : t === T_FOREIGN ? PAL.foreign : t === T_SAND ? PAL.sand : t === T_LAKE ? PAL.lake
    : f & F_BOG ? PAL.bog : f & F_FOREST ? PAL.forest : f & F_FERTILE ? PAL.fert : f & F_CLAY ? PAL.clay : PAL.land;
  if (aut && t !== T_SEA && t !== T_LAGOON) { const q = f & F_FOREST ? 0.22 : 0.4; c = [c[0] + (PAL.autumn[0] - c[0]) * q, c[1] + (PAL.autumn[1] - c[1]) * q, c[2] + (PAL.autumn[2] - c[2]) * q]; }
  return c;
}
const GSRC = document.createElement('canvas');
GSRC.width = GW; GSRC.height = GH;
let groundKey = '', groundDirty = false, groundCells = [], lastGround = 0;
function paintGround() {
  const aut = SEASON.aut > 0.5, g0 = GSRC.getContext('2d'), img = g0.createImageData(GW, GH), d = img.data;
  for (let k = 0; k < GW * GH; k++) {
    const c = cellRGB(k, aut), n = 0.95 + hash2(k % GW, (k / GW) | 0, 11) * 0.08, o = k * 4;
    d[o] = c[0] * n; d[o + 1] = c[1] * n; d[o + 2] = c[2] * n; d[o + 3] = 255;
  }
  g0.putImageData(img, 0, 0);
  const g = GCANVAS.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.drawImage(GSRC, 0, 0, GTEX_W, GTEX_H);
  if (S.kr) {
    g.fillStyle = 'rgba(112,82,150,0.2)'; g.beginPath();
    polyXZ(KR).forEach((p, i) => { const x = p[0] / MAPU * GTEX_W, y = p[1] / MAPV * GTEX_H; i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.closePath(); g.fill();
  }
  GTEX.needsUpdate = true; groundDirty = false; groundCells = []; lastGround = NOW;
}
/* small repaint after forest clearing: only the changed cells */
function patchGround() {
  const g = GCANVAS.getContext('2d'), aut = SEASON.aut > 0.5, sx = GTEX_W / GW, sy = GTEX_H / GH;
  for (const k of groundCells) {
    const c = cellRGB(k, aut);
    g.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
    g.fillRect((k % GW) * sx - 0.5, ((k / GW) | 0) * sy - 0.5, sx + 1, sy + 1);
  }
  groundCells = []; GTEX.needsUpdate = true; lastGround = NOW;
}
/* Farmland mask: where the ground shader draws a patchwork of fields (open land, thinning out inside towns). */
const MASK = new THREE.DataTexture(new Uint8Array(GW * GH * 4), GW, GH, THREE.RGBAFormat);
MASK.magFilter = THREE.LinearFilter; MASK.minFilter = THREE.LinearFilter; MASK.generateMipmaps = false;
let maskTowns = -1;
function paintMask() {
  const d = MASK.image.data;
  for (let k = 0; k < GW * GH; k++) { const t = TT[k], f = TF[k]; d[k * 4] = t === T_LAND && !(f & (F_FOREST | F_BOG)) ? (f & F_LT ? 255 : 140) : 0; d[k * 4 + 3] = 255; }
  for (const t of S.towns) {
    const r = t.vil ? 0.7 : 0.6 + (t.R || 1) * 0.9;
    forDisk(t.x, t.z, r, (k, dd) => { d[k * 4] = Math.round(d[k * 4] * clamp((dd - r * 0.55) / (r * 0.45), 0, 1)); });
  }
  MASK.needsUpdate = true; maskTowns = S.towns.length;
}
const FARM_PAL = { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Color()) };
const FARM_COLS = { spring: ['#8d7754', '#93b268', '#82a85f', '#9c8a5e', '#8aad64', '#97865c'], summer: ['#a6be62', '#bcbb66', '#c7b660', '#98b862', '#aca962', '#8fb15f'],
  autumn: ['#b39a55', '#9c7d4a', '#c2a565', '#8f8a4e', '#a88a50', '#7f7448'] };
function farmSeason() { const m = SEASON.m; return m === 2 || m === 3 ? 'spring' : m >= 4 && m <= 7 ? 'summer' : 'autumn'; }
/* The ground: base texture, a patchwork of fields drawn per pixel (crisp at any zoom), detail noise and patchy snow. */
function groundMat() {
  const mat = new THREE.MeshLambertMaterial({ map: GTEX });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uSnow: SNOW_U, uNoise: NOISE_U, uMask: { value: MASK }, uPal: FARM_PAL, uMap: { value: new THREE.Vector2(MAPU, MAPV) } });
    sh.vertexShader = 'varying vec2 vWxz;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vWxz = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = 'uniform float uSnow;\nuniform sampler2D uNoise;\nuniform sampler2D uMask;\nuniform vec3 uPal[6];\nuniform vec2 uMap;\nvarying vec2 vWxz;\n' +
      'float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
  float farm = texture2D(uMask, vWxz / uMap).r;
  if (farm > 0.02) {
    vec2 tile = floor(vWxz / 9.0), loc = vWxz - tile * 9.0;
    float an = h21(tile) * 3.1416, ca = cos(an), sa = sin(an);
    vec2 q = vec2(ca * loc.x - sa * loc.y, sa * loc.x + ca * loc.y) / vec2(0.85, 0.32);
    q += vec2(texture2D(uNoise, vWxz * 0.055).r, texture2D(uNoise, vWxz * 0.055 + vec2(0.37, 0.71)).r) * 1.2 - 0.6;
    vec2 cell = floor(q), f = fract(q);
    float px = length(fwidth(q));
    vec3 pc = uPal[int(h21(cell + tile * 41.0) * 5.999)];
    float edge = min(min(f.x, 1.0 - f.x) * 1.3, min(f.y, 1.0 - f.y) * 0.5);
    pc *= mix(0.8, 1.0, smoothstep(0.0, 0.03 + px * 0.6, edge));
    pc *= 0.93 + 0.14 * texture2D(uNoise, vWxz * 0.8).r;
    farm *= 1.0 - smoothstep(0.3, 0.9, px);
    diffuseColor.rgb = mix(diffuseColor.rgb, pc, farm * 0.72);
  }
  diffuseColor.rgb *= 0.92 + 0.16 * texture2D(uNoise, vWxz * 1.3).r;
  float sCover = smoothstep(-0.04, 0.12, uSnow * 1.25 - (texture2D(uNoise, vWxz * 0.045).r * 0.7 + texture2D(uNoise, vWxz * 0.29).r * 0.3));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.84, 0.88, 0.91), clamp(sCover, 0.0, 1.0));`);
  };
  mat.customProgramCacheKey = () => 'ground';
  return mat;
}
const GROUND = (() => {
  const geo = new THREE.PlaneGeometry(MAPU, MAPV, 1, 1);
  geo.rotateX(-Math.PI / 2); geo.translate(MAPU / 2, 0, MAPV / 2);
  const m = new THREE.Mesh(geo, groundMat());
  m.receiveShadow = true; m.renderOrder = 0;
  SCENE.add(m);
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2).translate(MAPU / 2, -0.05, MAPV / 2),
    snowy(new THREE.MeshLambertMaterial({ color: '#b3b5a4' }), 1, true));
  outer.renderOrder = -1; SCENE.add(outer);
  return m;
})();

/* ---------- water ---------- */
function shapeGeo(pxz) { const g = new THREE.ShapeGeometry(new THREE.Shape(pxz.map(p => new THREE.Vector2(p[0], -p[1])))); g.rotateX(-Math.PI / 2); return g; }
/* flat strip along a polyline, appended to {pos, uv, idx} */
function ribbon(pts, w, y, vs, out, u0, u1) {
  u0 = u0 || 0; u1 = u1 === undefined ? 1 : u1;
  const n = pts.length, base = out.pos.length / 3;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1];
    const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    if (i) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const nx = -tz * w / 2, nz = tx * w / 2;
    out.pos.push(pts[i][0] + nx, y, pts[i][1] + nz, pts[i][0] - nx, y, pts[i][1] - nz);
    out.uv.push(u0, s / vs, u1, s / vs);
    if (i) { const q = base + (i - 1) * 2; out.idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
  }
}
function flatGeo(out) {
  const g = new THREE.BufferGeometry(), n = out.pos.length / 3, nrm = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) nrm[i * 3 + 1] = 1;
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  if (out.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
  g.setIndex(out.idx);
  g.computeBoundingSphere();
  return g;
}
function decal(mat, order) { mat.depthWrite = false; mat.polygonOffset = true; mat.polygonOffsetFactor = -1 - order; mat.polygonOffsetUnits = -2 - order; return mat; }
const WATER = (() => {
  const sea = SEA.map(p => p.slice()), mk = c => decal(new THREE.MeshPhongMaterial({ color: c, specular: '#9cc3d6', shininess: 60 }), 1);
  sea.forEach(p => { if (p[0] < 20) p[0] = 12; if (p[1] > 57) p[1] = 58.6; });
  const M = { sea: mk('#3d7c99'), lagoon: mk('#4b8eab'), lake: mk('#4f97b4') };
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.renderOrder = 1; m.receiveShadow = true; SCENE.add(m); return m; };
  add(shapeGeo(polyXZ(sea)), M.sea);
  add(shapeGeo(polyXZ(LAG)), M.lagoon);
  LAKES.forEach(([lo, la, rx, ry, rot]) => {
    const c = ll2xz(lo, la), a = rot * Math.PI / 180, pts = [];
    for (let q = 0; q < 28; q++) { const t = q / 28 * Math.PI * 2, x = Math.cos(t) * rx, y = Math.sin(t) * ry; pts.push([c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)]); }
    add(shapeGeo(pts), M.lake);
  });
  const out = { pos: [], uv: [], idx: [] };
  RIV.forEach((r, n) => ribbon(chaikin(densify(polyXZ(r.p), 3), 3), RIVW[n] || 0.3, 0, 1, out));
  add(flatGeo(out), M.lake);
  return M;
})();
/* the border of Lithuania, dashed, where it runs over land */
let BORDER = null, borderW = 0;
function buildBorder() {
  const w = Math.max(0.18, cam.dist * 0.0035);
  if (BORDER && Math.abs(Math.log(w / borderW)) < 0.35) return;
  borderW = w;
  if (BORDER) { SCENE.remove(BORDER); BORDER.geometry.dispose(); }
  const out = { pos: [], uv: [], idx: [] }, P = polyXZ(LT), dash = Math.max(1.2, w * 5), gap = dash * 0.6;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const nx = -(b[1] - a[1]) / L * 2, nz = (b[0] - a[0]) / L * 2, t1 = terrAt(mx + nx, mz + nz), t2 = terrAt(mx - nx, mz - nz);
    if (t1 === T_SEA || t1 === T_LAGOON || t2 === T_SEA || t2 === T_LAGOON) continue;
    for (let s = 0; s < L; s += dash + gap) {
      const e = Math.min(L, s + dash);
      ribbon([[a[0] + (b[0] - a[0]) * s / L, a[1] + (b[1] - a[1]) * s / L], [a[0] + (b[0] - a[0]) * e / L, a[1] + (b[1] - a[1]) * e / L]], w, 0, 1, out);
    }
  }
  BORDER = new THREE.Mesh(flatGeo(out), decal(new THREE.MeshBasicMaterial({ color: '#5a4630', transparent: true, opacity: 0.75 }), 2));
  BORDER.renderOrder = 2; SCENE.add(BORDER);
}

/* ---------- roads and railways ---------- */
function stripeTex(kind) {
  return canvasTex(64, 128, (g, w, h) => {
    if (kind === 'dirt') {
      g.fillStyle = '#bfa274'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#a98b5e'; g.fillRect(14, 0, 8, h); g.fillRect(42, 0, 8, h);
      g.fillStyle = 'rgba(120,100,60,0.5)'; g.fillRect(0, 0, 3, h); g.fillRect(w - 3, 0, 3, h);
    } else if (kind === 'paved') {
      g.fillStyle = '#85817b'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#6a6762'; g.fillRect(0, 0, 4, h); g.fillRect(w - 4, 0, 4, h);
      g.fillStyle = '#eeeae0'; g.fillRect(30, 10, 4, 54);
    } else if (kind === 'highway') {
      g.fillStyle = '#55555a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8e6df'; g.fillRect(5, 0, 3, h); g.fillRect(w - 8, 0, 3, h); g.fillRect(30, 0, 4, 60);
    } else {
      g.fillStyle = '#9a9184'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#5b4636'; for (let y = 4; y < h; y += 21) g.fillRect(8, y, w - 16, 9);
      g.fillStyle = kind === 'erail' ? '#c7dbe9' : '#d7d9db'; g.fillRect(17, 0, 5, h); g.fillRect(w - 22, 0, 5, h);
    }
  }, true);
}
const LINE_MAT = {
  road: [null, 'dirt', 'paved', 'highway'].map((k, lv) => lv ? snowy(decal(new THREE.MeshLambertMaterial({ map: stripeTex(k) }), 3 + lv * 0.1), lv === 1 ? 0.45 : 0.25) : null),
  rail: [null, 'rail', 'erail'].map((k, lv) => lv ? snowy(decal(new THREE.MeshLambertMaterial({ map: stripeTex(k) }), 4), 0.3) : null),
  node: [null, '#b89a6b', '#7e7a75', '#55555a'].map((c, lv) => lv ? snowy(decal(new THREE.MeshLambertMaterial({ color: c }), 3.05 + lv * 0.1), lv === 1 ? 0.45 : 0.25) : null),
  bridge: decal(new THREE.MeshLambertMaterial({ color: '#6b5440' }), 2.5)
};
let LINES = [], lineKey = '';
function lineW(e) { const w0 = espec(e).w; return Math.max(w0, cam.dist * (e.k === 'rail' ? 0.0034 : 0.0032) * (e.lv === 3 ? 1.3 : 1)); }
function buildLines() {
  const wk = Math.round(Math.log(Math.max(1, cam.dist * 0.0034 / 0.055)) / 0.3);
  const key = WV.net + ':' + wk;
  if (key === lineKey) return;
  lineKey = key;
  LINES.forEach(m => { SCENE.remove(m); m.geometry.dispose(); });
  LINES = [];
  const groups = {}, br = { pos: [], uv: [], idx: [] };
  EDGES.forEach(e => {
    const g = groups[e.k + e.lv] || (groups[e.k + e.lv] = { mat: LINE_MAT[e.k][e.lv], out: { pos: [], uv: [], idx: [] }, nodes: new Set(), w: 0 });
    const w = lineW(e);
    ribbon(e.p, w, 0, e.k === 'rail' ? 0.12 : 0.25, g.out);
    if (e.k === 'road') { g.nodes.add(e.a); g.nodes.add(e.b); g.w = Math.max(g.w, w); }
    /* bridges where the line crosses a river */
    let run = null;
    for (let s = 0; s <= e.L + 0.05; s += 0.05) {
      const q = polyAt(e.p, e.c, Math.min(s, e.L)), wet = terrAt(q[0], q[1]) === T_RIVER;
      if (wet && !run) run = [[q[0], q[1]]]; else if (wet) run.push([q[0], q[1]]);
      if ((!wet || s >= e.L) && run) { if (run.length > 1) ribbon(run, w * 1.45, 0, 1, br); run = null; }
    }
  });
  for (const k in groups) {
    const g = groups[k];
    const m = new THREE.Mesh(flatGeo(g.out), g.mat);
    m.renderOrder = k.startsWith('rail') ? 4 : 3; m.receiveShadow = true; SCENE.add(m); LINES.push(m);
    if (g.nodes.size) {
      const disc = new THREE.CircleGeometry(g.w / 2, 12).rotateX(-Math.PI / 2), nodes = [...g.nodes];
      const im = new THREE.InstancedMesh(disc, LINE_MAT.node[+k.slice(4)], nodes.length);
      nodes.forEach((id, i) => { const n = NODES.get(id); im.setMatrixAt(i, new THREE.Matrix4().makeTranslation(n.x, 0, n.z)); });
      im.renderOrder = 3; im.receiveShadow = true; im.computeBoundingSphere(); SCENE.add(im); LINES.push(im);
    }
  }
  if (br.idx.length) { const m = new THREE.Mesh(flatGeo(br), LINE_MAT.bridge); m.renderOrder = 2; SCENE.add(m); LINES.push(m); }
}

/* ---------- instanced things: buildings, houses, fields, lots ---------- */
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color(), _Y = new THREE.Vector3(0, 1, 0);
/* A pool of InstancedMeshes keyed by name, grown as needed. */
class Pool {
  constructor(order, shadow) { this.m = new Map(); this.order = order || 0; this.shadow = shadow; }
  begin() { this.n = new Map(); }
  add(key, geo, mat, x, y, z, rot, sx, sy, sz, color) {
    let e = this.m.get(key);
    const i = this.n.get(key) || 0;
    if (!e || i >= e.cap) {
      const cap = Math.max(16, e ? e.cap * 2 : 32), mesh = new THREE.InstancedMesh(geo, mat, cap);
      mesh.renderOrder = this.order; mesh.castShadow = !!this.shadow; mesh.receiveShadow = true; mesh.frustumCulled = false;
      if (e) { for (let q = 0; q < i; q++) { e.mesh.getMatrixAt(q, _m4); mesh.setMatrixAt(q, _m4); if (e.mesh.instanceColor) { e.mesh.getColorAt(q, _c); mesh.setColorAt(q, _c); } } SCENE.remove(e.mesh); e.mesh.dispose(); }
      e = { mesh, cap }; this.m.set(key, e); SCENE.add(mesh);
    }
    _p.set(x, y, z); _q.setFromAxisAngle(_Y, rot); _s.set(sx, sy, sz);
    e.mesh.setMatrixAt(i, _m4.compose(_p, _q, _s));
    /* every instance gets a colour, so the colour buffer never holds black for earlier instances */
    if (color !== undefined) _c.set(color); else _c.setRGB(1, 1, 1);
    e.mesh.setColorAt(i, _c);
    this.n.set(key, i + 1);
  }
  end() {
    this.m.forEach((e, key) => {
      e.mesh.count = this.n.get(key) || 0;
      e.mesh.instanceMatrix.needsUpdate = true;
      if (e.mesh.instanceColor) e.mesh.instanceColor.needsUpdate = true;
      e.mesh.visible = e.mesh.count > 0;
    });
  }
}
const BLD = new Pool(5, true), FIELDP = new Pool(2.6, false), LOTS3 = new Pool(2.7, false), FLAGS = new Pool(6, false);
const FIELD_TEX = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(70,55,30,0.28)'; for (let y = 2; y < h; y += 8) g.fillRect(0, y, w, 3); }, true);
const FIELD_MAT = snowy(decal(new THREE.MeshLambertMaterial({ map: FIELD_TEX }), 2.6), 1);
const FIELD_GEO = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const LOT_TEX = canvasTex(64, 64, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(130,214,122,0.28)'; g.fillRect(3, 3, w - 6, h - 6);
  g.strokeStyle = 'rgba(56,140,60,0.95)'; g.lineWidth = 3; g.setLineDash([7, 5]); g.strokeRect(3, 3, w - 6, h - 6);
});
const LOT_MAT = decal(new THREE.MeshBasicMaterial({ map: LOT_TEX, transparent: true }), 2.7);
const CROP = { grain: [['#d4bb5f', '#aec66d'], '#8c6a45'], grain2: [['#cbb75c', '#b9c770'], '#8c6a45'], potato: [['#6f9a4a', '#7aa452'], '#7a5a3a'],
  flax: [['#9db7e6', '#a9c0ea'], '#c9b27a'], peat: [['#5e4a3a', '#5e4a3a'], '#5e4a3a'], pasture: [['#8fbf5f', '#96c463'], '#b5ad5e'], garden: [['#86a356', '#8f7f55'], '#7a6a48'] };
function cropCol(crop, id) { const c = CROP[crop]; return SEASON.aut > 0.5 ? c[1] : c[0][hash2(id, 3, 9) < 0.5 ? 0 : 1]; }
let bldKey = '', FLAG_LIST = [];
/* Only buildings around the view are drawn; far out, each house lot is one simple block. */
function bldView() {
  const bb = viewBox(), m = Math.max(1.5, cam.dist * 0.6), q = Math.max(1.5, cam.dist * 0.5);
  return [Math.floor((bb[0] - m) / q) * q, Math.floor((bb[1] - m) / q) * q, Math.ceil((bb[2] + m) / q) * q, Math.ceil((bb[3] + m) / q) * q];
}
function buildBuildings() {
  const box = bldView(), far = cam.dist > 40;
  const key = WV.bld + ':' + NET.ver + ':' + (SEASON.aut > 0.5 ? 1 : 0) + ':' + far + ':' + box.map(v => v.toFixed(1)).join(',');
  if (key === bldKey) return;
  bldKey = key;
  BLD.begin(); FIELDP.begin(); FLAGS.begin(); FLAG_LIST = [];
  for (const b of S.bld) {
    if (b.x < box[0] || b.x > box[2] || b.z < box[1] || b.z > box[3]) continue;
    if (b.t === 'house') {
      if (far && b.lv === 1) { BLD.add(b.f ? 'h:farmFar' : 'h:far', housePart(b.f ? 'farmFar' : 'far'), MAT.bld, b.x, 0, b.z, b.rot, 1, 1, 1, WALL_TINT[Math.floor(hash2(b.id, 40, 77) * 6)]); continue; }
      for (const [part, lx, lz, lr, tint] of lotLayout(b)) {
        const [x, z] = toWorld({ x: b.x, z: b.z, rot: b.rot }, lx, lz), col = part === 'woodWalls' ? WALL_TINT[tint] : part === 'woodRoof' ? ROOF_TINT[tint] : undefined;
        if (part === 'tree') BLD.add('h:tree', treeGeo('pine'), MAT.tree, x, 0, z, lr, 0.85, 0.85, 0.85);
        else BLD.add('h:' + part, housePart(part), MAT.bld, x, 0, z, b.rot + lr, 1, 1, 1, col);
      }
      if (b.lv === 1 && b.f) { const [x, z] = toWorld({ x: b.x, z: b.z, rot: b.rot }, 0.0, -0.02); FIELDP.add('f', FIELD_GEO, FIELD_MAT, x, 0, z, b.rot, 0.34, 1, 0.13, cropCol('garden', b.id)); }
      else if (b.lv === 1) { const [x, z] = toWorld({ x: b.x, z: b.z, rot: b.rot }, 0.0, -0.01); FIELDP.add('f', FIELD_GEO, FIELD_MAT, x, 0, z, b.rot, 0.08, 1, 0.06, cropCol('garden', b.id)); }
      continue;
    }
    const mk = modelKey(b), M = model(mk), o = { x: b.x, z: b.z, rot: b.rot };
    BLD.add('b:' + mk, M.geo, MAT.bld, b.x, 0, b.z, b.rot, 1, 1, 1, b.town < 0 && b.t !== 'hall' ? '#b0aaa0' : undefined);
    if (M.fields) for (const [fx, fz, fw, fd, crop] of M.fields) { const [x, z] = toWorld(o, fx, fz); FIELDP.add('f', FIELD_GEO, FIELD_MAT, x, 0, z, b.rot, fw, 1, fd, cropCol(crop, b.id + fx)); }
    if (M.flag) { const [x, z] = toWorld(o, M.flag[0], M.flag[1]); FLAGS.add('flag', agentGeo('flag'), MAT.flag, x, M.flag[2] - 0.052 * MS, z, b.rot + Math.PI / 2, 1, 1, 1); FLAG_LIST.push(b); }
  }
  BLD.end(); FIELDP.end(); FLAGS.end();
  rebuildEmitters();
}
let lotKey = '';
function buildLots() {
  if (lotKey === WV.lots) return;
  lotKey = WV.lots;
  LOTS3.begin();
  for (const l of S.lots) LOTS3.add('lot', FIELD_GEO, LOT_MAT, l.x, 0, l.z, l.rot, LOT_W, 1, LOT_D);
  LOTS3.end();
}

/* ---------- trees, in chunks built when first seen ---------- */
const TCH = 20, TREE_CH = new Map(), TREE_MAX = 55;
const CROWN_COL = { sum: ['#5f8f3e', '#6f9a45', '#7aa04a', '#668f40'], aut: ['#d9a23a', '#c9852f', '#e0b84a', '#b8792c'] };
function treeChunk(ci, cj) {
  const key = ci + '_' + cj;
  let c = TREE_CH.get(key);
  if (!c) { c = { ci, cj, built: false, dirty: true, meshes: [] }; TREE_CH.set(key, c); }
  return c;
}
function buildTreeChunk(c) {
  c.meshes.forEach(m => { SCENE.remove(m); m.dispose(); });
  c.meshes = [];
  const pts = { pine: [], spruce: [], birch: [] };
  const i0 = Math.floor(c.ci * TCH / CELL), j0 = Math.floor(c.cj * TCH / CELL), n = Math.round(TCH / CELL);
  for (let j = j0; j < j0 + n && j < GH; j++) for (let i = i0; i < i0 + n && i < GW; i++) {
    const k = j * GW + i;
    if (!(TF[k] & F_FOREST) || TT[k] !== T_LAND) continue;
    const cnt = hash2(i, j, 41) < 0.6 ? 3 : 2;
    for (let q = 0; q < cnt; q++) {
      const x = (i + 0.08 + hash2(i, j, 50 + q) * 0.84) * CELL, z = (j + 0.08 + hash2(i, j, 60 + q) * 0.84) * CELL, r = hash2(i, j, 70 + q);
      const kind = r < 0.5 ? 'pine' : r < 0.7 ? 'spruce' : 'birch';
      pts[kind].push([x, z, 0.75 + hash2(i, j, 80 + q) * 0.55, hash2(i, j, 90 + q) * 6.28, hash2(i, j, 95 + q)]);
    }
  }
  /* shuffled, so drawing only the first part of a list thins the forest evenly (level of detail) */
  const rnd = rng(1 + c.ci * 977 + c.cj * 131);
  for (const k in pts) { const a = pts[k]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }
  const mk = (geoKey, list, color) => {
    if (!list.length) return null;
    const m = new THREE.InstancedMesh(treeGeo(geoKey), MAT.tree, list.length);
    list.forEach((p, i) => {
      _p.set(p[0], 0, p[1]); _q.setFromAxisAngle(_Y, p[3]); _s.set(p[2], p[2], p[2]);
      m.setMatrixAt(i, _m4.compose(_p, _q, _s));
      _c.set(color ? color(p) : '#ffffff'); if (!color) _c.multiplyScalar(0.85 + p[4] * 0.3); m.setColorAt(i, _c);
    });
    m.receiveShadow = true; m.computeBoundingSphere(); m.userData.total = list.length; SCENE.add(m); c.meshes.push(m);
    return m;
  };
  mk('pine', pts.pine); mk('spruce', pts.spruce); mk('trunk', pts.birch);
  c.crown = mk('crown', pts.birch, p => CROWN_COL[SEASON.aut > 0.5 ? 'aut' : 'sum'][Math.floor(p[4] * 4)]);
  c.crownPts = pts.birch; c.built = true; c.dirty = false; c.aut = SEASON.aut > 0.5;
}
function cellsChanged(cells) {
  for (const k of cells) { const x = cellX(k), z = cellZ(k), c = TREE_CH.get(Math.floor(x / TCH) + '_' + Math.floor(z / TCH)); if (c) c.dirty = true; }
  groundCells.push(...cells);
}
terrainHook = cellsChanged;
/* the part of the ground in view, as a box */
function viewBox() {
  const pts = [[0, 0], [cw, 0], [0, ch], [cw, ch], [cw / 2, ch / 2]].map(([x, y]) => groundAt(x, y) || null);
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
  const far = cam.dist * 3;
  for (const p of pts) {
    const q = p && Math.hypot(p[0] - cam.x, p[1] - cam.z) < far ? p : [cam.x - Math.sin(cam.yaw) * far, cam.z - Math.cos(cam.yaw) * far];
    x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]);
  }
  return [x0, z0, x1, z1];
}
function updateTrees() {
  const show = cam.dist < TREE_MAX, aut = SEASON.aut > 0.5, winter = SEASON.snow > 0.55;
  let budget = 3;
  const bb = show ? viewBox() : null, ci0 = show ? Math.floor((bb[0] - 2) / TCH) : 0, ci1 = show ? Math.floor((bb[2] + 2) / TCH) : -1, cj0 = show ? Math.floor((bb[1] - 2) / TCH) : 0, cj1 = show ? Math.floor((bb[3] + 2) / TCH) : -1;
  TREE_CH.forEach(c => { const vis = show && c.ci >= ci0 && c.ci <= ci1 && c.cj >= cj0 && c.cj <= cj1; c.meshes.forEach(m => { m.visible = vis; m.castShadow = vis && cam.dist < 9; }); });
  if (!show) return;
  for (let cj = Math.max(0, cj0); cj <= Math.min(Math.ceil(MAPV / TCH), cj1); cj++) for (let ci = Math.max(0, ci0); ci <= Math.min(Math.ceil(MAPU / TCH), ci1); ci++) {
    const c = treeChunk(ci, cj);
    if ((c.dirty || !c.built) && budget > 0) { buildTreeChunk(c); budget--; c.meshes.forEach(m => { m.visible = true; m.castShadow = cam.dist < 9; }); }
    const dd = Math.hypot((ci + 0.5) * TCH - cam.x, (cj + 0.5) * TCH - cam.z), lod = clamp(1.3 - dd / (10 + cam.dist * 0.7), 0.12, 1);
    c.meshes.forEach(m => { m.count = Math.max(1, Math.round(m.userData.total * lod)); });
    if (c.crown) {
      c.crown.visible = !winter;
      if (c.aut !== aut) { c.aut = aut; c.crownPts.forEach((p, i) => { _c.set(CROWN_COL[aut ? 'aut' : 'sum'][Math.floor(p[4] * 4)]); c.crown.setColorAt(i, _c); }); c.crown.instanceColor.needsUpdate = true; }
    }
  }
}

/* ---------- smoke, flags, animals and boats ---------- */
const SMOKE = (() => {
  const N = 420, g = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), a = new Float32Array(N), sz = new Float32Array(N), col = new Float32Array(N * 3);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aAlpha', new THREE.BufferAttribute(a, 1));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 400 } }, transparent: true, depthWrite: false, fog: false,
    vertexShader: 'attribute float aAlpha; attribute float aSize; attribute vec3 aCol; uniform float uScale; varying float vA; varying vec3 vC;\n' +
      'void main(){ vA = aAlpha; vC = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(0.01, -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying float vA; varying vec3 vC;\nvoid main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; gl_FragColor = vec4(vC, vA * (1.0 - r * 2.0)); }'
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false; pts.renderOrder = 9; SCENE.add(pts);
  const P = []; for (let i = 0; i < N; i++) P.push({ life: 0, age: 1, x: 0, y: 0, z: 0, vy: 0, s: 0, c: 1, a: 0 });
  return { N, g, pos, a, sz, col, mat, pts, P, next: 0 };
})();
let EMIT = [];
function rebuildEmitters() {
  EMIT = [];
  for (const b of S.bld) {
    if (b.t === 'house') { if (b.lv === 1 && hash2(b.id, 5, 5) < 0.6) { const [x, z] = toWorld({ x: b.x, z: b.z, rot: b.rot }, -0.07, 0.085); EMIT.push({ b, x, y: 0.1, z, kind: 'home', acc: hash2(b.id, 1, 1) }); } continue; }
    const M = model(modelKey(b));
    if (M.smoke) for (const [sx, sy, sz, kind] of M.smoke) { const [x, z] = toWorld({ x: b.x, z: b.z, rot: b.rot }, sx, sz); EMIT.push({ b, x, y: sy, z, kind, acc: hash2(b.id, 2, 2) }); }
  }
}
const SMOKE_KIND = { home: ['#e8e6e2', 0.026, 0.35, 2.4], dark: ['#5d5a57', 0.045, 0.55, 3.2], grey: ['#9a9894', 0.04, 0.5, 3], steam: ['#f7f7f5', 0.11, 0.6, 3.6], loco: ['#d9d9d6', 0.026, 0.5, 1.6] };
function puff(x, y, z, kind) {
  const S0 = SMOKE, p = S0.P[S0.next], k = SMOKE_KIND[kind];
  S0.next = (S0.next + 1) % S0.N;
  p.x = x; p.y = y; p.z = z; p.age = 0; p.life = k[3] * (0.8 + Math.random() * 0.4); p.s = k[1]; p.a = k[2]; p.vy = k[1] * 0.35; p.kind = kind;
  _c.set(k[0]); p.r = _c.r; p.g = _c.g; p.b2 = _c.b;
}
function updateEffects(dt) {
  const f = S.speed ? 1 : 0, near = cam.dist < 45;
  if (near && f) for (const e of EMIT) {
    const b = e.b;
    if (e.kind === 'home') { if (SEASON.heat < 0.25 || cam.dist > 10 || Math.hypot(e.x - cam.x, e.z - cam.z) > cam.dist * 1.6) continue; }
    else if (!b.on || b.eff < 0.25) continue;
    if (Math.hypot(e.x - cam.x, e.z - cam.z) > cam.dist * 2.5) continue;
    e.acc += dt * (e.kind === 'home' ? 0.6 : e.kind === 'steam' ? 1.6 : 1.8);
    while (e.acc > 1) { e.acc -= 1; puff(e.x, e.y, e.z, e.kind); }
  }
  const S0 = SMOKE, wind = 0.03;
  for (let i = 0; i < S0.N; i++) {
    const p = S0.P[i];
    if (p.age < p.life) { p.age += dt; p.y += p.vy * dt * 2.2; p.x += wind * dt; p.z -= wind * 0.4 * dt; }
    const t = Math.min(1, p.age / (p.life || 1)), alive = p.age < p.life;
    S0.pos[i * 3] = p.x; S0.pos[i * 3 + 1] = p.y; S0.pos[i * 3 + 2] = p.z;
    S0.a[i] = alive ? p.a * (1 - t) * Math.min(1, t * 6) : 0; S0.sz[i] = p.s * (1 + t * 2.4);
    S0.col[i * 3] = p.r || 1; S0.col[i * 3 + 1] = p.g || 1; S0.col[i * 3 + 2] = p.b2 || 1;
  }
  for (const k of ['position', 'aAlpha', 'aSize', 'aCol']) S0.g.attributes[k].needsUpdate = true;
  /* flags flutter */
  const fl = FLAGS.m.get('flag');
  if (fl && fl.mesh.count && cam.dist < 14) {
    let i = 0;
    for (const b of FLAG_LIST) {
      const M = model(modelKey(b));
      const [x, z] = toWorld({ x: b.x, z: b.z, rot: b.rot }, M.flag[0], M.flag[1]);
      _p.set(x, M.flag[2] - 0.052 * MS, z); _q.setFromAxisAngle(_Y, b.rot + Math.PI / 2 + Math.sin(NOW / 420 + b.id) * 0.25); _s.set(1, 1, 1);
      fl.mesh.setMatrixAt(i++, _m4.compose(_p, _q, _s));
    }
    fl.mesh.instanceMatrix.needsUpdate = true;
  }
  updateCritters();
}
const CRIT = new Pool(6, true);
function waterNear(b) {
  if (b._w !== undefined) return b._w;
  let best = null, bd = 1e9;
  forDisk(b.x, b.z, 1.8, (k, d) => { if (isWaterT(TT[k]) && TT[k] !== T_RIVER && d < bd) { bd = d; best = [cellX(k), cellZ(k)]; } });
  if (!best) forDisk(b.x, b.z, 1.8, (k, d) => { if (TT[k] === T_RIVER && d < bd) { bd = d; best = [cellX(k), cellZ(k)]; } });
  return b._w = best;
}
function updateCritters() {
  CRIT.begin();
  if (cam.dist < 12) {
    const t = NOW / 1000;
    for (const b of S.bld) {
      if (Math.hypot(b.x - cam.x, b.z - cam.z) > cam.dist * 2) continue;
      const M = b.t === 'house' ? null : model(modelKey(b)), o = { x: b.x, z: b.z, rot: b.rot };
      if (!M) continue;
      if (M.cows && SEASON.snow < 0.5) for (const [cx, cz, w, d] of M.cows) for (let q = 0; q < 5; q++) {
        const ph = t * 0.05 + q * 1.7 + b.id, lx = cx + Math.sin(ph) * w * 0.4, lz = cz + Math.cos(ph * 0.8) * d * 0.4, [x, z] = toWorld(o, lx, lz);
        CRIT.add('cow', agentGeo('cow'), MAT.agent, x, 0, z, b.rot + ph, 1, 1, 1, q % 2 ? '#f4f1ea' : '#7a4a2c');
      }
      if (M.pigs && SEASON.snow < 0.5) for (const [cx, cz, w, d] of M.pigs) for (let q = 0; q < 4; q++) {
        const ph = t * 0.08 + q * 2.1 + b.id, [x, z] = toWorld(o, cx + Math.sin(ph) * w * 0.4, cz + Math.cos(ph * 1.3) * d * 0.35);
        CRIT.add('pig', agentGeo('pig'), MAT.agent, x, 0, z, b.rot + ph * 2, 1, 1, 1);
      }
      if (M.boat) {
        const w = waterNear(b);
        if (w && !(SEASON.snow > 0.75 && TT[cellAt(w[0], w[1])] !== T_SEA)) {
          const ph = t * 0.12 + b.id, r = 0.2, x = w[0] + Math.cos(ph) * r, z = w[1] + Math.sin(ph) * r;
          CRIT.add(M.boat === 2 ? 'ship' : 'boat', agentGeo(M.boat === 2 ? 'ship' : 'boat'), MAT.agent, x, 0.004, z, -ph, 1, 1, 1);
        }
      }
    }
  }
  CRIT.end();
}

/* ---------- overlays: selection, ghost, planned lines, brushes, routes, pollution ---------- */
const OV = new THREE.Group();
SCENE.add(OV);
const OVM = {
  path: decal(new THREE.MeshBasicMaterial({ color: '#f2a93b', transparent: true, opacity: 0.85 }), 6),
  bad: decal(new THREE.MeshBasicMaterial({ color: '#ef7b58', transparent: true, opacity: 0.85 }), 6),
  zone: decal(new THREE.MeshBasicMaterial({ color: '#78dc78', transparent: true, opacity: 0.5 }), 6),
  bull: decal(new THREE.MeshBasicMaterial({ color: '#ef7b58', transparent: true, opacity: 0.55 }), 6),
  ring: decal(new THREE.MeshBasicMaterial({ color: '#f2a93b', transparent: true, opacity: 0.9 }), 7),
  snap: decal(new THREE.MeshBasicMaterial({ color: '#8fd19e', transparent: true, opacity: 0.95 }), 7),
  route: decal(new THREE.MeshBasicMaterial({ color: '#f2a93b', transparent: true, opacity: 0.8 }), 5.5),
  ghostOk: new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.72, color: '#c8ffc8' }),
  ghostBad: new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.6, color: '#ff9c8c' }),
  pol: decal(new THREE.MeshBasicMaterial({ transparent: true, map: canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(115,72,40,0.55)'); gr.addColorStop(1, 'rgba(115,72,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }) }), 5)
};
let ovKey = '';
const FG = {};
function fieldGhost(c) { return FG[c] || (FG[c] = decal(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.7 }), 6)); }
function quadAt(o, mat, pad, y) { const m = new THREE.Mesh(FIELD_GEO, mat); m.position.set(o.x, y || 0, o.z); m.rotation.y = o.rot; m.scale.set(o.w + (pad || 0), 1, o.d + (pad || 0)); m.renderOrder = 6; return m; }
function ringMesh(x, z, r, w, mat) { const m = new THREE.Mesh(new THREE.RingGeometry(Math.max(0.01, r - w), r, 48).rotateX(-Math.PI / 2), mat); m.position.set(x, 0, z); m.renderOrder = 7; m.userData.own = true; return m; }
function lineMesh(pts, w, mat, order) { const out = { pos: [], uv: [], idx: [] }; ribbon(pts, w, 0, 1, out); const m = new THREE.Mesh(flatGeo(out), mat); m.renderOrder = order || 6; m.userData.own = true; return m; }
function clearOV() { OV.children.slice().forEach(m => { OV.remove(m); if (m.userData.own) m.geometry.dispose(); }); }
function polluterTool() { return typeof TOOL !== 'undefined' && (TOOL.k === 'zone' || (TOOL.k === 'place' && TOOL.bt && (BT[TOOL.bt].pol || TOOL.bt === 'school' || TOOL.bt === 'clinic'))); }
function buildOverlays() {
  const pz = polluterTool(), sel = VIEW.sel ? JSON.stringify(VIEW.sel) : '';
  const key = VIEW.ver + ':' + WV.bld + ':' + WV.net + ':' + WV.lots + ':' + sel + ':' + VIEW.route + ':' + pz + ':' + Math.round(Math.log(cam.dist) * 4);
  if (key === ovKey) return;
  ovKey = key;
  clearOV();
  const lw = Math.max(0.1, cam.dist * 0.004);
  if (pz) NET.pol.forEach(s => { const m = new THREE.Mesh(FIELD_GEO, OVM.pol); m.position.set(s.x, 0, s.z); m.scale.set(POL_R * 2 * Math.min(1.4, s.p * 0.5 + 0.6), 1, POL_R * 2 * Math.min(1.4, s.p * 0.5 + 0.6)); m.renderOrder = 5; OV.add(m); });
  if (VIEW.route != null) {
    const r = S.routes.find(q => q.id === VIEW.route), p = r && routePath(r);
    if (p && p.path.length > 1) { OV.add(lineMesh(p.path, lw * 1.6, OVM.route, 5.5)); [p.path[0], p.path[p.path.length - 1]].forEach(q => OV.add(ringMesh(q[0], q[1], lw * 2.2, lw * 1.2, OVM.ring))); }
  }
  if (VIEW.path && VIEW.path.length > 1) OV.add(lineMesh(VIEW.path, Math.max(0.08, cam.dist * 0.0055), VIEW.pathOk ? OVM.path : OVM.bad, 6));
  (VIEW.snaps || []).forEach(s => OV.add(ringMesh(s[0], s[1], lw * 1.8, lw * 0.8, s[2] ? OVM.snap : OVM.ring)));
  if (VIEW.brush) OV.add(ringMesh(VIEW.brush[0], VIEW.brush[1], VIEW.brush[2], Math.max(0.05, lw * 0.5), OVM.ring));
  if (VIEW.zone) VIEW.zone.forEach(c => OV.add(quadAt({ x: c.x, z: c.z, rot: c.rot, w: LOT_W, d: LOT_D }, OVM.zone, 0, 0)));
  if (VIEW.bull) {
    VIEW.bull.b.forEach(b => OV.add(quadAt(bOBB(b), OVM.bull, 0.05)));
    VIEW.bull.lots.forEach(l => OV.add(quadAt(lotOBB(l), OVM.bull, 0)));
    VIEW.bull.segs.forEach(q => { const e = q.e; if (EDGES.has(e.id)) OV.add(lineMesh(polySlice(e.p, e.c, q.s0, Math.max(q.s0 + 0.05, q.s1)), lineW(e) * 1.6, OVM.bull, 6)); });
  }
  const g = VIEW.ghost;
  if (g) {
    const M = model(g.t), gm = new THREE.Mesh(M.geo, g.ok ? OVM.ghostOk : OVM.ghostBad);
    gm.position.set(g.x, 0, g.z); gm.rotation.y = g.rot; gm.renderOrder = 8; OV.add(gm);
    if (M.fields) for (const [fx, fz, fw, fd, crop] of M.fields) { const [x, z] = toWorld(g, fx, fz); OV.add(quadAt({ x, z, rot: g.rot, w: fw, d: fd }, fieldGhost(cropCol(crop, 1)), 0, 0)); }
    OV.add(quadAt({ x: g.x, z: g.z, rot: g.rot, w: BT[g.t].fp[0], d: BT[g.t].fp[1] }, g.ok ? OVM.zone : OVM.bad, 0.06));
    if (BT[g.t].pol) OV.add(ringMesh(g.x, g.z, POL_R, Math.max(0.06, lw * 0.6), OVM.bad));
  }
  const s = VIEW.sel;
  if (s && s.kind === 'b') { const b = BMAP.get(s.id); if (b) { const o = bOBB(b); OV.add(ringMesh(b.x, b.z, Math.hypot(o.w, o.d) / 2 + 0.12, Math.max(0.03, lw * 0.6), OVM.ring)); } }
  if (s && s.kind === 't') { const t = S.towns[s.ti]; if (t) OV.add(ringMesh(t.x, t.z, Math.max(0.9, (t.R || 1) * 0.75), Math.max(0.05, lw * 0.8), OVM.ring)); }
}
function overlayPulse() { const a = 0.55 + 0.4 * Math.sin(NOW / 260); OVM.ring.opacity = a; }

/* ---------- labels and status markers (HTML over the canvas) ---------- */
const LBL = document.getElementById('labels');
const LBLS = [], STATUS = [], NLBL = [];
function syncLabels() {
  while (LBLS.length < S.towns.length) {
    const el = document.createElement('button');
    el.className = 'tl'; el.dataset.ti = String(LBLS.length); el.innerHTML = '<i class="dot"></i><b></b><span></span>';
    LBL.appendChild(el); LBLS.push({ el, b: el.querySelector('b'), s: el.querySelector('span'), d: el.querySelector('.dot'), key: '' });
  }
  if (!NLBL.length) NLAB.forEach(([s, lo, la]) => { const el = document.createElement('div'); el.className = 'nl' + (s === 'BALTIJOS JŪRA' ? ' sea' : ''); el.textContent = s; LBL.appendChild(el); NLBL.push({ el, p: ll2xz(lo, la) }); });
}
function place(el, x, y, show) {
  if (!show) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
  if (el.style.display === 'none') el.style.display = '';
  el.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
}
/* Cities always show their names; towns until the whole country is in view; villages only up close. */
function labelZoom(t) { return t.capital || t.pop0 >= 20 ? 1e9 : t.vil ? 38 : 230; }
function updateLabels() {
  syncLabels();
  const sb = VIEW.sel && VIEW.sel.kind === 'b' ? BMAP.get(VIEW.sel.id) : null;
  S.towns.forEach((t, ti) => {
    const L = LBLS[ti], sel = !!(VIEW.sel && ((VIEW.sel.kind === 't' && VIEW.sel.ti === ti) || (sb && sb.town === ti)));
    if (!sel && cam.dist > labelZoom(t)) { place(L.el, 0, 0, false); return; }
    const [x, y, ok] = toScreen(t.x, t.capital ? 0.5 : t.vil ? 0.36 : 0.4, t.z), on = ok && x > -80 && x < cw + 80 && y > -20 && y < ch + 40;
    place(L.el, x, y, on);
    if (!on) return;
    const bad = !t.lock && (t.note === 'Hungry' || t.note === 'Cold homes'), good = !t.lock && t.note === 'Thriving';
    const lockTxt = S.hist.lost ? 'Germany' : '1923', key = t.n + '|' + (t.lock ? lockTxt : popStr(t.pop)) + '|' + sel + bad + good + t.lock;
    if (key === L.key) return;
    L.key = key; L.b.textContent = t.n.toUpperCase(); L.s.textContent = t.lock ? lockTxt : popStr(t.pop);
    L.el.className = 'tl' + (sel ? ' sel' : '') + (t.lock ? ' lock' : '') + (t.capital ? ' cap' : '') + (t.vil ? ' vil' : t.pop0 < 20 && !t.capital ? ' sm' : '');
    L.d.className = 'dot' + (bad ? ' bad' : good ? ' good' : '');
  });
  NLBL.forEach(n => { const [x, y, ok] = toScreen(n.p[0], 0, n.p[1]); place(n.el, x, y, ok && cam.dist > 140); });
  /* problem markers over buildings */
  let i = 0;
  if (cam.dist < 18) for (const b of S.bld) {
    if (i >= 40) break;
    const T0 = BT[b.t];
    if (b.t === 'house' || b.t === 'hall' || !(T0.w || b.t === 'station' || b.t === 'port' || b.t === 'warehouse')) continue;
    const prob = b.town < 0 || (T0.w && b.eff < 0.35 && b.on) || b.why === 'Storage full';
    if (!prob) continue;
    const [x, y, ok] = toScreen(b.x, model(modelKey(b)).h + 0.08, b.z);
    if (!ok || x < -20 || x > cw + 20 || y < -20 || y > ch + 20) continue;
    let el = STATUS[i];
    if (!el) { el = document.createElement('i'); el.className = 'st'; LBL.appendChild(el); STATUS.push(el); }
    const cls = 'st' + (b.na === 'locked' ? ' lock' : b.why === 'Storage full' ? ' full' : '');
    if (el.className !== cls) { el.className = cls; el.textContent = b.na === 'locked' ? '·' : '!'; }
    place(el, x, y, true); i++;
  }
  for (; i < STATUS.length; i++) place(STATUS[i], 0, 0, false);
}

/* ---------- picking ---------- */
/* Building under a screen point: ray against each footprint box. */
function pickBuilding(sx, sy) {
  const r = rayAt(sx, sy), g = groundAt(sx, sy);
  if (!g) return null;
  let best = null, bt = 1e9;
  const R0 = Math.max(3, cam.dist * 0.2);
  space();
  BH.query(g[0] - R0, g[1] - R0, g[0] + R0, g[1] + R0, b => {
    const o = bOBB(b), h = b.t === 'house' ? (b.lv === 3 ? 0.55 : b.lv === 2 ? 0.26 : 0.18) * MS : model(modelKey(b)).h;
    const ox = r.o.x - b.x, oz = r.o.z - b.z, c = Math.cos(b.rot), s = Math.sin(b.rot);
    const lo = [ox * c - oz * s, r.o.y, ox * s + oz * c], ld = [r.d.x * c - r.d.z * s, r.d.y, r.d.x * s + r.d.z * c];
    const mn = [-o.w / 2, 0, -o.d / 2], mx = [o.w / 2, h, o.d / 2];
    let t0 = 0, t1 = 1e9;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(ld[a]) < 1e-9) { if (lo[a] < mn[a] || lo[a] > mx[a]) return; continue; }
      let ta = (mn[a] - lo[a]) / ld[a], tb = (mx[a] - lo[a]) / ld[a];
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      if (t0 > t1) return;
    }
    if (t0 < bt) { bt = t0; best = b; }
  });
  return best;
}

/* ---------- seasons and the frame ---------- */
let seasonKey = '';
function seasonUpdate() {
  SNOW_U.value += (SEASON.snow - SNOW_U.value) * 0.08;
  const ice = SEASON.snow > 0.75 ? 1 : 0, key = (SEASON.aut > 0.5 ? 1 : 0) + ':' + ice + ':' + WV.kr;
  const fk = farmSeason();
  if (fk !== FARM_PAL.k) { FARM_PAL.k = fk; FARM_COLS[fk].forEach((c, i) => FARM_PAL.value[i].set(c)); }
  if (maskTowns !== S.towns.length) paintMask();
  if (key !== seasonKey) {
    seasonKey = key; paintGround();
    WATER.lake.color.set(ice ? '#d3e5ec' : '#4f97b4'); WATER.lagoon.color.set(ice ? '#a9c9d6' : '#4b8eab');
  } else if (groundCells.length && NOW - lastGround > 1500) patchGround();
}
function initScene() { resize(); SEASON = seasonOf(S.day); SNOW_U.value = SEASON.snow; seasonKey = ''; seasonUpdate(); applyCam(); }
function draw(dt) {
  NOW = performance.now();
  if (!cw || !S) return;
  SEASON = seasonOf(S.day); seasonUpdate();
  camAnimate(dt); applyCam();
  buildBorder(); buildLines(); buildBuildings(); buildLots(); updateTrees(); buildOverlays(); overlayPulse();
  if (typeof drawAgents === 'function') drawAgents(dt);
  updateEffects(dt); updateLabels();
  R3.render(SCENE, CAM3);
}
