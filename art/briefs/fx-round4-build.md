# Effects Round 4: into the game (2026-11-17, the owner's picks)

The concepts are in `concept/fx-r4-*.js` (the lab `fx-concepts.html?only=<row>` shows them; strips in
`.shots/fxc_<row>_<col>.png`). Read `art/briefs/fx-round4.md` for the look rules, and the style guide's
"Effects on the ground". Now each picked option goes into the GAME's own painters.

**The owner's picks:**
- Rain puddles and wet road: **A**, plus: "I just want them to show up more gradually, and disappear more
  gradually after the rain stops."
- Flooded road: **B**. Lightning strikes the ground: **B**.
- Fire nova: **B**. Frost nova: **B**, "but I want the inside fill dialed back a bit".
  BOTH novas: "give them the same angled circle to maintain that 3D effect" — squash them to the same
  ellipse the other ground rings use (find the factor the blasts / toll / heal / raise rings pass in
  `src/render/rings.js` and match it; the concept and today's novas are round).
- Lava, plague and spore pools: **B**.
- Longship lands / sinks: **B**. Sea serpent surfaces: **B**. Frozen hall: **B**.

## Rules for every artist

- Port the picked option's look from the concept file into the game painter you own; keep the
  engine untouched (no gameplay change: radii, timings and who-gets-hit stay as they are). If a look
  needs engine data that isn't there, report it instead of adding it.
- Bake, don't paint per pixel each frame: memoise per size bucket / frame / variant like statusfx.js,
  flames.js and weatherbake.js `memo` do. Measure the cost before and after (the brief's labs, or a
  `performance.now()` loop in the page) and report the numbers.
- Ground parts draw UNDER figures; only spray / tongues / spikes in front may cross a body (see how
  flames.js splits `drawFireGround` / `drawFireFront`, and how draw.js calls them).
- `node --check` every file after every edit (a syntax error 500s the dev server for everyone).
- Look at it in the real game, not only the concept lab: use the existing labs (`rain-lab.html`,
  `wx-lab.html`, `fx3g-lab.html`, `fxfire-lab.html`, `rim-lab.html`, `shotlab.html`; read their headers)
  in your OWN built-in-browser tab (tabs_create, close it after; the pane must be showing or the lab
  stalls: tabs_select your tab before waiting on it). Shots in `.shots/<prefix>_*.png`.
- Own only the files listed for you. No git that changes anything. The dev server on 5173 stays up.
- At most two look-fix passes. Report: what you changed per effect, the perf numbers, shots, weak spots.

## Who owns what

**Water** (prefix `w4g`): `src/render/weatherfx.js`, `src/render/weatherbake.js`.
- Puddles A (concept `puddles.A` in `concept/fx-r4-water.js`): ground-coloured water (mud on the
  road, dark green on turf), dark far lip, lit near rim, grows from the middle. GRADUAL: today the
  puddles follow `w.wet` (soaks over ~45 s, dries over ~60 s). Make them fill in one by one over
  the soak (staggered thresholds, each growing from its middle) and, after the rain, shrink back to
  their middles and go one by one, the last ones lingering well after the road film has dried
  (a render-side lagging value is fine, e.g. a puddle level that follows `w.wet` more slowly on the
  way down; it must also freeze between waves as `w.wet` does). Keep `onDeck` / `clipDecks` (no water
  on bridges) and `bridgePools`.
- Flood B (concept `flood.B`): creeping foamy edge, a current across the road, drifting debris.
- Lightning on the ground B (concept `bolt.B`): the branching crawl across the wet ground (the game's
  `wxArcs` already exists: dress it), steam off nearby puddles, a scorch whose cracks cool white-gold
  -> orange -> red -> dead. Keep the game's bolt sprite itself.

**Novas and pools** (prefix `n4g`): `src/render/rings.js` (the `firenova` / `frostnova` cases only),
`src/render/fx.js` (`drawGround` / `groundSprite` for lava, plague, spores). Don't change
`ringflash.js`'s timing; if the squash changes where the front is, tell the lead what ringflash needs.
- Fire nova B, angled: rolling flame wall front, coals, a scorched ring left behind, embers. Back
  half under the foes, front tongues over them only as the flames.js split does.
- Frost nova B, angled, INSIDE FILL DIALED BACK: the rime sheet thinner / sparser (about half as
  dense), spikes snapping up at the front then melting.
- Pools B: broken crust plates over glowing cracks (lava), scum plates over sludge (plague), lobed
  haze and puffs (spores), breathing edge, bubbles swelling and popping. Must sit well beside
  burning ground B (`flames.js drawFireGround`).

**Rime and sea** (prefix `r4g`): `src/render/rimefx.js` (and `src/render/serpentfx.js` or wherever
the serpent's surfacing ring is drawn, if it is not in rimefx.js; report which).
- Longship B: bow wave, wake, foam at the beach; the warning as concept A/B's stepped ring and horn
  mark; when holed, the keel snaps, the halves go under, flotsam drifts off (`landingWarn`,
  `shipsink`, `plank`, `drawShip`).
- Serpent surfaces B: a boil of churned foam and popping rings, then the body breaks water and
  spray falls.
- Frozen hall B (`drawFrostShells`): ice creeps up from the ground, facets, icicles, frost sheet,
  then cracks and melts at the thaw. Shaped to the hall (bake per hall kind / level / form, not per
  frame); halls are many sizes, check at least the Archer hall, the Wizard Spire, a Knight Garrison
  and a final form.
