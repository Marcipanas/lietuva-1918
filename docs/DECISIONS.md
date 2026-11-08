# Decisions

Short records of choices that shape the code. Add a new entry instead of editing an old one when a decision changes.

## 1. Plain JavaScript, Canvas 2D, no build step (2026-11)
The game started as a single-file claude.ai artifact and must keep running as one, from GitHub Pages, and offline. No bundler and no packages means any agent or person can open a file and change it, and nothing breaks when a dependency moves. Cost: no modules and no type checking, so `tools/check.js` and the smoke test do that work.

## 2. Classic scripts sharing one global scope (2026-11)
Files are loaded with plain `<script>` tags in a fixed order, and top-level names are global. Simple, and works in artifacts without module support concerns. Cost: name collisions. Rule: a top-level name lives in exactly one file (see CLAUDE.md).

## 3. One isometric grid for the whole country (2026-11)
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
