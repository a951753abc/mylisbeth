import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";

// CJS require 載入，取得共享物件參考
const _require = createRequire(import.meta.url);
const db = _require("../../db.js");
const colModule = _require("../economy/col.js");
const achievementModule = _require("./achievement.js");
const claimDaily = _require("./daily.js");

describe("claimDaily()", () => {
  beforeEach(() => {
    // vi.spyOn 直接替換 CJS 共享物件上的方法
    // daily.js 的 db 變數指向同一個物件，因此能正確攔截
    vi.spyOn(db, "findOne").mockResolvedValue(null);
    vi.spyOn(db, "update").mockResolvedValue(undefined);
    vi.spyOn(db, "saveItemToUser").mockResolvedValue(undefined);
    vi.spyOn(colModule, "awardCol").mockResolvedValue(undefined);
    vi.spyOn(achievementModule, "checkAndAward").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 工廠：建立使用者 document
  function makeUser(overrides = {}) {
    return {
      userId: "user1",
      dailyLoginStreak: 0,
      lastDailyClaimAt: null,
      achievements: [],
      title: null,
      availableTitles: [],
      col: 0,
      stats: {},
      bossContribution: { mvpCount: 0, bossesDefeated: 0 },
      ...overrides,
    };
  }

  it("使用者不存在時回傳 error", async () => {
    db.findOne.mockResolvedValue(null);
    const result = await claimDaily("nonexistent");
    expect(result).toHaveProperty("error");
    expect(result.error).toBe("請先建立角色");
  });

  it("首次領取成功，streak 變為 1", async () => {
    db.findOne.mockResolvedValue(makeUser({ lastDailyClaimAt: null }));
    const result = await claimDaily("user1");
    expect(result.success).toBe(true);
    expect(result.streak).toBe(1);
  });

  it("同一天重複領取回傳 error", async () => {
    const now = new Date();
    db.findOne.mockResolvedValue(makeUser({ lastDailyClaimAt: now.toISOString() }));
    const result = await claimDaily("user1");
    expect(result).toHaveProperty("error");
    expect(result.error).toMatch(/今天已經領取/);
  });

  it("昨天領取今天再領，streak 遞增", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    db.findOne.mockResolvedValue(
      makeUser({ lastDailyClaimAt: yesterday.toISOString(), dailyLoginStreak: 3 }),
    );
    const result = await claimDaily("user1");
    expect(result.success).toBe(true);
    expect(result.streak).toBe(4);
  });

  it("中斷連續（2 天前），streak 重置為 1", async () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    db.findOne.mockResolvedValue(
      makeUser({ lastDailyClaimAt: twoDaysAgo.toISOString(), dailyLoginStreak: 5 }),
    );
    const result = await claimDaily("user1");
    expect(result.success).toBe(true);
    expect(result.streak).toBe(1);
  });

  it("回傳物件包含 colReward 與 dayIndex", async () => {
    db.findOne.mockResolvedValue(makeUser());
    const result = await claimDaily("user1");
    expect(result).toHaveProperty("colReward");
    expect(result).toHaveProperty("dayIndex");
  });

  it("streak >= 7 時觸發稱號 db.update（含 availableTitles）", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const user = makeUser({ lastDailyClaimAt: yesterday.toISOString(), dailyLoginStreak: 6 });
    db.findOne
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({ ...user, title: null });

    const result = await claimDaily("user1");
    expect(result.success).toBe(true);
    expect(result.streak).toBe(7);

    const hasAddToSet = db.update.mock.calls.some(
      (call) => call[2]?.$addToSet?.availableTitles,
    );
    expect(hasAddToSet).toBe(true);
  });

  it("newAchievements 為陣列", async () => {
    db.findOne.mockResolvedValue(makeUser());
    const result = await claimDaily("user1");
    expect(Array.isArray(result.newAchievements)).toBe(true);
  });
});
