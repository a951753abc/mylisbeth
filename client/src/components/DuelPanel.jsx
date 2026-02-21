import React from 'react';
import WeaponSelect from './WeaponSelect.jsx';

const MODE_LABELS = {
  first_strike: '初撃決着',
  half_loss: '半減決着',
  total_loss: '全損決着',
};

const MODE_DESCS = {
  first_strike: '任一擊造成 >= 10% HP 即勝。賭注制。',
  half_loss: '對方 HP <= 50% 即勝。賭注制。',
  total_loss: 'HP 歸零即勝。掠奪制，敗者可能死亡！',
};

export default function DuelPanel({ duel, weapons, targetLabel, onSubmit, isNpc, cooldownActive }) {
  return (
    <div style={{
      background: isNpc ? 'rgba(59,130,246,0.05)' : 'rgba(239,68,68,0.05)',
      border: `1px solid ${isNpc ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)'}`,
      borderRadius: '6px',
      padding: '0.6rem 0.8rem',
      marginTop: '0.3rem',
    }}>
      <div style={{ fontSize: '0.82rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
        挑戰 <strong>{targetLabel}</strong>
      </div>

      {/* Mode selection */}
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
        {Object.entries(MODE_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={duel.mode === key ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
            onClick={() => duel.setMode(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
        {MODE_DESCS[duel.mode]}
      </div>

      {/* Weapon + Wager */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.4rem' }}>
        <WeaponSelect
          weapons={weapons}
          value={duel.weapon}
          onChange={(e) => duel.setWeapon(e.target.value)}
          placeholder="— 武器（預設#0）—"
          showAtk
          style={{ fontSize: '0.8rem' }}
        />
        {duel.mode !== 'total_loss' && (
          <input
            type="number"
            min="0"
            max="5000"
            placeholder="賭注 Col"
            value={duel.wager}
            onChange={(e) => duel.setWager(e.target.value)}
            style={{ width: '80px', fontSize: '0.8rem' }}
          />
        )}
        <button
          className="btn-danger"
          disabled={duel.busy || cooldownActive}
          onClick={onSubmit}
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
        >
          {duel.busy ? '決鬥中...' : cooldownActive ? '冷卻中...' : '確認決鬥'}
        </button>
      </div>

      {duel.mode === 'total_loss' && (
        <div style={{ fontSize: '0.72rem', color: '#f87171', marginBottom: '0.3rem' }}>
          {isNpc
            ? '\u26A0\uFE0F 全損決着：敗者可能死亡（你或 NPC），勝方搶走 50% Col。'
            : '\u26A0\uFE0F 全損決着：敗者 20~80% 機率死亡，勝者搶走 50% Col + 1 素材。殺死非紅名玩家自己會變紅名！'}
        </div>
      )}

      {duel.error && <div className="error-msg" style={{ fontSize: '0.8rem' }}>{duel.error}</div>}
      {duel.result && (
        <div style={{
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '4px',
          padding: '0.5rem',
          marginTop: '0.3rem',
          fontSize: '0.8rem',
          whiteSpace: 'pre-wrap',
        }}>
          {duel.result.battleLog}
        </div>
      )}
    </div>
  );
}
