# The symmetric gatehouse: the advisor's plan (Fable, 2026-11-14)

The owner: "there is a tower that is connected to the gate wall. its only there on the upper
side ... I want there to be symmetry on the castle walls on the top and the bottom. Also the
big tower in the back, behind the gate wall, should be centered." Their screenshot:
/private/tmp/claude-501/-Users-philiplago-williams-Desktop-CrownGuard/a2a0062e-864b-44c0-9261-ad8eb9961412/images/1.png
And: "we can rework archer placement and stuff if that's the problem."

## Diagnosis
- The tower attached to the gate on the north is `NT` (`gate < 0`): `gateBlock` starts the
  block at `NT.yS`, so the block has no north end of its own; special height `GATE_H` 35.
- The south "gate tower" (`GATE_TOWER_S` 90, footprint gy+84.5..gy+116.5) is not at the gate:
  44.5 of plain curtain south of the block's south face (gy+40). It is a drum with a ballista.
- HEAD (170cfb6) moved the north tower to -80 (and `gateTowerN(gy)` clamps it): that made the
  block MORE lopsided (north pier 27.5 vs south 10.5). Undo it.
- The keep (`keepGeo`) is gy-6..gy+40, centred 17 south of gy, because its south face is
  flush with the block's south face ("one face, no ledge").

## Plan
**src/data/castle.js**
- `export const GATE_HALF = 40` (`GH` in render/castle.js reads it).
- `GATE_TOWER_N = -(GATE_HALF + TOWER.s)` (= -66.5), `GATE_TOWER_S = GATE_HALF + TOWER.n` (= 45.5),
  written as formulas so the towers can never drift off the block.
- Delete `gateTowerN(gy)` and `DRUM_FROM_N`; `wallDrums` back to `from = gy + GATE_TOWER_N` /
  `gy + GATE_TOWER_S`, and the 56-clear test back to `from`.
- `DRUM_MIN` 80 -> 90 (a rime test board's north drum lands at 28, half off the top).

**src/render/castle.js**
- Delete `GATE_H`; both gate towers use `TOWER.h` 38.5 in `towerGeo` (`x0 = TOWER.x0 - 2` for
  both). Footprints: north tower gy-72..gy-40, block gy-40..gy+40, south tower gy+40..gy+72;
  arch ring gy +- 29.5, both piers 10.5.
- `gateBlock`: `yN = gy - GH` instead of `NT.yS`. Torches land at gy -+ 34.75 on their own.
- Keep: `KEEP = { b: 798, half: 24 }`; `keepGeo` yN = gy - 24, yS = gy + 24. The keep's south
  face becomes its own `southFace` call (ground corner `K.X` at `K.yS`, height `HK`, clipped to
  `[[K.b, K.fS], [K.x1, K.tS], [XE, K.tS], [XE, K.fS]]`); the gate block's own south face is
  plain (height `HG`, `[x1, tS], [XE, tS]` in place of the keep's step). Add the keep's shadow
  strip on the gate deck under `fS`, and a few merlons on the block's south rim from x 812 to
  `XE`. Keep furniture (banners, slit, standard, chimney, turret) follows `keepGeo`.
- Both gate towers get a pennant (today `flag: gate > 0 ? false`), or neither.
- Paint order: the south tower paints over the block's south end; skip the zero-length
  `stretch` between them (`pg < 0 && gate > 0`).
- Remove from `gateBlock` (now behind the south tower, x < 812): the south-face door at 772,
  the lit slit at 791.5 and its `out.slits` entry, the south-rim battlement and its perches,
  the south `string`, the tier-2 crack and soot at 764/776.
- Shadows (~lines 1097, 1115-1121): clip the north tower's east shadow at the keep's top
  (`min(e, K.tN)`); drop the gate block's `sh` strips for x < 812; keep those at x >= 812.
- If the keep's top NW corner (810, gy-80) kisses the north deck's SE corner (812, gy-78.5) in
  the crop, nudge `KEEP.half` between 22 and 26.
- Damaged tiers follow `towerGeo`; the `crackAcross` at `yN + 2` now sits on the new pier.
- Road flare, cobbles, `atGate`, braziers read `GH`: unchanged.

**Other files**
- coast.js ~line 128: `gateTowerN(gy)` -> `GATE_TOWER_N`. Check surf round the south tower on
  one coast board.
- concept/castle-before.js: freeze the old numbers (-58 / 90 and the old ballistaSpots) INSIDE
  it so castle-compare.html's "before" pane keeps showing the old castle.
- Title castle (src/ui/titleArt.js): a later check only.
- Style guide "The castle" and CLAUDE.md: remove "the north gate tower 35", "its south face
  runs on up as the keep's (one face, no ledge)" and the -80 paragraph; describe the mirror.

## Crews (free to redesign)
- Ballistae: one on each gate tower deck, a mirror pair; `ballistaSpots` needs only the new
  constants: feet [771, gy-87.5] and [771, gy+24.5]; on the board on every realm (also fixes
  today's south ballista at y 541-565 on the gy 472-496 boards).
- Bowmen: the first pair on the gate block's deck behind its west battlement, either side of
  the centre line: feet about (778, gy-31.5 -+ 24), slots gy-63.5 and gy-15.5 (feet = slot + 8).
  Clear of the windlass (x 768-776, cy +- 14), the murder holes (x 781-785), the oil cauldron.
  Bowmen 3 and 4 take the walk slots nearest the gate, alternating N and S; keep the
  spare-on-drum-deck fallback only for drums with foot >= 60.
- `wallSlots`: same rule with the new constants (3-7 a board).
- Masons: unchanged rule. Sentry: `sentryBeat` uses `gy - GH - HG - 4`.
- Engine: castle fire measures range from (gx, gy); only shot start points move.

## Order and checks
1. Data constants + removals, coast.js / towersOf renames. Dump drums, slots and ballista
   spots for every realm before and after (scratchpad/castle-dump.mjs is a start); none off the board.
2. towerGeo, gateBlock, the south-tower join. 3. The keep. 4. Shadows and tiers.
5. Bowmen on the gate deck. 6. Guides.
Risks: overpaint leaving live bits (slit glow, perches, shadows); the keep's new free-standing
south face; call `resetCastleBakes`; bowman vs cauldron/windlass; the apron seam on high gates.
Verify: castle-compare.html or `cas-lab.html?job=...` with castle works bought
(`{archers: 3, ballista: 3, guards: 3, masons: 2}`) on gullwick, coldwater, blackcliff,
bergwater (high), thornbrook (mid), cairnfields, graveroad, crowstair (low), ironford (river),
one coast board. Gate crop at 8 px/unit, x 730-848, gy-125..gy+85; full band x 620-840.
Damage tiers at lives 20 / 14 / 9 / 4. `apron-lab.html?layouts=ipadtall,tablet` for seams.
`node scripts/sim.mjs --level gw1 --endure`: about the same, not identical. A flipped overlay
of the gate crop should match tower for tower on the west faces and decks.
The camera (we look north and down) still shows the south tower's whole south face and only a
strip of the north one's: matching in plan and on the west elevation is the goal.
