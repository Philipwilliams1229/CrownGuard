# Bridges: the drawing rule for a span running up the screen (Fable's answer, 2026-11-22)

The owner on round 1's bridges: "The up the road look needs work for A and B, have fable take a
look because thats a common structure." This is the advisor's answer. Nothing was drawn or tested.

Facts measured from every realm's `BRIDGES`: 42 spans, 31 across, 11 up, 0 diagonal. The
Greenwood's timber spans are 5 across and 5 up (Wolfrun's four are all up). Up-screen spans today
are only 40-64 units long.

## Recommendation

Drop the castle's `KF` slant for bridges. Draw every span as ONE SOLID in its own (u, v, z) frame,
projected the way `bridgeLift` already lifts walkers (screen = x, y - z), and make the structure
itself BATTERED (legs and walls lean out about 0.4 of their height). The flanks then show as true
narrow strips on BOTH sides at any angle. Same bake for across, up and any future diagonal: it
extends today's `bakeSpan`.

## Why round 1's up-screen panels read wrong

- The flank is unfolded: a side elevation sheared 85% sideways, so arches become lozenges lying on
  the water and the truss looks like a fence fallen on the grass.
- It is one-sided: a 15-unit skirt to the west and stubs to the east: tipped over, off-centre.
- The deck is a flat rectangle: even courses / planks, one hard tone band; nothing says "rise".
- Nothing faces south: the camera's one strong height cue (south faces, as on halls and the
  castle) is absent.
- The cast shadow implies height over land too: its rectangle runs on over the grass at both ends.

## The rule (up-screen)

- **Deck.** Plank or sett spacing on screen is pitch x (1 + slope) on the near slope and pitch x
  (1 - slope) on the far slope; cap the slope at 0.5. Pitch 3, trestle ramps at 0.4: 4.2 near, 3
  level, 1.8 far. Three values: near ramp lightest, level mid, far ramp one step darker, a 1-px
  lit lip at each break.
- **Flanks.** A strip of 0.4 x height on BOTH sides: 4 units (8 art px) for the trestle, 6-7 at
  the humpback's crown. The sunward strip (`DAY.side`) lit, the other shaded; bake both.
  - Trestle: each bent shows a cap end, a raked outer pile down to a wake, a knee brace up to the
    rail, X-braces between bents inside the strip.
  - Humpback: arch mouths are dark half-ellipses in the strip with a 1-px voussoir rim; cutwaters
    project 6-8 units into the water, white tongues downstream.
- **Rails and parapets.** Edge-on: a 2-px top line lifted by their height, post caps as dots.
  Never lay the truss flat.
- **Far (north) bank.** The wing walls beside the deck face SOUTH: draw them in full elevation at
  deck height, stepping down outward, with a wet foot line and reflection. The tallest honest cue.
- **Near (south) end.** Only the coping tops of the wings, the tapering ramp strips, and the
  bridgehead posts and lanterns in elevation. No end wall.
- **Height cues.** A gloom band on the water hugging both strips; a thrown shadow of `DAY.fall` x
  `len` x height at each point (zero at the ramp feet, never a rectangle on land); skiffs
  vanishing under one strip and reappearing at the other.
- **Diagonals.** The same solid: the south-leaning flank gains elevation as the road turns. Keep
  jambs and posts vertical; never rotate the across sprite. (No board has one: no concept panel.)

```
TRESTLE, road up-screen (N at top, ~ water, units = board)
        |   road   |
  WWWW--+==========+--WWWW   far wing walls: SOUTH faces, 10 high
  ~~~~>#|----------|#<~~~~   # cap end   > < raked pile + knee brace
  ~~~~ X|  planks  |X ~~~~   X brace in the 4-wide strip
  ~~~~>#|----------|#<~~~~
  ~~~~  | NAV BAY  |  ~~~~   one bay >= 18 clear, no X: the skiff's way
  ~~~~>#|----------|#<~~~~
  ~~~~ X|          |X ~~~~
  ____.-+==========+-.____   near: coping tops only; strips taper to 0
     o  | planks   |  o      posts, lanterns (front layer)
        |  wide    |         ramp runs ~25 onto land

HUMPBACK (later)
  WWWW--+==========+--WWWW
  ~~~<( |  setts   | )>~~~   ( ) arch mouth in a 6-wide strip
  ~~~<[]|  close   |[]>~~~   [] pier, < > cutwater nose, 6-8 out
  ~~~<( |= crown ==| )>~~~   lit lip at the crown
  ~~~<[]|  setts   |[]>~~~
  ~~~<( |  wide    | )>~~~
  ____.-+==========+-.____
```

## Layering (draw order)

1. water  2. gloom and thrown shadow  3. skiffs under (`underBridge`)  4. piles, piers, strips and
far wing walls  5. deck and side rails  6. walkers (lifted)  7. front strips (`pushBridgeFronts`,
y-keyed). Up-screen, only the south bridgehead posts and lanterns go in the front strips; the side
rails never cover a walker. On an across span the near rail goes in front, as now.

## The mistakes an artist is most likely to make

1. Rotating or shearing the across elevation onto the flank.
2. Even plank / sett spacing, or a tone split in place of the spacing change.
3. Strips wider than 0.4 x height, or on one side only.
4. A thrown shadow drawn as a rectangle over land, or still falling east under a sunrise sun.
5. Bents spaced evenly with no navigation bay, or a slope over 0.5 so the far ramp collapses.

## Watch for (engine)

- Span length is the real constraint: a 10-high trestle needs about 25-unit ramps; a 17-high hump
  needs a span of about 106. Today's 40-52 unit spans allow about 8, exactly `BRIDGE_RISE`. So
  ramps must run onto land or rivers must widen (the owner allows wider rivers, never narrower).
- Longer spans touch the engine: `archAt` and the span ends `d0` / `d1` live in
  `src/data/terrain.js`; barricade refusal, flood sites and `clipDecks` read the decks.

## Today's flat bridge (the owner wants it kept, updated, as a third kind)

The same rule with small numbers: rise 8, vertical piles, so no strips. It keeps its cap ends past
the deck and gains the spacing change, the far wing footings in elevation, the gloom plus the
height-following shadow, and the area's road colours.
