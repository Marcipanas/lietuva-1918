#!/usr/bin/env python3
"""Builds the parts of today's Lithuania that changed hands after 1918, from today's municipalities and elderships
(OpenStreetMap) and a few hand-drawn cuts. Writes tools/geo/regions.json, which write_geo.py turns into GEO_KRW, GEO_PAL, GEO_V39, GEO_V40.
Run: python3 -I tools/geo/build_regions.py <download dir> tools/geo/geo.json tools/geo/regions.json   (needs shapely)

- Palanga strip (pal): Courland's coast since 1819, from Nemirseta (the Prussian border) to the Latvian border, about 8 km
  inland, short of Kretinga. Latvia handed it to Lithuania on 30 March 1921, after James Young Simpson's award (183 km2).
- Vilnius region under Poland, October 1920 to 1939. The 1923 line ran west of the Grodno-Vilnius-Daugavpils railway, and
  today's district boundaries mostly follow it (Molėtai museum; VLE). Lithuanian side: Vievis, Semeliškės, Aukštadvaris and
  Onuškis (Pinkas Lita, independent Lithuania), Kernavė, Musninkai, the Molėtai and Utena districts, Salakas, Perloja (the right
  bank of the Merkys, VLE), Merkinė, Leipalingis. Polish side: the Vilnius, Šalčininkai, Švenčionys and Ignalina districts,
  most of Trakai, Varėna south of the Merkys, Druskininkai, Turmantas.
  - v39: what Lithuania got back in October 1939 (6,909 km2 by VLE): Vilnius, Trakai, Eišiškės, Valkininkai, Varėna,
    Švenčionėliai, Pabradė, Ignalina, Dūkštas, Turmantas (the counties of Vilnius, Valkininkai and Švenčionėliai).
  - v40: what the Byelorussian SSR kept until 6 November 1940 (about 2,600 km2): Švenčionys, Adutiškis, Mielagėnai,
    Tverečius, Daugėliškis, Rimšė, Šalčininkai, Dieveniškės, Marcinkonys, Rudnia, Druskininkai.
Each region is widened by about a kilometre where it meets the land outside Lithuania, so that no cell along today's border
is left out by the simplified outlines; inside Lithuania its lines are exact. The Klaipėda Region comes widened the same way
(kr): GEO_KR stays the outline the 1918 map was built with."""
import json, sys
from shapely.geometry import shape, Polygon
from shapely.ops import unary_union

DL, GEO, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
G = json.load(open(GEO))
LT = unary_union([Polygon(r) for r in G['land_lt']]).buffer(0)
KR = unary_union([Polygon(r) for r in G['kr']]).buffer(0)
adm = lambda i: shape(json.load(open(f'{DL}/adm/{i}.geojson'))['geometry']).buffer(0)

# municipalities that were Polish between the wars, whole
MUNI = {'Vilnius city': 968952, 'Vilnius district': 977316, 'Šalčininkai': 1016307, 'Švenčionys': 967318, 'Ignalina': 966363, 'Visaginas': 966362}
DRUSK = 1076928
# elderships (seniūnijos) on the Polish side in districts the line cut through
POLISH = {'Trakai': 3413482, 'Senieji Trakai': 3415040, 'Lentvaris': 1527478, 'Paluknys': 3442772, 'Rūdiškės': 3413458, 'Grendavė': 3499966,
          'Valkininkai': 3440694, 'Matuizos': 3440692, 'Vydeniai': 3440696, 'Jakėnai': 3440689, 'Kaniava': 3440690, 'Marcinkonys': 3440691,
          'Turmantas': 3456495}
LEIPALINGIS, VARENA, SALCININKAI = 3442766, 3440695, 3409510
# of those, what the Byelorussian SSR kept until November 1940
LATE = {'Švenčionys': 3413103, 'Švenčionys town': 5585192, 'Svirkos': 3413102, 'Adutiškis': 3413100, 'Cirkliškis': 3413101, 'Strūnaitis': 3409582,
        'Mielagėnai': 3413311, 'Tverečius': 3413312, 'Didžiasalis': 3413308, 'Ceikiniai': 3423468, 'Naujasis Daugėliškis': 3423473, 'Rimšė': 3423474,
        'Dieveniškės': 1531649, 'Poškonys': 1531648, 'Marcinkonys': 3440691, 'Kaniava': 3440690}

drusk = adm(DRUSK).difference(adm(LEIPALINGIS))          # Druskininkai and Viečiūnai; Leipalingis stayed Lithuanian
# Varėna eldership: the Merkys was the line. Perloja, on its right bank, stayed Lithuanian; the railway town to the south did not.
south_of_merkys = Polygon([(24.28, 54.10), (24.28, 54.198), (24.39, 54.203), (24.42, 54.206), (24.45, 54.222), (24.48, 54.240), (24.52, 54.258),
                           (24.56, 54.275), (24.60, 54.29), (24.66, 54.31), (24.72, 54.335), (24.72, 54.10)])
varena_pl = adm(VARENA).intersection(south_of_merkys)
# Šalčininkai eldership: Šalčininkėliai came back in 1939, the town of Šalčininkai in 1940
salc = adm(SALCININKAI)
salc_late = salc.intersection(Polygon([(25.28, 54.20), (25.28, 54.345), (25.36, 54.352), (25.42, 54.35), (25.50, 54.36), (25.62, 54.40), (25.62, 54.20)]))

polish = unary_union([adm(i) for i in MUNI.values()] + [adm(i) for i in POLISH.values()] + [drusk, varena_pl]).intersection(LT).buffer(0)
late = unary_union([adm(i) for i in LATE.values()] + [drusk, salc_late]).buffer(0)
V40 = polish.intersection(late).buffer(0)
V39 = polish.difference(late).buffer(0)
PAL = LT.intersection(Polygon([(20.9, 55.866), (21.07, 55.866), (21.12, 55.862), (21.17, 55.858), (21.185, 55.88), (21.19, 55.93), (21.19, 56.0),
                               (21.20, 56.05), (21.22, 56.12), (20.9, 56.12)])).difference(KR).buffer(0)
core = LT.difference(unary_union([V39, V40, PAL, KR])).buffer(0)

def widen(g, others):
    """Grow g by about a kilometre into the land outside Lithuania, never into the rest of Lithuania or another region."""
    return g.union(g.buffer(0.012).difference(LT)).difference(unary_union([core] + others)).buffer(0)
R = {'kr': widen(KR, [PAL, V39, V40]), 'pal': widen(PAL, [KR, V39, V40]), 'v39': widen(V39, [KR, PAL, V40]), 'v40': widen(V40, [KR, PAL, V39])}
r4 = lambda c: [round(c[0], 4), round(c[1], 4)]
def polys(g):
    """[{o: outer ring, h: holes}] in [lon, lat]"""
    out = []
    for p in (g.geoms if hasattr(g, 'geoms') else [g]):
        q = p.simplify(0.0008, preserve_topology=True)
        if q.is_empty or q.area < 2e-5: continue
        out.append({'o': [r4(c) for c in list(q.exterior.coords)[:-1]],
                    'h': [[r4(c) for c in list(h.coords)[:-1]] for h in q.interiors if Polygon(h).area > 2e-5]})
    return out
km2 = lambda g: round(g.area * 63.6 * 111.3)
print('inside Lithuania: v39', km2(V39), 'km2, v40', km2(V40), 'km2, pal', km2(PAL), 'km2')
res = {k: polys(g) for k, g in R.items()}
json.dump(res, open(OUT, 'w'), ensure_ascii=False)
print('wrote', OUT, {k: [(len(w['o']), len(w['h'])) for w in v] for k, v in res.items()})
