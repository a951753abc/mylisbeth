const _ = require("lodash");
const config = require("./config.js");
const db = require("../db.js");

const mine = require("./move/mine.js");
const forge = require("./move/forge.js");
const up = require("./move/up.js");
const adv = require("./move/adv.js");
const pvp = require("./move/pvp.js");
const bossAttack = require("./floor/bossAttack.js");

const coolTime = config.MOVE_COOLDOWN;
const cmdList = { mine, forge, up, adv, pvp, boss: bossAttack };

module.exports = async function (cmd, userOrId) {
  if (!(cmd[1] in cmdList)) {
    return { error: "指令錯誤\n 可用指令: mine, forge, up, adv, pvp, boss" };
  }

  let userId = userOrId;
  if (typeof userOrId !== "string") {
    userId = userOrId.userId;
  }

  const now = Date.now();
  const user = await db.findOneAndUpdate(
    "user",
    {
      userId,
      $or: [
        { move_time: { $exists: false } },
        { move_time: { $lte: now - coolTime } },
      ],
    },
    { $set: { move_time: now } },
    { returnDocument: "before" },
  );

  if (!user) {
    const existing = await db.findOne("user", { userId });
    if (!existing) return { error: "請先建立角色" };
    const moveTime = _.get(existing, "move_time", 0);
    const remaining = Math.ceil((moveTime + coolTime - now) / 1000);
    return { error: "CD時間還有" + remaining + "秒", cooldown: remaining };
  }

  return await cmdList[cmd[1]](cmd, user);
};
