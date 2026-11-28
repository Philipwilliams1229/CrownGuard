# The overhaul in the Iron Marches: concept ROUND 1 (2026-11-28, owner: "go, all five")

The Greenwood overhaul is built and live (CLAUDE.md "The overhaul, built" and "The whole Greenwood is on the
overhaul"). Now the Iron Marches, the same way: concepts first, the owner picks, then ONE board (Ironford)
built to play, then the rest. This round BUILDS NOTHING INTO THE GAME.

The owner's answers to the Iron survey are at the end of `art/briefs/overhaul-iron-questions.md`. READ THEM.
Read also: `art/briefs/overhaul-concepts.md` (what a good concept is: bold, still this game, Canvas 2D,
shown in context; its file layout), `art/briefs/overhaul-animation.md` (the playing loops: sprite-sheet
rules and how to check a loop you cannot watch), `art/briefs/overhaul-round2.md` (the owner's words on the
Greenwood picks), `art/STYLE-GUIDE.md` (palette, one-pixel tinted line, one sun, the rock rule).

## What the owner already chose for Iron (do not offer the opposite)

- Mood: a MIX by level: open moorland on the early levels, drilled war camps and quarried stone toward the
  Citadel.
- Trees: fewer and DARKER than the Greenwood (Scots pine, spruce, wind-bent thorn), LATE AUTUMN. OWNER (on pass 1):
  conifers NEVER change colour ("you made the pines change color and that don't make no sense"): no gold larch;
  autumn colour comes only from NEW broadleaf types (birch, rowan, oak, aspen...). Was: (bare thorn,
  gold larch, rust bracken).
- OWNER'S REFERENCE (same day, "this is a nice vibe"): `art/briefs/ref/iron-autumn-ref.png`, North Cascades in
  autumn: gold larches mixed through dark green firs, a carpet of crimson / rust shrubs (huckleberry), pale grey
  granite boulders in a rocky stream bed. So gold larch IS allowed, but only as its OWN airy, feathery tree,
  never a dark conifer's silhouette recoloured; dark conifers stay green.
- Water: Iron's OWN edges (walled stone embankments and quays near camps; rocky gorge banks on the moor) and
  one truly WIDE river somewhere (wider only, never narrower).
- Bridges: the stone HUMPBACK in three kinds: plain packhorse, fortified with a gate tower, ruined span
  patched with timber. The up-the-screen rule stands (`art/briefs/bridges-upscreen-rule.md`).
- Height: CRAGS AND CLIFF EDGES AS SCENERY ONLY. No terraces, no scarps stepping the ground: the land stays
  flat where halls stand and the road runs.
- Places (recurring, like the Greenwood's farm): the war camp, a beacon hill, a quarry, a toll fort /
  drover's inn. Every lived-in place has a light.
- Road: paving flags, worn and patched, NO cart ruts or lanes.
- Light: fires ALWAYS lit, their glow stronger at sunrise / late / golden.
- Storm: drawn STRONGER (darker wet stone, glossier paving, streams in spate); the lightning and the
  paralyze (stun) effect YELLOW; a stroke that lands in a puddle hits everyone in it harder and paralyzes them.
- What the owner turned down in the Greenwood: "chia pet" trees (over-busy foliage), crop textures changing
  every few tiles, shingle river edges, too many edge kinds mixed on one stretch ("it can get too busy"),
  over-detailed ground ("way too detailed"), round 3's terraces. The owner's own phrase for what works:
  bold, but calm.

## The five panels (one artist each)

Each: TODAY (the game as it is, same framing) then A / B / C, three different IDEAS, not three strengths.
At least one option shown at golden hour or sunrise. At least TWO playing loops per panel (more where motion
is the point). Every option readable at board size (shrink to 840 wide and look).

1. **water** (Ironford `ironford`; the wide river on Coldwater `coldwater` or Ironmouth `ironmouth`): Iron's
   river edges (stone embankment, quay, gorge bank, and any idea of yours) and the three humpback bridges
   meeting them, one per option or mixed as you think best, crossing at least once UP the screen. One option
   must show the wide river. Start from the approved Greenwood river painter (`src/render/overhaul/water.js`,
   `field.js`, `waterlive.js`): its look is approved; change the edges, width and stone, not the water's
   language. Loops: the water past an embankment; a walker crossing a humpback.
2. **trees** (Warden Moor `wardenmoor`, plus the edge wood of one more board): the Iron tree set in late
   autumn: Scots pine, spruce, wind-bent thorn, larch, bracken / heather ground cover, an edge wood. Start from
   the Greenwood's approved treatment 4 (`src/render/overhaul/trees.js`, `treeart.js`, `wood.js`): one welded
   body (trunk, boughs, roots), variety in how foliage fills each skeleton, no ball under the roots. Loops: wind
   in the trees (moorland wind is stronger than the Greenwood's sway); falling larch needles or leaves.
3. **places** (The Muster `muster` for the camp; Gallows Cross `gallowscross` or Stonewatch `stonewatch` for
   the rest): the war camp, the beacon hill, the quarry, the toll fort / drover's inn, each as a PLACE (several
   pieces arranged, ground worn round them), at the halls' scale, with their light. A / B / C are three
   different treatments of the set (e.g. drilled and orderly / lived-in and muddy / half-abandoned), all four
   places in each. Start from the Greenwood's places (`src/render/overhaul/decor.js`, `decor-kit.js`,
   `decor-layout.js`, `lights.js`) and today's Iron pieces (`src/render/scenery-iron.js`). Loops: fire, smoke,
   banners; the beacon at golden hour.
4. **crags** (Greyhelm Pass `greyhelm`, Blackcliff `blackcliff`, or Crowstair `crowstair`: pick the two that
   show it best): crags, outcrops, cliff edges and rock walls as SCENERY on flat ground (no terraces), by the
   rock rule (stacked loaves: lit top, mid south face, shaded east shoulder, nothing pointing at the camera).
   Plus the paved road (flags worn and patched, no ruts) where it passes them. Loops: little moves here, so one
   loop of the scene at golden hour with grass and heather stirring is enough, plus the road's puddles drying
   or wind on the bracken.
5. **storm** (Ironford `ironford` under `weather=storm:1`): the stronger storm on the new ground: wet dark
   stone, glossy paving, streams in spate, and the owner's new YELLOW lightning and YELLOW paralyze (the stun
   on foes, soldiers and struck halls), and a stroke landing IN A PUDDLE: the whole puddle lit, everyone in it
   jolted. Today's pieces: `src/render/weatherbake.js` (the bolt sprite), `src/render/weatherfx.js` (strokes,
   scorch, `hallShocks`, puddles `puddleLevel`), `src/render/statusfx.js` (`stunSprite`). Loops (the point of
   this panel): a stroke on open ground; a stroke into a puddle with three foes standing in it; a struck hall.
   Yellow, not orange (keep it apart from fire) and not white-blue (today's). The RULE for the puddle strike is
   the lead's, not yours: draw the look only.

## Files, names, tools (this is a CLOUD container: no browser pane)

- Your painter `concept/ovi1-<panel>.js`, your lab `ovi1-<panel>.html` (repo root), your notes
  `concept/ovi1-<panel>.md`. Nothing under `src/` is edited. Import the game's painters with LITERAL paths
  (`import("/src/render/...")`): a variable import is a second copy of the module with its own caches.
- Stills: `.shots/ovi1_<panel>_<scene>_<today|A|B|C>.png`, each at most 1680 x 1120 (2x a 840 x 560 view or a
  crop of it). Loops: `.shots/ovi1_anim_<panel>_<name>_c<cols>r<rows>_fps<n>.png` + `_still.png`, per the
  animation brief.
- Look at your page with `node scripts/shoot.mjs "/ovi1-<panel>.html?..." "" <waitMs>` (headless Chromium on
  the dev server at http://127.0.0.1:5173; don't start or stop it; if it stops answering say so and stop).
  Read the PNG to look. Crop / shrink with Python PIL (`python3 -c "from PIL import Image; ..."`) into
  `scratchpad`-style scratch files under `.shots/ovi1_tmp_<panel>_*` and delete them after.
- `ovh-millrace.html?realm=<id>&frames=4` shoots any real board with the engine running (useful for TODAY
  and for getting halls and foes onto your panels); `sun-lab.html` and the Greenwood's `overhaul2-*.html`,
  `overhaul3-lakes.html` labs show the patterns.
- `node --check` every module after every edit. Never run git that changes anything. Never search outside the
  repo. Stay in your own files.
- Disk: delete PNGs you no longer need. Budget: about 120 tool calls. Do at least three look-fix passes.

## Your report (short)

Each option's idea in a line; the PNG and loop paths; cost (bake / per frame / memory) and what the engine
would need; weak spots, honestly ("NOT CHECKED" where you didn't look); the option YOU would pick and why.
A Fable reviewer looks at everything before the owner does and may send work back to you.
