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
