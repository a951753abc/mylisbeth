import React, { useState, useEffect } from 'react';

export default function PlayerList() {
  const [players, setPlayers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlayers(page);
  }, [page]);

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
      }
    } catch {
      setError('無法取得玩家列表');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">載入中...</div>;
  }

  return (
    <div className="card">
      <h2>鍛造師名冊</h2>
      {error && <div className="error-msg">{error}</div>}
      {players.map((player) => (
        <div key={player.rank} className="item-row">
          <span>
            <strong>{player.rank}.</strong> {player.name}
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            鍛造 Lv.{player.forgeLevel} | 挖礦 Lv.{player.mineLevel}
          </span>
        </div>
      ))}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            className="btn-primary"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
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
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '0.3rem 0.8rem' }}
          >
            下一頁
          </button>
        </div>
      )}
    </div>
  );
}
