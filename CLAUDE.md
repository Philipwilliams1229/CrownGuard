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
  knights); magic hurts it less its `mres` 0.4 — wizards, fire, poison, and the
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
- **Banner** (`cg-panel`): picture, name, level pips, the ⓘ level with the
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
  the Targets bar loses its label and shares a row with a slim SELL, the
  level card drops its numbers (the banner previews them), the banner's
  picture shrinks; the panel scrolls where it must (SELL, the bar and the
  banner never do).

## Castle works are the crown's, everywhere

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
blows. A new work needs: `CASTLE_WORKS` + `emptyWorks` + `rankLabel`/`ranked`
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
- **Burns cut to 75% of their old damage a second** (owner, 2026-09-30;
  durations unchanged — a brief 2.5 s-for-all was reverted): `burn`, `mBurn`,
  `igniteBurn`, `logBurn` x0.75 (towers.js, the castle ballista's fire bolts),
  and the Dragon's Breath musket's hot shot lowered again, 24 -> 12 a second
  (~41 a hit). The owner's aim is ~40 total damage per application on average;
  with the cut the 22 burns averaged ~29. Then (same day) the Log Roller's
  burning logs were halved (20 -> 10 a second, ~30: it hits everything) and
  Dragonbreath raised 6 -> 13 a second (~20). Fire pools and the 1.3 s spread are untouched.
- **Necromancer buffed** (owner, 2026-09-30): hp 420 -> 700, raises every
  3.8 s (was 6), up to 4 fallen a cast (was 3) within 170 (was 150). gw5
  swarm doctrine 100-135 -> 165-254 castle damage; provisional.
  He also walks BEHIND his wave's groups now (`raisersLast`, waves.js), so
  there are fallen to raise; speed 52 -> 44 (Ironclad 55 -> 47), his reach 260
  (the fallen lie ahead of him), and ironclads, boar riders and trolls now
  leave corpses too (`CORPSE_TYPES`, actions.js: before, a necromancer walking
  with ironclads had nothing to raise).

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
  `TALENT_COSTS` 5/6/8/10/13 (294 to max a hero; ~24 maps × ~9-10 per first
  run). Bank the stars AFTER `bankLevel`, which saves the profile it's given.
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
