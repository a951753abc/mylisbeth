import React from 'react';

export default function BossHealthBar({ bossName, currentHp, totalHp, participants }) {
  const pct = totalHp > 0 ? Math.max(0, Math.min(100, (currentHp / totalHp) * 100)) : 0;

  const barColor = pct > 50 ? 'var(--success)' : pct > 25 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="boss-health-bar">
      <div className="boss-name">{bossName}</div>
      <div className="boss-hp-track">
        <div
          className="boss-hp-fill"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <div className="boss-hp-text">
        {currentHp.toLocaleString()} / {totalHp.toLocaleString()}
      </div>
      {participants && participants.length > 0 && (
        <div className="boss-participants">
          {participants.map((p, i) => (
            <span key={i} className="boss-participant-badge">
              {p.name}: {p.damage.toLocaleString()} 傷害
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
