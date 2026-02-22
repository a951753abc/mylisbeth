import { describe, it, expect, vi, afterEach } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { getEneFromList, getEneFromFloor } = require("./enemyGenerator.js");

// Math.floor(random * 100) + 1 的對應關係：
//   random=0.0  → roll=1  (Easy: ≤10)
//   random=0.09 → roll=10 (Easy: ≤10)
//   random=0.10 → roll=11 (Normal: 11-50)
//   random=0.49 → roll=50 (Normal: 11-50)
//   random=0.50 → roll=51 (Hard: 51-90)
//   random=0.89 → roll=90 (Hard: 51-90)
//   random=0.90 → roll=91 (Hell: 91-99)
//   random=0.98 → roll=99 (Hell: 91-99)
//   random=0.99 → roll=100 (Yuki: >99)

const mockList = [
  { category: "[Hell]",   hp: 100, atk: 10, def: 5, agi: 4, cri: 8 },
  { category: "[Hard]",   hp: 60,  atk: 6,  def: 3, agi: 3, cri: 9 },
  { category: "[Normal]", hp: 40,  atk: 4,  def: 2, agi: 2, cri: 10 },
  { category: "[Easy]",   hp: 20,  atk: 2,  def: 1, agi: 1, cri: 11 },
];

const mockFloorEnemies = [
  { name: "地獄魔人A", category: "[Hell]",   hp: 100, atk: 10, def: 5, agi: 4, cri: 8 },
  { name: "地獄魔人B", category: "[Hell]",   hp: 110, atk: 11, def: 6, agi: 5, cri: 7 },
  { name: "難敵A",     category: "[Hard]",   hp: 60,  atk: 6,  def: 3, agi: 3, cri: 9 },
  { name: "普通敵A",   category: "[Normal]", hp: 40,  atk: 4,  def: 2, agi: 2, cri: 10 },
  { name: "簡單敵A",   category: "[Easy]",   hp: 20,  atk: 2,  def: 1, agi: 1, cri: 11 },
];

describe("enemyGenerator.js", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────
  // getEneFromList
  // ─────────────────────────────────────────────────
  describe("getEneFromList()", () => {
    it("roll ≤10（Easy）：回傳 enemyList[3]（Easy 敵人）", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.0); // roll=1
      const result = getEneFromList(mockList);
      expect(result.category).toBe("[Easy]");
      expect(result.hp).toBe(20);
    });

    it("roll=10（Easy 邊界）：仍回傳 Easy 敵人", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.09); // roll=10
      const result = getEneFromList(mockList);
      expect(result.category).toBe("[Easy]");
    });

    it("roll=11（Normal 下界）：回傳 enemyList[2]（Normal 敵人）", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.10); // roll=11
      const result = getEneFromList(mockList);
      expect(result.category).toBe("[Normal]");
      expect(result.hp).toBe(40);
    });

    it("roll=50（Normal 上界）：仍回傳 Normal 敵人", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.49); // roll=50
      const result = getEneFromList(mockList);
      expect(result.category).toBe("[Normal]");
    });

    it("roll=51（Hard 下界）：回傳 enemyList[1]（Hard 敵人）", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.50); // roll=51
      const result = getEneFromList(mockList);
      expect(result.category).toBe("[Hard]");
      expect(result.hp).toBe(60);
    });

    it("roll=90（Hard 上界）：仍回傳 Hard 敵人", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.89); // roll=90
      const result = getEneFromList(mockList);
      expect(result.category).toBe("[Hard]");
    });

    it("roll=91（Hell 下界）：回傳 enemyList[0]（Hell 敵人）", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.90); // roll=91
      const result = getEneFromList(mockList);
      expect(result.category).toBe("[Hell]");
      expect(result.hp).toBe(100);
    });

    it("roll=99（Hell 上界）：仍回傳 Hell 敵人", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.98); // roll=99
      const result = getEneFromList(mockList);
      expect(result.category).toBe("[Hell]");
    });

    it("roll=100（Yuki 唯一觸發點）：回傳優樹（[優樹]）", () => {
      // 第一次 random 用於 enemyRoll（0.99 → roll=100 → Yuki）
      // 後續 random 用於 d66()*d66() 及其他骰值，給予合理的值
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.99) // enemyRoll → 100（Yuki）
        .mockReturnValue(0.5);    // 後續 d6/d66 骰值

      const result = getEneFromList(mockList);
      expect(result.category).toBe("[優樹]");
      expect(typeof result.hp).toBe("number");
      expect(typeof result.atk).toBe("number");
      expect(typeof result.def).toBe("number");
      expect(typeof result.agi).toBe("number");
      expect(typeof result.cri).toBe("number");
    });

    it("Yuki 的 HP 為正整數", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.99) // Yuki
        .mockReturnValue(0.5);
      const result = getEneFromList(mockList);
      expect(result.hp).toBeGreaterThan(0);
      expect(Number.isInteger(result.hp)).toBe(true);
    });

    it("回傳值為展開副本，修改不影響原陣列", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.50); // Hard
      const result = getEneFromList(mockList);
      result.hp = 9999;
      expect(mockList[1].hp).toBe(60); // 原始資料不受影響
    });

    it("Hell 敵人的回傳值不是原始參考（spread copy）", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.90); // Hell
      const result = getEneFromList(mockList);
      expect(result).not.toBe(mockList[0]);
    });

    it("Normal 敵人的回傳值與原始物件等值但非同一參考", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.10); // Normal
      const result = getEneFromList(mockList);
      expect(result).not.toBe(mockList[2]);
      expect(result.hp).toBe(mockList[2].hp);
    });
  });

  // ─────────────────────────────────────────────────
  // getEneFromFloor
  // ─────────────────────────────────────────────────
  describe("getEneFromFloor()", () => {
    it("roll ≤10（Easy）：回傳 category=[Easy] 的敵人", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.0)  // enemyRoll → roll=1（Easy）
        .mockReturnValue(0.0);     // 選擇 categoryEnemies 中的第一個
      const result = getEneFromFloor(mockFloorEnemies);
      expect(result.category).toBe("[Easy]");
    });

    it("roll=51（Hard 下界）：回傳 category=[Hard] 的敵人", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.50) // enemyRoll → roll=51（Hard）
        .mockReturnValue(0.0);
      const result = getEneFromFloor(mockFloorEnemies);
      expect(result.category).toBe("[Hard]");
    });

    it("roll=91（Hell 下界）：回傳 category=[Hell] 的敵人", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.90) // enemyRoll → roll=91（Hell）
        .mockReturnValue(0.0);
      const result = getEneFromFloor(mockFloorEnemies);
      expect(result.category).toBe("[Hell]");
    });

    it("roll=100（Yuki）有 Hell 敵人時：HP = base.hp * 2", () => {
      // random 序列：
      //   [0] = 0.99 → enemyRoll=100（Yuki）
      //   [1] = 0.0  → 選取 hellEnemies[0]（hp=100）
      //   [2] = 0.5  → d6() 給 atk 加成
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.99) // Yuki
        .mockReturnValueOnce(0.0)  // 選 hellEnemies[0]
        .mockReturnValue(0.5);     // d6 骰值
      const result = getEneFromFloor(mockFloorEnemies);
      expect(result.category).toBe("[優樹]");
      // hellEnemies[0].hp = 100，所以 Yuki.hp = 200
      expect(result.hp).toBe(200);
    });

    it("roll=100（Yuki）有 Hell 敵人時：cri 不低於 6", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.99)
        .mockReturnValueOnce(0.0)
        .mockReturnValue(0.0);
      const result = getEneFromFloor(mockFloorEnemies);
      expect(result.cri).toBeGreaterThanOrEqual(6);
    });

    it("roll=100（Yuki）無 Hell 敵人時：使用骰值生成", () => {
      const noHellEnemies = mockFloorEnemies.filter((e) => e.category !== "[Hell]");
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.99) // Yuki
        .mockReturnValue(0.5);     // d66/d6 骰值
      const result = getEneFromFloor(noHellEnemies);
      expect(result.category).toBe("[優樹]");
      expect(typeof result.hp).toBe("number");
      expect(result.hp).toBeGreaterThan(0);
    });

    it("回傳值為展開副本，不影響原始陣列", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.50) // Hard
        .mockReturnValue(0.0);
      const result = getEneFromFloor(mockFloorEnemies);
      result.hp = 9999;
      expect(mockFloorEnemies.find((e) => e.category === "[Hard]").hp).toBe(60);
    });

    it("當指定 category 有多筆時，結果仍為合法的該 category 敵人", () => {
      // Hell 有 2 筆（地獄魔人A, B），任選一個都應是 [Hell]
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.90) // Hell
        .mockReturnValue(0.5);     // 選 hellEnemies[?]
      const result = getEneFromFloor(mockFloorEnemies);
      expect(result.category).toBe("[Hell]");
    });

    it("category 不存在時 fallback 回傳 floorEnemies 中的任一敵人", () => {
      // 建立無 Normal 敵人的清單
      const noNormalEnemies = mockFloorEnemies.filter((e) => e.category !== "[Normal]");
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.10) // Normal roll=11
        .mockReturnValue(0.0);     // fallback 選第一個
      const result = getEneFromFloor(noNormalEnemies);
      // fallback 從整個 floorEnemies 隨機選，任何 category 都合法
      const validCategories = noNormalEnemies.map((e) => e.category);
      expect(validCategories).toContain(result.category);
    });

    it("Normal roll 11 時，Normal category 存在則優先選 Normal", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.10) // roll=11（Normal）
        .mockReturnValue(0.0);
      const result = getEneFromFloor(mockFloorEnemies);
      expect(result.category).toBe("[Normal]");
    });
  });
});
