# Lietuva 1918 — guide for AI coding agents

A 3D economy and city builder of Lithuania from 16 February 1918, in the spirit of Workers & Resources. The world has **no grid**: roads and railways are free curves, buildings sit at any angle. Plain JavaScript, three.js for the view, **no build step**. It runs from any static host, offline as a PWA, and as a claude.ai artifact.

Read this file first. Details live in `docs/`:
- `docs/ARCHITECTURE.md`: modules, data structures, units, tick order, the 3D view, performance budget
- `docs/GAME_DESIGN.md`: every mechanic and number
- `docs/ROADMAP.md`: planned features with specs
- `docs/DECISIONS.md`: why things are the way they are

## Commands

| Command | What it does |
|---|---|
| `npm test` | Static checks plus a headless smoke test: loads every script in a stub DOM (three.js runs for real; only WebGL is stubbed), plays about two in-game years through the real tools, trades through a border post, jumps through history's key decisions (1934, 1940, 1946, 1947), renders every panel and zoom level, saves and reloads. **Must pass before every commit.** |
| `npm run serve` | Local server on http://localhost:8080. The service worker needs http, not `file://`. |
| `npm run build:artifact` | Writes `dist/artifact.html` for publishing as a claude.ai artifact. |
| `npm run icons` | Regenerates the PWA icons (needs Python Pillow). |

There is nothing to install. Node 18+ for the tools, any browser with WebGL to play.

## Ground rules

1. **No bundlers and no npm packages.** The one library is three.js r159, vendored as `vendor/three.min.js` (the last version with a classic-script build). Do not add others without a decision in `docs/DECISIONS.md`.
2. **All scripts share one global scope.** A top-level `const`/`let`/`class`/`function` name may exist in only one file. A duplicate is a SyntaxError that silently stops the later file in a browser. `tools/check.js` parses all scripts together to catch it. Watch for names already taken by the data: `SEA`, `LT`, `KR`, `FIELDS`, `FOR`, `RIV`, `LAKES` (geo.js), `FOOD`, `FOODS`, `MARKETS`, `CARDS`, `HEV`. Both `SEA` and `FIELDS` have caused this bug.
3. **Units are km.** `x` east, `z` south, `y` up. Distances between places are true; towns are drawn about five times larger than life (a lot is 0.42 km). Buildings and lots are rotated boxes `{x, z, rot, w, d}`; local +z is the front, which faces the road. Models are written at twice their size and scaled by `MS` = 0.5.
4. **Simulation code never touches the DOM, the canvas or THREE.** `common`, `data`, `geo`, `geom`, `terrain`, `world`, `sim` and `history` must run headless; the smoke test depends on it. The view reads the world; the world signals changes through `WV` version counters and `terrainHook`.
5. **Saved games:** if you change the shape of `S`, of an edge, a lot or a building, bump `SAVE_KEY` in `js/data.js` and the `v` checks in `newGame`/`load` in `js/sim.js`. Old saves are then ignored instead of crashing.
6. **Offline cache:** after changing any shipped file, bump `VERSION` in `sw.js`. A new file must also be added to `SHELL` in `sw.js` and to `index.html`; `tools/check.js` fails otherwise.
7. **Performance:** add drawable things as instances in an existing `Pool` (scene.js), give anything numerous a distance limit, and rebuild meshes only when a version counter changes. See the budget in `docs/ARCHITECTURE.md`.
8. **Copy:** plain words, active voice, short sentences, no em-dash asides. Buttons say what happens ("Build", "Remove route"). Distances in km, population in thousands (`popStr`), goods per day.
9. **History:** dates and facts in events and descriptions must be accurate. If only the year is certain, give the event `y: 1` so the Chronicle shows the year alone. Every decision-card option says whether it is what happened. Dark events (deportations, the Holocaust) are stated plainly and are never choices.

## Code map (load order)

| File | Role | Touches DOM, canvas or THREE |
|---|---|---|
| `vendor/three.min.js` | three.js r159 (global `THREE`) | — |
| `js/common.js` | `ICON` set and `ic()`, formatting (`fmt`, `fd`, `popStr`, `dateStr`), `hash2`/`vnoise`, `pip`, `rng` | no |
| `js/data.js` | Rules: map and distance constants, resources `RES`/`RI`, buildings `BT` (with footprints `fp`), vehicles `VT`, roads `ROADT`/`RAILT`, eras, 1918 towns (`TOWNS0`, `TOWNS1`), village names, historic lines and routes, place names | no |
| `js/geo.js` | Lithuania in lon/lat: border, sea, lagoon, rivers, lakes, forests, soils, deposits | no |
| `js/geom.js` | Points, segments, polylines (`polyAt`, `polyClosest`, `polySlice`, `chaikin`, `rdp`), rotated boxes (`obb*`), `SpatialHash` | no |
| `js/terrain.js` | Hidden 0.5 km raster (`TT`, `TF`, `BLK`), `genTerrain`, cell helpers, A* planner (`planPath`, `planTrace`, `lineCheck`) | no |
| `js/world.js` | Road and rail graph (`buildLine`, `splitEdge`, `newRuns`), buildings (`addB`, `validPlace`), lots (`lotSpots`, `zonePlan`), removal (`bullPlan`), `analyze()` and `pairPath`, the 1918 map with towns and villages | no |
| `js/sim.js` | Game state `S`, daily `tick()`, routes, labour and commuting, food (with each settlement's own fields), heating, pollution, growth on lots, random events, ministry tasks, save and load | no |
| `js/history.js` | Markets abroad (`MARKETS`), gateways (`townGates`), trade deals (`runDeals`), the timeline (`HEV`), decision cards (`CARDS`, `queueCard`, `pickCard`), security, the Soviet plan and Union projects, `histTick()` | no |
| `js/models.js` | Low-poly models built with `MB`; `MODEL_FN` per building type (village halls draw as a chapel); house parts and `lotLayout` (farmsteads too); trees, people, animals, vehicles | THREE |
| `js/scene.js` | Renderer, camera rig, light and shadows, snow shader, ground and field patchwork, water, roads and rails, instanced buildings and trees, smoke, overlays, HTML labels, picking, `draw()` | DOM, THREE |
| `js/agents.js` | Walking residents, commuters and route vehicles (visual only) | THREE |
| `js/input.js` | Gestures and keys; the tools (`TOOL`, `PEND`, `beginDraw`, `setGhost`, `doConfirm`) | DOM |
| `js/panels.js` | Side panel HTML as strings, with `v()`/`w()` dynamic fields: town, building, routes, trade or plan, Lithuania (security), chronicle | no writes |
| `js/tutorial.js` | First-time hint card (`TUT_STEPS`); the tools report actions with `tutEvent` | DOM |
| `js/ui.js` | Toolbar, build drawer, confirm bar, tabs, `act()` actions, decision card dialog (`showCard`), main loop, `start()` boot | DOM |

## Concepts you need before changing code

- **Terrain raster:** cells of `CELL` = 0.5 km hold terrain (`TT`) and feature bits (`TF`: forest, fertile, bog, clay, flax, Klaipėda Region, inside Lithuania). It drives rules and path planning only. Forest clearing goes through `setFlags`, which calls `terrainHook` so the view updates.
- **The graph:** `S.nodes` and `S.edges` (`{id, k: 'road'|'rail', lv, a, b, p}`); runtime lookups `NODES`, `EDGES` and the spatial hash `EH`. Always change it through `buildLine`, `splitEdge`, `removeEdge` or `applyBull`, which keep indexes and `WV.net` right.
- **Settlements:** `S.towns` holds towns and villages (`t.vil`). Each feeds and heats its 1918 population `t.pop0` from its own land, so it keeps its size without help; growth needs food, homes and jobs. `t.capital` marks Vilnius (`t.cap` is storage capacity).
- **Network:** `analyze()` gives every road point an owner by road distance (two multi-source Dijkstra sweeps from the halls: plain for homes, with a 6 km head start against villages for workplaces), assigns buildings and lots within `TERRITORY` km, finds neighbours where catchments meet, linked groups (union-find), the power grid, line upkeep and pollution sources. Town-to-town paths come from `pairPath(k, a, b)`, computed on demand and cached until `NET.ver` changes. Set `NET.dirty = true` after any change that affects them.
- **Day tick:** phase1 → `routeEval` → `commute` → phase1b → power grid → phase2 → `runRoutes` → `runDeals` → `develop` → upkeep → `histTick` (events, cards, security, plan) → random events → ministry tasks. See `tick()` in `js/sim.js`.
- **History:** a decision card in `S.hist.cards` pauses the game (`S.speed = 0`); `pickCard(n)` applies an option and restores the speed. `S.hist.path` is `'free'`, `'soviet'` or `'neutral'`; events check it with `when`.
- **Goods move only on routes.** Auto cargo equalizes days of supply in one direction only, so goods never ping-pong. Trade abroad leaves from the stock of a town with a border post or port (deals), so routes bring goods to the border.
- **Agents are visual only.** Walkers and vehicles show what the aggregated simulation does; they never move goods.
- **Panels:** `renderPanel(false)` rebuilds nothing if the HTML structure is unchanged; it only patches values made with `v(key, text)` and widths made with `w(key, pct)`. A changing number shown without `v()` re-renders the panel every 0.3 s and buttons stop responding.

## Recipes

- **New building:** add it to `BT` in `data.js` (cat, era, `fp: [w, d]` in km, w, in/out, need, cost, pol, d). Add a model function to `MODEL_FN` in `models.js` (front at +z, fit the footprint; optional `smoke`, `fields`, `flag`, `cows`, `pigs`, `boat`). If it needs special ground, extend `validPlace` in `world.js`. Add an icon to `ICON` if none fits, then place one in `tools/smoke-test.js`.
- **New resource:** `RES` and `RI` in `data.js`, `RCOL` in `agents.js`, CSS variable `--r-<name>` in `css/style.css`, an icon. If it is food, add it to `FOOD`.
- **New historical event:** `HEV` in `history.js` with an exact date (`y: 1` if only the year is known) and `when` for the path it belongs to. Random events go in `REV` (sim.js).
- **New decision card:** an entry in `CARDS` (history.js) with `t`, `when` (date text), `txt` and `opts` (`t`, `d` saying whether it happened, optional `risk: {sec}`, `go(ok)`), then an `HEV` entry with `card: 'id'`. Drive it in the smoke test with the `jump()` helper and `act({act: 'card', o})`.
- **New market or good abroad:** `MARKETS` in history.js (`gate`, `buy`, `sell`) and its opening state in `newMarkets()`.
- **New ministry task:** `OBJ` in `sim.js`.
- **New panel section:** a string function in `panels.js`; route every changing number through `v()`.
- **New overlay:** add it in `buildOverlays` (scene.js) and include whatever it depends on in that function's cache key.

## Testing

`tools/smoke-test.js` is the safety net. When you add a system, drive it through the same functions the UI calls (`setTool`, `beginDraw`/`moveDraw`/`finishDraw`, `setGhost`, `doConfirm`, `act({...})`) with world km coordinates, and assert on `S`. For visuals, run `npm run serve` and check a phone-sized viewport (390×844) in a real browser; headless Chromium can screenshot WebGL with `--use-angle=swiftshader --enable-unsafe-swiftshader`.

## Publishing

- **GitHub Pages:** `.github/workflows/pages.yml` deploys `main` after the tests pass. One-time setup: Settings → Pages → Source: GitHub Actions. On GitHub's free plan Pages needs a public repository, so the deploy job is skipped while the repository is private.
- **claude.ai artifact:** `npm run build:artifact`, then publish `dist/artifact.html` with `css/style.css`, `vendor/three.min.js` and `js/*.js` as supporting files at the same relative paths. Service workers do not run inside artifacts.
