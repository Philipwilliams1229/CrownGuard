# Removing the old sprites: the cleanup brief (2026-11-15)

The owner removed the "New sprites" setting: `prefs.newSprites` is now always true
(src/data/prefs.js forces it at load). Every code path that only runs when it is false,
and every old painter that only those paths call, is dead. Remove it, carefully.

## What to remove
- Branches that run only when "New sprites" is off: `if (!H) {...}` / `else {old}` after a
  `hallPix` / `crewOn()` / `hallOn()` / `prefs.newSprites` / `hasPix(...)` test that is now
  always true for that thing. Keep the live branch, drop the test where it is now constant.
- Then the old painter functions, tables and imports that nothing reaches any more.

## What to KEEP (hard rules)
- Anything the ENGINE or the sims read: src/engine/muzzles.js imports `archerPose`
  (folk-archer.js), `mageTip` (folk-casters.js), `musketMuzzle`, `mistressGlove`
  (folk-gunners.js), `skiffMuzzle`, `SKIFF_LIFT`, `skiffBob` (rigs-skiff.js); the sims run
  with no `document` and use the old muzzle tables through those. Keep every function
  those use, transitively. Grep src/engine and scripts/ before deleting anything.
- `hasPix(type)` stays (it still says whether a type HAS a pix figure); rigs for types with
  NO `PIX` entry stay (the kraken and its arm; anything else you find).
- `RIGS` entries' data the new path still reads (`box`, `kind`, `deathSkin`, aliases in
  rimefx.js, `fightN`): check rigs.js `rigDef` / `PIXDEF` before trimming an entry.
- crews.js / halls.js helpers (`crewOn`, `hallOn`) may stay as always-true helpers if
  removing them would touch files you don't own; just stop branching on them in yours.
- The lab pages the team uses must keep working: hallshot.html, rigshot.html, shotlab.html,
  shots.html, raise-lab.html, pix-lab.html, castle-compare.html, recap-figs.html (it shows
  old vs new: make it draw only "after" if the old path is gone, or tell the lead), and the
  Node scripts (sim.mjs, marathon.mjs, concept-render.mjs, hall-render.mjs). Labs that only
  existed for the old drawings (e.g. joint-lab.html for the old rigs) may break: list them.

## How to work
- Grep every name before deleting it (`grep -rn "<name>" src scripts *.html`).
- `node --check` every edited file after every scripted edit.
- No git that changes anything; don't touch the dev server, localStorage or prefs; your
  own browser tab only, closed at the end.
- Verify at the end: `npx vite build --outDir <your scratchpad dir>` passes;
  `node scripts/marathon.mjs --realm thornbrook --to 40` reports no engine issues;
  `node scripts/sim.mjs --level gw1` wins as before; the labs for your files render with no
  console errors (one shot each, prefix `cln_`).
- Report: lines removed per file, what you kept and why, labs that broke, the checks' output.
