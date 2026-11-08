# Lietuva 1918

An isometric economy and city builder set in Lithuania from 16 February 1918. Lay roads and railways across the whole country, zone land for homes, place farms and industry, and run transport routes so towns feed and supply each other through the seasons, from the first independent years to a modern, electrified state.

<img src="docs/screenshot.png" alt="Vilnius in the winter of 1918" width="300">

## Play

- **Online:** once GitHub Pages is switched on (see below), the game lives at `https://marcipanas.github.io/lietuva-1918/`.
- **Offline, for example on a flight:** open the online version once while connected, then install it:
  - iPhone or iPad: Safari → Share → **Add to Home Screen**.
  - Android: Chrome → menu → **Install app** (or Add to Home screen).
  - Desktop Chrome or Edge: the install icon in the address bar.
  Open it once more from the home screen while online, so every file is cached. After that it starts without a connection, in flight mode too. Your save stays on that device; on iPhone the home-screen app keeps its own save, separate from Safari's.
- **From a copy of this repository:** run `npm run serve` and open http://localhost:8080. Opening `index.html` directly also works, but without offline caching.

## How to play

- **Select** a town or building to see its people, stock and problems.
- **Road** and **Rail:** drag from one place to another; the game plans the route around water and buildings and shows the cost. Railways need a **station** in each town.
- **Zone:** paint green land next to a town's streets. Towns build homes there while their people are fed and content.
- **Build:** farms, fisheries, forestry, peat works, brickworks, warehouses, schools, clinics, and later power stations and factories. Each must be within 16 road tiles of a town hall.
- **Routes** (tab in the panel): goods move between towns only on routes. Pick the vehicles and what they carry, or leave cargo on **Auto**. Routes can also carry commuters.
- People want **variety in food** (grain, potatoes, dairy, meat, fish) and **heating in winter** (peat or timber). Keep smoky industry away from homes.
- Keys: R road, T rail, Z zone, X remove, B build, Space pause, Esc cancel, arrows to move, + and − to zoom.

## Development

No build step and no dependencies. Node 18 or newer for the tools.

```bash
npm test               # static checks + headless smoke test (must pass before committing)
npm run serve          # local server on port 8080
npm run build:artifact # dist/artifact.html for publishing as a claude.ai artifact
```

- `CLAUDE.md`: rules and a code map for AI coding agents (and humans).
- `docs/ARCHITECTURE.md`: how the code fits together.
- `docs/GAME_DESIGN.md`: every mechanic and number.
- `docs/ROADMAP.md`: what comes next, including foreign trade and the graphics and engine options.
- `docs/DECISIONS.md`: why things are built the way they are.

## Deploying to GitHub Pages

1. On GitHub's free plan, Pages needs a public repository: **Settings → General → Danger Zone → Change repository visibility → Public**. With GitHub Pro the repository can stay private (the site is public either way); then delete the `if:` line in `.github/workflows/pages.yml`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`, or open **Actions → Deploy to GitHub Pages → Run workflow**. The workflow runs the tests and publishes the site. While the repository is private, the deploy job is skipped.

## Notes

- Map outlines are drawn by hand from coordinates and are approximate.
- Historical dates in game events are real. Vilnius is the capital from the start, as the Act of Independence declared, although Poland held the city from 1920 to 1939.
- No license has been chosen yet; all rights reserved by the owner until one is added.
