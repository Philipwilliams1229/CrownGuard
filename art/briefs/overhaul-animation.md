# Overhaul concepts: ANIMATED views (2026-11-22, owner request)

The owner: "next round of previews, can you include an animated view so i can see how things move?
for rivers, lakes, ponds, bridges, trees, etc". From now on every concept round shows motion as a
PLAYING loop on the page, not only frame strips side by side. (Standing rule for future concept
pages too.)

## What to deliver (per loop)

- A short seamless LOOP of the real thing as it would move in the game, at the game's own speeds:
  2 to 4 seconds, 8 to 12 frames a second (so 20 to 40 frames). Seamless: the last frame leads into
  the first (use periodic motion: phase = frame / F; offsets that wrap; clocks that are whole
  multiples of the loop). Things with their own clocks (a walker crossing a bridge) may simply
  enter and leave within the loop.
- Framed on the feature at a size where the motion reads: a crop of the REAL board about 200-280
  board units wide, drawn at 2x (so 400-560 px wide, 260-380 px tall). Whole pixels only: move
  things by whole art pixels; no blur, no sub-pixel smear.
- Saved as ONE sprite-sheet PNG, frames laid left to right then top to bottom in a grid, every
  frame the same size, no gaps or labels inside frames:
  `.shots/ovh3_anim_<name>_c<cols>r<rows>_fps<fps>.png` (for example
  `ovh3_anim_river_cut_c6r4_fps10.png` = 24 frames, 6 across, 4 down, played at 10 fps).
  Keep each sheet under about 3400 px wide (so cols x frame width <= 3400) and under 3 MB if you
  can. Unused cells at the end are not allowed: frames = cols x rows exactly.
- Also save the first frame alone as `.shots/ovh3_anim_<name>_still.png` (the page shows it before
  the loop loads).
- In your notes: one line per loop: what moves, how fast (px a second or period), what would cost
  what in the game (baked frames, scrolling, sprites), and anything faked for the loop.

## How to check a loop without watching it

You cannot watch video. Check motion by: (1) looking at 4 frames a quarter-loop apart side by side
(things must have clearly moved, in the right direction, by a sensible amount); (2) diffing frame
0 against frame F-1 and against frame 1: the F-1 -> 0 step must be about the same size as the
0 -> 1 step (no jump at the loop point); (3) checking nothing flickers: a pixel that is the same
in frames 0, 2, 4 but different in 1, 3 is shimmer: count such pixels and get them near zero
outside the things meant to move.

## Working rules

As in `art/briefs/overhaul-concepts.md` (concept files only, no git, own browser tab, dev server
at http://localhost:5173 not to be restarted: if it stops answering say so at once and stop; other
sessions' edits reload lab pages every 20-60 s, so make your lab resumable). The owner's picks so
far are in `art/briefs/overhaul-round2.md`: animate the CHOSEN looks, not rejected ones.
