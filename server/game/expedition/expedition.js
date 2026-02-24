const db = require("../../db.js");
const config = require("../config.js");
const roll = require("../roll.js");
const { getEffectiveStats } = require("../npc/npcStats.js");
const { awardCol } = require("../economy/col.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const { awardAdvExp } = require("../progression/adventureLevel.js");
const { getBattleLevelBonus } = require("../battleLevel.js");
const { formatText, getText } = require("../textManager.js");
const { generateRewards } = require("./rewards.js");
const { getModifier, getRelicModifier } = require("../title/titleModifier.js");
const { getNpcEffectiveSkills, getEffectiveSkills } = require("../skill/skillSlot.js");
const { parseSkillEffects } = require("../skill/skillCombat.js");
const { executeBankruptcy } = require("../economy/bankruptcy.js");

const EXPEDITION = config.EXPEDITION;

/**
 * 檢查 NPC 是否正在遠征中
 */
function isNpcOnExpedition(user, npcId) {
  if (!user.activeExpedition) return false;
  return user.activeExpedition.npcs.some((n) => n.npcId === npcId);
}

/**
 * 檢查武器是否正在遠征中使用
 */
function isWeaponOnExpedition(user, weaponIndex) {
  if (!user.activeExpedition) return false;
  // 檢查玩家武器
  if (user.activeExpedition.playerWeaponIndex === weaponIndex) return true;
  // 檢查 NPC 武器
  return user.activeExpedition.npcs.some((n) =>
    n.weaponIndices.includes(weaponIndex),
  );
}

/**
 * 取得遠征預覽資料（供前端顯示）
 */
function getExpeditionPreview(user) {
  const advLevel = user.adventureLevel || 1;
  const isUnlocked = advLevel >= EXPEDITION.UNLOCK_ADV_LEVEL;
  const currentFloor = user.currentFloor || 1;

  const dungeons = EXPEDITION.DUNGEONS.map((d) => ({
    ...d,
    unlocked: currentFloor > d.requiredFloor,
  }));

  const now = Date.now();
  const cooldownRemaining = user.lastExpeditionAt
    ? Math.max(0, user.lastExpeditionAt + EXPEDITION.COOLDOWN_MS - now)
    : 0;

  return {
    isUnlocked,
    unlockLevel: EXPEDITION.UNLOCK_ADV_LEVEL,
    currentAdvLevel: advLevel,
    dungeons,
    activeExpedition: user.activeExpedition,
    cooldownRemaining,
    cooldownMs: EXPEDITION.COOLDOWN_MS,
  };
}

/**
 * 計算遠征隊伍總戰力
 * @param {Array<{npc: object, weaponIndices: number[]}>} npcEntries
 * @param {Array} weapons - user.weaponStock
 * @returns {number}
 */
function calculatePower(npcEntries, weapons) {
  const W = EXPEDITION.POWER_WEIGHTS;
  let totalPower = 0;

  for (const entry of npcEntries) {
    const { npc, weaponIndices } = entry;
    const baseEffective = getEffectiveStats(npc);
    if (!baseEffective) continue;
    const effective = { ...baseEffective };

    // 被動技能加成（使用主武器判定武器類型）
    const primaryWeapon = weapons[weaponIndices[0]];
    if (primaryWeapon) {
      const skills = getNpcEffectiveSkills(npc, primaryWeapon);
      for (const { skill, mods } of skills) {
        if (skill.triggerType !== "passive") continue;
        const effects = parseSkillEffects(skill, mods);
        effective.atk += effects.atkBoost;
        effective.def += effects.defBoost;
        effective.agi += effects.agiBoost;
      }
    }

    const qualityMult = EXPEDITION.QUALITY_POWER_MULT[npc.quality] || 1.0;

    const npcPower =
      (effective.atk * W.npcAtk +
        effective.def * W.npcDef +
        effective.hp * W.npcHp +
        effective.agi * W.npcAgi) *
      qualityMult;

    totalPower += npcPower;

    // 武器戰力
    for (const wIdx of weaponIndices) {
      const w = weapons[wIdx];
      if (!w) continue;
      totalPower +=
        (w.atk || 0) * W.weaponAtk +
        (w.def || 0) * W.weaponDef +
        (w.hp || 0) * W.weaponHp +
        (w.agi || 0) * W.weaponAgi +
        (w.cri || 0) * W.weaponCri;
    }
  }

  return Math.round(totalPower);
}

/**
 * 計算成功率
 * 公式：ratio × BASE，ratio = power / difficulty
 * ratio=0 → 0%, ratio=0.5 → 25%, ratio=1 → 50%, ratio=1.9+ → 95%
 */
function calculateSuccessRate(power, difficulty) {
  const ratio = difficulty > 0 ? power / difficulty : 1;
  const rate = EXPEDITION.SUCCESS_BASE * ratio;
  return Math.min(
    EXPEDITION.SUCCESS_MAX,
    Math.max(EXPEDITION.SUCCESS_MIN, Math.round(rate)),
  );
}

/**
 * 計算玩家（鍛造師）遠征戰力
 * @param {object} user
 * @param {object} weapon - 玩家選擇的武器
 * @returns {number}
 */
function calculatePlayerPower(user, weapon) {
  const W = EXPEDITION.POWER_WEIGHTS;
  const SOLO = config.SOLO_ADV;
  const lvBonus = getBattleLevelBonus(user.battleLevel || 1);

  // 稱號加成
  const title = user.title || null;
  const titleMods = {
    battleAtk: getModifier(title, "battleAtk"),
    battleDef: getModifier(title, "battleDef"),
    battleAgi: getModifier(title, "battleAgi"),
  };

  // weapon stats × battleLevel 倍率 × 稱號倍率
  const hp = SOLO.BASE_HP + lvBonus.hpBonus + (weapon.hp || 0);
  let atk = Math.max(1, Math.round((weapon.atk || 0) * lvBonus.atkMult * titleMods.battleAtk));
  let def = Math.max(0, Math.round((weapon.def || 0) * lvBonus.defMult * titleMods.battleDef));
  let agi = Math.max(1, Math.round(
    Math.max(weapon.agi || 0, SOLO.BASE_AGI) * lvBonus.agiMult * titleMods.battleAgi,
  ));

  // 玩家被動技能加成
  const skills = getEffectiveSkills(user, weapon);
  for (const { skill, mods } of skills) {
    if (skill.triggerType !== "passive") continue;
    const effects = parseSkillEffects(skill, mods);
    atk += effects.atkBoost;
    def += effects.defBoost;
    agi += effects.agiBoost;
  }

  return Math.round(atk * W.npcAtk + def * W.npcDef + hp * W.npcHp + agi * W.npcAgi);
}

/**
 * 啟動遠征
 * @param {string} userId
 * @param {string} dungeonId
 * @param {Array<{npcId: string, weaponIndices: number[]}>} npcWeaponMap
 * @param {number|null} playerWeaponIndex - 玩家武器索引（null = 不參加）
 */
async function startExpedition(userId, dungeonId, npcWeaponMap, playerWeaponIndex = null) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: getText("SYSTEM.CHAR_NOT_FOUND") };

  // 暫停營業檢查
  if (user.businessPaused) {
    return { error: getText("SYSTEM.BUSINESS_PAUSED") };
  }

  // 冒險等級檢查
  const advLevel = user.adventureLevel || 1;
  if (advLevel < EXPEDITION.UNLOCK_ADV_LEVEL) {
    return {
      error: formatText("EXPEDITION.NOT_UNLOCKED", {
        level: EXPEDITION.UNLOCK_ADV_LEVEL,
        current: advLevel,
      }),
    };
  }

  // 無進行中遠征
  if (user.activeExpedition) {
    return { error: getText("EXPEDITION.ALREADY_ACTIVE") };
  }

  // 冷卻檢查
  const now = Date.now();
  if (user.lastExpeditionAt) {
    const elapsed = now - user.lastExpeditionAt;
    if (elapsed < EXPEDITION.COOLDOWN_MS) {
      const remaining = Math.ceil((EXPEDITION.COOLDOWN_MS - elapsed) / 1000);
      return {
        error: formatText("EXPEDITION.ON_COOLDOWN", { seconds: remaining }),
      };
    }
  }

  // 迷宮驗證
  const dungeon = EXPEDITION.DUNGEONS.find((d) => d.id === dungeonId);
  if (!dungeon) {
    return {
      error: formatText("EXPEDITION.DUNGEON_LOCKED", { floor: "??" }),
    };
  }

  const currentFloor = user.currentFloor || 1;
  if (currentFloor <= dungeon.requiredFloor) {
    return {
      error: formatText("EXPEDITION.DUNGEON_LOCKED", {
        floor: dungeon.requiredFloor,
      }),
    };
  }

  // NPC 數量檢查
  if (!npcWeaponMap || npcWeaponMap.length < EXPEDITION.MIN_NPCS) {
    return {
      error: formatText("EXPEDITION.NO_NPCS", { min: EXPEDITION.MIN_NPCS }),
    };
  }

  const hired = user.hiredNpcs || [];
  const weapons = user.weaponStock || [];
  const npcEntries = [];
  const usedWeaponIndices = new Set();

  for (const mapping of npcWeaponMap) {
    const npcIdx = hired.findIndex((n) => n.npcId === mapping.npcId);
    if (npcIdx === -1) return { error: getText("NPC.NPC_NOT_FOUND") };

    const npc = hired[npcIdx];

    // NPC 不可在任務/修練中
    if (npc.mission) {
      return {
        error: formatText("EXPEDITION.NPC_BUSY", { npcName: npc.name }),
      };
    }

    // 體力檢查
    const condition = npc.condition ?? 100;
    if (condition < EXPEDITION.MIN_CONDITION) {
      return {
        error: formatText("EXPEDITION.NPC_LOW_CONDITION", {
          npcName: npc.name,
          required: EXPEDITION.MIN_CONDITION,
          current: condition,
        }),
      };
    }

    // 武器驗證（不可重複選取）
    const validWeaponIndices = [];
    for (const wIdx of mapping.weaponIndices || []) {
      if (!weapons[wIdx]) {
        return {
          error: formatText("EXPEDITION.WEAPON_NOT_FOUND", { index: wIdx }),
        };
      }
      if (usedWeaponIndices.has(wIdx)) {
        return {
          error: formatText("EXPEDITION.WEAPON_NOT_FOUND", { index: wIdx }),
        };
      }
      usedWeaponIndices.add(wIdx);
      validWeaponIndices.push(wIdx);
    }

    npcEntries.push({ npc, npcIdx, weaponIndices: validWeaponIndices });
  }

  // 玩家參戰驗證
  if (playerWeaponIndex !== null) {
    if (!weapons[playerWeaponIndex]) {
      return { error: formatText("EXPEDITION.WEAPON_NOT_FOUND", { index: playerWeaponIndex }) };
    }
    if (usedWeaponIndices.has(playerWeaponIndex)) {
      return { error: formatText("EXPEDITION.WEAPON_NOT_FOUND", { index: playerWeaponIndex }) };
    }
    const stamina = user.stamina ?? 100;
    if (stamina < EXPEDITION.PLAYER_MIN_STAMINA) {
      return {
        error: formatText("EXPEDITION.PLAYER_LOW_STAMINA", {
          required: EXPEDITION.PLAYER_MIN_STAMINA,
          current: stamina,
        }),
      };
    }
    usedWeaponIndices.add(playerWeaponIndex);
  }

  // 計算戰力與成功率（套用聖遺物加成）
  const rawPower = calculatePower(npcEntries, weapons);
  let playerPower = 0;
  if (playerWeaponIndex !== null) {
    playerPower = calculatePlayerPower(user, weapons[playerWeaponIndex]);
  }
  const relicMult = getRelicModifier(user.bossRelics, "expeditionPower");
  const totalPower = Math.round((rawPower + playerPower) * relicMult);
  const successRate = calculateSuccessRate(totalPower, dungeon.difficulty);

  const endsAt = now + EXPEDITION.DURATION_MS;

  const expeditionData = {
    dungeonId: dungeon.id,
    dungeonName: dungeon.name,
    startedAt: now,
    endsAt,
    npcs: npcEntries.map((e) => ({
      npcId: e.npc.npcId,
      npcName: e.npc.name,
      npcIdx: e.npcIdx,
      weaponIndices: e.weaponIndices,
    })),
    playerJoined: playerWeaponIndex !== null,
    playerWeaponIndex,
    totalPower,
    successRate,
    difficulty: dungeon.difficulty,
  };

  // 原子寫入：僅在無進行中遠征時寫入
  const updateResult = await db.findOneAndUpdate(
    "user",
    { userId, activeExpedition: null },
    { $set: { activeExpedition: expeditionData } },
    { returnDocument: "after" },
  );

  if (!updateResult) {
    return { error: getText("EXPEDITION.ALREADY_ACTIVE") };
  }

  return {
    success: true,
    expedition: expeditionData,
    message: formatText("EXPEDITION.STARTED", {
      dungeon: dungeon.name,
      seconds: Math.round(EXPEDITION.DURATION_MS / 1000),
    }),
  };
}

/**
 * 結算遠征（懶結算）
 *
 * 流程：
 * 1. 純計算階段（武器耐久、NPC 體力、死亡判定）
 * 2. 原子 guard 防雙重結算
 * 3. guard 成功後：一次性寫入完整的 weaponStock + hiredNpcs
 * 4. 獎勵發放（在 guard 後，避免雙重獎勵）
 */
async function resolveExpedition(userId) {
  const user = await db.findOne("user", { userId });
  if (!user || !user.activeExpedition) return null;

  const expedition = user.activeExpedition;
  if (Date.now() < expedition.endsAt) return null;

  // 判定成功
  const isSuccess = roll.d100Check(expedition.successRate);

  const hired = user.hiredNpcs || [];
  const weapons = user.weaponStock || [];
  const results = {
    isSuccess,
    dungeonName: expedition.dungeonName,
    weaponsDestroyed: [],
    npcsDied: [],
    durabilityDamage: [],
    conditionChanges: [],
    rewards: null,
  };

  // ── 1. 純計算：武器耐久消耗 ──
  const destroyedWeaponIndices = new Set();

  for (const npcEntry of expedition.npcs) {
    for (const wIdx of npcEntry.weaponIndices) {
      if (!weapons[wIdx]) continue;

      const baseLoss = EXPEDITION.DURABILITY_LOSS_BASE;
      const diceLoss = Math.floor(Math.random() * EXPEDITION.DURABILITY_LOSS_DICE) + 1;
      let totalLoss = baseLoss + diceLoss;

      if (!isSuccess) {
        totalLoss = Math.ceil(totalLoss * EXPEDITION.DURABILITY_FAIL_MULT);
      }

      const oldDurability = weapons[wIdx].durability || 0;
      const newDurability = oldDurability - totalLoss;

      results.durabilityDamage.push({
        weaponName: weapons[wIdx].weaponName || weapons[wIdx].name,
        weaponIndex: wIdx,
        loss: totalLoss,
        oldDurability,
        newDurability: Math.max(0, newDurability),
      });

      if (newDurability <= 0) {
        destroyedWeaponIndices.add(wIdx);
        results.weaponsDestroyed.push({
          weaponName: weapons[wIdx].weaponName || weapons[wIdx].name,
          weaponIndex: wIdx,
        });
      }
    }
  }

  // ── 1b. 純計算：玩家武器耐久消耗 ──
  if (expedition.playerJoined && expedition.playerWeaponIndex !== null) {
    const pIdx = expedition.playerWeaponIndex;
    if (weapons[pIdx]) {
      const baseLoss = EXPEDITION.DURABILITY_LOSS_BASE;
      const diceLoss = Math.floor(Math.random() * EXPEDITION.DURABILITY_LOSS_DICE) + 1;
      let totalLoss = baseLoss + diceLoss;
      if (!isSuccess) {
        totalLoss = Math.ceil(totalLoss * EXPEDITION.DURABILITY_FAIL_MULT);
      }
      const oldDurability = weapons[pIdx].durability || 0;
      const newDurability = oldDurability - totalLoss;

      results.durabilityDamage.push({
        weaponName: weapons[pIdx].weaponName || weapons[pIdx].name,
        weaponIndex: pIdx,
        loss: totalLoss,
        oldDurability,
        newDurability: Math.max(0, newDurability),
        isPlayerWeapon: true,
      });

      if (newDurability <= 0) {
        destroyedWeaponIndices.add(pIdx);
        results.weaponsDestroyed.push({
          weaponName: weapons[pIdx].weaponName || weapons[pIdx].name,
          weaponIndex: pIdx,
          isPlayerWeapon: true,
        });
      }
    }
  }

  // ── 2. 純計算：NPC 體力損耗與死亡判定 ──
  const deadNpcIds = new Set();

  for (const npcEntry of expedition.npcs) {
    const npc = hired.find((n) => n.npcId === npcEntry.npcId);
    if (!npc) continue;

    const condLoss = isSuccess
      ? EXPEDITION.CONDITION_LOSS_SUCCESS
      : EXPEDITION.CONDITION_LOSS_FAIL;

    const oldCond = npc.condition ?? 100;
    const newCond = Math.max(0, oldCond - condLoss);

    results.conditionChanges.push({
      npcName: npc.name,
      npcId: npc.npcId,
      condLoss,
      oldCondition: oldCond,
      newCondition: newCond,
    });

    // 死亡判定（僅失敗時）
    if (!isSuccess) {
      const isUnarmed = (npcEntry.weaponIndices || []).length === 0;
      const safetyReduction = Math.min(1, (user.bossRelics || []).reduce(
        (sum, r) => sum + (r.effects?.expeditionSafety || 0), 0,
      ));

      let deathChance = 0;
      if (isUnarmed) {
        // 未攜帶武器：無視體力，大幅提高死亡率
        deathChance = EXPEDITION.UNARMED_DEATH_CHANCE;
      } else {
        // 攜帶武器：依體力連續縮放（二次方）
        const missingRatio = (100 - newCond) / 100;
        deathChance = EXPEDITION.DEATH_BASE_FAIL + EXPEDITION.DEATH_COND_BONUS_FAIL * missingRatio * missingRatio;
      }

      if (deathChance > 0) {
        const adjusted = Math.max(0, Math.round(deathChance * (1 - safetyReduction)));
        if (roll.d100Check(adjusted)) {
          deadNpcIds.add(npc.npcId);
          results.npcsDied.push({ npcName: npc.name, npcId: npc.npcId });
        }
      }
    }
  }

  // ── 2b. 純計算：玩家 stamina 消耗與死亡判定 ──
  let playerStaminaCost = 0;
  if (expedition.playerJoined) {
    playerStaminaCost = isSuccess
      ? EXPEDITION.PLAYER_STAMINA_COST_SUCCESS
      : EXPEDITION.PLAYER_STAMINA_COST_FAIL;
    results.playerStaminaCost = playerStaminaCost;
    results.playerJoined = true;

    // 死亡判定（僅失敗時）
    if (!isSuccess) {
      const safetyReduction = Math.min(1, (user.bossRelics || []).reduce(
        (sum, r) => sum + (r.effects?.expeditionSafety || 0), 0,
      ));
      const adjusted = Math.max(0, Math.round(
        EXPEDITION.PLAYER_DEATH_CHANCE_FAIL * (1 - safetyReduction),
      ));
      if (roll.d100Check(adjusted)) {
        results.playerDied = true;
      }
    }
  }

  // ── 3. 原子 guard：僅清除遠征狀態（防雙重結算） ──
  // 使用 $type: "object" 取代 $ne: null（MongoDB 7 相容）
  const guard = await db.findOneAndUpdate(
    "user",
    { userId, activeExpedition: { $type: "object" } },
    { $set: { activeExpedition: null, lastExpeditionAt: Date.now() } },
    { returnDocument: "after" },
  );

  if (!guard) return null;

  // ── 4. 構建完整的 weaponStock（套用耐久 + 移除銷毀武器） ──
  const updatedWeapons = weapons.map((w) => ({ ...w }));

  // 套用耐久損耗
  for (const dmg of results.durabilityDamage) {
    if (!destroyedWeaponIndices.has(dmg.weaponIndex) && updatedWeapons[dmg.weaponIndex]) {
      updatedWeapons[dmg.weaponIndex].durability = dmg.newDurability;
    }
  }

  // 建立 oldIndex → newIndex 映射表（銷毀武器映射為 null）
  const indexMap = {};
  let shift = 0;
  for (let i = 0; i < updatedWeapons.length; i++) {
    if (destroyedWeaponIndices.has(i)) {
      indexMap[i] = null;
      shift++;
    } else {
      indexMap[i] = i - shift;
    }
  }

  // 移除銷毀的武器
  const finalWeapons = updatedWeapons.filter((_, i) => !destroyedWeaponIndices.has(i));

  // ── 5. 構建完整的 hiredNpcs（更新體力 + 重映射武器索引 + 移除死亡 NPC） ──
  // 使用 guard 返回的最新資料（已清除 activeExpedition）
  const freshHired = (guard.hiredNpcs || []).map((npc) => {
    const updated = { ...npc };

    // 更新體力（以 npcId 匹配，不依賴陣列索引）
    const condChange = results.conditionChanges.find((cc) => cc.npcId === npc.npcId);
    if (condChange && !deadNpcIds.has(npc.npcId)) {
      updated.condition = condChange.newCondition;
    }

    // 重映射 equippedWeaponIndex
    if (updated.equippedWeaponIndex !== null && updated.equippedWeaponIndex !== undefined) {
      const mapped = indexMap[updated.equippedWeaponIndex];
      updated.equippedWeaponIndex = mapped ?? null;
    }

    return updated;
  });

  // 移除死亡 NPC
  const survivingNpcs = freshHired.filter((n) => !deadNpcIds.has(n.npcId));

  // 重映射 defenseWeaponIndex
  const writeSet = {
    weaponStock: finalWeapons,
    hiredNpcs: survivingNpcs,
  };

  const defIdx = guard.defenseWeaponIndex;
  if (defIdx !== null && defIdx !== undefined && destroyedWeaponIndices.size > 0) {
    const mappedDef = indexMap[defIdx];
    writeSet.defenseWeaponIndex = mappedDef ?? 0;
  }

  // 玩家 stamina 扣除
  if (expedition.playerJoined && playerStaminaCost > 0) {
    writeSet.stamina = Math.max(0, (guard.stamina ?? 100) - playerStaminaCost);
  }

  // ── 6. NPC 死亡：更新 npc collection（必須在玩家死亡/破產前處理） ──
  for (const deadNpc of results.npcsDied) {
    await db.update("npc", { npcId: deadNpc.npcId }, {
      $set: { status: "dead", hiredBy: null, diedAt: Date.now(), causeOfDeath: `遠征失敗：${expedition.dungeonName}` },
    });
    await increment(userId, "npcDeaths");
  }

  // 玩家死亡 → 角色重置（破產會刪除角色，後續獎勵/經驗不需要了）
  if (results.playerDied) {
    await executeBankruptcy(userId, 0, 0, { cause: "expedition_death" });
    return results;
  }

  // 單次原子寫入完整陣列
  await db.update("user", { userId }, { $set: writeSet });

  // ── 7. 獎勵發放（在 guard 之後，防雙重獎勵） ──
  if (isSuccess) {
    const rewardUser = await db.findOne("user", { userId });
    if (rewardUser) {
      results.rewards = await generateRewards(rewardUser, expedition, rewardUser.hiredNpcs || []);
    }
  }

  if (results.rewards?.col > 0) {
    await awardCol(userId, results.rewards.col);
  }

  // ── 8. 統計追蹤 ──
  await increment(userId, "totalExpeditions");
  if (isSuccess) {
    await increment(userId, "expeditionsSucceeded");
  }

  // ── 9. 冒險經驗 ──
  const advExpAmount = isSuccess
    ? config.ADV_LEVEL.EXP_MISSION_SUCCESS
    : config.ADV_LEVEL.EXP_MISSION_FAIL;
  const advExpResult = await awardAdvExp(userId, advExpAmount);
  results.advExpGained = advExpAmount;
  results.advLevelUp = advExpResult.levelUp;
  results.advNewLevel = advExpResult.newLevel;

  await checkAndAward(userId);

  return results;
}

/**
 * 檢查並結算到期遠征（懶結算 hook）
 */
async function checkExpedition(userId) {
  const user = await db.findOne("user", { userId });
  if (!user || !user.activeExpedition) return null;
  if (Date.now() < user.activeExpedition.endsAt) return null;

  return await resolveExpedition(userId);
}

module.exports = {
  isNpcOnExpedition,
  isWeaponOnExpedition,
  getExpeditionPreview,
  calculatePower,
  calculatePlayerPower,
  calculateSuccessRate,
  startExpedition,
  resolveExpedition,
  checkExpedition,
};
