# Implementation and validation

## Inspected baseline

Source: https://github.com/melvinvarghese/Year-Zero. The exact inspected main-branch
commit is recorded in `tests/results/baseline.txt`.
The repository was cloned and its HTML, CSS, application code, full engine, tests,
README and asset inventory were inspected. The existing public site's HTML was
retrieved successfully and matched the baseline page structure. No claim is made
about visually testing the old deployed site.

The baseline already contained a seeded utility evaluator, finite-duration action
completion, six graph locations, resource gathering, weather, simple gardening,
localStorage and offline catch-up. Its seven unit tests passed. It was not a
living visual scene: `sceneCanvas` drew atmosphere over a PNG. There was no survivor
position or visible action actor. Reload recovery omitted active actions, milestones,
discoveries and failure memories. Freshwater sites could supply water after depletion.
The garden's final planting stage immediately added food without a crop growth cycle.

The original structure, interface/tab system, utility architecture, location graph,
resource and weather systems, audio, favicon, landscape asset, license and deployment
approach were retained. The weather-only canvas was replaced with the connected world
renderer; the landscape remains a subdued background rather than gameplay scenery.

## Module ownership

- `simulation.mjs`: owns time, resources, utility scores, action duration, failure
  memories, interruption, construction, gardens, discoveries and restoration.
- `world-geometry.mjs`: local region centers, interaction stations and pure position
  interpolation. Both engine and renderer share these coordinates.
- `living-scene.mjs`: reads world state and renders. It cannot choose actions, roll
  simulation randomness or edit the world. Animation is derived from simulated time,
  so pause freezes the survivor and weather. Camera choice is an observer setting.
- `app.js`: existing DOM rendering and controls, storage, audio and orchestration.
- `sw.js`: relative-scope static offline cache; normal requests prefer the network.

A region is a graph of locations with an ID, region, adjacency, terrain, risk,
coordinates, resources and limits. Additional regions can be connected through that
graph. Add their centers to the geometry module and their data to `makeLocations`,
and update save migrations for new content. A later regional loader can aggregate
inactive regions rather than ticking an entire world. Such a loader is not included.

Local tasks consist of a walk phase followed by a work phase. Travel tasks use their
full duration for movement. The action stores origin, destination, elapsed/remaining
time and the decision reason. The scene draws the engine's persisted position;
completion applies effects, changes the location if travelling and records outcomes.
An urgent available drink/meal or exhaustion can interrupt nonessential work without
consuming its materials. Travel finishes its physical segment before reconsidering.
Weather is evaluated at daily boundaries; an existing journey is not teleported or
cancelled into a different location when the weather changes.

Inventory has 32 bulk units: food/water weigh 1; other resource units weigh 0.5.
Per-resource limits also apply. Automatic storing/packing actions move food and water
between carried stock and a home reserve capped at 12 of each. The other storage keys
are reserved in the schema and do not currently participate in storage transfers.
Supplies are abstract food portions and water containers, not a detailed crafting or
potability model. Wild food and fallen timber replenish slowly; salvage does not.
Freshwater replenishes daily and more during wet weather, but collection never draws
more than the current water quantity. Gardens are separate from wild regrowth.

## Validation performed locally

- JavaScript syntax checks for all application modules, tests and service worker.
- 21 automated Node tests, including five distinct seeded 60-day runs.
- Tests cover movement before effects, finite wells, eating, timber costs, exploration,
  exact current-format save continuity, offline equivalence/no duplicate events,
  pause, corrupt/future saves, storm decisions, rainfall, construction, crop growth,
  harvesting, interruption, inventory bounds and long-run useful development.
- Actual canvas code rendered directly at start and after settlement development
  using a native canvas implementation, followed by visual inspection.
- Actual headless Chromium 153 browser testing at `/Year-Zero/`: autonomous motion,
  completions, pause, save/reload, hour stepping, camera and tabs, 390px mobile layout,
  capped catch-up, offline reload via service worker, and damaged-save protection.
- Desktop (1440px) and mobile (390px) browser screenshots were visually inspected.
  The mobile review prompted a spacing fix and a closer survivor camera.
- Browser regression run reported no page errors and no HTTP responses >= 400.
- Relative path and packaged-file audit, ZIP integrity and clean extraction checks.

The bundled browser test uses accelerated time for observed behavior and state
fixtures for long absence/corruption. The 60-day tests run the real engine without
real-time waiting; they are not 60 days of continuous browser observation.
Playwright's usual browser download failed in this environment. A separate Chromium
package was obtained, decompressed and launched with software-only rendering; this
was used for the recorded browser run. Those environment-specific packages and the
browser binary are not bundled or required by the application.

## Scope of the evidence

Tested locally in Node and Chromium. Not pushed, published, or tested at the public
GitHub Pages URL after these changes. No physical mobile-device, Safari, Firefox,
long-duration background-tab, multi-tab concurrency, exhaustive accessibility or
large-scale performance certification was performed. Different browsers have storage
and service-worker policies that can affect offline availability. No claim is made
that this single survivor has implemented a civilization beyond the listed structures.
