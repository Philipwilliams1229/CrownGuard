# The last old-style art (2026-11-17, owner: "just do all")

What still drew old after Fable's sweep was checked against the game (`art/briefs/fable-sweep-2026-11-17.md`,
"A3-A10 checked"). Four artists, one set each, at once. Read `art/STYLE-GUIDE.md` (the new sprites, the
props, effects on the ground) and `art/briefs/props-artist.md` (the rules of a re-sculpt; ignore its "New
sprites off" line: that switch is gone, keep no fallback). The worked examples of a sculpted prop:
`spruce`, `crag`, `milestone` in `src/render/scenery-iron.js`, the Hollow's `pxSculpt` pieces at the end
of `src/render/scenery-hollow.js`, and `src/render/pix/iron-works.js` (the newest: a `Pix`, then
`obj.resolve({ line: "tint" })` -> `toCanvas`). The look is B "worked": one sun from the upper left,
material by material, the tinted one-pixel line (never near-black), weathering, hard pixel edges.

## Rules for every artist

- Own ONLY your files below. Keep every footprint, anchor, box, variant (`o.v`) and moving part (a wheel
  that turns, smoke, a flag) where it is: no gameplay or layout change. Bake: draw a sprite once per
  size / variant and blit it, never pixel by pixel each frame.
- `node --check` every file after every edit (a syntax error breaks the dev server for everyone).
- The dev server is up on http://localhost:5173: never stop it. Look in your OWN built-in-browser tab
  (tabs_create; close it when done; the pane must be showing or a lab stalls, so tabs_select your tab
  before waiting). Shots in `.shots/<prefix>_*.png`: before and after crops at x3-5, one at x1-2.
  Scratch files in `scratchpad/<prefix>/`. No git that changes anything.
- At most two look-fix passes. Report: what you changed per piece, shots, bake cost if you measured it,
  weak spots.

## Sets

**1. The halls' moving rings** (prefix `ohr`; files `src/render/halls/catapult.js`, `spiker.js`,
`riverwatch.js`, `wizard.js`, `warden.js`, `sunforge.js`, `kitB.js`, and a new
`src/render/halls/pixrings.js` for shared helpers). The halls are pixel art now, but these still stroke
smooth canvas arcs / ellipses: catapult.js ~212 (the arm's swing arc), spiker.js ~119 (the fire flash
ring), riverwatch.js ~57-58 (ripples at the dock), wizard.js ~236 / ~289 (the orb's ring, the storm
marks), warden.js ~64 (the pulse), sunforge.js ~60 / ~114 (the halo, the pulse), kitB.js ~50 / ~140
(check whether these are drawn shapes or just a clip; leave a clip alone). Make each a stepped pixel
ring / arc in the hall's own light colours (see how `src/render/rings.js` and `ringflash.js` squash ground
rings, 0.55-0.7, and bake per radius bucket and frame). Same timing and size as today. Look with
`hallshot.html` and `shotlab.html` (read their headers) on each hall while it fires.

**2. The Greenwood vale pieces** (prefix `ovl`; files `src/render/scenery-vale.js` and a new
`src/render/pix/vale-pix.js`). Sculpt the bodies of `menhir`, `stonefall`, `trilithon`, `watermill`
(the wheel keeps turning in Millrace's race), `cottage` (keeps its smoke), `boat`, `netrack`, `creels`,
`skeps`, `haywain` (the `VALE_ART.decor` keys); `marram` and `thistle` only if budget allows. Put the
new painters in vale-pix.js and point `VALE_ART.decor` at them; delete the old painters they replace.
Boards: kingstones (standing stones), millrace (the mill), gullwick (the hamlet: cottage, boats, nets,
creels), thistlecrag; look with `shots.html` `snap(name, realm, [], {}, [x, y, w, h, scale])` (read
its header for how to find each piece's spot).

**3. The title screen's props** (prefix `otp`; file `src/ui/titleCrowd.js`, lines ~110-170 only:
the pole, the cart, the stall and its awning beam, still soft paint.js `part()` pieces beside pix
figures). Sculpt them with the pix kit at the same size and place. Look with `title-lab.html` (read its
header) and the real title screen.

**4. The campaign map's towns, keeps and castle** (prefix `omt`; file `src/ui/mapArt.js` only). Its
lines are tinted but the sprites were never re-sculpted: `crownCastle`, `ironKeep`, `walledTown`,
`drownedVillage`, and every other town / keep / village / ruin `spr(...)` the map draws (list them first).
Same sprite sizes (`spr(key, w, h, ...)`), same places; at the map's small scale keep them readable
before detailed: clear roofs and walls, one sun, the tinted line, a lit window or two. Do the biggest and
most-seen first (the crown castle, then each chapter's capital, then towns, then villages / ruins).
Look with `map-lab.html` (read its header) and the campaign map at phone and iPad sizes.
