const { getSkill } = require("../skill/skillRegistry.js");
const { buildSkillContext } = require("../skill/skillCombat.js");

/**
 * 微笑棺木具名成員定義（SAO 原作）
 * 每名成員含 baseStats（隨樓層縮放）、weapon（固定）、skills（固定滿熟練度）
 */
const NAMED_MEMBERS = [
  {
    id: "poh",
    nameCn: "PoH",
    nameJp: "PoH",
    role: "首領",
    baseStats: { hp: 500, atk: 22, def: 12, agi: 14 },
    weapon: {
      weaponName: "Mate Chopper",
      type: "dagger",
      atk: 6, def: 1, agi: 10, hp: 0, cri: 7,
      innateEffects: [{ id: "backstab", type: "ignore_def", value: 0.15 }],
    },
    skills: [
      { skillId: "shadow_sting" },
      { skillId: "accel_raid" },
      { skillId: "rapid_bite" },
      { skillId: "fad_edge" },
    ],
    proficiency: 1000,
    killReward: { col: 1500, battleExp: 150 },
  },
  {
    id: "xaxa",
    nameCn: "赤眼的 XaXa",
    nameJp: "赤目のザザ",
    role: "副首領",
    baseStats: { hp: 400, atk: 18, def: 9, agi: 12 },
    weapon: {
      weaponName: "赤眼的刺劍",
      type: "rapier",
      atk: 7, def: 0, agi: 8, hp: 0, cri: 6,
      innateEffects: [{ id: "sharp", type: "damage_mult", value: 1.1 }],
    },
    skills: [
      { skillId: "flashing_penetrator" },
      { skillId: "quadruple_pain" },
      { skillId: "linear" },
      { skillId: "triangular" },
    ],
    proficiency: 1000,
    killReward: { col: 800, battleExp: 100 },
  },
  {
    id: "johnny_black",
    nameCn: "Johnny Black",
    nameJp: "ジョニー・ブラック",
    role: "毒師",
    baseStats: { hp: 280, atk: 14, def: 6, agi: 16 },
    weapon: {
      weaponName: "毒蛇匕首",
      type: "dagger",
      atk: 4, def: 0, agi: 9, hp: 0, cri: 8,
      innateEffects: [{ id: "venom", type: "lifesteal", value: 0.15 }],
    },
    skills: [
      { skillId: "shadow_sting" },
      { skillId: "rapid_bite" },
      { skillId: "fad_edge" },
    ],
    proficiency: 1000,
    killReward: { col: 600, battleExp: 80 },
  },
  {
    id: "lc_elite_1",
    nameCn: "紅衣殺手",
    nameJp: "赤衣の殺し屋",
    role: "精銳",
    baseStats: { hp: 220, atk: 13, def: 7, agi: 10 },
    weapon: {
      weaponName: "血染長劍",
      type: "one_handed_sword",
      atk: 8, def: 2, agi: 3, hp: 10, cri: 9,
      innateEffects: [],
    },
    skills: [
      { skillId: "sonic_leap" },
      { skillId: "horizontal" },
      { skillId: "slant" },
    ],
    proficiency: 1000,
    killReward: { col: 400, battleExp: 60 },
  },
  {
    id: "lc_elite_2",
    nameCn: "黑衣殺手",
    nameJp: "黒衣の殺し屋",
    role: "精銳",
    baseStats: { hp: 220, atk: 12, def: 8, agi: 9 },
    weapon: {
      weaponName: "黑鐵巨劍",
      type: "two_handed_sword",
      atk: 14, def: 0, agi: 1, hp: 0, cri: 11,
      innateEffects: [],
    },
    skills: [
      { skillId: "earthquake" },
      { skillId: "avalanche" },
      { skillId: "cyclone" },
    ],
    proficiency: 1000,
    killReward: { col: 400, battleExp: 60 },
  },
  {
    id: "lc_elite_3",
    nameCn: "暗殺者",
    nameJp: "暗殺者",
    role: "精銳",
    baseStats: { hp: 200, atk: 15, def: 5, agi: 13 },
    weapon: {
      weaponName: "影刃",
      type: "dagger",
      atk: 5, def: 0, agi: 10, hp: 0, cri: 8,
      innateEffects: [],
    },
    skills: [
      { skillId: "shadow_sting" },
      { skillId: "rapid_bite" },
      { skillId: "fad_edge" },
    ],
    proficiency: 1000,
    killReward: { col: 400, battleExp: 60 },
  },
  {
    id: "lc_elite_4",
    nameCn: "咒毒使",
    nameJp: "呪毒使い",
    role: "精銳",
    baseStats: { hp: 190, atk: 14, def: 6, agi: 11 },
    weapon: {
      weaponName: "腐蝕彎刀",
      type: "curved_sword",
      atk: 8, def: 0, agi: 2, hp: 0, cri: 8,
      innateEffects: [{ id: "venom", type: "lifesteal", value: 0.1 }],
    },
    skills: [
      { skillId: "whirlwind" },
      { skillId: "reaver" },
      { skillId: "fell_crescent" },
    ],
    proficiency: 1000,
    killReward: { col: 400, battleExp: 60 },
  },
  {
    id: "lc_elite_5",
    nameCn: "幻影劍士",
    nameJp: "幻影の剣士",
    role: "精銳",
    baseStats: { hp: 210, atk: 13, def: 7, agi: 12 },
    weapon: {
      weaponName: "霧隱",
      type: "katana",
      atk: 6, def: 0, agi: 4, hp: 0, cri: 7,
      innateEffects: [],
    },
    skills: [
      { skillId: "ukifune" },
      { skillId: "tsujikaze" },
      { skillId: "gengetsu" },
    ],
    proficiency: 1000,
    killReward: { col: 400, battleExp: 60 },
  },
];

/**
 * 雜魚模板（weapon 隨機 dagger/one_handed_sword）
 */
const GRUNT_TEMPLATES = [
  {
    nameCn: "微笑棺木殺手",
    weapon: { weaponName: "鏽蝕短劍", type: "one_handed_sword", atk: 6, def: 1, agi: 2, hp: 0, cri: 10, innateEffects: [] },
    skills: [{ skillId: "horizontal" }],
  },
  {
    nameCn: "微笑棺木暗殺者",
    weapon: { weaponName: "黑匕首", type: "dagger", atk: 3, def: 0, agi: 8, hp: 0, cri: 9, innateEffects: [] },
    skills: [{ skillId: "rapid_bite" }],
  },
  {
    nameCn: "微笑棺木劍士",
    weapon: { weaponName: "鏽蝕長劍", type: "one_handed_sword", atk: 7, def: 1, agi: 1, hp: 5, cri: 10, innateEffects: [] },
    skills: [{ skillId: "slant" }],
  },
];

const GRUNT_BASE_STATS = { hp: 120, atk: 9, def: 4, agi: 8 };
const GRUNT_PROFICIENCY = 500;
const GRUNT_KILL_REWARD = { col: 100, battleExp: 20 };

/** 取得具名成員定義（by id） */
function getMemberDef(memberId) {
  return NAMED_MEMBERS.find((m) => m.id === memberId) || null;
}

/** 取得所有具名成員 ID 列表 */
function getAllMemberIds() {
  return NAMED_MEMBERS.map((m) => m.id);
}

/** 取得所有具名成員定義（含武器劍技，供 admin 顯示） */
function getMembersForDisplay() {
  return NAMED_MEMBERS.map((m) => ({
    id: m.id,
    nameCn: m.nameCn,
    role: m.role,
    weaponName: m.weapon.weaponName,
    weaponType: m.weapon.type,
    skillNames: m.skills
      .map((s) => getSkill(s.skillId))
      .filter(Boolean)
      .map((sk) => sk.nameCn),
  }));
}

/** 取得所有具名成員基本資料（僅 id/名稱/角色，供玩家端顯示） */
function getMembersBasicInfo() {
  return NAMED_MEMBERS.map((m) => ({
    id: m.id,
    nameCn: m.nameCn,
    role: m.role,
  }));
}

/**
 * 建構 LC 成員的戰鬥 fighter（for pvpCombatLoop）
 * 合算方式同 hired NPC（buildPvePlayerSide）：
 *   HP = baseHP×scale + weapon.hp
 *   ATK = weapon.atk + floor(baseATK×scale×0.5)
 *   DEF = weapon.def + floor(baseDEF×scale×0.5)
 *   AGI = max(weapon.agi, round(baseAGI×scale))
 *   CRI = weapon.cri
 */
function buildLcFighter(memberDef, currentFloor) {
  const scale = 1 + (currentFloor - 10) * 0.1;
  const bs = memberDef.baseStats;
  const w = memberDef.weapon;
  return {
    name: `[Laughing Coffin] ${memberDef.nameCn}`,
    hp: Math.round(bs.hp * scale) + (w.hp || 0),
    stats: {
      atk: (w.atk || 0) + Math.floor(bs.atk * scale * 0.5),
      def: (w.def || 0) + Math.floor(bs.def * scale * 0.5),
      agi: Math.max(w.agi || 0, Math.round(bs.agi * scale)),
      cri: w.cri || 10,
    },
    innateEffects: w.innateEffects || [],
  };
}

/**
 * 建構 LC 成員的劍技上下文（for pvpCombatLoop）
 */
function buildLcSkillContext(memberDef) {
  const effectiveSkills = (memberDef.skills || [])
    .map((s) => ({ skill: getSkill(s.skillId), mods: s.mods || [] }))
    .filter((s) => s.skill);
  if (effectiveSkills.length === 0) return null;
  return buildSkillContext(effectiveSkills, memberDef.proficiency, memberDef.weapon.type);
}

/**
 * 產生縮放後的雜魚 fighter + skillCtx
 */
function buildGruntFighter(currentFloor) {
  const template = GRUNT_TEMPLATES[Math.floor(Math.random() * GRUNT_TEMPLATES.length)];
  const scale = 1 + (currentFloor - 10) * 0.1;
  const bs = GRUNT_BASE_STATS;
  const w = template.weapon;

  const fighter = {
    name: `[Laughing Coffin] ${template.nameCn}`,
    hp: Math.round(bs.hp * scale) + (w.hp || 0),
    stats: {
      atk: (w.atk || 0) + Math.floor(bs.atk * scale * 0.5),
      def: (w.def || 0) + Math.floor(bs.def * scale * 0.5),
      agi: Math.max(w.agi || 0, Math.round(bs.agi * scale)),
      cri: w.cri || 10,
    },
    innateEffects: w.innateEffects || [],
  };

  const effectiveSkills = (template.skills || [])
    .map((s) => ({ skill: getSkill(s.skillId), mods: [] }))
    .filter((s) => s.skill);
  const skillCtx = effectiveSkills.length > 0
    ? buildSkillContext(effectiveSkills, GRUNT_PROFICIENCY, w.type)
    : null;

  return { fighter, skillCtx, nameCn: template.nameCn };
}

module.exports = {
  NAMED_MEMBERS,
  GRUNT_KILL_REWARD,
  getMemberDef,
  getAllMemberIds,
  getMembersForDisplay,
  getMembersBasicInfo,
  buildLcFighter,
  buildLcSkillContext,
  buildGruntFighter,
};
