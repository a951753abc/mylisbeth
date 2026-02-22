import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { createRequire } from "module";
import Module from "module";
const require = createRequire(import.meta.url);

// ─── Strategy for mocking CJS modules with destructured imports ───────────────
//
// debtCheck.js does:
//   const { isSettlementDue, getNextSettlementTime } = require("../time/gameTime.js")
//   const { processSettlement } = require("./settlement.js")
//
// Because these are destructured at module load time, vi.spyOn on the source
// module object cannot intercept them (the local binding is already captured).
//
// Fix: inject mock entries into Node's module cache BEFORE debtCheck.js is
// first required. This ensures debtCheck.js sees the mock when it calls
// require("../time/gameTime.js") during its own evaluation.
//
// For db.js (accessed as db.findOne(...) — not destructured), vi.spyOn works.

// ─── Resolve absolute paths ───────────────────────────────────────────────────
const gameTimePath = require.resolve("../time/gameTime.js");
const settlementPath = require.resolve("./settlement.js");
const debtCheckPath = require.resolve("./debtCheck.js");

// ─── Create named mock objects (vi.fn() instances) ───────────────────────────
const gameTimeMock = {
  isSettlementDue: vi.fn(),
  getNextSettlementTime: vi.fn(),
  getGameDaysSince: vi.fn(),
  getCurrentGameDay: vi.fn(),
  isNewbie: vi.fn(),
};

const settlementMock = {
  processSettlement: vi.fn(),
  calculateBill: vi.fn(),
  payDebt: vi.fn(),
};

// ─── Inject mocks into Node's module cache ────────────────────────────────────
// Must happen before debtCheck.js is required so it captures the mocked exports.
function makeModuleCacheEntry(path, exports) {
  return { id: path, filename: path, loaded: true, exports };
}

Module._cache[gameTimePath] = makeModuleCacheEntry(gameTimePath, gameTimeMock);
Module._cache[settlementPath] = makeModuleCacheEntry(settlementPath, settlementMock);
// Clear debtCheck from cache so it re-evaluates with the injected dependencies.
delete Module._cache[debtCheckPath];

// ─── Load db first (used via object methods, not destructured) ────────────────
const db = require("../../db.js");

// ─── Install db spies — vi.spyOn works because db.js is a singleton object ───
vi.spyOn(db, "findOne").mockResolvedValue(null);
vi.spyOn(db, "findOneAndUpdate").mockResolvedValue(null);
vi.spyOn(db, "update").mockResolvedValue(undefined);

// ─── Now require debtCheck — it will use the mocked gameTime and settlement ───
const { checkSettlement, enforceDebtPenalties } = require("./debtCheck.js");

afterAll(() => {
  // Clean up Module._cache entries to prevent leaking mocks to other test files
  delete Module._cache[gameTimePath];
  delete Module._cache[settlementPath];
});

beforeEach(() => {
  // Reset call history and per-test return values.
  // vi.clearAllMocks() resets all mocks (spies + plain vi.fn()).
  // Do NOT call vi.restoreAllMocks() — it would destroy the spies.
  vi.clearAllMocks();
  // Re-apply sensible defaults after clearAllMocks wipes them.
  db.findOne.mockResolvedValue(null);
  db.findOneAndUpdate.mockResolvedValue(null);
  db.update.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// enforceDebtPenalties — pure function, no mocks needed
// ─────────────────────────────────────────────────────────────────────────────
describe("enforceDebtPenalties()", () => {
  it("user not in debt: canForge=true, canPvp=true, advRewardMult=1.0", () => {
    const result = enforceDebtPenalties({ isInDebt: false });
    expect(result).toEqual({ canForge: true, canPvp: true, advRewardMult: 1.0 });
  });

  it("user in debt: canForge=false, canPvp=false, advRewardMult=0.5", () => {
    const result = enforceDebtPenalties({ isInDebt: true });
    expect(result).toEqual({ canForge: false, canPvp: false, advRewardMult: 0.5 });
  });

  it("missing isInDebt field defaults to not in debt", () => {
    const result = enforceDebtPenalties({});
    expect(result).toEqual({ canForge: true, canPvp: true, advRewardMult: 1.0 });
  });

  it("advRewardMult is exactly 0.5 when in debt (not rounded)", () => {
    const { advRewardMult } = enforceDebtPenalties({ isInDebt: true });
    expect(advRewardMult).toBe(0.5);
  });

  it("advRewardMult is exactly 1.0 when not in debt", () => {
    const { advRewardMult } = enforceDebtPenalties({ isInDebt: false });
    expect(advRewardMult).toBe(1.0);
  });

  it("does not mutate the input object", () => {
    const user = { isInDebt: true };
    enforceDebtPenalties(user);
    expect(user).toEqual({ isInDebt: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkSettlement — DB-dependent, uses injected mocks
// ─────────────────────────────────────────────────────────────────────────────
describe("checkSettlement()", () => {
  // ── User not found ──────────────────────────────────────────────────────────
  describe("user not found", () => {
    it("returns { checked: false } when db.findOne returns null", async () => {
      db.findOne.mockResolvedValue(null);

      const result = await checkSettlement("missing-user");

      expect(result).toEqual({ checked: false });
    });

    it("does not call processSettlement when user is not found", async () => {
      db.findOne.mockResolvedValue(null);

      await checkSettlement("missing-user");

      expect(settlementMock.processSettlement).not.toHaveBeenCalled();
    });
  });

  // ── Settlement not due ─────────────────────────────────────────────────────
  describe("settlement not due", () => {
    it("returns { checked: true, settled: false } when settlement is not due", async () => {
      db.findOne.mockResolvedValue({
        userId: "user-1",
        businessPaused: false,
        nextSettlementAt: Date.now() + 999999,
      });
      gameTimeMock.isSettlementDue.mockReturnValue(false);

      const result = await checkSettlement("user-1");

      expect(result).toEqual({ checked: true, settled: false });
    });

    it("does not call processSettlement when settlement is not due", async () => {
      db.findOne.mockResolvedValue({ userId: "user-1", nextSettlementAt: 9999999999999 });
      gameTimeMock.isSettlementDue.mockReturnValue(false);

      await checkSettlement("user-1");

      expect(settlementMock.processSettlement).not.toHaveBeenCalled();
    });

    it("does not call db.update when settlement is not due and business is not paused", async () => {
      db.findOne.mockResolvedValue({ userId: "user-1", nextSettlementAt: 9999999999999 });
      gameTimeMock.isSettlementDue.mockReturnValue(false);

      await checkSettlement("user-1");

      expect(db.update).not.toHaveBeenCalled();
    });
  });

  // ── Business paused ─────────────────────────────────────────────────────────
  describe("business paused", () => {
    it("returns paused=true when businessPaused=true and settlement is due", async () => {
      db.findOne.mockResolvedValue({
        userId: "user-2",
        businessPaused: true,
        nextSettlementAt: Date.now() - 1000,
      });
      gameTimeMock.isSettlementDue.mockReturnValue(true);
      gameTimeMock.getNextSettlementTime.mockReturnValue(Date.now() + 86400000);

      const result = await checkSettlement("user-2");

      expect(result).toEqual({ checked: true, settled: false, paused: true });
    });

    it("pushes nextSettlementAt via db.update when paused and settlement is due", async () => {
      const futureTime = Date.now() + 86400000;
      db.findOne.mockResolvedValue({
        userId: "user-2",
        businessPaused: true,
        nextSettlementAt: Date.now() - 1000,
      });
      gameTimeMock.isSettlementDue.mockReturnValue(true);
      gameTimeMock.getNextSettlementTime.mockReturnValue(futureTime);

      await checkSettlement("user-2");

      expect(db.update).toHaveBeenCalledOnce();
      expect(db.update).toHaveBeenCalledWith(
        "user",
        { userId: "user-2" },
        { $set: { nextSettlementAt: futureTime } },
      );
    });

    it("returns paused=true but does NOT call db.update when paused and settlement is not due", async () => {
      db.findOne.mockResolvedValue({
        userId: "user-2",
        businessPaused: true,
        nextSettlementAt: Date.now() + 999999,
      });
      gameTimeMock.isSettlementDue.mockReturnValue(false);

      const result = await checkSettlement("user-2");

      expect(result).toEqual({ checked: true, settled: false, paused: true });
      expect(db.update).not.toHaveBeenCalled();
    });

    it("does not call processSettlement when business is paused", async () => {
      db.findOne.mockResolvedValue({
        userId: "user-2",
        businessPaused: true,
        nextSettlementAt: Date.now() - 1000,
      });
      gameTimeMock.isSettlementDue.mockReturnValue(true);
      gameTimeMock.getNextSettlementTime.mockReturnValue(Date.now() + 86400000);

      await checkSettlement("user-2");

      expect(settlementMock.processSettlement).not.toHaveBeenCalled();
    });
  });

  // ── Settlement due — lock logic ─────────────────────────────────────────────
  describe("settlement due — lock acquisition", () => {
    it("returns { checked: true, settled: false } when lock fails (concurrent request)", async () => {
      db.findOne.mockResolvedValue({
        userId: "user-3",
        businessPaused: false,
        nextSettlementAt: Date.now() - 1000,
      });
      gameTimeMock.isSettlementDue.mockReturnValue(true);
      // Lock fails: another concurrent request already updated nextSettlementAt.
      db.findOneAndUpdate.mockResolvedValue(null);

      const result = await checkSettlement("user-3");

      expect(result).toEqual({ checked: true, settled: false });
    });

    it("does not call processSettlement when lock fails", async () => {
      db.findOne.mockResolvedValue({
        userId: "user-3",
        businessPaused: false,
        nextSettlementAt: Date.now() - 1000,
      });
      gameTimeMock.isSettlementDue.mockReturnValue(true);
      db.findOneAndUpdate.mockResolvedValue(null);

      await checkSettlement("user-3");

      expect(settlementMock.processSettlement).not.toHaveBeenCalled();
    });

    it("uses $lte guard and returnDocument: 'before' when acquiring lock", async () => {
      db.findOne.mockResolvedValue({
        userId: "user-3",
        businessPaused: false,
        nextSettlementAt: Date.now() - 1000,
      });
      // Settlement due on initial check; not due on loop re-check (stop after 1 cycle).
      gameTimeMock.isSettlementDue
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      db.findOneAndUpdate.mockResolvedValue({ userId: "user-3" });
      settlementMock.processSettlement.mockResolvedValue({ settled: true, bill: 130, paid: true });

      await checkSettlement("user-3");

      const [, filter, , options] = db.findOneAndUpdate.mock.calls[0];
      expect(filter.userId).toBe("user-3");
      expect(filter.nextSettlementAt).toHaveProperty("$lte");
      expect(options).toEqual({ returnDocument: "before" });
    });

    it("calls processSettlement after acquiring lock and returns settled result", async () => {
      db.findOne.mockResolvedValue({
        userId: "user-4",
        businessPaused: false,
        nextSettlementAt: Date.now() - 1000,
      });
      // Settlement due on initial check; not due in loop re-check (stop after 1 cycle).
      gameTimeMock.isSettlementDue
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      db.findOneAndUpdate.mockResolvedValue({ userId: "user-4" });
      settlementMock.processSettlement.mockResolvedValue({ settled: true, bill: 200, paid: true });

      const result = await checkSettlement("user-4");

      expect(settlementMock.processSettlement).toHaveBeenCalledOnce();
      expect(settlementMock.processSettlement).toHaveBeenCalledWith("user-4");
      expect(result.checked).toBe(true);
      expect(result.settled).toBe(true);
    });

    it("spreads processSettlement result fields into the return value", async () => {
      db.findOne.mockResolvedValue({
        userId: "user-4",
        businessPaused: false,
        nextSettlementAt: Date.now() - 1000,
      });
      gameTimeMock.isSettlementDue
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      db.findOneAndUpdate.mockResolvedValue({ userId: "user-4" });
      settlementMock.processSettlement.mockResolvedValue({
        settled: true,
        bill: 350,
        paid: false,
        debt: 350,
        debtCycles: 1,
      });

      const result = await checkSettlement("user-4");

      expect(result.bill).toBe(350);
      expect(result.paid).toBe(false);
      expect(result.debt).toBe(350);
    });
  });

  // ── Multi-cycle catch-up ────────────────────────────────────────────────────
  describe("multi-cycle catch-up loop", () => {
    it("calls processSettlement multiple times when isSettlementDue keeps returning true", async () => {
      const userId = "user-5";

      // Initial user fetch (before lock).
      // Cycles 2 and 3 each re-fetch the user inside the loop (i > 0 branch).
      // Cycle 4 re-fetch returns a user, but isSettlementDue returns false → stop.
      db.findOne
        .mockResolvedValueOnce({ userId, businessPaused: false, nextSettlementAt: 1 })
        .mockResolvedValueOnce({ userId, nextSettlementAt: 1 })
        .mockResolvedValueOnce({ userId, nextSettlementAt: 1 })
        .mockResolvedValueOnce({ userId, nextSettlementAt: Date.now() + 99999 });

      // isSettlementDue calls:
      //   1 — initial due check → true (enter settlement path)
      //   2 — loop i=1 re-check → true (run cycle 2)
      //   3 — loop i=2 re-check → true (run cycle 3)
      //   4 — loop i=3 re-check → false (stop)
      gameTimeMock.isSettlementDue
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      db.findOneAndUpdate.mockResolvedValue({ userId });
      settlementMock.processSettlement.mockResolvedValue({ settled: true, bill: 130, paid: true });

      const result = await checkSettlement(userId);

      expect(settlementMock.processSettlement).toHaveBeenCalledTimes(3);
      expect(result.checked).toBe(true);
      expect(result.settled).toBe(true);
    });

    it("stops catch-up loop after MAX_CYCLES (10) even if isSettlementDue stays true", async () => {
      const userId = "user-6";

      // Each cycle (i > 0) re-fetches the user — always returns a valid doc.
      db.findOne.mockResolvedValue({ userId, businessPaused: false, nextSettlementAt: 1 });
      // isSettlementDue always true → forces MAX_CYCLES iterations.
      gameTimeMock.isSettlementDue.mockReturnValue(true);

      db.findOneAndUpdate.mockResolvedValue({ userId });
      settlementMock.processSettlement.mockResolvedValue({ settled: true, bill: 130, paid: true });

      await checkSettlement(userId);

      // MAX_CYCLES = 10: first iteration (i=0) skips re-check; cycles i=1..9 re-check.
      expect(settlementMock.processSettlement).toHaveBeenCalledTimes(10);
    });

    it("returns bankruptcy immediately when processSettlement signals bankruptcy mid-loop", async () => {
      const userId = "user-7";

      // Initial fetch: user exists. Cycle 2 re-fetch (i=1): user still exists.
      db.findOne
        .mockResolvedValueOnce({ userId, businessPaused: false, nextSettlementAt: 1 })
        .mockResolvedValueOnce({ userId, nextSettlementAt: 1 });

      // Initial due check → true; loop i=1 re-check → true (triggers cycle 2).
      gameTimeMock.isSettlementDue
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true);

      db.findOneAndUpdate.mockResolvedValue({ userId });

      // Cycle 1: normal settlement. Cycle 2: bankruptcy.
      settlementMock.processSettlement
        .mockResolvedValueOnce({ settled: true, bill: 130, paid: false, debt: 130, debtCycles: 1 })
        .mockResolvedValueOnce({ settled: true, bill: 130, paid: false, bankruptcy: true, bankruptcyInfo: { userId } });

      const result = await checkSettlement(userId);

      expect(result.bankruptcy).toBe(true);
      expect(result.checked).toBe(true);
      expect(result.settled).toBe(true);
      // Must stop immediately — must NOT call a 3rd time.
      expect(settlementMock.processSettlement).toHaveBeenCalledTimes(2);
    });

    it("returns bankruptcy flag when user document is deleted during catch-up", async () => {
      const userId = "user-8";

      // Initial fetch: user exists.
      // Cycle 2 re-fetch (i=1 branch): user has been deleted (bankruptcy already ran).
      db.findOne
        .mockResolvedValueOnce({ userId, businessPaused: false, nextSettlementAt: 1 })
        .mockResolvedValueOnce(null);

      // Initial due check → true; loop i=1 re-check triggers the re-fetch.
      gameTimeMock.isSettlementDue
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true);

      db.findOneAndUpdate.mockResolvedValue({ userId });
      // Cycle 1 completes normally.
      settlementMock.processSettlement.mockResolvedValueOnce({ settled: true, bill: 130, paid: true });

      const result = await checkSettlement(userId);

      // findOne returning null during loop triggers immediate return with bankruptcy flag.
      expect(result).toEqual({ checked: true, settled: true, bankruptcy: true });
      // processSettlement must NOT be called for cycle 2 since user is gone.
      expect(settlementMock.processSettlement).toHaveBeenCalledTimes(1);
    });
  });
});
