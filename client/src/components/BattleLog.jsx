import React from 'react';

export default function BattleLog({ logs }) {
  if (logs.length === 0) {
    return (
      <div className="card">
        <h2>戰鬥日誌</h2>
        <p style={{ color: 'var(--text-secondary)' }}>尚無記錄，去冒險或鍛造看看吧！</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>戰鬥日誌</h2>
      <div className="battle-log">
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ color: 'var(--gold)', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              {log.action === 'mine' && '挖礦結果'}
              {log.action === 'forge' && '鍛造結果'}
              {log.action === 'upgrade' && '強化結果'}
              {log.action === 'adventure' && '冒險日誌'}
              {log.action === 'pvp' && 'PVP 戰鬥'}
              {!log.action && '事件'}
              <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                {log.time ? new Date(log.time).toLocaleTimeString() : ''}
              </span>
            </div>
            {log.text && <div>{log.text}</div>}
            {log.narrative && <div style={{ fontStyle: 'italic', lineHeight: 1.8 }}>{log.narrative}</div>}
            {log.durabilityText && <div>{log.durabilityText}</div>}
            {log.reward && <div style={{ color: 'var(--success)' }}>{log.reward}</div>}
            {log.battleLog && <div>{log.battleLog}</div>}
          </div>
        )).reverse()}
      </div>
    </div>
  );
}
