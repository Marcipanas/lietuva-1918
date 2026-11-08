# Game design

The current rules and numbers. The source of truth is `js/data.js` and `js/sim.js`; update this file when you change them.

## Fantasy and goal

You lead the newly independent Lithuania from 16 February 1918. Towns start small and poorly connected. You lay roads and railways, zone land for homes, place farms and industry, and run transport routes so towns feed and supply each other. **Goal:** reach the Modern era with every town linked to Vilnius and powered, and 1.5 million town residents.

Scale: one tile is about 3.5 km. Population is counted in thousands (`4k` is one block of wooden houses). One simulation step is one day. Speeds are 2, 5 and 12 days per second.

## Eras

| Era | Requirements to enter | Unlocks |
|---|---|---|
| Independence (start) | none | farms, forestry, peat, flax, brickworks, dairy, pigs, fisheries, warehouses, stations, port, schools, clinics, dirt roads, railways, horse carts, steam trains |
| Industrialization | 450k residents, 8 towns linked to Vilnius, 150 bricks in stock, 6,000 Lt | peat power stations, linen mills, furniture factories, paved roads, trucks, brick apartments, Lv 2 upgrades; towns want linen cloth and electric light |
| Modern Lithuania | 1,000k residents, 11 towns linked, 500 bricks, 200 linen cloth, 25,000 Lt | hydro dams, nuclear plant, electronics plants, highways, electric railways, lorries, electric trains, panel blocks, Lv 3 upgrades; towns want electronics |

## Goods (base price in litas)

| Food | Raw | Made | Late |
|---|---|---|---|
| grain 2, potatoes 1.6, dairy 6, meat 8, fish 5 | timber 3, peat 2.5, flax 4 | bricks 6, linen cloth 20, furniture 26 | metal 30 (import only, through a port), electronics 80 |

Prices drift ±2% a day toward the base price, within 60–160% of it. Selling 25 lowers the price 1.5%; buying raises it 1%. A town with a port sells for 40% more and buys for 25% less than the usual 60% markup.

## Buildings (per day; workers in thousands)

| Building | Size | Workers | In → Out | Needs | Cost |
|---|---|---|---|---|---|
| Grain farm | 2×2 | 10 | → 8 grain (+35% on fertile soil) | open land | 250 Lt, 20 timber |
| Potato fields | 2×2 | 8 | → 9 potatoes (+35% fertile) | open land | 200, 15 timber |
| Dairy farm | 2×2 | 10 | 2 grain → 4 dairy | open land | 450, 30 timber |
| Pig farm | 1×1 | 8 | 3 potatoes → 3 meat; pollution 1 | | 400, 30 timber |
| Fishery | 1×1 | 8 | → 5 fish | shore of sea, lagoon, lake or river | 350, 25 timber |
| Forestry camp | 1×1 | 10 | → 8 timber × forest factor (0.3–1.4) | forest tile | 200 |
| Peat works | 2×2 | 12 | → 8 peat; pollution 1 | 2+ bog tiles | 300, 20 timber |
| Flax fields | 2×2 | 8 | → 6 flax (+40% in the flax belt) | open land | 250, 15 timber |
| Brickworks | 1×1 | 14 | 3 peat → 5 bricks; pollution 2 | clay | 600, 40 timber |
| Warehouse | 2×2 | — | +400 storage per good (Lv 2: 800, Lv 3: 1300) | | 500, 50 timber |
| Railway station | 1×1 | — | joins a town to the rail network | next to track | 300, 20 timber |
| Sea port | 2×2 | — | port prices, metal imports | coast | 3,000, 100 timber |
| School | 1×1 | 3 | 1 per 50k residents: up to +10% output in town | | 600, 40 timber |
| Clinic | 1×1 | 3 | 1 per 70k: up to +6 morale, +30% growth | | 700, 40 timber |
| Peat power station | 2×2 | 14 | 4 peat → 30 MW; pollution 4 | era 2 | 1,800, 60 bricks |
| Linen mill | 2×2 | 24 | 4 flax + 5 MW → 4 linen; pollution 2 | era 2 | 2,200, 80 bricks |
| Furniture factory | 2×2 | 20 | 5 timber + 4 MW → 3 furniture; pollution 1 | era 2 | 2,000, 60 bricks |
| Hydro dam | 1×1 | 10 | → 140 MW | on a river, era 3 | 9,000, 300 bricks |
| Nuclear power plant | 3×3 | 40 | → 450 MW | next to a lake, era 3 | 30,000, 600 bricks, 150 metal |
| Electronics plant | 2×2 | 30 | 2 metal + 10 MW → 3 electronics; pollution 1 | era 3 | 7,000, 150 bricks |

Upgrades: Lv 2 costs 120% of the build price plus 20 bricks; Lv 3 costs 250% plus 40 bricks and 10 metal. Output ×1.7 / ×2.6, inputs ×1.5 / ×2.1, same workers. A building belongs to the town whose hall it reaches within 16 road tiles.

## Homes and growth

- Zoned land (5 Lt a tile) next to a town's streets gets houses automatically, one every 5 days, while homes are at least 92% full, food is at least 99% supplied and morale is at least 45. The house is paid from the town's stock: wooden houses (4k people) 20 Lt and 4 timber; brick apartments (12k, era 2) 60 Lt and 10 bricks; panel blocks (30k, era 3) 150 Lt and 25 bricks. In later eras, old houses are rebuilt in the new style.
- Growth: +max(0.05k, 0.4%) a day × morale/62 × (1 + 0.3 × clinic coverage), up to the housing limit. Hunger shrinks a town by 0.8% × shortfall per day; overcrowding by 3% of the excess.
- Houses are built away from pollution where possible.

## People

- **Food:** 0.1 per thousand residents a day, taken in equal shares from every food in stock. A food counts toward variety if it covers at least 8% of the need.
- **Heating:** 0.03 per thousand a day × season factor (full December to February, partial in March, April, October and November). Peat is burned first, then timber. With full power in the Modern era, heating needs halve.
- **Work:** half of residents work. Local jobs fill first, then commuters walk to towns within 12 road tiles (up to 3k a day per pair), or ride routes set to carry commuters (half of the route's capacity, in thousands).
- **Morale:** starts from 58, then: +4 per food kind beyond the first; +6 × clinic coverage; −6 when more than a quarter of workers (plus 3k) are jobless; −min(15, 5 × pollution) where homes are smoky; era 2: +6 with full power or −8 under 80%, ±10 for linen cloth; era 3: ±8 for electronics; −14 × the share of cold homes; −12 overcrowded; −50 × hunger. Morale moves 8% of the way toward this target each day. Output is multiplied by 0.7 + 0.6 × morale.

## Transport

| Vehicle | Mode | Era | Loads per trip | Tiles a day | Cost | Upkeep a day |
|---|---|---|---|---|---|---|
| Horse carts | road | 1 | 4 | 18 | 60 | 0.2 |
| Trucks | road | 2 | 10 | 55 | 400 | 0.8 |
| Lorries | road | 3 | 20 | 80 | 900 | 1.4 |
| Steam trains | rail | 1 | 40 | 60 | 1,500 | 2 |
| Electric trains | rail | 3 | 90 | 110 | 4,500 | 5 (needs electric track all the way) |

- Route capacity each way per day = vehicles × loads per trip × trips a day, where trips a day = speed / (2 × length + 6). On roads, trucks and lorries move at 0.7× on dirt, 1× on paved and 1.25× on highway (the weakest stretch counts).
- **Auto cargo:** a good moves only toward the town with fewer days of supply, enough to even them out, keeping 5 days for the sender and at most 25 days for the receiver. Building materials keep a buffer of 40. **Picked cargo** sends everything above 5 days of local use, up to the receiver's storage room.
- Selling a vehicle returns half its price. Removing a route returns half the price of all its vehicles.
- **Roads:** dirt 15 Lt + 1 timber a tile; paved 40 + 2 bricks; highway 90 + 4 bricks. **Rail:** 60 + 3 timber; electric 130 + 4 bricks. Bridges cost 4×. Upgrading an existing lower level costs 60%. Upkeep: 0.01 Lt a day per road level per tile, 0.03 per rail level.

## Money

Taxes: 0.08 Lt per thousand residents a day × min(1.4, morale/62). Building upkeep: 0.4 Lt × level a day (warehouses 0.3; paused buildings pay 30%). The start treasury is 3,000 Lt.

## Pollution

Each polluting building spreads `pol × (1 − distance/5)` over a radius of 5 tiles. A town's pollution is the average at its homes. Placing a polluter or zoning shows the field as a brown tint.

## History (dated events)

| Date | Event | Effect |
|---|---|---|
| 1918-02-16 | Act of Independence signed in Vilnius | start |
| 1922-02-15 | Land Reform Law | grain and potato farms +15% |
| 1922-10-02 | The litas is introduced | none |
| 1923-02-16 | Klaipėda Region transferred to Lithuania | Klaipėda and the port unlock |
| 1927-03-01 | Dairy co-operatives unite as Pienocentras | dairy price ×1.5 |

Random events every 170–340 days: bumper harvests, London butter prices, British bacon demand, timber prices abroad, a Nemunas flood in Kaunas, a wet harvest, linen fashion (era 2+).

## Ministry tasks

Link Alytus (600 Lt), start a new route (400), link Utena (600), give a town three foods (800), link Tauragė (600), build a warehouse (300), open a school (400), found a town (1,000), reach 500k residents (1,500), link Klaipėda (1,500), sell through the port (800), enter Industrialization (2,000), power every town (3,000), reach Modern Lithuania (5,000).

## Balance notes

- Tested with the smoke test and a few scripted runs over about two in-game years. Without new zoning, towns stop around 550–600k residents in total by 1920; income settles near +10 to +20 Lt a day.
- Alytus, Tauragė and Utena start unlinked with about 300 days of food. That is the first problem the player meets.
- Unemployment is common early because towns grow faster than jobs. Industry is the intended answer.
- Not yet tested: the late game (era 3), large networks of 20 or more routes, and nuclear-scale power.
