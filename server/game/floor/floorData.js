const floors = require("./floors.json");

const floorMap = {};
for (const floor of floors) {
  floorMap[floor.floorNumber] = floor;
}

function getFloor(floorNumber) {
  return floorMap[floorNumber] || floorMap[1];
}

function getFloorEnemiesByCategory(floorNumber, category) {
  const floor = getFloor(floorNumber);
  return floor.enemies.filter((e) => e.category === category);
}

function getFloorEnemy(floorNumber, category) {
  const enemies = getFloorEnemiesByCategory(floorNumber, category);
  if (enemies.length === 0) return null;
  return enemies[Math.floor(Math.random() * enemies.length)];
}

function getFloorPlaces(floorNumber) {
  const floor = getFloor(floorNumber);
  return floor.places;
}

function getFloorBoss(floorNumber) {
  const floor = getFloor(floorNumber);
  return floor.boss;
}

function getAllFloors() {
  return floors;
}

module.exports = { getFloor, getFloorEnemy, getFloorPlaces, getFloorBoss, getAllFloors };
