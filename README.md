# Crownguard

A retro, pixel-art tower defense game — Kingdom Rush-style, with a Game Boy
Color-inspired palette and hand-made sprite art. Hold the winding road across
15 waves; the castle must not fall.

Every tower levels **1 → 2 → 3**, then permanently **evolves** down one of two
or three branches that change how it *works*, not just its numbers. All
progression is earned with in-run gold — no meta-currency, no paywalls.

## How to run it

You need [Node.js](https://nodejs.org) installed (the LTS version is fine).

```bash
npm install     # one time: downloads the tools the project needs
npm run dev     # starts the live preview; open the http://localhost URL it prints
```

Other commands:

```bash
npm run build   # bundle an optimized version into dist/
npm run preview # preview that optimized build locally
```

## Playing

- **Raise Defenses** panel: pick a tower, then click the grass to build it.
- Select a placed tower to **upgrade**, **evolve** (at Lv 3), or **sell** it.
- **Knight Garrisons** send knights onto the field; select the hall and click
  inside its circle to move the rally flag.
- **Start Wave** to begin; after a clear the next wave auto-starts in 30s —
  start it early to earn bonus gold. **Restart Wave** rewinds to how things were
  when the wave began (also offered after a loss).
- Zoom with the **-/+** buttons and drag to pan while zoomed. Speed 1×/2×/4×,
  pause, and the field guide live in the **☰ menu**, top-left.

## Where each system lives

The game was originally one large file; it's now split into focused modules
under `src/`. Behavior is identical — this is organization only.

| Folder | What's in it |
| --- | --- |
| `src/data/` | The "rulebook": `constants.js` (sizes, tuning, palette, RNG), `towers.js`, `enemies.js`, `waves.js`, and `terrain.js` (pre-computed scenery positions). |
| `src/sprites/` | `sprites.js` — every hand-made pixel sprite map, its palettes, and `drawSprite`. |
| `src/engine/` | The "brain": `path.js` (the road math), `ids.js` (unique id counter), `towers.js` (tower stats & knight units), `actions.js` (build/upgrade/evolve/sell, wave start & restart, damage), and `update.js` (the per-frame simulation). |
| `src/render/` | The "painter": `enemies.js`, `towers.js`, `scenery.js`, and `draw.js` (the master frame: pixel pipeline, camera, depth sorting, effects). |
| `src/ui/` | `PixelIcon.jsx` — the little pixel figures used in menus. |
| `src/CrownguardGame.jsx` | The thin React shell: state, the animation loop, mouse input, and the on-screen panels. |
| `src/main.jsx` | Entry point that mounts the game. |

### How a frame flows

`CrownguardGame.jsx` runs an animation loop. Each frame it calls
`updateGame(g, dt)` (advance the simulation) then `draw(g, canvas, bufRef)`
(paint it), and mirrors a small snapshot of state into React so the side panels
refresh. The full game state lives in one mutable object `g`, held in a ref.

## Design pillars (do not violate)

1. **No grind, no paywalls** — progression is earned with in-run gold only.
2. **Branching evolution** — evolutions change a tower's function and are
   visually obvious on the battlefield.
3. **Challenging but fair** — losses should feel like recoverable strategy
   mistakes.
