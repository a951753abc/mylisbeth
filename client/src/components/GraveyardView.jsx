import React from 'react';

function formatDate(ts) {
  if (!ts) return '不明';
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export default function GraveyardView({ graves }) {
  if (graves.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
        目前沒有陣亡紀錄。
      </div>
    );
  }

  return graves.map((grave, i) => (
    <div
      key={i}
      style={{
        background: 'var(--bg-secondary, #1a1a2e)',
        border: '1px solid #374151',
        borderRadius: '8px',
        padding: '0.8rem 1rem',
        marginBottom: '0.6rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          <span style={{ color: '#6b7280', marginRight: '0.3rem' }}>{'\u{1FAA6}'}</span>
          {grave.title && (
            <span className="player-title" style={{ color: '#9ca3af' }}>「{grave.title}」</span>
          )}
          <span style={{ color: '#e5e7eb' }}>{grave.name}</span>
        </span>
        <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
          {formatDate(grave.diedAt)}
        </span>
      </div>
      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.3rem' }}>
        {grave.cause && <span style={{ color: '#ef4444' }}>{grave.cause} | </span>}
        {grave.currentFloor > 1 ? `第 ${grave.currentFloor} 層 | ` : ''}
        鍛造 Lv.{grave.forgeLevel} | 武器 {grave.weaponCount} 把 | {grave.finalCol} Col
      </div>
    </div>
  ));
}
