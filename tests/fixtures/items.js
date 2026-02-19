/**
 * 素材 fixture 工廠函式
 */

function makeItem(overrides = {}) {
  return {
    itemId: "1",
    itemName: "鐵礦石",
    itemLevel: 1,
    itemNum: 1,
    ...overrides,
  };
}

function makeFloorItem(floorN, type = "ore", overrides = {}) {
  return makeItem({
    itemId: `mat_floor${floorN}_${type}`,
    itemName: `Floor ${floorN} ${type}`,
    itemLevel: floorN,
    ...overrides,
  });
}

module.exports = { makeItem, makeFloorItem };
