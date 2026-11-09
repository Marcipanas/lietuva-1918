# Roadmap

Ordered by value for the game right now. Each item has enough of a spec for an agent to start. Items marked **Decision** need the owner's call first.

## 1. Trade and history: next steps

Done in v0.5: markets abroad (Britain, Germany, Latvia, Poland, the Union), border posts and ports as gateways, daily deals, the Depression and the German boycott, decision cards from 1930 to 1974, security, the Soviet path with yearly plans, Union projects and Party trust, and a neutral alternative after 1940. Done in v0.8: the borders of the day (the Klaipėda Region, the Palanga coast and the Vilnius region change hands), Kaunas as the temporary capital, cards for the volunteers of 1918, Żeligowski in 1920, the Hymans plan, the litas and the Klaipėda revolt, a union-with-Poland path, and a list of decisions in the Chronicle. Next:
- **Contracts:** markets offer fixed deals ("Britain: 600 dairy within a year at +25%"), shown as cards, with a penalty for missing them.
- **Trade balance:** exports and imports per year and per market in the Lithuania view, and a chart over time.
- **More cards** where history offered real choices: the Bermontians (1919), the 1926 coup, land reform details, Germany's offer in September 1939 to take Vilnius by force (Lithuania stayed neutral), the neutral path after 1945 (Marshall Plan or not), the 1990s (privatisation, the litas in 1993, joining the EU and NATO).
- **The occupations of 1919–1920 on the map**, as an option for players who want them: Vilnius Soviet from January 1919 and Polish from April 1919, back in August 1920 (decision 29).
- **Neighbours under Soviet rule:** after 1940 Latvia keeps its own name and colour, and Soviet Belarus and the Kaliningrad region keep colours of their own. They could share one Soviet colour until 1991, and Latvia's label could follow.
- **The Soviet path, deeper:** plan targets per town, a Union supply quota for metal and fuel, the Kaunas Sea flooding villages when the dam is built, rural electrification.
- **Playtest:** how hard the plan feels, whether security 80 by 1940 is fair, and how much the Depression hurts.

## 2. The interface: next steps

Done in v0.7: a phone-first layout (status bar, five views at the bottom, a sheet that snaps closed, half or full, a view offset that keeps the target above it), a two-step build menu, buildings placed on a good spot near the town and dragged into place, lit ground where a building fits, roads and railways from tapped points with undo and draggable points, planning that uses and upgrades existing lines, zoning that adds up, an action bar that says what it costs and who pays, and dashboards for the country and each town with problems and one-tap fixes. Next:
- **Undo the last build** for a few seconds after it, with the money and materials back.
- **Map layers** to switch on from the Lithuania view: food and fuel balance per town, the power grid, links to Vilnius, pollution.
- **Charts per good** over time (made, used, stock), from a weekly sample like the residents' one.
- **A Route tool:** tap one town, then another, to start a route without opening a card.
- **Larger text** and a high-contrast setting; labels for screen readers on the map's towns.
- **Playtest on real phones:** whether the 320 ms hold suits drawing, and whether the half-height sheet shows enough of the map.

## 3. Gameplay depth, smaller items

- Multiple save slots, and export/import of a save as a file (also lets a game move between the artifact and the hosted version).
- A short guided tutorial in the first 10 minutes, driven by the ministry tasks.
- Ships: the port shows ships arriving with imports.
- Day/night cycle tied to electrification: night lights grow from oil lamps to full electric light.
- Sound: ambient sounds by season and zoom, train whistles. Sound must start from a tap.
- Balance pass for the late game (era 3), once someone has played that far.

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
