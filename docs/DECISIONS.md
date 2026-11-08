# Decisions

Short records of choices that shape the code. Add a new entry instead of editing an old one when a decision changes.

## 1. Plain JavaScript, no build step (2026-11; renderer changed in 9)
The game started as a single-file claude.ai artifact and must keep running as one, from GitHub Pages, and offline. No bundler and no packages means any agent or person can open a file and change it, and nothing breaks when a dependency moves. Cost: no modules and no type checking, so `tools/check.js` and the smoke test do that work.

## 2. Classic scripts sharing one global scope (2026-11)
Files are loaded with plain `<script>` tags in a fixed order, and top-level names are global. Simple, and works in artifacts without module support concerns. Cost: name collisions. Rule: a top-level name lives in exactly one file (see CLAUDE.md).

## 3. One isometric grid for the whole country (2026-11, replaced by 9)
A 144×144 grid, tiles about 3.5 km, north up, rotated 45°. Town scale is deliberately exaggerated so towns are visible and playable. Roads and rails connect in eight directions so that east–west links are straight on screen.

## 4. Aggregated simulation, visual agents (2026-11)
Towns are economic units (stock, workers, homes). Daily flows are computed as numbers, and walkers and vehicles only illustrate them. This keeps the game fast on phones and the rules easy to test headless. Cost: no individual traffic jams or vehicle-level logistics.

## 5. Goods move only on routes (2026-11, v3)
Version 2 moved goods automatically along any road; that made logistics trivial. Routes with vehicles, capacity and cargo choices give the player real decisions. Historic 1918 railway and cart routes are created at the start so the economy runs before the player learns the system.

## 6. Panels as HTML strings with patched values (2026-11)
Panels are rebuilt from strings only when their structure changes; numbers update in place through `v()`/`w()`. Fast, simple, and buttons keep working while values tick.

## 7. Offline through a PWA (2026-11)
A service worker caches every shipped file, and fonts as they load. Works for the hosted version only; claude.ai artifacts cannot run service workers.

## 8. Historical accuracy with an alternate-history start (2026-11)
Dates and facts in events are real. Vilnius is the capital from the start, as the Act of Independence declared, although Poland held it from 1920 to 1939. The game's period after 1938 is undecided (see ROADMAP).

## 9. Gridless world in 3D with three.js (2026-11, v0.4)
The owner's vision is Workers & Resources: free roads and buildings at any angle. Going gridless meant rewriting the drawing code anyway, so the view moved to 3D at the same time instead of writing a gridless 2D renderer that a later 3D step would throw away. three.js r159 is vendored as `vendor/three.min.js` (the last release with a classic-script build), so there is still no build step, the game still runs offline, and claude.ai artifacts can load it as a supporting file. Godot or another engine stays an option for installable builds later; the rules in `sim.js` would port.

## 10. A hidden terrain raster for rules (2026-11, v0.4)
Terrain, soils and forests live in a 0.5 km raster that the player never sees. It makes rules (what a building stands on, bridges, forestry) and path planning simple and fast, while everything the player places is continuous. The 3D ground is drawn smoothly from it, and fields are drawn per pixel in a shader so nothing looks like cells.

## 11. Roads as a graph with automatic junctions (2026-11, v0.4)
Roads and railways are polylines between nodes. Drawing a line attaches its ends to the network and turns every crossing with the same kind into a junction, so the player never connects pieces by hand. Planned lines reuse existing lines where they run along them and only the new stretches are built and charged. Roads and railways cross each other on the level.

## 12. Exaggerated town scale on a real-size country (2026-11, v0.4)
The country is its real size (400 × 310 km) but a house lot is 0.85 km across and holds a block of homes, about ten times larger than life. Real-scale towns would be specks; real-scale vehicles and people would be invisible. People, vehicles and trees use the same exaggeration, and vehicles grow further when zoomed out.

## 13. Smaller towns rather than a bigger map (2026-11, v0.5)
The owner asked for a bigger map with more towns and villages. Stretching the country would have made every distance false and quadrupled the terrain raster. Instead towns and everything in them are drawn at half the size (a lot is 0.42 km, about five times larger than life), so the real-sized country holds four times as many places. Models keep their old numbers and are scaled by `MS` in one place. The terrain raster stays at 0.5 km: path planning around buildings is coarser, but exact checks (`exactBlock`) keep roads off buildings.

## 14. Every settlement feeds itself (2026-11, v0.5)
Towns and villages had to be supplied or they starved, which made 220 settlements impossible to manage. Now each feeds and heats its 1918 population from its own land (subsistence added to its stock), and growth beyond that needs the player's food, homes and jobs. Towns hold steady without help and grow only with buildup. Growth also waits until food stocks stop falling, so towns do not boom on their starting stock and then starve.

## 15. Villages are full settlements (2026-11, v0.5)
Villages are towns with `vil = 1`: they have stock, people, homes and a chapel, take part in routes, trade and commuting, but pay half the tax, need no power, and count apart from towns in goals. Workplaces prefer towns (a 6 km head start for villages), so a farm beside a village joins the town that has workers. Village names come from a list of typical names placed at random; real villages are not placed at their real sites.

## 16. Trade through gateway towns, with deals (2026-11, v0.5)
The roadmap sketched trade routes whose far end is a foreign market. Instead, foreign trade happens in the town that owns a border post or a port, as standing deals that sell from or buy into its stock. Routes still carry the goods to the border, so geography matters, and the route system did not need a second kind of endpoint. Local merchants (the old Sell and Buy) stay at worse prices.

## 17. History after 1938, with choices (2026-11, v0.5; settles the open question in 8)
The game follows real history past 1938, including the Soviet occupation, the war, the Holocaust, deportations, collectivization and the restoration of independence in 1990. At key dates a card asks the player to choose; every option says whether it is what happened. Defying a great power works only with enough security, which the player builds over decades. Resisting in 1940 with enough security leads to a neutral republic that did not exist; the Soviet path brings a planned economy with yearly delivery targets, Union projects and Party trust. Dark events are stated plainly in the Chronicle and are never choices for the player.

## 18. Neighbours from catchments, paths on demand (2026-11, v0.5)
All-pairs town paths cost 221 Dijkstra runs per change. Now one sweep from all halls finds which towns' catchments meet (the Voronoi neighbours of the road graph) with exact lengths, union-find gives linked groups, and a single path is computed only when a route or panel asks, with early exit and a cache keyed by `NET.ver`.
