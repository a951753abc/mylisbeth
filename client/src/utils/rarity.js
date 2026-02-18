export const RARITY_CONFIG = {
  common: {
    label: "普通",
    color: "#9ca3af",
    glowColor: "rgba(156,163,175,0.4)",
    hammerHits: 2,
    particles: 5,
    extraDelay: 0,
  },
  fine: {
    label: "優良",
    color: "#22c55e",
    glowColor: "rgba(34,197,94,0.4)",
    hammerHits: 3,
    particles: 10,
    extraDelay: 100,
  },
  rare: {
    label: "稀有",
    color: "#3b82f6",
    glowColor: "rgba(59,130,246,0.4)",
    hammerHits: 4,
    particles: 20,
    extraDelay: 200,
  },
  epic: {
    label: "史詩",
    color: "#a855f7",
    glowColor: "rgba(168,85,247,0.4)",
    hammerHits: 4,
    particles: 40,
    extraDelay: 300,
  },
  legendary: {
    label: "傳說",
    color: "#f59e0b",
    glowColor: "rgba(245,158,11,0.4)",
    hammerHits: 5,
    particles: 80,
    extraDelay: 500,
  },
};

export function getRarityConfig(rarityId) {
  return RARITY_CONFIG[rarityId] || RARITY_CONFIG.common;
}
