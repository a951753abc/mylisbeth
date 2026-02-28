import { describe, it, expect } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { applySpecialMechanics } = require("./specialMechanics.js");

function makePlayer(overrides = {}) {
  return {
    name: "Kirito",
    hp: 500,
    stats: { atk: 30, def: 15, agi: 12, cri: 8 },
    ...overrides,
  };
}

function makeBoss(specialMechanics = null) {
  return {
    name: "TestBoss",
    hp: 100000,
    stats: { atk: 50, def: 30, agi: 15, cri: 10 },
    specialMechanics,
  };
}

// ──────────────────────────────────────────────────────────────
// 無特殊機制
// ──────────────────────────────────────────────────────────────
describe("applySpecialMechanics — no mechanics", () => {
  it("returns empty array when boss has no specialMechanics", () => {
    const player = makePlayer();
    const boss = makeBoss(null);
    const logs = applySpecialMechanics(player, boss, "katana");
    expect(logs).toEqual([]);
  });

  it("does not set _ properties on player when no mechanics", () => {
    const player = makePlayer();
    const boss = makeBoss(null);
    applySpecialMechanics(player, boss, "katana");
    expect(player._agiPenaltyMult).toBeUndefined();
    expect(player._weaponAffinityMult).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────
// AGI 速度懲罰
// ──────────────────────────────────────────────────────────────
describe("applySpecialMechanics — agiPenalty", () => {
  const mechanics = {
    agiPenalty: {
      threshold: 14,
      damageMult: 0.4,
      descriptionCn: "幻影殘像：AGI 不足 14 時，傷害降為 40%",
    },
  };

  it("triggers when player AGI is below threshold", () => {
    const player = makePlayer({ stats: { atk: 30, def: 15, agi: 10, cri: 8 } });
    const boss = makeBoss(mechanics);
    const logs = applySpecialMechanics(player, boss, "katana");

    expect(player._agiPenaltyMult).toBe(0.4);
    expect(logs).toHaveLength(1);
    expect(logs[0].mechanic).toBe("agi_penalty");
    expect(logs[0].triggered).toBe(true);
    expect(logs[0].playerAgi).toBe(10);
    expect(logs[0].threshold).toBe(14);
    expect(logs[0].damageMult).toBe(0.4);
  });

  it("does not trigger when player AGI meets threshold", () => {
    const player = makePlayer({ stats: { atk: 30, def: 15, agi: 14, cri: 8 } });
    const boss = makeBoss(mechanics);
    const logs = applySpecialMechanics(player, boss, "katana");

    expect(player._agiPenaltyMult).toBeUndefined();
    expect(logs).toHaveLength(1);
    expect(logs[0].triggered).toBe(false);
  });

  it("does not trigger when player AGI exceeds threshold", () => {
    const player = makePlayer({ stats: { atk: 30, def: 15, agi: 20, cri: 8 } });
    const boss = makeBoss(mechanics);
    const logs = applySpecialMechanics(player, boss, "katana");

    expect(player._agiPenaltyMult).toBeUndefined();
    expect(logs[0].triggered).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// 武器類型親和
// ──────────────────────────────────────────────────────────────
describe("applySpecialMechanics — weaponAffinity", () => {
  const mechanics = {
    weaponAffinity: {
      weak: ["two_handed_axe", "mace"],
      resist: ["dagger", "rapier"],
      immune: ["shield"],
      weakMult: 1.5,
      resistMult: 0.5,
      immuneMult: 0.1,
      descriptionCn: "鋼殼護甲",
    },
  };

  it("applies weak multiplier for weak weapon type", () => {
    const player = makePlayer();
    const boss = makeBoss(mechanics);
    const logs = applySpecialMechanics(player, boss, "two_handed_axe");

    expect(player._weaponAffinityMult).toBe(1.5);
    expect(logs).toHaveLength(1);
    expect(logs[0].affinityType).toBe("weak");
    expect(logs[0].mult).toBe(1.5);
  });

  it("applies resist multiplier for resist weapon type", () => {
    const player = makePlayer();
    const boss = makeBoss(mechanics);
    const logs = applySpecialMechanics(player, boss, "dagger");

    expect(player._weaponAffinityMult).toBe(0.5);
    expect(logs[0].affinityType).toBe("resist");
  });

  it("applies immune multiplier for immune weapon type", () => {
    const player = makePlayer();
    const boss = makeBoss(mechanics);
    const logs = applySpecialMechanics(player, boss, "shield");

    expect(player._weaponAffinityMult).toBe(0.1);
    expect(logs[0].affinityType).toBe("immune");
  });

  it("neutral weapon type — no mult set", () => {
    const player = makePlayer();
    const boss = makeBoss(mechanics);
    const logs = applySpecialMechanics(player, boss, "katana");

    expect(player._weaponAffinityMult).toBeUndefined();
    expect(logs[0].affinityType).toBe("neutral");
    expect(logs[0].mult).toBe(1.0);
  });

  it("immune takes priority over resist", () => {
    const mech = {
      weaponAffinity: {
        weak: [],
        resist: ["shield"],
        immune: ["shield"],
        weakMult: 1.5,
        resistMult: 0.5,
        immuneMult: 0.1,
        descriptionCn: "test",
      },
    };
    const player = makePlayer();
    const boss = makeBoss(mech);
    const logs = applySpecialMechanics(player, boss, "shield");

    expect(player._weaponAffinityMult).toBe(0.1);
    expect(logs[0].affinityType).toBe("immune");
  });

  it("skips weaponAffinity when weaponType is null", () => {
    const player = makePlayer();
    const boss = makeBoss(mechanics);
    const logs = applySpecialMechanics(player, boss, null);

    expect(player._weaponAffinityMult).toBeUndefined();
    expect(logs).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────
// 兩種機制同時存在
// ──────────────────────────────────────────────────────────────
describe("applySpecialMechanics — both mechanics", () => {
  const mechanics = {
    agiPenalty: {
      threshold: 16,
      damageMult: 0.35,
      descriptionCn: "速度懲罰",
    },
    weaponAffinity: {
      weak: ["dagger", "rapier"],
      resist: ["shield"],
      immune: [],
      weakMult: 1.5,
      resistMult: 0.5,
      immuneMult: 0.1,
      descriptionCn: "武器親和",
    },
  };

  it("both trigger — low AGI + weak weapon", () => {
    const player = makePlayer({ stats: { atk: 30, def: 15, agi: 10, cri: 8 } });
    const boss = makeBoss(mechanics);
    const logs = applySpecialMechanics(player, boss, "dagger");

    expect(player._agiPenaltyMult).toBe(0.35);
    expect(player._weaponAffinityMult).toBe(1.5);
    expect(logs).toHaveLength(2);
    expect(logs[0].mechanic).toBe("agi_penalty");
    expect(logs[1].mechanic).toBe("weapon_affinity");
  });

  it("agi penalty triggers but weapon is neutral", () => {
    const player = makePlayer({ stats: { atk: 30, def: 15, agi: 10, cri: 8 } });
    const boss = makeBoss(mechanics);
    const logs = applySpecialMechanics(player, boss, "katana");

    expect(player._agiPenaltyMult).toBe(0.35);
    expect(player._weaponAffinityMult).toBeUndefined();
    expect(logs).toHaveLength(2);
    expect(logs[0].triggered).toBe(true);
    expect(logs[1].affinityType).toBe("neutral");
  });

  it("high AGI + resist weapon", () => {
    const player = makePlayer({ stats: { atk: 30, def: 15, agi: 20, cri: 8 } });
    const boss = makeBoss(mechanics);
    const logs = applySpecialMechanics(player, boss, "shield");

    expect(player._agiPenaltyMult).toBeUndefined();
    expect(player._weaponAffinityMult).toBe(0.5);
    expect(logs).toHaveLength(2);
    expect(logs[0].triggered).toBe(false);
    expect(logs[1].affinityType).toBe("resist");
  });
});

// ──────────────────────────────────────────────────────────────
// 邊界情況
// ──────────────────────────────────────────────────────────────
describe("applySpecialMechanics — edge cases", () => {
  it("empty immune array does not match any weapon", () => {
    const mech = {
      weaponAffinity: {
        weak: ["katana"],
        resist: ["bow"],
        immune: [],
        weakMult: 1.5,
        resistMult: 0.5,
        immuneMult: 0.1,
        descriptionCn: "test",
      },
    };
    const player = makePlayer();
    const boss = makeBoss(mech);
    const logs = applySpecialMechanics(player, boss, "shield");

    expect(player._weaponAffinityMult).toBeUndefined();
    expect(logs[0].affinityType).toBe("neutral");
  });

  it("uses default mults when not specified in data", () => {
    const mech = {
      weaponAffinity: {
        weak: ["katana"],
        resist: ["bow"],
        immune: ["shield"],
        descriptionCn: "test",
      },
    };
    const player = makePlayer();
    const boss = makeBoss(mech);

    // weak default = 1.5
    applySpecialMechanics(player, boss, "katana");
    expect(player._weaponAffinityMult).toBe(1.5);

    // resist default = 0.5
    const player2 = makePlayer();
    applySpecialMechanics(player2, makeBoss(mech), "bow");
    expect(player2._weaponAffinityMult).toBe(0.5);

    // immune default = 0.1
    const player3 = makePlayer();
    applySpecialMechanics(player3, makeBoss(mech), "shield");
    expect(player3._weaponAffinityMult).toBe(0.1);
  });
});
