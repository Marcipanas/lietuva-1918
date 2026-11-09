# tools/geo: the map of Lithuania

`js/geo.js` is generated. It holds the borders, coast, lagoon, rivers, big lakes, the Klaipėda Region, the other parts of today's Lithuania that changed hands after 1918 (the Palanga strip and the Vilnius region) and the list of towns and villages (`PLACES`). Hand-drawn data (soils, forests, deposits, small lakes, map labels) lives in `js/land.js` and is edited directly.

| Step | Command | Needs |
|---|---|---|
| Download sources into `tools/geo/dl` (not committed) | `sh tools/geo/fetch.sh` | curl, pip, unzip |
| Pick towns and villages: `tools/geo/places.json` | `python3 -I tools/geo/build_places.py tools/geo/dl tools/geo/places.json 94` | Python 3 |
| Build outlines and rivers: `tools/geo/geo.json` | `python3 -I tools/geo/build_geo.py tools/geo/dl tools/geo/places.json tools/geo/geo.json` | Python 3, shapely |
| Build the regions that changed hands: `tools/geo/regions.json` | `python3 -I tools/geo/build_regions.py tools/geo/dl tools/geo/geo.json tools/geo/regions.json` | Python 3, shapely |
| Write `js/geo.js` from the two JSON files | `npm run geo` | Python 3 |
| Rebuild the 1918 start map from it | `npm run world` | Node 18 |

`places.json`, `geo.json` and `regions.json` are committed, so `npm run geo` works without the downloads or shapely.

## Sources and licences

- Country borders, and today's municipalities and elderships used for the borders of 1920 to 1940: OpenStreetMap, © OpenStreetMap contributors, ODbL. Via the [osm-boundaries](https://github.com/missinglink/osm-boundaries) extracts.
- Coast, lakes and rivers: [Natural Earth](https://www.naturalearthdata.com/) 1:10m, public domain.
- Place names and positions: [Euronym](https://github.com/eurostat/euronym) by Eurostat, from EuroGeographics data under the EuroGeographics Open Data Licence. © EuroGeographics.
- Today's populations (only to size the smaller towns): GeoNames, CC BY 4.0, via the geonamescache package.

## What is adjusted by hand

- Natural Earth generalizes rivers by a kilometre or two. `build_geo.py` bends each river so it passes the towns that stand on it (`ON`), lays the Nemunas below Smalininkai on the border line (which follows the real river), joins tributaries to their main river, and draws the Kaunas confluence by hand.
- Small rivers missing from Natural Earth (Dubysa, Minija, Jūra, Žeimena, Danė, Vilnia) are drawn by hand and are approximate.
- Euronym puts a city's name in the middle of today's city. The five big cities start from their old centre instead (`CENTRE` in `build_places.py`).
- The Klaipėda Region line is approximate: from Nemirseta on the coast, west of Kretinga, Gargždai, Švėkšna and Žemaičių Naumiestis, to the Nemunas above Jurbarkas.
- Only towns that existed in 1918 are towns. Elektrėnai, Visaginas, Naujoji Akmenė and other later towns are left out.

## The borders of 1918 to 1945

`build_regions.py` draws the parts of today's Lithuania that belonged to someone else for a while. The game starts with them as they were on 16 February 1918 and history moves them (`S.own`, see `docs/ARCHITECTURE.md`).

- **Klaipėda Region** (`kr`, from `build_geo.py`): part of Germany until the Allies took it over on 15 February 1920; Lithuanian from 16 February 1923; German again from 22 March 1939.
- **Palanga strip** (`pal`): Courland's coast since 1819, from Nemirseta to the Latvian border, about 8 km inland and short of Kretinga. Latvia handed it over on 30 March 1921, after James Young Simpson's award (183 km² by the encyclopedia VLE; this outline has 209).
- **Vilnius region** (`v39`, `v40`): Polish from October 1920. The 1923 line ran west of the Grodno–Vilnius–Daugavpils railway, and today's district boundaries mostly follow it, so the region is built from whole municipalities and elderships. Towns checked against sources: Vievis, Semeliškės, Aukštadvaris and Onuškis were in independent Lithuania (Pinkas HaKehillot Lita), so were Kernavė, Musninkai and Salakas; Perloja, on the right bank of the Merkys, stayed Lithuanian (VLE). The line is approximate where an eldership was split (Varėna along the Merkys, Šalčininkai between Šalčininkėliai and the town).
  - `v39`: what Lithuania got back in October 1939 (6,909 km² by VLE; this outline has 7,284): the counties of Vilnius, Valkininkai and Švenčionėliai.
  - `v40`: what the Byelorussian SSR kept until 6 November 1940 (about 2,600 km²; this outline has 2,608): Švenčionys, Adutiškis, Mielagėnai, Tverečius, Rimšė, Šalčininkai, Dieveniškės, Marcinkonys, Rudnia, Druskininkai.

Each region is widened by about a kilometre where it meets the land outside Lithuania, so no raster cell along today's border is left out by the simplified outlines. Inside Lithuania its lines are exact.
