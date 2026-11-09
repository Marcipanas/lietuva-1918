'use strict';
/* Lietuva 1918 — history and foreign trade. Runs headless like sim.js (no DOM, no THREE):
   - markets abroad, opened and closed by history; a market pays less once it is flooded
   - trade deals: goods leave or arrive through a border post or a sea port, from that town's stock
   - the timeline: dated events, and decision cards that pause the game until the player picks an option
   - who holds which land: the Klaipėda Region, the Palanga coast and the Vilnius region change hands (S.own, setOwner)
   - security, which can save Vilnius in 1920 and turn back the ultimatums of 1938 to 1940
   - the Soviet path: occupation, war, and yearly state plans for deliveries to the Union
   Dates are real. Every card option says whether it is what happened; events that follow a choice history did not make say so. */

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
const GATE_N = { sea: 'a sea port', de: 'a border post on the German border', lv: 'a border post on the Latvian border', pl: 'a border post on the Polish border', rail: 'a railway station' };
/* Loads a day one market takes of one good at full price; more sells at half price. Duty on exports. */
const MKT_CAP = 20, DUTY = 0.1;
const FOODS = new Set(FOOD);

/* The market across the nearest border: whoever holds the land there, a neighbour or the holder of a part of Lithuania
   (East Prussia and the Klaipėda Region trade as Germany; Poland held the Belarusian side between the wars). */
function borderOf(x, z) {
  let best = '', bd = 1e9;
  forDisk(x, z, BORDER_KM + 0.5, (k, d) => { if ((CTY[k] > 1 || heldOff(k)) && d < bd) { bd = d; best = OWN_GATE[ownerOf(k)] || ''; } });
  return best;
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
/* lim: a sale leaves this share of the town's storage in stock; a purchase fills the store up to this share */
const DEAL_LIM = { out: [0, 0.25, 0.5, 0.75], in: [0.5, 0.75, 1] };
function addDeal(m, r, dir, q, ti) { const d = { id: S.did++, m, r, dir, q, ti, lim: dir === 'out' ? 0.5 : 0.75, done: 0, val: 0, why: '' }; S.deals.push(d); return d; }
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
      const lim = d.lim === undefined ? 0.5 : d.lim, keep = Math.max((t.dem[d.r] || 0) * 10, t.cap * lim), q = Math.min(d.q, (t.stock[d.r] || 0) - keep);
      if (q <= 0.01) { d.why = lim ? `Waits until ${t.n} has more than ${Math.round(lim * 100)}% of its store` : `No ${rname(d.r)} to spare in ${t.n}`; continue; }
      const k = d.m + d.r, v0 = vol[k] || 0, full = Math.max(0, Math.min(q, MKT_CAP - v0)), val = p * (full + (q - full) * 0.5);
      t.stock[d.r] -= q; vol[k] = v0 + q; S.funds += val; BUD.trade += val; d.done = q; d.val = val;
      S.hist.exp[d.m] = (S.hist.exp[d.m] || 0) + val;
      /* sold by sea: counts for the port task */
      if (MARKETS[d.m].gate.includes('sea') && townGates(d.ti).has('sea')) S.stats.portSales += val;
      if (d.m === 'su' && S.plan) S.plan.got[d.r] = (S.plan.got[d.r] || 0) + q;
    } else {
      const lim = d.lim === undefined ? 1 : d.lim, q = Math.min(d.q, room(t, d.r), t.cap * lim - (t.stock[d.r] || 0)), cost = p * q;
      if (q <= 0.01) { d.why = lim < 1 ? `The store in ${t.n} is ${Math.round(lim * 100)}% full` : `Storage in ${t.n} is full`; continue; }
      if (S.funds < cost) { d.why = 'Not enough money'; continue; }
      S.funds -= cost; BUD.trade -= cost; t.stock[d.r] = (t.stock[d.r] || 0) + q; d.done = q; d.val = -cost;
    }
  }
}

/* ---------- the state of history ---------- */
function newHistory() {
  return { path: 'free', kaunas: 0, sec: 15, def: 0, ally: 0, trust: 50, exp: {}, expY: 0, war: 0, purge: 0, collect: 0, mood: [], cards: [], news: [], spd: 1, picks: {}, unl: {}, proj: [], sup: 0 };
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
const held = (rg, o) => () => S.own[rg] === o;
const picked = (id, n) => () => S.hist.picks[id] === n;
/* What a change of hands meant, for the chronicle: "23 towns and villages with 160k people" */
function landTxt(o) { return `${o.n} town${o.n === 1 ? '' : 's'} and villages with ${popStr(o.pop)} people`; }
/* The Vilnius region, both parts, to a new holder. Returns what Lithuania lost or got back there. */
function vilnTo(o) { const a = setOwner('vr', o), b = setOwner('vr2', o); return { n: a.n + b.n, pop: a.pop + b.pop, b: a.b + b.b }; }
const lostTxt = o => `${landTxt(o)}${o.b ? `, and ${o.b} of your buildings` : ''}`;
/* Żeligowski takes Vilnius for Poland (both parts of the region). */
function loseVilnius() { log(`Poland holds Vilnius and its region: ${lostTxt(vilnTo('pl'))}.`, 'warn'); }
/* The government moves back to Vilnius, which is the capital again. */
function seatVilnius() { S.hist.kaunas = 0; fixCapital(); }

/* ---------- decision cards ---------- */
/* Each card: t title, when (date shown; a year alone when only the year is certain), txt, when2 (shown only if true), opts.
   Each option: t (button), d (what happens, starting with whether it happened), h: 1 on what happened,
   risk: {sec} for options that work only with enough security, go(ok). txt and d may be functions. */
const CARDS = {
  volunteers: { t: 'Defend the new state', when: '1918-12-29',
    txt: 'German troops are going home, and the Red Army follows them west. Lithuania has almost no army of its own.',
    opts: [
      { t: 'Call for volunteers', h: 1, d: 'What happened. Together with volunteers from Saxony, the new army stops the Red Army in 1919. Costs 1,500 Lt. Security +15.',
        go: () => { S.funds -= 1500; S.hist.sec += 15; } },
      { t: 'Leave defence to others', d: 'Did not happen. No cost now. Security −5, and little to stand on when the next crisis comes.', go: () => { S.hist.sec -= 5; } }] },
  vilnius: { t: 'Żeligowski marches on Vilnius', when: '1920-10-08',
    txt: 'Yesterday the Suwałki Agreement left Vilnius to Lithuania. Now Polish troops under General Lucjan Żeligowski march on the city, and Warsaw says they act on their own.',
    when2: () => notSoviet() && S.own.vr === 'lt',
    opts: [
      { t: 'Hold the line at Širvintos', h: 1, d: 'What happened. Vilnius and its region go to Poland. Kaunas, the seat of government since January 1919, stays the temporary capital. The army stops the advance in November. Security +5. Morale −5 for three years.',
        go: () => { loseVilnius(); S.hist.sec += 5; addMood(-5, 3 * 365); } },
      { t: 'Defend Vilnius', d: 'Did not happen. Costs 2,500 Lt. Works with security 35 or more: the city holds, and Poland stays an enemy. If not, Vilnius falls all the same, security −10 and morale −8 for three years.', risk: { sec: 35 },
        go: ok => { S.funds -= 2500; if (ok) { S.hist.sec += 5; seatVilnius(); log('The army holds Vilnius. Żeligowski’s troops fall back, the League of Nations draws a ceasefire line south of the city, and the government returns to Vilnius. This did not happen.', 'good'); }
          else { loseVilnius(); S.hist.sec -= 10; addMood(-8, 3 * 365); } } }] },
  hymans: { t: 'The Hymans plan', when: '1921-09-03',
    txt: 'At the League of Nations, the Belgian Paul Hymans proposes that Vilnius return to Lithuania as an autonomous region, with foreign policy and defence bound to Poland.',
    when2: () => notSoviet() && S.own.vr === 'pl',
    opts: [
      { t: 'Reject the plan', h: 1, d: 'What happened: Lithuania said no in December 1921, and Poland kept Vilnius. Nothing changes.', go: () => {} },
      { t: 'Accept a union with Poland', d: 'Did not happen. Vilnius and its region come back, and the Polish border opens for trade. But Lithuania takes on Poland’s enemies: security −15, morale −6 for four years, and war if Poland is attacked.',
        go: () => { const o = vilnTo('lt'); S.hist.union = 1; S.hist.sec -= 15; addMood(-6, 4 * 365); setMkt('pl', 1); seatVilnius();
          log(`Vilnius returns as the capital, in a union with Poland: ${landTxt(o)}. This did not happen.`, 'good'); } }] },
  litas: { t: 'A currency of our own', when: '1922-10-02',
    txt: 'Lithuania still pays in German marks, and the mark loses value every week.',
    opts: [
      { t: 'Bring in the litas', h: 1, d: 'What happened. A currency backed by gold: costs 1,500 Lt in reserves. Britain and Latvia pay 5% more for our goods.',
        go: () => { S.funds -= 1500; S.mkt.gb.f *= 1.05; S.mkt.lv.f *= 1.05; } },
      { t: 'Keep the German mark', d: 'Did not happen. No cost now. But in 1923 the mark collapses, and with it half the treasury.', go: () => { S.hist.mark = 1; } }] },
  revolt: { t: 'The Klaipėda question', when: '1923-01-09',
    txt: 'The Allies are thinking of making Klaipėda a free city, like Danzig. Lithuanian riflemen and soldiers offer to stage a local revolt and take the region first.',
    when2: () => notSoviet() && S.own.kr === 'al',
    opts: [
      { t: 'Back the revolt in secret', h: 1, d: 'What happened. About 1,100 soldiers and riflemen in civilian clothes cross into the region on 10 January. The Allies give way, and the region and its port join Lithuania on 16 February. Costs 800 Lt.',
        go: () => { S.funds -= 800; } },
      { t: 'Leave it to the Allies', d: 'Did not happen. The region stays under Allied rule, and Lithuania stays without its port. Britain and France approve: security +6, and Britain pays 5% more.',
        go: () => { S.hist.sec += 6; S.mkt.gb.f *= 1.05; } }] },
  depression: { t: 'The Depression reaches the farms', when: '1930',
    txt: 'Prices for butter, bacon and grain are collapsing abroad. Farmers cannot pay their debts.',
    opts: [
      { t: 'Buy up farm produce', d: 'Did not happen on this scale. The state pays 15 Lt a day for five years. Farmers stay calm.', go: () => { S.hist.sup = S.day + 5 * 365; } },
      { t: 'Balance the budget', h: 1, d: 'What happened: the litas kept its value and the state cut its spending. No cost now. Morale falls by 8 for five years, and farmers may strike.', go: () => { addMood(-8, 5 * 365); } }] },
  entente: { t: 'The Baltic Entente', when: '1934-09-12',
    txt: 'Latvia and Estonia have been allies since 1923. Lithuania can join them in a treaty of good understanding and cooperation.',
    opts: [
      { t: 'Sign the treaty', h: 1, d: 'What happened. Security +8. Latvia pays 10% more for our goods.', go: () => { S.hist.sec += 8; S.mkt.lv.f *= 1.1; } },
      { t: 'Propose a defence alliance', d: 'Did not happen. Security +18, but joint defence costs 10 Lt a day from now on.', go: () => { S.hist.sec += 18; S.hist.ally = 10; S.mkt.lv.f *= 1.15; } },
      { t: 'Stay apart', d: 'Did not happen. Nothing changes.', go: () => {} }] },
  trial: { t: 'The Nazi plot in Klaipėda', when: '1934-12-14',
    txt: 'Ernst Neumann, Theodor von Sass and other Nazi activists stand accused of plotting to hand the Klaipėda Region to Germany. Germany, our biggest customer, warns of consequences.',
    when2: () => notSoviet() && S.own.kr === 'lt',
    opts: [
      { t: 'Let the trial go ahead', h: 1, d: 'What happened. Security +6. Germany stops buying our goods until a new treaty in 1936. Britain buys 10% more.', go: () => { S.hist.sec += 6; setMkt('de', 0, 'German boycott after the Klaipėda trial'); S.hist.boycott = 1; S.mkt.gb.f *= 1.1; } },
      { t: 'Drop the charges', d: 'Did not happen. Trade with Germany goes on, but security −10 and morale −5 for a year.', go: () => { S.hist.sec -= 10; addMood(-5, 365); } }] },
  poland: { t: 'Polish ultimatum', when: '1938-03-17',
    txt: () => S.own.vr === 'lt' ? 'Poland demands diplomatic relations within 48 hours, or else. It has never forgiven Lithuania for keeping Vilnius, and the border has been closed since 1920.'
      : 'Poland demands diplomatic relations within 48 hours, or else. The border has been closed since 1920.',
    when2: () => notSoviet() && !S.hist.union,
    opts: [
      { t: 'Accept', h: 1, d: 'What happened. The Polish border opens for trade. Security +3.', go: () => { setMkt('pl', 1); S.hist.sec += 3; } },
      { t: 'Refuse', d: 'Did not happen. Works with security 40 or more: Poland backs down. If not: border clashes cost 3,000 Lt and security −10, and we accept anyway.', risk: { sec: 40 },
        go: ok => { if (ok) { S.hist.sec += 5; log('Poland backs down. The border stays closed. This did not happen.', 'good'); } else { S.funds -= 3000; S.hist.sec -= 10; setMkt('pl', 1); log('Polish troops mass on the border. After clashes, Lithuania accepts the ultimatum.', 'warn'); } } }] },
  klaipeda: { t: 'German ultimatum on Klaipėda', when: '1939-03-20',
    txt: 'Germany demands the Klaipėda Region and its port, and threatens to take them by force.',
    when2: () => notSoviet() && S.own.kr === 'lt',
    opts: [
      { t: 'Hand over the region', h: 1, d: 'What happened. The Klaipėda Region, its towns and its port go to Germany on 22 March. Security −5.',
        go: () => { const o = setOwner('kr', 'de'); S.hist.sec -= 5; log(`Germany takes the Klaipėda Region: ${landTxt(o)}.`, 'warn'); } },
      { t: 'Refuse', d: 'Did not happen. Works with security 60 or more: Germany backs off. If not: the region is taken by force, with losses of 5,000 Lt, and security −10.', risk: { sec: 60 },
        go: ok => { if (ok) { S.hist.sec += 10; log('Britain and France stand by Lithuania. Germany backs off from Klaipėda. This did not happen.', 'good'); } else { setOwner('kr', 'de'); S.funds -= 5000; S.hist.sec -= 10; log('German troops take Klaipėda by force.', 'warn'); } } }] },
  bases: { t: 'Soviet bases', when: '1939-10-10',
    txt: 'Poland has been divided between Germany and the Soviet Union. Moscow offers to hand Vilnius over, and demands bases for 20,000 Red Army soldiers on Lithuanian soil.',
    when2: () => notSoviet() && S.own.vr !== 'lt',
    opts: [
      { t: 'Accept the bases', h: 1, d: 'What happened. Vilnius and part of its region return on 28 October; Švenčionys and Druskininkai stay with Soviet Belarus. Security −30. Trade with the Soviet Union opens.',
        go: () => { S.hist.sec -= 30; S.hist.bases = 1; setMkt('su', 1, '', 0.9); } },
      { t: 'Refuse, and declare neutrality', d: 'Did not happen. Works with security 70 or more: Moscow drops its demand and keeps Vilnius. If not: the Red Army crosses the border at once and Lithuania is occupied.', risk: { sec: 70 },
        go: ok => { if (ok) { S.hist.sec += 5; log('Moscow drops its demand. Lithuania stays neutral, without Vilnius. This did not happen.', 'good'); }
          else { log('The Red Army crosses the border. Lithuania is occupied, and Vilnius goes to the new Soviet republic.', 'warn'); popHit(0.02); sovietize(); setOwner('vr', 'lt'); seatVilnius(); } } }] },
  bases2: { t: 'Soviet bases', when: '1939-10-10',
    txt: 'Poland has been divided between Germany and the Soviet Union, and the Red Army stands on Lithuania’s border. Moscow demands bases for 20,000 of its soldiers on Lithuanian soil.',
    when2: () => notSoviet() && S.own.vr === 'lt',
    opts: [
      { t: 'Accept the bases', h: 1, d: 'What happened, though in 1939 Moscow handed over Vilnius in return. Security −30. Trade with the Soviet Union opens.', go: () => { S.hist.sec -= 30; S.hist.bases = 1; setMkt('su', 1, '', 0.9); } },
      { t: 'Refuse, and declare neutrality', d: 'Did not happen. Works with security 70 or more. If not: the Red Army crosses the border at once and Lithuania is occupied.', risk: { sec: 70 },
        go: ok => { if (ok) { S.hist.sec += 5; log('Moscow drops its demand. Lithuania stays neutral. This did not happen.', 'good'); } else { log('The Red Army crosses the border. Lithuania is occupied.', 'warn'); popHit(0.02); sovietize(); } } }] },
  ultimatum: { t: 'Soviet ultimatum', when: '1940-06-14',
    txt: 'Moscow accuses Lithuania of plotting against it, and demands a new government and free entry for any number of Red Army troops.',
    when2: notSoviet,
    opts: [
      { t: 'Accept', h: 1, d: 'What happened. The Red Army occupies Lithuania the next day. The country becomes a Soviet republic with a planned economy.', go: () => { log('The Red Army occupies Lithuania.', 'hist'); sovietize(); } },
      { t: 'Resist', d: 'Did not happen. Works with security 80 or more and no Soviet bases. If not: the army is crushed, half the treasury is lost and Lithuania is occupied.', risk: { sec: 80 },
        go: ok => { if (ok && !S.hist.bases) { S.hist.path = 'neutral'; S.hist.sec += 5; log('The Red Army does not cross. Lithuania stays independent and neutral. This did not happen.', 'good'); }
          else { S.funds = Math.min(S.funds, S.funds * 0.5); popHit(0.03); log('The army fights for a week and is crushed. Lithuania is occupied.', 'warn'); sovietize(); } } }] },
  collect: { t: 'Collective farms', when: '1947',
    txt: 'Moscow orders the farms of Soviet Lithuania joined into collective farms, as in the rest of the Union.',
    when2: onPath('soviet'),
    opts: [
      { t: 'Collectivize at once', h: 1, d: 'What happened. Party trust +10. Village fields yield 15% less until 1955, then 15% more with tractors. Village morale −10 for five years.', go: () => { S.hist.collect = 1; S.hist.trust += 10; addMood(-10, 5 * 365, { vil: 1 }); } },
      { t: 'Go slowly', d: 'Did not happen. Party trust −15 and the food plan rises by a fifth.', go: () => { S.hist.trust -= 15; S.hist.slow = 1; } }] },
  hydro: { t: 'A dam on the Nemunas', when: '1955',
    txt: 'Moscow plans a hydro power station on the Nemunas at Kaunas and offers to pay most of it.',
    when2: onPath('soviet'),
    opts: [
      { t: 'Build it by 1960', h: 1, d: 'What happened: the Kaunas dam opened in 1959. Moscow grants 6,000 Lt and unlocks the hydro dam. Build one within 25 km of Kaunas by the end of 1960. Done: trust +15 and 3,000 Lt. Late: trust −20.', go: () => project('hydro', 'kau', 25, 1960, 6000, 3000) },
      { t: 'Ask for a delay', d: 'Did not happen. Party trust −10.', go: () => { S.hist.trust -= 10; } }] },
  power: { t: 'A big power station', when: '1960',
    txt: 'Moscow plans a large power station near Elektrėnai, between Kaunas and Vilnius.',
    when2: onPath('soviet'),
    opts: [
      { t: 'Build it by 1962', h: 1, d: 'What happened: Elektrėnai began making power in 1962. Moscow grants 2,500 Lt and unlocks power stations. Build one within 30 km of Kaišiadorys by the end of 1962. Done: trust +15 and 2,000 Lt. Late: trust −20.', go: () => project('power', 'kai', 30, 1962, 2500, 2000) },
      { t: 'Ask for a delay', d: 'Did not happen. Party trust −10.', go: () => { S.hist.trust -= 10; } }] },
  nuclear: { t: 'A nuclear power plant', when: '1974',
    txt: 'Moscow plans a nuclear power plant on Lake Drūkšiai, in the far north-east, to power the whole region.',
    when2: onPath('soviet'),
    opts: [
      { t: 'Build it by 1983', h: 1, d: 'What happened: Ignalina’s first reactor started in 1983. Moscow grants 25,000 Lt and unlocks nuclear power. Build a plant within 40 km of Zarasai by the end of 1983. Done: trust +20 and 8,000 Lt. Late: trust −20.', go: () => project('nuclear', 'zar', 40, 1983, 25000, 8000) },
      { t: 'Ask for a delay', d: 'Did not happen. Party trust −10.', go: () => { S.hist.trust -= 10; } }] }
};
function cardOK(id) { const c = CARDS[id]; return !c.when2 || c.when2(); }
/* A card's text or an option's description: fixed, or worked out when shown */
const cardTxt = x => typeof x === 'function' ? x() : x;
/* Pick option n of the card on top of the queue. */
function pickCard(n) {
  const h = S.hist, id = h.cards[0], c = id && CARDS[id], o = c && c.opts[n];
  if (!o) return false;
  h.cards.shift(); h.picks[id] = n;
  const ok = !o.risk || h.sec >= o.risk.sec;
  if (o.risk) (h.risk = h.risk || {})[id] = ok ? 1 : 0;
  log(`${c.t}: ${o.t.toLowerCase()}.`, 'hist', c.when.length === 4);
  o.go(ok);
  h.sec = clamp(h.sec, 0, 100); h.trust = clamp(h.trust, 0, 100);
  if (!h.cards.length && !h.news.length && h.spd) S.speed = h.spd;
  NET.dirty = true;
  return true;
}
function queueCard(id) {
  const h = S.hist;
  if (h.picks[id] !== undefined || h.cards.includes(id) || !cardOK(id)) return;
  if (!h.cards.length && !h.news.length) h.spd = S.speed || h.spd || 1;
  h.cards.push(id); S.speed = 0;
}
/* A card that tells what just happened, for history that moves a border or the capital: it pauses the game until read. */
function queueNews(id, more) {
  const h = S.hist;
  if (!h.cards.length && !h.news.length) h.spd = S.speed || h.spd || 1;
  h.news.push({ id, more: more || '' }); S.speed = 0;
}
function readNews() {
  const h = S.hist;
  h.news.shift();
  if (!h.cards.length && !h.news.length && h.spd) S.speed = h.spd;
}
/* The decisions taken so far, for the chronicle: [{id, t, o (option title), as (1 as in history, 0 not, -1 no clear answer)}] */
function decisions() {
  return Object.keys(S.hist.picks).filter(id => CARDS[id]).map(id => {
    const c = CARDS[id], o = c.opts[S.hist.picks[id]], hasH = c.opts.some(q => q.h);
    return { id, t: c.t, when: c.when, o: o.t, as: hasH ? (o.h ? 1 : 0) : -1, failed: S.hist.risk && S.hist.risk[id] === 0 };
  });
}

/* ---------- Union projects: build a given building near a town by a deadline ---------- */
function project(type, near, r, year, grant, reward) {
  S.hist.unl[type] = 1; S.funds += grant;
  S.hist.proj.push({ type, near, r, by: Date.UTC(year, 11, 31), grant, reward, done: 0 });
}
function checkProjects() {
  for (const p of S.hist.proj) {
    if (p.done) continue;
    const t = S.towns[tIdx(p.near)], ok = t && S.bld.some(b => b.t === p.type && Math.hypot(b.x - t.x, b.z - t.z) <= p.r * MAPK);
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
/* id: kept in S.ev once passed, d: date (y: only the year is certain), t: chronicle text, fx: effect (a text it returns, such as
   what changed hands, is added to t), card: decision card id, when: only if true (checked on the day).
   Events that follow a choice history did not make say "This did not happen". */
const HEV = [
  { id: 'king18', d: '1918-07-11', t: 'The Council elects Duke Wilhelm of Urach king of Lithuania, as Mindaugas II, hoping to keep the country out of a union with Prussia or Saxony. He never comes, and in November the Council takes the offer back.' },
  { id: 'gov18', d: '1918-11-11', t: 'Germany signs the armistice. Augustinas Voldemaras forms the first government of Lithuania.' },
  { id: 'lv18', d: '1918-11-18', t: 'Latvia declares independence. Its land takes in Courland, and with it the Palanga coast.',
    fx: () => { setOwner('lv', 'lv'); if (S.own.pal === 'de') setOwner('pal', 'lv'); } },
  { id: 'vol18', d: '1918-12-29', card: 'volunteers' },
  /* Vilnius changes hands: Soviet in January 1919, Polish in April 1919, Soviet again in July 1920, Lithuanian in August 1920 */
  { id: 'gov19', news: 'The government moves to Kaunas', nd: 'Kaunas is the temporary capital. Links to the capital now count to Kaunas.', d: '1919-01-02', t: 'With the Red Army closing in, the government leaves Vilnius for Kaunas. Kaunas is the temporary capital.',
    fx: () => { S.hist.kaunas = 1; fixCapital(); } },
  { id: 'red19', news: 'The Red Army takes Vilnius', nd: 'Towns in the Vilnius region wait, with all you built there, until the region comes back. Routes to them wait at no cost.', d: '1919-01-05', t: 'The Red Army takes Vilnius from Polish self-defence units, and the Bolsheviks set up a Soviet government there.',
    fx: () => { const o = S.own.vr === 'lt' ? vilnTo('ra') : null; setOwner('by', 'ra'); return o ? `The Vilnius region is lost: ${lostTxt(o)}.` : ''; } },
  { id: 'pl19', news: 'Poland takes Vilnius', nd: 'The Vilnius region stays out of reach while Poland holds it. Its towns keep what you built there.', d: '1919-04-19', t: 'Polish cavalry rides into Vilnius. After three days of street fighting the Red Army is gone, and Poland holds the city and its region.',
    fx: () => { if (S.own.vr === 'ra') vilnTo('pl'); setOwner('by', 'pl'); } },
  { id: 'sejny19', d: '1919-08-23', t: 'Polish irregulars rise in Sejny, and the Polish army follows. The Suwałki region goes to Poland, along the line the Allies drew in July.',
    fx: () => setOwner('pl', 'pl') },
  { id: 'bermont19', d: '1919-11-22', t: 'The army defeats the Bermontians, a German and Russian volunteer army, at Radviliškis. They leave Lithuania by mid-December.' },
  { id: 'kr20', d: '1920-02-15', t: 'Under the Treaty of Versailles, Germany gives up the Klaipėda Region. French troops take it over for the Allies.', when: held('kr', 'de'), fx: () => setOwner('kr', 'al') },
  { id: 'seimas20', d: '1920-05-15', t: 'The Constituent Assembly, the first parliament elected by the people of Lithuania, meets.' },
  { id: 'moscow20', d: '1920-07-12', t: 'In the Moscow Peace Treaty, Soviet Russia recognises Lithuania and its claim to Vilnius, and pays it three million roubles in gold.', fx: () => { S.funds += 1000; } },
  { id: 'red20', news: 'The Red Army takes Vilnius again', nd: 'The Moscow treaty promised the city to Lithuania. For now its towns stay out of reach.', d: '1920-07-14', t: 'Driving the Polish army back, the Red Army takes Vilnius. Lithuanian troops arrive a day later to find it in Soviet hands.',
    fx: () => { if (S.own.vr === 'pl') vilnTo('ra'); setOwner('by', 'ra'); } },
  { id: 'back20', news: 'Vilnius is Lithuanian again', nd: 'The towns of the Vilnius region are back, with what you built there. Their routes run again. The government stays in Kaunas for now.', d: '1920-08-26', t: 'As the Moscow treaty agreed, the Red Army hands Vilnius over to Lithuania. The government stays in Kaunas for now.',
    fx: () => S.own.vr === 'ra' ? `Back in Lithuania: ${landTxt(vilnTo('lt'))}.` : '' },
  { id: 'suwalki20', d: '1920-10-07', t: 'In the Suwałki Agreement, Poland and Lithuania agree a ceasefire line that leaves Vilnius to Lithuania.', when: () => S.own.vr === 'lt' },
  { id: 'vil20', d: '1920-10-08', card: 'vilnius' },
  { id: 'by20', d: '1920-10-09', fx: () => setOwner('by', 'pl') },
  { id: 'central20', d: '1920-10-12', t: 'Żeligowski proclaims the Republic of Central Lithuania in Vilnius, a state in name only, run from Warsaw. Lithuania keeps no relations with Poland, and the border stays closed.', when: held('vr', 'pl'), fx: () => setMkt('pl', 0, 'No relations with Poland') },
  { id: 'sirvintos20', d: '1920-11-21', t: 'The army stops Żeligowski’s advance at Širvintos and Giedraičiai. A ceasefire follows on 29 November.', when: held('vr', 'pl') },
  { id: 'palanga21', news: 'A sea coast for Lithuania', nd: 'Build a sea port on the coast to trade with Britain and Germany by sea.', d: '1921-03-30', t: 'Latvia hands Palanga and the coast up to Šventoji to Lithuania, as the British arbitrator James Young Simpson decided. Lithuania has a sea coast at last: a sea port can go there.', when: () => S.own.pal !== 'lt', fx: () => setOwner('pal', 'lt') },
  { id: 'hymans21', d: '1921-09-03', card: 'hymans' },
  { id: 'land22', d: '1922-02-15', t: 'The Land Reform Law parcels out the great manor estates. Grain and potato farms produce 15% more.', fx: () => { S.mod.farm = 1.15; } },
  { id: 'annex22', d: '1922-03-24', t: 'The Polish Sejm annexes the Vilnius region.', when: held('vr', 'pl') },
  { id: 'litas22', d: '1922-10-02', card: 'litas' },
  { id: 'revolt23', d: '1923-01-09', card: 'revolt' },
  { id: 'kla23', d: '1923-01-15', t: 'The volunteers take Klaipėda.', when: () => picked('revolt', 0)() && S.own.kr === 'al' },
  { id: 'kr23', news: 'Klaipėda joins Lithuania', nd: 'Link Klaipėda by road or rail and route goods to its port.', d: '1923-02-16', t: 'The Allies transfer the Klaipėda Region to Lithuania, with self-rule. The country gains its sea port. Link Klaipėda by road or rail and route goods to it.',
    when: () => picked('revolt', 0)() && S.own.kr === 'al', fx: () => setOwner('kr', 'lt') },
  { id: 'line23', d: '1923-03-15', t: 'The Conference of Ambassadors recognises the line through the Vilnius region as Poland’s border. Lithuania never accepts it.', when: held('vr', 'pl') },
  { id: 'mark23', d: '1923-11-20', t: 'The German mark has collapsed: a dollar now costs 4.2 trillion marks. Lithuania still pays in marks, so the treasury loses half its money. This did not happen: the litas came in 1922.',
    when: () => !!S.hist.mark, fx: () => { if (S.funds > 0) S.funds = Math.round(S.funds / 2); } },
  { id: 'conv24', d: '1924-05-08', t: 'The Klaipėda Convention confirms the region as part of Lithuania, with its own parliament.', when: held('kr', 'lt') },
  { id: 'coup26', d: '1926-12-17', t: 'A military coup brings Antanas Smetona to power.' },
  { id: 'pieno27', d: '1927-01-01', y: 1, t: 'Dairy co-operatives unite as Pienocentras. Lithuanian butter fetches more abroad.', fx: () => { S.prices.dairy = RI.dairy.p * 1.5; S.mkt.gb.f *= 1.05; } },
  { id: 'crash29', d: '1929-10-29', t: 'Wall Street crashes. Prices for farm goods begin to fall around the world.' },
  { id: 'dep30', d: '1930-01-01', y: 1, card: 'depression', when: notSoviet },
  { id: 'entente34', d: '1934-09-12', card: 'entente', when: notSoviet },
  { id: 'trial34', d: '1934-12-14', card: 'trial', when: notSoviet },
  { id: 'strike35', d: '1935-08-20', t: 'Farmers in Suvalkija go on strike against low prices and high taxes.', when: () => !S.hist.sup || S.day > S.hist.sup, fx: () => addMood(-10, 120, { reg: 'Suvalkija' }) },
  { id: 'boycott36', d: '1936-08-05', t: 'A new trade treaty with Germany ends the boycott. Germany buys our goods again.', when: () => !!S.hist.boycott && notSoviet(), fx: () => setMkt('de', 1) },
  { id: 'pol38', d: '1938-03-17', card: 'poland', when: notSoviet },
  { id: 'kla39', d: '1939-03-20', card: 'klaipeda', when: notSoviet },
  { id: 'kla39al', news: 'Germany takes Klaipėda', nd: 'The region and its port are out of reach. Routes to its towns wait at no cost.', d: '1939-03-23', t: 'German troops march into the Klaipėda Region, which the Allies still held. In history they took it from Lithuania that day.', when: held('kr', 'al'), fx: () => setOwner('kr', 'de') },
  { id: 'ww39', d: '1939-09-01', t: 'Germany invades Poland. War in Europe cuts shipping to Britain and trade with Poland.', when: () => notSoviet() && !S.hist.union, fx: () => { setMkt('gb', 0, 'War at sea'); setMkt('pl', 0, 'Poland is at war'); } },
  { id: 'ww39u', d: '1939-09-01', t: 'Germany invades Poland, and the union with Poland takes Lithuania into the war. This did not happen.', when: () => notSoviet() && !!S.hist.union,
    fx: () => { S.hist.war = 1; setMkt('gb', 0, 'War at sea'); setMkt('pl', 0, 'Poland is at war'); setMkt('de', 0, 'At war with Germany'); } },
  { id: 'su39', news: 'The Red Army takes Vilnius from Poland', nd: 'The Vilnius region passes to Soviet Belarus.', d: '1939-09-17', t: 'The Red Army invades Poland from the east. On 19 September it takes Vilnius.', when: () => !S.hist.union,
    fx: () => { setOwner('by', 'by'); if (S.own.vr === 'pl') setOwner('vr', 'by'); if (S.own.vr2 === 'pl') setOwner('vr2', 'by'); } },
  { id: 'su39u', d: '1939-09-17', t: 'The Red Army invades from the east and occupies Lithuania along with eastern Poland. This did not happen.', when: () => !!S.hist.union,
    fx: () => { setOwner('by', 'by'); S.hist.war = 0; popHit(0.03); sovietize(); } },
  { id: 'bases39', d: '1939-10-10', card: 'bases', when: notSoviet },
  { id: 'bases39b', d: '1939-10-10', card: 'bases2', when: notSoviet },
  /* the Suwałki region: handed by the Soviets to Germany, which annexed it, and taken by the Red Army in October 1944 */
  { id: 'sudauen39', d: '1939-10-12', fx: () => setOwner('pl', 'de') },
  { id: 'vil39', news: 'Vilnius returns to Lithuania', nd: 'The capital moves back to Vilnius. The region’s towns are back, with what you built there.', d: '1939-10-28', t: 'The Lithuanian army enters Vilnius, the capital named in the Act of Independence.', when: () => !!S.hist.bases && S.own.vr !== 'lt',
    fx: () => { const o = setOwner('vr', 'lt'); seatVilnius(); return `Back in Lithuania: ${landTxt(o)}.`; } },
  { id: 'ult40', d: '1940-06-14', card: 'ultimatum', when: notSoviet },
  /* the Soviet path, as it happened */
  { id: 'annex40', news: 'Lithuania becomes a Soviet republic', nd: 'Trade abroad ends. Deliver the plan to the Union through railway stations, with deals in the Plan view.', d: '1940-08-03', t: 'Lithuania is annexed by the Soviet Union as the Lithuanian SSR. Private trade ends; goods now go where Moscow plans.', when: onPath('soviet') },
  { id: 'vr40', news: 'The rest of the Vilnius region joins', nd: 'Švenčionys, Druskininkai and their villages are part of Lithuania again.', d: '1940-11-06', t: 'Moscow hands Švenčionys, Druskininkai and the rest of the Vilnius region held by Soviet Belarus to Soviet Lithuania.',
    when: () => S.hist.path === 'soviet' && S.own.vr2 !== 'lt', fx: () => { setOwner('vr', 'lt'); setOwner('vr2', 'lt'); seatVilnius(); } },
  { id: 'plan41', d: '1941-01-01', when: onPath('soviet'), fx: () => openPlan(1941) },
  { id: 'dep41', d: '1941-06-14', t: 'Soviet security forces deport about 17,000 people from Lithuania to Siberia.', when: onPath('soviet'), fx: () => popHit(0.008) },
  { id: 'war41', news: 'Germany occupies Lithuania', nd: 'The plan stops. Factories and farms work at reduced strength until the war ends.', d: '1941-06-22', t: "Germany attacks the Soviet Union and occupies Lithuania within days. Under German rule over 90 percent of Lithuania's Jews are murdered in the Holocaust.", when: onPath('soviet'), fx: () => { S.hist.war = 1; S.plan = null; setMkt('su', 0, 'War'); } },
  { id: 'vilnius44', news: 'Soviet rule returns', nd: 'The war is not over, and the plan restarts slowly.', d: '1944-07-13', t: 'The Red Army retakes Vilnius. Soviet rule returns.', when: onPath('soviet'), fx: () => { S.hist.war = 0.5; popHit(0.05); setMkt('su', 1); } },
  { id: 'suwalki44', d: '1944-10-23', fx: () => setOwner('pl', 'pl') },
  { id: 'kla45', news: 'Klaipėda joins Soviet Lithuania', nd: 'Link Klaipėda by road or rail and route goods to its port.', d: '1945-01-28', t: 'The Red Army takes Klaipėda. The region becomes part of Soviet Lithuania.', when: () => S.hist.path === 'soviet' && S.own.kr !== 'lt', fx: () => setOwner('kr', 'lt') },
  { id: 'end45', d: '1945-05-09', t: 'The war in Europe is over. For years to come, partisans fight Soviet rule from the forests.', when: onPath('soviet'), fx: () => { S.hist.war = 0; } },
  { id: 'potsdam45', d: '1945-08-02', t: 'At Potsdam the Allies put the south of East Prussia under Poland and the north, with Königsberg, under the Soviet Union.',
    fx: () => { setOwner('ep', 'pl'); setOwner('ru', 'ru'); } },
  { id: 'kal46', d: '1946-07-04', t: 'The Soviet part of East Prussia is renamed the Kaliningrad region, part of Soviet Russia.', fx: () => setOwner('ru', 'ru') },
  { id: 'collect47', d: '1947-01-01', y: 1, card: 'collect' },
  { id: 'dep48', d: '1948-05-22', t: 'Soviet security forces deport about 40,000 people, most of them from farms, to Siberia.', when: onPath('soviet'), fx: () => popHit(0.015, true) },
  { id: 'dep49', d: '1949-03-25', t: 'Another wave of deportations empties farmsteads across the countryside.', when: onPath('soviet'), fx: () => popHit(0.01, true) },
  { id: 'stalin53', d: '1953-03-05', t: 'Stalin dies. Mass deportations end, and many exiles later return.', when: onPath('soviet'), fx: () => addMood(5, 3 * 365) },
  { id: 'hydro55', d: '1955-01-01', y: 1, card: 'hydro' },
  { id: 'power60', d: '1960-01-01', y: 1, card: 'power' },
  { id: 'nuc74', d: '1974-01-01', y: 1, card: 'nuclear' },
  { id: 'sajudis88', d: '1988-06-03', t: 'Sąjūdis, the reform movement, is founded in Vilnius.', when: onPath('soviet') },
  { id: 'way89', d: '1989-08-23', t: 'In the Baltic Way, about two million people join hands from Vilnius to Tallinn.', when: onPath('soviet') },
  { id: 'restore90', news: 'Independence restored', nd: 'The plan economy ends. Trade abroad opens again, once Moscow ends its blockade.', d: '1990-03-11', t: 'The Supreme Council restores the independence of Lithuania. The plan economy ends.', when: onPath('soviet'),
    fx: () => { S.plan = null; S.hist.path = 'free'; S.hist.restored = 1; } },
  { id: 'blockade90', d: '1990-04-18', t: 'Moscow blockades Lithuania: oil stops coming in, and gas and raw materials are cut.', when: () => !!S.hist.restored, fx: () => setMkt('su', 0, 'Soviet blockade') },
  { id: 'lift90', d: '1990-07-02', t: 'The blockade is lifted. Lithuania trades with the West again.', when: () => !!S.hist.restored,
    fx: () => { ['de', 'gb', 'lv', 'pl'].forEach(m => setMkt(m, 1, '', 1)); setMkt('su', 1, '', 0.8); } },
  { id: 'recog91', d: '1991-09-06', t: "The Soviet Union recognises Lithuania's independence.", when: () => !!S.hist.restored },
  { id: 'troops93', d: '1993-08-31', t: 'The last Russian troops leave Lithuania.', when: () => !!S.hist.restored },
  { id: 'eu04', d: '2004-05-01', t: 'Lithuania joins the European Union. Its markets open wider.', when: () => S.hist.path !== 'soviet', fx: () => ['de', 'gb', 'pl', 'lv'].forEach(m => { S.mkt[m].f *= 1.15; }) },
  /* the neutral path, which did not happen */
  { id: 'war41n', d: '1941-06-22', t: 'Germany attacks the Soviet Union. Neutral Lithuania stays out of the fighting, but shipping on the Baltic stops. This did not happen.', when: onPath('neutral'), fx: () => { setMkt('gb', 0, 'War at sea'); S.mkt.de.f *= 1.1; } },
  { id: 'end45n', d: '1945-05-08', t: 'The war in Europe ends. Shipping to Britain resumes.', when: onPath('neutral'),
    fx: () => { setMkt('gb', 1); setMkt('pl', 1, '', 0.8); setMkt('su', 1, '', 0.8); if (S.own.kr !== 'lt') { setOwner('kr', 'lt'); log('After Germany’s defeat, the Klaipėda Region returns to Lithuania. This did not happen.', 'hist'); } } }
];

/* ---------- once a day ---------- */
/* What the state pays each day for the army, allies and support schemes. The day tick takes it before it counts the day's balance.
   Security: an army makes the country harder to bully. */
function histSpend() {
  const h = S.hist;
  let s = 0;
  if (h.path !== 'soviet') {
    s += h.def + h.ally;
    if (h.def > 0) h.sec = Math.min(100, h.sec + h.def / 25 * 5 / 365);
  }
  if (h.sup && S.day <= h.sup) s += 15;
  return s;
}
function histTick() {
  const h = S.hist, today = ymd(S.day);
  for (const e of HEV) {
    if (S.ev[e.id] || today < e.d) continue;
    S.ev[e.id] = 1;
    if (e.when && !e.when()) continue;
    const more = e.fx ? e.fx() : '', mt = typeof more === 'string' ? more : '';
    if (e.t) log(mt ? e.t + ' ' + mt : e.t, 'hist', e.y);
    /* history that moves a border or the capital opens a card; other events that change something show on screen briefly */
    if (e.t && e.news) queueNews(e.id, mt);
    else if (e.t && e.fx && NOTES.length < 3) { const i = e.t.indexOf('. '); NOTES.push(i > 0 ? e.t.slice(0, i + 1) : e.t); }
    if (e.card) queueCard(e.card);
  }
  h.mood = h.mood.filter(m => S.day <= m.until);
  const d = dOf(S.day);
  if (d.getUTCMonth() === 0 && d.getUTCDate() === 1) {
    /* trade with the West wins friends abroad */
    if (h.path !== 'soviet') { h.sec = Math.min(100, h.sec + Math.min(4, (h.exp.gb || 0) / 2000)); h.exp = {}; }
    if (h.path === 'soviet' && !h.war) { const y = d.getUTCFullYear(); if (S.plan && S.plan.y < y) closePlan(); if (y >= 1946) openPlan(y); }
  }
  if (S.day % 30 === 0) checkProjects();
}
