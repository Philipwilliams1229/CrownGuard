# Attacks that come OUT of the hall (2026-11-17, owner)

"Novas from the frost tower, the spikes from the Bladewheel, and its fire nova: those types of attacks we
need to fix so that it looks like it's coming out of the tower. Similar to how we fixed the damage rings,
where it's hidden behind the tower but visible at the front."

## Today

- `frostnova` / `firenova` (src/render/rings.js, cases at ~795 / ~858): drawn wholly in the ground layer
  `"g"` (draw.js ~197, before the halls), so the hall covers the ring both behind it AND in front of its
  base: at the start the nova seems to come from under the building, and its front arc is cut off by the
  base. The style guide, "Effects on the ground", and rings.js's "occlusion rule" (~185) explain the
  layers: `split` (used by level up / path / final) puts the FRONT half (sin(angle) > 0) in the air layer
  `"a"` (draw.js ~589, after the halls and figures).
- Bladewheel spikes (`p.kind === "spike"`, fx.js ~1006, drawn with every projectile after the halls,
  draw.js ~520): a spike flying "up" the screen (behind the wheel) draws OVER the hall, so it looks like it
  flies out of the roof / front instead of from behind it.

## Make

1. Both novas: back half under the hall (ground layer, as now), front half visible in front of the hall's
   base. BUT the owner's standing rule is that a ground ring never draws over a FOE's body. So the front
   half's air-layer part must be limited to where the HALL is: e.g. draw the front arc (and its sheet /
   flames / spikes) in the air layer only inside a clip of the source hall's base footprint (find the hall
   the effect came from: the effect's x, y is the hall's; see how the engine pushes `firenova` / `frostnova`
   in src/engine/update.js and whether it carries the tower id), and everything else stays ground layer.
   The effect must read as rolling out of the hall's foot, not from under it. Keep ringflash.js in step
   (it reads the front from the same easing; you shouldn't need to change it).
2. Spikes: while a spike is still over its own hall's sprite and flying behind it (its y less than the
   hall's base y), draw it BEFORE the halls (so the building hides it); once clear of the building, draw as
   now. A projectile may need its source tower (check what `p` carries: `p.src` / `p.from` / tower id;
   if nothing, match the nearest Bladewheel within its footprint at launch and store it on `p` in the
   renderer, not the engine). Spikes flying toward the viewer stay in front.
3. The Bladewheel's own fire flash ring (src/render/halls/spiker.js ~119, now a pixel ring via
   halls/pixrings.js) and the Brazier's flame ring: check they also read as coming out of the wheel
   (behind hidden, front visible); fix if not.

## Files and rules

Own `src/render/rings.js` (the two nova cases and any helper you add), `src/render/fx.js` (the spike
branch), `src/render/halls/spiker.js`, and the SMALL hunks in `src/render/draw.js` you need (a pre-hall
pass for spikes; re-read draw.js right before editing, keep the hunk minimal). Engine untouched (no
gameplay change). `node --check` after every edit. Look in the real game: `shotlab.html` (read its header;
Frost Altar = the frost nova hall, Bladewheel and its Brazier path for the fire nova and spikes) or
`fx3g-lab.html`, in your OWN built-in-browser tab; frames during the first 150 ms of a nova and spikes
leaving the wheel in all directions. Before / after crops at x4 in `.shots/oth_*.png`. No git that
changes anything. At most two look-fix passes. Report: what changed, shots, weak spots.
