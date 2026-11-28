# Iron overhaul concepts, round 1, panel 3: PLACES (2026-11-28)

Not in the game. Painter `concept/ovi1-places.js`, lab `ovi1-places.html` (the real engine and `draw()` on an Iron board,
the board's own decor in the patch lifted, the option painted over it). Built on the Greenwood's approved kit
(`src/render/overhaul/decor-kit.js`: `sprite` / `spriteL`, `rockMass` for the granite, the pix materials, `tufts`, `worn`);
the Iron pieces are new, sculpted at the halls' scale (a private `SP` wrapper scales every coordinate and radius, so a tent is
~46 art px wide beside the archer hall's ~70).

## The four places, all in every option

| place | board | pieces |
| --- | --- | --- |
| war camp | The Muster (`muster`), the strip south of the road | ridge tents, command pavilion, standards, forge, cookfire + cauldron, picket line, spear racks, crates, wagon, washing |
| beacon hill | Stonewatch (`stonewatch`), the top strip | a stone drum with an iron fire cage on a granite tor, woodstacks, a watch tent, braziers |
| quarry | Stonewatch, bottom strip, left | a cut face with drill holes, the pit, dressed block stacks, a timber crane, spoil, a cart |
| toll fort / drover's inn | Stonewatch, bottom strip, right | A the squared ashlar fort with gate braziers and a barrier; B the drover's inn; C the roofless fort |

## The three ideas (not three strengths)

- **A, drilled and orderly.** Everything in ranks: eight identical tents on a swept yard, four standards in a line over a flagged
  parade ground, two fire baskets on iron posts, racked spears, a straight picket line; a beacon in dressed stone with a
  woodstack at each hand; a benched quarry with stacked ashlar and a paved ramp; a squared fort with a lowered barrier.
  Light: braziers and gate fires, set in a line.
- **B, lived-in and muddy.** Churned mud and puddles round the fires, mixed patched canvas, a cookfire clustered with tents,
  washing, wagons, a forge and its smoke; a rough beacon with a huge ragged woodstack and a boiling pot; a working quarry with
  spoil heaps and a cart; the drover's inn with a lantern, a lit window, a sign, a trough and hay.
  Light: fires you walk between; cookfires and the inn's windows.
- **C, half-abandoned, taken by the moor.** Two tents down, one lit, cold fires and one kept fire, heather and bracken over
  the yard, a fallen standard, a cold forge; a cracked beacon drum grown with heather but its one fire still burning; a flooded
  quarry and a toppled crane; the fort roofless with ivy and ONE lantern in the gateway. The owner's rule is kept: every
  place still has a lit fire, but a single one against a cold ruin.

## Light

Fires are ALWAYS lit. The glow is the Greenwood lamp recipe (stepped, Bayer-dithered warm pools on the ground under each flame,
an additive bloom over it, lit windows in lamp yellow) at 0.55 / 0.14 at noon and 1.0 / 0.3 at sunrise / late / golden. Flames
and smoke are painted straight to the canvas (`flameSpr`, `smokeSpr`: no outline, mottled five-step flame, grey puffs lit from the
upper left with a dithered rim), not through pix, so they read like the game's own fire.

## Loops (24 frames, 2x crop 240 x 140 board units, 10 fps, seamless)

Every moving thing is periodic in the loop: smoke puffs rise by phase `(n / N + f / 24) % 1`; banners and pennants wave with
`sin(2 pi f / 24 - u * k)`; flames step a 4-frame cycle (6 distinct frames, jittered by size); the washing line sways with the
same clock. Cost in the game: flames and smoke would be baked per size and frame (a flame is ~10 x 12 px, ~6 frames; a smoke
column ~6 phases per height), banners baked per phase (6-8 each); about the cost of the torch flames already in `torchflame.js`.
Nothing is scrolled; all whole art pixels. Sheets: `.shots/ovi1_anim_places_<name>_c6r4_fps10.png` + `_still.png`.

## What the engine would need

Nothing in the rules. Places are art: a `LAYOUTS`-style table per realm (like decor-layout.js), their ground (yard, mud, flagstones,
pit) baked into the ground layer, and `blocks` ellipses so no hall is built on a camp, the pit or the fort. Cost estimate from the
Greenwood farm: ~4-6 ms of one-off bakes per piece variety (the fort and inn are the heaviest), live cost only the flames,
smoke and banners (blits).

## Weak spots / honest notes

See the report; in short: figures are not drawn (a camp with nobody in it is quiet by design); the quarry's face reads as a
cut wall but its pit is a flat disc; the inn is a plain gable house; flames are small at board size; only noon and golden were
shot; the realms' own crags and trees were left as they were.
