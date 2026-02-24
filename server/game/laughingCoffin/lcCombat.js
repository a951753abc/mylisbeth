const config = require("../config.js");
const db = require("../../db.js");
const roll = require("../roll.js");
const { lcBattleWithSkills } = require("../battle.js");
const { awardCol } = require("../economy/col.js");
const { executeBankruptcy } = require("../economy/bankruptcy.js");
const { killNpc } = require("../npc/npcManager.js");
const { increment } = require("../progression/statsTracker.js");
const { awardBattleExp } = require("../battleLevel.js");
const { getModifier } = require("../title/titleModifier.js");
const { getMemberDef, buildLcFighter, buildLcSkillContext, GRUNT_KILL_REWARD } = require("./lcMembers.js");
const { markMemberDead, decrementGruntCount, getAliveMembers } = require("./lcState.js");
const { addToLootPool } = require("./lcLoot.js");
const { destroyWeapon } = require("../weapon/weapon.js");
const { getActiveFloor } = require("../floor/activeFloor.js");

const LC_CFG = config.LAUGHING_COFFIN_GUILD;

/**
 * 選擇潛入戰鬥的對手（優先具名，其次雜魚）
 * @param {object} lcState - 當前 LC 狀態
 * @param {number} currentFloor
 * @returns {{ fighter, skillCtx, memberId, isGrunt, killReward, nameCn }}
 */
function pickOpponent(lcState, currentFloor) {
  const aliveMembers = (lcState.members || []).filter((m) => m.alive);

  if (aliveMembers.length > 0) {
    const pick = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
    const memberDef = getMemberDef(pick.id);
    return {
      fighter: buildLcFighter(memberDef, currentFloor),
      skillCtx: buildLcSkillContext(memberDef),
      memberId: pick.id,
      isGrunt: false,
      killReward: memberDef.killReward,
      nameCn: memberDef.nameCn,
    };
  }

  // 所有具名成員已死，派雜魚
  const { buildGruntFighter } = require("./lcMembers.js");
  const grunt = buildGruntFighter(currentFloor);
  return {
    fighter: grunt.fighter,
    skillCtx: grunt.skillCtx,
    memberId: null,
    isGrunt: true,
    killReward: GRUNT_KILL_REWARD,
    nameCn: grunt.nameCn,
  };
}

/**
 * 執行 LC 戰鬥（潛入 or 襲擊場景通用）
 * @param {object} user - 玩家資料
 * @param {string} actionType - "mine" | "soloAdv" | "adv"
 * @param {object} actionResult - 原始動作結果
 * @param {object} opponent - from pickOpponent
 * @param {object} combatInfo - { canFight, playerSide, weapon, isNpc, npcId, npcName }
 * @param {object|null} playerSkillCtx - 玩家方劍技上下文
 * @param {object} opts - { deathChances, context: "ambush"|"infiltration" }
 * @returns {object} 戰鬥結果
 */
async function executeLcCombat(user, actionType, actionResult, opponent, combatInfo, playerSkillCtx, opts) {
  if (!combatInfo.canFight) {
    return await processLose(user, actionType, actionResult, null, opponent, {
      autoLose: true, context: opts.context,
    });
  }

  const battleResult = lcBattleWithSkills(
    combatInfo.weapon,
    combatInfo.playerSide,
    {},
    playerSkillCtx,
    opponent.fighter,
    opponent.skillCtx,
  );

  if (battleResult.win === 1) {
    return await processWin(user, battleResult, opponent, opts.context);
  } else {
    return await processLose(user, actionType, actionResult, battleResult, opponent, {
      context: opts.context,
      deathChances: opts.deathChances,
    });
  }
}

/**
 * 勝利處理
 */
async function processWin(user, battleResult, opponent, context) {
  const reward = opponent.killReward;

  if (opponent.isGrunt) {
    await decrementGruntCount();
    await increment(user.userId, "lcGruntsKilled");
  } else {
    await markMemberDead(opponent.memberId, user.userId);
    await increment(user.userId, "lcMembersKilled");
  }

  await awardCol(user.userId, reward.col);
  if (reward.battleExp) {
    await awardBattleExp(user.userId, reward.battleExp);
  }
  await increment(user.userId, "laughingCoffinDefeats");

  return {
    outcome: "win",
    battleResult,
    enemyName: opponent.nameCn,
    isGrunt: opponent.isGrunt,
    memberId: opponent.memberId,
    rewards: { col: reward.col, battleExp: reward.battleExp || 0 },
    losses: {},
    context,
  };
}

/**
 * 敗北處理（搶奪 + 死亡判定）
 */
async function processLose(user, actionType, actionResult, battleResult, opponent, opts) {
  const losses = { col: 0, material: null, weapon: null, death: false };
  const lootForPool = { col: 0, materials: [], weapons: [] };

  // 搶 Col
  const freshUser = await db.findOne("user", { userId: user.userId });
  if (freshUser) {
    const userCol = freshUser.col || 0;
    const colToSteal = Math.min(
      userCol,
      Math.max(Math.floor(userCol * LC_CFG.AMBUSH_LOSE_COL_LOSS_RATE), LC_CFG.AMBUSH_LOSE_COL_MIN),
    );
    if (colToSteal > 0) {
      const result = await db.findOneAndUpdate(
        "user",
        { userId: user.userId, col: { $gte: colToSteal } },
        { $inc: { col: -colToSteal } },
      );
      if (result !== null) {
        losses.col = colToSteal;
        lootForPool.col = colToSteal;
      }
    }
  }

  // 搶素材 + 搶武器（合併讀取減少 DB 往返）
  const latestUser = await db.findOne("user", { userId: user.userId });

  if (LC_CFG.AMBUSH_LOSE_STEAL_MATERIAL && latestUser) {
    const items = (latestUser.itemStock || []).filter((it) => it.itemNum > 0);
    if (items.length > 0) {
      const stolen = items[Math.floor(Math.random() * items.length)];
      await db.atomicIncItem(user.userId, stolen.itemId, stolen.itemLevel, stolen.itemName, -1);
      losses.material = { name: stolen.itemName, level: stolen.itemLevel };
      lootForPool.materials.push({
        itemId: stolen.itemId,
        itemLevel: stolen.itemLevel,
        itemName: stolen.itemName,
      });
    }
  }

  if (roll.d100Check(LC_CFG.AMBUSH_LOSE_STEAL_WEAPON_CHANCE) && latestUser) {
    const weapons = latestUser.weaponStock || [];
    if (weapons.length >= 2) {
      const stolenIdx = Math.floor(Math.random() * weapons.length);
      const stolenWeapon = weapons[stolenIdx];
      if (stolenWeapon) {
        await destroyWeapon(user.userId, stolenIdx);
        losses.weapon = { name: stolenWeapon.weaponName, index: stolenIdx };
        lootForPool.weapons.push(stolenWeapon);
      }
    }
  }

  // 贓物加入贓物池
  await addToLootPool(lootForPool);

  // 死亡判定
  const deathChances = opts.deathChances || LC_CFG.AMBUSH_DEATH_CHANCE;
  const baseDeathChance = deathChances[actionType] || 0;
  const lcDeathMod = getModifier(user.title, "lcDeathChance");
  const deathChance = Math.max(1, Math.round(baseDeathChance * lcDeathMod));

  if (actionType === "adv") {
    const advNpcDied = actionResult?.npcResult?.died;
    if (!advNpcDied && roll.d100Check(deathChance)) {
      const advNpcId = actionResult?.advNpcId;
      const latestUser = await db.findOne("user", { userId: user.userId });
      const hiredNpcs = latestUser?.hiredNpcs || [];
      const targetNpc = advNpcId
        ? hiredNpcs.find((n) => n.npcId === advNpcId)
        : null;
      if (targetNpc) {
        await killNpc(user.userId, targetNpc.npcId, "微笑棺木襲擊");
        await increment(user.userId, "npcDeaths");
        losses.npcDeath = { name: targetNpc.name, npcId: targetNpc.npcId };
      }
    }
  } else if (roll.d100Check(deathChance)) {
    losses.death = true;
    const cause = actionType === "mine" ? "laughing_coffin_mine" : "laughing_coffin_solo";
    const bankruptcyInfo = await executeBankruptcy(user.userId, 0, 0, { cause });
    losses.bankruptcyInfo = bankruptcyInfo;
  }

  return {
    outcome: "lose",
    battleResult,
    enemyName: opponent.nameCn,
    isGrunt: opponent.isGrunt,
    memberId: opponent.memberId,
    rewards: {},
    losses,
    context: opts.context,
    bankruptcy: losses.death || false,
  };
}

module.exports = { pickOpponent, executeLcCombat };
