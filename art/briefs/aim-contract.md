# Shooters aim at their target; shots fly straight (owner, 2026-11-14)

The owner: shooters that lock on to a target should turn their arms to it ("right now they
shoot at 90 degrees and sometimes the arrows fly sideways out of the bows"), and "make it so
the arrows fly straight to the target. They can aim a bit ahead if need be to hit their
target. It just looks bad that the arrows curve through the air."

Who aims (the owner's list): Archer hall bowmen; the Archer hall's siege bow / Ballista crew;
the castle wall archers; the castle ballistas; the Powder Works musketeer; Wren; the field
bowmen (Wren's archers, the Levy's archers); your crossbowmen (Crossbow Company `errantBow`,
Hale's `crossbow` men); the foe Crossbowmen and Barrow Archers. NOT the Wizard Spire (its
bolts curve on purpose), the bombardier, the catapult, Sunforge, Falconry, Ysolde.

## The angle
- `aim`: the shot's angle in the shooter's OWN facing frame, in degrees: 0 = level ahead,
  negative = up the screen, positive = down the screen. From the world angle `a` (radians,
  atan2(dy, dx) from the shooter to the AIM POINT) and facing `f` (+1 right, -1 left):
  `aimDeg = f > 0 ? a * 180/PI : (PI - a) normalized to (-PI, PI] * 180/PI`.
- Clamped to [-70, +70]; quantized to steps of `AIM_STEP` = 10 for drawing (so a figure bakes
  at most 15 aims); the engine uses the same quantized angle for the muzzle so the shot leaves
  exactly where the drawn bow or gun points.
- Helpers live in ONE place: `src/engine/aim.js` (the engine builder writes it):
  `aimDeg(a, f)`, `AIM_STEP`, `quantAim(deg)`, `rotAbout([px, py], [mx, my], deg)`.

## The figure side (artists)
- A figure that aims reads it from its variant string: `"<variant>@<deg>"` (e.g. `"long@-20"`,
  or `"@10"` with no variant). Parse it once in `draw` (`const [v, a] = (o.variant || "").split("@")`);
  everything before `@` is the old variant. No `@` = aim 0 = exactly today's pose (keep it
  pixel-identical: `cmp` a render before and after).
- Only the SHOOTING clip(s) and the hold before a shot take the aim (`shoot`, `shootLong`,
  the musketeer's fire clip, the crossbow's `shoot`, Wren's `attack`); walk and idle ignore it.
- The bow / crossbow / gun and both arms that hold it turn RIGIDLY about one pivot (the bow
  shoulder; for a two-handed gun or crossbow the pivot is the rear shoulder), by `aim`, with
  the torso leaning a little into a steep shot (up to ~8 degrees) if it reads better. Solve
  the arms with `ik` so elbows still fold the right way (the joint lab must stay green at
  -70, 0 and +70).
- Export `AIM = { pivot: [x, y], muzzle: [x, y] }` in art pixels from the feet, facing +x, at
  aim 0, for the hit frame of the shooting clip: `muzzle` is where the arrow / bolt / ball
  leaves (the nock end of the arrow on the string for a bow, its tip leaves along the bow).
  The engine computes the muzzle at any aim as `rotAbout(pivot, muzzle, aim)`, so draw the
  weapon so that holds.
- `marks.muzzle` from `draw` must agree with that rotation within 1 art px at every aim.

## The engine side (builder)
- Shots that aim (arrows, crossbow bolts, ballista bolts, musket balls, foe arrows): at
  launch, find the AIM POINT by leading the target along the road for the shot's flight time
  (the catapult's method in update.js, iterated twice so flight time and distance agree;
  fliers lead along their own heading; a held or stopped foe is not led). Then the shot
  flies in a STRAIGHT line from the muzzle to the aim point at its speed, no homing, drawn
  pointing along its line (no lob arc for these kinds). On arrival it hits its target as
  today if the target still lives (so balance is unchanged: no new misses); if the target
  died on the way, it lands there and is gone (as a homing shot did).
- The shooter's angle: halls already keep `t.lastAim`; give band shooters (`u`), heroes and
  foe archers (`e`) the same (the angle to the aim point at their last shot), and feed every
  muzzle function in `src/engine/muzzles.js` (`arrowFrom`, `wallArrowFrom`, `bandArrowFrom`,
  `foeShotFrom`, `muzzleFrom`, the ballista's `ballistaMuzzle`) from the figure's `AIM` and
  the quantized aim, when "New sprites" is on (old tables when it's off).
- The render side passes `@<deg>` in the variant for the shooting clip: halls/archer.js
  (bowmen, the siege bow crew), castle.js (wall bowmen), halls/gunpowder.js (musketeer),
  enemies.js (bands, Wren, foe archers through drawRig's variant).
- Sims: the hit rule is unchanged, only start points and flight lines move: expect the sims
  within noise (run `node scripts/sim.mjs --level gw1 --endure` and `--level ir3 --endure`
  before and after and report).


## Added 2026-11-15: the River Watch gunner aims (owner)
fig-skiff.js reads `@deg` in aim / raise / kick / recoil (gun and hands about one pivot, clamp
+-40 in a boat); `AIM_OF.skiff`, `skiffShotFrom(u, time, deg)`, `u.aimDeg` eased in update.js's
River Watch loop; pixrigs.js `aimClips` lets a figure take the aim on clips other than `atk`. His
shot stays instant (the ball is an effect, the damage lands at once), so no lead.
