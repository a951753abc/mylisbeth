import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// vi.mock 會被 Vitest 提升（hoisted），必須在任何 import 之前生效
vi.mock("../../db.js", () => ({
  findOne: vi.fn(),
  update: vi.fn(),
  find: vi.fn(),
  upsert: vi.fn(),
  findOneAndUpdate: vi.fn(),
  atomicIncItem: vi.fn(),
  saveItemToUser: vi.fn(),
}));

let getAllDefinitions, checkAndAward;
let db;

beforeAll(async () => {
  const mod = await import("./achievement.js");
  getAllDefinitions = mod.getAllDefinitions;
  checkAndAward = mod.checkAndAward;
  db = await import("../../db.js");
});

describe("achievement.js — predicates（純函式）", () => {
  let defs;

  beforeEach(() => {
    defs = getAllDefinitions();
    vi.clearAllMocks();
  });

  it("成就定義數量 >= 15", () => {
    expect(defs.length).toBeGreaterThanOrEqual(15);
  });

  it("每個成就都有 id、name、nameCn、check 函式", () => {
    for (const ach of defs) {
      expect(ach).toHaveProperty("id");
      expect(ach).toHaveProperty("name");
      expect(ach).toHaveProperty("nameCn");
      expect(typeof ach.check).toBe("function");
    }
  });

  describe("first_forge", () => {
    const def = () => defs.find((a) => a.id === "first_forge");
    it("totalForges >= 1 → true", () => {
      expect(def().check({ stats: { totalForges: 1 } })).toBe(true);
    });
    it("totalForges = 0 → false", () => {
      expect(def().check({ stats: { totalForges: 0 } })).toBe(false);
    });
    it("缺少 stats → false（不拋出）", () => {
      expect(() => def().check({})).not.toThrow();
      expect(def().check({})).toBe(false);
    });
  });

  describe("forge_10", () => {
    const def = () => defs.find((a) => a.id === "forge_10");
    it("totalForges >= 10 → true", () => {
      expect(def().check({ stats: { totalForges: 10 } })).toBe(true);
    });
    it("totalForges = 9 → false", () => {
      expect(def().check({ stats: { totalForges: 9 } })).toBe(false);
    });
  });

  describe("first_mine", () => {
    const def = () => defs.find((a) => a.id === "first_mine");
    it("totalMines >= 1 → true", () => {
      expect(def().check({ stats: { totalMines: 1 } })).toBe(true);
    });
    it("totalMines = 0 → false", () => {
      expect(def().check({ stats: { totalMines: 0 } })).toBe(false);
    });
  });

  describe("first_boss", () => {
    const def = () => defs.find((a) => a.id === "first_boss");
    it("totalBossAttacks >= 1 → true", () => {
      expect(def().check({ stats: { totalBossAttacks: 1 } })).toBe(true);
    });
    it("totalBossAttacks = 0 → false", () => {
      expect(def().check({ stats: { totalBossAttacks: 0 } })).toBe(false);
    });
  });

  describe("floor_5", () => {
    const def = () => defs.find((a) => a.id === "floor_5");
    it("currentFloor >= 5 → true", () => {
      expect(def().check({ currentFloor: 5 })).toBe(true);
    });
    it("currentFloor = 4 → false", () => {
      expect(def().check({ currentFloor: 4 })).toBe(false);
    });
    it("缺少 currentFloor → false", () => {
      expect(def().check({})).toBe(false);
    });
  });

  describe("floor_10", () => {
    const def = () => defs.find((a) => a.id === "floor_10");
    it("currentFloor >= 10 → true", () => {
      expect(def().check({ currentFloor: 10 })).toBe(true);
    });
    it("currentFloor = 9 → false", () => {
      expect(def().check({ currentFloor: 9 })).toBe(false);
    });
  });

  describe("pvp_first", () => {
    const def = () => defs.find((a) => a.id === "pvp_first");
    it("totalPvpWins >= 1 → true", () => {
      expect(def().check({ stats: { totalPvpWins: 1 } })).toBe(true);
    });
    it("totalPvpWins = 0 → false", () => {
      expect(def().check({ stats: { totalPvpWins: 0 } })).toBe(false);
    });
  });

  describe("pvp_10", () => {
    const def = () => defs.find((a) => a.id === "pvp_10");
    it("totalPvpWins >= 10 → true", () => {
      expect(def().check({ stats: { totalPvpWins: 10 } })).toBe(true);
    });
    it("totalPvpWins = 9 → false", () => {
      expect(def().check({ stats: { totalPvpWins: 9 } })).toBe(false);
    });
  });

  describe("yuki_defeat", () => {
    const def = () => defs.find((a) => a.id === "yuki_defeat");
    it("yukiDefeats >= 1 → true", () => {
      expect(def().check({ stats: { yukiDefeats: 1 } })).toBe(true);
    });
    it("yukiDefeats = 0 → false", () => {
      expect(def().check({ stats: { yukiDefeats: 0 } })).toBe(false);
    });
  });

  describe("weapon_break", () => {
    const def = () => defs.find((a) => a.id === "weapon_break");
    it("weaponsBroken >= 1 → true", () => {
      expect(def().check({ stats: { weaponsBroken: 1 } })).toBe(true);
    });
    it("weaponsBroken = 0 → false", () => {
      expect(def().check({ stats: { weaponsBroken: 0 } })).toBe(false);
    });
  });

  describe("login_7", () => {
    const def = () => defs.find((a) => a.id === "login_7");
    it("dailyLoginStreak >= 7 → true", () => {
      expect(def().check({ dailyLoginStreak: 7 })).toBe(true);
    });
    it("dailyLoginStreak = 6 → false", () => {
      expect(def().check({ dailyLoginStreak: 6 })).toBe(false);
    });
  });

  describe("boss_mvp", () => {
    const def = () => defs.find((a) => a.id === "boss_mvp");
    it("mvpCount >= 1 → true", () => {
      expect(def().check({ bossContribution: { mvpCount: 1 } })).toBe(true);
    });
    it("mvpCount = 0 → false", () => {
      expect(def().check({ bossContribution: { mvpCount: 0 } })).toBe(false);
    });
    it("缺少 bossContribution → false", () => {
      expect(def().check({})).toBe(false);
    });
  });

  describe("total_adv_50", () => {
    const def = () => defs.find((a) => a.id === "total_adv_50");
    it("totalAdventures >= 50 → true", () => {
      expect(def().check({ stats: { totalAdventures: 50 } })).toBe(true);
    });
    it("totalAdventures = 49 → false", () => {
      expect(def().check({ stats: { totalAdventures: 49 } })).toBe(false);
    });
  });

  describe("col_1000", () => {
    const def = () => defs.find((a) => a.id === "col_1000");
    it("totalColEarned >= 1000 → true", () => {
      expect(def().check({ stats: { totalColEarned: 1000 } })).toBe(true);
    });
    it("totalColEarned = 999 → false", () => {
      expect(def().check({ stats: { totalColEarned: 999 } })).toBe(false);
    });
  });

  describe("boss_3", () => {
    const def = () => defs.find((a) => a.id === "boss_3");
    it("bossesDefeated >= 3 → true", () => {
      expect(def().check({ bossContribution: { bossesDefeated: 3 } })).toBe(true);
    });
    it("bossesDefeated = 2 → false", () => {
      expect(def().check({ bossContribution: { bossesDefeated: 2 } })).toBe(false);
    });
  });
});
