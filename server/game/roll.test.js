import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { d6, d66, d100Check } = require("./roll.js");

describe("roll.js", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("d6()", () => {
    it("固定 random=0 時回傳 1（最小值）", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      expect(d6()).toBe(1);
    });

    it("固定 random=0.999 時回傳 6（最大值）", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.999);
      expect(d6()).toBe(6);
    });

    it("多次呼叫結果在 1-6 之間", () => {
      for (let i = 0; i < 100; i++) {
        const result = d6();
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
      }
    });
  });

  describe("d66()", () => {
    it("兩顆骰子都擲 1 時（random=0）回傳 2（最小值）", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      expect(d66()).toBe(2);
    });

    it("兩顆骰子都擲 6 時（random=0.999）回傳 12（最大值）", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.999);
      expect(d66()).toBe(12);
    });

    it("多次呼叫結果在 2-12 之間", () => {
      for (let i = 0; i < 200; i++) {
        const result = d66();
        expect(result).toBeGreaterThanOrEqual(2);
        expect(result).toBeLessThanOrEqual(12);
      }
    });
  });

  describe("d100Check(threshold)", () => {
    it("閾值 100 時（random=0.99）應回傳 true", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99);
      expect(d100Check(100)).toBe(true);
    });

    it("閾值 0 時任何 random 都回傳 false", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      expect(d100Check(0)).toBe(false);
    });

    it("閾值 50，roll=50 時應回傳 true（等於閾值）", () => {
      // random=0.49 → floor(0.49*100)+1 = 49+1 = 50
      vi.spyOn(Math, "random").mockReturnValue(0.49);
      expect(d100Check(50)).toBe(true);
    });

    it("閾值 50，roll=51 時應回傳 false", () => {
      // random=0.50 → floor(0.50*100)+1 = 50+1 = 51
      vi.spyOn(Math, "random").mockReturnValue(0.50);
      expect(d100Check(50)).toBe(false);
    });
  });
});
