import React from 'react';
import { formatCountdown } from '../hooks/useStaminaTimer.js';

export default function StaminaDisplay({ displayStamina, maxStamina, secondsToNext, secondsToFull, isFull }) {
  const staminaRatio = displayStamina / maxStamina;

  return (
    <div className="level-section">
      <div className="level-section-title">體力</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
        <span style={{
          color: staminaRatio <= 0.2 ? '#f87171' : staminaRatio <= 0.5 ? '#fbbf24' : '#4ade80',
          fontWeight: '600',
        }}>
          {displayStamina} / {maxStamina}
        </span>
      </div>
      <div className="level-bar-track" style={{ height: '8px' }}>
        <div className="level-bar-fill" style={{
          width: `${Math.max(0, staminaRatio * 100)}%`,
          background: staminaRatio <= 0.2 ? '#f87171' : staminaRatio <= 0.5 ? '#fbbf24' : '#4ade80',
        }} />
      </div>
      {isFull ? (
        <div className="stamina-full-badge">已滿</div>
      ) : (
        <div className="stamina-countdown">
          <span>下一點：{formatCountdown(secondsToNext)}</span>
          <span>完全回復：{formatCountdown(secondsToFull)}</span>
        </div>
      )}
    </div>
  );
}
