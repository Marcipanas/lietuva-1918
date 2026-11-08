# Roadmap

Ordered by value for the game right now. Each item has enough of a spec for an agent to start. Items marked **Decision** need the owner's call first.

## 1. Trade and history: next steps

Done in v0.5: markets abroad (Britain, Germany, Latvia, Poland, the Union), border posts and ports as gateways, daily deals, the Depression and the German boycott, decision cards from 1930 to 1974, security, the Soviet path with yearly plans, Union projects and Party trust, and a neutral alternative after 1940. Next:
- **Contracts:** markets offer fixed deals ("Britain: 600 dairy within a year at +25%"), shown as cards, with a penalty for missing them.
- **Trade balance:** exports and imports per year and per market in the Lithuania tab, and a chart over time.
- **More cards** where history offered real choices: the wars of independence (1919–1920), the 1926 coup, land reform details, the neutral path after 1945 (Marshall Plan or not), the 1990s (privatisation, the litas in 1993, joining the EU and NATO).
- **The Soviet path, deeper:** plan targets per town, a Union supply quota for metal and fuel, the Kaunas Sea flooding villages when the dam is built, rural electrification.
- **Playtest:** how hard the plan feels, whether security 80 by 1940 is fair, and how much the Depression hurts.

## 2. Gameplay depth, smaller items

- Multiple save slots, and export/import of a save as a file (also lets a game move between the artifact and the hosted version).
- A short guided tutorial in the first 10 minutes, driven by the ministry tasks.
- Ships: the port shows ships arriving with imports.
- Day/night cycle tied to electrification: night lights grow from oil lamps to full electric light.
- Sound: ambient sounds by season and zoom, train whistles. Sound must start from a tap.
- Balance pass for the late game (era 3), once someone has played that far.

## 3. The 3D world: next steps

Done in v0.4: no grid, curved roads and railways with automatic junctions, buildings at any angle, a three.js view with a rotating and tilting camera, shadows, seasons, a field patchwork, animated people, vehicles, smoke, animals and boats. Done in v0.5: half-size towns, 48 towns and about 170 villages with chapels and farmsteads, view culling and far house blocks. Done in v0.6: real borders and neighbours, every town and 362 villages at their real places, the railways and highways of 1918, dirt roads between all settlements, city plans from the real main streets, 13 landmarks. Next, roughly in order of value:
- **More landmarks and better river data:** Gates of Dawn, Kaunas Cathedral, Biržai castle, Kretinga monastery, Panevėžys; real river courses inside the cities (Natural Earth is bent onto towns but still rough), smaller streams.
- **Interwar history of the network:** the railways built 1924–1940 (Kazlų Rūda–Šeštokai, Kužiai–Telšiai–Kretinga) and the Žemaičių plentas (1939) as events or as cheaper tasks, and Vilnius's region as Polish 1920–1939 as a choice.
- **Performance with 451 settlements:** a tick is about 8 ms headless; spread `phase2` over days for villages, and merge the dirt road ribbons into chunks so zooming does not rebuild them all.
- **Gentle hills.** Lithuania is flat but not perfectly: a height field (uplands of Žemaitija and Aukštaitija, river valleys) under the ground, roads and buildings following it.
- **Better water:** moving reflections, shores, the Curonian Spit dunes.
- **Street detail when close:** fences, gardens, lamp posts, people at stations; window lights at dusk, electric light from the Industrialization era.
- **Road junction shapes:** proper crossroads instead of discs, and curved roads that bank smoothly into each other.
- **Building variety:** two or three models per type and level, chosen by id; churches and town halls by region.
- **Performance on older phones:** a low-quality setting (no shadows, fewer trees, lower pixel ratio) and a frame-time watchdog that switches to it.
- **A game engine (Godot 4)** only if the project wants installable builds or a store release; the rules port, the view would be rebuilt.

## 4. Platform and offline

- **Done:** the PWA. `manifest.webmanifest` plus `sw.js` cache everything after the first online visit, so the game runs in flight mode when installed from the hosted site (Add to Home Screen).
- **Next:** a "Download save" and "Load save" button, because saves live in browser storage per site.
- **Later, if wanted:** a desktop wrapper (Tauri) or app-store builds; with option D these come with the engine.
