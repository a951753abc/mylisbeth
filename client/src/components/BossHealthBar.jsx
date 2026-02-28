import React from 'react';

export default function BossHealthBar({ bossName, currentHp, totalHp, participants, currentWeapon, phases }) {
  const pct = totalHp > 0 ? Math.max(0, Math.min(100, (currentHp / totalHp) * 100)) : 0;

  const barColor = pct > 50 ? 'var(--success)' : pct > 25 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="boss-health-bar">
      <div className="boss-name">
        {bossName}
        {currentWeapon && (
          <span style={{ color: 'var(--warning)', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
            [{currentWeapon}]
          </span>
        )}
      </div>
      <div className="boss-hp-track" style={{ position: 'relative' }}>
        <div
          className="boss-hp-fill"
          style={{ width: `${pct}%`, background: barColor }}
        />
        {/* Phase 分界線標記 */}
        {phases && phases.length > 0 && phases.map((phase, i) => {
          const linePct = phase.hpThreshold * 100;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${linePct}%`,
                top: 0,
                bottom: 0,
                width: '2px',
                background: 'var(--warning)',
                opacity: 0.8,
                zIndex: 1,
              }}
              title={`Phase ${i + 1}: ${phase.weapon || ''} (${Math.round(linePct)}% HP)`}
            />
          );
        })}
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
