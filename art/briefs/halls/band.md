YOUR HALL: the King's Band, a NEW hall (kind `band`, owner's request 2026-11-18). Design: `art/briefs/kings-band.md`.
It never shoots: musicians on a bandstand play, and every hall in earshot works to the beat.
There is NO old painter: `src/render/halls/band.js` is the lead's plain stand-in. Shot prefix: `kb`.

## The shared contract (all three artists)
- The beat: `BEAT_MS` 600 (engine/band.js). Players play a `play` clip of `ms: 1200` (one bar, TWO beats):
  a drum is STRUCK on frame 0 and on frame n/2. The hall draws every player of one hall with
  `loopFrame(fig, "play", time, 0)` (the same id for all of them) so the whole band is in step.
- Also an `idle` clip (at ease, instrument lowered, 2-4 frames, slow): the hall shows it while the
  band is silenced (frozen, struck by lightning, `t.noFolk` is the build: no people at all).
- Livery: the crown's (read `art/STYLE-GUIDE.md`, "The three armies' colours", and match the crown
  soldiers in `src/render/pix/fig-garrison.js`): royal blue coats with gold braid and white
  cross-belts for the DRUM path (a) and the levels; the HERALDS path (b) in crimson and gold tabards.
  The `variant` string says which: `"<role>"` or `"<role>:b"` for the crimson heralds' livery,
  `"<role>:gold"` for the two finals' richer dress (more gold, a plumed hat).
- Size: a crew figure, not a soldier on the road: look at the hall crews (fig-priest.js, fig-bowman.js)
  and stand at the same height (~44 art px), drawn through crews.js (`crew`, `drawCrewPix`).

## Figure artist 1: the DRUMMERS, `src/render/pix/fig-drummer.js` (you own only this file)
Roles (the variant's first part): `drum` (a side drum on a sling at the hip, two sticks, the
sticks rise and come down ON the beat), `bass` (a big bass drum on the chest, one padded beater,
a big swing on beat 1, a small one on beat 2), `kettle` (stands behind a PAIR of kettledrums that
the HALL draws: only the player, two sticks, alternating hands; `marks.l` and `marks.r` at the stick
heads on the hit frames), `major` (the drum major: tall bearskin or plumed shako, a long mace with
a gilt head that he swings up and down to the beat, `marks.tip` at its head).

## Figure artist 2: the WINDS, `src/render/pix/fig-herald.js` (you own only this file)
Roles: `fife` (a small fife held to the right, fingers moving, the cheek), `trumpet` (a long
straight herald's trumpet raised high with a hanging square banner of the crown (blue/gold) or
the heralds' crimson; the bell lifts a little on each beat), `horn` (THE WAR HORN final: a big man
blowing a huge curved war-horn of bone and brass, resting on a forked stand the HALL draws, `marks.bell`
at the horn's mouth, a deep breath in on beat 1, the blow on beat 2).

## The building artist: `src/render/pix/hall-band.js` + `src/render/halls/band.js` (you own only these two)
A round BANDSTAND, all nine forms (levels 1-3, paths a / b, finals aa ab ba bb), worked look B like
every other hall (hall-archer.js the worked example, hall-kit.js the kit, `art/briefs/hall-artist.md`
for the rules, the labs and the budget: read it all, it applies here except "the old painter").
- L1 "King's Band": a low round boarded platform, a pennant pole, a drummer + a fifer.
- L2 "Fife and Drum": a stone-footed stand with a rail, two drummers + fifer, a bunting line.
- L3 "Full Company": a raised octagonal bandstand with a small canopy roof (keep the figures
  CLEAR: the roof stands well above their heads on thin posts, never over a face), drum, bass, fife, the
  drum major on the front step.
- Path a "The Drum Corps" (blue and gold): bigger stand, drums racked round it, crown banners.
  - aa "The Royal Tattoo": a grand stand with royal standards, torches, the drum major gilded.
  - ab "Thunder Drums": a great pair of KETTLEDRUMS on a wheeled carriage at the front with a
    kettle player; the drums' skins are LIVE (they jump on the beat; brighter during a drum roll:
    `t.rollUntil > time*1000`).
- Path b "The King's Heralds" (crimson and gold): a herald's dais with two trumpeters, banners.
  - ba "The Royal Fanfare": a gilded dais, four trumpeters in a row, long banners, a canopy of cloth of gold.
  - bb "The War Horn": a stone platform with the war-horn on its forked stand and its blower, horn
    skulls / runic carving, a beacon brazier (a live flame). On a blast (`t.hornAt` within 700 ms of
    `time*1000`) the horn's mouth shows a short puff of breath / sound rings (live).
- Footprint: keep every form inside about 30 x 20 board units at the base (hallfoot `rx` 15);
  no form may sprawl wider than the others (the footing is the widest form's).
- Until the figure files exist, stand a stand-in (`fig-bowman` or `fig-priest`) where each player
  goes; once `src/render/pix/fig-drummer.js` / `fig-herald.js` appear (the other two artists write
  them at the same time), switch to them. If they're not there by the end, leave the stand-ins and SAY so.
- Lights: torches and the brazier as spec `light`s; nothing else needs driven light.
- Check with `node scripts/hall-render.mjs hall=band ...` and at the end ONCE in your own browser tab
  `http://localhost:5173/hallshot.html?kind=band&tag=kb_new&scale=2`. The dev server may need the
  lead to start it: if hallshot does not answer, skip it and say so.
