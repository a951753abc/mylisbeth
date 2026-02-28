import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock config
vi.mock("../config.js", () => ({
  default: {
    SYNTHESIS: {
      BASE_RETENTION: 0.55,
      RETENTION_DECAY: 0.05,
      MIN_RETENTION: 0.35,
      HP_DIVISOR: 3,
      CRI_PENALTY: 1,
      MIN_CRI: 5,
    },
  },
}));

const { synthesizeWeapons, distributeStats, TYPE_WEIGHTS } = await import("./synthesis.js");

function makeWeapon(overrides = {}) {
  return {
    name: "刀",
    type: "katana",
    weaponName: "測試刀",
    atk: 20,
    def: 5,
    agi: 10,
    cri: 6,
    hp: 30,
    durability: 7,
    maxDurability: 7,
    buff: 10,
    renameCount: 0,
    recipeMatched: false,
    recipeKey: null,
    innateEffects: [],
    fusionGen: 0,
    ...overrides,
  };
}

describe("distributeStats", () => {
  it("應正確分配所有點數", () => {
    const result = distributeStats(100, { atk: 3, def: 0.5, agi: 1, hp: 0.5 });
    const total = result.atk + result.def + result.agi + result.hp;
    expect(total).toBe(100);
  });

  it("應依權重比例分配", () => {
    const result = distributeStats(100, { atk: 3, def: 0.5, agi: 1, hp: 0.5 });
    // atk 應佔最大比例
    expect(result.atk).toBeGreaterThan(result.def);
    expect(result.atk).toBeGreaterThan(result.agi);
    expect(result.atk).toBeGreaterThan(result.hp);
  });

  it("pool 為 0 時所有屬性為 0", () => {
    const result = distributeStats(0, { atk: 3, def: 1, agi: 1, hp: 1 });
    expect(result).toEqual({ atk: 0, def: 0, agi: 0, hp: 0 });
  });

  it("pool 為 1 時只分配 1 點", () => {
    const result = distributeStats(1, { atk: 3, def: 1, agi: 1, hp: 1 });
    const total = result.atk + result.def + result.agi + result.hp;
    expect(total).toBe(1);
  });

  it("等權重時均勻分配", () => {
    const result = distributeStats(100, { atk: 1, def: 1, agi: 1, hp: 1 });
    expect(result.atk).toBe(25);
    expect(result.def).toBe(25);
    expect(result.agi).toBe(25);
    expect(result.hp).toBe(25);
  });
});

describe("synthesizeWeapons", () => {
  it("buff 歸零", () => {
    const w1 = makeWeapon({ buff: 10 });
    const w2 = makeWeapon({ buff: 8 });
    const { weapon } = synthesizeWeapons(w1, w2, "katana");
    expect(weapon.buff).toBe(0);
  });

  it("fusionGen 正確遞增", () => {
    const w1 = makeWeapon({ fusionGen: 0 });
    const w2 = makeWeapon({ fusionGen: 0 });
    const { weapon } = synthesizeWeapons(w1, w2, "katana");
    expect(weapon.fusionGen).toBe(1);
  });

  it("fusionGen 取較高值 +1", () => {
    const w1 = makeWeapon({ fusionGen: 2 });
    const w2 = makeWeapon({ fusionGen: 1 });
    const { weapon } = synthesizeWeapons(w1, w2, "katana");
    expect(weapon.fusionGen).toBe(3);
  });

  it("第 0 代保留率為 55%", () => {
    const w1 = makeWeapon({ fusionGen: 0 });
    const w2 = makeWeapon({ fusionGen: 0 });
    const { retention } = synthesizeWeapons(w1, w2, "katana");
    expect(retention).toBeCloseTo(0.55, 5);
  });

  it("第 1 代保留率衰減至 50%", () => {
    const w1 = makeWeapon({ fusionGen: 1 });
    const w2 = makeWeapon({ fusionGen: 0 });
    const { retention } = synthesizeWeapons(w1, w2, "katana");
    expect(retention).toBeCloseTo(0.50, 5);
  });

  it("保留率不低於下限 35%", () => {
    const w1 = makeWeapon({ fusionGen: 10 });
    const w2 = makeWeapon({ fusionGen: 10 });
    const { retention } = synthesizeWeapons(w1, w2, "katana");
    expect(retention).toBe(0.35);
  });

  it("HP 折算 ÷3 後計入素質池", () => {
    const w1 = makeWeapon({ atk: 10, def: 0, agi: 0, hp: 30 });
    const w2 = makeWeapon({ atk: 10, def: 0, agi: 0, hp: 30 });
    // HP 折算: 30/3=10 per weapon
    // rawPool: (10+10) + (0+0) + (0+0) + (10+10) = 40
    // pool: round(40 * 0.55) = 22
    const { pool } = synthesizeWeapons(w1, w2, "katana");
    expect(pool).toBe(22);
  });

  it("合成後 HP 有 ×3 還原", () => {
    const w1 = makeWeapon({ atk: 0, def: 0, agi: 0, hp: 90, cri: 10 });
    const w2 = makeWeapon({ atk: 0, def: 0, agi: 0, hp: 90, cri: 10 });
    // HP 折算: 90/3=30 per weapon, rawPool = 60, pool = round(60*0.55) = 33
    // 分配到 hp 的部分 ×3 還原
    const { weapon } = synthesizeWeapons(w1, w2, "katana");
    // hp 應 > 0 且為 3 的倍數
    expect(weapon.hp).toBeGreaterThan(0);
    expect(weapon.hp % 3).toBe(0);
  });

  it("CRI 取較好值 +1", () => {
    const w1 = makeWeapon({ cri: 5 });
    const w2 = makeWeapon({ cri: 8 });
    const { weapon } = synthesizeWeapons(w1, w2, "katana");
    expect(weapon.cri).toBe(6); // min(5,8) + 1 = 6
  });

  it("CRI 不低於下限 5", () => {
    const w1 = makeWeapon({ cri: 5 });
    const w2 = makeWeapon({ cri: 5 });
    const { weapon } = synthesizeWeapons(w1, w2, "katana");
    // min(5,5) + 1 = 6, but floor is 5 — result should be max(5, 6) = 6
    expect(weapon.cri).toBe(6);
  });

  it("CRI 極端低值不破下限", () => {
    const w1 = makeWeapon({ cri: 4 }); // 理論上不存在但防禦性測試
    const w2 = makeWeapon({ cri: 4 });
    const { weapon } = synthesizeWeapons(w1, w2, "katana");
    expect(weapon.cri).toBe(5); // max(5, 4+1) = 5
  });

  it("耐久取平均", () => {
    const w1 = makeWeapon({ durability: 6 });
    const w2 = makeWeapon({ durability: 10 });
    const { weapon } = synthesizeWeapons(w1, w2, "katana");
    expect(weapon.durability).toBe(8);
  });

  it("素質池總和正確（不含 CRI/HP 還原前）", () => {
    const w1 = makeWeapon({ atk: 20, def: 5, agi: 10, hp: 30 });
    const w2 = makeWeapon({ atk: 20, def: 5, agi: 10, hp: 30 });
    const { weapon, pool } = synthesizeWeapons(w1, w2, "katana");
    // 分配後的 atk+def+agi + hp/3 應等於 pool
    const actualPool = weapon.atk + weapon.def + weapon.agi + (weapon.hp / 3);
    expect(actualPool).toBe(pool);
  });

  it("不同武器類型合成 — 選擇劍", () => {
    const w1 = makeWeapon({ type: "katana" });
    const w2 = makeWeapon({ type: "shield", name: "大盾" });
    const { weapon } = synthesizeWeapons(w1, w2, "shield");
    expect(weapon.type).toBe("shield");
    expect(weapon.name).toBe("大盾");
  });

  it("不同武器類型合成 — 選擇盾", () => {
    const w1 = makeWeapon({ type: "katana" });
    const w2 = makeWeapon({ type: "shield", name: "大盾" });
    const { weapon } = synthesizeWeapons(w1, w2, "katana");
    expect(weapon.type).toBe("katana");
    expect(weapon.name).toBe("刀");
  });

  it("recipeMatched 重置為 false", () => {
    const w1 = makeWeapon({ recipeMatched: true, recipeKey: "abc" });
    const w2 = makeWeapon({ recipeMatched: true, recipeKey: "def" });
    const { weapon } = synthesizeWeapons(w1, w2, "katana");
    expect(weapon.recipeMatched).toBe(false);
    expect(weapon.recipeKey).toBe(null);
  });

  it("renameCount 重置為 0", () => {
    const w1 = makeWeapon({ renameCount: 1 });
    const w2 = makeWeapon({ renameCount: 1 });
    const { weapon } = synthesizeWeapons(w1, w2, "katana");
    expect(weapon.renameCount).toBe(0);
  });

  it("weaponName 為武器類型名稱（允許重新命名）", () => {
    const w1 = makeWeapon({ weaponName: "舊名1" });
    const w2 = makeWeapon({ weaponName: "舊名2" });
    const { weapon } = synthesizeWeapons(w1, w2, "katana");
    expect(weapon.weaponName).toBe("刀");
  });
});

describe("synthesizeWeapons — 先天效果", () => {
  it("兩把都無先天效果時結果為空", () => {
    const w1 = makeWeapon({ innateEffects: [] });
    const w2 = makeWeapon({ innateEffects: [] });
    const { weapon } = synthesizeWeapons(w1, w2, "katana");
    expect(weapon.innateEffects).toEqual([]);
  });

  it("先天效果最多保留 1 個", () => {
    const effects = [
      { id: "sharp", name: "鋭利" },
      { id: "swift", name: "迅速" },
      { id: "drain", name: "魂吸" },
    ];
    const w1 = makeWeapon({ innateEffects: [effects[0], effects[1]] });
    const w2 = makeWeapon({ innateEffects: [effects[2]] });
    const { weapon } = synthesizeWeapons(w1, w2, "katana");
    expect(weapon.innateEffects.length).toBeLessThanOrEqual(1);
  });
});

describe("TYPE_WEIGHTS", () => {
  it("所有武器類型都有權重", () => {
    const expectedTypes = [
      "one_handed_sword", "two_handed_sword", "two_handed_axe",
      "mace", "katana", "curved_sword", "rapier",
      "dagger", "spear", "bow", "shield",
    ];
    for (const type of expectedTypes) {
      expect(TYPE_WEIGHTS[type]).toBeDefined();
      expect(TYPE_WEIGHTS[type].atk).toBeGreaterThan(0);
      expect(TYPE_WEIGHTS[type].def).toBeGreaterThan(0);
      expect(TYPE_WEIGHTS[type].agi).toBeGreaterThan(0);
      expect(TYPE_WEIGHTS[type].hp).toBeGreaterThan(0);
    }
  });

  it("DEF 和 HP 權重不會低於 0.5", () => {
    for (const type of Object.keys(TYPE_WEIGHTS)) {
      expect(TYPE_WEIGHTS[type].def).toBeGreaterThanOrEqual(0.5);
      expect(TYPE_WEIGHTS[type].hp).toBeGreaterThanOrEqual(0.5);
    }
  });
});
