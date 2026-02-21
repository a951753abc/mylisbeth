const express = require("express");
const router = express.Router();

// 子路由模組
const production = require("./game/production.js");
const combat = require("./game/combat.js");
const economy = require("./game/economy.js");
const progression = require("./game/progression.js");
const floor = require("./game/floor.js");

router.use(production);
router.use(combat);
router.use(economy);
router.use(progression);
router.use(floor);

module.exports = router;
