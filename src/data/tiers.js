export const TIERS = [
  { tier: 1, label: 'Common', color: '#9c8a63', costMult: 1, valueMult: 1, weight: 0.6 },
  { tier: 2, label: 'Rare', color: '#4fa8e8', costMult: 2.2, valueMult: 1.6, weight: 0.3 },
  { tier: 3, label: 'Epic', color: '#b06fe0', costMult: 4, valueMult: 2.4, weight: 0.1 },
];

export function tierInfo(tier) {
  return TIERS.find((t) => t.tier === tier) || TIERS[0];
}

export function pickWeightedTier(rand) {
  const r = rand();
  let acc = 0;
  for (const t of TIERS) {
    acc += t.weight;
    if (r < acc) return t.tier;
  }
  return TIERS[TIERS.length - 1].tier;
}
