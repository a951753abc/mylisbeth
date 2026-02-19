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
  // Season 3.5 achievements
  {
    id: "first_sell",
    name: "初めての商売",
    nameCn: "第一筆生意",
    desc: "首次在回收商店出售物品",
    check: (user) => (user.stats?.totalShopSells || 0) >= 1,
    titleReward: "收破爛的",
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
