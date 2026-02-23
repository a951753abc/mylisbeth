const type = require("./type.js");
const { calculateRarity } = require("./weapon/rarity.js");
const config = require("./config.js");
const { getExpForNextLevel } = require("./level.js");
const { getAdvExpToNextLevel } = require("./progression/adventureLevel.js");
const { getExpForNextLevel: getBattleExpForNextLevel } = require("./battleLevel.js");
const { getHireLimit } = require("./npc/npcManager.js");

module.exports = function (user) {
  const items = [];
  if (user.itemStock) {
    user.itemStock.forEach((value, key) => {
      if (value && value.itemNum > 0) {
        items.push({
          index: key,
          name: value.itemName,
          level: value.itemLevel,
          levelText: type.ssrList(value.itemLevel),
          num: value.itemNum,
        });
      }
    });
  }

  const weapons = [];
  if (user.weaponStock) {
    user.weaponStock.forEach((value, key) => {
      let weaponName = value.weaponName;
      if (value.buff) {
        weaponName = weaponName + "+" + value.buff;
      }
      const rarity = value.rarity
        ? {
            id: value.rarity,
            label: value.rarityLabel,
            color: value.rarityColor,
          }
        : calculateRarity(value);
      weapons.push({
        index: key,
        name: value.name,
        weaponName,
        atk: value.atk,
        def: value.def,
        agi: value.agi,
        cri: value.cri,
        hp: value.hp,
        durability: value.durability,
        rarity: rarity.id,
        rarityLabel: rarity.label,
        rarityColor: rarity.color,
        totalScore:
          rarity.totalScore ||
          (value.atk || 0) +
            (value.def || 0) +
            (value.agi || 0) +
            Math.max(0, 14 - (value.cri || 10)) +
            (value.hp || 0) +
            (value.maxDurability || value.durability || 0),
        renameCount: value.renameCount || 0,
        innateEffects: value.innateEffects || [],
      });
    });
  }

  const wins = {};
  const winCategories = [
    "[優樹]Win",
    "[Hell]Win",
    "[Hard]Win",
    "[Normal]Win",
    "[Easy]Win",
  ];
  winCategories.forEach((cat) => {
    const val = user[cat] ?? 0;
    if (val > 0) {
      wins[cat] = val;
    }
  });

  // Season 3: NPC 資料（前端只需要展示用的精簡版）
  const hiredNpcs = (user.hiredNpcs || []).map((npc) => ({
    npcId: npc.npcId,
    name: npc.name,
    class: npc.class,
    quality: npc.quality,
    baseStats: npc.baseStats,
    condition: npc.condition ?? 100,
    level: npc.level ?? 1,
    exp: npc.exp ?? 0,
    equippedWeaponIndex: npc.equippedWeaponIndex ?? null,
    monthlyCost: npc.monthlyCost || npc.weeklyCost,
    mission: npc.mission ? {
      type: npc.mission.type,
      name: npc.mission.name,
      endsAt: npc.mission.endsAt,
      isTraining: npc.mission.isTraining || false,
    } : null,
    // Season 9: 劍技系統
    learnedSkills: npc.learnedSkills || [],
    equippedSkills: npc.equippedSkills || [],
    weaponProficiency: typeof npc.weaponProficiency === "object"
      ? (npc.weaponProficiency || {})
      : (npc.proficientType && npc.weaponProficiency
        ? { [npc.proficientType]: npc.weaponProficiency }
        : {}),
  }));

  const mineLevel = user.mineLevel ?? 1;
  const forgeLevel = user.forgeLevel ?? 1;
  const battleLevel = user.battleLevel ?? 1;
  const adventureLevel = user.adventureLevel ?? 1;

  return {
    userId: user.userId ?? "",
    name: user.name ?? "",
    lost: user.lost ?? 0,
    mineLevel,
    forgeLevel,
    mineExp: user.mine ?? 0,
    mineExpNext: getExpForNextLevel("mine", mineLevel),
    forgeExp: user.forge ?? 0,
    forgeExpNext: getExpForNextLevel("forge", forgeLevel),
    items,
    weapons,
    wins,
    // Season 2 fields
    col: user.col ?? 0,
    currentFloor: user.currentFloor ?? 1,
    floorProgress: user.floorProgress ?? { 1: { explored: 0, maxExplore: 5 } },
    title: user.title ?? null,
    availableTitles: user.availableTitles ?? [],
    achievements: user.achievements ?? [],
    stats: user.stats ?? {},
    bossContribution: user.bossContribution ?? {
      totalDamage: 0,
      bossesDefeated: 0,
      mvpCount: 0,
    },
    // Season 3 fields
    hiredNpcs,
    debt: user.debt ?? 0,
    isInDebt: user.isInDebt ?? false,
    debtCycleCount: user.debtCycleCount ?? 0,
    nextSettlementAt: user.nextSettlementAt ?? null,
    gameCreatedAt: user.gameCreatedAt ?? null,
    // Season 3: 玩家體力值
    stamina: user.stamina ?? config.STAMINA.MAX,
    maxStamina: user.maxStamina ?? config.STAMINA.MAX,
    lastStaminaRegenAt: user.lastStaminaRegenAt ?? null,
    // Season 4: Boss 聖遺物
    bossRelics: (user.bossRelics || []).map((r) => ({
      id: r.id,
      name: r.name,
      nameCn: r.nameCn,
      bossFloor: r.bossFloor,
      effects: r.effects || {},
      obtainedAt: r.obtainedAt,
    })),
    // Season 5: 戰鬥等級 & PVP
    battleLevel,
    battleExp: user.battleExp ?? 0,
    battleExpNext: getBattleExpForNextLevel(battleLevel),
    isPK: user.isPK ?? false,
    pkKills: user.pkKills ?? 0,
    defenseWeaponIndex: user.defenseWeaponIndex ?? 0,
    // Season 10: 樓層往返
    activeFloor: user.activeFloor ?? null,
    // Season 7: 暫停營業
    businessPaused: user.businessPaused ?? false,
    businessPausedAt: user.businessPausedAt ?? null,
    // Season 7: 冒險等級
    adventureLevel,
    adventureExp: user.adventureExp ?? 0,
    adventureExpNext: getAdvExpToNextLevel(adventureLevel),
    hireLimit: getHireLimit(adventureLevel),
    // Season 13: 遠征
    activeExpedition: user.activeExpedition ?? null,
    lastExpeditionAt: user.lastExpeditionAt ?? null,
    // 倉庫摘要
    warehouse: (() => {
      const wh = user.warehouse || { built: false, level: 0, items: [], weapons: [] };
      const unlockFloor = config.WAREHOUSE.UNLOCK_FLOOR;
      return {
        unlocked: (user.currentFloor || 1) >= unlockFloor,
        built: wh.built || false,
        level: wh.level || 0,
        itemCount: (wh.items || []).filter((i) => i.itemNum > 0).length,
        weaponCount: (wh.weapons || []).filter(Boolean).length,
      };
    })(),
    // Season 8: 封印武器
    sealedWeapons: (user.sealedWeapons || []).map((w, idx) => {
      const rarity = w.rarity
        ? { id: w.rarity, label: w.rarityLabel, color: w.rarityColor }
        : calculateRarity(w);
      const totalScore =
        rarity.totalScore ||
        (w.atk || 0) +
          (w.def || 0) +
          (w.agi || 0) +
          Math.max(0, 14 - (w.cri || 10)) +
          (w.hp || 0) +
          (w.maxDurability || w.durability || 0);
      return {
        index: idx,
        name: w.name,
        weaponName: w.weaponName,
        atk: w.atk,
        def: w.def,
        agi: w.agi,
        cri: w.cri,
        hp: w.hp,
        durability: w.durability,
        buff: w.buff || 0,
        rarity: rarity.id,
        rarityLabel: rarity.label,
        rarityColor: rarity.color,
        totalScore,
        sealedAt: w.sealedAt,
        innateEffects: w.innateEffects || [],
      };
    }),
  };
};
