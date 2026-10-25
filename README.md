# Year Zero

**Humanity ended. One life continued. A new world begins.**

Year Zero is a static, zero-player survival simulation set on the Kerala coast that runs 100% client-side on GitHub Pages with **zero AI and zero external APIs**.

You observe the last known survivor; his needs, local resources, monsoon weather, memories, and available paths shape what he does next through a deterministic utility-scoring engine (`simulation.mjs`).

## Key Features

- **100% Deterministic & Zero-API**: Powered by a seeded `xorshift32` PRNG and mathematical utility curves. No LLM calls, no backend server, and no external npm packages.
- **Persistent Simulated Clock**: At `1×` speed, 1 simulated day equals 15 minutes of real time, with interactive `1× / 4× / 16× / 60×` speed multipliers and a `+1h` step button.
- **Transparent Utility Mind**: Inspect the live utility scores and reasoning behind every candidate action (`drink`, `collectWater`, `eat`, `gatherFood`, `gatherWood`, `repairShelter`, `craftTool`, `makeFire`, `tendGarden`, `treatInjury`, `rest`, `explore`, `travel`, `returnHome`).
- **Connected Kerala Coast Geography**: 6 connected coastal locations (`Coastal homestead`, `Old village road`, `Backwater edge`, `Abandoned clinic`, `Collapsed stone jetty`, and `Overgrown laterite quarry`) rendered on an interactive SVG route map.
- **Live Atmospheric Canvas & Web Audio**: Procedural monsoon rain, coastal mist, hearth glow, night fireflies, and optional synthesized Web Audio coastal surf soundscape.
- **Offline Catch-Up & Save Persistence**: Automatically saves to browser `localStorage` (`year-zero-world-v5`), migrates legacy saves, exports JSON snapshots, and computes up to 7 simulated days of offline catch-up when you reopen the tab.

## Run Locally & Deploy on GitHub Pages

No build step or installation is required.

```sh
python3 -m http.server 8000
```

Run the deterministic unit test suite using Node's built-in test runner:

```sh
node --test simulation.test.mjs
```
