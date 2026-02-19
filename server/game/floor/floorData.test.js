import { describe, it, expect } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { getFloor, getFloorBoss, getFloorPlaces, getAllFloors } = require("./floorData.js");

describe("floorData.js", () => {
  describe("getFloor(floorNumber)", () => {
    it("取得樓層 1 的資料（存在）", () => {
      const floor = getFloor(1);
      expect(floor).toBeDefined();
      expect(floor.floorNumber).toBe(1);
    });

    it("無效樓層 fallback 到樓層 1", () => {
      const floor = getFloor(999);
      expect(floor).toBeDefined();
      expect(floor.floorNumber).toBe(1);
    });

    it("回傳的樓層包含 enemies 陣列", () => {
      const floor = getFloor(1);
      expect(Array.isArray(floor.enemies)).toBe(true);
    });

    it("回傳的樓層包含 boss 物件", () => {
      const floor = getFloor(1);
      expect(floor.boss).toBeDefined();
    });
  });

  describe("getFloorBoss(floorNumber)", () => {
    it("Floor 1 Boss 應有名稱", () => {
      const boss = getFloorBoss(1);
      expect(boss).toBeDefined();
      expect(boss.name).toBeDefined();
    });

    it("所有樓層的 Boss 都有 hp 與 atk", () => {
      const floors = getAllFloors();
      for (const floor of floors) {
        const boss = getFloorBoss(floor.floorNumber);
        expect(boss).toHaveProperty("hp");
        expect(boss).toHaveProperty("atk");
      }
    });
  });

  describe("getFloorPlaces(floorNumber)", () => {
    it("Floor 1 應有地點陣列", () => {
      const places = getFloorPlaces(1);
      expect(Array.isArray(places)).toBe(true);
    });
  });

  describe("getAllFloors()", () => {
    it("應回傳非空陣列", () => {
      const floors = getAllFloors();
      expect(Array.isArray(floors)).toBe(true);
      expect(floors.length).toBeGreaterThan(0);
    });

    it("每個樓層都有 floorNumber、enemies、boss", () => {
      const floors = getAllFloors();
      for (const floor of floors) {
        expect(floor).toHaveProperty("floorNumber");
        expect(floor).toHaveProperty("enemies");
        expect(floor).toHaveProperty("boss");
      }
    });
  });
});
