const { infiltrate } = require("../laughingCoffin/lcInfiltration.js");

module.exports = async function lcInfiltrate(cmd, user) {
  return await infiltrate(user);
};
