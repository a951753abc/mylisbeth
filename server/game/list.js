const db = require("../db.js");
const _ = require("lodash");

const PLAYERS_PER_PAGE = 10;

module.exports = async function (page) {
  if (page < 1) {
    return { error: "頁數必須大於 0。" };
  }

  const allUsers = await db.find("user", {});
  const deadCount = await db.count("bankruptcy_log", {
    cause: { $in: ["solo_adventure_death", "laughing_coffin_mine", "laughing_coffin_solo", "debt"] },
  });

  const totalAdventurers = allUsers.length + deadCount;

  if (_.isEmpty(allUsers) && deadCount === 0) {
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
    name: user.name,
    forgeLevel: _.get(user, "forgeLevel", 1),
    mineLevel: _.get(user, "mineLevel", 1),
    currentFloor: _.get(user, "currentFloor", 1),
    title: _.get(user, "title", null),
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
