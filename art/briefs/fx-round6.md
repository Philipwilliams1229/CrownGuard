# Effects concepts, Round 6 (2026-11-21): the slow / chill on a foe

The owner saw a stunned foe that was also slowed and read the slow's frost ring at the feet as
part of the stun ("a circle around the feet as well as the spinnies around the head"). Today's
slow sits on the GROUND (a frost ring, rime tufts, falling motes: `src/render/statusfx.js`
`slowSprite`) plus a wheel of stars over the head (`src/render/fx.js` `starWheel`, more stars and a
lazier turn the harder the slow), and the stun is gold stars round the crown, so the two blur.
The owner: "maybe we could have a different thing for frost", and "I do like the fire look by the
way. So something like that."

**The fire look they like** is Round 5 B, in the game: `statusfx.js` `statusBurn` / `burnSprite`'s
neighbour, the edge-burn (read it: `maskOf`, the BURN Round 5 B section). It reads the outline of
the very frame drawn and lights THE BODY'S OWN EDGE: a hot band along the silhouette, colours
rolling round it, small flames popping up at edge spots and going out, smoke behind. The concept
of it is `concept/fx-r5-burn.js` option B: start from that file's helpers (`maskOf`, `body`,
`rim`, `fifth`, `bay`).

So the slow's new look rides the BODY, like the fire: cold on the figure, not a ring on the
ground. Nothing over the crown, so it can never be mistaken for the stun's stars.

## The row

`concept/fx-r6-slow.js` (yours alone), `export const ROWS = [ row ]`, row id `slow6`,
`group: "Round 6"`, `todayKeys: ["slow"]` (TODAY is the game's own slow at 40%), shape as Round 5
(`{ id, label, group, note, cw, ch, ax, ay, N, todayKeys, A, B, C, D }`). A walking goblin
(`e.foe(f)`, its walk frame, as fx-r5-burn.js `body`), looping cleanly over `e.i` / `e.N`, N 10-12.
Painters get `(c, e)`: c translated to the goblin's feet, 1 unit = 1 art px; pure canvas code, no
game imports. Show a slowed walk: the goblin's own walk is fine (the game slows the clock).

Four options, all on the body's outline like the fire (change the spread if you find better):
- **A: hoarfrost edge.** A pale ice-blue 1-px rim along the silhouette (top and outer edges
  strongest), rime crystals (2-3 px stepped flecks) forming at edge spots and fading, a faint cold
  breath-puff by the mouth now and then.
- **B: creeping ice.** Frost climbing the body from the feet: the lower third glazed (lit glass
  blue, a bright edge line where it stops), small icicles hanging off the hem / arms, the line of
  the glaze wobbling up and down a little.
- **C: cold mist.** A thin blue-white mist hugging the outline (dithered, 1-2 px out from the
  edge), drifting down off the body and pooling faintly at the feet, a few glints on the edge.
- **D: your own idea** on the same rule (e.g. the figure's colours chilled toward blue with a
  frosted rim, or snowflake glints crawling round the outline).

Rules for every option:
- Cold LIGHT painted as the game would (style guide "Light on the board", `addLight`): a cool rim
  in fifths of strength, never a full-body tint that hides the figure. The face stays readable.
- No ring or shape on the ground wider than the feet, and nothing over the crown.
- Strength: the game has three slow levels (under 30%, 30-60%, over 60%). Paint the middle one;
  say in your report how A-D would grow for the other two (more coverage, brighter rim).
- It must still read when the foe is ALSO burning (today fire and frost stack): in ONE option of
  your choice, also draw it over the Round 5 B burn (copy the burn's look, don't import the game)
  and put that as an extra strip if the lab allows, else note how it reads.
- Pixel style: stepped tones, the tinted 1-px line, one sun (top-left), no soft blur.

## How to look, and the rules for artists

The lab: `/fx-concepts.html?only=slow6` paints `.shots/fxc_slow6_{today,A,B,C,D,Bdark}.png`
(dev server at http://localhost:5173, already running: don't stop it). Read the PNGs to look.
Scratch in `scratchpad/slow6/`. Your own browser tab in the built-in browser (tabs_create), closed
when done; never resize the window or touch others' tabs, no git that changes anything, never
search outside the repo, `node --check` your file after every scripted edit. At most two look-fix
passes. Report: a line per option, and anything NOT CHECKED or weak, plainly.
