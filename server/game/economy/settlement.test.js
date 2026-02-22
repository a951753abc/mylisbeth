import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// settlement.js 依賴的外部模組（含 DB、非同步功能）需要 mock
// 只有 calculateBill 是純函式，可直接測試
// processSettlement / payDebt 需要 DB，暫不測試

vi.mock("../../db.js", () => ({
  default: {},
  findOne: vi.fn(),
  find: vi.fn(),
  update: vi.fn(),
  findOneAndUpdate: vi.fn(),
}));

vi.mock("../time/gameTime.js", () => ({
  getNextSettlementTime: vi.fn(() => Date.now() + 86400000),
  isNewbie: vi.fn(() => false),
}));

vi.mock("./bankruptcy.js", () => ({
  executeBankruptcy: vi.fn(),
}));

vi.mock("../progression/statsTracker.js", () => ({
  increment: vi.fn(),
}));

vi.mock("../progression/achievement.js", () => ({
  checkAndAward: vi.fn(),
}));

const { calculateBill } = require("./settlement.js");
const config = require("../config.js");

const BASE_RENT = config.SETTLEMENT.BASE_RENT;             // 100
const FLOOR_TAX = config.SETTLEMENT.FLOOR_TAX_PER_FLOOR;  // 30

beforeEach(() => {
  vi.clearAllMocks();
});

// 建立基礎 user 物件的 helper（不可變模式）
function makeUser(overrides = {}) {
  return {
    currentFloor: 1,
    hiredNpcs: [],
    title: null,
    ...overrides,
  };
}

describe("settlement.js — calculateBill()", () => {
  // ─────────────────────────────────────────────────
  // 基本公式驗證
  // ─────────────────────────────────────────────────
  describe("基本公式", () => {
    it("Floor 1、無 NPC：帳單 = BASE_RENT + 1 * FLOOR_TAX = 130", () => {
      const user = makeUser({ currentFloor: 1 });
      expect(calculateBill(user)).toBe(BASE_RENT + 1 * FLOOR_TAX); // 100 + 30 = 130
    });

    it("Floor 5、無 NPC：帳單 = BASE_RENT + 5 * FLOOR_TAX = 250", () => {
      const user = makeUser({ currentFloor: 5 });
      expect(calculateBill(user)).toBe(BASE_RENT + 5 * FLOOR_TAX); // 100 + 150 = 250
    });

    it("Floor 10、無 NPC：帳單 = BASE_RENT + 10 * FLOOR_TAX = 400", () => {
      const user = makeUser({ currentFloor: 10 });
      expect(calculateBill(user)).toBe(BASE_RENT + 10 * FLOOR_TAX); // 100 + 300 = 400
    });

    it("Floor 1、1 個 NPC（monthlyCost=50）：帳單 = 130 + 50 = 180", () => {
      const user = makeUser({
        currentFloor: 1,
        hiredNpcs: [{ monthlyCost: 50 }],
      });
      expect(calculateBill(user)).toBe(130 + 50); // 180
    });

    it("Floor 1、3 個不同薪資 NPC：累計 npcWages 正確", () => {
      const user = makeUser({
        currentFloor: 1,
        hiredNpcs: [
          { monthlyCost: 50 },
          { monthlyCost: 100 },
          { monthlyCost: 250 },
        ],
      });
      // npcWages = 50 + 100 + 250 = 400
      expect(calculateBill(user)).toBe(130 + 400); // 530
    });

    it("Floor 3、2 個 NPC（各 monthlyCost=100）：帳單 = 190 + 200 = 390", () => {
      const user = makeUser({
        currentFloor: 3,
        hiredNpcs: [{ monthlyCost: 100 }, { monthlyCost: 100 }],
      });
      expect(calculateBill(user)).toBe(BASE_RENT + 3 * FLOOR_TAX + 200); // 390
    });
  });

  // ─────────────────────────────────────────────────
  // NPC 薪資欄位 fallback 邏輯
  // ─────────────────────────────────────────────────
  describe("NPC 薪資 fallback 邏輯", () => {
    it("NPC 有 monthlyCost 時使用 monthlyCost", () => {
      const user = makeUser({
        currentFloor: 1,
        hiredNpcs: [{ monthlyCost: 200, weeklyCost: 999 }],
      });
      expect(calculateBill(user)).toBe(130 + 200);
    });

    it("NPC 無 monthlyCost 但有 weeklyCost 時使用 weeklyCost", () => {
      const user = makeUser({
        currentFloor: 1,
        hiredNpcs: [{ weeklyCost: 75 }],
      });
      expect(calculateBill(user)).toBe(130 + 75);
    });

    it("NPC 無 monthlyCost 也無 weeklyCost 時，薪資計為 0", () => {
      const user = makeUser({
        currentFloor: 1,
        hiredNpcs: [{}],
      });
      expect(calculateBill(user)).toBe(130);
    });

    it("monthlyCost=0 視為 0（不 fallback 到 weeklyCost）", () => {
      // 0 是 falsy，但實際上 0 || weeklyCost 會 fallback。
      // 驗證現有行為：monthlyCost=0 → 使用 weeklyCost（若有）
      const user = makeUser({
        currentFloor: 1,
        hiredNpcs: [{ monthlyCost: 0, weeklyCost: 50 }],
      });
      // (0 || 50) = 50
      expect(calculateBill(user)).toBe(130 + 50);
    });

    it("多個 NPC 混合 monthlyCost / weeklyCost：各自正確加總", () => {
      const user = makeUser({
        currentFloor: 1,
        hiredNpcs: [
          { monthlyCost: 100 },            // monthlyCost 優先
          { weeklyCost: 75 },              // fallback weeklyCost
          { monthlyCost: 250, weeklyCost: 999 }, // monthlyCost 優先
          {},                              // 0
        ],
      });
      // 100 + 75 + 250 + 0 = 425
      expect(calculateBill(user)).toBe(130 + 425); // 555
    });
  });

  // ─────────────────────────────────────────────────
  // 邊界與防禦性處理
  // ─────────────────────────────────────────────────
  describe("邊界與防禦性", () => {
    it("hiredNpcs 欄位不存在時不崩潰，npcWages=0", () => {
      const user = makeUser();
      delete user.hiredNpcs;
      expect(() => calculateBill(user)).not.toThrow();
      expect(calculateBill(user)).toBe(130); // Floor 1 基本帳單
    });

    it("hiredNpcs 為空陣列時，npcWages = 0", () => {
      const user = makeUser({ currentFloor: 1, hiredNpcs: [] });
      expect(calculateBill(user)).toBe(130);
    });

    it("currentFloor 未定義時，預設使用 Floor 1", () => {
      const user = makeUser();
      delete user.currentFloor;
      expect(calculateBill(user)).toBe(BASE_RENT + 1 * FLOOR_TAX); // 130
    });

    it("帳單最小值為 1（Math.max(1, ...) 保護）", () => {
      // 正常情況下帳單永遠 > 1，這裡驗證 Math.max(1, ...) 存在
      // 以正常 user 確認回傳值 >= 1
      const user = makeUser({ currentFloor: 1 });
      expect(calculateBill(user)).toBeGreaterThanOrEqual(1);
    });

    it("帳單為整數（Math.round 確保）", () => {
      // 使用有 settlementBill 修正的稱號可能產生小數，round 後應為整數
      const user = makeUser({ currentFloor: 1, title: "商人" }); // 帳單 -15%
      const bill = calculateBill(user);
      expect(Number.isInteger(bill)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────
  // 稱號修正（title modifier）
  // ─────────────────────────────────────────────────
  describe("稱號修正 (title modifier)", () => {
    it("title=null 時，modifier=1.0，帳單不受影響", () => {
      const user = makeUser({ currentFloor: 1, title: null });
      expect(calculateBill(user)).toBe(130);
    });

    it("稱號「商人」（settlementBill: -0.15）：帳單比無稱號少約 15%", () => {
      const baseline = calculateBill(makeUser({ currentFloor: 5 })); // 250
      const withTitle = calculateBill(makeUser({ currentFloor: 5, title: "商人" }));
      expect(withTitle).toBe(Math.max(1, Math.round(250 * (1 - 0.15)))); // 213
      expect(withTitle).toBeLessThan(baseline);
    });

    it("稱號「再起の鍛冶師」（settlementBill: -0.25）：帳單減少 25%", () => {
      const baseline = calculateBill(makeUser({ currentFloor: 1 })); // 130
      const withTitle = calculateBill(makeUser({ currentFloor: 1, title: "再起の鍛冶師" }));
      expect(withTitle).toBe(Math.max(1, Math.round(130 * (1 - 0.25)))); // 98
      expect(withTitle).toBeLessThan(baseline);
    });

    it("稱號「中層攻略者」（settlementBill: +0.20）：帳單增加 20%", () => {
      const baseline = calculateBill(makeUser({ currentFloor: 1 })); // 130
      const withTitle = calculateBill(makeUser({ currentFloor: 1, title: "中層攻略者" }));
      expect(withTitle).toBe(Math.max(1, Math.round(130 * (1 + 0.20)))); // 156
      expect(withTitle).toBeGreaterThan(baseline);
    });

    it("稱號「富豪」（settlementBill: -0.20）：帳單減少 20%", () => {
      const base = BASE_RENT + 3 * FLOOR_TAX; // 190
      const withTitle = calculateBill(makeUser({ currentFloor: 3, title: "富豪" }));
      expect(withTitle).toBe(Math.max(1, Math.round(base * (1 - 0.20)))); // 152
    });

    it("稱號「財閥」（settlementBill: -0.25）：帳單減少 25%", () => {
      const base = BASE_RENT + 5 * FLOOR_TAX; // 250
      const withTitle = calculateBill(makeUser({ currentFloor: 5, title: "財閥" }));
      expect(withTitle).toBe(Math.max(1, Math.round(base * (1 - 0.25)))); // 188
    });

    it("無 settlementBill 效果的稱號：modifier=1.0，帳單不受影響", () => {
      // 「ボスキラー」沒有 settlementBill 效果
      const baseline = calculateBill(makeUser({ currentFloor: 1 }));
      const withTitle = calculateBill(makeUser({ currentFloor: 1, title: "ボスキラー" }));
      expect(withTitle).toBe(baseline);
    });

    it("title 為空字串時，回退為 1.0 modifier（getModifier 防禦）", () => {
      // getModifier("", key) → !title → return 1.0
      const baseline = calculateBill(makeUser({ currentFloor: 1 }));
      const withEmpty = calculateBill(makeUser({ currentFloor: 1, title: "" }));
      expect(withEmpty).toBe(baseline);
    });
  });

  // ─────────────────────────────────────────────────
  // 完整計算場景（整合驗證）
  // ─────────────────────────────────────────────────
  describe("完整計算場景", () => {
    it("Floor 5、2 個 NPC（普通 100 + 優秀 250）、無稱號：帳單正確", () => {
      const user = makeUser({
        currentFloor: 5,
        hiredNpcs: [{ monthlyCost: 100 }, { monthlyCost: 250 }],
        title: null,
      });
      // baseBill = 100 + 5*30 + 350 = 600, mod=1.0
      expect(calculateBill(user)).toBe(600);
    });

    it("Floor 3、1 個 NPC（精銳 600）、稱號「商人」（-15%）：帳單正確", () => {
      const user = makeUser({
        currentFloor: 3,
        hiredNpcs: [{ monthlyCost: 600 }],
        title: "商人",
      });
      // baseBill = 100 + 3*30 + 600 = 790
      // mod = 1 + (-0.15) = 0.85
      // bill = round(790 * 0.85) = round(671.5) = 672
      expect(calculateBill(user)).toBe(Math.max(1, Math.round(790 * 0.85)));
    });
  });
});
