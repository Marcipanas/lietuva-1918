# Game design

The current rules and numbers. The source of truth is `js/data.js` and `js/sim.js`; update this file when you change them.

## Fantasy and goal

You lead the newly independent Lithuania from 16 February 1918, inside the borders of the day: the Klaipėda Region is German and the Palanga coast is Courland's, so the new state has no sea coast. Eighty-nine towns and 362 villages, each at its real place, feed themselves. Slow dirt roads join them all, but only the railways and the old paved highways link 38 towns to Vilnius. You lay roads and railways, zone land for homes, place farms and industry, run transport routes so towns supply each other, and trade abroad. History moves the borders and interrupts with decisions: volunteers against the Red Army, Żeligowski's march on Vilnius, the litas, the Klaipėda revolt, the Depression, the ultimatums of 1938 to 1940, and, if Lithuania falls under Soviet rule, the state plan. **Goal:** reach the Modern era with every town linked to the capital by railway or paved road and powered, and 2.4 million residents (fewer if Lithuania is smaller, see Eras).

Scale: the map is the real country, about 400 × 310 km, with no grid, and distances between places are true. Towns are drawn about five times larger than life so they read well: a house lot is 0.42 km across. Population is counted in thousands (`2k` is one lot of wooden houses; a village farmstead holds 0.5k). One simulation step is one day. Speeds are 2, 5 and 12 days per second.

## Eras

| Era | Requirements to enter | Unlocks |
|---|---|---|
| Independence (start) | none | farms, forestry, peat, flax, brickworks, dairy, pigs, fisheries, warehouses, stations, port, schools, clinics, dirt roads, railways, horse carts, steam trains |
| Industrialization | 850k residents, 50 towns linked to the capital, 150 bricks in stock, 6,000 Lt | peat power stations, linen mills, furniture factories, paved roads, trucks, brick apartments, Lv 2 upgrades; towns want linen cloth and electric light |
| Modern Lithuania | 1,450k residents, 70 towns linked, 500 bricks, 200 linen cloth, 25,000 Lt | hydro dams, nuclear plant, electronics plants, highways, electric railways, lorries, electric trains, panel blocks, Lv 3 upgrades; towns want electronics |

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

- **1918 map:** every town that existed in 1918 and 362 villages, at their real places (Euronym names; towns founded later, such as Elektrėnai and Visaginas, are left out). The 11 main towns (`TOWNS0`) and 44 more (`TOWNS1`) have written descriptions and their 1918 sizes; six of those were still villages then. Other towns hold 1k to 3k people, villages 0.4k to 1.2k (more on fertile soil). Settlements in land others hold wait, locked, until it is Lithuanian (see Borders).
- **Big cities:** Vilnius, Kaunas, Klaipėda, Šiauliai and Panevėžys are laid out from their real main streets (Gedimino prospektas, Pilies and Didžioji streets; Laisvės alėja and the bridges to Aleksotas and Vilijampolė; Manto street), as paved roads, filled in with a grid of streets 1 km apart. Their stations stand where the real ones do.
- **Landmarks** at their real places, drawn about twice life size, cost nothing and cannot be removed: Gediminas Tower, the Cathedral with its bell tower, St Anne's and the Town Hall in Vilnius; the Town Hall, the castle and St Michael the Archangel in Kaunas; the theatre in Klaipėda; the cathedral and the Hill of Crosses at Šiauliai; Trakai Island Castle (in ruins); the Tiškevičius palace in Palanga; the church of Anykščiai.
- **Railways of 1918:** St Petersburg–Warsaw (Turmantas, Ignalina, Švenčionėliai, Vilnius, Varėna), Lentvaris–Kaunas–Kybartai, Libau–Romny (Mažeikiai, Šiauliai, Radviliškis, Kėdainiai, Jonava, Kaišiadorys), Radviliškis–Panevėžys–Rokiškis, Mažeikiai and Šiauliai to Jelgava, Tilsit–Klaipėda, Vilnius to Lida and to Minsk, the narrow gauge Švenčionys–Utena–Anykščiai–Panevėžys, and Varėna–Alytus–Šeštokai. About 1,300 km, with 44 stations.
- **Paved highways of 1918:** St Petersburg–Warsaw (Zarasai, Utena, Ukmergė, Jonava, Kaunas, Marijampolė, Kalvarija) with its branch to Kybartai, St Petersburg–Riga–Königsberg (Joniškis, Šiauliai, Tauragė, Pagėgiai), Alytus–Varėna and Merkinė–Kapčiamiestis. About 570 km.
- **Dirt roads** join every settlement to its neighbours (about 7,400 km), and run on to the border at the main crossings. A town is **linked** when a railway or paved road from the capital (Vilnius, or Kaunas while others hold Vilnius) reaches its streets (within 1.6 × its radius + 1.5 km of the hall by road); railways and paved roads also carry the power grid. A village has one street (sometimes a side lane), a wooden chapel and two to four farmsteads.
- **Feeding itself:** every settlement's own fields add grain and potatoes for its 1918 population (`pop0`) to its stock each day (0.05 each per thousand), and its own woodlots heat that many homes. Its base workforce works its own land, so it is never jobless. A settlement therefore keeps its size for years without the player. Growth beyond `pop0` needs food from farms or routes, homes on zoned land, and jobs.
- **Growth:** +max(0.01k, 0.4%) a day × morale/62 × (1 + 0.3 × clinic coverage), up to the housing limit, while food is at least 99% supplied and either the town is below `pop0`, or it has at least 8 days of food in stock and its food stock is not falling. A town short of food loses 2% of the people it cannot feed each day; overcrowding removes 3% of the excess.
- **Zoning** paints lots (0.42 km, 5 Lt each) along both sides of a street. A town builds on its own lots, every 5 days (more than one at a time in towns over 50k), while homes are at least 92% full, food is at least 99% supplied and morale is at least 45. It picks the closest, cleanest lot. Houses are paid from the town's stock: wooden houses (2k people) 10 Lt and 2 timber; brick apartments (6k, era 2) 30 Lt and 5 bricks; panel blocks (15k, era 3) 75 Lt and 12 bricks. In later eras, old houses and farmsteads are rebuilt in the new style.
- **Layout:** towns are a market square around the town hall, three to six curving streets out of it, ring roads in bigger towns, houses nearest the square and zoned lots beyond. Where rivers or lakes leave too little room, extra streets are added until every home fits. Settlements stand at least `HALL_GAP` = 4 km apart when the player founds one.

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
- **Roads,** per km: dirt 5 Lt + 0.3 timber; paved 14 + 0.6 bricks; highway 30 + 1.2 bricks. **Railways:** 20 + 1 timber; electric 45 + 1.2 bricks. Bridges cost 4×. A line is drawn by tapping the points it passes; the planner goes around lakes, the border and buildings, and bridges rivers. Where it follows a line that exists, it uses that line: following it costs nothing, and an old line of a lower kind than the one chosen is upgraded on the way for 60% of the price. A town at either end that has the materials pays. Tapping an old line first offers to upgrade that whole stretch. Upkeep per km a day: dirt roads nothing (the villages keep them up), paved roads 0.006, highways 0.009, railways 0.009 / 0.018 Lt.
- **Drawing lines:** the line follows the finger, runs straight where it can, goes around lakes, the sea and buildings, bridges rivers, joins roads it touches and makes a junction where it crosses another road. Roads and railways cross on the level.

## Money

Taxes: 0.08 Lt per thousand town residents (0.04 in villages) a day × min(1.4, morale/62), halved in war. Building upkeep: 0.4 Lt × level a day (warehouses 0.3; paused buildings pay 30%; stations and landmarks nothing). An army budget (0, 10, 25 or 50 Lt a day) and a Baltic alliance cost money every day. The start treasury is 3,000 Lt.

## Pollution

Each polluting building spreads `pol × (1 − distance / 2 km)` over 2 km. A town's pollution is the average at its homes. Placing a polluter or zoning shows the fields as brown discs, and the ghost of a polluter shows its 2 km ring.

## Foreign trade (js/history.js)

Goods cross the border only at a **gateway**: a border post (`customs`, within 3 km of the border of the day, by a road) or a sea port, in the town that owns it. The post trades with whoever holds the nearest land across within 3.5 km (`borderOf`, `OWN_GATE`): Latvia; Germany, for East Prussia and the Klaipėda Region under German or Allied rule; Poland, for its own land, the Belarusian side between the wars and a Polish Vilnius region. Land under Soviet rule has no market across the border. Routes bring goods to the gateway town; **deals** then sell from (or buy into) that town's stock every day.

| Market | Gateway | Buys (× base price) | Sells (× base price) |
|---|---|---|---|
| Britain | sea port | dairy 1.4, meat 1.45, flax 1.25, timber 1.1, textiles 1.1, grain 0.9 | metal 1.15, textiles 1.05, electronics 1.3 |
| Germany | German border post or sea port | meat 1.25, timber 1.2, dairy 1.1, flax 1.1, grain 1, potatoes 0.9, fish 0.9 | metal 1.1, textiles 1.15, furniture 1.2, electronics 1.4 |
| Latvia | Latvian border post | grain 1.2, potatoes 1.15, bricks 1.15, peat 1.1, meat 1, timber 0.9 | fish 1, textiles 1.25, metal 1.3 |
| Poland | Polish border post | timber 1.15, flax 1.05, dairy 1, furniture 1.1 | metal 1.2, textiles 1, bricks 1.1 |
| The Union | railway station | most goods at 0.6–0.75 | metal 0.8, textiles 0.9, electronics 0.9 |

- Export prices are after a 10% duty. One market takes 20 loads a day of one good at full price; more sells at half price.
- A deal sells only what is above 10 days of the town's own use. Imports stop when storage is full or money runs out.
- The Depression lowers farm prices abroad and at home by year: 1930 ×0.7, 1931 ×0.55, 1932 ×0.42, 1933 ×0.4, 1934 ×0.45, 1935 ×0.55, 1936 ×0.75, 1937 ×0.9 (other goods half as much).

## Borders (js/history.js, S.own)

The map starts with the borders of 16 February 1918 and history moves them. Four parts of today's Lithuania changed hands (`REGIONS`; outlines in `tools/geo`): the **Klaipėda Region**, the **Palanga coast**, and the **Vilnius region** in two parts (what came back in October 1939, and what Soviet Belarus kept until November 1940). The neighbours' land changes hands too: the Belarusian side is Polish from October 1920 and Soviet from September 1939; East Prussia becomes the Kaliningrad region in 1946.

- Land others hold is washed in its holder's colour, with its name and holder on the map. Lithuania's border of the day is the bold dashed line.
- Nothing can be built there, no line can be planned through it, and roads and railways there carry nothing for Lithuania. Its settlements lock with everything built there and its deals end; routes to them stop. When the land comes back, they work again at least at their 1918 size.
- While others hold Vilnius, **Kaunas is the temporary capital**: "linked" counts towns joined to Kaunas.
- The eras and the goal ask less of a smaller Lithuania: residents and linked towns needed scale with the share of the 1918 residents (and of the towns) living in the land held now, against the land held at the start, between 0.6 and 1.3. Losing the Vilnius region drops Industrialization from 850k to 640k residents and 50 to 44 linked towns.

| Part | 16 Feb 1918 | Then (as it happened) |
|---|---|---|
| Klaipėda Region | Germany | the Allies from 15 Feb 1920; Lithuania from 16 Feb 1923; Germany from 22 Mar 1939; Soviet Lithuania from 28 Jan 1945 |
| Palanga coast | Courland (Latvia) | Lithuania from 30 Mar 1921 |
| Vilnius region | Lithuania | Poland from 8 Oct 1920 (Central Lithuania until 24 Mar 1922); Soviet from 17 Sep 1939; back to Lithuania 28 Oct 1939 (Vilnius, Trakai, Eišiškės, Švenčionėliai, Ignalina) and 6 Nov 1940 (Švenčionys, Šalčininkai, Druskininkai) |

In reality the Red Army took Vilnius in January 1919 and Poland held it from April 1919 to July 1920. The game keeps the city in Lithuanian hands until the crisis of October 1920, so a new player does not lose the starting capital in the first minutes.

## History (js/history.js)

Dated events go to the Chronicle. **Decision cards** stop the clock until the player picks an option; each option says whether it is what happened, and the Chronicle lists every decision taken, marked as in history or not. Options that defy a great power work only with enough **security** (0 to 100, starts at 15): volunteers in 1918 add 15, an army budget adds up to 10 a year, Baltic treaties add 8 or 18, holding the Klaipėda trial adds 6, and each year exports to Britain add up to 4 (one per 2,000 Lt). Choices carry forward: without volunteers Vilnius can hardly be held; the union with Poland skips the Polish ultimatum and brings war in 1939; Moscow offers Vilnius in 1939 only if others hold it.

| Date | Event | Choices and effects |
|---|---|---|
| 1918-07-11 | The Council elects Wilhelm of Urach king (taken back in November) | none |
| 1918-11-11 | Armistice; first government | none |
| 1918-12-29 | **Card:** defend the new state | call for volunteers (1,500 Lt, security +15) or leave defence to others (did not happen; −5) |
| 1919-11-22 | Bermontians beaten at Radviliškis | none |
| 1920-02-15 | The Allies take over the Klaipėda Region | its holder changes |
| 1920-05-15 | Constituent Assembly meets | none |
| 1920-07-12 | Moscow Peace Treaty | 1,000 Lt (three million gold roubles) |
| 1920-10-07 | Suwałki Agreement | none |
| 1920-10-08 | **Card:** Żeligowski marches on Vilnius | hold the line at Širvintos (Vilnius region to Poland, Kaunas the temporary capital, +5, morale −5 for 3 years) or defend Vilnius (did not happen; 2,500 Lt; needs 35, else lost anyway, −10, morale −8) |
| 1920-10-12 | Republic of Central Lithuania | Polish market closed until 1938 |
| 1920-11-21 | Širvintos and Giedraičiai | none |
| 1921-03-30 | Palanga joins | the coast: a sea port can be built |
| 1921-09-03 | **Card:** the Hymans plan (only if Poland holds Vilnius) | reject, or a union with Poland (did not happen): Vilnius back, Polish market open, −15, morale −6 for 4 years, war in 1939 |
| 1922-02-15 | Land Reform Law | grain and potato farms +15% |
| 1922-03-24 | Poland annexes the Vilnius region | none |
| 1922-10-02 | **Card:** a currency of our own | the litas (1,500 Lt, Britain and Latvia ×1.05) or the German mark (did not happen; half the treasury lost on 1923-11-20) |
| 1923-01-09 | **Card:** the Klaipėda question | back the revolt (800 Lt; the region joins on 16 February) or leave it to the Allies (did not happen; +6, Britain ×1.05; Germany takes it in March 1939) |
| 1923-03-15 | The Vilnius line recognised as Poland's border | none |
| 1924-05-08 | Klaipėda Convention | none |
| 1926-12-17 | Coup: Smetona in power | none |
| 1927 | Pienocentras (year only) | dairy ×1.5 at home, Britain ×1.05 |
| 1929-10-29 | Wall Street crash | none |
| 1930 | **Card:** the Depression | buy up farm produce (did not happen on this scale; 15 Lt a day for 5 years) or balance the budget (as happened; morale −8 for 5 years) |
| 1934-09-12 | **Card:** Baltic Entente | sign (security +8, Latvia ×1.1), propose an alliance (did not happen; +18, 10 Lt a day), stay apart |
| 1934-12-14 | **Card:** trial of Neumann and Sass (if Klaipėda is Lithuanian) | hold it (security +6, German boycott, Britain ×1.1) or drop it (did not happen; security −10, morale −5) |
| 1935-08-20 | Suvalkija farmers' strike, unless farm support is running | morale −10 in Suvalkija for 120 days |
| 1936-08-05 | Trade treaty with Germany | ends the boycott |
| 1938-03-17 | **Card:** Polish ultimatum (not in the union) | accept (Polish market opens, +3) or refuse (needs 40) |
| 1939-03-20 | **Card:** German ultimatum on Klaipėda (if Lithuanian) | hand over the region (−5) or refuse (needs 60, else lost by force) |
| 1939-09-01 | War in Europe | Britain and Poland closed; in the union, war |
| 1939-09-17 | The Red Army invades Poland | the Belarusian side and a Polish Vilnius region become Soviet; in the union, Soviet occupation |
| 1939-10-10 | **Card:** Soviet bases | accept (−30, Soviet trade, Vilnius back on 28 October if others held it) or refuse (needs 70, else occupation at once) |
| 1940-06-14 | **Card:** Soviet ultimatum | accept (occupation, the Soviet path) or resist (needs 80 and no bases; else occupation with heavy losses) |
| 1946-07-04 | Kaliningrad region | East Prussia's label changes |

**The Soviet path** (as it happened): 1940-08-03 annexation (Western markets close, only the Union remains); 1940-11-06 the rest of the Vilnius region; 1941-06-14 deportations; 1941-06-22 German occupation and the Holocaust (war: output ×0.6, taxes halved, no plan); 1944-07-13 Soviet return; 1945-01-28 Klaipėda back; 1945-05-09 war ends; 1947 card: collectivization (at once: village fields −15% until 1955, then +15%; or slowly: Party trust −15, food plan ×1.2); 1948-05-22 and 1949-03-25 deportations; 1953-03-05 Stalin dies; Union projects as cards in 1955 (hydro dam near Kaunas by 1960), 1960 (power station near Kaišiadorys by 1962), 1974 (nuclear plant near Zarasai by 1983); 1988-06-03 Sąjūdis; 1989-08-23 Baltic Way; 1990-03-11 independence restored; 1990-04-18 to 07-02 Soviet blockade; 1991-09-06 recognition; 1993-08-31 last troops leave; 2004-05-01 European Union.

**The state plan:** from 1946, each year has delivery targets to the Union (grain, dairy, meat, timber, bricks; linen and furniture in era 2; electronics in era 3), scaled to the republic's population and rising 4% a year. Deliveries are deals with the Union through railway stations. At year end: 100% or more brings Union investment (1,500 + 400 per year since 1946, ×1.5 above 115%, ×1.3 with Party trust 75+) and trust +8 or +12; 80–100% costs trust 6; under 80% costs trust 15 and a year of output ×0.9. Trust under 20 replaces the republic's leaders (morale −5). Union projects pay a grant up front and a reward when the building stands in time; late costs trust 20.

**The neutral path** (did not happen): if the ultimatum is resisted with enough security, Lithuania stays independent; shipping to Britain stops from 1941-06-22 until 1945-05-08, then all markets reopen and a lost Klaipėda Region returns. Without the Soviet path, the part of the Vilnius region Soviet Belarus kept stays Soviet.

Random events every 170–340 days: bumper harvests, London butter prices, British bacon demand, timber prices abroad, a Nemunas flood in Kaunas, a wet harvest, linen fashion (era 2+).

## Tutorial

New players get a 9-step hint card (`js/tutorial.js`): look around, open a town, open the Lithuania view, see the routes, build a road, start a route, zone homes, place industry, speed up time (and expect history's decisions). Each step finishes when the player does it, or on Next. It shows once per device (`localStorage['lietuva1918-tutorial']`); the Lithuania view can start it again.

## The interface

Made for one hand on a phone first. One finger always moves the map; two fingers zoom, turn and tilt. A tap acts. Nothing is built until the player presses Build in the action bar, which says what will happen, what it costs and who pays.

- **Five views** at the bottom: Build, Routes, Lithuania, Trade (Plan under Soviet rule), Chronicle. Lithuania shows a red count of places with urgent problems; Chronicle shows how many entries are new.
- **Build** is two steps: lines and land (Road, Railway, Zone homes, Remove), then a group of buildings (Food, Raw materials, Industry, Power, Transport and storage, Town services) and a building in it, with what it makes, what ground it needs and what it costs.
- **Placing a building:** it appears on the best spot near the town it was chosen for (or near the middle of the view): facing a road, on ground that suits it, where a town takes it in. Ground that suits it is lit with hatching. The player drags it, taps elsewhere to move it there, turns it, or asks for another spot.
- **Roads and railways:** tap where the line starts, then each place it passes; drag a point to move it; Undo takes the last one back. Hold still a moment and drag to draw freehand. The plan shows new stretches in amber, old ones it upgrades in green, and anything in the way in red.
- **Zoning** adds up street by street with taps, or by painting after a short hold. **Remove** takes one thing per tap, or everything a painted stroke touches.
- **A town's card**: residents and their trend, morale, its link to the capital, six health tiles (food, heat, homes, jobs, power or storage, air), its problems worst first with one-tap fixes, the goods it makes, uses and stocks each day, its buildings, its neighbours with a button to start a route, and its stock to buy and sell.
- **Problems and fixes.** Urgent: hungry, cold homes, blackouts. Holding it back: food running low, overcrowded, no land to build on, no materials for homes, people out of work, buildings missing an input, short of workers or stopped by full stores, smoky air, wanted goods missing, low morale. Notes: not linked to the capital, a railway without a station. Fixes start a route from the neighbour with the most to spare (or add a vehicle to the route there is), place the building that makes what is missing, zone land, build a warehouse, sell the surplus, or carry commuters.
- **The Lithuania view**: residents and treasury with their trend since 1918, towns linked to the capital, progress to the next era, problems by kind with the places that have them, the goods the country makes and uses each day, towns sorted by need, size or name, then the goal, the era, ministry tasks and security.
- **On the map**, a town's label carries a dot: red for an urgent problem, amber when something holds it back, green when it thrives. Villages show only red.

## Ministry tasks

Start a new route (400 Lt), bring the railway to Marijampolė (800; it came in 1924), give a town three foods (800), bring the railway to Telšiai (800; it came in 1926), build a warehouse (300), link Biržai to the capital by rail or paved road (600), open a school (400), found a town (1,000), reach 800k residents (1,500), link Klaipėda to the railways of Lithuania once the region is Lithuanian (1,500; done in 1932 through Telšiai), sell through the port (800), sell abroad through a border post or port (600), enter Industrialization (2,000), power every town (3,000; villages do not need power), reach Modern Lithuania (5,000).

## Balance notes

- Tested with the smoke test and scripted runs (`tools/smoke-test.js` jumps through the key cards). With no player input, the 1918 population of about 680k (730k with the Klaipėda Region) holds steady, and the towns with starting farms grow to about 820k by 1920; income starts near +20 Lt a day and settles near +28.
- Without the player, the state plan is never met, so Party trust stays low; plan targets are about a third of a farm per good at the start.
- Reaching security 80 by 1940 takes a deliberate effort: about 15 years of a 25 Lt army budget plus treaties, or steady exports to Britain.
- Holding Vilnius in October 1920 needs security 35: the 1918 volunteers (+15) and an army budget of 25 Lt a day from the start (about +13) reach it; without the volunteers it takes 50 Lt a day. Most players following history lose the Vilnius region, about a quarter of the 1918 residents (156k of 679k), which the era scaling makes up for.
- With the Klaipėda Region (52k in 1918) and Palanga (2k), historical Lithuania holds 561k of the 1918 residents from 1923 to 1939, about 83% of the start.
- Not yet tested by hand: the late game (era 3), large networks of 20 or more routes, nuclear-scale power, and how hard the plan feels.
