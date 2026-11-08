#!/usr/bin/env python3
"""Builds the geography of the game from OpenStreetMap borders, Natural Earth coast, rivers and lakes, and a few hand-drawn
rivers. Rivers are bent to pass the towns that stand on them, since Natural Earth is generalized by a kilometre or two.
Run: python3 -I tools/geo/build_geo.py <download dir> <places json> <out json>   (needs shapely)"""
import json, math, sys
from shapely.geometry import shape, box, LineString, Polygon
from shapely.ops import unary_union, linemerge

DL, PLACES, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
MAP = box(19.6, 53.3, 28.2, 57.1)            # well beyond the game map (20.75..27.04 E, 53.77..56.55 N), so the view's margins are filled
KX, KY = 63.6, 111.3                          # km per degree at 55.2 N
km = lambda a, b: math.hypot((a[0] - b[0]) * KX, (a[1] - b[1]) * KY)
feats = lambda f: json.load(open(f))['features']
osm = lambda i: shape(json.load(open(f'{DL}/osm/{i}.geojson'))['geometry']).buffer(0)
C = {'lt': osm(72596), 'lv': osm(72594), 'by': osm(59065), 'pl': osm(49715), 'ru': osm(103906)}
land = unary_union([g for g in (shape(f['geometry']) for f in feats(f'{DL}/ne/ne_10m_land.geojson')) if g.intersects(MAP)]).intersection(MAP)
PL = {p['n']: p['p'] for p in json.load(open(PLACES))}

def polys(g):
    if g.is_empty: return []
    if isinstance(g, Polygon): return [g]
    if hasattr(g, 'geoms'): return [p for x in g.geoms for p in polys(x)]
    return []
def lines(g):
    if g.is_empty: return []
    if isinstance(g, LineString): return [g]
    if hasattr(g, 'geoms'): return [p for x in g.geoms for p in lines(x)]
    return []
r4 = lambda c: [round(c[0], 4), round(c[1], 4)]
def ring(p, tol):
    q = p.simplify(tol, preserve_topology=True)
    if q.is_empty or q.area < 2e-5: return None
    return [r4(c) for c in list(q.exterior.coords)[:-1]], [[r4(c) for c in list(h.coords)[:-1]] for h in q.interiors if Polygon(h).area > 2e-5]

out = {}
# ---- land of each country, clipped to the map area ----
for k, g in C.items():
    rings = [r[0] for r in (ring(p, 0.0012) for p in polys(g.intersection(land))) if r]
    out['land_' + k] = rings
    print(k, len(rings), sum(len(r) for r in rings), 'points')
# ---- water: the open sea, and the Curonian Lagoon (the zone is drawn along the spit and around the lagoon) ----
lagz = Polygon([(21.14, 55.70), (21.30, 55.45), (21.45, 55.30), (21.35, 54.95), (21.0, 54.70), (20.45, 54.80), (20.45, 54.97), (20.62, 55.02),
                (20.80, 55.15), (20.99, 55.30), (21.07, 55.45), (21.10, 55.55), (21.10, 55.70)])
water = MAP.difference(land)
for key, g in (('sea', water.difference(lagz)), ('lagoon', water.intersection(lagz))):
    out[key] = [{'o': r[0], 'h': r[1]} for r in (ring(p, 0.0012) for p in polys(g)) if r]
    print(key, len(out[key]), sum(len(w['o']) + sum(len(h) for h in w['h']) for w in out[key]), 'points')
# ---- borders between countries, over land and the lagoon ----
keep = land.buffer(0.004).union(lagz)
pairs = [('lt', 'lv'), ('lt', 'by'), ('lt', 'pl'), ('lt', 'ru'), ('lv', 'by'), ('by', 'pl'), ('pl', 'ru')]
bord = []
for a, b in pairs:
    g = C[a].boundary.intersection(C[b].boundary).intersection(MAP).intersection(keep)
    for l in (lines(linemerge(lines(g))) if not g.is_empty else []):
        s = l.simplify(0.0008)
        if s.length >= 0.01: bord.append({'a': a, 'b': b, 'p': [r4(c) for c in s.coords]})
out['borders'] = bord

# ---- rivers ----
R = {}
for f in ('ne_10m_rivers_europe', 'ne_10m_rivers_lake_centerlines'):
    for ft in feats(f'{DL}/ne/{f}.geojson'):
        g = shape(ft['geometry'])
        if g.intersects(MAP): R.setdefault(ft['properties'].get('name') or str(ft['properties'].get('ne_id')), []).append(g.intersection(MAP))
def dens(pts, step=0.25):
    o = [list(pts[0])]
    for a, b in zip(pts, pts[1:]):
        n = max(1, math.ceil(km(a, b) / step))
        for i in range(1, n + 1): o.append([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n])
    return o
def arc(pts):
    s = [0.0]
    for a, b in zip(pts, pts[1:]): s.append(s[-1] + km(a, b))
    return s
def closest(pts, p):
    i = min(range(len(pts)), key=lambda i: km(pts[i], p))
    return i, km(pts[i], p)
def shift(pts, i, dx, dy, sigma, span=9):
    s = arc(pts)
    for j in range(len(pts)):
        u = abs(s[j] - s[i])
        if u > span: continue
        w = math.exp(-(u / sigma) ** 2)
        pts[j][0] += dx * w; pts[j][1] += dy * w
def anchor(pts, town, d0, sigma=2.5):
    """Bend the river so that it passes d0 km from the town centre, on the side it already runs."""
    i, d = closest(pts, town)
    q = pts[i]
    if d > 0.05:
        ux, uy = (q[0] - town[0]) * KX / d, (q[1] - town[1]) * KY / d
    else:
        a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
        tx, ty = (b[0] - a[0]) * KX, (b[1] - a[1]) * KY
        L = math.hypot(tx, ty) or 1
        ux, uy = -ty / L, tx / L
    tgt = (town[0] + ux * d0 / KX, town[1] + uy * d0 / KY)
    shift(pts, i, tgt[0] - q[0], tgt[1] - q[1], sigma)
    return d
# Natural Earth rivers: name in the game, Natural Earth names, drawn width in km
NE_RIV = [('Nemunas', ['Usha', 'Neman'], 0.45), ('Neris', ['Neris'], 0.34), ('Šventoji', ['Šventoji'], 0.26), ('Merkys', ['Merkys'], 0.2),
          ('Venta', ['Venta'], 0.24), ('Mūša', ['Mūša'], 0.2), ('Nemunėlis', ['Nemunėlis'], 0.18), ('Dysna', ['Dysna'], 0.2),
          ('Daugava', ['Daugava'], 0.5), ('Pissa', ['Pissa'], 0.2), ('Łyna', ['Łyna'], 0.2)]
UNNAMED = {'Nevėžis': (24.91, 55.56, 0.22), 'Šešupė': (23.43, 54.22, 0.22)}   # Natural Earth has them without a name: found by their source
riv = []
for nm, src, w in NE_RIV:
    for l in lines(linemerge([l for n in src for g in R.get(n, []) for l in lines(g)])):
        if l.length >= 0.05: riv.append({'n': nm, 'w': w, 'p': dens(list(l.coords))})
for nm, (sx, sy, w) in UNNAMED.items():
    for gs in R.values():
        for g in gs:
            for l in lines(g):
                c0 = l.coords[0]
                if abs(c0[0] - sx) < 0.02 and abs(c0[1] - sy) < 0.02: riv.append({'n': nm, 'w': w, 'p': dens(list(l.coords))})
# Rivers too small for Natural Earth, drawn by hand from source to mouth (bent onto their towns below)
HAND = [('Dubysa', 0.2, [[23.05, 55.88], [23.08, 55.75], [23.10, 55.62], [23.08, 55.52], [23.20, 55.43], [23.33, 55.34], [23.47, 55.27], [23.47, 55.17], [23.42, 55.08]]),
        ('Minija', 0.22, [[22.00, 56.07], [21.83, 56.00], [21.62, 55.95], [21.50, 55.90], [21.44, 55.80], [21.40, 55.71], [21.36, 55.62], [21.32, 55.55], [21.29, 55.45], [21.27, 55.36], [21.25, 55.32]]),
        ('Jūra', 0.2, [[22.40, 55.66], [22.42, 55.55], [22.36, 55.42], [22.31, 55.31], [22.30, 55.255], [22.33, 55.18], [22.45, 55.11], [22.57, 55.075]]),
        ('Žeimena', 0.18, [[26.03, 55.26], [25.99, 55.17], [25.88, 55.05], [25.77, 54.99], [25.70, 54.92], [25.66, 54.88]]),
        ('Danė', 0.08, [[21.19, 55.77], [21.172, 55.752], [21.163, 55.738], [21.158, 55.727], [21.152, 55.719], [21.146, 55.715], [21.140, 55.7135], [21.133, 55.7120], [21.128, 55.7105], [21.121, 55.7090]]),
        ('Vilnia', 0.07, [[25.36, 54.66], [25.33, 54.670], [25.310, 54.676], [25.300, 54.6795], [25.2955, 54.6815], [25.2945, 54.6850], [25.2925, 54.6880], [25.2915, 54.6893]])]
for nm, w, p in HAND: riv.append({'n': nm, 'w': w, 'p': dens(p), 'hand': 1})
by = lambda n: [r for r in riv if r['n'] == n]
# Kaunas: Natural Earth puts the confluence 3 km too far west. The Nemunas and the Neris near the old town, drawn by hand.
CONF = (23.8770, 54.8990)
def splice(r, pts, keep_from_start):
    """Replace the part of river piece r within 4 km of the confluence by pts."""
    far = [p for p in r['p'] if km(p, CONF) > 4.0]
    if keep_from_start:
        head = []
        for p in r['p']:
            if km(p, CONF) <= 4.0: break
            head.append(p)
        r['p'] = dens(head + pts)
    else:
        tail = []
        for p in reversed(r['p']):
            if km(p, CONF) <= 4.0: break
            tail.append(p)
        r['p'] = dens(pts + tail[::-1])
nem_up = [[23.990, 54.8795], [23.960, 54.8785], [23.935, 54.8810], [23.913, 54.8865], [23.896, 54.8903], [23.886, 54.8932], list(CONF)]
nem_dn = [list(CONF), [23.866, 54.902], [23.852, 54.906], [23.8366, 54.9076]]
ner = [[23.958, 54.938], [23.940, 54.925], [23.918, 54.912], [23.902, 54.9045], [23.890, 54.9015], [23.881, 54.9000], list(CONF)]
for r in by('Nemunas'):
    i, d = closest(r['p'], CONF)
    if d > 4.5: continue
    if km(r['p'][-1], CONF) < km(r['p'][0], CONF): splice(r, [p for p in nem_up if km(p, CONF) <= 4.0], True)
    else: splice(r, [p for p in nem_dn if km(p, CONF) <= 4.0][:-1], False)
for r in by('Neris'):
    if km(r['p'][-1], CONF) < 5: splice(r, [p for p in ner if km(p, CONF) <= 4.0], True)
# Towns that stand on a river: [town, km from the centre to the river]
ON = {'Nemunas': [('Druskininkai', 0.6), ('Liškiava', 0.3), ('Merkinė', 0.8), ('Alytus', 0.7), ('Punia', 0.4), ('Birštonas', 0.5), ('Prienai', 0.5),
                  ('Kulautuva', 0.3), ('Zapyškis', 0.3), ('Vilkija', 0.4), ('Seredžius', 0.4), ('Veliuona', 0.4), ('Raudonė', 0.4), ('Jurbarkas', 0.8),
                  ('Smalininkai', 0.3)],
      'Neris': [('Jonava', 0.5), ('Kernavė', 0.4)],
      'Šventoji': [('Anykščiai', 0.3), ('Kavarskas', 0.3), ('Ukmergė', 0.7)],
      'Nevėžis': [('Panevėžys', 0.3), ('Krekenava', 0.3), ('Kėdainiai', 0.25), ('Babtai', 0.3)],
      'Šešupė': [('Kalvarija', 0.4), ('Marijampolė', 0.6), ('Kudirkos Naumiestis', 0.4)],
      'Venta': [('Kuršėnai', 0.4), ('Papilė', 0.3), ('Viekšniai', 0.3), ('Mažeikiai', 0.6)],
      'Merkys': [('Valkininkai', 0.3), ('Perloja', 0.3)],
      'Nemunėlis': [('Nemunėlio Radviliškis', 0.4)],
      'Dubysa': [('Lyduvėnai', 0.3), ('Betygala', 0.3), ('Ariogala', 0.5), ('Seredžius', 0.5)],
      'Minija': [('Kartena', 0.3), ('Gargždai', 0.4), ('Priekulė', 0.3)],
      'Jūra': [('Tauragė', 0.5)],
      'Žeimena': [('Švenčionėliai', 0.4), ('Pabradė', 0.4)]}
for nm, towns in ON.items():
    for tn, d0 in towns:
        if tn not in PL: print('  no place', tn); continue
        best = min(by(nm), key=lambda r: closest(r['p'], PL[tn])[1])
        d = closest(best['p'], PL[tn])[1]
        if d > 7: print(f'  {nm} is {d:.1f} km from {tn}: not bent'); continue
        anchor(best['p'], PL[tn], d0)
        print(f'  {nm} at {tn}: {d:.1f} km -> {d0}')
# Below Smalininkai the Nemunas is the border with East Prussia (Kaliningrad): lay it on the border line, which follows the real river.
from shapely.geometry import Point
from shapely.ops import substring
SMAL = (22.575, 55.072)
main = max(by('Nemunas'), key=lambda r: len(r['p']) if closest(r['p'], SMAL)[1] < 3 else 0)
line = min((LineString(b['p']) for b in bord if (b['a'], b['b']) == ('lt', 'ru')), key=lambda l: l.distance(Point(SMAL)))
i, _ = closest(main['p'], SMAL)
end = main['p'][-1]
d0, d1 = line.project(Point(main['p'][i])), line.project(Point(end))
seg = substring(line, d0, d1)
main['p'] = dens(main['p'][:i] + [list(c) for c in seg.coords][1:])
print('  Nemunas below Smalininkai laid on the border:', round(seg.length * 70), 'km')
for r in by('Nemunas'):            # the Atmata branch starts on the main river
    if r is main: continue
    j, d = closest(main['p'], r['p'][0])
    if d < 3: r['p'][0] = list(main['p'][j])
# tributaries end on their main river
MOUTH = {'Nevėžis': 'Nemunas', 'Šventoji': 'Neris', 'Neris': 'Nemunas', 'Merkys': 'Nemunas', 'Šešupė': 'Nemunas', 'Dubysa': 'Nemunas', 'Jūra': 'Nemunas',
         'Žeimena': 'Neris', 'Vilnia': 'Neris'}
for nm, main in MOUTH.items():
    for r in by(nm):
        m = r['p'][-1]
        cand = [(closest(q['p'], m), q) for q in by(main)]
        (i, d), q = min(cand, key=lambda c: c[0][1])
        if d > 4: continue
        if nm == 'Neris' and km(m, CONF) < 0.3: continue
        P = q['p'][i]
        s = arc(r['p']); L = s[-1]
        for j in range(len(r['p'])):
            w = math.exp(-((L - s[j]) / 1.5) ** 2)
            r['p'][j][0] += (P[0] - m[0]) * w; r['p'][j][1] += (P[1] - m[1]) * w
        r['p'][-1] = list(P)
out['rivers'] = []
for r in riv:
    s = LineString(r['p']).simplify(0.0004)
    out['rivers'].append({'n': r['n'], 'w': r['w'], 'p': [r4(c) for c in s.coords], 'thin': 1 if r['w'] < 0.12 else 0})
print('rivers', [(r['n'], len(r['p'])) for r in out['rivers']])
# ---- lakes: Natural Earth, without reservoirs made after 1918 (the Kaunas Sea dates from 1959) ----
lk = []
for f in ('ne_10m_lakes', 'ne_10m_lakes_europe'):
    for ft in feats(f'{DL}/ne/{f}.geojson'):
        g = shape(ft['geometry'])
        nm = ft['properties'].get('name') or ''
        if not g.intersects(MAP) or 'marios' in nm.lower() or nm == 'Kaliningradskiy Zaliv': continue
        for p in polys(g.intersection(MAP)):
            r = ring(p, 0.0008)
            if r: lk.append({'n': nm, 'p': r[0]})
out['lakes'] = lk
# ---- the Klaipėda Region (Memel Territory, 1920–1939): Lithuania west of the old border, from Nemirseta on the coast to the Nemunas
# above Jurbarkas. Kretinga, Gargždai, Švėkšna, Žemaičių Naumiestis and Jurbarkas stayed outside it.
cut = Polygon([(19.6, 55.866), (21.07, 55.866), (21.25, 55.84), (21.33, 55.78), (21.33, 55.72), (21.42, 55.64), (21.56, 55.53), (21.62, 55.44),
               (21.66, 55.37), (21.80, 55.30), (22.00, 55.23), (22.20, 55.16), (22.40, 55.11), (22.62, 55.093), (22.72, 55.0), (19.6, 55.0)])
out['kr'] = [r[0] for r in (ring(p, 0.0012) for p in polys(C['lt'].intersection(land).intersection(cut))) if r]
print('kr', [len(r) for r in out['kr']])
json.dump(out, open(OUT, 'w'), ensure_ascii=False)
