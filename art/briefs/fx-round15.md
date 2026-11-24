# Effects concepts, Round 15 (2026-11-24): three variations on Round 14's B (Dragonbreath)

The owner picked Round 14's B (`concept/fx-r14-b.js`, Opus: the comet that lands, pumped) out of three:
"Opus's B is actually much closer to my vision! It needs a bit of work. Can you make the stem a bit wider
before it gets to the flared end, and there seems to be a little trail of light connected to the castle.
I see where you were going with that but it didn't land, we can remove it. Give me 3 more Opus variations
on this B." Read `art/briefs/fx-round14.md` (the contract, the reference picture
`art/briefs/ref/dragonbreath-ref.jpg`, the rules) and look at `.shots/fxc_breath14_B.png` first.

## Every variation does these two things

- **A wider stem before the flare.** Today the jet is a needle for most of its length and only fattens
  right at the head, so it reads as a lollipop. Widen the stem along its length so it is a real body of
  flame well before the head (the reference widens steadily all the way). It still starts thin at the staff.
- **No trail of light on the road.** Remove the dithered lit streak under the jet's flight from the hall's
  foot to the landing (the "light on the road" block, ~line 79). The landing's own glow under the head and
  the kit's `heat` / `pool` marking the damage wedge may stay.

Everything else B does well stays unless your variation says otherwise: the needle and spark at the
staff, the mottled body and pale core, back-leaning licks, the round head landing ON the road with the
goblins' feet in the fire (depth-sorted pixel by pixel), two pumped surges a loop, no smoke, no ground fires.

## The three variations (each artist owns one file, already a copy of Round 14's B)

1. `concept/fx-r15-a.js`: **B, fixed.** Only the two changes above, as close to B as possible. The stem
   grows steadily from the needle to about half the head's width just before the flare.
2. `concept/fx-r15-b.js`: **a heavier torrent.** The stem is wide early (a full body of flame from about a
   fifth of the way down) and the head's flare is smaller relative to it, so stem and head read as one thick
   pour of fire onto the foes, more like the reference's long comet; goblins in the head stay more visible.
3. `concept/fx-r15-c.js`: **a stronger pump.** A wider stem, and each surge is a clearly visible fat, bright
   bulge rolling down it; when it arrives the head squashes out wider and lower along the road, then
   settles. Two surges a loop (or four, if it reads better; it must close in 16 frames).

Contract, lab and rules as Round 14: the file exports `paint(c, e)` and `note` (2-3 plain sentences for
the owner on what this variation does), imports from `concept/fx-r14-kit.js` (never edit it, nor
`fx-r14-b.js`). The lab `http://localhost:5173/fx-concepts.html?only=breath15` paints
`.shots/fxc_breath15_{today,A,B,C}.png` ("today" there is Round 14's B; A / B / C = variations 1 / 2 / 3;
judge only your own strip). Look at every frame at board size and zoomed, and the seam. Scratch in
`scratchpad/breath15-<a|b|c>/`; your own browser tab, closed when done; no git that changes anything; edit
only your file; `node --check` after every edit. At most three look-fix passes. Budget ~50 tool calls.
Report: what you changed, anything weak or NOT CHECKED, the PNG path.
