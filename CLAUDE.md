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
- **The usage limit can cut agents off mid-edit.** Commit a WIP snapshot
  (build passing) whenever a team finishes, and before a long wait. After an
  interruption, brief the next round against the PRE-PASS commit
  (`git diff <base> -- <file>`), not HEAD, and hand agents the old reports as
  files to read rather than pasting them into the workflow's args.
- Agents' requests for files they don't own (engine, draw.js,
  atmosphere.js, the game component) are the lead's to do between rounds.
- A page reload from a teammate's save breaks a batch of `snap`s ("Failed to
  fetch"); shoot one board per call with a retry when artists are working.

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
  own browser tab and a shot-name prefix in `.shots/`.
- **Collided anyway?** Save copies to your scratchpad before touching
  anything, message the owning session with what happened, and let it
  restore its own files.

## Keep the guides current

When a session changes how things are made — art rules, balance levers,
tools, file layout, or a lesson learned the hard way — update the matching
guide (`art/STYLE-GUIDE.md`, this file) in the same commit. The next session
should never have to rediscover it.

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

## The tower menu stays one size

The owner misclicked when the tower card changed shape between taps, so
(`towerPanel` in `src/CrownguardGame.jsx`):
- Both columns are **stage stacks**: every form the hall can reach (each
  level, the paths, every final form, every finished form) is laid out in
  one grid cell and only the live one is visible, so the card is as tall as
  its tallest form from level 1 to the end. Anything new in the card must
  be in every stage (or reserve its space), never pop in.
- Sell lives at the foot of the right column and stays there (the column
  stretches to the card's height; a lone level-up card stretches to fill).
- No subtitle under the hall's name; targets are equal buttons, two to a row
  (an odd one spans the last row).
- Two taps to buy: arming only turns a card gold (`is-armed` keeps the
  parchment font) and shows CONFIRM in a fixed slot.
- Path / final-form cards show name + tale + price; the stat changes are
  behind the corner ⓘ (`infoCorner`, a thumb-sized hit area at any UI
  scale, beside the card so it works on unaffordable cards).
- **Path and final-form `desc` in `src/data/towers.js`: 100 characters at
  most** (the card shows it whole; a 4-line clamp is only a safety net).
- The service record (kills and dps, one line, no damage total) is always
  shown; dps is the current form's average over the seconds a foe was in
  reach. The targeting buttons carry no hint line.
- Two columns on a phone or wherever the board is shorter than ~640 design
  px (the iPad), one column on a tall desktop.

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
  wave bonus, per-level gold in `src/data/campaign.js`, tower stats in
  `src/data/towers.js`, castle works and endless ranks in `src/data/castle.js`.
- Heroes (`src/data/bands.js`): level 1 at the start of every map, up to
  20, with health, damage and ability power rising per level. XP comes ONLY
  from kills (`killXp`: the foe's bounty × `KILL_XP`, doubled for the
  hero's own kills, a share for kills within `KILL_NEAR`), so placement
  matters. `KILL_XP` 0.17 puts a well-placed hero at ~level 10-12 by the end
  of the script — measure by sweeping `--hero-at 0.2/0.35/0.5/0.65` with
  `node scripts/sim.mjs --level <id>` and taking the best (a player finds
  the fight; a fixed spot can sit behind the towers and earn nothing).
- Hero stars: a WON map pays the hero's level at the end of the scripted
  waves (never Endless) as that hero's own stars (`profile.bankHeroStars`:
  a new best on that map pays the gain in full plus half the rest; a replay
  pays half). Spent ONLY on the Home Screen (War Council → Heroes), never in
  battle: five stat talents + one upgrade line per ability, five ranks at
  `TALENT_COSTS` 5/6/8/10/13 (294 to max a hero; ~24 maps × ~10 per first
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
