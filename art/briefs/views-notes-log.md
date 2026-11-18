# The front / back views pass: the owner's notes and what they taught (2026-11-17/18)

A record for the advisor's study of recurring mistakes. ~66 figures, ~18 Sonnet artists (two
Opus), the lead reviewing renders before the owner saw them. Every note below reached the owner,
i.e. it got PAST the artist's own look passes and the lead's review.

## Rules added along the way (now in art/briefs/views-artist.md)
1. Shields never behind / over the head in FRONT (low, forward, top below the chin).
2. Weapons from behind: first "mostly hidden", then (owner) "I didn't mean take them out
   completely", then a sword peek over the shoulder, then superseded by "One weapon pose".
3. Feet stay connected in every frame.
4. The weapon is IN the fist (fist drawn over the haft, haft in and out of it).
5. Shoulders / pauldrons outboard of the head; held things in front of the shoulder and arm.
6. BACK arms hang at the sides swinging forward; never crossed behind; hand mirrored.
+ "The BACK stack" (advisor): BACK views had reused the side's depth stack (near arm high z,
  cast 2), so from behind arms and weapons lay ON the back. Persisted through three fix rounds
  until diagnosed.
+ "One weapon pose" (advisor): views invented their own carry instead of projecting the side
  clip's weapon angle and hand height; carry.js projects it.

## Before the preview page (the lead relayed screenshots / reviews)
- Goblin first draft: BACK hood point turned into a tail (a brown dome from behind); 3/4 turning
  poses drawn, then rejected by the owner ("better before"; side, front, back only).
- Owner, generally: "watch for shields clipping behind heads on front view, and swords
  shouldn't be so visible from the back view"; "make sure feet stay connected!"; "it doesn't
  really look like the weapon is in his hand for the front view" (Osric's mace: haft ending above
  an empty hand); "there were some goblins with spears that didn't have them on the back view".
- Necromancer: slippers drawn as loose dark blobs under the hem.
- Mammoth front (Sonnet): head, trunk, body one brown mass (redone by Opus).
- Wolf: a grey blob from behind.

## Preview notes, round 1
Aldric shoulders over the face, sword behind the shoulders, torso too narrow from behind; Wren's
head sat oddly (neck too short); Osric BACK left arm "broken backwards"; Hale shoulder pads over
the face, left arm crossed behind his back, halberd missing from behind; Paladin: cross removed,
two black dots under the eye slits; Farmer: a black dot on the nose (an undefined grid letter drew
black), the fork flickering between 3 and 4 tines; Yeoman: hand through the shield, sword through
the arm; Errant: shoulder pads, sword behind the arm; Errant crossbowman: crossbow unreadable,
right arm behind the back; Lancer: too much sideways sway, rider in front of his own shield from
behind; Halberdier: BACK hand copied from FRONT, reading as behind his back; Field bowman: BACK
right arm behind the body. Liked: Ysolde, squire, champion.

## Round 2
Wren right arm folded behind (BACK); Osric hunched, holding tension; Hale halberd too short from
behind; Ysolde staff "held wrong, should be obscured by her arm"; Paladin: wants his shield back;
Squire / Yeoman / Errant: the sword should peek over the right shoulder from behind; Farmer "we went
too far, the pole looks like it's breaking"; Errant crossbowman about to shoot himself in the face;
Lancer shield still behind the body from behind; Halberdier arm snapped behind his back (BACK);
Field bowman same BACK arm issue ("we don't have the layers right"). -> the BACK stack diagnosis.

## Round 3
Farmer fork "still doesn't look like the side view". Then: Path B blade invisible; Widow's Kiss
mask odd in FRONT; Plague Bearer front poor (side too); Orc BACK axe backwards; Ironclad BACK sword
not in the same up position; general: weapons in the same position across the three views; Troll
face too narrow / symmetrical, club looks dragged backwards (FRONT); Warchief pole behind the ear
(FRONT); Wolf forelegs out of the face (FRONT); Magister cross-eyed; Crossbowman hood not joined to
the scarf (BACK); Chaplain staff behind the hand (FRONT); Marshal pole behind the body (FRONT),
helm a cube; Cavalier lance unreadable (FRONT); Hollow King cape through the legs (BACK); Crypt
warden hand through the shield (FRONT) and in front of it (side); Wolf rider hatchet should be up
(BACK); Rafter shoulders over the face (FRONT); Rime seer staff behind the hand (FRONT); Frost
giant feet clipping (FRONT); Mammoth ears too small, hind-leg joints. Liked: Sergeant.

## Process facts
- Artists checked with an offline renderer (scripts/views-render.mjs) at zoom 3-5, often only
  frames 0/2/4/6, rarely at board size; several reports said "I did not look at X".
- Artists reported "weak spots" honestly; many of the owner's notes were already listed as weak
  spots the lead let through.
- One artist ran `find /`, raising macOS privacy prompts on the owner's Mac.
- Fixes for one figure often reached the others only when the lead broadcast a new rule.
