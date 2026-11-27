# Crownguard — notes for Claude sessions

A pixel-art tower defense (React + Canvas, Vite). `npm run dev` serves it at
http://localhost:5173; pushing `main` deploys it to
https://philipwilliams1229.github.io/CrownGuard/ (GitHub Pages, ~1 minute).

## Read first

- **`art/STYLE-GUIDE.md`** — the art direction and every rule for new art:
  pixel style, palette, proportions, camera, tower footprints, where each
  kind of art lives, fonts, performance, and the lab pages for checking work.
- `art/DESIGN-BRIEF.md` / `art/GEMINI-PROMPTS.md` — sprite sizes and prompts
  if AI-painted images are ever used.

## The iOS app (2026-10-16, owner request)

The game ships to the App Store as itself, wrapped by **Capacitor 8** (no
Swift rewrite): `capacitor.config.ts` (appId `com.philipwilliams.crownguard`:
never change it, nor `server.hostname`/`iosScheme`), the Xcode project in
`ios/` (Swift Package Manager, no CocoaPods). Free, iPhone + iPad. The owner
builds on their Mac and uploads to TestFlight: **`APP-STORE.md`** is their
step-by-step; keep it right when the flow changes. Pending: the owner's first
build (nothing native has been compiled yet: this container has no Swift or
Xcode, so keep edits under `ios/` few and plain, and say they're unbuilt).
- `npm run ios` = build + `cap sync ios` + open Xcode (Mac only);
  `npm run ios:sync` without the open. A new Capacitor plugin: `npm install`
  it, then `npx cap sync ios` (rewrites `ios/App/CapApp-SPM/Package.swift`;
  commit it). Generated and ignored: `ios/App/App/public` (the copied
  dist/), `capacitor.config.json`, `config.xml`.
- Native choices: iOS 17 minimum; landscape only on both (the iPad also
  `UIRequiresFullScreen`, deprecated in iPadOS 26 but still honoured; if an
  upload ever refuses it, list all four iPad orientations instead:
  TurnDevice covers upright); status bar hidden (`UIStatusBarHidden`, read by
  Capacitor); `ITSAppUsesNonExemptEncryption` false; `GameViewController`
  (bottom of `SceneDelegate.swift`) fades the home bar and defers edge swipes.
  Icon `AppIcon-512@2x.png` = `public/icon-512.png` x2 nearest-neighbour
  (opaque, as Apple requires); the launch image is plain #20242c.
- **Saves are mirrored natively** (`src/native/keep.js`): iOS may clear a web
  view's localStorage, so the app copies all of it to Capacitor Preferences
  (UserDefaults) a second after any change and on leaving the app, and puts
  it back at launch if the stamp key `cg-keep` is gone. `main.jsx` awaits
  `keepSaves()` and only then imports `boot.jsx` (the old entry), since the
  stores read their keys at module load. Web: does nothing.
  `node scripts/keep-test.mjs` tests it.
- **The web game opens the newest build** (owner, 2026-11-07: a home-screen
  icon kept showing the previous build after a push): GitHub Pages lets a
  browser reuse the page for 10 minutes. The build writes `version.json`
  (vite.config.js `versionFile`, the same stamp as `__BUILD__`); at launch,
  on the web only, `freshen()` (src/native/fresh.js, awaited by main.jsx)
  fetches it past every cache and, if it is newer than the running build,
  reloads once from `?v=<built>`, which no cache holds (sessionStorage guard,
  2 s timeout, never in the app or the dev server). Only helps from the first
  build that carries it; until a device has loaded that one, wait the 10 min.
- **A stale page rescues itself** (owner, 2026-11-08: a gray screen after two
  pushes nine minutes apart): a page kept from before a push asks for
  `assets/` files the push replaced, so the bundle (and `freshen()` in it)
  never runs. A plain inline script in index.html, before the bundle, watches
  for an `assets/` script or stylesheet that fails to load, a failed
  `import("./boot.jsx")` (main.jsx calls `window.__cgBootFailed`), or an
  empty `#root` after 15 s, and reloads once a session from `?v=<now>`
  (sessionStorage `cg-stale`); if that was tried, or in the iOS app, it shows
  a "Reload Crownguard" button. Tested on a local build with a page whose
  bundle was missing. Pushing main twice inside 10 minutes is what strands a
  device on a build without this guard.
- **Leaving pauses a battle** (web and app): `onAway` (`src/native/app.js`:
  page hidden, or the app going inactive) opens the pause menu in battle.
- **The default type needs no network**: Press Start 2P and Jersey 15 are in
  `public/fonts/` (Google's latin subset files, OFL) and load as self-hosted
  faces (`KEPT` in `ui/fonts.js`); other `?type=` options still fetch theirs.
- `public/privacy.html` is the App Store's privacy policy URL; if the game
  ever sends data anywhere, it and the App Store's privacy answers change.
  No support page yet (it needs a contact the owner picks).
- To check on a device: sound vs the silent switch, Copy/Share of the save
  code, speed on an older iPhone, the notch's safe areas, iPadOS 26 windows.
## The new sprites; the castle pass (2026-11-12, owner request)

The owner wants the sprites "a little more premium": readable body parts
and faces, "more fluid and natural animations", spell light on casters.
Two rounds of concepts settled the look, and **the first figures are in
the game**: Sir Aldric, Wren and (since 2026-11-13, "Yes, the horde next")
the whole Greenwood horde: goblin (hooded and bare), orc, Ironclad, troll,
shaman, warchief, wolf, boar rider, bat, dragon, necromancer, drawn by the
pixel sculptor in `src/render/pix/`. Read `art/STYLE-GUIDE.md` "The new
sprites" before touching any figure: it has the contract and how to add the
next one.
- **Decided by the owner** (their words): "i love the direction"; outline C
  (the one-pixel tinted line); "Definitely want just one sun!"; "I love the
  spell light", go with the recommendation (on by default, a switch in
  Settings); Sir Aldric clean-shaven ("the moustache isn't reading well");
  Wren in the hunting cap and feather ("C for sure that's awesome"), after
  two hoods were rejected ("that hood is really bad sorry"); the mage,
  goblin, orc and necromancer "look great".
- **Provisional, pending the owner's playtest:** the figures on the
  board (8-frame walks, 11-16 frame attacks timed off the attack clock, a real
  idle for heroes), firelight from Dragonbreath on any new figure in the jet,
  and two Display switches, "New sprites" and "Spell light" (`data/prefs.js`).
  Old and new figures share the board until the rest are redrawn, so the
  heavier old outline shows beside the new one: that is expected for now
  (the Greenwood's FOES are all new; its soldiers, crews and the other three
  armies are not). The owner has NOT yet seen the horde's nine new figures:
  the goblin, orc and necromancer are the only foes they have approved.
  The shaman's chant, the warchief's horn and the necromancer's raise show
  on the march (`casts` in `PIX`); the dragon's fire-breath clip is drawn
  but unused (the boss has no blow).
- **The tower crews are in** (2026-11-13, owner: "So sick! Lets go ahead and
  do the towers instead"): every person on a hall (mage, priest, bowmen,
  engineers, smith, bombardier, musketeer, alchemist, hooded master,
  falconer, clerk, watchman) is a pix figure drawn through
  `src/render/pix/crews.js`; each hall keeps its old crew under an `else`
  for "New sprites" off. The engine's shot points (`engine/muzzles.js`) did
  not move. Style guide, "Tower crews", has the contract, the variants and
  the artists' list of weak spots. NOT yet seen by the owner. Six artists by
  hall group on one brief; the usage limit cut all six off mid-pass (a WIP
  commit, then `SendMessage`, brought each back), and the dev server had
  been stopped by the app meanwhile (check it answers before resuming
  artists who need the browser). Artists used the built-in browser in their
  own tabs for `hallshot.html` / `hallstrip.html`.
- **The tower BUILDINGS** (owner, same day: "yeah I want the towers to get a
  visual upgrade too!"): see "The tower BUILDINGS" below. The owner picked
  treatment B; the Archer hall is in, the other twelve follow a hall at a
  time, so new-style people still stand on some old-style halls.
- **Next, in the order agreed with the owner:** the rest of the rigs a few
  at a time (crown soldiers, then Iron, Hollow, Rime) (keep each chapter's colours: style guide, "The three armies'
  colours"), the castle's people and the build crew (`fig-halberdier.js` is
  drawn, not wired), then the joint lab on the new skeleton. Ask before
  changing a figure the owner has already approved.
- The concept sheet is still published to the owner as a private Artifact
  page ("Crownguard Sprite Concepts"); `node scripts/build-concept-sheet.mjs`
  rebuilds it from `concept-sheet.html` + `concept/sheet.js`.
- The measured answer to "how feasible is more fidelity": the board has no
  spare pixels (an art pixel is 1 to 1.3 screen pixels); the gain is better
  pixels and more frames, plus 2x sculpts for menus and the title screen.
  Light measured at about +0.8 ms for 300 lit figures on the dev Mac.
- How it ran: the lead wrote the kit and the first figure (the mage), then
  two artists drew the goblin + orc and the necromancer against it as the
  worked example, each in its own `fig-*.js`. The horde ran the same way with
  four artists (heavies; goblin kin; four-legged, who also wrote `beast.js`;
  fliers) on one shared brief, each reporting its `BOX`, clips, the blow's
  phase and the four legacy frames, which is all the lead needs to fill a
  `PIX` entry. The usage limit cut all four off mid-pass: a WIP commit, then
  `SendMessage` with a tool-call budget, brought each back with its context.
  Artists look at their work with `node scripts/concept-render.mjs` (no
  browser); only the lead puts figures on the board and checks them in
  `shotlab.html` (`&set=healCd:900,hp:9999` lays fields on the lab's foes, to
  catch a cast or keep a foe alive).
- **The same day, two castle fixes** (owner: soldiers on the home screen
  "entirely obscured by the walls in front of them"; board walls "weirdly
  clippy" or not making sense geometrically): the title castle's garrison now
  stands in the crenels (style guide, "The title screen": "Nobody hides
  behind a wall"), and the board castle got an audit pass (style guide, "The
  castle": three values, leaning south-face details, stair turrets on the
  flags, a tall gate arch with a portcullis, crews standing clear of
  merlons). `wallSlots` / `towerDeck` moved a few px (where the wall's arrows
  and bolts start; 22 of 68 realms have one walk slot fewer, the spare
  bowmen stand on tower decks). Both pending the owner's look.

## The effects pass (2026-11-15, owner request)

"Apply a graphics pass to the effects ... status effects, splash damage, raising dead ... I do like
the flashing rings of the magic spells." Concept page: private Artifact "Crownguard Effects
Concepts" (`fx-concepts.html` + `concept/fx-concepts.js`; `node scripts/build-fx-concepts.mjs`
writes `.shots/fx-concepts/` with Today / A / B / C pick buttons). **The owner's picks (all in the
game):** burn B, poison A, slow B, frozen B, stun A, shield pips A, crack A, physical hit B,
shrapnel B, heal wave B, death poof B; magic hit, catapult / keg blast and raising the dead kept
as they were. `src/render/statusfx.js` bakes each mark / hit / death poof per kind, size bucket
and frame and blits it (cache cap 900); fx.js `drawStatus`, enemies.js's pips and draw.js's `hit`
and `death` branches call it; the shrapnel tail is in fx.js, the heal swell in rings.js. Measured:
drawStatus for 200 foes 1.30 -> 0.79 ms; 300 hits + 50 shards + 50 poofs 0.30 -> 0.26 ms. No body
tint (it would need tinted rigs); the death smoke is easy to miss in a crowd.

**Round 2** (owner, 2026-11-16; brief `art/briefs/fx-round2.md`): raising the dead is IN the game as the
owner's mix, the original violet / green witch-fire over concept B's ground (rings.js `case "raise"`:
`graveS`, `mistS`, clods, drawn at fx.y + 6, a goblin's feet); a LEVEL upgrade now has a pix mason
(builders.js `workerSprite`) on the scaffold knocking twice, `RAISE_SECS.level` 0.45 -> 0.72 s
(buildanim.js `raiseLevel`). Concepts for the bell toll, plague burst, level up, path / final,
fire on a foe (again) and burning ground: private Artifact "Crownguard Effects Concepts, Round 2"
(`node scripts/build-fx-concepts.mjs round2` -> `.shots/fx-concepts-round2/`). The owner picked (same day): **toll B, plague burst B** (bubbles of many sizes that slowly pop; its
effect now lasts 1.4 s), **level up A, path / final A** (now `case "levelup"/"evolve"` in rings.js;
the green / gold dot `burst` pushes are gone from actions.js), and **fire on a foe between A and B**
(statusfx.js `burnSprite`: joined flame clusters on the back and at the feet, face clear, ground glow,
embers, a wisp; 200 burning foes 1.36 -> 1.24 ms). Ground rings never draw over a body, only under it;
the rings round a hall keep their front half over its base (style guide, "Effects on the ground"). Burning ground was redone (take 2): private
Artifact "Crownguard Effects Concepts, Burning Ground" (`build-fx-concepts.mjs round3`): the owner
picked **B**, now in the game (flames.js `drawFireGround` + `drawFireFront`, the front tongues drawn
after the figures in draw.js; baked per radius bucket, shape and frame; `fxfire-lab.html`). `fx3g-lab.html` shows the rings with a real hall and foes standing in them.

**Round 4** (2026-11-17, owner: "have Fable do a sweep"): Fable's report of old-style art and weak effects is
`art/briefs/fable-sweep-2026-11-17.md`; the brief `art/briefs/fx-round4.md`. Three Sonnet artists drew A/B/C for
puddles + wet road, flooded road, lightning on the ground (`concept/fx-r4-water.js`), fire and frost novas, lava /
plague / spore pools (`fx-r4-novas.js`), longship landing / sinking, serpent surfacing, frozen hall
(`fx-r4-rime.js`); gathered by `concept/fx-r4.js`. Private Artifact "Crownguard Effects Concepts, Round 4"
(`node scripts/build-fx-concepts.mjs round4`; this round's viewer plays each option first, frames below, the
owner's ask). **The owner's picks, IN THE GAME (2026-11-17, pending their look):** puddles A,
"show up more gradually, and disappear more gradually" (weatherfx.js `puddleLevel`: staggered thresholds, each grows
from its middle, drains over `PUD_DRY` 170 s of combat, freezes between waves; ground-coloured `puddle(wu, v, kind)`);
flood B (`floodDress`, `FLOOD_R` 27); lightning ground B (`crackSprite`, `steamPuff`); storm ground +0.55 ms a frame.
Fire / frost nova B, both squashed to 0.55 "to maintain that 3D effect" (ringflash.js follows), the frost's inside
fill dialled back; pools B (fx.js `poolSprite`, 6 frames). Longship / sinking / serpent boil / frozen hall B
(rimefx.js: pixel kit, `drawFrostShells` per-hall masks baked per form and phase, `drawFrostGround` called in
draw.js under the foes, `warmFrost` bakes one form a frame while a freezer lives). The lab reloads on any `fx-r4*.js` edit and stalls in a hidden pane.

**The last old-style art** (2026-11-17, owner: "just do all"; brief `art/briefs/old-art-last.md`, the
checked list at the end of `art/briefs/fable-sweep-2026-11-17.md`; pending the owner's look): the halls'
moving rings are stepped pixel rings (`src/render/halls/pixrings.js` `pxArc` / `pxRing`; the Warden pulse
now lies on the ground at 0.7 and was not seen firing in a lab); the vale pieces are pix sculpts
(`src/render/pix/vale-pix.js`; mill wheel and cottage smoke still the old live painters; marram and thistle
untouched; weak: the upturned boat, the haywain's wheels); the title screen's flags, banners, smoke and
birds are sculpted (titleCrowd.js; the torch flames are buildkit's); the campaign map's buildings got shared
masonry / tile / lit-window helpers in mapArt.js and the crown castle was redrawn (its gate had been hidden
behind the keep); then the bergs, seal rocks, rune stones, Rime pines and kraken's arms, marram, thistle,
the upturned boat and haywain wheels. **Range rings** (owner, same day: "the range ring looks dated"; brief
`art/briefs/range-rings.md`): `src/render/rangering.js` `drawRangeRing` (a true circle, one-pixel lit / shaded
line, outer tinted shade, Bayer band fading inward, drifting dashes; baked per radius, colour, fill) ; no tile or square under
the build ghost (owner: "i dont want the square at all"; `drawPlate` is unused); draw.js's `rangeRing` wraps it, every caller unchanged; selected gold
is now rgba(240,176,40). `rr-lab.html` (`mode=sel|build&build=<kind>&wx=1&old=1`). ~+0.05 ms a ring.

**Round 5** (2026-11-18, owner: "The on fire effect, i dont like", the raise-dead spiral should coil "around the enemy
being raised, not in front", "some lighting effects", and "revisit nova effect for ice"; brief `art/briefs/fx-round5.md`):
FOUR options a row (A-D; the lab and viewer take an optional `D`), all with light painted as `addLight` would.
`concept/fx-r5-{burn,raise,nova}.js` (rows `burn5`, `raise5`, `frostnova5`), gathered by `concept/fx-r5.js`; private
Artifact "Crownguard Effects Concepts, Round 5" (`node scripts/build-fx-concepts.mjs round5`). **The owner's picks, IN THE GAME
(same day; brief `art/briefs/fx-round5-build.md`; pending their look):** fire **B** (statusfx.js `statusBurn`: the outline of the
very frame drawn burns, read through `e._rf` set in enemies.js, edge data per frame canvas in a WeakMap, baked once per frame and
step, at most 2 bakes a frame; a burning foe is a small `addLight`, 12 a frame, draw.js); raise **B** without the clods or the
grave's lines (rings.js `case "raise"`: three ribbons whose far half is in the GR layer, under the risen; the grave, its ring and ribbons centred on the risen's SOLE line `fx.fy` (= y + size x 0.55, set at all four raise pushes in update.js), and a climbing walker clipped at the ground (enemies.js `climbing`), so he comes up out of the dark earth whatever his size (owner: "looks like he's floating", then "his feet need to be in the dark spot"; Fable's diagnosis: the effect was pushed at the body's centre); the lab's TODAY raise places him as enemies.js does); frost nova **B + C**
(rings.js `case "frostnova"`: C's lit glass floor and glaze, B's see-through spikes rising in turn round the circle, the glass floor
coming in WITH them, swept from the top with curled, wobbling edges, no straight spoke (owner: "have it come in with the icicles", "more rounded irregular sweep"; rings.js `novaWedge`, `curl`), over `NOVA_SWEEP` 0.45 of its 800 ms (owner: "i liked the spinny effect from b"; the nova was 500 ms, both pushes now carry `life: 800`), then shattering; ringflash.js flashes each foe as its spike rises). The risen look
(rigs.js `boneify`) was redone: a five-step bone ramp keeping the figure's shading, rags keep a dim hint of their colour, the eyes
witch-fire green each in its own socket, ribs only on small upright figures.
The same day the **Rimecaller's nova fires only with a foe in its aura** (update.js: the clock charges, then holds until a
live, non-neutral, surfaced foe is within range; it used to go off every `novaEvery` even between waves), and the Warden
Mage's slow-aura pulse (halls/warden.js, the "second ring") lies at the nova's 0.55, not 0.7.

## Smaller blasts, a slower catapult that loads by hand (2026-11-17, owner request)

Provisional ("we'll see how that feels"). `aoe-lab.html` showed every blast PICTURE is exactly
as wide as its damage circle (the picture squashes to 0.7 tall; the damage circle is round), so
the owner cut the AREAS: every wizard `splash` halved (55-76 -> 28-38), every catapult throwing
step's x0.75 (58-105 -> 44-79). Catapult levels 1-3 reload x1.25 (`rate` 2600/2500/2400 ->
3250/3125/3000; the Trebuchet line unchanged). Its stones leave no scorch now (update.js; the
dust burst stays). The reload shows it: the arm is winched down by `COCK_END` 0.5 of the reload,
then the engineer stoops, lifts a stone from beside his feet and heaves it overhead into the cup
(fig-engineer.js `winchLoad`, `LOAD_PICK`; halls/catapult.js `loadPlan`, the stone flies the last
`LOAD_FLY` 200 ms); only then is it loaded. The trebuchet loads its sling the same way. The cup
is bigger (hall-catapult.js `armInto`). `--endure` seed 1, better doctrine, old -> new: gw3 33 ->
82, ir3 425 -> 557 castle damage (all held). The raise-dead ground (rings.js `graveS`) is turned
earth now, not near-black, and fades in over the first 40% of the rise.
**Scale pass, same day** (owner: "Heroes should be bigger than the normal soldiers. Grand
champion should be the same size as the heroes", and "Redraw them taller", not a blown-up sprite):
every hero is 55-56 art px tall (was 40-51), the Champion 68 -> 55, a garrison knight stays 44.
The figures were rebuilt at the bigger size through a scaling wrapper in each fig file (shapes
rasterised at the new size, 1-px lines and dots kept 1 px, heads regrown); Aldric's and Osric's
approved swings keep their keyframes. Wren's `AIM` scales with her (muzzles.js reads it live);
Ysolde's `STORM_TIP` (rigs-crown.js) x1.22. The siege ram is back to the old rig's footprint
(~102 x 61 board px, BOX 252 x 140; it had drawn at half that) with 1-px detail, `per` 1.74 -> 3.5.
Brief `art/briefs/scale-pass.md`; `scale-lab.html` lines the figures up on one ground line (copy
old versions to `src/render/pix/zzold-<name>.js` for a BEFORE row). The cavalier and gryphon were
redrawn at the old rigs' size (72 / 94 art px) and the owner turned it down: "that horse is too
big, and griffin too ... keep those riders down to the same size as the normal troops"; they stay
at 58 / 62 (their riders at a soldier's size). Don't grow them again unasked. Figures draw at one fixed 0.5 board px an art px.

## The Stormcaller line hits harder (2026-11-21, owner request)

"Increase the lightning mage's power, he does a lot less dps than the fire mage." Provisional. An `arc`
is the number of foes a bolt strikes in all (the first included), each `arcFall` of the last. Stormcaller
dmg 42 -> 58, arc 3 -> 4, arcFall 0.7 -> 0.75; Tempest Court dmg 46 -> 64, arcFall 0.8 -> 0.85; Thunder
Sovereign dmg 125 -> 145. `bench-hall.mjs --kind wizard` (x3 hp, seeds 2), crowd / armor, old -> new:
Stormcaller 66 / 71 -> 113 / 121 (Pyromancer 130 / 80), Tempest Court 129 / 134 -> 200 / 210 (Inferno
Throne 245 / 140, Dragonbreath 190 / 115), Thunder Sovereign 181 / 198 -> 211 / 229. Lightning now trails
fire a little on a packed crowd and leads it on a sparse armoured line. Not simmed.

## Slower blasts, a softer keg, a smaller Rimecaller (2026-11-18, owner request)

"Make it so explosions propagate a bit slower. I like seeing the wave of damage emanate from the
centre." `BLAST_PACE` (update.js, the effects tick) plays boom / keg / arcane / frost / dust effects
at 0.6 speed, so the picture, the ring and its white flash (ringflash.js) all run ~1.7x longer
together. Then (owner: "I want this yes") the DAMAGE rides the wave too: a splash
shot's and the Powder Keg's blast pick their victims at the blow as before, then `queueHit` /
`blastDelay` strike each as the ring's front reaches its distance (up to ~384 ms out at the rim;
`g.blastHits`, run in the effects tick, cleared by a retried wave); a foe dead or gone meanwhile is
skipped. Burn / slow / crack land with the hit. Traps' bombs and the Powder Works' charge are untouched. The Powder Keg Run's blast AREA halved
(`logBlast` 96 -> 48; its damage 220 kept); the Rimecaller's `range` 101 -> 51 and its finals' 109 ->
55 (Absolute Zero, Permafrost Heart). Provisional. Then (owner, 2026-11-20: "touch the far side of the
track when placed on the other side") 72 / finals 76: a Warden Mage hugging the road stands 39-45 from its
centre line (footing `support`), so the far marching lane (+21) is 60-66 away and the road's far edge 71-77.

## Walking up the screen; the squeeze turn (2026-11-17, owner request)

"When they are walking up, it almost looks like they are moonwalking." The cheap fix
(no new art): on up / down stretches every two-legged figure plays a foreshortened walk
made from its own side walk (feet under the body), blended in round corners, and a
change of facing is a 200 ms SQUEEZE (narrow, mirror, widen) instead of a one-frame flip.
Render only, the engine is untouched. Style guide, "Walking up and down the screen";
`march-lab.html` (today vs fix on the goblin). The squeeze was DROPPED the same day (owner,
after seeing the goblin's front / back views without it: "drop it"): `SQUEEZE = false` in
src/render/march.js, a facing change is the plain one-frame flip again.
**Front and back views** (same day, owner: "front and back views look great"): the goblin's
FRONT (walking down) and BACK (walking up) walks are drawn, `src/render/pix/fig-goblin-views.js`
(brief `art/briefs/goblin-views.md`, a Sonnet artist), IN THE GAME the same day (PIX
`views`, style guide "Front and back views"), then "lets get started on the rest";
`views-lab.html?fig=<name>` shows any figure's.
**The whole cast has views** (same day: ~66 PIX types, 15 Sonnet artists plus one Opus for the
war-mammoth's front). Owner's rules for every view (art/briefs/views-artist.md): shields clear of
the head in FRONT; every weapon kept from BEHIND at its true depth (hidden only by the body); feet
connected; the weapon IN the fist. Each figure switches on through `VIEWS_ON` (pixrigs.js) once the
lead has checked it. **Owner feedback page:** private Artifact "Crownguard Front and Back Views"
(slug 8fb9b2d0-5e54-4d21-be4c-af059cc36945): every figure animated side / front / back, its frames,
a note box per figure. Notes land in its db collection `feedback` (`db_list`); answer by setting
`reply` (and `done: true`) on the note with `db_write`. Rebuild: `node scripts/build-views-preview.mjs`,
then republish `scratchpad/views-preview/` with publish_files (slug + base_version).
**Back views use their own depth stack** (Fable's diagnosis, same day, after the owner kept seeing
arms "folded behind the back"): in BACK higher z is BEHIND him, so held things go at the bottom,
arms just above the torso, back gear above them (art/briefs/views-artist.md, "The BACK stack").
Every BACK view was rebuilt on it. Artists: never search outside the repo (a `find /` raised macOS
privacy prompts on the owner's Mac). Three-quarter turning poses at the corners were drawn and
rejected the same day (owner: "it was better before. Lets leave it as just side, front, and
back"): a view change is a plain switch; don't add in-between turn frames unasked. A sprite-stacked goblin was tried first and set aside
(`stack-lab.html`, `concept/stack-goblin.js`: turns to any angle but reads blobby at our camera).
The bigger option put to them and NOT started: real front / back views (a yaw in the
skeleton plus a hand-drawn front and back head for every figure; weeks of artist work).

## "New sprites" is no longer a setting (owner, 2026-11-15)

"You can take out the use old sprites thing": the switch is gone from Settings' Display tab
and `prefs.newSprites` is forced true at load (a saved false is ignored). **The old
painters were then deleted** (same day, `art/briefs/cleanup-old-sprites.md`): every hall's
old building and crew, the old rig painters (rigs-horde / beasts / iron / ironmounts /
hollow / hollowbeasts / rime / covert.js and folk-workers.js are gone; `RIGS` is built
from `PIX` plus the kraken and its arm; rigs-crown.js keeps `CROWN_FIGHT_FRAMES` and a
measured `stormStaffTip`), the old castle crews, title garrison, projectile shapes, decor
rings and scenery painters. KEPT on purpose: what the engine and sims read
(muzzles.js: `archerPose`, `mageTip`, `musketMuzzle`, `musketPoint`, `mistressGlove`, the
skiff functions; checked identical to before), the kraken's old rigs, src/sprites/ (icons,
draw.js). Removed labs that only showed the old drawings: joint-lab.html, joint-sets/,
crew-lab.html, sheet.html. Notes below that mention "New sprites off" or the old rigs
describe code that no longer exists.

## The roster and scenery concept round (2026-11-14, owner's picks)

The private Artifact "Crownguard Roster and Scenery Concepts" showed A faithful / B storied /
C bold for three heroes, two figures per army and the ground. The owner picked, per figure:
- **Osric A**; **Hale C without the banner on the halberd**; **Ysolde A**.
- **Iron:** levy **B** ("they all have some shield clipping issues": fix the shield); Aegis
  Magister **A with C's caged-crystal staff**.
- **Hollow:** Risen **A**; wraith **B**.
- **Rime:** thrall **C**; berserker **C**.
- **Ground and trees: C** (bolder), "but don't make the lanes in the road so obvious".
  The castle wall in that sheet was a stand-in: the castle gets its own concept round.
- **The other chapters' ground** (second concept page, "Crownguard Environment Concepts: Iron,
  Hollow, Rime"; renderers `concept/scenery-{iron,hollow,rime}.js`): **Iron B, Hollow B,
  Rime C.** look-c.js's `turf` (Iron) and `marsh` (Hollow) dials were eased to half the push.
- **The castle: B** (private Artifact "Crownguard Castle Concepts"; `concept/castle-concept.js`,
  `castle-concept.html`), and the owner's main ask: "the turret being too close to the top
  of the gate. That's really what I want fixed" (the north gate tower, `GATE_TOWER_N` in
  data/castle.js). The title castle (`ui/titleArt.js`) follows after the board's.
  DONE on the board (2026-11-14, pending the owner's look): castle.js IS look B now (tinted
  one-pixel ink, block edges, ivy/moss/streaks where the ground suits, tile roofs, arch
  voussoirs, baked torch and slit light pools; `bakeCastleRun` matches). The north gate
  tower stood at `gateTowerN(gy)` (-80, clamped) from the gate until the same day's symmetry
  pass, which undid it: see "The gate is a mirror" in the style guide's castle section
  (gate block +-40, a gate tower flush against each end at -66.5 / 45.5, the keep centred,
  both ballistae on a deck, the first two bowmen on the block's deck; the drums re-space,
  `DRUM_MIN` 90, and no board has a crew spot off it). Pending the owner's look. First-sight castle bake ~+30 ms. Labs:
  `castle-compare.html` (before | after; `concept/castle-before.js` is the old file).
The rest of each army follows its picks (Iron leans B, Hollow A-B, Rime C).
**The whole roster is in** (2026-11-14, Sonnet artists in two waves, the lead wiring `PIX`
and checking each group with `rigshot.html`): every hero, the crown's soldiers (garrison,
Paladin, squire, militia farmer/yeoman, Knights Errant, Crossbow Company, Lancers as the
cavalier's `errant` variant, Champion, field bowmen `fig-fieldbow.js`), all of Iron, Hollow
and Rime, the war-mammoth, the sea serpent, the gryphon, the ram. NOT yet seen in the game
by the owner. Held back or left:
- (Owner, 2026-11-14: "the kraken might not make it into the final game": don't spend more on it unasked.)
- **The kraken** (body and arm): `fig-kraken.js` / `fig-krakenarm.js` are drawn but NOT in
  `PIX`: the body still read as a cartoon after two passes, and a seized victim's coil is
  painted by the old `drawSeaHold` (rigs-rimebeasts.js), which would clash. Redo both together.
- The skald's `chant` clip is drawn, unused: the engine keeps no clock for his war-chant.
- Hale's crossbowmen use the Iron `crossbow` figure (they did before too).
- Still old: the castle's people (wall bowmen, halberdiers: `fig-halberdier.js` drawn, not
  wired), the build crew, the title crowd, the Covert's blades (rigs-covert.js).
**The ground in look C** (2026-11-14, three Sonnet artists, pending the owner's look):
`src/render/look-c.js` (a leaf module: no imports) holds the per-kind dials `LOOK_C`
(grass / turf / marsh / snow / ash: sat, spread, hue, dark) that world.js, groundblend.js
and apron.js read through `punchRamp` / `punchCols` / `toneOf`, plus `rich()` for leaves
(scenery.js re-exports it). Too loud? lower `grass.sat` / `grass.spread`. road.js: richer
dirt, stronger worn verge and pebbles, NO grass crown, ruts faint and broken (owner). The
Greenwood's oaks, pines, willows and vale pieces got bigger lit crowns and ragged cast
shadows (scenery.js, scenery-vale.js); Iron's trees share `leafClump` / `pineTree` and got
some of it. Then each chapter in its own pick: Iron B (scenery-iron.js: spruce, Scots pine,
crags, drystone wall and milestone re-sculpted in pix/pix.js, dappled cast shadows), Hollow B
(scenery-hollow.js: flags, wet sheen, peat, shadows, stepped wisp glow), Rime C
(scenery-rime.js + road.js's snow branch: blue-violet lee, bigger snow-laden spruce, rocks
with a dark body; a forest-depth shade bug fixed). Still old: bushes (world.js / apron.js
`bushSprite`), the gate threshold, the Rime longhouse / rack / whale bones / ship, the Iron
wall's stile post. rimewatch / rimefjord are the old Frostfang boards: check the Rime on
frostwake / whalebone.
- The recap (private Artifact "Crownguard: the graphics pass, before and after") was built with
  `recap-figs.html` (old vs new figure sheets, "New sprites" flipped in memory) and
  `hallshot.html?tag=recap`. Spotted then: the new ram, cavalier and gryphon draw smaller than the old.
- Sea monsters ask for named frames (`"sub.2"`): pixrigs.js `clipFrame` reads them, and
  drawSeaRig lays a new figure's `sub.*` at 0.55 alpha, the kraken's `deep.*` at 0.4. Figures in
`src/render/pix/fig-{friar,captain,storm,levy,magister,risen,wraith,thrall,berserker}.js`;
the scenery concept in `concept/scenery.js` + `scripts/scenery-render.mjs`.

## The tower BUILDINGS (2026-11-13/14, owner request)

"I want the towers to get a visual upgrade too": the halls themselves, to match
the new figures. A concept round (the private Artifact "Crownguard Tower
Concepts": Archer hall, Wizard Spire and Catapult as today | A clean | B worked
| C bolder) and **the owner picked B, "worked"** (2026-11-14): today's designs,
thin tinted line, one sun, stone by stone, weathering and ivy, lit windows,
torch and spell light on the stone.
- **All thirteen halls are in** (2026-11-14): every hall's building draws through
  `src/render/pix/hall-<kind>.js` while "New sprites" is on, old painters kept under the
  switch. The last five (Falconry, Powder Works, River Watch, Sunforge, Covert) were finished
  by Sonnet artists under the new workflow ("Who does what"). NOT yet seen in the game by the
  owner. Unchecked: the River Watch at a real river's edge (hallshot draws no water); the
  Covert's level-1 pup tent and the Kingslayer's banner crown are its artist's weak spots.
- **In the game: the Archer hall, all nine forms** (`src/render/pix/hall-archer.js`
  through the seam `src/render/pix/halls.js`; `halls/archer.js` asks for it
  while "New sprites" is on and keeps its old painter under the switch). NOT
  yet seen in the game by the owner. The other twelve halls still draw their
  old painters, so old and new buildings share the board for now.
- **How to do the next hall** is in the style guide, "The new halls": the
  contract, the kit (`hall-kit.js`), the rules, the labs. The one rule that
  bites: THE CREW DECIDES THE BUILDING. The engine starts shots from the old
  hall's crew spots, so a new building reads those numbers and is built round
  them; never move a spot.
- `hall-spire.js` and `hall-catapult.js` are still the concept sheet's
  versions (levels only, base-line coordinates): rebuild them like
  `hall-archer.js` before wiring. The concept page (`hall-concepts.html`,
  `concept/halls.js`, `node scripts/build-hall-concepts.mjs`) still runs;
  the published Artifact is the record of what the owner chose from.
- Measured: 90 new Archer halls with crews 12.2 ms against 12.0 ms old; a form
  bakes in ~5 ms on first sight. The build animation works on the new hall
  (`raise-lab.html`: 14 hard pixels for one frame at the hand-over).
- Estimates given to the owner: about 3 working days for all 13 halls in B.
  Told to the owner as follow-ons: the castle wall and scenery will then look
  oldest; the hawks, the cauldron's bubbles and other live bits the hall
  files still paint are old-style until each is redrawn.

## Fifteen levels a chapter (2026-10-03, owner request)

Each chapter grew from 11 to 15 levels: Greenwood gullwick, millrace,
thistlecrag, kingstones (realms in the new `src/data/realms-greenwood.js`);
Iron brinewick, ironmouth, wardenmoor, blackcliff; Hollow lanternfen,
abbeymere, barrowdowns, deadweir (realms at the end of realms-iron.js /
realms-hollow.js). Shape: 7 twenty-wave levels, 7 of twenty-five and the
boss (the Greenwood 6 + 8). New levels take windows and gold BETWEEN their
neighbours', so the levels already played keep theirs.
- `isUnlocked` also opens a level that is already cleared, so an old save
  keeps what it won when a new map lands before it; "Continue" then goes to
  the first new map not yet cleared.
- `xpFor`'s depth term runs 0 -> 1.5 over a chapter whatever its length.
- The continent grew new coast lobes (see the style guide, "The campaign
  map"); `check-map-water.mjs` holds each board's water (river / ponds /
  coast / dry) to its waypoint — a new board must keep the water kind the
  map shows. Pending the owner's playtest: Warden Moor bleeds ~2x Crowstair
  in the sim (late waves; gold barely moves it), the Lantern Fen bleeds on
  its wraith wave, the Kingstones is easy; Blackcliff's gold went 1200 ->
  1350. The vale's boards got pieces of their own (`scenery-vale.js`:
  standing stones, a watermill whose wheel turns in Millrace's race, the
  Gullwick fishing hamlet, marram, thistles); the fen's got will-o'-wisps,
  long and round barrows, a drowned bell-tower and abbey arcade standing in
  Abbeymere's water and a sluiced weir at the Dead Weir (`fenRelics`,
  `fenPools: false` for the dry Barrowdowns). Rivers can widen point by
  point (`ws`) and coasts set their cove `ease` (style guide, "Water, roads
  and ground").

## Knights Errant replace the Berserker path (2026-10-05, owner request)

Provisional, pending the owner's playtest ("barbarians don't fit the aesthetic").
The Knight Garrison's path `b` (ids unchanged, so saves keep their forms):
- **Knights Errant** (was Berserker Hall): 4 plate knights, dmg 38 / 640 ms /
  180 hp (the berserkers were 20 / 320 ms / 150: same dps, heavier blows).
  Livery: gunmetal plate, forest green, brass, off-white plume (distinct from
  the base knight's steel+navy, the paladins' ivory+gold, Aldric's red, Iron's
  oxblood). Rigs `errant`, `errantRider`, `errantBow`; hall in halls/garrison.js.
- **Lancer Order** (b.a, was Wolf Lodge): the same four mounted
  (`rider: true`, `unitSpeed` 150, `errantRider` = the Iron destrier painter with
  `p.house: "crown"`); the rally slots spread wider for a horse's length.
- **Crossbow Company** (b.b, was Blood Frenzy): `count` 4 with `bows: 2` and
  flat `bowHp/bowDmg/bowRate/bowRange`. syncUnits flags the LAST `bows` units
  `u.bow` (`u.rig = "errantBow"`); `runGarrison` (update.js) runs the knights
  with `runMelee` and the bowmen with `runRangedBand` over the same units, as
  the Levy's mixed bands do, so the bolts hit ANY foe in reach, fliers included.
  Skill-tree perks scale the `bow*` stats too (withPerks, BOW_PERK).
- `frenzy` / `lifesteal` stay in the engine but no hall uses them. The old
  `berserk` and `wolfrider` rigs are still registered (rimefx.js aliases name
  them); nothing in the army draws them.
- Lab note: `shotlab.html` and `bench-hall.mjs` now need `freeplay: true` in
  the game state or the tower-XP gate refuses the paths (shotlab has it; the
  bench still reports one number for every knight form).

## Home screen: Skills & Heroes, Castle Works (2026-10-05, owner request)

(Superseded 2026-11-25 by "The War Room" above: the pair is WAR ROOM | STATS now.)
Provisional, pending the owner's look (not yet seen in a browser by the session that wrote it).
- The title menu has a row of two under CONTINUE: **SKILLS & HEROES** (the old
  War Council; the name is `COUNCIL_NAME` in `ui/theme.js`, read by the button and
  the screen's heading, so renaming is one line) and **CASTLE WORKS** (the crown's
  treasury, the same box the campaign map opens: `ui/CastleWorksModal.jsx`, used by
  both; `buyTreasuryWork` in CrownguardGame.jsx pays for either). Over a save,
  NEW CAMPAIGN (still two taps) sits lower: under CONTINUE on wide/column, beside
  FREE PLAY in the compact grid.
- The screen's tabs read TOWERS / HEROES / ALL-TIME (was SKILL TREES). The HEROES
  tab shows ONE hero at a time on every layout, picked from a row (wide), rail
  (phone on its side) or toggle (upright), as the towers' tab does; before, the
  wide layout showed every hero's sheet at once.
- Other names offered to the owner: Training Grounds, Barracks, Upgrades, War Room.

## The War Room: one upgrades screen (2026-11-25, owner request)

"The separated upgrades menus (towers, heroes, castle) is confusing." `ui/WarRoom.jsx` (was
WarCouncil.jsx) is ONE screen laid over whatever opened it (render it outside any `<Fit>`), with tabs
CASTLE / TOWERS / HEROES. It ALWAYS opens on CASTLE (owner: no guessing what the player wants). A tab with
something affordable wears a slow gold rim glow (`cgRimGlow`; `castleCan` / `towersCan` / `heroesCan`), and gold
means ONLY that (owner, 2026-11-26): the open tab is a lighter slate with a cream underline (`PICKED`), no gold.
The glow is a NOTIFICATION (owner, 2026-11-26): a tab looked at and LEFT (another tab, or the room closed)
goes quiet, and lights again only when its money (treasury / free tower stars / all heroes' valor) is above
what it held when last left; the mark falls with the purse, so spending never relights it and the next
earning does. `crownguard.warroom.v1` (per save file). The tabs are wider (`tabW`) and centred on the
screen (a 1fr | auto | 1fr header).
The header shows the tab's own money (treasury gold, the towers' shared stars, the shown hero's stars)
and every tab's REFUND in the same spot, two taps, full price back: every castle work, the tower shown,
the hero shown (the hero sheet's Reset cell and the tree's one-tap Refund are gone). TOWERS shows each
hall's HALL EXPERIENCE (bar to the finals, a tick at the paths; a thin line under each picker tile; a
hall not yet learned says which level teaches it); the picker follows the tray's order (`hallRank`).
Opened from: the title's WAR ROOM button (its line shows stars and gold waiting), the campaign map's
header (WAR ROOM + treasury) and the victory card (castle works bought through the battle's own
`buyWork`, as before); `roomOpen` in CrownguardGame.jsx. The name is `WAR_ROOM` in ui/theme.js.
CastleWorksModal.jsx is gone; `CastleWorksList` takes `noPurse` when the caller shows the purse.
The all-time stats are their own **STATS** button beside it on the title (`ui/StatsPanel.jsx`: rank,
the reckoning, the wipe), so the title keeps six buttons two by two (owner, 2026-11-26: War Room | Free Play, Stats | Field Guide, Save Files | Settings; `menuPairs` in HomeScreen.jsx). **The hero is no longer chosen on the
map's level card** (owner: on a phone the row hid the weather): he is changed in battle before the
first horn (the hero's menu, "Change hero") or in the pause menu. Pending the owner's look.

## The star is sculpted (2026-11-26, owner's pick "B1 fuller")

The campaign star (`StarIcon`, ui/hud/icons.jsx: victory card, level card, title, War Room, save files,
Free Play) and the map's marker stars (mapArt.js `star`) all come from ONE generator,
`src/ui/starArt.js` `starPixels(n, lit)`: a rounded gold dome lit from the upper left, a cream shine on
its crown, a one-pixel tinted outline; unearned, the same star sunk into slate (light turned round).
`starArtSize` picks the art size (1 art px a CSS px on small icons, 2 on the victory card's big ones);
StarIcon draws 1.12x its box with negative margins so layouts keep the old footprint. The map's
marker stars are NOT on the map canvas (its coarse art grid made them blobs: owner, "they look terrible
in the map"): they are SVG symbols in the map's overlay (CampaignMap.jsx `StarSymbols` / `WaypointStars`,
15 art px, 6.2 map units wide, 5.7 apart), crisp at every zoom. `starPixels(n, lit, socket)`: an unearned
star on the level card's parchment is sunk into a parchment ramp (`socket="parch"`), not the dark slate. Concepts (A bevelled, B pillowy, C thick, then B1-B3)
were drawn from a scratch lab; A was turned down for its dead dark bottom-right point.

**The map's names are ribbons** (owner, 2026-11-26, after options A hung pennants / B oak signboards / C rolled
scrolls: "I like this! Could we use that for the map level labels?", of A's chapter ribbon): every level's name and every
chapter's name is the same folded ribbon (CampaignMap.jsx `Ribbon`: red cloth edged in gold, both ends tucked under,
dropped and cut in a V, the band's gold trim carried round each tail and meeting at the V's point (`insetPath`); slate while sealed; `Scroll` and `Banner` size it). The level ribbons' tails (`tail` 5.5) are
held short so no two names touch with every level open (checked by bounding boxes on the real map: 64 labels, no
overlap; at 7 Brinewick and Ironmouth touched).
**The chapter titles** (owner, 2026-11-27, from A crested ribbon / B chart cartouche / C chapter colours: "love C, and
those emblems ... put the emblem above like in A"): CampaignMap.jsx `Banner` is the same `Ribbon` in the chapter's own
colour (`CHAPTER_COL`, `src/ui/chapterArt.js`: Greenwood green, Iron steel blue, Hollow purple, Rime frost blue), with a
shield standing on it bearing the chapter's gold sigil (`crestPixels(id, open, "shield")`: oak leaf, barred helm, skull,
snowflake; a padlock on slate while sealed), and a small "CHAPTER II" under the ribbon (owner: "put the chapter 1 stuff below"). The map keeps its scenery off the whole piece
(mapArt.js `BANNERS`, the crest included).
**The map's markers are sculpted** (owner, same day: B, the swallowtail, "but in the newer style", then "Flags from 2
shields from 3"): `src/ui/markerArt.js` sculpts them pixel by pixel like the star (lit from the upper left, tinted
one-pixel line): `flagPixels(style, frame)` (the ribbons' red, gold edged, a gold crown, a gold ball on the pole; style 2
WAVES over `FLAG_FRAMES` 6 frames) and `shieldPixels(style, kind)` (open sword / boss skull / locked padlock / locked
boss; style 3 has gold studs). Drawn crisp in the map's SVG overlay (CampaignMap.jsx `MarkerSymbols` /
`WaypointMarkers`, `FLAG_STYLE` 2, `SHIELD_STYLE` 3), not on the map canvas (it keeps only their ground shadows): the
flag at the stars' 2.42 art px a unit, the shield at 2.1 to stand as wide as the old one. Each won flag is its own
small nested `<svg>` whose frame strip slides in CSS `steps()` (an animation inside a shared `<symbol>` may not play
through `<use>` in WebKit), each at its own point in the ripple. Styles 1 (still) and 3 (spear point, fringe, cord and
tassel) of the flag, 1 of the shield, are drawn and unused. Seen animating in Chromium only, not yet on an iPhone.

## Tower XP and the hall unlocks (2026-10-05, owner request)

Provisional, pending the owner's playtest.
- **Three halls at the start** (archer, knight, wizard). The rest are learned
  by clearing a level (`TOWER_UNLOCKS`, campaign.js), in this order and with
  these gaps over the continent's 60 levels: Bladewheel gw1 (1), Catapult
  gullwick (3), Warden Mage gw3 (6), River Watch gw4 (8), Trapsmith
  ravenscar (12), Gold Works gw5 (15) (swapped 2026-11-07, owner: the
  Gold Works waits until the first region is won), Falconry brinewick (19), Assassin's
  Covert kestrel (23), Powder Works wardenmoor (27), Sunforge hl1 (31), King's Band stillmere (35). The
  Warden Mage is locked on the first levels now. The tray's grid lists the halls in that order (the three
  starting halls, then by unlock level: `hallRank`, campaign.js; owner, 2026-11-25), so a newly
  learned hall joins the end and none moves; the master menu uses the same order. `towerUnlocked` also opens a
  hall once ANY later level is cleared, so an old save keeps what it had.
- **Tower XP, per hall TYPE** (`src/data/towerxp.js`, header has the rules):
  levels 1-3 are free; the PATHS (tier 4) need `TIER_XP[4]` 2500 and the FINALS
  (tier 5) `TIER_XP[5]` 10000 (raised from 600 / 2400, then 1800 / 7000, the
  same day: the owner wants a harder first area) (both live in profile.js, re-exported). XP is
  earned in campaign battles by a hall's kills (1 + a tenth of the bounty),
  except the Trapsmith, which learns from the HARM it does (owner,
  2026-11-08: it wears foes down but seldom has the kill; `HARM_XP` in
  towerxp.js, dealDamage in actions.js): a blow that takes a fifth of a
  foe's max health pays a fifth of its kill XP, its own kill pays only the
  rest, overkill pays nothing, `e.harmXp` caps a mended foe at its worth.
  Every other hall still gets the full kill (sims byte-identical). In the
  Greenwood sims (`--xp --ledger`, seeds 1-2) halls earn per 1k damage:
  archer 15, knight 16, catapult 10, wizard 8, Bladewheel 7 (duty XP
  included); damage XP pays the average, so the Trapsmith should land near
  the catapult / wizard (it is never simmed). Scratch harness, a level-3
  Trapsmith upstream of a level-3 archer: at x4 hp ~1 -> ~138 XP a run.
  Also the Warden Mage's aura kills (x0.25), the Gold Works' wages (x0.3) and 6
  XP for every wave a kind stands through. The ledger is `g.towerXp` (kept
  by the retry-wave snapshot); `bankLedger` (CrownguardGame.jsx) banks it into
  `profile.towerXp` when a battle ends or is left (the profile merges with max,
  so a stale React profile never takes XP back). The gate (`tierGate`) reads
  banked + ledger, so a hall can ripen mid-battle; it guards `branchTower`,
  `ascendTower` and `placeMasterTower` (the master menu hides forms not yet
  earned). Free Play (sandbox / `g.freeplay`) opens every tier and earns
  nothing, and so does the Endless March after a win (`g.victory`, owner
  2026-10-05); `UNLOCK_ALL` opens all for testing. A save that has already
  fought gets `VETERAN_XP` (the paths) on every hall, finals still to earn.
  UI: a "Locked" card with a progress bar replaces the paths/finals cards
  (`lockNote` in towerPanel); the end-of-battle card lists "Hall experience".
- Measured with `node scripts/sim.mjs --chapter greenwood --endure --xp`: a main
  hall (archer/knight/wizard) earns ~450-600 XP a level on the first six
  levels, ~700-1000 mid-chapter, 2000+ on the Warrens (cumulative archer:
  ~1500 after Gullwick, ~4700 after the Barrowfields, ~7900 after the
  Kingstones). At 1800 / 7000 paths opened about level 4 and finals about
  level 11; at 2500 / 10000 expect about level 5-6 and level 14-15 (the
  chapter's end) for a hall used from the start; halls learned later start from zero. The sims buy
  whatever they like unless `--xp-gate` is given. Early levels bled a little
  more without the Warden Mage (gw2 / Gullwick burst plan ~100-140 vs 20-35).

## Weather brief on the level card (2026-10-05, owner request)

Provisional, pending the owner's look. The campaign map's level card (full and
phone versions) has a WEATHER section (the old ON THE ROAD enemy row was removed, owner 2026-10-05): `ui/WeatherBrief.jsx`
shows the kind's pixel icon (`WeatherIcon`, WeatherForecast.jsx; the sun for
"Clear skies"), its name, strength pips (Mild / Strong / Fierce from the
chapter plan's strength) and when it first comes, with an (i) that unfolds what it
does, how often it returns and how to meet it. The wording is `data/weather-info.js`
(`briefOf(spec)`): lore and advice written per kind, every number read from the
graded kind via `weatherDefOf` (engine/weather.js), so a retuned kind retells
itself. **The fog fades with the level** (owner, 2026-11-07; replaces the
2026-10-05 spells): it opens at its thickest from the first build phase and
thins with the level's progress — half as thick a quarter of the way through
its waves, gone by halfway (15 waves: midway through wave 8), never back.
`fade: true` on the kind, `fogTick` in engine/weather.js: progress = waves
done + the wave in hand's spawn clock over (its last spawn + a road-walk), out
of `victoryWave()` (20 for an open Free Play run); `w.fogP` eases toward it
only in combat (3 s), so it holds still between waves; a retried wave puts it
back where that wave began. Thickness k bites as `fx.reach` 0.65 x k (35% less
reach at k 1). The strength meter's three steps (`strengthTier`, weather.js;
the card's pips read it) set the thickness `peak`: Mild 15/35, Strong 25/35,
Fierce 1, so 15% / 25% / 35% less reach at the start (gw3-thistlecrag Mild;
kingstones, ravenscar, blackbriar Strong; cinderholt and gw5 Fierce). A
FIERCE fog never lifts all the way (owner, 2026-11-07): it thins to a light
fog, `floor` (FOG_FLOOR 5/35, so 5% less reach), by halfway and lingers all
level (phase "lingering", forecast "Light fog"); k = floor + (peak - floor) x
thickness. It is DRAWN as heavy as k `LINGER_LOOK` 0.3 (weatherfx.js) so the
late waves stand in visible patches. Measured `--endure` seeds 1-2, fade-to-0
-> floor: Cinderholt swarm 116/85 -> 215/192, burst 344/361 -> 421/453; the
Warrens swarm 206/307 -> 388/156, burst ~1030 -> ~1070. Each hall stands in a
fixed 48-unit pocket of clearer air (`FOG_POCKET`): until 2026-11-07 the pocket
was the old sight / thickness and, below ~40% thickness, cleared the WHOLE
layer, so the fog looked gone waves before it was (owner: "gone at 10 instead
of 13" on Cinderholt). **Since 2026-11-24 (owner: "just lightening up the fog when it goes over them")
no hole is cut:** the fog THINS over each hall (weatherfx.js `thinHalls`, a smooth ellipse the
hall's footing size, `FOG_THIN` 0.6 taken away at its middle; `B.thinning`), and the LAMPS come on:
`lampsOn` (nightlight.js) is true under the night OR while the fog painter ticks `fogLampTick`
(any fog at all: the owner, "always have them on for the fog, once its clear they turn off"), so every hall's torches, the garrison's lantern, the overhaul farms'
windows and lanterns and the bridges' lamps glow through it (blooms at `FOG_LAMP` 0.8 whatever the thickness,
pools at `FOG_POOL` 0.45 of that, laid over the fog), each lamp dimmed where the picture behind it is
already bright (owner: lanterns in the golden hour's glow burned white; `sampleLum` shrinks the board's canvas
to 160 px wide and reads it back every 0.4 s, `lampWeight`: full up to luminance `LUM_LO` 0.6, 0.3 at `LUM_HI` 0.72). The moon's eyes still read `nightOn`.
**No extra fog over water** (owner, 2026-11-26: a pale band along a river "looks broken"): weatherfx.js `landAt` no longer thickens the fog over rivers, ponds, lakes or the sea; only the wood does.
`fog-lab.html?realm=&sun=&ks=1,0.5&towers=&box=` holds the fog at any thickness (wx-lab can't). The painter's sun reads `w.thick` (0..1 from floor to
peak), so a Mild fog opens thinner, never as if lifting. The forecast says Thick fog / Fog
lifting / Clear from where the level will stand at that wave.
`sim.mjs --wx-trace` prints k at each horn. Measured `--endure`, seeds 1-2,
all ten fog levels, both doctrines: 9453 castle damage before, 9149 after
(Cinderholt swarm ~200 -> ~100, the Warrens swarm 155/203 -> 206/307, the
rest within noise): the old fog's returning banks bit late, where the bleed
is. **Range rings show it** (owner, 2026-11-07): placing or selecting a hall
rings its reach NOW (`getStats`, with the weather's cut and its skill-tree
perks; the build ghost used the raw level-1 range before) and, while weather
cuts reach, a second slate ring at its full reach (`getStatsClear`,
engine/towers.js; `fullRing` in draw.js); an armed upgrade's preview gets both
too. While any weather is up the rings draw ABOVE it (`drawRanges` after
`drawWeather`), else under the halls as before. The `sight` machinery stays in
the engine, unused. A new kind needs an entry in `WEATHER_INFO` there, a `FORECAST` line
(weather.js) and an icon in WeatherForecast.jsx's `PX`. The card asks
`weatherFor(level) ?? realm.weather`, the same call the battle makes. The
in-battle wave preview chip (ui/WeatherForecast.jsx) has an (i) that shows
ONLY the weather right now (owner, 2026-11-07: "too much wordy explanation ...
just show current effects"): `nowOf(g)` (data/weather-info.js) gives the stage
word, a strength bar (k) and the effects this moment read from the live
multipliers `WX` (so the numbers are the engine's). `nowOf` also works out what
comes next (`next`: the fog's "half as thick by wave X, gone by wave Y", a timed
kind's seconds of fighting left), which the chip does not show. **Fog and mist beyond the board:** they paint on the board's
own canvas, so a taller screen (iPad) showed them stop at its edge. They paint
into a WIDE layer (render/weatherfx.js `wideLayer`) that runs as far past each
edge as the screen needs (`NEED`, measured by the last `paintWeatherEdge`, at
most `FOG_WIDE` 160 units, its rim faded beyond that; 0 on a phone, which keeps
the old board-sized layer); the board shows its middle and `paintWeatherEdge`
lays the whole of it, once and unmirrored, on a canvas under the board
(`edgeRef` in CrownguardGame.jsx, beside the veil div), shaded with the apron's
own vignette and falloff (`apronShade`, apron.js) as the board's fog is by its
grade. So the fog banks are periodic BOTH ways (cells 140x80 / 70x40 / 35x20,
weatherbake.js), the land's field runs on past the edge easing to the edges'
mean (`bakeFogWide`), and the sun shafts are baked wide (`fogShafts(m)`).
Before 2026-11-07 the layer was MIRRORED at each edge (owner, on an iPad:
"rough, like mirrored at the edges"), and a flat fog veil over the apron made
a band of its own; fog has no `weatherVeil` now. Storm / blizzard / eruption
still use only the flat `weatherVeil` beyond the board. Look at it in Free
Play at an iPad size (e.g. 1180x820); `window.__g.weather.clock` jumps the
spell (`segAt` in engine/weather.js finds a phase).

## The storm's rain bites (2026-11-08, owner request)

"Upgrading the rain mechanic ... pretty lackluster": the Iron Marches'
thunderstorm only slowed foes 10% (which helped you) and its rain barely
showed. Provisional, pending the owner's playtest. Engine (engine/weather.js,
the `storm` kind's header has the rules): two clocks, `w.k` (how hard it
rains now) and `w.wet` (how soaked the ground is: chases k, up over `wetIn`
45 s, dries over `wetOut` 60 s, still between waves; `soaks: true`). The rain
changes WHICH halls work. By k: `fire` x0.5 on every burn and lava/fire pool
(update.js burn tick and grounds loop), `misfire` 30% of Powder Works charges
land a dud (`p.dud`, burstCharge: a `wxfizzle` effect and the `fizzle` sound,
no blast, no shards; `g.duds`), `charged` (towers.js `inWeather`: a
Stormcaller's `arc` +1 from k 0.5 and `arcRange` up to x1.25; Ysolde one leap
more). By wet: mud `foeSpeed` 0.9 (ground foes only now: fliers and ships
were slowed before), `noCharge`, `riverReach` x1.15 on the River Watch. A
stroke of lightning runs on through the wet to up to `boltArcs` 3 x wet more
ground foes, each within `boltArcR` 70 of the last, for `boltArcDmg` 0.6 of
its blow (`wxarc` effects; `g.boltArcs`). Mild storms grade it all down
(fire 0.7, misfire 15%, river 1.1, 2 arcs). The card's brief and the battle's
(i) list every effect (data/weather-info.js). Sound: `sfx.bed("rain", k)`, a
looping rain bed (BEDS in sfx.js; CrownguardGame's loop sets it each frame,
hushed when paused), with a "Rain" switch in the Sound settings.
The look was halved the next day (owner, 2026-11-09: "too much, even on mild
storm"): `RAIN_LOOK` 0.5 (drops, far/mid sheets, spray, gust curtain) and
`SKY_LOOK` 0.5, then 0.75 (owner: "push the darkness back up 25 percent")
(the wash, cloud shadow and the storm's `VEIL` beyond the
board) in render/weatherfx.js; the ground's soak (wet road, puddles, floods)
is drawn in full. Standing water stays off bridges (owner, 2026-11-09):
puddles are placed clear of a deck by their full size (`onDeck`), and
`clipDecks` cuts puddles and floods out of every deck (weatherfx.js). The wet
road's film is clipped off the decks too: a deck stays DRY (owner, 2026-11-09:
"it shouldn't really have it considering how curved the bridge is. But you
can add the muddy pools on either side"); its run-off gathers in brown pools
just off both ends (`bridgePools`, `B.puddle(wu, v, mud)`), which fill early
and dry last. The swollen river's silt is `SILT_A` 0.3 (was 0.62, a blotchy
brown camouflage). The rain also falls PAST the board (same day: an iPad's
strips above and below had only the flat veil): `paintWeatherEdge` draws the
far / mid sheets (the same patterns at the same offsets, so no seam) and near
drops at the board's density over the edge canvas (`edgeRain`, `RAIN_EDGE`
set by the storm painter). `rainedge-lab.html` shows the board inside an
iPad-sized screen with the apron, veil and edge canvas. `sim.mjs` prints `arcs` and `duds` beside the bolts. Measured `--chapter iron
--endure`, seeds 1-2, better doctrine per level: 9033 / 9164 -> 8907 / 8821
castle damage (noise; all 15 held, none stuck). The sim commander never builds
a Powder Works, so the duds never show in it.

**The storm is dangerous too** (owner's picks, same day; provisional):
- Lightning strikes HALLS: `boltHall` 0.25 of strokes aim at a random hall;
  every hall within the stroke's `r` + 12 is struck for `boltShock` 3000 ms
  (`t.shockLeft`, build.js `fights`; a Knight Garrison, Covert or River Watch
  keeps its men fighting, only the hall is struck). Every FOOT soldier in the
  stroke, yours (`u.downUntil`, as a ram's trample) or theirs (`stunUntil`;
  bosses, riders and fliers only `boltStun` 0.5 s), is stunned 3 s. The
  shielded and magic-resistant still take nothing. `g.hallsStruck`. A
  stunned hall's PICTURE holds still too (owner, 2026-11-09): build.js
  `shocked(t)`; weather.js stamps `t.shockAt` when a shock starts; draw.js
  paints a shocked hall at `t.shockAt` instead of `g.time`, and update.js
  holds its `t.anim` while it lasts (its `cd` already waits), so the crew
  freeze mid-pose while the sparks (weatherfx.js `hallShocks`) crackle.
  `rain-lab.html?shock=3000&focus=0&snaps=3,3.5,4` shows it.
- Thunder spooks horses: a cavalier within `boltSpook` 90 of a stroke throws
  his knight 60% of the time (`spook`, weather.js: the cavalier is removed with
  no bounty, an `unhorsed` knight drops dazed 1.2 s and a `loosehorse` bolts
  on, each with his share of health). The Loose Horse (enemies.js): 110 hp,
  speed 175 (the cavalier 120), no blow, 1 life, armor 0.2, `trapBane`; rig
  `loosehorse` = the riderless destrier (rigs-ironmounts.js). `g.spooked`.
- Rams sink in the mud: `ramMud` 0.8 by wet on top of the mud's 0.9 (x0.72).
- Gryphons fly low (`fliersLow`/`groundHitsLow`, the blizzard's): ground-only
  halls shoot them from k 0.5; traps still never touch a flier.
- The road FLOODS: `floods` 3 (2 when mild) stretches of `floodLen` 90 per
  board (`floodSites`: by a river or pond first, never on a bridge, 200 apart,
  clear of the wood and the gate, and since 2026-11-09 `FLOOD_SPILL` 44 of
  road clear of every bridge span: Ironford has room for 2), under water from
  wet 0.3, full at 0.8,
  spreading from the middle (`w.floods`, `WX.floods`). Anyone wading (foes by
  road distance, `floodFoe`; soldiers within 27 px of it, `floodUnit`) moves
  and strikes `floodSlow` 30% slower: runMelee / runRangedBand scale each
  man's own `sdt`, foes' step and meleeCd / rangedCd. Halls untouched.
  Measured `--chapter iron --endure`, seeds 1-2, better doctrine, against the
  first round: 8907 / 8821 -> 9086 / 8781 (noise; all 15 held, none stuck;
  3-16 halls struck and 0-8 horses spooked a level). The sim prints
  `halls-struck` and `spooked`.
- Lightning sooner, more often, in flurries (owner, same day): strokes begin
  while the storm is still rolling in, once k reaches `boltFrom` 0.6 of its
  peak (the first ~24 s into a rise, was the height + 1 s), every `boltEvery`
  7-10 s at full (was 10-14; mild 12-16, was 16-22), sparse over `boltRamp`
  20 s from the spell's first stroke (`w.strikeFrom`). `burstChance` 0.2 (mild
  0.12) of strokes start a FLURRY: `burstN` 2-3 more, `burstGap` 0.18-0.4 s
  apart, each near the last (`burstSpread` 140; `w.burstLeft`, `w.burstAt`).
  Headless, one full storm: 38 strokes in 4 min with 6 flurries. Iron
  `--endure` seeds 1-2, better doctrine: strokes 744 / 750 -> 1633 / 1668 a
  chapter, halls struck ~360 -> ~850, castle damage 9086 / 8781 -> 8429 / 8970
  (noise; all 15 held, none stuck).
- Strikes more often still, a wider blast, and fire goes out faster (owner,
  2026-11-09): `boltEvery` 5-7 s at full (mild 9-12), `boltR` 30 -> 45 (the
  stroke's blast, its 3 s stun and the halls it strikes, r + 12), and
  `burnOut` 1.5 (mild 1.3): every burn and lava/fire pool runs out that much
  faster in the rain (update.js burn tick and grounds filter), on top of
  `fire` x0.5, so a full storm leaves a burn about a third of its damage.
  Headless: a 2.6 s burn lasts 1.75 s; one full storm 38 -> 53 strokes, 6 -> 8
  flurries. Iron `--endure` seeds 1-2, better doctrine: strokes 1633 / 1668
  -> 2267 / 2208 a chapter, halls struck ~850 -> ~1750, castle damage 8429 /
  8970 -> 9273 / 9270 (+10% / +3%; all 15 held, none stuck).

## Zones IV and V (owner's direction, 2026-10-03)

The plan is `art/ZONES-4-5.md`: zone IV the Rimewater (a new faction, the
Rime Clans: a frigid sea country with mid-level LANDINGS on about half the
boards, BLIZZARDS, and TOWER FREEZERS); zone V the Ashen Reach (fire
biome; the Lord Marshal returns with the Iron remnant, the goblin horde,
dragons and some new foes). A story layer is sidebarred for later.

**Zone IV mechanics are built** (engine only, behind data no campaign level
uses; existing levels sim byte-identical). Read the headers of
`src/engine/rime.js` (landings, frost shroud) and `src/engine/weather.js`:
- **Landings:** a realm's `landings: [{ at, from, beach?, sail? }]` (at = a
  road fraction or [col,row]); the faction's `landings: { warWave: [groups] }`
  / `landingGen` say who sails. `waves.js landingsOf` marks the groups
  `landing`/`ship`; `startWave` queues ONE longship a wave (puts out at 45%
  of the spawn time, ~5 s on screen, horn + red ring at the beach). Once
  its party is ashore it backs off and rows out the way it came (owner, 2026-11-18;
  render only: the `beached` effect carries `hold` / `out` / `sx, sy`, rimefx.js). The ship
  is a `swimming` foe towers and skiffs can hole; the party lands scaled by
  the hull left. A board with NO beach gets NO landing party (owner).
- **Weather:** `WEATHER_KINDS` registry (every/lasts/windup/fx: reach,
  shotSpeed, foeSpeed, flierSpeed, fliersLow, sight) + a painter in
  `render/weatherfx.js`; a realm opts in with `weather: { kind }`. Live
  multipliers `WX`, state on `g.weather`, seeded clock, combat only. The
  blizzard: reach x0.8, shots x0.85, fliers low, 4 s wind-up.
- **Frost shroud:** foe flags `freezeEvery/freezeRange/freezeFor` (the Rime
  Seer 9000/130/4500); a frozen hall stops everything through
  `fights(t, g)` (build.js) instead of `isBuilt`; every hall thaws the same
  (owner: no fire bonus); a frozen hall's soldiers stand still but RELEASE
  the foes they held (`releaseHeld`, rime.js); a stunned, silenced or
  burning seer can't cast; freezers are prey for the Covert. During a
  blizzard ground-only halls may hit the low fliers (`groundHitsLow`).
- **Cold-hardy** (owner): every Rime foe is `frostProof` — the Frost Altar's
  slows (every form), the frost nova's freeze and Permafrost's brittleness,
  Absolute Zero's cold DoT do nothing to them; the nova's blast damage still
  lands; non-frost slows (spikes, caltrops, Earthshaker, Harpooners, the
  Moon Prism's beam, Osric) still work.
- **The roster** (enemies.js Rime section, behaviour in rime.js):
  `berserker` (`rage`, `e.raging`; the frenzied sheet past half health),
  `rimerider` (wolf rider; half the time the rider marches on as a thrall,
  `deathSkin: "rimewolf"`), `skald` (the Marshal's banner seam as a
  war-chant, walks amid the biggest group via `gatherMore`), `frostgiant`
  (`stomp` dazes soldiers), `icedrake` (flier), boss `rimejarl` on a
  war-mammoth (trample, shroud, `callLanding`).
- **Sea monsters are NEUTRAL hazards** (owner, 2026-10-04;
  `src/engine/serpent.js`, `water: "any"`, left out of a board with no
  water): they never cost a life (`castleDmg` 0), attack whatever is near
  the water — foes, soldiers, the hero, skiffs; halls only when no creature
  is in reach — and never hold a wave open (once the hostile army is done
  every monster dives and leaves). A foe a monster kills pays nothing;
  killing a monster pays its bounty. Towers rank a monster below every
  hostile foe unless it is holding one of ours (`e.menacing`); wards,
  banners, pack pace and healers skip them (`neutral`). `seaserpent`
  swims a river (or the coast) submerged, only skiffs reach it; it surfaces
  by prey and SEIZES it (maul 40 x sqrt(mult)), or coils a hall. `kraken`
  roams like the serpent (coast first) with a 9000 hp body (x the wave; 4%
  per tentacle cut) and surfaces where a tentacle can reach someone: up to
  4 `krakenarm`s (130 hp x the wave) each seize a random one of the six
  nearest creatures and squeeze 12 x sqrt(mult) every 900 ms, smash a hall
  if no one is in reach, sink after 12 s. A SEIZED soldier (`u.seizedBy`,
  `seaHold` in runMelee) or foe (`e.seized`, treated as held) strikes the
  monster at its own pace and is freed when it dies. zoneStats: grabsFoe,
  grabsFriend, freedFoe, freedFriend, armsCut, killsFoe, killsFriend.
  Test boards `rimefjord` (river + beach), `rimeriver`, `rimedry`.
- **Rigs:** `rigs-rime.js` (thrall, huscarl, berserker/berserkerRage,
  rimeseer, skald with a chant sheet at walk 4-7, rimejarlfoot, and the
  exported `rimeJarlRider` part; joint set `rime`), `rigs-rimebeasts.js`
  (rimerider, rimewolf, frostgiant, icedrake, the mounted rimejarl,
  seaserpent, kraken, krakenarm). rimefx.js only aliases a type that has
  no rig yet.
- **Weather in every zone** (`src/data/weather-plan.js`): greenwood `fog`,
  iron `storm`, hollow `bloodmoon` (since 2026-11-21, replacing `gravemist`,
  which Free Play can still pick; see "The Blood Moon"), rime `blizzard`, ash `eruption`; none
  in a chapter's first third, 0.35-0.55 in the middle, 0.7-0.9 in the last
  third, 1 at the boss; a level may set `weather: false` or its own.
  `sim.mjs --weather kind:strength|none`. Free Play: `weather` /
  `weatherPower` in sandbox.js (not in isHonest).
  **One smooth clock per level** (owner, 2026-10-04: "a storm rolling in",
  never popping in or out at a wave boundary, can't be waited out): battle
  seconds from the first horn, advancing ONLY in combat; between waves the
  state (k, darkness, rain) FREEZES and keeps animating, no strikes or rocks
  fall. Each spell is calm -> rolling in -> height -> passing, every length
  seeded (`segAt` exported for labs). Storm: first calm 50-75 s (mild
  70-100), rolls in 25-40 s, holds 2-4 min (mild 1-2), passes 25-40 s
  (lightning stops first), calm 70-120 s (mild 120-200); bolts every 10-14 s
  at its height (mild 16-22), sparse for the first 30 s. Effects ramp with
  k (the mud and rivers follow the ground's soak, `w.wet`: see "The storm's rain bites"). Blizzard 15-22 / 25-40 / 15-22 s;
  grave mist 20-30 / 30-50 / 20-30 s (hides foes past k 0.4); eruptions only
  at the height; fog fades with the level's waves instead (`fade`, see
  "Weather brief on the level card").
  Forecast wording per stage (brewing / rolling in / height / passing,
  "likely" in italics). `wx-lab.html?rise=S&snaps=&bolt=1&freeze=1`.
  Lightning (owner, 2026-10-04): lands at a random spot near a random live
  fighter (any foe or friendly soldier/hero, jittered 34 px), never near
  the castle; 25-40 magic x the wave's health scaling, a 0.5 s stun, every
  4-6 s at full strength; foes with `mres > 0` or a standing shield take
  nothing; soldiers lose 45 (never below 1) and can't strike 1.1 s. The Iron
  chapter sims about even with vs without it (+1.2% on the level clock). The wave preview FORECASTS
  the next wave's weather (`forecast(g, wave)` in weather.js,
  `ui/WeatherForecast.jsx`): fog exact (the same per-wave roll), the timed
  kinds named when a spell rises before the wave's last foe leaves the
  wood, "likely" when it would rise within about one road-walk after.
- **Playtest previews in Free Play** (owner, 2026-10-04): the Rime Clans
  are merged into FACTIONS (`preview: true` keeps them out of "Every
  Army"), the four rime boards are a "IV. The Rimewater (preview)" group,
  and two presets exist: "The Rimewater" (rimewatch, the Rime army, 1000
  gold, 50 lives: the army is untuned) and "Ashen Eruptions" (the Ember
  Wastes under eruptions). A preset may bring its own `realm` (fromPreset).
  The lives chip's max reads the sandbox's lives in Free Play.
- **The Rimewater campaign** (zone IV, 2026-10-04): chapter `rime` in
  CHAPTERS, levels in `src/data/levels-rime.js` (7 x 20, 7 x 25, the boss),
  boards in `realms-rime-a/b/c.js` made with `rimeVariant`
  (`src/data/rime-ground.js`: groundArt "rime", spawn "rimegate", the
  spruce wood, cold `coastSand`). Its art is `src/render/scenery-rime.js`
  (RIME_ART; world.js/apron.js read it too); decor types `rm*`; pieces IN
  water `rimeFloes`, pieces ON a beach or bank `strand: [...]` (terrain.js
  pushes them after the grounding pass, unmoved). Landings may set `put`
  (where the ship puts out). Music `rime-build/-fight/-boss`. On the
  continent the Rimewater is zone 5 (after the isthmus 3 and islets 4).
  Sims at publish (`--chapter rime --endure`, seeds 1-2, better doctrine):
  all 15 held, no stuck waves; 28-58 castle damage on the first five,
  ~100-460 in the middle, Kraken Firth ~730 (its landings: the sim never
  docks a River Watch to sink a ship, 0 of 7 sunk), Skaldhold ~600, the
  Jarl's Fjord 1000-1340 (about the Iron back half). Pending the owner's
  playtest.
- Test faction `rime` (src/data/faction-rime.js) and board
  `rimewatch` (src/data/realms-rime.js); placeholder art in
  `render/rimefx.js` (longship, telegraph, ice shell, rig aliases to delete
  when `rigs-rime.js` exists) and `render/weatherfx.js`. `rim-lab.html`
  steps the real engine and snaps it (`?wave=&snaps=&towers=&squall=&crop=`).
- `node scripts/sim.mjs --free rimewatch rime --window 1,18,15 --gold 600
  --endure`; flags `--no-landings --no-weather --no-freeze`, `--window f,t,n`,
  `--gold N`. The wave preview shows a landing party as its own chip with a
  ship badge.

## The water pass (2026-10-04, owner request)

"Rivers in the world map don't blend with the oceans or lakes ... more
movement in the water on the levels ... the ice in the north could look much
better." Four artists by file (mapArt.js water, water.js, coast.js,
scenery-rime.js + water.js's ice branches); the rules are in the style guide
("The water pass", "Ice on the water", "Water meets water with one
outline"). Engine side: `actions.js` keeps halls off a river mouth's funnel
and fan (`riverMouths()`, render/water.js). Pending the owner's playtest:
the swell's speed and crest contrast, the river marks' density. The sea's
ice sheet is capped at `SEA_CAP` 11 px (scenery-rime.js) so a River Watch
skiff, rowing 16 px out, always has open water under it. The only campaign board with a river AND a coast is none: the
estuary shows on the test board `rimefjord` until a level gets one.
Lesson: the session limit cut three of four agents off; resume a cut-off
agent with a tool-call budget instead of starting a fresh one.

## The Blood Moon (2026-11-21, owner request; on main since 2026-11-22)

The Hollowfen's weather, replacing the grave mist, and a rework of the dead getting back up. The
owner wants it reversible and played in a preview before it reaches main.
- **Rule:** Risen get back up ONLY while the blood moon is full (`g.moonUp`, set by tickWeather;
  dealDamage in actions.js). Same as before otherwise: a physical blow, once, at half health;
  magic, fire and holy keep it down; one killed under the moon still rises if it sets during the
  2 s. Under the full moon every undead foe (Hollow faction, raised, wraiths; not neutral) mends
  `mend` 1.5% of max health a second unless burning (update.js, beside `regen`).
  **The switch back:** `RISE_ONLY_IN_MOON` in src/data/enemies.js (false = the old rule).
- **One moon a level, for its LAST waves** (owner, 2026-11-22: "more like a last few waves kind of
  thing" (after the moon set, the rest of the level felt "underwhelming"), "more like 8 and 12", and
  "on some levels, the sun sets, and a blood moon rises"): kind `bloodmoon` (engine/weather.js),
  `moon: true`, first / calm / lasts all 1e7. `moonStart` cuts the first calm at the horn of
  `moonWaveOf` = the level's waves - `moonLast` + 1 (mild 8, strong 12; `whole` at wave 1; Free Play
  at wave 2): the sun sets and the red light creeps in over `rollIn` 40-45 s, and the moon never sets
  (the Endless March after a win stays under it). Before that it was a 3-5 min moon in mid-level,
  which covered only ~4-7 waves. The forecast says "The sun is setting" for its wave.
  **The sunset** (owner's pick C, 2026-11-22; a flat orange wash before it "would think their phone is
  breaking"): `src/render/sunset.js` (reusable for sunsets elsewhere) maps the moon's clock w.k through
  `sunCurves`: long shadows down-right off every hall, soldier and ground foe stretch to 2.5x, then draw
  back to 1.6x and darken under the moon; an amber key light (`SUN_KEY`, k up to `SUN_RIM` 1.8: past 1
  the OUTER LINE alone is stamped again, `line` in pix.js lightLayer / rimOf / pixRim) and a faint amber
  rake fade as the red comes in (from u 0.45); the shade from 0.3, lamps 0.3-0.75. The HALLS (owner: "that
  whole side of the tower gets the outline", shadows "start from the outline of the base" and "take the
  full width"; checked by Fable): pix/halls.js notes each hall (`noteHall`, one frame late) and stamps
  `hallRim` (a 2-px amber line + a stepped wash on the sunward quarter of each run, baked per form and
  facing in `bakeHallSun`); `drawHallShadows` lays the hall's own silhouette sheared along DIR, rooted on
  the base AS DRAWN (not hallfoot.js, which is the footprint with props): the owner picked option A of
  `sun-try.html` (`SHADOW_TUNE`): the foot starts at the middle of the base's drawn front edge and slants
  up-right behind the body, widening to full width over 16 units, stepped alpha by height. Every kind x
  form: `sun-halls.html?kind=<k>` (sunset row and moon row).
  The CASTLE (owner: "shadows and lighting effects on the castle itself"): castle.js `castleSun` (after
  the stone, reads `SUN`): an amber overlay baked per castle bake on every WEST face (curtain, towers,
  gate block: a line at the foot, stepped wash by height) and the decks' / parapet's west rims, masked
  to lit stone; each tower's deck swept east along `SUN_DIR` as a shadow over the walk. Weak: baked scenery shadows don't stretch; fliers, crews and live pieces (catapult arm,
  pennants) cast none. Options A-D: `sunset-concepts.html`; a clip of the real game:
  `sunset-anim.html?opt=real` (frames are JPEG bytes in .png names: ffmpeg `-f image2 -c:v mjpeg`). Saltgrave `--endure` seed 1: sun sets at wave 13, full 14-20 (929 / 476
  castle damage); the Lichgate sets at 14 (1686 / 1252, was ~700 / ~600 with the mid-level moon and
  ~1250 under the old always-rise rule).
- **Where** (`CURVES.hollow`, weather-plan.js): none on the Grave Road, mild on levels 2-7, strong
  on 8-14, and the Throne of Dust under it the whole level (`whole: true`, lasts 1e7).
- The checkpoint keeps the moon's wave and schedule (CrownguardGame.jsx `checkpointOf` / resume).
- Words: weather-info.js `bloodmoon` (card brief) and `nowOf` (battle (i)); the Field Guide's Risen
  row. Free Play: weather choice "Blood moon" and the preset "Blood Moon" (Bellmarsh, the Hollow).
- Look: `art/briefs/blood-moon.md` (owner: no moon in the sky, red light from the upper left,
  real torchlight on the halls (reusable for night maps), eyes in the sockets).
  `wx-lab.html?realm=bellmarsh&faction=hollow&weather=bloodmoon:1&whole=1&rise=0&snaps=0,10,30`.
- Mock-ups of the four options the owner chose from: `hwx-concepts.html`.
- **The look is in** (render/bloodmoon.js: a MULTIPLIED wine shade deepening to the lower right, a red
  rake from the upper left laid with `lighter`, eye glows read from each baked frame's own eye pixels,
  none from behind; render/nightlight.js: reusable torchlight for night maps, lamps noted from each
  hall's `"torch"` lights in pix/halls.js). Measured +6 ms a frame in headless software Chromium (the
  storm costs the same there); not measured on a device. `bm-lab.html` (full-res snaps, `&perf=1`),
  `bm-eyes.html`. Weak: eyes draw over a hall standing in front; health bars dim a little.
  **Night lights on the halls** (owner, 2026-11-22: "all towers have some kind of light source after hitting
  level 2, except for the assassins"): pix/halls.js lights EVERY entry of a hall spec's `lights` at night
  (`isWarm(col)`: fire colours as warm pools, the rest as magic light in its own colour with a cool edge,
  nightlight.js `noteLamp(..., cool)`), reach capped (warm 24, magic 18 art px). Artists drew a light on every
  dark form from level 2 (brief `art/briefs/night-lights.md`): archer 2's door torch, knight 3ba's torch,
  catapult lanterns, Bladewheel bracket lanterns, Powder Works level-2 door lamp, King's Band lanterns and torch
  posts. The Covert keeps NONE (no lamp post, no night light). `night-halls.html?kinds=` shows every form.
  Then (owner, 2026-11-22: "a little bit too hard to see ... increase contrast on the towers", "the
  fading in and out was kind of choppy"): the shade is split, `SHADE_GROUND` 0.85 laid in the ground
  pass (`bloodmoonGround`, before halls, figures and standing scenery) and only `SHADE_ACTORS` over
  them (0.5 since the owner asked for "a little bit more dark to the towers"), so they stand out light on the dark land; every layer follows k continuously (it was stepped
  in eighths).
- **Balance** (`--chapter hollow --endure`, seeds 1/2, better doctrine): 11419 / 11363 -> 6113 / 6489
  castle damage; the early levels halved (Risen got up 2300-4000 times a level, now 150-550). Not
  retuned yet: the owner plays the preview first (levers: longer moons, Risen / Ghoul hp, crowds).
- **The preview** (owner: "see how it plays before putting into main"): a private Artifact "Crownguard
  Preview: Blood Moon" (slug 3644f913-b27d-449b-a2b9-86db42d05039), the built game published with
  publish_files from `npx vite build --outDir <scratchpad>/preview` (all files but the webmanifests,
  vp.html, privacy.html). Its saves are its own. Republish with slug + base_version after each change.
  Build it with `VITE_PREVIEW_SEED=1` (owner: "put some progress on the campaign map"): main.jsx then
  loads `src/native/previewSeed.js`, which on a device with no save writes one with the Greenwood, the
  Iron Marches and the Grave Road cleared (Saltgrave next), every hall's paths and finals open and
  the treasury topped up to 350,000 once per `SEED_V` (bump it to top up again). The real build never loads it (no chunk is emitted without the flag).

## The time of day: a fixed sun for every level (2026-11-22, owner request)

"Static lighting environments ... the light in different positions across the sky ... the lower the sun
position, the more into the 'sunset' look ... a sunrise position if it comes up in the east (right) ...
dynamic shadow positions for each time of day ... color adjustments as we get into the golden hour", and
"foliage and other decorative items (stones, rocks, old towers, etc) too". The owner's answers: SEVEN
positions, fixed per level, the lead proposes the list, LOOK ONLY (no rule reads it), and the painted
bright side of towers and figures moves to the sun's side (they picked it from a trial,
`node scripts/sun-sides.mjs`). Built overnight by an Opus team (brief, ownership and status:
`art/briefs/time-of-day.md`). The owner saw the preview shots ("breathing some fresh life into this
game") and had it pushed live 2026-11-22; pending their playtest on a device.
- **`src/data/sun.js`** (a leaf): `SUN_POS` (sunrise, early, morning in the EAST, the right, over the
  castle: shadows fall left; noon; afternoon, late, golden in the WEST), the live sun `DAY` (`on` false at
  noon, `side`, `elev`, `L`, `fall`, `len`, `col`, `warm`, `rim`, `shade`, `tone`, `v`), `setDay(id)`,
  `onDay(fn)` for cache clearers, `SUN_PLAN` (15 a chapter for greenwood / iron / rime; a level may set
  `sun: "golden"`), `sunFor(lv)`. **Noon is the game as it was: every painter stays pixel-identical at
  noon** (guard new paths with `DAY.on`). The Hollowfen has no plan (its own sunset and moon), and a
  blood-moon level is forced to noon in `startLevel`. A level has ONE sun, so everything bakes once and the
  old sun's bakes are dropped (no seven-fold memory).
- **Sculpted light:** pix.js `resolve` reads `spriteSun(flip)` (or `o.sun`), so every pix figure, hall and
  prop is lit from the level's sun; bake.js hands a figure's draw `flip` = "the light is on my right"
  (`lightRight`); bake.js and pix/halls.js clear on `onDay`.
- **The seam:** `src/render/daylight.js` (`dayGround` in the ground pass, `dayOver` after everything
  standing, `dayLights` with the frame's lights; off at noon and under the blood moon).
  `dayshadows.js` + sunset.js (generalised: optional direction / colour parameters, the blood moon's calls
  unchanged, checked 0 pixels): halls' own silhouettes and every soldier's and foe's long shadow along
  `DAY.fall`, the halls' sunward edge line and wash (`dayFrame`); the hall's small baked ellipse is skipped
  while a sun is up. `daygrade.js`: the hour's colour, three dithered layers baked per sun and board
  (soft-light rake from the sun's edge, a warm / cool multiply, an additive edge glow and water glints;
  dials in `GRADE`; `dayGradeRect` for the apron), and one far key light for the figures' edge
  (`dayKeyLights`; shows only with "Spell light" on, as the moon's does). ~0.5 ms a frame, ~110 ms bake.
- **The castle** (castle.js `castleDay`, `castleDayGround`, `dayStoneBake`, `dayGroundShadow`): west suns
  wash the west faces in `DAY.col` (peach-amber at golden) with a hot west edge and tower shadows east
  over the walks; east suns shade the west faces, light the tops' east rims and throw the castle's skyline
  (merlons, towers, stair-turret roofs, the keep) west onto the ground.
- **Scenery** (`src/render/sceneryday.js`, scenery*.js, world.js, apron.js): under an eastern sun
  `drawTree` draws each piece MIRRORED about its anchor (its painted light lands on the right; pix parts
  are baked with the sun's west twin, `decorSun()`, so nothing flips twice); `NO_MIRROR` (scenery-gwpix.js)
  lists pieces that must not turn (mills, boats, quays, gates, rune stones...). Each piece's own silhouette
  is its cast shadow, all in one mask baked into `groundLayer` (keyed on `DAY.id`); `sunRim` is a stepped
  warm edge on sunward sprites. The apron mirrors and casts with the board.
- **UI:** the level card's WEATHER label names the hour at its right (not at midday); Free Play's Hero
  and Pace tab has "Time of day" chips (`sun` in sandbox.js; look only, not in isHonest).
- **Labs:** `sun-lab.html?realm=&faction=&sun=&tag=` (`all=1`: every sun) saves `.shots/sun_<tag>_*.png`;
  `scn-apron-lab.html?sun=` for the land beyond the board; `col-lab.html` (`&perf=1`). No playwright on
  the owner's Mac: open labs in the built-in browser (own tab), not `scripts/shoot.mjs`.
- Second pass the same night: no short painted shadow under a long one (`longShade()`), the spawn crag /
  Iron camp / Rime gate and the bridges cast (not mirrored, their lit side unchanged), hem bushes cast, the
  apron's trees throw shadows onto the board (`setEdgeCasters`, world.js; the ground layer rebuilds once
  after the apron's first paint). A level's first ground bake under a sun is ~1 s on the dev Mac.
- **Weak / not done** (see the brief's STATUS for the latest): rally flags, banners and the ballistae cast
  nothing; a hall on a beach casts onto the water; hall and figure shadows double-darken where they cross;
  the sun's rim beats nearby firelight on a figure at sunrise / golden; a hurt castle's lost merlons still
  cast; none of it seen on a phone or iPad (the soft-light blend's cost there is unmeasured).
- **Future** (owner: "mark it down"): the time of day changing play (wishlist).

## The scenery and water upgrade (2026-11-22, owner request)

After the time of day ("New standard set!"): "a graphics upgrade on the foliage, ground, objects, decorative
things, old towers, mills, bridges, water ... Especially the water, I wouldnt mind a total overhaul ... make it
fancy, but watch the cost on the engine ... shaders, depths, better wave animations, river physics." Built
overnight by Opus agents by file (brief, ownership, what is left: `art/briefs/scenery-water-upgrade.md`;
before / after pairs in `.shots/preview-upgrade/`). Canvas 2D only: per-pixel work at bake, a frame only
blits. The engine is untouched (ir3 `--endure` identical). Pushed 2026-11-22 so the owner can see the water
move. **The owner's verdict: "incremental upgrades at best"; they wanted an OVERHAUL** ("Dont be afraid to change
things more radically ... Especially the bridges, they need a good rework ... feel free to repath the rivers ...
change the shore shapes, river widths (wider only ...) add some more larger puddles"), and asked for style
directions to be proposed first: a concept round follows (the brief's STATUS has it). When the owner says
overhaul, show bold options before building.
- **The overhaul concept round** (same day; brief `art/briefs/overhaul-concepts.md`): five Opus artists drew
  A / B / C for water, bridges, trees, rocks and decorations, ground, each on a real board patch beside TODAY
  (`concept/overhaul-<feature>.js` + `.md` notes, labs `overhaul-<feature>.html`, PNGs `.shots/ovh_*`). Private
  Artifact "Crownguard Overhaul Concepts" (slug 26a17ef8-c22c-4713-8e52-168dfabde95b; page built in
  `scratchpad/overhaul-page/`, republish with publish_files + slug + base_version). The team's picks all point
  at giving the land HEIGHT: water A (cut below the meadow, bank faces, weirs) with B's reeds; bridges A (the
  humpback with real arches) per chapter by material; trees A (grand trees, ~1.7x) with C's ground rings and
  seasons; decor B (places, not props) at A's scale; ground A (terraces and scarps) with C's puddles.
  **The owner's picks so far (their words in `art/briefs/overhaul-round2.md`):** water A (the near edge and the
  lake's sand and dock need work; not every edge cut in); bridges: ALL THREE kinds with variety by area (timber
  trestle for the Greenwood and Rime, humpback for Iron and the Hollow, today's design updated too), decks
  matching each area's road, the up-the-screen case reworked ("have fable take a look"); trees: C's direction
  but calmer ("chia pets"), a mix of today and C, seasons loved ("C in autumn looks awesome"), options per
  chapter before any building, more wildlife like the deer; decor: a combination (B's village details with
  today's houses, A's big rocks and tower re-sculpted, C's cliff edges and rock walls), Iron and the graveyard
  need polish, a light source in every lived-in place. Ground not reviewed yet. A second concept round is running.
  Ground (later): terraces and the worked countryside each on SOME Greenwood levels, not all ("some variety would be
  nice"), C (lush) liked but "way too detailed": a dialled-back C; A "looks cool on rimewater". **Scope: the
  Greenwood only for now** ("just focusing on the first area of the map"); the other areas and the campaign map follow.
  **Round 2 (Greenwood only) is published:** private Artifact "Crownguard Overhaul Concepts, Round 2: the
  Greenwood" (slug ec5587d2-4984-4608-afb3-9fde8967f39f; page in `scratchpad/overhaul-page2/`; painters
  `concept/overhaul2-<feature>.js` + `.md`, labs `overhaul2-<feature>.html`, PNGs `.shots/ovh2_*`), every panel on
  the real board: water A as five edge kinds (cut bank, grassy lip, shingle, reeds, quay) and a redone lake with
  a jetty; bridges by the advisor's up-the-screen rule (`art/briefs/bridges-upscreen-rule.md`: a battered solid,
  strips on both sides, never the castle's slant): toll / farm / mill trestles, today's bridge updated, one
  humpback; trees: five crown treatments between today and C, four seasons, wildlife; decor: croft / farm /
  hamlet in today's house style, the rock rule (stacked loaves: lit top, mid south face, shaded east shoulder,
  nothing pointing at the camera), ruins, night lights; ground: meadow strengths 1-3, terraces (painted steps
  recommended), quiet / patchwork countryside, a 15-level plan. Awaiting the owner's picks. Labs note: with many
  sessions editing, the dev server reloads lab pages every 20-60 s (artists used resumable queues / iframes).
  **Owner's picks from round 2 so far:** the river edges are APPROVED except the shingle beach ("I actually like all
  the rivers except for the shingle one ... I would limit mixing them so much, it can get too busy. But some is
  fine"): cut bank, grassy lip, reeds, quay; one main edge kind per stretch. The lake's sand must BLEND into the
  water (no traceable line; lighter at the shore, darker out): third pass running. The rest: "later".
  **Concept pages must show MOTION as playing loops** (owner, 2026-11-22: "include an animated view so i can see how
  things move"): spec `art/briefs/overhaul-animation.md` (a sprite-sheet PNG per loop, `ovh3_anim_<name>_c<cols>r<rows>_fps<n>.png`;
  the page plays them on a canvas). More owner picks from the page comments: trees = treatments 3 and 4 mixed, treatment 4
  wood edge with fireflies, no leaf litter under evergreens, winter trees keep their structure; the farm; the calm meadow;
  the full patchwork with a different field pattern on every map; bold steps need better road crossings.
  **Lakes** (started over after three failed passes on one design; `concept/overhaul3-lakes.js`, which runs the approved
  river painter itself so lake water IS river water): the mere, the tarn and the reed fen are APPROVED, to be varied across
  the maps; the millpond is rejected. Farmland: bigger, calmer plots on Bramblewick and Millrace and a minimum size for any
  cultivated field (in progress). Terraces are parked (wishlist).
  **The CURRENT concept page is round 3** (owner: round 2 "is getting very full"): private Artifact "Crownguard Overhaul
  Concepts, Round 3: the Greenwood" (slug e7d2c8a3-8ec4-457b-82a0-47b329aa8a92; `scratchpad/overhaul-page3/`): only the
  current version of each thing, a status table, the four questions waiting on the owner (willow reading, tree-mix reading,
  farmland calm, chapel / wall redraws), stills and playing loops together. Over ~64 MB a publish must be split in two
  calls (stills first, then the loop sheets with slug + base_version). New owner comments go there.
  **Answers to round 3's questions:** the strand willow APPROVED; trees are TREATMENT 4 ONLY now (not the 3+4 mix), with
  variety in how the foliage fills each tree's skeleton; the chapel and wall redraws APPROVED; the mere's bank "perfect";
  farmland "went too far": keep the amount of farm, bigger lots, fewer texture changes between neighbours: more options asked.
  **Round 6 notes, drawn and on the round 3 page (2026-11-22, late; awaiting the owner's look):** trees: no dead-limb
  fill; variety also from re-ordering the crown's clumps (`ord`); trunk, boughs and roots ONE welded body (`P.body(WOOD)`, the
  joint kit's rule applies to trees); four root flares, no ball under the roots; few sticks under pines. Ponds are SMALL LAKES
  (`concept/overhaul3-lakes.js` `genPond`, five variants, two with lily / rush growth on one side); the owner allows more
  lakes and streams on dry boards (`NEWWATER`: Barrowfields, Kingstones, Cinderholt drawn); Bramblewick's tarn left as is.
  **Nothing is built.** Building means wider / repathed rivers, bank faces, scarps
  and bigger scenery: every board re-laid and re-simmed, a chapter at a time, one Greenwood board first.
- **Water** (`src/render/waterlook.js`: the shared 7-step ramp per chapter kind, `waterLook`, `waterPal`,
  `shallowsLit`, glints capped at pale gold; water.js; coast.js): rivers shelve from pale shallows with the
  bed showing (point bars inside bends) to a dark channel; baked flow streaks that slide downstream, foam
  collars and V-wakes at rocks and timber piles, standing waves in narrows, eddies inside bends, a wet edge
  and the far bank's reflection, banks that swap lit / shaded sides under an eastern sun; ponds shelve too.
  The sea: sand, pale, teal, navy bands; swell in sets; near-white surf that runs up the sand and drains to
  a wet sheen; glints on the sun's side. Live cost about +0.1 ms (rivers) and +0.12 ms (sea) a frame.
  daygrade.js's static water glints were dimmed (`GRADE.glint` 0.16) and kept off bridge parapets.
- **Bridges** (bridge.js): grained planks with nails and butt joints, flagged stone decks, weathered
  parapets, lit arch undersides, wet piles, snow on Rime spans, lit from the sun's side (keyed on `DAY.id`);
  `bridgePiers()`; the near rail / parapet is a front layer sorted with the actors
  (`pushBridgeFronts(drawables, ctx)` in draw.js), so walkers on a deck pass behind it.
- **Ground** (world.js, road.js, apron.js): a long rise-and-fall field lights the turf toward the level's
  sun (`reliefOf`, `hillTone`), verge and bank grass, wildflower drifts, bluebells under the wood, a
  footpath, trampled earth at the spawn and gate, redrawn hem bushes (the apron uses the same sprite), a
  road with a cross-section, clods, a crumbled edge and damp lows (no lane ruts), fen hummocks.
- **Foliage** (scenery.js, scenery-gwpix.js): `leafClump` with serrated, dithered leaf masses; four oak
  kinds by seed (round, tall, spreading, birch; `oakTree`'s optional `form`), boughs, bark, ragged sky
  holes; five-tier pines; streamer willows; the edge wood with a cool deep interior, taller crowns and
  brambles; rocks with cracks, moss, lichen; fairy ring, fallen log, bracket fungus; the Gullwick tower as a
  coursed ruin; a slow crown sway on lone oaks and willows (`SWAY_ON`; never watched in motion).
- **Greenwood pieces** (scenery-vale.js, pix/vale-pix.js): the mill wheel sculpted (12 baked frames),
  pixel smoke, the upturned boat, haywain, standing stones with planes, lichen rosettes and carvings, net
  rack, lobster pots, skeps, a cottage garden variant.
- **Iron** (scenery-iron.js): the war camp (lashed stakes, lit logs, gate torches), cushioned paving flags,
  crags as ledged blocks, the King's tower, ridge tents, beacon. **Rime** (scenery-rime.js): snow as
  wind-carved dunes lit by the level's sun (read by their shade: a first try with line cornices read as
  scribbles), wind tails, tracks; spruce, longhouse, rack, boat, gate pelts and shields, rune staves,
  whale-rib arches, icicle curtains. **Hollow** (scenery-hollow.js): sculpted reed beds, bog pools and
  wisps on fen pixel water (`fenWater`), stepped halos (`stepGlow`), the barrow gate mound, crows, grave
  offerings, rusted fences, the throne in water, relic reflections from `waterLook`.
- Lessons: the built-in browser caps tabs at about 9 (agents without a tab work blind: the lead checks
  their work in the game); eleven agents fill the disk with 2-3 MB shots (have them delete scratch PNGs)
  and can kill the shared dev server (restart with `preview_start` "crownguard"); timings taken while
  many agents run swing 2-10x (compare old and new side by side in one page).

## The overhaul, built: Millrace first (2026-11-22, owner: "they look good, lets build")

ONE board, Millrace, carries every approved overhaul look in the real game, behind a per-realm switch; every
other board is pixel-identical (18 realm x sun hashes) and gw1's sim byte-identical. NOT pushed; the owner
has not played it. Brief, slot rules, STATUS: `art/briefs/overhaul-build-millrace.md`.
- **The switch:** a realm's `look: "overhaul"` (`season: "summer"`); `src/render/overhaul/index.js` (`ovhOn()`,
  the `OVH` slot table whose defaults are today's painters, `register`, `OVH.flags` hem / butterflies / bridgeCast);
  seams in world.js `groundLayer`, draw.js, scenery.js `drawTree` / `decorShadowItem`, builders.js, weatherfx.js,
  daygrade.js, apron.js. `overhaul/all.js` imports each builder module, then `wire.js` (the lead's: slots shared
  by several modules). Nothing in src/ imports from `concept/`.
- **Modules** (`src/render/overhaul/`): water.js + field.js + waterlive.js + waterlife.js (a distance field from
  terrain's own river segments, baked per sun; shallow profile, point bars, edge zones in `PLANS.<realm>`; flow
  dashes, weir, reeds, lilies, ducks, a heron; exports `waterDist`, `openWater`); bridges.js + bridge-bake.js
  (trestles as one battered solid on the up-screen rule; ramps drawn past the engine's span; `deckLift`,
  `bridgeBlocks`); trees.js + treeart.js + wood.js + sway.js + life.js (treatment 4, welded trunks, lazy bakes a
  few a frame, see-through crowns in front of halls, wildlife that flees); decor.js + decor-kit.js +
  decor-layout.js + lights.js (the farm, rocks, lamps via `noteLamp`); meadow.js + apron.js (the calm meadow,
  repainted in the ground bake, running past the board's edge).
- **Engine truth kept:** river courses / widths and bridge spans unchanged (art only; the water reads narrower
  than the concepts). New data: a realm's `blocks` ellipses (no hall on the farm, toll hut, sluice; read by
  `buildableAt`) and `layout` (a kept battle is dropped when it changes, data/checkpoint.js).
- **Measured (dev Mac):** 4.3 ms a frame against 2.9 for today's Millrace; first frame ~2.5 s of bakes (as
  before); bakes ~4 MB. Sim `--level millrace --endure` with the blocks: 139 / 52 (was 226 / 55: noise).
- **Labs:** `ovh-millrace.html?sun=&weather=&blood=1&frames=6&dt=150&x=&y=&w=&h=&zoom=&perf=1&tag=` (use
  `frames=` or the trees are not baked yet in the shot), `ovh-identity.html?tag=` (compare the `.json.png`).
- **Weak / not done:** the up-screen farm trestle reads as a plank way; across spans are bulky; trees and the
  farm sit bright under the Blood Moon and cast no long shadow there; sway is very subtle; trees appear over the
  first frames of a level; the River Watch's lit water (waterreach.js) uses today's geometry; only summer;
  nothing seen on a phone. Next boards: add `PLANS.<realm>`, bridge kinds, a farm layout if any, and `look`.

**The whole Greenwood is on the overhaul** (2026-11-23, owner after playing Millrace: "runs great, go ahead and
apply to the whole first area"; brief `art/briefs/overhaul-greenwood-rollout.md`). All fifteen Greenwood realms carry
`look: "overhaul"`; `greenwoodVariant` (maps.js) copies the first board WITHOUT `look` / `season` / `blocks` /
`layout`, so each realm states its own. Pending the owner's look at the other fourteen boards.
- `?ovh=1` / `?ovh=0` in a lab URL forces the look on / off for any realm (`ovh-millrace.html?realm=<id>&ovh=1...`).
- Water: `PLANS.<realm>` for Thornbrook, Wolfrun, Millrace; `autoPlan` for any other river; ponds are lake bodies
  (`LAKE_PLAN`: Foxmere the long mere, Oakmere a mere with growth, Bramblewick the tarn) kept inside the engine's
  ellipse; coast boards keep today's sea. River bank faces lie on the LAND side of the engine's waterline (owner:
  rivers "wider only"; visible water measured >= today's), so a hall at the water's edge stands over the bank face.
- Bridges: `KINDS` per realm in overhaul/bridges.js (toll / mill / farm trestle, `flat` / `flatlamp` = today's
  bridge updated); Wolfrun's four are all toll trestles (owner, 2026-11-26), a hut and `blocks` entry at each; Millrace's up-screen crossing is `flat` now (`?bk=2:farm` in a lab).
- Places (`decor-layout.js` `LAYOUTS`): Millrace farm, Gullwick village details + the ruined tower, the croft on the
  first board, Bramblewick's steading, Foxmere's chapel; each has `blocks` + `layout: 1` in its realm data. Rocks by
  the rock rule everywhere. The pale clumps on the meadow are its tall-grass stands, not old bushes.
- Trees: crowns west of the castle wall are drawn again in front of it (`OVH.overCastle`, draw.js after
  `drawCastleWorks`); sway poses and see-through crowns are cut from the base sprite by row shifts (under 1 ms, one
  a frame), never re-sculpted; under the Blood Moon owned trees take an extra shade and cast long moon shadows.
- Checks: ten levels' sims exact; Gullwick 37 / 95 -> 51 / 104 and Wolfrun 221 / 303 -> 335 / 253 (blocks); Iron,
  Rime, Hollow boards pixel-identical. Steady state +0.4 to +1.8 ms a frame. **`ovh-identity.html` hashes depend on
  the ORDER of realms and suns in the run** (some cache carries state between cases): always compare runs made with
  the same list in the same order.
- **New water on three dry boards** (owner: "you can add more lakes and streams yes"; pushed 2026-11-23): a stream
  on Barrowfields, a spring-fed mere + stream on Kingstones (its field wall trimmed), a reed fen on Cinderholt, each
  entry `minor: true` (too small for the campaign map: `check-map-water.mjs` leaves `minor` water out) and the realm
  `layout: 1`. No bridges; sims: Barrowfields and Kingstones exact, Cinderholt 419 / 338 -> 446 / 371.
- NOT done: other
  seasons; anything seen on a phone beyond Millrace. Next area: the Iron Marches, CONCEPTS FIRST
  (`art/briefs/overhaul-iron-questions.md`).

## The owner's wishlist (ideas for later: do NOT build unasked)

The live backlog; KICKOFF.md's old list is all built. Add new wishes here, dated.
- **Hidden mechanics** (2026-11-20): secrets the game never shows or explains. First idea: two
  Powder Keg Runs facing each other whose kegs MEET mid-roll go up together in one much bigger
  blast. The owner would like more like it over time; put ideas to the owner before building any.
- **Night maps** (2026-11-21): levels fought at night.
- **Farmland ground (cultivated fields)** (2026-11-22, parked by the owner: "lets drop the farm textures for now,
  maybe we can revisit it in the future? like the terraces"): a generated patchwork of fields per board
  (`concept/overhaul2-ground.js`, notes "Round 3c" in its `.md`). What the owner liked: Cinderholt's version (big
  plots, the board still full of farm, split plots that keep one crop); what failed: small lots and crop textures
  changing too often; rules they asked for: a minimum size for any cultivated field, no slivers by the road, no two
  maps alike. Three options (A big fields, B blocks of one crop, C Cinderholt's recipe) were drawn and not picked.
  Not in the first overhaul build: the Greenwood's ground is the calm meadow.
- **Terraced ground ("bold steps")** (2026-11-22, parked by the owner: "take this out for now, put it on the to do"):
  earth scarps stepping the land on hilly Greenwood levels. Start again from ROUND 2's look (long steps;
  `concept/overhaul2-ground.js`, `?r2=1` in its lab), which the owner preferred ("round 3 is much worse"); how a step
  meets the road is the unsolved part. Not in the first overhaul build.
- **The campaign map takes the time of day** (2026-11-22, "wishlist stuff ... for sure"): once the board's
  new look is nailed down, "likeminded changes" to the campaign map, with dynamic lighting: finishing a level
  fought in the afternoon opens the map at the same time of day; "marching" to the next level moves the sun on
  to the next marker (more steps if the levels are further apart).
- **Time of day changes play** (2026-11-22, owner: "look only for now, but mark it down as a future
  thing to think about"): a low sun doing something in the rules (e.g. glare for halls shooting into
  it). Put ideas to the owner before building any.
- **Sunsets elsewhere** (2026-11-22, owner: "sunset lighting type things in the other levels as well ...
  this is a good first step"): the Blood Moon's dusk wash and night lighting (render/bloodmoon.js,
  render/nightlight.js) are the starting point.

## Open threads (as of 2026-09-29)

Bring these up with the owner; don't act on them unasked.
- **NEXT: a WebGL renderer behind a switch** (2026-11-26, owner: "the webgl sounds like the right move
  right now"; start when the owner says, planned after their usage resets on Saturday 2026-11-28). The
  owner asked whether the ~10 fps slowdown (see "Frame timings on the device") means moving off the web to
  a native app. The answer given: not yet. Our own code is ~4-6 ms a frame and the slowdown was intermittent
  and cleared by a phone restart, so it points at WebKit's own drawing, not the game. Capacitor runs the same
  WKWebView, so the app build alone changes nothing. A native rewrite (Swift can't be built or checked in a
  cloud container; Godot can, headless on Linux) was put at ~3-6 weeks of agent sessions for parity plus the
  owner replaying everything, so it's held back until WebGL has been tried. The plan agreed: (1) keep the engine,
  the bakes, UI and art untouched; hand only the final compositing to the GPU: the baked canvases become
  textures drawn from a per-frame list, and the whole-board passes (Blood Moon shade / rake, daygrade, grade layer,
  fog) become shaders. That's the part that should help most (the Blood Moon's three blended full-board passes are
  the biggest pixel cost left, "A cooler phone"). (2) A Display switch, old Canvas 2D vs WebGL, so the owner can
  feel the difference on their iPhone; must look identical (compare side by side in a lab before the owner sees it).
  (3) It ships in the Capacitor app unchanged (WebGL2 is on iOS 17+). (4) Only if it still stutters, talk about Godot
  again; WebGL's texture + draw list and shaders carry over to it. Estimated a few days. Explain things to the owner
  in plain words, no jargon (the owner asked for that).
  **The first `slow` report came in the same day and points elsewhere** (home-screen app, Ravenscar wave 24,
  25 min after launch): 19 fps with 18.9 ms of OUR code a frame (draw 17.4: actors 10.5, castle 4.7), against
  2.5 ms / castle 0.3 in the same build's normal samples, with only 45 foes and 13 halls. The castle's work hardly
  changes, so a 15x jump means the phone was doing the same work much slower. And `audioLeft` was 23,174 (normal
  samples 339-426): sound nodes made but never unplugged. tidy.js only unplugs once a source fires "ended", and a
  stuck AudioContext (suspended / interrupted; an earlier launch that day logged "Failed to start the audio
  device") freezes currentTime, so every effect built while it's stuck never ends and piles up (muting doesn't
  help: it zeroes the gain but still builds nodes). A second way the same pile-up happens: WebKit may collect a
  playing source's JS side, and its "ended" listener with it, while the node stays wired in.
  **Fixed 2026-11-26 (see "Sound and music", the pile-up guard); pending a phone check.** The next reports carry
  `audioState` and `audioSwept`: swept > 0 means "ended" was lost and the sweep saved it. WebGL stays the plan if
  slow reports keep coming with audioLeft low. Not done: rebuilding a context that stays stopped (the game is then
  silent until relaunched, but no longer slows).
  **A friend's iPhone the same evening** (852x393@3, home-screen app): on the OLD build audioLeft climbed 399 ->
  7,894 -> 14,951 over three levels and the frame rate fell 60 -> 5 (85 ms of our code a frame, 3 foes): the pile-up
  confirmed. After reopening on the fixed build: 60 fps at Gullwick wave 13, audioLeft 418, audioSwept 1,841 in
  133 s (so "ended" really is lost on iOS, often). Then, BATTLE 2 since launch (Millrace, before wave 1), a `slow`
  sample with sound fine: 7 fps, 31 ms of our code, prep 21.9 and castle 7.6 (both 20-70x their usual) while actors
  1.3 and ground 0.4 were normal; it stayed slow through a tower placed, and he closed the app. The battle-2-after-
  launch pattern matches the owner's first report. Suspect: image memory left over from the last level (iOS is slow
  to free canvas buffers; nothing in src/ releases one with width = 0), slowing every NEW canvas made at a level's
  opening. Not reproduced in Chromium (live canvases held ~95 MB across four level loads with a forced GC). Added
  for the next report: canvaswatch.js COUNTS canvases in every build now (`canvases` in the sample: alive, MB,
  made), the overhaul's tree bakes (`trees`), the scenery pass split out of "prep" (`parts.scenery`), and a
  `still-slow` sample if a battle stays under 20 fps for 30 s.
- **A new name for the game** (2026-11-26, owner: "I still don't like crownguard"; "we'll come back to
  this"). Ruled out: Siegebreaker / Siege Breaker(s) / Siege Break (a 2024 tower defense on Steam is
  "Siegebreaker"; Halfbrick's iOS "Siege Breakers"; a "Siege Break" app; several more). The owner turned
  down long lists of castle compounds (Marchward, Gatehold...), castle words (Portcullis, Barbican...)
  and "<world> Defense" names. Closest so far: The Best Defense (liked the saying "the best defense is a
  good offense", then "eh" on variations), Sally Port, Sortie!, Gatecrashers. Not done: mock the title
  screen with 3-4 names in the game's lettering; check the pick on the App Store, Steam, Google Play and
  the USPTO (a name is trademark, not copyright). Only the shown name changes: never the appId.
- **Fire and frost don't mix** (owner's idea, 2026-11-21, "for future, hidden mechanics"): NOT built.
  Today a burn and a slow stack freely on one foe (neither clears the other). Possible rules to put to
  them: a burn thaws a slow (or a freeze) and a chill puts a burn out early, or the second one cancels
  the first. Ask before building; it changes balance (Bladewheel's Brazier, Frost Altar, Dragonbreath).
- **The slow's look, Round 6** (2026-11-21): today's frost ring at the feet read as part of the stun
  when a foe was both. The owner wants a new look "like the fire" (the body's outline, Round 5 B);
  brief `art/briefs/fx-round6.md`, row `slow6` in `concept/fx-r6-slow.js`,
  `node scripts/build-fx-concepts.mjs round6`. Private Artifact "Crownguard Effects Concepts, Round 6"
  (slug fd2dba94-116f-4103-8043-3937261a295e): Today / A hoarfrost edge / B creeping ice / C cold mist /
  D chilled colours, plus B on a burning foe (fire + frost). The owner picked **C, cold mist** (it
  overlaps least with fire, stun and poison); IN THE GAME the same day, a step stronger than the
  concept (brief `art/briefs/slow-mist-build.md`): statusfx.js `statusSlow` (the old ring is only
  the fallback for a figure with no `e._rf`), no star wheel over the head. 200 slowed foes 0.37 ->
  0.41 ms through statusSlow (the old path also blitted the star wheel); ~4-5 MB of mist bakes for 8
  types. A newly slowed type fills in over a few frames (2 bakes a frame). Pending the owner's look.
- **The Plague Ghast's burst, Round 7** (2026-11-21, owner: "needs a rework"): brief
  `art/briefs/fx-round7.md`, row `plague7` in `concept/fx-r7-plague.js` (true scale, two knights at
  the 55 reach, today's pool after), `node scripts/build-fx-concepts.mjs round7`. Private Artifact
  "Crownguard Effects Concepts, Round 7" (slug 6324774e-371d-49b1-b9ec-f5433984e833): A gut-burst,
  B gas cloud, C bold blast ring, D swarm of flies. Weak: B's puffs read as balls, C's stain is flat
  noise, D's flies are 1-2 px at board size, the pool's hand-over jumps. Building any option needs
  the engine's pool (laid at the death, update.js `deathBurst`) held back or drawn under its stain.
  The owner picked **A's first half, no pool** (same day): IN THE GAME (brief
  `art/briefs/ghast-burst-build.md`; rings.js `case "plagueburst"`, baked `gb*` frames shared by all
  bursts): a lumpy swell on the body (220 ms), a white flash, gobbets thrown out in arcs that land
  out to the rim, splats fading by 900 ms, nothing left on the road. The DAMAGE (owner): 75 once, no
  pool or damage over time (was 26 + a 3.5 s pool of 12 a second); each soldier in 55 is struck as
  the rot reaches him (`GHAST_SWELL` 220 + `GHAST_FLY` 300 x distance / reach, `g.ghastHits`,
  update.js `runGhastHits`; cleared by a retried wave). `deathBurst` with `dps` would still lay a
  pool. Measured `--chapter hollow --endure`, better doctrine, seeds 1/2: 9551 / 9199 -> 9824 /
  10507 (the Dead Weir 994 -> 1676 on seed 2); all 15 held, none stuck. Pending the owner's playtest.
  Then (owner: "looks a bit whack. Maybe because the biggest bubbles fall towards the outside?")
  **Round 8** variations on the burst (brief `art/briefs/fx-round8.md`, row `burst8` in
  `concept/fx-r8-burst.js`, `build-fx-concepts.mjs round8`): private Artifact "Crownguard Effects
  Concepts, Round 8" (slug 67072951-4f90-4be3-9fe8-abd0357b8df3): A heavy falls close, B streaked
  splatter, C spray burst (droplets vanish fast), D bouncing gobbets + a ring of droplets on the rim.
  All keep the engine's timing. The owner picked **A** (2026-11-22): IN THE GAME (rings.js `gbGobs`:
  4 big gobbets low and short near the middle, 8 middling mid-way, 56 flecks with satellites to the
  rim; swell, flash and timing unchanged; 10 bursts at once ~0.19 ms a frame). Pending their look.
- **The fire wizard's blast, Round 9** (2026-11-24, owner: the fire mage's explosion is "the same or very close to
  the bombardier throw ... good for a bomb, bad for a wizard"): it IS the same: a fireball with `p.burn` and the
  Powder Works' shell both push `{ type: "boom" }` (update.js ~3325, fx.js `BLAST.boom`). Brief
  `art/briefs/fx-round9.md`, row `fireblast9` in `concept/fx-r9-fireblast.js`, `build-fx-concepts.mjs round9`
  (then the page's labels were renamed by hand). Private Artifact "Crownguard Effects Concepts, Round 9: Fire Wizard
  Blast" (slug d450c58e-8640-47a8-83db-4693dc44cadc): A flame bloom, B fire sigil (no star: rejected as a
  religious symbol), C fire vortex, D molten splash; all smokeless, wave at the rim by 384 ms, gone by 530 ms.
  Weak: D's pools a little heart-shaped, C's glow a bit ribbon-like. The owner turned all four down.
  **Round 10** (owner: "keep its cool magic rings around the outer edge ... less smoke, less explosivity"): today's
  `boom` ground layer (the ring) drawn by the game's own drawBlast, only the "a" layer softened (brief
  `art/briefs/fx-round10.md`, row `fireblast10`, `build-fx-concepts.mjs round10`): A no smoke, B a smaller flame,
  C a flare (no fireball), D C + a faint inner ring. Private Artifact "Crownguard Effects Concepts, Round 10: Fire
  Wizard Blast, Softer" (slug 8c0d04cd-f73d-4634-aad8-feb7b7dcbb25). **The owner picked A with D's inner ring**: IN THE
  GAME (not pushed until the owner has seen it) as its own blast type `fireboom` (fx.js `BLAST.fireboom`: boom's ground
  ring + a broken inner ring of fire at 0.6 of the reach, `INNER` tones; boom's fireball and embers with `smoke` off and
  nine sparks lifting off; `BLAST_PACE`, ringflash `RING` and SEEDS entries). Only a fireball with `p.burn` uses it
  (update.js); the Powder Keg Run, the trap bombs and the spores keep `boom`, the Powder Works' charge is `keg`.
  Shown as private Artifact "Crownguard Effects, Round 11: Fire Wizard Blast as Built" (slug
  bfb190bb-f3af-45c2-afe3-89c8c667a8a9; row `fireblast11`, `build-fx-concepts.mjs round11`, `threeCols`).
  The owner approved it and (same day) cut its blast area 15%: Pyromancer `splash` 36 -> 31, Inferno Throne 38 -> 32
  (the picture follows the damage circle; the Inferno's every-fifth fire pool, `poolR` 36, unchanged). Not simmed.
- **Dragonbreath's flame, Round 12** (2026-11-24, owner: "fixing the dragons breath as well ... 3 options, animated"):
  today (flames.js `drawBreath`) reads as a smoky hose of lumpy balls. Brief `art/briefs/fx-round12.md`, row `breath12`
  in `concept/fx-r12-breath.js` (the real spire, a 16-frame held, sweeping loop; the hall's time held still),
  `build-fx-concepts.mjs round12`. Two drafts were sent back (a thin rope dropping onto a carpet of identical spikes;
  then a flat striped triangle): variations of today work, new constructions did not. Shown: A today cleaned (no smoke,
  warm far end), B streaked flame, C A + a fire ring at the staff and a broken arc on the far edge. Private Artifact
  "Crownguard Effects Concepts, Round 12: Dragonbreath" (slug 8de5408a-e422-4184-ad27-7f6adbed86bd). Awaiting the pick.
  The owner turned all three down ("None of those, have fable draw us one"). **Round 13** (brief
  `art/briefs/fx-round13.md`, row `breath13` in `concept/fx-r13-breath.js`, `oneCol: true` = TODAY + one option,
  `build-fx-concepts.mjs round13`): Fable 5.2 designed and drew it as an artist (`subagent_type: "artist"`, `model:
  "fable"`, at the owner's request): a blade of flame from a spell ring at the staff down to the road short of the foes,
  a flare where it lands, and three surges of knee-high flame patches (burning ground B's tongues on a broken fireboom
  line) rolling out to the wedge's far arc, an ember line on the arc, no smoke. Weak: aimed up-screen the patches stand
  in columns; not baked (building it needs the blade baked per aim bucket). Private Artifact "Crownguard Effects
  Concepts, Round 13: Dragonbreath by Fable" (slug 30614481-f5ca-4358-8ff5-c1d33d68275f). Awaiting the owner's look.
  Round 13 was turned down ("looks like a fountain"), then the owner: "the fable one is close but I don't like the
  ground splatter", and sent a REFERENCE (`art/briefs/ref/dragonbreath-ref.jpg`: a side-on pixel flamethrower jet, thin
  white needle widening into a dense mottled orange mass with a pale core, ragged licks, a big rounded head; no smoke,
  nothing on the ground). **Round 14** (brief `art/briefs/fx-round14.md`; shared cell `concept/fx-r14-kit.js`, one file
  an option `concept/fx-r14-{a,b,c}.js` exporting `paint(c, e)` + `note`, gathered by `fx-r14-breath.js`, `threeABC`;
  `build-fx-concepts.mjs round14`): A (Opus) the reference faithful, B (Opus) pumped surges and the head landing on the
  road, C (Fable) its Round 13 jet with no ground fires. Owner asked for two Opus and one Fable. All three are steep (the
  staff stands ~130 art px above the road, so a straight jet to the foes falls 50-75 degrees on screen). Private Artifact
  "Crownguard Effects Concepts, Round 14: Dragonbreath after your reference" (slug 1f40569c-0069-4c7a-99dc-a43e91ef30f3).
  The owner picked Round 14's **B** ("much closer to my vision") and asked for a wider stem before the flare, the lit trail
  on the road from the hall removed ("didn't land"), and three more Opus variations. **Round 15** (brief
  `art/briefs/fx-round15.md`, row `breath15`, files `concept/fx-r15-{a,b,c}.js` (each began as a copy of fx-r14-b.js),
  `build-fx-concepts.mjs round15`; the first strip is Round 14's B): 1 B fixed (straight taper to half the head), 2 a
  heavier torrent (wide from a fifth of the way, smaller head, only the head's foot in front of goblins), 3 a stronger
  pump (a lopsided bright bulge down the stem, the head squashes wide on arrival and springs back). Weak in all: at the
  sweep's ends the head lands on the grass beside the road (the kit's aim). Private Artifact "Crownguard Effects
  Concepts, Round 15: Dragonbreath, variations on B". Awaiting the pick.
  The owner picked Round 15's **variation 1** ("looking good") and asked for the flare's bottom, where it meets the road,
  "just a tad wider", two versions. **Round 16** (row `breath16`, `concept/fx-r16-{a,b}.js`, copies of fx-r15-a.js with
  dials `FOOT` / `FLAT` / `GLOW` at the top, `twoAB`, `build-fx-concepts.mjs round16`): 1 the foot 1.2x, still round;
  2 the foot 1.4x, a little flattened along the road, the glow 1.2x (reads slightly bell-shaped on frames 2-6). Private
  Artifact "Crownguard Effects Concepts, Round 16: Dragonbreath, a wider foot". Awaiting the pick, then build it into
  flames.js `drawBreath` (bake the jet per aim step and frame) and show it before pushing.
  The owner picked Round 16's **version 2** ("2 for sure") and asked for the flare "just a bit more transparent", two
  options. **Round 17** (row `breath17`, `concept/fx-r17-{a,b}.js`, copies of fx-r16-b.js; each flame pixel carries an
  opacity in steps of 0.05, eased in with dithered steps from where the flare starts, the 1-px outline kept near solid):
  1 the head evenly ~80% (`HEAD_A`); 2 centre ~95%, rim ~60%, the foot partway (`CENTRE_A`, `RIM_A`, `FOOT_THIN`).
  Weak: see-through deep red over the tan road turns salmon. Private Artifact "Crownguard Effects Concepts, Round 17:
  Dragonbreath, a see-through flare". Awaiting the pick.
  The owner picked **Round 17's version 1** ("lets do 1"): IN THE GAME (flames.js `drawBreath`, ported from
  `concept/fx-r17-a.js`, the old billow / smoke code removed; not pushed until the owner has looked). The whole jet is ONE
  baked sprite per (48 aim steps, 16 frames at 110 ms of game time, 6 `on` buckets, reach, mouth), at most
  `BREATH_BAKES` 2 bakes a frame (a missing frame borrows the nearest), cache `BREATH_BUDGET` 32 MB, `breathStats()`.
  Drawn over the fray (no depth sort; the 80% head lets foes show through); a faint dither marks the wedge on the road,
  `GLOW_A` 0.5. Bake ~2.9 ms a sprite; 0.04 ms a hall a frame once baked. Weak: steep up-screen aims give a short jet.
  **Next, owner's ask (2026-11-24):** once Dragonbreath is settled, look at the OTHER fire effects with the same look and
  the same concept loop ("this actually looks so much better than what we have everywhere else").
  **Round 18** (2026-11-24, the owner's first two of the other fire effects, "Opus, give me three variations on each";
  brief `art/briefs/fx-round18.md`, `build-fx-concepts.mjs round18`): row `firering18` (`concept/fx-r18-ring.js`, the
  Brazier Wheel line's `firenova` ring on the real Bladewheel, flames redone in Dragonbreath's look, ring and timing
  kept; A a mottled wall, B a low fast front see-through behind, C A + a white-hot edge and sparks; the centre burst and
  heat haze dropped; the hall's own spike flames now look old) and row `burn18` (`concept/fx-r18-burn.js`, statusBurn's
  outline and glow kept line for line, only the flames new, smoke puffs dropped; A small mottled tongues, B tall licks
  streaming back, C A + sparks and a white-hot root). Found: statusBurn bakes 12 steps but plays 8 (`frameOf` mod `FX_N`
  then `BN`), so the outline's roll jumps each loop; the concept uses 16. Private Artifact "Crownguard Effects Concepts,
  Round 18: flame rings and foes on fire". Awaiting the picks.
  The owner on Round 18: burn **A** ("looks great": being built into statusfx.js); the ring: "I don't want it to go
  across the ground. I like the direction in B, but can we have it go through the air? And make it start a little bit
  further out, so we're not burning our operator." **Round 19** (row `firering19`, `concept/fx-r19-ring.js`, first strip
  Round 18's B): a hoop of fire flying outward at a height, nothing on the ground but a faint light under it, first seen
  at half the reach (the operator stands ~19 units out), reaching the rim on today's clock: A at a goblin's chest, B
  thinner at head height and more see-through, C thrown from the wheel's rim, rising as it flies and guttering. Weak: on
  screen the near half still crosses the operator in the first frames (clear on screen would need A 38 / B 49 units).
  Private Artifact "Crownguard Effects Concepts, Round 19: the ring of fire through the air". Awaiting the pick.
  Burn **A** is IN THE GAME (statusfx.js `statusBurn`; not pushed until the owner has looked): the outline, ground pool,
  warm ring and wash unchanged; Round 18 A's tongues in pairs (2-4 burning, scaled with height up to 1.7x), no smoke,
  three sparks in Dragonbreath's tones; `BN` 16 baked AND played (step `floor(time*12 + id*3) % 16`); LRU cache
  `BURN_BUDGET` 24 MB (500-canvas cap kept), `burnStats()`. 200 burning foes 0.385 -> 0.395 ms a frame (same page,
  side by side); MB per figure about doubles (every step baked now: goblin 0.55 -> 1.21). Not seen in a live battle:
  shotlab's one-draw snaps bake too little to show it (the 2-bakes-a-frame budget).
  Ring **A** of Round 19 is IN THE GAME (owner: "A looks great!"; not pushed until the owner has looked): rings.js
  `case "firenova"` draws the chest-height hoop from half the reach to the hall's range (65 / 69 / 74) on today's clock,
  its far half in the ground layer and near half in the air layer; baked by the block above `drawRingFx` (`hoopBake` /
  `hoopAt` / `hoopStats`: per 2-art-px radius step and fade step, one bake a frame, LRU 12 MB; the three Brazier
  ranges ~9.4 MB); ringflash.js's `firenova` front now `0.5 + 0.5 * easeOut(p * 1.15)`. Six halls firing together 1.30 ->
  0.093 ms a frame once baked. `flameS`, `charS`, `behindHall`, `clipFront` and the old centre burst are unused now.
  Weak: foes outside the ring draw in the wrong order against it (two layers only); foes in the inner half never flash.
  The three above were pushed (2026-11-24). **Round 20** (owner: "lets work with the other fire effects"; brief
  `art/briefs/fx-round20.md`, four Opus artists, `build-fx-concepts.mjs round20`): `fireball20` (`concept/fx-r20-
  fireball.js`: the Pyromancer fireball, the Comet Sling's stone (today it flies with NO fire on it) and the fire pot,
  one shared flame painter keyed on heading and age; the pot's muzzle flash and landing burst redone too), `logs20`
  (`fx-r20-logs.js`: calls the real `drawLog` with `burn` off and adds the flames; only the Powder Keg Run carries
  `logBurn` in the game), `pools20` (`fx-r20-pools.js`: beds kept line for line, flames redone; WEAK after a fix pass:
  still small spikes over a busy crack web, the lava's flames hard to see), `torch20` (`fx-r20-torch.js`: real halls by
  day and under the Blood Moon, hall `live` "flame" entries replaced; at night the new flames are drawn over the shade,
  so building it changes draw order in pix/halls.js and castle.js). Lab lesson: use literal `import("/src/...")` in a
  concept file; a variable import is a second copy of the module with its own caches. Private Artifact "Crownguard
  Effects Concepts, Round 20: the rest of the fire". Awaiting the picks.
  The owner's Round 20 picks, IN THE GAME (2026-11-24): **fire in flight A** (`src/render/flightfire.js`: fireball per
  normal / big x 32 headings x 12 age steps, the Comet Sling's BIG stone wrapped in flame (two layers round the game's own
  stone), the fire pot's shot / flash / burst; LRU 8 MB, 4 bakes a frame; fx.js `drawOrb` / "rock" branch and musketfx.js
  `drawMusketShot` call it; `?oldfire=1` shows today's for labs; `flight-lab.html`); **logs A + the burning outline**
  (logs.js: statusBurn's recipe on the barrel's silhouette, baked per kind / width / 64 headings / step, LRU 12 MB,
  `logBurnStats()`); **ground fire B** (flames.js `fireBaseS` / `fireFlamesS` / `patchMass`, flame height `LOOK.hk` raised
  0.7 -> 0.85 to read at board size, 16 steps, no sparks; `drawLavaFlames` in fx.js's lava path, under foes on the pool);
  **torches A** (`src/render/torchflame.js` `torchSprite` / `stampTorch`; pix/halls.js `live` "flame", halls/spiker.js pots,
  castle.js gate torches, buildkit.js `flame`; under the Blood Moon they queue and `bloodmoonPaint` flushes them over the
  shade, `drawTorchesLate`). Not yet: the Inferno Throne's crown flames (hall-wizard.js `crownFlame`, old look); the fire
  pot not seen in a live battle; shotlab with `warm=0` throws (`g.grounds` not iterable), use `warm=0.02`.
- **The plain slow, Round 21** (2026-11-27, owner: "a different visual effect for frost slow and normal slow like from
  traps. Frost is great"): the cold mist (Round 6 C) stays for FROST slows; the plain ones (Trapsmith strips, Caltrop Field,
  Hamstringer, Earthshaker, Harpooners, the War Horn, logs, Osric) get a look of their own. Brief
  `art/briefs/fx-round21.md`, kit `concept/fx-r21-kit.js`, one file an option `concept/fx-r21-{a,b,c}.js` (row `slow21`,
  `threeABC`, TODAY = `slowmist`, the mist read from the frame), `build-fx-concepts.mjs round21` (then the labels renamed by
  hand). A (Opus) dust and drag (subtlest), B (Opus) two grey afterimages a step behind, C (Fable) ball and chain (the
  dragged weight runs ~12 px behind the feet). Private Artifact "Crownguard Effects Concepts, Round 21" (slug
  812f7bc6-4fdb-47cd-b4e4-57d50d5c6bfa). Awaiting the pick. Building it needs the ENGINE to tell the kinds apart: today
  every slow sets only `slowUntil` / `slowPct`; a frost source (Warden Mage aura and line, frost orbs) must also mark the
  foe (e.g. `e.slowCold`), and fx.js `drawStatus` picks the mist or the new look by it (both when both apply).
  The owner picked **A, dust and drag** (same day): IN THE GAME (statusfx.js `statusDust`, ported from
  `concept/fx-r21-a.js` without its 1-px dip; baked per figure frame, strength and view like the mist, grit only on a
  side walk at walk frames 2 / 6, the climb capped at 6 / 9 / 13 art px). Frost = only the Warden Mage line's aura
  (what `frostProof` blocks): update.js sets render-only `e.auraCold` there and `e.auraDrag` for the caltrops' ground;
  fx.js `drawStatus` draws the mist for `auraCold`, the dust for any timed slow or `auraDrag`, both when both. The
  rules still read only `slowUntil` / `slowPct` / `auraSlow` (gw3 sim identical). `slow-lab.html`. Pending the owner's look.
- **The novas are settled** (owner, 2026-11-17: "novas look great!"): Round 4's B look, angled,
  coming out of the hall (style guide, "Effects on the ground").
- **TO DO / WORTH A LOOK after the graphics pass (owner, 2026-11-14: "keep that ... I'll
  check them out later"):** the ram was put back to its old size 2026-11-17 (the cavalier and
  gryphon stay smaller than their old rigs: the owner's call, same day); bushes, the gate threshold and a few Rime props (longhouse, rack,
  whale bones, ship) still old style; the skald's chant clip never plays (no engine clock);
  Hale's crossbowmen wear the Iron crossbowman; at the steepest aims the siege bow stands
  almost upright and a shooter may turn fast if it switches mark just before a shot;
  **rough joint connections on the big figures, "particularly on the elephants" (the Rime
  Jarl's war-mammoth, fig-mammoth.js) "and other large guys"** (frost giant, troll, Hollow
  King, amalgam, crypt warden, the Marshal...); none of it seen by the owner on a real
  phone or iPad. Also (same day, later): the falcons (pix/bird-falcon.js, birds.js,
  halls/falconry.js) and the Skyknight's war-eagle (pix/bird-eagle.js, `PIX.eagle` set from
  rigs-eagle.js) are redrawn; the Eyrie's wheel birds still show as brown hawks, not the
  king plumage (check what kind the hall passes); the projectiles (pix/proj-sprites.js:
  32 headings, world-space sun; fx.js drawProjectile / drawQuarrel) and logs (logs.js:
  resampled to art pixels each frame, ~6k pixel reads a log: watch it on an older iPhone)
  are redrawn; the Archer hall's level 3 is timber-topped, its green path stone-topped.
  The kraken is parked (may not ship).
  **Joints and clipping (2026-11-15, Fable's plan `art/briefs/joints-clipping-plan.md`):**
  the joint kit (one body per creature, welded limb chains, wrap, depth along a part, named
  layers, tags; style guide "The joint kit") is applied to the mammoth, troll, frost giant,
  amalgam, crypt warden, Hollow King, Marshal, Rime Jarl, Champion, the horse, boar, wolves,
  gryphon and sea serpent; clipping fixed on the bows and crossbows (all aims) and the levy,
  unhorsed knight, sergeant shields and the war-eagle's wing. NOT yet touched: the approved
  figures (Aldric, Wren, mage, goblin, orc, necromancer: show the owner a before / after
  first; the orc ranks 7th for seams) and the rest of the roster by the audit's ranking
  (ram, eagle body, captain, ironclad, levy's joints...).
  Owner (2026-11-15), on the approved-figure drafts (scratchpad/apr/, .shots/apr_*.png):
  "leave this alone for now. A lot of what I'm seeing is the colour between the arm and the
  body now blend too much" (being worked on in the fork session "Opus-centered workflow
  optimization (fork)"). So welding can over-blend an arm into the torso: keep arms that
  cross the body visibly separate (value or outline) when applying the joint kit. The six
  approved figures stay unchanged until the owner says otherwise. Frame picker: private
  Artifact "Crownguard Frame Picker" (`node scripts/frame-picker.mjs` rebuilds it; each clip
  ends with a box that plays it). **Hero swings (2026-11-15, four rounds, then the owner:
  "ALDRIC IS PERFECT ... Same for Osric"):** Aldric's and Osric's attacks are APPROVED as of
  commit 2ee808b (near arm never behind the head, weapon locked to the hand; style guide,
  "Arms and the head"). Hale's attack is a rising sweep (owner: "a lot better ... leave it for
  now"). The same rules were then applied across the armies (`art/briefs/arms-weapons-sweep.md`,
  five Sonnet artists by army, 2026-11-15), NOT yet seen by the owner. Left: the frost giant's
  dragged club (a fixed grip can't both drag it and chop), the levy's spear and the cavalier /
  gryphon lances (couched poles, still free), the shaman's swat (wrist widened), the troll's
  wind-up arm covers most of his face. The audit's `eyes` rule only bites on figures whose head
  goes through `stampFace` (heroes, crown, Iron); on the others it reports "rules checked none".
  **Old-style sweep (2026-11-15):** `art/briefs/old-style-sweep.md` lists what still drew
  old; `art/briefs/props-artist.md` is the brief. Done that day: every decor piece's ring
  is the tinted one-pixel line (scenery.js decorSprite, `tintRing` in scenery-gwpix.js;
  `inkTint` in inktint.js for traps / rings / effects; bridge.js and coast.js likewise);
  Greenwood rocks, mushrooms, dead trees, Gullwick tower; Iron camp, tents, wagons, pikes,
  standards, King's tower, ruins, drill field, salt works, eyrie, quay; Hollow trees,
  graves, fence, barrows, water relics; Rime gate poles, longhouse, longship, rack, whale
  bones, boats, stones, spruce; the build crew (fig-builder.js); barricades; corpses; the
  Covert's blades (fig-blade.js, 7 forms) and the River Watch skiffs (fig-skiff.js). Props
  re-sculpted into a chapter's `flat` list have NO "New sprites off" fallback (a board's
  decor bakes once). The leftovers followed the same day: the cave mouth's line and rim,
  the build scaffold (buildanim.js), the Hollow shrine / bell-stones / candles / throne /
  weir, the Rime rocks, icefall, seal rocks, floes, bergs, skerries and the landing longship
  (rimefx.js, a striped sail), the campaign map's lines (mapArt.js: tinted, nothing moved;
  its towns and castles were not re-sculpted), and the blades' cut timed off the attack
  clock. STILL OLD: the `part()` inner lines in paint.js on older painters (a bake-time
  tinted ink there would finish many pieces at once), the reed beds and bog pools (judged
  fine). Weak: the skiff gunner reads a bit large; the scaffold costs ~+1 ms a frame while
  a hall is being built. The recap page is the private
  Artifact "Crownguard: the graphics pass, before and after".
- **Shooters aim; shots fly straight (owner, 2026-11-14): DONE, pending the owner's look.**
  The rules are `art/briefs/aim-contract.md`. `src/engine/aim.js` (aimDeg / quantAim, 10-degree
  steps, +-70) and `muzzles.js planShot` (the muzzle = `rotAbout(AIM.pivot, AIM.muzzle, deg)`
  from the figure's exported `AIM`; old tables with "New sprites" off and in the sims). Shots
  that aim (arrows, crossbow and ballista bolts, musket balls, foe arrows) carry `straight`,
  fly to a led aim point (`leadPoint`), never home, and still hit a live target on arrival
  (no new misses: gw1 / ir3 `--endure` within noise). Figures read `"<variant>@<deg>"`:
  fig-bowman (hall + castle wall), fig-archer (Wren), fig-fieldbow, fig-bonearcher,
  fig-crossbow, fig-errantbow, fig-musketeer, fig-engineer (`engineer@deg` on the siege bow's
  handles, though halls/archer.js does not yet pitch the machine itself); the castle's
  ballistae pitch to `castleCd.balAim`. Not aimed on purpose: the Wizard Spire's curving
  bolts, catapult, bombardier, skiffs, Sunforge, falcons, Ysolde. Follow-ups (same day):
  every aimed shooter TRACKS its target between shots (`easeAim`, 240 deg/s, aim.js; the
  shot leaves from the eased angle); bowmen turn the upper body and lean up to 8 degrees so
  the string hand stays on the nock at every aim; the Ballista path's siege bow pitches
  (`siegeBow(loosed, flip, aim)`, hall-archer.js; `SIEGE_AIM` in fig-engineer.js, read by
  planShot's "siege" key) and its engineer follows. Weak spot: the tracked mark is sticky,
  re-picked in the last 500 ms before a shot.
- **BEFORE PUBLISHING (owner, 2026-11-07): no "Retry Wave" in the campaign.**
  "Makes it more challenging. Keep it how it is for now, but before publishing
  I'll want that change." Not done yet on purpose. The button is on the defeat
  card in CrownguardGame.jsx (`ui.canRestart` -> `restartWave`); in a campaign
  battle hide it, so Restart Level becomes the gold button, and reword the
  card's "Retry the wave with your gold and towers restored" line to match.
  Free Play keeps it. Ask the owner whether the Endless March after a
  campaign win counts as campaign. The retry-wave snapshot (`snapshot`) can
  stay in the engine.
- **The fog was reworked 2026-11-07** (owner's design): it fades with the
  level (see "Weather brief on the level card") and runs past the board on
  tall screens without mirroring. Pending the owner's playtest of both; the
  grave mist is still to be looked at by the owner. `wx-lab.html`'s `?rise=`
  reads the spell schedule, which the fog no longer has (storms etc. only).
- **Tower menu is built** (see "The tower menu is the tray"), pending the
  owner's playtest. Still open: the tray's Castle / Sandbox / Master row
  crowds when all three show (the label "Castle" clips); that belongs to
  the tower GRID's state, not the edit menu.
- **Waiting on the owner's playtest:** the range cut (every hall ×0.75),
  the pricier later levels, the hero xp curve, the Siege Ram rework, the
  Powder Works numbers (still the strongest on armor) and the Cairnfields'
  850 start gold. Details are under "Balance and testing".
- **Put to the owner, no answer yet:** a small pond bunches 3–4 River Watch
  boats close together.
- **Known, not fixed:** `mPierce` does nothing (see the Powder Works
  notes); square snow patches on the Frostfang map (the Rimewater boards repaint their turf and have none).
- **Type:** a device that once opened a `?type=` link keeps that option
  (localStorage `cg-type`); `?type=tidy3` returns it to the default.

## Who does what: Opus leads, Sonnet builds, Fable advises (2026-11-14, owner)

The owner was burning usage fast: in the tower-buildings pass all twelve artists ran on
Fable 5.2 (up to ~140 calls each). From now on:
- **Lead = Opus 5.5** (the main session). Splits the work, writes briefs, reviews shots,
  commits, pushes, keeps the guides. Does not draw whole figures or halls itself.
- **Artists = Sonnet 5.5**: always spawn them as `subagent_type: "artist"`
  (`.claude/agents/artist.md`, `model: sonnet`), never as general-purpose agents (those
  inherit the lead's model; a session started before the profile existed can't see it yet:
  pass `model: "sonnet"` on the Agent call instead). One piece of art each, a tool-call budget in every brief.
- **Advisor = Fable 5.2**: `subagent_type: "advisor"` (`.claude/agents/advisor.md`,
  read-only), asked ONE specific hard question (a design that failed review twice, an engine
  decision), then done. Never in the daily loop, never drawing.
- Briefs live in the repo: `art/briefs/hall-artist.md` (the shared hall brief) plus
  `art/briefs/halls/<kind>.md` (each hall's specifics). Reuse and extend them instead of
  rewriting long prompts; a new kind of job gets its own shared brief there.
- Cheap looks: render scripts (`hall-render.mjs`, `concept-render.mjs`) cropped, at most two
  look-fix passes, the browser once at the end. The lead checks shots before the owner sees
  them; only finished work goes to the owner.
- Fewer leads: one Opus lead per area at a time; archive finished lead sessions.
- **The concept loop that works** (owner, 2026-11-24, after the Dragonbreath rounds 14-17: "this work flow is so good,
  mark this down for the future. We are getting good quality results fast"): (1) get the owner's REFERENCE picture
  (`art/briefs/ref/`) and brief what to copy plus every look already turned down; (2) a WIDE round: the lead writes a
  shared cell kit (`concept/fx-r14-kit.js`), one file per option, one artist per file in parallel (the owner may name
  the models: two Opus + one Fable won with an Opus option); (3) NARROWING rounds: the owner picks one and names a small
  change; copy the pick into 2-3 files, the page's first strip is the pick as the owner saw it, each variation turns
  one clear dial, and the SAME artist is resumed with SendMessage (~20-30 calls a round); (4) the lead checks a
  side-by-side sheet (ffmpeg hstack of crops) before each publish, one private Artifact page per round. Offering
  all-new constructions (rounds 9-13) failed; from the reference on, each round converged in minutes.
- **Studio rules from the views pass** (2026-11-18, the advisor's study of every owner note,
  art/briefs/views-notes-log.md): every artist follows the standing rules now in
  `.claude/agents/artist.md` (hide by drawing never deleting; one pose read from the approved
  drawing; every frame and variant, whole figure, zoom 1 too; "NOT CHECKED" / "BLOCKED", never a
  shrugged weak spot; fix the same fault everywhere; stay inside the repo). The views brief ends
  with a mandatory "Before you report" self-check. The lead's review: never ship a weak spot
  silently (fix, send back, or ask the owner); look at the board-size strip first; classify each
  owner note and turn it into a rule for all figures before the next preview; if a fault class
  returns twice, stop and get a diagnosis; preview in small batches after a pilot figure.
  scripts/views-render.mjs now shows the whole BOX and all frames by default (it used to crop at
  the waist). **The views checker is built** (2026-11-18, owner: "Yes, build them"):
  `node scripts/views-check.mjs [only=]` bakes every views figure (side / FRONT / BACK, every frame, its
  variant) recording which drawing call owns each pixel (scripts/lib/views-cases.mjs) and FAILs: islands
  (loose pieces, feet off legs), ground (floating), box (cut off at the BOX edge), legend (stamp letters
  with no legend), face (a pauldron / shield / haft over the FRONT face), spine and stack (BACK arms
  across the back or drawn over the head's depth: the old side stack). warn: a colour the side shows that
  neither view ever does (a dropped weapon). Exit 1 on any FAIL. Run on the commit before the BACK-stack
  rebuild (`CG_ROOT=<a copy of an old src>`) it fails 41 figures, every one the owner flagged; today it
  fails 4 (rafter's spear and the thrall's axe over the face, the frost giant's pauldron in one frame, the
  necromancer's hood tip loose from behind). Owner-chosen exceptions live in its `ACCEPTED` table, never
  per-figure thresholds. `node scripts/views-sheet.mjs [only=] [fails=1]` is the contact sheet
  (.shots/views-sheet/: board size first, failing frames boxed red). Artists run both before reporting.
  Not checked by machine: weapon in the fist and matching the side pose (needs tags), looks.

## Default way of working: a team of parallel agents

The owner likes seeing many pieces worked on at once, so for any job with
more than one independent part (several towers, creatures, screens, a
balance question alongside art), split it up and run background agents in
parallel instead of doing the parts one by one. This is the default.

How it went well (September 2026 overhaul — up to seven artists at once):
- **Split by file ownership.** Each agent owns specific files (e.g. one per
  group of halls in `src/render/halls/`, one for `rigs-horde.js`, one for
  `castle.js`) and edits nothing else; shared files (`buildkit.js`,
  `folk.js`, `draw.js`) get exactly one owner, and others only read them or
  make tiny, reported edits.
- **One brief for all:** point every agent at `art/STYLE-GUIDE.md` (and this
  file) instead of re-writing the rules; add only the task, the owned files,
  and a shot-name prefix.
- **In a cloud session** (no browser pane) agents look at their work with
  `node scripts/shoot.mjs` against the shared dev server (see the style
  guide, "How to look at your work"); the lead keeps it running.
- **Rules for agents:** open their OWN browser tab (tabs_create) and close
  it when done; never resize the window or touch others' tabs; never launch
  Chrome or apps from a shell; never run git commands that change anything;
  take before/after shots in `.shots/` with their prefix; do 2–3 look-fix
  passes; finish with a short report and shot paths. Give each a rough
  tool-call budget when usage is tight.
- **The lead** (the main session) keeps working meanwhile — balance, sims,
  engine fixes — then reviews each agent's shots as it reports, commits its
  files with a clear message, and publishes. Send follow-ups to a finished
  agent (SendMessage) rather than starting a fresh one; it keeps context.
- **Split new work into independent files first** (e.g. a new
  `rigs-<group>.js` hooked into `rigs.js`) so agents never collide.

How the September 26 graphics pass ran (water, bridges, road, turf, coast,
gate, scenery, Iron and Fen grounds, apron — ten artists):
- The lead split the work into files FIRST (water.js, bridge.js, road.js,
  coast.js out of scenery.js/world.js, pixel-identical), committed that, then
  gave each artist one file. Each area went build → adversarial art-director
  review → polish, as a Workflow.
- **A cloud container has 4 CPUs, so one workflow runs only 2 agents at a
  time;** run two or three workflows side by side (each owning different
  files) to get 4-6 artists.
- **The usage limit can cut agents off mid-edit** (it did twice in the
  September 29 pass; the WIP commits saved all of it). Commit a WIP snapshot
  (build passing) whenever a team finishes, and before a long wait. After an
  interruption, brief the next round against the PRE-PASS commit
  (`git diff <base> -- <file>`), not HEAD, and hand agents the old reports as
  files to read rather than pasting them into the workflow's args.
- Agents' requests for files they don't own (engine, draw.js,
  atmosphere.js, the game component) are the lead's to do between rounds.
- A page reload from a teammate's save breaks a batch of `snap`s ("Failed to
  fetch"); shoot one board per call with a retry when artists are working.
- In `shots.html`, a marcher may carry a 4th element merged into the foe
  (`['unseated', 0.5, 0, { dropAt: 7150 }]`). Crop with board coordinates
  read off a full-board snap: a lab script's own `import()` of path.js can
  be a different module instance from the page's.

What the September 29 pass added (crews, soldiers and foes, halls, type, the
title ground, the River Watch's reach, the Powder Works):
- **The game's type is Tidy HUD · Pixel Sans** (`tidy3`, the owner's pick):
  `DEFAULT_TYPE` in `src/ui/fonts.js`, whose preloads sit in index.html
  (style guide, "Type (HUD)"). Shots of the game show it unless `?type=`
  says otherwise.
- **Scratch files go in `scratchpad/<prefix>/`,** never the scratchpad's
  root: artists overwrote each other's `grid.py` there.
- **Vite ignores `.shots/`** (`server.watch.ignored`), so a lab page or
  module edited there is never re-served — the dev server keeps its first
  transformed copy. Use a new file name per version, or keep scratch labs
  outside `.shots/`.
- **`node --check` a module after every scripted edit:** one syntax error
  makes the dev server answer 500 for that file, and every page that loads
  it breaks, teammates' included.
- **Committing only your own hunks** of a file another session is also
  changing (the lead's job; agents never run git that changes anything):
  write HEAD's version plus your hunks to a scratch copy, then
  `git update-index --cacheinfo 100644,$(git hash-object -w <copy>),<path>`
  and commit. The index takes just your hunks; the working tree keeps both
  sessions' work.

## Joints and motion (September 28 pass)

The owner saw "broken arms when casting or attacking" and stiff, two-frame
animation. The rules are in `art/STYLE-GUIDE.md` "Joints and motion"; the
mechanics:
- Crews are built from `src/render/folk-kit.js`: `arm()` solves the elbow
  with fixed bones and the natural fold (`flip` only for an arm raised out
  to the side — a bow draw, a cocked throw), `legs(..., { hip })` shifts
  the weight, and `keyed` / `arcMix` / `frameOf` make eased in-betweens.
  The old `bend` option is gone. `limb2` makes a two-bone limb ONE inked
  part (the rigs do the same), and `hat(ctx, x, y, kind, pal, o)` puts a
  trade's headwear on a bare head (style guide: "Limbs and layers",
  "Crews' headwear"). Figures live in `folk-archer.js`,
  `folk-casters.js`, `folk-workers.js`, `folk-gunners.js`; `folk.js`
  re-exports them and keeps the build crew.
- `joint-lab.html?set=<set>` measures every pose (sets in `joint-sets/`;
  the rig files log their arms and legs too) — nothing ships red.
  `hallstrip.html` shows a hall frame by frame through a firing cycle;
  `shotlab.html` runs the real engine on one hall and snaps it in motion.
- Every shot starts at its weapon: `src/engine/muzzles.js` (the bow hand,
  the muzzle, the staff head, the throwing hand), fed by the figures' own
  pose functions. The Falconry's damage lands when the bird's talons do
  (`resolveStrikes`, STOOP_HIT ms after the cast), not at the cast.
- Fight frames come from the attack clock, not a free-running timer
  (`src/render/enemies.js`): soldiers and blades from `u.atkCd`/`u.swing`
  (`fightFrame`), foes from `e.meleeCd`/`e.atkAnim`. A rig with four fight
  frames (guard, wind-up, strike, follow-through) says so — `fightN: 4` on
  its RIGS entry, or `CROWN_FIGHT_FRAMES` in rigs-crown.js.

## The Aegis Magister hangs back (2026-11-08, owner request)

Provisional, pending the owner's playtest. Health 200 -> 300, and he stands
off your soldiers like the archers, only nearer: `standOff: 50` (enemies.js;
the necromancer's standOff code in update.js, same `pauseLeft` budget, 30 s;
archers halt at 98-100 since the same day, the necromancer at 100). At 50 the foes his column
sends into your knights still stand inside his 80 ward ring, so he keeps
shielding them while out of their reach. He still strikes back (`atk` 12) if
a soldier walks out to him. Measured `--chapter iron --endure`, seeds 1-2,
better doctrine per level: chapter total 8079 / 8237 -> 8473 / 7623 castle
damage (noise; per level the seeds disagree, e.g. ir5 975 -> 1209 on seed 1,
1229 -> 956 on seed 2). All 15 held. The sims never single him out.
Later the same day (owner) his aegis went to every 3 s (`wardEvery` 3000,
was 8000) but lays ONE shield a cast (`wardStep` 1, enemy field read in
update.js's ward loop) on everyone within 80, up to `wardHits` 3; before,
each cast refilled all three. A warder without `wardStep` still refills.
Himself he refills to all three every cast (owner, same day).
The ring and the ward sound play every cast. The Field Guide's row reads
"+1 shield every 3.0s, up to 3". Measured `--chapter iron --endure` seed 1,
better doctrine, against the gryphon change: 8447 -> 9272 (+10%; Crowstair
511 -> 852, Warden Moor 1108 -> 1302, the first levels and the Citadel flat;
all 15 held, none stuck). Provisional ("may need tweaking").
And he **follows his column** (owner, same day: he hung back at the first
knights while most of his column walked past them, unshielded):
`followColumn: true` (enemies.js) lets `columnGone` (update.js) override his
stand-off. It counts his foot troops within `COLUMN_SPAN` 260 of road: free
ones (not held, `blockedBy` null) more than `COLUMN_PAST` 40 ahead of him
against everyone else (behind, beside, or held in a fight his ring already
reaches); when the free ones ahead are the greater part, he walks on after
them, past the fight (a free knight may still seize him). Checked headless
(one knight that holds one levy, 14 levies): old rule kept 1-3 of 14 in his
ward while 13 walked past, new rule ~9 of 14; with six knights holding all
six levies he still stands off 63 back with all six in his ward. Iron
`--endure` seed 1, better doctrine: 9272 -> 9424 (Blackcliff 1399 -> 1535,
the rest within ~10; all 15 held, none stuck).
He also **waits for his column** (owner, same day: "one just charged ahead
even when there was a huge group of soldiers behind him"): `columnBehind`
(update.js) holds him while at least three of his column, and more than
are with him, are over `COLUMN_LAG` 60 behind him (a `waiting` flag in the
movement, budget `COLUMN_WAIT_MS` 20 s a foe). His column (`inColumn`) is
the foot rank and file: no archers, healers/captains (`packRange`), rams,
fliers or monsters. Headless: spawned 100-250 ahead of 12 levies, he
settles ~60 ahead of their middle with 6-10 in his ward (was ~150-190
ahead, 0-2 in it).

**The Siege Ram gives** (owner, same day: "it was tanking the whole wave"):
`mres` -0.5 (magic hits it x1.5; a negative mres reads "Weak to magic +50%"
in the Field Guide and the enemy tooltip), `trapBane` 1.5 (a trap's blow on
it pierces its 0.6 armor and is x1.5, update.js trap loop: a level-3 spike
98 -> 147, was 39), and `castleDmg` 4 -> 5. Checked headless. Iron
`--endure` seed 1: 9424 -> 9396 (flat: the sim's commander seldom lays traps
under a ram, and rams seldom leak). The owner finds the trap bite "a bit
high" and is testing it; levers: `trapBane` 1 (pierce only, 98) or drop the
pierce in the trap loop (x1.5 on top of armor, ~59).
Later the same day (owner) its health went 2300 -> 1500 and its speed
46 -> 38 (the column walks in its lee at that pace; at 30 it once arrived
in one lump and doubled the Iron back half's bleed). `--level crowstair /
ir5 --endure --check-wall` seed 1, better doctrine: 858 -> 750 and 1478 ->
1569 (flat; 0 passes of a live ram, up to 116 / 154 foes in its lee).
Then (owner, same day) health back up 1500 -> 2000 (speed stays 38): the
same check, seed 1, better doctrine: Crowstair 750 -> 754, the Citadel Gate
1569 -> 1926; 0 passes of a live ram.
Its **crush no longer kills outright** (owner, same day): `crushDmg` 175
(enemies.js) tramples the man who steps in front of it (runMelee in
update.js; no `crushDmg` = the old kill), releases him, throws him 14 off
its path and downs him `RAM_KNOCK_MS` 1500 (`u.downUntil`); a survivor then
hacks at its FLANK as it rolls past (`u.flankOf`, never blocking it, his
own blows) and is not trampled by that ram again for `RAM_RETRAMPLE_MS`
4000. 175 kills Garrison L1-2, every militia and the Levy's farmers and
archers; Garrison L3 / Errant / Lancer / Levy knights live on 25-55;
Paladins, the Champion and the gate halberdiers shrug it off. Headless: L3
knights 200 -> 25, down 1.5 s, then 56 into its flank; L1 still dies.
Then (owner, same day) it tramples **heroes and every reinforcement** too:
`rollOver` (update.js, run for each live `crush` foe right after the ram-wall
pass) tramples any unit of any band (garrisons, heroes, retinue, militia,
Hale's levy; not skiffs, not a band `leaving`) within `RAM_REACH` 18 of it,
whether or not he was fighting it, with the same `trample` (175, knocked
aside, downed, the re-trample grace), and a ranged unit downed by it stops
shooting for the 1.5 s. Heroes no longer keep clear of a ram: a melee hero
fights it like a knight (hacks its flank after the trample). Headless: every
hero lost 175 and went down, Wren at 100 hp died; Aldric's squires, Hale's
watchmen and crossbows hit; plain militia (95) die. `--level crowstair
--endure --check-wall` seed 1, better doctrine 754 -> 721, 0 passes.

The same day the foe archers' bolts went up twice by 25% (owner: they "had
almost no effect"): Crossbowman `rangedAtk` 12 -> 15 -> 18.75, Barrow Archer
10 -> 12.5 -> 15.6. And regen's rest rate now waits for `HURT_REST_MS` 5000
without harm (bands.js; `resting` / `mended` in update.js, for a Knight
Hall's men and the hero): before, a man not in a sword fight mended at the
rest rate (2.5%, hero 3%) while archers shot him, so a lone crossbowman took
56 s to kill a level-3 Garrison knight and never killed a Paladin. Any drop
in health since the last tick counts as harm. Paladins' flat `heal` and the
Lifebinder are untouched (a lone archer still never fells a Paladin).
Measured `--chapter iron --endure` seeds 1-2, better doctrine, against the
magister change alone: 8473 / 7623 -> 7801 / 7638 (noise; all 15 held). The
sims' castle damage barely sees a knight's health. Provisional.
Then (same day, owner: archers "still just don't feel threatening") their
reach went up ~22%: Crossbowman `rangedRange` 82 -> 100, Barrow Archer 80 ->
98. It is also how far back they halt from your soldiers, so they now stand
well clear of every hall's seizing reach (range x 0.92 round the rally flag:
48-59) except the Lancer Order's (90). Not simmed. And an archer may now
stand and shoot for 30 s before it marches on (`STAND_MS`, update.js; was
14 s), and so may the necromancer and magister (same budget, same day).
Then (same day, owner: archers "showing up after the soldiers have been
killed, so towers just snap to them") archers got +25% health (Crossbowman
72 -> 90, Barrow Archer 66 -> 83) and march INSIDE the column:
`archersAmid` (waves.js, applied last in both `waveSpec` chains) marks every
`rangedAtk` group `amid` the wave's biggest foot group of rank and file (no
riders, fliers, rams, bosses, other escorts); startWave spreads them from
40% of that group's span to its end (`ARCHER_SPREAD`, actions.js), never
closer than `ARCHER_GAP` 350 ms, so a big company runs a little past the
column's tail. A wave with no such column keeps its archers as written.
Measured `--endure` seed 1, better doctrine, against the commit before it:
Iron 8140 -> 8281, Hollow 481 -> 505 castle damage (noise; all 30 held, none
stuck). Provisional, pending the owner's playtest.

**Cavaliers lose their horse, not always their knight** (owner, 2026-11-08):
cavalier hp 120 -> 180, armor 0.1 -> 0.2 (the horse's barding; arrows still
bite). `splitInto: ["unhorsed", 1]`, `splitDrop`, `splitChance` 0.5 (the
boar rider's machinery): half the time the knight rolls clear where the horse
fell, dazed 650 ms, and fights on as an **Unhorsed Knight** (`unhorsed`: 110
hp, armor 0.5, speed 62, 24 a blow, bounty 7); the horse crumbles alone in
`cavalierMount` (the destrier painter with `p.riderless`: no rider, no
reins, rigs-ironmounts.js). His figure is the unseated knight's (`look:
"unseated"`, rigs-iron.js) in the cavalier's caparison red. Checked
headless: 516 of 1000 killed cavaliers rolled clear. Measured `--chapter
iron --endure` seed 1, better doctrine: 8281 -> 9308 castle damage (+12%;
the back half: Blackcliff 1111 -> 1501, ir5 1249 -> 1633), all 15 held,
none stuck. Provisional, pending the owner's playtest.
The same day the **Gryphon Knight** got the same coin flip: `splitChance` 0.5
(its knight used to survive every fall; a dead rider crumbles with the
gryphon whole, the `deathSkin` only plays when he rolls clear), armor 0.2 ->
0.3. A fallen rider is dazed `dropStun` ms (enemy field, default 650; 1000
for the gryphon's and the cavalier's knights, the boar and wolf riders keep
650). Checked headless: 505 of 1000 gryphons dropped a knight. Measured
`--chapter iron --endure` seed 1, better doctrine, against the cavalier change:
9308 -> 8447 (fewer knights walk on than before; all 15 held, none stuck).
Later the same day the cavalier's horse got the ram's trap weakness too
(`trapBane` 1.5: a trap's blow pierces its 0.2 armor and is x1.5, so a
level-3 spike 78 -> 147; checked headless). A 180-hp horse dies to two
level-3 spikes. Then (owner: "all mounted units like that") the Boar Rider
and the Wolf-Rider too (`trapBane` 1.5, armor 0.1: a level-3 spike 88 ->
147). Not the Gryphon Knight (it flies: only the Aerostat's balloons reach
it) nor the Rime Jarl's mammoth (a boss). Not simmed.

## Necromancers don't drag a wave out (2026-11-17, owner request)

"Frequent jam ups at the ends of rounds where they stay back and just resurrect everything on the
board a little at a time." The owner picked two fixes, held a third ("maybe 5", a raise reach again)
until they have played these. Provisional.
- **A stand-off foe walks on once his column is gone:** `columnSpent` (update.js) is true when no
  living rank and file (`inColumn`, not `revived`) is within `COLUMN_SPAN` 260 of road of him; then a
  `standOff` foe (necromancer, magister, gravecaller) stops hanging back and marches into your line.
  Mid-wave nothing changes. Archers instead stand at most `ARCHER_STAND_MS` 15 s (owner, same day;
  `STAND_MS` 30 s stays for the stand-off foes; Iron / Hollow `--endure` seeds 1-2 flat: 10718 / 10735,
  11363 / 12320). Archers do not get the walk-on rule: giving them the same rule made Iron / Hollow ~12%
  harder (seeds 1-2), and letting them walk on mid-wave too (the magister's `columnGone`) +17% / +39%.
- **His risen fall with him:** a raise stamps `u.raisedBy` with the necromancer's id; when he dies
  (dealDamage, actions.js) each one still standing (or climbing out) crumbles, no bounty
  (`g.risenFell` counts them: 44-66 a Goblin Warrens run).
- Measured `--endure`, seeds 1-2: the Goblin Warrens' swarm doctrine played ~3% faster in all
  (necromancer waves 10-30 s shorter, e.g. wave 5 77 -> 49 s), castle damage flat (526 / 614 ->
  576 / 526); Iron flat (better doctrine 10812 / 10755 -> 10326 / 10777); Hollow 10936 / 12185 ->
  12229 / 12551 (the gravecaller walks on too; mixed). None stuck.
- **He walks; soldiers fight the dead first** (owner, 2026-11-27, provisional): no `standOff` on the
  necromancer now; he raises the NEAREST of the wave's dead within `NECRO_REACH` 250 steps ALONG THE ROAD of him,
  ahead or behind (update.js, `c.dist - e.dist`; was the newest, whole board). In runMelee
  every band but the hero takes a free risen (`freeRisen`) before any other foe, and a man holding a necromancer
  lets him go for one, so he slips past behind his dead. `necro-reach-lab.html` draws the reach on a board.
  gw5 `--endure` seed default: at 250, swarm 762 -> 960, burst 610 -> 794 (one run each; at 200 it was 864 / 561).
- **Spread through the wave** (owner, same day: "3 spawn at the very end of a wave ... more mixed in", one at
  the end is fine): `raisersLast` (waves.js) merges a wave's necromancers into one group `clock: -2`, and
  startWave spreads it over the road queue (`raiserAt`, actions.js: one at 60%, two at 35% / 80%, three+ evenly
  from 30% to the end, `RAISER_SPREAD`); `packRange` 110 keeps him at his troops' pace. Most come out with 50-65
  foes within 3 s of them. Goblin Shaman hp 132 -> 165. `--endure` seed default, before today -> now: gw5 swarm
  762 -> 1036, burst 610 -> 943; Cinderholt 586 / 371 -> 621 / 445.

## Halls stand by the shape of their base (2026-11-18, owner request)

"Smaller bases can be built in smaller places, bigger bases take up more space." Before, every
hall kept one 15-unit circle (30 between any two, 48 from the road's centre). Now each hall has
a FOOTING, an ellipse measured from its art (`scripts/hall-footprints.mjs` -> `src/data/hallfoot.js`,
read by `src/engine/footing.js`; rerun the script after changing a hall's ground-level art). The
owner's calls: room for the hall's WIDEST form, so an upgrade never collides; the true shape side
by side even where big halls now need more room than before; a little room front to back
(`TOP_K` 0.5). Two Archer halls: 34 apart side by side (was 30), 25 front to back (was 30); a
Covert / Knight / Gold Works needs more, a Bladewheel less. The road, rivers, sea, ponds (now an
ellipse, not a box) and scenery test the footing too. A tap picks the NEAREST hall within 30
(`towerNear`). The Covert's blades wait clear of neighbours' footings. `roadClear` now only picks
the narrow ground art; `reach` is gone. Greedy packing, old -> new halls on a board: Bladewheel
~350 -> ~390, Archer ~205 -> ~240, Knight ~205 -> ~175. `sim.mjs` now places by kind; `--endure`
seed 1, better doctrine, old -> new: Greenwood 3480 -> 3594, Iron 10885 -> 10585 (noise; all held).
Pending the owner's playtest.

## Idle soldiers gang up (2026-11-08, owner request)

"If there's idle knights during a battle, allow them to gang up ... Same for
militia too." `runMelee` (update.js), so every melee band: Knight Halls, the
militia and the Levy's swordsmen, the hero, retinue, Hale's watchmen. Still
ONE holder a foe (`blockedBy`); a man with no FREE foe in his circle (range x
0.92 round his post) now joins a comrade's fight on a HELD foe in it (held by
any of ours: a knight, the hero, a militiaman, a bowman a foe caught), the
one with the most health first, and keeps it while it lives. He holds
nothing: the foe strikes back only at its holder (its `meleeCd` runs only
for the holder), a cavalier's charge spends itself only on the holder, and
the leash never releases a foe he does not hold. He stands at a side of his
own (12 x 8 off the foe, by his place in the hall), and leaves for a free
foe the moment one comes in reach; if the holder falls, the joiner takes the
hold. Never a ram (`crush`), a flier or a swimmer. Headless (`x3` health):
a level-3 Garrison on one troll killed it in ~21 s, 3 men on it (before: one
man, alive after 60 s, its regen outpacing him); two trolls 28 s; six levies
9.4 -> 8.6 s; tier-0 militia on an orc (x1) killed it in 6 s (before, it
walked through them). `--endure` seed 1, better doctrine: Iron 8900 -> 9245,
Greenwood 871 -> 896 (noise: the sims' castle damage barely sees the
knights); all 30 held, none stuck. Provisional, pending the owner's playtest.

## The Covert reworked (2026-11-09, owner request)

(2026-11-22, owner: the Covert keeps no light and no idle people: no lamp post, no night light, no hood in
the doorway or lookout out front; only the working blades, drawn with the bands.)

"Make the assassin class a bit better." Provisional, pending the owner's playtest.
- **No rally flag:** the reach is a ring round the TENT (`pickPrey` centres on
  `t.x/t.y`; the blades drop a mark once it is past `range` + half its body
  from the tent, so they cut for as long as it is in reach) and idle blades
  wait beside it OFF the road (owner, same day): `coverSlots` (engine/towers.js)
  tries spots round the tent, front first, then the sides, then behind, at
  22 / 30 / 38 out, keeping each clear of the road's centre line by
  `PATH_HALF` + 4 and 13 from the others (cached per tent; `unitSlots` uses
  it, `coverMuster` is its first spot, and the loop pulls an old save's flag
  home every tick). Headless, 31 tents by the road on five boards: no idle
  blade nearer the centre line than 36, 52 of 62 in front of their tent. The "Move Rally Flag"
  plank and the tap-to-move are gone for it (`ASSASSIN_RALLY_RANGE` and
  postRally's branch are dead code now). Range x1.25 on all nine steps
  (72-92 -> 90-115), and attack speed +25% (`rate` x0.8: 2000-1500 ->
  1600-1200 ms, owner, same day). Then damage and attack speed +15% more
  (owner, same day: two level-2 blades couldn't kill a Magister before he
  left their reach): `dmg` x1.15 (46-150 -> 53-172), `rate` /1.15 (1600-1200
  -> 1391-1043 ms). Headless, a Magister walking past one Covert (he is in
  its reach ~2.5-4 s; x = his wave health): level 2 kills him at x1 only
  (300 hp), level 3 at up to x3 (900 hp, was x1.5).
- **They hunt past their reach, each on his own order** (owner, same day):
  a blade takes a NEW mark only within the tent's range, but keeps after it
  until it is `COVER_CHASE` 2 x the range from the tent (engine/towers.js;
  was range + half its body). Each blade may hold his own order (`u.aim`,
  null = the hall's; `pickPrey` / `orderFilter` take an `aim`), with the
  same All / 1 / 2 / 3 row in the targets list as the skiffs and falcons
  (`crewOf` / `CREW_NAME` in CrownguardGame.jsx). A bought blade steps out at
  once (actions.js syncs a Covert's units on every upgrade; before, the new
  one came at the next horn). Headless, the Magister test again: level 2
  now kills him up to x2 (600 hp), level 3 at x3; two blades told Healers and
  Support took the chaplain and the magister walking side by side.
- **Blades slip under shields:** `dealDamage`'s 9th argument `slips` skips
  the blue-pip block (no pip spent, the cut lands whole); the Covert's cuts
  pass it, and so do its venom ticks (the poison tick checks
  `poisonSrc`'s kind). Headless: a 3-pip chaplain took 4 cuts and kept all
  3 pips.
- **Nothing stops for a blade:** crossbowmen / barrow archers take a blade
  as their mark ONLY while it is ON the road (`PATH_HALF` of the centre
  line) and fighting (owner, same day: "only if they are on the road engaged
  and fighting something"); then they halt and shoot it as any soldier.
  Headless: three crossbowmen killed two level-3 blades cutting a chaplain
  in ~6 s, and never aimed at blades idling by the tent. StandOff
  foes (necromancer, magister) never hang back from one, wraiths never claw
  one, and a ram's `rollOver` never tramples one (they cut from the side).
  Before the rework the archers shot a blade anywhere in reach.
- **The Battle Chaplain is prey:** `isPrey` and the Healers order read
  `healPct` too (the chaplain heals by `healPct`, so he was never on the
  Covert's contract before).
- **One class a foe, four orders** (owner, same day: "take armor off of the
  options. Enemies should only get one category. Magister goes to
  support"): `coverClass(e)` (engine/towers.js) puts each support foe in ONE
  class, in this order: heals -> Healers (Goblin Shaman, Battle Chaplain);
  raises or summons -> Raisers (Necromancer, Gravecaller, the Hollow King,
  and the Hobgoblin Warchief, whose horn calls goblins though he also bears a
  banner); wards, frost, a banner or war-chant -> Support (Aegis Magister,
  Rime Seer, the Rime Jarl, Lord Marshal, Skald); shoots -> Ranged. Support is
  its own class now, not every support foe. The Armor order (`brute`) is
  gone; a save that held it falls back to Support. `isPrey` (the blades'
  `preyMult` and the other prey reads) is still every support foe.
  Then (owner, same day) **Banners folded into Support** (Lord Marshal,
  Skald) and a **Ranged** order took its place: foes with `rangedAtk`
  (Crossbowman, Barrow Archer). A saved "banner" falls back to Support.
  Ranged foes are not `isPrey`, so the blades cut them at plain damage (no
  `preyMult`). Headless: a blade on Ranged took a crossbowman, its sister on
  Support the magister beside it.
- **The (i) beside each order** (TargetsBar `explain`, only the Covert): says
  what the order hunts and lists examples READ from the roster through
  `PREY_FILTERS` (`ui/coverOrders.js`, fliers / swimmers / neutrals left
  out, bosses' capitals turned to names), so a retuned foe lists itself. On a
  short screen the orders go one a row when they carry an (i), and the note
  scrolls into view. Checked in headless Chromium at 1180x820 and 844x390.
- `marathon.mjs --to 40` (every hall): no engine errors. `--chapter iron
  --endure` seed 1, better doctrine: 9245 -> 9131 (the sims seldom field a
  Covert); all 15 held, none stuck.

## The King's Band, a 14th hall (2026-11-18, owner request)

"A kings marching band ... a tower that buffs other towers." Designed by Fable, then the owner's calls
(`art/briefs/kings-band.md` has the tree, the rules and the answers). Provisional, pending the owner's
playtest. It never fights. `engine/band.js` (the rules, `tuned(st, t)`), `engine/bandplay.js` (`layBands`,
run first in every updateGame tick, lays `t.tune` on the halls each band plays for; `bandSoldiers` after the
Warden loop). The tune goes on in `getStatsClear` after the skill trees and before the weather, so the
tray, range rings, upgrade previews and sims all read buffed numbers; two bands never add up (max per stat);
a band never plays for a band; a frozen / struck band plays nothing; weather never shrinks its earshot.
- tempo (every clock key / (1 + t)), might (damage, payout, mending), reach (range keys under 900; not a
  knight's seizing circle), swell (blast keys). Levels: tempo 10 / 14 / 18%. Drum Corps (path a) plays for
  EVERY hall in earshot; Royal Tattoo + soldiers `atkBuff` 0.2; Thunder Drums + swell 15% and a 3 s roll at
  +50% every 12 s (`t.rollUntil`). King's Heralds (path b) play for `picks` halls the player TAPS (owner):
  the tray's "Choose 2 Halls" / "Choose the Hall" arms `g.rallyFor = band.id`, a tapped hall in earshot joins
  `t.solo` (newest pushes out the oldest); empty places take the nearest. Royal Fanfare: one hall, +45%
  might; War Horn: every 15 s foes within 110 slowed 40% 2 s (bosses not) and marked +20% 4 s (`t.hornAt`).
- **Watch list** (owner: "dont leave out those towers ... mark them but include them for now"): the Gold
  Works (payout), Trapsmith, Warden Mage and Log Roller ARE tuned: `BAND_WATCH` in band.js.
- Learned on the Stillmere (level 35); XP: the Warden's quarter share of kills by halls it plays for.
- Look: the bandstand (`pix/hall-band.js`, `halls/band.js`, Sonnet artists) with `fig-drummer.js` (drum,
  bass, kettle, major) and `fig-herald.js` (fife, trumpet, horn), all on one 1200 ms clock (`BEAT_MS` 600).
  Every tuned hall puffs a note on the beat (`render/bandnotes.js`; gold drums, crimson heralds); selecting a
  band rings the feet of its halls; a tuned hall's banner name ends in a note. Mute (owner: no band sound).
- `bench-hall.mjs --band 3,a,b` stands a band beside the benched hall (and the bench now sets `freeplay`).
  Measured (x3 hp, crowd, seeds 2): an L3 Archer 66 -> ~79 dps with a Full Company or Drum Corps, ~107 with
  a Royal Fanfare; Earthshaker 173 -> 311 with Thunder Drums. Not simmed: the sim commander never builds one.
- Weak spots to show the owner: players crowd each other on the busiest stands; the War Horn has one player.

## Falcons hunt one by one (2026-11-09, owner request)

Provisional, pending the owner's playtest. `flyFalcons` (update.js, before
the generic tower fire; the Skyknight keeps its old path):
- **A bird a level:** `falconCount` (muzzles.js) is 1 / 2 / 3, and every path
  and final keeps three (the Skyknight's hall still shows two). Level 3 is
  labelled "Third Falcon" (was Master Falconer).
- **Each bird hunts alone:** `t.birds` (`syncBirds`, muzzles.js) holds each
  bird's own clock, order (`aim`, null = the hall's) and prey. The tray's
  targets list gains an All / 1 / 2 / 3 row as the River Watch's skiffs do
  (`crewOf` in CrownguardGame.jsx: a skiff's or a bird's `aim`; TargetsBar
  `crewName`). A bird passes over a foe a sister already hunts while it has
  another choice.
- **A bird chases its own prey anywhere:** a bird takes a NEW prey only
  within the hall's range (since 2026-11-09, owner: "Falconry seems to have
  unlimited range"; at first any marked foe anywhere was fair game, so
  Kingsight's board-wide mark and other halls' marks pulled the birds across
  the map), and goes back to the foe it last struck, anywhere on the board,
  until that foe is dead (`bird.preyId`). A far stoop lands later (up to x3
  `STOOP_HIT`). Headless: a levy struck twice in range was struck 4 more
  times out to 388 away; a levy marked far off and never in range, 0.
- **The flock strikes as often as the hall did:** a bird's clock is `rate` x
  birds / `shots` (Talon Rain's 3 strikes a cast became its 3 birds' clocks),
  so the hall's numbers on the card still read true. The falconer's cast pose
  follows bird 0 (`t.castRate`). Measured (one hall by the road, 40 sturdy
  levies, 40 s, old -> new damage): L1 215 -> 225, L2 340 -> 393, L3 656 ->
  725, Royal Aviary 1173 -> 1218, Warhawk Court 611 -> 682, Storm Falcons
  2129 -> 2368, Talon Rain 1458 -> 2030, Kingsight 1401 -> 1662 (measured while
  marked foes anywhere were fair game). Talon Rain's text now says it
  dives three times as often; a Falconry's `shots` row reads "Dives".

## The Hollowfen bites (2026-11-09, owner request)

"Hallowfen was way too easy for my first level there." Provisional, pending
the owner's playtest. The sims agreed: the whole chapter bled ~500-600
castle damage (`--chapter hollow --endure`, seeds 1-2, better doctrine), the
Grave Road 6-7, all in its first two waves; the Iron Marches bleed ~8000-9000.
- **Risen get back up** (owner's pick): felled by a PHYSICAL blow (arrows,
  stones, plain steel, traps) a Risen pulls its bones together where it fell
  `reformMs` 2000 later at `reassemble` 0.5 of its health and half its
  bounty, once (enemies.js; `dealDamage` marks `e.reforms`, update.js's death
  loop raises it with the necromancer's rising: untouchable while it climbs,
  then `revived`, bone-pale). Magic, fire and holy (Paladin) blows put it down
  for good. Its magic resistance stayed 0.4 (owner), then 0.25 (owner, 2026-11-20). The Gravecaller's and
  Hollow King's conjured Risen reassemble too. `sim.mjs` prints `reformed`
  (~800-1800 a Grave Road run). Field Guide row "On death".
- **Tougher chaff:** Risen hp 44 -> 60, Ghoul 72 -> 95.
- **The Grave Road** (hl1) window 1-12 -> 2-13 (gold 400, push 2.0 kept).
  Less gold or more `push` only loaded its first waves; grave mist did nothing.
- Measured, seeds 1/2: chapter 490 / 604 -> 3941 / 3871, all 15 held, none
  stuck (the swarm doctrine bleeds 300-800 on most levels now, the burst one
  100-470; the Dead Weir 451 / 746 is the worst). The Grave Road 6-7 ->
  132-156, still the chapter's gentlest (Saltgrave ~350). Reassembly alone
  moved the Grave Road only 7 -> ~15: the sim's halls are mostly wizards,
  catapults and Paladins. Levers: `reassemble` / `reformMs`, the two hp
  figures, hl1's `window`.
- **The flood** (owner, 2026-11-10: "this should be the flood of enemies
  chapter"): Risen 60 -> 75 (back to 60 the same day, owner: "too far with
  the buffs on the skeletons"), Ghoul 95 -> 115, the Hollow's `crowdScale` 0.6
  -> 0.85 (factions.js; the crowd grows with the war-wave, so it adds most on
  the late levels). Measured without the wraith change, seeds 1/2: 8196 /
  7906, all 15 held, none stuck (Iron ~8000-9000).
- **Wraiths** (owner, 2026-11-10): hp 95 -> 143, speed 78 -> 98, a claw every
  720 ms (was 900; the owner gave no figure, so +25% like the speed).
  Then (owner, same day: "the wraiths are too strong") hp 143 -> 120 and the
  claw back to 900 ms; speed 98 and the pip kept. Next levers if still too
  much: only half their kills rise, or `BROOD_CAP` 24 -> 12 (update.js).
  With the Barrow Wight, seeds 1/2: 8922 / 9127 -> 7993 / 8743, all 15 held
  (the Dead Weir ~1120 -> ~920, the Throne ~830 -> ~640). Then (owner, same
  day: "feels pretty good") the claw to 800 ms, and the Plague Ghast got
  `mres` 0.35 (it had none), and the Grave Amalgam the same way: armor 0.2 ->
  0, `mres` 0.2.
  Then `guard` 1 (owner, same day: "kept getting taken out by early magic
  towers"). A pip like every other (owner): only a physical blow breaks
  it, magic and burns do nothing while it stands. `dealDamage` checks the
  shield BEFORE the wraith's "physical passes through" rule, so arrows and
  plain steel strip a wraith's pip though they can't hurt it after. And the
  ground-only halls' PHYSICAL blows reach a wraith while it has a pip
  (`lowShield(e)`, engine/towers.js: `haunts` and `guard` > 0): the
  catapult and Bladewheel aim at it (pickTarget), stones' splash and spikes
  strike it, Powder Works shards too (fragVictim); once its pips are gone they
  ignore it again. Traps still never touch a flier. Checked headless: a
  catapult and a Bladewheel take a wraith with a pip, none without.
  With the flood, seeds 1/2: 8525 / 8332, all 15 held, none stuck (the Grave
  Road ~200, the Dead Weir ~1070, the Lichgate ~810).
- After the rollback (Risen 60, toll 10, with the Gravecaller's hiding,
  pips and the wraith changes), seeds 1/2: 8588 / 8751, all 15 held.
- **The Gravecaller hides in the flood** (owner, 2026-11-10): 10 Risen a toll
  (25 for a few hours: the chapter simmed ~36000, 15 ~18500), packed into ~80 of road ahead of him (update.js summon loop, so a
  caller standing off never raises them behind your line); he walks amid the
  wave's biggest column (`gather: ["gravecaller"]` on the Hollow faction,
  waves.js gatherMore) at its pace (`packRange` 110) and halts `standOff` 100
  from your soldiers (the necromancer's code and 30 s budget). Two on the
  script's war-waves 15 and 17 (they come out a quarter and three quarters
  through the column, so their bells ring on their own clocks); the roster
  keeps cap 1, which genWave lifts to 2 from ten waves past the script.
  `CROWD_WEIGHT.gravecaller` 0.1 -> 0 so the swell never makes three.
  Then `guard` 3 (owner, same day): three blue pips, never refilled; each
  physical blow takes one, magic and burns glance off until they are gone
  (the Covert's blades slip under them).

## The Hollow opens on half a flood (2026-11-10, owner request)

"Couldn't even get past the first wave ... Bellmarsh. We do need to drop
flood count for earlier waves then let it ramp up as the level progressed."
Bellmarsh's wave 1 was 26 Ghouls (115 hp, speed 138) and 44 Risen against
550 gold: the level's `push` 1.5 applies unwarmed from wave 1. Now the
Hollow faction has `openRamp: { from: 0.5, waves: 6 }` (factions.js; waves.js
`openRamp`, after `push` in the campaign chain): its rank and file (crowd
weight 0.9+, Risen and Ghouls) march at half their count on a level's wave 1,
+10% a wave, whole from wave 6. Each thinned head pays 1/k more, so a wave's
purse stays the same and the halls still rise (`s.pay` above 1 now applies
too, update.js spawn). Measured `--level ... --endure`, seeds 1/2, better
doctrine, against the Log Roller build: wave 1 bleed Grave Road 67-69 ->
24-26, Saltgrave 30-57 -> 1-25, Causeway 41-52 -> 5-20, Bellmarsh 32-55 ->
3-22; level totals Grave Road 203 / 212 -> 148 / 158, Saltgrave 525 / 613 ->
461 / 461, Causeway 467 / 487 -> 454 / 435, Bellmarsh 483 / 569 -> 482 / 564.
(Without the purse kept, Bellmarsh's late waves bled ~2x: fewer kills, fewer
halls.) Levers: `from`, `waves`.

## The Log Roller loses momentum (2026-11-10, owner request)

"Log roller is so op for these guys" (the Hollow's floods: one log rolled
down a straight causeway took the whole column). Provisional ("we'll see how
that feels"). update.js rolling logs: every body a log crushes costs it
`logDrag` of its momentum (towers.js: Log Roller 0.03, Iron Drum 0.015,
Powder Keg Run 0.05), its speed falls with it, and at `LOG_STALL` 0.25 it
stops and breaks apart (25 / 50 / 15 bodies); the Powder Keg goes up right
there (`logBlast`), or as before when it leaves the field. Its blows no
longer pierce armor, and the falloff's floor `LOG_FLOOR` is 0.2 (was 0.4).
The card shows "Momentum -3% a foe" (towerText.js `logDrag`). Checked with a
counter on a scratch copy (Wightwood seed 1): 19 logs stalled, all at 25
bodies. The sim's commander aims logs ACROSS the road (3 bodies a log on
average, 22 at most), so the sims barely see this; the owner rolls them down
it. Chapter sim `--chapter hollow --endure --ledger`, seeds 1/2, better
doctrine, against the build before it (wraith 800 ms, ghast and amalgam
mres): 8457 / 9067 -> 8626 / 9120 castle damage (all 15 held, none stuck);
the Log Rollers' damage fell ~28% (1526k / 1612k -> 1089k / 1176k over ~35
halls a chapter) even with the sim's short rolls.
**The Powder Keg goes up on the road** (owner, 2026-11-20): at launch `kegFuse` (update.js) walks the
log's bearing to the board's edge and finds where it leaves the road for the LAST time (a bearing
that crosses two stretches rolls on over the first): the last point of that stretch within the outer
lanes (`LANE_OFF`), else its last point on the road. The keg blows there (`lg.fuse`, `lg.rolled`);
it still blows where it stalls in a crowd first; a bearing that never meets the road goes up at the
edge as before. Headless, 200 random aims on five boards: every keg whose bearing met the road blew
on it, and all 55 that crossed two stretches blew on the last.

## The Barrow Wight (2026-11-10, owner request)

A heavy wraith, `wight` in enemies.js (Hollow). Provisional, pending the
owner's playtest. Everything the wraith is (flies, `holyOnly`, `haunts`,
`swarms`, `raisesOnKill`) with hp 600, speed 75, mres 0.35, `guard` 3 (pips
like every other: only physical blows break them, magic waits; the
ground-only halls reach it while it has one, `lowShield`), a blow of 60
every 1800 ms, castleDmg 4, bounty 45. **Life drain:** `drain` 0.5 heals it
for half the harm each blow does (`drainOn` in update.js, at all three places
a foe's blow lands: a held foe on its holder, a ranged band's holder, a
swarmer's claw). A soldier it kills rises as a WRAITH (`raisesAs`, read by
`raiseFrom`; the brood cap counts that type). Rare: `minGap` 4000, one on the
script's war-waves 15 and 17, the roster at cost 20 / cap 1 (2 from ten
waves past the script), `CROWD_WEIGHT` 0; `firstWave` 8 with two ghasts
standing in. First seen late on the Sunken Causeway; 3-7 a level after.
Figure: the wraith's painter (`hbWraith`) at h 34, darker, cold blue eyes,
bronze weed and a tarnished circlet (`p.crown`, rigs-hollowbeasts.js).
Field Guide rows "Life drain" and "Its kills". Measured `--chapter hollow
--endure`, seeds 1/2, better doctrine: 8588 / 8751 -> 8922 / 9127 (+4%; the
Barrowdowns ~420 -> ~645, the Reedmaze ~620 -> ~890), all 15 held, none stuck.

## A campaign battle is kept between waves (2026-11-20, owner request)

"If I close the game at wave 16, when I continue all my towers are where I had them, gold was the
same at the beginning of the wave, and wave 16 was up next." `src/data/checkpoint.js` keeps ONE record
(localStorage `crownguard.checkpoint.v1`, so it rides in the save code and the iOS mirror): the last
unfinished campaign battle, as the engine's retry snapshot (actions.js `takeSnapshot`, which now also
keeps a Gold Works' `mintBonus` / `paidTotal`) plus `g.run` and the weather's clock / soak. Written by
CrownguardGame.jsx `tickCheckpoint` at every horn (the wave as it began) and at every wave cleared, and
by `parkBattle` when the game is hidden or the battle left during a build phase (halls bought between
waves are kept). Cleared on a win (and never kept in the Endless March), on a loss (a retried wave then
keeps it again), when the level is started fresh, and by `resetProgress`. Mid-wave the record is the
wave's start, so a closed game replays that wave (owner, same day: fine even once Retry Wave
leaves the campaign, though quitting mid-wave then works as a retry). The title's CONTINUE resumes it directly (its line
reads "<level> · wave N next"); the map card shows "Resume at wave N" over a "Start Over".
`resumeBattle` lays it out with `restartWave`; the castle is the crown's as it stands now, the hero
wears the talents bought since. Hall XP: leaving banks the kept ledger (up to the kept wave's start)
and zeroes it, so the replayed wave is not counted twice; a killed app keeps the ledger unbanked in
the record. `g.ckLevel` names the level a battle keeps (null in Free Play and once left). Leaving for the map or the title (pause menu,
victory / defeat card) ENDS the battle as closing the app would (owner, 2026-11-27: it used to be un-paused and
ran on behind the map): `leaveBattle` parks it, banks the ledger and freezes it (`g.left`, held paused by the
main loop) until the next initGame. Checked in
headless Chromium: reload mid-wave, hide-then-reload in a build phase, leave mid-wave for the map.

## Three save files (2026-11-24, owner request)

"Start fresh games on my phone without losing all my campaign progress." The title screen's NEW
CAMPAIGN button is now SAVE FILES (`ui/SaveFilesModal.jsx`): three files, each a whole game (levels,
stars, xp, heroes, hall XP, castle works, a kept battle); PLAY another file or NEW GAME in an empty one
reloads into it; ERASE takes two taps. `src/data/saveSlots.js`: the file in use lives in the ordinary
keys (every store unchanged; an old save is File 1), the others packed in `crownguard.slots.v1`. A file
is every `crownguard.*` key except `DEVICE` (sound, prefs, sandbox, the iOS copy): a new progress key
joins the files with no change, a new DEVICE-wide setting must be added there. A switch writes both
files first, and `settleSlots()` (main.jsx, after keepSaves, before boot) finishes one cut off by a
reload. The save code carries all three files; a code from before files restores into the file in use
and keeps the other two (backup.js `restoreSave`). Settings' "Start the campaign over" still resets
only the file in use. Checked in a built copy (desktop and 844x390): switch, round trip byte-identical,
cut-off recovery, erase. Not yet tried in the iOS app.

## The crown's gift after the first level (2026-11-25, owner request)

"After the first level a new campaign player is rewarded 5000 extra gold so they can buy their first
upgrade for the castle." The FIRST win of the campaign's first level (gw1, The Vale Road) banks
`FIRST_WIN_GIFT` 5000 into the treasury on top of the gold carried home (data/campaign.js
`firstWinGift`, paid in CrownguardGame.jsx's end-of-battle effect); the victory card shows it as its
own line. Once per save file (it reads the level's `cleared`): a replay pays nothing, and a save that
won gw1 before the gift existed never gets it. Every castle work's first tier costs 5000.
**The king's gift** (owner, 2026-11-27): the first win of the Goblin Warrens (gw5) banks 10000 more on the same
terms. Gifts are a table now, `CROWN_GIFTS` (campaign.js: gold and the victory card's words per level id;
`firstWinGift`, `giftWords`); a new gift is one entry.
The campaign's victory card has a **Castle Works** button (owner, 2026-11-25) beside Campaign Map / Main
Menu: it opens the treasury's `CastleWorksModal` (rendered outside the card's `<Fit>`, `winWorks` in
CrownguardGame.jsx, closed whenever `ui.result` changes) and buys through the battle's own `buyWork` /
`refundAllWorks`, so the treasury pays and an Endless March after it fights with the new works. Free Play's
win card has none (its castle is in the tray).

## Restarting takes two taps (2026-11-09, owner request)

Every restart button now arms on the first tap and acts on the second (the
game's `upArm`, `useArm` from ui/HeroTalents.jsx: 3 s, a press elsewhere
disarms; the label reads "Tap again to restart" / "Tap again to retry"):
the pause menu's Restart Wave (`restart-wave`; its Restart Level already
did) and the defeat card's Retry Wave (`retry-wave`) and Restart Level
(`retry-level`). Checked in headless Chromium: one tap armed Restart Wave and
the wave ran on; the second put it back to its build phase.

## Warchief and boar riders (2026-10-03, owner requests)

Provisional, pending the owner's playtest ("spawn rates are ok but I'll let you
know with these changes").
- **Hobgoblin Warchief** never walks alone: `partyOf` (waves.js, after the ram
  and raisers are placed, before `escortOf`) gives every wave that holds one a
  goblin party of `PARTY_BASE` 7 + `PARTY_PER` 0.3 x war-wave goblins a chief
  (the wave's own goblin group if it is big enough, else grown or appended),
  and marks him `amid` it; `packRange` 110 keeps his pace with it. His horn is
  the summon engine with `summonAtStart` (enemies.js): every 20 s (first at
  12 s) 25 goblins are queued into `g.spawnQueue`, 110 ms apart, so they stream
  out of the wood at the head of the road at half bounty; a toll ring and the
  horn sound mark it. He is prey (`isPrey` reads `summonEvery`) and silence
  stops the horn. A wave with the chief and the necromancer is the heavy one.
- **Boar riders**: `splitInto: ["goblin", 1]` with `splitChance` 0.5 (rolled in
  actions.js at the kill, stored on `e.splits`, read by update.js's death
  loop): half the time the lancer drops from the saddle (`dropAt`, stunned
  650 ms) and marches on as a goblin, and the boar crumbles alone in the
  `boarMount` rig (rigs-beasts.js, `deathSkin`). A leak, a sweep or a raised
  (`revived`) boar never splits. To pay for the survivors the riders were cut:
  `CROWD_WEIGHT.boarrider` 0.5 -> 0.3 and the endless roster's cost 3.6 -> 5,
  cap 9 — Cinderholt waves 21/23/24 went 27/49/47 riders -> 15/19/20.
  `--level cinderholt --endure` bled 253/528 -> 203/473 (swarm/burst, seed
  default); the burst plan loses wave 12 with or without the change.

## One tap opens an info pop-up (2026-11-07, owner report)

"The first tap on an enemy type flashes the info and closes it; the second
stays" (wave info panel; the weather (i) too). A finger sends emulated mouse
events: the chip opened on `mouseenter` and the click that followed toggled it
shut. Tap-to-open toggles now use `ui/useTap.js`: a finger acts on lift (not if
it slid), the browser's echoing click is ignored; a mouse acts on click. The
wave chips hover only for a real mouse (`onPointerEnter`, pointerType
"mouse"). Used by the chips (CrownguardGame.jsx `waveChips`), WeatherForecast
and WeatherBrief; use it for any new little toggle. Checked in Chromium's
iPhone/iPad emulation, not yet on a real iOS device.

## The hero's button arms his move (2026-11-08, owner request)

Tapping the hero's button in the tray's foot, or the hero himself on the
field, opens his menu AND arms the move: the first tap on the field sends him
there (onto the road, as before) and leaves the menu open; the next tap on
the field (or his button again) folds it away. The menu's Move
(flag) plank is gone. `openHeroMenu` (CrownguardGame.jsx) does both; a
`useEffect` on `talentsOpen` (up with the other hooks, above the screens'
early returns) clears `g.rallyFor === "hero"` whenever the menu folds by any
road (its ✕, a second tap on the button, a tower picked from the grid, the
castle or militia). Picking an ability hands the aim to it. A fallen hero's
menu opens without arming, and a hero who falls while armed is disarmed.
Checked in headless Chromium (mouse at 1180x820, touch at 844x390).

## A hall dropped where it can't stand waits on the board (2026-11-08, owner request)

Dragging a hall out of the tray: the picture riding above the finger has no
dark socket behind it now (a drop shadow only). A finger that lifts where the
hall can't stand (road, water, too near another hall) no longer loses it: the
ghost stays there in red (`park`, `parkRef` / `parked` in CrownguardGame.jsx)
and the ribbon says to drag it to a clear spot. A finger dragged ANYWHERE on
the board then nudges the parked hall by its own movement (`dragRef.nudge`,
so the hall never hides under the finger), and lifting builds it if the spot
is clear, else it waits again; a plain tap still tries the tapped spot. The
✕, the tile tapped again or another hall picked drops it. A mouse is
unchanged. Checked in headless Chromium with touch events; not yet on a device.

## Halls keep their facing at rest (2026-11-07, owner request)

A hall's crew faces the way of its last shot and HOLDS it when no foe is in
range; before its first shot it faces LEFT, away from the castle (`lastAim`
starts at `Math.PI`, engine/towers.js; the build ghost in draw.js too). Gone:
the Falconry / Covert / Catapult snapping right at rest, and the idle glancing
about of the archers (crew and siege bow), wizard, Warden and the old pixel
archer. The Powder Works' two men face left until each first shoots
(`bomberFacing` / `musketFacing`, muzzles.js); its store still faces the road.
The River Watch's watchman still glances about (he never aims).

## The River Watch shoots fliers (2026-11-08, owner request)

The skiffs' mark scan (update.js, "the River Watch") no longer skips
`e.flying`; every step carries `hitsAir: true` (so the card and the Field
Guide say "hits fliers"), and every step's `range` went up 10% (94-128 ->
103-141). A Fireship's splash, burn and stun still touch only the ground
round the mark (a flier takes them only as the mark itself), and the
Hellburner leaves no fire pool under a flier. Checked headless (Ironford, a
level-3 dock alone killed 27 of 60 bats); not simmed. Provisional.

## The Trapsmith lays only in a wave (2026-11-08, owner request)

"Trap layer started covering the field before the first wave started": the
smith now arms the road only while `g.phase === "combat"` (update.js, the
trapsmith loop); before the first horn and between waves he waits. His bench
still stocks charges then, up to `maxCharges` (the rack on the hall shows
them), so at each horn he lays them out one every 420 ms. The sweep between
waves is unchanged. A Free Play summon fight between waves is combat, so he
lays for it. Checked headless; not simmed.

**Spike strips, one-shot bombs** (owner, same day). The levels and the
Caltrop Field lay strips that STAY DOWN: a trap with `trapHits` (towers.js)
is laid with `hitsLeft`/`hitsMax` and a `hit` Set; each ground foe that
walks within 15 is stabbed once (`trapDmg`, the level's slow, `trapBane`
riders/ram through armor x1.5), no blast; it goes when `hitsLeft` runs out
(update.js trap loop) and draws fainter as it wears (render/traps.js `worn`).
Levels: 14 / 18 / 24 a stab, 5 / 10 / 10 foes a strip, `maxCharges` 10 / 10 /
15. `maxCharges` is now ALSO the most of a smith's traps on the road at once
(the laying loop counts them), so a worn strip makes room for the next.
Caltrop Field: `layCount` 3 caltrops a charge, 12 a stab, 12 foes each,
slow 55% 2.2 s, 30 on the road; its old root and slowing ground are gone.
Then (same day) the JAWS re-set: a trap with `trapCatches` (laid with
`catchLeft`/`catchMax`, a `hit` Set, `holdId`/`holdUntil`/`rearmAt`) bites
ONE ground foe once (`trapDmg`), holds it `root` ms (stunUntil; bosses are
bitten, never held), springs open 300 ms after, and goes when its catches
are spent. Springworks: 110 a bite, hold 2 s, 3 catches, 10 on the road.
Guillotine Gate: 130, hold 3 s, 3 catches, 10 on the road; a catch left
under `execute` 20% (not a boss) is killed and SPENDS the jaw. One-shot
bombs: Blastworks 175 -> 190 (splash 58), Minefield Doctrine 165 -> 240,
splash 54 -> 64, Aerostat Yard 210 -> 270, splash 66 -> 72: no fire on any
of them now (the Aerostat keeps its stun and balloons, the Minefield its
self-seeding). Damage per goblin on the real engine (one hall beside the
road, 60 goblins at 1e5 hp, a head every 0.5 s / 0.15 s; scratch harness,
not in scripts/): level 3 114/87, Springworks 136/73 (+ the holds),
Guillotine 143/72 (+ holds, + finishing), Caltrop Field 129/131,
Blastworks 118/152, Minefield 191/249, Aerostat 110/239 (half its charges
are balloons for fliers).
Checked headless (`scripts`-style test: 30 sturdy goblins through each form)
and `marathon.mjs --to 40` (no errors). The sims never build a Trapsmith.

## Heroes stand on the road (2026-11-07, owner request)

"Ranged heroes are way stronger because they never go down": a hero parked in
the grass shot the column with nothing reaching him. Now every hero's post is
ON the road: `onRoad(x, y)` (engine/path.js) gives the nearest spot no further
than `LANE_OFF` (21, the outer marching lanes) from the centre line, and a tap
already inside that keeps its spot. Applied to the move order (`handleTap`,
CrownguardGame.jsx: a tap off the road sends him to the nearest spot), the
starting post (`fieldHero`, which used to stand him 40-55 px off the road on
most boards) and Aldric's Charge (its landing). So foes walk into a ranged hero
and hold her (`RANGED_ENGAGE`). The sims already posted the hero on the centre
line, so they barely move. Provisional, pending the owner's playtest.
**Soldiers too** (owner, 2026-11-20): a Knight Hall's rally flag goes on the road (`onRoadNear`,
engine/path.js: the road spot within `LANE_OFF` of the centre line nearest the tap AND within the
rally reach; a hall with no road in reach keeps the old rim clamp; CrownguardGame.jsx `postRally`),
and the militia horn musters on the road (`callMilitia` runs the call through `onRoad`). Checked
headless: 824 taps round knight halls on Thornbrook and Ironford, every flag on the road and in reach.

## Bowmen post back and are engaged; the militia is recalled (2026-10-07, owner request)

Provisional, pending the owner's playtest.
- **Every bowman of a mixed band** (Crossbow Company of the Knights Errant, the
  Levy works' tiers 3-4, Hale's Sound the Levy) takes post `BOWS_BACK` 44 px back
  down the road (toward the castle) from the front line: `bowPosts(x, y, n)` in
  engine/towers.js, used by `unitSlots` (garrison, from the rally flag),
  `callMilitia` (from the call) and Hale's `fire`. The front men keep their
  stands; the archers start at the call and walk back.
- **`runRangedBand`'s hold-one-foe branch runs for every ranged band now** (it
  was heroes and retinue only): a foe that walks within `RANGED_ENGAGE` 22 of a
  bowman stops and fights him, he keeps shooting it first. So a foe that gets
  past the front men meets the archers as any soldier.
- **The militia is recalled by its own timer** (replaces "no clock", 2026-10-05):
  when `g.militiaCd` reaches 0 (the horn can sound again) the band is marked
  `recalled`; it leaves in a poof as soon as no man is fighting (state
  "fighting", or holding a foe via `blockedBy`), so a band in a fight finishes it
  (or dies) first. Hale's levy (`b.levy`) is not recalled: no clock. Sounding
  the horn again still replaces whoever is left. Wording in bands.js / castle.js.
  Checked headless: tier 4 gone at the 16 s cooldown with no foes, at ~40 s when
  a column held it; bowmen held foes in both it and the Crossbow Company.

## The phone crash audit (2026-11-18, owner: "crashed with some pretty good progress")

Fable's audit: most likely iOS killed the page for memory. Fixed the same day (not yet seen on a phone):
- **Figure bakes** (`src/render/pix/bake.js`): a baked frame no longer keeps its sculpt buffer
  (`px`, ~42 bytes a pixel; every walk of every figure held ~420 MB); `rimOf` re-sculpts through
  `rec.remake()` the first time a light falls on it. The canvases are held to `BAKE_BUDGET` 96 MB,
  oldest-asked clips dropped first (`bakeStats()`). `warmPix` no longer bakes every figure up front:
  `pixRec` warms a type's walk the first time it is drawn. Measured ~12 MB of bakes mid-battle.
- **Lightning** (weatherbake.js): each stroke's sprite sits in its own 8-entry `BOLTS` cache, not
  `MEMO`. Its ground marks were cut (owner: "way too much and last for too long"): weatherfx.js
  `SCORCH_SIZE` 0.3 (was 0.5 of the blast), `SCORCH_LIFE` 2 s (was 4.5), `SCORCH_A` 0.7,
  `CRACK_LIFE` 1.4 s (was 3.6). Not yet looked at during a strike.
- **Guards:** `draw()` is wrapped like `updateGame` (one fault costs a frame, logged once); boot.jsx
  has an error boundary (`Shield`) with a Reload button.
- **The crash recorder** (`src/native/crashlog.js`): errors (update / draw / window / promise /
  screen) go to localStorage `cg-crash`; the battle writes a heartbeat `cg-beat` every 10 s (realm,
  wave, bake MB); a clean leave removes it, so a beat found at launch is logged as "unclean-exit"
  (almost always a memory kill). Settings > Progress > Crash reports copies it. It caught one bug
  at once: the storm's warm-up threw `wu is not defined` (weatherfx.js `warm`, fixed).
- **The Log Roller froze the game** (owner, same day: placing one "almost froze", and it was the
  last thing placed before the crash): its reach is 999 (whole map), and the range ring baked a
  ~4000 px canvas for it (~107 ms and ~128 MB on the Mac; every new size or colour, e.g. the fog
  thinning, baked another, up to 60 kept). rangering.js now skips a ring wholly off the board or
  over `WHOLE_MAP` 500 (real reaches end near 320), holds its bakes to `RING_BUDGET` 24 MB, and
  paints only the band round the line (pixel-identical, 48 rings compared; a 316 ring 25 -> 5 ms).
- **Frame timings on the device** (2026-11-25, owner: ~10 fps on the level after a won one, iPhone only;
  a restart fixed it, muting did NOT, a 20 s pause did NOT; nothing carries over in headless Chromium:
  draw time, script time, canvas memory, DOM all flat across levels). `src/render/perfmark.js`: draw.js
  marks its passes (`pm("ground" | "under" | "prep" | "actors" | "castle" | "fx" | "light" | "weather" |
  "grade")`), the main loop times the engine, the draw and its whole run; `PERF.now` holds a second's
  averages. The frame counter reads `fps · ms` (ms of the game's own code a frame). The crash log keeps a
  `perf` sample after 15 s of combat in every battle and a `slow` one when a battle stays under 20 fps for
  5 s (fps, loop rate, js / upd / draw ms, the passes, longest gap, battle number since launch, foes, halls,
  bake MB, DOM canvases, sun, screen). Low fps with few ms of game code = the browser's own work (GPU,
  compositing), not our painters. Headless Chromium here runs ~20 fps on 3-6 ms (software compositing).
  Measured the same day in Chromium, the win -> map -> next level path allocates canvases: the title's map
  warm-up ~236 MB made (31 kept), the campaign map ~45 MB, a level ~60-80 MB; ~235 MB alive at the next
  level's start before a GC. No canvas is ever released explicitly (width = 0) anywhere in src/.
  **Tested on the owner's iPhone the same day, NOT reproduced** (iOS 18.7, Safari tab and home-screen app, dev and
  production builds, the old sound code put back): leftover connected sound nodes up to 170,000, ~200-270 MB of live
  canvases, forced and real 20-wave wins then March On by the real buttons, and a level won by hand then the next one
  played: all held 60 fps (~4-6 ms of game code). The owner: it struck at once on the next level, before any hall or
  wave; it did not come back that day, even in the live app. So it is an intermittent state of the phone (a restart
  clears it), not something the game does every time. The recorder above went live so the next one is caught: ask for
  Settings > Progress > Crash reports (a `slow` entry; low fps with few ms = the browser's own work). Its sample also
  keeps `domNodes`, `audioLeft` (sound nodes still plugged in), `upS` (seconds since launch) and `standalone`.
  **The phone test harness** (dev, or a build made with `VITE_REPRO=1`; nothing of it ships otherwise):
  `src/dev/canvaswatch.js` notes every canvas made (live count and MB); `src/dev/repro.js` shows buttons in the top
  left: Start old / fixed sound (plays a level to a real win at 3x, taps March On and the map card's button, measures
  the next level), Play by hand (posts a reading every 5 s), Sound stress (piles up dead sound nodes 10,000 at a time).
  Readings go to POST /__perf, written to `.shots/perf.jsonl` (vite.config.js `perfSink`, dev and `vite preview`). It
  drives the game through `window.__cg` (CrownguardGame.jsx) and must import nothing from the engine: a static import
  there split the engine into other chunks in a build and broke its load order (an import cycle). `?untidy` / the old
  sound button turns tidy.js's unplugging off. Serve to a phone: `npx vite --host` (add `VITE_REPRO=1` for a
  home-screen icon, which opens the bare address), or build with `VITE_REPRO=1` and `npx vite preview --host --outDir`.
  Found on the way, not fixed: the campaign map's first open froze the phone ~30 s; in Safari with its toolbars (a
  292-pt tall page) CampaignMap's view / `far` effects loop ("Maximum update depth") and the screen crashes.
- **First report from the recorder** (same day, Whalebone wave 3, "screen": `l.ms` undefined): the
  wave preview's foe icon (`pixIcon`) asks for the `idle` clip, and the sea serpent has none.
  pixrigs.js `clipFrame` now falls back to the walk for a missing idle (or attack) clip. Settings'
  Copy crash report shows a "Copied!" tag.

## A cooler phone (2026-11-22, owner request; on main the same day)

"I was playing on my iphone 18 pro last night and it got so hot. I was in the hallowfen." The
research: the ENGINE is cheap (`sim.mjs --perf`: 0.2-0.5 ms a tick with 270 foes); the heat is the
drawing, and the loop redrew the whole board on every screen refresh (120 a second on a ProMotion
phone), paused or not. Measured in desktop Chromium on a frozen Bellmarsh fight under a full Blood
Moon (6 halls, 50 raise effects up), old -> new: 290 foes 7.3 -> 4.0 ms a frame and 1948 -> 1685
sprite stamps; 145 foes 5.7 -> 2.5 ms; pixels painted a frame ~22 -> ~17.6 million (the board is
1.9 million). Not yet measured or seen on a phone. Pending the owner's playtest on their iPhone. (It was built
in a worktree and pushed straight to origin/main, so the Desktop folder's own main was left behind.)
- **Pacing** (CrownguardGame.jsx, the main loop's header): the battle is drawn `prefs.fps` times a
  second: **60 normally, 30 with Power saver** (Settings, Display; owner, same day, after trying a
  24 / 30 / 60 selector: "drop the 24 option. 60 normal and 30 on power saver", and no jump to 60
  while a hall is dragged at 30: "i dont think its that big of a deal"; `FPS_CHOICES` in prefs.js;
  a saved 24 or an old `saver: true` loads as 30). Frames come due on a clock of their own, so any
  rate a screen can't divide evenly still averages true. **The frame counter** (`prefs.showFps`, default ON while the owner
  tests; turn the default off before publishing to the App Store): a small bright green number in
  the screen's upper right corner in a battle, frames painted in the last second (it reads 4 when
  paused and 30 in a quiet build phase: that is the saving, not a fault). The engine takes the real
  time between the frames it runs (capped at 70 ms, was 50), so the game's speed is the same
  (checked at 24 / 30 / 60 on made-up 60 and 120 Hz screens: exact rates, equal game time).
  The board is REPAINTED only when it can have changed: paused = 4 a second; a quiet build phase
  (no foes, no shots, nothing touched for 1.5 s) = 30 a second; any touch (the `k2` signature:
  selection, build ghost, camera, gold, phase...) paints at once at full pace for 1.5 s. A new
  thing the player can change on the board without any of those fields changing must join `k2`.
- **Crowd detail** (`src/render/lod.js`, a leaf): `LOD.k` slides 0 -> 1 between 100 and 140 live
  foes over about a second. For the rank and file (`smallFoe`: not a boss, size under 20) it
  fades out: foot dust and the far key light's rim (the sun's / moon's, `FAR_LIGHT` in pixrigs.js;
  nearby fire and spell light always stays). Raise-dead: the first `RAISE_FULL` 12 standing get the ring and ribbons, the rest
  only the turned earth and mist (`fx._lite`, decided once each; rings.js). The eyes stay.
- **No short shadow under a long one** (owner, same day: "remove the small shadow when the long
  shadow is present"; crowd or not): at noon a figure has only its small foot shadow; under any
  other sun and under the Blood Moon it had BOTH. Now sunset.js `drawLongShadows` stamps who has
  a long one this frame (`LOD.long` foes and bands, `LOD.longMen` the halls' men: the time of day
  only, `LOD.longFliers`) and enemies.js draws the short one through `shortShade` (gone once the
  long one is a third in, so the moon's sunset hands over smoothly). Kept: River Watch skiffs, the
  war-eagle, and under the Blood Moon the halls' men and fliers (it throws them no long shadow).
- **Straight to the screen canvas** (draw.js): no hidden copy of the board copied across each
  frame. `bufRef` is unused (labs may still pass it). A painter's fault now leaves a half-painted
  frame for one frame instead of the last good one.
- **The realm's light is one layer** (atmosphere.js `gradeLayer`): tint and vignette baked into
  one multiplied canvas per light (they were two whole-board passes, one a live radial gradient).
  Not pixel-identical: the darkest pixels toward the corners come out up to 8 / 255 darker on the
  strongest vignette (mean 0.9). A realm with `glow` (the Ember Wastes) keeps the old passes.
- **NOT done: the Blood Moon's own layers.** Its ground shade can't be baked into the ground
  (live water, road marks and bridges are painted between the ground and the shade), and a
  multiply can't be folded into the actors' lighter shade without changing the owner's approved
  look. It is still three whole-board blended passes: the biggest pixel cost left under a moon.
- Left on the list (not asked for): the React panels re-render on every gold change; `getStats`
  is rebuilt several times a hall a frame; draw.js scans every foe per hall for its idle pose.
- A second dev server (a worktree with a symlinked `node_modules`): `CG_VITE_CACHE=<dir>` gives
  it its own cache (vite.config.js). The built-in browser's pane throttles frames when hidden:
  drive the loop by stubbing `requestAnimationFrame` and calling the callback with made-up times.

## Several sessions at once

The owner often runs several Claude sessions in this folder at the same
time. They all share ONE working tree, one git index and one dev server, so:
- **Look first.** Start with `git fetch origin` (the cloud sessions push to
  GitHub, so a folder on the owner's Mac can be weeks behind: on 2026-11-12 it
  was 121 commits; `git rev-list --count HEAD..origin/main` says how far, and
  `git show origin/main:CLAUDE.md` is then the current guide), then
  `ListAgents` and `git status`. Modified files
  you did not touch belong to another session: leave them alone.
- **Never move others' work.** No `git stash`, `git checkout -- <file>`,
  `git restore`, `git reset`, `git pull`/rebase over a dirty tree, and no
  `git add -A` / `commit -a`. Stage only your own paths: `git add <files>`.
- **Hot files** (`src/CrownguardGame.jsx`, `src/engine/update.js`,
  `src/data/towers.js`): keep edits small and re-read right before editing.
  If a peer is clearly mid-change in one, message it (`SendMessage`) first.
- **Build the tree as it is.** If someone else's half-done work breaks the
  build, don't push past it and don't hide it: message that session, or
  tell the owner.
- **Shared tools:** don't stop or restart the dev server on 5173; use your
  own browser tab and a shot-name prefix in `.shots/`. A second dev server
  (another port), or one run from a copy of the repo with a symlinked
  `node_modules`, must set its own `cacheDir`, or it rewrites the shared
  `node_modules/.vite` under the main one. For before/after comparisons
  prefer static builds (`npx vite build --outDir <scratchpad dir>`) served on
  a private port.
- **Collided anyway?** Save copies to your scratchpad before touching
  anything, message the owning session with what happened, and let it
  restore its own files.

## Keep the guides current

When a session changes how things are made — art rules, balance levers,
tools, file layout, or a lesson learned the hard way — update the matching
guide (`art/STYLE-GUIDE.md`, this file) in the same commit. The next session
should never have to rediscover it.

## Enemy company rules (September 29 pass)

Some foes never walk alone, and these are engine rules, not just numbers:
- **Siege ram** (`roadBlock`, `single`, `escort` in `src/data/enemies.js`): a
  wall across all three lanes. No walker behind it passes while it lives;
  flyers sail over it (`capDist` pass in `update.js`, before the enemy loop,
  rebuilt every frame so the column is released the instant the ram dies; the
  column queues in its lee, per lane). Up to 3 a wave (the script's count),
  the first out of the wood first and the rest on a clock of their own,
  9 s apart (`WALL_STAGGER`; a group with `clock`, placed in startWave; SINCE
  2026-11-08 the 2nd/3rd rams are `clock: -1` and come out a third / two
  thirds of the way along the column, each leading its share, and a wave
  gets one ram per `RAM_COLUMN` 12 foot rank and file at most: the owner saw
  one roll out alone at the end of Ironmouth's wave 20; with the magister's
  wait, Iron `--endure --check-wall` seed 1: 9412 -> 9185, all 15 held, 0
  passes of a live ram). Flyers
  are drawn above the ground crowd (draw.js sorts them +1000) so they never
  clip behind a ram. The `single` flag (one alive at a time) still exists in
  the spawn queue but no foe uses it now. And
  `shapeCompany` (waves.js, applied after the swell) always sends its escort
  behind it (levies + crossbows, sized by the war-wave). Measured with
  `--endure` against the pre-wall build: the wall ALONE roughly doubled the
  Iron back half's castle damage (Crowstair 633 -> 1200-1800), mostly because
  the crowd behind a 30-speed ram arrived in one lump; speed 46 took that back
  to ~1.5x, and a big escort added more, so keep the escort lean (5+0.6a levies,
  3+0.35a bows). The ram's `speed` is the knob if it is still too much.
- **Rams from wave 15, 20 s apart; healers walk in the column** (owner,
  2026-10-04, provisional): `wallFrom: 15` on the Iron faction drops every
  `roadBlock` group from a level's waves 1-14 (waves.js, campaign windows
  only; Free Play keeps its script), so the early levels are ram-free and a
  20-wave map gets them on its last six. `WALL_STAGGER` 9000 -> 20000 ms
  between rams (second one on its own clock, a third 20 s after). `gather:
  ["chaplain"]` marks the Battle Chaplain `amid` like the magister, and
  `gatherEscort` picks a FOOT group for a healer (never riders or fliers
  unless the wave has nothing else). Iron `--endure` after: all 15 held,
  `--check-wall` 0 passes; bleed about even to a little lower (ir2 283/213 ->
  242/109, crowstair 1776/622 -> 1275/704).
- **Cavalry ride round rams** (`mounted` on the cavalier): the cavalry surge
  goes FIRST, then the ram, then the foot column with its healers and
  magisters amid it, then the archers at its back (owner, 2026-11-08: "a
  good difficult wave pattern"; before, the ram led on about half the
  waves). Healers and magisters never walk `amid` the archers' group now
  (gatherEscort / escortOf skip `rangedAtk`): on Ironmouth's wave 20 they
  had, and, the archers being amid the levies themselves, came out right
  behind the ram.
- **Archers stand and shoot** (owner, 2026-09-29): a foe with `rangedAtk`
  (crossbowman, barrow archer) halts while any friendly soldier or hero is in
  its `rangedRange` and marches on once none is left (`e.aiming`, update.js).
  Each archer has a 30 s budget of standing still (`pauseLeft`, `STAND_MS`;
  14 s until 2026-11-08), so a healed paladin cannot hold a wave open for ever.
- **A standing shield (`guard > 0`) shrugs off every status**: burn/poison
  ticks already returned in `dealDamage`; stun and slow are now ignored in
  the movement code too, and `drawStatus` draws nothing on a shielded foe.
- **Aegis Magister** (the "shield mage"; `packRange`): never his own group —
  `escortOf` (waves.js) walks him amid the biggest group of a wave, and in the
  engine he marches at the mean pace of the soldiers near him so he stays
  inside the column. Ward every 8 s. Behind a siege ram he comes only from
  war-wave 10, on ~6 waves in 10 (seeded), not every time.
- **The Hollow King** tolls 50 Risen every 10 s, the first at once
  (`summonFirst: 0`; the Gravecaller has the same instant first toll).
- **Wraiths bunch up** (`swarms`): any wraith within 34 of a friendly soldier
  stops and claws at it, blocker or not, so several can be on one knight and
  each kill raises another (update.js). A 22 s budget (`clawLeft`) stops a
  stalemate. Never a River Watch skiff (owner, 2026-11-20). Only wraiths do this: every other foe is held by at most one
  soldier per soldier (`blockedBy`), measured at max 6-9 held at once in the
  Hollow sims, and walks past the rest. Barrow archers and crossbowmen also
  stand still while a soldier is in reach (the archer rule above).
- **Mission flow** (owner, 2026-09-29): the level card on the campaign map
  (`ui/CampaignMap.jsx`) has a HERO row (`heroKey`/`onHero`) beside the castle
  works; "March On" after a win goes back through the map (`marchOn` in
  CrownguardGame.jsx sets `arrive` {from,to}: the camera travels the road and
  the next level's card opens). The campaign battle has NO castle works
  button (Free Play keeps it: it has no map to buy on). Before the first horn
  (`canSwapHero`: wave 0, build phase — towers may stand) the hero's menu
  offers "Change hero": `swapHero` (actions.js) sends the hero running into
  the gate (`leaving` band, faded out), then the new one walks out of it to
  the same post (update.js).
- **Battle Chaplain** heals instead of warding (owner, 2026-09-29): `healPct`
  0.16 of each nearby ally's max health (capped by `healCap` 40 x sqrt(mult),
  so rams and marshals are not mended like levies) every 2.8 s within 95, and
  `packRange` keeps him at the column's pace. Only the Aegis Magister still
  lays shield pips.
- **Wraith** (`holyOnly`, `haunts`, `raisesOnKill`): flying, and every
  PHYSICAL blow passes through it (arrows, stones, traps, plain/berserker
  knights); magic hurts it less its `mres` 0.25 (was 0.4) — wizards, fire, poison, and the
  Paladin tree, the only knights that can (`dealDamage`'s `holy` argument). Knights can block and fight it and it hits back; a knight it
  kills rises as a new wraith (`raiseFrom` in update.js, capped at 24 alive).
  The sim commander cannot play this puzzle (it never places paladins where
  the wraiths come), so wraith waves are what bleeds the Hollow in the sim;
  scripted counts were cut to 3-5 and CROWD_WEIGHT to 0.25 to keep it a check,
  not a wall. Pending the owner's playtest.
- **Gravecaller**: ten Risen a toll (25 briefly on 2026-11-10: ~4x the bleed). It is the Hollow's engine; the late
  script keeps callers to 1-2 a wave and the roster cap at 1 for that reason.
- **`window.push`** (levels-hollow.js, applied in waves.js `push`): multiplies
  the rank-and-file heads of an early level from wave 1, unwarmed, for a
  player who arrives with the last chapter's towers. Hollow: hl1 x2.0 down to
  hl3 x1.2. A pure "more zombies" lever that never touches late levels.
- `node scripts/sim.mjs --level ir3 --check-wall` proves no foe passes a ram
  and reports the biggest jam. `--debug-stuck` dumps the live foes of a wave
  that runs over 400 s (a NaN position once hid behind one).
- Sim status at the end of the pass (the Iron chapter was already lost by the
  sim commander before it — the owner's own hard pass): Hollow hl1-drownholm
  held with 1-10 castle damage each (they bled 0 before), but The Lichgate,
  Wightwood (some seeds) and The Throne of Dust are lost by the sim commander
  — pending the owner's playtest, before any easing.

## Free Play is a sandbox

- `src/data/sandbox.js` holds ONE settings object for a Free Play run
  (`DEFAULTS`, commented field by field; `LIMITS`; nine `PRESETS` as
  patches). `startSandbox(settings)` arms the live binding `SANDBOX` (null in
  the campaign — every engine read is `SANDBOX ? ... : normal`) and marches a
  synthetic faction from `buildArmy` (`setCustomFaction`). `tweakSandbox`
  changes a run live; `tierOpen`/`hallOpen` gate halls and tiers.
- The engine's reads: waves.js (army, boss rhythm, count/gap/HP, a
  script-less ramp, `victoryWave`, a 600-head wave cap), update.js (pace,
  bounty, infinite gold, unbreakable castle, build time, `summonFight`),
  actions.js (tier caps, sell refund, militia). `engine/sandboxTools.js` is
  the in-battle panel's hands (spawn, sweep, gold, lives, skip).
- UI: `ui/SandboxSetup.jsx` (the way into Free Play: presets + six tabs) and
  `ui/SandboxPanel.jsx` (the tray's Sandbox button in battle).
- Rewards stay honest: `isHonest(s)` (nothing easier than Classic) and the
  run latch `runHonest()` — any easier setting, or the panel's gold, lives,
  sweep or skip, ends stars and XP for the whole run. Summoning more foes
  never does, and a summoned fight between waves pays no wave bonus.
- A new setting: add it to DEFAULTS (+ LIMITS if numeric, + sanitize if
  boolean), read it in the engine behind `SANDBOX`, give it a control in
  SandboxSetup (and SandboxPanel if it makes sense live), and decide whether
  it belongs in `isHonest`.
- `node scripts/sim.mjs --sandbox <preset|all> [--realm r] [--to N]`.

## The tower menu is the tray (2026-09-30, owner's design)

Selecting a tower turns the tray into its edit menu; nothing floats over the
board any more. Pictures: `src/ui/TowerEdit.jsx` (`TowerBanner`,
`TargetsBar`, `UpgradeTree`); the actions, the two-tap buying and the
upgrade cards stay in `towerPanel` in `src/CrownguardGame.jsx`; skin in
`hud.css` ("the tower edit menu"). Top to bottom:
- **Head** (wave, pause) and **foot** (hero, militia) stay. The Castle /
  Sandbox / Master row is hidden while a tower is edited.
- **Banner** (`cg-panel`): picture, name, level pips with a damage-type symbol after them (a
  blade = physical, an orb = magic; none for halls that deal no damage,
  like the Gold Works), the ⓘ level with the
  pips (so a name gets the whole line; `nameSize` steps the type down for
  names up to 19 letters, a phone lets it wrap to two), then FOUR numbers
  (the first four rows of `formStats`; arming an upgrade shows the new
  value in green with a ▸ in the same cell), then kills and dps (+ gold
  paid for the Gold Works). No ✕: tap the field to leave (handleTap
  already clears the selection). Names read `levels[n].label` at levels
  1-3, then the path's, then the final's.
- **Edit panel**: the TARGETS bar (current choice, a caret) drops its list
  over the panel with a scrim behind it; a knight/assassin/catapult-roller
  hall also gets a "Move Rally Flag" / "Aim the Roll" plank under it; a
  hall that always hunts one foe shows the bar locked; halls that take no
  orders (Gold Works, traps, auras) have no bar. Below, the live upgrade
  step (level card, path cards, final cards, or the "Fully upgraded" slip
  with the numbers past the banner's four and the traits) fills the rest;
  SELL (two taps) is pinned at the foot and never scrolls.
- **The ⓘ's layer** (`UpgradeTree`, `cg-layer`) slides down over the panel
  and the ⓘ becomes a ✕: the hall's whole road as a tree — levels 1-3 in a
  row, the two paths under level 3, each path's two finals under it. Tap a
  step to read its name, cost and tale (no damage numbers); the tower's
  own step glows, the steps it took are gold, the rest dim. "Open in Field
  Guide" opens `FieldGuide` on this hall (`start={{ tab, pick }}`). The
  level steps have no tales in `towers.js`, so `treeNodes` writes neutral
  ones; the paths and finals use their `desc`.
- One layer at a time (`towerLayer`: "targets" | "info" | null), reset when
  another tower is selected.
- **Rules that stand:** paths' and finals' `desc` in `src/data/towers.js`
  stay at 100 characters at most; two taps to buy (arming turns a card gold,
  CONFIRM in its fixed slot); never set `visibility: "visible"` on anything
  inside a hidden layer. A short screen (phone on its side, `compact`):
  the Targets bar loses its label and shares a row with a slim SELL, its
  list lays the orders two to a row and is capped to the room under the bar
  (it scrolls rather than run off the panel: a mage's fifth order, "Most",
  was once cut off), the
  level card drops its numbers (the banner previews them), the banner's
  picture shrinks; the panel scrolls where it must (SELL, the bar and the
  banner never do).

## Castle works are the crown's, everywhere

Buying a work takes two taps (2026-10-02, owner request): the first arms the
button (gold, a CONFIRM tag in place of the label, 3 s or a press elsewhere
disarms), the second pays. It is `useArm` inside `ui/CastleWorks.jsx`, so the
battle card and the campaign map both get it.

One castle for the whole campaign: the treasury's works stand at every level
of every realm (`loadCastle`/`saveCastle` in `src/data/campaign.js` map any
chapter id to the `crown` castle; Free Play's `free:<realm>` scopes all map
to one `free` castle). Old per-chapter saves fold in by taking the best tier
of each work. The wall's bowmen draw only while they have something to
shoot: `castleCd.loosed` (update.js) holds each one's last shot, and
render/castle.js stands them at ease (`rest`, now and then `reach`) after.

The Levy (`militia` in `CASTLE_WORKS`, owner request 2026-09-30) drills the
free militia horn: four tiers at 5000 / 10000 / 15000 / 25000 (8000 / 12000 / 18000 / 25000 until 2026-11-18). Each tier
names the whole band (count 3 / 4 / 4 / 5, `men` health 105 / 125 / 170 /
230, `dmg`, `rate`, `range`, `cooldown` 22 -> 16 s). **The men have no clock**
(owner, 2026-10-05, the same as Hale's levy): they stand until they fall,
and sounding the horn again (cooldown up) replaces whoever is left with a
fresh band (`callMilitia`); a band with no one standing is dropped (update.js);
the tiers' old `life` is gone, `MILITIA.life` is Infinity; tier 0
(nothing bought) is `MILITIA` in bands.js, exactly as it always was, so old
saves change nothing (`loadCastle` fills any missing work with 0). The
engine reads it through `militiaStats(works, ranks)` (bands.js), used by
`callMilitia` (actions.js; counts of 4+ get their own `MILITIA_STANDS` slots,
the last tier wears the squire rig via `band.rig`, enemies.js) and by the
HUD button (cooldown drain, tooltip). The endless rank is +40% health and
blows. **The upper tiers are a mixed band** (owner, 2026-10-02): tier 3 (18000,
"Swords and shortbows") is four men, two swordsmen (`yeoman`, a farmer rig with
a sword, 170 health, 19 a blow) and two archers; tier 4 (25000) is five, three
knights (`squire` rig, 210 health, 24 physical a blow: less of both than a
Paladin Order's 280 / 36 magic) and two archers (`bowman` rig). A tier's
`bows` is how many of `count` are archers (the LAST units, so the rear stands
of `MILITIA_STANDS`), `bow` their health / blow / rate / reach (physical
arrows), `bowRig` their kit; `callMilitia` marks them `u.bow` / `u.rig`, the
band loop in update.js runs the two halves as `runMelee` and `runRangedBand`
over the same units, `drawBandUnit` reads `u.rig`. Tiers 1-2 are unchanged
pitchfork farmers. `sim.mjs --levy N` plays a level with the Levy at tier N.
Provisional. A new work needs: `CASTLE_WORKS` + `emptyWorks` + `rankLabel`/`ranked`
(castle.js), `NO_WORKS` (campaign.js), `WORK_ICON` (ui/CastleWorks.jsx), and
the `castleKey` string in CrownguardGame.jsx's HUD sync.

## Court Wizards; the Gate Guard sweeps instead of oil (2026-11-18, owner request)

Provisional, pending the owner's playtest. A sixth castle work, **Court Wizards**
(`wizards` in `CASTLE_WORKS`): 1 / 2 / 2 mages (the Wizard Spire's pix figure) on the open
tops of the wall's towers nearest the gate (`wizardSpots`, castle.js; skips a tower a short
wall's bowmen took, falls back to free walk slots), each on his own clock (`castleCd.wiz` /
`wizAt`, update.js after the ballista), casting a magic orb at the most armoured foe within
`range` of the gate (then the nearest; never neutral or submerged monsters). Tiers 10k
(45 / 1600 ms / 270 road steps), 15k (52 / 1500 / 285), 25k (60 / 1400 / 300, `chain` 2 within 80 at 0.6
a bounce: the orb BOUNCES on to the next foe in a low arc, `hop` on the projectile, fx.js lifts it, and bursts in the arcane blast's look where it lands, so a tier-3 cast shows two bursts after its first hit; the blow stays single-target; owner: no lightning). Ranks +40% damage. Icon
`StaffIcon`. The Gate Guard's tier 3 is now **Halberd sweeps** (owner picked it over
murder-hole stones, a fourth man, a portcullis slam): `sweep: { every 6000, r 46, dmg 45,
stun 800, mounted 2 }`, each halberdier on his own staggered clock, only with a ground foe in
the half-circle before him, Captain Hale's `swing` (reached as `HERO_HOOKS.hale.halberdSweep`:
importing hale.js into update.js is an import cycle that breaks the page at load, though the
build passes). The oil and its cauldron are gone. `sim.mjs --works wizards:3,guards:3` sets any
works (prints `wizard-casts`, `sweeps`). Ironford `--endure` seed default: no works 720 / 545,
archers:3 542 / 309, wizards:3 555 / 376 (Iron's pips eat magic). `works-lab.html?works=...`
snaps the gate on the real engine. The wall archers and the ballista skip sea monsters too (`neutral` / `submerged`, owner, same day), like the wizards. `reach-lab.html?realm=&horn=` rings every work's reach and targeting over a board (top tier solid, first tier dashed); `&mode=road` draws the same numbers as steps along the road from the gate (an idea put to the owner, 2026-11-18).

## The wall shoots by road steps (2026-11-18, owner request)

"I do like the step way better": the Wall Archers', Gate Ballista's and Court Wizards' reach is
counted in STEPS ALONG THE ROAD back from the gate (`TOTAL_LEN - e.dist`; fliers walk the road too;
a river swimmer, with no road distance, by the straight line), not a circle round the gate, so a
winding board (the Citadel) no longer gives more than a straight one (Ironford). `steps` in
update.js's castle-works block; "nearest" (archers, the wizards' tie-break) is fewest steps too.
Owner's numbers for the top tiers: archers 400, ballista 500, wizards 300 (lower tiers scaled:
340 / 380, 420 / 460, 270 / 285). Measured `--endure --works archers:3,ballista:3,wizards:3`,
seed default, old circle -> road steps: Ironford 323 / 183 -> 287 / 232, ir5 1890 / 1377 ->
1970 / 1035, gw3 61 / 24 -> 51 / 22 (noise). `reach-lab.html?realm=` draws it (`&mode=ring`
the old circles). Provisional, pending the owner's playtest.

**Wall Archers have four tiers** (owner, same day): two bowmen, three (18 a shot, 850 ms,
360 steps), four longbows, heavy crossbows (now 5k / 10k / 15k / 25k) (reach 340 / 360 / 380 / 400). Saved castles
carry `_v` (campaign.js `WORKS_V` 2, `upgradeWorks` in loadCastle): a save without it moves an
archers tier of 2+ up one, so nobody loses what they bought. Re-cutting any work's tiers again:
bump WORKS_V and add its step there.

**Every castle work re-cut to four tiers** (owner, same day; the Levy's tiers unchanged; provisional, pending
the owner's playtest; costs, the Levy's too: 5k / 10k / 15k / 25k):
- **Gate Ballista** (reload x1.5 the same day, owner: 4800 / 4500 / 4350 / 4200 ms a ballista): one, twin, **shield-breaker** (`breaker` {amp 0.25, ms 5000}: every blue pip
  knocked off, then the falconer's mark fields `markUntil` / `markAmp`, so every blow lands 25%
  harder), **chain harpoon** on top of it (`pin` 2000: the bolt holds its foe where it stands,
  `e.pinUntil`, read as `held` in the movement; bosses and rams too, so the column waits). The fire
  bolts are gone. (Tiers 3 and 4 swapped by the owner the same day.)
- **Court Wizards:** one, two, bounce, **force orbs** (`push` 25: the first mark is thrown 25 road
  steps back and released; never a boss, ram or swimmer; dmg 72).
- **Gate Guard:** two, three, **braced plate** (`armor` 0.3 off every blow on them, a ram's crush too,
  via runMelee / `trample`'s `host.st.armor`; `brace`: a cavalier's charge breaks on the halberd, the
  man keeps his feet and holds the rider), **sweeps**. (Four men was tried and dropped: `guardSpots`
  still has a 4-post line.) The thicker gate (castle life) left them for the Masons.
- **Masons' Guild: barricades are PLACED, like the militia** (owner, same day: "a rechargeable barricade
  ability ... select them to place it where you want on the road"): the tray's **Barricade** button
  (CrownguardGame.jsx `barricadeBtn`, shown while the guild is built, a draining recharge like the
  militia's), then a tap on the road: actions.js `placeBarricade` sets ONE row of frames across the
  road there (`rows` 1 / 1 / 2 / 2 standing at once, a new one takes the oldest down; `cooldown`
  a flat 60 s every tier (was 40 / 35 / 30 / 25; frames x0.85 the same day: 128 / 255 / 408, owner), `g.masonCd`, ticked beside the militia's, kept by a retried wave). Refused (the
  tap keeps it armed): off the road, within 70 of the cave, past the Gate Guard's line, on or within 12
  of a bridge deck, within 26 of a standing row. Tiers: wood (150), iron + thicker gate (300, +5 life),
  steel + two rows (480, +5 more: 10 in all), then mend 2 a wave and the net launcher (it catches
  fliers over ANY standing row). No more gold repair and no free rows at the gate: rows keep their
  damage, a wholly broken row lies as a wreck 6 s then is cleared (update.js `syncBarricades`, which
  also re-materials standing rows when a tier is bought). `sim.mjs` sets one 100-240 back from the
  gate whenever ready (prints `barricades`; Ironford's bridges refuse every try). Citadel Gate,
  masons:4 guards:4: 87 / 63 rows a level, 20 / 14 fliers netted. The net launcher (`net` {every
  15000, hp 240, zone 30}): a flier within `zone` road steps of a standing row, never a boss, comes
  down into the net on the road (`flying` off, `e.net` {hp, maxHp}, held, no halberdier grabs it) and
  flails at it with its own blow (`max(15, atk, airAtk)` every `atkRate`, its fight clip plays) until
  the net breaks, then flies on; killed in it, the net goes with it. The net's look is
  `src/render/netlook.js` (`netify(cv, S)`, a Sonnet artist): the silhouette grown and rounded, open
  hemp mesh with knots, a 2 px rim rope, 5 px stone weights ~16 apart; it returns a bigger canvas with
  `.pad` (11 art px) and rigs.js places it. `net-lab.html` shows every flier; `net-anim.html` records
  a video sample (rename the saved .png to .mp4). Art for the rows: barricade.js `mat` looks + a wreck;
  each hurt frame shows a health bar UNDER it in a pale stone rim (`drawBarricadeBars`, drawn after the
  crowd in draw.js), so it is never hidden by, or mistaken for, the foes' bars above their heads.
- **Friendly health bars** (owner, same day): the hero, halberdiers, militia, retinue and the
  barricades show the knights' pale-blue bar (red at 40% and under; enemies.js `FRIEND_BAR`) ONLY while
  below full health, hurt or being mended, and it goes at full. The hero's bar used to show always (his
  level badge still does).
- **The chain harpoon** (owner, same day; a heavy chain in flight was tried and called "horrible"):
  only EVERY THIRD bolt of the tier-4 Ballista pins (`cd.balShots`); it flies as a plain bolt. Where
  it strikes it stays in the foe at the angle it flew (`e.pinAng`, fx.js `drawStuckBolt`), and a light
  chain (single-pixel links) shoots from it to a small stake in the road 32 steps behind the foe in
  140 ms, holds taut while the foe walks in place at half pace, straining (enemies.js `strain`), then
  SNAPS (a flash at the break, the stake's half drops, the bolt's half whips back, links fly) (`src/render/chains.js` `drawPinnedChains`, over the crowd).
  **Bosses are never pinned** (owner: "the dragon was just completely nullified").
- **The hero, Masons and militia are back in the tray's foot** (owner, 2026-11-24, option A of three).
  From 11-18 they stood on the board's bottom right beside the castle band; on a phone that row covered the
  road's end and the gate on the 13 campaign maps whose road ends low (Barrowfields, Grave Road, Cairnfields,
  Crowstair, Ice-Fjord, Barrowdowns, Drakesfell, Foxmere, Oakmere, Goblin Warrens, Reedmaze, Lantern Fen,
  Drownholm), so keep them off the board. The foot (CrownguardGame.jsx, "foot", after `talentPanel`): the hero
  on a full-width row (portrait, name without title, level, health and xp bars), Masons and militia sharing the
  row under him half each (`HALF`, 50 tall; the hero 56: icon beside a label that turns into the recharge countdown). The
  Masons' icon is a sculpted pix hammer (`ui/PixHammer.jsx`, pix.js with a fixed upper-left sun); the horn's is
  the man the Levy's tier raises (`militiaStats().rig`). `ui/CrewIcon.jsx` (the pix mason) is unused now.
- Any new tray aim (`g.rallyFor` string) must be added to the game loop's keep-list in
  CrownguardGame.jsx (the line that clears an unknown `rallyFor` every frame): "barricade" was missing
  at first, so the Masons' button did nothing.
- Old saves: `WORKS_V` 3 moves an old ballista / guards tier 3 (fire bolts / sweeps) to the new 4.

**Refunds** (owner, same day: "refunds full amount no penalty", then "just one button at the top"):
the Castle Works list has ONE "Refund every work" plank under the purse (two taps, `onRefundAll`),
shown while anything is built: every tier and endless rank comes off at the full price paid
(castle.js `worksValue`). Treasury: CrownguardGame.jsx `refundTreasuryAll` (title screen and campaign
map); in battle `refundAllWorks` (actions.js `lowerAllWorks`, step by step through `lowerCastleWork`;
a thinner gate takes its lives back, never below 1). Free Play's castle is shared by every run, so
works bought in one run refund into another run's purse.

## Regen, Wren, shamans, the dock (2026-09-30, owner requests)

Provisional, pending the owner's playtest (sims barely move: the only
measured shift is gw5's swarm doctrine, 50-60 -> 100-135 castle damage, from
the shamans now walking in the thick of the warband).
- **Passive regen:** every hero heals `HERO_REGEN` 1.2% of max health a
  second (3% when not fighting, `HERO_REST_REGEN`); a Knight Hall's men
  `KNIGHT_REGEN` 1% / 2.5% at rest (all in `src/data/bands.js`; read in
  update.js's hero branch and `runMelee`). Retinue and militia do not regen.
- **Wren is not invisible:** `runRangedBand` lets a hero or retinue archer
  hold one foe that walks within `RANGED_ENGAGE` (22) of her (`blockedBy`,
  like a knight's): it stops and strikes her at its own pace, she keeps
  shooting (the engaged foe first). Rams, fliers (not wraiths), swimmers and
  foes with no melee `atk` pass her.
- **The goblin shaman walks amid a group:** `escort: { type: "shaman",
  gather: true }` in factions.js; `gatherEscort` (waves.js) marks every
  scripted/generated shaman group `amid` the wave's biggest group of rank and
  file (gap 0), as the magister walks; he also has `packRange` to keep the
  column's pace. A wave with only trolls/bosses keeps him as written.
- **River Watch is a dock:** `buildableAt` demands `atWaterEdge` (terrain.js:
  within `DOCK_EDGE` 8 px of a river bank, the same inside a pond's rowable
  ellipse, or within ~22 px of the beach). Its skiffs row only `PATROL_LEN`
  (`W / 3`) of a river or the coast, centred on the dock and slid inside the
  route's ends (`patrolOf`, terrain.js; used by `launchSkiffs`, update.js, and
  `watchRoute` / `drawWatchWater`, waterreach.js, whose lit water is clipped
  to the same stretch). A pond's ring is rowed whole.
  **Each skiff takes her own order** (owner, 2026-09-30): `u.aim` on a unit
  (null = follow the hall's `t.aim`), read in update.js's River Watch loop;
  the tray's targets list gains an All / 1 / 2 / 3 row (`fleet`, `who` in
  `TargetsBar`), the bar reads "Mixed" when the boats differ, and the board
  lights the boat being ordered: a big
  blue caret, never hidden by a sister (`g.skiffPick`, waterreach.js `CARET_PICK`). Choosing All clears every boat's own order.
  Skiffs are numbered by their place in `t.units`, not along the river.
  Provisional, pending the owner's playtest.
- **Wren's Arrow Volley** (owner, 2026-10-02: "faster, less total arrows,
  faster reload, fall from the direction of Wren, hit harder"): 4 flights
  (`beats`) of 24 +4/level, `gap` 280 ms after a 220 ms `lead`, each
  landing `flight` 460 ms after it leaves the string; cd 18 s (was 10 x 14
  over 3 s on 30 s). `u.volley` (actions.js) holds her normal shots and
  plays the rig's `sky` sheet (rigs.js passes `sky`; rigs-crown.js swings
  the bow draw up by `SKY_AIM` about each shoulder; `volleyFrame` in
  render/enemies.js). draw.js flies the shafts up from her bow, down on a
  slant from her side, and leaves them stuck till the volley fades.
  `joint-lab.html?set=crown&only=heroHunter` shows the sky frames. The sims
  never fire abilities. Provisional.
- **Masons' barricades** (owner, 2026-09-30; since 2026-11-18 they keep their damage and are repaired for gold, see "Court Wizards" above): after every wave the Masons'
  Guild (castle works) sets spiked stake frames, one a lane, across the road
  before the Gate Guard: tier 1 one row (150 hp a frame, 5 thorns a blow),
  tier 2 a second row (280, 9); endless ranks +40%. `syncBarricades` /
  `barricadePass` (update.js) rebuild them whole whenever the build phase
  opens; a walker with a blow (`atk` > 0) halts before its lane's frame and
  hacks it down, pricked at each blow; rams smash through, fliers pass.
  Art: `src/render/barricade.js` (look at it with `barricade-lab.html`).
  Wren's archers now join at 10 and 15, like Aldric's squires. Provisional.
- **Knight Halls post themselves** (owner, 2026-09-30): `defaultRally`
  (engine/towers.js) puts a new hall's rally flag on the nearest point of the
  road's centre line, slid onto the rally circle's rim if the road lies
  beyond it. A retried wave (`snapshot`) now keeps the flags you posted. New
  men step out of the hall's door and march to the flag, and the build phase
  runs garrisons (`runMelee`, update.js) so they move before the horn too.
- **Barricades sit clear of the halberdiers; the castle is hit at the gate** (owner, 2026-10-02): the first frame is `SPIKE_FIRST` 66 back from the Gate Guard (was 36), so a foe held at it stands 62+ px from them, past their seizing reach (range x 0.92, at most 48), and they only walk out once a frame breaks; castle archers and the ballista still shoot it. A foe that gets through now costs a life at `TOTAL_LEN - LEAK_BACK` (20, x ~736, just behind the halberds) instead of 18 px inside the gate, where it used to vanish into the arch first. Provisional.
- **Burns cut to 75% of their old damage a second** (owner, 2026-09-30;
  durations unchanged — a brief 2.5 s-for-all was reverted): `burn`, `mBurn`,
  `igniteBurn`, `logBurn` x0.75 (towers.js, the castle ballista's fire bolts),
  and the Dragon's Breath musket's hot shot lowered again, 24 -> 12 a second
  (~41 a hit). The owner's aim is ~40 total damage per application on average;
  with the cut the 22 burns averaged ~29. Then (same day) the Log Roller's
  burning logs were halved (20 -> 10 a second, ~30: it hits everything) and
  Dragonbreath raised 6 -> 13 a second (~20). Fire pools and the 1.3 s spread are untouched.
- **Sir Aldric's health doubled** (owner, 2026-09-30: "he goes down real easy"): base 280 -> 560, +84 a level (was 42); his regen scales with it. gw3 sims bled a little less (~35-45 vs 50-75).
- **Raised foes are bone** (owner, 2026-09-30): the rigs' `revived` variant (`revive` + `boneify`, render/rigs.js) turns flesh to ivory bone with rib-like bars, cloth to dark rags, eyes left witch-fire green. Done on the finished bake, so every rig gets it; see it with `hrd-lab.html?m=[["orc",0.32,0,{"revived":true}]]`.
- **Corpses lie only for their wave** (owner, 2026-10-01; before that they never faded and piled up): each carries the wave that felled it (`wave`); clearing a wave (or a sandbox summon fight) sets them dissolving (`dissolveCorpses`, update.js: `fadeAt`/`fadeMs` 1800 ms, `remains.js` drops the bones out piece by piece), and a necromancer raises only corpses of the CURRENT wave that are not dissolving. A raised body is untouchable while it climbs out (`isRising`, towers.js: no tower, band, skiff, blade or castle archer targets it and `dealDamage` ignores it until `riseAt + riseMs`, owner 2026-10-01; wraith risings too). The fallen a necromancer can raise (goblin, wolf, orc, ironclad, boar rider, troll; never a boss or champion) lie where they fell until raised, (raised at full health since 2026-10-05) (`CORPSE_CAP` 120, oldest give way, actions.js) and rise slowly (`NECRO_RISE_MS` 2200, update.js: held on the spot, sunk and faded in as a wraith's rising is, then they walk) and are drawn as a scatter of bones (`render/remains.js`; `hrd-lab.html?c=1`).
- **Fewer wraiths** (owner, 2026-10-01: "pretty hard"): the Hollow script's four wraith waves 6/7/10/7 -> 4/5/7/5 (war-waves 6, 11, 14, 17) and the endless roster's wraith cost 3 -> 4 (rarer). Still not fielded before wave 5 of a level (ghouls stand in). They also never stream in closer than 1.5 s apart (`minGap` on the enemy, waves.js `gapFloor`): the swell used to bunch the Cairnfields' nine into one lump. Provisional.
- **Fewer, weaker wraiths; the Brazier Wheel burns them** (owner, 2026-10-02): the script's wraith waves 4/5/7/5 -> 3/3/5/3, the endless roster's cost 4 -> 5, `CROWD_WEIGHT` 0.45 -> 0.3, blow `atk` 26 -> 23 (~-11%). The Brazier Wheel's three stat blocks carry `scorchHaunts` (towers.js): its flame ring (magic, already) now also targets and strikes a `haunts` flier — the wraith — though the wheel stays blind to every other flier (`pickTarget` and the nova loop in update.js). Provisional.
- **Knight rally flag reach +25%** (owner, 2026-10-02): `RALLY_RANGE` 72 -> 90 (constants.js; drawn circle, flag placement, `defaultRally`). The Covert's flag keeps 72 (`ASSASSIN_RALLY_RANGE`). Provisional.
- **Bladewheel reach -20%, every step** (owner, 2026-10-02: one Steel Tempest at the Cairnfields' gate "was beating the whole thing"): `range` x0.8 on all nine steps of the hall, both paths included (66-93 -> 53-74; it is also how far the spikes fly and how wide the flame ring is). Steel Tempest's pierce is 2 (was 4). Spikes a volley then went 10/12/14 -> 6/8/10 (levels), Razor Gale 14 -> 10, Steel Tempest 18 -> 12, Hamstringer 16 -> 10 (the Tempest still leads its path). Then `dmg` x0.8 on every step, and the Brazier branch's `burn` too (Tempest 18 -> 14; Brazier 43/76/52 -> 34/61/42, burns 9/14/12 -> 7/11/10). Provisional.
- **Necromancer stands off and raises at full health** (owner, 2026-10-05, provisional):
  raise reach infinite (any of the wave's corpses on the board), every 3 s
  (`raiseEvery` 3000), the first at once, raised at FULL health (was half; the
  bounty is still half); the clock restarts only when a raise lands, so he is
  ready the instant a corpse exists. `standOff: 100` (enemies.js; update.js):
  like an archer he halts while any friendly soldier or hero is within 100
  (archers 98-100 now, same `pauseLeft` budget, 30 s since 2026-11-08), but he never shoots. He was
  `atk: 0`, but soldiers still seized and beat him while he never struck back
  (owner, 2026-11-07: "militia took them out no problem"), so he now has
  `atk` 30 every 1100 ms (his fight sheet plays it); gw5 `--endure` seeds 1-2
  barely moved (swarm 155/149 -> 155/203, burst unchanged). Measured `--level gw5 --endure`: swarm 58 -> 119,
  burst 957 -> 1121 castle damage (noisy). Ordinary towers never had a prey
  priority (`pickTarget` follows the tray's order only); the Covert's contract
  orders (Support / Healers / Raisers ...) are its tray choices and stay.
- **Necromancer buffed** (owner, 2026-09-30; the figures below are the older ones): hp 420 -> 700, raises every
  3.8 s (was 6), up to 5 fallen a cast (was 3) within 400 (was 150; later rounds of buffs: 170, 260, 400). gw5
  swarm doctrine 100-135 -> 165-254 castle damage; provisional.
  He also walks BEHIND his wave's groups now (`raisersLast`, waves.js), so
  there are fallen to raise; speed 52 -> 44 (Ironclad 55 -> 47), his reach 260 -> 400
  (the fallen lie ahead of him), and ironclads, boar riders and trolls now
  leave corpses too (`CORPSE_TYPES`, actions.js: before, a necromancer walking
  with ironclads had nothing to raise).

## The newer heroes (2026-10-02, owner's picks)

Brother Osric (battle friar), Captain Hale of the Watch and Ysolde the
Stormcaller joined Aldric and Wren. Each keeps everything in files of its
own, so several sessions can work on heroes side by side:
- `src/data/heroes/<key>.js` — the whole sheet (`hero`, `abilities`,
  `talents` with `abilityLine` from `data/heroes/kit.js`, `retinue`),
  merged into HEROES / HERO_ABILITIES / HERO_TALENTS / HERO_RETINUE by
  bands.js. An ability may carry `aimHint` (the aim ribbon's words for an
  `aim: "foe"` ability).
- `src/engine/heroes/<key>.js` — hooks the shared engine calls (header of
  `engine/heroes/index.js`): `fire` (actions.js fireHeroAbility), `tick`
  (the hero branch of update.js's bands; true skips the fighting),
  `world` (every frame), `shoot` (a ranged hero's shot, runRangedBand),
  `strike` / `hurt` (runMelee and the held foe's blows), `buffs` (after the
  Support halls clear and lay atkBuff), `reset` (a retried wave).
- `src/render/heroes/<key>.js` — `pose` (enemies.js), `under` and `fx`
  (draw.js). Figures in rigs-crown.js (style guide, "The newer heroes'
  figures"). The hero's rig is `HEROES[key].rig` everywhere.
- A new hero: a data file, an engine file, a render file, a rig, an entry
  in each of the three index files, icons in `ABIL_ICON`
  (CrownguardGame.jsx), and the title crowd's WALKERS/HEROES sets
  (ui/titleCrowd.js). The pickers (campaign card, pause menu, Change hero,
  Skills & Heroes, Free Play) lay out any number of heroes as portrait tiles.
- **Osric**: holy blows (`st.magic`) + `smite` on the undead (`isUndead`:
  Hollow faction, raised, wraiths); mends soldiers near him; Sanctuary
  (heal ring, sears and stuns the undead, dazes the living), Consecrate
  (blessed ground; its burn 45 +8 a level -> 25 +4 a second, owner 2026-11-20:
  it wiped whole floods). Templar retinue (paladin rig).
- **Hale**: `holds` 3 foes at once and sweeps them all. **Halberd Sweep**
  (id `brace` kept for saved talents; owner, 2026-10-05): three swings
  (lead 260 ms, gap 520, both x game speed), each striking EVERY ground foe
  in the 180-degree half-ellipse before him (reach `r` 68, depth x0.7):
  40 +6/level physical, 700 ms stun, riders x2, a rider's trample spent on
  it, he takes 0.6 harm while it lasts. He is PLANTED for all three swings
  (owner, 2026-10-05: feet and facing locked at the press; `tick` pins them
  and skips runMelee, held foes still strike him) and plays the rig's own
  `sweep` sheet (six frames, `SWEEP` + its grips in rigs-crown.js: guard,
  blade drawn back, blade coming round, strike, follow-through, recover;
  keyed in render/heroes/hale.js `pose`). Drawn as a steel arc (alternating
  fore/backhand) plus a dotted reach ring. **Since 2026-11-24 a WHIRLWIND**
  (owner: "3 full spins, same timing as now, but they hit 360 around him"):
  `full` on u.brace strikes all round him (the Gate Guard's sweep, which
  shares `swing`, stays a half-circle); he turns one revolution a `gap`, and
  each foe in reach is struck as the blade passes its bearing, once a turn
  (owner, same day: "only get hit as the circle spins past them";
  `spinStrikes`) (`spinAt`, render/heroes/hale.js, the one
  clock for body and trail). `pose` shows him from the side (sheet `spin`,
  mirrored by `face` as the blade goes left), front (`spinFront`) or back
  (`spinBack`) by where the blade is; a hero's `pose` may now return `face`
  (enemies.js). The figure's own `spin` clips (fig-captain.js, FRONT / BACK in
  fig-captain-views.js; brief `art/briefs/hale-whirlwind.md`); without them
  pixrigs.js shows the sweep's strike pose and the views' stance. The trail is
  a steel ring at the halberd's height, far half under the figures, near half
  over. **Sound the Levy** (aim none now):
  2 watchmen (halberdier) + 2 crossbowmen (`crossbow` rig, `bows` mixed band
  as the Levy works' upper tiers) fall in ON him, soldiers a step ahead, bows
  behind; the buff ring is centred on him, the pennant planted by his shoulder.
  The crossbows take post `BOWS_BACK` 44 px back down the road from him (not
  on his spot; `bowPosts` in engine/towers.js) and are engaged like Wren (see
  "Bowmen post back and are engaged", below).
  They have no clock and never respawn: they fight until they drop (owner,
  2026-10-05), and sounding the horn again (when the 45 s cooldown is up)
  replaces whoever is left with four fresh men; a retried wave drops them.
  **They move with him** (owner, 2026-11-24: "If he moves up to attack, they
  follow"): `followLevy` (engine/heroes/hale.js `world`) re-forms the band on
  him whenever he is 6 from its rally: rally on him, watchmen 15 to either
  side across the road, crossbows `bowPosts` back from him. Their circle is
  then round him: they hold free foes coming at him and, with none, gang up
  on his (runMelee's ganging-up). Dead, he leaves them at the last spot.
  `hale-lab.html?fire=brace|levy` snaps either on the real engine. Provisional.
- **Ysolde**: ranged magic lightning that chains and prefers bare targets
  (magic glances off pips); Chain Storm (aim foe), Thunderclap (aim
  ground, a thunderhead then a stroke; fliers twice). No retinue.
- Measured (sims, best post and doctrine, seeds 1-2; abilities never fire
  in sims): each sits level with Aldric/Wren overall — Osric ahead in the
  Hollow, Hale ahead in the Iron Marches, Ysolde weak against Iron shields.
  Sound the Levy measured the strongest of all six abilities (`men`/`life`
  are its levers). All provisional, pending the owner's playtest.

## Sound and music (2026-10-01, owner request)

Everything is synthesized live, no audio files. Target for the music: the
**Pokémon Ruby/Sapphire (GBA)** sound — warm sampled-sounding flutes, reeds,
strings, harp, brass, a bouncy melodic bass and a small crunchy kit, not bare
chiptune.
- `src/audio/settings.js`: ONE store for sound settings (saved in
  localStorage, key `crownguard.sound.v1`; old `{muted, vol}` saves load
  unchanged, `vol` = effects volume). `SFX_GROUPS` are the menu's per-effect
  switches (Gold plink = `coin` + `payout`, Arrows, Blows); add a name there
  to give an effect a switch. `ui/SoundPanel.jsx` is the UI: the Sound tab
  of the SETTINGS window (see "The Settings window" below).
- `sfx.js`: the effects (`LIB`), unchanged recipes; shares its AudioContext
  with the music (`sfx.audio()`).
- **Every sound is unplugged once it has played** (2026-11-25, owner: frames fell to ~10 on the
  level after a won one, a restart fixed it): WebKit (Safari, the iOS app) never frees a CONNECTED
  AudioNode and its audio thread keeps working through all of them, so every note and effect ever
  played stayed in the graph (~60-120 new nodes a second of battle). `src/audio/tidy.js`: play a
  voice or drum through `voiced(ctx, (c) => VOICES.x(c, out, ...))` (it notes every node made and
  unplugs them all when the last source ends), or `letGo([nodes])` for hand-built ones; a dropped
  track unplugs its whole strip (out, each part's gain, panner and reverb send). Any NEW way of
  making sound must go through one of them. Measured in Chromium: connected nodes stay ~90-140
  through a battle and the next level (before: every node ever made). Not yet seen on a device.
  **The pile-up guard** (2026-11-26, the owner's first `slow` report: 23,174 nodes still plugged in
  with tidy.js in place): tidy.js HOLDS every waiting group (a strong reference, so WebKit can't
  collect a source and its "ended" listener) and SWEEPS one whose "ended" hasn't come 20 s of audio
  time (or 45 s of real time) after it was made (the longest note in any track is 8 s), counting it
  in `TIDY.swept`; `letGo(nodes, done)` calls `done` once either way (sfx.js counts its voices with
  it, so a lost "ended" can't silence the effects). sfx.js builds NOTHING unless the context is
  `running` and `wake`s a "suspended" or iOS "interrupted" one (at most once a second, the refusal
  caught; every tap tries too, music.js `unlock`); music.js schedules notes only while it runs. The
  crash report's sample keeps `audioState` and `audioSwept`. Checked in headless Chromium: 200 groups
  with no "ended" all swept; a stopped context refusing to wake built 0 nodes for 100 effects; a
  Ravenscar battle stayed at 50-115 waiting nodes with 0 swept.
- `music.js`: the sequencer + mixer (reverb, compressor), crossfades, pauses
  with the tab, starts on the first tap. `instruments.js`: the voices and the
  drum kit (`VOICES`, `DRUMS`); one owner. `notation.js`: the text notation
  (read its header) and `compileTrack`; pure, so Node can use it.
- Tracks are text in `src/audio/tracks/<area>.js` (arrays gathered by
  `tracks/index.js`). Ids: `<area>-build | -fight | -boss` for greenwood,
  iron, hollow, rime (zone IV: G dorian 6/8 "The Grey Swell", B minor
  rowing "Longships", F# minor "The Rime Jarl"; lute + glassy pad and one
  shared horn call are its own sound), plus `title`, `map`, `victory`, `defeat` (the jingles have
  `loop: false`). `audio/score.js` decides what plays when; the faction
  picks the area (free-play realms use their faction's).
- **One piece per battle** (owner, 2026-10-02: no switching and restarting
  between waves): the campaign map plays the open card's realm `-build`
  (`mapScore`, CampaignMap), which runs on unbroken into the level until the
  first horn; from wave 1 the `-fight` theme plays through every wave AND
  the build phases between them (`battleScore`, called each frame only while
  `screen === "game"` — the main loop runs on every screen, and before that
  gate it overrode the title music). A boss on the field takes over with
  `-boss`; a looping track faded out remembers its bar (`places`, music.js),
  so the fight theme picks up where it left off; `music.forget()` (initGame)
  starts a new battle from the top. The `map` track is unused now.
- **Tempo and weight** (owner, 2026-10-02: "too upbeat"): normal waves are
  background music — the `-fight` tracks sit at 92-100 bpm with quarter-note
  bass, one timpani stroke a bar, a soft kit (no sixteenth hats or snare
  rolls) and the leads turned down; the `-build` tracks are slower still
  (76-88). Only the `-boss` tracks drive (112-132). Keep new tracks inside
  that ladder.
- Check tracks with `node scripts/music-check.mjs [id]` (parses, fits,
  instrument ranges, key). Listen with `music.html` (play live or download a
  WAV); `lab.send(id)` + `node scripts/music-receive.mjs` saves a WAV into
  `samples/` (gitignored), and `afconvert -f m4af -d aac` makes a phone-sized
  m4a. Nobody can hear a track from a shell: the owner's ears decide.

## The Settings window (2026-10-01, owner request)

`ui/SettingsPanel.jsx`, opened from the title screen's SETTINGS button and
the pause menu's Settings button. A new tab is one entry in its `TABS`
(`needsReset: true` for one that needs the `onCampaignReset` handler).
- **Sound**: `SoundPanel` (audio/settings.js).
- **Display**: screen shake and floating numbers, in `data/prefs.js`
  (`crownguard.prefs.v1`). draw.js reads `prefs.shake` / `prefs.floats`; the
  HUD half is two flags on `<html>` (`data-no-shake`, `data-no-floats`) that
  hud.css reads. A new switch: a field in prefs.js DEFAULTS, a read where it
  matters, a `Switch` in `DisplayPanel`.
- **Progress** (both; from the pause menu it warns that these end the
  battle, and a campaign started over leaves for the map): a save code (`data/backup.js`: every
  `crownguard.*` key plus `cg-type`, base64 behind `CROWNGUARD-SAVE:`) to
  copy, share or paste; Restore replaces the device's save whole and
  reloads. "Start the campaign over" (was the campaign map's Abandon button,
  now gone from the map; over a save the title screen leads with CONTINUE
  and its NEW CAMPAIGN takes two taps) and "Erase everything" (reloads). Every one of
  these is two taps. A new saved key under `crownguard.` travels in the code
  with no change.

## Balance and testing

- `node scripts/sim.mjs --level <id> --endure` — castle damage per wave for
  a campaign level (both army doctrines); `--all`, `--ledger`, `--perf`.
- `node scripts/marathon.mjs --realm thornbrook --to 160 --endure` — a long
  Endless run with all 13 halls and all 52 final forms; reports engine
  errors, per-form damage and income.
- `node scripts/sim.mjs --chapter iron` runs one chapter's levels. The
  sims are noisy (the commander's plan swings with the dice): judge a
  change on several `--seed`s, not one run.
- Levers: the crowd (`crowd`, `CROWD_WEIGHT`, `crowdScale` per faction —
  Greenwood 1, Iron 0.6, Hollow 0.6 — `overlap` in
  `src/data/waves.js`), `SPLASH_CAP` in `src/engine/update.js`, bounty cap and
  wave bonus, per-level gold in `src/data/campaign.js` (and
  `levels-iron.js` / `levels-hollow.js`), tower stats in
  `src/data/towers.js`, castle works and endless ranks in `src/data/castle.js`.
- The Iron Marches were retuned 2026-09-27 to be clearly harder than the
  Greenwood from the first level (the owner beat them "with minimal towers"):
  bigger script counts (factions.js), tougher bodies (enemies.js), three
  shield pips on every levy, the Aegis Magister and gryphon riders that fall
  and march on. (2026-09-28, the owner: the Magister "went down real easy" —
  he now shields himself too, every 10 s. The better doctrine per seed barely
  moved; an all-heavy-hitter army bleeds far more at the Citadel, since each
  pip eats a Longbowman's shot whole.) Measured with `--endure` over 4 seeds, taking the better of
  the two doctrines per seed: 1-32 castle damage a level (it was 0-4), while
  a one-sided army bleeds hundreds — the chapter asks for a mix. Crowd 0.7+
  or the magister at every 22 heads blew the late levels up tenfold; the
  bleed sits in each level's OPENING waves, so start gold (and a level's
  `window.from`) is the finest lever there.
- Shields (`guard`, the blue pips): only steel breaks them (owner,
  2026-09-28). Each PHYSICAL blow takes one point and is swallowed WHOLE
  (actions.js dealDamage); while any point stands, magic blows glance off
  (no point lost) and every damage-over-time (burn, poison, cold, lava,
  beams, flame jets) does nothing. Measured the day it landed (Iron
  chapter, `--endure`, best doctrine per seed): castle damage went from
  1-32 a level to 44-2225, and an all-physical army from 2-470 to 16-990 —
  the Magister's aegis (3 pips on everything within 140, every 10 s) makes a
  column magic-proof unless steel strips it; levies at 2 pips helped only
  the opening levels. The owner's call: keep the rule and the Magister's
  3 pips, shrink his aura (`wardRange` 140 → 80) — "choosing towers
  properly will make that easier. Like assassins at the gate." At 80 the
  sim's stock armies (no assassins; the mixed one leans on wizards) still
  bleed hundreds late in the chapter (Citadel ~730, all-physical ~440):
  the chapter now asks for steel, and the Covert (wards make him prey). A
  ward-caster (`wardEvery/wardHits/wardRange`, `wardFx` for its ring,
  `wardSelf: false` to leave himself out) tops pips up around him.
- Every hall's reach was cut by a quarter (owner, 2026-09-29): `range`,
  `mRange`, `auraRange` and `minRange` in towers.js ×0.75, `RALLY_RANGE`
  96 → 72; range 0 and the whole-map 900/999 halls, hall spacing (`reach`)
  and lightning's jumps (`arcRange`/`chainRange`) untouched.
- Measuring today's balance (`--all --endure`, seeds 1-2, better doctrine
  per seed, with the stuck-wave fixes below): the whole day's changes
  (range cut, ram, Powder Works, hero xp, before the prices) took the
  campaign from 5224 castle damage to 13660; the Greenwood got clearly harder
  (bramblewick ~3 → ~190, blackbriar 0 → 100-460, gw5 ~24 → ~200), the Iron
  Marches' back half roughly doubled (crowstair ~190 → ~1000, undercliff
  ~440 → ~1580, ir5 ~470 → ~1120), the Hollow Court stayed near 0. The
  pricier later levels then brought it back to 9615 (gw5 ~60, crowstair
  ~640, undercliff ~970, ir5 ~790): the sim's commander buys the cheapest
  next step, so dearer finals push it into more halls on the road. The sims
  are a floor; the owner's playtest decides. (Earlier figures for ir4/ir5
  in this file came from runs that had stalled — see the stuck-wave notes.)
- Stuck waves: a wave ends only when every foe is dead, so a hold that never
  ends stalls the game. Two were found and fixed on 2026-09-29: a Paladin
  Order (magic blows, stun, heal) holding a shielded foe forever — a holy
  knight's blade is still steel, so while a pip stands his blow takes it
  (runMelee); and a foe held by a soldier no longer on the field (a band that
  stood down) — each combat tick releases any hold whose holder is gone.
  `sim.mjs --endure` prints `STUCK at wave n/N` for a run that never
  finished, and `CG_STUCK_DUMP=1` dumps the stuck wave's foes, halls and bands.
- The later levels of every hall cost more (owner, 2026-09-29: "They're
  pretty easy to get early on if you play it right"): level 3 ×1.15, the
  paths ×1.3, the finals ×1.5, rounded to 5; levels 1-2 unchanged. A hall's
  full climb went from 1200-1450 to 1610-1930.
- The Siege Ram (owner, 2026-09-29: "same rate, fewer in number, higher
  health, higher physical damage resistance, squashes knights dead — this is
  where the mages come in"): the same ram waves with about half the rams,
  HP 1250 → 2300, armor 0.35 → 0.6 (magic untouched), bounty 60, the
  roster's ram cost 20 / cap 2 and CROWD_WEIGHT 0. Enemy flag `crush`: a
  knight, militiaman, squire or gate guard who reaches it dies and it rolls
  on without pausing (runMelee); the hero never targets it. Measured before
  the range cut (`--chapter iron --endure`, seeds 1-4): ir1-crowstair as
  before, undercliff and ir5 roughly doubled, the knight-leaning burst plan
  collapsing at the Citadel. Variants on those two levels: HP 1900 changed
  nothing at ir5; without the crush undercliff went back to about the old
  numbers but ir5 did not. So the armor is the ram's main lever (and the
  crush the Undercliff one). PROVISIONAL pending the owner's playtest.
- Escorts: a faction's `escort` ({ type, per, max, from }) sends that foe
  along with any wave of `per`+ rank and file (waves.js `escortOf`), marked
  `amid` so startWave spreads it through the middle of the biggest group —
  the Iron Kingdom's Aegis Magister. It shows in the wave preview like any group.
- Riders: `splitInto` + `splitDrop` drops the children where a flier died
  (dazed a moment, `dropAt` makes the renderer drop them from the saddle);
  `deathSkin` names the rig its death crumbles in (the gryphon's is
  `gryphonMount`, the empty saddle).
- Air fights: a flier with `airAtk`/`airReach` (the gryphon knight) turns
  on any Skyknight war-eagle in reach — `gangOnEagle` in update.js sets
  `e.airFight`, which holds it in the air (movement treats it as held) and
  eases it to her side (`airOx/airOy`); it strikes on its own `atkRate`
  clock (meleeCd/atkAnim, so enemies.js plays its fight sheet), and a flight
  gangs up. The eagle still picks fliers first. With the sky clear she
  strafes the road (`strafe`: PASS_MS/STRIKE_MS passes, alternating
  sides); draw.js picks her frames off `eg.passAt`/`eg.blowAt`/`eg.latched`.
- The Powder Works (reworked 2026-09-29; owner: "Powder keg has crazy high
  damage (700 dps) ... it shoots out pieces of fragment around a small
  explosion ... Shrapnel is physical damage not magic"). Its paths are ways
  of working together, never one man over the other.
  - The bombardier's charge homes on ONE ground foe and blasts only it
    (`dmg`, the card's "Charge": physical, plus the form's burn and crack),
    then bursts into `frags` shards of `fragDmg`, spread evenly round the
    circle (a random turn, some jitter), flying `fragReach` (the burst lies
    on the ground, 0.8 as tall as wide), each striking the FIRST foe in its
    path — never the charge's own mark, never fliers. `burstCharge` /
    `fragVictim` / `pierceStrike` in update.js: the musket ball's
    hitIds/hitsLeft, but a shard sweeps its whole step, so a fast game can't
    step it over a goblin.
  - Upgrades add shards: 4 / 5 / 7, Bombard Yard 12, Long Muskets 9, Grand
    Battery 32 (one charge — its second, `shells`, is gone), Dragon's Breath
    14, Sharpshooters 10, Grapeshot Crew 12. No step shows a red row in the ⓘ
    (the Shrapnel row weighs count × damage).
  - Bombard Yard family: the charge AND every shard `crack` armor, and the
    musket shoots the cracked first. Dragon's Breath: red-hot shards
    (`fragBurn`) set what they strike alight, and the fire spreads. Long
    Muskets: the charges home on the musket's mark (`spot`), to its reach.
  - Shields: every shard is a physical blow a pip swallows. First-in-path
    piles the shards onto the bodies nearest the mark, so a burst strips
    whole shields off a few rather than a pip off everyone (16 levies, 48
    pips: a Grand Battery burst lands ~25 of 32 shards and takes ~11 pips;
    the old two splash charges took 32). Iron at x3 HP, Grand Battery old →
    new: a sparse column (a head every 380 ms) 192 → 134 dps, a packed one
    (150 ms) 89 → 190. A wider spread: narrow `fragVictim`'s body
    (size × 0.5 + 2 → ~0.35).
  - The skill tree drives the shards: the `dmg` perk scales `fragDmg` too
    (engine/towers.js `withPerks`) and "Wider Bursts" (g3) is +5%
    `fragReach` a rank. The tree never touches the musket.
  - Each man takes his OWN order (owner, 2026-11-09): `t.crew` [bombardier,
    musketeer] (`powderCrew`, engine/towers.js; `{ aim }`, null = the hall's
    `t.aim`), with a Both / Bombs / Musket row in the targets list (the
    skiffs' `fleet` row; `CREW_LABELS` in CrownguardGame.jsx names its
    buttons). The hall offers "Most" now (`aimModes`): the bombardier starts
    on it (where the most foes stand within `fragReach`, as he always threw),
    the musketeer on the hall's First; a musketeer on Most shoots the
    thickest knot within 40. The Long Muskets' spotting still overrides the
    bombardier's order. Headless: Strong / Last / First each took the right
    foe for each man. Selecting or placing the hall draws BOTH reaches: the
    bombardier's gold ring (`range`) and the musketeer's steel-blue one
    (`mRange`, `musketRing` in draw.js), each with its clear-weather ring and
    the armed upgrade's preview. The bombs (charge and shards) never touch a flier,
    the musket hits anything; the card says so (towerText.js traits "bombs
    hit the ground only" / "musket hits fliers", the Field Guide's `frags`
    trait; owner, 2026-11-09). Headless (Bombard Yard, musket held, 20 s):
    goblins lost 1373, the bats flying over them 0.
  - Measure with `node scripts/bench-hall.mjs`: one hall beside the road, a
    steady stream (crowd / armor / iron; `--mix all` adds ironpack), the
    real engine, dps per second a foe is in reach. `--peers` adds the other
    halls' finals, `--kind k --forms "1;2;3;3,a"` benches any hall, `--set
    k=v` tries numbers without editing towers.js, `--perks max` buys every
    skill tree.
  - At x3 HP the finals read 327–468 dps on a packed crowd (other halls'
    area finals 311–591; the old Grand Battery ~1046) and 276–407 on an
    armored column — still the strongest there (Solar Crown 326, Ballista
    173), put to the owner. Trimming `crack` barely moves it (−2 to −3%);
    about half of it is the musket. With every skill tree maxed
    (`--perks max`) the finals read 416–626 on the crowd (other area finals
    429–749) and 346–557 on plate (Solar Crown 656, Steel Tempest 596).
  - Known: the musket ball's strike passes pierce false, so `mPierce`
    ("punches through armor") does nothing today; making it work lifts the
    Long Muskets family on plate (241 / 407 / 276 → 295 / 456 / 339).
- Heroes (`src/data/bands.js`): level 1 at the start of every map, up to
  20, with health, damage and ability power rising per level. XP comes ONLY
  from kills (`killXp`: the foe's bounty × `KILL_XP`, doubled for the
  hero's own kills, a share for kills within `KILL_NEAR`), so placement
  matters. Each level asks a quarter more xp than the last (`heroXpFor`:
  30 × 1.25^(L-1); owner, 2026-09-29, after a hero reached 18 on the
  Citadel's thirty waves), so `KILL_XP` 0.17 puts a well-placed hero at ~level
  9-10 by the end of a 20-wave script and ~14-15 on a 30-wave map — measure by sweeping `--hero-at 0.2/0.35/0.5/0.65` with
  `node scripts/sim.mjs --level <id>` and taking the best (a player finds
  the fight; a fixed spot can sit behind the towers and earn nothing).
- Hero retinue (`HERO_RETINUE` in `src/data/bands.js`): Sir Aldric's squires
  join at levels 10 and 15 (owner, 2026-09-30), Wren's archers at 10 and 20; a follower joins the hero for that battle — squires (block,
  as knights) for Sir Aldric, archers (shoot, never block) for Wren. They
  are a `kind: "retinue"` band synced from the hero's level each tick
  (`syncRetinue`, update.js) and follow the hero's rally. A campaign hero
  reaches 10 only near the end of the script, so it barely moves the sims;
  it pays off in long maps and the Endless March.
- Hero stars, shown to the player as **VALOR** with a medal icon (`ValorIcon`, ui/hud/icons.jsx; owner,
  2026-11-26: the same star as the levels' was confusing; code names still say stars/points): a WON map pays the hero's level at the end of the scripted
  waves (never Endless) as that hero's own stars (`profile.bankHeroStars`:
  a new best on that map pays the gain in full plus half the rest; a replay
  pays half). Spent ONLY in the War Room's HEROES tab, never in
  battle: five stat talents + one upgrade line per ability, five ranks at
  `TALENT_COSTS` 5/6/8/10/13 (294 to max a hero; 45 maps since 2026-10 ×
  ~9-10 per first run). Bank the stars AFTER `bankLevel`, which saves the profile it's given.
- Hero abilities (`HERO_ABILITIES`): two per hero, fired from the hero's
  menu in battle (tap the hero button). The first is ready from the start;
  the second wakes at level 5 of that battle. Engine: `fireHeroAbility` in
  `actions.js`; the charge and the volleys run in `update.js`. Heartseeker
  takes the foe with the most max health within `pick` of the tap.
- A new hall holds its fire (shots, auras, its knights/blades/skiffs) until
  its build animation puts its person in, about 2 game s after purchase
  (`src/engine/build.js`: `buildClock`, `isBuilt`, `t.readyAt`); the sims
  include it. Upgrades never hold fire. It tipped one map: The Cairnfields
  (hl4) went 750 → 850 start gold to absorb it — PROVISIONAL, pending the
  owner's playtest (more gold is not monotonic in the sim there: 800, 900
  and 950 each lost seeds that 850 won).
- **A level may write its own last wave** (owner, 2026-11-27: Cinderholt's 25th, a generated flight of bats and
  shamans, was "super underwhelming"): `finale: [[type, count, gap], ...]` in a level's `window` (campaign.js)
  replaces wave `count`'s spec and goes through the same swell and shaping (waves.js `waveSpec`). Cinderholt's:
  the whole horde, ~580 heads after the swell (goblins, wolves, orcs, armored, 11 trolls, riders, 2 warchiefs, 3
  necromancers, shamans, 148 bats). `--endure` wave 25 (swarm / burst): seed 1 3 / 95 -> 93 / 151, seed 2 186 / 221 with it, now
  the level's hardest wave; the level held on all four.
- **Every Greenwood level ends on its hardest wave** (owner, same day: "the final waves of all the first chapter
  ... should definitely be the hardest"): the other thirteen non-boss levels carry `finale: "muster"`: waves.js
  `musterFinale` merges the raw groups of the level's last `FINALE_SPAN` 3 war-waves by type, `FINALE_K` 0.5 of
  the summed heads (necromancers whole, a warchief no more than one wave sent, `FINALE_CAP`), then swells it as
  usual. Total health of the last wave 1.3-2x the level's next biggest (it was rank 3-5 on seven levels). Pairs on
  the same war-waves share a finale (Thornbrook / Gullwick, Thistlecrag / Kingstones). `--endure` seed default,
  last wave's castle damage old -> new (swarm / burst): Gullwick 5 / 19 -> 27 / 57, Millrace 20 / 0 -> 79 / 23,
  Bramblewick 0 / 0 -> 73 / 68, Wolfrun 16 / 4 -> 95 / 60, Thistlecrag 12 / 0 -> 132 / 84, Kingstones 22 / 0 ->
  176 / 18, Ravenscar 0 / 0 -> 84 / 0; the Vale Road and the Barrowfields still ~0 (the sim plays them
  cleanly); all held.
- **The Goblin Warrens (gw5) start with 1500 gold** (was 1000; owner,
  2026-11-07: "couldn't get past wave 3", with the Fierce fog lingering).
  `--endure` seeds 1-2: the opening waves bleed ~0; swarm 388/156 ->
  170/439 (noise), burst 1064/1076 -> 856/691.
- **The Gold Works pay more** (owner, 2026-11-20): levels 1-3 pay 10 / 25 / 50 a wave held (was
  10 / 18 / 28; towers.js `income`), so level 3 (340 gold in all) pays itself back in ~7 waves.
  The Royal Mint line +22 to match: Royal Mint 40 -> 62, Dragon's Hoard 60 -> 82, Philosopher's
  Stone 55 -> 77 (compounding unchanged); the Transmuter path still pays no wage.
- **Noon Eternal splits its light** (owner, 2026-11-20): four beams (`split` 4, towers.js), each on
  a foe of its own (the toughest in reach not already held) ramping its own focus and igniting at full
  focus (update.js `splitBeams`, `t.lances` [{ id, ramp }]; draw.js draws each at its own heat). The
  spill (`beamSplash`) is gone from it; `dps` 92 -> 40 a beam. Bench (x3 hp, seeds 2), crowd / armor:
  160 / 229 -> 271 / 343 (Sun Spear 174 / 246, Eclipse 183 / 224); a lone foe takes at most 160/s
  (was 368), so Sun Spear is the boss path. Lever: `dps`.
- The owner playtests; the sims are a floor, not a target.
- The board is 840x560 (3:2): an 80px right border holds the castle band
  (wall face at `W - WALL_W` = 738). See art/STYLE-GUIDE.md "The board's
  size" before touching W, MX/MXR or WALL_W; scatter keeps the old 800.
