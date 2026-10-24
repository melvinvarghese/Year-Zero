# Year Zero

**A living world simulation. One survivor. The birth of a civilization.**

Year Zero is a static website prototype for an observer-only post-apocalyptic simulation. It begins in a fictionalized rural coastal area of Kerala, India. One man acts autonomously while the visitor watches his life unfold through a cinematic scene and a dated chronicle.

## Current prototype features

- One simulated day lasts 15 real minutes.
- A basic autonomous decision system prioritizes thirst, hunger, rest, gathering and exploration.
- Survival needs: hunger, thirst, health and energy.
- Resources: food, water, wood and scrap.
- Initial construction: repair the house and build a rainwater collector.
- Discoveries gradually introduce nearby regions, including an inland road and an abandoned market town.
- Weather changes and environmental events.
- The chronicle records discoveries, actions and world events.
- Local browser saving and elapsed-time catch-up after returning.
- No map, player movement controls, backend, accounts, paid APIs or build tools.

## Run locally

You can open `index.html` directly in a modern browser. For the most reliable local-storage behavior, use a simple static server or open it through GitHub Pages.

## Publish using GitHub Pages

1. Create a GitHub repository named `Year-Zero`.
2. Upload `index.html`, `styles.css`, `app.js`, `README.md`, and `.nojekyll` to the repository root.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose the `main` branch and `/ (root)`, then save.
6. Wait for GitHub Pages to publish the site. The URL appears in the Pages settings.

## Simulation notes

- One simulated day is 15 minutes (900,000 milliseconds).
- A simulated hour is 37.5 real seconds.
- The prototype advances the simulation while open and computes elapsed time on return, capped at seven simulated days.
- Saves are stored in this browser on this device. Clearing site data, changing browsers, or changing devices will not transfer the save.
- GitHub Pages serves static files; it does not run a background server process. The prototype therefore catches up from elapsed time rather than running continuously while closed.
- The current decision engine is intentionally small and deterministic in structure, with some randomized outcomes. This is a prototype, not a fully balanced survival model.

## Important limitations

This first version is a foundation, not a finished simulation. The protagonist has no detailed biography yet, region expansion is simplified, and the illustrated scene is built from CSS shapes rather than external art assets. The simulation should be expanded gradually with better art, more consistent autonomous planning, region-specific resource models, and richer history.

## Privacy

No analytics, account system, remote database, or external API is used. Simulation data stays in browser storage.

## License

MIT. See `LICENSE`.
