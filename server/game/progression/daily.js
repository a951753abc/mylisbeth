const db = require("../../db.js");
const config = require("../config.js");
const { awardCol } = require("../economy/col.js");
const { checkAndAward } = require("./achievement.js");

const DAILY_MATERIAL_REWARDS = {
  2: [{ itemId: "mat_floor1_ore", itemLevel: 2, name: "コバルト鉱石", count: 1 }],
  4: [{ itemId: "mat_floor1_crystal", itemLevel: 2, name: "青銅の欠片", count: 2 }],
  5: [{ itemId: "mat_floor3_ore", itemLevel: 3, name: "魔獣の牙", count: 1 }],
};

const STREAK_TITLE_DAY = 7;
const STREAK_TITLE = "七日の鍛冶師";

function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isYesterday(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = d2 - d1;
  return diff >= 86400000 && diff < 172800000;
}

module.exports = async function claimDaily(userId) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: "請先建立角色" };

  const now = new Date();
  const lastClaim = user.lastDailyClaimAt ? new Date(user.lastDailyClaimAt) : null;

  if (lastClaim && isSameDay(lastClaim, now)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msLeft = tomorrow - now;
    const hoursLeft = Math.floor(msLeft / 3600000);
    const minutesLeft = Math.floor((msLeft % 3600000) / 60000);
    return {
      error: `今天已經領取過了！還有 ${hoursLeft} 小時 ${minutesLeft} 分鐘可再領。`,
    };
  }

  let streak = user.dailyLoginStreak || 0;
  if (lastClaim && isYesterday(lastClaim, now)) {
    streak += 1;
  } else {
    streak = 1;
  }

  const dayIndex = ((streak - 1) % 7);
  const colReward = config.COL_DAILY[dayIndex];
  const materialReward = DAILY_MATERIAL_REWARDS[dayIndex + 1] || [];

  await db.update("user", { userId }, {
    $set: {
      dailyLoginStreak: streak,
      lastDailyClaimAt: now,
      lastLoginAt: now,
    },
  });

  await awardCol(userId, colReward);

  for (const mat of materialReward) {
    for (let i = 0; i < mat.count; i++) {
      await db.saveItemToUser(userId, {
        itemId: mat.itemId,
        name: mat.name,
        level: { itemLevel: mat.itemLevel, text: mat.itemLevel === 3 ? "★★★" : "★★" },
      });
    }
  }

  if (streak >= STREAK_TITLE_DAY) {
    await db.update(
      "user",
      { userId },
      { $addToSet: { availableTitles: STREAK_TITLE } },
    );
    const freshUser = await db.findOne("user", { userId });
    if (!freshUser.title) {
      await db.update("user", { userId }, { $set: { title: STREAK_TITLE } });
    }
  }

  const newAchievements = await checkAndAward(userId);

  return {
    success: true,
    streak,
    dayIndex: dayIndex + 1,
    colReward,
    materialReward,
    newAchievements: newAchievements.map((a) => ({ id: a.id, name: a.name, nameCn: a.nameCn, titleReward: a.titleReward })),
  };
};
