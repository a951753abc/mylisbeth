import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { buildPvePlayerSide, buildPvpFighter } = require("./fighterBuilder.js");

// PVP_BASE_HP = config.PVP.BASE_HP = 100
const PVP_BASE_HP = 100;

afterEach(() => {
  vi.restoreAllMocks();
});

// ──────────────────────────────────────────────────────────────
// buildPvePlayerSide
// ──────────────────────────────────────────────────────────────
describe("buildPvePlayerSide", () => {
  function makeWeapon(overrides = {}) {
    return {
      hp: 20,
      atk: 10,
      def: 5,
      agi: 3,
      cri: 8,
      innateEffects: [],
      ...overrides,
    };
  }

  function makeNpc(overrides = {}) {
    return {
      name: "Agil",
      hp: 30,
      ...overrides,
    };
  }

  it("builds fighter from weapon alone when npc has no effectiveStats", () => {
    const weapon = makeWeapon();
    const npc = makeNpc();

    const result = buildPvePlayerSide(weapon, npc);

    // hp = npc.hp + weapon.hp = 30 + 20 = 50
    expect(result.hp).toBe(50);
    expect(result.stats.atk).toBe(10);
    expect(result.stats.def).toBe(5);
    expect(result.stats.agi).toBe(3);
    expect(result.stats.cri).toBe(8);
    expect(result.name).toBe("Agil");
  });

  it("uses weapon cri default of 10 when weapon has no cri", () => {
    const weapon = makeWeapon({ cri: undefined });
    const npc = makeNpc();

    const result = buildPvePlayerSide(weapon, npc);

    expect(result.stats.cri).toBe(10);
  });

  it("handles missing weapon stats gracefully (all default to 0)", () => {
    const weapon = { innateEffects: [] };
    const npc = makeNpc({ hp: 50 });

    const result = buildPvePlayerSide(weapon, npc);

    expect(result.hp).toBe(50); // npc.hp + 0
    expect(result.stats.atk).toBe(0);
    expect(result.stats.def).toBe(0);
    expect(result.stats.agi).toBe(0);
    expect(result.stats.cri).toBe(10);
  });

  it("uses effectiveStats path when npc.isHiredNpc and npc.effectiveStats are present", () => {
    const weapon = makeWeapon({ hp: 10, atk: 6, def: 4, agi: 5, cri: 8 });
    const npc = makeNpc({
      isHiredNpc: true,
      effectiveStats: { hp: 100, atk: 10, def: 8, agi: 7 },
    });

    const result = buildPvePlayerSide(weapon, npc);

    // hp = es.hp + weapon.hp = 100 + 10 = 110
    expect(result.hp).toBe(110);
    // atk = weapon.atk + floor(es.atk * 0.5) = 6 + 5 = 11
    expect(result.stats.atk).toBe(11);
    // def = weapon.def + floor(es.def * 0.5) = 4 + 4 = 8
    expect(result.stats.def).toBe(8);
    // agi = max(weapon.agi, es.agi) = max(5, 7) = 7
    expect(result.stats.agi).toBe(7);
    // cri comes from weapon
    expect(result.stats.cri).toBe(8);
  });

  it("agi is weapon.agi when weapon agi exceeds npc effectiveStats agi", () => {
    const weapon = makeWeapon({ agi: 15 });
    const npc = makeNpc({
      isHiredNpc: true,
      effectiveStats: { hp: 100, atk: 10, def: 8, agi: 5 },
    });

    const result = buildPvePlayerSide(weapon, npc);

    expect(result.stats.agi).toBe(15);
  });

  it("title modifier battleAtk scales atk, minimum 1", () => {
    const weapon = makeWeapon({ atk: 10 });
    const npc = makeNpc();

    const result = buildPvePlayerSide(weapon, npc, { battleAtk: 1.5 });

    // Math.round(10 * 1.5) = 15
    expect(result.stats.atk).toBe(15);
  });

  it("title modifier battleAtk = 1 leaves atk unchanged", () => {
    const weapon = makeWeapon({ atk: 10 });
    const npc = makeNpc();

    const result = buildPvePlayerSide(weapon, npc, { battleAtk: 1 });

    expect(result.stats.atk).toBe(10);
  });

  it("title modifier battleDef scales def, minimum 0", () => {
    const weapon = makeWeapon({ def: 4 });
    const npc = makeNpc();

    const result = buildPvePlayerSide(weapon, npc, { battleDef: 0.5 });

    // Math.round(4 * 0.5) = 2
    expect(result.stats.def).toBe(2);
  });

  it("title modifier battleAgi scales agi, minimum 1", () => {
    const weapon = makeWeapon({ agi: 6 });
    const npc = makeNpc();

    const result = buildPvePlayerSide(weapon, npc, { battleAgi: 2.0 });

    // Math.round(6 * 2.0) = 12
    expect(result.stats.agi).toBe(12);
  });

  it("title modifier battleDef clamps to 0 minimum when result would be negative", () => {
    const weapon = makeWeapon({ def: 0 });
    const npc = makeNpc();

    // Math.round(0 * 0.1) = 0 → max(0, 0) = 0
    const result = buildPvePlayerSide(weapon, npc, { battleDef: 0.1 });

    expect(result.stats.def).toBeGreaterThanOrEqual(0);
  });

  it("exposes weapon innateEffects on result", () => {
    const effects = [{ effect: { type: "lifesteal", value: 0.2 } }];
    const weapon = makeWeapon({ innateEffects: effects });
    const npc = makeNpc();

    const result = buildPvePlayerSide(weapon, npc);

    expect(result.innateEffects).toEqual(effects);
  });

  it("returns empty innateEffects array when weapon has none", () => {
    const weapon = makeWeapon({ innateEffects: undefined });
    const npc = makeNpc();

    const result = buildPvePlayerSide(weapon, npc);

    expect(result.innateEffects).toEqual([]);
  });

  it("applies all three title modifiers together correctly", () => {
    const weapon = makeWeapon({ atk: 10, def: 4, agi: 6 });
    const npc = makeNpc();

    const result = buildPvePlayerSide(weapon, npc, {
      battleAtk: 2.0,
      battleDef: 0.5,
      battleAgi: 1.5,
    });

    expect(result.stats.atk).toBe(20);  // round(10*2.0)
    expect(result.stats.def).toBe(2);   // round(4*0.5)
    expect(result.stats.agi).toBe(9);   // round(6*1.5)
  });
});

// ──────────────────────────────────────────────────────────────
// buildPvpFighter
// ──────────────────────────────────────────────────────────────
describe("buildPvpFighter", () => {
  function makeWeapon(overrides = {}) {
    return {
      hp: 10,
      atk: 8,
      def: 4,
      agi: 3,
      cri: 9,
      innateEffects: [],
      ...overrides,
    };
  }

  function makeLvBonus(overrides = {}) {
    return {
      hpBonus: 0,
      atkMult: 1.0,
      defMult: 1.0,
      agiMult: 1.0,
      ...overrides,
    };
  }

  function makeMods(overrides = {}) {
    return {
      battleAtk: 1,
      battleDef: 1,
      battleAgi: 1,
      ...overrides,
    };
  }

  it("builds basic fighter with correct hp from PVP_BASE_HP + hpBonus + weapon.hp", () => {
    const weapon = makeWeapon({ hp: 10 });
    const lvBonus = makeLvBonus({ hpBonus: 20 });

    const result = buildPvpFighter("Klein", weapon, lvBonus, makeMods());

    // maxHp = 100 + 20 + 10 = 130
    expect(result.hp).toBe(130);
    expect(result.maxHp).toBe(130);
    expect(result.name).toBe("Klein");
  });

  it("hp and maxHp are always equal on construction", () => {
    const result = buildPvpFighter("Asuna", makeWeapon(), makeLvBonus(), makeMods());
    expect(result.hp).toBe(result.maxHp);
  });

  it("applies level atkMult to weapon atk", () => {
    const weapon = makeWeapon({ atk: 10 });
    const lvBonus = makeLvBonus({ atkMult: 1.5 });

    const result = buildPvpFighter("Kirito", weapon, lvBonus, makeMods());

    // round(10 * 1.5 * 1) = 15
    expect(result.stats.atk).toBe(15);
  });

  it("applies level defMult to weapon def", () => {
    const weapon = makeWeapon({ def: 6 });
    const lvBonus = makeLvBonus({ defMult: 2.0 });

    const result = buildPvpFighter("Heathcliff", weapon, lvBonus, makeMods());

    // round(6 * 2.0 * 1) = 12
    expect(result.stats.def).toBe(12);
  });

  it("applies level agiMult to weapon agi", () => {
    const weapon = makeWeapon({ agi: 4 });
    const lvBonus = makeLvBonus({ agiMult: 1.25 });

    const result = buildPvpFighter("Silica", weapon, lvBonus, makeMods());

    // round(4 * 1.25 * 1) = 5
    expect(result.stats.agi).toBe(5);
  });

  it("applies mods battleAtk multiplier on top of lvBonus.atkMult", () => {
    const weapon = makeWeapon({ atk: 10 });
    const lvBonus = makeLvBonus({ atkMult: 1.0 });
    const mods = makeMods({ battleAtk: 1.5 });

    const result = buildPvpFighter("Test", weapon, lvBonus, mods);

    // round(10 * 1.0 * 1.5) = 15
    expect(result.stats.atk).toBe(15);
  });

  it("applies mods battleDef multiplier on top of lvBonus.defMult", () => {
    const weapon = makeWeapon({ def: 10 });
    const lvBonus = makeLvBonus({ defMult: 1.0 });
    const mods = makeMods({ battleDef: 0.5 });

    const result = buildPvpFighter("Test", weapon, lvBonus, mods);

    // round(10 * 1.0 * 0.5) = 5
    expect(result.stats.def).toBe(5);
  });

  it("applies mods battleAgi multiplier on top of lvBonus.agiMult", () => {
    const weapon = makeWeapon({ agi: 8 });
    const lvBonus = makeLvBonus({ agiMult: 1.0 });
    const mods = makeMods({ battleAgi: 0.5 });

    const result = buildPvpFighter("Test", weapon, lvBonus, mods);

    // round(8 * 1.0 * 0.5) = 4
    expect(result.stats.agi).toBe(4);
  });

  it("atk minimum is 1 even if weapon has no atk", () => {
    const weapon = makeWeapon({ atk: 0 });
    const result = buildPvpFighter("Test", weapon, makeLvBonus(), makeMods());
    expect(result.stats.atk).toBeGreaterThanOrEqual(1);
  });

  it("def minimum is 0 even if weapon has no def", () => {
    const weapon = makeWeapon({ def: 0 });
    const result = buildPvpFighter("Test", weapon, makeLvBonus(), makeMods());
    expect(result.stats.def).toBeGreaterThanOrEqual(0);
  });

  it("agi minimum is 1 even if weapon has no agi", () => {
    const weapon = makeWeapon({ agi: 0 });
    const result = buildPvpFighter("Test", weapon, makeLvBonus(), makeMods());
    expect(result.stats.agi).toBeGreaterThanOrEqual(1);
  });

  it("uses weapon cri as-is", () => {
    const weapon = makeWeapon({ cri: 7 });
    const result = buildPvpFighter("Test", weapon, makeLvBonus(), makeMods());
    expect(result.stats.cri).toBe(7);
  });

  it("defaults cri to 10 when weapon has no cri", () => {
    const weapon = makeWeapon({ cri: undefined });
    const result = buildPvpFighter("Test", weapon, makeLvBonus(), makeMods());
    expect(result.stats.cri).toBe(10);
  });

  it("exposes weapon innateEffects on result", () => {
    const effects = [{ effect: { type: "stun", value: 30 } }];
    const weapon = makeWeapon({ innateEffects: effects });
    const result = buildPvpFighter("Test", weapon, makeLvBonus(), makeMods());
    expect(result.innateEffects).toEqual(effects);
  });

  it("returns empty innateEffects when weapon has none", () => {
    const weapon = makeWeapon({ innateEffects: undefined });
    const result = buildPvpFighter("Test", weapon, makeLvBonus(), makeMods());
    expect(result.innateEffects).toEqual([]);
  });

  it("uses PVP_BASE_HP = 100 as the base when hpBonus and weapon.hp are both zero", () => {
    const weapon = makeWeapon({ hp: 0 });
    const lvBonus = makeLvBonus({ hpBonus: 0 });

    const result = buildPvpFighter("Bare", weapon, lvBonus, makeMods());

    expect(result.maxHp).toBe(PVP_BASE_HP);
  });
});
