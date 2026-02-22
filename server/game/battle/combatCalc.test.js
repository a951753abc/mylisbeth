import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// ─────────────────────────────────────────────
// Math helpers verified against roll.js:
//   d6()  = Math.floor(rand*6)+1
//   d66() = d6() + d6()  (two rand calls)
//   d100Check(n) = Math.floor(rand*100)+1 <= n
//
// Math.random() = 0.5  → d6=4, d66=8, d100Check(n): 51<=n
// Math.random() = 0.99 → d6=6, d66=12 (auto-hit)
// Math.random() = 0    → d6=1, d66=2
// ─────────────────────────────────────────────

const { hitCheck, damCheck, processAttack } = require("./combatCalc.js");

// COUNTER_RATE falls back to 0.3 because config.WEAPON_INNATE.COMBAT is absent
const COUNTER_RATE = 0.3;

afterEach(() => {
  vi.restoreAllMocks();
});

// ──────────────────────────────────────────────────────────────
// hitCheck
// ──────────────────────────────────────────────────────────────
describe("hitCheck", () => {
  it("auto-hit when atkRoll === 12 regardless of agi values", () => {
    // d66() returns 12 when both d6 = 6 (Math.random = 0.99)
    // First call pair (attacker roll) → 12, second call pair (defender roll) → 12
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    const result = hitCheck(1, 999);

    expect(result.success).toBe(true);
    expect(result.text).toBe("擲出了大成功！");
    expect(result.atkRoll).toBe(12);
  });

  it("hits when atkAct >= defAct (not auto-hit path)", () => {
    // Math.random=0.5 → d66()=8 for both attacker and defender
    // atkAct = 8 + atkAgi, defAct = 8 + defAgi
    // Use atkAgi=5, defAgi=0 → atkAct=13 > defAct=8 → hit
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = hitCheck(5, 0);

    expect(result.success).toBe(true);
    expect(result.text).toBe("成功命中。");
    expect(result.atkRoll).toBe(8);
    expect(result.defRoll).toBe(8);
    expect(result.atkAct).toBe(13);
    expect(result.defAct).toBe(8);
  });

  it("ties go to attacker (atkAct === defAct is a hit)", () => {
    // Both roll 8, both agi = 3 → atkAct = defAct = 11 → hit (>=)
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = hitCheck(3, 3);

    expect(result.success).toBe(true);
    expect(result.atkAct).toBe(result.defAct);
  });

  it("misses when atkAct < defAct", () => {
    // Math.random=0.5 → d66()=8 for both; atkAgi=0, defAgi=5
    // atkAct=8 < defAct=13 → miss
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = hitCheck(0, 5);

    expect(result.success).toBe(false);
    expect(result.text).toBe("攻擊被閃過了。");
    expect(result.atkAct).toBe(8);
    expect(result.defAct).toBe(13);
  });

  it("returns all roll detail fields", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const result = hitCheck(0, 0);
    expect(result).toHaveProperty("atkRoll");
    expect(result).toHaveProperty("defRoll");
    expect(result).toHaveProperty("atkAct");
    expect(result).toHaveProperty("defAct");
  });
});

// ──────────────────────────────────────────────────────────────
// damCheck
// ──────────────────────────────────────────────────────────────
describe("damCheck", () => {
  it("calculates basic damage: atk rolls minus def rolls, min 1", () => {
    // Math.random=0.5 → d66()=8
    // atk=2: atkDam = 8+8 = 16
    // def=2: defSum = 8+8 = 16
    // crit check: d66()=8, atkCri=10 → 8 < 10 → no crit
    // finalDamage = 16-16 = 0 → clamped to 1
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = damCheck(2, 10, 2);

    expect(result.damage).toBe(1);
    expect(result.isCrit).toBe(false);
    expect(result.critCount).toBe(0);
  });

  it("deals positive damage when atk total exceeds def total", () => {
    // Math.random=0.5 → d66()=8 each call
    // atk=3: atkDam=24, def=1: defSum=8, crit d66()=8 < 9 → no crit
    // finalDamage = 24-8 = 16
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = damCheck(3, 9, 1);

    expect(result.damage).toBe(16);
    expect(result.atkTotal).toBe(24);
    expect(result.defTotal).toBe(8);
  });

  it("triggers crit when d66() >= atkCri then stops when d66() falls below", () => {
    // Sequence: atk=1 → atkDam roll (8), def=0 → no defSum rolls,
    // crit check: first call = 0.99 → d66()=12 >= atkCri=9 → crit! criDam roll uses 0.99 → 12
    // next crit check: uses 0.5 → d66()=8 < 9 → loop stops
    // atkDam = 8 + 12 = 20, defSum = 0, finalDamage = 20
    const mockRandom = vi
      .spyOn(Math, "random")
      .mockReturnValueOnce(0.5) // d6 for atkDam[1] → 4
      .mockReturnValueOnce(0.5) // d6 for atkDam[1] → 4  (d66=8)
      .mockReturnValueOnce(0.99) // d6 for crit check → 6
      .mockReturnValueOnce(0.99) // d6 for crit check → 6  (d66=12, >= 9 → crit!)
      .mockReturnValueOnce(0.99) // d6 for criDam → 6
      .mockReturnValueOnce(0.99) // d6 for criDam → 6  (d66=12)
      .mockReturnValueOnce(0.5) // d6 for next crit check → 4
      .mockReturnValueOnce(0.5); // d6 for next crit check → 4  (d66=8 < 9 → stop)

    const result = damCheck(1, 9, 0);

    expect(result.isCrit).toBe(true);
    expect(result.critCount).toBe(1);
    expect(result.damage).toBe(20); // 8 + 12 = 20
    expect(result.text).toContain("會心一擊！");
    expect(mockRandom).toHaveBeenCalled();
  });

  it("does not trigger crit when d66() < atkCri", () => {
    // Math.random=0.5 → d66()=8 for all rolls; atkCri=9 → 8<9 → no crit
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = damCheck(1, 9, 0);

    expect(result.isCrit).toBe(false);
    expect(result.critCount).toBe(0);
  });

  it("clamps final damage to minimum 1 when def exceeds atk", () => {
    // atk=1→atkDam=8, def=5→defSum=40, crit: d66()=8<9 no crit
    // finalDamage = 8-40 = -32 → 1
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = damCheck(1, 9, 5);

    expect(result.damage).toBe(1);
  });

  it("includes finalDamage text in result", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const result = damCheck(1, 9, 0);
    expect(result.text).toContain("最終造成");
    expect(result.text).toContain("點傷害");
  });
});

// ──────────────────────────────────────────────────────────────
// processAttack
// ──────────────────────────────────────────────────────────────
describe("processAttack", () => {
  function makeAttacker(overrides = {}) {
    return {
      name: "Lisbeth",
      hp: 100,
      maxHp: 100,
      stats: { atk: 3, def: 1, agi: 5, cri: 10 },
      ...overrides,
    };
  }

  function makeDefender(overrides = {}) {
    return {
      name: "Goblin",
      hp: 50,
      maxHp: 50,
      stats: { atk: 2, def: 1, agi: 0, cri: 10 },
      ...overrides,
    };
  }

  it("records a log entry and returns defenderHp on hit", () => {
    // Math.random=0.5: attacker d66=8+agi=5→atkAct=13, defender d66=8+agi=0→defAct=8 → hit
    // atk=3: atkDam=24, def=1: defSum=8, crit d66=8<10 no crit → damage=16, defenderHp=50-16=34
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const attacker = makeAttacker();
    const defender = makeDefender();
    const log = [];

    const result = processAttack(attacker, defender, log, {}, {});

    expect(log).toHaveLength(1);
    expect(log[0].attacker).toBe("Lisbeth");
    expect(log[0].defender).toBe("Goblin");
    expect(log[0].hit).toBe(true);
    expect(log[0].damage).toBeGreaterThan(0);
    expect(result.defenderHp).toBe(defender.hp);
    expect(result.stunned).toBe(false);
  });

  it("records a miss and leaves defender HP unchanged", () => {
    // atkAgi=0, defAgi=5 → atkAct=8+0=8, defAct=8+5=13 → miss
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const attacker = makeAttacker({ stats: { atk: 3, def: 1, agi: 0, cri: 10 } });
    const defender = makeDefender({ stats: { atk: 2, def: 1, agi: 5, cri: 10 } });
    const initialHp = defender.hp;
    const log = [];

    const result = processAttack(attacker, defender, log, {}, {});

    expect(log[0].hit).toBe(false);
    expect(log[0].damage).toBe(0);
    expect(result.defenderHp).toBe(initialHp);
  });

  it("lifesteal heals attacker proportional to damage dealt", () => {
    // Hit guaranteed: atkAgi=5 vs defAgi=0
    // Math.random=0.5 → hit, damage=16, lifesteal=0.5 → healed=floor(16*0.5)=8
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const attacker = makeAttacker({ hp: 50, maxHp: 100 });
    const defender = makeDefender();
    const log = [];
    const atkCtx = { lifesteal: 0.5 };

    processAttack(attacker, defender, log, atkCtx, {});

    const lifestealEvent = log[0].innateEvents.find((e) => e.type === "lifesteal");
    expect(lifestealEvent).toBeDefined();
    expect(lifestealEvent.value).toBeGreaterThan(0);
    expect(attacker.hp).toBeGreaterThan(50);
  });

  it("lifesteal does not exceed attacker maxHp", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const attacker = makeAttacker({ hp: 99, maxHp: 100 });
    const defender = makeDefender();
    const log = [];

    processAttack(attacker, defender, log, { lifesteal: 1.0 }, {});

    expect(attacker.hp).toBeLessThanOrEqual(attacker.maxHp);
  });

  it("stun fires innate event when d100Check succeeds", () => {
    // Hit: atkAgi=5 vs defAgi=0 → guaranteed hit with random=0.5
    // stunChance=100 → d100Check(100) always true (51 <= 100)
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const attacker = makeAttacker();
    const defender = makeDefender();
    const log = [];

    const result = processAttack(attacker, defender, log, { stunChance: 100 }, {});

    expect(result.stunned).toBe(true);
    const stunEvent = log[0].innateEvents.find((e) => e.type === "stun");
    expect(stunEvent).toBeDefined();
  });

  it("stun does not fire when d100Check fails", () => {
    // stunChance=50 → d100Check(50): Math.random=0.5 → floor(0.5*100)+1=51 > 50 → false
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const attacker = makeAttacker();
    const defender = makeDefender();
    const log = [];

    const result = processAttack(attacker, defender, log, { stunChance: 50 }, {});

    expect(result.stunned).toBe(false);
  });

  it("counter damages attacker when defender triggers it", () => {
    // Hit: atkAgi=5 vs defAgi=0, counterChance=100, damage=16
    // counterDmg = max(1, floor(16 * 0.3)) = floor(4.8) = 4
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const attacker = makeAttacker();
    const defender = makeDefender({ hp: 100 });
    const initialAttackerHp = attacker.hp;
    const log = [];

    processAttack(attacker, defender, log, {}, { counterChance: 100 });

    const counterEvent = log[0].innateEvents.find((e) => e.type === "counter");
    expect(counterEvent).toBeDefined();
    expect(attacker.hp).toBeLessThan(initialAttackerHp);
    // counterDmg = max(1, floor(damage * COUNTER_RATE))
    expect(initialAttackerHp - attacker.hp).toBeGreaterThanOrEqual(1);
  });

  it("counter does not fire when defender is dead (hp <= 0)", () => {
    // counterChance=100 but defender HP is already 0 before counter check
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const attacker = makeAttacker();
    // Set defender HP so low that after damage it goes to 0 or below
    const defender = makeDefender({ hp: 1 });
    const log = [];

    processAttack(attacker, defender, log, {}, { counterChance: 100 });

    const counterEvent = log[0].innateEvents.find((e) => e.type === "counter");
    // defender.hp after hit: 1 - damage <= 0, so counter should NOT fire
    expect(counterEvent).toBeUndefined();
  });

  it("ignoreDef reduces effective defender def", () => {
    // With ignoreDef=1.0, effectiveDef = max(0, floor(def * (1-1.0))) = 0
    // So defSum=0, giving higher damage than without ignoreDef
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const attacker = makeAttacker();
    const defenderWith = makeDefender({ stats: { atk: 2, def: 4, agi: 0, cri: 10 } });
    const defenderWithout = makeDefender({ stats: { atk: 2, def: 4, agi: 0, cri: 10 }, hp: 50 });
    const logWith = [];
    const logWithout = [];

    processAttack(attacker, { ...defenderWith, hp: 50 }, logWith, { ignoreDef: 1.0 }, {});
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    processAttack(attacker, defenderWithout, logWithout, {}, {});

    expect(logWith[0].damage).toBeGreaterThan(logWithout[0].damage);
  });

  it("damageReduction reduces final damage for the defender", () => {
    // Hit guaranteed; damageReduction=0.5 halves the final damage
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const attacker = makeAttacker();
    const defender = makeDefender({ hp: 200 });
    const logReduced = [];
    processAttack(attacker, { ...defender, hp: 200 }, logReduced, {}, { damageReduction: 0.5 });

    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const defender2 = makeDefender({ hp: 200 });
    const logNormal = [];
    processAttack(attacker, defender2, logNormal, {}, {});

    expect(logReduced[0].damage).toBeLessThan(logNormal[0].damage);
    expect(logReduced[0].damage).toBeGreaterThanOrEqual(1);
  });

  it("evasionBoost on defender increases effective agi and can cause miss", () => {
    // atkAgi=0, defAgi=0, evasionBoost=10 → defEffectiveAgi=10
    // atkAct=8+0=8, defAct=8+10=18 → miss
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const attacker = makeAttacker({ stats: { atk: 3, def: 1, agi: 0, cri: 10 } });
    const defender = makeDefender({ stats: { atk: 2, def: 1, agi: 0, cri: 10 } });
    const log = [];

    processAttack(attacker, defender, log, {}, { evasionBoost: 10 });

    expect(log[0].hit).toBe(false);
  });

  it("damageMult scales final damage accordingly", () => {
    // damageMult=2.0 should double the damage (floor)
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const attacker = makeAttacker();
    const defender = makeDefender({ hp: 1000 });
    const logDouble = [];
    processAttack(attacker, { ...defender, hp: 1000 }, logDouble, { damageMult: 2.0 }, {});

    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const defender2 = makeDefender({ hp: 1000 });
    const logNormal = [];
    processAttack(attacker, defender2, logNormal, { damageMult: 1.0 }, {});

    expect(logDouble[0].damage).toBe(Math.max(1, Math.floor(logNormal[0].damage * 2.0)));
  });

  it("pushes attackLog to battleLog array", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const log = [];
    processAttack(makeAttacker(), makeDefender(), log, {}, {});
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ attacker: "Lisbeth", defender: "Goblin" });
  });

  it("works with no innate contexts passed (undefined)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const log = [];
    expect(() => processAttack(makeAttacker(), makeDefender(), log)).not.toThrow();
  });
});
