# Game design

The current rules and numbers. The source of truth is `js/data.js` and `js/sim.js`; update this file when you change them.

## Fantasy and goal

You lead the newly independent Lithuania from 16 February 1918, inside the borders of the day: the Klaipėda Region is German and the Palanga coast is Courland's, so the new state has no sea coast, and German troops hold all the land around it. Vilnius changes hands several times from January 1919 and is Polish for most of the years between the wars. Eighty-nine towns and 362 villages, each at its real place, feed themselves. Slow dirt roads join them all, but only the railways and the old paved highways link 38 towns to Vilnius. You lay roads and railways, zone land for homes, plan farms and industry (a plan becomes a building site that takes its money and materials as they come), run transport routes so towns supply each other, set taxes and policies, and trade abroad. History moves the borders and interrupts with decisions: volunteers against the Red Army, the Bermontians, Żeligowski's march on Vilnius in 1920, land reform, the litas, the Klaipėda revolt, the coup of 1926, the Depression, the ultimatums of 1938 to 1940, and, if Lithuania falls under Soviet rule, the state plan, until independence is restored in 1990. **Goal:** reach the Modern era with every town linked to the capital by railway or paved road and powered, and 2.4 million residents (fewer if Lithuania is smaller, see Eras).

Scale: the map is the real country, about 400 × 310 km, with no grid, drawn twice its size (`MAPK` = 2, decision 38) so towns have open land between them; distances shown to the player are real km, and costs and travel times per km are set so the economy plays as on a real-size map. Towns are drawn about five times larger than life so they read well: a house lot is 0.42 drawn km across. Population is counted in thousands (`2k` is one lot of wooden houses; a village farmstead holds 0.5k). One simulation step is one day. Speeds are 2, 5 and 12 days per second.

## Eras

| Era | Requirements to enter | Unlocks |
|---|---|---|
| Independence (start) | none | farms, fisheries, forestry, peat, flax, sawmills, brickworks, breweries, dairy, pigs, warehouses, stations, border posts, the port, schools, clinics, dirt and paved roads, railways, horse carts, steam trains |
| Industrialization | 850k residents, 50 towns linked to the capital, 150 bricks in stock, 6,000 Lt | peat power stations, linen mills, furniture and sugar factories, sugar beet, trucks, brick apartments, Lv 2 modernization. Factories need metal from abroad. Over the next four years towns come to expect linen cloth, sugar and electric light |
| Modern Lithuania | 1,450k residents, 70 towns linked, 500 bricks, 200 linen cloth, 25,000 Lt | cement works, fertiliser plants, hydro dams, the nuclear plant, electronics plants, highways, electric railways, lorries, electric trains, panel blocks, Lv 3 modernization. Over four years towns come to expect electronics |

"Begin era" can be pressed only when every requirement is met. What a new era makes towns want sets in over four years (`WANT_YEARS`), so the first day of an era costs no morale.

## Goods (base price in litas)

| Food | Raw | Made | From Industrialization | Modern era |
|---|---|---|---|---|
| grain 2, potatoes 1.6, dairy 6, meat 8, fish 5 | timber 3, peat 2.5, flax 4 | planks 5.5, bricks 6, beer 6 | sugar beet 1.8, sugar 12, linen cloth 20, furniture 26, metal 30 (from abroad only, through a port or border post) | cement 9, fertiliser 14, electronics 80 |

**Chains:** timber → planks → furniture; peat → bricks; grain → beer; grain → dairy; potatoes → meat; flax → linen cloth; sugar beet → sugar; peat (on limestone) → cement; peat → fertiliser; metal → electronics. Planks, bricks, metal and cement are the building materials (`MATS`, with timber for railway sleepers and dirt roads).

**What towns want beyond food and fuel** (`WANTS`; villages make their own), per thousand residents a day: beer 0.008 (morale +4 with it, nothing lost without), linen cloth 0.012 (+7, −5), sugar 0.006 (+4, −2), electronics 0.004 (+8, −6). The loss grows from nothing on the day the era begins to its full size after four years. **Shops** (`runShops`): a town with less than ten days of a wanted good fetches two weeks' worth by cart from the nearest town with some to spare (above ten days of its own use and 20 loads), on the carters' terms: 4 loads a day, fewer with distance, from at most 200 km. So a mill in one town supplies the towns around it without a route to each; what counts is that the country makes enough.

**Fertiliser:** grain, potato, flax and beet fields in a town that has fertiliser use 0.5 a day each and grow 30% more.

Local prices drift ±2% a day toward the base price (lowered in the Depression), within 60–160% of it. Every town can sell to and buy from local merchants: they pay 80% of the price (selling a lot of 25 lowers it 2.5%) and charge 150% (buying raises it 1%). A town with a port sells for 30% more and buys at 120%. Metal can be bought only in a town with a port or a border post. Under Soviet rule there are no local merchants. Foreign trade is below.

## Buildings (per day; workers in thousands; footprint in km)

| Building | Footprint | Workers | In → Out | Needs | Cost | Days to build |
|---|---|---|---|---|---|---|
| Grain farm | 1.1 × 1 | 10 | → 8 grain (+35% on fertile soil) | open land | 250 Lt, 15 planks | 14 |
| Potato fields | 1 × 1 | 8 | → 9 potatoes (+35% fertile) | open land | 200, 10 planks | 12 |
| Dairy farm | 1 × 0.9 | 10 | 2 grain → 4 dairy | open land | 450, 25 planks | 20 |
| Pig farm | 0.5 × 0.45 | 8 | 3 potatoes → 3 meat; pollution 1 | | 400, 20 planks | 18 |
| Fishery | 0.45 × 0.4 | 8 | → 5 fish | water within 0.6 km | 350, 20 planks | 16 |
| Forestry camp | 0.45 × 0.45 | 10 | → 8 timber × forest factor (0.3–1.4, forest within 1.6 km) | forest around it | 200 | 10 |
| Peat works | 1 × 1 | 12 | → 8 peat; pollution 1 | bog under 40% of it | 300, 10 planks | 14 |
| Flax fields | 1 × 1 | 8 | → 6 flax (+40% in the flax belt) | open land | 250, 10 planks | 12 |
| Sugar beet fields | 1 × 1 | 8 | → 9 beet (+35% fertile) | open land, era 2 | 300, 15 planks | 12 |
| Sawmill | 0.6 × 0.5 | 8 | 6 timber → 5 planks | | 350, 25 timber | 20 |
| Brickworks | 0.55 × 0.5 | 14 | 3 peat → 5 bricks; pollution 2 | clay | 600, 30 planks | 30 |
| Brewery | 0.55 × 0.5 | 6 | 3 grain → 4 beer | | 500, 25 planks, 15 bricks | 35 |
| Warehouse | 0.8 × 0.6 | — | +400 storage per good (Lv 2: 800, Lv 3: 1300) | | 500, 40 planks | 25 |
| Railway station | 0.65 × 0.3 | — | joins a town to the railway | beside a track, with a road to town | 300, 20 planks | 20 |
| Border post | 0.4 × 0.3 | — | lets its town trade with the country across the border | within 3 km of the border, by a road | 400, 20 planks | 15 |
| Sea port | 1 × 0.8 | — | trade by sea, port prices, metal imports | sea or lagoon within 0.7 km | 3,000, 80 planks, 40 bricks | 150 |
| School | 0.5 × 0.4 | 3 | 1 per 50k residents: up to +10% output in town | | 600, 30 planks | 40 |
| Clinic | 0.45 × 0.4 | 3 | 1 per 70k: up to +6 morale, +30% growth | | 700, 30 planks | 40 |
| Peat power station | 0.9 × 0.9 | 14 | 4 peat → 30 MW; pollution 4 | era 2 | 1,800, 60 bricks, 10 metal | 120 |
| Linen mill | 1 × 0.8 | 24 | 4 flax + 5 MW → 4 linen; pollution 2 | era 2 | 2,200, 80 bricks, 20 metal | 150 |
| Furniture factory | 0.9 × 0.75 | 20 | 5 planks + 4 MW → 3 furniture; pollution 1 | era 2 | 2,000, 60 bricks, 10 metal | 120 |
| Sugar factory | 1 × 0.8 | 20 | 6 beet + 4 MW → 4 sugar; pollution 2 | era 2 | 2,400, 80 bricks, 15 metal | 150 |
| Cement works | 1 × 0.9 | 25 | 4 peat + 8 MW → 6 cement; pollution 4 | limestone, era 3 | 6,000, 200 bricks, 40 metal | 240 |
| Fertiliser plant | 1 × 0.9 | 25 | 2 peat + 12 MW → 6 fertiliser; pollution 3 | era 3 | 8,000, 150 cement, 60 metal | 300 |
| Hydro dam | 0.5 × 0.8 | 10 | → 140 MW | across a river, era 3 | 9,000, 300 cement, 40 metal | 540 |
| Nuclear power plant | 1.4 × 1.4 | 40 | → 450 MW | lake within 0.8 km, era 3 | 30,000, 600 cement, 150 metal | 1,400 |
| Electronics plant | 0.9 × 0.8 | 30 | 2 metal + 10 MW → 3 electronics; pollution 1 | era 3 | 7,000, 100 cement, 40 metal | 240 |
| Town hall (a new town) | 0.5 × 0.5 | — | founds a town | 4 km from other halls | 800, 40 planks, paid at once | — |

Placement: a building may not overlap another building or a road or track; near a road it turns to face it and slides along to the nearest spot that fits. A building belongs to the town whose hall it reaches within 15 km by road, and needs a road within 0.3 km of its footprint. Villages count 6 km further away than they are when workplaces choose a town, so a farm next to a village joins the nearby town that has the workers; homes and zoned lots always belong to the nearest settlement. Limestone lies in three beds in the north (around Akmenė, Pakruojis and Biržai). A Union project (Soviet path) can unlock a building before its era.

**Modernization:** Lv 2 costs 120% of the build price plus 20 bricks and 5 metal; Lv 3 costs 250% plus 30 cement and 15 metal. Output ×1.7 / ×2.6, inputs ×1.5 / ×2.1, same workers. It takes half (to Lv 2) or four fifths (to Lv 3) of the building's own days, at least 10, as a site on a building that keeps working.

## Building sites (js/sim.js: `siteNew`, `runSites`, `haul`)

- **A plan needs nothing in hand.** Placing a building makes a plan with a site (`b.c`). The action bar says what the site will wait for. Scaffolding and a dashed outline mark it on the map, and the model rises from the ground as the work goes on.
- **Money** comes from the treasury, above the reserve the player keeps (`S.keep`: nothing, 500 Lt by default, 2,000 or 5,000). **Materials** come from the stock of the site's town, above five days of the town's own use and above the fuel it keeps for winter.
- **Carters** bring what the town lacks from the nearest town along the roads and railways with some to spare (above ten days of its own use and 20 loads): 4 loads a day of each material for each town, halved for every 50 km of the way (a railway counts as half its length), from at most 200 km. Towns get the material for their own homes the same way. A route is faster.
- **The builders** need the building's days once everything is there, and work no further than the share of the plan that has been delivered. War, purges and other things that slow output slow them too.
- **Order:** sites are served oldest first. A site can be put first, put on hold (it takes nothing), or cancelled: its money goes back to the treasury and its materials to the town.
- A site gives no work, makes nothing and costs no upkeep. It lists what it still lacks; what no cart can bring is a problem of its town ("Building waits for planks"), with fixes: build the works that makes it, buy it, or import it.
- **Roads, railways and new towns are paid at once** (decision 45): money from the treasury, materials from the town that pays and then from towns in the carters' reach.

## Settlements, homes and growth

- **1918 map:** every town that existed in 1918 and 362 villages, at their real places (Euronym names; towns founded later, such as Elektrėnai and Visaginas, are left out). The 11 main towns (`TOWNS0`) and 44 more (`TOWNS1`) have written descriptions and their 1918 sizes; six of those were still villages then. Other towns hold 1k to 3k people, villages 0.4k to 1.2k (more on fertile soil). Settlements in land others hold wait, locked, until it is Lithuanian (see Borders).
- **Big cities:** Vilnius, Kaunas, Klaipėda, Šiauliai and Panevėžys are laid out from their real main streets (Gedimino prospektas, Pilies and Didžioji streets; Laisvės alėja and the bridges to Aleksotas and Vilijampolė; Manto street), as paved roads, filled in with a grid of streets 1 km apart. Their stations stand where the real ones do.
- **Landmarks** at their real places, drawn about twice life size, cost nothing and cannot be removed: Gediminas Tower, the Cathedral with its bell tower, St Anne's and the Town Hall in Vilnius; the Town Hall, the castle and St Michael the Archangel in Kaunas; the theatre in Klaipėda; the cathedral and the Hill of Crosses at Šiauliai; Trakai Island Castle (in ruins); the Tiškevičius palace in Palanga; the church of Anykščiai.
- **Railways of 1918:** St Petersburg–Warsaw (Turmantas, Ignalina, Švenčionėliai, Vilnius, Varėna), Lentvaris–Kaunas–Kybartai, Libau–Romny (Mažeikiai, Šiauliai, Radviliškis, Kėdainiai, Jonava, Kaišiadorys), Radviliškis–Panevėžys–Rokiškis, Mažeikiai and Šiauliai to Jelgava, Tilsit–Klaipėda, Vilnius to Lida and to Minsk, the narrow gauge Švenčionys–Utena–Anykščiai–Panevėžys, and Varėna–Alytus–Šeštokai. About 1,300 km, with 44 stations.
- **Paved highways of 1918:** St Petersburg–Warsaw (Zarasai, Utena, Ukmergė, Jonava, Kaunas, Marijampolė, Kalvarija) with its branch to Kybartai, St Petersburg–Riga–Königsberg (Joniškis, Šiauliai, Tauragė, Pagėgiai), Alytus–Varėna and Merkinė–Kapčiamiestis. About 570 km.
- **Dirt roads** join every settlement to its neighbours (about 7,400 km), and run on to the border at the main crossings. A town is **linked** when a railway or paved road from the capital (Vilnius, or Kaunas while others hold Vilnius) reaches its streets (within 1.6 × its radius + 1.5 km of the hall by road); railways and paved roads also carry the power grid. A village has one street (sometimes a side lane), a wooden chapel and two to four farmsteads.
- **Feeding itself:** every settlement's own fields add grain and potatoes for its 1918 population (`pop0`) to its stock each day (0.05 each per thousand), and its own woodlots heat that many homes. Its base workforce works its own land, so it is never jobless. A settlement therefore keeps its size for years without the player. Growth beyond `pop0` needs food from farms or routes, homes on zoned land, and jobs.
- **Growth:** +max(0.01k, 0.4%) a day × morale/62 × (1 + 0.3 × clinic coverage) (× 1.15 with sickness funds), up to the housing limit, while food is at least 99% supplied and either the town is below `pop0`, or it has its winter fuel (see People), at least 8 days of food in stock and a real surplus: its food stock rises by at least 1.5% of a day's need, or a food fills its store. A starting stock alone does not make a settlement grow (it used to, and 270 villages then went hungry in 1919). A town short of food loses 2% of the people it cannot feed each day; overcrowding removes 3% of the excess.
- **Homes on the first day:** the start map puts some of a city's houses nearer a village hall, so a town with fewer homes than people gets houses on its own zoned lots when a new game starts (Kaunas gets eight).
- **Zoning** paints lots (0.42 km, 5 Lt each) along both sides of a street. A town builds on its own lots, every 5 days (more than one at a time in towns over 50k), while homes are at least 92% full, food is at least 99% supplied and morale is at least 40. It picks the closest, cleanest lot. Houses are paid from the town's stock: wooden houses (2k people) 10 Lt and 2 planks; brick apartments (6k, era 2) 30 Lt and 5 bricks; panel blocks (15k, era 3) 75 Lt and 12 cement. A town that lacks the material of its era builds the plainer homes it can, and carters bring the material from towns with some to spare. In later eras, old houses and farmsteads are rebuilt in the new style.
- **Layout:** towns are a market square around the town hall, three to six curving streets out of it, ring roads in bigger towns, houses nearest the square and zoned lots beyond. Where rivers or lakes leave too little room, extra streets are added until every home fits. Settlements stand at least `HALL_GAP` = 4 km apart when the player founds one.

## People

- **Food:** 0.1 per thousand residents a day, taken in equal shares from every food in stock. A food counts toward variety if it covers at least 8% of the need.
- **Heating:** 0.03 per thousand a day × season factor (full December to February, partial in March, April, October and November). A village gathers its own firewood however it grows; a town's woodlots heat only its people of 1918. Peat is burned first, then timber. With full power in the Modern era, heating needs halve. A shortfall counts in full only when the season factor is 0.35 or more, so a town is not cold in late August. Where homes are cold, the people beyond the 1918 size leave again: each day 1.5% of those without heat, so a town that cannot heat its newcomers is back at its old size within a winter.
- **Fuel for winter:** a town keeps a winter's fuel (170 days of full frost, which is what the seasons add up to) for everyone beyond its 1918 size, but no more than 60% of what its store holds of one good, so a works that burns peat can run in a big town too. What it has beyond that is free, of peat and of timber in the share it has of each. Industry, building sites, routes, deals and carters leave that store alone, and the town asks for it all year, so routes and merchants fill it before the frost. Until it is full the town takes in no new residents ("No fuel for more homes"). A works that stands still because of it says "Fuel kept for homes".
- **Work:** half of residents work. Local jobs fill first, then commuters walk to neighbouring towns within 30 km by road (up to 3k a day per pair), or ride routes set to carry commuters (half of the route's capacity, in thousands). Two settlements are neighbours when their catchments meet along a road or railway.
- **Morale:** starts from 58, then: +4 per food kind beyond the first; +6 × clinic coverage; −6 when more than a quarter of workers (plus 1k) beyond the base workforce are jobless (not under Soviet rule); history and chance (the Depression, strikes, collectivization, war, Soviet rule −3, elections, fires, typhus); taxes (low +3, high −4); −min(15, 5 × pollution) where homes are smoky; from era 2 (towns only): +6 with full power or −6 under 80% (`DARK_H`, also set in over four years); the wants above; −14 × the share of cold homes; −12 overcrowded; −50 × hunger. Morale moves 8% of the way toward this target each day. Output is multiplied by 0.7 + 0.6 × morale. Below 40 (`GROW_H`) a town builds no homes.

## Transport

| Vehicle | Mode | Era | Loads per trip | km a day | Cost | Upkeep a day |
|---|---|---|---|---|---|---|
| Horse carts | road | 1 | 4 | 65 | 60 | 0.2 |
| Trucks | road | 2 | 10 | 200 | 400 | 0.8 |
| Lorries | road | 3 | 20 | 290 | 900 | 1.4 |
| Steam trains | rail | 1 | 40 | 215 | 1,500 | 2 |
| Electric trains | rail | 3 | 90 | 400 | 4,500 | 5 (needs electric track all the way) |

- Route capacity each way per day = vehicles × loads per trip × trips a day, where trips a day = speed / (2 × route km + 22). On roads, trucks and lorries move at 0.7× on dirt, 1× on paved and 1.25× on highway (the weakest stretch counts).
- **Auto cargo:** a good moves only toward the town with fewer days of supply, enough to even them out, keeping 5 days for the sender and at most 25 days for the receiver. Building materials keep a buffer of 40. A store over 75% full also sends its surplus to the other town when that one is at least 25 points emptier, down to 60% (only from the fuller to the emptier, so nothing goes back). **Picked cargo** sends everything above 5 days of local use, up to the receiver's storage room.
- Selling a vehicle returns half its price. Removing a route returns half the price of all its vehicles.
- **Merchants:** without any route, private merchants carry goods between neighbouring towns (whose lands meet on a road or railway): from a town with more than 30 days of a good (or a quarter of its store, for a good it does not use) to one with under 14 days that is falling, or under 3 days. They close 5% of the gap a day, and a link carries at most 0.35 loads a day by dirt road, 0.9 by paved road, 1.3 by highway, 1.5 by rail. They cost the state nothing. The town card says what they bring and take; carts run on the busiest links.
- **Roads,** per real km: dirt 5 Lt + 0.3 timber; paved 14 + 0.6 bricks (from 1918; the Road tool starts on dirt in the first era); highway 30 + 1.2 cement. **Railways:** 20 + 1 timber; electric 45 + 0.8 metal. Road gangs (a policy) make roads a quarter cheaper. Bridges cost 4×. A line is drawn by tapping the points it passes; the planner goes around lakes, the border and buildings, and bridges rivers. Where it follows a line that exists, it uses that line: following it costs nothing, and an old line of a lower kind than the one chosen is upgraded on the way for 60% of the price. A town at either end pays: materials come from its store and, for what it lacks, from the nearest towns with some to spare (as carters bring them to sites). A better kind of road also takes over the streets between the point tapped and the place where the line leaves town, so a paved road drawn from one town's hall to another's links the second town. Tapping an old line first offers to upgrade that whole stretch. Upkeep per km a day: dirt roads nothing (the villages keep them up), paved roads 0.006, highways 0.009, railways 0.009 / 0.018 Lt.
- **Drawing lines:** the line follows the finger, runs straight where it can, goes around lakes, the sea and buildings, bridges rivers, joins roads it touches and makes a junction where it crosses another road. Roads and railways cross on the level.

## Money

Taxes: 0.08 Lt per thousand town residents (0.04 in villages) a day × min(1.4, morale/62) × the tax level × (0.9 to 1.1 with public trust), halved in war. The day's balance in the status bar counts what is paid every day: taxes, trade abroad, building upkeep, roads and railways, route vehicles, the army and allies, and policies. What building sites and new homes took that day is investment: the Economy view lists it apart, and the balance leaves it out. A route to a town others hold waits and costs nothing. When the treasury falls below zero, the Chronicle says so (at most every 90 days). Building upkeep: 0.4 Lt × level a day (warehouses 0.3; paused buildings pay 30%; sites, stations and landmarks nothing; a quarter less after privatization). The start treasury is 3,000 Lt.

## The state (js/history.js)

- **Public trust** (0 to 100, starts at 55) moves a fifth of the way each month toward 50 + 1.5 × (the country's morale − 60) − 40 × the share of people hungry or cold − 10 in debt + the tax level (low +5, high −8) − 4 under rule without a Seimas + policies + what the government did (cards and events, each for some years). It multiplies taxes by 0.9 to 1.1, decides how elections are read (60 or more: a strong mandate, morale +4 for two years; under 40: a divided Seimas, morale −3 for a year), and some options on the cards work only with enough of it. Strikes begin under 45. Under Soviet rule Party trust takes its place.
- **Taxes:** low (×0.75, morale +3), normal, high (×1.3, morale −4).
- **Policies,** each a cost a day, from the date of the law or body it is named for: road gangs (6 Lt, from 1918: roads a quarter cheaper, trust +1), primary schools for all (8 Lt, from October 1922: every town counts as a quarter better schooled, trust +3), credit for farm co-operatives (10 Lt, from 1923: dairy and pig farms +15%, trust +2), sickness funds (8 Lt, from 1926: growth +15%, trust +3).
- **The army:** 0, 10, 25 or 50 Lt a day adds up to 10 security a year; a Baltic alliance costs 10 Lt a day.
- **Government:** the Council of Lithuania; a parliamentary republic from the Constituent Assembly of 15 May 1920; rule by the president from 17 December 1926, unless the player faces the coup down; Soviet rule; the Republic of Lithuania from 11 March 1990. The State view names the head of state while the game follows history.
- **In force now:** the State view lists passing effects with their end dates (`S.fx`, `S.hist.mood`): a dry summer, a hard frost, foot-and-mouth, a strike, privatization.

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
- A deal sells only what is above 10 days of the town's own use and above the share of the store the player keeps (none, 25, 50 or 75%; 50% by default). An import buys up to the share of the store chosen (50, 75 or 100%; 75% by default), and stops when money runs out. A sale by sea counts for the port task.
- The Depression lowers farm prices abroad and at home by year: 1930 ×0.7, 1931 ×0.55, 1932 ×0.42, 1933 ×0.4, 1934 ×0.45, 1935 ×0.55, 1936 ×0.75, 1937 ×0.9 (other goods half as much).

## Borders (js/history.js, S.own)

The map starts with the borders of 16 February 1918 and history moves them. Four parts of today's Lithuania changed hands (`REGIONS`; outlines in `tools/geo`): the **Klaipėda Region**, the **Palanga coast**, and the **Vilnius region** in two parts (what came back in October 1939, and what Soviet Belarus kept until November 1940). The neighbours' land changes hands too. In 1918 German troops hold all of it. Today's Poland is two lands on the map, split on the old border of East Prussia: the Suwałki region, and Masuria, German until 1945.

- Land others hold is washed in its holder's colour, with its name and holder on the map. Lithuania's border of the day is the bold dashed line.
- Nothing can be built there, no line can be planned through it, and roads and railways there carry nothing for Lithuania. Its settlements lock with everything built there and its deals end; routes to them stop. When the land comes back, they work again at least at their 1918 size.
- **Kaunas is the temporary capital** from 2 January 1919, when the government left Vilnius, until Vilnius is back for good (October 1939, or a choice that did not happen): "linked" counts towns joined to Kaunas. In August to October 1920, when Lithuania held Vilnius again, the government stayed in Kaunas, as it did.
- The eras and the goal ask less of a smaller Lithuania: residents and linked towns needed scale with the share of the 1918 residents (and of the towns) living in the land held now, against the land held at the start, between 0.6 and 1.3. Losing the Vilnius region drops Industrialization from 850k to 640k residents and 50 to 44 linked towns.

| Part | 16 Feb 1918 | Then (as it happened) |
|---|---|---|
| Klaipėda Region | Germany | the Allies from 15 Feb 1920; Lithuania from 16 Feb 1923; Germany from 22 Mar 1939; Soviet Lithuania from 28 Jan 1945 |
| Palanga coast | Courland, held by Germany | Latvia from 18 Nov 1918; Lithuania from 30 Mar 1921 |
| Vilnius region | Lithuania | the Red Army from 5 Jan 1919; Poland from 19 Apr 1919; the Red Army from 14 Jul 1920; Lithuania from 26 Aug 1920; Poland from 8 Oct 1920 (Central Lithuania until 24 Mar 1922); Soviet from 17 Sep 1939; back to Lithuania 28 Oct 1939 (Vilnius, Trakai, Eišiškės, Švenčionėliai, Ignalina) and 6 Nov 1940 (Švenčionys, Šalčininkai, Druskininkai) |

| Neighbour's land | 16 Feb 1918 | Then |
|---|---|---|
| Latvia | Germany (Courland) | Latvia from 18 Nov 1918 |
| Belarus | Germany (Ober Ost) | the Red Army from 5 Jan 1919; Poland from 19 Apr 1919; the Red Army from 14 Jul 1920; Poland from 9 Oct 1920 (part of Poland from the Peace of Riga, 18 Mar 1921); Soviet Belarus from 17 Sep 1939 |
| Suwałki region (today's Poland) | Germany (Ober Ost) | Poland from 23 Aug 1919; Germany from 12 Oct 1939; Poland from 23 Oct 1944 |
| Masuria (today's Poland) | Germany (East Prussia) | Poland from 2 Aug 1945 |
| Kaliningrad region | Germany (East Prussia) | the Soviet Union from 2 Aug 1945, named the Kaliningrad region on 4 Jul 1946 |

Simplified: Lithuania's administration of the Suwałki region in 1919 and in the summer of 1920 is not shown, all of Belarus on the map changes hands at once, the 1919 and 1920 front lines through the Vilnius region follow the 1923 line, and the Red Army's push into the rest of Lithuania in 1919 is not on the map.

## History (js/history.js)

Dated events go to the Chronicle. **Decision cards** stop the clock until the player picks an option; each option says whether it is what happened, and the Chronicle lists every decision taken, marked as in history or not. Options that defy a great power work only with enough **security** (0 to 100, starts at 15): volunteers in 1918 add 15, an army budget adds up to 10 a year, Baltic treaties add 8 or 18, holding the Klaipėda trial adds 6, and each year exports to Britain add up to 4 (one per 2,000 Lt). Choices carry forward: without volunteers Vilnius can hardly be held; the union with Poland skips the Polish ultimatum and brings war in 1939; Moscow offers Vilnius in 1939 only if others hold it. One choice needs **public trust** instead (see The state): facing down the coup of 1926 takes 60.

| Date | Event | Choices and effects |
|---|---|---|
| 1918-07-11 | The Council elects Wilhelm of Urach king (taken back in November) | none |
| 1918-11-11 | Armistice; first government | none |
| 1918-11-18 | Latvia declares independence | Latvia and the Palanga coast to Latvia |
| 1918-12-29 | **Card:** defend the new state | call for volunteers (1,500 Lt, security +15) or leave defence to others (did not happen; −5) |
| 1919-01-02 | The government moves to Kaunas | Kaunas is the temporary capital |
| 1919-01-05 | The Red Army takes Vilnius | the Vilnius region and Belarus to the Red Army |
| 1919-04-19 | The Polish army takes Vilnius | the Vilnius region and Belarus to Poland |
| 1919-08-23 | The Sejny uprising | the Suwałki region to Poland |
| 1919-11-21 | **Card:** the Bermontians | attack at Radviliškis (as happened: 200 Lt net of booty, security +5, public trust +4 for a year) or wait for the Allies (did not happen; morale −6 within 70 km of Šiauliai for a year, security −3) |
| 1919-12-15 | The last Bermontians leave | none |
| 1920-04-14 | Elections to the Constituent Assembly | an election (see The state) |
| 1920-02-15 | The Allies take over the Klaipėda Region | its holder changes |
| 1920-05-15 | Constituent Assembly meets | Lithuania is a democracy |
| 1920-07-12 | Moscow Peace Treaty | 1,000 Lt (three million gold roubles) |
| 1920-07-14 | The Red Army takes Vilnius | the Vilnius region and Belarus to the Red Army |
| 1920-08-26 | The Red Army hands Vilnius to Lithuania | the Vilnius region back; the government stays in Kaunas |
| 1920-10-07 | Suwałki Agreement | none |
| 1920-10-08 | **Card:** Żeligowski marches on Vilnius | hold the line at Širvintos (Vilnius region to Poland, Kaunas stays the temporary capital, +5, morale −5 for 3 years) or defend Vilnius (did not happen; 2,500 Lt; needs 35, and the government returns to Vilnius; else lost anyway, −10, morale −8) |
| 1920-10-12 | Republic of Central Lithuania | Polish market closed until 1938 |
| 1920-11-21 | Širvintos and Giedraičiai | none |
| 1921-03-30 | Palanga joins | the coast: a sea port can be built |
| 1921-09-03 | **Card:** the Hymans plan (only if Poland holds Vilnius) | reject, or a union with Poland (did not happen): Vilnius back, Polish market open, −15, morale −6 for 4 years, war in 1939 |
| 1922-02-15 | **Card:** land reform | parcel out the estates (as happened: grain and potato farms +15%, village morale +3 for five years, public trust +5 for three) or leave them whole (did not happen; 1,000 Lt, village morale −5, trust −6) |
| 1922-02-16 | The University of Lithuania opens in Kaunas | none |
| 1922-08-01 | The constitution | none |
| 1922-10-10, 1923-05-12, 1926-05-08 | Elections to the Seimas | an election each |
| 1922-03-24 | Poland annexes the Vilnius region | none |
| 1922-10-02 | **Card:** a currency of our own | the litas (1,500 Lt, Britain and Latvia ×1.05) or the German mark (did not happen; half the treasury lost on 1923-11-20) |
| 1923-01-09 | **Card:** the Klaipėda question | back the revolt (800 Lt; the region joins on 16 February) or leave it to the Allies (did not happen; +6, Britain ×1.05; Germany takes it in March 1939) |
| 1923-03-15 | The Vilnius line recognised as Poland's border | none |
| 1924-05-08 | Klaipėda Convention | none |
| 1926-12-17 | **Card:** soldiers at the Seimas | give way (as happened: rule by the president, security +5, public trust −8 and town morale −3 for three years) or call on loyal troops (did not happen; needs public trust 60: the Seimas sits on, security −5, trust +6; else the coup wins after a day of fighting, 1,000 Lt lost, morale −6, trust −10) |
| 1927-04-12 | Smetona dissolves the Seimas | none |
| 1927-09-09 | The Tauragė uprising | morale −3 within 50 km of Tauragė for 120 days |
| 1929, 1932, 1935, 1938 | Elections to the Seimas, only if the democracy survived (did not happen) | an election each |
| 1930 | The year of Vytautas the Great | morale +2 for a year |
| 1931 | The first sugar factory opens in Marijampolė | none |
| 1933-07-17 | The Lituanica crashes near Soldin | none |
| 1936-06-09 | Elections to the Fourth Seimas, without an opposition | none |
| 1937-05 and 1939-05 | Lithuania wins the European basketball championship | morale +2 for a year, each |
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
| 1939-09 | **Card:** march on Vilnius? (if Poland holds it, not in the union) | stay neutral (as happened: security +3) or march (did not happen; the Vilnius region and the capital come back, security −15, Britain buys nothing more) |
| 1939-09-17 | The Red Army invades Poland | the Belarusian side and a Polish Vilnius region become Soviet; in the union, Soviet occupation |
| 1939-10-10 | **Card:** Soviet bases | accept (−30, Soviet trade, Vilnius back on 28 October if others held it) or refuse (needs 70, else occupation at once) |
| 1939-10-12 | The Soviets hand the Suwałki region to Germany | its holder changes (no Chronicle line) |
| 1944-10-23 | The Red Army takes Suwałki | its holder changes (no Chronicle line) |
| 1945-08-02 | Potsdam | Masuria to Poland, the north of East Prussia to the Soviet Union |
| 1940-06-14 | **Card:** Soviet ultimatum | accept (occupation, the Soviet path) or resist (needs 80 and no bases; else occupation with heavy losses) |
| 1946-07-04 | Kaliningrad region | East Prussia's label changes |

The Chronicle keeps every line of history for the whole game; other news is trimmed to the latest 150.

**The Soviet path** (as it happened): 1940-07-14 a People's Seimas from a single list; 1940-08-03 annexation (Western markets close, only the Union remains); 1940-11-06 the rest of the Vilnius region; 1941-06-14 deportations; 1941-06-22 German occupation and the Holocaust (war: output ×0.6, taxes halved, no plan); 1944-07-13 Soviet return; 1945-01-28 Klaipėda back; 1945-05-09 war ends; 1947 card: collectivization (at once: village fields −15% until 1955, then +15%; or slowly: Party trust −15, food plan ×1.2); 1948-05-22 and 1949-03-25 deportations; 1949-02-16 the partisans' declaration; 1953-03-05 Stalin dies; Union projects as cards in 1949 (a cement works within 35 km of Akmenė by 1952: 5,000 Lt, then 2,500 and trust +15; late −20), 1955 (hydro dam near Kaunas by 1960), 1959 (a fertiliser plant within 30 km of Kėdainiai by 1963: 7,000 Lt, then 3,000), 1960 (power station near Kaišiadorys by 1962), 1974 (nuclear plant near Zarasai by 1983); 1972-05-14 Romas Kalanta; 1987-08-23 the first rally the authorities do not break up; 1988-06-03 Sąjūdis; 1988-10-07 the flag on Gediminas Tower; 1989-08-23 Baltic Way; 1990-02-24 free elections; 1990-03-11 independence restored (public trust 65, taxes and policies as in a free Lithuania); 1990-04-18 to 07-02 Soviet blockade; 1991-01-13 the television tower (trust +6 for three years); 1991-02-09 the plebiscite; 1991 card: privatization (vouchers, as happened: upkeep −25% for good, output −10% and morale −4 for five years; or keep the big works: output −5% for good, the West pays 5% less); 1991-09-06 recognition; 1991-09-17 the United Nations; 1992-10-25 elections; 1993-06-25 card: the litas (as happened: 3,000 Lt, the West pays 5% more, trust +5; or keep the talonas: a third of the treasury gone a year later, trust −8); 1993-08-31 last troops leave; 1996 and 2000 elections; 2004-03-29 NATO (security at least 95); 2004-05-01 European Union (the West pays 15% more).

**The state plan:** from 1946, each year has delivery targets to the Union (grain, dairy, meat, timber, bricks; linen and furniture in era 2; electronics in era 3), scaled to the republic's population and rising 4% a year. Deliveries are deals with the Union through railway stations. At year end: 100% or more brings Union investment (1,500 + 400 per year since 1946, ×1.5 above 115%, ×1.3 with Party trust 75+) and trust +8 or +12; 80–100% costs trust 6; under 80% costs trust 15 and a year of output ×0.9. Trust under 20 replaces the republic's leaders (morale −5). Union projects pay a grant up front and a reward when the building stands in time; late costs trust 20.

**The neutral path** (did not happen): if the ultimatum is resisted with enough security, Lithuania stays independent; shipping to Britain stops from 1941-06-22 until 1945-05-08, then all markets reopen and a lost Klaipėda Region returns. In July 1947 a card offers the Marshall Plan (8,000 Lt and 10% better prices in the West, and the Soviet market closes) or declining it. Without the Soviet path, the part of the Vilnius region Soviet Belarus kept stays Soviet.

Random events every 130–270 days, one that fits the season and the path Lithuania is on: bumper harvests (July to September), London butter prices, British bacon demand, wood prices abroad, a spring flood on the Nemunas in Kaunas, a wet harvest, linen fashion (era 2+), a dry summer (fields −20% for 90 days), a hard frost (homes burn 30% more for 60 days), a fire in a small town (it loses 40% of its timber and planks, morale −4 for 90 days), foot-and-mouth (dairy and pig farms −30% for 120 days), money from Lithuanians in America (400 to 800 Lt, before the war), good fishing (+30% for 60 days), typhus (a town without a clinic loses 6 morale for half a year), and a strike (era 2+, when public trust is under 45: a town makes a quarter less for a month).

## Tutorial

New players get a 9-step hint card (`js/tutorial.js`): look around, open a town, open the Lithuania view, see the routes, build a road, start a route, zone homes, place industry, speed up time (and expect history's decisions). Each step finishes when the player does it, or on Next. It shows once per device (`localStorage['lietuva1918-tutorial']`); the Lithuania view can start it again.

## The interface

Made for one hand on a phone first. One finger always moves the map; two fingers zoom, turn and tilt. A tap acts. Nothing is built until the player presses Build in the action bar, which says what will happen, what it costs and who pays.

- **Five views** at the bottom: Build, Routes, Lithuania, Trade (Plan under Soviet rule), Chronicle. Lithuania shows a red count of places with urgent problems; Chronicle shows how many entries are new.
- **Build** is two steps: lines and land (Road, Railway, Zone homes, Remove), then a group of buildings (Food, Raw materials, Industry, Power, Transport and storage, Town services) and a building in it, with what it makes, what ground it needs and what it costs.
- **Placing a building:** it appears on the best spot near the town it was chosen for (or near the middle of the view): facing a road, on ground that suits it, where a town takes it in. Ground that suits it is lit with hatching. The player drags it, taps elsewhere to move it there, turns it, or asks for another spot. Build is always there to press: the bar says how many days the work takes and what the site will wait for, or that carts bring it, and warns when the town would have too few workers for its jobs.
- **Building sites on the map:** a dashed amber outline, scaffolding, a pile of materials and a sign, with the model rising inside as it is built. A badge shows the percent built, three dots while it waits, or a pause sign on hold. A site's card shows what it has of what it needs, with Hold, Build first and Cancel the plan.
- **Roads and railways:** tap where the line starts, then each place it passes; drag a point to move it; Undo takes the last one back. Hold still a moment and drag to draw freehand. The plan shows new stretches in amber, old ones it upgrades in green, and anything in the way in red.
- **Zoning** adds up street by street with taps, or by painting after a short hold. **Remove** takes one thing per tap, or everything a painted stroke touches.
- **A town's card**: residents and their trend, morale, its link to the capital, six health tiles (food, heat with the winter store, homes, jobs, power or storage, air), its problems worst first with one-tap fixes, its building sites, the goods it makes, uses and stocks each day, its buildings, its neighbours with a button to start a route, and its stock to buy and sell.
- **Problems and fixes.** Urgent: hungry, cold homes, blackouts (once towns have come to expect light). Holding it back: food running low, overcrowded, no land to build on, no materials for homes, no fuel for more homes, a building site that waits for money or for a material no cart can bring, people out of work, buildings missing an input or left without fuel the town keeps for its homes, short of workers or stopped by full stores, smoky air, wanted goods missing, low morale. Notes: not linked to the capital, a railway without a station. Fixes start a route from the neighbour with the most to spare (or add a vehicle to the route there is), place the building that makes what is missing, buy or import it, zone land, build a warehouse, sell the surplus, carry commuters, or lay out a paved road from the nearest linked town for the player to confirm. A power problem says what is wrong: no line reaches the town, no station feeds its grid, a station stands short of peat or hands (and where), or the grid needs another station.
- **The Lithuania view** has five parts. **Overview:** residents and treasury with their trend since 1918, towns linked to the capital, progress to the next era, building sites, problems by kind with the places that have them, the goal, the era and ministry tasks. **Economy:** money a day by kind, with what building sites and new homes take listed apart; the goods the country makes and uses each day; the chains, as rows of goods with what is made a day; power (the capital's grid, its stations, how many towns have light); work. **Works:** every building site in the order it is served, what they still need in money and materials, and the reserve to keep. **Towns:** every town sorted by need, size or name. **State:** who governs, public trust with what moves it, taxes, policies, security and the army, and the effects in force now.
- **A good's view** (tap a good anywhere): made, used and stocked a day with a trend line since the game began, its price, the buildings that make it (with a Build button) and what holds them back, what it is used for, the towns that make, use and hold the most and those that run low, and where it sells abroad.
- **Trade** also shows the year's trade balance: sold and bought, by market and by good, this year and last.
- **On the map**, a town's label carries a dot: red for an urgent problem, amber when something holds it back, green when it thrives. Villages show only red.
- **From far out** (about 180 km and up, in full from 460 km on the drawn map) the map turns political: land others hold takes its holder's colour, and snow lifts from it, so borders read in winter too. Up close, snow on land others hold is a third lighter, so its colour shows through.
- **News on screen:** history that moves a border or the capital (each time Vilnius changes hands, Klaipėda, the Palanga coast, the Soviet annexation, independence restored) opens a card that pauses the game and says what happened, what changed hands and what it means for the player. Other events that change the markets, finished ministry tasks, population milestones and an empty treasury show as a short note; the Chronicle keeps the full text.
- **Decisions** are taken in two steps: a tap marks an option, Confirm applies it.
- **Production view:** the button under the compass shows a marker over each building that makes goods (dimmed when it stands idle), and from far out each town's main goods with what its buildings make a day; a row of goods filters the view. Tapping a good in the Lithuania view's goods table opens it for that good.
- **A shown route** has a pill on the map with an × that hides it again.
- **A building no road reaches** gets its road laid out in the Road tool right after it is built, for the player to confirm (a station faces its track, so its road leaves from the back or a side).
- **Houses by place:** city centres have plastered tenements of two or three storeys along the street with wings round a courtyard; towns have wooden houses with their gable ends to the street (and two masonry houses on the market square); villages have farmsteads with a thatched troba, a granary, a barn, a well sweep and fruit trees.
- **A new game** opens on a short intro (16 February 1918, the Act of Independence) and starts paused; the first-time tutorial follows. A new era opens on a card that says what it brings. When a new version has been downloaded while the game was open, a note offers to load it.

## Ministry tasks

From easy to hard: start a new route (400 Lt), finish a first building (300), build a warehouse (300), give a town four kinds of food (800; Vilnius already has three on the first day), open a school (400), sell abroad through a border post or port (600), bring the railway to Marijampolė (800; it came in 1924), bring the railway to Telšiai (800; it came in 1926), link Biržai to the capital by rail or paved road (600), found a town (1,000), sell through the port (800; once Lithuania has a coast), link Klaipėda to the railways of Lithuania (1,500; once the region is Lithuanian; done in 1932 through Telšiai), reach 800k residents (1,500), enter Industrialization (2,000), bring in 40 metal from abroad (800), open a sugar factory (1,500; the first opened in Marijampolė in 1931), power every town (3,000; villages do not need power), reach Modern Lithuania (5,000), open a cement works on limestone (3,000; Akmenė made its first cement in 1952). A building counts once it is finished.

The first open task that makes sense now is shown on the map above the bottom bar; tapping it opens the list. A finished task shows on screen with its reward.

## Balance notes

- Tested with the smoke test and scripted runs (`tools/smoke-test.js` jumps through the key cards). With no player input, the 1918 population of about 680k holds steady and the towns with starting farms grow to about 780k by mid-1918; after Vilnius is lost about 550k remain, 620k once the Klaipėda Region joins. Income is about +27 Lt a day in 1918, +17 without Vilnius, +21 with Klaipėda; the treasury passes 50,000 Lt by 1926 if nothing is built. No settlement goes hungry or cold.
- A scripted player who presses only the game's own fixes (routes, vehicles, sales, warehouses, zoning) grows the land Lithuania holds to about 920k by 1928, while income falls to a few Lt a day as upkeep grows. It never reaches the second era: that needs railways to about 15 more towns, which only the player builds.
- Without the player, the state plan is never met, so Party trust stays low; plan targets are about a third of a farm per good at the start.
- Reaching security 80 by 1940 takes a deliberate effort: about 15 years of a 25 Lt army budget plus treaties, or steady exports to Britain.
- Holding Vilnius in October 1920 needs security 35: the 1918 volunteers (+15) and an army budget of 25 Lt a day from the start (about +13) reach it; without the volunteers it takes 50 Lt a day. Most players following history lose the Vilnius region, about a quarter of the 1918 residents (156k of 679k), which the era scaling makes up for.
- With the Klaipėda Region (52k in 1918) and Palanga (2k), historical Lithuania holds 561k of the 1918 residents from 1923 to 1939, about 83% of the start.
- v0.11 on the map drawn twice its size: with no player input the day's balance is about +30 Lt in mid-1918, +17 to +19 without the Vilnius region, +20 with Klaipėda from 1923, as before the stretch; the residents of the land held settle at about 563k in 1919 to 1922 and 630k from 1923. Merchants move nothing in that game, since every settlement feeds itself; a full store of dairy in Kėdainiai sends about 0.3 loads a day to its neighbours.
- Not yet tested by hand: the late game (era 3), large networks of 20 or more routes, nuclear-scale power, and how hard the plan feels.
