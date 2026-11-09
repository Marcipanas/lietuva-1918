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
Villages are towns with `vil = 1`: they have stock, people, homes and a chapel, take part in routes, trade and commuting, but pay half the tax, need no power, and count apart from towns in goals. Workplaces prefer towns (a 6 km head start for villages), so a farm beside a village joins the town that has workers. Village names came from a list of typical names placed at random (until v0.6, see 20).

## 16. Trade through gateway towns, with deals (2026-11, v0.5)
The roadmap sketched trade routes whose far end is a foreign market. Instead, foreign trade happens in the town that owns a border post or a port, as standing deals that sell from or buy into its stock. Routes still carry the goods to the border, so geography matters, and the route system did not need a second kind of endpoint. Local merchants (the old Sell and Buy) stay at worse prices.

## 17. History after 1938, with choices (2026-11, v0.5; settles the open question in 8)
The game follows real history past 1938, including the Soviet occupation, the war, the Holocaust, deportations, collectivization and the restoration of independence in 1990. At key dates a card asks the player to choose; every option says whether it is what happened. Defying a great power works only with enough security, which the player builds over decades. Resisting in 1940 with enough security leads to a neutral republic that did not exist; the Soviet path brings a planned economy with yearly delivery targets, Union projects and Party trust. Dark events are stated plainly in the Chronicle and are never choices for the player.

## 18. Neighbours from catchments, paths on demand (2026-11, v0.5)
All-pairs town paths cost 221 Dijkstra runs per change. Now one sweep from all halls finds which towns' catchments meet (the Voronoi neighbours of the road graph) with exact lengths, union-find gives linked groups, and a single path is computed only when a route or panel asks, with early exit and a cache keyed by `NET.ver`.

## 19. Real geography from open data (2026-11, v0.6)
The owner asked for accurate borders, every place in its proper location, and neighbours clearly shown. The hand-drawn outlines were replaced by data built offline in `tools/geo`: OpenStreetMap borders (ODbL), Natural Earth coast, lakes and rivers (public domain), and Euronym place names (EuroGeographics Open Data Licence), all reachable from the build machine through GitHub. Natural Earth rivers are a kilometre or two off, so they are bent onto the towns that stand on them, the Nemunas below Smalininkai is laid on the border line, and the Kaunas confluence is drawn by hand. The neighbours are drawn with today's borders and named in Lithuanian; the Kaliningrad region is called East Prussia, as it was until 1945. Generated data lives in `js/geo.js`, hand-drawn data in `js/land.js`.

## 20. Every place of 1918, at its real site (2026-11, v0.6; replaces the random villages of 15)
All 89 towns that existed in 1918 and 362 villages (Euronym's most prominent) stand at their real coordinates; the five cities start from their old centre, not Euronym's label point. Towns founded later are left out and offered as names when the player founds a town. Smaller towns get a size from today's population, which is rough; the main towns keep their written 1918 sizes.

## 21. A precomputed start map (2026-11, v0.6)
Laying out 451 settlements, 1,300 km of railway and 8,000 km of roads takes about 16 s, too long for a phone at every new game. `tools/build-world.js` runs `genWorld()` once and stores the result in `js/world1918.js` (340 KB) in the save format; `tools/check.js` fails when the files it was made from change, so it is rebuilt with `npm run world`. The A* planner compares costs in Float32 precision now: comparing a float64 sum with a stored float32 made endless tiny "improvements" on long paths, which hid behind the expansion limit as failed plans.

## 22. Dirt roads everywhere; linked means railway or paved road (2026-11, v0.6)
In 1918 every village had a road, so the start map joins all settlements by dirt roads (the relative neighbourhood graph, which gives a natural mesh without parallel roads). A road link no longer counts as progress, so "linked to Vilnius" now means a railway or paved road reaches the town's streets, and the power grid follows the same network. Dirt roads cost no upkeep. Ministry tasks follow the interwar railways (Marijampolė 1924, Telšiai 1926, Klaipėda through Telšiai 1932).

## 23. Cities from their real main streets, with landmarks (2026-11, v0.6)
Big cities keep the five-times scale of houses, so a true-scale plan holds only their main streets: these are laid where the real ones run, as paved roads, and a 1 km grid fills the rest. Landmarks stand at their real coordinates at about twice life size; at five times they would overlap each other in the old towns. Vilnius and Kaunas town halls are the landmark town halls. Rivers are drawn narrower than before (the Nemunas 0.45 km) so the old towns between them have room, and lots test the drawn water exactly (`waterHit`) because the 0.5 km raster is too coarse.

## 24. One finger moves the map in every tool; taps act (2026-11, v0.7)
On a phone, the old tools used one finger to draw or paint, so moving the map meant switching to two fingers mid-task, and a long road meant zooming far out. Now one finger always moves the map, whatever the tool. A tap acts: it adds a point to a road or railway, zones the streets it touches, picks one thing to remove, or moves the building. Drawing freehand and painting are still there: hold still for 320 ms, then drag. A drag that starts on the ghost building or on a point of the planned line moves it. Nothing is built until Build is pressed in the action bar, so a stray tap never costs money; on a mouse, a click on the ghost still builds.

## 25. Lines are planned with the network, not through it (2026-11, v0.7)
The planner works on 0.5 km cells. Where it reused an existing road, its path ran along cell centres, up to a few hundred metres off the real street, so the stretch counted as new road, doubled the road that was there and cut through houses: every one of 17 test roads started in a town failed with "in the way". Now `routePieces` samples the plan, replaces every stretch on the network's cells by the true way along the network (a bounded Dijkstra), and builds only the stretches off it, joined to the network where the join misses every building. A tap on a town's middle snaps to its streets, and a line leaves a town where it faces its next point (`exitPoint`). Old lines of a lower kind on the way are upgraded for 60% of the price, so one drawn road paves the old one. After the change, 15 of 18 test roads build and the other 3 report that the road is already there; the planner and the 1918 map generator in terrain.js and world.js are unchanged, so the start map stays the same.

## 26. A bottom sheet over a centred map (2026-11, v0.7)
The panel covered two thirds of a phone, and Show on map put the town under it. The interface is now a status bar, the map, five views in a bottom bar, and one sheet that snaps closed, half or full. Panels covering the bottom of the view shift the picture up with the camera's view offset (`setViewOffset`), so whatever the camera looks at sits in the middle of what stays visible, and picking needs no special case. On wide screens the sheet is a side panel and the views float as a dock.

## 27. Dashboards from the day's own figures, with fixes (2026-11, v0.7)
The owner asked to see at a glance what the country and each town have, make and lack, and what is wrong. The day tick now records what each town makes and uses (smoothed like the net change), and a weekly sample of residents and treasury; these stay out of the save or default on load, so older saves keep working without a format change. `dash.js` turns the figures into problems, worst first, each with fixes that are actions the interface already has: a route from the neighbour with the most to spare, the building that makes what is missing, zoning, a warehouse, selling the surplus. A fix never acts on its own; it opens the tool or starts the route, and the player sees what it does.

## 28. The borders of the day, moved by history (2026-11, v0.8)
The owner asked for the borders of 1918 at the start, Lithuania Minor shown apart until it is won, the loss of Vilnius to Poland, and alternative choices. The map of today's Lithuania is split into four parts that changed hands: the Klaipėda Region, the Palanga coast (Courland's since 1819, Latvia's until 30 March 1921), and the Vilnius region in two parts (back in October 1939, and in November 1940). Public datasets of interwar borders (CShapes 2.0, the historical basemaps on GitHub) were too coarse, and OpenHistoricalMap is out of reach from the build machine, so the Vilnius region is built from today's municipalities and elderships (OpenStreetMap): today's district lines mostly follow the 1923 line, and the towns near it were checked one by one (VLE, Pinkas HaKehillot Lita, local museums). The areas match the sources: 2,608 km² against about 2,600 for 1940, 7,284 against 6,909 for 1939, 209 against 183 for Palanga. Who holds each part, and each neighbour's land, is `S.own`; a part held by others is coloured and named for its holder, its towns lock with everything built there, and lines through it carry nothing. The Klaipėda Region is shown as part of Germany in 1918, under the name Lithuania Minor, because that is what it was; it becomes its own territory, in its own colour, under the Allies from February 1920.

## 29. Vilnius stays Lithuanian until October 1920 (2026-11, v0.8; replaced by 31)
In reality the Red Army took Vilnius in January 1919, Poland held it from April 1919 to July 1920, and Lithuania had it again only from late August 1920 until Żeligowski's march in October. At 1× the game reaches January 1919 in under three minutes, so a faithful map would take the starting capital, its landmarks and the tutorial's town away almost at once. The game keeps the city Lithuanian until the crisis of October 1920, the one loss that lasted 19 years, and says so in the design notes; the Chronicle states no fact that the map contradicts. Then Kaunas is the temporary capital, as it was, and "linked" counts towns joined to it.

## 30. Decisions with consequences that carry forward (2026-11, v0.8)
The first twelve years had no decisions at all; the owner asked for some, not too many, where choices matter. Five cards come before 1924 (volunteers, Żeligowski, the Hymans plan only if Vilnius is lost, the litas, the Klaipėda revolt), so there is about one a year early on and the 1930s keep theirs. Each has the historical option and an alternative, and the consequences reach later cards: security from the volunteers decides whether Vilnius can be held; a union with Poland returns Vilnius but brings war and Soviet occupation in September 1939; keeping the German mark costs half the treasury in November 1923; leaving Klaipėda to the Allies keeps the port out of reach until Germany takes it; Moscow offers Vilnius in 1939 only if others hold it. Events that follow a choice history did not make say so. The eras ask less of a smaller Lithuania, by the share of the 1918 residents in the land it holds, so losing Vilnius is a loss but not a dead end. Older saves kept their map and met history only after their date until 33 dropped them.

## 31. Vilnius changes hands as it did, from January 1919 (2026-11, v0.9; replaces 29)
The owner chose history over keeping the starting capital: losing Vilnius early, and not holding it for years, is realistic. The government moves to Kaunas on 2 January 1919, the Red Army takes Vilnius on 5 January, the Polish army on 19 April 1919, the Red Army again on 14 July 1920, and it hands the city to Lithuania on 26 August 1920, six weeks before Żeligowski. Kaunas stays the temporary capital through those six weeks, as it did (`S.hist.kaunas`); Vilnius is the capital again only when it comes back for good: in October 1939, on the Soviet path in 1940, or through a choice history did not make. Both parts of the region change hands together, on the 1923 line; the front lines of 1919 and 1920 ran differently in places. The Red Army's push into the rest of Lithuania in 1919 is not on the map. A note at the start says that Vilnius will change hands from 1919, so a player can plan for it. The Chronicle now keeps every line of history; only other news is trimmed to the latest 150, so January 1919 is still there in 1939.

## 32. The neighbours as they were (2026-11, v0.9)
In February 1918 German troops held all the land around Lithuania (Ober Ost), so the start map shows Courland with the Palanga coast, the Suwałki region and Belarus as German-held, and their labels say so. They pass on in steps: Latvia in November 1918; Belarus to the Red Army in January 1919, Poland in April 1919, the Red Army in July 1920 and Poland in October 1920; the Suwałki region to Poland in August 1919, Germany in October 1939 and Poland in October 1944. Today's Poland is split on the old border of East Prussia, taken from the boundary of the Warmian-Masurian Voivodeship, which matches the old line at 18 villages on both sides: Masuria stays German until Potsdam in August 1945, when the north of East Prussia goes to the Soviet Union. Soviet holders share one colour. Simplifications: Lithuania's own administration of the Suwałki region in 1919 and in the summer of 1920 is not shown; all of Belarus on the map changes hands at once, though its towns did not; Latvia keeps its own colour after the Soviet annexation of 1940.

## 33. A new version starts a new game (2026-11, v0.9)
The game is early in development, and the owner does not need saves to carry over between versions. `SAVE_KEY` carries the version, and `tools/check.js` makes it match `package.json` and the offline cache. On start the game removes saves of older versions, which would otherwise fill the browser's storage at a few hundred KB each, and says that a new game began. No code reads older saves, so a change to the shape of `S` needs no migration.

## 34. A new game starts paused, on an intro (2026-11, v0.10)
The owner asked for a short intro: Lithuania has just signed its independence, and the player decides what happens next. A card says so, then the game waits for the player to press play, so a new player can look around, read the first tasks and follow the tutorial without losing time. Vilnius falls in January 1919, under three minutes into a game at 1×; a paused start, a note in the Chronicle and a "Front line" note on the Vilnius region's towns let the player see it coming.

## 35. A political map from far out (2026-11, v0.10)
In winter snow covered every country alike, and the owner asked for country colours when zoomed out. From about 90 km up, the ground leans to the holders' colours and lifts the snow from land others hold, and fully so from 230 km; Lithuania keeps most of its snow, so the season still shows and Lithuania stands out white against coloured neighbours. Up close the map stays a landscape, with a third less snow on land others hold so its colour shows through. Latvia moved to a blue, since its old tan was close to the Soviet red.

## 36. Growth needs a real surplus (2026-11, v0.10)
An audit of a game with no player input found 270 of 367 settlements hungry in spring 1919: every village grew on its small starting stock, then ran out and starved back to its 1918 size, and the Chronicle filled with warnings. Growth now needs food coming in faster than it is eaten (or a food filling its store), not just food in stock. The same audit found Kaunas overcrowded on day one (the start map put some of its houses nearer a village hall), cold homes in late August, routes to Vilnius still paying upkeep after it was lost, and a dirt road offered as the fix for an unlinked town although dirt roads never link. All are fixed, and warnings about many places come as one line.

## 37. Direction on the map (2026-11, v0.10)
A player following only the game's own fixes grew the land Lithuania held from about 550k residents in 1919 to 917k by 1928, but never reached the second era: it needs railways to more towns, which no fix builds. The ministry tasks give that direction, but they sat at the bottom of the Lithuania view. The first task that makes sense now is shown on the map above the bottom bar, tasks run from easy to hard, and a finished task, a population milestone or a history event that changes the map shows as a short note on screen. A new era opens on a card that says what it brings.
