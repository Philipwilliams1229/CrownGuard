# The scenery and water upgrade (2026-11-22, owner request)

The owner, after the time-of-day pass ("New standard set! ... im blown away"): "do a graphics
upgrade on the foliage, ground, objects, decorative things, old towers, mills, bridges, water, etc.
Especially the water, I wouldnt mind a total overhaul with that. Keep it more or less in line with
the games style, but feel free to give it a fresh face. make it fancy, but watch the cost on the
engine lol. Add some shaders, depths, better wave animations, river physics, etc."

The owner is asleep and wants it done by morning. Work autonomously; never wait on a question.

## What "upgrade" means here

- **Same game, a fresh face.** Pixel art, the tinted one-pixel line, one sun, the chapter palettes
  (`art/STYLE-GUIDE.md`: read "The look", your area's sections, "The time of day", "Performance").
  A player should recognise every board at once and think it got a better artist: more depth
  (clear light / mid / shadow planes, overlap, contact shadows), more material (bark, thatch,
  moss, wet stone), better silhouettes, more life (a little motion where it is cheap).
- **Raise the weakest things most.** Look at your area's BEFORE shots first (`.shots/up0/`,
  `sun_up0_<realm>_<sun>.png`: thornbrook, gullwick, millrace, ironford, crowstair, frostwake,
  whalebone at every sun; bellmarsh, abbeymere at noon) and rank what looks oldest or flattest.
- **"Shaders" without a GPU.** The game is Canvas 2D; there is no WebGL and you must not add it.
  Per-pixel work (depth ramps, normals, dithering, caustics, refraction-like wobble, reflections)
  happens at BAKE time into small canvases or frame strips; a frame only blits (drawImage,
  scrolling a tile, a few dozen sprites). No per-frame getImageData / putImageData, no per-frame
  canvas bigger than what it shows, no shadowBlur / filter.
- **Cost is a deliverable.** Measure your area's ms a frame before and after (time 200 draws in a
  lab: `col-lab.html?...&perf=1` shows how; isolate your painter if you can) and bake time. Budget:
  the whole upgrade may add about 1 ms a frame on the dev Mac in total, so each area gets a
  fraction of a millisecond; water may take the largest share. Memory: phones were once killed
  for memory; say how many MB your new bakes hold and cap or drop caches.
- **The time of day is binding** (`src/data/sun.js`, CLAUDE.md "The time of day"): a level has one
  of seven suns. Draw for noon (light upper left); pix sculpts follow the sun by themselves;
  hand-painted pieces are drawn mirrored under an eastern sun (`NO_MIRROR` in scenery-gwpix.js for
  ones that must not turn); a piece's cast shadow is its silhouette made by sceneryday.js: never
  paint a long shadow into a sprite; any sprite cache clears on `onDay` (or keys on `DAY.v`);
  water and wet things should take the sun's side and colour (`DAY.side`, `DAY.col`, `DAY.warm`)
  where it is cheap. Check your work at noon, sunrise and golden (`sun-lab.html?...&all=1`).
- **Do not break what reads the scenery:** the engine places halls by terrain (never move a
  river, pond, coast, bridge, road or a decor piece's footprint: only how it LOOKS), the River
  Watch's lit water (waterreach.js bakes from the ground layer), the weather (weatherfx.js:
  puddles, floods, wet road, silt on a swollen river, ice in the Rime: `SEA_ICE`, the water's ice
  branches), the Hollowfen's blood moon, the apron beyond the board (it reuses the board's
  painters: no seam at the board's edge), the campaign map (its own art: leave it).

## The water's direction (both water agents: one look)

A total overhaul is welcome. Aim for:
- **Depth:** stepped bands from the bank (pale, warm shallows where the bed shows: pebbles, sand,
  weed, dithered) to a deep channel (darker, cooler, more saturated), following the channel's real
  shape, not a flat fill with an outline. A shaded lee under the near bank; a lit rim on the far.
- **Flow ("river physics"):** the surface moves the way the water would: streak lines that follow
  the banks' curve, faster and tighter in the middle and narrows, slack in the shallows and the
  inside of bends; a V-wake and foam behind every rock, post and bridge pier; a ripple line where
  a river meets a pond or the sea; eddies on the inside of sharp bends. Baked flow fields /
  scrolling strips, not simulation per frame.
- **Light:** glints that sit on the sun's side and warm with it; a soft, broken reflection or
  shade from banks, bridges and tall things beside the water (stepped, dithered); foam that is
  bright and reads at board size.
- **Waves (sea and big ponds):** a real swell marching to the beach in sets, breaking into a foam
  line that runs up the sand and drains back leaving a wet sheen; depth bands offshore.
- **One palette for all water of a chapter** (river, pond, sea must match where they meet):
  the two agents agree on it through a small shared module `src/render/waterlook.js`
  (the RIVER agent creates it first thing: the ramp per chapter kind and the helpers both need;
  the SEA agent reads it and asks for additions in its report rather than editing).

## Who owns what (edit ONLY your files; shared files belong to the lead)

| Agent | Owns | Job |
|---|---|---|
| river | `src/render/water.js`, new `src/render/waterlook.js` | Rivers, ponds, river mouths, the fen's pools as far as water.js draws them, the Rime's river ice look. The overhaul above. |
| sea | `src/render/coast.js` | The sea and coast: swell, surf, beach, wet sand, depth, the Rime's sea ice edge. Matches the river's palette via waterlook.js. |
| ground | `src/render/world.js`, `road.js`, `groundblend.js`, `look-c.js`, `apron.js` | Turf, the road, the verge, bushes and grass tufts, flowers and small ground detail, the land beyond the board. More depth and richness without noise; the road stays clearly readable as the road (the owner dislikes obvious lane ruts). |
| foliage | `src/render/scenery.js` (trees, the wood, rocks drawn there; NOT castle code), `scenery-gwpix.js` | Trees of every chapter that live here (oak, pine, willow, the dense wood's edge, shared `leafClump` / `pineTree`), rocks, mushrooms, dead trees. Better crowns, trunks, depth in the wood, a cheap sway if it can be had for almost nothing. |
| vale | `src/render/scenery-vale.js`, `src/render/pix/vale-pix.js` | The Greenwood's buildings and objects: mills (the wheel in Millrace's race), cottages, the fishing hamlet, standing stones, haywains, boats, old towers. |
| ironrime | `src/render/scenery-iron.js`, `src/render/pix/iron-works.js`, `src/render/scenery-rime.js` | The Iron Marches' and Rimewater's scenery: camps, tents, wagons, ruins, the King's tower, walls, crags, spruce; longhouses, racks, whale bones, rune stones, bergs, floes. |
| hollow | `src/render/scenery-hollow.js` | The Hollowfen's scenery: dead trees, graves, barrows, the drowned abbey, the weir, shrines, reeds and bog pools. It plays at noon (its own sunset and blood moon): check a blood moon frame still looks right (`bm-lab.html`, see its header). |
| bridges | `src/render/bridge.js` | Timber and stone bridges: decks, parapets, piers in the water (coordinate the wake with the river agent through your report: export the piers' positions if the river needs them, e.g. `bridgePiers()`), boats' art that lives here. Never move a deck. |

The lead owns `draw.js`, `data/*`, `daylight.js`, `dayshadows.js`, `daygrade.js`, `sceneryday.js`,
`castle.js`, `weatherfx.js`, `waterreach.js`, `atmosphere.js`, `pix/pix.js`, the guides. Need a
change there? One or two lines: make it and REPORT it. More: ask in your report.

## Working rules

- Read CLAUDE.md "Several sessions at once" and "Default way of working". Never run git commands
  that change anything. Never search outside the repo. Scratch files: `scratchpad/<your name>/`.
- `node --check <file>` after EVERY edit: a syntax error breaks the shared dev server for all
  eight agents. Keep the file loadable at every save (finish an edit before saving it).
- Look at your work: dev server http://localhost:5173 (do not restart it). Open YOUR OWN tab
  (built-in browser `tabs_create`, then `navigate` with that tabId), never touch other tabs, close
  yours at the end. `/sun-lab.html?realm=thornbrook&faction=greenwood&sun=noon&tag=<prefix>_x`
  saves `.shots/sun_<tag>_0.png` (1680x1120); `&all=1` saves every sun. Wait for the tab's title
  DONE, then crop with `sips -c <h> <w> --cropOffset <y> <x> in.png --out out.png` and Read it.
  Eight agents save files at once, and any save reloads every lab page: if a shot is missing or
  the title never says DONE, just run it again. Animated things: snap several times
  (`&snaps=4,4.3,4.6,5`) or write a small strip lab of your own. `/scn-apron-lab.html` shows the
  land beyond the board. No playwright here (`scripts/shoot.mjs` does not work).
- Always compare against the BEFORE shot of the same board and sun, side by side, and ask
  honestly: is it clearly better at BOARD SIZE (not zoomed)? If not, it is not done.
- Two or three look-fix passes, then stop. Budget: about 110 tool calls.
- Report (short): what changed and why it is better, files touched, lines changed outside your
  files, ms a frame and bake ms before / after, MB held, shot paths (before / after pairs), and
  every weak spot plainly ("NOT DONE: ...", "NOT CHECKED: ...").

## STATUS (the lead keeps this current)

ALL DONE (2026-11-22, ~05:50), committed locally, build passing, gw1 sim won and ir3 `--endure`
identical to before the upgrade (the engine is untouched). A session started by the scheduled wake-up
has nothing to do here: stop.
- Before / after pictures for the owner: `.shots/preview-upgrade/` (pairs per board; before shots in
  `.shots/up0/`).
- NOT DONE / weak (put to the owner): Iron wagons, pikes, standards, salt works, eyrie, quay, walls,
  milestones; Rime longship, longhouse slope, bergs / floes / skerries, seals; Hollow statues,
  barrows, bell-stones, weir, Lichgate pieces; the lone trees' crown sway was never watched in motion
  (`SWAY_ON` in scenery.js); small ground life is a light speckle at board size; the whole upgrade's
  frame cost was measured per area by the agents (water ~+0.2 ms, the rest baked), not as one number;
  first-sight bakes grew (decor ~720 -> ~860 ms, Rime ground +80 ms on the dev Mac); nothing seen on a
  phone or iPad; rocks and logs in rivers still shade for a noon light under an eastern sun.
- Pushed to main 2026-11-22 (owner: "go ahead and push this so i can see how the water works now").
- **The owner's verdict on the pictures (same morning): "I was hoping for more of an 'overhaul' ... These are
  incremental upgrades at best ... Dont be afraid to change things more radically to fit in with our new
  standard of graphics. Especially the bridges, they need a good rework. And how those rivers interact with
  the bridges, feel free to repath the rivers ... change the shore shapes, river widths (wider only, dont make
  any smaller streams) add some more larger puddles to maps."** They want style directions PROPOSED first
  ("we can nail down a style direction and go from there"): a concept round for water, bridges, trees, rocks,
  ground. Lesson for the lead: when the owner says overhaul, show bold concept options BEFORE building; a team
  told to "keep the style" polishes.
