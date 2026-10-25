# Year Zero — cinematic prototype

**A living world. One survivor. The birth of a civilization.**

Year Zero is a browser-based, single-survivor world simulation prototype. It begins on a fictionalised coastal stretch of Kerala, India. The player observes a survivor's life, reads the field journal, checks his condition, and nudges his priorities.

## What's in this version
- Cinematic background artwork and a responsive, atmospheric interface.
- A survivor status panel, field journal, known-world panel, and day timeline.
- One simulated day lasts 15 real minutes.
- Basic needs, supplies, shelter upgrades, fire, tool crafting, gathering, and exploration.
- Browser-local saves with elapsed-time catch-up when the page is reopened.
- A pause control and reset option.

## Important prototype limitations
This is a **front-end prototype**, not a full simulation engine or a game with animated 3D characters. The scene uses a single piece of artwork; the timeline is a set of illustrative moments, not a live camera. The autonomous behaviour is deliberately lightweight and should be expanded before claiming deep simulation.

GitHub Pages is static hosting: it cannot keep a server-side world running while nobody visits. This version saves the world in the current browser and calculates a limited amount of elapsed time when reopened. Data does not synchronise between devices or browsers.

## Publish on GitHub Pages
1. Upload the contents of this folder to the root of the `Year-Zero` repository. Keep `index.html`, `styles.css`, `app.js`, and the `assets` folder together.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Choose branch `main` and folder `/ (root)`, then save.
5. Wait for the deployment to finish and open `https://melvinvarghese.github.io/Year-Zero/`.

## Files
- `index.html` — interface and accessible structure.
- `styles.css` — cinematic responsive design.
- `app.js` — lightweight simulation, local save, interactions.
- `assets/year-zero-scene.png` — background artwork.
