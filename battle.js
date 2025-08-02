const _ = require('lodash');
const config = require('./config.js'); // 引入設定檔
const roll = require("./roll");
//status [0->lose 1->win 2->平手
const battle = {"text":"", "win":0, "dead":0, "category":"", "name":""};
const eneExample = require("./ene/list.json");
/**
 * @todo:重構
 * 敵人暫時分成四+1種難度
 * easy:HP10|atk1D6|def0|agi0  10%
 * normal:HP22|atk2D6|def1|agi1 40%
 * hard:HP54|atk3D6|def1|agi1 40%
 * hell HP100|atk4D6|def2|agi2 9%
 * 優樹 1% 全亂數調整
 * 戰鬥公式
 * 命中率 = 雙方2D6+敏捷 (攻擊方優勢66)
 * 傷害 = 武器傷害骰D6 - 對方防禦骰D6
 * 暴擊骰 = 2D6>暴擊率
 * 傷害骰總和在暴擊率之上的時候，繼續骰傷害骰
 */
function getEne() {
    let enemyRoll = Math.floor(Math.random() * 100) + 1;
    if (enemyRoll > config.ENEMY_PROBABILITY.YUKI) {
        return {
            "category": "[優樹]",
            "hp": roll.d66() * roll.d66(),
            "atk": roll.d66(),
            "def": roll.d6(),
            "agi": roll.d6(),
            "cri": roll.d66()
        };
    } else if (enemyRoll > config.ENEMY_PROBABILITY.HELL) {
        return _.clone(eneExample[0]);
    } else if (enemyRoll > config.ENEMY_PROBABILITY.HARD) {
        return  _.clone(eneExample[1]);
    }  else if (enemyRoll > config.ENEMY_PROBABILITY.NORMAL) {
        return  _.clone(eneExample[2]);
    } else {
        return _.clone(eneExample[3]);
    }
}

// 內部函式：處理一次攻擊檢定
function processAttack(attacker, defender, battleLog) {
    const hitCheckResult = hitCheck(attacker.stats.agi, defender.stats.agi);
    let damageDealt = 0;

    const attackLog = {
        attacker: attacker.name,
        defender: defender.name,
        hit: hitCheckResult.success,
        isCrit: false,
        damage: 0,
        rollText: hitCheckResult.text
    };

    if (hitCheckResult.success) {
        const damageResult = damCheck(attacker.stats.atk, attacker.stats.cri, defender.stats.def);
        damageDealt = damageResult.damage;
        defender.hp -= damageDealt;
        
        attackLog.isCrit = damageResult.isCrit;
        attackLog.damage = damageDealt;
        attackLog.rollText += ` ${damageResult.text}`;
    }
    
    battleLog.push(attackLog);
    return defender.hp;
}

module.exports = async function (weapon, npc, npcNameList) {
    const roundLimit = 5;
    let round = 1;

    // 初始化戰鬥雙方
    const playerSide = {
        name: npc.name,
        hp: npc.hp + weapon.hp,
        stats: {
            atk: weapon.atk,
            def: weapon.def,
            agi: weapon.agi,
            cri: weapon.cri,
        }
    };

    const enemyData = getEne();
    const enemyName = npcNameList[Math.floor(Math.random() * npcNameList.length)].name;
    const enemySide = {
        name: `${enemyData.category}${enemyName}`,
        hp: enemyData.hp,
        stats: {
            atk: enemyData.atk,
            def: enemyData.def,
            agi: enemyData.agi,
            cri: enemyData.cri,
        }
    };

    const battleResult = {
        log: [],
        win: 0,
        dead: 0,
        category: enemyData.category,
        enemyName: enemySide.name,
        npcName: playerSide.name,
        initialHp: { npc: playerSide.hp, enemy: enemySide.hp },
        finalHp: {}
    };

    while (playerSide.hp > 0 && enemySide.hp > 0 && round <= roundLimit) {
        battleResult.log.push({ type: 'round', number: round });
        //骰 2D6+敏捷
        const npcAct = roll.d66() + playerSide.stats.agi;
        const eneAct = roll.d66() + enemySide.stats.agi;

        if (npcAct >= eneAct) {
            // 玩家先攻
            if (processAttack(playerSide, enemySide, battleResult.log) <= 0) {
                battleResult.win = 1;
                break;
            }
            if (enemySide.hp > 0 && processAttack(enemySide, playerSide, battleResult.log) <= 0) {
                battleResult.dead = 1;
                break;
            }
        } else {
            // 敵人先攻
            if (processAttack(enemySide, playerSide, battleResult.log) <= 0) {
                battleResult.dead = 1;
                break;
            }
            if (playerSide.hp > 0 && processAttack(playerSide, enemySide, battleResult.log) <= 0) {
                battleResult.win = 1;
                break;
            }
        }
        round++;
    }

    if (round > roundLimit && playerSide.hp > 0 && enemySide.hp > 0) {
        battleResult.log.push({ type: 'end', outcome: 'draw' });
    } else if (battleResult.win) {
         battleResult.log.push({ type: 'end', outcome: 'win', winner: playerSide.name });
    } else if (battleResult.dead) {
         battleResult.log.push({ type: 'end', outcome: 'lose', winner: enemySide.name });
    }    

    battleResult.finalHp = { npc: playerSide.hp, enemy: enemySide.hp };
    return battleResult;    
}

function hitCheck(atkAgi, defAgi) {
    let atkAct = roll.d66() + atkAgi;
    let defAct = roll.d66() + defAgi;
    if (atkAct === 12) {
        return { success: true, text: "擲出了大成功！" };
    } else if (atkAct >= defAct) {
        return { success: true, text: "成功命中。" };
    } else {
        return { success: false, text: "攻擊被閃過了。" };
    }
}

function damCheck(atk, atkCri, def) {
    let atkDam = 0;
    let defSum = 0;
    let isCrit = false;
    let text = "";
    for (let i = 1; i <= atk; i++) {
        atkDam += roll.d66();
    }
    for (let i = 1; i <= def; i++) {
        defSum += roll.d66();
    }
    while (roll.d66() >= atkCri) {
        let criDam = roll.d66();
        text += `會心一擊！追加 ${criDam} 點傷害！`;
        atkDam += criDam;
        isCrit = true;
    }
    let finalDamage = atkDam - defSum;
    //最小傷害1點
    if (finalDamage <= 0) {
        finalDamage = 1;
    }
    text += `最終造成 ${finalDamage} 點傷害。`;
    return { damage: finalDamage, isCrit: isCrit, text: text };
}