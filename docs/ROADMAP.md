# Roadmap

Ordered by value for the game right now. Each item has enough of a spec for an agent to start. Items marked **Decision** need the owner's call first.

## 1. Foreign trade (next)

Interwar Lithuania lived on exports: butter, bacon, eggs, flax, timber and live animals, mostly to Britain and Germany. It imported coal, metal, machinery, fuel and manufactured goods. Today the game has an abstract **Sell/Buy** button in every town. Replace it with trade that has geography, partners and history.

**Markets** (data in a new `MARKETS` table in data.js):

| Market | Reached through | Buys well | Sells | Notes |
|---|---|---|---|---|
| United Kingdom | sea port | dairy, meat, flax | metal, machinery later | the biggest buyer in the 1930s |
| Germany | land border at Kybartai (rail) and Tilsit/Panemunė (road), or by sea | timber, flax, meat, grain | metal, coal, machinery | trade closed or taxed in 1934–1935 (see events) |
| Latvia | land border north (Joniškis, Biržai, Zarasai) | grain, potatoes | fish, timber | small but close |
| Sweden, Denmark, Netherlands | sea port | timber, flax | metal | |
| Poland | land border south | | | closed until diplomatic relations in March 1938 |
| Soviet Union | via Latvia | | | mostly closed; optional |

**Mechanics**
- **Border crossings:** fixed points on the border (lon/lat in geo.js). A new *Customs post* building (1×1) must sit next to a crossing tile, with a road or railway reaching it from a town. Ports already work this way.
- **Export and import routes:** a route whose far end is a market, `{a: townIndex, b: -1 - marketIndex, mode, …}`, carried by the same vehicles. Cargo leaving a town is sold at that market's price; cargo coming back is bought. `routeEval` uses the path from the town to the crossing.
- **Prices:** each market has a price multiplier per good, a demand level that drops as you sell (price ×(1 − sold/quota)), recovering about 3% a month, and a tariff.
- **Contracts:** markets occasionally offer fixed deals, e.g. "UK: 600 dairy within a year at +25%", with a penalty for missing them. Shown as ministry-style cards.
- **Instant Sell/Buy** stays as a middleman option at worse prices (×0.7 when selling, ×1.8 when buying), so real trade routes pay off.
- **Trade balance:** track exports and imports per year in the Lithuania tab. A surplus could later strengthen the litas, lowering import prices.

**History** (verify each date before shipping):
- 1929–1933 Great Depression: export prices fall by about 40%, recovering through 1935.
- 1934–1935 German boycott of Lithuanian farm goods, after the Neumann-Sass trial over Nazi activity in Klaipėda: the Germany market closes, then reopens with a trade agreement.
- March 1938: Lithuania and Poland establish diplomatic relations after the Polish ultimatum; the southern border opens.
- 1939 onward is dark history (Klaipėda annexed by Germany in March 1939, then occupation in 1940). **Decision:** does the game keep history after 1938, or switch to an alternate history where the republic continues?

**Acceptance:** a scripted test builds a customs post at Kybartai, creates an export route from Kaunas, and earns money; trade figures appear in the Lithuania tab; the Sell button pays less than a route does.

## 2. Gameplay depth, smaller items

- Multiple save slots, and export/import of a save as a file (also lets a game move between the artifact and the hosted version).
- A short guided tutorial in the first 10 minutes, driven by the ministry tasks.
- Ships: the port shows ships arriving with imports.
- Day/night cycle tied to electrification: night lights grow from oil lamps to full electric light.
- Sound: ambient sounds by season and zoom, train whistles. Sound must start from a tap.
- Balance pass for the late game (era 3), once someone has played that far.

## 3. The 3D world: next steps

Done in v0.4: no grid, curved roads and railways with automatic junctions, buildings at any angle, a three.js view with a rotating and tilting camera, shadows, seasons, a field patchwork, animated people, vehicles, smoke, animals and boats. Next, roughly in order of value:
- **Gentle hills.** Lithuania is flat but not perfectly: a height field (uplands of Žemaitija and Aukštaitija, river valleys) under the ground, roads and buildings following it.
- **Better water:** moving reflections, shores, the Curonian Spit dunes.
- **Street detail when close:** fences, gardens, lamp posts, people at stations; window lights at dusk, electric light from the Industrialization era.
- **Road junction shapes:** proper crossroads instead of discs, and curved roads that bank smoothly into each other.
- **Building variety:** two or three models per type and level, chosen by id; churches and town halls by region.
- **Performance on older phones:** a low-quality setting (no shadows, fewer trees, lower pixel ratio) and a frame-time watchdog that switches to it.
- **A game engine (Godot 4)** only if the project wants installable builds or a store release; the rules port, the view would be rebuilt.

## 4. Platform and offline

- **Done:** the PWA. `manifest.webmanifest` plus `sw.js` cache everything after the first online visit, so the game runs in flight mode when installed from the hosted site (Add to Home Screen).
- **Next:** a "Download save" and "Load save" button, because saves live in browser storage per site.
- **Later, if wanted:** a desktop wrapper (Tauri) or app-store builds; with option D these come with the engine.
