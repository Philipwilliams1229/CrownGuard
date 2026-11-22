# Overhaul concepts: ROCKS, STONES AND DECORATIONS (2026-11-22)

Painter `concept/overhaul-decor.js`, lab `overhaul-decor.html?scene=gw|iron|hollow&opt=today|A|B|C[&sun=golden][&strip=1]&save=1`.
The lab runs the real engine on the board (Gullwick, Crowstair, Bellmarsh), lifts the board's own decor (trees
stay: another artist's feature) and paints the option's pieces at board scale (1 art px = 1 px of the 2x board),
every piece sculpted with the game's pixel sculptor (`src/render/pix/pix.js`: one sun, tinted one-pixel line), so
it takes the level's light. Panels are a 420 x 280 board patch at 4x.

PNGs (`.shots/`): `ovh_decor_<gw|iron>_<today|A|B|C>.png`, `ovh_decor_hollow_<today|B>.png`,
`ovh_decor_gw_B_golden.png` (golden hour), `ovh_decor_strip_gw_B.png` (4-frame life strip),
`ovh_decor_boardsize.png` (all panels shrunk to board size, one sheet).

## A: Bigger, fewer, better
**Idea:** every piece at a believable scale next to a hall, and far fewer of them; each one a landmark.
- Different from today: a cottage two halls wide (96 art px, timber frame, thatch laid in courses, chimney
  smoke), a ruined tower 130 art px tall (taller than any level-1 hall), a boulder group you could hide a
  squad behind, a crag the size of a keep in the Iron Marches, a great striped pavilion, a menhir taller
  than a knight. About 4-6 pieces in a patch where today has 8-10 specks.
- Cost: bake ~5-15 ms a piece once (sculpted, like a hall form); per frame one blit each (fewer blits than
  today); memory ~0.3-1 MB a big piece.
- Engine: bigger footprints. `decorFootprint` must read each piece's true ellipse (as halls do since
  2026-11-18, `hallfoot.js`); pieces are placed by hand, at the board's edges and corners and in road loops
  too small for a hall, never on the road; the grounding pass must refuse (not nudge) a piece that does not fit.
- Weak spots: a single giant piece in the middle of hall ground costs the player a build spot (the Greenwood
  boulder group sits in the field's corner for that reason; it would need a level designer's eye per board);
  the hauled boat still reads flat; the crag's big facets read a little smooth at 4x.

## B: Places, not props
**Idea:** decorations gathered into small scenes that tell a story, on their own worn ground.
- Different from today: a farmstead (barn, stone cottage, well with a swinging bucket, haystacks, a kitchen
  garden in a fenced paddock, a hen house and hens, a yard of trodden earth, a path out to the road), a wayside
  shrine with a fingerpost and bench at the road bend, the hunters' old watchtower with a lean-to and fire,
  a fishers' strand (net rack, creels, boat). Iron: a war camp (palisade, tents round a stone-ringed fire, a
  command pavilion, banners, weapon rack, stores, horse line). Hollow (scene 3): a drowned parish's roofless
  chapel and its walled garth with a lychgate, lanterns and their light pools, rows of stones, a tomb, an
  open grave with a spade.
- Cost: bake ~20-60 ms a whole place (bake each place once to one canvas at load, like the castle run);
  per frame one blit a place plus a few live bits; memory ~1-2 MB a place.
- Engine: a realm lists `places: [{ kind: "farmstead", x, y, flip }]`; each place carries one footprint
  polygon (halls refused inside it). Places go where halls are weakest anyway: board edges by the castle
  wall, corners, beside water, road loops too small for a hall. The worn ground and paths go into the ground
  bake (world.js). Cheap life: chimney smoke (4 frames), hens (2 poses), a well bucket swing, banners, a
  camp fire, lantern flicker: about 10-20 tiny live sprites a board, ~0.1 ms.
- Weak spots: a place eats a corner of land that some boards use for halls today (each board needs its places
  chosen by hand); the trodden yard reads faintly at board size on the bright Greenwood grass; horses are
  small; the chapel's courses are a bit regular.

## C: Land with bones
**Idea:** geology and age first: the land gets height and terraces, and old stone follows the land.
- Different from today: south-facing ledges (low rock cliffs, 30-42 art px faces of stepped courses, a turf
  lip hanging over, roots, fallen blocks, the lifted land lit a step brighter and a shade band at its foot)
  lift the castle's strip into terraces; a bedrock spine breaks the field's turf; drystone walls follow the
  contours; the old road's kerb stones line its edge, some sunk and tilted; standing stones and an
  ivy-swallowed arch stand on the rise; bedrock shelves run into the beach. Iron: an escarpment that dies into
  the hillside at one end, a scree fan below it, walls stepping down the slope, a cairn.
- Cost: bake ~30-80 ms a ledge run (once, into the ground bake: these never move); per frame nothing extra
  (part of the ground layer); memory: none beyond the ground canvas.
- Engine: the biggest change. Ledges are terrain: they need a line in the realm data (`ledges: [{ pts, h }]`)
  that the ground bake draws and that blocks halls along its face (a thin footprint strip); the road must cut
  through a ledge as a sloped cutting where it crosses one (not shown); ranged lines of sight are unaffected
  (no height in the engine). Kerb stones follow `PATH_HALF` automatically.
- Weak spots: a ledge only reads as height if the land above and below differ; at board size the terraces
  read, but a long ledge across hall ground can look like a wall that cuts the field; kerb stones repeat; the
  bedrock spine is low and a bit spiky; walls and ledges carve the board into strips the halls must fit.

## Golden hour, and the life strip
`ovh_decor_gw_B_golden.png`: B under the golden-hour sun (data/sun.js `golden`): every piece is lit from the
west by the sculptor and warmed, and throws a long cast shadow to the east from its own silhouette (one shadow
layer, so overlaps never double). `ovh_decor_strip_gw_B.png`: four frames of the farmstead: chimney smoke
rising and drifting, hens pecking, the well bucket swinging (banners, fires and lanterns animate the same way).

## My pick
**B, with C's ledges and kerbs as the ground it stands on in the chapters that suit it (Iron, Rime).** B solves
the actual complaint ("a lawn with specks") by turning specks into a few places worth looking at, it keeps
the free ground clear for halls by design (places live at the edges and in dead corners), it is the cheapest to
build (bake once, a dozen small live sprites), and it gives each chapter its own stories (farms and shrines,
war camps, drowned graveyards, Rime longhouses). A's scale is right and should be B's scale rule (a cottage as
big as a hall); C's ledges are the boldest look but the most engine work and the biggest change to hall space.
