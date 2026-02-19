import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const battleModule = require("./battle.js");

// 輔助函式：固定 Math.random 回傳值
function fixRandom(value) {
  return vi.spyOn(Math, "random").mockReturnValue(value);
}

describe("battle.js", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("pveBattle()", () => {
    const baseWeapon = { hp: 0, atk: 5, def: 2, agi: 3, cri: 8 };
    const npc = { name: "NPC", hp: 50 };
    const npcNames = [{ name: "小明" }];

    it("回傳物件包含 win、dead、log、finalHp 欄位", async () => {
      const result = await battleModule.pveBattle(baseWeapon, npc, npcNames, null);
      expect(result).toHaveProperty("win");
      expect(result).toHaveProperty("dead");
      expect(result).toHaveProperty("log");
      expect(result).toHaveProperty("finalHp");
    });

    it("戰鬥日誌不超過 5 回合（round limit）", async () => {
      const result = await battleModule.pveBattle(baseWeapon, npc, npcNames, null);
      const roundEntries = result.log.filter((e) => e.type === "round");
      expect(roundEntries.length).toBeLessThanOrEqual(5);
    });

    it("win 與 dead 不會同時為 1", async () => {
      const result = await battleModule.pveBattle(baseWeapon, npc, npcNames, null);
      expect(result.win + result.dead).toBeLessThanOrEqual(1);
    });

    it("最終 HP 皆為數字", async () => {
      const result = await battleModule.pveBattle(baseWeapon, npc, npcNames, null);
      expect(typeof result.finalHp.npc).toBe("number");
      expect(typeof result.finalHp.enemy).toBe("number");
    });

    it("log 最後一個 entry 的 type 為 'end'", async () => {
      const result = await battleModule.pveBattle(baseWeapon, npc, npcNames, null);
      const lastEntry = result.log[result.log.length - 1];
      expect(lastEntry.type).toBe("end");
    });
  });

  describe("pvpBattle()", () => {
    const attackerData = { name: "攻擊者" };
    const defenderData = { name: "防禦者" };
    const strongWeapon = { hp: 0, atk: 10, def: 1, agi: 5, cri: 10 };
    const weakWeapon = { hp: 0, atk: 1, def: 0, agi: 0, cri: 12 };

    it("回傳物件包含 winner 與 log", async () => {
      const result = await battleModule.pvpBattle(
        attackerData, strongWeapon,
        defenderData, weakWeapon,
      );
      expect(result).toHaveProperty("winner");
      expect(result).toHaveProperty("log");
    });

    it("winner 為 attackerData 或 defenderData 其中之一", async () => {
      const result = await battleModule.pvpBattle(
        attackerData, strongWeapon,
        defenderData, weakWeapon,
      );
      expect([attackerData, defenderData]).toContain(result.winner);
    });

    it("log 為陣列", async () => {
      const result = await battleModule.pvpBattle(
        attackerData, strongWeapon,
        defenderData, strongWeapon,
      );
      expect(Array.isArray(result.log)).toBe(true);
    });

    it("HP 較高者獲勝（決定性測試）", async () => {
      // 固定 random 使每次傷害計算固定
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const result = await battleModule.pvpBattle(
        attackerData, { hp: 0, atk: 10, def: 5, agi: 5, cri: 10 },
        defenderData, { hp: 0, atk: 1, def: 0, agi: 0, cri: 12 },
      );
      expect(result.winner).toBe(attackerData);
    });
  });
});
