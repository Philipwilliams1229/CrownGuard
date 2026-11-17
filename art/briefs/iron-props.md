# The Iron Marches' props, re-sculpted (2026-11-17, owner: "Yes, start it")

Fable's sweep (`art/briefs/fable-sweep-2026-11-17.md`, A1) found the Iron props' outer ring tinted
but their BODIES still old: soft paint.js fills (`part()`, `ellipse`, `lin`) with flat colour, where
the new look is sculpted in `src/render/pix/pix.js` (one sun from the upper left, material by
material, the tinted one-pixel line, Iron's look B "worked"). Read `art/briefs/props-artist.md`
(the rules of the job; ignore its "New sprites off" line: that switch is gone, so no fallback is
kept) and the worked examples it names: `spruce`, `crag`, `drystone`, `milestone` in
`src/render/scenery-iron.js` (each builds a `Pix`, then `obj.resolve({ line: "tint" })` ->
`toCanvas`).

## How this round is wired (so two artists never share a file)

- Each artist writes NEW painters in their OWN file, `src/render/pix/iron-<set>.js`, with the same
  signature as the old painter, `(ctx, x, y, s, o)`, the same footprint, anchor (its feet at x, y),
  `box` and variants (`o.v`, as the old one reads them). Read the old painter in scenery-iron.js to
  match; copy any helpers you need rather than editing scenery-iron.js.
- To see your piece on a board before the lead wires it, you may swap ONE line of the
  `IRON_ART.decor` map in scenery-iron.js in your working copy (only your own keys) — the lead will
  do the final wiring; tell the lead which keys map to which of your exports.
- Live bits (`IRON_ART.live`: banners, beacon fire, the tower's pennant, the gate, the salt house's
  smoke, the quintain's arm, the eyrie's birds) keep moving: redraw them in your file to match if
  budget allows, else leave them.
- Look on real boards with `shots.html` (`snap(name, realm, [], {}, [x, y, w, h, scale])`; crop
  boards: wardenmoor (drill camp, tents, pikes at ~420-760, 340-480), brinewick (salt works
  ~220-500, 140-260, boats ~150-200, 420-470), ironmouth, blackcliff, gallowscross, kestrel,
  coldwater, crowstair). Before/after crops at x4-5, and one at x2.

## Sets

**Camp** (file `src/render/pix/iron-camp.js`, shot prefix `ipc`): `irtent` (warTentX), `irwagon`
(wagonX), `irpikes` (pikesX), `irbanner` (standardX), `irgate` (ironGate), `irgibbet` (gibbetX),
`irbeacon` (beaconX), and the drill field: `irquintain`, `irdummy`, `irbutts`, `irrack`, `irmuster`.

**Works and coast** (file `src/render/pix/iron-works.js`, prefix `ipw`): `irtower` (kingTowerX),
`irruin` (ruinX), the salt works `irpan`, `irsluice`, `irsalthouse`, `irsalt`; the coast
`irboat`, `irwreck`, `irquay`, `irmoor`, `irstack`; `ireyrie`, `irtoll`.

Do the most visible pieces first (tents, wagon, pikes / King's tower, ruins, salt house), then the
rest as budget allows. Report: each key -> export name, what you left, shot paths, bake time for a
board (shots.html timing) before and after, weak spots.
