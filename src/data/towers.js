// ============ TOWERS ============
// Every tower's cost, per-level stats, and its permanent evolution branches.
// Path and final-form desc: 100 characters at most — the upgrade card shows it whole.

export const TOWERS = {
  archer: {
    name: "Archer Tower", cost: 100, dtype: "phys", proj: "arrow",
    blurb: "Quick arrows. Each recruit on the platform looses their own shaft.",
    levels: [
      { dmg: 17, rate: 750, range: 98 },
      { dmg: 30, rate: 700, range: 105, cost: 80, label: "Twin Archers" },
      { dmg: 46, rate: 650, range: 112, cost: 120, label: "Archer Trio" },
    ],
    branches: {
      a: {
        name: "Ranger Company", cost: 290, stats: { dmg: 15, rate: 155, range: 90 }, desc: "Rangers loose a blinding storm of arrows in relay. Melts swarms; struggles vs. heavy armor.",
        rank4: {
          a: { name: "Briar Rangers", cost: 580, stats: { dmg: 15, rate: 150, range: 98, poison: 9, poisonDur: 2600, poisonCap: 36 }, desc: "Venom-dipped arrows: every hit stacks a poison that gnaws through armor and regeneration alike." },
          b: { name: "Hawkeye Conclave", cost: 580, stats: { dmg: 17, rate: 160, range: 109, chain: 1, chainRange: 95 }, desc: "Impossible shots — every arrow ricochets off its mark into a second foe nearby." },
        },
      },
      b: {
        name: "Master Longbowman", cost: 290, stats: { dmg: 240, rate: 2100, range: 180, pierce: true }, desc: "One legendary archer. Slow, colossal shots that pierce any armor, from across the map.",
        rank4: {
          a: { name: "Ballista", cost: 610, stats: { dmg: 620, rate: 3600, range: 900, pierce: true, bolt: true, targeting: "strongest" }, desc: "A colossal siege bow. Slow, screaming bolts that hunt the MIGHTIEST enemy — anywhere on the field." },
          b: { name: "Dragonslayer", cost: 610, stats: { dmg: 265, rate: 2000, range: 195, pierce: true, crit: 3, critMult: 3 }, desc: "Forged to fell wyrms: every THIRD shot is a devastating triple-damage heartseeker." },
        },
      },
    },
  },
  knight: {
    name: "Knight Garrison", cost: 80, dtype: "phys", proj: "units",
    blurb: "A knight marches out to hold an enemy in melee. Upgrades add more swords.",
    levels: [
      { dmg: 16, rate: 800, range: 52, hp: 110, count: 1 },
      { dmg: 21, rate: 760, range: 56, hp: 150, count: 2, cost: 90, label: "Second Sword" },
      { dmg: 28, rate: 720, range: 60, hp: 200, count: 3, cost: 130, label: "Shield Brothers" },
    ],
    branches: {
      a: {
        name: "Paladin Order", cost: 320, stats: { dmg: 36, rate: 800, range: 60, hp: 280, count: 3, magic: true, stun: 0.25, stunDur: 900, heal: 7 }, desc: "Three radiant paladins: MAGIC blows that ignore armor, a chance to stun, and wounds that mend.",
        rank4: {
          a: { name: "Grand Champion", cost: 680, stats: { dmg: 110, rate: 900, range: 64, hp: 950, count: 1, magic: true, stun: 0.35, stunDur: 1100, heal: 18, giant: true }, desc: "The three paladins kneel and ONE colossal champion rises: a living fortress, a hammer like a star." },
          b: { name: "Radiant Basilica", cost: 680, stats: { dmg: 44, rate: 780, range: 64, hp: 340, count: 3, magic: true, stun: 0.25, stunDur: 900, heal: 10, sear: 14 }, desc: "Holy ground follows the paladins' boots — enemies near them smolder in sacred light." },
        },
      },
      b: {
        name: "Berserker Hall", cost: 320, stats: { dmg: 20, rate: 320, range: 60, hp: 150, count: 4 }, desc: "FOUR berserkers with whirling axes. Frailer than knights, but a storm of steel.",
        rank4: {
          a: { name: "Wolf Lodge", cost: 680, stats: { dmg: 24, rate: 300, range: 98, hp: 175, count: 4, unitSpeed: 150, respawnMs: 4000, rider: true }, desc: "Berserkers on great wolves: faster than anything on the road, and back from the dead in a heartbeat." },
          b: { name: "Blood Frenzy", cost: 680, stats: { dmg: 22, rate: 300, range: 60, hp: 160, count: 4, frenzy: true, lifesteal: 0.6 }, desc: "Every wound they deal feeds them — and the longer they fight, the faster the axes swing." },
        },
      },
    },
  },
  wizard: {
    name: "Wizard Spire", cost: 140, dtype: "magic", proj: "orb",
    blurb: "Arcane blasts splash in an area — strongest at the blast's heart — and ignore armor.",
    levels: [
      { dmg: 20, rate: 1300, range: 90, splash: 55 },
      { dmg: 34, rate: 1250, range: 96, splash: 60, cost: 100, label: "Adept Circle" },
      { dmg: 52, rate: 1200, range: 102, splash: 66, cost: 150, label: "High Sorcery" },
    ],
    branches: {
      a: {
        name: "Pyromancer", cost: 350, stats: { dmg: 46, rate: 1200, range: 105, splash: 72, burn: 11, burnDur: 2600 }, desc: "Fireballs with a huge blast that set enemies ablaze — burning damage over time.",
        rank4: {
          // every 5th fireball (poolEvery) leaves the road burning behind it
          a: { name: "Inferno Throne", cost: 650, stats: { dmg: 80, rate: 1250, range: 109, splash: 76, burn: 12, burnDur: 2600, poolEvery: 5, poolKind: "fire", poolDps: 24, poolDur: 3500, poolR: 36 }, desc: "Fireballs from a throne of flame — every FIFTH is a firestorm that leaves the road burning." },
          // a held gout of flame, not shots: dmg is per SECOND to everything
          // inside the cone (update.js breathe); fire it close to the road
          b: { name: "Dragonbreath", cost: 650, stats: { dmg: 60, range: 69, breath: true, cone: 0.42, burn: 8, burnDur: 1500 }, desc: "A flamethrower: a cone of dragonfire scorching EVERYTHING in it. Short reach — build it by the road." },
        },
      },
      b: {
        name: "Stormcaller", cost: 350, stats: { dmg: 42, rate: 1300, range: 112, arc: 3, arcRange: 95, arcFall: 0.7 }, desc: "Lightning lashes the frontrunner and arcs down the line — no armor, no escape.",
        rank4: {
          a: { name: "Tempest Court", cost: 650, stats: { dmg: 46, rate: 1200, range: 120, arc: 6, arcRange: 110, arcFall: 0.8 }, desc: "The storm dances: bolts leap SIX times, scouring entire columns of the horde." },
          b: { name: "Thunder Sovereign", cost: 650, stats: { dmg: 125, rate: 1400, range: 124, arc: 3, arcRange: 95, arcFall: 0.75, zapStun: 0.3, zapStunDur: 700 }, desc: "Heaven's own hammer: fewer, crueler bolts that can lock victims rigid with shock." },
        },
      },
    },
  },
  catapult: {
    name: "Catapult", cost: 120, dtype: "phys", proj: "rock",
    // stones and logs never touch a flier — save the Comet Sling (hitsAir)
    groundOnly: true,
    blurb: "Lobs boulders in a high arc — heavy splash at long range, but blind up close and to anything that flies. At level three it chooses: keep throwing things UP, or start rolling them ALONG.",
    levels: [
      { dmg: 36, rate: 2600, range: 142, minRange: 52, splash: 58 },
      { dmg: 58, rate: 2500, range: 154, minRange: 52, splash: 64, cost: 110, label: "Reinforced Arm" },
      { dmg: 84, rate: 2400, range: 165, minRange: 52, splash: 70, cost: 160, label: "Master Engineers" },
    ],
    branches: {
      a: {
        name: "Trebuchet", cost: 340, stats: { dmg: 200, rate: 4200, range: 255, minRange: 75, splash: 88 }, desc: "One colossal counterweighted arm: boulders across half the field — but its blind circle grows.",
        rank4: {
          a: { name: "Earthshaker", cost: 680, stats: { dmg: 260, rate: 4400, range: 262, minRange: 75, splash: 105, slow: 0.3, slowDur: 1600 }, desc: "Boulders that crack the very road — survivors stagger through the rubble, slowed." },
          b: { name: "Comet Sling", cost: 680, stats: { dmg: 230, rate: 4200, range: 315, minRange: 75, splash: 80, burn: 12, burnDur: 2400, targeting: "strongest", hitsAir: true }, desc: "Burning stones flung at the MIGHTIEST foe anywhere — even fliers, the only catapult that can." },
        },
      },
      b: {
        name: "The Log Roller", cost: 340, stats: { logDmg: 110, rate: 5200, range: 999, minRange: 0, logSpeed: 118, logWidth: 22, splash: 0, roller: true }, desc: "Stops throwing, starts ROLLING: a log down a bearing YOU choose, slowing a bit per foe it crushes.",
        rank4: {
          a: { name: "The Iron Drum", cost: 680, stats: { logDmg: 190, rate: 5000, range: 999, minRange: 0, logSpeed: 126, logWidth: 28, splash: 0, roller: true, logStun: 900, logSlow: 0.4, logSlowDur: 2000 }, desc: "An iron-banded drum: heavier, wider, and what survives it is left stunned and staggering." },
          b: { name: "The Powder Keg Run", cost: 680, stats: { logDmg: 135, rate: 4800, range: 999, minRange: 0, logSpeed: 132, logWidth: 24, splash: 0, roller: true, logBurn: 26, logBurnDur: 3000, logBlast: 96, logBlastDmg: 220 }, desc: "A powder-packed log: it burns all it grinds past, and goes up when it finally leaves the field." },
        },
      },
    },
  },
  spiker: {
    name: "Bladewheel", cost: 110, dtype: "phys", proj: "spike",
    // a narrow hall on a post: it may stand 42 from the road's centreline
    // (not 48) and shoulder closer to its neighbours, so it fits the tight
    // inside of a bend. Its ground art keeps inside kitB FOOT_NARROW.
    roadClear: 42, reach: 12,
    // spikes and flame rings skim the road: nothing that flies is touched
    groundOnly: true,
    blurb: "A spinning wheel that flings spikes in EVERY direction. Blind beyond arm's reach, and to anything that flies — deadly on corners and doubled-back road.",
    levels: [
      { dmg: 12, rate: 900, range: 66, spikes: 10 },
      { dmg: 18, rate: 820, range: 71, spikes: 12, cost: 90, label: "Whetted Steel" },
      { dmg: 26, rate: 740, range: 76, spikes: 14, spikePierce: 2, cost: 140, label: "Twin Rims" },
    ],
    branches: {
      a: {
        name: "Razor Gale", cost: 320, stats: { dmg: 15, rate: 300, range: 81, spikes: 14, spikePierce: 2 }, desc: "The wheel screams — a near-constant storm of steel shreds everything that hugs it.",
        rank4: {
          a: { name: "Steel Tempest", cost: 650, stats: { dmg: 18, rate: 240, range: 88, spikes: 18, spikePierce: 4 }, desc: "Spikes forged to skewer: eighteen to a volley, each punching through FOUR foes before it stops." },
          b: { name: "Hamstringer", cost: 650, stats: { dmg: 16, rate: 260, range: 86, spikes: 16, spikePierce: 3, slow: 0.35, slowDur: 1500 }, desc: "Barbed spikes lodge in legs and paws — everything struck hobbles away slowed." },
        },
      },
      b: {
        name: "Brazier Wheel", cost: 320, stats: { dmg: 43, rate: 1300, range: 81, nova: true, magic: true, burn: 12, burnDur: 2400 }, desc: "The rim is set alight: rings of flame, not spikes, scorch all in reach. MAGIC — ignores armor.",
        rank4: {
          a: { name: "Solar Crown", cost: 650, stats: { dmg: 76, rate: 1250, range: 93, nova: true, magic: true, burn: 18, burnDur: 2800 }, desc: "A captive shard of the sun. Wider, hotter rings that leave deep burns." },
          b: { name: "Wildheart Pyre", cost: 650, stats: { dmg: 52, rate: 1250, range: 86, nova: true, magic: true, burn: 16, burnDur: 2800, burnSpread: true }, desc: "Its fire is ALIVE: flames set by the rings leap hungrily from foe to foe." },
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
        name: "Royal Mint", cost: 320, stats: { income: 40, compound: 2, range: 0, rate: 0 }, desc: "Compounding wealth: its payout grows every wave it survives. Plant it early; let time do the sums.",
        rank4: {
          a: { name: "Dragon's Hoard", cost: 650, stats: { income: 60, compound: 3, hoard: true, range: 0, rate: 0 }, desc: "Doubled payouts — but a wave where the castle bleeds pays NOTHING. Greed with a heartbeat." },
          b: { name: "Philosopher's Stone", cost: 650, stats: { income: 55, compound: 3, range: 0, rate: 0 }, desc: "Lead into gold into more gold: the richest single wage on the board, compounding every wave." },
        },
      },
      b: {
        name: "Transmuter", cost: 320, stats: { dmg: 34, rate: 1300, range: 98, magic: true, bountyAura: 0.25, auraRange: 90 }, desc: "The alchemist takes the field: MAGIC acid vials, and an aura where every kill pays a quarter more.",
        rank4: {
          a: { name: "Midas Cannon", cost: 680, stats: { dmg: 40, rate: 1250, range: 101, magic: true, midas: 12, bountyAura: 0.25, auraRange: 90 }, desc: "Every 12th shot turns a lesser foe to solid gold — killed outright, and worth triple." },
          b: { name: "Lead to Gold", cost: 680, stats: { dmg: 36, rate: 1300, range: 98, magic: true, bountyAura: 0.3, auraRange: 98, shredAura: 0.25 }, desc: "The aura transmutes armor itself: everything inside it wears a quarter less plate." },
        },
      },
    },
  },
  trapsmith: {
    name: "Trapsmith", cost: 110, dtype: "phys", proj: "trap",
    blurb: "Arms the ROAD itself. Works his stretch without orders and CARPETS it — road spikes by default, and the field is swept and re-laid every wave.",
    levels: [
      { trapDmg: 46, splash: 26, maxCharges: 5, chargeEvery: 2600, range: 112, slow: 0.3, slowDur: 1400, rate: 0, trapKind: "spike" },
      { trapDmg: 70, splash: 28, maxCharges: 7, chargeEvery: 2200, range: 124, slow: 0.32, slowDur: 1500, rate: 0, cost: 90, label: "Sharper Springs", trapKind: "spike" },
      { trapDmg: 98, splash: 30, maxCharges: 9, chargeEvery: 1900, range: 135, slow: 0.35, slowDur: 1600, rate: 0, cost: 130, label: "Double Stockpile", trapKind: "spike" },
    ],
    branches: {
      a: {
        name: "Springworks", cost: 320, stats: { trapDmg: 120, splash: 34, maxCharges: 8, chargeEvery: 1900, range: 146, root: 2200, rate: 0, trapKind: "jaws" }, desc: "Bear-iron jaws instead of spikes: whatever steps in is HELD FAST — a block with no knight in it.",
        rank4: {
          a: { name: "Guillotine Gate", cost: 650, stats: { trapDmg: 150, splash: 36, maxCharges: 9, chargeEvery: 1700, range: 150, root: 2400, execute: 0.22, rate: 0, trapKind: "jaws" }, desc: "Anything under a fifth of its health that touches the iron is simply finished." },
          b: { name: "Caltrop Field", cost: 650, stats: { trapDmg: 124, splash: 38, maxCharges: 11, chargeEvery: 1500, range: 150, root: 2000, caltrops: 6000, caltropSlow: 0.35, rate: 0, trapKind: "caltrop" }, desc: "Caltrops laid thick — every one that springs leaves ground that keeps slowing the column after." },
        },
      },
      b: {
        name: "Blastworks", cost: 320, stats: { trapDmg: 175, splash: 58, maxCharges: 6, chargeEvery: 2400, range: 146, burn: 14, burnDur: 2600, rate: 0, trapKind: "mine" }, desc: "Pressure mines. Big blasts, burning shrapnel, and a column that learns to fear its own road.",
        rank4: {
          a: { name: "Minefield Doctrine", cost: 650, stats: { trapDmg: 165, splash: 54, maxCharges: 7, chargeEvery: 2300, autoSeed: 3, burn: 14, burnDur: 2600, range: 154, rate: 0, trapKind: "mine" }, desc: "Through the horn: mines seed THEMSELVES onto the road as each wave begins, on top of those laid." },
          b: { name: "The Aerostat Yard", cost: 650, stats: { trapDmg: 210, splash: 66, maxCharges: 7, chargeEvery: 2200, range: 154, burn: 16, burnDur: 2800, stunAll: 700, rate: 0, trapKind: "mine", balloon: 2 }, desc: "Every SECOND charge rises: a balloon bomb that answers only to FLIERS. Its blasts stun survivors." },
        },
      },
    },
  },
  falconry: {
    name: "Falconry", cost: 130, dtype: "phys", proj: "talon",
    blurb: "A falcon that owns the sky: double talons against fliers, and every strike MARKS its prey to take more from all your towers.",
    levels: [
      { dmg: 26, rate: 1400, range: 112, airMult: 2, mark: 0.2, markDur: 2500 },
      { dmg: 42, rate: 1350, range: 120, airMult: 2, mark: 0.2, markDur: 2500, cost: 90, label: "Second Falcon" },
      { dmg: 62, rate: 1300, range: 128, airMult: 2, mark: 0.25, markDur: 3000, cost: 140, label: "Master Falconer" },
    ],
    branches: {
      a: {
        name: "Royal Aviary", cost: 340, stats: { dmg: 66, rate: 750, range: 131, airMult: 2.2, mark: 0.25, markDur: 3000, diveStun: 0.18, diveStunDur: 500 }, desc: "A whole mews of hunting birds: near-constant dives that can knock foes senseless.",
        rank4: {
          a: { name: "Skyknight", cost: 670, stats: { range: 154, rate: 0, skyknight: true, eagleHp: 1500, eagleDmg: 96, eagleRate: 620, eagleRespawn: 11000, groundDmg: 80, groundRate: 950 }, desc: "A war-eagle that duels and HOLDS the worst flier; with the sky clear, it swoops on troops below." },
          b: { name: "Storm Falcons", cost: 670, stats: { dmg: 76, rate: 700, range: 135, airMult: 2.4, mark: 0.25, markDur: 3000, diveStun: 0.25, diveStunDur: 600, chain: 1, chainRange: 90 }, desc: "Dives that crack like weather — each strike ricochets to a second victim." },
        },
      },
      b: {
        name: "Warhawk Court", cost: 340, stats: { dmg: 55, rate: 1250, range: 135, airMult: 2, mark: 0.3, markDur: 3200, markShred: 0.3 }, desc: "The marks turn surgical: marked foes also shed a third of their armor — your arrows bite again.",
        rank4: {
          a: { name: "Kingsight", cost: 670, stats: { dmg: 87, rate: 1000, range: 150, airMult: 2, mark: 0.3, markDur: 3200, markShred: 0.3, kingsight: true }, desc: "The court's eye never closes: the mightiest foe on the field is ALWAYS marked, everywhere, forever." },
          b: { name: "Talon Rain", cost: 670, stats: { dmg: 55, rate: 1250, range: 142, airMult: 2.2, mark: 0.3, markDur: 3200, markShred: 0.3, shots: 3 }, desc: "Three birds aloft at once — every volley marks three different victims." },
        },
      },
    },
  },
  gunpowder: {
    name: "Powder Works", cost: 145, dtype: "phys", proj: "shell",
    blurb: "TWO MEN, TWO WEAPONS, ALWAYS. A bombardier lobs powder charges that burst into flying iron, while beside him a musketeer takes one slow, heavy, armor-splitting shot at something further out. Every path makes them a better pair.",
    // The bombardier's charge lands ON its mark — a tight blast (dmg) that
    // hurts that foe alone — and bursts into `frags` shards of `fragDmg`
    // each, flying `fragReach` round it and striking the first foe in their
    // path (owner, 2026-09-29: "shrapnel radiates out ... upgrades bring
    // more shrapnel"). All of it physical: a shield pip swallows a shard.
    levels: [
      { dmg: 44, rate: 2400, range: 69, frags: 4, fragDmg: 26, fragReach: 40, mDmg: 58, mRate: 2900, mRange: 126, count: 2 },
      { dmg: 70, rate: 2300, range: 75, frags: 5, fragDmg: 38, fragReach: 42, mDmg: 92, mRate: 2800, mRange: 135, count: 2, cost: 110, label: "Better Powder" },
      { dmg: 100, rate: 2200, range: 81, frags: 7, fragDmg: 50, fragReach: 44, mDmg: 138, mRate: 2700, mRange: 144, count: 2, cost: 160, label: "The Powder Works" },
    ],
    // Neither path picks one man over the other: both weapons grow on both,
    // and each path is a way of working together. The Bombard Yard's charges
    // and every shard they throw CRACK armor (brittle: +crack physical damage
    // taken for crackDur) and the musketeer shoots the cracked first; the
    // Long Muskets' musketeer SPOTS for the bombardier, whose charges follow
    // his mark out to the musket's reach (engine/update.js, "the Powder Works").
    branches: {
      a: {
        name: "The Bombard Yard", cost: 350, stats: { dmg: 130, rate: 2100, range: 90, frags: 12, fragDmg: 56, fragReach: 50, burn: 12, burnDur: 2400, crack: 0.25, crackDur: 2600, mDmg: 225, mRate: 2600, mRange: 153, count: 2 }, desc: "Charges and every shard they throw crack armor open, and the musketeer shoots into the cracks.",
        rank4: {
          a: { name: "The Grand Battery", cost: 680, stats: { dmg: 110, rate: 2000, range: 98, frags: 32, fragDmg: 46, fragReach: 56, burn: 16, burnDur: 2800, crack: 0.3, crackDur: 3000, mDmg: 290, mRate: 2500, mRange: 158, count: 2 }, desc: "One great charge a throw and a storm of iron out of it, cracking the whole road for the musket." },
          b: { name: "Dragon's Breath", cost: 680, stats: { dmg: 120, rate: 2050, range: 94, frags: 14, fragDmg: 30, fragReach: 52, fragBurn: true, burn: 24, burnDur: 3400, burnSpread: true, crack: 0.25, crackDur: 2600, mDmg: 262, mRate: 2550, mRange: 154, mBurn: 24, mBurnDur: 3400, count: 2 }, desc: "Pitch in the powder, hot shot in the musket: red-hot shards set foes alight, and the fire leaps." },
        },
      },
      b: {
        name: "The Long Muskets", cost: 350, stats: { dmg: 150, rate: 2150, range: 84, frags: 9, fragDmg: 56, fragReach: 48, mDmg: 255, mRate: 2600, mRange: 188, mPierce: true, spot: true, count: 2 }, desc: "The musketeer spots for the bombardier: every charge follows the musket's mark, out to its reach.",
        rank4: {
          a: { name: "The Sharpshooters", cost: 680, stats: { dmg: 180, rate: 2100, range: 87, frags: 10, fragDmg: 60, fragReach: 50, mDmg: 380, mRate: 2500, mRange: 218, mPierce: true, mCrit: 3, spot: true, count: 2 }, desc: "One held breath: every THIRD musket shot lands triple, and the bombardier's charge follows it in." },
          b: { name: "The Grapeshot Crew", cost: 680, stats: { dmg: 150, rate: 2100, range: 87, frags: 12, fragDmg: 54, fragReach: 50, mDmg: 170, mRate: 2400, mRange: 180, mPierce: true, mShots: 4, mSpread: 0.26, spot: true, count: 2 }, desc: "FOUR balls in a spreading fan, every one punching armor, and the charges follow the fan in." },
        },
      },
    },
  },
  riverwatch: {
    name: "River Watch", cost: 130, dtype: "phys", proj: "harpoon", water: true,
    blurb: "BUILT ON THE WATER — the only hall that can be: moor it in a river, a pond or a mere. Its skiffs row the water under their own orders, carrying muskets to stretches of bank no tower can reach.",
    levels: [
      { dmg: 30, rate: 950, range: 94, hp: 130, count: 1, rowSpeed: 74 },
      { dmg: 40, rate: 900, range: 101, hp: 165, count: 2, rowSpeed: 78, cost: 100, label: "Second Skiff" },
      { dmg: 56, rate: 860, range: 109, hp: 210, count: 2, rowSpeed: 82, cost: 150, label: "The River Watch" },
    ],
    branches: {
      a: {
        name: "Harbour Patrol", cost: 350, stats: { dmg: 64, rate: 620, range: 116, hp: 250, count: 3, rowSpeed: 96 }, desc: "THREE swift skiffs working the whole length of the water, firing twice as fast as any watchman.",
        rank4: {
          a: { name: "The Crown Navy", cost: 670, stats: { dmg: 70, rate: 600, range: 124, hp: 290, count: 4, rowSpeed: 104 }, desc: "FOUR skiffs under an admiral's pennant — the river belongs to the crown, and its banks know it." },
          b: { name: "Harpooners", cost: 670, stats: { dmg: 96, rate: 700, range: 128, hp: 270, count: 3, rowSpeed: 96, pierce: true, slow: 0.35, slowDur: 1600 }, desc: "Harpoon guns: barbed iron on a line punches through any armor and drags what it hits to a crawl." },
        },
      },
      b: {
        name: "Fireship Wharf", cost: 350, stats: { dmg: 52, rate: 1250, range: 112, hp: 230, count: 2, rowSpeed: 76, splash: 54, burn: 11, burnDur: 2400 }, desc: "Hot shot packed in pitch: slower shots, but each one bursts in flame across the bank.",
        rank4: {
          a: { name: "The Hellburner", cost: 670, stats: { dmg: 64, rate: 1350, range: 120, hp: 260, count: 2, rowSpeed: 76, splash: 64, burn: 13, burnDur: 2600, poolDps: 11, poolDur: 2200, poolR: 26 }, desc: "A hull packed with powder and pitch: every pot leaves the shore burning behind it." },
          b: { name: "The Chain Boom", cost: 670, stats: { dmg: 54, rate: 1250, range: 124, hp: 300, count: 3, rowSpeed: 80, splash: 52, burn: 9, burnDur: 2000, stun: 0.2, stunDur: 800 }, desc: "A chain slung between the skiffs and a shot that rings it — what the boom catches stands stunned." },
        },
      },
    },
  },
  assassin: {
    name: "Assassin's Covert", cost: 140, dtype: "phys", proj: "shadow",
    blurb: "Sends BLADES into the field, not volleys from a wall. They hold no ground — the column walks right past them — and they kill by standing order: healers, bell-ringers, banner-lords, whoever you name.",
    levels: [
      { dmg: 46, rate: 2000, range: 72, hp: 70, count: 1, unitSpeed: 118, preyMult: 1.5 },
      { dmg: 52, rate: 1950, range: 78, hp: 90, count: 2, unitSpeed: 122, preyMult: 1.5, cost: 100, label: "Second Blade" },
      { dmg: 76, rate: 1900, range: 84, hp: 115, count: 2, unitSpeed: 126, preyMult: 1.75, cost: 150, label: "Master of the Order" },
    ],
    branches: {
      a: {
        name: "The Silent Court", cost: 360, stats: { dmg: 120, rate: 1850, range: 88, hp: 150, count: 2, unitSpeed: 128, preyMult: 2, pierce: true, cull: 0.18 }, desc: "Two blades afield: they pierce armor, strike support foes TWICE as hard, and finish the nearly-dead.",
        rank4: {
          a: { name: "Kingslayer", cost: 700, stats: { dmg: 150, rate: 1850, range: 92, hp: 175, count: 2, unitSpeed: 132, preyMult: 2.2, pierce: true, cull: 0.22, preyAnywhere: true }, desc: "No healer, herald or bell-ringer is safe ANYWHERE — the Court's knives cross the map for them." },
          b: { name: "The Open Contract", cost: 700, stats: { dmg: 104, rate: 1750, range: 92, hp: 175, count: 3, unitSpeed: 132, preyMult: 1.4, pierce: true, cull: 0.2, silence: 3000, openContract: true }, desc: "Three blades for ANY name: first, last, strongest, weakest. They block nothing; the cut silences." },
        },
      },
      b: {
        name: "Nightshade Guild", cost: 360, stats: { dmg: 62, rate: 1750, range: 87, hp: 130, count: 3, unitSpeed: 130, preyMult: 1.75, venom: 26, venomDur: 3200 }, desc: "THREE envenomed guildsmen in the grass. The wound is only the start — the poison does the rest.",
        rank4: {
          a: { name: "Widow's Kiss", cost: 700, stats: { dmg: 92, rate: 1500, range: 94, hp: 170, count: 3, unitSpeed: 134, preyMult: 2, venom: 58, venomDur: 3600, venomNoHeal: true }, desc: "A venom no chant can outsing: while it burns, the victim CANNOT BE HEALED by anything that prays." },
          b: { name: "Plague Bearer", cost: 700, stats: { dmg: 84, rate: 1500, range: 94, hp: 170, count: 3, unitSpeed: 134, preyMult: 2, venom: 40, venomDur: 3200, spores: 36, sporeR: 50, sporeDur: 2600 }, desc: "Whoever dies with the venom in them BURSTS into a spore-cloud that sickens the column behind." },
        },
      },
    },
  },
  sunforge: {
    name: "Sunforge", cost: 150, dtype: "magic", proj: "beam",
    blurb: "A captive shard of sun that holds ONE foe in its beam — and the longer it holds, the hotter it burns. Melts champions; ignores crowds.",
    levels: [
      { dps: 26, range: 75, rampMax: 3, rampTime: 3500, rate: 0 },
      { dps: 42, range: 81, rampMax: 3, rampTime: 3200, rate: 0, cost: 110, label: "Focused Array" },
      { dps: 62, range: 87, rampMax: 3.5, rampTime: 3000, rate: 0, cost: 160, label: "Perfect Facets" },
    ],
    branches: {
      a: {
        name: "Solar Lance", cost: 350, stats: { dps: 85, range: 93, rampMax: 4, rampTime: 2800, igniteBurn: 18, igniteDur: 2000, rate: 0 }, desc: "Hotter, faster, crueler — and at full focus the beam sets its victim alight.",
        rank4: {
          a: { name: "Noon Eternal", cost: 680, stats: { dps: 92, range: 99, rampMax: 4, rampTime: 2600, igniteBurn: 20, igniteDur: 2200, beamSplash: 42, rate: 0 }, desc: "At full focus the light overflows — everything near the victim burns in the spill." },
          b: { name: "Sun Spear", cost: 680, stats: { dps: 85, range: 98, rampMax: 6, rampTime: 3000, igniteBurn: 20, igniteDur: 2200, rate: 0 }, desc: "No ceiling worth the name: the ramp climbs to SIX times, if you have the patience to hold it." },
        },
      },
      b: {
        name: "Moon Prism", cost: 350, stats: { dps: 70, range: 93, rampMax: 3.5, rampTime: 2800, beamSlow: 0.3, rate: 0 }, desc: "Cold light: the held foe wades against it, slowed the whole while.",
        rank4: {
          a: { name: "Gravity Well", cost: 680, stats: { dps: 74, range: 99, rampMax: 3.5, rampTime: 2600, beamSlow: 0.35, wellRoot: true, rate: 0 }, desc: "At full focus the beam becomes a fist: the victim STOPS, pinned in the light. Yes — even him." },
          b: { name: "Eclipse", cost: 680, stats: { dps: 66, range: 98, rampMax: 3.5, rampTime: 2800, beamSlow: 0.3, beams: 2, rate: 0 }, desc: "Two beams, sun and shadow — a second foe held at half focus." },
        },
      },
    },
  },
  support: {
    name: "Warden Mage", cost: 110, dtype: "magic", proj: "aura",
    blurb: "A frost-touched mage on an altar — biting cold slows every enemy in the aura.",
    levels: [
      { slow: 0.15, range: 75, rate: 0 },
      { slow: 0.2, range: 82, rate: 0, cost: 80, label: "Deepening Chill" },
      { slow: 0.25, range: 90, rate: 0, cost: 120, label: "Heart of Winter" },
    ],
    branches: {
      a: {
        name: "Rimecaller", cost: 310, stats: { slow: 0.4, range: 101, nova: 10, novaFreeze: 900, novaEvery: 7000 }, desc: "Deep cold thickens the air — and every few heartbeats a frost nova flash-freezes the whole aura.",
        rank4: {
          a: { name: "Absolute Zero", cost: 610, stats: { slow: 0.5, range: 109, colddps: 11, nova: 16, novaFreeze: 1100, novaEvery: 6000 }, desc: "The air itself turns lethal: everything in the aura slows to a crawl and freezes by inches." },
          b: { name: "Permafrost Heart", cost: 610, stats: { slow: 0.38, range: 109, nova: 10, novaFreeze: 900, novaEvery: 6000, brittle: 0.35, brittleDur: 4000 }, desc: "Novas leave foes BRITTLE — frozen flesh takes a third more from every arrow, blade, and stone." },
        },
      },
      b: {
        name: "Lifebinder", cost: 310, stats: { slow: 0.12, heal: 24, range: 101 }, desc: "Warm light within the cold: wounded knights standing in the aura are mended swiftly.",
        rank4: {
          a: { name: "Guardian's Grace", cost: 610, stats: { slow: 0.12, heal: 26, range: 109, shield: true }, desc: "Knights in the light carry a shimmering ward that swallows one blow whole, then slowly reforms." },
          b: { name: "High Cathedral", cost: 610, stats: { slow: 0.12, heal: 30, range: 112, mend: 1 }, desc: "A wave survived is a wall reborn: each cleared wave, the cathedral restores 1 castle HP." },
        },
      },
    },
  },
};
