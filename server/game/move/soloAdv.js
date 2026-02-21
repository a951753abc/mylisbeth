const config = require("../config.js");
const db = require("../../db.js");
const eneNameList = require("../ene/name.json");
const { pveBattleWithSkills } = require("../battle");
const { generateNarrative } = require("../narrative/generate.js");
const { awardCol } = require("../economy/col.js");
const { executeBankruptcy } = require("../economy/bankruptcy.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const { getFloor } = require("../floor/floorData.js");
const ensureUserFields = require("../migration/ensureUserFields.js");
const { getModifier } = require("../title/titleModifier.js");
const { mineBattle } = require("../loot/battleLoot.js");
const { getBattleLevelBonus, awardBattleExp } = require("../battleLevel.js");
const { applyWeaponDurability, incrementFloorExploration } = require("./adventureUtils.js");
const { getEffectiveSkills } = require("../skill/skillSlot.js");
const { buildSkillContext } = require("../skill/skillCombat.js");
const { awardProficiency, getProfGainKey } = require("../skill/skillProficiency.js");
const { resolveWeaponType } = require("../weapon/weaponType.js");
const { checkExtraSkills } = require("../skill/extraSkillChecker.js");
const roll = require("../roll.js");

const SOLO = config.SOLO_ADV;

module.exports = async function (cmd, rawUser) {
  try {
    const user = await ensureUserFields(rawUser);

    if (!user.weaponStock || user.weaponStock.length === 0) {
      return { error: "你沒有任何武器，無法獨自出擊！" };
    }

    // cmd[2] = weaponIndex（可選，預設 0）
    const weaponIndex = cmd[2] !== undefined ? Number(cmd[2]) : 0;
    if (Number.isNaN(weaponIndex) || !user.weaponStock[weaponIndex]) {
      return { error: `武器 #${weaponIndex} 不存在` };
    }

    const { getActiveFloor } = require("../floor/activeFloor.js");
    const thisWeapon = user.weaponStock[weaponIndex];
    const currentFloor = getActiveFloor(user);

    // 組裝鍛造師戰鬥數值（含 battleLevel 加成）
    const lvBonus = getBattleLevelBonus(user.battleLevel || 1);
    const soloWeapon = {
      ...thisWeapon,
      agi: Math.max(thisWeapon.agi || 0, SOLO.BASE_AGI),
    };

    const smithNpc = {
      name: user.name,
      hp: SOLO.BASE_HP + lvBonus.hpBonus,
      isHiredNpc: false,     // 不走 NPC effectiveStats 路徑
    };

    const floorData = getFloor(currentFloor);
    const place = floorData.places[Math.floor(Math.random() * floorData.places.length)];

    const title = user.title || null;
    const titleMods = {
      battleAtk: getModifier(title, "battleAtk"),
      battleDef: getModifier(title, "battleDef"),
      battleAgi: getModifier(title, "battleAgi"),
    };
    // 構建玩家技能上下文
    const playerSkills = getEffectiveSkills(user, thisWeapon);
    const weaponType = resolveWeaponType(thisWeapon);
    const skillCtx = playerSkills.length > 0
      ? buildSkillContext(playerSkills, user.weaponProficiency, weaponType)
      : null;

    const battleResult = await pveBattleWithSkills(soloWeapon, smithNpc, eneNameList, floorData.enemies, titleMods, skillCtx);

    const narrative = generateNarrative(battleResult, {
      weaponName: thisWeapon.weaponName,
      smithName: user.name,
      place,
      floor: currentFloor,
      floorName: floorData.name,
    });

    // 決定戰鬥結果鍵
    let outcomeKey;
    if (battleResult.win === 1)       outcomeKey = "WIN";
    else if (battleResult.dead === 1) outcomeKey = "LOSE";
    else                              outcomeKey = "DRAW";

    // 武器耐久損耗
    const durabilityText = await applyWeaponDurability(user.userId, weaponIndex, outcomeKey, title, thisWeapon);

    // 死亡判定（套用 soloDeathChance 修正）
    const deathMod = getModifier(title, "soloDeathChance");
    let isDead = false;
    if (outcomeKey === "LOSE") {
      isDead = roll.d100Check(Math.min(100, Math.max(1, Math.round(SOLO.DEATH_ON_LOSE * deathMod))));
    } else if (outcomeKey === "DRAW") {
      isDead = roll.d100Check(Math.min(100, Math.max(1, Math.round(SOLO.DEATH_ON_DRAW * deathMod))));
    }

    if (isDead) {
      const bankruptcyInfo = await executeBankruptcy(user.userId, 0, 0, {
        cause: "solo_adventure_death",
      });
      return {
        bankruptcy: true,
        message: `${user.name} 在第 ${currentFloor} 層的冒險中壯烈犧牲，英魂已逝。角色已被刪除。`,
        bankruptcyInfo,
        narrative,
        battleResult: {
          win: battleResult.win,
          dead: battleResult.dead,
          category: battleResult.category,
          enemyName: battleResult.enemyName,
          npcName: battleResult.npcName,
        },
      };
    }

    // 勝利獎勵
    let rewardText = "";
    let colEarned = 0;
    if (outcomeKey === "WIN") {
      const mineResultText = await mineBattle(user, battleResult.category, currentFloor);
      rewardText = `\n\n**戰利品:**\n${mineResultText}`;
      const winString = `${battleResult.category}Win`;
      await db.update("user", { userId: user.userId }, { $inc: { [winString]: 1 } });

      const advColMod = getModifier(title, "advColReward");
      const colReward = Math.round((config.COL_ADVENTURE_REWARD[battleResult.category] || 50) * advColMod);
      colEarned = colReward;
      await awardCol(user.userId, colReward);
      rewardText += `獲得 ${colReward} Col\n`;
    } else if (outcomeKey === "LOSE") {
      await db.update("user", { userId: user.userId }, { $inc: { lost: 1 } });
    }

    // 更新探索進度
    await incrementFloorExploration(user.userId, user, currentFloor);

    // 發放武器熟練度（低樓層衰減）
    const { getProficiencyMultiplier } = require("../floor/activeFloor.js");
    const profMult = getProficiencyMultiplier(user);
    const profGainKey = getProfGainKey(outcomeKey, "solo");
    const profResult = await awardProficiency(user.userId, thisWeapon, profGainKey, profMult);
    let skillText = "";
    if (profResult && profResult.profGained > 0) {
      skillText += `\n你的 ${profResult.weaponType} 熟練度 +${profResult.profGained}`;
    }
    if (profResult && profResult.newSkills.length > 0) {
      const { getSkill } = require("../skill/skillRegistry.js");
      for (const sid of profResult.newSkills) {
        const sk = getSkill(sid);
        skillText += `\n🗡️ 你習得了新劍技：【${sk ? sk.nameCn : sid}】！`;
      }
    }

    // Extra Skill 解鎖檢查
    const freshUser = await db.findOne("user", { userId: user.userId });
    const extraUnlocked = await checkExtraSkills(user.userId, freshUser || user);
    if (extraUnlocked.length > 0) {
      const { getSkill } = require("../skill/skillRegistry.js");
      for (const sid of extraUnlocked) {
        const sk = getSkill(sid);
        skillText += `\n✨ 你解鎖了隱藏技能：【${sk ? sk.nameCn : sid}】！`;
      }
    }

    await increment(user.userId, "totalAdventures");
    await increment(user.userId, "totalSoloAdventures");
    if (outcomeKey === "WIN") {
      await awardBattleExp(user.userId, config.BATTLE_LEVEL.EXP_SOLO_WIN);
    }
    await checkAndAward(user.userId);

    return {
      battleResult: {
        win: battleResult.win,
        dead: battleResult.dead,
        category: battleResult.category,
        enemyName: battleResult.enemyName,
        npcName: battleResult.npcName,
        log: battleResult.log,
      },
      narrative,
      durabilityText,
      reward: rewardText + skillText,
      skillEvents: battleResult.skillEvents || [],
      colEarned,
      floor: currentFloor,
      floorName: floorData.name,
      survived: true,
    };
  } catch (error) {
    console.error("在執行 move soloAdv 時發生嚴重錯誤:", error);
    return { error: "獨自出擊的過程中發生了未知的錯誤，請稍後再試。" };
  }
};

// mineBattle 和 getFloorMineList 已提取到 ../loot/battleLoot.js
