const _ = require("lodash");
const typeList = require("./type");
const db = require("../db.js");

const expList = { mine: 10, forge: 10, adv: 10 };
const levelList = {
  mine: { level: [150, 200] },
  forge: { level: [500, 500] },
  adv: { level: [500] },
};

module.exports = async function (type, user) {
  let text = "";
  const exp = _.get(expList, type, 0);
  text += "經驗值增加 " + exp + " 點\n";

  const query = { userId: user.userId };
  const currentPath = type + "Level";

  const updatedUser = await db.findOneAndUpdate(
    "user",
    query,
    { $inc: { [type]: exp } },
    { returnDocument: "after" },
  );

  const nowExp = _.get(updatedUser, type, 0);
  const nowLevel = _.get(updatedUser, currentPath, 1);
  const levelUpExp = _.get(levelList[type].level, [nowLevel - 1], 0);

  if (levelUpExp !== 0 && nowExp >= levelUpExp) {
    // Conditional update: only level-up if still at same level and exp threshold
    const result = await db.findOneAndUpdate(
      "user",
      {
        userId: user.userId,
        [currentPath]: nowLevel,
        [type]: { $gte: levelUpExp },
      },
      { $set: { [currentPath]: nowLevel + 1, [type]: 0 } },
      { returnDocument: "after" },
    );
    if (result) {
      text += typeList(type) + "等級提升 \n";
    }
  }

  return text;
};
