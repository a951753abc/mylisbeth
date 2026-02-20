import React from 'react';

// 效果鍵對應顯示名稱
const EFFECT_LABELS = {
  forgeBuffChance: '鍛造成功率',
  forgeCritFailExtra: '鍛造大失敗率',
  forgeCritSuccessAdj: '鍛造大成功門檻',
  forgeDurability: '武器初始耐久',
  mineStarChance: '三星挖掘率',
  battleAtk: '戰鬥攻擊',
  battleDef: '戰鬥防禦',
  battleAgi: '戰鬥敏捷',
  advColReward: '冒險獎勵',
  advWeaponDmgChance: '武器損耗率',
  soloDeathChance: '獨自冒險死亡率',
  pvpColReward: 'PvP 獎勵',
  settlementBill: '週期帳單',
  repairSuccess: '修復成功率',
  staminaCost: '體力消耗',
  npcCondLoss: 'NPC 損耗',
  npcDeathChance: 'NPC 死亡率',
  shopSellPrice: '回收售價',
  bossDamage: 'Boss 傷害',
};

// 正值對玩家有利為 true，不利為 false
const POSITIVE_IS_GOOD = {
  forgeBuffChance: true,
  forgeCritFailExtra: false,
  forgeCritSuccessAdj: false,
  forgeDurability: true,
  mineStarChance: true,
  battleAtk: true,
  battleDef: true,
  battleAgi: true,
  advColReward: true,
  advWeaponDmgChance: false,
  soloDeathChance: false,
  pvpColReward: true,
  settlementBill: false,
  repairSuccess: true,
  staminaCost: false,
  npcCondLoss: false,
  npcDeathChance: false,
  shopSellPrice: true,
  bossDamage: true,
};

/**
 * 根據效果數值的絕對值判斷強度等級
 * forgeCritSuccessAdj 為整數加法，其餘為比例型
 */
function getStrengthLevel(key, value) {
  const abs = Math.abs(value);
  if (key === 'forgeCritSuccessAdj') {
    // 整數型：1 = 小, 2+ = 大
    if (abs <= 1) return 1;
    return abs <= 2 ? 2 : 3;
  }
  // 比例型：<= 0.10 小, <= 0.20 中, > 0.20 大
  if (abs <= 0.10) return 1;
  return abs <= 0.20 ? 2 : 3;
}

const STRENGTH_LABELS = { 1: '微', 2: '中', 3: '強' };

/**
 * 稱號效果提示 — 顯示效果方向與強度等級
 */
export default function TitleEffectHint({ title, allEffects }) {
  if (!title || !allEffects || !allEffects[title]) return null;

  const effects = allEffects[title];

  return (
    <div style={{ marginTop: '0.4rem', fontSize: '0.75rem' }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: '0.2rem', opacity: 0.8 }}>
        效果：
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
        {Object.entries(effects).map(([key, value]) => {
          const label = EFFECT_LABELS[key] || key;
          const isGoodWhenPositive = POSITIVE_IS_GOOD[key] !== false;
          const isAdvantageous = (value > 0 && isGoodWhenPositive) || (value < 0 && !isGoodWhenPositive);
          const level = getStrengthLevel(key, value);
          const arrows = isAdvantageous
            ? '↑'.repeat(level)
            : '↓'.repeat(level);
          const strengthTag = STRENGTH_LABELS[level];
          const color = isAdvantageous ? 'var(--success, #4caf50)' : 'var(--danger, #f44336)';
          // 高強度效果更明顯
          const opacity = level === 1 ? 0.7 : level === 2 ? 0.85 : 1.0;

          return (
            <span
              key={key}
              style={{
                color,
                border: `1px solid ${color}`,
                borderRadius: '3px',
                padding: '0.05rem 0.25rem',
                opacity,
                whiteSpace: 'nowrap',
                fontWeight: level >= 3 ? 'bold' : 'normal',
              }}
            >
              {label} {arrows}{level >= 2 ? ` ${strengthTag}` : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
}
