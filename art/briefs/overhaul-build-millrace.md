# The overhaul, built: Millrace first (2026-11-22, owner: "they look good, lets build")

ONE Greenwood board, Millrace, gets every approved look together so the owner can play it before
any other board is touched. Every other board must stay pixel-identical and sim-identical: the new
look sits behind a per-realm switch. The owner's picks are in `art/briefs/overhaul-round2.md`
(read to the end); the approved pictures are the concept painters in `concept/overhaul2-*.js`,
`concept/overhaul3-lakes.js` and their `.md` notes. Farmland and terraces are PARKED: not built.

Millrace is Greenwood level 4: it plays under the MORNING sun (east; shadows fall left). Free Play
can give it any of the seven suns or the Blood Moon. Check every feature under morning, golden,
sunrise, noon and the Blood Moon, not only noon.

## 1. The switch

- Data (lead): `look: "overhaul"`, `season: "summer"` on the `millrace` realm
  (`src/data/realms-greenwood.js`). No engine module reads them. Do not set `wood:`.
- Registry (lead): `src/render/overhaul/index.js` exports `ovhOn = () => REALM.look === "overhaul"`
  and the slot table `OVH`; builders fill slots with `register(name, impl)`. Slots:
  `frame(g)`, `ground(ctx, kit)`, `groundMarks(ctx)`, `bakeWater(ctx)`, `waterLive(ctx, g)`,
  `openWater(x, y)`, `bridgesBack(ctx, g)`, `bridgeFronts(list, ctx)`, `deckLift(x, y)`,
  `drawnSpans()`, `owns(d)`, `drawDecor(ctx, d, t)`, `shadowItem(d)`, `shadowExtras()`,
  `drawables(list, ctx, g)`, `over(ctx, g)`, `apronRiver(ctx, rv, rect, k)`, `key()`.
  Each slot's DEFAULT calls today's function, so with only the stubs Millrace is still
  pixel-identical and every builder has a working board from the first hour.
  Overhaul modules may import world.js, scenery.js, pix.js but use them only inside functions,
  never at module load (import cycles).
- Seams in shared files (LEAD ONLY; each is `ovhOn() ? OVH.x(...) : <today's call unchanged>`):
  world.js `groundLayer` (cache key + `OVH.key()`; after `paintTurf`: `OVH.ground`, `OVH.groundMarks`;
  `bakeWater` -> `OVH.bakeWater`; shadow items + `OVH.shadowExtras()`; the hem off under ovh);
  draw.js (`OVH.frame(g)` at the top; `drawWaterLive`; `drawBridges` -> `bridgesBack`; `bridgeLift`
  -> `deckLift`; after the DECOR loop `OVH.drawables`; `pushBridgeFronts` -> `bridgeFronts`; today's
  butterflies off; after `dayOver`: `OVH.over`); scenery.js (`drawTree`, `decorShadowItem`: `if
  (ovhOn() && OVH.owns(d))`; today's bridge cast off); builders.js (`bridgeLift`); weatherfx.js
  (`drawnSpans`); daygrade.js (water test -> `OVH.openWater`); apron.js (`drawRiver` -> `apronRiver`).
- Nothing in the game imports from `concept/`. Painters are COPIED into `src/render/overhaul/` with
  lab-only globals stripped. The concepts paint over a finished frame; the game bakes into
  `groundLayer` BEFORE the cast shadows (so shadows land on the new art), sorts standing things by y
  with the actors, and a frame only blits. Dropped: the labs' `duskShade`, `grade()`, night multiplies
  (the game's own daylight / blood moon do that).

## 2. Features

**Water and banks** (B1: `overhaul/field.js`, `water.js`, `waterlive.js`, `waterlife.js`)
- Baked: a signed-distance field at 1 unit from terrain's own river segments and widths (freed
  after the bake), then a colour pass per sun into the ground: depth ramp, bed, bank faces lit from
  `DAY.L`, lip, quay coping. The waterline is where `riverPast` = 0; bank faces lie INSIDE the water
  band (land stays where halls stand; side faces ~2.7 units, north faces at most 6.5).
- Edges (owner: one main kind a stretch, little mixing, no shingle). Foxwater: cut bank outside its
  bends, reeds in the slack, quay near the bridges, grassy lip elsewhere. The race: stone quay by the
  mill, lip below, cut north bank; a weir on the race.
- Per frame: flow dashes as sprite stamps along sampled lanes, foam at face feet, weir churn strip,
  reed / lily sprites (4-6 frames), rings, ducks, a heron. Target 0.2-0.4 ms, sprites under 1 MB.
- A baked "water shade" (cast-shadow pixels clipped to water) multiplied over the live layer.
- Storm puddles and floods stay weatherfx's. No lake on Millrace, but the field takes "bodies" so
  lakes / ponds plug in later.
- Publishes `waterDist(x, y)` and `openWater(x, y)` FIRST (others build against them).

**Bridges** (B2: `overhaul/bridges.js`)
- Foxwater south span (across, row 9): the toll trestle. The race's north span (row 1.6): the mill
  trestle with its sluice. The race's up-screen span (column 7.2): the farm trestle (it crosses on a
  skew the concepts never drew: fallback is today's bridge updated).
- `art/briefs/bridges-upscreen-rule.md` is the law. Baked once per sun: a back layer (gloom, thrown
  shadow, piles, strips, deck) and y-keyed front strips. Per frame ~2 blits a span + wakes, banners,
  lantern flames, sluice falls. `deckLift(x, y)` = the plateau profile (walkers, builders, skiffs);
  `drawnSpans()` = the span lengthened by its ramps. Lanterns `noteLamp` while `nightOn(g.time)`.
- Spans (`BRIDGES` d0 / d1) are NOT changed: ramps extend in the drawing only.

**Trees, wood edge, sway, wildlife** (B3: `overhaul/trees.js`, `wood.js`, `sway.js`, `life.js`)
- Every DECOR `tree` / `pine` / `willow` in treatment 4 (`TREAT.final`): five fills, layer orders,
  ONE welded trunk-bough-root body, four root flares, no dead limbs, few sticks under pines, no
  leaf litter under evergreens. `tree` maps by hash to round oak / oak / beech / hawthorn / birches;
  `willow` = the approved strand willow. Baked with the true sun, `shadowItem` `mirror: false`.
- Trunks never move (footprints unchanged). A crown must clear the lanes (crown centre at least
  `PATH_HALF` + 0.9 x crown radius from the road): shrink the crown (0.85, then 0.72), never move
  the trunk. A hall or build ghost behind a crown gets a dithered half-alpha crown (`OVH.frame(g)`).
- Wood edge (FOREST, left edge): treatment 4, cool deep interior; at most ~24 distinct sprites.
- Sway: 3-4 whole-pixel poses, lone broadleaves and willows only (~5 MB). Wildlife: deer, rabbits,
  a squirrel, songbirds by day; fireflies and the owl at golden hour and under the Blood Moon;
  creatures flee within ~60 units of a foe. Summer only for now.

**Village, decor, lights** (B4: `overhaul/decor.js`, `lights.js`)
- The approved farm (`concept/overhaul2-decor-gw.js`, Millrace's farm option): barn, farmhouse, hen
  house, well, haystacks, fences, garden, on the Foxwater's east bank. Rocks by the rock rule (stacked
  loaves, nothing pointing at the camera). Sprites y-sorted through `OVH.drawables`. A light in every
  lived-in place: warm windows at late / golden, `noteLamp` at night. Hens, cat, smoke, washing live.
  Today's watermill stays.
- The farm blocks building: a realm `blocks` ellipse list read by `buildableAt` (lead adds it).

**Ground and apron** (B5: `overhaul/meadow.js`, `overhaul/apron.js`)
- The calm meadow, strength 1 ONLY, repainted into the ground before `paintRoad`: big masses, two
  tall-grass stands, one flower drift, a trampled verge, damp turf at the water. Nothing per frame.
- Beyond the board: `apronRiver` runs B1's water painter over the apron strips; meadow masses use
  world-space noise so they run past the edge without a seam.

## 3. Engine truth (do not break)

The engine reads `RIVERS` segments and widths (`inRiver`, `riverPast`), `atWaterEdge` (`DOCK_EDGE`
8), `RIVER_ROUTES` / `patrolOf`, `underBridge`, `BRIDGES` d0 / d1 (barricades, floods), DECOR
positions and footprints, `forestDepthAt`. **River courses, widths and bridge spans stay exactly as
they are for this build** (art only): the water will read a little narrower than the concept
panels, which widened it. Widening is a later step, after the owner has played.

## 4. Rules for every builder

- Own ONLY your files in `src/render/overhaul/`. Shared files belong to the lead: need a seam?
  Report the exact line, do not edit. Never run git commands that change anything. Never search
  outside the repo. `node --check` after every edit (one syntax error breaks the shared dev server).
- Noon and every other realm must stay pixel-identical: all your code runs only through `OVH` slots.
- Pixel-art discipline (`art/STYLE-GUIDE.md`): art pixel = 0.5 board unit, stepped edges, dithers,
  the tinted one-pixel line; no soft gradients on sprites. Light from `DAY` (`src/data/sun.js`).
- Phones: bake once per sun, drop bakes on `onDay`; no per-frame getImageData; report MB and ms.
  New bakes at most 25 MB in all (your share is in your task message).
- Look at your work in `ovh-millrace.html?sun=<id>&tag=<prefix>` (the lead's lab; saves
  `.shots/ovhb_<tag>.png`); dev server http://localhost:5173 (never restart it; if down, say
  BLOCKED). Your own browser tab; if the tab cap refuses, say so and work from the saved PNGs.
  Crop / shrink with `sips` before reading. Delete scratch PNGs.
- Report: what you built, slots registered, cost, shot paths, every weak spot plainly
  ("NOT CHECKED: ...").

## 5. Checks before the owner sees it (lead)

Identity (every other realm x sun unchanged); `node scripts/sim.mjs --level millrace --endure`
(identical with `blocks` off; new numbers recorded with it on); frame time at most ~+1 ms against
today's Millrace; bake memory; a look at morning, golden, sunrise, noon, storm, fog, Blood Moon.

## STATUS (the lead keeps this current)

- 2026-11-22: brief written; seams and stubs next.
- 2026-11-22: **seams and stubs are in** (hashes of 18 realm x sun cases, Millrace included, and the
  millrace / gw1 sims identical to before). The slot CONTRACTS are the comments in
  `src/render/overhaul/index.js` (read them: arguments, bake vs frame, returns). `OVH.flags`
  (`hem`, `butterflies`, `bridgeCast`; true = keep today's; set false in your module to remove
  today's piece once yours replaces it). Each builder's entry module already exists and is imported
  by `overhaul/all.js`: `water.js` (B1), `bridges.js` (B2), `trees.js` (B3), `decor.js` (B4),
  `meadow.js` (B5); add your other files beside it and import them from your entry module.
  `owns(d)` is ONE slot shared by trees and decor: do not `register("owns")` directly; export
  `ownsTree(d)` / `ownsDecor(d)` etc. and the lead wires the combined slot (same for `drawDecor`,
  `shadowItem`, `shadowExtras`, `drawables`, `over`, `frame`, `groundMarks`, `key`: every slot that
  more than one builder needs is combined by the lead in `overhaul/wire.js`; register directly only
  the slots that are yours alone: B1 `bakeWater`, `waterLive`, `openWater`, `apronRiver`; B2
  `bridgesBack`, `bridgeFronts`, `deckLift`, `drawnSpans`; B5 `ground`). Until the lead wires a
  shared slot you may register it yourself to SEE your work, but report it so it can be moved.
  Labs: `ovh-millrace.html?sun=&weather=&blood=1&x=&y=&w=&h=&zoom=&frames=&dt=&perf=1&tag=`
  (saves `.shots/ovhb_<tag>.png`), `ovh-identity.html?tag=` (other realms unchanged).
  Known gaps to mind: the apron has its own hem bushes (`boardBush`); atmosphere.js `drawAmbient`
  (leaves, fireflies) is not gated; waterreach.js paints the River Watch's lit water with today's
  geometry; skiffs sort under a span by `underBridge` (the engine's span, not the drawn ramps).
- 2026-11-22 (late): **all five builders in, wired (`overhaul/wire.js`), checked by the lead**: morning, golden,
  Blood Moon looked at; other realms' hashes unchanged; sims run; 4.3 ms a frame (2.9 before). Awaiting the
  owner's look. Weak spots are listed in CLAUDE.md, "The overhaul, built".
