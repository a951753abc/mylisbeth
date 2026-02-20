const db = require("../../db.js");

const ACHIEVEMENTS = [
  {
    id: "first_forge",
    name: "初めての鍛造",
    nameCn: "第一次鍛造",
    desc: "鍛造武器 1 次",
    check: (user) => (user.stats?.totalForges || 0) >= 1,
    titleReward: "見習い鍛冶師",
  },
  {
    id: "forge_10",
    name: "鍛冶師の道",
    nameCn: "鍛造師之路",
    desc: "鍛造武器 10 次",
    check: (user) => (user.stats?.totalForges || 0) >= 10,
    titleReward: null,
  },
  {
    id: "first_mine",
    name: "採掘の第一歩",
    nameCn: "挖礦第一步",
    desc: "挖礦 1 次",
    check: (user) => (user.stats?.totalMines || 0) >= 1,
    titleReward: null,
  },
  {
    id: "first_boss",
    name: "ボスを討て",
    nameCn: "討伐 Boss",
    desc: "首次參與 Boss 戰",
    check: (user) => (user.stats?.totalBossAttacks || 0) >= 1,
    titleReward: "ボスキラー",
  },
  {
    id: "floor_5",
    name: "第5層到達",
    nameCn: "到達第 5 層",
    desc: "解鎖 Aincrad 第 5 層",
    check: (user) => (user.currentFloor || 1) >= 5,
    titleReward: "冒険の始まり",
  },
  {
    id: "floor_10",
    name: "第10層制覇",
    nameCn: "攻略第 10 層",
    desc: "攻略 Aincrad 第 10 層",
    check: (user) => (user.currentFloor || 1) >= 10,
    titleReward: "中層攻略者",
  },
  {
    id: "pvp_first",
    name: "初決闘",
    nameCn: "初次決鬥",
    desc: "首次 PvP 勝利",
    check: (user) => (user.stats?.totalPvpWins || 0) >= 1,
    titleReward: "決闘者",
  },
  {
    id: "pvp_10",
    name: "決闘の猛者",
    nameCn: "決鬥強者",
    desc: "PvP 勝利 10 次",
    check: (user) => (user.stats?.totalPvpWins || 0) >= 10,
    titleReward: null,
  },
  {
    id: "yuki_defeat",
    name: "優樹撃破",
    nameCn: "擊敗優樹",
    desc: "在冒險中擊敗優樹",
    check: (user) => (user.stats?.yukiDefeats || 0) >= 1,
    titleReward: "你才是挑戰者",
  },
  {
    id: "weapon_break",
    name: "散華",
    nameCn: "武器粉碎",
    desc: "首次武器損壞",
    check: (user) => (user.stats?.weaponsBroken || 0) >= 1,
    titleReward: "悲運の鍛冶師",
  },
  {
    id: "login_7",
    name: "七日の絆",
    nameCn: "七日之絆",
    desc: "連續 7 天登入",
    check: (user) => (user.dailyLoginStreak || 0) >= 7,
    titleReward: "七日の鍛冶師",
  },
  {
    id: "boss_mvp",
    name: "MVP",
    nameCn: "最高貢獻者",
    desc: "成為 Boss 戰 MVP",
    check: (user) => (user.bossContribution?.mvpCount || 0) >= 1,
    titleReward: "英雄",
  },
  {
    id: "total_adv_50",
    name: "歴戦の冒険者",
    nameCn: "久經沙場的冒險者",
    desc: "冒險 50 次",
    check: (user) => (user.stats?.totalAdventures || 0) >= 50,
    titleReward: null,
  },
  {
    id: "col_1000",
    name: "初めての財産",
    nameCn: "第一桶金",
    desc: "累積獲得 1000 Col",
    check: (user) => (user.stats?.totalColEarned || 0) >= 1000,
    titleReward: "商人",
  },
  {
    id: "boss_3",
    name: "討伐者",
    nameCn: "討伐者",
    desc: "參與擊敗 Boss 3 次",
    check: (user) => (user.bossContribution?.bossesDefeated || 0) >= 3,
    titleReward: "討伐者",
  },
  // Season 3 achievements
  {
    id: "first_hire",
    name: "仲間を得た",
    nameCn: "得到夥伴",
    desc: "首次雇用 NPC 冒險者",
    check: (user) => (user.hiredNpcs || []).length >= 1,
    titleReward: "隊長",
  },
  {
    id: "npc_death",
    name: "散った命",
    nameCn: "逝去的生命",
    desc: "NPC 冒險者在戰鬥中犧牲",
    check: (user) => (user.stats?.npcDeaths || 0) >= 1,
    titleReward: null,
  },
  {
    id: "debt_survivor",
    name: "借金返済",
    nameCn: "還清負債",
    desc: "從負債狀態中還清全部欠款",
    check: (user) => (user.stats?.debtCleared || 0) >= 1,
    titleReward: "再起の鍛冶師",
  },
  {
    id: "npc_legendary",
    name: "伝説の戦士",
    nameCn: "傳說的戰士",
    desc: "雇用一位傳說品質的 NPC",
    check: (user) => (user.hiredNpcs || []).some((n) => n.quality === "傳說"),
    titleReward: "伝説使い",
  },
  // Season 4: LA 成就
  {
    id: "last_attack",
    name: "ラストアタック",
    nameCn: "最後一擊",
    desc: "在 Boss 戰中取得 Last Attack",
    check: (user) => (user.bossContribution?.lastAttackCount || 0) >= 1,
    titleReward: "ラストアタッカー",
  },
  // Season 3.5 achievements
  {
    id: "first_sell",
    name: "初めての商売",
    nameCn: "第一筆生意",
    desc: "首次在回收商店出售物品",
    check: (user) => (user.stats?.totalShopSells || 0) >= 1,
    titleReward: "收破爛的",
  },
  // Season 4.5: 微笑棺木
  {
    id: "lc_survivor",
    name: "笑う棺桶を退けた者",
    nameCn: "擊退微笑棺木",
    desc: "在隨機事件中擊敗微笑棺木成員",
    check: (user) => (user.stats?.laughingCoffinDefeats || 0) >= 1,
    titleReward: "生存者",
  },
  {
    id: "lc_hunter",
    name: "PKキラー",
    nameCn: "PK殺手",
    desc: "擊敗微笑棺木成員 5 次",
    check: (user) => (user.stats?.laughingCoffinDefeats || 0) >= 5,
    titleReward: "PKキラー",
  },
  // Season 4.5: 鍛造師親自冒險
  {
    id: "first_solo",
    name: "鍛冶師、戦場に立つ",
    nameCn: "鍛造師走上戰場",
    desc: "首次以鍛造師身分親自出擊冒險",
    check: (user) => (user.stats?.totalSoloAdventures || 0) >= 1,
    titleReward: "戦う鍛冶師",
  },
  {
    id: "solo_20",
    name: "剣も鍛え、己も鍛える",
    nameCn: "鍛劍也鍛己",
    desc: "鍛造師親自出擊冒險 20 次",
    check: (user) => (user.stats?.totalSoloAdventures || 0) >= 20,
    titleReward: null,
  },
  // Season 4.5: 聖遺物收藏
  {
    id: "relic_3",
    name: "遺物収集家",
    nameCn: "聖遺物收藏家",
    desc: "收集 3 件 Boss 聖遺物",
    check: (user) => (user.bossRelics || []).length >= 3,
    titleReward: "遺物収集家",
  },
  {
    id: "relic_10",
    name: "アインクラッドの記憶",
    nameCn: "艾恩葛朗特的記憶",
    desc: "收集全部 10 件 Boss 聖遺物",
    check: (user) => (user.bossRelics || []).length >= 10,
    titleReward: "解放者",
  },
  // Season 4.5: 經濟 / 借貸
  {
    id: "col_10000",
    name: "富豪",
    nameCn: "大富翁",
    desc: "累積獲得 10,000 Col",
    check: (user) => (user.stats?.totalColEarned || 0) >= 10000,
    titleReward: "富豪",
  },
  {
    id: "first_loan",
    name: "闇の契約",
    nameCn: "闇之契約",
    desc: "首次向闇商人借款",
    check: (user) => (user.stats?.totalLoans || 0) >= 1,
    titleReward: null,
  },
  // Season 4.5: NPC 成長
  {
    id: "npc_lv10",
    name: "信頼の絆",
    nameCn: "信賴之絆",
    desc: "培養一位 NPC 冒險者達到 10 級",
    check: (user) => (user.hiredNpcs || []).some((n) => (n.level || 1) >= 10),
    titleReward: "指揮官",
  },
  {
    id: "npc_3_hired",
    name: "パーティ結成",
    nameCn: "組成小隊",
    desc: "同時雇用 3 位 NPC 冒險者",
    check: (user) => (user.hiredNpcs || []).length >= 3,
    titleReward: null,
  },
  // Season 4.5: 高階里程碑
  {
    id: "forge_50",
    name: "匠の領域",
    nameCn: "匠之領域",
    desc: "鍛造武器 50 次",
    check: (user) => (user.stats?.totalForges || 0) >= 50,
    titleReward: "匠",
  },
  {
    id: "pvp_50",
    name: "闘技場の王",
    nameCn: "鬥技場之王",
    desc: "PvP 勝利 50 次",
    check: (user) => (user.stats?.totalPvpWins || 0) >= 50,
    titleReward: "闘技王",
  },
  {
    id: "adv_200",
    name: "永遠の戦士",
    nameCn: "永恆的戰士",
    desc: "冒險 200 次",
    check: (user) => (user.stats?.totalAdventures || 0) >= 200,
    titleReward: null,
  },
  {
    id: "hell_10",
    name: "地獄の覇者",
    nameCn: "地獄的霸者",
    desc: "在 [Hell] 級敵人中獲勝 10 次",
    check: (user) => (user["[Hell]Win"] || 0) >= 10,
    titleReward: "地獄覇者",
  },
  // Season 5: PVP 決鬥系統
  {
    id: "duel_total_loss_1",
    name: "命を賭けた決闘",
    nameCn: "以命相搏的決鬥",
    desc: "在全損決着模式中獲勝 1 次",
    check: (user) => (user.stats?.totalLossWins || 0) >= 1,
    titleReward: "殺人鬼",
  },
  {
    id: "red_name",
    name: "レッドネーム",
    nameCn: "紅名玩家",
    desc: "被標記為紅名（殺害非紅名玩家）",
    check: (user) => user.isPK === true,
    titleReward: "プレイヤーキラー",
  },
  {
    id: "battle_level_10",
    name: "戦闘熟練者",
    nameCn: "戰鬥熟練者",
    desc: "戰鬥等級達到 10",
    check: (user) => (user.battleLevel || 1) >= 10,
    titleReward: "歴戦の剣士",
  },
  {
    id: "battle_level_max",
    name: "戦闘の頂点",
    nameCn: "戰鬥巔峰",
    desc: "戰鬥等級達到 30（最高等級）",
    check: (user) => (user.battleLevel || 1) >= 30,
    titleReward: "剣の申し子",
  },
  {
    id: "duel_first_strike_10",
    name: "初撃の達人",
    nameCn: "初擊之達人",
    desc: "在初撃決着模式中獲勝 10 次",
    check: (user) => (user.stats?.firstStrikeWins || 0) >= 10,
    titleReward: "初撃剣士",
  },
];

async function checkAndAward(userId) {
  try {
    const user = await db.findOne("user", { userId });
    if (!user) return [];

    const currentAchievements = new Set(user.achievements || []);
    const newlyUnlocked = [];

    for (const ach of ACHIEVEMENTS) {
      if (currentAchievements.has(ach.id)) continue;
      if (ach.check(user)) {
        newlyUnlocked.push(ach);
      }
    }

    if (newlyUnlocked.length === 0) return [];

    const newIds = newlyUnlocked.map((a) => a.id);
    const newTitles = newlyUnlocked
      .filter((a) => a.titleReward)
      .map((a) => a.titleReward);

    const updateOps = {
      $push: { achievements: { $each: newIds } },
    };

    if (newTitles.length > 0) {
      updateOps.$addToSet = { availableTitles: { $each: newTitles } };
    }

    await db.update("user", { userId }, updateOps);

    // Set title if user has none
    if (newTitles.length > 0 && !user.title) {
      await db.update(
        "user",
        { userId, title: null },
        { $set: { title: newTitles[0] } },
      );
    }

    return newlyUnlocked;
  } catch (err) {
    console.error("成就檢查失敗:", err);
    return [];
  }
}

function getAllDefinitions() {
  return ACHIEVEMENTS;
}

module.exports = { checkAndAward, getAllDefinitions };
