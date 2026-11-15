# Figures: the artists' brief (the lead is whichever Opus session briefs you)

The owner wants every character "a little more premium": readable body parts and faces,
"more fluid and natural animations", spell light on casters. Sir Aldric, Wren, the whole
Greenwood horde and every tower crew are already redrawn in the pixel sculptor
(`src/render/pix/`) and approved in look. You redraw the figures your task names, each in
its own `fig-<name>.js`, matching that standard.

## Read first (in this order; read long files in the parts you need)
1. `CLAUDE.md`: "The new sprites; the castle pass", "Who does what".
2. `art/STYLE-GUIDE.md`: "The new sprites: the pixel sculptor" and "The kit and the rules
   the concepts settled" (the contract, walk pace, four legs, fliers, light, the artists'
   lessons), "The three armies' colours", and "The newer heroes' figures" if you draw a hero.
3. The worked examples nearest your figure: `src/render/pix/fig-goblin.js` (short biped),
   `fig-orc.js` / `fig-ironclad.js` (armoured melee), `fig-archer.js` (Wren: a bow and an
   extra `sky` sheet), `fig-knight.js` (Aldric), `fig-shaman.js` / `fig-necro.js` (casters
   with a `casts` clip and a glow), `fig-wolf.js` + `beast.js` (four legs), `fig-boar.js`
   (a rider on a beast, and a `variant` for the riderless mount), `fig-bat.js` /
   `fig-dragon.js` (fliers). And `src/render/pix/pixrigs.js` (the `PIX` table: what each
   field means).
4. Your figure's OLD rig (`src/render/rigs-<group>.js`, the entry your task names): its
   look, gear, palette, size (its box), its sheets and frame counts. Any engine field the
   figure acts on (its `enemies.js` entry; for a hero `src/render/heroes/<key>.js` `pose`,
   which names the sheets and frames the game asks for).

## The job
- Write `src/render/pix/fig-<name>.js` for each figure: `BOX`, `BONES`, clips `idle`, `walk`
  and the blow (`attack` / `strike` / `shoot`), plus every extra sheet the game asks for by
  name (a hero's ability sheets, a foe's `casts` clip on the march, a raging look as a
  `variant`). Keep the old figure's identity: same gear, same colours, same faction palette,
  about the same size, so a player still knows it at a glance.
- Same standard as the approved figures: a face that reads, hands, a one-pixel tinted
  outline, one sun from the upper left, cloth and plate as tone, 8-frame walks, a blow clip
  with anticipation and follow-through. Casters get their `glow`.
- Do NOT edit `pixrigs.js`, `rigs*.js` or any shared file: the lead wires every figure into
  `PIX`. You only report what the lead needs (below). A helper you need goes in your own file.

## How to look at it (images cost far more than text: crop, and look on purpose)
- `node scripts/concept-render.mjs fig=<name> clips=idle,walk,attack zoom=4 tag=<prefix>_<name>`
  (no browser; writes `.shots/<tag>.png`; `frames=`, `crop=`, `bg=grass`, `flip=1`, `ext=1`
  prints pixel extents for sizing the `BOX`, `marks=1` prints named points).
- Joints: `http://localhost:5173/pix-lab.html?fig=<name>&clip=<clip>&zoom=5&tag=<prefix>_<name>`
  in your OWN browser tab (tabs_create), once per figure near the end. Nothing ships red
  (beasts and fliers have no joint lab: judge them by eye).
- At most two look-fix passes per figure. Judge at 1x as well as zoomed.

## Rules
- You own only the `fig-*.js` files your task names. Edit nothing else.
- No git command that changes anything. Do not start, stop or restart the dev server; no
  `npm run build`. Do not touch localStorage or prefs; never resize the window; never touch
  another agent's tab; close your own tab when done.
- `node --check <file>` after every scripted edit.
- Scratch files in `scratchpad/<prefix>/` in the repo, shots in `.shots/` with your prefix.
- No em dashes in comments; comment the way the worked examples do.
- Stay inside the tool-call budget your task gives. Running short: leave every figure file
  WORKING (`node --check` clean, clips present) and report.

## Your report (short), per figure
- `BOX` and its clips with frame counts and ms.
- The `PIX` entry you propose, as one line like those in pixrigs.js: `atk`, `hit` (the phase
  the blow lands), `per` (speed x walk clip seconds / 14), `legacy` (which clip frames stand
  for the old guard, wind-up, strike, follow-through), `fx`, any `variant`, `casts`, and a
  mapping for each extra sheet (as Wren's `sky: [0, 1, 2, 3]`) from the old frame numbers
  the game asks for into your clip.
- Weak spots you could not fix; the shot paths.
