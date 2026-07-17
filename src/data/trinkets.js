// Trinkets are unique roster-wide auras: at most one of each per run, bought
// once and active forever after. Unlike mods they aren't a generic
// stat+value bump - each one has a distinct hand-written behavior, applied
// either in Battle.js (combat-time effects) or GameState (passive stats) or
// main.js (economy effects). `kind` is how those call sites recognize which
// trinkets are owned.
export const TRINKETS = [
  {
    id: 'fleetfoot_charm',
    name: 'Fleetfoot Charm',
    kind: 'momentum',
    description: 'Units build momentum as they approach the core, gaining up to +20% move speed the closer they get.',
    cost: 90,
    param: 0.2,
  },
  {
    id: 'undying_locket',
    name: 'Undying Locket',
    kind: 'lastStand',
    description: 'Once per wave, each unit survives what would have been a fatal blow with 1 HP instead of dying.',
    cost: 140,
  },
  {
    id: 'vengeful_ashes',
    name: 'Vengeful Ashes',
    kind: 'rally',
    description: 'Whenever a unit falls, every surviving unit permanently gains +15% core damage for the rest of that wave.',
    cost: 100,
    param: 0.15,
  },
  {
    id: 'swarm_banner',
    name: 'Swarm Banner',
    kind: 'packSpeed',
    description: 'Each unit gains +1.5% move speed for every other unit currently marching alongside it.',
    cost: 85,
    param: 0.015,
  },
  {
    id: 'thornbound_idol',
    name: 'Thornbound Idol',
    kind: 'passiveReflect',
    description: 'Every unit passively reflects 8% of damage taken back at the attacking tower, even without a reflect mod.',
    cost: 110,
    param: 0.08,
  },
  {
    id: 'gilded_standard',
    name: 'Gilded Standard',
    kind: 'goldBonus',
    description: '+20% gold earned from every wave for the rest of the run.',
    cost: 95,
    param: 0.2,
  },
  {
    id: 'sunfire_ember',
    name: 'Sunfire Ember',
    kind: 'rootImmune',
    description: 'Units are completely immune to being rooted by frost effects.',
    cost: 100,
  },
  {
    id: 'verdant_charm',
    name: 'Verdant Charm',
    kind: 'regen',
    description: 'Every unit slowly regenerates 2 HP per second while marching.',
    cost: 90,
    param: 2,
  },
  {
    id: 'iron_bulwark',
    name: 'Iron Bulwark',
    kind: 'armor',
    description: 'Every tower hit is reduced by 3 flat damage (always at least 1 gets through).',
    cost: 95,
    param: 3,
  },
  {
    id: 'bloodrage_fetish',
    name: 'Bloodrage Fetish',
    kind: 'berserker',
    description: 'Units below half HP deal +40% core damage when they reach it.',
    cost: 100,
    param: 0.4,
  },
  {
    id: 'blessed_chalice',
    name: 'Blessed Chalice',
    kind: 'healBoost',
    description: "Medics' healing pulses restore +60% more HP.",
    cost: 70,
    param: 0.6,
  },
  {
    id: 'plunderers_sack',
    name: "Plunderer's Sack",
    kind: 'towerKillBonus',
    description: 'Destroying a tower pays out an extra 40 gold.',
    cost: 85,
    param: 40,
  },
];

export function getTrinket(id) {
  return TRINKETS.find((t) => t.id === id) || null;
}

export function rollTrinketOffers(rand, ownedIds, count = 2) {
  const pool = TRINKETS.filter((t) => !ownedIds.includes(t.id));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
