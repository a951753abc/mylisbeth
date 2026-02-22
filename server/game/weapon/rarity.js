const config = require("../config.js");

// Rarity tiers ordered from highest to lowest — first match wins
const RARITY_TIERS = [
  { id: "legendary", label: "傳說", color: "#f59e0b", minScore: 42 },
  { id: "epic",      label: "史詩", color: "#a855f7", minScore: 32 },
  { id: "rare",      label: "稀有", color: "#3b82f6", minScore: 25 },
  { id: "fine",      label: "優良", color: "#22c55e", minScore: 17 },
  { id: "common",    label: "普通", color: "#9ca3af", minScore: 0  },
];

function calculateRarity(weapon) {
  // cri 越低越好（暴擊門檻），反轉為正向貢獻：14 - cri
  // 使用 maxDurability（不隨戰鬥損耗變動），依權重折算
  const criContribution = Math.max(0, 14 - (weapon.cri || 10));
  const rawDur = weapon.maxDurability || weapon.durability || 0;
  const durWeight = config.RARITY_DURABILITY_WEIGHT ?? 1;
  const durContribution = Math.round(rawDur * durWeight);
  const totalScore =
    (weapon.atk || 0) +
    (weapon.def || 0) +
    (weapon.agi || 0) +
    criContribution +
    (weapon.hp  || 0) +
    durContribution;

  for (const tier of RARITY_TIERS) {
    if (totalScore >= tier.minScore) {
      return { id: tier.id, label: tier.label, color: tier.color, totalScore };
    }
  }

  const fallback = RARITY_TIERS[RARITY_TIERS.length - 1];
  return { id: fallback.id, label: fallback.label, color: fallback.color, totalScore };
}

module.exports = { RARITY_TIERS, calculateRarity };
