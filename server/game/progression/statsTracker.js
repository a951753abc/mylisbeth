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
  "totalLoans",
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
