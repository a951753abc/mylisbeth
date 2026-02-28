const db = require("../../db.js");

const VALID_STATS = [
  "totalForges",
  "totalMines",
  "totalAdventures",
  "totalPvpWins",
  "totalPvpLosses",
  "weaponsBroken",
  "totalBossAttacks",
  "yukiDefeats",
  "totalColEarned",
  // Season 3
  "npcDeaths",
  "debtCleared",
  // Season 3.5
  "totalShopSells",
  "laughingCoffinDefeats",
  // Season 4
  "totalSoloAdventures",
  // Season 5: PVP 決鬥
  "totalDuelsPlayed",
  "duelKills",
  "firstStrikeWins",
  "halfLossWins",
  "totalLossWins",
  // Season 6: 經濟改革
  "totalMissionRewards",
  "totalMissionsCompleted",
  "totalEscortMissions",
  "totalMarketSold",
  "totalMarketEarned",
  // Season 7: 暫停營業
  "totalPauses",
  // Season 8: 隨機事件擴充
  "mysteriousChestsOpened",
  "forgeInspirationReceived",
  "npcAwakenings",
  // Season 13: 遠征
  "totalExpeditions",
  "expeditionsSucceeded",
  "expeditions2Succeeded",
  // Season 10: 微笑棺木公會
  "lcGruntsKilled",
  "lcMembersKilled",
  "lcInfiltrations",
  "lcStealthSuccess",
];

async function increment(userId, statName, amount = 1) {
  if (!VALID_STATS.includes(statName)) return;
  await db.update(
    "user",
    { userId },
    { $inc: { [`stats.${statName}`]: amount } },
  );
}

module.exports = { increment };
