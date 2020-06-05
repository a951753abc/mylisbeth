const _ = require('lodash');
const roll = require("./roll");
//status [0->lose 1->win 2->平手
const battle = {"text":"", "status":0, "name":""};
const eneExample = require("./ene/list.json");
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
function getEne() {
    let enemyRoll = Math.floor(Math.random() * 100) + 1;
    if (enemyRoll > 50) {
        return _.clone(eneExample[0]);
    } else if (enemyRoll > 10) {
        return  _.clone(eneExample[1]);
    } else {
        return _.clone(eneExample[2]);
    }
}
module.exports = async function (weapon, npc, npcNameList) {
    let roundLimit = 5;
    let round = 1;
    let enemy = npcNameList[Math.floor(Math.random() * npcNameList.length)];
    let ene = getEne();
    //骰 2D6+敏捷
    let agiAct = function(agi) {
        return roll.d66() + agi;
    };
    battle.text = "";
    battle.status = 0;
    battle.name = ene.category + enemy.name;
    while (npc.hp > 0 && ene.hp > 0 && round <= roundLimit) {
        battle.text += "第" + round + "回合\n";
        let npcAct = agiAct(weapon.agi);
        let eneAct = agiAct(ene.agi);
        //battle.text += npc.name + "行動值" + npcAct + " ，";
        //battle.text += battle.name + "行動值" + eneAct + " ，";
        let npcAttack = function () {
            let damResult = atkCheck(npc.name, battle.name, weapon.agi, ene.agi, weapon.atk, weapon.cri, ene.def);
            ene.hp = ene.hp - damResult;
            return ene.hp;
        };
        let eneAttack = function () {
            let damResult = atkCheck(battle.name, npc.name, ene.agi, weapon.agi, ene.atk , ene.cri, weapon.def);
            npc.hp = npc.hp - damResult;
            return npc.hp;
        };
        if (npcAct >= eneAct) {
            //battle.text += npc.name + " 率先行動。";
            if (npcAttack() <= 0) {
                battle.text +=  battle.name + "倒下了。 \n";
                battle.status = 1;
                break;
            }
            if (eneAttack() <= 0) {
                battle.text +=  npc.name + "倒下了。 \n";
                break;
            }
        } else {
            //battle.text += battle.name + " 率先行動。";
            if (eneAttack() <= 0) {
                battle.text +=  npc.name + "倒下了。 \n";
                break;
            }
            if (npcAttack() <= 0) {
                battle.text +=  battle.name + "倒下了。 \n";
                battle.status = 1;
                break;
            }
        }
        battle.text += "\n";
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