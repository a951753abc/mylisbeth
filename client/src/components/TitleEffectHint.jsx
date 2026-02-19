import React, { useEffect, useState } from 'react';

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
 * 半隱藏稱號效果提示
 * 顯示效果類別與方向（有利/不利），隱藏具體數值
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
          const arrow = isAdvantageous ? '↑' : '↓';
          const color = isAdvantageous ? 'var(--success, #4caf50)' : 'var(--danger, #f44336)';

          return (
            <span
              key={key}
              style={{
                color,
                border: `1px solid ${color}`,
                borderRadius: '3px',
                padding: '0.05rem 0.25rem',
                opacity: 0.85,
                whiteSpace: 'nowrap',
              }}
            >
              {label} {arrow}
            </span>
          );
        })}
      </div>
    </div>
  );
}
