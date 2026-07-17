import { tierInfo, pickWeightedTier } from './tiers.js';

const TIER_NUMERALS = { 1: 'I', 2: 'II', 3: 'III' };

// scope 'instance' = applied to a single chosen unit, permanently, and lost only if that unit dies.
// scope 'roster'   = applied to every unit the player currently owns, forever.
const MOD_FAMILIES = [
  {
    key: 'swift_boots',
    name: 'Swift Boots',
    scope: 'instance',
    stat: 'speedPct',
    baseValue: 0.15,
    baseCost: 25,
    describe: (v) => `+${Math.round(v * 100)}% move speed`,
  },
  {
    key: 'phantom_step',
    name: 'Phantom Step',
    scope: 'instance',
    stat: 'dodge',
    baseValue: 0.1,
    baseCost: 30,
    describe: (v) => `+${Math.round(v * 100)}% dodge chance`,
  },
  {
    key: 'thorned_hide',
    name: 'Thorned Hide',
    scope: 'instance',
    stat: 'reflect',
    baseValue: 0.2,
    baseCost: 30,
    describe: (v) => `Reflect ${Math.round(v * 100)}% of damage taken back at the tower`,
  },
  {
    key: 'iron_skin',
    name: 'Iron Skin',
    scope: 'instance',
    stat: 'hp',
    baseValue: 12,
    baseCost: 20,
    describe: (v) => `+${Math.round(v)} max HP`,
  },
  {
    key: 'warhone_edge',
    name: 'Warhone Edge',
    scope: 'instance',
    stat: 'damage',
    baseValue: 3,
    baseCost: 20,
    describe: (v) => `+${Math.round(v)} damage`,
  },
  {
    key: 'banner_haste',
    name: 'Banner of Haste',
    scope: 'roster',
    stat: 'speedPct',
    baseValue: 0.08,
    baseCost: 60,
    describe: (v) => `+${Math.round(v * 100)}% move speed for the whole roster`,
  },
  {
    key: 'battle_cry',
    name: 'Battle Cry',
    scope: 'roster',
    stat: 'damage',
    baseValue: 2,
    baseCost: 55,
    describe: (v) => `+${Math.round(v)} damage for the whole roster`,
  },
  {
    key: 'aegis_ward',
    name: 'Aegis Ward',
    scope: 'roster',
    stat: 'dodge',
    baseValue: 0.06,
    baseCost: 65,
    describe: (v) => `+${Math.round(v * 100)}% dodge chance for the whole roster`,
  },
];

export const MOD_FAMILY_KEYS = MOD_FAMILIES.map((f) => f.key);
export const INSTANCE_MOD_FAMILY_KEYS = MOD_FAMILIES.filter((f) => f.scope === 'instance').map((f) => f.key);

function familyByKey(key) {
  return MOD_FAMILIES.find((f) => f.key === key);
}

export function buildModCard(familyKey, tier) {
  const fam = familyByKey(familyKey);
  const t = tierInfo(tier);
  const rawValue = fam.baseValue * t.valueMult;
  const value = fam.stat === 'hp' || fam.stat === 'damage' ? Math.round(rawValue) : rawValue;
  return {
    id: `${fam.key}_t${tier}`,
    family: fam.key,
    name: `${fam.name} ${TIER_NUMERALS[tier]}`,
    description: fam.describe(value),
    scope: fam.scope,
    stat: fam.stat,
    value,
    cost: Math.round(fam.baseCost * t.costMult),
    tier,
    tierLabel: t.label,
    tierColor: t.color,
  };
}

// Mod ids are self-describing ("swift_boots_t2"), so any mod can be rebuilt
// from just its id without keeping a separate lookup table in sync.
export function getMod(id) {
  const match = /^(.+)_t(\d)$/.exec(id);
  if (!match) return null;
  return buildModCard(match[1], Number(match[2]));
}

export function rollModOffers(rand) {
  return MOD_FAMILY_KEYS.map((key) => buildModCard(key, pickWeightedTier(rand)));
}
