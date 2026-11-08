# Architecture

Lietuva 1918 is fifteen classic scripts sharing one global scope, a stylesheet, and three.js drawing into one canvas. There is no build step. The world has no grid: roads are curves, buildings sit at any angle. This document explains how the pieces fit, so a change in one place does not break another.

## Layers

```
library          vendor/three.min.js                       three.js r159 (global THREE), used only by the view
data             common.js  data.js  geo.js                 constants, rules, geography in lon/lat
geometry         geom.js                                    points, polylines, rotated boxes, spatial hash
terrain          terrain.js                                 hidden raster of terrain and soils, path planner
world            world.js                                   road and rail graph, buildings, lots, analysis, 1918 map
simulation       sim.js                                     state S, daily tick, routes, people, events, saving
view (3D)        models.js  scene.js  agents.js             models, renderer, people and vehicles
interaction      input.js  panels.js  tutorial.js  ui.js    gestures, tools, side panel, first-time hints, actions, loop, boot
```

`common` to `sim` never touch the DOM, the canvas or THREE, and run headless in `tools/smoke-test.js`. The view reads the world and never changes it. The world tells the view what changed through version counters (`WV.net`, `WV.bld`, `WV.lots`, `WV.kr`) and one hook, `terrainHook(cells)`, called when forest is cleared or deposits change.

## Units and coordinates

Everything is in km on a flat plane: `x` east, `z` south, from the corner at 20.75°E, 56.55°N. The map is `MAPU` × `MAPV` = 400 × 310 km. In three.js, `y` is up and the ground is `y = 0`.

| Conversion | Function |
|---|---|
| lon/lat → km | `ll2xz(lon, lat)`; back with `xz2ll(x, z)` |
| km → raster cell | `cellAt(x, z)` → `k`; cell centre `cellX(k)`, `cellZ(k)` |
| screen → ground | `groundAt(sx, sy)` (ray onto `y = 0`), `toScreen(x, y, z)` |

Town scale is exaggerated about ten times (a house lot is 0.85 km), so towns are visible on a country-sized map.

**Rotated boxes.** Buildings and lots are `{x, z, rot, w, d}`: centre, rotation like three.js `rotation.y`, width along local x, depth along local z. Local +z is the front, the side that faces the road; its world direction is `(sin rot, cos rot)`. `faceRot(dx, dz)` gives the rotation that turns a front toward a direction. `geom.js` has the box tests (`obbOverlap`, `obbSegDist`, `obbPolyDist`, `obbHas`, `toLocal`, `toWorld`).

## Terrain (terrain.js)

A hidden raster of `CELL` = 0.5 km cells (`GW` × `GH` = 800 × 620) holds:

| Array | Meaning |
|---|---|
| `TT` | terrain: `T_FOREIGN`, `T_LAND`, `T_SEA`, `T_LAGOON`, `T_LAKE`, `T_RIVER`, `T_SAND` |
| `TF` | bit flags: `F_FOREST`, `F_FERTILE`, `F_BOG`, `F_CLAY`, `F_FLAX`, `F_KR` (Klaipėda Region), `F_LT` (inside Lithuania) |
| `TF0` | `TF` as generated, so saves store only the differences (`tfDiff`, `tfApply`) |
| `BLK` | what is built on each cell, for the planner only: 1 building, 2 road, 4 railway, 8 zoned lot (`blk()` in world.js rebuilds it lazily) |

`genTerrain()` rasterizes `geo.js` (scanline polygon fill, stamped rivers and lakes, noisy soil edges) once per session, then only resets `TF`. Rules sample the raster (building needs, bridges, forests); the player never sees cells. The 3D ground is drawn from it as a smooth texture.

**Path planning.** `planPath(ax, az, bx, bz, mode)` runs A* over the cells (8 directions, `planCost`: water and buildings block, rivers cost `BRIDGE` × 1.4, a line of the same kind costs 0.35 so new lines reuse it), then `straighten` replaces cell steps with straight segments where `lineCheck` says the line is clear and crosses no more river. `lineCheck` also asks the world for an exact building test (`exactBlock`). `planTrace(trace, mode)` is what the road tool uses: it simplifies the finger trace (`rdp`), keeps straight pieces that are clear, plans around obstacles where not, and smooths corners (`chaikin`).

## World (world.js)

State lives in `S` (see below); world.js keeps lookups: `NODES`, `EDGES`, `BMAP`, `LOTS`, and spatial hashes `EH` (edge segments), `BH` (buildings), `LH` (lots), updated incrementally.

**The graph.** Two graphs share one node and edge list: `e.k` is `'road'` or `'rail'`. An edge is `{id, k, lv, a, b, p}` with `p` a polyline from node `a` to node `b` (densified to ≤ 0.8 km segments) and runtime `c` (cumulative lengths) and `L` (length).
- `buildLine(k, lv, pts, snapR)` attaches both ends to the network (`snapNet`: an existing node, or a point on an edge, which `splitEdge` turns into a node), finds where the new line crosses edges of the same kind and splits both there, then adds the pieces. Roads and railways cross each other on the level.
- `newRuns(pts, k)`: the parts of a planned line that do not already run along a line of the same kind. Only these are built and paid for.
- `removeEdge` drops lone nodes and joins two edges that meet at a node with nothing else (`mergeNode`).
- `afterLine(edges)` clears trees and zoned lots under new lines.

**Buildings and lots.** `addB(t, x, z, rot, lv, quiet)` (quiet: do not mark the network dirty, used for houses), `removeB`. `validPlace(t, x, z, rot, gen)` checks the cells under the footprint (inside Lithuania, dry land, the 1923 lock), overlap with buildings and lines, and the building's need (forest, bog, clay, open land, rail, coast, lake, shore, river). Zoned lots are boxes along streets: `lotSpots(edge)` lists the candidates on both sides, `zonePlan(trace, R)` picks the free ones near a brush stroke, `bullPlan(trace, R)` collects what a removal stroke touches (edges are cut only where touched).

**Network analysis (`analyze()`).** Runs when `NET.dirty` is set.
1. Each active town hall's road access point (`accessOf`: nearest edge within `ACCESS` of the footprint).
2. One multi-source Dijkstra over road nodes from all halls (`dijkstra`, `distTo`): every point on a road gets a distance and an owner town. A building or lot belongs to the town that reaches its access point within `TERRITORY` (15 km), else `b.na` is `noroad`, `far` or `locked`.
3. Land bonuses: forestry counts forest within 1.6 km; farms and flax fields check fertile or flax soil under them.
4. Town-to-town paths: a Dijkstra from each town (roads from the hall, railways from its stations) gives `NET.pairs.road['a_b']` and `NET.pairs.rail['a_b']` = `{len (km), lv (weakest level), path (polyline)}`. Routes and vehicles use these.
5. Neighbour links (`NET.edges`, pairs with no town in between), power grid components (`NET.comp`), towns linked to Vilnius (`NET.linked`).
6. Line lengths and upkeep (`NET.km`, `NET.up`), pollution sources (`NET.pol`, read with `polAt(x, z)`).

**The 1918 map (`genWorld`).** For each town: a hall on a market square ring, four to six curving streets, ring roads for bigger towns, houses on the nearest lots and zoned lots beyond (`layoutTown`). Then stations and historic railways (`stationFor`, `railBetween`), starting industries with access roads (`placeNear`, `connectToTown`; missing forest, bog or clay deposits are created near the town), and historic roads (`roadBetween`). `foundTown` lays out a town the player founds.

## State (`S` in sim.js)

```
S = { v: 4, day, funds, inc, era, speed, kr (Klaipėda still locked), nid, rid, gid, lid,
      prices{res}, log[], won, ms{}, mod{farm}, ev{}, nextRnd, obj{}, stats{portSales, routesMade},
      towns[ {id, n, x, z, cap?, orig, lock, pop, h, stock{}, dl{}, dem{}, …per-tick fields} ],
      bld[ {id, t, x, z, rot, lv, on, town, cd, k, eff, why, ti? (halls and gen stations)} ],
      routes[ {id, a, b, mode, vt, n, ab, ba, pax, …per-tick fields} ],
      nodes[ {id, x, z} ], edges[ {id, k, lv, a, b, p} ], lots[ {id, x, z, rot, town, cd} ],
      cam, sel, tab }
```

`serialize()` writes nodes, edges and lots as compact arrays (coordinates rounded to 10 m) and the terrain flags as a difference from generation. `restore()` regenerates the terrain, applies the difference and rebuilds every index. Saves are about 90 KB.

## The day tick (`tick()` in sim.js)

1. `BYT` groups buildings by town. Unconnected buildings get `eff = 0` and a reason.
2. `phase1`: housing, jobs, storage (`STORE_BASE` plus warehouses), schools, clinics, pollution at homes (`polAt`).
3. `routeEval` for every route: path, capacity each way per day `n · cap · speed · roadFactor / (2 · km + TRIP_OVERHEAD)`.
4. `commute`: local jobs first, then walking between towns up to `WALK_KM` (30 km) by road, then routes that carry commuters.
5. `phase1b`: education, health, productivity, power plants. Then the power grid per component.
6. `phase2`: production, food basket and variety, heating, linen and electronics demand, morale, growth, taxes, building upkeep.
7. `runRoutes`: `moveCargo` each way; auto cargo moves a good only toward the town with fewer days of supply.
8. `develop`: towns with full homes, fed and content people build a house on their best zoned lot every 5 days, or rebuild old houses in a later era.
9. Line and vehicle upkeep, dated events (`HEV`), random events (`REV`), ministry tasks (`OBJ`), milestones, the win check.

## The 3D view

**models.js** builds low-poly geometry with vertex colours from boxes, gable and hip roofs, cylinders, cones, lathes and blobs (`MB`, the mesh builder, with a push/pop local transform). `MODEL_FN` holds one function per building type returning `{geo, h, smoke, fields, flag, cows, pigs, boat}`. Houses are small parts placed by `lotLayout(b)` (three or four wooden houses and a shed, brick blocks, or panel blocks), tinted per instance. Trees, people, animals and vehicles have their own small geometries.

**scene.js**:
- Renderer, `SCENE`, perspective camera `CAM3` on an orbit rig `cam = {x, z, dist, yaw, pitch}` (`applyCam`, `panBy`, `zoomAt`, `rotateBy`, `tiltBy`, `focusAt`, `northUp`). Hemisphere light plus a sun whose shadow box follows the view (updates stop beyond 70 km).
- Snow is a shader patch (`snowy(material)`): every upward-facing surface whitens with `SNOW_U`. The ground has its own material (`groundMat`): base texture painted from the raster (`paintGround`, `patchGround` for small changes), a per-pixel patchwork of fields where the mask allows (`MASK`, `FARM_PAL` by season), fading out when fields get smaller than a pixel, then patchy snow.
- Water: polygons for the sea, the lagoon and lakes, ribbons for rivers; lakes and rivers freeze in deep winter.
- Roads and railways (`buildLines`): one ribbon mesh per kind and level with a repeating canvas texture, junction discs, bridges where they cross rivers. Rebuilt when `WV.net` changes or the zoom changes width class (lines widen when far out so they stay visible).
- Buildings, houses, fields, flags (`buildBuildings`) and lots (`buildLots`) are `InstancedMesh`es grouped by model, managed by `Pool`.
- Trees (`updateTrees`) are built per 20 km chunk when first in view, shuffled so that drawing only the first part thins the forest with distance; birches change colour in autumn and lose their crowns in winter.
- Smoke particles (`SMOKE`, `puff`) from chimneys, kilns, power stations, cooling towers and steam engines; cows, pigs and boats (`updateCritters`).
- Overlays (`buildOverlays`): planned line, snap rings, brush ring, zoning and removal previews, ghost building with its fields and pollution ring, route highlight, selection ring, pollution discs. Rebuilt when `VIEW.ver` or the world changes.
- Labels (`updateLabels`): town names, country names and problem markers are HTML elements in `#labels`, moved every frame.
- `pickBuilding(sx, sy)`: ray against every nearby footprint box.

**agents.js**: residents walk between homes and work along street paths (`streetPath` runs a Dijkstra), commuters walk between towns, and route vehicles shuttle along `NET.pairs` paths. All are instanced; they scale up when zoomed out so they stay visible.

## Interaction

- **input.js**: one finger pans (or draws with a line or brush tool, or moves the ghost with the place tool); two fingers pinch, twist and pan together, or tilt when both slide up or down; mouse wheel zooms at the cursor, right-drag turns and tilts. Tools work in world km: `beginDraw(x, z)`, `moveDraw`, `finishDraw`, `tapTool`, `setGhost`, `rotateGhost`, `doConfirm`. A finished action fills `PEND`, which `showConfirm()` shows and `doConfirm()` applies.
- **panels.js**: HTML strings for each tab; changing numbers go through `v()` and `w()`.
- **ui.js**: `act(dataset)` handles every `data-act` button, `renderPanel(force)` patches values when the structure is unchanged, `frame()` runs the simulation (`TPS[speed]` days a second), agents and the view, `start()` boots (load or new game, `initScene`, camera).

## Saving and offline

- Autosave to `localStorage[SAVE_KEY]` every 30 days, on hide and after actions.
- `sw.js` precaches every shipped file, including `vendor/three.min.js`. Bump `VERSION` on every release.

## Performance budget

Measured in headless Chromium at phone size: the JavaScript side of a frame is under 1 ms (simulation tick, agents, labels, overlays); the scene is 30 to 45 draw calls and 40k to 130k triangles depending on zoom. Keep it that way:
- Add things as instances in an existing `Pool`, not as separate meshes.
- Anything numerous needs a distance limit (trees: `TREE_MAX`, chunk level of detail; walkers: 20 km; vehicles: 70 km; critters: 22 km).
- Rebuild meshes only when a version counter changes, never every frame.
