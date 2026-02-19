import { describe, it, expect } from "vitest";
import { RARITY_CONFIG, getRarityConfig } from "./rarity.js";

describe("client/utils/rarity.js", () => {
  describe("RARITY_CONFIG", () => {
    it("包含 5 個稀有度設定", () => {
      const keys = Object.keys(RARITY_CONFIG);
      expect(keys).toHaveLength(5);
    });

    it("每個稀有度都有 label、color、glowColor、hammerHits、particles、extraDelay", () => {
      for (const [id, cfg] of Object.entries(RARITY_CONFIG)) {
        expect(cfg, `${id} 缺少 label`).toHaveProperty("label");
        expect(cfg, `${id} 缺少 color`).toHaveProperty("color");
        expect(cfg, `${id} 缺少 glowColor`).toHaveProperty("glowColor");
        expect(cfg, `${id} 缺少 hammerHits`).toHaveProperty("hammerHits");
        expect(cfg, `${id} 缺少 particles`).toHaveProperty("particles");
        expect(cfg, `${id} 缺少 extraDelay`).toHaveProperty("extraDelay");
      }
    });
  });

  describe("getRarityConfig(rarityId)", () => {
    it("common → label '普通'", () => {
      const cfg = getRarityConfig("common");
      expect(cfg.label).toBe("普通");
    });

    it("fine → label '優良'", () => {
      const cfg = getRarityConfig("fine");
      expect(cfg.label).toBe("優良");
    });

    it("rare → label '稀有'", () => {
      const cfg = getRarityConfig("rare");
      expect(cfg.label).toBe("稀有");
    });

    it("epic → label '史詩'", () => {
      const cfg = getRarityConfig("epic");
      expect(cfg.label).toBe("史詩");
    });

    it("legendary → label '傳說'", () => {
      const cfg = getRarityConfig("legendary");
      expect(cfg.label).toBe("傳說");
    });

    it("未知 id → fallback 到 common 設定", () => {
      const cfg = getRarityConfig("unknown_rarity");
      expect(cfg).toBe(RARITY_CONFIG.common);
    });

    it("undefined → fallback 到 common 設定", () => {
      const cfg = getRarityConfig(undefined);
      expect(cfg).toBe(RARITY_CONFIG.common);
    });

    it("legendary hammerHits 大於 common hammerHits", () => {
      expect(getRarityConfig("legendary").hammerHits).toBeGreaterThan(
        getRarityConfig("common").hammerHits,
      );
    });

    it("legendary particles 大於 common particles", () => {
      expect(getRarityConfig("legendary").particles).toBeGreaterThan(
        getRarityConfig("common").particles,
      );
    });
  });
});
