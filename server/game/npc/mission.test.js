import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";

// ──────────────────────────────────────────────────────────────────────────────
// CJS require — all imports share the same module registry, so vi.spyOn on
// the required module object intercepts calls made by mission.js itself.
// CJS spyOn pattern: require modules before SUT so vi.spyOn can intercept.
// ──────────────────────────────────────────────────────────────────────────────
const _require = createRequire(import.meta.url);

// Import all dependency modules before mission.js so we can spy on them.
// Note: modules that are DESTRUCTURED in mission.js (textManager, activeFloor,
// weaponType, etc.) cannot be intercepted via vi.spyOn — those use real values.
// Only db.js is imported as a whole object (`const db = require("../../db.js")`),
// so vi.spyOn works for db methods.
const db = _require("../../db.js");

// Load mission.js AFTER dependencies are in the registry
const { getMissionPreviews, startMission, getTrainingPreviews } = _require("./mission.js");

// ──────────────────────────────────────────────────────────────────────────────
// Config constants (from config.js — real values, NOT mocked):
//
// NPC_MISSIONS.COMMISSION_RATE     = 0.10
// NPC_MISSIONS.CONCURRENT_LIMIT   = 2
// NPC_MISSIONS.QUALITY_MULT        = { 見習:0.6, 普通:1.0, 優秀:1.5, 精銳:2.0, 傳說:3.0 }
// NPC_MISSIONS.TYPES:
//   patrol:  duration=3,  baseReward=80,  floorMult=0.2, successRate=85
//            condCost=10, failCondCost=25, deathChance=10
//   gather:  duration=5,  baseReward=150, floorMult=0.3, successRate=75
//            condCost=15, failCondCost=30, deathChance=15
//   escort:  duration=10, baseReward=350, floorMult=0.5, successRate=65
//            condCost=20, failCondCost=40, deathChance=20
//
// SKILL.NPC_LEARN_CHANCE           = 5
// SKILL.NPC_QUALITY_LEARN_MULT     = { 見習:0.5, 普通:1.0, 優秀:1.5, 精銳:2.0, 傳說:3.0 }
//
// NPC_TRAINING.FLOOR_MULT          = 0.3
// NPC_TRAINING.PROF_CAP_PER_FLOOR  = 100
// NPC_TRAINING.LEVEL_CAP_PER_FLOOR = 2
// NPC_TRAINING.TYPES:
//   quick_training:     duration=2,  profGain=20, learnChanceMult=3.0, condCost=5,  expReward=15
//   intensive_training: duration=6,  profGain=40, learnChanceMult=5.0, condCost=10, expReward=40
//
// TIME_SCALE = 5 * 60 * 1000 = 300_000
// ──────────────────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// getMissionPreviews — pure calculation, no external dependencies needed
// ══════════════════════════════════════════════════════════════════════════════
describe("getMissionPreviews", () => {
  function makeNpc(quality = "普通") {
    return { quality };
  }

  // ──────────────────────────────────────────────────────────
  // Shape & structure
  // ──────────────────────────────────────────────────────────
  describe("回傳形狀", () => {
    it("回傳 3 個任務類型（patrol, gather, escort）", () => {
      const previews = getMissionPreviews(makeNpc(), 1);
      expect(previews).toHaveLength(3);
    });

    it("每個任務包含正確的 id 與 name（順序正確）", () => {
      const previews = getMissionPreviews(makeNpc(), 1);
      expect(previews.map((p) => p.id)).toEqual(["patrol", "gather", "escort"]);
      expect(previews.map((p) => p.name)).toEqual(["巡邏", "採集委託", "護送任務"]);
    });

    it("每個任務包含所有必要欄位", () => {
      const REQUIRED = ["id", "name", "duration", "durationMinutes", "reward", "commission", "successRate", "condCost", "failCondCost", "deathChance"];
      const previews = getMissionPreviews(makeNpc(), 1);
      for (const p of previews) {
        for (const field of REQUIRED) {
          expect(p).toHaveProperty(field);
        }
      }
    });

    it("durationMinutes = duration × 5（所有任務）", () => {
      const previews = getMissionPreviews(makeNpc(), 1);
      for (const p of previews) {
        expect(p.durationMinutes).toBe(p.duration * 5);
      }
    });

    it("patrol: duration=3, durationMinutes=15, condCost=10, failCondCost=25, deathChance=10", () => {
      const patrol = getMissionPreviews(makeNpc(), 1).find((p) => p.id === "patrol");
      expect(patrol.duration).toBe(3);
      expect(patrol.durationMinutes).toBe(15);
      expect(patrol.condCost).toBe(10);
      expect(patrol.failCondCost).toBe(25);
      expect(patrol.deathChance).toBe(10);
    });

    it("gather: duration=5, durationMinutes=25, condCost=15, failCondCost=30, deathChance=15", () => {
      const gather = getMissionPreviews(makeNpc(), 1).find((p) => p.id === "gather");
      expect(gather.duration).toBe(5);
      expect(gather.durationMinutes).toBe(25);
      expect(gather.condCost).toBe(15);
      expect(gather.failCondCost).toBe(30);
      expect(gather.deathChance).toBe(15);
    });

    it("escort: duration=10, durationMinutes=50, condCost=20, failCondCost=40, deathChance=20", () => {
      const escort = getMissionPreviews(makeNpc(), 1).find((p) => p.id === "escort");
      expect(escort.duration).toBe(10);
      expect(escort.durationMinutes).toBe(50);
      expect(escort.condCost).toBe(20);
      expect(escort.failCondCost).toBe(40);
      expect(escort.deathChance).toBe(20);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Floor 1, 普通 quality (mult=1.0), no title — exact values
  //
  // patrol:  rawReward = round((80  + 1*80*0.2)  * 1.0) = round(96)  = 96
  //          commission = floor(96  * 0.10) = 9
  //          netReward  = round((96-9)   * 1.0) = 87
  //          successRate = min(99, max(1, round(85 * 1.0))) = 85
  //
  // gather:  rawReward = round((150 + 1*150*0.3) * 1.0) = round(195) = 195
  //          commission = floor(195 * 0.10) = 19
  //          netReward  = round((195-19)  * 1.0) = 176
  //          successRate = 75
  //
  // escort:  rawReward = round((350 + 1*350*0.5) * 1.0) = round(525) = 525
  //          commission = floor(525 * 0.10) = 52
  //          netReward  = round((525-52) * 1.0) = 473
  //          successRate = 65
  // ──────────────────────────────────────────────────────────
  describe("Floor 1, 普通 quality, 無稱號 — 精確數值", () => {
    it("patrol: reward=87, commission=9, successRate=85", () => {
      const patrol = getMissionPreviews(makeNpc("普通"), 1, null).find((p) => p.id === "patrol");
      expect(patrol.reward).toBe(87);
      expect(patrol.commission).toBe(9);
      expect(patrol.successRate).toBe(85);
    });

    it("gather: reward=176, commission=19, successRate=75", () => {
      const gather = getMissionPreviews(makeNpc("普通"), 1, null).find((p) => p.id === "gather");
      expect(gather.reward).toBe(176);
      expect(gather.commission).toBe(19);
      expect(gather.successRate).toBe(75);
    });

    it("escort: reward=473, commission=52, successRate=65", () => {
      const escort = getMissionPreviews(makeNpc("普通"), 1, null).find((p) => p.id === "escort");
      expect(escort.reward).toBe(473);
      expect(escort.commission).toBe(52);
      expect(escort.successRate).toBe(65);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Quality scaling
  // ──────────────────────────────────────────────────────────
  describe("品質乘數縮放", () => {
    // 傳說 quality (3.0x):
    // patrol: rawReward = round((80 + 1*80*0.2) * 3.0) = round(288) = 288
    //         commission = floor(288 * 0.10) = 28
    //         netReward  = round((288-28) * 1.0) = 260
    it("傳說 quality: patrol reward=260, commission=28", () => {
      const patrol = getMissionPreviews(makeNpc("傳說"), 1, null).find((p) => p.id === "patrol");
      expect(patrol.reward).toBe(260);
      expect(patrol.commission).toBe(28);
    });

    // 見習 quality (0.6x):
    // patrol: rawReward = round((80 + 1*80*0.2) * 0.6) = round(57.6) = 58
    //         commission = floor(58 * 0.10) = 5
    //         netReward  = round((58-5) * 1.0) = 53
    it("見習 quality: patrol reward=53, commission=5，低於 普通", () => {
      const novice = getMissionPreviews(makeNpc("見習"), 1, null).find((p) => p.id === "patrol");
      const normal = getMissionPreviews(makeNpc("普通"), 1, null).find((p) => p.id === "patrol");
      expect(novice.reward).toBe(53);
      expect(novice.commission).toBe(5);
      expect(novice.reward).toBeLessThan(normal.reward);
    });

    it("品質不影響 successRate（patrol 85 不論品質）", () => {
      const legendary = getMissionPreviews(makeNpc("傳說"), 1, null).find((p) => p.id === "patrol");
      const normal    = getMissionPreviews(makeNpc("普通"), 1, null).find((p) => p.id === "patrol");
      expect(legendary.successRate).toBe(normal.successRate);
      expect(legendary.successRate).toBe(85);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Floor scaling
  // ──────────────────────────────────────────────────────────
  describe("樓層縮放", () => {
    // Floor 5, 普通 quality, no title:
    // patrol: rawReward = round((80 + 5*80*0.2) * 1.0) = round(160) = 160
    //         commission = floor(160 * 0.10) = 16
    //         netReward  = round((160-16) * 1.0) = 144
    it("Floor 5, patrol: reward=144, commission=16", () => {
      const patrol = getMissionPreviews(makeNpc("普通"), 5, null).find((p) => p.id === "patrol");
      expect(patrol.reward).toBe(144);
      expect(patrol.commission).toBe(16);
    });

    // gather floor 5: rawReward = round((150 + 5*150*0.3) * 1.0) = round(375) = 375
    //                 commission = floor(375 * 0.10) = 37
    //                 netReward  = round((375-37) * 1.0) = 338
    it("Floor 5, gather: reward=338, commission=37", () => {
      const gather = getMissionPreviews(makeNpc("普通"), 5, null).find((p) => p.id === "gather");
      expect(gather.reward).toBe(338);
      expect(gather.commission).toBe(37);
    });

    it("高樓層 reward 高於低樓層（floor 5 > floor 1）", () => {
      const floor1 = getMissionPreviews(makeNpc("普通"), 1, null);
      const floor5 = getMissionPreviews(makeNpc("普通"), 5, null);
      for (let i = 0; i < floor1.length; i++) {
        expect(floor5[i].reward).toBeGreaterThan(floor1[i].reward);
      }
    });
  });

  // ──────────────────────────────────────────────────────────
  // title = null vs omitted
  // ──────────────────────────────────────────────────────────
  describe("稱號為 null", () => {
    it("title=null 與 title 省略回傳相同結果", () => {
      const withNull    = getMissionPreviews(makeNpc("普通"), 1, null);
      const withOmitted = getMissionPreviews(makeNpc("普通"), 1);
      expect(withNull).toEqual(withOmitted);
    });

    it("title=null 時 modifier=1.0，netReward = rawReward - commission（無修正）", () => {
      // rawReward=96, commission=9 → netReward = round((96-9) * 1.0) = 87
      const patrol = getMissionPreviews(makeNpc("普通"), 1, null).find((p) => p.id === "patrol");
      expect(patrol.reward).toBe(87);
    });
  });

  // ──────────────────────────────────────────────────────────
  // successRate bounds
  // ──────────────────────────────────────────────────────────
  describe("successRate 邊界", () => {
    it("successRate 最低為 1", () => {
      const previews = getMissionPreviews(makeNpc("普通"), 1, null);
      for (const p of previews) {
        expect(p.successRate).toBeGreaterThanOrEqual(1);
      }
    });

    it("successRate 最高為 99", () => {
      const previews = getMissionPreviews(makeNpc("普通"), 1, null);
      for (const p of previews) {
        expect(p.successRate).toBeLessThanOrEqual(99);
      }
    });
  });

  // ──────────────────────────────────────────────────────────
  // Unknown quality fallback
  // ──────────────────────────────────────────────────────────
  describe("未知品質 fallback", () => {
    it("未知品質使用 1.0 乘數，結果等同 普通", () => {
      const unknown = getMissionPreviews({ quality: "神話" }, 1, null).find((p) => p.id === "patrol");
      const normal  = getMissionPreviews({ quality: "普通" }, 1, null).find((p) => p.id === "patrol");
      expect(unknown.reward).toBe(normal.reward);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getTrainingPreviews — pure calculation (uses resolveWeaponType as dependency)
// ══════════════════════════════════════════════════════════════════════════════
describe("getTrainingPreviews", () => {
  // Config reference (real values):
  // NPC_TRAINING.TYPES:
  //   quick_training:     profGain=20, learnChanceMult=3.0, condCost=5,  expReward=15, duration=2
  //   intensive_training: profGain=40, learnChanceMult=5.0, condCost=10, expReward=40, duration=6
  // NPC_TRAINING.FLOOR_MULT=0.3, PROF_CAP_PER_FLOOR=100, LEVEL_CAP_PER_FLOOR=2
  // SKILL.NPC_LEARN_CHANCE=5
  // SKILL.NPC_QUALITY_LEARN_MULT: 見習=0.5, 普通=1.0, 傳說=3.0

  // resolveWeaponType(weapon) checks weapon.type first, then name lookup.
  // Use weapon.type = "one_handed_sword" so resolveWeaponType returns that type.
  const fakeWeapon     = { id: "sword_001", name: "鐵劍", type: "one_handed_sword" };
  const weaponsWithOne = [fakeWeapon];

  function makeNpc(overrides = {}) {
    return {
      quality: "普通",
      level: 1,
      equippedWeaponIndex: 0,
      weaponProficiency: {},
      ...overrides,
    };
  }

  // ──────────────────────────────────────────────────────────
  // Shape
  // ──────────────────────────────────────────────────────────
  describe("回傳形狀", () => {
    it("回傳 2 個修練類型", () => {
      const previews = getTrainingPreviews(makeNpc(), weaponsWithOne, 4);
      expect(previews).toHaveLength(2);
    });

    it("包含 quick_training 和 intensive_training（順序正確）", () => {
      const previews = getTrainingPreviews(makeNpc(), weaponsWithOne, 4);
      expect(previews.map((p) => p.id)).toEqual(["quick_training", "intensive_training"]);
    });

    it("每個修練包含所有必要欄位", () => {
      const REQUIRED = ["id", "name", "duration", "durationMinutes", "profGain", "learnChance", "condCost", "expReward", "hasWeapon", "weaponType", "atProfCap", "atLevelCap", "profCap", "levelCap"];
      const previews = getTrainingPreviews(makeNpc(), weaponsWithOne, 4);
      for (const p of previews) {
        for (const field of REQUIRED) {
          expect(p).toHaveProperty(field);
        }
      }
    });

    it("durationMinutes = duration × 5", () => {
      const previews = getTrainingPreviews(makeNpc(), weaponsWithOne, 4);
      for (const p of previews) {
        expect(p.durationMinutes).toBe(p.duration * 5);
      }
    });

    it("quick_training: duration=2, durationMinutes=10, condCost=5", () => {
      const quick = getTrainingPreviews(makeNpc(), weaponsWithOne, 4).find((p) => p.id === "quick_training");
      expect(quick.duration).toBe(2);
      expect(quick.durationMinutes).toBe(10);
      expect(quick.condCost).toBe(5);
    });

    it("intensive_training: duration=6, durationMinutes=30, condCost=10", () => {
      const intensive = getTrainingPreviews(makeNpc(), weaponsWithOne, 4).find((p) => p.id === "intensive_training");
      expect(intensive.duration).toBe(6);
      expect(intensive.durationMinutes).toBe(30);
      expect(intensive.condCost).toBe(10);
    });
  });

  // ──────────────────────────────────────────────────────────
  // No weapon equipped
  // When equippedWeaponIndex=null:
  //   hasWeapon=false, weaponType=null
  //   resolveWeaponType is NOT called
  //   currentProf=0, atProfCap = (0 >= profCap) = false (profCap >= 100)
  //   profGain still computes from rawProfGain (not zeroed by absence of weapon)
  // ──────────────────────────────────────────────────────────
  describe("未裝備武器", () => {
    it("equippedWeaponIndex=null: hasWeapon=false", () => {
      const npc = makeNpc({ equippedWeaponIndex: null });
      const previews = getTrainingPreviews(npc, weaponsWithOne, 4);
      for (const p of previews) {
        expect(p.hasWeapon).toBe(false);
      }
    });

    it("equippedWeaponIndex=null: weaponType=null", () => {
      const npc = makeNpc({ equippedWeaponIndex: null });
      const previews = getTrainingPreviews(npc, weaponsWithOne, 4);
      for (const p of previews) {
        expect(p.weaponType).toBeNull();
      }
    });

    it("equippedWeaponIndex=null: atProfCap=false（currentProf=0 < profCap=100）", () => {
      const npc = makeNpc({ equippedWeaponIndex: null });
      const previews = getTrainingPreviews(npc, weaponsWithOne, 4);
      for (const p of previews) {
        expect(p.atProfCap).toBe(false);
        expect(p.profCap).toBe(100); // effectiveFloor=1 → 1*100=100
      }
    });
  });

  // ──────────────────────────────────────────────────────────
  // With weapon, floor 4
  // effectiveFloor = max(1, 4-3) = 1
  // floorMult = 1 + (1-1) * 0.3 = 1.0
  // profCap = 1 * 100 = 100, levelCap = 1 * 2 = 2
  // 普通 qualityMult=1.0, NPC_LEARN_CHANCE=5
  //
  // quick_training:
  //   rawProfGain = round(20 * 1.0) = 20
  //   effectiveProfGain = min(20, 100-0) = 20
  //   rawExpReward = round(15 * 1.0) = 15
  //   effectiveExpReward = 15  (level 1 < levelCap 2)
  //   learnChance = round(5 * 3.0 * 1.0) = 15
  //
  // intensive_training:
  //   rawProfGain = round(40 * 1.0) = 40
  //   effectiveProfGain = min(40, 100-0) = 40
  //   rawExpReward = round(40 * 1.0) = 40
  //   learnChance = round(5 * 5.0 * 1.0) = 25
  // ──────────────────────────────────────────────────────────
  describe("有武器裝備, floor 4 (effectiveFloor=1, floorMult=1.0)", () => {
    it("hasWeapon=true, weaponType='one_handed_sword'", () => {
      const previews = getTrainingPreviews(makeNpc(), weaponsWithOne, 4);
      for (const p of previews) {
        expect(p.hasWeapon).toBe(true);
        expect(p.weaponType).toBe("one_handed_sword");
      }
    });

    it("quick_training: profGain=20, expReward=15, learnChance=15", () => {
      const quick = getTrainingPreviews(makeNpc(), weaponsWithOne, 4).find((p) => p.id === "quick_training");
      expect(quick.profGain).toBe(20);
      expect(quick.expReward).toBe(15);
      expect(quick.learnChance).toBe(15);
    });

    it("intensive_training: profGain=40, expReward=40, learnChance=25", () => {
      const intensive = getTrainingPreviews(makeNpc(), weaponsWithOne, 4).find((p) => p.id === "intensive_training");
      expect(intensive.profGain).toBe(40);
      expect(intensive.expReward).toBe(40);
      expect(intensive.learnChance).toBe(25);
    });

    it("profCap=100, levelCap=2, atProfCap=false, atLevelCap=false (level 1)", () => {
      const previews = getTrainingPreviews(makeNpc(), weaponsWithOne, 4);
      for (const p of previews) {
        expect(p.profCap).toBe(100);
        expect(p.levelCap).toBe(2);
        expect(p.atProfCap).toBe(false);
        expect(p.atLevelCap).toBe(false);
      }
    });
  });

  // ──────────────────────────────────────────────────────────
  // With weapon, floor 7
  // effectiveFloor = max(1, 7-3) = 4
  // floorMult = 1 + (4-1) * 0.3 = 1.9
  // profCap = 4 * 100 = 400, levelCap = 4 * 2 = 8
  //
  // quick_training:
  //   rawProfGain = round(20 * 1.9) = round(38.0) = 38
  //   effectiveProfGain = min(38, 400-0) = 38
  //   rawExpReward = round(15 * 1.9) = round(28.5) = 29
  //   learnChance = round(5 * 3.0 * 1.0) = 15
  //
  // intensive_training:
  //   rawProfGain = round(40 * 1.9) = round(76.0) = 76
  //   effectiveProfGain = min(76, 400-0) = 76
  //   rawExpReward = round(40 * 1.9) = round(76.0) = 76
  //   learnChance = round(5 * 5.0 * 1.0) = 25
  // ──────────────────────────────────────────────────────────
  describe("有武器裝備, floor 7 (effectiveFloor=4, floorMult=1.9)", () => {
    it("quick_training: profGain=38, expReward=29, learnChance=15", () => {
      const quick = getTrainingPreviews(makeNpc(), weaponsWithOne, 7).find((p) => p.id === "quick_training");
      expect(quick.profGain).toBe(38);
      expect(quick.expReward).toBe(29);
      expect(quick.learnChance).toBe(15);
    });

    it("intensive_training: profGain=76, expReward=76, learnChance=25", () => {
      const intensive = getTrainingPreviews(makeNpc(), weaponsWithOne, 7).find((p) => p.id === "intensive_training");
      expect(intensive.profGain).toBe(76);
      expect(intensive.expReward).toBe(76);
      expect(intensive.learnChance).toBe(25);
    });

    it("profCap=400, levelCap=8", () => {
      const previews = getTrainingPreviews(makeNpc(), weaponsWithOne, 7);
      for (const p of previews) {
        expect(p.profCap).toBe(400);
        expect(p.levelCap).toBe(8);
      }
    });

    it("floor 7 profGain > floor 4 profGain（樓層加成有效）", () => {
      const floor4quick = getTrainingPreviews(makeNpc(), weaponsWithOne, 4).find((p) => p.id === "quick_training");
      const floor7quick = getTrainingPreviews(makeNpc(), weaponsWithOne, 7).find((p) => p.id === "quick_training");
      expect(floor7quick.profGain).toBeGreaterThan(floor4quick.profGain);
    });
  });

  // ──────────────────────────────────────────────────────────
  // At proficiency cap
  // ──────────────────────────────────────────────────────────
  describe("熟練度已達上限", () => {
    it("currentProf >= profCap: atProfCap=true, profGain=0", () => {
      // effectiveFloor=1, profCap=100. Set currentProf=100 (at cap)
      const npc = makeNpc({ weaponProficiency: { one_handed_sword: 100 } });
      const previews = getTrainingPreviews(npc, weaponsWithOne, 4);
      for (const p of previews) {
        expect(p.atProfCap).toBe(true);
        expect(p.profGain).toBe(0);
      }
    });

    it("atProfCap=true: learnChance=0", () => {
      const npc = makeNpc({ weaponProficiency: { one_handed_sword: 100 } });
      const previews = getTrainingPreviews(npc, weaponsWithOne, 4);
      for (const p of previews) {
        expect(p.learnChance).toBe(0);
      }
    });

    it("熟練度部分達上限: profGain 不超過剩餘空間（cap - current）", () => {
      // effectiveFloor=1, profCap=100, currentProf=90
      // quick rawProfGain=20, but (100-90)=10 → effectiveProfGain=10
      const npc = makeNpc({ weaponProficiency: { one_handed_sword: 90 } });
      const quick = getTrainingPreviews(npc, weaponsWithOne, 4).find((p) => p.id === "quick_training");
      expect(quick.profGain).toBe(10);
      expect(quick.atProfCap).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────
  // At level cap
  // ──────────────────────────────────────────────────────────
  describe("等級已達上限", () => {
    it("level >= levelCap: atLevelCap=true, expReward=0", () => {
      // effectiveFloor=1, levelCap=2. level=2 → at cap
      const npc = makeNpc({ level: 2 });
      const previews = getTrainingPreviews(npc, weaponsWithOne, 4);
      for (const p of previews) {
        expect(p.atLevelCap).toBe(true);
        expect(p.expReward).toBe(0);
      }
    });

    it("level < levelCap: atLevelCap=false, expReward > 0", () => {
      const npc = makeNpc({ level: 1 });
      const previews = getTrainingPreviews(npc, weaponsWithOne, 4);
      for (const p of previews) {
        expect(p.atLevelCap).toBe(false);
        expect(p.expReward).toBeGreaterThan(0);
      }
    });
  });

  // ──────────────────────────────────────────────────────────
  // Quality multiplier on learnChance
  // NPC_LEARN_CHANCE=5, learnChanceMult per type
  // qualityMult: 傳說=3.0, 見習=0.5
  //
  // 傳說, quick: round(5 * 3.0 * 3.0) = round(45) = 45
  // 見習, quick: round(5 * 3.0 * 0.5) = round(7.5) = 8
  // ──────────────────────────────────────────────────────────
  describe("品質影響 learnChance", () => {
    it("傳說 quality: quick_training learnChance=45", () => {
      const npc   = makeNpc({ quality: "傳說" });
      const quick = getTrainingPreviews(npc, weaponsWithOne, 4).find((p) => p.id === "quick_training");
      expect(quick.learnChance).toBe(45);
    });

    it("見習 quality: quick_training learnChance=8", () => {
      const npc   = makeNpc({ quality: "見習" });
      const quick = getTrainingPreviews(npc, weaponsWithOne, 4).find((p) => p.id === "quick_training");
      expect(quick.learnChance).toBe(8);
    });

    it("傳說 learnChance > 普通 learnChance", () => {
      const legendary = getTrainingPreviews(makeNpc({ quality: "傳說" }), weaponsWithOne, 4).find((p) => p.id === "quick_training");
      const normal    = getTrainingPreviews(makeNpc({ quality: "普通" }), weaponsWithOne, 4).find((p) => p.id === "quick_training");
      expect(legendary.learnChance).toBeGreaterThan(normal.learnChance);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// startMission — DB-dependent async function
// Uses vi.spyOn on the shared CJS module object (same reference as mission.js uses)
// ══════════════════════════════════════════════════════════════════════════════
describe("startMission", () => {
  const USER_ID = "user_123";
  const NPC_ID  = "npc_abc";

  function makeHiredNpc(overrides = {}) {
    return {
      npcId: NPC_ID,
      name: "艾爾莎",
      quality: "普通",
      condition: 100,
      mission: null,
      ...overrides,
    };
  }

  function makeUser(npcOverrides = {}, userOverrides = {}) {
    return {
      userId: USER_ID,
      currentFloor: 1,
      hiredNpcs: [makeHiredNpc(npcOverrides)],
      ...userOverrides,
    };
  }

  beforeEach(() => {
    // Spy on db methods used by startMission
    // Note: vi.spyOn works here because db.js exports via module.exports.findOne = ...
    // and mission.js uses the whole `db` object (not destructured), so replacing
    // properties on the shared exports object IS intercepted.
    vi.spyOn(db, "findOne").mockResolvedValue(null);
    vi.spyOn(db, "findOneAndUpdate").mockResolvedValue(null);
    // Note: textManager and activeFloor are DESTRUCTURED in mission.js, so
    // vi.spyOn on the module won't intercept — use real values instead.
  });

  // ──────────────────────────────────────────────────────────
  // User / NPC not found
  // Real text from gameText.js:
  //   NPC.CHAR_NOT_FOUND   → "角色不存在"
  //   NPC.NPC_NOT_FOUND    → "找不到該 NPC"
  // ──────────────────────────────────────────────────────────
  describe("找不到使用者 / NPC", () => {
    it("使用者不存在: 回傳 error = '角色不存在'", async () => {
      db.findOne.mockResolvedValue(null);
      const result = await startMission(USER_ID, NPC_ID, "patrol");
      expect(result).toHaveProperty("error");
      expect(result.error).toBe("角色不存在");
    });

    it("NPC 不在 hiredNpcs 中: 回傳 error = '找不到該 NPC'", async () => {
      db.findOne.mockResolvedValue(makeUser({}, { hiredNpcs: [] }));
      const result = await startMission(USER_ID, "nonexistent_npc", "patrol");
      expect(result).toHaveProperty("error");
      expect(result.error).toBe("找不到該 NPC");
    });

    it("hiredNpcs 欄位不存在: 回傳 '找不到該 NPC'", async () => {
      db.findOne.mockResolvedValue({ userId: USER_ID, currentFloor: 1 });
      const result = await startMission(USER_ID, NPC_ID, "patrol");
      expect(result).toHaveProperty("error");
      expect(result.error).toBe("找不到該 NPC");
    });
  });

  // ──────────────────────────────────────────────────────────
  // NPC already on mission
  // Real text: formatText("NPC.ON_MISSION", { npcName }) = "{name} 正在執行任務中"
  // ──────────────────────────────────────────────────────────
  describe("NPC 已在任務中", () => {
    it("npc.mission 非 null: 回傳含 npcName 的 ON_MISSION error", async () => {
      const user = makeUser({
        mission: { type: "patrol", name: "巡邏", startedAt: 1000, endsAt: 9999 },
      });
      db.findOne.mockResolvedValue(user);
      const result = await startMission(USER_ID, NPC_ID, "gather");
      expect(result).toHaveProperty("error");
      // "艾爾莎 正在執行任務中"
      expect(result.error).toMatch("艾爾莎");
      expect(result.error).toMatch("任務中");
    });
  });

  // ──────────────────────────────────────────────────────────
  // Concurrent mission limit
  // Real text: formatText("NPC.MISSION_LIMIT", {limit}) = "同時派遣任務已達上限（2 個）..."
  // ──────────────────────────────────────────────────────────
  describe("同時任務上限", () => {
    it("已有 2 個非修練任務: 回傳含上限相關 error", async () => {
      const user = {
        userId: USER_ID,
        currentFloor: 1,
        hiredNpcs: [
          { npcId: "npc_1", name: "A", condition: 80, mission: { type: "patrol" } },
          { npcId: "npc_2", name: "B", condition: 80, mission: { type: "gather" } },
          { npcId: NPC_ID,  name: "艾爾莎", condition: 100, mission: null },
        ],
      };
      db.findOne.mockResolvedValue(user);
      const result = await startMission(USER_ID, NPC_ID, "patrol");
      expect(result).toHaveProperty("error");
      // "同時派遣任務已達上限（2 個）..."
      expect(result.error).toMatch("上限");
    });

    it("修練中的 NPC（isTraining=true）不計入非修練任務上限", async () => {
      const user = {
        userId: USER_ID,
        currentFloor: 1,
        hiredNpcs: [
          { npcId: "npc_1", name: "A", condition: 80, mission: { type: "quick_training", isTraining: true } },
          { npcId: "npc_2", name: "B", condition: 80, mission: { type: "intensive_training", isTraining: true } },
          { npcId: NPC_ID,  name: "艾爾莎", condition: 100, mission: null },
        ],
      };
      db.findOne.mockResolvedValue(user);
      db.findOneAndUpdate.mockResolvedValue({ ...user });

      const result = await startMission(USER_ID, NPC_ID, "patrol");
      // Should NOT return MISSION_LIMIT — training missions don't count
      expect(result).not.toHaveProperty("error");
      expect(result.success).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Low condition
  // Real text: formatText("NPC.LOW_CONDITION", {npcName}) = "艾爾莎 體力過低，無法執行任務"
  // ──────────────────────────────────────────────────────────
  describe("體力不足", () => {
    it("condition < 10: 回傳含 npcName 與「體力過低」的 error", async () => {
      db.findOne.mockResolvedValue(makeUser({ condition: 9 }));
      const result = await startMission(USER_ID, NPC_ID, "patrol");
      expect(result).toHaveProperty("error");
      expect(result.error).toMatch("艾爾莎");
      expect(result.error).toMatch("體力過低");
    });

    it("condition = 9（邊界）: 回傳體力不足 error", async () => {
      db.findOne.mockResolvedValue(makeUser({ condition: 9 }));
      const result = await startMission(USER_ID, NPC_ID, "escort");
      expect(result.error).toMatch("體力過低");
    });

    it("condition = 10（剛好及格）: 不回傳 LOW_CONDITION error", async () => {
      db.findOne.mockResolvedValue(makeUser({ condition: 10 }));
      db.findOneAndUpdate.mockResolvedValue(makeUser({ condition: 10 }));
      const result = await startMission(USER_ID, NPC_ID, "patrol");
      expect(result).not.toHaveProperty("error");
      expect(result.success).toBe(true);
    });

    it("condition=undefined: 預設 100，不回傳 LOW_CONDITION error", async () => {
      db.findOne.mockResolvedValue(makeUser({ condition: undefined }));
      db.findOneAndUpdate.mockResolvedValue(makeUser({ condition: undefined }));
      const result = await startMission(USER_ID, NPC_ID, "patrol");
      expect(result).not.toHaveProperty("error");
      expect(result.success).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Invalid mission type
  // Real text: getText("NPC.INVALID_MISSION") = "無效的任務類型"
  // ──────────────────────────────────────────────────────────
  describe("無效任務類型", () => {
    it("未知 missionType: 回傳 error = '無效的任務類型'", async () => {
      db.findOne.mockResolvedValue(makeUser());
      const result = await startMission(USER_ID, NPC_ID, "unknown_mission");
      expect(result).toHaveProperty("error");
      expect(result.error).toBe("無效的任務類型");
    });

    it("missionType 為空字串: 回傳 '無效的任務類型'", async () => {
      db.findOne.mockResolvedValue(makeUser());
      const result = await startMission(USER_ID, NPC_ID, "");
      expect(result.error).toBe("無效的任務類型");
    });
  });

  // ──────────────────────────────────────────────────────────
  // Successful dispatch
  // ──────────────────────────────────────────────────────────
  describe("成功派遣任務", () => {
    const NOW = 1_700_000_000_000;

    beforeEach(() => {
      vi.spyOn(Date, "now").mockReturnValue(NOW);
      db.findOneAndUpdate.mockResolvedValue(makeUser());
    });

    it("所有條件通過: 回傳 success=true 與 npcName", async () => {
      db.findOne.mockResolvedValue(makeUser());
      const result = await startMission(USER_ID, NPC_ID, "patrol");
      expect(result.success).toBe(true);
      expect(result.npcName).toBe("艾爾莎");
    });

    it("patrol: durationMinutes = 3 × 5 = 15", async () => {
      db.findOne.mockResolvedValue(makeUser());
      const result = await startMission(USER_ID, NPC_ID, "patrol");
      expect(result.durationMinutes).toBe(15);
    });

    it("escort: durationMinutes = 10 × 5 = 50", async () => {
      db.findOne.mockResolvedValue(makeUser());
      const result = await startMission(USER_ID, NPC_ID, "escort");
      expect(result.success).toBe(true);
      expect(result.durationMinutes).toBe(50);
    });

    it("mission 物件: type='gather', name='採集委託', startedAt=NOW, floor 為數字", async () => {
      db.findOne.mockResolvedValue(makeUser());
      const result = await startMission(USER_ID, NPC_ID, "gather");
      expect(result.mission.type).toBe("gather");
      expect(result.mission.name).toBe("採集委託");
      expect(result.mission.startedAt).toBe(NOW);
      // floor comes from getActiveFloor(user) — a number is enough to verify
      expect(typeof result.mission.floor).toBe("number");
    });

    it("gather: endsAt = NOW + duration(5) × TIME_SCALE(300_000)", async () => {
      db.findOne.mockResolvedValue(makeUser());
      const result = await startMission(USER_ID, NPC_ID, "gather");
      expect(result.mission.endsAt).toBe(NOW + 5 * 300_000);
    });

    it("呼叫 db.findOneAndUpdate 進行原子性寫入（恰好一次）", async () => {
      db.findOne.mockResolvedValue(makeUser());
      await startMission(USER_ID, NPC_ID, "patrol");
      expect(db.findOneAndUpdate).toHaveBeenCalledOnce();
    });
  });

  // ──────────────────────────────────────────────────────────
  // Atomic guard failure (race condition)
  // Real text: formatText("NPC.MISSION_LIMIT_OR_CHANGED", {limit}) =
  //   "同時派遣任務已達上限（2 個），或 NPC 狀態已變更。"
  // ──────────────────────────────────────────────────────────
  describe("原子性寫入失敗（競態條件）", () => {
    it("findOneAndUpdate 回傳 null: 回傳含「上限」或「狀態已變更」的 error", async () => {
      vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
      db.findOne.mockResolvedValue(makeUser());
      db.findOneAndUpdate.mockResolvedValue(null);

      const result = await startMission(USER_ID, NPC_ID, "patrol");

      expect(result).toHaveProperty("error");
      // "同時派遣任務已達上限（2 個），或 NPC 狀態已變更。"
      expect(result.error).toMatch("狀態已變更");
    });
  });
});
