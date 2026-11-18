# The goblin from the front and from behind (2026-11-17, owner request)

Every figure is drawn side-on and only flips left / right, so on roads running up or down
the board the characters never face where they are going. Two answers were tried and
shown to the owner: a foreshortened side walk (in the game now: `src/render/pix/march.js`)
and a sprite-stacked 3D goblin (`stack-lab.html`: it turns to any angle but reads blobby
at the game's camera). The owner chose the lead's recommendation: keep the hand-drawn
2D figures and give them FRONT and BACK views. The goblin is the test. Get it right and
the same pattern goes to the rest of the cast, so make it clean and easy to copy.

## Read first
1. `art/briefs/figure-artist.md` (the shared figure brief: rules, how to look, report).
2. `art/STYLE-GUIDE.md`: "The new sprites: the pixel sculptor", "The kit and the rules the
   concepts settled", "Walking up and down the screen; the squeeze turn".
3. `src/render/pix/fig-goblin.js` in full: the approved side view. Its look is APPROVED by
   the owner; do not change that file. Match it exactly in colours, proportions, gear,
   face character and pixel finish.
4. `src/render/pix/pix.js` (the Pix API: part, capsule, ellipse, poly, stamp, dot, line,
   toneLine, tag) and `src/render/pix/rig.js` (EASE, walkPose for reference).

## What to make: `src/render/pix/fig-goblin-views.js` (you own this file only)
Export two figure modules' worth, as objects, plus a shared header comment:
```js
export const FRONT = { NAME: "goblin-front", BOX, BONES, draw, CLIPS: { walk } };
export const BACK  = { NAME: "goblin-back",  BOX, BONES, draw, CLIPS: { walk } };
```
- Same `BOX` as the side figure (`{ w: 48, h: 48, ox: ..., oy: 42 }`; centre `ox` on the
  body, ox 24 is fine) and `BONES` = fig-goblin's BONES (bake.js calls `frameAt(clip, f,
  BONES)`; you may ignore `F.sk` and pose everything yourself from `F.ph`, the walk phase
  0..1). `CLIPS.walk = { n: 8, ms: 520, loop: true, lag: 0.09, pose }` (n and ms MUST match
  the side walk so the game can switch views mid-stride in step); `pose` may simply return
  fig-goblin's own walk pose (import `CLIPS` from `./fig-goblin.js`); your draw reads `F.ph`.
- Handle `o.variant === "bare"` in both views as fig-goblin does (the bare-headed footpad:
  no hood, no shield, bald knobbly skull with a scrap of dark hair, both big ears whole,
  a notch in one, the free far fist).
- Same height as the side view (about 37 art px with the hood's point), same hunch, same
  squat three-heads-tall build, bandy bare legs, big flat feet.

### FRONT: walking DOWN the screen, toward the camera
- His face is the read: heavy brow, two red eyes with their glint, the hooked nose seen
  from the front (it can overlap the upper lip), the snaggle grin with odd teeth.
- The hood frames the face; its floppy point rises behind the head and tips to one side,
  swaying a beat behind the bob. The LONG EARS stick out to both sides through their slits,
  back and up: from the front they are the goblin's silhouette, wide and unmistakable.
- His RIGHT hand holds the knife. Facing the camera his right hand is on SCREEN LEFT.
  The round plank shield is on his LEFT arm, so on screen RIGHT, seen nearly edge-on or
  three-quarter (it is carried forward of him); bare variant: an empty fist instead.
- The walk toward the camera: legs side by side under the hips (a hip's width apart,
  bandy), each foot in turn lifts with the knee coming up and toward us, then plants;
  the body bobs twice a cycle and sways a little over the planted foot; arms swing
  forward and back, which from the front reads as the hands rising and falling a little
  (the near-swinging hand slightly larger / lower), elbows out. Shoulders counter-rotate
  slightly. 8 frames, phase 0 the same moment of the stride as the side walk's frame 0
  (near foot planted forward), so a switch between views does not hitch.

### BACK: walking UP the screen, away from the camera
- No face. The back of the hood (with a seam or patch so it is not a flat blob), its point
  flopping back toward us / to one side, the long ears out to both sides seen from behind
  (their backs, a tone darker), the back of the jerkin with the belt round it, the hem's
  tatters, calves and heels.
- Facing away his right hand is on SCREEN RIGHT: the knife's tip may show past his hip or
  shoulder on screen right; the shield's BACK (planks, a strap, the boss's rivets) on his
  left arm, screen left.
- The walk away: the mirror of the front walk's motion (the lifting foot goes up and
  away, the sole of the heel shows a moment), same bob and sway, phase in step as above.

### Light and line
One sun, upper left of the screen, in both views (bake with the usual normals; do not
mirror these views on the board: the lead will draw them unflipped). One-pixel tinted
outline, as every pix figure. Cast shadows between parts as the side figure does.

## Look at it
- `node scripts/concept-render.mjs mod=fig-goblin-views ...` will NOT work as is (it wants
  a module with top-level CLIPS). Write your own tiny renderer in
  `scratchpad/gv/render.mjs` (copy concept-render.mjs's bake and PNG code, point it at
  `FRONT` / `BACK`, and lay out: the side walk (fig-goblin) row, the front row, the back
  row, 8 frames each, zoom 5, bg grass). Shots `.shots/gv_*.png`.
- At most THREE look-fix passes. Judge at zoom 1-2 too: on the board a figure is drawn at
  half an art pixel a board pixel; the front must read as "the goblin, facing me" at that size.
- Lab for the lead (do not build it): `views-lab.html` will walk him round a loop with
  your views; it imports `/src/render/pix/fig-goblin-views.js` by that plain path.

## Budget and report
About 70 tool calls. Report: what each view shows, frame 0's stride moment, weak spots,
the shot paths, and anything the lead must know to wire it (e.g. an anchor that moved).
