# Year Zero

**Humanity ended. One life continued. A new world begins.**

Year Zero is a static, browser-based survival simulation set on the Kerala coast. You observe the last known survivor; his needs, local resources, weather, memories, and available paths shape what he does next. The priority control only biases his choices. It does not issue commands.

## What works

- A persistent simulated date and clock: one simulated day equals 15 minutes of real time.
- Autonomous, utility-scored choices among drinking, eating, gathering food or timber, resting, repairing shelter, making a tool or fire, exploring, following known routes to supplies, and returning to the homestead. Failed actions are remembered briefly and deprioritized.
- Changing hunger, thirst, energy, health, morale, exposure, and injuries, with resource limits and action durations.
- Daily weather and local resource recovery; rain, heat, and travel affect exertion, exposure, shelter condition, and route risk.
- A small connected Kerala-coast region. Exploration moves the survivor to an actual nearby location; its resources can be used there, and known routes support later trips and return journeys.
- A timestamped chronicle generated from completed actions and environmental changes, with category filters.
- Browser-local autosaving, pause/resume, migration from the previous v4 and v2 save formats, and up to seven simulated days of offline catch-up.
- Basic, condition-based milestones for water reserves, shelter repairs, toolmaking, and recorded routes.

## Limits

GitHub Pages is static hosting. This simulation does not run on a server while the browser is closed, and browser-local saves do not sync between devices. On return, the browser calculates at most seven simulated days; any additional elapsed time is deliberately not simulated. The current scope covers one survivor and four connected coastal locations. Farming, a permanent settlement, other survivors, and civilization-scale progression are not implemented.

## Run and test

No install or build step is required. To preview the static project from the repository's parent folder:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/Year-Zero/`. The browser uses relative paths, so the same entry point works at the GitHub Pages project subpath.

The simulation tests use Node's built-in test runner and need no dependencies:

```sh
node --test simulation.test.mjs
```

## Files

- `index.html` — accessible world, chronicle, life, and territory panels.
- `styles.css` — responsive visual presentation and weather treatments.
- `app.js` — browser rendering, local storage, and observer controls.
- `simulation.mjs` — deterministic simulation rules, geography, actions, time, and save migration.
- `simulation.test.mjs` — tests for timing, autonomous choices, consequences, discoveries, and saves.
- `assets/year-zero-scene.png` — retained coastal scene artwork.
