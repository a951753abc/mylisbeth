const commands = [
    { name: 'help', description: '呼叫這個選單' },
    { name: 'create [人物名稱]', description: '建立你的人物' },
    { name: 'list [頁數]', description: '查看所有玩家的名冊' },
    { name: 'move mine', description: '挖掘素材' },
    { name: 'move forge [素材1編號] [素材2編號] [武器名稱]', description: '鍛造武器' },
    { name: 'move up [武器編號] [素材編號]', description: '使用素材強化武器(機率減少耐久值)' },
    { name: 'move adv [武器編號|不輸入則預設第一把]', description: '跟著冒險者去探險(機率減少耐久值、機率獲得素材)' },
    { name: 'move pvp [玩家名稱] [武器編號]', description: '挑戰其他玩家(勝利可掠奪素材)' },
    { name: 'info', description: '觀看人物資訊' },
];

module.exports = function () {
    return commands;
};
