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
- The owner playtests; the sims are a floor, not a target.
- The board is 840x560 (3:2): an 80px right border holds the castle band
  (wall face at `W - WALL_W` = 738). See art/STYLE-GUIDE.md "The board's
  size" before touching W, MX/MXR or WALL_W; scatter keeps the old 800.
