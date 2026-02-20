const db = require("../../db.js");
const config = require("../config.js");
const roll = require("../roll.js");
const { pvpBattle } = require("../battle.js");
const { awardCol, deductCol } = require("../economy/col.js");
const { executeBankruptcy } = require("../economy/bankruptcy.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const ensureUserFields = require("../migration/ensureUserFields.js");
const { getCombinedModifier } = require("../title/titleModifier.js");
const { awardBattleExp } = require("../battleLevel.js");
const { isNewbie } = require("../time/gameTime.js");

const PVP = config.PVP;
const MODES = PVP.MODES;
const VALID_MODES = new Set(Object.values(MODES));

module.exports = async function (cmd, rawAttacker) {
  const attacker = await ensureUserFields(rawAttacker);

  // cmd 格式: [null, "pvp", targetUserId, weaponId, mode, wagerCol]
  const targetUserId = cmd[2];
  const weaponId = cmd[3];
  const mode = cmd[4] || MODES.HALF_LOSS;
  const wagerCol = parseInt(cmd[5], 10) || 0;

  // === 基本驗證（全部在體力扣除之前）===
  if (attacker.isInDebt) {
    return { error: "你目前有未清還的負債，無法發起決鬥！請先至帳單頁面還清負債。" };
  }
  if (!targetUserId) {
    return { error: "請選擇要挑戰的玩家。" };
  }
  if (attacker.userId === targetUserId) {
    return { error: "你不能挑戰自己！" };
  }
  if (!VALID_MODES.has(mode)) {
    return { error: "無效的決鬥模式。" };
  }
  if (weaponId === undefined || weaponId === null) {
    return { error: "請選擇要使用的武器。" };
  }
  const atkWeaponIndex = Number(weaponId);
  if (Number.isNaN(atkWeaponIndex) || !attacker.weaponStock?.[atkWeaponIndex]) {
    return { error: `錯誤！你沒有編號為 ${weaponId} 的武器。` };
  }

  // === 賭注驗證（First Strike / Half Loss）===
  if (mode !== MODES.TOTAL_LOSS) {
    if (!Number.isFinite(wagerCol) || wagerCol < PVP.WAGER_MIN) {
      return { error: `賭注不能低於 ${PVP.WAGER_MIN} Col。` };
    }
    if (wagerCol > PVP.WAGER_MAX) {
      return { error: `賭注不能超過 ${PVP.WAGER_MAX} Col。` };
    }
    // 預檢攻擊方 Col 是否足夠（避免扣體力後才失敗）
    if (wagerCol > 0 && (attacker.col || 0) < wagerCol) {
      return { error: `你的 Col 不足以支付 ${wagerCol} 的賭注。` };
    }
  }

  // === 每日上限 & 同一對手冷卻 ===
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayDuels = await db.count("duel_log", {
    attackerId: attacker.userId,
    timestamp: { $gte: todayStart.getTime() },
  });
  if (todayDuels >= PVP.DAILY_DUEL_LIMIT) {
    return { error: `今日決鬥次數已達上限（${PVP.DAILY_DUEL_LIMIT} 次）。` };
  }

  const lastDuel = await db.findOne("duel_log", {
    $or: [
      { attackerId: attacker.userId, defenderId: targetUserId },
      { attackerId: targetUserId, defenderId: attacker.userId },
    ],
    timestamp: { $gte: now - PVP.SAME_TARGET_COOLDOWN_MS },
  });
  if (lastDuel) {
    const remainSec = Math.ceil((lastDuel.timestamp + PVP.SAME_TARGET_COOLDOWN_MS - now) / 1000);
    return { error: `與該對手的冷卻尚未結束，請等待 ${remainSec} 秒。` };
  }

  // === 載入防守方（在體力扣除之前驗證）===
  const rawDefender = await db.findOne("user", { userId: targetUserId });
  if (!rawDefender) {
    return { error: "找不到該玩家，可能已陣亡或不存在。" };
  }
  const defender = await ensureUserFields(rawDefender);

  // 新手保護
  if (isNewbie(defender.gameCreatedAt)) {
    return { error: `${defender.name} 還在新手保護期內，無法被挑戰。` };
  }

  // 預檢防守方 Col（賭注模式）
  if (mode !== MODES.TOTAL_LOSS && wagerCol > 0 && (defender.col || 0) < wagerCol) {
    return { error: `${defender.name} 的 Col 不足以支付 ${wagerCol} 的賭注，決鬥取消。` };
  }

  // === 所有驗證通過，扣除體力 ===
  const staminaCost = PVP.STAMINA_COST.min + Math.floor(Math.random() * (PVP.STAMINA_COST.max - PVP.STAMINA_COST.min + 1));
  const staminaUpdated = await db.findOneAndUpdate(
    "user",
    { userId: attacker.userId, stamina: { $gte: staminaCost } },
    { $inc: { stamina: -staminaCost } },
    { returnDocument: "after" },
  );
  if (!staminaUpdated) {
    const freshAtk = await db.findOne("user", { userId: attacker.userId });
    return { error: `體力不足！決鬥需要 ${staminaCost} 點，目前剩餘 ${freshAtk?.stamina ?? 0} 點。` };
  }

  // 防守方武器
  const defWeaponIndex = defender.defenseWeaponIndex || 0;
  const defenderWeapon = defender.weaponStock?.[defWeaponIndex] || defender.weaponStock?.[0];

  // 防守方手無寸鐵（仍寫入 duel_log 以避免冷卻繞過）
  if (!defenderWeapon || !defender.weaponStock || defender.weaponStock.length === 0) {
    await increment(attacker.userId, "totalPvpWins");
    await increment(attacker.userId, "totalDuelsPlayed");
    await db.insertOne("duel_log", {
      attackerId: attacker.userId,
      defenderId: defender.userId,
      attackerName: attacker.name,
      defenderName: defender.name,
      winnerId: attacker.userId,
      loserId: defender.userId,
      duelMode: mode,
      wagerCol: 0,
      loserDied: false,
      timestamp: now,
    });
    await checkAndAward(attacker.userId);
    return {
      battleLog: [],
      winner: attacker.name,
      reward: `${defender.name} 手無寸鐵，無法應戰！\n**${attacker.name} 不戰而勝！**`,
      attackerName: attacker.name,
      defenderName: defender.name,
      defenderId: defender.userId,
      duelMode: mode,
      stamina: staminaUpdated.stamina,
      staminaCost,
    };
  }

  // === 賭注扣除（原子操作）===
  if (mode !== MODES.TOTAL_LOSS && wagerCol > 0) {
    const atkDeducted = await deductCol(attacker.userId, wagerCol);
    if (!atkDeducted) {
      // 退還體力
      await db.update("user", { userId: attacker.userId }, { $inc: { stamina: staminaCost } });
      return { error: `你的 Col 不足以支付 ${wagerCol} 的賭注。` };
    }
    const defDeducted = await deductCol(defender.userId, wagerCol);
    if (!defDeducted) {
      // 退還攻擊方賭注 + 體力
      await awardCol(attacker.userId, wagerCol);
      await db.update("user", { userId: attacker.userId }, { $inc: { stamina: staminaCost } });
      return { error: `${defender.name} 的 Col 不足以支付 ${wagerCol} 的賭注，決鬥取消。` };
    }
  }

  // === 組裝雙方 mods（對稱）===
  const atkTitle = attacker.title || null;
  const defTitle = defender.title || null;
  const atkRelics = attacker.bossRelics || [];
  const defRelics = defender.bossRelics || [];

  const attackerMods = {
    battleAtk: getCombinedModifier(atkTitle, atkRelics, "battleAtk"),
    battleDef: getCombinedModifier(atkTitle, atkRelics, "battleDef"),
    battleAgi: getCombinedModifier(atkTitle, atkRelics, "battleAgi"),
  };
  const defenderMods = {
    battleAtk: getCombinedModifier(defTitle, defRelics, "battleAtk"),
    battleDef: getCombinedModifier(defTitle, defRelics, "battleDef"),
    battleAgi: getCombinedModifier(defTitle, defRelics, "battleAgi"),
  };

  const attackerWeapon = attacker.weaponStock[atkWeaponIndex];

  // === 戰鬥 ===
  const battleResult = await pvpBattle(
    attacker, attackerWeapon,
    defender, defenderWeapon,
    attackerMods, defenderMods,
    mode,
  );

  let resultText = battleResult.log.join("\n");
  let rewardText = "";
  const socketEvents = [];
  const winnerId = battleResult.winner.userId;
  const loserId = battleResult.loser.userId;
  const winnerName = battleResult.winner.name;
  const loserName = battleResult.loser.name;

  resultText += `\n\n**${winnerName} 獲得了勝利！**`;

  // === 經濟處理 ===
  if (mode === MODES.TOTAL_LOSS) {
    // Total Loss 掠奪制：搶走 50% Col + 隨機 1 素材
    const freshLoser = await db.findOne("user", { userId: loserId });
    if (freshLoser) {
      const colToLoot = Math.floor((freshLoser.col || 0) * PVP.TOTAL_LOSS_COL_LOOT_RATE);
      if (colToLoot > 0) {
        const looted = await deductCol(loserId, colToLoot);
        if (looted) {
          await awardCol(winnerId, colToLoot);
          rewardText += `\n${winnerName} 搶走了 ${loserName} 的 ${colToLoot} Col！`;
        }
      }

      // 隨機搶 1 素材
      if (PVP.TOTAL_LOSS_STEAL_ITEM) {
        const loserItems = (freshLoser.itemStock || []).filter((it) => it.itemNum > 0);
        if (loserItems.length > 0) {
          const stolen = loserItems[Math.floor(Math.random() * loserItems.length)];
          const success = await db.atomicIncItem(loserId, stolen.itemId, stolen.itemLevel, stolen.itemName, -1);
          if (success) {
            await db.atomicIncItem(winnerId, stolen.itemId, stolen.itemLevel, stolen.itemName, 1);
            rewardText += `\n${winnerName} 從 ${loserName} 身上奪走了 1 個 [${stolen.itemName}]！`;
          }
        }
      }
    }
  } else if (wagerCol > 0) {
    // First Strike / Half Loss 賭注制
    const payout = Math.floor(wagerCol * 2 * (1 - PVP.WAGER_TAX));
    await awardCol(winnerId, payout);
    const tax = wagerCol * 2 - payout;
    rewardText += `\n${winnerName} 贏得賭注 ${payout} Col（系統稅 ${tax} Col）`;
  } else {
    rewardText += `\n榮譽決鬥——無 Col 交易。`;
  }

  // === 死亡 & 紅名（Total Loss 專屬）===
  let loserDied = false;
  if (mode === MODES.TOTAL_LOSS) {
    const freshLoserForDeath = await db.findOne("user", { userId: loserId });
    let deathChance = PVP.TOTAL_LOSS_BASE_DEATH_CHANCE;
    if (freshLoserForDeath) {
      const hasCol = (freshLoserForDeath.col || 0) > 0;
      const hasItems = (freshLoserForDeath.itemStock || []).some((it) => it.itemNum > 0);
      if (!hasCol && !hasItems) {
        deathChance += PVP.TOTAL_LOSS_POVERTY_DEATH_BONUS;
      }
    }
    deathChance = Math.min(deathChance, PVP.TOTAL_LOSS_DEATH_CAP);

    if (roll.d100Check(deathChance)) {
      loserDied = true;
      rewardText += `\n\n**${loserName} 在決鬥中被殺害了...角色已被刪除。**`;
      await executeBankruptcy(loserId, 0, 0, { cause: "pvp_total_loss" });
      await increment(winnerId, "duelKills");

      // 紅名判定：殺死非紅名玩家 → 變紅名
      if (freshLoserForDeath && !freshLoserForDeath.isPK) {
        await db.update("user", { userId: winnerId }, {
          $set: { isPK: true },
          $inc: { pkKills: 1 },
        });
        rewardText += `\n**${winnerName} 殺害了無罪玩家，被標記為紅名（プレイヤーキラー）！**`;
      }
    }
  }

  // === 統計 & 經驗 ===
  await increment(winnerId, "totalPvpWins");
  await increment(loserId, "totalPvpLosses");
  await increment(winnerId, "totalDuelsPlayed");
  await increment(loserId, "totalDuelsPlayed");

  if (mode === MODES.FIRST_STRIKE) await increment(winnerId, "firstStrikeWins");
  if (mode === MODES.HALF_LOSS) await increment(winnerId, "halfLossWins");
  if (mode === MODES.TOTAL_LOSS) await increment(winnerId, "totalLossWins");

  const expResult = await awardBattleExp(winnerId, config.BATTLE_LEVEL.EXP_PVP_WIN);
  if (expResult.leveled) {
    rewardText += `\n${winnerName} 的戰鬥等級提升至 Lv.${expResult.newLevel}！`;
  }

  await checkAndAward(winnerId);
  if (!loserDied) {
    await checkAndAward(loserId);
  }

  // === 寫入 duel_log ===
  await db.insertOne("duel_log", {
    attackerId: attacker.userId,
    defenderId: defender.userId,
    attackerName: attacker.name,
    defenderName: defender.name,
    winnerId,
    loserId,
    duelMode: mode,
    wagerCol: mode !== MODES.TOTAL_LOSS ? wagerCol : 0,
    loserDied,
    timestamp: now,
  });

  // === Socket 事件 ===
  socketEvents.push({
    event: "battle:result",
    data: {
      type: "pvp",
      attacker: attacker.name,
      defender: defender.name,
      winner: winnerName,
      duelMode: mode,
    },
  });

  return {
    battleLog: resultText + rewardText,
    winner: winnerName,
    loser: loserName,
    reward: rewardText,
    duelMode: mode,
    wagerCol: mode !== MODES.TOTAL_LOSS ? wagerCol : 0,
    attackerWeapon: { name: attackerWeapon.name, weaponName: attackerWeapon.weaponName },
    defenderWeapon: { name: defenderWeapon.name, weaponName: defenderWeapon.weaponName },
    attackerName: attacker.name,
    defenderName: defender.name,
    defenderId: defender.userId,
    loserDied,
    stamina: staminaUpdated.stamina,
    staminaCost,
    socketEvents,
    battleLevelUp: expResult.leveled ? expResult.newLevel : null,
  };
};
