# Brief: the sunset before the Blood Moon (2026-11-22)

The Hollowfen's last 8 / 12 waves are fought under a blood moon, and it begins as "the sun sets,
and a blood moon rises" over ~40-45 s of combat (`g.weather.phase === "rising"`, `w.k` 0 -> 1).
Today's sunset is a flat orange soft-light wash over the whole board (`dusk` in
`bloodmoonPaint`, src/render/bloodmoon.js). The owner: "sunset didn't read well, I fear someone
would think their phone is breaking". A uniform tint of the whole screen reads as a display fault.
The fix (the advisor's diagnosis): **the dark must have an edge, a direction, and a reaction from
the world.**

Read first: `art/STYLE-GUIDE.md` (one sun, upper left; pixel rules; performance),
`.claude/agents/artist.md`, CLAUDE.md "The Blood Moon", then src/render/bloodmoon.js and
src/render/nightlight.js.

Geometry: the sun sets off the LEFT, behind the wood. Its shadow crosses the board left to right;
the last gold light sits on the castle at the right. The red moonlight then follows from the upper
left, as it does now.

## The job: CONCEPTS, not the build

Sketch four options so the owner can pick. Each option is a strip of frames through the rise on
Bellmarsh (the Hollow, a wave in progress, foes on the road, a few halls): k = 0, 0.15, 0.3, 0.45,
0.6, 0.8, 1 (seven frames), drawn with the REAL engine and draw() (start from `bm-lab.html` /
`wx-lab.html`, which already step the engine and snap). Board-size frames, plus one 2x crop per
option of a hall, the road and some foes at k 0.45.

1. **A. The dusk line.** A ragged, treeline-shaped shadow edge crosses the board from upper left to
   lower right over k 0.1 to 0.6: behind it today's plum shade at FULL strength, ahead of it
   untouched daylight, and a 6-10 unit band of warm gold dither riding just ahead of the edge (the
   last sunlight). Never a straight wipe; slow. From k 0.6 the red rake and eyes come in behind it.
   Build it by clipping the existing shade passes (`bloodmoonGround`, `bloodmoonPaint`) to a stepped
   polygon (~60 points) that moves with k, plus one baked edge strip (dithered crowns + gold lip).
2. **B. A + lamps lit as the line passes.** Each hall's torch catches as the line crosses it (a
   150 ms white-gold flare, then its pool); the castle's gate torches last; foes' eyes ignite the
   same way, per foe. `noteLamp` already takes a per-lamp k: pass a step of (line - lamp) instead
   of one global alpha. Check whether the castle's torches are noted as lamps (castle.js keeps its
   own `torches` list); if not, say so and fake it for the concept.
3. **C. Long shadows and a gold rim, then the night.** Over k 0 to 0.35 every hall's and figure's
   shadow stretches down-right to ~2.5x and the light turns amber (figures' and halls' upper-left
   rims amber, if the light system can do it cheaply), with NO full-board tint; then the shade comes
   in behind (keep A's line or a plain fade, whichever reads better: say which you chose).
4. **D. A + the water carries the sky, + crows.** A, plus ponds / rivers / bog pools that catch gold
   glints ahead of the line, rose at it, and a blood-red sheen once the moon is up (a water mask
   baked once per realm from water.js, one tinted masked blit), plus a flight of crows crossing left
   to right just ahead of the line, with ground shadows. Bellmarsh has water: use it.

Do NOT draw a sun disc or a glow at a board edge (with no horizon it reads as a vignette or a
backlight fault). Do NOT use any full-board uniform tint.

## Where it goes
- Concept code only: `concept/sunset.js` (or `concept/sunset-<opt>.js` files), a lab page
  `sunset-lab.html?opt=A|B|C|D&k=...` (or a strip mode that steps k), and a gather page
  `sunset-concepts.html` that shows all four strips one under the other with a title and a one-line
  description each (it's the page the owner will look at). The concept may monkey-patch or wrap
  bloodmoon.js's exports from the lab page; do NOT edit src/ files. If something truly can't be
  shown without a small src/ edit, stop and say so in your report.
- Shots in `.shots/` with the prefix `sun_`; scratch in `scratchpad/sun/`.
- Dev server: http://127.0.0.1:5173 (the lead keeps it up; if it answers 000 say so, don't start
  another). No browser pane: `node scripts/shoot.mjs "<url>"`.

## Report
For each option: the strip and crop paths, what you built, the cost per frame you measured (a
rough number is fine: `performance.now()` around the painter), and what reads well / badly in
your own honest view. Also the shot of `sunset-concepts.html` (whole page). Flag anything NOT
CHECKED. No git that changes anything. Tool-call budget: about 90.
