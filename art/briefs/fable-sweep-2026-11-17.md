# Old-style sweep and effects audit (advisor, 2026-11-17)

Judged from code and existing shots (`.shots/ringanim_*`). The dev server was down, so nothing was rendered fresh: the storm, blizzard and Rime effects are read from their painters, not seen.

**Recommendation:** send the Rime effect placeholders and the storm's standing water to concept first (B1, B2), with the novas (B3) since the owner already asked. For old art, do the Iron prop bodies and the `part()` ink fix first (A1, A2).

## A. Old-style assets (ranked by visibility)

Already done since the notes, drop from the list: castle wall bowmen / halberdiers / masons (castle.js uses the pix figs), the title wall folk, bushes (pixel-built, only their inner line is old), the decor outer ring (tinted everywhere).

| # | Asset | Files | Why it reads old | Vis | Size | Batch |
|---|---|---|---|---|---|---|
| 1 | Iron props' bodies: camp gate, tents, wagon, pikes, King's tower, ruins, salt works, drill field, quay | scenery-iron.js (387 `part()` calls; only 5 pieces sculpted) | Ring is tinted, bodies are still soft paint.js fills with near-black inner lines | High | L | Iron props, 2 artists (camp + tower; the sets) |
| 2 | `part()` inner line | paint.js l.402 (`INK_LINE`, `STYLE.inner`); castle.js l.149 | One near-black for every inner edge. scenery-vale already swaps in `tintedPart` (scenery-gwpix.js): do the same in iron / hollow / rime / kitB / buildkit / world.js bushes | High | S | Lead or 1 artist: one global fix, do before 1 and 3 |
| 3 | Hollow props' bodies: graves, fence, barrows, statues, relics, willows | scenery-hollow.js (294 `part()`, no `sculpt`) | As 1; "flat" pieces skip the ring but are not sculpted | High | L | Hollow props, 2 artists |
| 4 | Frozen-hall ice shell | rimefx.js `drawFrostShells` | A translucent rectangle with fillRect icicles, one size for every hall | High (Rime) | M | With B1 |
| 5 | Halls' live bits: Sunforge / Warden / Wizard rings, River Watch ripples, Bladewheel flash, catapult arcs, yard props | halls/*.js, halls/kitB.js, buildkit.js | Anti-aliased `ctx.ellipse` / `arc` strokes and soft kit pieces on the new pixel halls | Med-High | M | "Hall live bits", 1 artist |
| 6 | Bridges | bridge.js (`inkData`, 2-px silhouette ink) | Heavy ring kept on the span | Med-High | M | 1 artist |
| 7 | Campaign map towns, keeps, castle | ui/mapArt.js (`crownCastle`, `ironKeep`, `walledTown`, `drownedVillage`) | Lines tinted, sprites never re-sculpted; no pix imports | Med-High | L | Map, own round (concept first) |
| 8 | Title crowd carts, stalls, peasants | ui/titleCrowd.js l.122-160; titleArt.js `inkOutline` x2 | Old `part()` props beside pix figures | Med | S-M | 1 artist |
| 9 | Vale village (mill, cottage, haywain) and Rime leftovers | scenery-vale.js, scenery-rime.js (145 `part()`) | Tinted lines, soft bodies | Med | M | After 2, judge again |
| 10 | Coast rocks / drift, heather, storm cloud, range-ring fills | coast.js l.412/526, scenery-iron.js l.1303, stormcloud.js, draw.js arcs | Default dark ink; vector discs | Low-Med | S | Sweep-up |
| 11 | HUD / weather icons, old `sprites/` fallbacks (EnemyIcon, towers.js `MINI`) | ui/hud/icons.jsx, src/sprites/ | Own flat style, `#241a26` ring: consistent, leave | Low | M | Not now |

## B. Animations worth upgrading

1. **Rime and sea effect placeholders** (rimefx.js: `landingWarn`, `shipsink`, `plank`, `frostcast`, `thaw`, `ringFx` for serpent / kraken rise and the giant's `stomp`, `lineFx`, `ripple`). Weakest in the game: vector ellipses, a monospace "!", fillRect dots; the file itself calls them placeholders.
   - A: the same shapes pixel-baked: stepped ring, tinted line, a sculpted horn-and-ship mark for the warning.
   - B: the water acts: a bow wave and foam at the beach, the ship breaking and going under in 6 frames with flotsam, a serpent rise as a boil of foam then falling spray, the stomp as cracked ice and thrown snow.
   - C: B plus a cold flash and a rime-crystal ring that freezes on the ground a second.
2. **Storm puddles, floods, wet road** (weatherfx.js `stormGround`, `drawFloods`; weatherbake.js `puddle`, `floodDisc`, `dimple`, `splash`, `wetRoad`). The owner's ask holds up: one noisy ellipse with a fixed diagonal sky band, the same slate on grass and road, fading in by alpha; floods are discs; the road film is a flat darkening.
   - A: same placement; puddles take the ground's colour (mud on road, dark green on turf), a lit near rim, grow from the middle not by alpha.
   - B: puddles follow ruts and hollows (irregular, joining as it soaks), a moving cloud reflection, drop rings that overlap, floods with a creeping foamy edge and a current, run-off trickles off the verge.
   - C: B plus lightning mirrored in every pool, wind ripples in gusts, footfall splashes under marchers.
3. **Fire and frost novas** (rings.js `firenova`, `frostnova`). In the strips: a thin dotted ring over empty ground, running well past the foes, nothing left behind.
   - A: a thicker stepped front with a short tail, capped to the real area.
   - B: fire: a rolling flame wall with a scorched annulus and embers (reuse flames.js); frost: a rime sheet spreading under the feet, spikes snapping up at the front, then melting.
   - C: B plus a core flash at the hall and a lingering heat shimmer / ice glaze for a second.
4. **Lava, plague, spore, caltrop pools** (fx.js `drawGround`, `groundSprite`): 4 frames of one disc with fillRect tongues, beside the new burning ground. A: richer 8-frame bake. B: broken crust, bubbles that swell and pop (plague B's bubbles), a creeping edge. C: adds fissures and a glow thrown on nearby ground.
5. **Lightning strike and its after-effects** (weatherfx.js bolt, `wxArcs`, `hallShocks`, `boltScorch`): baked already, but no ground reaction. A: more bolt frames. B: branching ground-crawl in the wet, steam off puddles, scorch with glowing cracks. C: a white frame and long shadows thrown from figures.
6. **Blasts, chain, poof, flash** (fx.js `drawBlast`, `drawChain`, `drawFlash`): kept "as they were"; the catapult and keg should now match the fire work. A: tighter frames. B: debris, a dust skirt, a crater that fades. C: shockwave bending the grass.
7. **Blizzard and eruption ground** (weatherfx.js `blizzard`, `eruptionGround`): sheets fall but nothing settles. B direction: snow banking on the windward side of halls and the road; ash dusting, glowing impact craters.
8. **Midas coins, toll** (rings.js): tiny and faint in the strips. Low priority.

## Risks

- **Bodies:** every item in 2, 3, 4 and 7 is a ground effect: draw under figures (`drawWeatherGround`), only spikes or tongues in front, as `drawFireFront` does. Puddle reflections of figures would break this: skip them.
- **Perf:** puddles and floods are per-board bakes: keep animation to frame swaps, not per-frame noise. Flood currents and joined puddles raise the bake count: cap it and watch weatherbake's memo (clears at 900). Novas reusing flames.js need per-radius buckets.
- **Bake stalls:** fixing `part()` globally re-inks every decor bake (first-sight cost); tinting adds a readback per part. Measure the first frame of an Iron board.
- **Approval:** the owner kept the magic hit, catapult / keg blast and likes the magic "flashing rings": item 6 and the novas need a concept round first, not a straight change.

## Lead's correction (2026-11-17, after acting on it)

A1 was wrong: the Iron props were re-sculpted on 2026-11-15 (commit 472b9ed, the `*X` painters in
`IRON_ART.decor`); the 387 `part()` calls are the OLD painters left in scenery-iron.js, unused. Only
`irpan`, `irsluice`, `irwreck` were still old (now `src/render/pix/iron-works.js`). A2 (the tinted inner
line in paint.js `part()`) is in, but changed little on screen. Before acting on A3-A10, check what
each decor map / painter actually calls today, not how many old calls a file holds.
