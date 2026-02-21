const roll = require("../roll");
const { COUNTER_RATE } = require("./innateEffectCombat.js");

function hitCheck(atkAgi, defAgi) {
  const atkRoll = roll.d66();
  const defRoll = roll.d66();
  const atkAct = atkRoll + atkAgi;
  const defAct = defRoll + defAgi;
  if (atkRoll === 12) {
    return { success: true, text: "擲出了大成功！", atkRoll, defRoll, atkAct, defAct };
  } else if (atkAct >= defAct) {
    return { success: true, text: "成功命中。", atkRoll, defRoll, atkAct, defAct };
  } else {
    return { success: false, text: "攻擊被閃過了。", atkRoll, defRoll, atkAct, defAct };
  }
}

function damCheck(atk, atkCri, def) {
  let atkDam = 0;
  let defSum = 0;
  let isCrit = false;
  let critCount = 0;
  let text = "";
  for (let i = 1; i <= atk; i++) {
    atkDam += roll.d66();
  }
  for (let i = 1; i <= def; i++) {
    defSum += roll.d66();
  }
  const MAX_CRIT_ROUNDS = 999;
  for (let c = 0; c < MAX_CRIT_ROUNDS && roll.d66() >= atkCri; c++) {
    const criDam = roll.d66();
    text += `會心一擊！追加 ${criDam} 點傷害！`;
    atkDam += criDam;
    isCrit = true;
    critCount++;
  }
  let finalDamage = atkDam - defSum;
  if (finalDamage <= 0) {
    finalDamage = 1;
  }
  text += `最終造成 ${finalDamage} 點傷害。`;
  return { damage: finalDamage, isCrit, critCount, atkTotal: atkDam, defTotal: defSum, text };
}

/**
 * 處理一次攻擊（含固有效果）
 * @param {object} attacker
 * @param {object} defender
 * @param {object[]} battleLog
 * @param {object} [atkInnateCtx] - 攻擊方固有效果 context
 * @param {object} [defInnateCtx] - 防禦方固有效果 context
 * @returns {{ defenderHp: number, stunned: boolean }}
 */
function processAttack(attacker, defender, battleLog, atkInnateCtx, defInnateCtx) {
  const atkCtx = atkInnateCtx || {};
  const defCtx = defInnateCtx || {};

  // 閃避加成：防禦方 evasionBoost 加到有效 AGI
  const defEffectiveAgi = defender.stats.agi + (defCtx.evasionBoost || 0);
  const hitCheckResult = hitCheck(attacker.stats.agi, defEffectiveAgi);

  const attackLog = {
    attacker: attacker.name,
    defender: defender.name,
    hit: hitCheckResult.success,
    isCrit: false,
    damage: 0,
    rollText: hitCheckResult.text,
    hitDetail: {
      atkRoll: hitCheckResult.atkRoll,
      defRoll: hitCheckResult.defRoll,
      atkAct: hitCheckResult.atkAct,
      defAct: hitCheckResult.defAct,
    },
    innateEvents: [],
  };

  let stunned = false;

  if (hitCheckResult.success) {
    // 破甲：降低防禦方有效 DEF
    const effectiveDef = (atkCtx.ignoreDef > 0)
      ? Math.max(0, Math.floor(defender.stats.def * (1 - atkCtx.ignoreDef)))
      : defender.stats.def;

    const damageResult = damCheck(attacker.stats.atk, attacker.stats.cri, effectiveDef);
    let finalDamage = damageResult.damage;

    // 傷害倍率
    if (atkCtx.damageMult && atkCtx.damageMult !== 1.0) {
      finalDamage = Math.max(1, Math.floor(finalDamage * atkCtx.damageMult));
    }

    // 減傷：防禦方 damageReduction
    if (defCtx.damageReduction > 0) {
      finalDamage = Math.max(1, Math.floor(finalDamage * (1 - defCtx.damageReduction)));
    }

    defender.hp -= finalDamage;

    attackLog.isCrit = damageResult.isCrit;
    attackLog.damage = finalDamage;
    attackLog.rollText += ` ${damageResult.text}`;
    attackLog.damDetail = {
      atkTotal: damageResult.atkTotal,
      defTotal: damageResult.defTotal,
      critCount: damageResult.critCount,
    };

    // 吸血
    if (atkCtx.lifesteal > 0 && finalDamage > 0) {
      const healed = Math.floor(finalDamage * atkCtx.lifesteal);
      if (healed > 0) {
        const maxHp = attacker.maxHp || Infinity;
        attacker.hp = Math.min(maxHp, attacker.hp + healed);
        attackLog.innateEvents.push({ type: "lifesteal", value: healed });
      }
    }

    // 暈眩
    if (atkCtx.stunChance > 0 && roll.d100Check(atkCtx.stunChance)) {
      stunned = true;
      attackLog.innateEvents.push({ type: "stun" });
    }

    // 反擊：防禦方觸發
    if (defCtx.counterChance > 0 && defender.hp > 0 && roll.d100Check(defCtx.counterChance)) {
      const counterDmg = Math.max(1, Math.floor(finalDamage * COUNTER_RATE));
      attacker.hp -= counterDmg;
      attackLog.innateEvents.push({ type: "counter", value: counterDmg });
    }
  }

  battleLog.push(attackLog);
  return { defenderHp: defender.hp, stunned };
}

module.exports = { hitCheck, damCheck, processAttack };
