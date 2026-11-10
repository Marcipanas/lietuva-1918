# Lietuva 1918

A 3D economy and city builder set in Lithuania from 16 February 1918, in the spirit of Workers & Resources. There is no grid: draw roads and railways as free curves across the whole country, zone lots along your streets, place farms and industry at any angle, run transport routes so 89 towns and 362 villages, each at its real place, supply each other, and trade abroad through border posts and the port. Buildings start as plans: a site takes its money and materials as they come, and the builders need their days. Timber becomes planks, grain beer, beet sugar, and limestone cement. History moves the borders and interrupts with decisions: raise volunteers in 1918, watch Vilnius change hands in 1919 and 1920, hold or lose it to Żeligowski, take Klaipėda in 1923, face the coup of 1926, the Depression and the ultimatums of 1938 to 1940; avoid the occupation if Lithuania is strong enough, or run a Soviet republic's five-year plans and see independence restored in 1990.

<img src="docs/screenshot.png" alt="Kaunas in June 1918 on a phone: a school stands a third built inside its scaffolding, and the card of the building site shows 35% built, 26 days of work left, and the money and planks it has taken" width="300">

## Play

- **Online:** once GitHub Pages is switched on (see below), the game lives at `https://marcipanas.github.io/lietuva-1918/`.
- **Offline, for example on a flight:** open the online version once while connected, then install it:
  - iPhone or iPad: Safari → Share → **Add to Home Screen**.
  - Android: Chrome → menu → **Install app** (or Add to Home screen).
  - Desktop Chrome or Edge: the install icon in the address bar.
  Open it once more from the home screen while online, so every file is cached. After that it starts without a connection, in flight mode too. Your save stays on that device; on iPhone the home-screen app keeps its own save, separate from Safari's. While the game is in development, each new version starts a new game.
- **From a copy of this repository:** run `npm run serve` and open http://localhost:8080.
- The flat 2D version (v0.3) is kept on the branch `classic-2d`.

## How to play

- **A new game** opens on the Act of Independence and waits for you to press ▶. **First time?** A short tutorial card walks you through the first steps. Skip it any time; the Lithuania view can start it again. Your next ministry task sits above the bottom bar; tap it to see them all.
- **Made for phones:** one finger always moves the map, a tap acts, and nothing is built until you press **Build**. The bar at the bottom opens five views: Build, Routes, Lithuania, Trade and Chronicle. Drag a card's handle up for more, or down to close it.
- **Look around:** drag to move, pinch to zoom, twist two fingers to turn, slide two fingers up or down to tilt. The compass turns north up again. With a mouse: wheel to zoom, right-drag to turn and tilt.
- **Tap a town** to open its card: residents and their trend, morale, six health tiles (food, heat, homes, jobs, power or storage, air), what it makes and uses each day, and its problems with a button for each fix: start a route from a neighbour with food to spare, place the farm or peat works it lacks, zone land, sell what fills the stores.
- **Lithuania** shows the whole country in five parts. **Overview:** residents and treasury since 1918, the next era, problems by kind with the places that have them. **Economy:** money a day, the goods the country makes and uses, what is made of what, power, and work; tap a good to see who makes it, who uses it and what holds its makers back. **Works:** every building site and what it waits for. **Towns:** every town, sorted by need. **State:** who governs, public trust and what moves it, taxes, policies and the army. On the map, a red dot marks a town in trouble and an amber one a town held back.
- **Road** and **Rail:** tap where the line starts, then each place it passes, and press Build. Drag a point to move it; Undo takes one back; hold still a moment and drag to draw freehand. The line goes around lakes and buildings, bridges rivers, and joins the roads it meets. Where it follows a road that exists it uses it, and in later eras it upgrades it to the kind you pick (green on the plan). Railways need a **station** beside the track in each town.
- **Towns and villages feed themselves** from their own land and keep their size without help. To grow, they need more food, homes on zoned land, and jobs.
- **The map of 1918:** the borders of the day. German troops hold all the land around Lithuania; the Klaipėda Region (Lithuania Minor) is German, then from 1920 under the Allies, and the Palanga coast is Courland's, then Latvia's until 1921, so the new state starts with no sea coast. Masuria, in today's Poland, stays German until 1945. The railways and paved highways of 1918; dirt roads to every village. Vilnius, Kaunas, Klaipėda, Šiauliai and Panevėžys are laid out from their real main streets, with landmarks such as Gediminas Tower, the Cathedral and the town halls. A town counts as **linked** when a railway or paved road from the capital reaches it.
- **Borders that move:** land a neighbour holds is washed in its colour and named on the map. Zoom out and the map turns political, with every holder's colour clear even under winter snow. Nothing can be built there and nothing travels through it; its towns wait, with all you built, until it comes back. The Red Army takes Vilnius in January 1919, Poland in April, the Red Army again in July 1920; it is Lithuanian for six weeks before Żeligowski. Kaunas is the temporary capital from January 1919.
- **Zone:** tap streets to zone lots beside them, or hold and paint. Towns build houses there while their people are fed and content: plastered tenements in city centres, wooden houses with their gable ends to the street in towns, farmsteads with a thatched troba in villages.
- **Where goods are made:** the button under the compass shows a marker over every building that makes goods, and from far out each town's main goods; pick a good to see only its makers.
- **A country drawn twice its size,** so towns have open land between them. Distances on screen are real km.
- **History on cards:** when Vilnius or other land changes hands, a card says what happened and what it means. Decisions take a tap and then Confirm.
- **Build:** pick a group, then a building: farms, fisheries, forestry, peat works, sawmills, brickworks, breweries, warehouses, schools, clinics, and later power stations and factories. It appears on a good spot near the town: facing a road, on ground that suits it (lit with hatching), where a town takes it in. Drag it to move it, Turn to rotate it, Build to place it. It joins a town when a road links it to the town hall within 15 km.
- **Plans and building sites:** you can place a building with nothing in hand. It stands as a plan, with scaffolding on its site. The site takes its money from the treasury (above the reserve you keep, set in Lithuania → Works) and its materials from its town; what the town lacks comes by cart from the nearest town with some to spare. Then the builders need their days. Tap a site to hold it, put it first in the queue, or cancel it and get everything back. Modernizing a building works the same way, and the building keeps working meanwhile.
- **What is made of what:** timber is sawn into planks, which most buildings and wooden houses need. Peat fires the brick kilns. Grain makes beer. From Industrialization: flax makes linen cloth, beet makes sugar, factories need metal from abroad, and towns come to expect cloth, sugar and electric light over four years. In the Modern era: cement from the limestone of the north, fertiliser for the fields, electronics.
- **The state:** public trust follows the country's morale, hunger, debt and taxes. It brings in a little more or less tax, decides how elections are read, and some choices in history work only with enough of it. Set taxes low, normal or high, and pay for policies such as road gangs, primary schools, credit for co-operatives and sickness funds.
- **Routes and merchants:** routes move goods in bulk between towns. Pick the vehicles and what they carry, or leave cargo on **Auto**, which also moves a full store's surplus. Routes can also carry commuters. Without routes, private merchants carry a little between neighbouring towns, slowly, from plenty to need.
- People want **variety in food** (grain, potatoes, dairy, meat, fish) and **heating in winter** (peat or timber). A town that has outgrown its own woodlots keeps a winter's fuel in store before it takes in more people, and its sawmills and kilns leave that store alone. Keep smoky industry 2 km away from homes.
- **Trade:** build a **border post** near the border or a **sea port**, bring goods there by route, and add deals to sell to Britain, Germany, Latvia or Poland, or to buy metal. History opens and closes markets.
- **History:** on key dates the clock stops and you decide. Each choice says whether it is what happened, and the Chronicle lists your decisions. Choices carry forward: the volunteers of 1918 decide whether Vilnius can be held in 1920, a union with Poland brings Vilnius back but drags Lithuania into Poland's war. Holding Vilnius or refusing an ultimatum works only with enough **security** (Lithuania → State): volunteers, an army budget, treaties and trade with Britain build it. Facing down the coup of 1926 takes **public trust**. Under Soviet rule Trade becomes the **Plan**: deliver the Union's yearly targets through railway stations. History runs on to 2004.
- Keys: R road, T rail, Z zone, X remove, B build, Enter build, Backspace undo, Esc cancel, Space pause, 1 2 3 speed, arrows to move, + and − to zoom, [ and ] to turn, Page Up and Page Down to tilt, N for north up.

## Development

No build step and no npm packages; three.js r159 is vendored in `vendor/`. Node 18 or newer for the tools.

```bash
npm test               # static checks + headless smoke test (must pass before committing)
npm run serve          # local server on port 8080
npm run build:artifact # dist/artifact.html for publishing as a claude.ai artifact
npm run playtest       # a scripted player plays 1918 to 1941 and prints a line a year (balance work; five to fifteen minutes)
npm run world          # rebuild js/world1918.js, the start map, after changing the map data or generator
npm run geo            # rewrite js/geo.js from tools/geo/*.json (see tools/geo/README.md)
```

- `CLAUDE.md`: rules and a code map for AI coding agents (and humans).
- `docs/ARCHITECTURE.md`: how the code fits together.
- `docs/GAME_DESIGN.md`: every mechanic and number.
- `docs/ROADMAP.md`: what comes next.
- `docs/DECISIONS.md`: why things are built the way they are.

## Deploying to GitHub Pages

1. On GitHub's free plan, Pages needs a public repository: **Settings → General → Danger Zone → Change repository visibility → Public**. With GitHub Pro the repository can stay private (the site is public either way); then delete the `if:` line in `.github/workflows/pages.yml`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`, or open **Actions → Deploy to GitHub Pages → Run workflow**. The workflow runs the tests and publishes the site. While the repository is private, the deploy job is skipped.

## Notes

- Map data: borders, and the municipalities and elderships the 1920–1940 lines follow, © OpenStreetMap contributors (ODbL); coast, lakes and rivers from Natural Earth (public domain); place names and positions from Euronym, © EuroGeographics (EuroGeographics Open Data Licence); today's populations of small towns from GeoNames (CC BY 4.0). Rivers are bent onto their towns and some small rivers, soils and forests are drawn by hand, so they are approximate. Distances between places are true; towns are drawn about five times larger than life so they are visible on a country-sized map, and landmarks about twice.
- Historical dates in game events are real; where only the year is certain, the Chronicle shows the year alone. Vilnius is the capital from the start, as the Act of Independence declared. The Red Army takes it in January 1919 and Poland in April, as happened. The borders of 1920 to 1940 inside today's Lithuania follow today's municipality and eldership lines, which mostly follow the old demarcation line, so they are close but not exact. Choices that differ from history say so.
- three.js is © three.js authors, MIT licence (`vendor/three.LICENSE`). No licence has been chosen for the game itself yet; all rights reserved by the owner until one is added.
