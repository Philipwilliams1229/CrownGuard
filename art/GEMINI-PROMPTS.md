# Crownguard — prompts for making sprites with Gemini

Gemini (or any image model) can't hit an exact pixel size or a transparent
background reliably, so we don't ask it to. We ask for BIG, clean images of
one subject on a flat magenta background, with the animation frames laid out
side by side. Then a script of mine cuts the strip apart, keys out the
magenta, shrinks each frame to the game's size and snaps it to whole pixels.
So: don't fight the model about resolution. Fight it about clarity.

Reference images for every subject are in `art/reference/` (creatures,
towers, crew, castle, scenery), magnified 4x so the model can actually see
them. ALWAYS attach the matching reference image to the prompt.

## How to run a session

1. Start a fresh chat. Paste the STYLE BLOCK below once as the first
   message, plus one reference image, and say "acknowledge and wait".
2. Then one subject per message: the subject's prompt from the lists below,
   with its reference image attached again.
3. If a result is off, don't regenerate blindly. Say what's wrong in one
   line ("frames 2 and 4 are a different character — same goblin in all
   four", "the background must be flat #ff00ff, nothing else", "no text").
4. Save what's good as PNG into `art/incoming/` using the file names given.

## STYLE BLOCK (paste once, at the start)

```
You are drawing game sprites for Crownguard, a Kingdom Rush-style tower
defense. I will send one subject at a time with a reference image. Redraw
the subject as clean pixel art in this style, and keep it recognisably the
same character as the reference: same colours, same gear, same build.

STYLE
- Crisp pixel art with visible square pixels, as if drawn on a grid about
  64 pixels tall for a person. No blur, no soft shading, no gradients, no
  photo textures.
- Cel shading with three tones per surface (light, mid, dark). Light from
  the upper left. Highlights warm cream, shadows cool plum.
- A dark outline (#241a26) around the whole figure. Inside, thin dark lines
  only where big parts meet. Small details in colour, not lines.
- Warm saturated palette. Grass #82b256, stone #a19a8a, roofs #a8505c,
  gold #d8b34a, steel #c4c8d0, oak #7a5334.
- Figures are slim and about four heads tall. NOT chibi, NOT big-headed.
- Camera: three-quarter view from slightly above. Figures FACE RIGHT.

OUTPUT RULES (every image)
- The background is one flat colour, magenta #ff00ff, edge to edge. No
  floor, no scenery, no gradient, no shadow on the ground, no frame or
  border, no text, no labels, no watermark.
- Animation frames sit side by side in ONE row, evenly spaced, with clear
  magenta gaps between them. Every frame is the SAME character at the SAME
  size, feet on the same line, facing the same way. Only the pose changes.
- Draw big: fill the height of the image with the figure. I will shrink it.

Reply "ready" and wait for the first subject.
```

## Creature prompts

Each creature needs two images: `walk` (4 frames) and `fight` (2 frames).
Save as `art/incoming/<name>/walk.png` and `art/incoming/<name>/fight.png`.
Attach `art/reference/creatures/<name>.png` to each.

Walk cycle wording (reuse): "Four frames of a walk cycle, left to right:
(1) front foot planted, arms swung; (2) legs passing, body a little higher;
(3) other foot planted, arms swung the other way; (4) legs passing."
Fight wording: "Two frames: (1) ready, weapon raised and braced;
(2) strike, weapon swung through with a slight lean forward."
Fliers: "Four frames of a wing-flap cycle: wings up, level, down, level."
Beasts: "Four frames of a running lope: gathered, stretched, gathered,
stretched. The rider stays seated."

Then the subject line, one of these:

Greenwood horde
- goblin: "A goblin raider: small, wiry, green skin, a brown hood, a short knife and a round wooden shield. Mean and quick."
- goblinBare: "A bare-headed goblin: green skin, long ears, a ragged brown tunic, a short knife."
- wolf (beast): "A dire wolf, grey with a pale belly, yellow eyes, ears back, running."
- orc: "An orc: broad, green, a leather jerkin, a heavy axe. Tusks."
- armored: "An Ironclad orc in full grey plate with a closed helm, a sword and a kite shield."
- troll: "A hunched troll, mossy grey-green, long arms, a tree-branch club. Big and slow."
- shaman: "A goblin shaman: green, a red cloth, feathers in the hair, a staff topped with a glowing green stone."
- necro: "A necromancer: a gaunt figure in a black hooded robe with a purple lining, a bone staff with a purple light."
- bat (flier): "A fell bat: dark brown, red eyes, ragged wings."
- boarrider (beast): "A goblin riding a wild boar, spear couched, the boar charging with tusks down."
- hobgoblin: "A hobgoblin warchief: bigger than a goblin, olive skin, horned helm, a totem banner pole with skulls and a red cloth."
- dragon (flier): "A red dragon with a pale gold belly, wide wings, a long tail, smoke at the mouth. The boss."

Iron Marches (a human kingdom's army)
- levy: "An Iron Levy spearman: blue-grey tabard, an open helm, a spear and a kite shield."
- crossbow: "A crossbowman: dark blue coat, a cap, a crossbow. Fight frames: (1) aiming, (2) loosing."
- sergeant: "A knight-sergeant: grey plate, a blue cape, a sword and a kite shield, a plume."
- cavalier (beast): "A lancer on a brown horse in blue barding, lance couched, galloping."
- chaplain: "A battle chaplain: white and gold robe, a tall mitre, a gold staff."
- ram: "A siege ram: a heavy log on a wheeled wooden frame with a peaked roof, four soldiers pushing. Four frames of the wheels turning and the men leaning."
- gryphon (flier): "A gryphon knight: an eagle-lion beast with a rider in blue, wings wide."
- marshal: "The Lord Marshal: a huge armoured lord with a crown on his helm, a red cape, a great two-handed sword. The boss."

Hollow Court (undead)
- skeleton: "A risen skeleton with a rusted sword and scraps of grave cloth."
- ghoul (beast): "A ghoul on all fours, grey-green, hollow eyes, crawling fast."
- bonearcher: "A skeleton archer with a bow. Fight frames: (1) aiming, (2) loosing."
- wraith (flier): "A wraith: a tattered grey robe floating with no legs, a pale glow inside the hood."
- ghast: "A plague ghast: a bloated, sickly-green corpse leaking vapour."
- crypt: "A crypt warden: an armoured corpse-knight in dark tarnished plate with a great sword."
- gravecaller: "A gravecaller: a robed skeleton priest ringing a bronze bell on a pole."
- amalgam: "A grave amalgam: a shambling heap of many bodies fused together, several arms, a few heads. Four frames of a lurching shamble."
- hollowking: "The Hollow King: a tall skeletal king in a black crown and rotted royal robes, two pale-green glowing blades. The boss."

The player's soldiers
- knight: "A knight of the crown: steel armour, a blue tabard, a sword and a blue kite shield."
- paladin: "A paladin: white and gold armour, a mace and a gold-trimmed kite shield."
- berserk: "A berserker: bare chest, red hair and beard, a big axe, brown breeches."
- champion: "The Grand Champion: a giant paladin in white and gold with an enormous hammer."
- wolfrider (beast): "A berserker riding a grey wolf, axe raised."
- farmer: "A farmer of the militia: a straw hat, a rough tunic, a pitchfork held like a spear."
- heroKnight: "Sir Aldric, the hero: bright white plate, a red cape, a sword and a red kite shield, no helmet, short grey hair."
- heroHunter: "Wren, the hero: a huntress in a green hood and cape, leather bracers, a longbow. Fight frames: (1) drawing, (2) loosing."
- assassinUnit: "An assassin: a dark grey hood and wrap, a knife held low."
- skiff: "A small rowed boat with one man standing with a harpoon. Four frames of the oar stroke; fight: (1) harpoon raised, (2) thrown."
- eagle (flier): "A great war-eagle, brown and gold, with a woman rider in red leathers."

## Tower prompts

Towers are still images (no animation needed). Each tower gets THREE
images so its forms can be compared side by side, each a row of buildings
on flat magenta, all the same scale, footing on the same line:

- `art/incoming/towers/<kind>/levels.png`: three buildings in a row — level
  1, level 2, level 3 — the same hall growing.
- `art/incoming/towers/<kind>/branch-a.png`: three buildings — branch a,
  then its two final forms (aa, ab).
- `art/incoming/towers/<kind>/branch-b.png`: three — branch b, then ba, bb.

Attach `art/reference/towers/<kind>.png` (it shows all nine forms with
labels, left to right in that order). Rule for every tower: the crew who
work it must be VISIBLE on top or in front — never under a roof. Upgrades
show in what is behind and around the crew.

Tower wording (reuse): "Three tower buildings in a row on flat magenta,
same scale, same footing line, three-quarter view from above, facing the
viewer. Left to right: {A}, {B}, {C}. The crew standing on each must be
fully visible."

### Archer Tower (archer)
Base: Quick arrows. Each recruit on the platform looses their own shaft.
- levels.png: (A) level 1, the first hall; (B) "Twin Archers"; (C) "Archer Trio" — the same building, bigger and better built each time.
- branch-a.png: (A) Ranger Company — Rangers loose a blinding storm of arrows in relay. Melts swarms; struggles vs. heavy armor. (B) Briar Rangers — Arrows dipped in briar venom: every hit stacks a poison that gnaws through armor and regeneration alike.. (C) Hawkeye Conclave — Impossible shots — every arrow ricochets off its mark into a second foe nearby..
- branch-b.png: (A) Master Longbowman — One legendary archer. (B) Ballista — A colossal siege bow. (C) Dragonslayer — Forged to fell wyrms: every THIRD shot is a devastating triple-damage heartseeker..

### Knight Garrison (knight)
Base: A knight marches out to hold an enemy in melee. Upgrades add more swords.
- levels.png: (A) level 1, the first hall; (B) "Second Sword"; (C) "Shield Brothers" — the same building, bigger and better built each time.
- branch-a.png: (A) Paladin Order — Three radiant paladins: MAGIC blows that ignore armor, chance to stun, and they mend their own wounds. (B) Grand Champion — The three paladins kneel — and ONE colossal champion rises: a living fortress whose hammer falls like a star.. (C) Radiant Basilica — Holy ground follows the paladins' boots — enemies near them smolder in sacred light..
- branch-b.png: (A) Berserker Hall — FOUR berserkers with whirling axes. (B) Wolf Lodge — Berserkers astride great wolves: faster than anything on the road, and back from the dead in a heartbeat.. (C) Blood Frenzy — Every wound they deal feeds them — and the longer they fight, the faster the axes swing..

### Wizard Spire (wizard)
Base: Arcane blasts splash in an area — strongest at the blast's heart — and ignore armor.
- levels.png: (A) level 1, the first hall; (B) "Adept Circle"; (C) "High Sorcery" — the same building, bigger and better built each time.
- branch-a.png: (A) Pyromancer — Fireballs with a huge blast that set enemies ablaze — burning damage over time. (B) Volcanic Throne — Every blast births a pool of living lava that scorches all who wade through it.. (C) Wildfire Court — Flames leap hungrily from burning foes to their neighbors — one spark can eat a whole warband..
- branch-b.png: (A) Stormcaller — Lightning lashes the frontrunner and arcs down the line — no armor, no escape.. (B) Tempest Court — The storm dances: bolts leap SIX times, scouring entire columns of the horde.. (C) Thunder Sovereign — Heaven's own hammer: fewer, crueler bolts that can lock victims rigid with shock..

### Catapult (catapult)
Base: Lobs boulders in a high arc — heavy splash at long range, but blind up close. At level three it chooses: keep throwing things UP, or start rolling them ALONG.
- levels.png: (A) level 1, the first hall; (B) "Reinforced Arm"; (C) "Master Engineers" — the same building, bigger and better built each time.
- branch-a.png: (A) Trebuchet — One colossal counterweighted arm. Boulders fall from the sky across nearly the whole field — but its blind circle grows. (B) Earthshaker — Boulders that crack the very road — survivors stagger through the rubble, slowed.. (C) Comet Sling — Burning pitch-wrapped stones flung at the MIGHTIEST foe on the field, wherever it hides..
- branch-b.png: (A) The Log Roller — Stops throwing and starts ROLLING. (B) The Iron Drum — An iron-banded drum twice the weight: heavier, wider, and what it fails to kill it leaves stunned and staggering in the ruts.. (C) The Powder Keg Run — The log is packed with powder and lit at the release: it burns everything it grinds past, and when it finally leaves the field it goes up..

### Bladewheel (spiker)
Base: A spinning wheel that flings spikes in EVERY direction. Blind beyond arm's reach — deadly on corners and doubled-back road.
- levels.png: (A) level 1, the first hall; (B) "Whetted Steel"; (C) "Twin Rims" — the same building, bigger and better built each time.
- branch-a.png: (A) Razor Gale — The wheel screams — a near-constant storm of steel shreds everything that hugs it. (B) Steel Tempest — Spikes forged to skewer: every sliver punches THROUGH its first victim and into the next.. (C) Hamstringer — Barbed spikes lodge in legs and paws — everything struck hobbles away slowed..
- branch-b.png: (A) Brazier Wheel — The rim is set alight: instead of spikes, rhythmic rings of flame scorch everything in reach. (B) Solar Crown — A captive shard of the sun. (C) Wildheart Pyre — Its fire is ALIVE: flames set by the rings leap hungrily from foe to foe..

### Gold Works (goldworks)
Base: Mints gold instead of arrows: a payout every wave it stands. Greed early, or guns early — you can't have both.
- levels.png: (A) level 1, the first hall; (B) "Second Furnace"; (C) "Master Minters" — the same building, bigger and better built each time.
- branch-a.png: (A) Royal Mint — Pure compounding wealth: every wave it survives, its payout grows by 2. Plant it early and let time do the arithmetic. (B) Dragon's Hoard — Doubled payouts — but a wave where the castle bleeds pays NOTHING. (C) Philosopher's Stone — Lead into gold and gold into more gold: the richest single wage on the board, compounding every wave it holds..
- branch-b.png: (A) Transmuter — The alchemist takes the field: acid vials that melt armor's owners, and an aura where every kill pays a quarter more.. (B) Midas Cannon — Every 12th shot turns a lesser foe to solid gold — killed outright, and worth triple.. (C) Lead to Gold — The aura transmutes armor itself: everything inside it wears a quarter less plate..

### Trapsmith (trapsmith)
Base: Arms the ROAD itself. Works his stretch without orders and CARPETS it — road spikes by default, and the field is swept and re-laid every wave.
- levels.png: (A) level 1, the first hall; (B) "Sharper Springs"; (C) "Double Stockpile" — the same building, bigger and better built each time.
- branch-a.png: (A) Springworks — Bear-iron jaws instead of spikes: whatever steps in is HELD FAST — a block with no knight in it. (B) Guillotine Gate — Anything under a fifth of its health that touches the iron is simply finished.. (C) Caltrop Field — Beds of caltrops laid thick — every one that springs leaves ground that keeps slowing the column long after the snap..
- branch-b.png: (A) Blastworks — Pressure mines. (B) Minefield Doctrine — The smiths work through the horn: four mines seed THEMSELVES onto the road as each wave begins, on top of everything already laid.. (C) The Aerostat Yard — EVERY SECOND CHARGE RISES: a bomb on a tethered balloon that answers only to FLIERS, while the mines below keep the ground.

### Falconry (falconry)
Base: A falcon that owns the sky: double talons against fliers, and every strike MARKS its prey to take more from all your towers.
- levels.png: (A) level 1, the first hall; (B) "Second Falcon"; (C) "Master Falconer" — the same building, bigger and better built each time.
- branch-a.png: (A) Royal Aviary — A whole mews of hunting birds: near-constant dives that can knock foes senseless. (B) Skyknight — The mews becomes a NEST, and the mistress stops throwing birds: she mounts a war-eagle half a dragon's span and takes the sky herself. (C) Storm Falcons — Dives that crack like weather — each strike ricochets to a second victim..
- branch-b.png: (A) Warhawk Court — The marks turn surgical: marked foes also lose a third of their armor. (B) Kingsight — The court's eye never closes: the mightiest foe on the field is ALWAYS marked, everywhere, forever.. (C) Talon Rain — Three birds aloft at once — every volley marks three different victims..

### Powder Works (gunpowder)
Base: TWO MEN, TWO WEAPONS, ALWAYS. A bombardier lobs powder charges into whatever is close, while beside him a musketeer takes one slow, heavy, armor-splitting shot at something further out. Both work whatever path you take.
- levels.png: (A) level 1, the first hall; (B) "Better Powder"; (C) "The Powder Works" — the same building, bigger and better built each time.
- branch-a.png: (A) The Bombard Yard — The bombardier gets the budget: fat powder charges with a wide, burning blast. The musket keeps its post beside him regardless. (B) The Grand Battery — TWO charges to a throw, falling wide apart — the bombardier stops aiming at foes and starts aiming at stretches of road.. (C) Dragon's Breath — Powder cut with pitch and something worse: the fire it leaves leaps from body to body down the column..
- branch-b.png: (A) The Long Muskets — The musketeer gets the budget: a long barrel that reaches most of the field and punches clean through any armor. (B) The Sharpshooters — One eye, one barrel, one held breath: every THIRD shot from the musket lands triple.. (C) The Grapeshot Crew — The musket is bored out into a scattergun: FOUR balls in a spreading fan, every one of them still punching armor..

### River Watch (riverwatch)
Base: BUILT ON THE WATER — the only hall that can be. Its skiffs row the river under their own orders, carrying harpoons to stretches of bank no tower can reach.
- levels.png: (A) level 1, the first hall; (B) "Second Skiff"; (C) "The River Watch" — the same building, bigger and better built each time.
- branch-a.png: (A) Harbour Patrol — THREE swift skiffs working the whole length of the water, loosing twice as fast as any watchman ashore. (B) The Crown Navy — FOUR skiffs under a admiral's pennant — the river belongs to the crown and everything on its banks knows it.. (C) Harpooners — Barbed iron on a line: the harpoons punch through any armor and drag what they catch to a crawl..
- branch-b.png: (A) Fireship Wharf — Pitch pots slung from the mast: slower shots, but they burst in flame across the bank.. (B) The Hellburner — A hull packed with powder and pitch: every pot leaves the shore burning behind it.. (C) The Chain Boom — A chain slung between the skiffs and a shot that rings it — what the boom catches stands stunned in the shallows..

### Assassin's Covert (assassin)
Base: Sends BLADES into the field, not volleys from a wall. They hold no ground — the column walks right past them — and they kill by standing order: healers, bell-ringers, banner-lords, whoever you name.
- levels.png: (A) level 1, the first hall; (B) "Second Blade"; (C) "Master of the Order" — the same building, bigger and better built each time.
- branch-a.png: (A) The Silent Court — Two blades of the Court afield: they pierce any armor, strike support foes TWICE as hard, and finish the nearly-dead outright. (B) Kingslayer — No healer, herald or bell-ringer is safe ANYWHERE on the field — the Court's knives cross the map for them.. (C) The Open Contract — The guild tears up its charter and takes ANY name offered.
- branch-b.png: (A) Nightshade Guild — THREE envenomed guildsmen in the grass. (B) Widow's Kiss — A venom no chant can outsing: while it burns, the victim CANNOT BE HEALED — by shaman, chaplain, or anything else that prays.. (C) Plague Bearer — What the venom touches, it keeps: whoever dies with the poison in them BURSTS into a lingering spore-cloud that sickens the column marching through..

### Sunforge (sunforge)
Base: A captive shard of sun that holds ONE foe in its beam — and the longer it holds, the hotter it burns. Melts champions; ignores crowds.
- levels.png: (A) level 1, the first hall; (B) "Focused Array"; (C) "Perfect Facets" — the same building, bigger and better built each time.
- branch-a.png: (A) Solar Lance — Hotter, faster, crueler — and at full focus the beam sets its victim alight. (B) Noon Eternal — At full focus the light overflows — everything near the victim burns in the spill.. (C) Sun Spear — No ceiling worth the name: the ramp climbs to SIX times, if you have the patience to hold it..
- branch-b.png: (A) Moon Prism — Cold light: the held foe wades against it, slowed the whole while.. (B) Gravity Well — At full focus the beam becomes a fist: the victim STOPS, pinned in the light. (C) Eclipse — Two beams, sun and shadow — a second foe held at half focus..

### Warden Mage (support)
Base: A frost-touched mage on an altar — biting cold slows every enemy in the aura.
- levels.png: (A) level 1, the first hall; (B) "Deepening Chill"; (C) "Heart of Winter" — the same building, bigger and better built each time.
- branch-a.png: (A) Rimecaller — Deep cold thickens the air — and every few heartbeats a frost nova flash-freezes the whole aura. (B) Absolute Zero — The air itself turns lethal: everything in the aura slows to a crawl and freezes by inches.. (C) Permafrost Heart — Novas leave foes BRITTLE — frozen flesh takes a third more from every arrow, blade, and stone..
- branch-b.png: (A) Lifebinder — Warm light within the cold: wounded knights standing in the aura are mended swiftly.. (B) Guardian's Grace — Knights in the light carry a shimmering ward that swallows one blow whole, then slowly reforms.. (C) High Cathedral — A wave survived is a wall reborn: each cleared wave, the cathedral restores 1 castle HP..

## Scenery

One image each, several variants in a row on flat magenta, save as `art/incoming/scenery/<name>.png`; attach `art/reference/scenery.png`.
- tree: "Four broadleaf trees in a row, each a little different: a crooked trunk and a canopy of leaf lobes. Outline the tree, but only underline the bottom of each lobe."
- pine: "Four pines, jittered tiers of dark green, crooked trunks."
- rock: "Four grey boulders, lumpy and irregular, moss at the foot."
- deadtree, willow, gravestone, cairn, boneheap, tent, mushroom, crystal: one row of three variants each.

## What happens next

Save the PNGs into `art/incoming/` with the names above and tell me. I will run the ingest script, which splits each strip into frames, keys out the magenta, shrinks each frame to the game's box for that creature, snaps the colours to whole pixels and writes the sprites into the game. Anything that comes out wrong I can fix by hand or send back for one more pass.
