const db = require("../../db.js");
const config = require("../config.js");
const { getSkill, getMaxProficiency } = require("./skillRegistry.js");
const { resolveWeaponType } = require("../weapon/weaponType.js");
const modDefs = require("./modDefs.json");

const SKILL_CFG = config.SKILL;

// Mod 索引
const MOD_MAP = {};
for (const mod of modDefs) {
  MOD_MAP[mod.id] = mod;
}

/**
 * 計算玩家可用技能槽位數
 * @param {object} user
 * @returns {number}
 */
function getPlayerSlotCount(user) {
  const maxProf = getMaxProficiency(user);
  return Math.min(
    SKILL_CFG.PLAYER_SLOTS_MAX,
    SKILL_CFG.PLAYER_SLOTS_BASE + Math.floor(maxProf / 100) * SKILL_CFG.PLAYER_SLOTS_PER_100_PROF,
  );
}

/**
 * 計算 NPC 可用技能槽位數
 * @param {object} npc - hiredNpc 子文件
 * @returns {number}
 */
function getNpcSlotCount(npc) {
  const qualityBonus = SKILL_CFG.NPC_QUALITY_BONUS[npc.quality] || 0;
  const level = npc.level || 1;
  return Math.min(
    SKILL_CFG.NPC_SLOTS_MAX,
    SKILL_CFG.NPC_SLOTS_BASE + Math.floor(level / 2) * SKILL_CFG.NPC_SLOTS_PER_2_LEVEL + qualityBonus,
  );
}

/**
 * 裝備技能到玩家槽位
 * @param {string} userId
 * @param {string} skillId
 * @returns {{ success: boolean, error?: string }}
 */
async function equipSkill(userId, skillId) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };

  const skill = getSkill(skillId);
  if (!skill) return { error: "技能不存在" };

  const learned = user.learnedSkills || [];
  const extras = user.extraSkills || [];
  if (!learned.includes(skillId) && !extras.includes(skillId)) {
    return { error: "尚未學會此技能" };
  }

  const equipped = user.equippedSkills || [];
  if (equipped.some((s) => s.skillId === skillId)) {
    return { error: "此技能已裝備" };
  }

  const maxSlots = getPlayerSlotCount(user);
  if (equipped.length >= maxSlots) {
    return { error: `技能槽位已滿（${maxSlots}/${maxSlots}）` };
  }

  const newEntry = { skillId, mods: [] };
  await db.update(
    "user",
    { userId },
    { $push: { equippedSkills: newEntry } },
  );

  return { success: true, equipped: [...equipped, newEntry] };
}

/**
 * 卸除已裝備的技能
 * @param {string} userId
 * @param {string} skillId
 * @returns {{ success: boolean, error?: string }}
 */
async function unequipSkill(userId, skillId) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };

  const equipped = user.equippedSkills || [];
  if (!equipped.some((s) => s.skillId === skillId)) {
    return { error: "此技能未裝備" };
  }

  await db.update(
    "user",
    { userId },
    { $pull: { equippedSkills: { skillId } } },
  );

  return { success: true };
}

/**
 * 安裝 Mod 到技能
 * @param {string} userId
 * @param {string} skillId
 * @param {string} modId
 * @returns {{ success: boolean, error?: string }}
 */
async function installMod(userId, skillId, modId) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };

  const mod = MOD_MAP[modId];
  if (!mod) return { error: "Mod 不存在" };

  const equipped = user.equippedSkills || [];
  const slotIdx = equipped.findIndex((s) => s.skillId === skillId);
  if (slotIdx === -1) return { error: "此技能未裝備" };

  const slot = equipped[slotIdx];
  if ((slot.mods || []).length >= SKILL_CFG.MOD_MAX_PER_SKILL) {
    return { error: `此技能已達 Mod 上限（${SKILL_CFG.MOD_MAX_PER_SKILL}）` };
  }

  if ((slot.mods || []).includes(modId)) {
    return { error: "此 Mod 已安裝在該技能上" };
  }

  // 檢查 Mod 配額（全局）
  const maxModSlots = Math.floor(getMaxProficiency(user) / 50) * SKILL_CFG.MOD_SLOTS_PER_50_PROF;
  const currentModCount = equipped.reduce((sum, s) => sum + (s.mods || []).length, 0);
  if (currentModCount >= maxModSlots) {
    return { error: `Mod 總配額不足（${currentModCount}/${maxModSlots}）` };
  }

  // 扣 Col
  const cost = Math.floor(mod.cost * (SKILL_CFG.MOD_INSTALL_COST_MULT || 1));
  const { deductCol } = require("../economy/col.js");
  const paid = await deductCol(userId, cost);
  if (!paid) return { error: `Col 不足，安裝需要 ${cost} Col` };

  await db.update(
    "user",
    { userId },
    { $push: { [`equippedSkills.${slotIdx}.mods`]: modId } },
  );

  return { success: true, cost };
}

/**
 * 卸除 Mod
 * @param {string} userId
 * @param {string} skillId
 * @param {string} modId
 * @returns {{ success: boolean, error?: string }}
 */
async function uninstallMod(userId, skillId, modId) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };

  const equipped = user.equippedSkills || [];
  const slotIdx = equipped.findIndex((s) => s.skillId === skillId);
  if (slotIdx === -1) return { error: "此技能未裝備" };

  const slot = equipped[slotIdx];
  if (!(slot.mods || []).includes(modId)) {
    return { error: "此 Mod 未安裝在該技能上" };
  }

  await db.update(
    "user",
    { userId },
    { $pull: { [`equippedSkills.${slotIdx}.mods`]: modId } },
  );

  return { success: true };
}

/**
 * NPC 遺忘指定技能（從 learnedSkills + equippedSkills 移除）
 * @param {string} userId
 * @param {string} npcId
 * @param {string} skillId
 * @returns {{ success: boolean, cost?: number, error?: string }}
 */
async function npcForgetSkill(userId, npcId, skillId) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };

  const npc = (user.hiredNpcs || []).find((n) => n.npcId === npcId);
  if (!npc) return { error: "找不到該 NPC" };

  if (npc.mission) return { error: "NPC 任務中，無法遺忘技能" };
  // 惰性載入避免循環依賴（skillSlot → expedition → rewards → skillSlot）
  const { isNpcOnExpedition } = require("../expedition/expedition.js");
  if (isNpcOnExpedition(user, npcId)) return { error: "NPC 遠征中，無法遺忘技能" };

  const learned = npc.learnedSkills || [];
  if (!learned.includes(skillId)) return { error: "NPC 尚未學會此技能" };

  const skill = getSkill(skillId);
  if (!skill) return { error: "技能不存在" };

  const costTable = SKILL_CFG.NPC_FORGET_COST_BY_TIER || {};
  const cost = costTable[skill.tier] || costTable[1] || 100;

  // 原子操作：扣 Col + 移除 learnedSkills（含 TOCTOU 防護，擋任務與遠征）
  const result = await db.findOneAndUpdate(
    "user",
    {
      userId,
      col: { $gte: cost },
      activeExpedition: null,
      hiredNpcs: { $elemMatch: { npcId, mission: null } },
    },
    {
      $inc: { col: -cost },
      $pull: { "hiredNpcs.$.learnedSkills": skillId },
    },
    { returnDocument: "after" },
  );
  if (!result) return { error: `Col 不足（需要 ${cost}）或 NPC 正在任務/遠征中` };

  // 第二步：移除 equippedSkills（分開避免 MongoDB 多重 $ 限制）
  await db.update(
    "user",
    { userId, "hiredNpcs.npcId": npcId },
    { $pull: { "hiredNpcs.$.equippedSkills": { skillId } } },
  );

  return { success: true, cost, skillName: skill.nameCn };
}

/**
 * 取得戰鬥用的有效技能列表（已裝備且武器匹配）
 * @param {object} user
 * @param {object} weapon - 當前使用的武器
 * @returns {object[]} - [{ skill, mods }]
 */
function getEffectiveSkills(user, weapon) {
  const equipped = user.equippedSkills || [];
  const extras = user.extraSkills || [];
  const weaponType = resolveWeaponType(weapon);

  return equipped
    .map((entry) => {
      const skill = getSkill(entry.skillId);
      if (!skill) return null;

      // 武器技能：需要匹配武器類型
      if (skill.category === "weapon" && skill.weaponType) {
        if (skill.weaponType !== weaponType) return null;
      }

      // extra 技能需要在 extraSkills 中
      if (skill.category === "extra" && !extras.includes(skill.id)) return null;

      return { skill, mods: entry.mods || [] };
    })
    .filter(Boolean);
}

/**
 * 取得 NPC 戰鬥用的有效技能列表
 * @param {object} npc - hiredNpc 子文件
 * @param {object} weapon - NPC 使用的武器
 * @returns {object[]}
 */
function getNpcEffectiveSkills(npc, weapon) {
  const equipped = npc.equippedSkills || [];
  const weaponType = resolveWeaponType(weapon);

  return equipped
    .map((entry) => {
      const skill = getSkill(typeof entry === "string" ? entry : entry.skillId);
      if (!skill) return null;

      if (skill.category === "weapon" && skill.weaponType) {
        if (skill.weaponType !== weaponType) return null;
      }

      return { skill, mods: (typeof entry === "object" ? entry.mods : []) || [] };
    })
    .filter(Boolean);
}

module.exports = {
  getPlayerSlotCount,
  getNpcSlotCount,
  equipSkill,
  unequipSkill,
  npcForgetSkill,
  installMod,
  uninstallMod,
  getEffectiveSkills,
  getNpcEffectiveSkills,
  MOD_MAP,
};
