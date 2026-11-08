# Lietuva 1918

A 3D economy and city builder set in Lithuania from 16 February 1918, in the spirit of Workers & Resources. There is no grid: draw roads and railways as free curves across the whole country, zone lots along your streets, place farms and industry at any angle, run transport routes so 48 towns and about 170 villages supply each other, and trade abroad through border posts and the port. History interrupts with decisions, from the Depression to the ultimatums of 1938 to 1940; avoid the occupation if Lithuania is strong enough, or run a Soviet republic's five-year plans.

<img src="docs/screenshot.png" alt="Kaunas in July 1918, where the Neris meets the Nemunas, with its station and fields" width="300">

## Play

- **Online:** once GitHub Pages is switched on (see below), the game lives at `https://marcipanas.github.io/lietuva-1918/`.
- **Offline, for example on a flight:** open the online version once while connected, then install it:
  - iPhone or iPad: Safari → Share → **Add to Home Screen**.
  - Android: Chrome → menu → **Install app** (or Add to Home screen).
  - Desktop Chrome or Edge: the install icon in the address bar.
  Open it once more from the home screen while online, so every file is cached. After that it starts without a connection, in flight mode too. Your save stays on that device; on iPhone the home-screen app keeps its own save, separate from Safari's.
- **From a copy of this repository:** run `npm run serve` and open http://localhost:8080.
- The flat 2D version (v0.3) is kept on the branch `classic-2d`.

## How to play

- **First time?** A short tutorial card walks you through the first steps. Skip it any time; the Lithuania tab can start it again.
- **Look around:** drag to move, pinch to zoom, twist two fingers to turn, slide two fingers up or down to tilt. The compass turns north up again. With a mouse: wheel to zoom, right-drag to turn and tilt.
- **Select** a town or building to see its people, stock and problems.
- **Road** and **Rail:** drag where the line should run. It follows your finger, goes around lakes and buildings, bridges rivers, joins roads it touches and makes junctions where it crosses them. Drawing along an existing road costs nothing. Tap an old road to upgrade it in later eras. Railways need a **station** beside the track in each town.
- **Towns and villages feed themselves** from their own land and keep their size without help. To grow, they need more food, homes on zoned land, and jobs.
- **Zone:** paint along streets to zone lots. Towns build houses there while their people are fed and content.
- **Build:** farms, fisheries, forestry, peat works, brickworks, warehouses, schools, clinics, and later power stations and factories. Near a road, a building turns to face it; the turn button rotates it. It joins a town when a road links it to the town hall within 15 km.
- **Routes** (tab in the panel): goods move between towns only on routes. Pick the vehicles and what they carry, or leave cargo on **Auto**. Routes can also carry commuters.
- People want **variety in food** (grain, potatoes, dairy, meat, fish) and **heating in winter** (peat or timber). Keep smoky industry 2 km away from homes.
- **Trade** (tab in the panel): build a **border post** near the border or a **sea port**, bring goods there by route, and add deals to sell to Britain, Germany, Latvia or Poland, or to buy metal. History opens and closes markets.
- **History:** on key dates the clock stops and you decide. Each choice says whether it is what happened. Refusing an ultimatum works only with enough **security** (Lithuania tab): an army budget, treaties and trade with Britain build it. Under Soviet rule the Trade tab becomes the **Plan**: deliver the Union's yearly targets through railway stations.
- Keys: R road, T rail, Z zone, X remove, B build, Space pause, Esc cancel, arrows to move, + and − to zoom, [ and ] to turn, Page Up and Page Down to tilt, N for north up.

## Development

No build step and no npm packages; three.js r159 is vendored in `vendor/`. Node 18 or newer for the tools.

```bash
npm test               # static checks + headless smoke test (must pass before committing)
npm run serve          # local server on port 8080
npm run build:artifact # dist/artifact.html for publishing as a claude.ai artifact
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

- Map outlines are drawn by hand from coordinates and are approximate. Distances between places are true; towns are drawn about five times larger than life so they are visible on a country-sized map. Village names are typical Lithuanian names placed at random, not real villages at their real sites.
- Historical dates in game events are real; where only the year is certain, the Chronicle shows the year alone. Vilnius is the capital from the start, as the Act of Independence declared, although Poland held the city from 1920 to 1939. Choices that differ from history say so.
- three.js is © three.js authors, MIT licence (`vendor/three.LICENSE`). No licence has been chosen for the game itself yet; all rights reserved by the owner until one is added.
