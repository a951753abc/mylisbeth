import { describe, it, expect } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { RARITY_TIERS, calculateRarity } = require("./rarity.js");

describe("rarity.js", () => {
  describe("RARITY_TIERS", () => {
    it("共有 5 個稀有度階層", () => {
      expect(RARITY_TIERS).toHaveLength(5);
    });

    it("包含 legendary、epic、rare、fine、common", () => {
      const ids = RARITY_TIERS.map((t) => t.id);
      expect(ids).toContain("legendary");
      expect(ids).toContain("epic");
      expect(ids).toContain("rare");
      expect(ids).toContain("fine");
      expect(ids).toContain("common");
    });

    it("minScore 由高到低排列（第一個最高）", () => {
      for (let i = 0; i < RARITY_TIERS.length - 1; i++) {
        expect(RARITY_TIERS[i].minScore).toBeGreaterThan(RARITY_TIERS[i + 1].minScore);
      }
    });
  });

  describe("calculateRarity(weapon)", () => {
    it("分數 0 → common", () => {
      const result = calculateRarity({});
      expect(result.id).toBe("common");
    });

    it("分數 20 → fine", () => {
      const result = calculateRarity({ atk: 20 });
      expect(result.id).toBe("fine");
    });

    it("分數 28 → rare", () => {
      const result = calculateRarity({ atk: 28 });
      expect(result.id).toBe("rare");
    });

    it("分數 35 → epic", () => {
      const result = calculateRarity({ atk: 35 });
      expect(result.id).toBe("epic");
    });

    it("分數 45 → legendary", () => {
      const result = calculateRarity({ atk: 45 });
      expect(result.id).toBe("legendary");
    });

    it("回傳物件包含 id、label、color、totalScore", () => {
      const result = calculateRarity({ atk: 10, def: 5 });
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("label");
      expect(result).toHaveProperty("color");
      expect(result).toHaveProperty("totalScore", 15);
    });

    it("缺少屬性時不拋出錯誤（容錯）", () => {
      expect(() => calculateRarity({})).not.toThrow();
      expect(() => calculateRarity({ atk: 5 })).not.toThrow();
    });

    it("totalScore 為所有屬性之和", () => {
      const weapon = { hp: 2, atk: 5, def: 3, agi: 4, cri: 6, durability: 10 };
      const result = calculateRarity(weapon);
      expect(result.totalScore).toBe(30);
    });

    it("分數邊界 44 → epic（未達 legendary）", () => {
      const result = calculateRarity({ atk: 44 });
      expect(result.id).toBe("epic");
    });

    it("分數邊界 45 → legendary", () => {
      const result = calculateRarity({ atk: 45 });
      expect(result.id).toBe("legendary");
    });
  });
});
