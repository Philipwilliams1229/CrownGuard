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
| Greenwood horde (goblins, orc, Ironclad, troll, shaman, necro, warchief) | `src/render/rigs-horde.js` | shared bending skeleton, 4-frame walk, four-frame fight (`fightN: 4`: guard, wind-up, strike, follow-through; the casters gather, raise, release, recover), sized per rig by `wind`/`follow`/`drive`; joint set `hrd` |
| Beasts (wolf, boar rider, bat, dragon, wolf rider) | `src/render/rigs-beasts.js` | beast lope; rider reuses the horde goblin |
| The crown's soldiers (knight, paladin, berserker, champion, militia, the heroes Aldric, Wren, Osric, Hale, Ysolde) | `src/render/rigs-crown.js` | upright human skeleton; four-frame fights (guard, wind-up, strike, follow-through; a bowman: full draw, loose, reach, nock) for every rig in `CROWN_FIGHT_FRAMES`, picked off the attack clock by `fightFrame` in enemies.js; `grip()` holds each weapon within reach, two-handed hafts by both fists; joint set `crown` |
| The Iron Kingdom's foot (levy, crossbowman, knight-sergeant, battle chaplain, Lord Marshal) | `src/render/rigs-iron.js` | upright human skeleton; `irn-lab.html` zooms chosen frames beside the crown's soldiers; four-frame fights (`fightN: 4`; the crossbowman's is a shooting cycle: ready, aim, loose, reload); joint set `irh` (its `analyse()` prints folds, wrists and box spill) |
| The Iron Kingdom's mounts and engines (cavalier, gryphon knight, siege ram) | `src/render/rigs-ironmounts.js` | gallop, wingbeats, six turning wheels; `irm-lab.html` |
| The Hollow Court's dead (risen, barrow archer, plague ghast, crypt warden, gravecaller, Hollow King) | `src/render/rigs-hollow.js` | the horde's bending skeleton with real bones; `hlw-lab.html` (on fen and road); four-frame fights (`fightN: 4`; the barrow archer nocks, draws, looses and reaches — its draw arm is a `flip` with the upper arm foreshortened, `o.short`); joint set `irh` |
| The Hollow Court's beasts and spirits (ghoul, wraith, grave amalgam) | `src/render/rigs-hollowbeasts.js` | `hlb-lab.html` |
| The newer heroes' effects (Osric's rings and blessed ground, Hale's pike hedge and levy pennant, Ysolde's bolts and thunderhead) | `src/render/heroes/<key>.js` (hooks: `pose`, `under`, `fx`; `src/render/heroes/index.js`) | one file per hero; its engine twin is `src/engine/heroes/<key>.js`. Aldric's and Wren's effects stay in `rings.js` / draw.js |
| Storm clouds (Ysolde's Thunderclap thunderhead, the Wizard Spire's Tempest Court and Thunder Sovereign) | `src/render/stormcloud.js` (`stormCloud`, `stormShadow`, `stormSpots`, `stormBolt`, `CLOUD_PALS`) | shaded pixel by pixel and baked (cached sprites, a few churn frames, capped cache); light from the upper left, a flat dark belly, billows with creases, an ink ring, translucent wisps the ink never outlines; lightning lights it from inside round a spot. The Spire's clouds hang BEHIND the hall's top (no headroom above the Sovereign's ring in a hall's cell); the tray portrait still frames only ~64 above a hall's base, so the Sovereign's ring and cloud are cut off there |
| Anything not in the files above (the generic rig) | `src/render/rigs.js` | entries in the rig files above override these |
| Tower crews (archer, engineer, mage, priest, smith, falconer, bombardier, musketeer…) | `src/render/folk-kit.js` (the body: head, torso, `legs`, `arm` with its elbow solver, timing helpers) and one file per crew: `folk-archer.js` (eight key poses; `ARCHER_FRAMES` / `drawArcherFrame` name every frame the halls and the castle's bowmen stamp; each pose's `back` puts the string arm wholly behind the head or wholly in front, see "Limbs and layers" — the lab can't judge that, look), `folk-casters.js` (mage, priest — their poses are joint-target tables and their timing lives there too: `MAGE_CYCLE`/`magePoseAt`, `mageIdlePose`, `mageBreathPose`, `priestPose`/`priestLight`; the halls only pick frames through them), `folk-workers.js` (winch crew on its crank circle `CREW_FRAMES`/`crankAt`, the smith's blow `SMITH_FRAMES`/`smithHammer`, standers `STANDER_FRAMES` with a spyglass option, the wall's halberdier `HALBERD_FRAMES`/`HALBERD_WALK` and mason `MASON_FRAMES`), `folk-gunners.js` (bombardier/alchemist `bomberFrame`/`bomberCharge`, musketeer `musketFrame`/`musketMuzzle`, falcon-mistress `mistressFrame`/`mistressGlove`, hooded blade `hoodedFrame` — the halls place fuses, flasks, flashes and birds from these, never at fixed offsets); `folk.js` re-exports them all and keeps the build crew | the new body: slim, jointed arms, small hands, each limb one inked part (`limb2`); joints per "Joints and motion" |
| Crew headwear (the trade on every head) | `src/render/folk-kit.js` `hat(ctx, x, y, kind, pal, o)` — kinds in `HAT_KINDS`: `"falconer"` (bycocket, barred hawk feather, braid; `o.plume`), `"wrap"` (the Covert's skull wrap and face scarf; `o.tails`, `o.maskCol`), `"grenadier"` (the bombardier's fur cap, bag and grenade plate; `o.bag`), `"chaperon"` (the alchemist's roundlet) — and `cap()` (smith, hod carrier, setter; the musketeer's broad hat with `wide`/`tall`); `folk-workers.js` `engineerHead` / `clerkHead` / `watchHead` (drawStander's `o.hat`: `"beret"` or `"kettle"`) | drawn over a bare head (`head(..., { hood: false })`) at the same point inside the same nod, so it rides every tilt (folk-gunners.js `onHead`). Sweep options turn a piece about its root the way the head tilts: + lifts what trails back, − lays it flat. Rules in "Crews' headwear" |
| Halls (towers) | `src/render/halls/<kind>.js` | helpers in `buildkit.js` and `halls/kitB.js` |
| Scenery (trees, rocks, spawn mouth, sign) | `src/render/scenery.js` | decor baked per type; `IRON_ART.flat` / `HOLLOW_ART.flat` list pieces baked without the 2px ring |
| The gate's crag (the hill the Greenwood/old realms' cave is cut into) | `src/data/gatecrag.js` (`gateCrag`, `hillAt`, `cragBlocks`) | pure data: scenery.js paints from it AND `buildableAt` refuses halls on it — change its shape only here, then scan that no buildable point lies on opaque gate pixels |
| Weather (every zone) | `src/render/weatherfx.js` (the painters, keyed by kind; `drawWeatherGround` for the ground half — puddles, scorches, a rock's shadow — called in draw.js right after the cloud shadows; the toast, hall fires, daze stars) and `src/render/weatherbake.js` (every bake: noise, stepped dither layers, sprites — done once per realm in idle slices) | read-only on game state; one full-board layer per kind, near rain/snow as sparse stamps; check with `wfx-lab.html` (`&weather=kind:strength`, `&bench=N` frame cost, `&burn=N`, `&daze=1`) |
| The Rime Clans (zone IV) | `src/render/rigs-rime.js` (thrall, huscarl, berserker + `berserkerRage`, rimeseer, skald — chant sheet at walk 4-7 — rimejarlfoot, and the exported seated `rimeJarlRider`; joint set `rime`), `src/render/rigs-rimebeasts.js` (rimerider, rimewolf, frostgiant, icedrake, the mounted `rimejarl`, seaserpent, kraken, krakenarm; joint set `rmb`) | the sea monsters' extra frames are walk-sheet strings (`"sub.0-3"`, `"surface.0-3"`, `"dive.0-3"`, `"rise.0-3"`, `"grab.0-3"`, `"sink.0-3"`); `drawSeaRig(ctx, e, g)` maps engine/serpent.js's state to them (waterline at e.y + 4) and rimefx.js's `drawSea` calls it; `armSinkFx` / `krakenSinkFx` paint the sinks; `drawSeaHold(ctx, m, g)` draws a tentacle or the serpent coiled round whoever it holds (baked, cached by offset; the arm's standing rig is skipped while it holds; serpent humps use `hold.0-3`), `drawKrakenDeepRig` the submerged kraken's dim shape (`deep.0-3`); a seized unit or foe is lifted ~2.5 px and wriggles (render/enemies.js) |
| A chapter's own scenery: the Iron Marches, the Hollowfen, the vale's later pieces | `src/render/scenery-iron.js` (`IRON_ART`), `src/render/scenery-hollow.js` (`HOLLOW_ART`), `src/render/scenery-vale.js` (`VALE_ART`: menhir, stonefall, trilithon, watermill, cottage, boat, netrack, creels, marram, thistle, skeps, haywain) | one registry each — `decor` painters, `live` types, bake `box`, ground `dress`, `spawn` gates (REALM.spawn), `turf`/`road` art keyed by REALM.groundArt, and `apron` (the landscape's mix). scenery.js, world.js and apron.js read them LAZILY (they import scenery.js back — never read a registry at module load). Lab pages `irs-lab.html`, `hfs-lab.html` |
| Ground (turf tone map, grass, the wood's hem) | `src/render/world.js` (+ `groundblend.js` round halls) | one layer baked per realm, in order: tone map + turf → chapter turf art → `paintRoad` → chapter road art → `bakeWater` |
| The road (dirt, ruts, chevrons) | `src/render/road.js` — `paintRoad` (the board), `paintRoadStrip` (the apron's road, run in the direction of march), `drawRoadMarks` (chevrons, live) | the Iron and Fen chapters pave over it |
| Rivers and ponds | `src/render/water.js` — `bakeWater` (bodies, into the ground layer), `drawWaterLive` (current, glints, foam: stamps only), `drawRiver` (standalone, for the apron), `drawPond` | |
| Bridges | `src/render/bridge.js` — `drawBridges`, `bakeBridges` | one sprite per span per realm |
| The sea and beach | `src/render/coast.js` — `coastPixel` (per pixel, for world.js and the apron), `paintShore`, `drawShoreLive` | |
| Castle | `src/render/castle.js` (+ `wallDrums`/`wallSlots`/`ballistaSpots`/`TOWER` in `src/data/castle.js`) — a CONCENTRIC castle running off the board's edge: the outer curtain and its walk (the works' crews), the higher inner curtain behind it (its walk — the sentry's beat — and its far parapet cut by the edge, with stairs going down off it), SQUARE open-topped towers built into both walls (see "The castle" below), and one gate block through both walls with the north gate tower rising out of its north end and the KEEP out of its far end (crown banners down its face, red turret, chimney, royal standard). No yard, no houses. Ballistae and spare bowmen stand ON the towers' decks; `drawCastleGround` (called from draw.js under the foes) lays the realm's worn apron, footing stones and a cobbled threshold into the gate; `bakeCastleRun(ya, yb)` paints the same castle past the board's top and bottom for the apron; live bits: banner ripple, a pacing sentry, birds, chimney smoke, torches/braziers | baked per damage tier; ground once per board |
| Combat effects, projectiles, ground pools, coin pops, status tells | `src/render/fx.js` | painted pixel by pixel once, stamped |
| River Watch skiffs (a musketeer in the bow — the Powder Works figure — and an oarsman facing the stern) and their musket shot | `src/render/rigs-skiff.js` (`skiffGunPose` off the attack clock, `skiffRowFrame`, `skiffMuzzle` for the engine via `muzzles.js` `skiffShotFrom`; drawn by `drawSkiff` in enemies.js), `src/render/musketfx.js` (`drawMusketShot`: flash, ball, knock, smoke; `fire` for the Fireships) | frames baked per crew colours / gun pose / stroke; joint set `skiff`, lab `skiff-lab.html` |
| The River Watch's area of control (its water lit, the skiffs' reach rings and carets, wakes kept to the water) | `src/render/waterreach.js` — `waterMask` (which art pixel is which river / pond / sea, and under a deck), `warmWaterReach` (the idle-time bake, from draw.js), `drawWatchWater` (`"tint"` with the water, `"edge"` after its live marks), `drawSkiffReach` / `drawSkiffMarks` / `drawWatchStation` (rings, carets, the build ghost's station), `fillWet` (a wake, ripple or splash on open water only), `clipToWater` (a fixed box: the hall's piles) | its river bank and pond shore MIRROR water.js's `riverField` / `edgeOff` / `pondG`, the sea's world.js's `coastLine`: change the edge in both. Rules in "The River Watch's reach"; lab `skiff-reach-lab.html` |
| The Powder Works' charge and shrapnel | numbers: `gunpowder` in `src/data/towers.js` (`dmg`, `frags`, `fragDmg`, `fragReach`, `fragBurn`, `crack`, `spot`); engine: `burstCharge` / `fragVictim` / `pierceStrike` in `src/engine/update.js`, the skill tree's perks on the shards in `engine/towers.js` `withPerks`; look: `BLAST.keg` and `drawProjectile` kind `"frag"` in `src/render/fx.js`; the hall `halls/gunpowder.js`, its two men in `folk-gunners.js` | the look under "Rules for halls"; the mechanics and measurements in `CLAUDE.md` "Balance and testing"; judge a change with `node scripts/bench-hall.mjs` (one hall, a steady stream, the real engine) |
| Dragonbreath's flamethrower jet (from `breathMouth(t)` in halls/wizard.js) and the Inferno Throne's burning ground (g.grounds kind "fire") | `src/render/flames.js` | baked tongues and frames stamped along the jet and the engine's damage cone; world coordinates |
| A hall rising when bought, levelled, branched or ascended | `src/render/buildanim.js` — `drawRaising(ctx, t, time, paint)`, driven by `t.raised = { at, how, prev }` (set in actions.js `markRaised`); a build's clock and lines are one cached `buildPlan(t)`, its length `raiseSecs(t)`; `src/render/buildcut.js` cuts the hall into pieces; `src/render/builders.js` is the crew | build: a timelapse — builders run out of the castle gate in a straight line (nothing touches them) to a staked plot, the scaffold goes up, the hall is set piece by piece (cut from its own picture along its ink lines: walls course by course under a climbing platform, then the fittings, then the trim), the person is put in last, the scaffold comes down plank by plank and the crew runs home. The hall holds its fire until its person is in (the engine reads the same clock: `src/engine/build.js` `buildClock` / `isBuilt`, `t.readyAt`), and is drawn at rest (`REST`) until then, so combat mid-build never breaks a hand-over; a hall reworked while it goes up keeps its build (`t.raised.build`, actions.js `markRaised`) and the rework's own raise plays once the scaffold is down; beside the castle the ladder side flips to the left. The cut runs a few ms a frame during the crew's run (`pumpCut`). Tune it with `BUILD` in `src/engine/build.js`. level: a mallet and a squash-and-stretch pop; branch/ascend: a gold light column and a bounce. Scales round to whole art pixels; the pieces and the person are snapshots taken at the very moment they hand over to the live hall, so it never jumps (`raise-lab.html?how=build` reports each hand-over: 0 visible pixels). Form sizes are measured via `drawTowerPortrait` — a new hall kind needs a portrait too, and must honour `noFolk` (below) |
| The build crew (three workers who run out of the castle gate to raise a new hall: a hooded mason with a mallet, a hod carrier, a setter) | `src/render/builders.js` (`builderDrawables(ctx, t, time)`, called by draw.js for every building hall; timing and posts from `buildPlan`); the figures are `drawWorker` / `BUILDER_FOLK` / `WORKER_POSES` in `folk.js` | every frame baked and mirrored once (warmed in idle time, `warmBuilders`), then stamped; they run in straight lines over anything (nothing on the board touches them), wade through water (cut at the waterline, foam rings), ride up on bridges (`bridgeLift`), step out of and back into the gate arch (the castle is drawn over them). The mallet strokes follow the pieces landing (at most one per `STROKE`). Checked in `crew-lab.html` |
| Area effects: novas, waves and marks (frost/fire nova, Shield Slam, heal & ward waves, silence, shadowstep, Midas, toll, plague burst, raise, the Heartseeker reticle) | `src/render/rings.js` — `drawRingFx(ctx, fx, a, g, layer)`: draw.js calls it with "g" in the ground pass (rime, scorch, cracks, stains under the crowd) and "a" after the actors | pieces (shards, flames, clods, coins, runes) baked once and stamped on the LIVE radius, so a ring still shows the area it hit; at most one thick continuous ring each — thin full-circle `ringPx` lines are the costly part, so highlights are dotted |
| The Trapsmith's traps (spikes, jaws, caltrops, mines, aerostat balloons) | `src/render/traps.js` — `drawTraps` (on the road, under the crowd) and `drawTrapBalloons` (the balloons, in a sky pass over it) | each look baked once per realm and stamped; late boards hold hundreds |
| The Log Roller's logs (trunk, Iron Drum, Powder Keg) | `src/render/logs.js` | true cylinders in the 3/4 camera, lit in world space so light never turns with the log; bark and bands roll with `lg.spin` |
| The Falconry's hawk (the "talon" stoop) | `src/render/birds.js` — `drawStoop`; the Skyknight's war-eagle is the `eagle` rig in `rigs.js` | hawk poses baked at 15° steps per plumage (`kind`: hawk, the King's Eagle, the Storm Falcons) and stamped. A cast bird leaves her glove (Talon Rain's others their places on the wheel), follows its prey down and the talons — and the damage — land `STOOP_HIT` ms in (update.js `resolveStrikes`), then it flies back to its own place on the wheel by `STOOP_LIFE`; the hall hides it meanwhile (`t.falconsAway`) |
| The Covert's blades (assassins) — four-frame fights (`fightN: 4` on their RIGS entries: guard, wind-up, strike, follow-through; a blade waiting at the muster crouches in its guard), joint set `cov` | `src/render/rigs-covert.js` (`assassinUnit`, `assassinUnitA/B` for the branches and `assassinUnitAA/AB/BA/BB` for the four finals in `rigs.js` — one rig name per look, since baked frames cache by name; `drawAssassinUnit` in `enemies.js` picks it) | params switch the pieces on: face "gild", hat, veil, beak, long, hem, censer, purse, scroll, pauldron, blade kind |
| HUD skin | `src/ui/hud/` (`hud.css`, `icons.jsx`, `Chips.jsx`) + `src/ui/theme.js` | |
| The tower edit menu (banner, targets bar, upgrade tree) | `src/ui/TowerEdit.jsx` (pictures) + `towerPanel` in `src/CrownguardGame.jsx` (actions) + `hud.css` "the tower edit menu" | the tray turns into it when a tower is selected; layers (`cg-drop`, `cg-layer`) slide down in hard `steps()`; rules in `CLAUDE.md` |
| Type: every font family, the type options, canvas fonts | `src/ui/fonts.js` (`TYPES`, the roles' CSS variables, `canvasFont`, `typeEpoch`); `src/ui/theme.js` re-exports the roles | nothing else names a font family; see "Type (HUD)" |
| The landscape beyond the board (the apron: ground, road and rivers running off, the realm's trees thickening, the wall continuing) | `src/render/apron.js` `paintApron(canvas, { cssW, cssH, dpr, board })`; the wall past the board's ends is castle.js `bakeCastleRun` (towers at the board's rhythm, no seam), never a repeated slice | painted once per realm and layout, cached |
| Campaign map / title screen | `src/ui/mapArt.js`, `src/ui/titleArt.js` (`vistaStages`: the vista in named stages) | painted once, cached; see "The campaign map" and "The title screen" |
| Title-screen crowd and castle life (walkers, guards, the hay-forker; banners, sentry, smoke, torches, birds) | `src/ui/titleCrowd.js`, placed from `ROAD`, `ROAD_W`, `HAY` and `CASTLE_LIFE` in `titleArt.js`; the vista castle matches the board castle (square open-topped towers, red stair turrets, blue crown banners, cobbled threshold) | a second canvas with the vista's own fit, ~30 fps, paused when hidden |

Status tells (`drawStatus` in fx.js) must tell the holds apart at 1x:
slow = a dizzy star wheel over the head (more stars and a lazier turn as
`slowPct` rises), freeze (`frozenUntil`) = an ice shell sized by the rig's
body (`bodySpan`), stun = a jagged gold ring that shakes. Freeze beats
stun, either hides slow's stars, and an immune foe (`immSlow`/`immStun`)
shows none. Check them in `status-lab.html` (sheet, film strip, perf).

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
- **`t.noFolk`: every hall can be painted without its people.** The build
  lays the hall first and puts the person in last, so `drawTowerPortrait(ctx,
  { ...t, noFolk: true }, time)` must paint the hall exactly as usual minus
  its crew, animals (hawks, imps) and everything they hold or give off (the
  orb and its glow, a halo, a vial, a muzzle flash). Guard the STAMP, never
  the bake: the people are baked into caches, so a bake must never read
  noFolk and no cache key may hold it. Check with
  `raise-lab.html?how=folk` (as it stands | noFolk | the difference).
- **Bake** the body once per form (the `baked()` / `stamp()` pattern in
  `halls/archer.js`); only flames, glows, flags and firing poses are live.
- Engine spawn points must match the art: every shot starts at its weapon
  (owner, 2026-09-28: "projectile effects originate from the end of the
  barrel, the bow, or the mage staff"). `src/engine/muzzles.js` holds them
  all — each archer's bow hand, the Ballista's nose, the mage's staff head
  (orb and lightning), the musket's muzzle (the ball then flies from there
  through its mark), the bombardier's and alchemist's throwing hand, the
  Midas Cannon's muzzle, the wall bowmen, Wren and her archers, the foes'
  crossbows and bows, the falcons' glove and wheel — computed from the
  figures' own pose functions (render/folk-*.js are pure maths, safe in the
  sims). Catapult stones leave the arm tip, the Sunforge beam the shard. If
  a hall or a pose moves, move its entry there and check with
  `shotlab.html`.
- A hall with two crew who aim on their own never turns as a whole (owner,
  2026-09-28: the Powder Works "spins left and right" when the whole store
  was mirrored to each shot, and snapped back when idle). Its building keeps
  one facing for good (`powderHome`: toward the road it watches) and each
  man faces his own last shot and HOLDS it when the fighting stops
  (`bomberFacing`/`musketFacing` in muzzles.js, off `t.bAim`/`t.mAim`).
- The Powder Works' charge ends in a tight pop, never a blast ring (owner,
  2026-09-29: "a small explosion" on the one foe it hits): `BLAST.keg` in
  `render/fx.js` — a white-hot knot at the mark, a few short rays, a small
  smoke puff, a ~9 px soot mark. The spread is its shrapnel, and every shard
  is a real shot (`drawProjectile` kind "frag"): four cuts of iron sliver
  baked once per heading (32) and stamped from a plain array (no key
  strings, no gradients — a late board has hundreds in the air). The inked
  body alone read as a grey pellet on the road at 1x, so the ends go on
  AFTER the ink — a cream point that sticks out past the outline and a torn
  tail — with a full-strength cream streak behind (red-hot for Dragon's
  Breath). They fly at the blast's height and drop as they slow; a foe a
  shard strikes shows the white `spark`.
- **Anything that swings or wheels at a figure's head height** (a censer, a
  wheeling bird, a sling) goes BEHIND the figure, its path clears the
  headwear at the ends of its swing, and its colour stays off the
  headwear's and the figure's props. The warden's censer (halls/warden.js)
  is drawn before him, a true pendulum (chain 9, ±1.1 rad, rising at the
  ends), in dark bronze `#a07a3a`, never the gold of his mitre or of his
  staff's charm.
- **The Falconry's wheel** is `wheelAt` in `src/engine/muzzles.js`, which is
  also where a cast bird leaves from and flies home to: change the wheel
  there and nowhere else. It wheels clear ABOVE the mistress's hat (`my - 39
  + sin × 5`: a bird stands 4.5 above and 4 below its centre, her hat and
  plume reach `my - 29`); at face height it crossed her face. Every wheel
  bird is drawn UNDER her, her glove and the bird on it, so nothing swaps
  layers mid-pass.
- **The catapult's arm cocks above the engineer** (halls/catapult.js
  `spec`): his head lies on the arc the arm's tip sweeps and the footprint
  has no room to move him, so the mangonel cocks at −72° (−66° at level 1)
  and the trebuchet at −102°, its tip out past his back and high. The arm is
  drawn in 6° steps (`round(a / 6) × 6`), so a cocked angle is a multiple
  of 6. The trebuchet's sling hangs 7 from the tip, stone in the pouch,
  while it winds and while it waits (laid in a trough on the bed, its rope
  ran through his head). The winch and trigger ropes take the arm at
  `ROPE_AT` (0.4 of its length) and lean in, leaving air before his face.
  The stop angle, pivot and arm length set where the stone leaves (update.js:
  14 / 35 + level, the trebuchet 20 / 50): leave them alone.

## Joints and motion (the September 28 pass)

The owner: "towers have weird and not fluid animations ... the arms bend in
ways that would really hurt an actual person." Every figure — tower crews,
builders, soldiers, the horde — keeps to a real body's limits, and every
action moves like one. Measure, don't eyeball: `joint-lab.html?set=<set>`
draws each pose plain and again with its bones over it, green / amber / red
against the limits below (sets in `joint-sets/`; the crews log their joints
through `logJoint` in `src/render/folk-kit.js`, which `arm()` and `legs()`
call for you — a bespoke limb logs its own). Nothing ships red.

**The limits** (side view, the figure facing +x):
- **The elbow folds one way.** The forearm swings forward and up off the
  upper arm: a hanging arm's elbow points BACK, an arm raised in front has
  its elbow down and forward, an arm overhead has its elbow forward of the
  head. Never forward-pointing on a hanging arm, never "up" on an arm
  reaching forward — that is a knee, and it reads as broken. It folds at
  most ~145° and straightens no more than a hair past straight.
- **Out to the side is the one exception** (`flip` in `arm()`/`elbowFor`):
  an arm raised out sideways shows its elbow reversed in profile — the
  string hand at full draw (elbow back at shoulder height), a throw cocked
  behind the head, a hand over the shoulder to a quiver. Only those.
- **The shoulder** swings the upper arm forward and up freely, to overhead;
  backward only ~55° from hanging (the lab warns past 55°, fails past 75°).
  An elbow up behind the head is a `flip` pose, never a plain one.
- **Bones keep their length:** crews' upper arm `UPPER` 4.6, forearm to the
  middle of the hand `FORE` 4.4 (thigh `THIGH` 4.08, shin `SHIN` 2.61).
  `arm()` solves the elbow for you; if a hand must reach farther, move the
  body (lean, shift the hips with `legs(..., { hip })`, step), never the
  bone. The lab warns at 5% and fails at 10%.
- **Knees** fold forward only (the shin swings back), as `legs()` does.
- **Wrists:** a haft or hilt in a fist crosses it — about 90° to the
  forearm with the wrist straight; the wrist tips it toward the forearm's
  line for a thrust or at the end of a blow, and never folds it back toward
  the elbow (more than ~120° off the forearm's line). A hammer's or staff's
  head leads the swing on an arc; it never trails back along the arm.

**Motion:**
- **No two-frame toggles for an action.** Anticipation → action →
  follow-through → settle: a wind-up with the weight on the back foot, a
  fast strike (fewest frames), an overshoot, then an eased return. 4–8
  baked frames per cycle; hold the extremes, spend few frames on the fast
  part. `folk-kit.js` has `keyed(keys, phase)` (eased in-betweens of key
  poses), `mixPose`, `arcMix` (a hand swinging on its arc round the
  shoulder, not along a ruler), `ease`/`easeIn`/`easeOut` and
  `frameOf(phase, n)` (which baked frame a hall stamps).
- **The whole body takes part:** the torso leans and the head follows the
  hands; the hips shift, the feet stay planted unless the figure steps (no
  torso sliding over still feet).
- **Secondary motion:** hat points, plumes, hems, sleeves and hair trail
  the body by a frame and settle after it (`hat()`'s sweep options, see
  "Crews' headwear").
- **Idle is alive but calm:** a breath (one art pixel) every few seconds, a
  glance, a shift of weight; crews on one hall and on neighbouring halls are
  never in step (phase by `t.id`, and by the crewman's index).
- Frames stay baked (one cache key per pose and frame) and stamped; the
  number of frames per form stays small (≤ 8 per cycle).

**Limbs and layers** (September 29; the owner: no black line between the
forearm and the upper arm, and arms kept clear of hoods and helms):
- **One inked part per limb.** Upper arm and forearm, thigh and shin are ONE
  part: `limb2(ctx, a, b, c, w0, w1, col0, col1, then)` in folk-kit.js
  (`arm()` and `legs()` use it; `limbStroke` paints a bone into a part
  already open). What rides on a limb — a gauntlet, a cuff, a sleeve's bell,
  a knee cop, a greave, an elbow's knob — is a colour step painted INTO that
  part (`arm()`'s `o.then(c, elbow)`, limb2's `then`), never a part of its
  own whose ink would ring the joint. The rigs keep the same rule.
- **An arm against the head goes wholly in front of it or wholly behind,
  never half through.** In front: an arm held low or out before the face,
  clear of it. Behind: an arm whose elbow rises past the chin with the hand
  near the face (the archer's draw, anchor, loose and follow; a throw cocked
  behind the head) — paint it before `head()` and only the hand after, so
  the face reads and the elbow shows past the headwear. The archer's poses
  say which with `back` (0 in front, 1 behind with the hand after the head,
  2 hand and all behind), and a draw's in-between goes behind by itself once
  its elbow passes `CHIN` (folk-archer.js). A hand raised behind the head
  sits past the hood's back edge, so a wrist shows, never a skin ball on the
  hood.
- **A raised near arm over the head** (a wind-up): the steel goes BEHIND the
  head, but the near arm and fist are drawn AFTER it, the elbow behind the
  head's middle, so the arm covers only the back of the helm and the ear,
  never the face (the crown's soldiers; a raised gauntlet takes the mail's
  darker tone so it doesn't melt into the helm). Where an arm in plate or
  mail is as wide as the helm and would still hide the face (the orc's,
  Ironclad's and hobgoblin's heaves, the Iron sergeant and chaplain), the
  head ducks forward and down in that frame and is drawn over the arm, the
  fist up and back about a unit clear of the helm; if the reach can't clear
  it, coil the near shoulder back within the trunk (the goblin's knife, the
  hobgoblin's totem). A raised upper arm in profile stays within ~15° behind
  upright, or the lab warns "swung back".
- **A value step between an arm and a hood.** An arm crossing a hood or cowl
  of its own colour reads as a seam in the hood: give the sleeve a paler
  shirt (Wren and the crown's bowmen), silk and a lace cuff (the Widow), a
  leather cuff.
- **Faces stay open.** Guard and cast poses hold the hand or staff about a
  unit ahead of the face's front edge. A far-hand shield or bow drawn before
  the head tucks under the chin (the levy's round shield) or goes behind the
  skull (the barrow archer's bow). A blade carried on the shoulder lies
  nearly level under the helm's back rim and across the pauldron's lower
  half, drawn over both (elbow folded ≤ 140°, wrist ≤ 120°).

## The newer heroes' figures (October 2 pass)

Brother Osric (`heroFriar`), Captain Hale (`heroCaptain`) and Ysolde
(`heroStorm`) are painted by the crown `soldier` painter like Aldric and
Wren; every older rig stayed pixel-identical (frame hashes), so new looks
and weapons must be gated by `look`, `weapon` or an option old rigs never pass.
- **Robes** (`friar`, `storm`): one ankle-length robe whose hem is shaped
  from where the feet are, so a stride or a lunge never shows a leg through it.
- **The friar's wind-up:** his wide sleeve raised over the head hid it, so
  that arm goes BEHIND the head and the head ducks a little over it. His
  mace rides upright before the face on the march (shouldered, its head
  read as a pauldron).
- **Hale** wears `p.plume` (the kettle hat's plume) and a tasselled
  halberd; he is h 25, a size above the Gate Guard.
- **The staff** (`weapon: "staff"`, `staffGrip`): the hand slides along the
  shaft (`fwd`) so the butt stays off the robe on the release. Fight frames
  follow the ranged order enemies.js plays (0 ready, 1 release, 2 recoil,
  3 recover); the `sky` sheet is the staff raised overhead (raise, hold,
  crackle, hold). `stormStaffTip(sheet, frame)` gives the crystal from her
  feet for the bolts — use it, never fixed offsets.
- The crystal's glow stays just under the alpha that would earn it an ink
  outline. Osric's brown habit is low-contrast on the tan road; the ink
  carries him, grass flatters him.

## Crews' headwear (the September 29 pass)

- **Headwear says the trade.** The peaked cowl (`head()`'s default, `HOOD`)
  is the Archery's and the castle crew's only. Everyone else wears their
  trade over a bare head: the falcon-mistress's bycocket, the Covert blade's
  wrap, the bombardier's fur cap, the alchemist's chaperon (`hat()`), the
  winch crew's leather skullcap with brass goggles, the Goldworks clerk's
  velvet beret with a raked quill, the River Watch's steel kettle hat over a
  coif at the nape (folk-workers.js), the smith's, hod carrier's and setter's
  caps and the musketeer's broad hat (`cap()`). The castle's halberdier and
  mason and the build crew's hooded mason keep their looks. A new kind goes
  into `HATS` with a silhouette at 1x distinct from the cowl and the others.
- **Keep the face open.** A brim's or cap's lower ink leaves one clear skin
  row above the eye: its underside sits about −1.8 to −2.1 head units (the
  brow is at −1.3, the eye's top at −0.8). `cap()` rides half a unit up the
  brow and every caller stands it half a unit higher again (`lift: 0.5`, or
  a y 0.5 above the head's) — at half a unit alone, pixel luck decided
  whether the eye showed. Below the brow nothing on the head reaches forward
  of the ear (x ≈ −1.2) but the wrap's scarf, which leaves an eye slit.
- **No fringe under a hat.** Pass `hair: null` to `head()` and paint hair
  only behind the ear and at the nape (`CAP_HAIR` in folk.js, `NAPE` in
  folk-workers.js): the fringe's ink and the brim's stack into a dark
  "sunglasses" band over the eye.
- **Colour off the palette, a value step off the coat:** `pal.hood` for felt
  and cloth, `pal.trim` for bands, plumes and tails (so each form's palette
  still varies them), e.g. `darken(pal.hood, 0.3)` for a crown and
  `lighten(pal.hood, 0.3)` for its rim.
- **Layer by depth.** The hat is drawn in the head's frame (units ×1.08 about
  `y − 0.3`) inside the figure's nod. Anything raised behind the head goes
  before `head()`; anything held up before the face after the hat. A tool in
  the near hand is drawn after the head, beard and hat (the mage's staff
  passes over the brim, never behind it), and the near arm after the tool,
  never rising to the brim. A staff beside a tall hat (mitre, wizard's hat)
  stands clear of its outline. A raised fist or tool passes ahead of the
  brow (the fist in front of the nose's tip), never across the eye; a mallet
  raised overhead stands upright ahead of the head; a tool carried on the
  run stays below and ahead of the chin (`MASON_RUN`).
- **Secondary motion:** the falconer's plume lifts on the wind-up and
  streams flat on the throw; the wrap's tails fly up in the crouch. A bird on
  the glove rides below the face in the wind-up (the fist drops to the hip
  before the cast).
- **Bake headroom.** The halls' crew bakes are tight: the clerk and the
  watchman 26×30 and the winch crew 28×30 (feet at 27), the mage 34×40 (feet
  at 37). On every frame, the breath's lift included, the whole figure, ink
  ring and all, stays at least one art row (half a unit) under the box's
  top; several frames have exactly that. Measure it with a tall-box bake
  (see "How to look at your work"), not a big lab cell.

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
- **The installed app fills the glass** only because `index.html` lets
  html/body be `min-height: 100lvh` and unclipped in `display-mode:
  fullscreen/standalone`: iOS/iPadOS 26 (WebKit bug 301108) gives a
  see-through-status-bar home-screen app a layout one status bar short
  (712 of 744 on the iPad mini) while the page is `height: 100%` +
  `overflow: hidden`, and nothing can paint the strip left over. Don't put
  `overflow: hidden` / a fixed height back on html or body there.
  `public/vp.html` measures it (add it to the home screen). The rule is
  for tablet-sized screens only (`min-width`/`min-height: 600px`): on an
  iPhone it pushed the battle HUD and tray down a status bar's height.
- **No emoji in the UI.** Pictures are pixel grids in `src/ui/hud/icons.jsx`
  (coin, heart, castle, arrow, ballista bolt, shield, hammer, target, flag…)
  or the game's own art (`TowerPortrait`, `EnemyIcon` with a rig). Plain
  typographic marks (★ ✓ ✕ ·) are fine.

## Type (HUD)

**One source: `src/ui/fonts.js`.** No other file names a font family; a new
piece of text picks a role, never a family.
- **Roles.** The DOM reads CSS variables fonts.js sets on `:root`: `--mark`
  (the CROWNGUARD wordmark), `--title` (screen and card titles, the banners),
  `--head` (the campaign map's heads), `--display` (headings, labels,
  planks), `--menu` (menu buttons), `--numeric` (anything with digits;
  `--num-adjust` is its `font-size-adjust`), `--body` (tales, blurbs, stat
  lines), `--map` (map labels). JS styles use theme.js: `FONT`, `DISPLAY`,
  `TITLE`, `HEAD` and `NUM` are the variables themselves (so hud.css can find
  those elements); `MARK`, `MENU` and `MAP` are family stacks (SVG
  attributes can't read variables). Canvas text asks `canvasFont(slot, px,
  bold)` — `canvasFont("board", 22, true)` is today's "bold 22px monospace";
  a baked text sprite keys on `typeEpoch()`, which bumps when faces land. The
  board's floating numbers (+12, −3) are fx.js's 5×7 bitmap in every option.
- **Options: `TYPES`.** The default (`DEFAULT_TYPE`) is `tidy3`, Tidy
  HUD · Pixel Sans (the owner's pick, 2026-09-29): CG Pixel Sans capitals
  for the words, Press Start 2P for every digit, Jersey 15 for the tales.
  `current` is the look before it: Silkscreen words, Press Start 2P digits
  (`font-size-adjust` 0.58), Verdana text, monospace on the board. The
  others are whole identities: `keep` (Arcade Keep), `letter` (Black
  Letter), `illuminated`, `pair` (Tidy HUD with Silkscreen), `tidy2` (Tidy
  HUD with Pixel Operator 8). Switch with `?type=<id>` (remembered in
  localStorage `cg-type`, so a player who picked one keeps it; `?type=tidy3`
  comes back to the default).
- **An option's fields.** Each Google face is registered under an alias
  (`"cg <family> <size>"`) whose `@font-face` carries `size-adjust`, so the
  size travels with the face everywhere — never add `font-size-adjust` for
  it. `digits`: one face for every digit in every slot (the other aliases
  cut 0-9 from their `unicode-range`), sized per slot by `sizes`, with `keep`
  (slots that keep their own digits) and `only` (the slots it serves).
  `caps: true` sets in capitals the places Silkscreen shows as capitals today
  (`[data-type-caps]` in hud.css). `features` (e.g. `"lnum"`) goes on
  `:root`, and buttons inherit it (`[data-type-features]`). A face's `lacks`
  lists characters it must not draw (they fall through to the option's body
  face); its `lh` sets the height `line-height: normal` gives it.
- **Loading.** Faces use `font-display: swap`; the page is held hidden until
  they land, 3 s from navigation at most. fonts.js registers every face at
  boot; index.html only starts the DEFAULT's downloads before the bundle
  runs: `<link rel=preload>` for its self-hosted woff2 files and (`as=fetch`)
  for each Google stylesheet the loader fetches, at exactly the loader's URLs
  (one family per request, `&display=swap`) so its requests reuse them. A
  new default changes those links. A plain option (`current`) links its own
  Google stylesheet at boot (`sheet`, held until its `probes` load).
- **Checking type:** `type-lab.html?opt=<id>` (a specimen sheet; `?opt`, since
  `?type` would switch the game), `?digits=opts` (every option's digits as
  the game sets them), `?survey=1` (candidate faces with their metrics).
  `node scripts/type-shots.mjs [ids] [--only home,map,battle,phone,council,guide,sheet]`
  shoots the real game into `.shots/type_<id>_<screen>.png`, unhinted, at
  DPR 2 (the phone at 3) plus a `_dpr1` worst case; `--base` takes a static
  dev-mode build (`NODE_ENV=development npx vite build --mode development`)
  that teammates' saves can't reload, `--dump` writes computed fonts to
  diff. `--pairs [--faces A,B]` is the pair test: 0/O 1/l 1/I 5/S 8/B 2/Z and
  digit against digit, drawn in the page, scored in grey levels at DPR 1 and
  2 — under 0.20 fails. This container has no Verdana: `current` shots show
  DejaVu Sans.

**Rules that stand:**
- **No "&" in Silkscreen** — its ampersand reads as "$". Write "and"
  (options using it there mark it `lacks: "&"`).
- Digits must be unmistakable at chip size and at phone scale 0.72.
- Pixelify Sans is BANNED — its C reads as O and its 5/8 as S at small sizes.
- Measured failures, don't retry: DotGothic16, Silkscreen, Micro 5 and the
  Bitcount family draw 0 and O alike; Jersey 15/10/20 for digits (6/8 at
  0.04-0.08, blurred at 1x); VT323 (1/l 0.11-0.14); Tiny5 (2/Z 0.10);
  Cinzel's 1 is an I; Grenze's and Alegreya's default figures are old-style
  (use `lnum` in the DOM and a lining face on canvas); Jacquard 12/24 and
  Jacquarda Bastarda 9 lose their hairlines below ~40px.
- Traps: React sends a unitless `fontSizeAdjust: 0.58` as "0.58px", which is
  ignored — use a string. A browser's button style resets
  `font-feature-settings`. A canvas that isn't in the page ignores font
  features. Linux's headless hinting snaps glyph advances and flatters pixel
  faces at odd sizes (type-shots runs unhinted).

**Panels and buttons:**
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
  the Rush switch) and the speed bottom left. **The hero's menu opens in
  the tray, right above his button — never over the map**, so the field
  (and his Shield Slam) stays in view: on phones it takes the tower grid's
  whole panel, its planks sharing out the height (the grid folds away and
  keeps its place in the list); on tall
  screens it docks at the foot of the tray panel under the tower grid,
  which keeps scrolling above it. Name · level and the ✕ in its head,
  health and xp on one short row, then Move and the two abilities as
  full-width planks (44px+; on phones an ability that is asleep or
  recharging keeps one ellipsised line of its tale). It closes on its ✕, a
  second tap on the hero button, a plain tap on the map, Castle, the
  militia, the wave-info arrow, a tower tile or a selected tower; firing an
  order closes it first. **Popups, never scrolling:** a selected tower's menu
  takes the tray (banner, targets bar, upgrade, sell; the ⓘ slides the
  upgrade tree over it: see `CLAUDE.md` "The tower menu is the tray"), and
  only the castle works stays a wide card over the middle of the map in
  columns, with its ✕ on the corner; it closes on a tap elsewhere.
  The map stands flush against the tray at its true shape (its decorative
  top/bottom border may be trimmed on short screens); the rest of the screen
  is the realm's landscape (`src/render/apron.js`), never a bar. Everything
  keeps clear of the notch and home indicator (`vp.safe`). iOS pads BOTH
  long edges in landscape though the camera cutout is on one; when
  `vp.turn` is 90 (cutout on the left) the phone tray takes the right pad
  for wider tower cards (`freeRight`), stepping only its head and foot in
  from the rounded corners. Test that case by faking `window.orientation`.
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

## The River Watch's reach (`src/render/waterreach.js`)

- **Its area of control is its WATER, never a circle** round the hall: the
  body its skiffs row, as the engine picks it — a pond's ring (`pondAt`), the
  sea's lane (`seaDepthAt > 0` → `seaRoute`), otherwise the river the hall
  is moored on (terrain.js `RIVER_ROUTES` / `riverRouteAt`, update.js
  `t._river`; on a two-river board each hall rows its own). Lit gold when
  selected, green or red for the build ghost.
- **Light water, never tint it.** A gold wash over blue turns it frosted grey
  and over fen water turf-coloured mud. Each water pixel is lifted a fixed
  luma step (`TONES`: sel 26, ghost ok 24, bad 20) toward its own water's
  shine, half keeping its hue, half mixing to the shine. The tone's colour
  lives only in a rim along the waterline (1-2 art px) and the creeping
  dotted ticks. Pixels warmer than any water (reeds, pads, stones awash,
  sand) keep their colour. Where a body is cut across open water (a
  confluence, the sea past the lane) the light fades in three steps broken
  on one-unit blocks. It is baked once per body and tone, and drawn with the
  water, under the bridges.
- **Skiffs: rings only, no fill** (the ground stays the ground). The
  fleet's outer edge is bright, a ring under a sister's reach softer and
  smaller, and left out where a sister within 0.55 R covers it; the boat
  under the mouse shows her whole ring. Ticks carry a one-unit plum shadow
  down-right so they hold on bright grass. The build ghost shows the level-1
  skiff's station ring and a hollow caret.
- **What a skiff leaves on the water stays on it:** wakes (along her real
  heading), ripples and oar splashes go through `fillWet`, which fills open
  water only (no clip path); the hall's pile ripples use `clipToWater`,
  cached per box. Menu portraits (off the board) are unclipped.
- **Performance:** the mask, every body a watch could row and its tints bake
  in ~5 ms `setTimeout` slices after the board appears (`warmWaterReach`;
  Safari has no `requestIdleCallback`), so the first tap costs ~1 ms, not
  ~100. Wakes skip a few frames rather than force a bake mid-warm-up.
- Check with `skiff-reach-lab.html` (see "How to look at your work").

## Water, roads and ground (the September 26 pass)

**Added 2026-10-03 (water engineer):** a river may give a width per point
(`ws: [...]`, one per point of `pts`; `w` stays a number, its widest, for
thumbnails and margins) — water, banks, buildable ground, the dock edge,
bridge spans and skiff masks all follow it, and water wider than 60 px
shelves gently (Ironmouth's estuary). A coast may set `ease` (the headland
slope's width, default 110) for rounder coves. Overlapping ponds paint as
ONE water (`pondGroups`). A river ending in a pond stops its streak, current
and bank pieces at the pond's shore. The spawn edge's wood keeps clear of
pieces already on the ground (`clearOfPieces`, terrain.js).

**Fen pieces that stand in water** (`REALM.fenRelics`, scenery-hollow.js):
ordinary decor is pushed out of water by the grounding pass, so a piece that
stands IN a pond or river (belltower, arcade, column, sunkking, weir, wisp,
lanternpost) is listed in `fenRelics` at its waterline (grid px) and drawn
flat with the lily pads, with a cut waterline, wet band and reflection; it
blocks nothing, so give a tall one open water or blocked ground behind it.
`fenPools: false` makes a dry fen board (no turf, road or wood-floor
puddles). New fen decor: `fenwisp`, `fenlongbarrow`, `fenroundbarrow`,
`fenstone`, `fenmonks`, `fenhut` — look at them with
`hfs-lab.html?only=fenwisp,fenlongbarrow,...` (not in its default list).

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
- **The apron follows the board, never its own copy:** its ground takes
  `turfTones(R)` and its dither from world.js, its road is road.js's
  `paintRoadStrip` (points in the direction of march), its sea is coast.js's
  `coastPixel`, its rivers water.js's `drawRiver`. Change one of those and
  check the seam in `apron-lab.html` (zoomed across it) on every chapter.
- **Load cost moved from frames to realm load:** a river board's ground
  layer, spans and gate now bake in ~0.5-0.8 s here (headless, shared CPU).
  Frames got faster; watch the load time on the iPad.

## Hand-placed decor (and the old spawn sign)

- A hand-placed decor entry may pick its look: `v` (and `sd` for a stone's
  shape); without them `variantOf` (scenery.js) hashes the position, as
  before.
- There is NO "THEY COME" sign any more (owner, 2026-10-04: removed); the
  spawn gate itself says where the enemy comes from.

## The enemy entrances (spawn gates)

The bar is the Greenwood's crag cave (scenery.js, `data/gatecrag.js`): ONE
place the road visibly comes out of, built into the board's edge, the wood
growing round and over it, the road worn dark at the mouth. Each chapter's
gate works out its own geometry from the road (left, slanted and top
entries) and keeps footprints honest (`cragBlocks` / `barrowBlocks` in
actions.js `buildableAt`).
- **The Hollowfen: a great barrow** (2026-10-04; scenery-hollow.js, shape
  data in `src/data/barrowgate.js`: `gateGeom`, `barrowBlocks`,
  `FULL_MOUND` true, `setFullMound` for labs) — a turf-roofed mound with a
  horned forecourt of drystone and slabs, a portal with spiral-cut lintel,
  the causeway flags running into a dark passage with witch-light and eyes,
  grave-goods at the threshold. `HOLLOW_ART.gateTree.barrowgate` (called by
  scenery.js `drawTree` through `reg().gateTree[REALM.spawn]`) drops edge
  trees that would hide the portal and lifts others onto the mound.
- **The Iron Marches: a palisade gatehouse** (2026-10-04; scenery-iron.js)
  the road passes THROUGH: log wall with a fighting walk, oxblood banner
  over the arch, brazier, raised portcullis, a timber tower at each end,
  tents and smoke behind. Two sorted decor pieces from maps.js `ironGate`:
  the far tower (`irgate`) north of the road, the wall + near tower
  (`irgate`, `v: 9`) south of it, so the column is hidden in the passage
  and marches out of the arch.

## The campaign map (`src/ui/mapArt.js`)

- Roads: good as they are — well connected.
- **A continent to travel** (owner, 2026-09-25; grown 2026-10-03 for
  fifteen stops a chapter): the map is 850x830 units (`MAP` in mapArt.js;
  y from -310), each chapter with room for 15 stops;
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
  `node scripts/check-map-water.mjs` and look at `map-lab.html`. It also
  fails a DRY level within 10 units of a lake.
- **Growing a country** (2026-10-03): new land is new lobes of coastline
  (REGIONS in mapLayout.js), never a rescale — the hand-placed dressing,
  rivers and set pieces of the old land keep their coordinates. Dress new
  land with new loops on their own seeds rather than widening the old
  scatter boxes (that would reshuffle the old land). Check every river
  mouth, islet, ship, ribbon (`BANNER_AT`) and set piece near a moved coast.
- **Mountains read as ranges:** `range()` builds peaks up toward its middle
  (smaller at the rim and ends, snow only on the big central ones) and
  stands every peak in a skirt of low hills in its country's colour (its
  foothill palette, tilt and density arguments). No bare grey cones on flat
  meadow. `river()` takes `flare` to open its last stretch into an estuary.
- **Never write a non-lake object as `{ x: N, y: N, rx:`** in mapArt.js:
  the water check reads every such literal as a lake (a dry-ground zone
  once made the Barrowdowns' waypoint "stand in a lake").

## The title screen (`src/ui/titleArt.js`)

- **Its ground follows the board, never its own copy** (as the apron does):
  the turf is `turfTones(REALMS.greenwood)` from world.js in the Greenwood's
  light, its tone edges frayed in world.js's `DITH` blade dither (never a
  Bayer screen); tufts are groundblend.js's `pixelTuft` (the foreground's
  `boldTuft` has blades two pixels wide at the root); the road is road.js's
  Greenwood dirt painted per pixel along `ROAD`, its half-width blended like
  the crowd's lanes (a bank face dark on the sunward side and lit on the far
  one, the bank's shadow in the road, a worn verge, ruts only where the road
  is 6+ px wide, grain, pebbles, edge tufts). The castle is untouched: the
  vista's castle matches the board's (see the table).
- **Perspective:** the tone map lies on a ground plane (`persp(y) = (y − 147)
  / 123`, matching how `ROAD_W` narrows toward the gate; `planeV(y)` for
  foreshortened depth): patches broad near the viewer, small and flat toward
  the castle. Haze comes in stepped levels (`HAZE_K`, toward `#9ca6c4`),
  frayed in the same dither. Details (flecks, clover, daisies, tufts, petal
  flowers r 3 near, r 2 mid, a 3×3 star far) are world.js's, sized by
  distance.
- **The far ridge** carries the map's Greenwood farms (`FARM` colours) as a
  patchwork, never rows: a leaning, jittered lattice with its own row
  heights per column, clustered and thinning lower down; every field hedged
  (lumpy) along its foot and up its sides; crop, hedged pasture or open
  meadow, some split or cut short, furrows across, down or none. No
  free-floating hedgerows. The hay meadow round `HAY` is mown, in straw rows
  of `strawOf` colours.
- **Wood floor only under the deep wood:** the olive-brown floor ramp comes
  only from the shade of trees standing well down in the woods (foot more
  than 7 units below `hillTop`); a tree on the brow throws plain meadow
  shade, or the floor's dither shows on open meadow as dark scribbles. Near
  tufts root only where their tallest blade (~15 × size art px) stays 1.5
  units under the brow, so no blade stands against the ridge.
- **The castle's bank** (`paintBank(c, pal)`) takes the ground's colours: the
  contact shadow's deepest tone with its lip, stepping up to the lit brow at
  the west corner; with no palette it keeps the app icon's. Where the hill
  falls away from the sun (the east shoulder) the brow is a plain 1-px edge
  a tone up, not the warm lit rim.
- **Stages:** `vistaStages()` yields each stage's name and every ground stage
  stays under ~50 ms (the castle bake, ~130-200 ms, is the one over). Small
  overlays (the threshold, the bank) use `layerAt(ctx, x0, y0, w, h, draw,
  ink)`: a full layer's pixels in a box, far cheaper to harden and ink.
  Check with `title-lab.html`.

## The board's size

- The board is **840x560 (exactly 3:2)**: the 15x10 grid of 48px tiles, a
  40px border (`MX`, `MY`) on the left, top and bottom, and an 80px right
  border (`MXR`) for the castle. The castle band runs from the wall face at
  `W - WALL_W` (738) to the edge **and on past it**: the castle's stone
  touches the board's right edge and the screen cuts it (owner, 2026-09-26).
  There is NO yard and there are NO houses behind the wall — don't add them
  back. (A day earlier the owner's "clipping" was misread as "the castle must
  not cross x = W"; what they meant was towers that looked pasted onto the
  wall. See "The castle".)
- Scatter and random scenery still use the old 800 width (`SW` in
  terrain.js / world.js), so every realm's ground is unchanged; the road
  ends at `W - WALL_W + 18` and the log/keg code uses `FIELD_W` (800) in
  update.js, so gameplay is unchanged too.
- The screen shows the board at its true W:H, never stretched.

## The castle (`src/render/castle.js`)

- **One camera for every face:** a point `z` high is drawn z up the board
  and `LEAN` (0.5) × z to the east — towers, curtains, gate and keep alike,
  so a tower's proud flank and the curtain's slant run parallel. Every
  course of stone is `COURSE` (3.5) high: a west face has one column per
  course (1.75 wide) and a south face one row per course, so the courses
  meet round the corners. Heights: outer walk `HC` 14, inner walk `HI` 28,
  gate block `HG` 31.5, towers `TOWER.h` 38.5 (the north gate tower 35, so
  its foot clears the arch), keep `HK` 56.
- **Towers are built in, never pasted on.** A tower rises from the grass
  proud of the outer face (foot at `TOWER.x0` 741, the curtain's at 749) and
  runs back into the inner wall's parapet; the inner walk passes on behind
  it. No wall passes OVER a tower: each wall is painted as a stretch that
  starts against the south face of the tower north of it, at its own height
  (the outer walk meets the face `HC` above the tower's foot, at a door; the
  inner parapet `HI` above), its end cut on the slant of its own face, its
  first merlon standing against the tower. So the painting order is
  stretch, tower, stretch, tower… north to south, and the tower's south face
  is clipped to what the walls in front leave in sight. The footing and a
  string course at the outer walk's height wrap the tower's proud foot; the
  tower throws its shadow down-right over the walls south and east of it.
  Tower decks and the keep's top are a shade warmer than the walks (`DECK`),
  so a tower reads apart from the wall at a glance; each has a red stair
  turret and an oak trapdoor, set a little differently per tower.
- **The gate:** one gate block through both walls; its south face runs on
  up, sheer, as the keep's (one face, one piece — no ledge). The keep is the
  castle's landmark: crown banners and a lit slit down its face, turret,
  chimney (the smoke) and the royal standard on top. The oil cauldron (with
  its own shadow) sits by the murder holes on the gate top. The Gate Guard's
  halberdiers are NOT on the castle: they are a band on the road before the
  gate (`guardSpots`, x 722, in `data/castle.js`), fighting as knights do
  (`syncGateGuard` in `engine/update.js`), drawn with the crowd as the crown
  rig `halberdier` (`look: "guard"`, the `halberd` weapon, in `rigs-crown.js`).
- **Life on it:** the sentry paces the INNER walk (x 822), which no crew
  uses, north or south of the gate block, up to `BEAT` long nearest the
  gate — he must visibly pace on every realm. Masons work at the far ends
  of the outer walk; when the bowmen hold every slot they go to the inner
  walk behind the towers farthest from the gate. Weather lies on the stone:
  snow on decks, gate, keep and walks (drifted in the parapets' lee), ash
  or moss in the walks' joints (`snowOn`, `walkWeather`).
- **Gameplay fixes the decks:** the crews' spots (`wallSlots`, `bowmenSpots`,
  `ballistaSpots` → `towerDeck`, x 771) are laid out from `foot - n - h` and
  `foot + s - h`, so keep `n + h` = 44 and `s - h` = -12 when changing a
  tower's height; dump them for every realm before and after (import
  `engine/path.js` as a namespace and read `PATH.PTS` after `selectRealm` —
  a destructured `{ PTS }` keeps the first realm's road), and
  `node scripts/sim.mjs --level gw1 --endure` must not move.
- **One wall, any length:** `paintCastleStone(ctx, gx, gy, tier, ya, yb)`
  paints the stone from ya to yb from `towersFor(gy, ya, yb)` — the board's
  own towers and more every `RUN_STEP` (105) past its ends — with every
  length of wall seeded by where it starts and the long bands (inner walk,
  far parapet, the ground's dressing) laid from `ANCHOR`, so any window of it
  matches any other pixel for pixel. The board bakes -14..H+14; the apron
  (`src/render/apron.js`) asks `bakeCastleRun` for the lengths past the
  top and bottom, a little in under the board, which hides their cut ends.
  Never repeat a slice of the board's wall out there.
- Check it with `cas-lab.html?job=[["name","greenwood",[],{"lives":20},[690,0,150,560,3]]]`
  (lives 20/14/9/4 are the four damage tiers; `castle: {archers, ballista,
  guards, masons}` puts the works' crews on it), `cas-lab.html?bench=<realm>`
  for the bake timings, and `apron-lab.html?layouts=ipadtall,tablet` for the
  wall running on past the board (zoom on the seams at the board's edge).

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
the JS. `CG_VIEW=844x390` sets the window size. It fetches Google Fonts
itself (curl), since headless Chromium behind a proxy can't, and DOM
screenshots would otherwise fall back to Verdana. For a screen of the real
game, drive it with Playwright (click FREE PLAY, a preset, START…) and
`page.screenshot` — `sbs-lab.html` / `sbp-lab.html` show the sandbox's
setup and in-battle panel on their own.


With `npm run dev` running (these pages save PNGs into `.shots/` through the
dev server; view them from there):

- `/hallshot.html?kind=<kind>&tag=<name>` — all 9 forms of a hall, idle and firing.
- `/rigshot.html?types=goblin,orc&tag=<name>&scale=3` — creature frames.
- `/shots.html` — whole board frames through the real `draw()`; call
  `snap(name, realm, marchers, extra, [x, y, w, h, scale])` from an injected
  module script (the browser tool's JS runs in an isolated world).
- Lab pages per area: `twa-lab.html`, `twb-lab.html`, `twb-folk.html` (every
  crew figure), `joint-lab.html?set=<set>` (bones and joint limits, see
  "Joints and motion"), `hallstrip.html?kind=<k>&form=3,b,a&n=12` (one form
  through a firing cycle, or `&idle=1&secs=6` the idle, frame by frame),
  `shotlab.html?kind=<k>&form=3,b,a&foes=orc,orc` (the REAL engine: one hall
  beside the road, foes in reach, stepped at 60 fps and snapped every few
  frames — where shots leave their weapons, a falcon's stoop, the
  Magister's aegis), `crw-lab.html`, `hrd-lab.html`, `bst-lab.html`, `cas-lab.html`,
  `scn-lab.html`, `fx-lab.html`, `map-lab.html`, `apron-lab.html` (the landscape beyond the board at phone/tablet/desktop layouts), `icon-lab.html` (the app icon), `hud-lab.html`, `wdn-lab.html`.
- `props-lab.html`: every object a hall puts OUT into the world (traps,
  logs, stoops, the war-eagle, shots, soldiers and blades), zoomed on the
  road through the real draw(); `?only=traps,logs&zoom=1|2|3`. Deeper sheets:
  `logs-lab.html` (angles and spins), `birds-lab.html` (a stoop moment by
  moment, every hawk pose), `blades-lab.html` (every Covert form on three
  grounds), `raise-lab.html` (every hall through each kind of raise; `?how=all&board=1`;
  `?how=folk` every form with and without its people; a build row reports
  its two hand-overs, `&seams=1` saves where they differ), `crew-lab.html` (the builders),
  `rings-lab.html` (each area effect through its life at zoom 1
  and 3; `?fx=frostnova,slam`, `?perf=1` times each ring).
- `title-lab.html?tag=<name>&zoom=x,y,w,h,s&crowd=1`: the title vista
  painted stage by stage, each stage's time printed, saved into `.shots/`.
- `skiff-reach-lab.html?realm=<id>&form=3,a,a&at=x,y&tag=<name>`: the River
  Watch's reach on a real board through the real engine, saved as
  `skiff_<tag>.png` — `&mode=sel|ghost|plain`, `&hover=x,y&gold=0`,
  `&preview=2` / `,a` / `,,b` (an armed upgrade), `&underway=1|y`,
  `&hoverboat=i`, `&noclip=1` (a before shot), `&crop=x,y,w,h&scale=n`,
  `&first=warm|cold`, `&bench=60`, `&tune={...}` (its header lists them all).
  `window.LAB` hands a probe the page's own TERRAIN, WATERREACH and
  groundLayer: a probe's own `import()` gets a different module instance.
- `type-lab.html` and `scripts/type-shots.mjs`: see "Type (HUD)".
- **Probes** (a `shoot.mjs` JS argument on any same-origin lab page):
  - *Clearance and headroom:* bake the figure with `bakeSprite` in a box 10+
    units taller than its hall's (feet lower) and scan the alpha for the
    first opaque row — the real bounds, ink included. Guessing from a pose
    table missed by 2 units and more.
  - *A hall frame by frame at zoom:* `import()` /src/render/towers.js and
    the world modules, draw the hall with a hand-built `t` (`cd`, `anim`,
    `_idle`, `lastAim`, `noFolk`) at the moments a review names, and POST
    the canvas to `/__shot`.
  - *A foe's four fight frames on the board* (shots.html): marchers with
    `{ blockedBy: 1, engaged: true, atkRate: 1000 }` plus, frame by frame,
    `meleeCd: 600`, `meleeCd: 200`, `atkAnim: 150`, `atkAnim: 50`.
  - `joint-lab.html?set=<set>&bones=0` lays the plain poses on a regular
    grid (a 150px label column, cells `CW·2·scale` wide), so one cell crops
    cleanly; a `rigshot.html` sheet at scale 4 halved (nearest) reads close
    to 1x for before/after.
- Always take a BEFORE shot, then judge at 1x board size (what the player
  sees) as well as zoomed. Never launch Chrome from a shell — it trips a
  macOS security prompt; use the app's browser pane.

## AI-generated art (Gemini / Nano Banana)

Everything animated stays drawn in code so frames stay consistent. If
painted images are ever used, they suit backdrops and key art; the prompt
guide is `art/GEMINI-PROMPTS.md` and the per-sprite sizes are in
`art/DESIGN-BRIEF.md`.
