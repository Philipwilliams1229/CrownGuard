# Effects, round 2 (owner, 2026-11-16)

The owner, after picking round 1 (CLAUDE.md "The effects pass"): "do the toll, plague burst and
level-up effects too. Lets also revisit the fire effect, and raising the dead. I actually liked the
purple and green wispies from the original, but i like the ground look from B better. ... lets make
sure our builders who pop up the new towers are in the new style as well."

Read first: `art/STYLE-GUIDE.md` (palette, the tinted one-pixel line, one sun from the upper left,
performance), CLAUDE.md "The effects pass", and `src/render/statusfx.js` (how round 1 bakes and
blits). The round-1 concept page is `fx-concepts.html` + `concept/fx-concepts.js`, built by
`node scripts/build-fx-concepts.mjs` into `.shots/fx-concepts/` (the lead publishes it).

Three jobs, one artist each, each owning ONLY the files named:

## 1. Concept rows (owns `concept/fx-concepts.js`, `fx-concepts.html`, `scripts/build-fx-concepts.mjs`)
Add rows, each with TODAY (the game's own painter, copied or imported as the existing rows do) and
A clean / B worked / C bold, in the same style as round 1 (A/B/C mean the same thing as there):
- **Bell toll** (`toll`, rings.js: the Gravecaller / Hollow King / Rime Jarl bell, r 46-60, 550 ms).
- **Plague burst** (`plagueburst`, rings.js: a Plague Ghast bursting, r ~40, 500 ms).
- **Level up** (`levelup`, draw.js ~line 703: a hall levelled AND a hero levelling: green rings, 600 ms;
  plus draw.js's green `burst` that fires with it). Show it at a hall's feet (r ~44).
- **Path / final** (`evolve` + the gold `burst`: a hall branching or ascending, 900 ms).
- **Fire on a foe, again** (`burn2`): TODAY = what the game draws now (statusfx's burn B). Three new
  takes that are each clearly better than today, not three copies of it: e.g. A flames that hug the
  figure's own silhouette and lick up off its shoulders; B a fiercer fire with a smoke column, embers
  and a hot glow on the ground; C big chunky stylised tongues that read on a phone. Keep each cheap
  enough to bake per size bucket and frame like round 1.
- **Burning ground** (`firepool`: the lava / fire pools under Hellburner, log fire, Sunforge etc.:
  find what the game draws today, `grounds` in draw.js / fx.js) with A / B / C.
Mark the new rows' group "Round 2" so they sit together at the top of the page (or a `?round=2`
filter that shows only them, your call; the lead publishes only the new rows). Keep the pick
buttons and "Copy my picks". Render with the lab as round 1 did and build.

## 2. Raising the dead in the game (owns ONLY the `case "raise"` block of `src/render/rings.js`)
The owner's mix: the ORIGINAL air part (today's violet and green witch-fire spiral of dots, the
violet burst and spark: keep it exactly) over round-1 concept **B's ground** (`rise.B` in
`concept/fx-concepts.js`: the faint violet pool, the dark broken earth with radiating cracks, the
low green grave-mist puffs, the dirt clods thrown out). Port B's ground into the `GR` layer in world
units (1 world unit = PX art pixels; cache what you can as the file's other sprites do). It must
work at every `life` the engine uses (600, 700 RISE_MS, 2000 reformMs, 2200 NECRO_RISE_MS) and on
grass, Hollow dark ground and snow. Look at it in the game with `shotlab.html` / `hrd-lab.html?c=1`
(a necromancer raising) or a scratch lab, at game size and x3.

## 3. Builders on an upgrade (owns `src/render/buildanim.js`, `src/render/pix/fig-builder.js`)
A NEW hall is built by three pix builders (builders.js + fig-builder.js: already new style). A LEVEL
upgrade (`raiseLevel` in buildanim.js) still shows a floating mallet with no one holding it, on a
quick old-style scaffold. Put a real builder there: a fig-builder mason (the `mason` variant) who
pops up on / beside the scaffold, knocks twice in time with `knocks`, and drops away at the switch,
drawn through the same baked-frame route builders.js uses (bake once, stamp per frame). Make the
scaffold's poles / ledger / brace match the build scaffold's new style if they don't already. The
level animation is 0.45 s (`RAISE_SECS.level`); you may lengthen it up to 0.8 s if the knocks need
it (visual only: the hall already fights). Check the branch / ascend animation (`raiseGrand`) too
and tell the lead if anything in it is old style (don't add people to it). Look with
`raise-lab.html` (it runs the real raise animation).

## For everyone
- No git that changes anything. `node --check` after every scripted edit. Scratch in
  `scratchpad/<prefix>/` of the session scratchpad the lead names; shots in `.shots/<prefix>_*.png`.
- The dev server on 5173 is shared; if it's down, use a private static build
  (`npx vite build --outDir <scratch>` served on your own port), never restart 5173.
- Your own browser tab (tabs_create), closed when done; never resize the window.
- At most two look-fix passes. Measure the cost of anything that runs per foe or per frame.
- Report: what you did, the files, shot paths, the measured cost, and what still looks weak.
