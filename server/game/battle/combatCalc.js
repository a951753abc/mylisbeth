const roll = require("../roll");

function hitCheck(atkAgi, defAgi) {
  const atkRoll = roll.d66();
  const defRoll = roll.d66();
  const atkAct = atkRoll + atkAgi;
  const defAct = defRoll + defAgi;
  if (atkAct === 12) {
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

function processAttack(attacker, defender, battleLog) {
  const hitCheckResult = hitCheck(attacker.stats.agi, defender.stats.agi);

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
  };

  if (hitCheckResult.success) {
    const damageResult = damCheck(
      attacker.stats.atk,
      attacker.stats.cri,
      defender.stats.def,
    );
    const damageDealt = damageResult.damage;
    defender.hp -= damageDealt;

    attackLog.isCrit = damageResult.isCrit;
    attackLog.damage = damageDealt;
    attackLog.rollText += ` ${damageResult.text}`;
    attackLog.damDetail = {
      atkTotal: damageResult.atkTotal,
      defTotal: damageResult.defTotal,
      critCount: damageResult.critCount,
    };
  }

  battleLog.push(attackLog);
  return defender.hp;
}

module.exports = { hitCheck, damCheck, processAttack };
