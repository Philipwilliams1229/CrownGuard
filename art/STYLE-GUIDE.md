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
- **The ground blend** (`src/render/groundblend.js`) is drawn by `draw.js`
  round EVERY hall: a few realm-matched clumps (meadow tufts, snow drifts,
  marsh reeds, ash and cinders, highland turf — picked from the realm's
  `ambient`) on the footprint rim, behind the hall and over its front
  corners, so no footing ends in a hard line. It leaves the middle of the
  front clear: that is where doors, crews and campfires go. Don't paint your
  own green tufts at a hall's feet; they are wrong on snow (kitB's
  `skirtB` is now a no-op). `hallshot.html?realm=<id>` shows the blend
  (`&noblend=1` hides it).
- **Yard props** (campfires, braziers, racks, dummies, barrels, butts)
  stand on open ground with their feet a good step (~5) below the footing's
  front edge, with their own contact shadow, and inside `x ± 9`, clear of
  the blend's corner clumps. Never half-sunk into a footing or wall. A prop
  that stands in front of the crew is drawn AFTER the crew.
- **Narrow halls** (the Bladewheel) may stand closer: a hall's `roadClear`
  and `reach` in `src/data/towers.js` override the road gap (42 for the
  Bladewheel) and the spacing to neighbours (reach 12, default 15; two
  halls stand `reachA + reachB` apart). Its ground art must then keep inside
  `FOOT_NARROW` (`rx 13, ry 9`, kitB.js) — pass `{ foot: FOOT_NARROW }` to
  `padB` and the same to `skirtB`. Check with `twb-lab.html?kinds=spiker&ell=1`.
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

## Screen sizes (phones to desktops)

Every screen must work from a phone on its side (~750x340 in Safari) and
a phone upright (390x664) up to an iPad (1133x744, the scale-1 reference)
and a desktop. The system lives in `src/ui/fit.jsx`:

- `useViewport()` gives the live screen size, `short` (phone on its side,
  under 500px tall), `narrow` (phone upright) and `scale`, the size menus
  and the HUD draw at (1 on an iPad, down to `MIN_SCALE` 0.72 on a phone).
- `<Fit>` shrinks a whole menu (transform: scale) until it fits with no
  scrolling. Keep modals (`position: fixed`) outside a `<Fit>`, or portal them.
- **No page ever scrolls.** Menus rearrange for short screens (two columns,
  drop long blurbs), then `<Fit>` guarantees the rest. Only long lists (the
  Field Guide's entries, the Master Builds catalogue) may scroll, inside a
  panel whose header stays put.
- **Close buttons never scroll away.** Floating cards put their ✕ on the
  upper-right corner (`.cg-corner-x`), outside the scrolling part; drawers
  keep it in a fixed head. A tap on the field or the dark backdrop closes
  them too.
- **Battle HUD:** when the screen is wider than the 3:2 board (phones on
  their side, desktops), the spare width becomes two rails beside the board
  holding the purse, hero and horn (left) and speed, pause, Build, Castle,
  Militia (right), so the field stays uncovered. On an iPad the chips float
  over the board's corners. The Build drawer picks as many columns as it
  takes for the whole roster to show at once.
- Test at 844x390, 750x340, 390x664, 1133x744 and 1440x900.
- Menus show the NEW art: `TowerPortrait` for halls, `EnemyIcon` with a rig
  (e.g. the crown rigs in `rigs-crown.js`) for figures. `PixelIcon` (the old
  MINI sprites) is only TowerPortrait's fallback.

## Bridges and boats (`drawBridge` in `src/render/scenery.js`)

- A bridge's deck **arches**: `archAt(b, d)` in `src/data/terrain.js` is 0
  at each bank and `BRIDGE_RISE` (8) mid-span. Planks, stringers and rails
  ride that curve, and `draw.js` lifts every walker on a deck by
  `bridgeLift(x, y)`, so feet stay on the planks. Change the rise in one
  place only.
- Height is shown by what the camera can see: a span running ACROSS the
  screen shows its south face with a dark arch cut into it; a span running
  UP the screen shows piles at its edges and a cast shadow on the water
  thrown down-right, widest mid-span.
- River Watch skiffs **pass under** spans: `draw.js` draws any skiff that
  `underBridge()` reports as close with the water, before the bridge, so the
  deck covers it. Check with `scene.html?only=bridges&cam=3,400,326`.

## The campaign map (`src/ui/mapArt.js`)

- Roads: good as they are — well connected.
- **Water is natural and informative** (owner, 2026-09-25). Rivers
  (`RIVERS`, built by `river()`) are splines through control points,
  meandered by noise, held still at their `pins` (the waypoints they run
  through, a lake's outflow) and widening from source to mouth; lakes
  (`MERES`) have noisy, tilted shores; `fen: true` water is the bog's black.
  The map tells the truth: a level whose realm has `rivers` gets a river
  through its waypoint, one with `ponds` a lake or pool beside it, and no
  river passes near a dry level. After adding a level or moving water, run
  `node scripts/check-map-water.mjs` and look at `map-lab.html`.

## Coasts on the board

- A realm may run down to the sea along one edge: `coast: { edge, from,
  to, depth, sand }` in `src/data/maps.js` (Ravenscar: the top edge). The
  waterline (`coastLine` in `src/data/terrain.js`) wanders `depth` px in
  from the edge and eases into headlands past `from`/`to`; `sand` px of
  beach lie between the water and the grass. `world.js` paints it into the
  baked ground (shallows to deep water, surf lines, rocks awash, tideline
  litter, driftwood, marram grass) and `drawRoadLive` adds a moving wash of
  foam. Nothing is built in the sea; the beach is honest ground; scatter
  and decor keep off both. A forest on the same edge keeps to the gate end.
- A coastal level's waypoint on the campaign map stands by its country's
  shore (`scripts/check-map-water.mjs` checks it).

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
