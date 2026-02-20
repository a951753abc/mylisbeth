const _ = require("lodash");
const config = require("../config.js");
const db = require("../../db.js");
const weapon = require("../weapon/weapon.js");
const roll = require("../roll.js");
const eneNameList = require("../ene/name.json");
const { pveBattle } = require("../battle");
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

    const thisWeapon = user.weaponStock[weaponIndex];
    const currentFloor = user.currentFloor || 1;

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
    const battleResult = await pveBattle(soloWeapon, smithNpc, eneNameList, floorData.enemies, titleMods);

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

    // 武器耐久損耗（套用 advWeaponDmgChance 修正）
    const weaponDmgMod = getModifier(title, "advWeaponDmgChance");
    let durabilityText = "";
    let weaponCheck;
    if (outcomeKey === "WIN") {
      weaponCheck = roll.d100Check(Math.min(100, Math.round(config.WEAPON_DAMAGE_CHANCE.WIN * weaponDmgMod)));
    } else if (outcomeKey === "LOSE") {
      weaponCheck = roll.d100Check(Math.min(100, Math.round(config.WEAPON_DAMAGE_CHANCE.DEAD * weaponDmgMod)));
    } else {
      weaponCheck = roll.d100Check(Math.min(100, Math.round(config.WEAPON_DAMAGE_CHANCE.DRAW * weaponDmgMod)));
    }

    if (weaponCheck) {
      const reduceDurability = roll.d6();
      const durPath = `weaponStock.${weaponIndex}.durability`;
      const updatedUser = await db.findOneAndUpdate(
        "user",
        { userId: user.userId },
        { $inc: { [durPath]: -reduceDurability } },
        { returnDocument: "after" },
      );

      durabilityText = `\n\n(激烈的戰鬥後，${thisWeapon.weaponName} 的耐久度減少了 ${reduceDurability} 點。)`;
      if (updatedUser.weaponStock[weaponIndex]?.durability <= 0) {
        durabilityText += `\n**${thisWeapon.weaponName} 爆發四散了！**`;
        await weapon.destroyWeapon(user.userId, weaponIndex);
        await increment(user.userId, "weaponsBroken");
      }
    }

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
    const floorProgressKey = `floorProgress.${currentFloor}.explored`;
    const maxExploreKey = `floorProgress.${currentFloor}.maxExplore`;
    const currentExplored = _.get(user, `floorProgress.${currentFloor}.explored`, 0);
    const maxExplore = _.get(user, `floorProgress.${currentFloor}.maxExplore`, config.FLOOR_MAX_EXPLORE);
    if (currentExplored < maxExplore) {
      await db.update(
        "user",
        { userId: user.userId },
        { $inc: { [floorProgressKey]: 1 }, $set: { [maxExploreKey]: maxExplore } },
      );
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
      reward: rewardText,
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
