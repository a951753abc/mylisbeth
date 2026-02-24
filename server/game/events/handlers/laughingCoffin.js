const config = require("../../config.js");
const db = require("../../../db.js");
const roll = require("../../roll.js");
const { formatText, getText } = require("../../textManager.js");
const { lcBattleWithSkills, pveBattleDirectWithSkills, buildSkillContext } = require("../../battle.js");
const { awardCol } = require("../../economy/col.js");
const { executeBankruptcy } = require("../../economy/bankruptcy.js");
const { destroyWeapon } = require("../../weapon/weapon.js");
const { killNpc } = require("../../npc/npcManager.js");
const { increment } = require("../../progression/statsTracker.js");
const { getEffectiveStats } = require("../../npc/npcStats.js");
const { getBattleLevelBonus, awardBattleExp } = require("../../battleLevel.js");
const { getModifier } = require("../../title/titleModifier.js");
const { getActiveFloor } = require("../../floor/activeFloor.js");
const { getSkill } = require("../../skill/skillRegistry.js");
const { getLcState, markMemberDead, decrementGruntCount } = require("../../laughingCoffin/lcState.js");
const { getMemberDef, buildLcFighter, buildLcSkillContext, buildGruntFighter, GRUNT_KILL_REWARD } = require("../../laughingCoffin/lcMembers.js");
const { addToLootPool } = require("../../laughingCoffin/lcLoot.js");

const LC_CFG = config.LAUGHING_COFFIN_GUILD;
const SOLO = config.SOLO_ADV;

/**
 * 微笑棺木主動襲擊 handler（流程 A）
 * 從事件系統觸發，優先派雜魚，否則具名成員
 */
async function laughingCoffin(user, actionType, actionResult) {
  const lcState = await getLcState();
  if (!lcState || !lcState.active || lcState.disbanded) return null;

  const floor = getActiveFloor(user);
  const hasGrunts = (lcState.gruntCount || 0) > 0;

  // 決定對手：優先雜魚
  let opponent;
  if (hasGrunts) {
    const grunt = buildGruntFighter(floor);
    opponent = {
      fighter: grunt.fighter,
      skillCtx: grunt.skillCtx,
      memberId: null,
      isGrunt: true,
      killReward: GRUNT_KILL_REWARD,
      nameCn: grunt.nameCn,
    };
  } else {
    // 派具名成員
    const aliveMembers = (lcState.members || []).filter((m) => m.alive);
    if (aliveMembers.length === 0) return null;
    const pick = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
    const memberDef = getMemberDef(pick.id);
    if (!memberDef) return null;
    opponent = {
      fighter: buildLcFighter(memberDef, floor),
      skillCtx: buildLcSkillContext(memberDef),
      memberId: pick.id,
      isGrunt: false,
      killReward: memberDef.killReward,
      nameCn: memberDef.nameCn,
    };
  }

  // 建構玩家方
  const combatInfo = buildCombatInfo(user, actionType, actionResult);
  if (!combatInfo.canFight) {
    return await processLose(user, actionType, actionResult, null, opponent, { autoLose: true });
  }

  // 建構玩家劍技
  const playerSkillCtx = buildPlayerSkillCtx(user, actionType, actionResult, combatInfo);

  // 戰鬥（具名成員用雙方劍技，雜魚用單方）
  let battleResult;
  if (!opponent.isGrunt && opponent.skillCtx) {
    battleResult = lcBattleWithSkills(
      combatInfo.weapon, combatInfo.playerSide, {},
      playerSkillCtx, opponent.fighter, opponent.skillCtx,
    );
  } else {
    battleResult = await pveBattleDirectWithSkills(
      combatInfo.weapon, combatInfo.playerSide,
      { name: opponent.fighter.name, hp: opponent.fighter.hp, ...opponent.fighter.stats, category: "[Laughing Coffin]" },
      {}, playerSkillCtx,
    );
  }

  if (battleResult.win === 1) {
    return await processWin(user, battleResult, opponent);
  } else if (battleResult.dead === 1) {
    return await processLose(user, actionType, actionResult, battleResult, opponent, {});
  } else {
    return await processDraw(user, battleResult, opponent);
  }
}

/**
 * 建構玩家方戰鬥資料（同舊系統邏輯）
 */
function buildCombatInfo(user, actionType, actionResult) {
  const weapons = user.weaponStock || [];

  if (actionType === "adv") {
    const npcResult = actionResult.npcResult || {};
    if (npcResult.died) return { canFight: false };

    const hiredNpcs = user.hiredNpcs || [];
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
      playerSide: { name: npc.name, hp: effectiveStats.hp, isHiredNpc: true, effectiveStats },
      weapon,
    };
  }

  // soloAdv / mine
  const bestIdx = findBestWeaponIndex(weapons);
  if (bestIdx === null) return { canFight: false };

  const weapon = weapons[bestIdx];
  const lvBonus = getBattleLevelBonus(user.battleLevel || 1);
  return {
    canFight: true,
    isNpc: false,
    playerSide: { name: user.name, hp: SOLO.BASE_HP + lvBonus.hpBonus, isHiredNpc: false },
    weapon: { ...weapon, agi: Math.max(weapon.agi || 0, SOLO.BASE_AGI) },
  };
}

/**
 * 建構玩家劍技上下文
 */
function buildPlayerSkillCtx(user, actionType, actionResult, combatInfo) {
  if (!combatInfo.canFight) return null;

  let equippedSkills;
  let proficiency;
  let weaponType;

  if (actionType === "adv" && combatInfo.isNpc) {
    const npc = (user.hiredNpcs || []).find((n) => n.npcId === combatInfo.npcId);
    if (!npc) return null;
    equippedSkills = npc.equippedSkills || [];
    proficiency = npc.weaponProficiency || {};
    weaponType = combatInfo.weapon.type || null;
  } else {
    equippedSkills = user.equippedSkills || [];
    proficiency = user.weaponProficiency || {};
    weaponType = combatInfo.weapon.type || null;
  }

  if (equippedSkills.length === 0) return null;

  const effectiveSkills = equippedSkills
    .map((e) => ({ skill: getSkill(e.skillId), mods: e.mods || [] }))
    .filter((e) => e.skill);
  if (effectiveSkills.length === 0) return null;

  return buildSkillContext(effectiveSkills, proficiency, weaponType);
}

function findBestWeaponIndex(weapons) {
  let bestIdx = null;
  let bestScore = -1;
  for (let i = 0; i < weapons.length; i++) {
    const w = weapons[i];
    if (!w) continue;
    const score = (w.atk || 0) + (w.def || 0) + (w.agi || 0) + (w.hp || 0);
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestIdx;
}

async function processWin(user, battleResult, opponent) {
  const reward = opponent.killReward;

  if (opponent.isGrunt) {
    await decrementGruntCount();
    await increment(user.userId, "lcGruntsKilled");
  } else {
    await markMemberDead(opponent.memberId, user.userId);
    await increment(user.userId, "lcMembersKilled");
  }

  const colReward = reward.col;
  await awardCol(user.userId, colReward);
  if (reward.battleExp) await awardBattleExp(user.userId, reward.battleExp);
  await increment(user.userId, "laughingCoffinDefeats");

  return {
    eventId: "laughing_coffin",
    eventName: getText("EVENTS.LC_NAME"),
    outcome: "win",
    text: formatText("EVENTS.LC_WIN", { col: colReward }) +
      (opponent.isGrunt ? "" : `\n${opponent.nameCn} 已被永久擊殺！`),
    battleResult: { win: 1, dead: 0, enemyName: opponent.fighter.name, log: battleResult.log },
    rewards: { col: colReward },
    losses: {},
    lcMemberKilled: opponent.isGrunt ? null : opponent.memberId,
  };
}

async function processDraw(user, battleResult, opponent) {
  const freshUser = await db.findOne("user", { userId: user.userId });
  const currentCol = freshUser?.col || 0;
  const colLoss = Math.floor(currentCol * LC_CFG.AMBUSH_DRAW_COL_LOSS_RATE);
  let actualLoss = 0;

  if (colLoss > 0) {
    const result = await db.findOneAndUpdate(
      "user",
      { userId: user.userId, col: { $gte: colLoss } },
      { $inc: { col: -colLoss } },
    );
    if (result !== null) {
      actualLoss = colLoss;
      await addToLootPool({ col: actualLoss });
    }
  }

  return {
    eventId: "laughing_coffin",
    eventName: getText("EVENTS.LC_NAME"),
    outcome: "draw",
    text: getText("EVENTS.LC_DRAW") +
      (actualLoss > 0 ? "\n" + formatText("EVENTS.LC_COL_LOSS", { amount: actualLoss }) : ""),
    battleResult: { win: 0, dead: 0, enemyName: opponent.fighter.name, log: battleResult.log },
    rewards: {},
    losses: { col: actualLoss },
  };
}

async function processLose(user, actionType, actionResult, battleResult, opponent, opts) {
  const losses = { col: 0, material: null, weapon: null, death: false };
  const textParts = [];
  const lootForPool = { col: 0, materials: [], weapons: [] };

  if (opts.autoLose) {
    textParts.push(getText("EVENTS.LC_LOSE_UNARMED"));
  } else {
    textParts.push(getText("EVENTS.LC_LOSE"));
  }

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
        textParts.push(formatText("EVENTS.LC_STOLEN_COL", { amount: colToSteal }));
      }
    }
  }

  // 搶素材
  if (LC_CFG.AMBUSH_LOSE_STEAL_MATERIAL) {
    const latestUser = await db.findOne("user", { userId: user.userId });
    const items = (latestUser?.itemStock || []).filter((it) => it.itemNum > 0);
    if (items.length > 0) {
      const stolen = items[Math.floor(Math.random() * items.length)];
      await db.atomicIncItem(user.userId, stolen.itemId, stolen.itemLevel, stolen.itemName, -1);
      losses.material = { name: stolen.itemName, level: stolen.itemLevel };
      lootForPool.materials.push({ itemId: stolen.itemId, itemLevel: stolen.itemLevel, itemName: stolen.itemName });
      textParts.push(formatText("EVENTS.LC_STOLEN_MATERIAL", { name: stolen.itemName }));
    }
  }

  // 搶武器
  const latestUserForWeapon = await db.findOne("user", { userId: user.userId });
  const weapons = latestUserForWeapon?.weaponStock || [];
  if (weapons.length >= 2 && roll.d100Check(LC_CFG.AMBUSH_LOSE_STEAL_WEAPON_CHANCE)) {
    const stolenIdx = Math.floor(Math.random() * weapons.length);
    const stolenWeapon = weapons[stolenIdx];
    if (stolenWeapon) {
      await destroyWeapon(user.userId, stolenIdx);
      losses.weapon = { name: stolenWeapon.weaponName, index: stolenIdx };
      lootForPool.weapons.push(stolenWeapon);
      textParts.push(formatText("EVENTS.LC_STOLEN_WEAPON", { name: stolenWeapon.weaponName }));
    }
  }

  await addToLootPool(lootForPool);

  // 死亡判定
  const baseDeathChance = LC_CFG.AMBUSH_DEATH_CHANCE[actionType] || 0;
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
        : hiredNpcs.find((n) => n.name === actionResult?.battleResult?.npcName);
      if (targetNpc) {
        await killNpc(user.userId, targetNpc.npcId, "微笑棺木襲擊");
        await increment(user.userId, "npcDeaths");
        losses.npcDeath = { name: targetNpc.name, npcId: targetNpc.npcId };
        textParts.push(formatText("EVENTS.LC_NPC_DEATH", { name: targetNpc.name }));
      }
    }
  } else if (roll.d100Check(deathChance)) {
    losses.death = true;
    const cause = actionType === "mine" ? "laughing_coffin_mine" : "laughing_coffin_solo";
    textParts.push(getText("EVENTS.LC_PLAYER_DEATH"));
    const bankruptcyInfo = await executeBankruptcy(user.userId, 0, 0, { cause });
    losses.bankruptcyInfo = bankruptcyInfo;
  }

  return {
    eventId: "laughing_coffin",
    eventName: getText("EVENTS.LC_NAME"),
    outcome: "lose",
    text: textParts.join("\n"),
    battleResult: battleResult
      ? { win: 0, dead: 1, enemyName: opponent.fighter.name, log: battleResult.log }
      : { win: 0, dead: 1, enemyName: opponent.fighter.name, log: [] },
    rewards: {},
    losses,
    bankruptcy: losses.death || false,
  };
}

module.exports = laughingCoffin;
