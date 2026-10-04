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
  of the spawn time, ~5 s on screen, horn + red ring at the beach). The ship
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
  iron `storm`, hollow `gravemist`, rime `blizzard`, ash `eruption`; none
  in a chapter's first third, 0.35-0.55 in the middle, 0.7-0.9 in the last
  third, 1 at the boss; a level may set `weather: false` or its own.
  `sim.mjs --weather kind:strength|none`. Free Play: `weather` /
  `weatherPower` in sandbox.js (not in isHonest).
  Lightning (owner, 2026-10-04): lands at a random spot near a random live
  fighter (any foe or friendly soldier/hero, jittered 34 px), never near
  the castle; 25-40 magic x the wave's health scaling, a 0.5 s stun, every
  4-6 s at full strength; foes with `mres > 0` or a standing shield take
  nothing; soldiers lose 45 (never below 1) and can't strike 1.1 s. The Iron
  chapter sims about even with vs without it. The wave preview FORECASTS
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
- Test faction `rime` (src/data/faction-rime.js) and board
  `rimewatch` (src/data/realms-rime.js); placeholder art in
  `render/rimefx.js` (longship, telegraph, ice shell, rig aliases to delete
  when `rigs-rime.js` exists) and `render/weatherfx.js`. `rim-lab.html`
  steps the real engine and snaps it (`?wave=&snaps=&towers=&squall=&crop=`).
- `node scripts/sim.mjs --free rimewatch rime --window 1,18,15 --gold 600
  --endure`; flags `--no-landings --no-weather --no-freeze`, `--window f,t,n`,
  `--gold N`. The wave preview shows a landing party as its own chip with a
  ship badge.

## Open threads (as of 2026-09-29)

Bring these up with the owner; don't act on them unasked.
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
  notes); square snow patches on the Frostfang map.
- **Type:** a device that once opened a `?type=` link keeps that option
  (localStorage `cg-type`); `?type=tidy3` returns it to the default.

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

## Several sessions at once

The owner often runs several Claude sessions in this folder at the same
time. They all share ONE working tree, one git index and one dev server, so:
- **Look first.** Start with `ListAgents` and `git status`. Modified files
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
  9 s apart (`WALL_STAGGER`; a group with `clock`, placed in startWave). Flyers
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
- **Cavalry ride round rams** (`mounted` on the cavalier): on about half the
  waves that hold both, the cavalry surge goes FIRST, then the ram, then the
  column; otherwise the ram leads (`shapeCompany`, seeded by the wave).
- **Archers stand and shoot** (owner, 2026-09-29): a foe with `rangedAtk`
  (crossbowman, barrow archer) halts while any friendly soldier or hero is in
  its `rangedRange` and marches on once none is left (`e.aiming`, update.js).
  Each archer has a 14 s budget of standing still (`pauseLeft`), so a healed
  paladin cannot hold a wave open for ever.
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
  stalemate. Only wraiths do this: every other foe is held by at most one
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
- **Gravecaller**: ten Risen a toll. It is the Hollow's engine; the late
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
free militia horn: four tiers at 8000 / 12000 / 18000 / 25000. Each tier
names the whole band (count 3 / 4 / 4 / 5, `men` health 105 / 125 / 170 /
230, `dmg`, `rate`, `range`, `life` 17-24 s, `cooldown` 22 -> 16 s); tier 0
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
- **Masons' barricades** (owner, 2026-09-30): after every wave the Masons'
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
- **Corpses lie only for their wave** (owner, 2026-10-01; before that they never faded and piled up): each carries the wave that felled it (`wave`); clearing a wave (or a sandbox summon fight) sets them dissolving (`dissolveCorpses`, update.js: `fadeAt`/`fadeMs` 1800 ms, `remains.js` drops the bones out piece by piece), and a necromancer raises only corpses of the CURRENT wave that are not dissolving. A raised body is untouchable while it climbs out (`isRising`, towers.js: no tower, band, skiff, blade or castle archer targets it and `dealDamage` ignores it until `riseAt + riseMs`, owner 2026-10-01; wraith risings too). The fallen a necromancer can raise (goblin, wolf, orc, ironclad, boar rider, troll; never a boss or champion) lie where they fell until raised, at half the body's health (`CORPSE_CAP` 120, oldest give way, actions.js) and rise slowly (`NECRO_RISE_MS` 2200, update.js: held on the spot, sunk and faded in as a wraith's rising is, then they walk) and are drawn as a scatter of bones (`render/remains.js`; `hrd-lab.html?c=1`).
- **Fewer wraiths** (owner, 2026-10-01: "pretty hard"): the Hollow script's four wraith waves 6/7/10/7 -> 4/5/7/5 (war-waves 6, 11, 14, 17) and the endless roster's wraith cost 3 -> 4 (rarer). Still not fielded before wave 5 of a level (ghouls stand in). They also never stream in closer than 1.5 s apart (`minGap` on the enemy, waves.js `gapFloor`): the swell used to bunch the Cairnfields' nine into one lump. Provisional.
- **Fewer, weaker wraiths; the Brazier Wheel burns them** (owner, 2026-10-02): the script's wraith waves 4/5/7/5 -> 3/3/5/3, the endless roster's cost 4 -> 5, `CROWD_WEIGHT` 0.45 -> 0.3, blow `atk` 26 -> 23 (~-11%). The Brazier Wheel's three stat blocks carry `scorchHaunts` (towers.js): its flame ring (magic, already) now also targets and strikes a `haunts` flier — the wraith — though the wheel stays blind to every other flier (`pickTarget` and the nova loop in update.js). Provisional.
- **Knight rally flag reach +25%** (owner, 2026-10-02): `RALLY_RANGE` 72 -> 90 (constants.js; drawn circle, flag placement, `defaultRally`). The Covert's flag keeps 72 (`ASSASSIN_RALLY_RANGE`). Provisional.
- **Bladewheel reach -20%, every step** (owner, 2026-10-02: one Steel Tempest at the Cairnfields' gate "was beating the whole thing"): `range` x0.8 on all nine steps of the hall, both paths included (66-93 -> 53-74; it is also how far the spikes fly and how wide the flame ring is). Steel Tempest's pierce is 2 (was 4). Spikes a volley then went 10/12/14 -> 6/8/10 (levels), Razor Gale 14 -> 10, Steel Tempest 18 -> 12, Hamstringer 16 -> 10 (the Tempest still leads its path). Then `dmg` x0.8 on every step, and the Brazier branch's `burn` too (Tempest 18 -> 14; Brazier 43/76/52 -> 34/61/42, burns 9/14/12 -> 7/11/10). Provisional.
- **Necromancer buffed** (owner, 2026-09-30): hp 420 -> 700, raises every
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
  War Council, Free Play) lay out any number of heroes as portrait tiles.
- **Osric**: holy blows (`st.magic`) + `smite` on the undead (`isUndead`:
  Hollow faction, raised, wraiths); mends soldiers near him; Sanctuary
  (heal ring, sears and stuns the undead, dazes the living), Consecrate
  (blessed ground). Templar retinue (paladin rig).
- **Hale**: `holds` 3 foes at once and sweeps them all; Brace Pikes
  (impale and stun what reaches him, riders' trample spent, half harm);
  Sound the Levy (three watchmen as a militia band, `levy: true`, the
  player's militia cooldown untouched; an atkBuff ring). Watchman retinue.
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
- `music.js`: the sequencer + mixer (reverb, compressor), crossfades, pauses
  with the tab, starts on the first tap. `instruments.js`: the voices and the
  drum kit (`VOICES`, `DRUMS`); one owner. `notation.js`: the text notation
  (read its header) and `compileTrack`; pure, so Node can use it.
- Tracks are text in `src/audio/tracks/<area>.js` (arrays gathered by
  `tracks/index.js`). Ids: `<area>-build | -fight | -boss` for greenwood,
  iron, hollow, plus `title`, `map`, `victory`, `defeat` (the jingles have
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
  - He throws where the most foes stand within `fragReach`; the hall has no
    "Most" button (it has no splash).
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
- Hero stars: a WON map pays the hero's level at the end of the scripted
  waves (never Endless) as that hero's own stars (`profile.bankHeroStars`:
  a new best on that map pays the gain in full plus half the rest; a replay
  pays half). Spent ONLY on the Home Screen (War Council → Heroes), never in
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
- The owner playtests; the sims are a floor, not a target.
- The board is 840x560 (3:2): an 80px right border holds the castle band
  (wall face at `W - WALL_W` = 738). See art/STYLE-GUIDE.md "The board's
  size" before touching W, MX/MXR or WALL_W; scatter keeps the old 800.
