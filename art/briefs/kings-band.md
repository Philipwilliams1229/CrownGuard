# The King's Band (`band`): design (2026-11-18, Fable's proposal; owner approved with the changes below)

A 14th hall that never shoots: every hall whose anchor is inside its ring works to its beat.
Owner's ask: "a kings marching band ... a tower that buffs other towers. Things like attack speed
and range, maybe damage, aoe size ... all the tiers like the other towers."

## Look
A small round bandstand in crown livery: drummer + fifer at level 1, more players a level, a drum
major on top. Buffed halls puff a one-pixel music note over the roof on the beat (gold = drums,
crimson = trumpets); their crews already speed up with the reload clock. Selecting the band rings it
and lights the buffed halls' bases; a buffed hall's banner numbers carry a note glyph.

## The tree (tempo = attack speed, reach = range, might = damage, swell = blast size)
| Step | Cost | Stats |
|---|---|---|
| L1 King's Band | 140 | tempo 10%, ring 60 |
| L2 Fife and Drum | 100 | tempo 14%, ring 66 |
| L3 Full Company | 170 | tempo 18%, ring 72 |
| A: The Drum Corps | 455 | tempo 22%, reach 8%, ring 95 |
| A.a The Royal Tattoo | 1020 | tempo 28%, reach 12%, ring 110; soldiers in the ring strike 20% harder |
| A.b Thunder Drums | 1020 | tempo 22%, reach 8%, swell 15%, ring 100; every 12 s a 3 s drum roll at tempo 50% |
| B: The King's Heralds | 455 | the 2 nearest halls within 70: might 20%, reach 15% |
| B.a The Royal Fanfare | 1020 | ONE hall: might 45%, reach 25%, tempo 15% |
| B.b The War Horn | 1020 | the Heralds' buff; every 15 s foes within 110 slowed 40% for 2 s and take 20% more for 4 s |

## Rules
- Stacking: the max per stat across bands (house pattern: auraSlow, bannerSpeed, atkBuff). A band never buffs a band.
- Buff stat keys, not kinds: tempo `rate`/`mRate`/`bowRate` (> 0 only); might `dmg`/`mDmg`/`fragDmg`/`bowDmg`/`dps`;
  reach `range`/`mRange` (< 900 only); swell `splash`/`fragReach`. Never hp, count, frags, income, minRange, arcRange, pools, burns.
- WATCH LIST (owner: "dont leave out those towers ... mark them but include them for now"): the Gold Works,
  Trapsmith, Warden Mage and Log Roller forms ARE buffed; watch them in the playtest. `BAND_WATCH` in engine/band.js.
  Knights: tempo + might, no reach (their range is the seizing circle).
- Hook: a `tuned(st, t)` step in `getStatsClear` (engine/towers.js) after withPerks, before inWeather, so the tray,
  rings and sims all see it. update.js lays `t.tune` each tick beside the Warden loop. A silenced band (frozen, struck) plays nothing.
- War Horn reuses `markUntil` / `markAmp` and a non-frost slow; bosses marked, not slowed.
- Unlock: `band: "stillmere"` (level 35). XP: a quarter of kill XP for kills by buffed halls, plus duty XP.
- Footing compact (~rx 15). bench-hall.mjs needs a `--band <form>` option to measure hall + band vs two halls.

## The owner's answers (2026-11-18)
1. Blast size: keep the +15% swell on Thunder Drums.
2. The Fanfare's soloist (and the Heralds' pair): picked by TAPPING, like the rally flag.
3. Mute: no band sound for now, visuals only.
