import { describe, it, expect, vi } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { processSkillAttack } = require("./skillCombat.js");
const { damCheck } = require("../battle/combatCalc.js");

function makeAttacker(overrides = {}) {
  return {
    name: "TestNpc",
    hp: 500,
    maxHp: 500,
    stats: { atk: 30, def: 15, agi: 12, cri: 8 },
    ...overrides,
  };
}

function makeDefender(overrides = {}) {
  return {
    name: "TestBoss",
    hp: 100000,
    stats: { atk: 50, def: 10, agi: 15, cri: 10 },
    ...overrides,
  };
}

function makeSkill(overrides = {}) {
  return {
    id: "test_skill",
    nameCn: "測試技能",
    nameJp: "テスト",
    color: "#ffffff",
    weaponType: "one_handed_sword",
    effects: [
      { type: "damage_mult", value: 1.0 },
      { type: "multi_hit", value: 1 },
    ],
    ...overrides,
  };
}

function makeSkillCtx() {
  return {
    skills: [],
    weaponType: "one_handed_sword",
    proficiency: 0,
    passives: [],
    conditionals: [],
    probabilities: [],
    katanaMasteryActive: false,
    katanaTriggerBonus: 0,
    katanaDamageBonus: 0,
    activeBoosts: { atk: 0, def: 0, agi: 0, cri: 0, evasion: 0, damageReduction: 0 },
    shieldHp: 0,
    healPerRound: 0,
    counterChance: 0,
    conditionalActivated: new Set(),
  };
}

// ──────────────────────────────────────────────────────────────
// Boss 特殊機制對劍技的影響
// ──────────────────────────────────────────────────────────────
describe("processSkillAttack — Boss special mechanics", () => {
  it("applies _agiPenaltyMult to skill damage", () => {
    const attacker = makeAttacker();
    attacker._agiPenaltyMult = 0.3;
    const defender = makeDefender();
    const skill = makeSkill();
    const ctx = makeSkillCtx();

    const hpBefore = defender.hp;
    const result = processSkillAttack(attacker, defender, skill, [], 0, ctx, damCheck);

    // 傷害應被 0.3 倍率削弱
    const damageDealt = hpBefore - defender.hp;
    expect(damageDealt).toBe(result.totalDamage);
    expect(result.log.innateEvents).toContainEqual({ type: "agi_penalty", mult: 0.3 });
  });

  it("applies _weaponAffinityMult (weak) to skill damage", () => {
    const attacker = makeAttacker();
    attacker._weaponAffinityMult = 1.5;
    const defender = makeDefender();
    const skill = makeSkill();
    const ctx = makeSkillCtx();

    const result = processSkillAttack(attacker, defender, skill, [], 0, ctx, damCheck);

    expect(result.log.innateEvents).toContainEqual({ type: "weapon_affinity", mult: 1.5 });
  });

  it("applies _weaponAffinityMult (resist) to skill damage", () => {
    const attacker = makeAttacker();
    attacker._weaponAffinityMult = 0.5;
    const defender = makeDefender();
    const skill = makeSkill();
    const ctx = makeSkillCtx();

    const result = processSkillAttack(attacker, defender, skill, [], 0, ctx, damCheck);

    expect(result.log.innateEvents).toContainEqual({ type: "weapon_affinity", mult: 0.5 });
  });

  it("applies both _agiPenaltyMult and _weaponAffinityMult", () => {
    const attacker = makeAttacker();
    attacker._agiPenaltyMult = 0.4;
    attacker._weaponAffinityMult = 1.5;
    const defender = makeDefender();
    const skill = makeSkill();
    const ctx = makeSkillCtx();

    const result = processSkillAttack(attacker, defender, skill, [], 0, ctx, damCheck);

    expect(result.log.innateEvents).toHaveLength(2);
    expect(result.log.innateEvents).toContainEqual({ type: "agi_penalty", mult: 0.4 });
    expect(result.log.innateEvents).toContainEqual({ type: "weapon_affinity", mult: 1.5 });
  });

  it("does not add innateEvents when no special mechanics", () => {
    const attacker = makeAttacker();
    const defender = makeDefender();
    const skill = makeSkill();
    const ctx = makeSkillCtx();

    const result = processSkillAttack(attacker, defender, skill, [], 0, ctx, damCheck);

    expect(result.log.innateEvents).toHaveLength(0);
  });

  it("agiPenalty reduces multi-hit skill total damage", () => {
    // 比較有無 AGI 懲罰的傷害差
    const skill = makeSkill({
      effects: [
        { type: "damage_mult", value: 1.0 },
        { type: "multi_hit", value: 3 },
      ],
    });
    const ctx = makeSkillCtx();

    // 無懲罰
    const atkNormal = makeAttacker();
    const defNormal = makeDefender();
    const normalResult = processSkillAttack(atkNormal, defNormal, skill, [], 0, ctx, damCheck);

    // 有懲罰（多次測試取平均應明顯較低）
    let penaltyTotal = 0;
    let normalTotal = 0;
    const trials = 100;
    for (let i = 0; i < trials; i++) {
      const atkP = makeAttacker();
      atkP._agiPenaltyMult = 0.3;
      const defP = makeDefender();
      const rP = processSkillAttack(atkP, defP, skill, [], 0, ctx, damCheck);
      penaltyTotal += rP.totalDamage;

      const atkN = makeAttacker();
      const defN = makeDefender();
      const rN = processSkillAttack(atkN, defN, skill, [], 0, ctx, damCheck);
      normalTotal += rN.totalDamage;
    }

    // 有 AGI 懲罰 0.3x 的平均傷害應明顯低於無懲罰（允許一些隨機浮動）
    expect(penaltyTotal).toBeLessThan(normalTotal * 0.6);
  });
});
