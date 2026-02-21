const db = require("../../db.js");
const config = require("../config.js");
const roll = require("../roll.js");
const { pvpRawBattle } = require("../battle.js");
const { awardCol, deductCol } = require("../economy/col.js");
const { executeBankruptcy } = require("../economy/bankruptcy.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const ensureUserFields = require("../migration/ensureUserFields.js");
const { getBattleLevelBonus, awardBattleExp } = require("../battleLevel.js");
const { isNewbie } = require("../time/gameTime.js");
const { getEffectiveStats, getCombinedBattleStats } = require("../npc/npcStats.js");
const { killNpc, resolveNpcBattle } = require("../npc/npcManager.js");
const { deductPvpStamina, deductWagers, buildCombatMods, validateDuelRequest, calcWagerPayout } = require("./pvpUtils.js");

const PVP = config.PVP;
const MODES = PVP.MODES;

module.exports = async function (cmd, rawAttacker) {
  const attacker = await ensureUserFields(rawAttacker);

  // cmd: [null, "pvpNpc", targetNpcId, weaponId, mode, wagerCol]
  const targetNpcId = cmd[2];
  const weaponId = cmd[3];
  const mode = cmd[4] || MODES.HALF_LOSS;
  const wagerCol = parseInt(cmd[5], 10) || 0;

  // === 共用驗證 ===
  const validation = validateDuelRequest(attacker, weaponId, mode, wagerCol);
  if (validation.error) return validation;
  const { atkWeaponIndex } = validation;

  // === NPC 決鬥專屬驗證 ===
  if (!targetNpcId) {
    return { error: "請選擇要挑戰的 NPC。" };
  }

  // === 同對手冷卻（NPC 決鬥也共用冷卻）===
  const now = Date.now();
  const lastDuel = await db.findOne("duel_log", {
    attackerId: attacker.userId,
    defenderNpcId: targetNpcId,
    timestamp: { $gte: now - PVP.SAME_TARGET_COOLDOWN_MS },
  });
  if (lastDuel) {
    const remainSec = Math.ceil((lastDuel.timestamp + PVP.SAME_TARGET_COOLDOWN_MS - now) / 1000);
    return { error: `與該 NPC 的冷卻尚未結束，請等待 ${remainSec} 秒。` };
  }

  // === 載入目標 NPC ===
  const npcDoc = await db.findOne("npc", { npcId: targetNpcId });
  if (!npcDoc || npcDoc.status !== "hired") {
    return { error: "該 NPC 不存在或未被雇用。" };
  }

  const ownerId = npcDoc.hiredBy;
  if (ownerId === attacker.userId) {
    return { error: "你不能挑戰自己的 NPC！" };
  }

  // 載入 NPC 擁有者
  const rawOwner = await db.findOne("user", { userId: ownerId });
  if (!rawOwner) {
    return { error: "該 NPC 的主人已不存在。" };
  }
  const owner = await ensureUserFields(rawOwner);

  // 新手保護（保護 NPC 擁有者）
  if (isNewbie(owner.gameCreatedAt)) {
    return { error: `${owner.name} 還在新手保護期內，其 NPC 無法被挑戰。` };
  }

  // 找到 NPC 在擁有者 hiredNpcs 中的資料
  const npcEntry = (owner.hiredNpcs || []).find((n) => n.npcId === targetNpcId);
  if (!npcEntry) {
    return { error: "該 NPC 已不在隊伍中。" };
  }

  // NPC 裝備的武器
  const npcWeapon = npcEntry.equippedWeaponIndex != null
    ? owner.weaponStock?.[npcEntry.equippedWeaponIndex]
    : null;
  if (!npcWeapon) {
    return { error: `${npcEntry.name} 沒有裝備武器，無法應戰。` };
  }

  // NPC 有效素質
  const effectiveStats = getEffectiveStats(npcEntry);
  if (!effectiveStats) {
    return { error: `${npcEntry.name} 體力不足（condition < 10%），無法應戰。` };
  }

  // === 賭注預檢（NPC 擁有者支付）===
  if (mode !== MODES.TOTAL_LOSS && wagerCol > 0 && (owner.col || 0) < wagerCol) {
    return { error: `${owner.name} 的 Col 不足以支付 ${wagerCol} 的賭注，決鬥取消。` };
  }

  // === 所有驗證通過，扣除體力 ===
  const staminaResult = await deductPvpStamina(attacker.userId);
  if (!staminaResult.ok) return { error: staminaResult.error };
  const { staminaCost } = staminaResult;

  // === 賭注扣除 ===
  const wagerResult = await deductWagers(attacker.userId, ownerId, owner.name, wagerCol, staminaCost, mode);
  if (!wagerResult.ok) return { error: wagerResult.error };

  // === 組裝戰鬥數據 ===
  const attackerMods = buildCombatMods(attacker.title || null, attacker.bossRelics || []);

  const attackerWeapon = attacker.weaponStock[atkWeaponIndex];
  const atkLvBonus = getBattleLevelBonus(attacker.battleLevel || 1);

  // 攻擊方（玩家）戰鬥數據
  const atkFighter = {
    name: attacker.name,
    hp: config.PVP.BASE_HP + atkLvBonus.hpBonus + (attackerWeapon.hp || 0),
    atk: Math.round((attackerWeapon.atk || 0) * atkLvBonus.atkMult * (attackerMods.battleAtk || 1)),
    def: Math.round((attackerWeapon.def || 0) * atkLvBonus.defMult * (attackerMods.battleDef || 1)),
    agi: Math.round((attackerWeapon.agi || 0) * atkLvBonus.agiMult * (attackerMods.battleAgi || 1)),
    cri: attackerWeapon.cri || 10,
  };

  // 防守方（NPC）戰鬥數據
  const npcBattleStats = getCombinedBattleStats(effectiveStats, npcWeapon);
  const defFighter = {
    name: npcEntry.name,
    hp: npcBattleStats.hp,
    atk: npcBattleStats.atk,
    def: npcBattleStats.def,
    agi: npcBattleStats.agi,
    cri: npcBattleStats.cri,
  };

  // === 戰鬥 ===
  const battleResult = pvpRawBattle(atkFighter, defFighter, mode);

  const playerWon = battleResult.winnerSide === "attacker";
  const winnerId = playerWon ? attacker.userId : ownerId;
  const loserId = playerWon ? ownerId : attacker.userId;
  const winnerName = playerWon ? attacker.name : npcEntry.name;
  const loserName = playerWon ? npcEntry.name : attacker.name;

  let resultText = battleResult.log.join("\n");
  let rewardText = "";
  const socketEvents = [];

  resultText += `\n\n**${winnerName} 獲得了勝利！**`;

  // === 經濟處理 ===
  if (mode === MODES.TOTAL_LOSS) {
    if (playerWon) {
      // 玩家贏：掠奪 NPC 擁有者的 Col
      const freshOwner = await db.findOne("user", { userId: ownerId });
      if (freshOwner) {
        const colToLoot = Math.floor((freshOwner.col || 0) * PVP.TOTAL_LOSS_COL_LOOT_RATE);
        if (colToLoot > 0) {
          const looted = await deductCol(ownerId, colToLoot);
          if (looted) {
            await awardCol(attacker.userId, colToLoot);
            rewardText += `\n${attacker.name} 從 ${owner.name} 處搶走了 ${colToLoot} Col！`;
          }
        }
      }
    } else {
      // NPC 贏：掠奪玩家的 Col（歸 NPC 擁有者）
      const freshAttacker = await db.findOne("user", { userId: attacker.userId });
      if (freshAttacker) {
        const colToLoot = Math.floor((freshAttacker.col || 0) * PVP.TOTAL_LOSS_COL_LOOT_RATE);
        if (colToLoot > 0) {
          const looted = await deductCol(attacker.userId, colToLoot);
          if (looted) {
            await awardCol(ownerId, colToLoot);
            rewardText += `\n${npcEntry.name} 從 ${attacker.name} 搶走了 ${colToLoot} Col（歸入 ${owner.name} 帳下）！`;
          }
        }
      }
    }
  } else if (wagerCol > 0) {
    const { payout, tax } = calcWagerPayout(wagerCol);
    await awardCol(winnerId, payout);
    if (playerWon) {
      rewardText += `\n${attacker.name} 贏得賭注 ${payout} Col（系統稅 ${tax} Col）`;
    } else {
      rewardText += `\n${npcEntry.name} 為 ${owner.name} 贏回 ${payout} Col（系統稅 ${tax} Col）`;
    }
  } else {
    rewardText += `\n榮譽決鬥——無 Col 交易。`;
  }

  // === 死亡處理（Total Loss 專屬）===
  let loserDied = false;
  let npcDied = false;

  if (mode === MODES.TOTAL_LOSS) {
    if (playerWon) {
      // NPC 敗北：NPC 面臨死亡判定
      let deathChance = PVP.TOTAL_LOSS_BASE_DEATH_CHANCE;
      deathChance = Math.min(deathChance, PVP.TOTAL_LOSS_DEATH_CAP);

      if (roll.d100Check(deathChance)) {
        npcDied = true;
        loserDied = true;
        rewardText += `\n\n**${npcEntry.name} 在決鬥中被殺害了...永遠離開了這個世界。**`;
        await killNpc(ownerId, targetNpcId, "NPC 決鬥陣亡");
      }
    } else {
      // 玩家敗北：玩家面臨死亡判定
      const freshAttacker = await db.findOne("user", { userId: attacker.userId });
      let deathChance = PVP.TOTAL_LOSS_BASE_DEATH_CHANCE;
      if (freshAttacker) {
        const hasCol = (freshAttacker.col || 0) > 0;
        const hasItems = (freshAttacker.itemStock || []).some((it) => it.itemNum > 0);
        if (!hasCol && !hasItems) {
          deathChance += PVP.TOTAL_LOSS_POVERTY_DEATH_BONUS;
        }
      }
      deathChance = Math.min(deathChance, PVP.TOTAL_LOSS_DEATH_CAP);

      if (roll.d100Check(deathChance)) {
        loserDied = true;
        rewardText += `\n\n**${attacker.name} 在決鬥中被殺害了...角色已被刪除。**`;
        await executeBankruptcy(attacker.userId, 0, 0, { cause: "pvp_total_loss" });
      }
    }
  }

  // === NPC 戰後處理（condition 損耗）===
  if (!npcDied) {
    const npcOutcome = playerWon ? "LOSE" : "WIN";
    const npcExpGain = playerWon ? 20 : 40;
    await resolveNpcBattle(ownerId, targetNpcId, npcOutcome, npcExpGain);
  }

  // === 統計 & 經驗 ===
  await increment(attacker.userId, "totalDuelsPlayed");
  if (playerWon) {
    await increment(attacker.userId, "totalPvpWins");
    const expResult = await awardBattleExp(attacker.userId, config.BATTLE_LEVEL.EXP_PVP_WIN);
    if (expResult.leveled) {
      rewardText += `\n${attacker.name} 的戰鬥等級提升至 Lv.${expResult.newLevel}！`;
    }
  } else {
    await increment(attacker.userId, "totalPvpLosses");
  }

  if (!loserDied || !npcDied) {
    await checkAndAward(attacker.userId);
  }

  // === 寫入 duel_log ===
  await db.insertOne("duel_log", {
    attackerId: attacker.userId,
    defenderId: ownerId,
    defenderNpcId: targetNpcId,
    attackerName: attacker.name,
    defenderName: npcEntry.name,
    defenderOwnerName: owner.name,
    winnerId: playerWon ? attacker.userId : ownerId,
    loserId: playerWon ? ownerId : attacker.userId,
    duelMode: mode,
    wagerCol: mode !== MODES.TOTAL_LOSS ? wagerCol : 0,
    loserDied,
    npcDied,
    isNpcDuel: true,
    timestamp: now,
  });

  // === Socket 事件 ===
  socketEvents.push({
    event: "battle:result",
    data: {
      userId: attacker.userId,
      type: "pvp-npc",
      attacker: attacker.name,
      defender: npcEntry.name,
      defenderOwner: owner.name,
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
    defenderNpc: { name: npcEntry.name, quality: npcEntry.quality },
    attackerName: attacker.name,
    defenderName: npcEntry.name,
    defenderOwnerName: owner.name,
    defenderId: ownerId,
    loserDied,
    npcDied,
    isNpcDuel: true,
    stamina: staminaResult.stamina,
    staminaCost,
    socketEvents,
  };
};
