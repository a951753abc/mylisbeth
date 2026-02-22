import { describe, it, expect, vi, afterEach } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { getEffectiveStats, getCombinedBattleStats, getExpToNextLevel } = require("./npcStats.js");

// From config.js:
//   NPC.LEVEL_STAT_GROWTH = 0.08
//   NPC.EXP_BASE          = 100
//   NPC.EXP_MULTIPLIER    = 1.5

afterEach(() => {
  vi.restoreAllMocks();
});

// ──────────────────────────────────────────────────────────────
// getEffectiveStats — condition brackets and level scaling
// ──────────────────────────────────────────────────────────────
describe("getEffectiveStats", () => {
  const baseNpc = {
    baseStats: { hp: 100, atk: 10, def: 4, agi: 6 },
    condition: 100,
    level: 1,
  };

  it("returns full stats (mult=1.0) when condition >= 70", () => {
    const npc = { ...baseNpc, condition: 70 };
    const result = getEffectiveStats(npc);

    // levelMult = 1 + (1-1)*0.08 = 1.0
    expect(result).not.toBeNull();
    expect(result.hp).toBe(100);    // floor(100 * 1.0 * 1.0)
    expect(result.atk).toBe(10);   // max(1, floor(10 * 1.0 * 1.0))
    expect(result.def).toBe(4);    // floor(4 * 1.0 * 1.0)
    expect(result.agi).toBe(6);    // max(1, floor(6 * 1.0 * 1.0))
  });

  it("applies 1.0 multiplier for condition = 100", () => {
    const npc = { ...baseNpc, condition: 100 };
    const result = getEffectiveStats(npc);

    expect(result).not.toBeNull();
    expect(result.hp).toBe(100);
    expect(result.atk).toBe(10);
  });

  it("applies 0.7 multiplier for condition in range [40, 69]", () => {
    const npc = { ...baseNpc, condition: 40 };
    const result = getEffectiveStats(npc);

    expect(result).not.toBeNull();
    expect(result.hp).toBe(70);    // floor(100 * 0.7)
    expect(result.atk).toBe(7);   // max(1, floor(10 * 0.7))
    expect(result.def).toBe(2);   // floor(4 * 0.7) = floor(2.8) = 2
    expect(result.agi).toBe(4);   // max(1, floor(6 * 0.7)) = floor(4.2) = 4
  });

  it("applies 0.7 multiplier for condition = 69 (upper boundary below 70)", () => {
    const npc = { ...baseNpc, condition: 69 };
    const result = getEffectiveStats(npc);

    expect(result).not.toBeNull();
    expect(result.hp).toBe(70);
  });

  it("applies 0.4 multiplier for condition in range [10, 39]", () => {
    const npc = { ...baseNpc, condition: 10 };
    const result = getEffectiveStats(npc);

    expect(result).not.toBeNull();
    expect(result.hp).toBe(40);    // floor(100 * 0.4)
    expect(result.atk).toBe(4);   // max(1, floor(10 * 0.4))
    expect(result.def).toBe(1);   // floor(4 * 0.4) = floor(1.6) = 1
    expect(result.agi).toBe(2);   // max(1, floor(6 * 0.4)) = floor(2.4) = 2
  });

  it("applies 0.4 multiplier for condition = 39 (upper boundary below 40)", () => {
    const npc = { ...baseNpc, condition: 39 };
    const result = getEffectiveStats(npc);

    expect(result).not.toBeNull();
    expect(result.hp).toBe(40);
  });

  it("returns null when condition < 10", () => {
    const npc = { ...baseNpc, condition: 9 };
    expect(getEffectiveStats(npc)).toBeNull();
  });

  it("returns null when condition = 0", () => {
    const npc = { ...baseNpc, condition: 0 };
    expect(getEffectiveStats(npc)).toBeNull();
  });

  it("returns null when condition is negative", () => {
    const npc = { ...baseNpc, condition: -1 };
    expect(getEffectiveStats(npc)).toBeNull();
  });

  it("defaults condition to 100 when undefined", () => {
    const npc = { baseStats: { hp: 100, atk: 10, def: 4, agi: 6 }, level: 1 };
    // condition ?? 100 → 100 → mult = 1.0
    const result = getEffectiveStats(npc);

    expect(result).not.toBeNull();
    expect(result.hp).toBe(100);
  });

  it("applies level scaling: level 2 adds 8% growth", () => {
    const npc = { ...baseNpc, condition: 100, level: 2 };
    // levelMult = 1 + (2-1)*0.08 = 1.08
    const result = getEffectiveStats(npc);

    expect(result).not.toBeNull();
    expect(result.hp).toBe(Math.floor(100 * 1.0 * 1.08));   // 108
    expect(result.atk).toBe(Math.max(1, Math.floor(10 * 1.0 * 1.08))); // 10
    expect(result.def).toBe(Math.floor(4 * 1.0 * 1.08));    // 4
    expect(result.agi).toBe(Math.max(1, Math.floor(6 * 1.0 * 1.08))); // 6
  });

  it("applies level scaling: level 5 adds 32% growth", () => {
    const npc = { ...baseNpc, condition: 100, level: 5 };
    // levelMult = 1 + (5-1)*0.08 = 1.32
    const result = getEffectiveStats(npc);

    expect(result.hp).toBe(Math.floor(100 * 1.32));
    expect(result.atk).toBe(Math.max(1, Math.floor(10 * 1.32)));
  });

  it("level defaults to 1 when undefined (no extra scaling)", () => {
    const npc = { baseStats: { hp: 100, atk: 10, def: 4, agi: 6 }, condition: 100 };
    const result = getEffectiveStats(npc);

    // levelMult = 1 + (1-1)*0.08 = 1.0
    expect(result.hp).toBe(100);
  });

  it("enforces minimum 1 on atk and agi even with low baseStats", () => {
    const npc = {
      baseStats: { hp: 10, atk: 1, def: 0, agi: 1 },
      condition: 10, // mult = 0.4
      level: 1,
    };
    const result = getEffectiveStats(npc);

    // atk: max(1, floor(1 * 0.4)) = max(1, 0) = 1
    // agi: max(1, floor(1 * 0.4)) = max(1, 0) = 1
    expect(result.atk).toBeGreaterThanOrEqual(1);
    expect(result.agi).toBeGreaterThanOrEqual(1);
  });
});

// ──────────────────────────────────────────────────────────────
// getCombinedBattleStats — NPC effective + weapon merge
// ──────────────────────────────────────────────────────────────
describe("getCombinedBattleStats", () => {
  const npcEffective = { hp: 100, atk: 10, def: 8, agi: 6 };
  const weapon = { hp: 20, atk: 8, def: 4, agi: 5, cri: 7, innateEffects: [] };

  it("adds hp: npc.hp + weapon.hp", () => {
    const result = getCombinedBattleStats(npcEffective, weapon);
    expect(result.hp).toBe(120); // 100 + 20
  });

  it("calculates atk: weapon.atk + floor(npc.atk * 0.5)", () => {
    const result = getCombinedBattleStats(npcEffective, weapon);
    // 8 + floor(10 * 0.5) = 8 + 5 = 13
    expect(result.atk).toBe(13);
  });

  it("calculates def: weapon.def + floor(npc.def * 0.5)", () => {
    const result = getCombinedBattleStats(npcEffective, weapon);
    // 4 + floor(8 * 0.5) = 4 + 4 = 8
    expect(result.def).toBe(8);
  });

  it("calculates agi: max(weapon.agi, npc.agi)", () => {
    const result = getCombinedBattleStats(npcEffective, weapon);
    // max(5, 6) = 6
    expect(result.agi).toBe(6);
  });

  it("uses weapon.agi when it exceeds npc.agi", () => {
    const result = getCombinedBattleStats(npcEffective, { ...weapon, agi: 20 });
    expect(result.agi).toBe(20);
  });

  it("takes cri from weapon", () => {
    const result = getCombinedBattleStats(npcEffective, weapon);
    expect(result.cri).toBe(7);
  });

  it("defaults cri to 10 when weapon has no cri", () => {
    const result = getCombinedBattleStats(npcEffective, { ...weapon, cri: undefined });
    expect(result.cri).toBe(10);
  });

  it("handles weapon with all stats missing (defaults to 0)", () => {
    const emptyWeapon = {};
    const result = getCombinedBattleStats(npcEffective, emptyWeapon);

    expect(result.hp).toBe(100);  // npc.hp + 0
    expect(result.atk).toBe(5);  // 0 + floor(10*0.5)
    expect(result.def).toBe(4);  // 0 + floor(8*0.5)
    expect(result.agi).toBe(6);  // max(0, 6)
    expect(result.cri).toBe(10); // default
    expect(result.innateEffects).toEqual([]);
  });

  it("exposes weapon innateEffects in result", () => {
    const effects = [{ effect: { type: "lifesteal", value: 0.2 } }];
    const weaponWithEffects = { ...weapon, innateEffects: effects };

    const result = getCombinedBattleStats(npcEffective, weaponWithEffects);

    expect(result.innateEffects).toEqual(effects);
  });

  it("returns empty innateEffects when weapon has none", () => {
    const result = getCombinedBattleStats(npcEffective, { ...weapon, innateEffects: undefined });
    expect(result.innateEffects).toEqual([]);
  });

  it("floors the fractional npc atk contribution", () => {
    // npc.atk = 7 → floor(7 * 0.5) = floor(3.5) = 3
    const result = getCombinedBattleStats({ hp: 50, atk: 7, def: 3, agi: 4 }, weapon);
    expect(result.atk).toBe(8 + 3); // 11
  });

  it("floors the fractional npc def contribution", () => {
    // npc.def = 3 → floor(3 * 0.5) = floor(1.5) = 1
    const result = getCombinedBattleStats({ hp: 50, atk: 10, def: 3, agi: 4 }, weapon);
    expect(result.def).toBe(4 + 1); // 5
  });
});

// ──────────────────────────────────────────────────────────────
// getExpToNextLevel — exponential EXP curve
// ──────────────────────────────────────────────────────────────
describe("getExpToNextLevel", () => {
  // Formula: floor(EXP_BASE * EXP_MULTIPLIER^(level-1))
  // EXP_BASE=100, EXP_MULTIPLIER=1.5

  it("returns 100 for level 1 (1.5^0 = 1)", () => {
    expect(getExpToNextLevel(1)).toBe(100);
  });

  it("returns 150 for level 2 (floor(100 * 1.5^1))", () => {
    expect(getExpToNextLevel(2)).toBe(150);
  });

  it("returns 225 for level 3 (floor(100 * 1.5^2) = floor(225))", () => {
    expect(getExpToNextLevel(3)).toBe(225);
  });

  it("returns 337 for level 4 (floor(100 * 1.5^3) = floor(337.5))", () => {
    expect(getExpToNextLevel(4)).toBe(337);
  });

  it("returns 506 for level 5 (floor(100 * 1.5^4) = floor(506.25))", () => {
    expect(getExpToNextLevel(5)).toBe(506);
  });

  it("increases with each level (monotonically growing)", () => {
    const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const expValues = levels.map(getExpToNextLevel);

    for (let i = 1; i < expValues.length; i++) {
      expect(expValues[i]).toBeGreaterThan(expValues[i - 1]);
    }
  });

  it("applies floor so fractional values are truncated", () => {
    // level 4: 100 * 1.5^3 = 337.5 → floor = 337
    const result = getExpToNextLevel(4);
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBe(337);
  });
});
