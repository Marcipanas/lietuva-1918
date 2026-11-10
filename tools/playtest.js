#!/usr/bin/env node
/* A scripted player, for balance work. It plays the real game headless (tools/headless.js) through the same functions the
   interface calls: it applies the fixes the dashboards offer, plans buildings where people have no work, links towns, sets up
   routes and trade deals, funds the army, picks policies and begins each era when it can. Decision cards are answered as
   history went. It prints one line a year and a summary: how fast the country grows, where the money goes, how long building
   sites wait and for what, and when each era begins.

   usage: node tools/playtest.js [end date, default 1941-01-01] [options]
     --passive     no player at all (history only): the base line
     --wild        answer decision cards at random instead of as history went
     --seed=N      seed for the game's random numbers (default 1)
     --pace=N      player's moves a month (default 6)
     --quiet       only the summary
     --progress    a line a year on stderr while it plays (the table itself is printed at the end)
     --then=FILE   when the game is over, run FILE in it and print what its last expression gives (to look into the end state)
     --save=FILE   write the end state to FILE, as the game saves it
   The numbers depend on the bot's habits as much as on the rules: compare runs, do not read them as targets. */
const path = require('path'), vm = require('vm'), fs = require('fs');
const root = path.join(__dirname, '..');
const args = process.argv.slice(2), flag = n => args.includes('--' + n), val = (n, d) => { const a = args.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const opt = { end: args.find(a => /^\d{4}-\d\d-\d\d$/.test(a)) || '1941-01-01', passive: flag('passive'), wild: flag('wild'), seed: +val('seed', 1), pace: +val('pace', 6), quiet: flag('quiet'), progress: flag('progress'), then: val('then', ''), save: val('save', '') };

/* the same game every run: a seeded Math.random (the sandbox shares Math with this process) */
{ let s = (opt.seed * 2654435761) >>> 0 || 1; Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const { sandbox } = require('./headless.js')(root);
if (opt.progress) sandbox.__tell = s => process.stderr.write(s + '\n');

function bot(opt) {
  const R = { rows: [], sites: [], eras: {}, acts: {}, cards: [], err: [], waits: {} };
  save = function () {};   /* nothing is saved while the bot plays */
  let yAct = {};
  const note = k => { R.acts[k] = (R.acts[k] || 0) + 1; yAct[k] = (yAct[k] || 0) + 1; };
  const hopt = id => Math.max(0, CARDS[id].opts.findIndex(o => o.h));
  const answer = () => {
    for (;;) {
      if (S.hist.news.length) readNews();
      else if (S.hist.cards.length) { const id = S.hist.cards[0], n = opt.wild ? Math.floor(Math.random() * CARDS[id].opts.length) : hopt(id); pickCard(n); R.cards.push(ymd(S.day) + ' ' + id + ':' + n); }
      else if (S.eraCard) act({ act: 'eraok' });
      else break;
    }
  };
  /* money the player keeps for the era, routes and bad days */
  const reserve = () => 400 + Math.max(0, -S.inc) * 30;
  const spare = () => S.funds - reserve();
  const open = ti => { const t = S.towns[ti]; return t && !t.lock; };
  const sites = () => S.bld.filter(b => b.c);
  const siteCount = (bt, ti) => S.bld.filter(b => b.c && !b.c.up && b.t === bt && (ti === undefined || b.town === ti)).length;
  const count = (bt, ti) => S.bld.filter(b => b.t === bt && (ti === undefined || b.town === ti)).length;
  /* what all open plans still need in money: the player does not plan far past what comes in */
  const owed = () => sites().reduce((a, b) => a + (b.c.hold ? 0 : Math.max(0, (b.c.n.lt || 0) - (b.c.g.lt || 0))), 0);
  const canPlan = cost => sites().length < 6 + S.era * 4 && owed() + (cost || 0) < Math.max(1500, spare() + Math.max(0, S.inc) * 120);

  /* a works of this kind stands idle for want of what it uses: feed that one before planning another */
  const starved = bt => !!BT[bt].in && S.bld.some(b => b.t === bt && !b.c && b.on && b.town >= 0 && open(b.town) && b.eff < 0.5 && !!b.lack);
  const born = new Map();
  function placeB(bt, ti) {
    if (!unlocked(bt) || !open(ti) || starved(bt)) return null;
    /* no works that runs on power for a town that gets under four fifths of what it needs: the grid comes first */
    if (BT[bt].powNeed && (S.towns[ti].pr === undefined ? 1 : S.towns[ti].pr) < 0.8) return null;
    setTool('place', bt, ti);
    let b = null;
    /* like a player who reads the action bar: build only where the town in question takes the building in */
    if (PEND && PEND.kind === 'place' && PEND.ok && PEND.jt === ti) {
      const n = S.bld.length; doConfirm();
      if (S.bld.length === n + 1) {
        b = S.bld[S.bld.length - 1]; born.set(b.id, { d: S.day, t: bt, wait: {}, bd: BT[bt].bd });
        /* no road reaches it: the game lays one out; build it when the town can pay */
        if (TOOL.k === 'road' && PEND && PEND.kind === 'line' && !PEND.bad) { if (PEND.ti >= 0 && takePlan(PEND.cost, PEND.ti).ok) { doConfirm(); note('access road'); } }
      }
    }
    setTool('inspect');
    if (b) note('plan ' + bt);
    return b;
  }
  /* zone the free lots of a few streets near the hall */
  function zone(ti) {
    const t = S.towns[ti]; let n = 0, tried = 0;
    setTool('zone'); cam.dist = 8; cam.x = t.x; cam.z = t.z; applyCam();
    for (const e of EDGES.values()) {
      if (e.k !== 'road' || e.off || tried >= 60) continue;
      if (polyClosest(e.p, e.c, t.x, t.z).d > (t.R || 1) + 1) continue;
      const c = lotSpots(e).find(q => Math.hypot(q.x - t.x, q.z - t.z) < (t.R || 1) + 2.5 && lotOk(q, false) && townAtPoint(q.x, q.z) === ti); if (!c) continue;
      tried++; tapTool(c.x, c.z); n = PEND && PEND.n || 0; if (n >= 12) break;
    }
    let ok = false;
    if (n > 0 && PEND && PEND.kind === 'zone' && S.funds >= PEND.cost.lt + reserve()) { doConfirm(); ok = true; }
    setTool('inspect'); return ok;
  }
  const lastBuy = {};
  function applyFix(ti, x) {
    for (const f of x.fix) {
      const a = f.a;
      if (a.act === 'newroute') {
        const n = S.routes.length; if (spare() < 500) continue;
        createRoute(+a.a, +a.b, a.m); if (S.routes.length > n) { note('route'); return true; }
      } else if (a.act === 'rveh') {
        const r = S.routes.find(q => q.id === +a.r); if (!r || r.n >= 5 || spare() < VT[r.vt].cost) continue;
        act({ act: 'rveh', r: String(a.r), d: '1' }); note('vehicle'); return true;
      } else if (a.act === 'linkroad') {
        act({ act: 'linkroad', ti: String(a.ti) });
        const p = PEND, ok = TOOL.k === 'road' && p && p.kind === 'line' && !p.bad && p.ti >= 0 && takePlan(p.cost, p.ti).ok && S.funds - p.cost.lt > reserve();
        if (ok) doConfirm(); setTool('inspect'); TOOL.lv.road = 1; if (ok) { note('link by road'); return true; }
      } else if (a.act === 'build') {
        if (!canPlan(BT[a.bt].cost.lt) || siteCount(a.bt, +a.ti) || count(a.bt, +a.ti) >= 4) continue;
        /* power and the goods towns want are planned for the country as a whole (program), not town by town */
        if (BT[a.bt].pow || WANTS.some(W => PRODUCER[W.r] === a.bt)) continue;
        /* a material the country has plenty of comes by cart: no need for another works */
        const made = Object.keys(BT[a.bt].out || {})[0]; if (made && MATS.includes(made) && made !== 'timber' && totals().stock[made] > 300) continue;
        if (placeB(a.bt, +a.ti)) return true;
      } else if (a.act === 'buy') {
        const k = a.ti + ':' + a.r; if (spare() < buyVal(+a.ti, a.r) + 200 || S.day - (lastBuy[k] || -99) < 14) continue;
        const f0 = S.funds; act({ act: 'buy', ti: String(a.ti), r: a.r }); if (S.funds < f0) { lastBuy[k] = S.day; note('buy ' + a.r); return true; }
      } else if (a.act === 'sell') {
        const f0 = S.funds; act({ act: 'sell', ti: String(a.ti), r: a.r, q: String(a.q) }); if (S.funds > f0) { note('sell ' + a.r); return true; }
      } else if (a.act === 'tool' && a.tool === 'zone') {
        if (zone(+a.ti)) { note('zone'); return true; }
      } else if (a.act === 'rpax') {
        act({ act: 'rpax', r: String(a.r) }); note('commuters'); return true;
      } else if (a.act === 'buildmenu') {
        if (work(+a.ti)) return true;
      }
    }
    return false;
  }
  /* a workplace for a town with people out of work: what the country is short of first, then what sells abroad */
  function work(ti) {
    const t = S.towns[ti], T = totals(), want = [];
    const short = r => T.stock[r] < 100 || (T.dl[r] < -0.5 && T.stock[r] / -T.dl[r] < 200);
    if (short('planks')) want.push('sawmill');
    if (S.era >= 1 && (T.stock.bricks < ERAS[2].req.bricks * 1.5 || short('bricks'))) want.push('brick');
    if (short('peat')) want.push('peat'); if (short('timber')) want.push('forestry');
    if (S.era >= 2) { if (short('flax')) want.push('flax'); if (short('textiles')) want.push('linen'); if (short('beet')) want.push('beet'); if (short('sugar')) want.push('sugar'); want.push('furniture'); }
    if (S.era >= 3) { if (short('cement')) want.push('cement'); if (short('fertiliser')) want.push('fert'); want.push('elec'); }
    if (short('beer')) want.push('brewery');
    want.push('dairy', 'pigs', 'farm', 'potato', 'fishery', 'flax', 'sawmill');
    for (const bt of want) {
      if (!unlocked(bt) || !canPlan(BT[bt].cost.lt) || siteCount(bt, ti) || count(bt, ti) >= 4 || BT[bt].w > (t.unemp || 0) * 2 + 4) continue;
      if (placeB(bt, ti)) return true;
    }
    return false;
  }
  /* A full store: send the surplus to a town with a border post or port that sells it (a route, and a deal there). */
  function exportFrom(ti, r) {
    if (S.hist.path === 'soviet') return false;
    let best = null;
    for (const m in MARKETS) {
      if (!S.mkt[m].open) continue; const p = mktPrice(m, r, 'out'); if (!p) continue;
      for (const g of gateTowns(m)) {
        if (g === ti) { if (!best || p > best.p) best = { g, m, p, mode: '' }; continue; }
        const mode = pairPath('rail', ti, g) ? 'rail' : pairPath('road', ti, g) ? 'road' : ''; if (!mode) continue;
        const len = pairPath(mode, ti, g).len / MAPK, sc = p / (1 + len / (mode === 'rail' ? 300 : 60));
        if (!best || sc > best.sc) best = { g, m, p, mode, sc };
      }
    }
    if (!best) return false;
    if (best.g !== ti && !S.routes.some(q => (q.a === ti && q.b === best.g) || (q.b === ti && q.a === best.g))) {
      if (spare() < (best.mode === 'rail' ? 1500 : 120) + 200) return false;
      const n = S.routes.length; createRoute(ti, best.g, best.mode); if (S.routes.length === n) return false; note('route to a gate');
    }
    if (!S.deals.some(q => q.r === r && q.dir === 'out' && q.ti === best.g)) { const d = addDeal(best.m, r, 'out', 10, best.g); d.lim = 0.25; note('deal out'); }
    return true;
  }
  const RANK = ['hungry', 'cold', 'power', 'crowd', 'room', 'fuel', 'mat', 'site', 'in', 'kept', 'lowfood', 'want', 'jobless', 'staff', 'full'];
  const rank = k => { const i = RANK.indexOf(k.split(':')[0]); return i < 0 ? 99 : i; };
  const tried = new Map();
  function fixPass(max) {
    const L = [];
    S.towns.forEach((t, ti) => { if (t.lock) return; for (const x of townIssues(ti)) { if (x.sev < (t.vil ? 2 : 1)) continue; const k = x.k === 'power' && NET.linked.has(ti) ? 'grid:power' : ti + ':' + x.k; if (S.day - (tried.get(k) || -999) < 20 || L.some(q => q.k === k)) continue; L.push({ ti, x, k }); } });
    L.sort((a, b) => b.x.sev - a.x.sev || rank(a.x.k) - rank(b.x.k) || S.towns[b.ti].pop - S.towns[a.ti].pop);
    let n = 0;
    for (const q of L) {
      if (n >= max) break;
      tried.set(q.k, S.day);
      if (q.x.k === 'full') { const t = S.towns[q.ti], g0 = RES.find(r => (t.stock[r] || 0) >= t.cap * 0.9); if (g0 && exportFrom(q.ti, g0)) { n++; continue; } }
      if (q.x.fix.length && applyFix(q.ti, q.x)) n++;
    }
    return n;
  }
  /* sell what a gate town has too much of; buy metal where factories and sites wait for it */
  function trade() {
    if (S.hist.path === 'soviet') return;
    for (const m in MARKETS) {
      if (!S.mkt[m].open) continue;
      for (const ti of gateTowns(m)) {
        const t = S.towns[ti];
        for (const r in MARKETS[m].buy) {
          const d = S.deals.find(q => q.r === r && q.dir === 'out' && q.ti === ti);
          if (d) { if ((t.stock[r] || 0) > t.cap * 0.85 && d.q < 40) { d.q += 5; note('deal up'); } continue; }
          if ((t.stock[r] || 0) < t.cap * 0.6) continue;
          /* the market that pays most for it */
          let best = m, bp = mktPrice(m, r, 'out');
          for (const m2 in MARKETS) if (S.mkt[m2].open && [...townGates(ti)].some(g => MARKETS[m2].gate.includes(g)) && mktPrice(m2, r, 'out') > bp) { best = m2; bp = mktPrice(m2, r, 'out'); }
          addDeal(best, r, 'out', 5, ti); note('deal out');
        }
      }
    }
    if (S.era >= 2) {
      const needs = new Set();
      S.bld.forEach(b => { if (b.town < 0) return; if (b.c && !b.c.hold && (b.c.n.metal || 0) > (b.c.g.metal || 0)) needs.add(b.town); else if (b.lack === 'metal') needs.add(b.town); });
      needs.forEach(ti => {
        if (S.deals.some(q => q.r === 'metal' && q.dir === 'in' && q.ti === ti)) return;
        for (const m in MARKETS) if (S.mkt[m].open && mktPrice(m, 'metal', 'in') && [...townGates(ti)].some(g => MARKETS[m].gate.includes(g))) { const d = addDeal(m, 'metal', 'in', 2, ti); d.lim = 0.5; note('deal in'); return; }
      });
      /* no gate where metal is needed: bring it in at the gate towns, routes and merchants carry it on */
      if (needs.size && !S.deals.some(q => q.r === 'metal' && q.dir === 'in')) {
        for (const m in MARKETS) { if (!S.mkt[m].open || !mktPrice(m, 'metal', 'in')) continue; const g = gateTowns(m).sort((a, b) => S.towns[b].pop - S.towns[a].pop)[0]; if (g !== undefined) { const d = addDeal(m, 'metal', 'in', 3, g); d.lim = 0.5; note('deal in'); break; } }
      }
    }
  }
  /* a border post where a town sits on a border and has none */
  function posts() {
    if (S.hist.path === 'soviet' || !canPlan(BT.customs.cost.lt) || siteCount('customs')) return;
    const have = new Set(); S.bld.forEach(b => { if (b.t === 'customs' && b.gate) have.add(b.gate); });
    const order = S.towns.map((t, i) => i).filter(i => open(i) && !S.towns[i].vil).sort((a, b) => S.towns[b].pop - S.towns[a].pop);
    for (const ti of order) {
      const t = S.towns[ti], g = borderOf(t.x, t.z);
      if (!g || have.has(g) || !MARKETS[g] || !S.mkt[g] || !S.mkt[g].open) continue;
      if (placeB('customs', ti)) return;
    }
  }
  function state() {
    const h = S.hist;
    if (h.path !== 'soviet') {
      const def = S.inc > 150 ? 50 : S.inc > 60 ? 25 : S.inc > 25 ? 10 : 0; if (def !== h.def) { act({ act: 'def', q: String(def) }); note('army'); }
      for (const k in POLICY) if (polOpen(k) && !h.pol[k] && (S.inc > POLICY[k].cost * 4 || (ERAS[S.era + 1] && ERAS[S.era + 1].req.pol === k && S.inc > POLICY[k].cost))) { act({ act: 'pol', k }); note('policy ' + k); }
      for (const k in POLICY) if (h.pol[k] && S.inc < -5 && S.funds < 500 && !(ERAS[S.era + 1] && ERAS[S.era + 1].req.pol === k)) { act({ act: 'pol', k }); note('policy off'); }
      const now = h.tax === undefined ? 1 : h.tax, tax = S.funds < 300 && S.inc < 5 ? 2 : now === 2 && S.funds < 2500 ? 2 : S.funds > 30000 && pubTrust() < 50 ? 0 : 1; if (tax !== now) { act({ act: 'tax', q: String(tax) }); note('tax ' + TAXES[tax].n); }
    }
    /* the next era, with something left over for its first works */
    if (eraReady() && S.funds >= ERAS[S.era + 1].req.lt + 3000) { act({ act: 'era' }); act({ act: 'eraok' }); R.eras[S.era] = ymd(S.day); note('era'); }
  }
  /* link the nearest unlinked town to the capital's network with a paved road (bricks) or a railway (timber) */
  function link() {
    const req = eraReq(); if (!req || req[1].ok) return;
    let best = null;
    S.towns.forEach((t, ti) => {
      if (t.lock || t.vil || NET.linked.has(ti)) return;
      S.towns.forEach((u, ui) => { if (u.lock || u.vil || !NET.linked.has(ui)) return; const d = Math.hypot(t.x - u.x, t.z - u.z); if (!best || d < best.d) best = { ti, ui, d }; });
    });
    if (!best) return;
    const A = S.towns[best.ui], B = S.towns[best.ti];
    for (const [k, lv] of [['road', 2], ['rail', 1]]) {
      if (k === 'rail' && !count('station', best.ui)) continue;
      TOOL.lv[k] = lv; cam.dist = 60; cam.x = (A.x + B.x) / 2; cam.z = (A.z + B.z) / 2; applyCam(); setTool(k);
      if (k === 'rail') { const st = S.bld.find(b => b.t === 'station' && b.town === best.ui && !b.c), te = st && trackEnd(st, B); if (!te) { setTool('inspect'); continue; } tapTool(te.x, te.z); } else tapTool(A.x, A.z);
      tapTool(B.x, B.z);
      const p = PEND, T = p && p.ti >= 0 ? S.towns[p.ti] : null;
      if (p && (p.kind === 'line') && !p.bad && T && takePlan(p.cost, p.ti).ok && S.funds - p.cost.lt > reserve()) { doConfirm(); setTool('inspect'); TOOL.lv.road = 1; note('link by ' + k); if (k === 'rail' && !count('station', best.ti)) placeB('station', best.ti); return; }
      setTool('inspect');
    }
    TOOL.lv.road = 1;
  }
  /* towns where a peat works can stand by a road: looked up once a year, as a player learns the map */
  let bogs = { day: -999, L: [] };
  function bogTowns() {
    if (S.day - bogs.day > 365) {
      const L = [];
      S.towns.forEach((t, ti) => { if (t.lock || t.vil) return; if (count('peat', ti)) { L.push(ti); return; } setTool('place', 'peat', ti); if (PEND && PEND.kind === 'place' && PEND.ok && PEND.jt === ti) L.push(ti); });
      setTool('inspect'); bogs = { day: S.day, L };
    }
    return bogs.L.filter(open);
  }
  /* What the era's industry needs: power on the capital's grid, the goods towns come to want, and what feeds those works. */
  function program() {
    if (S.era < 2) return;
    const cap = S.towns.findIndex(t => t.capital);
    const madeOf = r => S.towns.reduce((a, t) => a + (t.lock ? 0 : (t.mk && t.mk[r]) || 0), 0);
    const host = (bt, w) => {   /* a linked town big enough to staff it, the one with the most idle hands first */
      const L = S.towns.map((t, i) => i).filter(i => open(i) && !S.towns[i].vil && NET.linked.has(i) && count(bt, i) < 2 && S.towns[i].pop >= (w || 0) * 1.2)
        .sort((a, b) => ((S.towns[b].wf || 0) - (S.towns[b].jobs || 0)) - ((S.towns[a].wf || 0) - (S.towns[a].jobs || 0)));
      for (const ti of L.slice(0, 12)) if (placeB(bt, ti)) return ti;
      return -1;
    };
    const G = gridInfo(cap), coming = G.sites.reduce((a, b) => a + BT[b.t].pow, 0);
    /* A power station where peat is dug, each with a peat works of its own, in the bog town with the most idle hands.
       Only where no bog town can take one: in any town that can staff it, for a route to feed. */
    const hands = i => (S.towns[i].wf || 0) - (S.towns[i].jobs || 0);
    const peatHost = () => {
      const L = bogTowns().filter(i => NET.linked.has(i) && S.towns[i].pop >= 20 && hands(i) > 8).sort((a, b) => hands(b) - hands(a));
      for (const ti of L) { if (count('peat', ti) <= count('power', ti) && !placeB('peat', ti)) continue; if (placeB('power', ti)) return ti; }
      return -1;
    };
    if (G.D > (G.cap + coming) * 0.85 && !G.sites.length && !starved('power') && canPlan(BT.power.cost.lt) && (peatHost() >= 0 || host('power', BT.power.w) >= 0)) return;
    /* stations or kilns stand without peat and no town has any to spare: dig more, where the bog is and hands are free */
    const noPeat = S.bld.some(b => !b.c && b.on && b.town >= 0 && open(b.town) && b.lack === 'peat' && b.eff < 0.5);
    const toSpare = S.towns.some(T => !T.lock && (T.stock.peat || 0) - Math.max(((T.dem || {}).peat || 0) * 6, keptOf(T, 'peat')) >= 20);
    if (noPeat && !toSpare && !siteCount('peat') && canPlan(BT.peat.cost.lt)) {
      for (const ti of bogTowns().filter(i => S.towns[i].pop >= 12 && hands(i) > 4).sort((a, b) => hands(b) - hands(a))) if (placeB('peat', ti)) return;
    }
    for (const W of WANTS) {
      if (W.era > S.era || W.era < 2) continue;
      const bt = PRODUCER[W.r], need = S.towns.reduce((a, t) => a + (t.lock || t.vil ? 0 : t.pop * W.per), 0);
      /* enough works for the need, standing or planned? Then the job is to make them run (the dashboards' fixes), not to add more */
      if (Math.max(madeOf(W.r), count(bt) * BT[bt].out[W.r] * 0.7) >= need * 1.1 || siteCount(bt) || !canPlan(BT[bt].cost.lt)) continue;
      const ti = host(bt, BT[bt].w); if (ti < 0) continue;
      /* what it is made of, grown in the same town where the land allows */
      for (const inp in BT[bt].in) { const src = PRODUCER[inp]; if (src && unlocked(src) && !siteCount(src, ti)) placeB(src, ti); }
      return;
    }
  }
  /* services, power and modernization, a little at a time */
  function invest() {
    const order = S.towns.map((t, i) => i).filter(i => open(i) && !S.towns[i].vil).sort((a, b) => S.towns[b].pop - S.towns[a].pop);
    for (const ti of order) {
      const t = S.towns[ti];
      for (const bt of ['school', 'clinic', 'warehouse']) if (t.pop > (bt === 'warehouse' ? 6 : 4) && !count(bt, ti) && canPlan(BT[bt].cost.lt) && placeB(bt, ti)) return;
    }
    if (S.era >= 2) {
      const b = S.bld.find(q => !q.c && q.town >= 0 && open(q.town) && q.lv < Math.min(3, S.era) && BT[q.t].out && q.eff > 0.8 && q.t !== 'house');
      if (b && canPlan(upCost(b).lt) && sites().filter(q => q.c.up).length < 2) { act({ act: 'up', id: String(b.id) }); if (b.c) note('modernize'); }
    }
  }
  /* era goals the player works toward: bricks in store for Industrialization, cloth for Modern Lithuania */
  function goals() {
    const T = totals(), need = S.era === 1 ? [['bricks', 'brick']] : S.era === 2 ? [['bricks', 'brick'], ['textiles', 'linen'], ['flax', 'flax']] : [];
    for (const [r, bt] of need) {
      if (T.dl[r] > 1 || siteCount(bt) || !canPlan(BT[bt].cost.lt)) continue;
      const order = S.towns.map((t, i) => i).filter(i => open(i) && !S.towns[i].vil && (S.towns[i].unemp || 0) > 0.3).sort((a, b) => S.towns[b].unemp - S.towns[a].unemp);
      for (const ti of order.slice(0, 8)) if (placeB(bt, ti)) return;
    }
  }

  /* ---- the run ---- */
  S.intro = 0; S.speed = 1;
  const end = Math.round((Date.parse(opt.end) - START) / 864e5), t0 = Date.now();
  let lastYear = 1918, built0 = 0, ticks = 0, hungry = 0, cold = 0;
  const yearRow = () => {
    const T = totals(), towns = S.towns.filter(t => !t.lock && !t.vil), iss = natIssues();
    const row = { y: ymd(S.day), era: S.era, pop: Math.round(T.pop), funds: Math.round(S.funds), inc: +S.inc.toFixed(0), bud: Object.fromEntries(Object.entries(S.bud).map(([k, v]) => [k, Math.round(v)])),
      morale: Math.round(towns.reduce((a, t) => a + t.h, 0) / Math.max(1, towns.length)), trust: Math.round(S.hist.path === 'soviet' ? S.hist.trust : pubTrust()), sec: Math.round(S.hist.sec),
      linked: T.linked + '/' + T.towns, sites: sites().length, built: (S.stats.built || 0) - built0, urgent: iss.filter(q => q.sev >= 2).reduce((a, q) => a + q.towns.length, 0),
      held: iss.filter(q => q.sev === 1).map(q => q.k + ' ' + q.towns.length).join(', '), acts: yAct, stock: Object.fromEntries(MATS.concat(['beer', 'sugar', 'textiles', 'electronics']).map(r => [r, Math.round(T.stock[r])])),
      routes: S.routes.length, deals: S.deals.length, path: S.hist.path, gov: S.hist.gov };
    R.rows.push(row); built0 = S.stats.built || 0; yAct = {};
    if (typeof __tell === 'function') __tell(`${row.y}  era ${row.era}  ${row.pop}k residents  ${row.funds} Lt  ${row.sites} sites`);
  };
  try {
    while (S.day < end) {
      tick(); ticks++; answer(); NOTES.length = 0;
      /* how long each plan waits, and for what */
      for (const b of S.bld) { if (!b.c || b.c.up) continue; const q = born.get(b.id); if (!q || b.cw === 'Building') continue; const hf = b.hf || {}; (b.wait || []).forEach(k => { const kk = k !== 'lt' && hf[k] !== undefined ? 'carts' : k; q.wait[kk] = (q.wait[kk] || 0) + 1; }); }
      born.forEach((q, id) => { const b = BMAP.get(id); if (!b) { born.delete(id); return; } if (!b.c) { R.sites.push({ t: q.t, days: S.day - q.d, bd: q.bd, wait: q.wait }); for (const k in q.wait) R.waits[k] = (R.waits[k] || 0) + q.wait[k]; born.delete(id); } });
      hungry += S.towns.filter(t => !t.lock && t.fed < 0.97).length; cold += S.towns.filter(t => !t.lock && seasonOf(S.day).heat > 0.05 && t.heat < 0.9).length;
      for (const t of S.towns) if (!isFinite(t.pop) || !isFinite(t.h) || RES.some(r => !isFinite(t.stock[r] || 0) || (t.stock[r] || 0) < -1e-6)) { R.err.push(ymd(S.day) + ' bad numbers in ' + t.n); break; }
      if (!isFinite(S.funds)) R.err.push(ymd(S.day) + ' funds not finite');
      if (!opt.passive) {
        const step = Math.max(1, Math.round(30 / opt.pace));
        if (S.day % step === 0) fixPass(1);
        if (S.day % 30 === 3) { analyze(); state(); trade(); posts(); link(); program(); goals(); invest(); }
      }
      const y = dOf(S.day).getUTCFullYear(); if (y !== lastYear) { lastYear = y; yearRow(); }
      if (R.err.length > 5) break;
    }
  } catch (e) { R.err.push(ymd(S.day) + ' ' + (e.stack || e)); }
  yearRow();
  R.ms = (Date.now() - t0) / Math.max(1, ticks); R.ticks = ticks; R.hungry = hungry; R.cold = cold;
  R.open = sites().map(b => BT[b.t].n + ' in ' + (b.town >= 0 ? S.towns[b.town].n : '?') + ': ' + siteTxt(b));
  R.bld = {}; S.bld.forEach(b => { if (b.t !== 'house' && b.t !== 'landmark' && b.t !== 'hall' && b.town >= 0 && !S.towns[b.town].lock && !b.c) R.bld[b.t] = (R.bld[b.t] || 0) + 1; });
  R.why = {}; S.bld.forEach(b => { if (b.t === 'house' || b.t === 'landmark' || b.t === 'hall' || b.town < 0 || S.towns[b.town].lock || b.c || IDLE.has(b.t)) return; if (b.eff < 0.5) R.why[b.why] = (R.why[b.why] || 0) + 1; });
  R.obj = OBJ.filter(o => S.obj[o.id]).map(o => o.id); R.log = S.log.slice(0, 12).map(l => ymd(l.d) + ' ' + l.t);
  return R;
}

const R = vm.runInContext('(' + bot.toString() + ')(' + JSON.stringify(opt) + ')', sandbox, { filename: 'playtest-bot' });
const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);
if (!opt.quiet) {
  console.log(pad('date', 11) + lpad('era', 4) + lpad('pop k', 7) + lpad('funds', 9) + lpad('Lt/day', 8) + lpad('tax', 6) + lpad('trade', 7) + lpad('upkeep', 8) + lpad('state', 7) + lpad('morale', 7) + lpad('trust', 6) + lpad('linked', 8) + lpad('sites', 6) + lpad('built', 6) + lpad('urgent', 7) + '  held back');
  for (const r of R.rows) {
    const b = r.bud;
    console.log(pad(r.y, 11) + lpad(r.era, 4) + lpad(r.pop, 7) + lpad(r.funds, 9) + lpad(r.inc, 8) + lpad(b.tax, 6) + lpad(b.trade, 7) + lpad((b.bld || 0) + (b.lines || 0) + (b.routes || 0), 8) + lpad((b.army || 0) + (b.policy || 0), 7) + lpad(r.morale, 7) + lpad(r.trust, 6) + lpad(r.linked, 8) + lpad(r.sites, 6) + lpad(r.built, 6) + lpad(r.urgent, 7) + '  ' + r.held);
    const a = Object.entries(r.acts).map(([k, n]) => k + (n > 1 ? ' ×' + n : '')).join(', ');
    if (a) console.log('           moves: ' + a);
    console.log('           stock: ' + Object.entries(r.stock).filter(([k, v]) => v > 0).map(([k, v]) => k + ' ' + v).join(', ') + ` · ${r.routes} routes, ${r.deals} deals · ${r.path}, ${r.gov}`);
  }
}
const days = R.sites.map(s => s.days), med = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
console.log(`\n${R.ticks} days played at ${R.ms.toFixed(1)} ms a day. Eras began: ${Object.entries(R.eras).map(([k, v]) => k + ' on ' + v).join(', ') || 'none'}.`);
console.log(`Sites finished: ${R.sites.length}. Days from plan to done: median ${med(days)}, longest ${Math.max(0, ...days)}; the work itself: median ${med(R.sites.map(s => s.bd))} days.`);
console.log('Site-days spent waiting, by what was missing: ' + (Object.entries(R.waits).sort((a, b) => b[1] - a[1]).map(([k, n]) => (k === 'lt' ? 'money' : k) + ' ' + n).join(', ') || 'none'));
console.log('Moves: ' + Object.entries(R.acts).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ×' + n).join(', '));
console.log('Working buildings: ' + Object.entries(R.bld).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ' + n).join(', '));
console.log('Buildings under half strength, by reason: ' + (Object.entries(R.why).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ' + n).join(', ') || 'none'));
console.log(`Town-days hungry: ${R.hungry}; cold: ${R.cold}. Ministry tasks done: ${R.obj.join(', ') || 'none'}.`);
if (R.open.length) console.log('Still open: ' + R.open.slice(0, 12).join(' | '));
console.log('Cards: ' + R.cards.join(', '));
if (opt.save) fs.writeFileSync(opt.save, vm.runInContext('JSON.stringify(serialize(), SAVE_NUM)', sandbox));
if (opt.then) { const out = vm.runInContext(fs.readFileSync(opt.then, 'utf8'), sandbox, { filename: opt.then }); console.log('\n' + (typeof out === 'string' ? out : JSON.stringify(out, null, 1))); }
if (R.err.length) { console.error('\nErrors:\n' + R.err.join('\n')); process.exit(1); }
