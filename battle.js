const _ = require('lodash');
const roll = require("./roll");
//status [0->lose 1->win 2->平手
const battle = {"text":"", "status":0, "name":""};
const eneExample = {
    "category":"[HELL]",
    "hp":0,
    "atk":0,
    "def":0,
    "agi":0,
    "cri":10
};
/**
 * @todo:重構
 * 敵人暫時分成三種難度
 * easy:HP10|atk1D6|def0|agi0  10%
 * normal:HP22|atk2D6|def1|agi1 40%
 * hell HP100|atk4D6|def2|agi2 50%
 * 戰鬥公式
 * 命中率 = 雙方2D6+敏捷 (攻擊方優勢66)
 * 傷害 = 武器傷害骰D6 - 對方防禦骰D6
 * 暴擊骰 = 2D6>暴擊率
 * 傷害骰總和在暴擊率之上的時候，繼續骰傷害骰
 */

module.exports = function (weapon, npc, npcNameList) {
    let roundLimit = 5;
    let round = 1;
    let enemy = npcNameList[Math.floor(Math.random() * npcNameList.length)];
    let ene = _.clone(eneExample);
    let enemyRoll = Math.floor(Math.random() * 100) + 1;
    console.log(enemyRoll);
    if (enemyRoll > 50) {
        ene.category = "[Hell]";
        ene.hp = 100;
        ene.atk = 4;
        ene.def = 2;
        ene.agi = 2;
    } else if (enemyRoll > 10) {
        ene.category = "[Normal]";
        ene.hp = 22;
        ene.atk  = 2;
        ene.def = 4;
        ene.agi = 4;
    } else {
        ene.category = "[Easy]";
        ene.hp = 10;
        ene.atk  = 1;
        ene.def = 0;
        ene.agi = 0;
    }
    console.log(ene);
    battle.text = "";
    battle.status = 0;
    battle.name = ene.category + enemy.name;
    while (npc.hp > 0 && ene.hp > 0 && round <= roundLimit) {
        battle.text += "第" + round + "回合\n";
        //骰雙方行動骰 2D6+敏捷
        let npcAct = roll.d66() + weapon.agi;
        let eneAct = roll.d66() + ene.agi;
        console.log("npcAct"+npcAct);
        console.log("eneAct"+eneAct);
        let damResult;
        if (npcAct >= eneAct) {
            damResult = atkCheck(npc.name, battle.name, weapon.agi, ene.agi, weapon.atk, weapon.cri, ene.def);
            ene.hp = ene.hp - damResult;
            if (ene.hp <= 0) {
                battle.text +=  battle.name + "倒下了。 \n";
                battle.status = 1;
                break;
            }
            damResult = atkCheck(battle.name, npc.name, ene.agi, weapon.agi, ene.atk , ene.cri, weapon.def);
            npc.hp = npc.hp - damResult;
            if (npc.hp <= 0) {
                battle.text +=  npc.name + "倒下了。 \n";
                break;
            }
        } else {
            damResult = atkCheck(battle.name, npc.name, ene.agi, weapon.agi, ene.atk , ene.cri, weapon.def);
            npc.hp = npc.hp - damResult;
            if (npc.hp <= 0) {
                battle.text +=  npc.name + "倒下了。 \n";
                break;
            }
            damResult = atkCheck(npc.name, battle.name, weapon.agi, ene.agi, weapon.atk, weapon.cri, ene.def);
            ene.hp = ene.hp - damResult;
            if (ene.hp <= 0) {
                battle.text +=  battle.name + "倒下了。 \n";
                battle.status = 1;
                break;
            }
        }
        round++;
    }
    if (round > roundLimit) {
        battle.text += "雙方不分勝負。";
    }
    return battle;
}
function atkCheck(atkName, defName, atkAgi, defAgi, atkAtk, atkCri, def) {
    let hitResult;
    let damResult;
    battle.text += atkName + "發動攻擊 ";
    hitResult = hitCheck(atkAgi, defAgi);
    if (!hitResult) {
        return 0;
    }
    damResult = damCheck(atkAtk, atkCri, def);
    return damResult;
}

function hitCheck(atkAgi, defAgi) {
    let atkAct = roll.d66() + atkAgi;
    let defAct = roll.d66() + defAgi;
    if (atkAct === 12) {
        battle.text += "大成功！ "
        return true;
    } else if (atkAct >= defAct) {
        battle.text += "成功命中 "
        return true;
    } else {
        battle.text += "命中失敗 \n"
        return false;
    }
}

function damCheck(atk, atkCri, def) {
    let atkDam = 0;
    let defSum = 0;
    for (let i = 1; i <= atk; i++) {
        atkDam += roll.d66();
    }
    for (let i = 1; i <= def; i++) {
        defSum += roll.d66();
    }
    while (roll.d66() >= atkCri) {
        let criDam = roll.d66();
        battle.text += "會心一擊提高了本次攻擊傷害 " + criDam + "點 \n";
        atkDam += criDam;
    }
    //最小傷害1點
    atkDam = atkDam - defSum;
    if (atkDam <= 0) {
        atkDam = 1;
    }
    battle.text += "總共造成 " + atkDam + "點傷害。\n";
    return atkDam;
}