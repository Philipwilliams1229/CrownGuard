// ============ TOWERS ============
// Every tower's cost, per-level stats, and its permanent evolution branches.

export const TOWERS = {
  archer: {
    name: "Archer Tower", cost: 100, dtype: "phys", proj: "arrow",
    blurb: "Quick arrows. Each recruit on the platform looses their own shaft.",
    levels: [
      { dmg: 14, rate: 750, range: 130 },
      { dmg: 26, rate: 700, range: 140, cost: 80, label: "Twin Archers" },
      { dmg: 42, rate: 650, range: 150, cost: 120, label: "Archer Trio" },
    ],
    branches: {
      a: {
        name: "Ranger Company", cost: 210, stats: { dmg: 13, rate: 155, range: 120 }, desc: "Rangers loose a blinding storm of arrows in relay. Melts swarms; struggles vs. heavy armor.",
        rank4: {
          a: { name: "Briar Rangers", cost: 320, stats: { dmg: 13, rate: 150, range: 130, poison: 9, poisonDur: 2600, poisonCap: 36 }, desc: "Arrows dipped in briar venom: every hit stacks a poison that gnaws through armor and regeneration alike." },
          b: { name: "Hawkeye Conclave", cost: 320, stats: { dmg: 15, rate: 160, range: 145, chain: 1, chainRange: 95 }, desc: "Impossible shots — every arrow ricochets off its mark into a second foe nearby." },
        },
      },
      b: {
        name: "Master Longbowman", cost: 210, stats: { dmg: 210, rate: 2100, range: 275, pierce: true }, desc: "One legendary archer. Slow, colossal shots that pierce any armor, from across the map.",
        rank4: {
          a: { name: "Ballista", cost: 340, stats: { dmg: 540, rate: 3600, range: 900, pierce: true, bolt: true, targeting: "strongest" }, desc: "A colossal siege bow. Slow, screaming bolts that always hunt the MIGHTIEST enemy on the field — anywhere on the field." },
          b: { name: "Dragonslayer", cost: 340, stats: { dmg: 230, rate: 2000, range: 300, pierce: true, crit: 3, critMult: 3 }, desc: "Forged to fell wyrms: every THIRD shot is a devastating triple-damage heartseeker." },
        },
      },
    },
  },
  knight: {
    name: "Knight Garrison", cost: 80, dtype: "phys", proj: "units",
    blurb: "A knight marches out to hold an enemy in melee. Upgrades add more swords.",
    levels: [
      { dmg: 16, rate: 800, range: 70, hp: 110, count: 1 },
      { dmg: 21, rate: 760, range: 75, hp: 150, count: 2, cost: 90, label: "Second Sword" },
      { dmg: 28, rate: 720, range: 80, hp: 200, count: 3, cost: 130, label: "Shield Brothers" },
    ],
    branches: {
      a: {
        name: "Paladin Order", cost: 230, stats: { dmg: 36, rate: 800, range: 80, hp: 280, count: 3, magic: true, stun: 0.25, stunDur: 900, heal: 7 }, desc: "Three radiant paladins: MAGIC blows that ignore armor, chance to stun, and they mend their own wounds.",
        rank4: {
          a: { name: "Grand Champion", cost: 380, stats: { dmg: 110, rate: 900, range: 85, hp: 950, count: 1, magic: true, stun: 0.35, stunDur: 1100, heal: 18, giant: true }, desc: "The three paladins kneel — and ONE colossal champion rises: a living fortress whose hammer falls like a star." },
          b: { name: "Radiant Basilica", cost: 380, stats: { dmg: 44, rate: 780, range: 85, hp: 340, count: 3, magic: true, stun: 0.25, stunDur: 900, heal: 10, sear: 14 }, desc: "Holy ground follows the paladins' boots — enemies near them smolder in sacred light." },
        },
      },
      b: {
        name: "Berserker Hall", cost: 230, stats: { dmg: 20, rate: 320, range: 80, hp: 150, count: 4 }, desc: "FOUR berserkers with whirling axes. Frailer than knights, but a storm of steel.",
        rank4: {
          a: { name: "Wolf Lodge", cost: 380, stats: { dmg: 24, rate: 300, range: 130, hp: 175, count: 4, unitSpeed: 150, respawnMs: 4000, rider: true }, desc: "Berserkers astride great wolves: faster than anything on the road, and back from the dead in a heartbeat." },
          b: { name: "Blood Frenzy", cost: 380, stats: { dmg: 22, rate: 300, range: 80, hp: 160, count: 4, frenzy: true, lifesteal: 0.6 }, desc: "Every wound they deal feeds them — and the longer they fight, the faster the axes swing." },
        },
      },
    },
  },
  wizard: {
    name: "Wizard Spire", cost: 140, dtype: "magic", proj: "orb",
    blurb: "Arcane blasts splash in an area — strongest at the blast's heart — and ignore armor.",
    levels: [
      { dmg: 20, rate: 1300, range: 120, splash: 55 },
      { dmg: 34, rate: 1250, range: 128, splash: 60, cost: 100, label: "Adept Circle" },
      { dmg: 52, rate: 1200, range: 136, splash: 66, cost: 150, label: "High Sorcery" },
    ],
    branches: {
      a: {
        name: "Pyromancer", cost: 250, stats: { dmg: 46, rate: 1200, range: 140, splash: 90, burn: 14, burnDur: 3000 }, desc: "Fireballs with a huge blast that set enemies ablaze — burning damage over time.",
        rank4: {
          a: { name: "Volcanic Throne", cost: 360, stats: { dmg: 60, rate: 1250, range: 145, splash: 95, burn: 16, burnDur: 3000, poolDps: 26, poolDur: 3200, poolR: 34 }, desc: "Every blast births a pool of living lava that scorches all who wade through it." },
          b: { name: "Wildfire Court", cost: 360, stats: { dmg: 52, rate: 1150, range: 145, splash: 90, burn: 18, burnDur: 3200, burnSpread: true }, desc: "Flames leap hungrily from burning foes to their neighbors — one spark can eat a whole warband." },
        },
      },
      b: {
        name: "Stormcaller", cost: 250, stats: { dmg: 42, rate: 1300, range: 150, arc: 3, arcRange: 95, arcFall: 0.7 }, desc: "Lightning lashes the frontrunner and arcs down the line — no armor, no escape.",
        rank4: {
          a: { name: "Tempest Court", cost: 360, stats: { dmg: 46, rate: 1200, range: 160, arc: 6, arcRange: 110, arcFall: 0.8 }, desc: "The storm dances: bolts leap SIX times, scouring entire columns of the horde." },
          b: { name: "Thunder Sovereign", cost: 360, stats: { dmg: 88, rate: 1500, range: 160, arc: 2, arcRange: 95, arcFall: 0.75, zapStun: 0.3, zapStunDur: 700 }, desc: "Heaven's own hammer: fewer, crueler bolts that can lock victims rigid with shock." },
        },
      },
    },
  },
  catapult: {
    name: "Catapult", cost: 120, dtype: "phys", proj: "rock",
    blurb: "Lobs boulders in a high arc — heavy splash at long range, but blind up close. At level three it chooses: keep throwing things UP, or start rolling them ALONG.",
    levels: [
      { dmg: 36, rate: 2600, range: 190, minRange: 70, splash: 58 },
      { dmg: 58, rate: 2500, range: 205, minRange: 70, splash: 64, cost: 110, label: "Reinforced Arm" },
      { dmg: 84, rate: 2400, range: 220, minRange: 70, splash: 70, cost: 160, label: "Master Engineers" },
    ],
    branches: {
      a: {
        name: "Trebuchet", cost: 240, stats: { dmg: 200, rate: 4200, range: 460, minRange: 100, splash: 88 }, desc: "One colossal counterweighted arm. Boulders fall from the sky across nearly the whole field — but its blind circle grows.",
        rank4: {
          a: { name: "Earthshaker", cost: 380, stats: { dmg: 260, rate: 4400, range: 470, minRange: 100, splash: 105, slow: 0.3, slowDur: 1600 }, desc: "Boulders that crack the very road — survivors stagger through the rubble, slowed." },
          b: { name: "Comet Sling", cost: 380, stats: { dmg: 230, rate: 4200, range: 480, minRange: 100, splash: 90, burn: 20, burnDur: 2600, targeting: "strongest" }, desc: "Burning pitch-wrapped stones flung at the MIGHTIEST foe on the field, wherever it hides." },
        },
      },
      b: {
        name: "The Log Roller", cost: 240, stats: { logDmg: 120, rate: 5200, range: 999, minRange: 0, logSpeed: 118, logWidth: 22, splash: 0, roller: true }, desc: "Stops throwing and starts ROLLING. A great trimmed log is released down a bearing YOU choose, crushing everything it touches and grinding on until it leaves the board. Point it along a lane and it eats the lane.",
        rank4: {
          a: { name: "The Iron Drum", cost: 380, stats: { logDmg: 210, rate: 5000, range: 999, minRange: 0, logSpeed: 126, logWidth: 28, splash: 0, roller: true, logStun: 900, logSlow: 0.4, logSlowDur: 2000 }, desc: "An iron-banded drum twice the weight: heavier, wider, and what it fails to kill it leaves stunned and staggering in the ruts." },
          b: { name: "The Powder Keg Run", cost: 380, stats: { logDmg: 150, rate: 4800, range: 999, minRange: 0, logSpeed: 132, logWidth: 24, splash: 0, roller: true, logBurn: 26, logBurnDur: 3000, logBlast: 96, logBlastDmg: 220 }, desc: "The log is packed with powder and lit at the release: it burns everything it grinds past, and when it finally leaves the field it goes up." },
        },
      },
    },
  },
  spiker: {
    name: "Bladewheel", cost: 110, dtype: "phys", proj: "spike",
    blurb: "A spinning wheel that flings spikes in EVERY direction. Blind beyond arm's reach — deadly on corners and doubled-back road.",
    levels: [
      { dmg: 12, rate: 900, range: 85, spikes: 8 },
      { dmg: 18, rate: 820, range: 92, spikes: 8, cost: 90, label: "Whetted Steel" },
      { dmg: 26, rate: 740, range: 100, spikes: 10, cost: 140, label: "Twin Rims" },
    ],
    branches: {
      a: {
        name: "Razor Gale", cost: 230, stats: { dmg: 15, rate: 300, range: 105, spikes: 10 }, desc: "The wheel screams — a near-constant storm of steel shreds everything that hugs it.",
        rank4: {
          a: { name: "Steel Tempest", cost: 360, stats: { dmg: 17, rate: 260, range: 115, spikes: 12, spikePierce: 2 }, desc: "Spikes forged to skewer: every sliver punches THROUGH its first victim and into the next." },
          b: { name: "Hamstringer", cost: 360, stats: { dmg: 15, rate: 280, range: 110, spikes: 10, slow: 0.3, slowDur: 1300 }, desc: "Barbed spikes lodge in legs and paws — everything struck hobbles away slowed." },
        },
      },
      b: {
        name: "Brazier Wheel", cost: 230, stats: { dmg: 38, rate: 1500, range: 100, nova: true, magic: true, burn: 10, burnDur: 2400 }, desc: "The rim is set alight: instead of spikes, rhythmic rings of flame scorch everything in reach. MAGIC — ignores armor.",
        rank4: {
          a: { name: "Solar Crown", cost: 360, stats: { dmg: 62, rate: 1450, range: 115, nova: true, magic: true, burn: 15, burnDur: 2800 }, desc: "A captive shard of the sun. Wider, hotter rings that leave deep burns." },
          b: { name: "Wildheart Pyre", cost: 360, stats: { dmg: 44, rate: 1400, range: 105, nova: true, magic: true, burn: 14, burnDur: 2800, burnSpread: true }, desc: "Its fire is ALIVE: flames set by the rings leap hungrily from foe to foe." },
        },
      },
    },
  },
  goldworks: {
    name: "Gold Works", cost: 120, dtype: "magic", proj: "none",
    blurb: "Mints gold instead of arrows: a payout every wave it stands. Greed early, or guns early — you can't have both.",
    levels: [
      { income: 10, range: 0, rate: 0 },
      { income: 18, range: 0, rate: 0, cost: 80, label: "Second Furnace" },
      { income: 28, range: 0, rate: 0, cost: 120, label: "Master Minters" },
    ],
    branches: {
      a: {
        name: "Royal Mint", cost: 230, stats: { income: 40, compound: 2, range: 0, rate: 0 }, desc: "Pure compounding wealth: every wave it survives, its payout grows by 2. Plant it early and let time do the arithmetic.",
        rank4: {
          a: { name: "Dragon's Hoard", cost: 360, stats: { income: 60, compound: 3, hoard: true, range: 0, rate: 0 }, desc: "Doubled payouts — but a wave where the castle bleeds pays NOTHING. Greed with a heartbeat." },
          b: { name: "Philosopher's Stone", cost: 360, stats: { income: 55, compound: 3, range: 0, rate: 0 }, desc: "Lead into gold and gold into more gold: the richest single wage on the board, compounding every wave it holds." },
        },
      },
      b: {
        name: "Transmuter", cost: 230, stats: { dmg: 34, rate: 1300, range: 130, magic: true, bountyAura: 0.25, auraRange: 120 }, desc: "The alchemist takes the field: acid vials that melt armor's owners, and an aura where every kill pays a quarter more.",
        rank4: {
          a: { name: "Midas Cannon", cost: 380, stats: { dmg: 40, rate: 1250, range: 135, magic: true, midas: 12, bountyAura: 0.25, auraRange: 120 }, desc: "Every 12th shot turns a lesser foe to solid gold — killed outright, and worth triple." },
          b: { name: "Lead to Gold", cost: 380, stats: { dmg: 36, rate: 1300, range: 130, magic: true, bountyAura: 0.3, auraRange: 130, shredAura: 0.25 }, desc: "The aura transmutes armor itself: everything inside it wears a quarter less plate." },
        },
      },
    },
  },
  trapsmith: {
    name: "Trapsmith", cost: 110, dtype: "phys", proj: "trap",
    blurb: "Arms the ROAD itself. Works his stretch without orders and CARPETS it — road spikes by default, and the field is swept and re-laid every wave.",
    levels: [
      { trapDmg: 46, splash: 26, maxCharges: 5, chargeEvery: 2600, range: 150, slow: 0.3, slowDur: 1400, rate: 0, trapKind: "spike" },
      { trapDmg: 70, splash: 28, maxCharges: 7, chargeEvery: 2200, range: 165, slow: 0.32, slowDur: 1500, rate: 0, cost: 90, label: "Sharper Springs", trapKind: "spike" },
      { trapDmg: 98, splash: 30, maxCharges: 9, chargeEvery: 1900, range: 180, slow: 0.35, slowDur: 1600, rate: 0, cost: 130, label: "Double Stockpile", trapKind: "spike" },
    ],
    branches: {
      a: {
        name: "Springworks", cost: 230, stats: { trapDmg: 120, splash: 34, maxCharges: 8, chargeEvery: 1900, range: 195, root: 2200, rate: 0, trapKind: "jaws" }, desc: "Bear-iron jaws instead of spikes: whatever steps in is HELD FAST — a block with no knight in it.",
        rank4: {
          a: { name: "Guillotine Gate", cost: 360, stats: { trapDmg: 150, splash: 36, maxCharges: 9, chargeEvery: 1700, range: 200, root: 2400, execute: 0.22, rate: 0, trapKind: "jaws" }, desc: "Anything under a fifth of its health that touches the iron is simply finished." },
          b: { name: "Caltrop Field", cost: 360, stats: { trapDmg: 124, splash: 38, maxCharges: 11, chargeEvery: 1500, range: 200, root: 2000, caltrops: 6000, caltropSlow: 0.35, rate: 0, trapKind: "caltrop" }, desc: "Beds of caltrops laid thick — every one that springs leaves ground that keeps slowing the column long after the snap." },
        },
      },
      b: {
        name: "Blastworks", cost: 230, stats: { trapDmg: 175, splash: 58, maxCharges: 6, chargeEvery: 2400, range: 195, burn: 14, burnDur: 2600, rate: 0, trapKind: "mine" }, desc: "Pressure mines. Big blasts, burning shrapnel, and a column that learns to fear its own road.",
        rank4: {
          a: { name: "Minefield Doctrine", cost: 360, stats: { trapDmg: 190, splash: 60, maxCharges: 8, chargeEvery: 2100, autoSeed: 4, burn: 14, burnDur: 2600, range: 205, rate: 0, trapKind: "mine" }, desc: "The smiths work through the horn: four mines seed THEMSELVES onto the road as each wave begins, on top of everything already laid." },
          b: { name: "The Aerostat Yard", cost: 360, stats: { trapDmg: 210, splash: 66, maxCharges: 7, chargeEvery: 2200, range: 205, burn: 16, burnDur: 2800, stunAll: 700, rate: 0, trapKind: "mine", balloon: 2 }, desc: "EVERY SECOND CHARGE RISES: a bomb on a tethered balloon that answers only to FLIERS, while the mines below keep the ground. The blast stuns whatever survives it." },
        },
      },
    },
  },
  falconry: {
    name: "Falconry", cost: 130, dtype: "phys", proj: "talon",
    blurb: "A falcon that owns the sky: double talons against fliers, and every strike MARKS its prey to take more from all your towers.",
    levels: [
      { dmg: 26, rate: 1400, range: 150, airMult: 2, mark: 0.2, markDur: 2500 },
      { dmg: 42, rate: 1350, range: 160, airMult: 2, mark: 0.2, markDur: 2500, cost: 90, label: "Second Falcon" },
      { dmg: 62, rate: 1300, range: 170, airMult: 2, mark: 0.25, markDur: 3000, cost: 140, label: "Master Falconer" },
    ],
    branches: {
      a: {
        name: "Royal Aviary", cost: 240, stats: { dmg: 58, rate: 750, range: 175, airMult: 2.2, mark: 0.25, markDur: 3000, diveStun: 0.18, diveStunDur: 500 }, desc: "A whole mews of hunting birds: near-constant dives that can knock foes senseless.",
        rank4: {
          a: { name: "Skyknight", cost: 370, stats: { range: 205, rate: 0, skyknight: true, eagleHp: 1500, eagleDmg: 96, eagleRate: 620, eagleRespawn: 11000 }, desc: "The mews becomes a NEST, and the mistress stops throwing birds: she mounts a war-eagle half a dragon's span and takes the sky herself. It is the only thing this tower does — no more volleys, no more marks — and what it does is meet the worst thing flying in single combat and HOLD it there. Healers who mend knights will mend the eagle too." },
          b: { name: "Storm Falcons", cost: 370, stats: { dmg: 66, rate: 700, range: 180, airMult: 2.4, mark: 0.25, markDur: 3000, diveStun: 0.25, diveStunDur: 600, chain: 1, chainRange: 90 }, desc: "Dives that crack like weather — each strike ricochets to a second victim." },
        },
      },
      b: {
        name: "Warhawk Court", cost: 240, stats: { dmg: 48, rate: 1250, range: 180, airMult: 2, mark: 0.3, markDur: 3200, markShred: 0.3 }, desc: "The marks turn surgical: marked foes also lose a third of their armor. The tower that turns your arrows back ON.",
        rank4: {
          a: { name: "Kingsight", cost: 370, stats: { dmg: 58, rate: 1200, range: 190, airMult: 2, mark: 0.3, markDur: 3200, markShred: 0.3, kingsight: true }, desc: "The court's eye never closes: the mightiest foe on the field is ALWAYS marked, everywhere, forever." },
          b: { name: "Talon Rain", cost: 370, stats: { dmg: 48, rate: 1250, range: 190, airMult: 2.2, mark: 0.3, markDur: 3200, markShred: 0.3, shots: 3 }, desc: "Three birds aloft at once — every volley marks three different victims." },
        },
      },
    },
  },
  gunpowder: {
    name: "Powder Works", cost: 145, dtype: "phys", proj: "shell",
    blurb: "TWO MEN, TWO WEAPONS, ALWAYS. A bombardier lobs powder charges into whatever is close, while beside him a musketeer takes one slow, heavy, armor-splitting shot at something further out. Both work whatever path you take.",
    levels: [
      { dmg: 34, rate: 2400, range: 92, splash: 46, mDmg: 58, mRate: 2900, mRange: 168, count: 2 },
      { dmg: 52, rate: 2300, range: 100, splash: 50, mDmg: 92, mRate: 2800, mRange: 180, count: 2, cost: 110, label: "Better Powder" },
      { dmg: 76, rate: 2200, range: 108, splash: 55, mDmg: 138, mRate: 2700, mRange: 192, count: 2, cost: 160, label: "The Powder Works" },
    ],
    branches: {
      a: {
        name: "The Bombard Yard", cost: 250, stats: { dmg: 150, rate: 2100, range: 122, splash: 78, burn: 16, burnDur: 2600, mDmg: 150, mRate: 2700, mRange: 196, count: 2 }, desc: "The bombardier gets the budget: fat powder charges with a wide, burning blast. The musket keeps its post beside him regardless.",
        rank4: {
          a: { name: "The Grand Battery", cost: 380, stats: { dmg: 200, rate: 2000, range: 132, splash: 96, burn: 20, burnDur: 3000, shells: 2, mDmg: 170, mRate: 2600, mRange: 200, count: 2 }, desc: "TWO charges to a throw, falling wide apart — the bombardier stops aiming at foes and starts aiming at stretches of road." },
          b: { name: "Dragon's Breath", cost: 380, stats: { dmg: 165, rate: 2050, range: 128, splash: 86, burn: 34, burnDur: 3600, burnSpread: true, mDmg: 165, mRate: 2650, mRange: 198, count: 2 }, desc: "Powder cut with pitch and something worse: the fire it leaves leaps from body to body down the column." },
        },
      },
      b: {
        name: "The Long Muskets", cost: 250, stats: { dmg: 92, rate: 2200, range: 112, splash: 58, mDmg: 300, mRate: 2600, mRange: 250, mPierce: true, count: 2 }, desc: "The musketeer gets the budget: a long barrel that reaches most of the field and punches clean through any armor. The bombardier keeps lobbing regardless.",
        rank4: {
          a: { name: "The Sharpshooters", cost: 380, stats: { dmg: 105, rate: 2150, range: 116, splash: 60, mDmg: 420, mRate: 2500, mRange: 290, mPierce: true, mCrit: 3, count: 2 }, desc: "One eye, one barrel, one held breath: every THIRD shot from the musket lands triple." },
          b: { name: "The Grapeshot Crew", cost: 380, stats: { dmg: 100, rate: 2150, range: 116, splash: 58, mDmg: 190, mRate: 2400, mRange: 240, mPierce: true, mShots: 4, mSpread: 0.26, count: 2 }, desc: "The musket is bored out into a scattergun: FOUR balls in a spreading fan, every one of them still punching armor." },
        },
      },
    },
  },
  riverwatch: {
    name: "River Watch", cost: 130, dtype: "phys", proj: "harpoon", water: true,
    blurb: "BUILT ON THE WATER — the only hall that can be. Its skiffs row the river under their own orders, carrying harpoons to stretches of bank no tower can reach.",
    levels: [
      { dmg: 30, rate: 950, range: 125, hp: 130, count: 1, rowSpeed: 74 },
      { dmg: 40, rate: 900, range: 135, hp: 165, count: 2, rowSpeed: 78, cost: 100, label: "Second Skiff" },
      { dmg: 56, rate: 860, range: 145, hp: 210, count: 2, rowSpeed: 82, cost: 150, label: "The River Watch" },
    ],
    branches: {
      a: {
        name: "Harbour Patrol", cost: 250, stats: { dmg: 64, rate: 620, range: 155, hp: 250, count: 3, rowSpeed: 96 }, desc: "THREE swift skiffs working the whole length of the water, loosing twice as fast as any watchman ashore.",
        rank4: {
          a: { name: "The Crown Navy", cost: 370, stats: { dmg: 70, rate: 600, range: 165, hp: 290, count: 4, rowSpeed: 104 }, desc: "FOUR skiffs under a admiral's pennant — the river belongs to the crown and everything on its banks knows it." },
          b: { name: "Harpooners", cost: 370, stats: { dmg: 96, rate: 700, range: 170, hp: 270, count: 3, rowSpeed: 96, pierce: true, slow: 0.35, slowDur: 1600 }, desc: "Barbed iron on a line: the harpoons punch through any armor and drag what they catch to a crawl." },
        },
      },
      b: {
        name: "Fireship Wharf", cost: 250, stats: { dmg: 52, rate: 1250, range: 150, hp: 230, count: 2, rowSpeed: 76, splash: 58, burn: 16, burnDur: 2800 }, desc: "Pitch pots slung from the mast: slower shots, but they burst in flame across the bank.",
        rank4: {
          a: { name: "The Hellburner", cost: 370, stats: { dmg: 68, rate: 1300, range: 160, hp: 260, count: 2, rowSpeed: 76, splash: 84, burn: 22, burnDur: 3200, poolDps: 20, poolDur: 2600, poolR: 30 }, desc: "A hull packed with powder and pitch: every pot leaves the shore burning behind it." },
          b: { name: "The Chain Boom", cost: 370, stats: { dmg: 58, rate: 1200, range: 165, hp: 300, count: 3, rowSpeed: 80, splash: 60, burn: 14, burnDur: 2400, stun: 0.3, stunDur: 900 }, desc: "A chain slung between the skiffs and a shot that rings it — what the boom catches stands stunned in the shallows." },
        },
      },
    },
  },
  assassin: {
    name: "Assassin's Covert", cost: 140, dtype: "phys", proj: "shadow",
    blurb: "Sends BLADES into the field, not volleys from a wall. They hold no ground — the column walks right past them — and they kill by standing order: healers, bell-ringers, banner-lords, whoever you name.",
    levels: [
      { dmg: 46, rate: 2000, range: 96, hp: 70, count: 1, unitSpeed: 118, preyMult: 1.5 },
      { dmg: 52, rate: 1950, range: 104, hp: 90, count: 2, unitSpeed: 122, preyMult: 1.5, cost: 100, label: "Second Blade" },
      { dmg: 76, rate: 1900, range: 112, hp: 115, count: 2, unitSpeed: 126, preyMult: 1.75, cost: 150, label: "Master of the Order" },
    ],
    branches: {
      a: {
        name: "The Silent Court", cost: 260, stats: { dmg: 120, rate: 1850, range: 118, hp: 150, count: 2, unitSpeed: 128, preyMult: 2, pierce: true, cull: 0.18 }, desc: "Two blades of the Court afield: they pierce any armor, strike support foes TWICE as hard, and finish the nearly-dead outright.",
        rank4: {
          a: { name: "Kingslayer", cost: 390, stats: { dmg: 150, rate: 1850, range: 122, hp: 175, count: 2, unitSpeed: 132, preyMult: 2.2, pierce: true, cull: 0.22, preyAnywhere: true }, desc: "No healer, herald or bell-ringer is safe ANYWHERE on the field — the Court's knives cross the map for them." },
          b: { name: "The Open Contract", cost: 390, stats: { dmg: 104, rate: 1750, range: 122, hp: 175, count: 3, unitSpeed: 132, preyMult: 1.4, pierce: true, cull: 0.2, silence: 3000, openContract: true }, desc: "The guild tears up its charter and takes ANY name offered. Three blades, ordinary standing orders — first, last, strongest, weakest — and they still hold no ground and block nothing. The cut still steals the voice." },
        },
      },
      b: {
        name: "Nightshade Guild", cost: 260, stats: { dmg: 62, rate: 1750, range: 116, hp: 130, count: 3, unitSpeed: 130, preyMult: 1.75, venom: 26, venomDur: 3200 }, desc: "THREE envenomed guildsmen in the grass. The wound is only the beginning — the poison does the collecting.",
        rank4: {
          a: { name: "Widow's Kiss", cost: 390, stats: { dmg: 76, rate: 1750, range: 122, hp: 150, count: 3, unitSpeed: 134, preyMult: 2, venom: 40, venomDur: 3600, venomNoHeal: true }, desc: "A venom no chant can outsing: while it burns, the victim CANNOT BE HEALED — by shaman, chaplain, or anything else that prays." },
          b: { name: "Plague Bearer", cost: 390, stats: { dmg: 70, rate: 1750, range: 122, hp: 150, count: 3, unitSpeed: 134, preyMult: 2, venom: 30, venomDur: 3200, spores: 26, sporeR: 44, sporeDur: 2600 }, desc: "What the venom touches, it keeps: whoever dies with the poison in them BURSTS into a lingering spore-cloud that sickens the column marching through." },
        },
      },
    },
  },
  sunforge: {
    name: "Sunforge", cost: 150, dtype: "magic", proj: "beam",
    blurb: "A captive shard of sun that holds ONE foe in its beam — and the longer it holds, the hotter it burns. Melts champions; ignores crowds.",
    levels: [
      { dps: 26, range: 100, rampMax: 3, rampTime: 3500, rate: 0 },
      { dps: 42, range: 108, rampMax: 3, rampTime: 3200, rate: 0, cost: 110, label: "Focused Array" },
      { dps: 62, range: 116, rampMax: 3.5, rampTime: 3000, rate: 0, cost: 160, label: "Perfect Facets" },
    ],
    branches: {
      a: {
        name: "Solar Lance", cost: 250, stats: { dps: 85, range: 124, rampMax: 4, rampTime: 2800, igniteBurn: 18, igniteDur: 2000, rate: 0 }, desc: "Hotter, faster, crueler — and at full focus the beam sets its victim alight.",
        rank4: {
          a: { name: "Noon Eternal", cost: 380, stats: { dps: 92, range: 132, rampMax: 4, rampTime: 2600, igniteBurn: 20, igniteDur: 2200, beamSplash: 42, rate: 0 }, desc: "At full focus the light overflows — everything near the victim burns in the spill." },
          b: { name: "Sun Spear", cost: 380, stats: { dps: 85, range: 130, rampMax: 6, rampTime: 3000, igniteBurn: 20, igniteDur: 2200, rate: 0 }, desc: "No ceiling worth the name: the ramp climbs to SIX times, if you have the patience to hold it." },
        },
      },
      b: {
        name: "Moon Prism", cost: 250, stats: { dps: 70, range: 124, rampMax: 3.5, rampTime: 2800, beamSlow: 0.3, rate: 0 }, desc: "Cold light: the held foe wades against it, slowed the whole while.",
        rank4: {
          a: { name: "Gravity Well", cost: 380, stats: { dps: 74, range: 132, rampMax: 3.5, rampTime: 2600, beamSlow: 0.35, wellRoot: true, rate: 0 }, desc: "At full focus the beam becomes a fist: the victim STOPS, pinned in the light. Yes — even him." },
          b: { name: "Eclipse", cost: 380, stats: { dps: 66, range: 130, rampMax: 3.5, rampTime: 2800, beamSlow: 0.3, beams: 2, rate: 0 }, desc: "Two beams, sun and shadow — a second foe held at half focus." },
        },
      },
    },
  },
  support: {
    name: "Warden Mage", cost: 110, dtype: "magic", proj: "aura",
    blurb: "A frost-touched mage on an altar — biting cold slows every enemy in the aura.",
    levels: [
      { slow: 0.15, range: 100, rate: 0 },
      { slow: 0.2, range: 110, rate: 0, cost: 80, label: "Deepening Chill" },
      { slow: 0.25, range: 120, rate: 0, cost: 120, label: "Heart of Winter" },
    ],
    branches: {
      a: {
        name: "Rimecaller", cost: 220, stats: { slow: 0.4, range: 135, nova: 10, novaFreeze: 900, novaEvery: 7000 }, desc: "Deep cold thickens the air — and every few heartbeats a frost nova flash-freezes the whole aura.",
        rank4: {
          a: { name: "Absolute Zero", cost: 340, stats: { slow: 0.5, range: 145, colddps: 11, nova: 16, novaFreeze: 1100, novaEvery: 6000 }, desc: "The air itself turns lethal: everything in the aura slows to a crawl and freezes by inches." },
          b: { name: "Permafrost Heart", cost: 340, stats: { slow: 0.38, range: 145, nova: 10, novaFreeze: 900, novaEvery: 6000, brittle: 0.35, brittleDur: 4000 }, desc: "Novas leave foes BRITTLE — frozen flesh takes a third more from every arrow, blade, and stone." },
        },
      },
      b: {
        name: "Lifebinder", cost: 220, stats: { slow: 0.12, heal: 24, range: 135 }, desc: "Warm light within the cold: wounded knights standing in the aura are mended swiftly.",
        rank4: {
          a: { name: "Guardian's Grace", cost: 340, stats: { slow: 0.12, heal: 26, range: 145, shield: true }, desc: "Knights in the light carry a shimmering ward that swallows one blow whole, then slowly reforms." },
          b: { name: "High Cathedral", cost: 340, stats: { slow: 0.12, heal: 30, range: 150, mend: 1 }, desc: "A wave survived is a wall reborn: each cleared wave, the cathedral restores 1 castle HP." },
        },
      },
    },
  },
};
