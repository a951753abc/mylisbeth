import React, { useState, useEffect } from 'react';

export default function AchievementPanel({ user, onTitleChange }) {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [titleMsg, setTitleMsg] = useState('');

  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/game/achievements', { credentials: 'include' });
      const data = await res.json();
      if (!data.error) {
        setAchievements(data.achievements || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const setTitle = async (title) => {
    try {
      const res = await fetch('/api/game/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (data.success) {
        setTitleMsg(`稱號已更換為「${title || '（無）'}」`);
        if (onTitleChange) onTitleChange(title);
      } else {
        setTitleMsg(data.error || '更換失敗');
      }
    } catch {
      setTitleMsg('更換失敗');
    }
    setTimeout(() => setTitleMsg(''), 3000);
  };

  if (loading) return <div className="loading">載入成就...</div>;

  const lockedCount = totalCount - achievements.length;

  return (
    <div>
      {/* 稱號管理 */}
      <div className="card">
        <h2>🎖️ 我的稱號</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          目前稱號: <strong style={{ color: 'var(--gold)' }}>{user.title || '（無）'}</strong>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
            onClick={() => setTitle(null)}
          >
            移除稱號
          </button>
          {(user.availableTitles || []).map((t) => (
            <button
              key={t}
              className={user.title === t ? 'btn-warning' : 'btn-primary'}
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
              onClick={() => setTitle(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {titleMsg && (
          <div style={{ marginTop: '0.5rem', color: 'var(--success)', fontSize: '0.85rem' }}>
            {titleMsg}
          </div>
        )}
      </div>

      {/* 已解鎖成就 */}
      <div className="card">
        <h2>✨ 已解鎖 ({achievements.length} / {totalCount})</h2>
        {achievements.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>尚未解鎖任何成就，快去冒險吧！</p>
        ) : (
          achievements.map((ach) => (
            <div key={ach.id} className="achievement-item achievement-unlocked">
              <div className="achievement-name">✅ {ach.nameCn}</div>
              <div className="achievement-desc">{ach.desc}</div>
              {ach.titleReward && (
                <div className="achievement-reward">稱號: 「{ach.titleReward}」</div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 未解鎖成就 */}
      {lockedCount > 0 && (
        <div className="card">
          <h2>🔒 未解鎖</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            還有 <strong style={{ color: 'var(--gold)' }}>{lockedCount}</strong> 個隱藏成就等待探索...
          </p>
        </div>
      )}
    </div>
  );
}
