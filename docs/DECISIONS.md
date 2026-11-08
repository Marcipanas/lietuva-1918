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
