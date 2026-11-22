# Build: the slow becomes cold mist (Round 6 pick C), 2026-11-21

The owner picked **C, cold mist** from Round 6 (`concept/fx-r6-slow.js`, `mkC`; brief
`art/briefs/fx-round6.md`): a dithered blue-white vapour 1-4 px out from the body, heavier on the
back and low down, wisps trailing behind the walk and sinking, a faint pool at the feet no wider
than them, a few edge glints, a very faint rim. Their reasons: it overlaps least with the other
tells (fire on the outline, the stun's stars over the crown, poison), so a foe carrying several
still shows each. They asked about cost; they were told: one stamp per slowed foe a frame (today's
slow is two), the mist baked once per figure frame and step like the fire, at most 2 bakes a frame,
FEWER steps than the fire (6), a memory cap, and it gets measured.

## What to change (files you own, nothing else)

- `src/render/statusfx.js`: the SLOW section. Replace `statusSlow`'s look with the mist, built the
  way the Round 5 B burn is (read it first: `maskOf` per frame canvas in a WeakMap, `burnBake`,
  the per-frame bake budget, views and facing handled through `e._rf`). Its own bake counter,
  2 a frame. 6 steps in the loop. Keep the old `slowSprite` only as the fallback for a figure with
  no `e._rf` (as the burn keeps `burnSprite`), or say why not.
- `src/render/enemies.js`: only the `_rf` line near "Status tells" (it sets `e._rf` for a burning
  foe): also set it when the foe is slowed (`slowUntil > tms` or `auraSlow > 0`, and not
  `immSlow`).
- `src/render/fx.js`: only `drawStatus`. The slow no longer draws the star wheel over the head (the
  owner's rule for Round 6: nothing over the crown, so it is never read as the stun). Keep:
  freeze hides the slow; a stun does NOT hide it (the owner asked for that back today); the three
  strengths (`lv` 1-3) map to C's `grow(0..2)`.
- The owner said C is faint at board size: lift it about one step (denser mist, brighter wisps)
  from the concept's middle level, and show the board-size before / after in your report.

## Check

- `fx-lab.html?tag=mist&scenes=status` (columns slow, burn + slow, stun + slow; five foe types),
  and the views: a foe walking up and down the screen (`views-lab.html` or a lab of your own in
  `scratchpad/mist/`) must show the mist too, facing right.
- Measure, and report the numbers: drawStatus (or the whole enemy draw) for 200 slowed foes, old vs
  new, ms a frame after warm-up, and the mist bakes' memory (count x canvas bytes) once a crowd of
  ~10 foe types has walked through it. A scratch harness in `scratchpad/mist/` like the one the burn
  was measured with is fine.
- `node --check` every file after every scripted edit (the dev server serves all sessions).

Rules: as `.claude/agents/artist.md`. Your own browser tab (tabs_create, its tabId on every call),
closed when done; never stop the dev server, no git that changes anything, never search outside
the repo. Another artist is writing `concept/fx-r7-plague.js` at the same time: don't touch it.
Budget about 60 tool calls. Report: what changed, the numbers, board-size shots, and anything NOT
CHECKED or weak, plainly.
