/**
 * 武器 fixture 工廠函式
 */

function makeWeapon(overrides = {}) {
  return {
    weaponId: "test_weapon_001",
    name: "測試劍",
    hp: 0,
    atk: 5,
    def: 2,
    agi: 3,
    cri: 8,
    durability: 10,
    rarity: "common",
    ...overrides,
  };
}

module.exports = { makeWeapon };
