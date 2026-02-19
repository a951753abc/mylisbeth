import React, { useState } from 'react';

const DAY_REWARDS = [
  { day: 1, col: 50, material: null },
  { day: 2, col: 100, material: '★★ 素材 ×1' },
  { day: 3, col: 150, material: null },
  { day: 4, col: 200, material: '★★ 素材 ×2' },
  { day: 5, col: 300, material: '★★★ 素材 ×1' },
  { day: 6, col: 400, material: null },
  { day: 7, col: 500, material: '稱號「七日の鍛冶師」' },
];

export default function DailyPanel({ user, onClaim }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const streak = user.dailyLoginStreak || 0;
  const lastClaim = user.lastDailyClaimAt ? new Date(user.lastDailyClaimAt) : null;
  const now = new Date();

  const isTodayClaimed = lastClaim && (
    lastClaim.getFullYear() === now.getFullYear() &&
    lastClaim.getMonth() === now.getMonth() &&
    lastClaim.getDate() === now.getDate()
  );

  // 判斷上次領獎是否為昨天（以日曆日比較）
  const isLastClaimYesterday = (() => {
    if (!lastClaim) return false;
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    return lastClaim.getFullYear() === yesterday.getFullYear() &&
      lastClaim.getMonth() === yesterday.getMonth() &&
      lastClaim.getDate() === yesterday.getDate();
  })();

  // 預測今日領獎時的 streak（與後端邏輯一致）
  let displayStreak;
  if (isTodayClaimed) {
    displayStreak = streak;
  } else if (isLastClaimYesterday) {
    displayStreak = streak + 1;
  } else {
    displayStreak = 1;
  }

  const todayDayIndex = ((displayStreak - 1) % 7) + 1;

  const handleClaim = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/game/daily', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        if (onClaim) onClaim();
      }
    } catch {
      setError('領取失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* 每日狀態 */}
      <div className="card">
        <h2>🎁 每日登入獎勵</h2>
        <div style={{ marginBottom: '0.75rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>連續登入天數: </span>
          <strong style={{ color: 'var(--gold)', fontSize: '1.2rem' }}>{streak}</strong>
          <span style={{ color: 'var(--text-secondary)' }}> 天</span>
        </div>

        {isTodayClaimed ? (
          <div style={{ color: 'var(--success)', marginBottom: '0.75rem' }}>
            ✅ 今天已領取！明天再來領更多獎勵。
          </div>
        ) : (
          <button
            className="btn-success"
            disabled={loading}
            onClick={handleClaim}
            style={{ marginBottom: '0.75rem' }}
          >
            {loading ? '領取中...' : '領取今日獎勵'}
          </button>
        )}

        {error && <div className="error-msg">{error}</div>}

        {result && (
          <div className="daily-result">
            <div style={{ color: 'var(--gold)', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              🎉 領取成功！
            </div>
            <div>獲得 <strong>{result.colReward} Col</strong></div>
            {result.materialReward && result.materialReward.length > 0 && (
              <div>獲得 {result.materialReward.map((m) => `[${m.name}] ×${m.count}`).join(', ')}</div>
            )}
            {result.newAchievements && result.newAchievements.length > 0 && (
              <div style={{ color: 'var(--accent)', marginTop: '0.25rem' }}>
                🏆 新成就: {result.newAchievements.map((a) => a.nameCn).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 獎勵表 */}
      <div className="card">
        <h2>📅 7 天獎勵表</h2>
        <div className="daily-rewards-grid">
          {DAY_REWARDS.map((reward) => {
            const isToday = !isTodayClaimed && todayDayIndex === reward.day;
            const isPast = reward.day < todayDayIndex || (reward.day === todayDayIndex && isTodayClaimed);

            return (
              <div
                key={reward.day}
                className={`daily-reward-cell ${isToday ? 'daily-today' : ''} ${isPast && !isToday ? 'daily-past' : ''}`}
              >
                <div className="daily-day">Day {reward.day}</div>
                <div className="daily-col">{reward.col} Col</div>
                {reward.material && (
                  <div className="daily-material">{reward.material}</div>
                )}
                {isPast && <div className="daily-check">✓</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
