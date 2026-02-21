const db = require("../db.js");
const config = require("./config.js");

const PLAYERS_PER_PAGE = 10;

module.exports = async function (page) {
  if (page < 1) {
    return { error: "頁數必須大於 0。" };
  }

  const allUsers = await db.find("user", {});
  const deadCount = await db.count("bankruptcy_log", {
    cause: { $in: config.DEATH_CAUSES },
  });

  const totalAdventurers = allUsers.length + deadCount;

  if (allUsers.length === 0 && deadCount === 0) {
    return { error: "目前沒有任何已註冊的玩家。" };
  }

  const totalPages = Math.max(1, Math.ceil(allUsers.length / PLAYERS_PER_PAGE));
  if (allUsers.length > 0 && page > totalPages) {
    return { error: `頁數過大，總共只有 ${totalPages} 頁。` };
  }

  const startIndex = (page - 1) * PLAYERS_PER_PAGE;
  const endIndex = startIndex + PLAYERS_PER_PAGE;
  const usersOnPage = allUsers.slice(startIndex, endIndex);

  const players = usersOnPage.map((user, index) => ({
    rank: startIndex + index + 1,
    userId: user.userId,
    name: user.name,
    forgeLevel: user.forgeLevel ?? 1,
    mineLevel: user.mineLevel ?? 1,
    currentFloor: user.currentFloor ?? 1,
    title: user.title ?? null,
    isPK: user.isPK ?? false,
    battleLevel: user.battleLevel ?? 1,
  }));

  return {
    players,
    page,
    totalPages,
    totalAdventurers,
    aliveCount: allUsers.length,
    deadCount,
  };
};
