# Year Zero — a life on the Kerala coast

Watch an autonomous survivor move, work, rest and gradually establish a homestead.
A static, zero-player simulation built on the existing Year Zero project. No backend,
API key, external font, CDN or runtime package is required.

## Run

From the extracted `Year-Zero` folder:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000/. Use an HTTP server rather than double-clicking the HTML:
browsers restrict ES modules and storage on `file:` URLs.

At **1×, one world day takes 15 real minutes**. Speed controls and the +1h button
change observation pace; the survivor chooses his own actions. Pause also prevents
offline catch-up. Switch between following the survivor and viewing the whole coast.
The Life & Mind tab explains current choices; Territory shows discoveries and resources.

## Upload to the existing GitHub repository

1. Back up your existing repository and export any important browser save.
2. Extract this ZIP. Open the enclosed `Year-Zero` folder.
3. Upload **its contents** to the root of `melvinvarghese/Year-Zero`, replacing
   files with matching names. Do not upload the outer folder as another subfolder.
   Include `assets/`, the new `.mjs` modules, `sw.js` and the empty `.nojekyll` file.
4. Commit the files. For branch-based GitHub Pages, use Settings → Pages →
   Deploy from a branch → `main` → `/ (root)` (or your existing publishing branch).
5. After GitHub finishes its deployment, open
   https://melvinvarghese.github.io/Year-Zero/ and refresh.

All application paths are relative, including the service worker's scope and cache.
No build or paid service is needed. This delivery was **tested locally, not deployed**.

## What is implemented

- A procedural 2D coastal world with a visible survivor, walking limbs, resting pose,
  context-specific work props, route previews, day/night, rain, mist and coastal palms.
- Shared engine positions and action phases. Local walking takes time before work;
  inter-site travel advances continuously until arrival. Effects happen on completion.
- Explicit utility decisions driven by needs, weather, injury, stock, carrying room,
  known routes, resource depletion, shelter condition and failed-action memories.
- Food, finite water, timber, salvage, seeds, tools, bounded inventory and home reserves.
- Roof repairs; a rainwater collector that fills storage during wet weather;
  a workshop that shortens repair work; a knowledge chest that improves travel.
- Planting, soil moisture, multi-day crop growth, watering and actual food harvests.
- Six connected places: homestead, village road, backwater, clinic, jetty and quarry.
  Discoveries unlock their real resources and routes. Distant regions are not simulated.
- Weather-driven water replenishment, crop moisture, exposure and roof damage;
  injuries, recovery, resource scarcity and interrupted nonessential work.
- Dated, location-tagged events for actual choices, outcomes, discoveries and milestones.
- Versioned automatic saves, JSON export, legacy migration, unfinished-action recovery,
  damaged-save backup and protection, and capped elapsed-time catch-up.
- Offline reload after the first successful service-worker installation/cache fill.
  The engine itself never needs a connection once its modules have loaded.

## Persistence and honest limits

The browser cannot execute the simulation while closed. Returning simulates elapsed
wall time at 1×, capped at **seven simulated days (105 real minutes)**. Extra absence
is intentionally skipped. Accelerated speed is not applied to an offline absence.
Save data belongs to this browser and origin; clearing site data removes it. Export
JSON for a portable backup. An exported JSON is a data snapshot; the UI does not yet
provide a JSON import button. A damaged record is retained under a timestamped backup
key and automatic overwrite is blocked until you explicitly restart.

The chronicle is bounded to 300 entries, preferentially retaining up to 80 major
entries plus recent events. Export snapshots if you want to keep older detail.
Legacy saves keep their supported state; old actions without a position/phase are
safely reconsidered at the saved location. Unknown future-version saves are protected.

This is a functioning **initial six-location survival and homestead simulation**.
It does not implement a simulated planet, additional people, reproduction, an economy,
industrial production chains, detailed ecology, water contamination or full-body sprite
animation. Visuals use simple vector-style canvas poses and work sequences. Future
regions and production systems require additional data and implementation.

## Tests

Node 20+ is sufficient for the dependency-free engine tests:

```sh
node --test *.test.mjs
```

For optional browser regression tests, install Playwright in a development checkout:

```sh
npm install
npx playwright install chromium
```

Serve the **parent** directory so this project is at `/Year-Zero/`, then in another terminal:

```sh
npm run test:browser
```

`BASE_URL` can change that URL. `CHROMIUM_PATH` can select an installed Chromium.
`PLAYWRIGHT_MODULE` can select an existing Playwright module installation.
These development dependencies are not needed to run or deploy the app.

See `IMPLEMENTATION.md` and `tests/results/` for the inspection, checks and limitations.
