const db = require("../../db.js");
const config = require("../config.js");
const roll = require("../roll.js");
const { awardCol } = require("../economy/col.js");
const { checkAndAward } = require("../progression/achievement.js");

async function distributeBossDrops(drops, participants, mvpUserId, totalDamage) {
  if (!drops?.length) return [];
  const results = [];
  for (const p of participants) {
    const isMvp = p.userId === mvpUserId;
    const ratio = totalDamage > 0 ? p.damage / totalDamage : 0;
    const chance = isMvp ? 100 : Math.min(90, Math.round(ratio * 200));
    if (roll.d100Check(chance)) {
      const drop = drops[Math.floor(Math.random() * drops.length)];
      const itemId = `boss_drop_${drop.name}`;
      const itemLevel = drop.rarity || 1;
      await db.atomicIncItem(p.userId, itemId, itemLevel, drop.name, 1);
      results.push({ userId: p.userId, playerName: p.name,
                     itemName: drop.name, itemLevel, isMvp });
    }
  }
  return results;
}

async function processLastAttackRelic(user, bossData) {
  let lastAttackDrop = null;
  let lastAttackAlreadyOwned = false;

  if (bossData.lastAttackDrop) {
    const relicDef = bossData.lastAttackDrop;
    const existingRelics = user.bossRelics || [];
    const alreadyHas = existingRelics.some((r) => r.id === relicDef.id);

    if (!alreadyHas) {
      const relicObj = {
        id: relicDef.id,
        name: relicDef.name,
        nameCn: relicDef.nameCn,
        bossFloor: relicDef.bossFloor,
        effects: { ...relicDef.effects },
        obtainedAt: new Date(),
      };
      await db.update(
        "user",
        { userId: user.userId },
        { $push: { bossRelics: relicObj } },
      );
      lastAttackDrop = relicObj;
    } else {
      lastAttackAlreadyOwned = true;
    }

    // LA Col 獎勵（每次 Last Attack 都給予）
    await awardCol(user.userId, config.COL_BOSS_LA_BONUS);

    // 追蹤 LA 次數
    await db.update(
      "user",
      { userId: user.userId },
      { $inc: { "bossContribution.lastAttackCount": 1 } },
    );
  }

  return { lastAttackDrop, lastAttackAlreadyOwned };
}

async function distributeBossColRewards(participants, mvp, totalDamage) {
  for (const p of participants) {
    const ratio = totalDamage > 0 ? p.damage / totalDamage : 0;
    const colReward = Math.round(200 + ratio * 800);
    const isMvp = mvp && p.userId === mvp.userId;
    const mvpBonus = isMvp ? config.COL_BOSS_MVP_BONUS : 0;

    await awardCol(p.userId, colReward + mvpBonus);
    await db.update(
      "user",
      { userId: p.userId },
      {
        $inc: {
          "bossContribution.totalDamage": p.damage,
          "bossContribution.bossesDefeated": 1,
          ...(isMvp ? { "bossContribution.mvpCount": 1 } : {}),
        },
      },
    );
    await checkAndAward(p.userId);
  }
}

module.exports = { distributeBossDrops, processLastAttackRelic, distributeBossColRewards };
