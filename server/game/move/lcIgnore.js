const { ignoreLcEncounter } = require("../laughingCoffin/lcInfiltration.js");

module.exports = async function lcIgnore(cmd, user) {
  return await ignoreLcEncounter(user.userId);
};
