/**
 * 使用者 fixture 工廠函式
 */

function makeUser(overrides = {}) {
  return {
    userId: "test_user_123",
    name: "TestUser",
    itemStock: [],
    weaponStock: [],
    forgeLevel: 1,
    forceLevel: 1,
    currentFloor: 1,
    floorProgress: {},
    col: 0,
    achievements: [],
    availableTitles: [],
    title: null,
    stats: {
      totalForges: 0,
      totalMines: 0,
      totalAdventures: 0,
      totalBossAttacks: 0,
      totalPvpWins: 0,
      totalColEarned: 0,
      weaponsBroken: 0,
      yukiDefeats: 0,
    },
    bossContribution: {
      mvpCount: 0,
      bossesDefeated: 0,
    },
    dailyLoginStreak: 0,
    lastDailyClaimAt: null,
    lastLoginAt: null,
    ...overrides,
  };
}

module.exports = { makeUser };
