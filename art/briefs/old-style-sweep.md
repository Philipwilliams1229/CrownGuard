# Old-style sweep (2026-11-15, read-only audit)

How to read: "old" = the 2-px near-black ring baked by `scenery.js decorSprite` (`bakeSprite(..., !flat.has(type))`,
`inkOutline` in paint.js) on soft/flat fills. Only pieces in a registry's `flat` list or drawn by `pix/` skip it.
Verified by eye on real boards (shots in `.shots/swp_*`). Size: S = a few hours, M = about a day, L = several days.

KEY FINDING. The scenery files never use `pix/` except scenery-iron.js, and there only for FIVE pieces
(spruce, scotsPine, crag, drystone, milestone: the `sculpt()` helper). So almost every PROP in every chapter is
still old, including the ones the chapter passes called "main pieces". Trees, turf, road, crags, walls are new; buildings,
camps, boats, graves, fences, towers, carts are old. Because the bake adds the ring for everything not listed in `flat`, a
cheap interim fix for ALL of them at once is a thinner, tinted ring (tint from the piece's own darkest fill) in
`bakeSprite`/`decorSprite` (scenery.js ~l.55-70 and ~l.1140): size S for 60 pieces, look still "painted" but not clashing.

## 1. Board props (Greenwood / Vale)  -- scenery.js, scenery-vale.js
Shots: `.shots/swp_t_greenwood.png`, `swp_t_greenwood2.png`, `swp_ov_gw.png`, `swp_full_millrace.png`.
1. Cave mouth (the Greenwood gate, every Greenwood/Ember board; also on Cinderholt, Warrens)  HIGH. `scenery.js drawGate`/`drawCave`/`drawGrove` (l.~1300-1720, `GATE`, `gateCrag`). Rock face is soft-faceted with a ragged dark rim, not block/lit-facet. M.
2. Wooden river bridges (Millrace x3, Thornbrook, Foxmere...) HIGH. `bridge.js drawBridge`/`drawBridges` (also stone bridge at Ironmouth, plank/stone causeways on Hollow boards, Lanternfen sluice bridge). Plank deck, rail, ring-line all old. L (1771 lines; several types).
3. Boulders/rocks ("rock", "icerock", "obsidian"; on nearly every Greenwood board, Rime boards use rmrock) MEDIUM-HIGH. `scenery.js boulder`/`rockBody` (the IRON `ircrag` was redone, these were not). S-M, reuse `crag` from scenery-iron.js.
4. Watermill + wheel (Millrace, live wheel), fisher's cottage (Gullwick, Foxmere), haywain, skeps (bee hives), net rack, creels, rowing boat  HIGH on those boards. `scenery-vale.js watermill, cottage, haywain, skeps, netrack, creels, boat` (VALE_ART.decor). Thick ring, flat fills. M for the set (7 pieces).
5. Watchtower (Gullwick) MEDIUM: drawn in a third style (no ring, blurred soft stone). `scenery.js watchtower` (also `obelisk`, `banner`, `tent`, flagged live). S-M.
6. Mushrooms (Blackbriar etc.), dead trees ("deadtree", very common on Cinderholt/Warrens/Ravenscar), willows ("willow", Millrace/Gullwick/Foxmere), reeds, gravestone, cairn, boneheap, crystal, vent, "marram"/"thistle" tufts. MEDIUM. `scenery.js mushroom, deadTree, willow, reeds, gravestone, cairn, boneheap, crystal, vent`; `scenery-vale.js marram, thistle`. NOTE the notes say willows were re-lit; the ring is still the old one. S each, M together.
7. Menhir / trilithon / stonefall (Kingstones, Thistlecrag) LOW-MEDIUM: lit facets, but ring still 2 px. `scenery-vale.js`. S.
8. Bushes (known list): `world.js`/`apron.js bushSprite`. Everywhere. HIGH (but already on list). S-M.
9. Sea-coast bits: sea rocks, driftwood, beach marram: `coast.js rockSprite, marramSprite, driftSprite` (inkOutline at l.409, 523). Gullwick, Ironmouth, Brinewick, Blackcliff, Rime shores. MEDIUM. S-M.

## 2. Iron Marches props  -- scenery-iron.js (shots `swp_t_iron.png`, `swp_ov_iron.png`, `swp_full_muster.png`)
Redone already: irspruce, irpine, ircrag, irwall, irmile. EVERYTHING below is old (heavy ring):
1. War tents (irtent, red conical), banners (irbanner, red standard on post), wagon (irwagon), pikes (irpikes), muster field pieces: Muster, Kings Road, Stonewatch, Gallows Cross, Greyhelm, Undercliff, Citadel. HIGH (the Iron army's whole identity, on ~8 boards). `warTent`, `standard`, `wagon`, `pikes`. M for the four.
2. Ironcamp spawn gate: wooden palisade ramp + gate tower + red banner + brazier (top-left of EVERY Iron board). HIGH. `scenery-iron.js drawIronCamp`, `ironGate` (irgate), `HOLLOW`-like `spawn: { ironcamp }`. L (large piece, one of the most seen).
3. King's tower (irtower, grey keep with red banner; Crowstair, Undercliff, Ironmouth, Citadel) HIGH. `kingTower` (l.860, ~320 lines). M.
4. Ruins (irruin; Crowstair/Wardenmoor/Greyhelm) MEDIUM-HIGH. `ruin` l.823. M. Gibbet (`gibbet`), beacon (`beacon` live fire) MEDIUM. S each.
5. Brinewick: salt works: saltHouse (chimney + kiln, live smoke), saltStore (sacks), pan (flat; salt rake piles), sluice, beached boat, wreck (Blackcliff). MEDIUM-HIGH on that board. `saltHouse, saltPan, saltStore, sluice, beachedBoat, wreck`. M-L set.
6. Wardenmoor: quintain, dummies, butts, weapon rack, muster. MEDIUM-HIGH. `quintain (live arm), dummy, butts, rack, muster`. M.
7. Blackcliff: sea-stack + gryphon eyrie (live; the nest and gulls), Ironmouth: quay + barge + crane, mooring, toll house. MEDIUM. `seaStack, eyrie, quay, mooring, tollHouse`. M-L (quay is big).
8. Heather clump (irheather, everywhere on Iron boards): "flat", pixel cushions; reads fine, own style but not sculptor. LOW. `heatherClump`. S.

## 3. Hollow Court props  -- scenery-hollow.js (3787 lines; imports NOTHING from pix/)
Shots `swp_t_hollow.png`, `swp_ov_hollow.png`, `swp_full_abbeymere.png`. All old paint.js + ring; the chapter pass only retinted ground/flags/wisp glow.
1. Dead trees / snags (fendead, fensnag; ~every board), weeping willows (fenwillow; the wood edge on EVERY Hollow board; moss-draped) HIGH. `fenDead, fenSnag, fenWillow`; also the Hollow `wood` pieces. M.
2. Graves, crosses, graves-in-rows (fengrave, gravestone), lich fence (lichfence: gate-posts with skull), cairns (fencairn), bones (fenbones), candle-skull dish (fencandle, live), statues (fenstatue), shrine, bell-stone, throne (fenthrone, Throne of Dust) MEDIUM-HIGH. `fenGrave, lichFence, fenCairn, fenBones, fenCandle, fenStatue, fenShrine, bellStone, fenThrone`. M-L set.
3. Barrows (fenbarrow, fenlongbarrow, fenroundbarrow; Cairnfields, Lanternfen): MEDIUM-HIGH. `fenBarrow, fenLongBarrow, fenRoundBarrow`, monks, hut, standing stone. M.
4. Water relics (belltower, arcade, column, sunkking, lanternpost, weir; Abbeymere, Lanternfen, Drownholm, Dead Weir): MEDIUM. `belltowerRelic, arcadeRelic, columnRelic, sunkkingRelic, lanternpostRelic` (l.2737-3000). Ring + soft shading. M-L.
5. Reed beds + bog pools + wisps: `reedBed, bogPool, fenWisp` LOW-MEDIUM. S.
6. The barrow-gate spawn (`drawBarrowGate`, l.3785) is the best of these; touch last. M.

## 4. Rime props  -- scenery-rime.js (already partly on your list)
Shots `swp_t_rime.png`, `swp_t_rime2.png`, `swp_ov_rime.png`.
1. Longhouse (snow roof; Runestead/Frostmere/Wolfsound), longship on the beach (rmlongship; also the Landing ship in rimefx.js `longship`), whale bones (rmwhale), drying rack, beached boat (rmboat) HIGH on those boards [known].
2. Rime gate: the two carved poles with rope + skulls at the left edge, `drawRimeGate`, `rimeGateTree`. MEDIUM-HIGH, every Rime board [NOT on the list]. M.
3. Runestones / skald stone / cairn (rmrunestone, rmskaldstone, rmcairn): lit but still 2-px ring. MEDIUM. S.
4. Seals on floes, skerries, bergs, floes (`skerry`, `seals`, `floe`, `berg`; Skerryway/Bergwater): ringed rock/ice. MEDIUM. `scenery-rime.js`/`water.js` ice branches. S-M.
5. Old Frostfang board (`frostfang` realm in maps.js) uses snowpine/icerock/icecrystal from scenery.js: all old.

## 5. Figures and creatures still old
1. **Covert's blades** (assassinUnit*: Silent Court, Nightshade etc.) HIGH wherever a Covert stands: dark 2-px-ring hooded figures, shot `swp_blades.png`. `rigs-covert.js` (539 lines, COVERT_PAINTERS), RIGS `assassinUnitAA/AB/BA...` in rigs.js l.299-307. M-L (needs `fig-blade.js` + a PIX entry; muzzle/strike timing off `u.swing`).
2. **Build crew** (mason / hod carrier / setter, every purchase): `swp_buildcrew.png`. HIGH (seen on every build). `folk.js` (build crew), `builders.js`, `buildanim.js`, `crew-lab.html`. M-L (3 figures x ~10 clips).
3. **River Watch skiffs** (hull, oarsman, musketeer in the bow): `rigs-skiff.js` + `skiff` rig; the gunner is still `folk-gunners.js drawMusketeer`. MEDIUM-HIGH on river/sea boards. M.
4. Castle's people: wall bowmen, halberdier gate guards, masons (`folk.js WALL_FOLK`, `drawArcher/drawHalberdier/drawMason` used by scenery.js and castle.js); `fig-halberdier.js` exists, unwired [known]. MEDIUM. S-M.
5. Kraken and arm (parked by owner); `seaHold` coil `drawSeaHold` rigs-rimebeasts.js. [known] LOW.
6. `berserk` rig is still registered and unused (no entry in PIX, nothing draws it): drop it. S.
7. Title crowd still partly old: `ui/titleCrowd.js` imports pix in 4 spots but keeps old painters for peasants etc.; check on the title screen. LOW-MEDIUM. 
8. All other RIGS keys have a PIX entry (checked rigs-beasts/hollowbeasts/crown/hollow/rime/horde/ironmounts/iron/rimebeasts against pixrigs.js).

## 6. Gameplay pieces on the road
1. Traps (spikes, jaws, caltrops, mines, balloons, bomb marks) MEDIUM: small sprites, thick ring; `swp_traps.png`. `render/traps.js` (521 lines). M.
2. Barricade stake frames (Masons' Guild) MEDIUM: pixel-built with an old dark underline. `render/barricade.js bakeLook`. S-M.
3. Corpses/remains: flat 1-px rects (ribs, skull) with no outline or light: `render/remains.js drawRemains`. LOW-MEDIUM, appears after every wave. S.
4. Skiff / blade / falcon "live bits": Archer hall's `hawk`/`hawkSit` (Eyrie path, halls/archer.js l.718-735) old; "the cauldron" bubbles/smoke/steam/glints in halls/assassin.js, goldworks.js, gunpowder.js (smoke), flames: `flames.js`. LOW-MEDIUM (small; the notes already say so). S each.

## 7. Effects
1. Blasts, smoke puffs, dust rings, frost snowflake, sparks, poofs: smooth soft gradients, not pixel-snapped (`swp` view: `.shots/fx_x_blasts.png`, from fx-lab). `fx.js drawBlast, drawScorch, drawChain, drawSpark, drawPoof, drawFlash`, `rings.js` (area rings are anti-aliased vector ellipses). MEDIUM (everywhere in battle). M-L (lot of effect types).
2. Status marks and floating text: `fx.js drawStatus, drawGround, drawFloatText`; Frost shells/ice: `rimefx.js drawFrostShells`. LOW-MEDIUM. S-M.
3. Weather: lightning bolt, rain, eruption rocks, fog, `weatherfx.js`, `stormcloud.js` (soft). LOW (soft by design). M if wanted.
4. Rime longship in landings, plank, ship sink (`rimefx.js longship`): old, with the longship prop [known].

## 8. Water
1. Rivers, ponds, coast bake (`water.js`, `coast.js`) are own pixel-baked and fine. Items to redo: lily pads/reeds/driftwood (water.js, coast.js `driftSprite`), river stones; ice floes/bergs. LOW. Boats on water pieces under section 1.

## 9. Campaign map and UI
1. **Campaign map** (the whole overworld: terrain, trees, little houses, ships, whirlpool, fog clouds, level shield flags/locks): `ui/mapArt.js` (3250 lines), `ui/CampaignMap.jsx`, `map-lab.html`; `.shots/swp_map_mid.png`. HIGH (seen between every battle) but it is its own world scale; trees/houses ringed, flags and cloud sprites painted. L.
2. Home/title: title castle and crowd were redrawn; `titleArt.js` still has 3 `inkOutline` uses (ground bits). LOW.
3. HUD icons (coin, heart, sword, bolt, shield, hammer, pitchfork, ability icons; `ui/hud/icons.jsx`, `ABIL_ICON` in CrownguardGame.jsx l.1151) and castle-works icons (`WORK_ICON` in ui/CastleWorks.jsx): hand-made pixel grids in the HUD's own flat style. LOW-MEDIUM. M (a set of ~25).
4. Weather icons (`PX` in ui/WeatherForecast.jsx l.16): flat grids. LOW. S.
5. Tower picture tiles: `ui/TowerPortrait.jsx` draws the real hall (new). `ui/PixelIcon.jsx` falls back to old `sprites/*.js` MINI sprites if a portrait fails: LOW (check it never shows).
6. Enemy icons: `ui/EnemyIcon.jsx` uses `pixIcon` for PIX rigs (new); old `SPRITES` only for unrigged types. LOW.

## Top 15 (by visibility x effort)
1. Iron camp gate/palisade (`drawIronCamp`, `ironGate`): every Iron board. L
2. Iron war tents, banners, wagon, pikes (`warTent, standard, wagon, pikes`). M
3. Hollow willows and dead trees (`fenWillow, fenDead, fenSnag`): the wood edge on all Hollow boards. M
4. Bridges (`bridge.js`): wood, stone, causeway. L
5. Build crew (`folk.js`, `builders.js`): seen on every purchase. M-L
6. Covert blades (`rigs-covert.js`). M-L
7. Greenwood cave mouth (`scenery.js drawGate`). M
8. Greenwood boulders/rocks (`boulder`/`rockBody`): copy `crag`. S-M
9. Millrace/Gullwick village set: watermill, cottage, haywain, skeps, net rack, creels, boat (`scenery-vale.js`). M
10. Iron King's tower + ruin (`kingTower`, `ruin`). M
11. Hollow graves/fences/statues/barrows (`fenGrave, lichFence, fenStatue, fenBarrow...`). M-L
12. Rime gate poles (not on list) + longhouse/longship/rack/whale (list). M
13. Campaign map art (`ui/mapArt.js`). L
14. Fx blasts/smoke/rings (`fx.js`, `rings.js`). M-L
15. River Watch skiffs and the castle wall folk (`rigs-skiff.js`, `folk.js`/`fig-halberdier.js`). M
Honourable: bushes (known), traps, barricade, remains, mushrooms/deadtree on Greenwood, watchtower (odd third style), Wardenmoor drill field, Brinewick salt works.

## Cheap global win
Make the bake's ring tinted and thinner for every non-flat decor (scenery.js `bakeSprite(.., ink=true)` / `inkOutline`): derive the ring
colour per sprite (darkest nearby fill mixed with INK #241a26) instead of one near-black. That visually joins ~60 old pieces to the new ones
(the tinted one-pixel line is the owner's pick) for about half a day, before any is re-sculpted.

## Housekeeping
Private vite server I started: port 5191 (own cacheDir scratchpad/swp/.vitecache); stop with `pkill -f vite.swp.mjs`. The labs I opened also wrote
non-prefixed files into .shots/ (props_*_x.png, crew_x_*.png, fx_x_*.png, map_lab.png): they are the labs' own outputs, safe to delete.
