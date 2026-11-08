# Architecture

Lietuva 1918 is eleven classic scripts sharing one global scope, a stylesheet and a canvas. There is no build step. This document explains how the pieces fit, so a change in one place does not break another.

## Layers

```
data & geography      common.js  data.js  geo.js          constants, rules, polygons
world model           world.js                            tile layers, generation, placement, pathfinding, network
simulation            sim.js                              state S, daily tick, routes, people, events, saving
presentation          objects.js  agents.js  render.js    canvas drawing: buildings, people, vehicles, ground
interaction           input.js  panels.js  ui.js          tools, panels, actions, loop, boot
```

Lower layers never call upper layers, with one exception: `world.js` calls `tileHook(k)`, which `render.js` sets so the cached ground can be repainted when a tile changes. The simulation (everything above "presentation") runs headless in `tools/smoke-test.js`.

## Coordinates

| Space | Type | Conversion |
|---|---|---|
| Geographic | lon, lat | `ll2uv(lon, lat)` → km east (`u`) and south (`v`) of the map corner |
| Grid | fractional `gi, gj` | `uv2g(u, v)`, inverse `g2uv` |
| Tile | `k = j*N + i` | `ix(i, j)`, `ti_(k)`, `tj_(k)`, `inb(i, j)` |
| World pixels (zoom 1) | `wx, wy` | `wx = (gi − gj)·32`, `wy = (gi + gj)·16` |
| Screen | `sx, sy` | `P3(gi, gj, height)` in objects.js; inverse `s2g(sx, sy)` and `tileAt` in render.js |

The grid is rotated 45° against geography so that north stays up on screen. `N = 144`, and `DK` (2.47 km) is the grid step, so a tile side is about 3.5 km. The corners of the square grid outside the map are foreign land or sea.

## Tile layers (`world.js`)

| Array | Meaning |
|---|---|
| `T` | terrain: `T_FOREIGN`, `T_LAND`, `T_SEA`, `T_LAGOON`, `T_LAKE`, `T_RIVER`, `T_SAND` |
| `F` | bit flags: `F_FOREST`, `F_FERTILE`, `F_BOG`, `F_CLAY`, `F_FLAX`, `F_KR` (Klaipėda Region), `F_LT` (inside Lithuania) |
| `R` | road level 0–3 (none, dirt, paved, highway) |
| `L` | rail level 0–2 (none, steam, electric) |
| `Z` | zoning: 1 = residential zone |
| `BD` | building id on each tile, −1 if empty |
| `ANCH` | building id on the building's front tile (largest i + j), used for draw order |
| `POL` | pollution field, rebuilt by `analyze()` |

`genTerrain()` rasterizes `geo.js` deterministically, so terrain is never saved. Only `R`, `L`, `Z` and `F` (forest gets cleared) go into the save, base64-encoded.

## State (`S` in sim.js)

```
S = { v, day, funds, inc, era, speed, kr (Klaipėda still locked), nid, rid,
      prices{res}, log[], won, ms{}, mod{farm}, ev{}, nextRnd, obj{}, stats{portSales, routesMade},
      towns[ {id, n, i, j, cap?, orig, lock, pop, h, stock{}, dl{}, dem{}, …per-tick fields} ],
      bld[ {id, t, i, j, lv, on, town, cd, k, eff, why, na} ],
      routes[ {id, a, b, mode, vt, n, ab, ba, pax, …per-tick fields} ],
      cam, sel, tab }
```

Per-tick fields (for example `t.fill`, `t.vari`, `r.cap`) are recomputed every day; saving them is harmless. `BMAP` maps building id to object, and `rebuildIndex()` rebuilds `BD`, `ANCH` and `BMAP` after loading.

## Network analysis (`analyze()` in world.js)

It runs whenever `NET.dirty` is set, which happens after any change to roads, rails or buildings.
1. **Town territory:** a multi-source BFS from the road tiles next to every active town hall, up to `COMMUTE` (16) tiles, gives `NET.own[k]` (town index) and `NET.dst[k]`.
2. **Membership:** each building joins the town that owns the nearest adjacent road tile. Otherwise `b.na` records why not: `noroad`, `far` or `locked`.
3. **Bonuses:** the forestry factor comes from the forest tiles around a camp; farms and flax fields get a bonus for fertile or flax land.
4. **Pairs:** a BFS from each town over the road layer, and again over the rail layer from station-adjacent track, gives `NET.pairs.road['a_b']` and `NET.pairs.rail['a_b']` = `{len, lv (weakest link), path}`. Routes use these.
5. **Edges:** pairs with no third town in between (triangle test) become `NET.edges`, the neighbour links shown in the town panel. Their connected components form the power grid (`NET.comp`), and `NET.linked` is the set of towns connected to Vilnius.
6. **Pollution:** every building with a `pol` value adds a falloff of radius 5 to `POL`.

## The day tick (`tick()` in sim.js)

1. `BYT` groups buildings by town. Unconnected buildings get `eff = 0` and a reason.
2. `phase1`: housing, jobs, storage capacity (`STORE_BASE` plus warehouses), schools, clinics, pollution at homes.
3. `routeEval` for every route: path, capacity in loads per day each way. `cap = n · vehicle.cap · speed·roadFactor / (2·len + 6)`.
4. `commute`: local jobs first, then walking links (road pairs ≤ 12 tiles, 3k per day) and routes that carry commuters (half their capacity), shortest first.
5. `phase1b`: education and health coverage, productivity, power plants.
6. Power grid: supply and demand summed per component, giving `t.pr`.
7. `phase2`: production (limited by storage room), the food basket (equal shares from whatever is in stock; variety = kinds eaten), heating fuel (peat first, then timber), linen and electronics demand, morale, growth, taxes, upkeep.
8. `runRoutes`: `moveCargo` each way. Auto mode moves a good only toward the town with fewer days of supply, at most enough to equalize, so goods never travel both ways.
9. `develop`: towns with full homes, enough food and morale above 45 build a house on zoned land next to their streets every 5 days, or rebuild an old house in a later era.
10. Upkeep for roads, rails and vehicles; dated historical events (`HEV`); random events (`REV`); ministry tasks (`OBJ`) every 10 days; milestones and the win check.

## Rendering (`draw()` in render.js)

1. `SEASON = seasonOf(S.day)`. If the season bucket (snow 0, ½ or 1; autumn on or off) changed, `buildCache()` recolours every tile.
2. Ground: below zoom 0.5 the pre-rendered ground cache (16 px tiles) is scaled; above it, visible tiles are drawn one by one.
3. Field decals and zones, then roads (by level, with bridges) and rails, as batched line segments between tile centres. Diagonal links are drawn only when no orthogonal path exists.
4. Overlays (pollution while zoning or placing polluters, the highlighted route), then the build previews.
5. Objects in painter order: diagonal `s = i + j` ascending; on each tile, the building anchored there or its trees; agents bucketed by `floor(gi + gj)` are drawn after their diagonal. Tall objects get a larger bottom margin when culling.
6. Cloud shadows, selection, ghost building, town labels (their rectangles are kept for tap testing).

Drawing helpers live in objects.js: `box` (two visible walls and a top), `gableI`/`gableJ` (roof ridge along i or j), `pyramid`, `cyl`, `wins` (windows on a face), `shadow` (a sun from the north-west casts to the lower right), `roof()` (snow on roofs). Trees are pre-drawn sprites in three seasonal sets.

## Interaction

- **input.js:** pointer events with capture. One finger pans; with a line or area tool it draws instead. Two fingers pinch and pan. The mouse wheel zooms at the cursor. Tools: `inspect`, `road`, `rail`, `zone`, `bull`, `place`. A finished drag or tap-tap fills `PEND`, which `showConfirm()` shows and `doConfirm()` applies.
- **panels.js:** pure functions returning HTML strings for each tab: selection (start, town or building), routes, Lithuania, chronicle.
- **ui.js:** `act(dataset)` handles every `data-act` button. `renderPanel(force)` compares the HTML structure with dynamic values stripped; if it matches, only the `data-v` and `data-w` targets are patched. The main loop (`frame`) advances the simulation by `TPS[speed]` days per second, refreshes agents, draws, and refreshes the panel about three times a second.

## Saving and offline

- Autosave to `localStorage[SAVE_KEY]` every 30 days, on hide and after actions. Within claude.ai artifacts, storage is per artifact and per browser.
- `sw.js` precaches every shipped file (cache first) and caches Google Fonts as they are used. Bump `VERSION` on every release so clients pick up new files.

## Performance budget

At phone size (390×844, device pixel ratio 2), a frame takes about 16–20 ms in headless Chromium without a GPU. The expensive parts are per-tile ground at mid zoom and tree sprites. Keep new per-tile work behind zoom thresholds (see `trees`, `B0` and `cam.z` checks in `draw()`), and prefer pre-rendered sprites to path drawing for anything numerous.
