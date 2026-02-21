import React, { useState, useRef, useEffect } from 'react';

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

export default function CharacterStats({ user, children, onSetTitle }) {
  const [showTitles, setShowTitles] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [titleMsg, setTitleMsg] = useState('');
  const msgTimerRef = useRef(null);

  const availableTitles = user.availableTitles || [];
  const hasTitles = availableTitles.length > 0 && onSetTitle;

  useEffect(() => () => clearTimeout(msgTimerRef.current), []);

  const handleSwitch = async (title) => {
    if (switching) return;
    if (title === user.title) return;
    setSwitching(true);
    setTitleMsg('');
    clearTimeout(msgTimerRef.current);
    const result = await onSetTitle(title);
    if (result.success) {
      setTitleMsg(`切換為「${title || '（無）'}」`);
      msgTimerRef.current = setTimeout(() => setTitleMsg(''), 2000);
    } else {
      setTitleMsg(result.error);
      msgTimerRef.current = setTimeout(() => setTitleMsg(''), 3000);
    }
    setSwitching(false);
  };

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
        <div
          className="char-info-item"
          role={hasTitles ? 'button' : undefined}
          tabIndex={hasTitles ? 0 : undefined}
          aria-expanded={hasTitles ? showTitles : undefined}
          onClick={hasTitles ? () => setShowTitles((v) => !v) : undefined}
          onKeyDown={hasTitles ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowTitles((v) => !v); } } : undefined}
          style={hasTitles ? { cursor: 'pointer', userSelect: 'none' } : undefined}
        >
          <span className="info-label">
            稱號{hasTitles && <span style={{ fontSize: '0.6rem', marginLeft: '0.2rem', opacity: 0.6 }}>{showTitles ? '▲' : '▼'}</span>}
          </span>
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

      {/* 稱號快速切換面板 */}
      {showTitles && hasTitles && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.35rem',
          padding: '0.5rem 0',
          borderTop: '1px solid var(--border)',
          marginTop: '0.4rem',
          alignItems: 'center',
        }}>
          {user.title && (
            <button
              onClick={() => handleSwitch(null)}
              disabled={switching}
              style={{
                background: 'transparent',
                border: '1px solid var(--text-secondary)',
                borderRadius: '4px',
                padding: '0.15rem 0.4rem',
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                cursor: switching ? 'wait' : 'pointer',
                opacity: switching ? 0.5 : 0.7,
              }}
            >
              移除
            </button>
          )}
          {availableTitles.map((t) => {
            const isActive = user.title === t;
            return (
              <button
                key={t}
                onClick={() => handleSwitch(t)}
                disabled={switching || isActive}
                style={{
                  background: isActive ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-secondary)',
                  border: `1px solid ${isActive ? 'var(--gold)' : 'var(--border)'}`,
                  borderRadius: '4px',
                  padding: '0.15rem 0.5rem',
                  fontSize: '0.75rem',
                  color: isActive ? 'var(--gold)' : 'var(--text-primary)',
                  fontWeight: isActive ? 'bold' : 'normal',
                  cursor: isActive ? 'default' : switching ? 'wait' : 'pointer',
                  opacity: switching && !isActive ? 0.5 : 1,
                }}
              >
                {t}
              </button>
            );
          })}
          {titleMsg && (
            <span style={{
              fontSize: '0.72rem',
              color: titleMsg.includes('失敗') ? '#f87171' : 'var(--success)',
              marginLeft: '0.3rem',
            }}>
              {titleMsg}
            </span>
          )}
        </div>
      )}

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
