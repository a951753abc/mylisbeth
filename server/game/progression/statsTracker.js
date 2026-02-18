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
