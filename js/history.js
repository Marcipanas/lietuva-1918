'use strict';
/* Lietuva 1918 — history and foreign trade. Runs headless like sim.js (no DOM, no THREE):
   - markets abroad, opened and closed by history; a market pays less once it is flooded
   - trade deals: goods leave or arrive through a border post or a sea port, from that town's stock
   - the timeline: dated events, and decision cards that pause the game until the player picks an option
   - security, which can turn back the ultimatums of 1938 to 1940
   - the Soviet path: occupation, war, and yearly state plans for deliveries to the Union
   Dates are real. Choices that differ from what happened are marked as such in the card text. */

/* ---------- markets abroad ---------- */
/* buy: what a market pays for our goods, sell: what it charges for its own (× normal price). gate: how goods get there. */
const MARKETS = {
  de: { n: 'Germany', gate: ['de', 'sea'], buy: { grain: 1, potatoes: 0.9, dairy: 1.1, meat: 1.25, timber: 1.2, flax: 1.1, fish: 0.9 }, sell: { metal: 1.1, textiles: 1.15, furniture: 1.2, electronics: 1.4 } },
  gb: { n: 'Britain', gate: ['sea'], buy: { dairy: 1.4, meat: 1.45, timber: 1.1, flax: 1.25, grain: 0.9, textiles: 1.1 }, sell: { metal: 1.15, textiles: 1.05, electronics: 1.3 } },
  lv: { n: 'Latvia', gate: ['lv'], buy: { grain: 1.2, potatoes: 1.15, meat: 1, bricks: 1.15, peat: 1.1, timber: 0.9 }, sell: { fish: 1, textiles: 1.25, metal: 1.3 } },
  pl: { n: 'Poland', gate: ['pl'], buy: { timber: 1.15, flax: 1.05, dairy: 1, furniture: 1.1 }, sell: { metal: 1.2, textiles: 1, bricks: 1.1 } },
  su: { n: 'The Union', gate: ['rail'], buy: { grain: 0.7, potatoes: 0.6, dairy: 0.7, meat: 0.7, timber: 0.7, bricks: 0.7, flax: 0.7, textiles: 0.7, furniture: 0.7, electronics: 0.75 },
    sell: { metal: 0.8, textiles: 0.9, electronics: 0.9 } }
};
const GATE_N = { sea: 'a sea port', de: 'a border post on the East Prussian border', lv: 'a border post on the Latvian border', pl: 'a border post on the Polish border', rail: 'a railway station' };
/* Loads a day one market takes of one good at full price; more sells at half price. Duty on exports. */
const MKT_CAP = 20, DUTY = 0.1;
const FOODS = new Set(FOOD);

/* The market across the nearest border: Latvia, East Prussia (Germany), or Poland (which also held the Belarusian side between the wars). */
function borderOf(x, z) {
  let best = null, bd = 1e9;
  forDisk(x, z, 3.5, (k, d) => { if (CTY[k] > 1 && d < bd) { bd = d; best = k; } });
  return best === null ? '' : CTY_GATE[CTY[best]];
}
/* How town ti reaches markets: 'sea' for a port, a country code for a border post, 'rail' for a station. */
function townGates(ti) {
  const g = new Set();
  for (const b of S.bld) {
    if (b.town !== ti) continue;
    if (b.t === 'port') g.add('sea'); else if (b.t === 'customs' && b.gate) g.add(b.gate); else if (b.t === 'station') g.add('rail');
  }
  return g;
}
function gateTowns(m) { const out = []; S.towns.forEach((t, n) => { if (!t.lock && [...townGates(n)].some(g => MARKETS[m].gate.includes(g))) out.push(n); }); return out; }
/* Farm prices abroad fell about threefold in the Depression; this follows them year by year. */
const DEPRESSION = { 1930: 0.7, 1931: 0.55, 1932: 0.42, 1933: 0.4, 1934: 0.45, 1935: 0.55, 1936: 0.75, 1937: 0.9 };
function depAt(r) {
  if (S.hist.path === 'soviet') return 1;
  const f = DEPRESSION[dOf(S.day).getUTCFullYear()] || 1;
  return FOODS.has(r) || r === 'flax' ? f : 0.5 + f * 0.5;
}
/* Price for one load of r: what market m pays (dir 'out') or charges ('in'). 0 when it does not trade in r. */
function mktPrice(m, r, dir) {
  const M = MARKETS[m], f = dir === 'out' ? M.buy[r] : M.sell[r], s = S.mkt[m];
  if (!f || !s) return 0;
  return RI[r].p * f * (dir === 'out' ? (s.f || 1) * depAt(r) * (1 - DUTY) : 1);
}
function newMarkets() {
  return { de: { open: 1, f: 1, why: '' }, gb: { open: 1, f: 1, why: '' }, lv: { open: 1, f: 1, why: '' }, pl: { open: 0, f: 1, why: 'No relations with Poland' },
    su: { open: 0, f: 1, why: 'Only under Soviet rule' } };
}
function setMkt(m, open, why, f) { const s = S.mkt[m]; s.open = open ? 1 : 0; s.why = open ? '' : why || 'Closed'; if (f !== undefined) s.f = f; }

/* ---------- trade deals: a standing order to sell or buy so many loads a day through one town ---------- */
function addDeal(m, r, dir, q, ti) { const d = { id: S.did++, m, r, dir, q, ti, done: 0, val: 0, why: '' }; S.deals.push(d); return d; }
function runDeals() {
  const vol = {};
  for (const d of S.deals) {
    d.done = 0; d.val = 0; d.why = '';
    const s = S.mkt[d.m], t = S.towns[d.ti];
    if (!s || !s.open) { d.why = s ? s.why : 'Closed'; continue; }
    if (!t || t.lock) { d.why = 'Town is not part of Lithuania'; continue; }
    if (![...townGates(d.ti)].some(g => MARKETS[d.m].gate.includes(g))) { d.why = `${t.n} needs ${GATE_N[MARKETS[d.m].gate[0]]}`; continue; }
    const p = mktPrice(d.m, d.r, d.dir);
    if (!p) { d.why = 'Not traded there'; continue; }
    if (d.dir === 'out') {
      const keep = (t.dem[d.r] || 0) * 10, q = Math.min(d.q, (t.stock[d.r] || 0) - keep);
      if (q <= 0.01) { d.why = `No ${rname(d.r)} to spare in ${t.n}`; continue; }
      const k = d.m + d.r, v0 = vol[k] || 0, full = Math.max(0, Math.min(q, MKT_CAP - v0)), val = p * (full + (q - full) * 0.5);
      t.stock[d.r] -= q; vol[k] = v0 + q; S.funds += val; d.done = q; d.val = val;
      S.hist.exp[d.m] = (S.hist.exp[d.m] || 0) + val;
      if (d.m === 'su' && S.plan) S.plan.got[d.r] = (S.plan.got[d.r] || 0) + q;
    } else {
      const q = Math.min(d.q, room(t, d.r)), cost = p * q;
      if (q <= 0.01) { d.why = `Storage in ${t.n} is full`; continue; }
      if (S.funds < cost) { d.why = 'Not enough money'; continue; }
      S.funds -= cost; t.stock[d.r] = (t.stock[d.r] || 0) + q; d.done = q; d.val = -cost;
    }
  }
}

/* ---------- the state of history ---------- */
function newHistory() {
  return { path: 'free', sec: 15, def: 0, ally: 0, trust: 50, exp: {}, expY: 0, war: 0, purge: 0, collect: 0, mood: [], cards: [], spd: 1, picks: {}, unl: {}, proj: [], lost: 0, sup: 0 };
}
/* Morale changes from history: [{v, until (day), vil (villages only), reg}] */
function addMood(v, days, o) { S.hist.mood.push(Object.assign({ v, until: S.day + days }, o || {})); }
function histMood(t) {
  let h = 0;
  for (const m of S.hist.mood) if (S.day <= m.until && (!m.vil || t.vil) && (!m.reg || m.reg === t.reg)) h += m.v;
  if (S.hist.path === 'soviet') h -= 3;
  if (S.hist.war) h -= 12;
  return h;
}
/* Output of buildings, and of a settlement's own fields */
function histProd() { return (S.hist.war ? 1 - 0.4 * S.hist.war : 1) * (S.day < S.hist.purge ? 0.9 : 1); }
function histSub(t) { const c = S.hist.collect; return t.vil && c ? (dOf(S.day).getUTCFullYear() < 1955 ? 0.85 : 1.15) : 1; }
function histTax() { return S.hist.war ? 0.5 : 1; }
/* Population losses from war and deportation: people and the land that fed them */
function popHit(f, vilOnly) { S.towns.forEach(t => { if (t.lock || (vilOnly && !t.vil)) return; t.pop *= 1 - f; t.pop0 *= 1 - f; }); }
function loseKlaipeda() {
  S.kr = true; S.hist.lost = 1;
  S.towns.forEach(t => { if (t.kr) { t.lock = 1; t.pop = 0; } });
  S.deals = S.deals.filter(d => !S.towns[d.ti].kr);
  NET.dirty = true; WV.kr++;
}
function sovietize() {
  const h = S.hist;
  if (h.path === 'soviet') return;
  h.path = 'soviet'; h.def = 0; h.ally = 0;
  ['de', 'gb', 'lv', 'pl'].forEach(m => setMkt(m, 0, 'Soviet rule: trade goes through Moscow'));
  setMkt('su', 1);
  S.deals = S.deals.filter(d => d.m === 'su');
}
function onPath(p) { return () => S.hist.path === p; }
const notSoviet = () => S.hist.path !== 'soviet';

/* ---------- decision cards ---------- */
/* Each option: t (button), d (what happens), risk: {sec} for options that work only with enough security, go(ok). */
const CARDS = {
  depression: { t: 'The Depression reaches the farms', when: '1930',
    txt: 'Prices for butter, bacon and grain are collapsing abroad. Farmers cannot pay their debts.',
    opts: [
      { t: 'Buy up farm produce', d: 'The state pays 15 Lt a day for five years. Farmers stay calm.', go: () => { S.hist.sup = S.day + 5 * 365; } },
      { t: 'Balance the budget', d: 'No cost now. Morale falls by 8 for five years, and farmers may strike.', go: () => { addMood(-8, 5 * 365); } }] },
  entente: { t: 'The Baltic Entente', when: '1934-09-12',
    txt: 'Latvia and Estonia propose a treaty of good understanding and cooperation.',
    opts: [
      { t: 'Sign the treaty', d: 'What happened. Security +8. Latvia pays 10% more for our goods.', go: () => { S.hist.sec += 8; S.mkt.lv.f *= 1.1; } },
      { t: 'Propose a defence alliance', d: 'Did not happen. Security +18, but joint defence costs 10 Lt a day from now on.', go: () => { S.hist.sec += 18; S.hist.ally = 10; S.mkt.lv.f *= 1.15; } },
      { t: 'Stay apart', d: 'Nothing changes.', go: () => {} }] },
  trial: { t: 'The Nazi plot in Klaipėda', when: '1934-12-24',
    txt: 'Ernst Neumann, Theodor von Sass and other Nazi activists stand accused of plotting to hand the Klaipėda Region to Germany. Germany, our biggest customer, warns of consequences.',
    opts: [
      { t: 'Let the trial go ahead', d: 'What happened. Security +6. Germany stops buying our goods until a new treaty in 1936. Britain buys 10% more.', go: () => { S.hist.sec += 6; setMkt('de', 0, 'German boycott after the Klaipėda trial'); S.hist.boycott = 1; S.mkt.gb.f *= 1.1; } },
      { t: 'Drop the charges', d: 'Did not happen. Trade with Germany goes on, but security −10 and morale −5 for a year.', go: () => { S.hist.sec -= 10; addMood(-5, 365); } }] },
  poland: { t: 'Polish ultimatum', when: '1938-03-17',
    txt: 'Poland demands diplomatic relations within 48 hours, or else. The border has been closed since 1920.',
    opts: [
      { t: 'Accept', d: 'What happened. The Polish border opens for trade. Security +3.', go: () => { setMkt('pl', 1); S.hist.sec += 3; } },
      { t: 'Refuse', d: 'Did not happen. Works with security 40 or more: Poland backs down. If not: border clashes cost 3,000 Lt and security −10, and we accept anyway.', risk: { sec: 40 },
        go: ok => { if (ok) { S.hist.sec += 5; log('Poland backs down. The border stays closed.', 'good'); } else { S.funds -= 3000; S.hist.sec -= 10; setMkt('pl', 1); log('Polish troops mass on the border. After clashes, Lithuania accepts the ultimatum.', 'warn'); } } }] },
  klaipeda: { t: 'German ultimatum on Klaipėda', when: '1939-03-20',
    txt: 'Germany demands the Klaipėda Region and its port, and threatens to take them by force.',
    when2: () => !S.hist.lost && S.towns.some(t => t.kr && !t.lock),
    opts: [
      { t: 'Hand over the region', d: 'What happened. The Klaipėda Region, its towns and its port go to Germany. Security −5.', go: () => { loseKlaipeda(); S.hist.sec -= 5; } },
      { t: 'Refuse', d: 'Did not happen. Works with security 60 or more: Germany backs off. If not: the region is taken by force, with losses of 5,000 Lt, and security −10.', risk: { sec: 60 },
        go: ok => { if (ok) { S.hist.sec += 10; log('Britain and France stand by Lithuania. Germany backs off from Klaipėda.', 'good'); } else { loseKlaipeda(); S.funds -= 5000; S.hist.sec -= 10; log('German troops take Klaipėda by force.', 'warn'); } } }] },
  bases: { t: 'Soviet bases', when: '1939-10-10',
    txt: 'Poland has been divided between Germany and the Soviet Union. Moscow offers to hand Vilnius over and demands bases for 20,000 Red Army soldiers on Lithuanian soil.',
    when2: notSoviet,
    opts: [
      { t: 'Accept the bases', d: 'What happened. Security −30. Trade with the Soviet Union opens.', go: () => { S.hist.sec -= 30; S.hist.bases = 1; setMkt('su', 1, '', 0.9); } },
      { t: 'Refuse, and declare neutrality', d: 'Did not happen. Works with security 70 or more. If not: the Red Army crosses the border at once and Lithuania is occupied.', risk: { sec: 70 },
        go: ok => { if (ok) { S.hist.sec += 5; log('Moscow drops its demand. Lithuania stays neutral.', 'good'); } else { log('The Red Army crosses the border. Lithuania is occupied.', 'warn'); popHit(0.02); sovietize(); } } }] },
  ultimatum: { t: 'Soviet ultimatum', when: '1940-06-14',
    txt: 'Moscow accuses Lithuania of plotting against it, and demands a new government and free entry for any number of Red Army troops.',
    when2: notSoviet,
    opts: [
      { t: 'Accept', d: 'What happened. The Red Army occupies Lithuania the next day. The country becomes a Soviet republic with a planned economy.', go: () => { log('The Red Army occupies Lithuania.', 'hist'); sovietize(); } },
      { t: 'Resist', d: 'Did not happen. Works with security 80 or more and no Soviet bases. If not: the army is crushed, half the treasury is lost and Lithuania is occupied.', risk: { sec: 80 },
        go: ok => { if (ok && !S.hist.bases) { S.hist.path = 'neutral'; S.hist.sec += 5; log('The Red Army does not cross. Lithuania stays independent and neutral. This did not happen.', 'good'); }
          else { S.funds = Math.min(S.funds, S.funds * 0.5); popHit(0.03); log('The army fights for a week and is crushed. Lithuania is occupied.', 'warn'); sovietize(); } } }] },
  collect: { t: 'Collective farms', when: '1947',
    txt: 'Moscow orders the farms of Soviet Lithuania joined into collective farms, as in the rest of the Union.',
    when2: onPath('soviet'),
    opts: [
      { t: 'Collectivize at once', d: 'What happened. Party trust +10. Village fields yield 15% less until 1955, then 15% more with tractors. Village morale −10 for five years.', go: () => { S.hist.collect = 1; S.hist.trust += 10; addMood(-10, 5 * 365, { vil: 1 }); } },
      { t: 'Go slowly', d: 'Did not happen. Party trust −15 and the food plan rises by a fifth.', go: () => { S.hist.trust -= 15; S.hist.slow = 1; } }] },
  hydro: { t: 'A dam on the Nemunas', when: '1955',
    txt: 'Moscow plans a hydro power station on the Nemunas at Kaunas and offers to pay most of it.',
    when2: onPath('soviet'),
    opts: [
      { t: 'Build it by 1960', d: 'Moscow grants 6,000 Lt and unlocks the hydro dam. Build one within 25 km of Kaunas by the end of 1960. Done: trust +15 and 3,000 Lt. Late: trust −20.', go: () => project('hydro', 'kau', 25, 1960, 6000, 3000) },
      { t: 'Ask for a delay', d: 'Party trust −10.', go: () => { S.hist.trust -= 10; } }] },
  power: { t: 'A big power station', when: '1960',
    txt: 'Moscow plans a large power station near Elektrėnai, between Kaunas and Vilnius.',
    when2: onPath('soviet'),
    opts: [
      { t: 'Build it by 1962', d: 'Moscow grants 2,500 Lt and unlocks power stations. Build one within 30 km of Kaišiadorys by the end of 1962. Done: trust +15 and 2,000 Lt. Late: trust −20.', go: () => project('power', 'kai', 30, 1962, 2500, 2000) },
      { t: 'Ask for a delay', d: 'Party trust −10.', go: () => { S.hist.trust -= 10; } }] },
  nuclear: { t: 'A nuclear power plant', when: '1974',
    txt: 'Moscow plans a nuclear power plant on Lake Drūkšiai, in the far north-east, to power the whole region.',
    when2: onPath('soviet'),
    opts: [
      { t: 'Build it by 1983', d: 'Moscow grants 25,000 Lt and unlocks nuclear power. Build a plant within 40 km of Zarasai by the end of 1983. Done: trust +20 and 8,000 Lt. Late: trust −20.', go: () => project('nuclear', 'zar', 40, 1983, 25000, 8000) },
      { t: 'Ask for a delay', d: 'Party trust −10.', go: () => { S.hist.trust -= 10; } }] }
};
function cardOK(id) { const c = CARDS[id]; return !c.when2 || c.when2(); }
/* Pick option n of the card on top of the queue. */
function pickCard(n) {
  const h = S.hist, id = h.cards[0], c = id && CARDS[id], o = c && c.opts[n];
  if (!o) return false;
  h.cards.shift(); h.picks[id] = n;
  const ok = !o.risk || h.sec >= o.risk.sec;
  log(`${c.t}: ${o.t.toLowerCase()}.`, 'hist', c.when.length === 4);
  o.go(ok);
  h.sec = clamp(h.sec, 0, 100); h.trust = clamp(h.trust, 0, 100);
  if (!h.cards.length && h.spd) S.speed = h.spd;
  NET.dirty = true;
  return true;
}
function queueCard(id) {
  const h = S.hist;
  if (h.picks[id] !== undefined || h.cards.includes(id) || !cardOK(id)) return;
  if (!h.cards.length) h.spd = S.speed || h.spd || 1;
  h.cards.push(id); S.speed = 0;
}

/* ---------- Union projects: build a given building near a town by a deadline ---------- */
function project(type, near, r, year, grant, reward) {
  S.hist.unl[type] = 1; S.funds += grant;
  S.hist.proj.push({ type, near, r, by: Date.UTC(year, 11, 31), grant, reward, done: 0 });
}
function checkProjects() {
  for (const p of S.hist.proj) {
    if (p.done) continue;
    const t = S.towns[tIdx(p.near)], ok = t && S.bld.some(b => b.t === p.type && Math.hypot(b.x - t.x, b.z - t.z) <= p.r);
    if (ok) { p.done = 1; S.hist.trust += p.type === 'nuclear' ? 20 : 15; S.funds += p.reward; log(`Moscow praises the new ${BT[p.type].n.toLowerCase()} and sends ${fmt(p.reward)} Lt.`, 'good'); }
    else if (dOf(S.day).getTime() > p.by) { p.done = -1; S.hist.trust -= 20; log(`The ${BT[p.type].n.toLowerCase()} is not ready on time. Party trust falls.`, 'warn'); }
  }
}

/* ---------- the Soviet state plan ---------- */
function planName(y) {
  return y <= 1950 ? '4th Five-Year Plan' : y <= 1955 ? '5th Five-Year Plan' : y <= 1958 ? '6th Five-Year Plan' : y <= 1965 ? 'Seven-Year Plan'
    : y <= 1970 ? '8th Five-Year Plan' : y <= 1975 ? '9th Five-Year Plan' : y <= 1980 ? '10th Five-Year Plan' : y <= 1985 ? '11th Five-Year Plan' : '12th Five-Year Plan';
}
/* Deliveries the Union asks for in a year: a share of what the republic can make, rising with each plan */
function planTargets(y) {
  const pop = totals().pop, k = (pop / 700) * (1 + 0.04 * (y - 1946)), food = S.hist.slow ? 1.2 : 1, out = { grain: 1100 * food, dairy: 700 * food, meat: 500 * food, timber: 1100, bricks: 550 };
  if (S.era >= 2) { out.textiles = 400; out.furniture = 300; }
  if (S.era >= 3) out.electronics = 250;
  for (const r in out) out[r] = Math.round(out[r] * k / 10) * 10;
  return out;
}
function planShare(p) {
  let w = 0, got = 0;
  for (const r in p.tgt) { const v = p.tgt[r] * RI[r].p; w += v; got += Math.min(1.2, (p.got[r] || 0) / p.tgt[r]) * v; }
  return w ? got / w : 1;
}
function closePlan() {
  const p = S.plan, h = S.hist;
  if (!p) return;
  const f = planShare(p), k = p.y - 1946;
  p.share = f;
  if (f >= 1) {
    const inv = Math.round((1500 + 400 * k) * (f >= 1.15 ? 1.5 : 1) * (h.trust >= 75 ? 1.3 : 1));
    S.funds += inv; h.trust += f >= 1.15 ? 12 : 8;
    log(`The plan for ${p.y} is fulfilled at ${Math.round(f * 100)}%. Moscow invests ${fmt(inv)} Lt in the republic.`, 'good');
  } else if (f >= 0.8) { h.trust -= 6; log(`The plan for ${p.y} falls short at ${Math.round(f * 100)}%. Party trust falls.`, 'warn'); }
  else { h.trust -= 15; h.purge = S.day + 365; log(`The plan for ${p.y} fails at ${Math.round(f * 100)}%. Moscow sends inspectors, and managers are replaced. Output falls by a tenth for a year.`, 'warn'); }
  h.trust = clamp(h.trust, 0, 100);
  if (h.trust < 20) { addMood(-5, 365); h.trust = 30; log("Moscow replaces the republic's leaders.", 'warn'); }
  (h.plans = h.plans || []).push({ y: p.y, share: Math.round(f * 100) });
}
function openPlan(y) { S.plan = { y, name: planName(y), tgt: planTargets(y), got: {} }; log(`The ${S.plan.name} sets Soviet Lithuania's deliveries to the Union for ${y}.`, 'hist'); }

/* ---------- the timeline ---------- */
/* d: date (y: only the year is certain), t: chronicle text, fx: effect, card: decision card id, when: only on this path */
const HEV = [
  { d: '1920-07-12', t: 'In the Moscow Peace Treaty, Soviet Russia recognises Lithuania.' },
  { d: '1920-10-09', t: 'Polish troops under General Żeligowski seize Vilnius. Lithuania keeps no relations with Poland, and the border stays closed until 1938. In this game Vilnius stays in your hands.', fx: () => setMkt('pl', 0, 'No relations with Poland') },
  { d: '1922-02-15', t: 'The Land Reform Law parcels out the great manor estates. Grain and potato farms produce 15% more.', fx: () => { S.mod.farm = 1.15; } },
  { d: '1922-10-02', t: 'The litas becomes the national currency.' },
  { d: '1923-01-10', t: 'Volunteers rise against the French administration of the Klaipėda Region.' },
  { d: '1923-02-16', t: 'The Klaipėda Region is transferred to Lithuania. The country gains its sea port. Link Klaipėda by road or rail and route goods to it.', fx: () => { if (!S.hist.lost) unlockKla(); } },
  { d: '1926-12-17', t: 'A military coup brings Antanas Smetona to power.' },
  { d: '1927-01-01', y: 1, t: 'Dairy co-operatives unite as Pienocentras. Lithuanian butter fetches more abroad.', fx: () => { S.prices.dairy = RI.dairy.p * 1.5; S.mkt.gb.f *= 1.05; } },
  { d: '1929-10-29', t: 'Wall Street crashes. Prices for farm goods begin to fall around the world.' },
  { d: '1930-01-01', y: 1, card: 'depression', when: notSoviet },
  { d: '1934-09-12', card: 'entente', when: notSoviet },
  { d: '1934-12-24', card: 'trial', when: notSoviet },
  { d: '1935-08-20', t: 'Farmers in Suvalkija go on strike against low prices and high taxes.', when: () => !S.hist.sup || S.day > S.hist.sup, fx: () => addMood(-10, 120, { reg: 'Suvalkija' }) },
  { d: '1936-08-05', t: 'A new trade treaty with Germany ends the boycott. Germany buys our goods again.', when: () => !!S.hist.boycott && notSoviet(), fx: () => setMkt('de', 1) },
  { d: '1938-03-17', card: 'poland', when: notSoviet },
  { d: '1939-03-20', card: 'klaipeda', when: notSoviet },
  { d: '1939-09-01', t: 'Germany invades Poland. War in Europe cuts shipping to Britain and trade with Poland.', when: notSoviet, fx: () => { setMkt('gb', 0, 'War at sea'); setMkt('pl', 0, 'Poland is at war'); } },
  { d: '1939-10-10', card: 'bases', when: notSoviet },
  { d: '1940-06-14', card: 'ultimatum', when: notSoviet },
  /* the Soviet path, as it happened */
  { d: '1940-08-03', t: 'Lithuania is annexed by the Soviet Union as the Lithuanian SSR. Private trade ends; goods now go where Moscow plans.', when: onPath('soviet') },
  { d: '1941-01-01', when: onPath('soviet'), fx: () => openPlan(1941) },
  { d: '1941-06-14', t: 'Soviet security forces deport about 17,000 people from Lithuania to Siberia.', when: onPath('soviet'), fx: () => popHit(0.008) },
  { d: '1941-06-22', t: "Germany attacks the Soviet Union and occupies Lithuania within days. Under German rule over 90 percent of Lithuania's Jews are murdered in the Holocaust.", when: onPath('soviet'), fx: () => { S.hist.war = 1; S.plan = null; setMkt('su', 0, 'War'); } },
  { d: '1944-07-13', t: 'The Red Army retakes Vilnius. Soviet rule returns.', when: onPath('soviet'), fx: () => { S.hist.war = 0.5; popHit(0.05); setMkt('su', 1); } },
  { d: '1945-01-28', t: 'The Red Army takes Klaipėda. The region becomes part of Soviet Lithuania.', when: () => S.hist.path === 'soviet' && S.hist.lost, fx: () => { S.hist.lost = 0; unlockKla(); } },
  { d: '1945-05-09', t: 'The war in Europe is over. For years to come, partisans fight Soviet rule from the forests.', when: onPath('soviet'), fx: () => { S.hist.war = 0; } },
  { d: '1947-01-01', y: 1, card: 'collect' },
  { d: '1948-05-22', t: 'Soviet security forces deport tens of thousands of farm families to Siberia.', when: onPath('soviet'), fx: () => popHit(0.015, true) },
  { d: '1949-03-25', t: 'Another wave of deportations empties farmsteads across the countryside.', when: onPath('soviet'), fx: () => popHit(0.01, true) },
  { d: '1953-03-05', t: 'Stalin dies. Mass deportations end, and many exiles later return.', when: onPath('soviet'), fx: () => addMood(5, 3 * 365) },
  { d: '1955-01-01', y: 1, card: 'hydro' },
  { d: '1960-01-01', y: 1, card: 'power' },
  { d: '1974-01-01', y: 1, card: 'nuclear' },
  { d: '1988-06-03', t: 'Sąjūdis, the reform movement, is founded in Vilnius.', when: onPath('soviet') },
  { d: '1989-08-23', t: 'In the Baltic Way, about two million people join hands from Vilnius to Tallinn.', when: onPath('soviet') },
  { d: '1990-03-11', t: 'The Supreme Council restores the independence of Lithuania. The plan economy ends.', when: onPath('soviet'),
    fx: () => { S.plan = null; S.hist.path = 'free'; S.hist.restored = 1; } },
  { d: '1990-04-18', t: 'Moscow blockades Lithuania: no oil, gas or raw materials come in.', when: () => !!S.hist.restored, fx: () => setMkt('su', 0, 'Soviet blockade') },
  { d: '1990-07-02', t: 'The blockade is lifted. Lithuania trades with the West again.', when: () => !!S.hist.restored,
    fx: () => { ['de', 'gb', 'lv', 'pl'].forEach(m => setMkt(m, 1, '', 1)); setMkt('su', 1, '', 0.8); } },
  { d: '1991-09-06', t: "The Soviet Union recognises Lithuania's independence.", when: () => !!S.hist.restored },
  { d: '1993-08-31', t: 'The last Russian troops leave Lithuania.', when: () => !!S.hist.restored },
  { d: '2004-05-01', t: 'Lithuania joins the European Union. Its markets open wider.', when: () => S.hist.path !== 'soviet', fx: () => ['de', 'gb', 'pl', 'lv'].forEach(m => { S.mkt[m].f *= 1.15; }) },
  /* the neutral path, which did not happen */
  { d: '1941-06-22', t: 'Germany attacks the Soviet Union. Neutral Lithuania stays out of the fighting, but shipping on the Baltic stops.', when: onPath('neutral'), fx: () => { setMkt('gb', 0, 'War at sea'); S.mkt.de.f *= 1.1; } },
  { d: '1945-05-08', t: 'The war in Europe ends. Shipping to Britain resumes.', when: onPath('neutral'),
    fx: () => { setMkt('gb', 1); setMkt('pl', 1, '', 0.8); setMkt('su', 1, '', 0.8); if (S.hist.lost) { S.hist.lost = 0; unlockKla(); log('After Germany’s defeat, the Klaipėda Region returns to Lithuania. This did not happen.', 'hist'); } } }
];

/* ---------- once a day ---------- */
function histTick() {
  const h = S.hist, today = ymd(S.day);
  HEV.forEach((e, i) => {
    if (S.ev[i] || today < e.d) return;
    S.ev[i] = 1;
    if (e.when && !e.when()) return;
    if (e.fx) e.fx();
    if (e.t) log(e.t, 'hist', e.y);
    if (e.card) queueCard(e.card);
  });
  /* security: an army and allies make the country harder to bully */
  if (h.path !== 'soviet') {
    const spend = h.def + h.ally;
    if (spend > 0) { S.funds -= spend; h.sec = Math.min(100, h.sec + h.def / 25 * 5 / 365); }
  }
  if (h.sup && S.day <= h.sup) S.funds -= 15;
  h.mood = h.mood.filter(m => S.day <= m.until);
  const d = dOf(S.day);
  if (d.getUTCMonth() === 0 && d.getUTCDate() === 1) {
    /* trade with the West wins friends abroad */
    if (h.path !== 'soviet') { h.sec = Math.min(100, h.sec + Math.min(4, (h.exp.gb || 0) / 2000)); h.exp = {}; }
    if (h.path === 'soviet' && !h.war) { const y = d.getUTCFullYear(); if (S.plan && S.plan.y < y) closePlan(); if (y >= 1946) openPlan(y); }
  }
  if (S.day % 30 === 0) checkProjects();
}
