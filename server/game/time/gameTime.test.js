import { describe, it, expect, vi, afterEach } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const {
  getGameDaysSince,
  getCurrentGameDay,
  isSettlementDue,
  getNextSettlementTime,
  isNewbie,
} = require("./gameTime.js");

// From config.js:
//   TIME_SCALE              = 5 * 60 * 1000 = 300_000 ms  (5 min = 1 game day)
//   SETTLEMENT.INTERVAL_GAME_DAYS = 30
//   NEWBIE_PROTECTION_DAYS  = 3

const TIME_SCALE = 5 * 60 * 1000;            // 300_000
const SETTLEMENT_INTERVAL = 30;               // game days
const NEWBIE_DAYS = 3;                        // game days
const EPOCH = new Date("2026-01-01T00:00:00Z").getTime();

afterEach(() => {
  vi.restoreAllMocks();
});

// ──────────────────────────────────────────────────────────────
// getGameDaysSince
// ──────────────────────────────────────────────────────────────
describe("getGameDaysSince", () => {
  it("returns 0 when startTime equals now (same millisecond)", () => {
    const now = Date.now();
    expect(getGameDaysSince(now, now)).toBe(0);
  });

  it("returns 0 for 0 ms elapsed", () => {
    const now = 1_000_000;
    expect(getGameDaysSince(now, now)).toBe(0);
  });

  it("returns 1 after exactly 5 minutes (one TIME_SCALE)", () => {
    const start = 1_000_000;
    const now = start + TIME_SCALE;
    expect(getGameDaysSince(start, now)).toBe(1);
  });

  it("returns 0 for just under 5 minutes (TIME_SCALE - 1 ms)", () => {
    const start = 1_000_000;
    const now = start + TIME_SCALE - 1;
    expect(getGameDaysSince(start, now)).toBe(0);
  });

  it("returns 2 after exactly 10 minutes (two TIME_SCALE)", () => {
    // Use a non-zero start so !startTime guard does not short-circuit
    const start = 1_000_000;
    const now = start + TIME_SCALE * 2;
    expect(getGameDaysSince(start, now)).toBe(2);
  });

  it("floors fractional game days (1.9 game days = 1)", () => {
    // Use a non-zero start so !startTime guard does not short-circuit
    const start = 1_000_000;
    const now = start + Math.floor(TIME_SCALE * 1.9);
    expect(getGameDaysSince(start, now)).toBe(1);
  });

  it("returns 0 when startTime is null (falsy)", () => {
    expect(getGameDaysSince(null, Date.now())).toBe(0);
  });

  it("returns 0 when startTime is undefined (falsy)", () => {
    expect(getGameDaysSince(undefined, Date.now())).toBe(0);
  });

  it("returns 0 when startTime is 0 (falsy)", () => {
    // !0 is truthy so 0 returns 0
    expect(getGameDaysSince(0, 1_000_000)).toBe(0);
  });

  it("uses Date.now() as default when now is not provided", () => {
    // Start 5 minutes in the past so result should be 1
    const start = Date.now() - TIME_SCALE;
    const result = getGameDaysSince(start);
    expect(result).toBeGreaterThanOrEqual(1);
  });
});

// ──────────────────────────────────────────────────────────────
// getCurrentGameDay
// ──────────────────────────────────────────────────────────────
describe("getCurrentGameDay", () => {
  it("returns 0 at the exact epoch (2026-01-01T00:00:00Z)", () => {
    expect(getCurrentGameDay(EPOCH)).toBe(0);
  });

  it("returns 1 exactly one TIME_SCALE after epoch", () => {
    expect(getCurrentGameDay(EPOCH + TIME_SCALE)).toBe(1);
  });

  it("returns 0 for just under one TIME_SCALE after epoch", () => {
    expect(getCurrentGameDay(EPOCH + TIME_SCALE - 1)).toBe(0);
  });

  it("returns 288 after exactly one real day (24h = 288 game days)", () => {
    // 24h / 5min = 288 game days
    const oneDayMs = 24 * 60 * 60 * 1000;
    expect(getCurrentGameDay(EPOCH + oneDayMs)).toBe(288);
  });

  it("is monotonically increasing with time", () => {
    const day1 = getCurrentGameDay(EPOCH + TIME_SCALE);
    const day2 = getCurrentGameDay(EPOCH + TIME_SCALE * 2);
    const day3 = getCurrentGameDay(EPOCH + TIME_SCALE * 100);
    expect(day2).toBeGreaterThan(day1);
    expect(day3).toBeGreaterThan(day2);
  });

  it("uses Date.now() as default when now is not provided", () => {
    // After the epoch (2026-01-01) the game day should be >= 0
    const result = getCurrentGameDay();
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("floors fractional game days", () => {
    // 1.5 game days after epoch → floor = 1
    const now = EPOCH + Math.floor(TIME_SCALE * 1.5);
    expect(getCurrentGameDay(now)).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────
// isSettlementDue
// ──────────────────────────────────────────────────────────────
describe("isSettlementDue", () => {
  it("returns false when nextSettlementAt is null", () => {
    expect(isSettlementDue(null, Date.now())).toBe(false);
  });

  it("returns false when nextSettlementAt is undefined", () => {
    expect(isSettlementDue(undefined, Date.now())).toBe(false);
  });

  it("returns false when nextSettlementAt is 0 (falsy)", () => {
    expect(isSettlementDue(0, Date.now())).toBe(false);
  });

  it("returns false when now is before nextSettlementAt", () => {
    const now = 1_000_000;
    const future = now + 10_000;
    expect(isSettlementDue(future, now)).toBe(false);
  });

  it("returns true when now equals nextSettlementAt (exact boundary)", () => {
    const t = 1_000_000;
    expect(isSettlementDue(t, t)).toBe(true);
  });

  it("returns true when now is past nextSettlementAt", () => {
    const past = 1_000_000;
    const now = past + 1;
    expect(isSettlementDue(past, now)).toBe(true);
  });

  it("returns true by 1 ms past due", () => {
    const due = Date.now() - 1;
    expect(isSettlementDue(due)).toBe(true);
  });

  it("uses Date.now() as default for now", () => {
    // A very old past timestamp should always be due
    const longPast = 1;
    expect(isSettlementDue(longPast)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// getNextSettlementTime
// ──────────────────────────────────────────────────────────────
describe("getNextSettlementTime", () => {
  it("returns lastSettlementAt + INTERVAL_GAME_DAYS * TIME_SCALE", () => {
    const last = 1_000_000;
    const expected = last + SETTLEMENT_INTERVAL * TIME_SCALE;
    expect(getNextSettlementTime(last)).toBe(expected);
  });

  it("adds exactly 30 game-days worth of milliseconds", () => {
    const last = 0;
    // 30 * 300_000 = 9_000_000 ms
    expect(getNextSettlementTime(last)).toBe(30 * TIME_SCALE);
  });

  it("is deterministic for the same input", () => {
    const last = 999_999;
    expect(getNextSettlementTime(last)).toBe(getNextSettlementTime(last));
  });

  it("next settlement is always in the future relative to lastSettlementAt", () => {
    const last = Date.now();
    expect(getNextSettlementTime(last)).toBeGreaterThan(last);
  });

  it("chains correctly: two intervals equals 60 game days offset", () => {
    const base = 0;
    const firstNext = getNextSettlementTime(base);
    const secondNext = getNextSettlementTime(firstNext);
    expect(secondNext).toBe(base + SETTLEMENT_INTERVAL * 2 * TIME_SCALE);
  });
});

// ──────────────────────────────────────────────────────────────
// isNewbie
// ──────────────────────────────────────────────────────────────
describe("isNewbie", () => {
  it("returns false when gameCreatedAt is null", () => {
    expect(isNewbie(null, Date.now())).toBe(false);
  });

  it("returns false when gameCreatedAt is undefined", () => {
    expect(isNewbie(undefined, Date.now())).toBe(false);
  });

  it("returns false when gameCreatedAt is 0 (falsy)", () => {
    expect(isNewbie(0, Date.now())).toBe(false);
  });

  it("returns true when exactly 0 game days have passed (just created)", () => {
    const now = 1_000_000;
    // daysSinceCreation = 0 < 3 → true
    expect(isNewbie(now, now)).toBe(true);
  });

  it("returns true within the first 3 game days (day 2)", () => {
    // Use a non-zero created so !gameCreatedAt guard does not short-circuit
    const created = 1_000_000;
    // 2 game days = 2 * TIME_SCALE ms elapsed
    const now = created + TIME_SCALE * 2;
    expect(isNewbie(created, now)).toBe(true);
  });

  it("returns true at day 2 and false at day 3 boundary (NEWBIE_PROTECTION_DAYS = 3)", () => {
    // Use a non-zero created so !gameCreatedAt guard does not short-circuit
    const created = 1_000_000;
    const dayTwo = created + TIME_SCALE * 2;
    const dayThree = created + TIME_SCALE * 3;

    expect(isNewbie(created, dayTwo)).toBe(true);
    // daysSinceCreation = 3 which is NOT < 3 → false
    expect(isNewbie(created, dayThree)).toBe(false);
  });

  it("returns false when exactly 3 game days have passed (boundary, exclusive)", () => {
    const created = 1_000_000;
    const now = created + TIME_SCALE * NEWBIE_DAYS;
    // daysSinceCreation = 3, which is NOT < 3
    expect(isNewbie(created, now)).toBe(false);
  });

  it("returns false after more than 3 game days", () => {
    const created = 1_000_000;
    const now = created + TIME_SCALE * 10;
    expect(isNewbie(created, now)).toBe(false);
  });

  it("uses Date.now() as default for now", () => {
    // A creation time 10 game days in the past should not be a newbie
    const created = Date.now() - TIME_SCALE * 10;
    expect(isNewbie(created)).toBe(false);
  });

  it("is true for a character created 1ms ago (< 1 game day)", () => {
    const now = Date.now();
    const justCreated = now - 1;
    expect(isNewbie(justCreated, now)).toBe(true);
  });
});
