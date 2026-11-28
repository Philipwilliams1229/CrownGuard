# The puddle strike: lightning into standing water (2026-11-28, owner request; NOT BUILT)

The owner: lightning that strikes a puddle "does bigger damage and paralyze to all in the puddle", and it hits
EVERYONE in it (foes, our soldiers, the hero). Also: the lightning and the paralyze (stun) turn YELLOW (a look
change, in the Iron round-1 storm concepts first). Fable's plan (advisor, same day), the lead to build:

1. **Puddles move to the engine.** New leaf `src/engine/puddles.js`: `puddles()`, `bridgePools()`, `onDeck`,
   `puddleW`, `PUD_SPAN` moved verbatim from render/weatherfx.js (~418-499) with the pure hash `h2`
   (weatherbake.js). Fill level is engine state `w.pud`, ticked in `tickWeather` after `w.wet` (rises with wet,
   falls `sdt / PUD_DRY` in combat only); weatherfx.js's `puddleLevel` / `PL` go and it reads `w.pud`. The
   deck list is render-derived today (`drawnSpans`, bridge.js; `OVH.drawnSpans` on overhaul boards): move
   `endsOver` to data/terrain.js; check the overhaul's `planSpan` is pure, else publish spans as numbers.
2. **The rule.** At the mark (weather.js ~459), a point within 16 of a puddle at least 10 wide, or on a flooded
   stretch, SNAPS onto the water (`m.pool`), so the warning glow sits on it; no extra rng call; strokes are not
   drawn toward water. "In it" = feet inside the puddle's ellipse at its current width, +6; ground only. Floods
   count (`floodFoe` / `floodUnit`). On top of the normal blast: `poolDmg` x2 (soldiers / hero 90, never below
   1), `poolShock` 4500 ms (riders 1500, bosses 500), halls unchanged, floods scaled by depth, mild x1.5 /
   3750 ms. Puddle count unchanged.
3. **Risks.** Strokes skip foes with `guard > 0` or `mres > 0`, and most of Iron now has pips: as specified it
   would mostly hurt OUR men. OPEN QUESTION FOR THE OWNER: keep the immunity, or let the paralysis (not the
   damage) pass pips in water (`poolStunPips`, Fable's pick). Checkpoint keeps `clock` / `wet`: add `pud`
   (and the retry snapshot). Gate on `def.poolDmg` so non-storm sims stay byte-identical; re-sim
   `--chapter iron --endure` seeds 1-2 and print `pool-strikes`. Compare the puddle look in `rain-lab.html`
   before and after the move (the only drift is `sdt` vs the old capped `g.time` delta).
