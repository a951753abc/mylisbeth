module.exports = {
    // 指令冷卻時間 (毫秒)
    MOVE_COOLDOWN: 5000, // 5 秒

    // 敵人難度機率 (d100)
    ENEMY_PROBABILITY: {
        YUKI: 99,   // 1% 機率出現優樹 (大於99)
        HELL: 90,   // 9% 機率出現 Hell (大於90)
        HARD: 50,   // 40% 機率出現 Hard (大於50)
        NORMAL: 10, // 40% 機率出現 Normal (大於10)
        EASY: 0     // 10% 機率出現 Easy (不大於10)
    },

    // 武器強化成功基礎機率
    BUFF_BASE_CHANCE: 20,

    // 武器損壞機率 (戰鬥)
    WEAPON_DAMAGE_CHANCE: {
        WIN: 50,
        DEAD: 80,
        DRAW: 25
    },
    
    // 玩家初始武器/素材上限
    INITIAL_ITEM_LIMIT: 5,
    INITIAL_WEAPON_LIMIT: 1,
};