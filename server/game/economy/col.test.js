import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// ─── CJS modules share a single object reference across all require() calls.
//     vi.spyOn mutates the shared object in-place, so the spied methods are
//     seen by col.js when it calls db.update / db.findOneAndUpdate.
//     vi.clearAllMocks() in beforeEach resets call history and return values
//     without destroying the spy stubs.
const db = require("../../db.js");
const { awardCol, deductCol } = require("./col.js");

// Install spies once — they persist for the lifetime of the test file.
// vi.clearAllMocks() resets .mock.calls and return values before each test.
vi.spyOn(db, "update").mockResolvedValue(undefined);
vi.spyOn(db, "findOneAndUpdate").mockResolvedValue(null);

beforeEach(() => {
  vi.clearAllMocks();
  // Restore sensible defaults after clearAllMocks wipes return values.
  db.update.mockResolvedValue(undefined);
  db.findOneAndUpdate.mockResolvedValue(null);
});

// ─────────────────────────────────────────────────────────────────────────────
// awardCol
// ─────────────────────────────────────────────────────────────────────────────
describe("awardCol()", () => {
  it("calls db.update with correct $inc for col and stats.totalColEarned", async () => {
    await awardCol("user-123", 500);

    expect(db.update).toHaveBeenCalledOnce();
    expect(db.update).toHaveBeenCalledWith(
      "user",
      { userId: "user-123" },
      { $inc: { col: 500, "stats.totalColEarned": 500 } },
    );
  });

  it("does nothing when amount is 0", async () => {
    await awardCol("user-123", 0);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("does nothing when amount is negative", async () => {
    await awardCol("user-123", -100);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("does nothing when amount is null", async () => {
    await awardCol("user-123", null);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("does nothing when amount is undefined", async () => {
    await awardCol("user-123", undefined);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("passes the correct userId to the DB filter", async () => {
    await awardCol("discord-999", 1);

    const [, filter] = db.update.mock.calls[0];
    expect(filter).toEqual({ userId: "discord-999" });
  });

  it("increments both col and stats.totalColEarned by the same amount", async () => {
    await awardCol("user-abc", 9999);

    const [, , update] = db.update.mock.calls[0];
    expect(update.$inc.col).toBe(9999);
    expect(update.$inc["stats.totalColEarned"]).toBe(9999);
  });

  it("works with amount = 1 (boundary minimum positive)", async () => {
    await awardCol("user-x", 1);
    expect(db.update).toHaveBeenCalledOnce();
  });

  it("resolves to undefined (returns nothing)", async () => {
    await expect(awardCol("user-123", 100)).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deductCol
// ─────────────────────────────────────────────────────────────────────────────
describe("deductCol()", () => {
  it("returns true when findOneAndUpdate returns a document (sufficient balance)", async () => {
    db.findOneAndUpdate.mockResolvedValue({ userId: "user-123", col: 400 });

    const result = await deductCol("user-123", 100);

    expect(result).toBe(true);
  });

  it("returns false when findOneAndUpdate returns null (insufficient balance)", async () => {
    db.findOneAndUpdate.mockResolvedValue(null);

    const result = await deductCol("user-123", 9999);

    expect(result).toBe(false);
  });

  it("passes correct collection name to findOneAndUpdate", async () => {
    db.findOneAndUpdate.mockResolvedValue({ col: 0 });

    await deductCol("user-123", 50);

    const [collection] = db.findOneAndUpdate.mock.calls[0];
    expect(collection).toBe("user");
  });

  it("passes correct userId in the query filter", async () => {
    db.findOneAndUpdate.mockResolvedValue({ col: 0 });

    await deductCol("discord-777", 50);

    const [, filter] = db.findOneAndUpdate.mock.calls[0];
    expect(filter.userId).toBe("discord-777");
  });

  it("includes $gte guard on col field in the query filter", async () => {
    db.findOneAndUpdate.mockResolvedValue({ col: 0 });

    await deductCol("user-123", 300);

    const [, filter] = db.findOneAndUpdate.mock.calls[0];
    expect(filter.col).toEqual({ $gte: 300 });
  });

  it("applies negative $inc equal to the deduction amount", async () => {
    db.findOneAndUpdate.mockResolvedValue({ col: 0 });

    await deductCol("user-123", 250);

    const [, , update] = db.findOneAndUpdate.mock.calls[0];
    expect(update.$inc.col).toBe(-250);
  });

  it("passes returnDocument: 'after' option", async () => {
    db.findOneAndUpdate.mockResolvedValue({ col: 0 });

    await deductCol("user-123", 50);

    const [, , , options] = db.findOneAndUpdate.mock.calls[0];
    expect(options).toEqual({ returnDocument: "after" });
  });

  it("returns true for exact balance match (boundary: col === amount)", async () => {
    db.findOneAndUpdate.mockResolvedValue({ userId: "user-123", col: 0 });

    const result = await deductCol("user-123", 100);

    expect(result).toBe(true);
  });

  it("calls findOneAndUpdate exactly once per invocation", async () => {
    db.findOneAndUpdate.mockResolvedValue(null);

    await deductCol("user-123", 100);

    expect(db.findOneAndUpdate).toHaveBeenCalledOnce();
  });
});
