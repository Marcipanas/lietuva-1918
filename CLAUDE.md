# Lietuva 1918 — guide for AI coding agents

A 3D economy and city builder of Lithuania from 16 February 1918, in the spirit of Workers & Resources. The world has **no grid**: roads and railways are free curves, buildings sit at any angle. Plain JavaScript, three.js for the view, **no build step**. It runs from any static host, offline as a PWA, and as a claude.ai artifact.

Read this file first. Details live in `docs/`:
- `docs/ARCHITECTURE.md`: modules, data structures, units, tick order, the 3D view, performance budget
- `docs/GAME_DESIGN.md`: every mechanic and number
- `docs/ROADMAP.md`: planned features (foreign trade next) with specs
- `docs/DECISIONS.md`: why things are the way they are

## Commands

| Command | What it does |
|---|---|
| `npm test` | Static checks plus a headless smoke test: loads every script in a stub DOM (three.js runs for real; only WebGL is stubbed), plays about two in-game years through the real tools, renders every panel and zoom level, saves and reloads. **Must pass before every commit.** |
| `npm run serve` | Local server on http://localhost:8080. The service worker needs http, not `file://`. |
| `npm run build:artifact` | Writes `dist/artifact.html` for publishing as a claude.ai artifact. |
| `npm run icons` | Regenerates the PWA icons (needs Python Pillow). |

There is nothing to install. Node 18+ for the tools, any browser with WebGL to play.

## Ground rules

1. **No bundlers and no npm packages.** The one library is three.js r159, vendored as `vendor/three.min.js` (the last version with a classic-script build). Do not add others without a decision in `docs/DECISIONS.md`.
2. **All scripts share one global scope.** A top-level `const`/`let`/`class`/`function` name may exist in only one file. A duplicate is a SyntaxError that silently stops the later file in a browser. `tools/check.js` parses all scripts together to catch it. Watch for names already taken by the data: `SEA`, `LT`, `KR`, `FIELDS`, `FOR`, `RIV`, `LAKES` (geo.js). Both `SEA` and `FIELDS` have caused this bug.
3. **Units are km.** `x` east, `z` south, `y` up. Buildings and lots are rotated boxes `{x, z, rot, w, d}`; local +z is the front, which faces the road.
4. **Simulation code never touches the DOM, the canvas or THREE.** `common`, `data`, `geo`, `geom`, `terrain`, `world` and `sim` must run headless; the smoke test depends on it. The view reads the world; the world signals changes through `WV` version counters and `terrainHook`.
5. **Saved games:** if you change the shape of `S`, of an edge, a lot or a building, bump `SAVE_KEY` in `js/data.js` and the `v` checks in `newGame`/`load` in `js/sim.js`. Old saves are then ignored instead of crashing.
6. **Offline cache:** after changing any shipped file, bump `VERSION` in `sw.js`. A new file must also be added to `SHELL` in `sw.js` and to `index.html`; `tools/check.js` fails otherwise.
7. **Performance:** add drawable things as instances in an existing `Pool` (scene.js), give anything numerous a distance limit, and rebuild meshes only when a version counter changes. See the budget in `docs/ARCHITECTURE.md`.
8. **Copy:** plain words, active voice, short sentences, no em-dash asides. Buttons say what happens ("Build", "Remove route"). Distances in km, population in thousands (`popStr`), goods per day.
9. **History:** dates and facts in events and descriptions must be accurate. If unsure, leave the date out rather than invent one.

## Code map (load order)

| File | Role | Touches DOM, canvas or THREE |
|---|---|---|
| `vendor/three.min.js` | three.js r159 (global `THREE`) | — |
| `js/common.js` | `ICON` set and `ic()`, formatting (`fmt`, `fd`, `popStr`, `dateStr`), `hash2`/`vnoise`, `pip`, `rng` | no |
| `js/data.js` | Rules: map and distance constants, resources `RES`/`RI`, buildings `BT` (with footprints `fp`), vehicles `VT`, roads `ROADT`/`RAILT`, eras, 1918 towns, historic lines and routes, place names | no |
| `js/geo.js` | Lithuania in lon/lat: border, sea, lagoon, rivers, lakes, forests, soils, deposits | no |
| `js/geom.js` | Points, segments, polylines (`polyAt`, `polyClosest`, `polySlice`, `chaikin`, `rdp`), rotated boxes (`obb*`), `SpatialHash` | no |
| `js/terrain.js` | Hidden 0.5 km raster (`TT`, `TF`, `BLK`), `genTerrain`, cell helpers, A* planner (`planPath`, `planTrace`, `lineCheck`) | no |
| `js/world.js` | Road and rail graph (`buildLine`, `splitEdge`, `newRuns`), buildings (`addB`, `validPlace`), lots (`lotSpots`, `zonePlan`), removal (`bullPlan`), `analyze()`, the 1918 map | no |
| `js/sim.js` | Game state `S`, daily `tick()`, routes, labour and commuting, food, heating, pollution, growth on lots, events, ministry tasks, save and load | no |
| `js/models.js` | Low-poly models built with `MB`; `MODEL_FN` per building type; house parts and `lotLayout`; trees, people, animals, vehicles | THREE |
| `js/scene.js` | Renderer, camera rig, light and shadows, snow shader, ground and field patchwork, water, roads and rails, instanced buildings and trees, smoke, overlays, HTML labels, picking, `draw()` | DOM, THREE |
| `js/agents.js` | Walking residents, commuters and route vehicles (visual only) | THREE |
| `js/input.js` | Gestures and keys; the tools (`TOOL`, `PEND`, `beginDraw`, `setGhost`, `doConfirm`) | DOM |
| `js/panels.js` | Side panel HTML as strings, with `v()`/`w()` dynamic fields | no writes |
| `js/ui.js` | Toolbar, build drawer, confirm bar, tabs, `act()` actions, main loop, `start()` boot | DOM |

## Concepts you need before changing code

- **Terrain raster:** cells of `CELL` = 0.5 km hold terrain (`TT`) and feature bits (`TF`: forest, fertile, bog, clay, flax, Klaipėda Region, inside Lithuania). It drives rules and path planning only. Forest clearing goes through `setFlags`, which calls `terrainHook` so the view updates.
- **The graph:** `S.nodes` and `S.edges` (`{id, k: 'road'|'rail', lv, a, b, p}`); runtime lookups `NODES`, `EDGES` and the spatial hash `EH`. Always change it through `buildLine`, `splitEdge`, `removeEdge` or `applyBull`, which keep indexes and `WV.net` right.
- **Network:** `analyze()` gives every road point a nearest town by road distance (multi-source Dijkstra from the halls), assigns buildings and lots to towns within `TERRITORY` km, computes town-to-town paths `NET.pairs` (km, weakest level, polyline), neighbour links, the power grid, line upkeep and pollution sources. Set `NET.dirty = true` after any change that affects them.
- **Day tick:** phase1 → `routeEval` → `commute` → phase1b → power grid → phase2 → `runRoutes` → `develop` → upkeep → events → ministry tasks. See `tick()` in `js/sim.js`.
- **Goods move only on routes.** Auto cargo equalizes days of supply in one direction only, so goods never ping-pong.
- **Agents are visual only.** Walkers and vehicles show what the aggregated simulation does; they never move goods.
- **Panels:** `renderPanel(false)` rebuilds nothing if the HTML structure is unchanged; it only patches values made with `v(key, text)` and widths made with `w(key, pct)`. A changing number shown without `v()` re-renders the panel every 0.3 s and buttons stop responding.

## Recipes

- **New building:** add it to `BT` in `data.js` (cat, era, `fp: [w, d]` in km, w, in/out, need, cost, pol, d). Add a model function to `MODEL_FN` in `models.js` (front at +z, fit the footprint; optional `smoke`, `fields`, `flag`, `cows`, `pigs`, `boat`). If it needs special ground, extend `validPlace` in `world.js`. Add an icon to `ICON` if none fits, then place one in `tools/smoke-test.js`.
- **New resource:** `RES` and `RI` in `data.js`, `RCOL` in `agents.js`, CSS variable `--r-<name>` in `css/style.css`, an icon. If it is food, add it to `FOOD`.
- **New historical event:** `HEV` in `sim.js` with an exact date. Random events go in `REV`.
- **New ministry task:** `OBJ` in `sim.js`.
- **New panel section:** a string function in `panels.js`; route every changing number through `v()`.
- **New overlay:** add it in `buildOverlays` (scene.js) and include whatever it depends on in that function's cache key.

## Testing

`tools/smoke-test.js` is the safety net. When you add a system, drive it through the same functions the UI calls (`setTool`, `beginDraw`/`moveDraw`/`finishDraw`, `setGhost`, `doConfirm`, `act({...})`) with world km coordinates, and assert on `S`. For visuals, run `npm run serve` and check a phone-sized viewport (390×844) in a real browser; headless Chromium can screenshot WebGL with `--use-angle=swiftshader --enable-unsafe-swiftshader`.

## Publishing

- **GitHub Pages:** `.github/workflows/pages.yml` deploys `main` after the tests pass. One-time setup: Settings → Pages → Source: GitHub Actions. On GitHub's free plan Pages needs a public repository, so the deploy job is skipped while the repository is private.
- **claude.ai artifact:** `npm run build:artifact`, then publish `dist/artifact.html` with `css/style.css`, `vendor/three.min.js` and `js/*.js` as supporting files at the same relative paths. Service workers do not run inside artifacts.
