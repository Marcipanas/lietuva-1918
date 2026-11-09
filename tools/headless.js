/* The game in a stub browser, for the tools (smoke test, playtest). Loads every script of index.html into one vm context,
   one script at a time, exactly like separate <script> tags. three.js runs for real and builds every mesh; only the WebGL
   renderer is replaced. Returns { sandbox, order }: run code in the game's global scope with vm.runInContext(code, sandbox). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const noop = () => {};
const ctx2d = () => new Proxy({}, {
  get: (t, p) => {
    if (p in t) return t[p];
    if (p === 'measureText') return () => ({ width: 30 });
    if (p === 'createImageData' || p === 'getImageData') return (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop: noop });
    return noop;
  },
  set: (t, p, v) => { t[p] = v; return true; }
});
function el(id) {
  const kids = [], full = id === 'cv' || id === 'stage';
  return {
    id, hidden: true, innerHTML: '', textContent: '', value: '0', className: '', dataset: {}, style: { setProperty: noop }, width: 300, height: 150,
    classList: { toggle: noop, add: noop, remove: noop, contains: () => false },
    addEventListener: noop, setPointerCapture: noop, appendChild: c => { kids.push(c); return c; }, firstElementChild: { style: {} },
    setAttribute: noop, getAttribute: () => null, scrollIntoView: noop,
    getContext: () => ctx2d(),
    /* the map fills a 390 by 700 phone screen; panels are closed (no height) */
    getBoundingClientRect: () => full ? { width: 390, height: 700, left: 0, top: 0, right: 390, bottom: 700 } : { width: 390, height: 0, left: 0, top: 700, right: 390, bottom: 700 },
    querySelector: () => el('q'), querySelectorAll: () => [], closest: () => null
  };
}
module.exports = function boot(root) {
  const els = {};
  const sandbox = {
    console, Math, Date, JSON, btoa, atob, performance, setTimeout: () => 0, clearTimeout: noop,
    document: { getElementById: id => els[id] || (els[id] = el(id)), querySelector: s => el(s), querySelectorAll: () => [], createElement: t => el(t), addEventListener: noop,
      body: el('body'), documentElement: el('html'), fonts: { ready: { then: noop } }, hidden: false },
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    window: { devicePixelRatio: 2, innerWidth: 390, addEventListener: noop, ResizeObserver: class { observe() {} } },
    localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; },
      key(i) { return Object.keys(this._d)[i] ?? null; }, get length() { return Object.keys(this._d).length; } },
    requestAnimationFrame: cb => { sandbox.rafCb = cb; }
  };
  vm.createContext(sandbox);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const order = [...html.matchAll(/<script src="((?:js|vendor)\/[^"]+)"><\/script>/g)].map(m => m[1]);
  for (const f of order) {
    try { vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f }); }
    catch (e) { console.error(`✗ ${f} failed to load: ${e.stack || e.message}`); process.exit(1); }
    if (f.startsWith('vendor/three')) {
      /* no WebGL here: a renderer that draws nothing */
      sandbox.THREE.WebGLRenderer = class {
        constructor(o) { this.domElement = o && o.canvas; this.shadowMap = {}; this.capabilities = { getMaxAnisotropy: () => 4 }; this.calls = 0; }
        setPixelRatio() {} getPixelRatio() { return 2; } setSize() {} render() { this.calls++; } dispose() {}
      };
    }
  }
  return { sandbox, order };
};
