# Year Zero — project files

A living-world observer simulation prototype: one survivor on the Kerala coast after the end of civilization. The survivor chooses among finding food, collecting water, resting, gathering wood, repairing shelter and exploring. The player observes and can gently bias priorities rather than directly move the character.

## Included
- `index.html` — semantic interface and panels
- `styles.css` — responsive cinematic presentation
- `app.js` — autonomous survival loop, needs/resources, exploration, chronicle and browser save
- `assets/kerala-coast.png` — included background artwork

One simulated day is 15 real minutes. Saving is browser-local; GitHub Pages is static hosting and cannot run a server-side simulation while nobody visits. Elapsed-time catch-up is limited to seven simulated days. This is a 2D prototype, not a 3D game.

## Publish
Upload the contents of this folder to the root of `melvinvarghese/Year-Zero`, including the `assets` folder. Then set GitHub Pages to branch `main`, folder `/(root)`.

https://melvinvarghese.github.io/Year-Zero/
