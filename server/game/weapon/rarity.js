// Rarity tiers ordered from highest to lowest — first match wins
const RARITY_TIERS = [
  { id: "legendary", label: "傳說", color: "#f59e0b", minScore: 45 },
  { id: "epic",      label: "史詩", color: "#a855f7", minScore: 35 },
  { id: "rare",      label: "稀有", color: "#3b82f6", minScore: 28 },
  { id: "fine",      label: "優良", color: "#22c55e", minScore: 20 },
  { id: "common",    label: "普通", color: "#9ca3af", minScore: 0  },
];

function calculateRarity(weapon) {
  const totalScore =
    (weapon.atk || 0) +
    (weapon.def || 0) +
    (weapon.agi || 0) +
    (weapon.cri || 0) +
    (weapon.hp  || 0) +
    (weapon.durability || 0);

  for (const tier of RARITY_TIERS) {
    if (totalScore >= tier.minScore) {
      return { id: tier.id, label: tier.label, color: tier.color, totalScore };
    }
  }

  const fallback = RARITY_TIERS[RARITY_TIERS.length - 1];
  return { id: fallback.id, label: fallback.label, color: fallback.color, totalScore };
}

module.exports = { RARITY_TIERS, calculateRarity };
