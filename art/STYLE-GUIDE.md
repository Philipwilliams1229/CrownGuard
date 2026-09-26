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
| The Iron Kingdom's foot (levy, crossbowman, knight-sergeant, battle chaplain, Lord Marshal) | `src/render/rigs-iron.js` | upright human skeleton; `irn-lab.html` zooms chosen frames beside the crown's soldiers |
| The Iron Kingdom's mounts and engines (cavalier, gryphon knight, siege ram) | `src/render/rigs-ironmounts.js` | gallop, wingbeats, six turning wheels; `irm-lab.html` |
| The Hollow Court's dead (risen, barrow archer, plague ghast, crypt warden, gravecaller, Hollow King) | `src/render/rigs-hollow.js` | the horde's bending skeleton with real bones; `hlw-lab.html` (on fen and road) |
| The Hollow Court's beasts and spirits (ghoul, wraith, grave amalgam) | `src/render/rigs-hollowbeasts.js` | `hlb-lab.html` |
| Anything not in the files above (the generic rig) | `src/render/rigs.js` | entries in the rig files above override these |
| Tower crews (archer, engineer, mage, priest, smith, falconer, bombardier, musketeer…) | `src/render/folk.js` | the new body: slim, jointed arms, small hands |
| Halls (towers) | `src/render/halls/<kind>.js` | helpers in `buildkit.js` and `halls/kitB.js` |
| Scenery (trees, rocks, spawn mouth, sign) | `src/render/scenery.js` | decor baked per type; `IRON_ART.flat` / `HOLLOW_ART.flat` list pieces baked without the 2px ring |
| The gate's crag (the hill the Greenwood/old realms' cave is cut into) | `src/data/gatecrag.js` (`gateCrag`, `hillAt`, `cragBlocks`) | pure data: scenery.js paints from it AND `buildableAt` refuses halls on it — change its shape only here, then scan that no buildable point lies on opaque gate pixels |
| A chapter's own scenery: the Iron Marches, the Hollowfen | `src/render/scenery-iron.js` (`IRON_ART`), `src/render/scenery-hollow.js` (`HOLLOW_ART`) | one registry each — `decor` painters, `live` types, bake `box`, ground `dress`, `spawn` gates (REALM.spawn), `turf`/`road` art keyed by REALM.groundArt, and `apron` (the landscape's mix). scenery.js, world.js and apron.js read them LAZILY (they import scenery.js back — never read a registry at module load). Lab pages `irs-lab.html`, `hfs-lab.html` |
| Ground (turf tone map, grass, the wood's hem) | `src/render/world.js` (+ `groundblend.js` round halls) | one layer baked per realm, in order: tone map + turf → chapter turf art → `paintRoad` → chapter road art → `bakeWater` |
| The road (dirt, ruts, chevrons) | `src/render/road.js` — `paintRoad` (the board), `paintRoadStrip` (the apron's road, run in the direction of march), `drawRoadMarks` (chevrons, live) | the Iron and Fen chapters pave over it |
| Rivers and ponds | `src/render/water.js` — `bakeWater` (bodies, into the ground layer), `drawWaterLive` (current, glints, foam: stamps only), `drawRiver` (standalone, for the apron), `drawPond` | |
| Bridges | `src/render/bridge.js` — `drawBridges`, `bakeBridges` | one sprite per span per realm |
| The sea and beach | `src/render/coast.js` — `coastPixel` (per pixel, for world.js and the apron), `paintShore`, `drawShoreLive` | |
| Castle | `src/render/castle.js` (+ `wallDrums`/`wallSlots`/`ballistaSpots` in `src/data/castle.js`) — SQUARE open-topped towers (paved deck, battlemented rim, a red-roofed stair turret) with the ballistae and spare bowmen ON the gate towers' decks; `drawCastleGround` (called from draw.js under the foes) lays the realm's worn apron, footing stones and a cobbled threshold into the gate; live bits: banner ripple, a pacing sentry, birds, chimney smoke, torches/braziers | baked per damage tier; ground once per board |
| Combat effects, projectiles, ground pools, coin pops, status tells | `src/render/fx.js` | painted pixel by pixel once, stamped |
| A hall rising when bought, levelled, branched or ascended | `src/render/buildanim.js` — `drawRaising(ctx, t, time, paint)`, driven by `t.raised = { at, how, prev }` (set in actions.js `markRaised`) | build: a scaffold climbs and the hall is revealed bottom-up; level: a mallet and a squash-and-stretch pop; branch/ascend: a gold light column and a bounce. Scales round to whole art pixels; from 97% on it paints the plain hall, so it never jumps. Form sizes are measured via `drawTowerPortrait` — a new hall kind needs a portrait too |
| Area effects: novas, waves and marks (frost/fire nova, Shield Slam, heal & ward waves, silence, shadowstep, Midas, toll, plague burst, raise, the Heartseeker reticle) | `src/render/rings.js` — `drawRingFx(ctx, fx, a, g, layer)`: draw.js calls it with "g" in the ground pass (rime, scorch, cracks, stains under the crowd) and "a" after the actors | pieces (shards, flames, clods, coins, runes) baked once and stamped on the LIVE radius, so a ring still shows the area it hit; at most one thick continuous ring each — thin full-circle `ringPx` lines are the costly part, so highlights are dotted |
| The Trapsmith's traps (spikes, jaws, caltrops, mines, aerostat balloons) | `src/render/traps.js` — `drawTraps` (on the road, under the crowd) and `drawTrapBalloons` (the balloons, in a sky pass over it) | each look baked once per realm and stamped; late boards hold hundreds |
| The Log Roller's logs (trunk, Iron Drum, Powder Keg) | `src/render/logs.js` | true cylinders in the 3/4 camera, lit in world space so light never turns with the log; bark and bands roll with `lg.spin` |
| The Falconry's hawk (the "talon" stoop) | `src/render/birds.js` — `drawStoop`; the Skyknight's war-eagle is the `eagle` rig in `rigs.js` | hawk poses baked at 15° steps and stamped |
| The Covert's blades (assassins) | `src/render/rigs-covert.js` (`assassinUnit`, `assassinUnitA/B` for the branches and `assassinUnitAA/AB/BA/BB` for the four finals in `rigs.js` — one rig name per look, since baked frames cache by name; `drawAssassinUnit` in `enemies.js` picks it) | params switch the pieces on: face "gild", hat, veil, beak, long, hem, censer, purse, scroll, pauldron, blade kind |
| HUD skin | `src/ui/hud/` (`hud.css`, `icons.jsx`, `Chips.jsx`) + `src/ui/theme.js` | |
| The landscape beyond the board (the apron: ground, road and rivers running off, the realm's trees thickening, the wall continuing) | `src/render/apron.js` `paintApron(canvas, { cssW, cssH, dpr, board })` | painted once per realm and layout, cached |
| Campaign map / title screen | `src/ui/mapArt.js`, `src/ui/titleArt.js` | painted once, cached |
| Title-screen crowd and castle life (walkers, guards, the hay-forker; banners, sentry, smoke, torches, birds) | `src/ui/titleCrowd.js`, placed from `ROAD`, `ROAD_W`, `HAY` and `CASTLE_LIFE` in `titleArt.js`; the vista castle matches the board castle (square open-topped towers, red stair turrets, blue crown banners, cobbled threshold) | a second canvas with the vista's own fit, ~30 fps, paused when hidden |

A new creature: add an entry to the matching `rigs-*.js` file (same shape as
`RIGS`: `{ kind, box: { hw, up, down }, p }`), keep colours in the `skin /
cloth / cloth2 / hair / col / belly / wing / mane / cape` params so the
necromancer's `revived` palette and the white hit-flash still work.

## The three armies' colours

Each faction must read as itself at a glance, and never as the player's
own soldiers (the crown's blue `#3a5474` and gold):
- **The Greenwood Horde:** green skins, leather browns, crude iron.
- **The Iron Kingdom:** dark blued steel (`#6c7280`, lit `#c4c8d0`),
  OXBLOOD surcoats, caparisons and banners (`#7a2a2c`), black-iron trim,
  brass for rank; its device is a grey iron tower. Its scenery flies the
  same oxblood — no blue flags in the Marches.
- **The Hollow Court:** bone `#e0d8c4`, rotten purple-black and drowned
  green-grey cloth, verdigris bronze, witch-fire teal `#7ce0b8`.
Colours stay in the rig params so `revive()` and the hit-flash reach them.

## A chapter's own ground

- A realm names its art with `groundArt` (turf and road painters in its
  chapter's registry), its gate with `spawn`, and may grow an edge wood of
  its own along the spawn edge with `wood: { types: [[type, weight], ...],
  hem }` (`hem: false` drops the Greenwood's green bushes and leaf litter).
  New decor types register a footprint with `addFootprints` (terrain.js)
  from the chapter's realm file.
- Keep a board CALM at 1x: open turf with a few strong landmarks, like the
  Greenwood. Ground texture (heather, moss, paving joints) gathers into a
  few drifts and stays low-contrast, or it fights the foes for attention.

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

## The castle mark and icons

- **One castle everywhere:** `src/ui/castleMark.js` (`CASTLE_MARK` pixel grid +
  `CASTLE_PAL`) is the game's small symbol: the title screen's logo, the
  tray's Castle button, the castle works headers. `CastleIcon` in
  `src/ui/hud/icons.jsx` draws it.
- **The app/home-screen icon** is the title screen's own painted castle on
  its hill with the path to the gate, frozen: `icon-lab.html?save=1` paints
  `icon-512/192/180` into `.shots/` with titleArt/titleCrowd's painters; copy
  them over `public/icon-512.png`, `icon-192.png`, `apple-touch-icon.png`.
  Keep key content inside the central 80% circle (Android crops round).
- **No emoji in the UI.** Pictures are pixel grids in `src/ui/hud/icons.jsx`
  (coin, heart, castle, arrow, ballista bolt, shield, hammer, target, flag…)
  or the game's own art (`TowerPortrait`, `EnemyIcon` with a rig). Plain
  typographic marks (★ ✓ ✕ ·) are fine.

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
- **Battle HUD: Bloons-style tray** (owner, 2026-09-25). A tray down the
  right edge on every device: wave count and pause at its head, Castle and
  Master builds, the tower grid (tap a tile then the grass, or DRAG a tile
  onto the map — its picture rides above the finger; a vertical swipe on a
  tile scrolls the tray instead; two columns of named tiles, and on phones
  the locked halls fold into one tile),
  and the hero, his talents and the militia at its foot. On the map: lives
  and gold top left; the horn (with its arrow to the next wave's makeup and
  the Rush switch) and the speed bottom left. **Popups, never scrolling:**
  the tower card opens beside its tower (two columns on phones), the castle
  works and the hero's talents open as wide cards over the middle of the map
  in columns; each has its ✕ on the corner and closes on a tap elsewhere.
  The map stands flush against the tray at its true shape (its decorative
  top/bottom border may be trimmed on short screens); the rest of the screen
  is the realm's landscape (`src/render/apron.js`), never a bar. Everything
  keeps clear of the notch and home indicator (`vp.safe`).
- **Landscape only** (owner, 2026-09-25): a touch screen held upright gets
  `src/ui/TurnDevice.jsx`'s "turn your device" card over EVERY screen; the
  manifest declares landscape. Upright layouts (`narrow`) are a fallback
  for narrow desktop windows, not a target.
- Test at 844x390, 750x340, 1133x744 and 1440x900.
- Menus show the NEW art: `TowerPortrait` for halls, `EnemyIcon` with a rig
  (e.g. the crown rigs in `rigs-crown.js`) for figures. `PixelIcon` (the old
  MINI sprites) is only TowerPortrait's fallback.

## Bridges and boats (`src/render/bridge.js`)

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
- Each span is **baked once per realm** (`bakeSpan`, in the span's own
  (u, v, z) frame — the same one `bridgeLift` uses, so feet land on the
  planks) and stamped; only ripple dashes and the fen lamp are live. One kind
  per chapter via `REALM.bridge.kind`: `"timber"` (Greenwood, default),
  `"stone"` (Iron: the road's flags carried over, parapets, arches with
  voussoirs, starlings), `"fen"` (grey, moss, broken planks and rails, rope,
  a teal lamp — varied per span by `hash(b.x, b.y)`).
- Height reads only through what faces SOUTH or is sloped: across spans show
  a south face (trestle opening or arches); up-screen spans show bents whose
  caps and piles stand past the deck's edges, pitched-stone abutment slopes
  beside the parts over land, and a two-tone shadow on the water (a gloom
  band widening with height, then the thrown part).
- Wing walls run ALONG the bank on its land side (found from the wet mask
  from the deck's end); the outer end has no ink and sinks under a grass
  tuft. Where the road runs onto a deck: no silhouette ink, only a dark 1px
  sill broken by dust.

## Water, roads and ground (the September 26 pass)

The owner's ask: "how the bridge goes over the river, the water and river
look in general, and a big sweep ... textures and paths, grass, other ground
textures." What came of it:

- **Water is baked.** River and pond bodies are painted pixel by pixel into
  the ground layer once per realm (`bakeWater`); per frame `drawWaterLive`
  only stamps small baked marks (~0.2 ms). Never draw water with per-frame
  strokes or gradients — river boards drew 4-7 ms slower per frame before.
- **River banks follow the sun.** With n the normal from water to land and
  L = 0.586·nx + 0.81·ny: north banks (ny < 0) show a shaded earth face and
  throw a shadow on the water; south/east banks (L > 0) get a mud line, a
  pebbly strip and a lit lip; west banks shade the water. Keep the visible
  edge within ~5 of `rv.w/2` (halls stand 14 off): put a river's character
  into spits (`edgeOff`), never outward bulges. Rivers that meet merge by a
  smooth union; a pond touching a river is painted by the river.
- **Water edges and landmarks are keyed to world coordinates** (noise,
  world-patch landmarks) so `drawRiver` in the apron paints the same river
  across the seam. Dark (fen) water needs absolute tone steps or three tones
  don't show on black.
- **The road** has a ragged, grass-bitten edge and crisp rut grooves (a dark
  wall on the sun side, a floor one tone down, a lit lip), each side with
  its own dash noise, moving to the inside of bends and fading; snow has
  runners, the fen only wall and lip. Every bend's inside is filleted
  (`bendFillets`). Chevrons: in a bend they point along the nearer leg, none
  within 8 of a bridge, a bright `CHEVRON` colour (Ember's orange) stays in
  the groove at rest, pale roads kindle amber.
- **Turf** frays its tone edges in its own dither — blade dither (`DITH`) for
  grass, wind-streak (`DITH_WIND`) for snow and ash (`turfTones(R).dith`),
  never a Bayer screen-door. Small flora reads at 1x only as a mass or a
  landmark; anything ring- or row-shaped gets gaps and a wandering radius.
  Never scale a baked pixel sprite — bake each size.
- **Paving** (Iron flags, fen causeway, the gate's setts) never tiles: vary
  course widths, take tones from noise patches rather than per stone, and at
  a bend give each flag wholly to one arm (no long diagonal mitre). Wheel
  ruts on flags are a 1px shaded wall plus polish, never darker whole flags
  (they read as specks at 1x). A ground tint's edge is stepped and broken by
  irregular one-unit blocks.
- **Coast:** anything strung along a shore is placed by distance along the
  waterline, and cut by the slope of its own smoothed contour, never by raw
  x/y or the wiggly waterline. Foam rings only on the sea side; a rock at the
  waterline stands ashore with its shadow in the wet sand.
- **Stones inside a big per-pixel bake** are written straight into its RGBA
  buffer; never read the canvas back per stone.
- **Ambient particles** (atmosphere.js) are baked shapes or plus-shaped
  motes on the 2-unit grid, never translucent squares or ruled rows of boxes,
  and nothing blows about over the open sea.
- **Load cost moved from frames to realm load:** a river board's ground
  layer, spans and gate now bake in ~0.5-0.8 s here (headless, shared CPU).
  Frames got faster; watch the load time on the iPad.

## The campaign map (`src/ui/mapArt.js`)

- Roads: good as they are — well connected.
- **A continent to travel** (owner, 2026-09-25): the map is 770x690 units
  (`MAP` in mapArt.js; y from -250), each chapter with room for 11 stops;
  waypoints, name scrolls, road width and dressing keep their on-screen size,
  so the countryside between stops fills with the region's own dressing.
  The layout lives in `src/data/mapLayout.js` (coastlines + waypoints). The
  campaign screen is a camera: it opens close on the front line, glides to a
  newly opened stop, drags/pinches/wheel-zooms, and has buttons for the
  whole continent and "back to the front". Paint is split into stages so
  the title screen can warm it; keep each stage under ~100ms.
- **Each country in its own palette** (2026-09-26): the Greenwood lush
  and farmed; the Iron Marches a cool moor (MOOR/moorPx) of walled
  fields, keeps, forts and camps flying OXBLOOD banners, never blue; the
  Hollowfen dark bog (FEN_GROUND/fenPx, fenDressing) with black water,
  mist, dead trees and willows, barrows and ruins. Fen dressing may stand
  in water (`dryBusy`). Never write a new ground source as `{ x: N, y: N,
  rx:` in mapArt.js — check-map-water.mjs reads lakes from that pattern.
- **Water is natural and informative** (owner, 2026-09-25). Rivers
  (`RIVERS`, built by `river()`) are splines through control points,
  meandered by noise, held still at their `pins` (the waypoints they run
  through, a lake's outflow) and widening from source to mouth; lakes
  (`MERES`) have noisy, tilted shores; `fen: true` water is the bog's black.
  The map tells the truth: a level whose realm has `rivers` gets a river
  through its waypoint, one with `ponds` a lake or pool beside it, and no
  river passes near a dry level. After adding a level or moving water, run
  `node scripts/check-map-water.mjs` and look at `map-lab.html`.

## The board's size

- The board is **840x560 (exactly 3:2)**: the 15x10 grid of 48px tiles, a
  40px border (`MX`, `MY`) on the left, top and bottom, and an 80px right
  border (`MXR`) for the castle. The castle band runs from the wall face at
  `W - WALL_W` (738) to the edge: wall, wall walk, then a **bailey** (the
  realm's ground, flagstones, a few red-roofed houses) and the keep behind
  the gatehouse. Nothing of the castle may cross x = W.
- Scatter and random scenery still use the old 800 width (`SW` in
  terrain.js / world.js), so every realm's ground is unchanged; the road
  ends at `W - WALL_W + 18` and the log/keg code uses `FIELD_W` (800) in
  update.js, so gameplay is unchanged too.
- The screen shows the board at its true W:H, never stretched.

## Coasts on the board

- A realm may run down to the sea along one edge: `coast: { edge, from,
  to, depth, sand }` in `src/data/maps.js` (Ravenscar: the top edge). The
  waterline (`coastLine` in `src/data/terrain.js`) wanders `depth` px in
  from the edge and eases into headlands past `from`/`to`; `sand` px of
  beach lie between the water and the grass. `world.js` paints it into the
  baked ground (shallows to deep water, surf lines, rocks awash, tideline
  litter, driftwood, marram grass) and `drawShoreLive` adds a moving wash of
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

No browser pane (a cloud session)? `node scripts/shoot.mjs "<page?query>"
["<js>"] [waitMs]` opens any lab page below headless on the running dev
server and prints page errors; `shots.html`'s `snap(...)` can be passed as
the JS.


With `npm run dev` running (these pages save PNGs into `.shots/` through the
dev server; view them from there):

- `/hallshot.html?kind=<kind>&tag=<name>` — all 9 forms of a hall, idle and firing.
- `/rigshot.html?types=goblin,orc&tag=<name>&scale=3` — creature frames.
- `/shots.html` — whole board frames through the real `draw()`; call
  `snap(name, realm, marchers, extra, [x, y, w, h, scale])` from an injected
  module script (the browser tool's JS runs in an isolated world).
- Lab pages per area: `twa-lab.html`, `twb-lab.html`, `twb-folk.html` (every
  crew figure), `crw-lab.html`, `hrd-lab.html`, `bst-lab.html`, `cas-lab.html`,
  `scn-lab.html`, `fx-lab.html`, `map-lab.html`, `apron-lab.html` (the landscape beyond the board at phone/tablet/desktop layouts), `icon-lab.html` (the app icon), `hud-lab.html`, `wdn-lab.html`.
- `props-lab.html`: every object a hall puts OUT into the world (traps,
  logs, stoops, the war-eagle, shots, soldiers and blades), zoomed on the
  road through the real draw(); `?only=traps,logs&zoom=1|2|3`. Deeper sheets:
  `logs-lab.html` (angles and spins), `birds-lab.html` (a stoop moment by
  moment, every hawk pose), `blades-lab.html` (every Covert form on three
  grounds), `raise-lab.html` (every hall through each kind of raise; `?how=all&board=1`),
  `rings-lab.html` (each area effect through its life at zoom 1
  and 3; `?fx=frostnova,slam`, `?perf=1` times each ring).
- Always take a BEFORE shot, then judge at 1x board size (what the player
  sees) as well as zoomed. Never launch Chrome from a shell — it trips a
  macOS security prompt; use the app's browser pane.

## AI-generated art (Gemini / Nano Banana)

Everything animated stays drawn in code so frames stay consistent. If
painted images are ever used, they suit backdrops and key art; the prompt
guide is `art/GEMINI-PROMPTS.md` and the per-sprite sizes are in
`art/DESIGN-BRIEF.md`.
