const config = require("../config.js");
const battle = require("../battle.js");

const { ATK_MULT, BOSS_CRI, WIN_THRESHOLD, LOSE_THRESHOLD } = config.BOSS_COUNTER;

/**
 * Boss 反擊計算（純函數，無副作用）
 * @param {object} params
 * @param {object} params.bossData - floors.json 的 Boss 定義（含 atk, agi）
 * @param {number} params.bossAtkBoost - Phase 累計 atkBoost
 * @param {object} params.combined - NPC+武器合併數值（getCombinedBattleStats 結果，含 hp, atk, def, agi, cri）
 * @returns {{ hit: boolean, dodged: boolean, counterDamage: number, outcome: string, isCrit: boolean, logText: string }}
 */
function bossCounterAttack({ bossData, bossAtkBoost, combined }) {
  const effectiveBossAtk = Math.ceil((bossData.atk + bossAtkBoost) * ATK_MULT);
  const bossAgi = bossData.agi || 0;
  const npcAgi = combined.agi || 0;
  const npcDef = combined.def || 0;
  const npcHp = combined.hp || 1;

  // Boss 命中檢定
  const hitResult = battle.hitCheck(bossAgi, npcAgi);

  if (!hitResult.success) {
    return {
      hit: false,
      dodged: true,
      counterDamage: 0,
      outcome: "WIN",
      isCrit: false,
      logText: `Boss 反擊！${hitResult.text}`,
    };
  }

  // Boss 傷害計算
  const damResult = battle.damCheck(effectiveBossAtk, BOSS_CRI, npcDef);
  const counterDamage = damResult.damage;
  const ratio = counterDamage / npcHp;

  let outcome;
  if (ratio < WIN_THRESHOLD) {
    outcome = "WIN";
  } else if (ratio >= LOSE_THRESHOLD) {
    outcome = "LOSE";
  } else {
    outcome = "DRAW";
  }

  let logText = `Boss 反擊！${hitResult.text} ${damResult.text}`;
  if (outcome === "LOSE") {
    logText += " 致命一擊！";
  }

  return {
    hit: true,
    dodged: false,
    counterDamage,
    outcome,
    isCrit: damResult.isCrit,
    logText,
  };
}

module.exports = bossCounterAttack;
