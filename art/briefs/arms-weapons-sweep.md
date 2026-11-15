# Arms and weapons across the armies: the shared brief (2026-11-15)

The owner, after four rounds on the heroes ("ALDRIC IS PERFECT ... Same for Osric"): "apply these
same types of fixes across the armies and soldiers." Read first:
- `art/STYLE-GUIDE.md`, "The joint kit" and "Layer rules and the MUST check" (incl. "Arms and the
  head" and "A held weapon is locked to the hand").
- `art/briefs/hero-swing-recipe.md`: the worked numbers.
- The approved worked examples: `src/render/pix/fig-knight.js` (Aldric, sword + shield) and
  `fig-friar.js` (Osric, mace). Read how they do layers, `swordAngle` / `maceAngle`, the fist.
  `fig-captain.js` for a two-handed pole weapon (both hands on the haft, far arm under the body).

## The rules, in the owner's words and ours
1. **The near arm never goes behind the head.** The near (viewer-facing) arm and what it holds may
   pass IN FRONT of the head; never behind ("it's not possible and looks broken"). The far arm sits
   under the torso and head (z 1, `bias: -1`). Use a STATIC layer order (head, weapon, near arm);
   delete pose-dependent flips (`behind`, `? :` on z) that put the near arm under the head.
2. **A held weapon is locked to the hand** ("the hilt should be in a fixed position with the hand
   and the blade follows"). Weapon angle = forearm direction (elbow -> hand) + a fixed GRIP + a
   wrist clamped to +-0.35. No free weapon-angle key. Measure GRIP from the figure's guard / idle
   so those keep their look.
3. **Not an extension of the arm** ("the sword is just an extension of his arm rather than being
   held up"). A one-handed sword, axe, mace, club, dagger stands at about 77-90 degrees to the
   forearm, rising from the top (thumb side) of the fist. Crossguard / head across the top of the
   fist, pommel just below. The fist is an ellipse long along the hilt, turned with it.
4. **No arm level behind the back.** `aN[0]` (or the figure's equivalent) never swings the arm more
   than ~40 degrees behind the shoulder: that reads as "held upside down". Overhead wind-ups lift
   up the front and cock the forearm beside the back of the head; the weapon then lies back
   behind the head (allowed: it is the weapon, not the arm). Thrusts (spears, pikes) keep the
   haft along the line of the thrust with both hands on it.
5. **Two-handed weapons** (polearms, greataxes, two-handed swords): both hands on the haft through
   the whole blow; the far arm one dark limb under the body, only its fist over the haft.
6. **Arms read apart from the body** (owner, earlier): where an arm crosses the torso keep it
   separate by value (the kit's overlap line does most of it; a darker upper arm where steel
   meets steel, as Hale got).
7. Keep each clip's n, ms, the strike phase, `marks`, `AIM`, `BOX` (the engine reads them). If a
   clip truly cannot be fixed without changing the strike time, say so; don't change pixrigs.js.

## Not in scope
Bows and crossbows (their own layer rules, done), beasts with no arms (wolf, boar, mammoth, ram,
serpent, kraken, bat, dragon, ice drake, gryphon's body: their RIDERS are in scope), the tower crews
(crews.js figures), Aldric / Osric / Hale / Ysolde / Wren.

## How to work
- Own ONLY the files your brief names. No git that changes anything. `node --check` after every
  scripted edit. Scratch in `scratchpad/<prefix>/` (the session scratchpad your lead names).
- Tag the parts: `px.tag("head")`, `"nearArm"`, the weapon (`"weapon"` or its name), `"farArm"`.
  Every figure exports `MUST = [["nearArm","notOver","eyes"]]` at least (keep any rule it already
  has that still holds).
- A forearm-to-weapon table proves rule 2: for each clip print min / max of (weapon angle -
  forearm angle); after the fix the spread is the wrist only (<= 0.7). The hero lead's scratch
  example: `/private/tmp/claude-501/-Users-philiplago-williams-Desktop-CrownGuard/f49d46f7-7070-438d-8b13-167a9cba344d/scratchpad/grip.mjs`
  (skeleton names differ per figure: adapt).
- Look: `node scripts/concept-render.mjs fig=<name> clips=attack zoom=8 tag=<prefix>_<fig>_after`
  (and walk / idle / any cast clip the figure has). Before shots first, same tags with `_before`.
  At most two look-fix passes per figure.
- Checks at the end: `node scripts/pix-audit.mjs` green for your figures;
  `node scripts/pix-regress.mjs` shows only your files changed (it hashes against the last run:
  run it once BEFORE you edit, `pix-hashes.json` is shared, so copy it to your scratch dir and
  compare yours against that copy).
- Report per figure: what was wrong (behind-the-head frames, free weapon angle, arm-extension grip,
  arm level behind), what you changed, the GRIP chosen, the before / after spread, shot paths, and
  what still looks weak. Approved figures (goblin, orc, necromancer) get a before / after pair the
  lead can show the owner.
