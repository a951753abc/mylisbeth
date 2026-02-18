const db = require("../../db.js");

async function awardCol(userId, amount) {
  if (!amount || amount <= 0) return;
  await db.update(
    "user",
    { userId },
    { $inc: { col: amount, "stats.totalColEarned": amount } },
  );
}

async function deductCol(userId, amount) {
  const result = await db.findOneAndUpdate(
    "user",
    { userId, col: { $gte: amount } },
    { $inc: { col: -amount } },
    { returnDocument: "after" },
  );
  return result !== null;
}

module.exports = { awardCol, deductCol };
