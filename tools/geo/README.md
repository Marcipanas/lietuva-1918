# tools/geo: the map of Lithuania

`js/geo.js` is generated. It holds the borders, coast, lagoon, rivers, big lakes, the Klaipėda Region and the list of towns and villages (`PLACES`). Hand-drawn data (soils, forests, deposits, small lakes, map labels) lives in `js/land.js` and is edited directly.

| Step | Command | Needs |
|---|---|---|
| Download sources into `tools/geo/dl` (not committed) | `sh tools/geo/fetch.sh` | curl, pip, unzip |
| Pick towns and villages: `tools/geo/places.json` | `python3 -I tools/geo/build_places.py tools/geo/dl tools/geo/places.json 94` | Python 3 |
| Build outlines and rivers: `tools/geo/geo.json` | `python3 -I tools/geo/build_geo.py tools/geo/dl tools/geo/places.json tools/geo/geo.json` | Python 3, shapely |
| Write `js/geo.js` from the two JSON files | `npm run geo` | Python 3 |
| Rebuild the 1918 start map from it | `npm run world` | Node 18 |

`places.json` and `geo.json` are committed, so `npm run geo` works without the downloads or shapely.

## Sources and licences

- Country borders: OpenStreetMap, © OpenStreetMap contributors, ODbL. Via the [osm-boundaries](https://github.com/missinglink/osm-boundaries) extracts.
- Coast, lakes and rivers: [Natural Earth](https://www.naturalearthdata.com/) 1:10m, public domain.
- Place names and positions: [Euronym](https://github.com/eurostat/euronym) by Eurostat, from EuroGeographics data under the EuroGeographics Open Data Licence. © EuroGeographics.
- Today's populations (only to size the smaller towns): GeoNames, CC BY 4.0, via the geonamescache package.

## What is adjusted by hand

- Natural Earth generalizes rivers by a kilometre or two. `build_geo.py` bends each river so it passes the towns that stand on it (`ON`), lays the Nemunas below Smalininkai on the border line (which follows the real river), joins tributaries to their main river, and draws the Kaunas confluence by hand.
- Small rivers missing from Natural Earth (Dubysa, Minija, Jūra, Žeimena, Danė, Vilnia) are drawn by hand and are approximate.
- Euronym puts a city's name in the middle of today's city. The five big cities start from their old centre instead (`CENTRE` in `build_places.py`).
- The Klaipėda Region line is approximate: from Nemirseta on the coast, west of Kretinga, Gargždai, Švėkšna and Žemaičių Naumiestis, to the Nemunas above Jurbarkas.
- Only towns that existed in 1918 are towns. Elektrėnai, Visaginas, Naujoji Akmenė and other later towns are left out.
