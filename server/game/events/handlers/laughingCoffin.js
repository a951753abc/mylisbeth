const config = require("../../config.js");
const db = require("../../../db.js");
const roll = require("../../roll.js");
const { pveBattleDirect } = require("../../battle.js");
const { awardCol } = require("../../economy/col.js");
const { executeBankruptcy } = require("../../economy/bankruptcy.js");
const { destroyWeapon } = require("../../weapon/weapon.js");
const { killNpc } = require("../../npc/npcManager.js");
const { increment } = require("../../progression/statsTracker.js");
const { getEffectiveStats } = require("../../npc/npcStats.js");

const LC = config.RANDOM_EVENTS.LAUGHING_COFFIN;
const SOLO = config.SOLO_ADV;

/**
 * 微笑棺木襲擊 handler
 * @param {object} user - 最新 user 文件
 * @param {string} actionType - "mine" | "soloAdv" | "adv"
 * @param {object} actionResult - 原始動作結果（用來取 NPC 資訊等）
 * @returns {object} eventResult
 */
async function laughingCoffin(user, actionType, actionResult) {
  const floor = user.currentFloor || 1;
  const scale = 1 + floor * 0.15;

  // 生成敵方：微笑棺木成員
  const enemyData = {
    name: "[Laughing Coffin] 殺手",
    category: "[Laughing Coffin]",
    hp: Math.round(LC.ENEMY_BASE.HP * scale),
    atk: Math.round(LC.ENEMY_BASE.ATK * scale),
    def: Math.round(LC.ENEMY_BASE.DEF * scale),
    agi: Math.round(LC.ENEMY_BASE.AGI * scale),
    cri: LC.ENEMY_BASE.CRI,
  };

  // 決定玩家方戰鬥資料
  const combatInfo = buildCombatInfo(user, actionType, actionResult);
  if (!combatInfo.canFight) {
    return await processLose(user, actionType, actionResult, null, {
      autoLose: true,
      enemy: enemyData,
      text: "微笑棺木的殺手從暗處現身！你手無寸鐵，毫無抵抗之力...",
    });
  }

  // 使用 pveBattleDirect 進行戰鬥（不走 getEneFromFloor 隨機選擇）
  const battleResult = await pveBattleDirect(
    combatInfo.weapon,
    combatInfo.playerSide,
    enemyData,
    {},
  );

  if (battleResult.win === 1) {
    return await processWin(user, battleResult, enemyData);
  } else if (battleResult.dead === 1) {
    return await processLose(user, actionType, actionResult, battleResult, {
      enemy: enemyData,
    });
  } else {
    return await processDraw(user, battleResult, enemyData);
  }
}

/**
 * 根據動作類型決定戰鬥者資訊
 */
function buildCombatInfo(user, actionType, actionResult) {
  const weapons = user.weaponStock || [];

  if (actionType === "adv") {
    const npcResult = actionResult.npcResult || {};
    if (npcResult.died) {
      return { canFight: false };
    }

    const hiredNpcs = user.hiredNpcs || [];
    // 使用 npcId 查找（而非 name），避免同名 NPC 問題
    const advNpcId = actionResult.advNpcId;
    const npc = advNpcId
      ? hiredNpcs.find((n) => n.npcId === advNpcId)
      : hiredNpcs.find((n) => n.name === actionResult.battleResult?.npcName);

    if (!npc) return { canFight: false };

    const effectiveStats = getEffectiveStats(npc);
    if (!effectiveStats) return { canFight: false };

    const weaponIdx = npc.equippedWeaponIndex;
    const weapon = weaponIdx != null ? weapons[weaponIdx] : null;
    if (!weapon) return { canFight: false };

    return {
      canFight: true,
      isNpc: true,
      npcId: npc.npcId,
      npcName: npc.name,
      playerSide: {
        name: npc.name,
        hp: effectiveStats.hp,
        isHiredNpc: true,
        effectiveStats,
      },
      weapon,
    };
  }

  // soloAdv / mine：鍛造師親自戰鬥
  const bestIdx = findBestWeaponIndex(weapons);
  if (bestIdx === null) return { canFight: false };

  const weapon = weapons[bestIdx];
  return {
    canFight: true,
    isNpc: false,
    playerSide: {
      name: user.name,
      hp: SOLO.BASE_HP,
      isHiredNpc: false,
    },
    weapon: {
      ...weapon,
      agi: Math.max(weapon.agi || 0, SOLO.BASE_AGI),
    },
  };
}

/**
 * 找出最強武器的 index（按 atk + def + agi + hp 排序）
 * 若全部為 null/undefined（稀疏陣列）則回傳 null
 */
function findBestWeaponIndex(weapons) {
  let bestIdx = null;
  let bestScore = -1;
  for (let i = 0; i < weapons.length; i++) {
    const w = weapons[i];
    if (!w) continue;
    const score = (w.atk || 0) + (w.def || 0) + (w.agi || 0) + (w.hp || 0);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * 勝利處理：獲得 100~300 Col 賞金
 */
async function processWin(user, battleResult, enemy) {
  const colReward =
    LC.WIN_COL_MIN +
    Math.floor(Math.random() * (LC.WIN_COL_MAX - LC.WIN_COL_MIN + 1));
  await awardCol(user.userId, colReward);
  await increment(user.userId, "laughingCoffinDefeats");

  return {
    eventId: "laughing_coffin",
    eventName: "微笑棺木襲擊",
    outcome: "win",
    text:
      "微笑棺木的殺手從暗處現身！經過激烈交戰，你成功擊退了殺手。" +
      `\n獲得賞金 ${colReward} Col`,
    battleResult: formatBattleResult(battleResult, enemy),
    rewards: { col: colReward },
    losses: {},
  };
}

/**
 * 平手處理：損失 20% Col（使用原子操作確認實際扣除量）
 */
async function processDraw(user, battleResult, enemy) {
  // 讀取最新 col 值以計算正確的損失
  const freshUser = await db.findOne("user", { userId: user.userId });
  const currentCol = freshUser?.col || 0;
  const colLoss = Math.floor(currentCol * LC.DRAW_COL_LOSS_RATE);
  let actualLoss = 0;

  if (colLoss > 0) {
    const result = await db.findOneAndUpdate(
      "user",
      { userId: user.userId, col: { $gte: colLoss } },
      { $inc: { col: -colLoss } },
      { returnDocument: "after" },
    );
    if (result !== null) {
      actualLoss = colLoss;
    }
  }

  return {
    eventId: "laughing_coffin",
    eventName: "微笑棺木襲擊",
    outcome: "draw",
    text:
      "微笑棺木的殺手從暗處現身！雙方僵持不下，殺手趁亂搶走了部分金幣後撤退。" +
      (actualLoss > 0 ? `\n損失 ${actualLoss} Col` : ""),
    battleResult: formatBattleResult(battleResult, enemy),
    rewards: {},
    losses: { col: actualLoss },
  };
}

/**
 * 敗北處理：搶奪 + 死亡判定
 */
async function processLose(user, actionType, actionResult, battleResult, opts) {
  const losses = { col: 0, material: null, weapon: null, death: false };
  const textParts = [];

  if (opts.autoLose) {
    textParts.push(opts.text);
  } else {
    textParts.push("微笑棺木的殺手從暗處現身！你在激戰中落敗...");
  }

  // 1. 搶走 50% Col（至少 50，但不超過玩家持有量）
  const freshUserForCol = await db.findOne("user", { userId: user.userId });
  if (!freshUserForCol) {
    return buildLoseResult(battleResult, opts.enemy, textParts, losses);
  }
  const userCol = freshUserForCol.col || 0;
  const colToSteal = Math.min(
    userCol,
    Math.max(
      Math.floor(userCol * LC.LOSE_COL_LOSS_RATE),
      LC.LOSE_COL_MIN,
    ),
  );
  if (colToSteal > 0) {
    const result = await db.findOneAndUpdate(
      "user",
      { userId: user.userId, col: { $gte: colToSteal } },
      { $inc: { col: -colToSteal } },
    );
    if (result !== null) {
      losses.col = colToSteal;
      textParts.push(`被搶走了 ${colToSteal} Col`);
    }
  }

  // 2. 隨機搶 1 素材
  const freshUser = await db.findOne("user", { userId: user.userId });
  if (!freshUser) {
    return buildLoseResult(battleResult, opts.enemy, textParts, losses);
  }

  const items = (freshUser.itemStock || []).filter((it) => it.itemNum > 0);
  if (LC.LOSE_STEAL_MATERIAL && items.length > 0) {
    const stolen = items[Math.floor(Math.random() * items.length)];
    await db.atomicIncItem(
      user.userId,
      stolen.itemId,
      stolen.itemLevel,
      stolen.itemName,
      -1,
    );
    losses.material = { name: stolen.itemName, level: stolen.itemLevel };
    textParts.push(`被搶走了 ${stolen.itemName}`);
  }

  // 3. 10% 搶武器（需 2+ 把）
  const weapons = freshUser.weaponStock || [];
  if (weapons.length >= 2 && roll.d100Check(LC.LOSE_STEAL_WEAPON_CHANCE)) {
    const stolenIdx = Math.floor(Math.random() * weapons.length);
    const stolenWeapon = weapons[stolenIdx];
    if (stolenWeapon) {
      await destroyWeapon(user.userId, stolenIdx);
      losses.weapon = { name: stolenWeapon.weaponName, index: stolenIdx };
      textParts.push(`${stolenWeapon.weaponName} 被奪走了！`);
    }
  }

  // 4. 死亡判定（依動作類型）
  const deathChance = LC.DEATH_CHANCE[actionType] || 0;

  if (actionType === "adv") {
    // NPC 冒險：NPC 替玩家擋刀
    // 先確認 NPC 是否在冒險中已死亡
    const advNpcDied = actionResult.npcResult?.died;
    if (!advNpcDied && roll.d100Check(deathChance)) {
      // 使用 npcId 查找（優先）；fallback 用 name
      const advNpcId = actionResult.advNpcId;
      const latestUser = await db.findOne("user", { userId: user.userId });
      const hiredNpcs = latestUser?.hiredNpcs || [];
      const targetNpc = advNpcId
        ? hiredNpcs.find((n) => n.npcId === advNpcId)
        : hiredNpcs.find((n) => n.name === actionResult.battleResult?.npcName);

      if (targetNpc) {
        await killNpc(user.userId, targetNpc.npcId, "微笑棺木襲擊");
        await increment(user.userId, "npcDeaths");
        losses.npcDeath = { name: targetNpc.name, npcId: targetNpc.npcId };
        textParts.push(`${targetNpc.name} 為了保護你而犧牲了...`);
      }
    }
  } else {
    // mine / soloAdv：玩家本人可能死亡
    if (roll.d100Check(deathChance)) {
      losses.death = true;
      const cause =
        actionType === "mine"
          ? "laughing_coffin_mine"
          : "laughing_coffin_solo";
      textParts.push("你被微笑棺木的殺手殺害了...");

      const bankruptcyInfo = await executeBankruptcy(user.userId, 0, 0, {
        cause,
      });
      losses.bankruptcyInfo = bankruptcyInfo;
    }
  }

  return buildLoseResult(battleResult, opts.enemy, textParts, losses);
}

function formatBattleResult(battleResult, enemy) {
  return {
    win: battleResult.win,
    dead: battleResult.dead,
    enemyName: enemy.name,
    log: battleResult.log,
  };
}

function buildLoseResult(battleResult, enemy, textParts, losses) {
  return {
    eventId: "laughing_coffin",
    eventName: "微笑棺木襲擊",
    outcome: "lose",
    text: textParts.join("\n"),
    battleResult: battleResult
      ? formatBattleResult(battleResult, enemy)
      : { win: 0, dead: 1, enemyName: enemy.name, log: [] },
    rewards: {},
    losses,
    bankruptcy: losses.death || false,
  };
}

module.exports = laughingCoffin;
