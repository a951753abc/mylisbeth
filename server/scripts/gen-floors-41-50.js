// Temporary script to generate floors 41-50 JSON data
// Run: node server/scripts/gen-floors-41-50.js

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

const themes = [
  {
    floor: 41, name: "時空の回廊", nameCn: "時空回廊",
    enemies: ["時空のスライム", "時空の歩兵", "時空の将軍", "時空の番人", "時空の竜人"],
    bossName: "時空龍クロノス", initialWeapon: "時空の爪",
    phases: [
      { w: "時空の爪", sm: "時空撃・クロノスクロー", db: 2, ab: 4 },
      { w: "時空の鎧＋爪", sm: "時空結界・クロノスウォール", db: 5, ab: 2 },
      { w: "時空の双翼", sm: "時空乱舞・クロノスダンス", db: -2, ab: 10 },
      { w: "時空龍の力（時空覚醒）", sm: "時空崩壊・クロノスブレイク", db: -4, ab: 18 },
    ],
    drops: [{ name: "時空龍の鱗", r: 3 }, { name: "時空の砂", r: 2 }],
    relic: { id: "chronos_hourglass", name: "時空龍の砂時計", nameCn: "時空龍之砂時計", effects: { bossDamage: 0.20, battleAgi: 0.20 } },
    places: ["時の階段", "歪みの回廊", "停止した広間", "時空龍の巣", "BOSS房"],
    materials: ["mat_floor41_ore", "mat_floor41_crystal"],
    mechanics: {
      agiPenalty: { threshold: 21, damageMult: 0.30, descriptionCn: "時空歪曲：AGI 不足 21 時，傷害降為 30%" },
      weaponAffinity: { weak: ["one_handed_sword", "katana"], resist: ["two_handed_sword", "two_handed_axe"], immune: [], weakMult: 1.5, resistMult: 0.5, immuneMult: 0.1, descriptionCn: "時空鱗甲：劍/刀有效（+50%），重武器無效（-50%）" },
      weaponBreak: { chance: 12, durabilityDamage: [2, 5], descriptionCn: "時空侵蝕：Boss 命中時 12% 機率侵蝕武器 2~5 耐久" },
      persistentDebuff: { chance: 18, effects: [{ stat: "atk", mult: 0.75, durationMs: 1800000 }], descriptionCn: "時空詛咒：18% 機率降低 ATK 25%，持續 30 分鐘" },
    },
  },
  {
    floor: 42, name: "永凍の氷窟", nameCn: "永凍冰窟",
    enemies: ["氷の妖精", "氷結の騎士", "氷結の将軍", "氷帝の近衛", "氷の大公"],
    bossName: "氷帝グラシア", initialWeapon: "氷帝の大剣",
    phases: [
      { w: "氷帝の大剣", sm: "氷結撃・グラシアスラッシュ", db: 2, ab: 4 },
      { w: "氷帝の鎧＋大剣", sm: "氷結結界・フロストウォール", db: 6, ab: 2 },
      { w: "氷帝の双氷剣", sm: "氷結乱舞・ブリザードダンス", db: -2, ab: 10 },
      { w: "氷帝の力（永凍覚醒）", sm: "永凍崩壊・アブソリュートゼロ", db: -4, ab: 19 },
    ],
    drops: [{ name: "氷帝の結晶", r: 3 }, { name: "永凍の氷", r: 2 }],
    relic: { id: "glacius_core", name: "氷帝の結晶核", nameCn: "氷帝結晶核", effects: { battleDef: 0.25, bossDamage: 0.15 } },
    places: ["氷の階段", "凍てつく回廊", "氷結の広間", "永凍の深部", "BOSS房"],
    materials: ["mat_floor41_ore", "mat_floor41_crystal"],
    mechanics: {
      agiPenalty: { threshold: 22, damageMult: 0.25, descriptionCn: "永凍領域：AGI 不足 22 時，傷害降為 25%" },
      weaponAffinity: { weak: ["two_handed_axe", "mace"], resist: ["dagger", "bow"], immune: [], weakMult: 1.5, resistMult: 0.5, immuneMult: 0.1, descriptionCn: "氷結護甲：斧/棍有效（+50%），短劍/弓無效（-50%）" },
      persistentDebuff: { chance: 20, effects: [{ stat: "def", mult: 0.7, durationMs: 2700000 }], descriptionCn: "永凍詛咒：20% 機率降低 DEF 30%，持續 45 分鐘" },
    },
  },
  {
    floor: 43, name: "妖樹の迷宮", nameCn: "妖樹迷宮",
    enemies: ["妖樹の苗木", "妖樹の番兵", "妖樹の将軍", "妖樹の守護者", "妖樹の大公"],
    bossName: "妖樹王エント", initialWeapon: "妖樹の根",
    phases: [
      { w: "妖樹の根", sm: "妖樹撃・エントルート", db: 2, ab: 5 },
      { w: "妖樹の鎧＋根", sm: "妖樹結界・フォレストウォール", db: 5, ab: 2 },
      { w: "妖樹の大枝", sm: "妖樹乱舞・フォレストダンス", db: -2, ab: 11 },
      { w: "妖樹王の力（妖樹覚醒）", sm: "妖樹崩壊・エントブレイク", db: -4, ab: 19 },
    ],
    drops: [{ name: "妖樹王の樹液", r: 3 }, { name: "妖樹の根", r: 2 }],
    relic: { id: "ent_heart", name: "妖樹王の心核", nameCn: "妖樹王之心", effects: { battleAtk: 0.20, npcCondLoss: -0.25 } },
    places: ["妖樹の入口", "根の迷路", "樹海の広間", "妖樹王の根城", "BOSS房"],
    materials: ["mat_floor43_ore", "mat_floor43_crystal"],
    mechanics: {
      weaponAffinity: { weak: ["spear", "bow"], resist: ["one_handed_sword", "shield"], immune: [], weakMult: 1.5, resistMult: 0.5, immuneMult: 0.1, descriptionCn: "妖樹之體：槍/弓有效（+50%），劍/盾無效（-50%）" },
      weaponBreak: { chance: 15, durabilityDamage: [2, 6], descriptionCn: "妖樹侵蝕：Boss 命中時 15% 機率侵蝕武器 2~6 耐久" },
      weaponCopy: { copyRate: 0.03 },
    },
  },
  {
    floor: 44, name: "黒鉄の砦", nameCn: "黑鐵堡壘",
    enemies: ["黒鉄の兵士", "黒鉄の重騎士", "黒鉄の将軍", "黒鉄の近衛隊長", "黒鉄の副将"],
    bossName: "黒鉄将グラディウス", initialWeapon: "黒鉄の大槍",
    phases: [
      { w: "黒鉄の大槍", sm: "黒鉄突撃・グラディウスランス", db: 2, ab: 5 },
      { w: "黒鉄の鎧＋大盾", sm: "黒鉄結界・アイアンフォートレス", db: 6, ab: 3 },
      { w: "黒鉄の双大剣", sm: "黒鉄乱舞・グラディウスダンス", db: -2, ab: 11 },
      { w: "黒鉄将の力（黒鉄覚醒）", sm: "黒鉄崩壊・グラディウスブレイク", db: -4, ab: 20 },
    ],
    drops: [{ name: "黒鉄将の勲章", r: 3 }, { name: "黒鉄の破片", r: 2 }],
    relic: { id: "gladius_insignia", name: "黒鉄将の軍徽", nameCn: "黑鐵將軍徽", effects: { battleAtk: 0.22, battleDef: 0.18 } },
    places: ["黒鉄の城門", "鉄壁の回廊", "軍議の間", "黒鉄将の砦", "BOSS房"],
    materials: ["mat_floor43_ore", "mat_floor43_crystal"],
    mechanics: {
      agiPenalty: { threshold: 23, damageMult: 0.25, descriptionCn: "鐵壁領域：AGI 不足 23 時，傷害降為 25%" },
      weaponAffinity: { weak: ["dagger", "rapier"], resist: ["two_handed_sword", "two_handed_axe"], immune: [], weakMult: 1.5, resistMult: 0.5, immuneMult: 0.1, descriptionCn: "黑鐵重甲：短劍/細劍有效（+50%），重武器無效（-50%）" },
      persistentDebuff: { chance: 20, effects: [{ stat: "agi", mult: 0.7, durationMs: 1800000 }], descriptionCn: "黑鐵詛咒：20% 機率降低 AGI 30%，持續 30 分鐘" },
      weaponCopy: { copyRate: 0.04 },
    },
  },
  {
    floor: 45, name: "星墜の荒野", nameCn: "星墜荒野",
    enemies: ["星屑のゴーレム", "星墜の戦士", "星墜の将軍", "星墜の巨人", "星墜の神官"],
    bossName: "星墜神メテオラ", initialWeapon: "星墜の拳",
    phases: [
      { w: "星墜の拳", sm: "星墜撃・メテオストライク", db: 2, ab: 5 },
      { w: "星墜の鎧＋拳", sm: "星墜結界・スターウォール", db: 6, ab: 3 },
      { w: "星墜の隕石腕", sm: "星墜乱舞・メテオシャワー", db: -2, ab: 12 },
      { w: "星墜神の力（星墜覚醒）", sm: "星墜崩壊・メテオインパクト", db: -5, ab: 21 },
    ],
    drops: [{ name: "星墜神の核", r: 3 }, { name: "星屑の欠片", r: 2 }],
    relic: { id: "meteora_fragment", name: "星墜の欠片", nameCn: "星墜碎片", effects: { bossDamage: 0.28, battleAtk: 0.20 } },
    places: ["星墜の平原", "隕石の谷", "星屑の広場", "星墜神の祭壇", "BOSS房"],
    materials: ["mat_floor45_ore", "mat_floor45_crystal"],
    mechanics: {
      agiPenalty: { threshold: 24, damageMult: 0.25, descriptionCn: "星墜領域：AGI 不足 24 時，傷害降為 25%" },
      weaponAffinity: { weak: ["one_handed_sword", "spear"], resist: ["curved_sword", "bow"], immune: [], weakMult: 1.5, resistMult: 0.5, immuneMult: 0.1, descriptionCn: "星墜護體：劍/槍有效（+50%），彎刀/弓無效（-50%）" },
      weaponBreak: { chance: 15, durabilityDamage: [3, 6], descriptionCn: "星墜衝擊：Boss 命中時 15% 機率損傷武器 3~6 耐久" },
      persistentDebuff: { chance: 25, effects: [{ stat: "atk", mult: 0.7, durationMs: 2700000 }], descriptionCn: "星墜詛咒：25% 機率降低 ATK 30%，持續 45 分鐘" },
      weaponCopy: { copyRate: 0.05 },
    },
  },
  {
    floor: 46, name: "血霧の回廊", nameCn: "血霧迴廊",
    enemies: ["血霧のゴースト", "血霧の騎士", "血霧の将軍", "血霧の貴族", "血霧の侯爵"],
    bossName: "血霧卿ヴァンパイア", initialWeapon: "血霧の双爪",
    phases: [
      { w: "血霧の双爪", sm: "血霧撃・ブラッドクロー", db: 2, ab: 6 },
      { w: "血霧のマント＋爪", sm: "血霧結界・ブラッドミスト", db: 6, ab: 3 },
      { w: "血霧の大鎌", sm: "血霧乱舞・ブラッドダンス", db: -2, ab: 12 },
      { w: "血霧卿の力（血霧覚醒）", sm: "血霧崩壊・ブラッドブレイク", db: -5, ab: 22 },
    ],
    drops: [{ name: "血霧卿の血玉", r: 3 }, { name: "血の結晶", r: 2 }],
    relic: { id: "vampire_fang", name: "血霧卿の牙", nameCn: "血霧卿之牙", effects: { battleAtk: 0.25, npcDeathChance: -0.25 } },
    places: ["血霧の入口", "赤い回廊", "血の広間", "血霧卿の城", "BOSS房"],
    materials: ["mat_floor45_ore", "mat_floor45_crystal"],
    mechanics: {
      weaponAffinity: { weak: ["dagger", "mace"], resist: ["one_handed_sword", "shield"], immune: [], weakMult: 1.5, resistMult: 0.5, immuneMult: 0.1, descriptionCn: "血霧之體：短劍/棍有效（+50%），劍/盾無效（-50%）" },
      weaponBreak: { chance: 18, durabilityDamage: [3, 7], descriptionCn: "血霧侵蝕：Boss 命中時 18% 機率侵蝕武器 3~7 耐久" },
      persistentDebuff: { chance: 25, effects: [{ stat: "def", mult: 0.65, durationMs: 2700000 }], descriptionCn: "血霧詛咒：25% 機率降低 DEF 35%，持續 45 分鐘" },
      weaponCopy: { copyRate: 0.05 },
    },
  },
  {
    floor: 47, name: "天機の殿堂", nameCn: "天機殿堂",
    enemies: ["天機の自動兵", "天機の機騎士", "天機の将軍", "天機の守護者", "天機の副帝"],
    bossName: "天機帝デウスマキナ", initialWeapon: "天機の大腕",
    phases: [
      { w: "天機の大腕", sm: "天機撃・マキナストライク", db: 3, ab: 6 },
      { w: "天機の鎧＋腕", sm: "天機結界・マキナウォール", db: 7, ab: 3 },
      { w: "天機の双大砲", sm: "天機乱舞・マキナバースト", db: -3, ab: 13 },
      { w: "天機帝の力（天機覚醒）", sm: "天機崩壊・デウスマキナブレイク", db: -5, ab: 23 },
    ],
    drops: [{ name: "天機帝の歯車", r: 3 }, { name: "天機の部品", r: 2 }],
    relic: { id: "deus_gear", name: "天機帝の心臓歯車", nameCn: "天機帝齒輪", effects: { bossDamage: 0.30, battleAgi: 0.22 } },
    places: ["歯車の階段", "機械の回廊", "制御室", "天機帝の宮殿", "BOSS房"],
    materials: ["mat_floor47_ore", "mat_floor47_crystal"],
    mechanics: {
      agiPenalty: { threshold: 25, damageMult: 0.20, descriptionCn: "天機領域：AGI 不足 25 時，傷害降為 20%" },
      weaponAffinity: { weak: ["two_handed_axe", "spear"], resist: ["dagger", "bow"], immune: [], weakMult: 1.5, resistMult: 0.5, immuneMult: 0.1, descriptionCn: "天機裝甲：斧/槍有效（+50%），短劍/弓無效（-50%）" },
      weaponBreak: { chance: 20, durabilityDamage: [3, 8], descriptionCn: "天機粉碎：Boss 命中時 20% 機率損傷武器 3~8 耐久" },
      weaponCopy: { copyRate: 0.06 },
    },
  },
  {
    floor: 48, name: "冥界の門", nameCn: "冥界之門",
    enemies: ["冥界のスケルトン", "冥界の死霊騎士", "冥界の将軍", "冥界の死神", "冥界の大公"],
    bossName: "冥王タナトス", initialWeapon: "冥王の大鎌",
    phases: [
      { w: "冥王の大鎌", sm: "冥撃・デスサイズ", db: 3, ab: 6 },
      { w: "冥王の鎧＋鎌", sm: "冥界結界・デスウォール", db: 7, ab: 3 },
      { w: "冥王の双大鎌", sm: "冥界乱舞・デスダンス", db: -3, ab: 14 },
      { w: "冥王の力（冥界覚醒）", sm: "冥界崩壊・タナトスブレイク", db: -6, ab: 24 },
    ],
    drops: [{ name: "冥王の魂石", r: 3 }, { name: "冥界の霧", r: 2 }],
    relic: { id: "thanatos_scythe", name: "冥王の小鎌", nameCn: "冥王死神鐮", effects: { battleAtk: 0.28, battleDef: 0.20 } },
    places: ["冥界の入口", "死者の回廊", "亡者の広間", "冥王の玉座", "BOSS房"],
    materials: ["mat_floor47_ore", "mat_floor47_crystal"],
    mechanics: {
      agiPenalty: { threshold: 26, damageMult: 0.20, descriptionCn: "冥界領域：AGI 不足 26 時，傷害降為 20%" },
      weaponAffinity: { weak: ["katana", "rapier"], resist: ["two_handed_sword", "two_handed_axe"], immune: [], weakMult: 1.5, resistMult: 0.5, immuneMult: 0.1, descriptionCn: "冥界護體：刀/細劍有效（+50%），重武器無效（-50%）" },
      weaponBreak: { chance: 20, durabilityDamage: [4, 8], descriptionCn: "冥界侵蝕：Boss 命中時 20% 機率侵蝕武器 4~8 耐久" },
      persistentDebuff: { chance: 30, effects: [{ stat: "atk", mult: 0.6, durationMs: 3600000 }], descriptionCn: "冥界詛咒：30% 機率降低 ATK 40%，持續 60 分鐘" },
      weaponCopy: { copyRate: 0.06 },
    },
  },
  {
    floor: 49, name: "神罰の塔", nameCn: "神罰之塔",
    enemies: ["神罰の使徒", "神罰の裁定兵", "神罰の将軍", "神罰の大天使", "神罰の熾天使"],
    bossName: "神罰者ネメシス", initialWeapon: "神罰の天秤",
    phases: [
      { w: "神罰の天秤", sm: "神罰撃・ジャッジメントストライク", db: 3, ab: 7 },
      { w: "神罰の鎧＋天秤", sm: "神罰結界・ジャスティスウォール", db: 7, ab: 3 },
      { w: "神罰の双剣", sm: "神罰乱舞・ジャッジメントダンス", db: -3, ab: 15 },
      { w: "神罰者の力（神罰覚醒）", sm: "神罰崩壊・ネメシスブレイク", db: -6, ab: 26 },
    ],
    drops: [{ name: "神罰者の天秤片", r: 3 }, { name: "神罰の光", r: 2 }],
    relic: { id: "nemesis_scale", name: "神罰者の天秤", nameCn: "神罰者天秤", effects: { bossDamage: 0.32, battleAtk: 0.25, battleDef: 0.18 } },
    places: ["審判の階段", "裁きの回廊", "天秤の間", "神罰の頂上", "BOSS房"],
    materials: ["mat_floor49_ore", "mat_floor49_crystal"],
    mechanics: {
      agiPenalty: { threshold: 27, damageMult: 0.20, descriptionCn: "神罰領域：AGI 不足 27 時，傷害降為 20%" },
      weaponAffinity: { weak: ["one_handed_sword", "mace"], resist: ["dagger", "curved_sword"], immune: [], weakMult: 1.5, resistMult: 0.5, immuneMult: 0.1, descriptionCn: "神罰護法：劍/棍有效（+50%），短劍/彎刀無效（-50%）" },
      weaponBreak: { chance: 25, durabilityDamage: [4, 10], descriptionCn: "神罰制裁：Boss 命中時 25% 機率損傷武器 4~10 耐久" },
      persistentDebuff: { chance: 30, effects: [{ stat: "def", mult: 0.6, durationMs: 3600000 }], descriptionCn: "神罰詛咒：30% 機率降低 DEF 40%，持續 60 分鐘" },
      weaponCopy: { copyRate: 0.07 },
    },
  },
  {
    floor: 50, name: "覇王の玉座", nameCn: "覇王王座",
    enemies: ["覇王の残影", "覇王の衛兵", "覇王の将軍", "覇王の近衛", "覇王の王子"],
    bossName: "覇王アインクラッド", initialWeapon: "覇王の大剣",
    phases: [
      { w: "覇王の大剣", sm: "覇王撃・オーバーロードスラッシュ", db: 3, ab: 8 },
      { w: "覇王の鎧＋大剣", sm: "覇王結界・オーバーロードシールド", db: 8, ab: 4 },
      { w: "覇王の双大剣", sm: "覇王乱舞・オーバーロードダンス", db: -4, ab: 16 },
      { w: "覇王の力（覇王覚醒）", sm: "覇王崩壊・オーバーロードブレイク", db: -8, ab: 30 },
    ],
    drops: [{ name: "覇王の紋章", r: 3 }, { name: "覇者の結晶", r: 2 }],
    relic: { id: "aincrad_crown", name: "覇王の冠", nameCn: "覇王之冠", effects: { bossDamage: 0.35, battleAtk: 0.30, battleDef: 0.22, battleAgi: 0.20 } },
    places: ["覇王の道", "覇者の回廊", "大広間", "覇王の玉座", "BOSS房"],
    materials: ["mat_floor49_ore", "mat_floor49_crystal"],
    mechanics: {
      agiPenalty: { threshold: 28, damageMult: 0.15, descriptionCn: "覇王領域：AGI 不足 28 時，傷害降為 15%" },
      weaponAffinity: { weak: ["rapier", "katana"], resist: ["shield", "two_handed_axe"], immune: ["curved_sword"], weakMult: 1.5, resistMult: 0.5, immuneMult: 0.1, descriptionCn: "覇王之體：細劍/刀有效（+50%），盾/斧無效（-50%），彎刀免疫（-90%）" },
      weaponBreak: { chance: 30, durabilityDamage: [5, 12], descriptionCn: "覇王粉碎：Boss 命中時 30% 機率損傷武器 5~12 耐久" },
      persistentDebuff: { chance: 35, effects: [{ stat: "atk", mult: 0.5, durationMs: 5400000 }], descriptionCn: "覇王詛咒：35% 機率降低 ATK 50%，持續 90 分鐘" },
      weaponCopy: { copyRate: 0.08 },
    },
  },
];

// Boss stats from plan
const bossStats = [
  { hp: 1300000, atk: 100, def: 52, agi: 25 },
  { hp: 1600000, atk: 104, def: 55, agi: 26 },
  { hp: 2000000, atk: 108, def: 58, agi: 24 },
  { hp: 2500000, atk: 112, def: 62, agi: 27 },
  { hp: 3200000, atk: 118, def: 56, agi: 28 },
  { hp: 4000000, atk: 122, def: 60, agi: 26 },
  { hp: 5000000, atk: 128, def: 64, agi: 29 },
  { hp: 6300000, atk: 134, def: 68, agi: 30 },
  { hp: 8000000, atk: 140, def: 72, agi: 31 },
  { hp: 10000000, atk: 150, def: 80, agi: 32 },
];

// Enemy stat endpoints
const enemyF41 = {
  Easy:   { hp: 330,  atk: 30,  def: 21, agi: 14, cri: 3 },
  Normal: { hp: 570,  atk: 38,  def: 27, agi: 16, cri: 3 },
  Hard:   { hp: 1050, atk: 50,  def: 34, agi: 18, cri: 2 },
  Hell:   { hp: 2000, atk: 68,  def: 42, agi: 21, cri: 2 },
  Yuki:   { hp: 3850, atk: 94,  def: 54, agi: 25, cri: 1 },
};
const enemyF50 = {
  Easy:   { hp: 520,  atk: 45,  def: 32, agi: 22, cri: 3 },
  Normal: { hp: 900,  atk: 58,  def: 40, agi: 24, cri: 3 },
  Hard:   { hp: 1660, atk: 76,  def: 52, agi: 26, cri: 2 },
  Hell:   { hp: 3200, atk: 105, def: 66, agi: 30, cri: 2 },
  Yuki:   { hp: 6200, atk: 145, def: 84, agi: 34, cri: 1 },
};

const categories = ["[Easy]", "[Normal]", "[Hard]", "[Hell]", "[優樹]"];
const catKeys = ["Easy", "Normal", "Hard", "Hell", "Yuki"];

function buildFloor(theme, idx) {
  const t = idx / 9; // 0 for floor 41, 1 for floor 50
  const bs = bossStats[idx];

  const enemies = categories.map((cat, ci) => {
    const key = catKeys[ci];
    const s41 = enemyF41[key];
    const s50 = enemyF50[key];
    return {
      name: theme.enemies[ci],
      category: cat,
      hp: lerp(s41.hp, s50.hp, t),
      atk: lerp(s41.atk, s50.atk, t),
      def: lerp(s41.def, s50.def, t),
      agi: lerp(s41.agi, s50.agi, t),
      cri: s41.cri,
    };
  });

  const phases = theme.phases.map((p, pi) => ({
    hpThreshold: [0.70, 0.45, 0.25, 0.10][pi],
    weapon: p.w,
    specialMove: p.sm,
    defBoost: p.db,
    atkBoost: p.ab,
  }));

  const drops = theme.drops.map((d) => ({
    type: "material",
    name: d.name,
    rarity: d.r,
  }));

  const lastAttackDrop = {
    id: theme.relic.id,
    name: theme.relic.name,
    nameCn: theme.relic.nameCn,
    bossFloor: theme.floor,
    effects: theme.relic.effects,
  };

  return {
    floorNumber: theme.floor,
    name: theme.name,
    nameCn: theme.nameCn,
    enemies,
    boss: {
      name: theme.bossName,
      hp: bs.hp,
      atk: bs.atk,
      def: bs.def,
      agi: bs.agi,
      cri: 2,
      initialWeapon: theme.initialWeapon,
      phases,
      drops,
      lastAttackDrop,
      specialMechanics: theme.mechanics,
    },
    materials: theme.materials,
    places: theme.places,
    maxExplore: 5,
  };
}

const floors = themes.map((t, i) => buildFloor(t, i));
const json = JSON.stringify(floors, null, 2);

// Output for manual merge
console.log(json);
