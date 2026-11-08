#!/usr/bin/env python3
"""Picks the towns and villages of the game from Euronym place names (EuroGeographics), at their real places.
Run: python3 -I tools/geo/build_places.py <download dir> <out json> [min rs]
Euronym's rs is the coarsest map resolution (m per pixel) at which a name is still shown: bigger means more important."""
import csv, json, math, sys, re
DL, OUT = sys.argv[1], sys.argv[2]
MIN_RS = int(sys.argv[3]) if len(sys.argv) > 3 else 94
rows = list(csv.DictReader(open(f'{DL}/en/LT_20.csv', encoding='utf-8')))
gn = {c['name']: c for c in json.load(open(f'{DL}/gn/lt500.json'))}
km = lambda a, b: math.hypot((a[0] - b[0]) * 63.6, (a[1] - b[1]) * 111.3)

# Towns of Lithuania that existed in 1918 (town rights today, or a market town then). Founded after 1918 and left out:
# Elektrėnai, Visaginas, Naujoji Akmenė, Baltoji Vokė, Grigiškės, Ežerėlis (and Neringa, a 1961 merger of Nida and other villages).
TOWNS = '''Akmenė Alytus Anykščiai Ariogala Birštonas Biržai Daugai Druskininkai Dūkštas Dusetos Eišiškės Gargždai Garliava Gelgaudiškis Ignalina
Jieznas Jonava Joniškėlis Joniškis Jurbarkas Kaišiadorys Kalvarija Kaunas Kavarskas Kėdainiai Kelmė Klaipėda Kretinga Kupiškis Kuršėnai
Kybartai Lazdijai Lentvaris Linkuva Marijampolė Mažeikiai Molėtai Nemenčinė Obeliai Pabradė Pagėgiai Pakruojis Palanga Pandėlys Panevėžys
Pasvalys Plungė Priekulė Prienai Radviliškis Ramygala Raseiniai Rietavas Rokiškis Rūdiškės Salantai Seda Simnas Skaudvilė Skuodas Smalininkai
Subačius Šakiai Šalčininkai Šeduva Šiauliai Šilalė Šilutė Širvintos Švenčionėliai Švenčionys Tauragė Telšiai Tytuvėnai Trakai Troškūnai Ukmergė
Utena Užventis Vabalninkas Varėna Varniai Veisiejai Viekšniai Vievis Vilkaviškis Vilkija Vilnius Virbalis Zarasai Žagarė Žiežmariai
Kudirkos_Naumiestis Nemunėlio_Radviliškis Žemaičių_Naumiestis'''.split()
TOWNS = [t.replace('_', ' ') for t in TOWNS]
LATER = {'Elektrėnai', 'Visaginas', 'Naujoji Akmenė', 'Baltoji Vokė', 'Grigiškės', 'Ežerėlis', 'Sniečkus', 'Neringa'}
# villages inside these radii (km) are parts of the city
CITIES = {'Vilnius': 6.0, 'Kaunas': 5.5, 'Klaipėda': 4.0, 'Šiauliai': 3.5, 'Panevėžys': 3.5}
# Euronym puts a city's name in the middle of today's city. The game starts from the old centre: the town hall or main square.
CENTRE = {'Vilnius': (25.2872, 54.6778), 'Kaunas': (23.8858, 54.8969), 'Klaipėda': (21.1350, 55.7100), 'Šiauliai': (23.3130, 55.9320),
          'Panevėžys': (24.3580, 55.7330)}
EXTRA = [('Vievis', 24.800, 54.767, 'town'), ('Nida', 21.004, 55.304, 'village'), ('Juodkrantė', 21.120, 55.546, 'village'), ('Rusnė', 21.372, 55.298, 'village'),
         ('Kudirkos Naumiestis', 22.862, 54.773, 'town'), ('Žemaičių Naumiestis', 21.703, 55.361, 'town')]

seen = {}
for r in rows:
    n = r['name'].strip()
    if 'seniūnija' in n or n in LATER: continue
    p = (float(r['lon']), float(r['lat']))
    rs = int(r['rs'])
    if n in seen and km(seen[n]['p'], p) < 6:
        if rs > seen[n]['rs']: seen[n].update(p=p, rs=rs)
        continue
    key = n if n not in seen else f'{n}#{len(seen)}'
    seen[key] = {'n': n, 'p': p, 'rs': rs}
for n, lo, la, k in EXTRA:
    if not any(v['n'] == n for v in seen.values()): seen[n] = {'n': n, 'p': (lo, la), 'rs': 200}
pl = list(seen.values())
by = {}
for v in pl: by.setdefault(v['n'], []).append(v)
# variants like "Akmenė II" next to "Akmenė": keep the main one
base = lambda n: re.sub(r'\s+(I|II|III|IV)$', '', n)
pl = [v for v in pl if base(v['n']) == v['n'] or not any(km(w['p'], v['p']) < 8 for w in by.get(base(v['n']), []))]
for v in pl:
    if v['n'] in CENTRE and v['rs'] >= max(w['rs'] for w in by[v['n']]): v['p'] = CENTRE[v['n']]
city = {v['n']: v for v in pl if v['n'] in CITIES and v['p'] == CENTRE[v['n']]}
out = []
for v in sorted(pl, key=lambda v: -v['rs']):
    n = v['n']
    town = n in TOWNS and not any(o['n'] == n and o['k'] == 'town' for o in out)
    if not town and v['rs'] < MIN_RS: continue
    if not town and n in TOWNS: continue                      # a village named like a town elsewhere: confusing in lists
    if not town and any(km(c['p'], v['p']) < CITIES[c['n']] for c in city.values()): continue   # a part of a city
    if any(km(o['p'], v['p']) < (2.5 if o['k'] != 'village' else 3.0) and not (town and o['k'] == 'village') for o in out): continue
    g = gn.get(n) or gn.get(n.replace('ė', 'e'))
    out.append({'n': n, 'p': [round(v['p'][0], 4), round(v['p'][1], 4)], 'k': 'town' if town else 'village', 'rs': v['rs'], 'gp': g['population'] if g else 0})
# towns placed later may knock out villages placed earlier: drop villages too close to a town
towns = [o for o in out if o['k'] == 'town']
out = [o for o in out if o['k'] == 'town' or not any(km(t['p'], o['p']) < 2.8 for t in towns)]
missing = [t for t in TOWNS if not any(o['n'] == t for o in out)]
print('towns', sum(1 for o in out if o['k'] == 'town'), 'villages', sum(1 for o in out if o['k'] == 'village'), 'missing towns', missing)
json.dump(out, open(OUT, 'w'), ensure_ascii=False)
