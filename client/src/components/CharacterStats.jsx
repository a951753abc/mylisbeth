import React from 'react';

function LevelRow({ label, level, exp, expNext, extra }) {
  const isMax = !expNext || expNext === Infinity;
  const ratio = isMax ? 1 : Math.max(0, Math.min(1, exp / expNext));

  return (
    <div className="level-row">
      <span className="level-label">
        {label} <strong>Lv.{level}</strong>
      </span>
      <div className="level-bar-track">
        <div
          className="level-bar-fill"
          style={{
            width: `${ratio * 100}%`,
            background: isMax ? '#4ade80' : undefined,
          }}
        />
      </div>
      <span className="level-exp">
        {isMax ? 'MAX' : `${exp}/${expNext}`}
      </span>
      {extra && <span className="level-extra">{extra}</span>}
    </div>
  );
}

export default function CharacterStats({ user, children }) {
  return (
    <div className="card">
      <h2>角色資訊</h2>

      {/* 基本資訊橫排 */}
      <div className="char-info-row">
        <div className="char-info-item">
          <span className="info-label">Col</span>
          <span className="info-value" style={{ color: 'var(--gold)' }}>
            {(user.col || 0).toLocaleString()}
          </span>
        </div>
        <div className="char-info-item">
          <span className="info-label">樓層</span>
          <span className="info-value">{user.currentFloor || 1}F</span>
        </div>
        <div className="char-info-item">
          <span className="info-label">稱號</span>
          <span className="info-value" style={{ color: 'var(--warning)', fontSize: '0.8rem' }}>
            {user.title || '—'}
          </span>
        </div>
        <div className="char-info-item">
          <span className="info-label">敗北</span>
          <span className="info-value">{user.lost ?? 0}</span>
        </div>
        {user.isPK && (
          <div className="char-info-item">
            <span className="info-value" style={{ color: '#ef4444', fontWeight: 'bold' }}>[紅名]</span>
          </div>
        )}
      </div>

      {/* 等級區塊 */}
      <div className="level-section">
        <div className="level-section-title">等級</div>
        <LevelRow label="鍛造" level={user.forgeLevel} exp={user.forgeExp || 0} expNext={user.forgeExpNext} />
        <LevelRow label="挖礦" level={user.mineLevel} exp={user.mineExp || 0} expNext={user.mineExpNext} />
        <LevelRow
          label="冒險"
          level={user.adventureLevel || 1}
          exp={user.adventureExp || 0}
          expNext={user.adventureExpNext}
          extra={`隊伍上限 ${user.hireLimit || 2}人`}
        />
        <LevelRow label="戰鬥" level={user.battleLevel || 1} exp={user.battleExp || 0} expNext={user.battleExpNext} />
      </div>

      {children}
    </div>
  );
}
