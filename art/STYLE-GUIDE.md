# Crownguard — art style guide

The rules every new piece of art follows, settled over the September 2026
overhaul (the owner's words: "maintain the identity of the game, but add
polish, a lot of polish"). Read this before drawing anything. **Keep it current:** whenever a session
changes the art rules, adds a file or lab page, or learns something the hard
way, update this guide (and `CLAUDE.md`) in the same commit, so the next
session starts from the truth. The finished
work to match is already in the game — when in doubt, open a lab page and
copy what the rebuilt pieces do.

## The look

- **Crisp pixel art at higher resolution.** Everything is drawn in world
  units and baked at `PX = 2` art pixels per world unit (`src/render/paint.js`:
  `PIXEL = true`, `bakeSprite(w, h, draw)`, `inkOutline()`, `part()`).
  Gradients (`lin()`/`rad()`) are auto-banded into stepped tones — no smooth
  blends, no blur, no vector-looking discs.
- **Ink:** a 2-art-pixel dark outline (`#241a26`) around silhouettes; 1px
  interior lines only where big parts meet (`part()` gives each part its own).
  Small detail is colour, not lines. Foliage is underlined, not ringed.
- **Light:** sun from the UPPER LEFT. About three tones per surface.
  Highlights lean warm cream `#fff3d2`, shadows lean cool plum `#2a1c2c`.
  Everything that stands on the ground gets a contact shadow down-right.
- **Palette:** warm and saturated. Grass `#82b256`, castle stone `#a19a8a`,
  roofs `#a8505c`, gold `#d8b34a`, steel `#c4c8d0`, oak `#7a5334`, the
  crown's blue `#3a5474`.
- **Camera:** 3/4 top-down, looking north. We see the tops of things and
  their SOUTH faces. A wall running north–south (the castle) shows its top
  and a slanting west face, never a front elevation turned sideways.
- **Figures:** slim and grounded, about 4–4.5 heads tall. Never chibi, never
  big-headed. Readable faces (eyes, nose, jaw — a face in a hood's shadow is
  fine), shoulders, real hands on real weapons. They face +x; the game mirrors
  them, so nothing may be lettered or lopsided in a way that breaks mirrored.
- **Composition stays:** the forest band on the left/top edge, the castle
  wall down the right edge, the three-lane dirt road, the board border, the
  floating HUD. Polish, don't restyle.

## Where things live

| What | File | Notes |
|---|---|---|
| Greenwood horde (goblins, orc, Ironclad, troll, shaman, necro, warchief) | `src/render/rigs-horde.js` | shared bending skeleton, 4-frame walk, wind-up/strike fight |
| Beasts (wolf, boar rider, bat, dragon, wolf rider) | `src/render/rigs-beasts.js` | beast lope; rider reuses the horde goblin |
| The crown's soldiers (knight, paladin, berserker, champion, militia, Aldric, Wren) | `src/render/rigs-crown.js` | upright human skeleton |
| Other factions (still the generic rig) | `src/render/rigs.js` | entries in the three files above override these |
| Tower crews (archer, engineer, mage, priest, smith, falconer, bombardier, musketeer…) | `src/render/folk.js` | the new body: slim, jointed arms, small hands |
| Halls (towers) | `src/render/halls/<kind>.js` | helpers in `buildkit.js` and `halls/kitB.js` |
| Scenery (trees, rocks, spawn mouth, sign) | `src/render/scenery.js` | decor baked per type |
| Ground and road | `src/render/world.js` | cached per realm |
| Castle | `src/render/castle.js` (+ `wallDrums`/`wallSlots` in `src/data/castle.js`) | baked per damage tier |
| Combat effects, projectiles, ground pools, logs, coin pops, status tells | `src/render/fx.js` | painted pixel by pixel once, stamped |
| HUD skin | `src/ui/hud/` (`hud.css`, `icons.jsx`, `Chips.jsx`) + `src/ui/theme.js` | |
| Campaign map / title screen | `src/ui/mapArt.js`, `src/ui/titleArt.js` | painted once, cached |

A new creature: add an entry to the matching `rigs-*.js` file (same shape as
`RIGS`: `{ kind, box: { hw, up, down }, p }`), keep colours in the `skin /
cloth / cloth2 / hair / col / belly / wing / mane / cape` params so the
necromancer's `revived` palette and the white hit-flash still work.

## Rules for halls (towers)

- **Never roof the crew in.** The crew stay visible; upgrades read from what
  stands behind and around them — battlements, banners, bigger engines, glows.
- **Every level, branch and final form looks different** and grows in
  grandeur from level 1 to the finals; a player should name a final at a glance.
- **Footprint:** everything at GROUND level (pad, contact shadow, props, crew
  feet) stays inside an ellipse `rx ≤ 18, ry ≤ 13` centred on `(x, y+3)`.
  Tall parts (shafts, roofs, arms, masts, spires) may rise above it. Halls
  stand at least `BLOCK_DIST = 48` from the road's centreline; with this
  footprint nothing spills onto the dirt.
- **Bake** the body once per form (the `baked()` / `stamp()` pattern in
  `halls/archer.js`); only flames, glows, flags and firing poses are live.
- Engine spawn points must match the art (the wizard's orb leaves the staff
  tip, catapult stones leave the arm tip, the Sunforge beam starts at the
  shard) — if a hall grows, check where its shots start.

## Type (HUD)

- **Words:** Silkscreen. **Anything with digits:** Press Start 2P (the
  `--numeric` var, with `font-size-adjust`). Pixelify Sans is BANNED — its C
  reads as O and its 5/8 as S at small sizes.
- Panels: slate with a 2px ink rim and hard bevels, oak frames with a gold
  bead, parchment slips for choices; buttons sink 2px when pressed; 44px+
  touch targets; unaffordable prices go red.

## Performance (target: iPad mini 6)

- Bake anything static. Per frame, keep to stamps and small live bits.
- Caching live `soft()` / `glow()` gradients as sprites was measured SLOWER
  in Chrome than drawing the gradients — don't retry it.
- `perf.html` (frame ms vs number of foes) and `perfboard.html` (a packed
  late board, per hall kind) are the yardsticks. A packed board of ~90 halls
  and 350 foes draws in ~13 ms on the dev Mac.

## How to look at your work

With `npm run dev` running (these pages save PNGs into `.shots/` through the
dev server; view them from there):

- `/hallshot.html?kind=<kind>&tag=<name>` — all 9 forms of a hall, idle and firing.
- `/rigshot.html?types=goblin,orc&tag=<name>&scale=3` — creature frames.
- `/shots.html` — whole board frames through the real `draw()`; call
  `snap(name, realm, marchers, extra, [x, y, w, h, scale])` from an injected
  module script (the browser tool's JS runs in an isolated world).
- Lab pages per area: `twa-lab.html`, `twb-lab.html`, `twb-folk.html` (every
  crew figure), `crw-lab.html`, `hrd-lab.html`, `bst-lab.html`, `cas-lab.html`,
  `scn-lab.html`, `fx-lab.html`, `map-lab.html`, `hud-lab.html`, `wdn-lab.html`.
- Always take a BEFORE shot, then judge at 1x board size (what the player
  sees) as well as zoomed. Never launch Chrome from a shell — it trips a
  macOS security prompt; use the app's browser pane.

## AI-generated art (Gemini / Nano Banana)

Everything animated stays drawn in code so frames stay consistent. If
painted images are ever used, they suit backdrops and key art; the prompt
guide is `art/GEMINI-PROMPTS.md` and the per-sprite sizes are in
`art/DESIGN-BRIEF.md`.
