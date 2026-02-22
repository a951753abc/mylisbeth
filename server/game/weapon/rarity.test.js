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
    // 注意：cri 未指定時預設 10，criContribution = 14 - 10 = 4
    // 使用 cri:14 可歸零 criContribution，讓 atk 直接等於 totalScore

    it("所有屬性為空 → common（criContribution = 4）", () => {
      const result = calculateRarity({});
      expect(result.id).toBe("common");
      expect(result.totalScore).toBe(4);
    });

    it("分數邊界 17 → fine", () => {
      const result = calculateRarity({ atk: 17, cri: 14 });
      expect(result.id).toBe("fine");
      expect(result.totalScore).toBe(17);
    });

    it("分數邊界 16 → common（未達 fine）", () => {
      const result = calculateRarity({ atk: 16, cri: 14 });
      expect(result.id).toBe("common");
    });

    it("分數邊界 25 → rare", () => {
      const result = calculateRarity({ atk: 25, cri: 14 });
      expect(result.id).toBe("rare");
      expect(result.totalScore).toBe(25);
    });

    it("分數邊界 24 → fine（未達 rare）", () => {
      const result = calculateRarity({ atk: 24, cri: 14 });
      expect(result.id).toBe("fine");
    });

    it("分數邊界 32 → epic", () => {
      const result = calculateRarity({ atk: 32, cri: 14 });
      expect(result.id).toBe("epic");
      expect(result.totalScore).toBe(32);
    });

    it("分數邊界 31 → rare（未達 epic）", () => {
      const result = calculateRarity({ atk: 31, cri: 14 });
      expect(result.id).toBe("rare");
    });

    it("分數邊界 42 → legendary", () => {
      const result = calculateRarity({ atk: 42, cri: 14 });
      expect(result.id).toBe("legendary");
      expect(result.totalScore).toBe(42);
    });

    it("分數邊界 41 → epic（未達 legendary）", () => {
      const result = calculateRarity({ atk: 41, cri: 14 });
      expect(result.id).toBe("epic");
    });

    it("回傳物件包含 id、label、color、totalScore", () => {
      const result = calculateRarity({ atk: 10, def: 5, cri: 14 });
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("label");
      expect(result).toHaveProperty("color");
      expect(result).toHaveProperty("totalScore", 15);
    });

    it("totalScore 正確計算所有屬性（含 cri 反轉 + durability 權重）", () => {
      // atk:5 + def:3 + agi:4 + criContribution:max(0,14-6)=8 + hp:2 + dur:round(10*0.5)=5
      const weapon = { hp: 2, atk: 5, def: 3, agi: 4, cri: 6, durability: 10 };
      const result = calculateRarity(weapon);
      expect(result.totalScore).toBe(27);
    });

    it("maxDurability 優先於 durability", () => {
      const weapon = { atk: 5, durability: 2, maxDurability: 10, cri: 14 };
      const result = calculateRarity(weapon);
      // atk:5 + dur:round(10*0.5)=5 = 10
      expect(result.totalScore).toBe(10);
    });

    it("缺少屬性時不拋出錯誤（容錯）", () => {
      expect(() => calculateRarity({})).not.toThrow();
      expect(() => calculateRarity({ atk: 5 })).not.toThrow();
    });

    it("cri 非常低時 criContribution 較大", () => {
      const result = calculateRarity({ cri: 2 });
      // criContribution = max(0, 14-2) = 12
      expect(result.totalScore).toBe(12);
    });

    it("cri 高於 14 時 criContribution 為 0", () => {
      const result = calculateRarity({ cri: 20 });
      // criContribution = max(0, 14-20) = 0
      expect(result.totalScore).toBe(0);
    });
  });
});
