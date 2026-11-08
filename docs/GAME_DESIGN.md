# Game design

The current rules and numbers. The source of truth is `js/data.js` and `js/sim.js`; update this file when you change them.

## Fantasy and goal

You lead the newly independent Lithuania from 16 February 1918. Forty-eight towns and about 170 villages feed themselves but are poorly connected. You lay roads and railways, zone land for homes, place farms and industry, run transport routes so towns supply each other, and trade abroad. History interrupts with decisions: the Depression, a German boycott, the ultimatums of 1938 to 1940, and, if Lithuania falls under Soviet rule, the state plan. **Goal:** reach the Modern era with every town linked to Vilnius and powered, and 2.2 million residents.

Scale: the map is the real country, about 400 × 310 km, with no grid, and distances between places are true. Towns are drawn about five times larger than life so they read well: a house lot is 0.42 km across. Population is counted in thousands (`2k` is one lot of wooden houses; a village farmstead holds 0.5k). One simulation step is one day. Speeds are 2, 5 and 12 days per second.

## Eras

| Era | Requirements to enter | Unlocks |
|---|---|---|
| Independence (start) | none | farms, forestry, peat, flax, brickworks, dairy, pigs, fisheries, warehouses, stations, port, schools, clinics, dirt roads, railways, horse carts, steam trains |
| Industrialization | 800k residents, 12 towns linked to Vilnius, 150 bricks in stock, 6,000 Lt | peat power stations, linen mills, furniture factories, paved roads, trucks, brick apartments, Lv 2 upgrades; towns want linen cloth and electric light |
| Modern Lithuania | 1,400k residents, 25 towns linked, 500 bricks, 200 linen cloth, 25,000 Lt | hydro dams, nuclear plant, electronics plants, highways, electric railways, lorries, electric trains, panel blocks, Lv 3 upgrades; towns want electronics |

## Goods (base price in litas)

| Food | Raw | Made | Late |
|---|---|---|---|
| grain 2, potatoes 1.6, dairy 6, meat 8, fish 5 | timber 3, peat 2.5, flax 4 | bricks 6, linen cloth 20, furniture 26 | metal 30 (import only, through a port or border post), electronics 80 |

Local prices drift ±2% a day toward the base price (lowered in the Depression), within 60–160% of it. Every town can sell to and buy from local merchants in lots of 25: selling lowers the price 1.5%, buying raises it 1%. A town with a port sells for 40% more and buys for 25% less than the usual 60% markup. Under Soviet rule there are no local merchants. Foreign trade is below.

## Buildings (per day; workers in thousands; footprint in km)

| Building | Footprint | Workers | In → Out | Needs | Cost |
|---|---|---|---|---|---|
| Grain farm | 1.1 × 1 | 10 | → 8 grain (+35% on fertile soil) | open land | 250 Lt, 20 timber |
| Potato fields | 1 × 1 | 8 | → 9 potatoes (+35% fertile) | open land | 200, 15 timber |
| Dairy farm | 1 × 0.9 | 10 | 2 grain → 4 dairy | open land | 450, 30 timber |
| Pig farm | 0.5 × 0.45 | 8 | 3 potatoes → 3 meat; pollution 1 | | 400, 30 timber |
| Fishery | 0.45 × 0.4 | 8 | → 5 fish | water within 0.6 km | 350, 25 timber |
| Forestry camp | 0.45 × 0.45 | 10 | → 8 timber × forest factor (0.3–1.4, forest within 1.6 km) | forest around it | 200 |
| Peat works | 1 × 1 | 12 | → 8 peat; pollution 1 | bog under 40% of it | 300, 20 timber |
| Flax fields | 1 × 1 | 8 | → 6 flax (+40% in the flax belt) | open land | 250, 15 timber |
| Brickworks | 0.55 × 0.5 | 14 | 3 peat → 5 bricks; pollution 2 | clay | 600, 40 timber |
| Warehouse | 0.8 × 0.6 | — | +400 storage per good (Lv 2: 800, Lv 3: 1300) | | 500, 50 timber |
| Railway station | 0.65 × 0.3 | — | joins a town to the railway | beside a track, with a road to town | 300, 20 timber |
| Border post | 0.4 × 0.3 | — | lets its town trade with the country across the border | within 3 km of the border, by a road | 400, 20 timber |
| Sea port | 1 × 0.8 | — | trade by sea, port prices, metal imports | sea or lagoon within 0.7 km | 3,000, 100 timber |
| School | 0.5 × 0.4 | 3 | 1 per 50k residents: up to +10% output in town | | 600, 40 timber |
| Clinic | 0.45 × 0.4 | 3 | 1 per 70k: up to +6 morale, +30% growth | | 700, 40 timber |
| Peat power station | 0.9 × 0.9 | 14 | 4 peat → 30 MW; pollution 4 | era 2 | 1,800, 60 bricks |
| Linen mill | 1 × 0.8 | 24 | 4 flax + 5 MW → 4 linen; pollution 2 | era 2 | 2,200, 80 bricks |
| Furniture factory | 0.9 × 0.75 | 20 | 5 timber + 4 MW → 3 furniture; pollution 1 | era 2 | 2,000, 60 bricks |
| Hydro dam | 0.5 × 0.8 | 10 | → 140 MW | across a river, era 3 | 9,000, 300 bricks |
| Nuclear power plant | 1.4 × 1.4 | 40 | → 450 MW | lake within 0.8 km, era 3 | 30,000, 600 bricks, 150 metal |
| Electronics plant | 0.9 × 0.8 | 30 | 2 metal + 10 MW → 3 electronics; pollution 1 | era 3 | 7,000, 150 bricks |

Placement: a building may not overlap another building or a road or track; near a road it turns to face it and slides along to the nearest spot that fits. Upgrades: Lv 2 costs 120% of the build price plus 20 bricks; Lv 3 costs 250% plus 40 bricks and 10 metal. Output ×1.7 / ×2.6, inputs ×1.5 / ×2.1, same workers. A building belongs to the town whose hall it reaches within 15 km by road, and needs a road within 0.3 km of its footprint. Villages count 6 km further away than they are when workplaces choose a town, so a farm next to a village joins the nearby town that has the workers; homes and zoned lots always belong to the nearest settlement. A Union project (Soviet path) can unlock a building before its era.

## Settlements, homes and growth

- **1918 map:** the 11 original towns, 37 more towns of 1918 with real names and places (`TOWNS1`), and about 170 villages. Villages are spread over dry farmland at least 14.5 km apart and 7.5 km beyond a town's edge, with names from a list of typical Lithuanian village names placed at random (`VIL_NAMES`). A village has one street (sometimes a side lane), a wooden chapel and two to four farmsteads; 0.5k to 1.8k people.
- **Feeding itself:** every settlement's own fields add grain and potatoes for its 1918 population (`pop0`) to its stock each day (0.05 each per thousand), and its own woodlots heat that many homes. Its base workforce works its own land, so it is never jobless. A settlement therefore keeps its size for years without the player. Growth beyond `pop0` needs food from farms or routes, homes on zoned land, and jobs.
- **Growth:** +max(0.01k, 0.4%) a day × morale/62 × (1 + 0.3 × clinic coverage), up to the housing limit, while food is at least 99% supplied and either the town is below `pop0`, or it has at least 8 days of food in stock and its food stock is not falling. A town short of food loses 2% of the people it cannot feed each day; overcrowding removes 3% of the excess.
- **Zoning** paints lots (0.42 km, 5 Lt each) along both sides of a street. A town builds on its own lots, every 5 days (more than one at a time in towns over 50k), while homes are at least 92% full, food is at least 99% supplied and morale is at least 45. It picks the closest, cleanest lot. Houses are paid from the town's stock: wooden houses (2k people) 10 Lt and 2 timber; brick apartments (6k, era 2) 30 Lt and 5 bricks; panel blocks (15k, era 3) 75 Lt and 12 bricks. In later eras, old houses and farmsteads are rebuilt in the new style.
- **Layout:** towns are a market square around the town hall, three to six curving streets out of it, ring roads in bigger towns, houses nearest the square and zoned lots beyond. Where rivers or lakes leave too little room, extra streets are added until every home fits.

## People

- **Food:** 0.1 per thousand residents a day, taken in equal shares from every food in stock. A food counts toward variety if it covers at least 8% of the need.
- **Heating:** 0.03 per thousand a day × season factor (full December to February, partial in March, April, October and November). Peat is burned first, then timber. With full power in the Modern era, heating needs halve.
- **Work:** half of residents work. Local jobs fill first, then commuters walk to neighbouring towns within 30 km by road (up to 3k a day per pair), or ride routes set to carry commuters (half of the route's capacity, in thousands). Two settlements are neighbours when their catchments meet along a road or railway.
- **Morale:** starts from 58, then: +4 per food kind beyond the first; +6 × clinic coverage; −6 when more than a quarter of workers (plus 1k) beyond the base workforce are jobless (not under Soviet rule); history (Depression, strikes, collectivization, war, Soviet rule −3); −min(15, 5 × pollution) where homes are smoky; era 2 (towns only): +6 with full power or −8 under 80%, ±10 for linen cloth; era 3: ±8 for electronics; −14 × the share of cold homes; −12 overcrowded; −50 × hunger. Morale moves 8% of the way toward this target each day. Output is multiplied by 0.7 + 0.6 × morale.

## Transport

| Vehicle | Mode | Era | Loads per trip | km a day | Cost | Upkeep a day |
|---|---|---|---|---|---|---|
| Horse carts | road | 1 | 4 | 65 | 60 | 0.2 |
| Trucks | road | 2 | 10 | 200 | 400 | 0.8 |
| Lorries | road | 3 | 20 | 290 | 900 | 1.4 |
| Steam trains | rail | 1 | 40 | 215 | 1,500 | 2 |
| Electric trains | rail | 3 | 90 | 400 | 4,500 | 5 (needs electric track all the way) |

- Route capacity each way per day = vehicles × loads per trip × trips a day, where trips a day = speed / (2 × route km + 22). On roads, trucks and lorries move at 0.7× on dirt, 1× on paved and 1.25× on highway (the weakest stretch counts).
- **Auto cargo:** a good moves only toward the town with fewer days of supply, enough to even them out, keeping 5 days for the sender and at most 25 days for the receiver. Building materials keep a buffer of 40. **Picked cargo** sends everything above 5 days of local use, up to the receiver's storage room.
- Selling a vehicle returns half its price. Removing a route returns half the price of all its vehicles.
- **Roads,** per km: dirt 5 Lt + 0.3 timber; paved 14 + 0.6 bricks; highway 30 + 1.2 bricks. **Railways:** 20 + 1 timber; electric 45 + 1.2 bricks. Bridges cost 4×. Drawing along an existing line costs nothing: only new stretches are built. Upgrading an existing stretch (tap it with the tool) costs 60%. Upkeep per km a day: roads 0.003 / 0.006 / 0.009 Lt by level, railways 0.009 / 0.018.
- **Drawing lines:** the line follows the finger, runs straight where it can, goes around lakes, the sea and buildings, bridges rivers, joins roads it touches and makes a junction where it crosses another road. Roads and railways cross on the level.

## Money

Taxes: 0.08 Lt per thousand town residents (0.04 in villages) a day × min(1.4, morale/62), halved in war. Building upkeep: 0.4 Lt × level a day (warehouses 0.3; paused buildings pay 30%). An army budget (0, 10, 25 or 50 Lt a day) and a Baltic alliance cost money every day. The start treasury is 3,000 Lt.

## Pollution

Each polluting building spreads `pol × (1 − distance / 2 km)` over 2 km. A town's pollution is the average at its homes. Placing a polluter or zoning shows the fields as brown discs, and the ghost of a polluter shows its 2 km ring.

## Foreign trade (js/history.js)

Goods cross the border only at a **gateway**: a border post (`customs`, within 3 km of the border, by a road) or a sea port, in the town that owns it. The post's country is the nearest foreign land: north of 55.67°N Latvia; west of 22.85°E and north of 54.35°N East Prussia (Germany); elsewhere Poland. Routes bring goods to the gateway town; **deals** then sell from (or buy into) that town's stock every day.

| Market | Gateway | Buys (× base price) | Sells (× base price) |
|---|---|---|---|
| Britain | sea port | dairy 1.4, meat 1.45, flax 1.25, timber 1.1, textiles 1.1, grain 0.9 | metal 1.15, textiles 1.05, electronics 1.3 |
| Germany | East Prussian border post or sea port | meat 1.25, timber 1.2, dairy 1.1, flax 1.1, grain 1, potatoes 0.9, fish 0.9 | metal 1.1, textiles 1.15, furniture 1.2, electronics 1.4 |
| Latvia | Latvian border post | grain 1.2, potatoes 1.15, bricks 1.15, peat 1.1, meat 1, timber 0.9 | fish 1, textiles 1.25, metal 1.3 |
| Poland | Polish border post | timber 1.15, flax 1.05, dairy 1, furniture 1.1 | metal 1.2, textiles 1, bricks 1.1 |
| The Union | railway station | most goods at 0.6–0.75 | metal 0.8, textiles 0.9, electronics 0.9 |

- Export prices are after a 10% duty. One market takes 20 loads a day of one good at full price; more sells at half price.
- A deal sells only what is above 10 days of the town's own use. Imports stop when storage is full or money runs out.
- The Depression lowers farm prices abroad and at home by year: 1930 ×0.7, 1931 ×0.55, 1932 ×0.42, 1933 ×0.4, 1934 ×0.45, 1935 ×0.55, 1936 ×0.75, 1937 ×0.9 (other goods half as much).

## History (js/history.js)

Dated events go to the Chronicle. **Decision cards** stop the clock until the player picks an option; each option says whether it is what happened. Options that defy a great power work only with enough **security** (0 to 100, starts at 15): an army budget adds up to 10 a year, Baltic treaties add 8 or 18, holding the Klaipėda trial adds 6, and each year exports to Britain add up to 4 (one per 2,000 Lt).

| Date | Event | Choices and effects |
|---|---|---|
| 1920-07-12 | Moscow Peace Treaty | none |
| 1920-10-09 | Żeligowski seizes Vilnius (in the game Vilnius stays yours) | Polish market closed until 1938 |
| 1922-02-15 | Land Reform Law | grain and potato farms +15% |
| 1922-10-02 | The litas | none |
| 1923-01-10 | Klaipėda Revolt | none |
| 1923-02-16 | Klaipėda Region transferred | Klaipėda, Šilutė and the region's villages join |
| 1926-12-17 | Coup: Smetona in power | none |
| 1927 | Pienocentras (year only) | dairy ×1.5 at home, Britain ×1.05 |
| 1929-10-29 | Wall Street crash | none |
| 1930 | **Card:** the Depression | buy up farm produce (15 Lt a day for 5 years) or balance the budget (morale −8 for 5 years) |
| 1934-09-12 | **Card:** Baltic Entente | sign (security +8, Latvia ×1.1), propose an alliance (did not happen; +18, 10 Lt a day), stay apart |
| 1934-12-24 | **Card:** trial of Neumann and Sass | hold it (security +6, German boycott, Britain ×1.1) or drop it (did not happen; security −10, morale −5) |
| 1935-08-20 | Suvalkija farmers' strike, unless farm support is running | morale −10 in Suvalkija for 120 days |
| 1936-08-05 | Trade treaty with Germany | ends the boycott |
| 1938-03-17 | **Card:** Polish ultimatum | accept (Polish market opens, +3) or refuse (needs 40) |
| 1939-03-20 | **Card:** German ultimatum on Klaipėda | hand over the region (−5) or refuse (needs 60, else lost by force) |
| 1939-09-01 | War in Europe | Britain and Poland closed |
| 1939-10-10 | **Card:** Soviet bases | accept (−30, Soviet trade) or refuse (needs 70, else occupation at once) |
| 1940-06-14 | **Card:** Soviet ultimatum | accept (occupation, the Soviet path) or resist (needs 80 and no bases; else occupation with heavy losses) |

**The Soviet path** (as it happened): 1940-08-03 annexation (Western markets close, only the Union remains); 1941-06-14 deportations; 1941-06-22 German occupation and the Holocaust (war: output ×0.6, taxes halved, no plan); 1944-07-13 Soviet return; 1945-01-28 Klaipėda back; 1945-05-09 war ends; 1947 card: collectivization (at once: village fields −15% until 1955, then +15%; or slowly: Party trust −15, food plan ×1.2); 1948-05-22 and 1949-03-25 deportations; 1953-03-05 Stalin dies; Union projects as cards in 1955 (hydro dam near Kaunas by 1960), 1960 (power station near Kaišiadorys by 1962), 1974 (nuclear plant near Zarasai by 1983); 1988-06-03 Sąjūdis; 1989-08-23 Baltic Way; 1990-03-11 independence restored; 1990-04-18 to 07-02 Soviet blockade; 1991-09-06 recognition; 1993-08-31 last troops leave; 2004-05-01 European Union.

**The state plan:** from 1946, each year has delivery targets to the Union (grain, dairy, meat, timber, bricks; linen and furniture in era 2; electronics in era 3), scaled to the republic's population and rising 4% a year. Deliveries are deals with the Union through railway stations. At year end: 100% or more brings Union investment (1,500 + 400 per year since 1946, ×1.5 above 115%, ×1.3 with Party trust 75+) and trust +8 or +12; 80–100% costs trust 6; under 80% costs trust 15 and a year of output ×0.9. Trust under 20 replaces the republic's leaders (morale −5). Union projects pay a grant up front and a reward when the building stands in time; late costs trust 20.

**The neutral path** (did not happen): if the ultimatum is resisted with enough security, Lithuania stays independent; shipping to Britain stops from 1941-06-22 until 1945-05-08, then all markets reopen and a lost Klaipėda Region returns.

Random events every 170–340 days: bumper harvests, London butter prices, British bacon demand, timber prices abroad, a Nemunas flood in Kaunas, a wet harvest, linen fashion (era 2+).

## Tutorial

New players get an 8-step hint card (`js/tutorial.js`): look around, open a town, see the routes, build a road, start a route, zone homes, place industry, speed up time (and expect history's decisions). Each step finishes when the player does it, or on Next. It shows once per device (`localStorage['lietuva1918-tutorial']`); the Lithuania tab can start it again.

## Ministry tasks

Link Alytus (600 Lt), start a new route (400), link Utena (600), give a town three foods (800), link Tauragė (600), build a warehouse (300), open a school (400), found a town (1,000), reach 800k residents (1,500), link Klaipėda (1,500), sell through the port (800), sell abroad through a border post or port (600), enter Industrialization (2,000), power every town (3,000; villages do not need power), reach Modern Lithuania (5,000).

## Balance notes

- Tested with the smoke test and scripted runs from 1918 to 1990 on both paths (`tools/smoke-test.js` jumps through the key cards). With no player input, the 1918 population of about 620k holds steady, and the towns with starting farms grow to about 730k by 1920; income settles near +30 Lt a day.
- Without the player, the state plan is never met, so Party trust stays low; plan targets are about a third of a farm per good at the start.
- Reaching security 80 by 1940 takes a deliberate effort: about 15 years of a 25 Lt army budget plus treaties, or steady exports to Britain.
- Not yet tested by hand: the late game (era 3), large networks of 20 or more routes, nuclear-scale power, and how hard the plan feels.
