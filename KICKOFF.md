# CROWNGUARD — Migration Kickoff

You are taking over development of **Crownguard**, a retro pixel-art tower defense game currently living in one big React file (`crownguard-tower-defense.jsx`, in this folder). It was built iteratively in Claude.ai chat and is fully playable. Your job: turn it into a real project without changing how it plays or looks.

**The person you're working with is brand new to coding tools. Explain everything you do in plain, friendly language. Never assume they know jargon. Before running commands, say what the command does in one simple sentence.**

---

## Part 1 — What this game is (design doc)

**Genre:** Kingdom Rush-style tower defense. Medieval fantasy. Game Boy Color-inspired pixel art (muted palette, hand-made sprite maps, low-res render buffer upscaled with smoothing off).

**Design pillars (never violate these):**
1. **No grind, no paywalls.** All progression is earned with in-run gold. Never add meta-currency, energy systems, or anything pay-to-win-shaped.
2. **Branching evolution.** Every tower levels 1→2→3, then permanently evolves down one of 2–3 branches that *change its function*, not just its numbers. Evolutions must be visually obvious on the battlefield (Pokémon-evolution feel).
3. **Challenging but fair.** Losses should feel like strategy mistakes, recoverable via the Restart Wave feature.

### Towers (current state)
- **Archer Tower (100g)** — fast single-target arrows. Each level adds a visible archer who fires their own staggered arrow (Lv1=1, Lv2=2, Lv3=3 arrows per volley, damage split). Branches: **Ranger Company** (rapid relay fire, anti-swarm) / **Master Longbowman** (huge slow armor-piercing sniper shots, longest range in game).
- **Knight Garrison (80g)** — spawns knight units that walk onto the field and each *block* one enemy in melee (enemies fight back; knights have HP and respawn after 7s). Lv1=1 knight, Lv2=2, Lv3=3. Default rally point is just south of the hall's door; player can click anywhere inside the garrison's circle to move the rally flag. Branches: **Paladin Order** (3 paladins, magic damage, 25% stun, self-heal) / **Berserker Hall** (4 frail fast berserkers).
- **Wizard Spire (140g)** — splash magic (ignores armor), damage is center-weighted: full at blast core, ~45% at rim. A little pixel mage stands on top and turns to face targets. Branches: **Pyromancer** (big blast + burn DoT) / **Frost Archmage** (blast + 45% slow).
- **Warden Priest (110g)** — support aura tower; a priest on an altar rains blessing particles. Slows all enemies in range (15/20/25% by level). Branches: **Sanctuary of Mending** (12% slow + heals knights 22hp/s) / **Chronomancer** (40% slow) / **Battle Standard** (10% slow + knights in aura deal +50% damage).

### Enemies
goblin (1 castle dmg), wolf (fast, 1), orc (2), ironclad (50% physical resist, 2), troll (regenerates, hits knights for 38, 3), dragon boss (flies — unblockable, 5). All have hand-made 2-frame pixel sprite maps in the file.

### Systems
- **Castle: 20 HP**, persists across waves, tiered leak damage (above). Castle sprite visually degrades: cracks <75%, smoke <50%, fire + torn banner <25%.
- **15 scripted waves**, HP scaling `1 + (wave-1)*0.13`. Wave-clear bonus `55 + wave*9` gold.
- **Early horn:** next wave auto-starts 30s after a clear; starting early pays `min(45, ceil(secondsRemaining * 1.5))` bonus gold.
- **Restart Wave:** snapshots gold/HP/towers at wave start; restore on demand or after a loss.
- **Camera:** zoom 1–2.5× via buttons only (no wheel), drag to pan when zoomed.
- Sell = 70% of invested. Start gold 250 ("normal" difficulty). Speeds 1×/2×/4×. Pause. Settings drawer with field guide.

### Owner's future wishlist (do NOT build yet — this is the backlog)
- Next-wave preview (sprite icons + counts of incoming enemies)
- Chiptune SFX via WebAudio (shots, coins, horn, leaks)
- Death animations (flash white, crumble into pixels)
- Per-tower targeting modes (First / Strongest / Nearest)
- Hotkeys (1–4 build, Space start wave, P pause)
- **Rank-4 evolutions** beyond current branches — first one: **Ballista** (evolves from Master Longbowman: infrequent heavy bolts that always target the highest-HP enemy on the map)
- Difficulty modes (Easy/Normal/Hard via start gold, castle HP, HP scaling)
- Multiple maps
- Save/load

---

## Part 2 — Your task today (do these in order)

1. **Scaffold** a Vite + React project in this folder (JavaScript, not TypeScript — keep it approachable). Explain what Vite is in one sentence when you do it.
2. **Split the monolith** into clean modules, keeping behavior 100% identical:
   - `src/data/` — towers, enemies, waves, constants, palettes
   - `src/sprites/` — sprite maps + drawSprite
   - `src/engine/` — path math, game state, update loop logic (spawning, movement, knights, auras, projectiles, economy)
   - `src/render/` — the pixel pipeline, terrain, tower/enemy/effect drawing
   - `src/ui/` — React components (panels, menus, PixelIcon, settings drawer)
   - `src/CrownguardGame.jsx` — thin component tying it together
3. **Initialize git** and make small, clearly-messaged commits as you go. Explain what git is in one sentence.
4. **Run the dev server** and tell the owner exactly how to see the game in their browser (or the desktop app's preview pane).
5. **Verify** the game plays identically: build each tower, upgrade, branch, run waves 1–3, restart a wave, zoom, move a rally flag.
6. Write a short `README.md`: what the game is, how to run it, where each system lives.

**Rules of engagement:** one change at a time, explain simply, ask before anything destructive, and never rebalance or restyle anything during the migration — refactor only. After migration is verified, ask the owner which backlog item they want first.
