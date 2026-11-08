# Lietuva 1918 — guide for AI coding agents

An isometric economy and city builder of Lithuania from 16 February 1918. Plain JavaScript and Canvas 2D, **no build step and no dependencies**. It runs from any static host, offline as a PWA, and as a claude.ai artifact.

Read this file first. Details live in `docs/`:
- `docs/ARCHITECTURE.md`: modules, data structures, tick order, rendering, UI patterns
- `docs/GAME_DESIGN.md`: every mechanic and number
- `docs/ROADMAP.md`: planned features (foreign trade, graphics, engine choice) with specs
- `docs/DECISIONS.md`: why things are the way they are

## Commands

| Command | What it does |
|---|---|
| `npm test` | Static checks plus a headless smoke test that loads every script in a stub DOM, plays about two in-game years through the real tools, renders every panel and saves/reloads. **Must pass before every commit.** |
| `npm run serve` | Local server on http://localhost:8080. The service worker needs http, not `file://`. |
| `npm run build:artifact` | Writes `dist/artifact.html` for publishing as a claude.ai artifact. |
| `npm run icons` | Regenerates the PWA icons (needs Python Pillow). |

There is nothing to install. Node 18+ for the tools, any modern browser to play.

## Ground rules

1. **No frameworks, bundlers or npm packages.** Classic `<script>` files, loaded in the order listed in `index.html`.
2. **All scripts share one global scope.** A top-level `const`/`let` name may be declared in only one file. A duplicate is a SyntaxError, and in a browser it silently stops the later file from loading. Search before adding a global: `grep -nE "^(const|let|function) NAME\b" js/*.js`. This has already happened once: the season object was named `SEA`, the same as the sea polygon in `geo.js`. It is now `SEASON`.
3. **Simulation code never touches the DOM or canvas.** `common`, `data`, `geo`, `world` and `sim` must run headless; the smoke test depends on it.
4. **Saved games:** if you change the shape of `S` or of the tile layers, bump `SAVE_KEY` in `js/data.js` and the `v` check in `newGame`/`load` in `js/sim.js`. Old saves are then ignored instead of crashing.
5. **Offline cache:** after changing any shipped file, bump `VERSION` in `sw.js`. A new file must also be added to `SHELL` in `sw.js` and to `index.html`; `tools/check.js` fails otherwise.
6. **Copy:** plain words, active voice, short sentences, no em-dash asides. Buttons say what happens ("Build", "Remove route"). Population is shown in thousands (`popStr`), goods per day.
7. **History:** dates and facts in events and descriptions must be accurate. If unsure, leave the date out rather than invent one.

## Code map (load order)

| File | Role | Touches DOM/canvas |
|---|---|---|
| `js/common.js` | `ICON` set and `ic()`, formatting (`fmt`, `fd`, `popStr`, `dateStr`), `hash2`/`vnoise`, `pip`, base64 | no |
| `js/data.js` | Rules: map constants, resources `RES`/`RI`, buildings `BT`, vehicles `VT`, roads, eras, 1918 towns, historic routes | no |
| `js/geo.js` | Lithuania geography in lon/lat: borders, sea, lagoon, rivers, lakes, forests, deposits | no |
| `js/world.js` | Tile layers, terrain generation, placement rules, A* pathfinding, 1918 world generation, network analysis | no |
| `js/sim.js` | Game state `S`, daily `tick()`, routes, labour and commuting, food, heating, pollution, growth, events, ministry tasks, save/load | no |
| `js/objects.js` | Isometric drawing helpers, buildings, shadows, seasonal trees, animals and boats | canvas |
| `js/agents.js` | Walking residents, commuters and route vehicles (visual only) | canvas |
| `js/render.js` | Camera, seasonal ground cache, fields, roads, rails, overlays, labels, the frame `draw()` | canvas |
| `js/input.js` | Pointer, touch and keyboard; build tools (`TOOL`, `PEND`) | DOM |
| `js/panels.js` | Side panel HTML as strings, with `v()`/`w()` dynamic fields | no writes |
| `js/ui.js` | Toolbar, build drawer, confirm bar, tabs, `act()` actions, main loop, `start()` boot | DOM |

## Concepts you need before changing code

- **Coordinates:** lon/lat → km (`ll2uv`) → fractional grid (`uv2g`) → tile index `k = j*N + i` (`ix`, `ti_`, `tj_`) → iso screen (`P3(gi,gj,height)`: x = (i−j)·32, y = (i+j)·16 at zoom 1). North is up; `N = 144`; one tile is about 3.5 km.
- **Tile layers** (`Uint8Array(N*N)`): `T` terrain, `F` feature bits (forest, fertile, bog, clay, flax, Klaipėda Region, inside Lithuania), `R` road level, `L` rail level, `Z` zone. `BD` holds the building id per tile and `ANCH` holds it at the building's front tile, which is where it is drawn.
- **Network:** `analyze()` rebuilds which town owns each road tile (`NET.own`, within 16 tiles), which town each building belongs to, all-pairs road and rail paths (`NET.pairs`), neighbour links (`NET.edges`), power grid components and the pollution field `POL`. Set `NET.dirty = true` after any change to roads, rails or buildings.
- **Day tick:** phase1 (counts) → `routeEval` → `commute` → phase1b (services, power plants) → power grid → phase2 (production, food, heating, morale, growth, taxes) → `runRoutes` → `develop` → upkeep → events → ministry tasks. See `tick()` in `js/sim.js`.
- **Goods move only on routes.** Auto cargo equalizes days of supply in one direction only, so goods never ping-pong.
- **Agents are visual only.** Walkers and vehicles show what the aggregated simulation is doing; they never move goods themselves.
- **Panels:** `renderPanel(false)` rebuilds nothing if the HTML structure is unchanged. It only patches values created with `v(key, text)` and widths created with `w(key, pct)`. If you show a changing number without `v()`, the whole panel re-renders every 0.3 s and buttons stop responding to taps.

## Recipes

- **New building:** add it to `BT` in `data.js` (cat, era, sz, w, in/out, need, cost, pol, d). Draw it in `drawBuilding` in `objects.js`. If it is a crop field, add a `FIELD` entry in `render.js`. Add an icon to `ICON` if none fits. Then place one in `tools/smoke-test.js`.
- **New resource:** `RES` and `RI` in `data.js`, `RCOL` in `objects.js`, CSS variable `--r-<name>` in `css/style.css`, an icon. If it is food, add it to `FOOD`.
- **New historical event:** `HEV` in `sim.js` with an exact date. Random events go in `REV`.
- **New ministry task:** `OBJ` in `sim.js`.
- **New panel section:** a string function in `panels.js`; route every changing number through `v()`.

## Testing

`tools/smoke-test.js` is the safety net. When you add a system, drive it through the same functions the UI calls (`setTool`, `beginDraw`/`moveDraw`/`finishDraw`, `setGhost`, `doConfirm`, `act({...})`) and assert on `S`. For visuals, run `npm run serve` and check a phone-sized viewport (390×844). Frame time should stay under about 20 ms there.

## Publishing

- **GitHub Pages:** `.github/workflows/pages.yml` deploys `main` after the tests pass. One-time setup: Settings → Pages → Source: GitHub Actions. On GitHub's free plan Pages needs a public repository, so the deploy job is skipped while the repository is private.
- **claude.ai artifact:** `npm run build:artifact`, then publish `dist/artifact.html` with `css/style.css` and `js/*.js` as supporting files at the same relative paths. Service workers do not run inside artifacts.
