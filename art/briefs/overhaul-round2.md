# The overhaul, concept ROUND 2 (2026-11-22): the owner's picks and notes on round 1

Round 1 (brief `art/briefs/overhaul-concepts.md`, which still binds: what a concept is, where
files live, the working rules, the report) showed A / B / C per feature on the private page
"Crownguard Overhaul Concepts". Round 1's pictures are in `scratchpad/overhaul-page/img/`
(`<feature>_<scene>_<today|A|B|C>.jpg`) and its painters and notes in `concept/overhaul-<feature>.js`
/ `.md`. Still NOTHING is built into the game: the owner decides per feature and per chapter
first ("I want to decide for each before beginning").

## The owner's words, feature by feature

**Water: A is chosen** ("Cut into the land"). "A for water, but we need to make sure the close
edge looks good, in those previews of the lake the sand and dock dont look great. Not all water
edges need to be cut in to the ground. But i do like the look of the water the best."

**Bridges: all three, with variety by area.** "I like both A and B, i think we could have both
throughout the game. B more for goblin area and ice areas, humpback for the iron marches and the
hallow fen perhaps. We dont have to throw away the old bridge design either, just some updates.
But it would be nice to have some variety in the bridges. The up the road look needs work for A
and B, have fable take a look because thats a common structure. So use all three but with
polish." And: "Match the road style and color for each of the different areas, so the bridges
look like they belong in each place, like they were built when the roads were."

**Trees: C's direction, calmer.** "I like the overall shape and direction of C the best, but I
think the leaf effect just went a little too far, they look like chia pets. can you show me some
more options similar to those? A mix between today and C is probably where I want it. I do like
some of the tree styles in today that arent present in the new ones." "OOOH i love the seasons
idea!! C in autumn looks awesome." "Show me some more tree concepts for the other areas. I want
to decide for each before beginning. Keep them all within the same kind of design realm as what I
had said for C above." "Also love the little deer add ins. I wouldnt be opposed to more of that
kind of thing in other areas."

**Rocks, stones and decorations: a combination, with polish.**
- Gullwick (Greenwood): "there are things I like about each one. I like the details in the
  little village of B, but with the house styling of today. I like the larger rocks and tower of A
  but the rock artist needs another pass, the rock has a sharp point looking bit towards the
  viewer, looks strange. I like the cliff edges and horizontal rock walls of C. A combination
  would be awesome. Lets see some more concepts."
- Crowstair (Iron): "None of them look amazing here, I know its just concepts but these would
  need some real polish. I like the castles in today, but with work and some more variation. The
  big rocks in B could use a similar polish pass to whats listed above for big rocks. I like the
  encampment in B but it would need work."
- Graveyard (Hollow): "Yeah love the new addition, but again some polish, lighting, etc to bring
  it in line with our new standard. Lets be sure to include some light sources in all of these
  types of areas to bring them to life as the sun goes down."

**Ground** (reviewed later the same day): "greenwood, love the terraces and the countryside, but I
would [not] want either on every level. Some variety would be nice. I like the look of C but its way
too detailed, a dialed back version could work well. Lets see some more concepts." Iron: "more of
the same points. I would want to see some other styles mixed in too to different areas, following
the theme of that area". "A looks cool on rimewater. A and C both look good on the golden hour, but
again C would need some work." (Read: terraces on SOME levels, worked countryside on SOME, a calmer
lush C as the everyday meadow; variety level to level.)

**SCOPE NOW (owner, same message): "we can keep our work more focused rn, just focusing on the
first area of the map."** Round 2 is the GREENWOOD ONLY. Do not draw the Iron Marches, Hollowfen or
Rimewater in this round (skip any per-chapter panels your task text asks for); spend that effort on
polish and on more Greenwood variety (different Greenwood levels: thornbrook, gullwick, millrace,
kingstones, thistlecrag ...). Once a Greenwood look is nailed down the other areas follow, and the
campaign map gets "likeminded changes" too.

## What round 2 must do differently

- The owner now reads these as near-final looks, so POLISH counts: round 1's stand-in grass, plain
  water and blob trees around a feature made options look worse than they were. Paint on the REAL
  game's board (run the engine and `draw()` as `overhaul-trees.html` and `overhaul-decor.html` do,
  removing only the pieces you replace), never on a flat stand-in lawn.
- Options are now VARIATIONS inside the chosen direction (label them 1, 2, 3 ... or by a short
  name), not three different ideas. Show TODAY and the round-1 option the owner referred to beside
  them so the change is clear.
- Light: every lived-in place gets a light source (a lantern, a window, a fire, a shrine candle)
  and one panel at dusk or night (`src/render/nightlight.js`, the Blood Moon's torchlight, is the
  game's own way: read it) as well as one at golden hour.
- Same file rules as round 1, with a `2` in the names: `concept/overhaul2-<feature>.js`,
  `overhaul2-<feature>.html`, `concept/overhaul2-<feature>.md`, PNGs
  `.shots/ovh2_<feature>_<scene>_<option>.png` (each at most 1680 x 1120). You may import round 1's
  painter from `concept/overhaul-<feature>.js` (do not edit it).

## The owner on round 2 (2026-11-22)

- **The lake:** "Lake still needs work. A proper fade into the water for the sandy bank would look so
  much better." (Round 2's beach is a pale band with a hard edge against deep teal water: the sand must
  be seen running on UNDER the water and fading out with depth.) The rest of round 2: "I'll get back to
  you on the rest later."
- **The lake, after the shore pass:** "Better but there is still just a line, let's have it blend into the
  water, the depth effect of the sand coast can be shown by a lighter shade towards the shore and darker as
  it gets further into the water. Give it another go." (So: NO visible band edges or waterline stroke between
  sand and water: a continuous light-to-dark blend. In pixel terms: many close steps joined by wide dither,
  not a few bands with broken edges. The lead's earlier "never a smooth gradient" was wrong for this.)
