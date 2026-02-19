import { describe, it, expect } from "vitest";
import { calcStaminaState } from "./useStaminaTimer.js";

const MAX = 100;
const MS_PER_REGEN = 15_000;

describe("calcStaminaState", () => {
  it("體力已滿時回傳 isFull: true", () => {
    const result = calcStaminaState(100, MAX, Date.now() - 5000, Date.now());
    expect(result.isFull).toBe(true);
    expect(result.displayStamina).toBe(MAX);
    expect(result.secondsToNext).toBe(0);
    expect(result.secondsToFull).toBe(0);
  });

  it("lastRegenAt 為 null 時視為已滿", () => {
    const result = calcStaminaState(80, MAX, null, Date.now());
    expect(result.isFull).toBe(true);
    expect(result.displayStamina).toBe(MAX);
  });

  it("經過 15 秒應 +1 點體力", () => {
    const now = Date.now();
    const lastRegenAt = now - MS_PER_REGEN;
    const result = calcStaminaState(50, MAX, lastRegenAt, now);
    expect(result.displayStamina).toBe(51);
    expect(result.isFull).toBe(false);
  });

  it("經過 45 秒應 +3 點體力", () => {
    const now = Date.now();
    const lastRegenAt = now - MS_PER_REGEN * 3;
    const result = calcStaminaState(50, MAX, lastRegenAt, now);
    expect(result.displayStamina).toBe(53);
  });

  it("displayStamina 上限不超過 maxStamina", () => {
    const now = Date.now();
    // 給超長時間使體力應溢出
    const lastRegenAt = now - MS_PER_REGEN * 200;
    const result = calcStaminaState(50, MAX, lastRegenAt, now);
    expect(result.displayStamina).toBe(MAX);
    expect(result.isFull).toBe(true);
  });

  it("secondsToNext 應介於 1 和 15 之間", () => {
    const now = Date.now();
    // 剛好過了 7.5 秒，距下一點還有 7.5 秒
    const lastRegenAt = now - 7500;
    const result = calcStaminaState(50, MAX, lastRegenAt, now);
    expect(result.secondsToNext).toBeGreaterThanOrEqual(1);
    expect(result.secondsToNext).toBeLessThanOrEqual(15);
  });

  it("secondsToFull 計算正確：差 1 點時約 15 秒", () => {
    const now = Date.now();
    // 體力 99/100，剛好回復了一次（elapsed = 15000ms）
    const lastRegenAt = now - MS_PER_REGEN;
    const result = calcStaminaState(98, MAX, lastRegenAt, now);
    // displayStamina = 99，差 1 點，下一次回復在 15 秒後
    expect(result.displayStamina).toBe(99);
    // secondsToFull = ceil(0/1000) + 0 * 15 = 0 + 0 (next tick 就滿了)
    // 實際上 secondsToFull = ceil(msToNext/1000) + (remaining-1)*15
    // remaining = 100 - 99 = 1，secondsToFull = ceil(ms/1000) + 0
    expect(result.secondsToFull).toBe(result.secondsToNext);
  });

  it("isFull: false 時 secondsToFull > 0", () => {
    const now = Date.now();
    const lastRegenAt = now - 1000;
    const result = calcStaminaState(50, MAX, lastRegenAt, now);
    expect(result.isFull).toBe(false);
    expect(result.secondsToFull).toBeGreaterThan(0);
  });
});
