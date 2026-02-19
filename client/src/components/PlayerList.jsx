import React, { useState, useEffect } from 'react';

export default function PlayerList() {
  const [view, setView] = useState('alive'); // 'alive' | 'graveyard'
  const [players, setPlayers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ totalAdventurers: 0, aliveCount: 0, deadCount: 0 });
  const [graves, setGraves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlayers(page);
  }, [page]);

  useEffect(() => {
    if (view === 'graveyard' && graves.length === 0) {
      fetchGraveyard();
    }
  }, [view]);

  const fetchPlayers = async (p) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/game/players?page=${p}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setPlayers(data.players);
        setTotalPages(data.totalPages);
        setStats({
          totalAdventurers: data.totalAdventurers ?? data.players.length,
          aliveCount: data.aliveCount ?? data.players.length,
          deadCount: data.deadCount ?? 0,
        });
      }
    } catch {
      setError('無法取得玩家列表');
    } finally {
      setLoading(false);
    }
  };

  const fetchGraveyard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/game/graveyard');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setGraves(data.graves || []);
      }
    } catch {
      setError('無法取得墓碑紀錄');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '不明';
    const d = new Date(ts);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="card">
      <h2>鍛造師名冊</h2>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1.5rem',
        margin: '0.5rem 0 1rem',
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
      }}>
        <span>冒險者總數 <strong style={{ color: 'var(--text-primary)' }}>{stats.totalAdventurers}</strong></span>
        <span>存活 <strong style={{ color: '#4ade80' }}>{stats.aliveCount}</strong></span>
        <span>陣亡 <strong style={{ color: '#ef4444' }}>{stats.deadCount}</strong></span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          className={view === 'alive' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '0.3rem 1rem', fontSize: '0.85rem' }}
          onClick={() => setView('alive')}
        >
          存活名冊
        </button>
        <button
          className={view === 'graveyard' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '0.3rem 1rem', fontSize: '0.85rem' }}
          onClick={() => setView('graveyard')}
        >
          墓碑紀錄
        </button>
      </div>

      {loading && <div className="loading">載入中...</div>}
      {error && <div className="error-msg">{error}</div>}

      {!loading && view === 'alive' && (
        <>
          {players.map((player) => (
            <div key={player.rank} className="item-row">
              <span>
                <strong>{player.rank}.</strong>{' '}
                {player.title && (
                  <span className="player-title">「{player.title}」</span>
                )}
                {player.name}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {player.currentFloor > 1 ? `${player.currentFloor}F ` : ''}
                鍛造 Lv.{player.forgeLevel} | 挖礦 Lv.{player.mineLevel}
              </span>
            </div>
          ))}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                className="btn-primary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{ padding: '0.3rem 0.8rem' }}
              >
                上一頁
              </button>
              <span style={{ lineHeight: '2', color: 'var(--text-secondary)' }}>
                {page} / {totalPages}
              </span>
              <button
                className="btn-primary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{ padding: '0.3rem 0.8rem' }}
              >
                下一頁
              </button>
            </div>
          )}
        </>
      )}

      {!loading && view === 'graveyard' && (
        <>
          {graves.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
              目前沒有陣亡紀錄。
            </div>
          ) : (
            graves.map((grave, i) => (
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
                    <span style={{ color: '#6b7280', marginRight: '0.3rem' }}>&#x1FAA6;</span>
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
            ))
          )}
        </>
      )}
    </div>
  );
}
