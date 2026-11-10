# Roadmap

Ordered by value for the game right now. Each item has enough of a spec for an agent to start. Items marked **Decision** need the owner's call first.

## 0. After v0.12: building, chains and the state

Done in v0.12, from the owner's list: building sites (plans placed with nothing in hand, sites that take money and materials as they come, building times, hold, build first, cancel), carters who bring materials to sites, homes and lines, planks and longer chains (sawmill, brewery, sugar beet and sugar, cement on limestone, fertiliser, metal for factories), wants that set in over four years and shops that fetch them, winter fuel kept for homes, public trust, taxes, policies and forms of government with elections, new decision cards from 1919 to 1993 and history on to 2004, new random events, the Lithuania view in five parts with views of each good, the power grid, the works and the state, the year's trade balance, a one-tap fix that lays out a paved road to link a town, a longer ladder of eras (sales abroad, the school law, power for every linked town), a scripted player for balance work, and fixes from an audit (decisions 43 to 53).

- **Decision: the pace of growth.** A town fills its homes within months (0.4% a day), which buildings that need 8,000 to 30,000 workers require of towns that start with 2,000 to 5,000 people. So a player who zones land and plants farms without rest doubles the country every two years or so: the scripted player passes two million residents in 1922 and four million by 1930, half a century ahead of history. v0.12 lengthens the ladder of eras (decision 53: sales abroad, the school law of 1922, power for every linked town), which keeps such a player in the first era until late 1922 and in the second until the grid works, but the residents still come as fast. A person plays slower; the direction is the same. The owner's call: leave it (the eras are a ladder to climb at one's own speed, and history after about 1930 is scenery for a fast player); tie more of each era to history's calendar; or slow growth and shrink the workers each building needs by the same factor, which changes every number in the game. Until then the roadmap assumes the first.
- **Playtest v0.12 on a phone:** whether building times feel right (two weeks for a farm, five months for a mill, four years for the nuclear plant), whether the default reserve of 500 Lt is noticed, whether "Carts bring planks" explains itself, and how the second era plays: it asks for power stations where the peat is, mills in towns big enough to staff them, and paved roads to every town.
- **Lines as building sites.** Roads and railways are still laid at once (decision 45). A spec: a confirmed line becomes a work in `S.works` with its runs, its upgrades and its cost; it is drawn dashed; it takes money and materials like a site (the same `runSites` pass) and is built run by run from the end nearest the network, about 1 km a day for a dirt road, 0.5 for a paved road and 0.25 for a railway; nothing can be planned across it; cancelling returns what was not yet built. Land that changes hands under it cancels the part there. Needs care in `buildLine`, `splitAtRegions`, `validPlace` and the planner's `BLK`.
- **Workers:** the tightest limit in the game is labour (half of a town's residents, against buildings that need 6k to 40k), and the player meets it as "Short of workers" with no plan to follow. The action bar now says before placing how many of its jobs the town could then fill. A labour view per town (who works where, how many commute in, which works stand understaffed) would help more than any balance change.
- **Money:** a middling player earns 30 to 150 Lt a day in the first two eras and spends it as it comes; one who exports hard earns several times that and has little to spend it on. Sinks that scale with the country would even this out: policies priced per resident, wages for state works, a share of export income left with the merchants who carry it.
- **Fuel for power stations:** a station where there is no bog needs peat by route, and a route moves only what the receiving town lacks by its own count of days. A standing order ("keep 60 peat at the Šiauliai station") would be clearer than Auto.
- **Contracts and a national plan for goods:** see below; with chains this long, a yearly target per good that the player sets (not only Moscow) would give the Economy view a purpose.

## 1. Trade and history: next steps

Done in v0.5: markets abroad (Britain, Germany, Latvia, Poland, the Union), border posts and ports as gateways, daily deals, the Depression and the German boycott, decision cards from 1930 to 1974, security, the Soviet path with yearly plans, Union projects and Party trust, and a neutral alternative after 1940. Done in v0.8: the borders of the day (the Klaipėda Region, the Palanga coast and the Vilnius region change hands), Kaunas as the temporary capital, cards for the volunteers of 1918, Żeligowski in 1920, the Hymans plan, the litas and the Klaipėda revolt, a union-with-Poland path, and a list of decisions in the Chronicle. Done in v0.9: Vilnius changes hands in 1919 and 1920 as it did, the neighbours start German-held and pass on as they did, Masuria stays German until 1945, and a new version starts a new game. Next:
- **Contracts:** markets offer fixed deals ("Britain: 600 dairy within a year at +25%"), shown as cards, with a penalty for missing them.
- **Trade balance, next:** done in v0.12 for this year and last, by market and by good (Trade view); still to do is a chart over the years.
- **More cards:** done in v0.12 (the Bermontians, land reform, the coup of 1926, September 1939, the Marshall Plan, privatization, the litas of 1993). Still open: the referendum on joining the European Union (2003) as a card, the 1935 farmers' strike as a choice, and the Klaipėda elections of 1925 to 1938.
- **Politics, next:** parties and cabinets (the Christian Democrats until 1926, the Populists and Social Democrats, the Nationalists), a president's term, and laws as lasting choices with costs, built on public trust.
- **Neighbours under Soviet rule and after:** Latvia keeps its own colour after the Soviet annexation of 1940 (it could take the Soviet colour until 1991, and German occupation colours from 1941 to 1944 could follow for all the neighbours); Belarus and the Kaliningrad region keep the Soviet colour after 1991.
- **The fronts of 1919 and 1920 in more detail:** the Red Army's push into northern and eastern Lithuania in 1919 (Šiauliai, Panevėžys, Ukmergė, Zarasai until August 1919) and Lithuania's hold on Sejny and the Suwałki region in 1919 and 1920 need outlines of their own.
- **The Soviet path, deeper:** plan targets per town, a Union supply quota for metal and fuel, the Kaunas Sea flooding villages when the dam is built, rural electrification.
- **Playtest:** how hard the plan feels, whether security 80 by 1940 is fair, and how much the Depression hurts.

## 2. The interface: next steps

Done in v0.10: an intro and a paused start for a new game, the current ministry task on the map, notes on screen for tasks, milestones and history that changes the map, a card for each new era, political colours from far out (readable in winter), and fixes found by an audit of the loop (see decision 36).
Done in v0.11, from the owner's playthrough: the map drawn twice its size (38), merchants and surplus on routes (39), paved roads from 1918 (40), decisions confirmed and news cards for border changes (41), cities in blocks with no streets leading nowhere and railway turnouts (42), Lithuanian houses by place, a production view, money a day by kind (the army now shows in the balance), deals that keep a share of the store, the port task counting deals by sea, a road laid out to a new building no road reaches, statuses for stations and stores, a pill to hide a shown route, New game starting paused, the Klaipėda port on the city side, and the political colours matching beyond the map's edge.
- **Playtest v0.11 on a phone:** whether the map drawn twice its size feels right to cross, whether merchants are too slow to notice, and whether the news cards come too often in 1919 and 1920.
- **Merchants, next:** prices per town (so merchants follow a real price gap and the town card can show it), and a setting for how much they may carry.
- **Cities, next:** an old town of short crooked streets inside the first blocks, and apartment courtyards that fill up as a city grows.
- **Link a town in one step:** done in v0.12 for paved roads (the fix lays out a road from the nearest linked town). The same for a railway (from the nearest station's track, with a station planned at the far end) is still to do.
- **Storage that fills with goods nobody needs yet** (flax before the linen mills of era 2) stops buildings early in the game; a note on the building could say so before the player builds it.

Done in v0.7: a phone-first layout (status bar, five views at the bottom, a sheet that snaps closed, half or full, a view offset that keeps the target above it), a two-step build menu, buildings placed on a good spot near the town and dragged into place, lit ground where a building fits, roads and railways from tapped points with undo and draggable points, planning that uses and upgrades existing lines, zoning that adds up, an action bar that says what it costs and who pays, and dashboards for the country and each town with problems and one-tap fixes. Next:
- **Undo the last build** for a few seconds after it, with the money and materials back.
- **Map layers** to switch on from the Lithuania view: food and fuel balance per town, the power grid, links to Vilnius, pollution.
- **Charts per good, next:** the good's view draws its stock since 1918 (v0.12); made and used over time would need two more monthly series.
- **A Route tool:** tap one town, then another, to start a route without opening a card.
- **Larger text** and a high-contrast setting; labels for screen readers on the map's towns.
- **Playtest on real phones:** whether the 320 ms hold suits drawing, and whether the half-height sheet shows enough of the map.

## 3. Gameplay depth, smaller items

- Multiple save slots, and export/import of a save as a file (also lets a game move between the artifact and the hosted version).
- A short guided tutorial in the first 10 minutes, driven by the ministry tasks.
- Ships: the port shows ships arriving with imports.
- Day/night cycle tied to electrification: night lights grow from oil lamps to full electric light.
- Sound: ambient sounds by season and zoom, train whistles. Sound must start from a tap.
- Balance pass for the late game (era 3), once someone has played that far: `npm run playtest -- 1990-01-01` gets a scripted player there, but it plays the Modern era badly.

## 4. The 3D world: next steps

Done in v0.4: no grid, curved roads and railways with automatic junctions, buildings at any angle, a three.js view with a rotating and tilting camera, shadows, seasons, a field patchwork, animated people, vehicles, smoke, animals and boats. Done in v0.5: half-size towns, 48 towns and about 170 villages with chapels and farmsteads, view culling and far house blocks. Done in v0.6: real borders and neighbours, every town and 362 villages at their real places, the railways and highways of 1918, dirt roads between all settlements, city plans from the real main streets, 13 landmarks. Next, roughly in order of value:
- **More landmarks and better river data:** Gates of Dawn, Kaunas Cathedral, Biržai castle, Kretinga monastery, Panevėžys; real river courses inside the cities (Natural Earth is bent onto towns but still rough), smaller streams.
- **Interwar history of the network:** the railways built 1924–1940 (Kazlų Rūda–Šeštokai, Kužiai–Telšiai–Kretinga) and the Žemaičių plentas (1939) as events or as cheaper tasks. Without the Vilnius region, interwar Lithuania had to build its own lines around it.
- **Performance with 451 settlements:** a tick is about 8 ms headless; spread `phase2` over days for villages, and merge the dirt road ribbons into chunks so zooming does not rebuild them all.
- **Gentle hills.** Lithuania is flat but not perfectly: a height field (uplands of Žemaitija and Aukštaitija, river valleys) under the ground, roads and buildings following it.
- **Better water:** moving reflections, shores, the Curonian Spit dunes.
- **Street detail when close:** fences, gardens, lamp posts, people at stations; window lights at dusk, electric light from the Industrialization era.
- **Road junction shapes:** proper crossroads instead of discs, and curved roads that bank smoothly into each other.
- **Building variety:** two or three models per type and level, chosen by id; churches and town halls by region.
- **Performance on older phones:** a low-quality setting (no shadows, fewer trees, lower pixel ratio) and a frame-time watchdog that switches to it.
- **A game engine (Godot 4)** only if the project wants installable builds or a store release; the rules port, the view would be rebuilt.

## 5. Platform and offline

- **Done:** the PWA. `manifest.webmanifest` plus `sw.js` cache everything after the first online visit, so the game runs in flight mode when installed from the hosted site (Add to Home Screen).
- **Next:** a "Download save" and "Load save" button, because saves live in browser storage per site.
- **Later, if wanted:** a desktop wrapper (Tauri) or app-store builds; with option D these come with the engine.
