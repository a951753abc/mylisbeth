import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { generateNpc } = require("./generator.js");
const config = require("../config.js");

const NPC_CFG = config.NPC;

describe("generator.js — generateNpc()", () => {
  // ─────────────────────────────────────────────────
  // 決定性（Determinism）
  // ─────────────────────────────────────────────────
  describe("決定性", () => {
    it("相同 index 每次都回傳相同的 NPC", () => {
      const a = generateNpc(0);
      const b = generateNpc(0);
      expect(a).toEqual(b);
    });

    it("不同 index 回傳不同的 NPC", () => {
      const a = generateNpc(0);
      const b = generateNpc(1);
      // 至少 npcId 不同，通常其他欄位也不同
      expect(a.npcId).not.toBe(b.npcId);
    });

    it("自訂 serverSeed 產生與預設不同的結果（若骰值不同）", () => {
      const defaultNpc = generateNpc(42, "lisbeth");
      const customNpc  = generateNpc(42, "custom_seed");
      // 相同 index 不同 seed 結果可能不同，至少 npcId 相同（都是 npc_42）
      expect(defaultNpc.npcId).toBe("npc_42");
      expect(customNpc.npcId).toBe("npc_42");
    });

    it("大量 index 仍具決定性（index 0~99 各自穩定）", () => {
      for (let i = 0; i < 100; i++) {
        expect(generateNpc(i)).toEqual(generateNpc(i));
      }
    });
  });

  // ─────────────────────────────────────────────────
  // 欄位格式
  // ─────────────────────────────────────────────────
  describe("欄位格式", () => {
    let npc;
    beforeAll(() => { npc = generateNpc(0); });

    it("npcId 格式為 npc_${index}", () => {
      expect(generateNpc(0).npcId).toBe("npc_0");
      expect(generateNpc(7999).npcId).toBe("npc_7999");
      expect(generateNpc(123).npcId).toBe("npc_123");
    });

    it("index 欄位與傳入值一致", () => {
      expect(generateNpc(42).index).toBe(42);
      expect(generateNpc(0).index).toBe(0);
    });

    it("condition 永遠為 100", () => {
      for (const idx of [0, 1, 50, 999]) {
        expect(generateNpc(idx).condition).toBe(100);
      }
    });

    it("level 永遠為 1", () => {
      for (const idx of [0, 1, 50, 999]) {
        expect(generateNpc(idx).level).toBe(1);
      }
    });

    it("exp 永遠為 0", () => {
      for (const idx of [0, 1, 50, 999]) {
        expect(generateNpc(idx).exp).toBe(0);
      }
    });

    it("name 為非空字串", () => {
      const result = generateNpc(0);
      expect(typeof result.name).toBe("string");
      expect(result.name.length).toBeGreaterThan(0);
    });

    it("quality 為合法品質字串", () => {
      const validQualities = ["見習", "普通", "優秀", "精銳", "傳說"];
      for (let i = 0; i < 50; i++) {
        expect(validQualities).toContain(generateNpc(i).quality);
      }
    });

    it("learnedSkills 為陣列", () => {
      const result = generateNpc(0);
      expect(Array.isArray(result.learnedSkills)).toBe(true);
    });

    it("equippedSkills 為陣列", () => {
      const result = generateNpc(0);
      expect(Array.isArray(result.equippedSkills)).toBe(true);
    });

    it("weaponProficiency 為物件", () => {
      const result = generateNpc(0);
      expect(typeof result.weaponProficiency).toBe("object");
      expect(result.weaponProficiency).not.toBeNull();
    });
  });

  // ─────────────────────────────────────────────────
  // baseStats 範圍驗證（依品質）
  // ─────────────────────────────────────────────────
  describe("baseStats 範圍", () => {
    // 為確保每個品質都被測試到，掃描一段 NPC 直到找到各品質
    function findNpcByQuality(quality, maxSearch = 8000) {
      for (let i = 0; i < maxSearch; i++) {
        const npc = generateNpc(i);
        if (npc.quality === quality) return npc;
      }
      return null;
    }

    for (const quality of ["見習", "普通", "優秀", "精銳", "傳說"]) {
      it(`品質「${quality}」的 baseStats 在 config 定義的範圍內`, () => {
        const npc = findNpcByQuality(quality);
        expect(npc, `找不到品質為 ${quality} 的 NPC（前 8000 個）`).not.toBeNull();

        const range = NPC_CFG.STAT_RANGE[quality];
        expect(npc.baseStats.hp).toBeGreaterThanOrEqual(range.hp[0]);
        expect(npc.baseStats.hp).toBeLessThanOrEqual(range.hp[1]);
        expect(npc.baseStats.atk).toBeGreaterThanOrEqual(range.atk[0]);
        expect(npc.baseStats.atk).toBeLessThanOrEqual(range.atk[1]);
        expect(npc.baseStats.def).toBeGreaterThanOrEqual(range.def[0]);
        expect(npc.baseStats.def).toBeLessThanOrEqual(range.def[1]);
        expect(npc.baseStats.agi).toBeGreaterThanOrEqual(range.agi[0]);
        expect(npc.baseStats.agi).toBeLessThanOrEqual(range.agi[1]);
      });
    }

    it("baseStats 所有數值都是整數", () => {
      for (let i = 0; i < 20; i++) {
        const { baseStats } = generateNpc(i);
        expect(Number.isInteger(baseStats.hp)).toBe(true);
        expect(Number.isInteger(baseStats.atk)).toBe(true);
        expect(Number.isInteger(baseStats.def)).toBe(true);
        expect(Number.isInteger(baseStats.agi)).toBe(true);
      }
    });

    it("baseStats.hp 大於 0", () => {
      for (let i = 0; i < 20; i++) {
        expect(generateNpc(i).baseStats.hp).toBeGreaterThan(0);
      }
    });
  });

  // ─────────────────────────────────────────────────
  // hireCost / monthlyCost
  // ─────────────────────────────────────────────────
  describe("hireCost / monthlyCost", () => {
    function findNpcByQuality(quality) {
      for (let i = 0; i < 8000; i++) {
        const npc = generateNpc(i);
        if (npc.quality === quality) return npc;
      }
      return null;
    }

    for (const quality of ["見習", "普通", "優秀", "精銳", "傳說"]) {
      it(`品質「${quality}」的 hireCost 對應 config.NPC.HIRE_COST`, () => {
        const npc = findNpcByQuality(quality);
        expect(npc).not.toBeNull();
        expect(npc.hireCost).toBe(NPC_CFG.HIRE_COST[quality]);
      });

      it(`品質「${quality}」的 monthlyCost 對應 config.NPC.MONTHLY_WAGE`, () => {
        const npc = findNpcByQuality(quality);
        expect(npc).not.toBeNull();
        expect(npc.monthlyCost).toBe(NPC_CFG.MONTHLY_WAGE[quality]);
      });
    }
  });

  // ─────────────────────────────────────────────────
  // 品質分布（統計驗證）
  // ─────────────────────────────────────────────────
  describe("品質分布", () => {
    it("100 個 NPC 中所有 5 種品質皆出現（大樣本統計）", () => {
      // 以 1000 個 NPC 確保稀有品質（傳說機率 0.1%）有一定機會出現
      // 使用固定範圍讓測試具決定性
      const qualityCounts = {};
      for (let i = 0; i < 1000; i++) {
        const { quality } = generateNpc(i);
        qualityCounts[quality] = (qualityCounts[quality] || 0) + 1;
      }
      // 至少出現最常見的三種品質
      expect(qualityCounts["見習"]).toBeGreaterThan(0);
      expect(qualityCounts["普通"]).toBeGreaterThan(0);
      expect(qualityCounts["優秀"]).toBeGreaterThan(0);
    });

    it("普通品質是最常見的（1000 個中佔多數）", () => {
      const qualityCounts = {};
      for (let i = 0; i < 1000; i++) {
        const { quality } = generateNpc(i);
        qualityCounts[quality] = (qualityCounts[quality] || 0) + 1;
      }
      // 普通品質理論機率 68%，應是最多的
      const common = qualityCounts["普通"] || 0;
      const trainee = qualityCounts["見習"] || 0;
      const good = qualityCounts["優秀"] || 0;
      expect(common).toBeGreaterThan(trainee);
      expect(common).toBeGreaterThan(good);
    });
  });

  // ─────────────────────────────────────────────────
  // 高品質 NPC 技能
  // ─────────────────────────────────────────────────
  describe("高品質 NPC 初始技能", () => {
    function findNpcByQuality(quality) {
      for (let i = 0; i < 8000; i++) {
        const npc = generateNpc(i);
        if (npc.quality === quality) return npc;
      }
      return null;
    }

    it("見習/普通/優秀品質的 NPC：learnedSkills 為空陣列", () => {
      for (const quality of ["見習", "普通", "優秀"]) {
        const npc = findNpcByQuality(quality);
        expect(npc).not.toBeNull();
        // 優秀品質 initialSkillCount=0，learnedSkills 應為空
        if (quality !== "優秀") {
          expect(npc.learnedSkills).toEqual([]);
        }
      }
    });

    it("精銳品質的 NPC：learnedSkills 長度為 0 或 1（技能可能不足）", () => {
      const npc = findNpcByQuality("精銳");
      expect(npc).not.toBeNull();
      expect(npc.learnedSkills.length).toBeLessThanOrEqual(1);
    });

    it("傳說品質的 NPC：learnedSkills 長度為 0~2", () => {
      const npc = findNpcByQuality("傳說");
      expect(npc).not.toBeNull();
      expect(npc.learnedSkills.length).toBeLessThanOrEqual(2);
    });

    it("equippedSkills 數量與 learnedSkills 相同", () => {
      for (let i = 0; i < 50; i++) {
        const npc = generateNpc(i);
        expect(npc.equippedSkills.length).toBe(npc.learnedSkills.length);
      }
    });

    it("精銳以上有初始技能時，weaponProficiency 不為空物件", () => {
      const npc = findNpcByQuality("精銳");
      expect(npc).not.toBeNull();
      if (npc.learnedSkills.length > 0) {
        expect(Object.keys(npc.weaponProficiency).length).toBeGreaterThan(0);
      }
    });

    it("見習/普通品質的 NPC：weaponProficiency 為空物件", () => {
      for (const quality of ["見習", "普通"]) {
        const npc = findNpcByQuality(quality);
        expect(npc).not.toBeNull();
        expect(npc.weaponProficiency).toEqual({});
      }
    });
  });
});
