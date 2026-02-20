import React, { useState, useEffect } from 'react';

const MODE_LABELS = {
  first_strike: '初撃決着',
  half_loss: '半減決着',
  total_loss: '全損決着',
};

const MODE_DESCS = {
  first_strike: '任一擊造成 ≥ 10% HP 即勝。賭注制。',
  half_loss: '對方 HP ≤ 50% 即勝。賭注制。',
  total_loss: 'HP 歸零即勝。掠奪制，敗者可能死亡！',
};

const QUALITY_COLORS = {
  S: '#f59e0b',
  A: '#a855f7',
  B: '#3b82f6',
  C: '#6b7280',
};

export default function PlayerList({ user, onAction }) {
  const [view, setView] = useState('alive'); // 'alive' | 'graveyard'
  const [players, setPlayers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ totalAdventurers: 0, aliveCount: 0, deadCount: 0 });
  const [graves, setGraves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Player Duel UI state
  const [duelTarget, setDuelTarget] = useState(null); // { userId, name }
  const [duelMode, setDuelMode] = useState('half_loss');
  const [duelWeapon, setDuelWeapon] = useState('');
  const [duelWager, setDuelWager] = useState(0);
  const [duelBusy, setDuelBusy] = useState(false);
  const [duelResult, setDuelResult] = useState(null);
  const [duelError, setDuelError] = useState('');

  // NPC view state
  const [npcViewUserId, setNpcViewUserId] = useState(null);
  const [npcList, setNpcList] = useState([]);
  const [npcOwnerName, setNpcOwnerName] = useState('');
  const [npcLoading, setNpcLoading] = useState(false);

  // NPC Duel UI state
  const [npcDuelTarget, setNpcDuelTarget] = useState(null); // { npcId, name }
  const [npcDuelMode, setNpcDuelMode] = useState('half_loss');
  const [npcDuelWeapon, setNpcDuelWeapon] = useState('');
  const [npcDuelWager, setNpcDuelWager] = useState(0);
  const [npcDuelBusy, setNpcDuelBusy] = useState(false);
  const [npcDuelResult, setNpcDuelResult] = useState(null);
  const [npcDuelError, setNpcDuelError] = useState('');

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

  const fetchNpcs = async (userId) => {
    setNpcLoading(true);
    try {
      const res = await fetch(`/api/game/players/${userId}/npcs`, { credentials: 'include' });
      const data = await res.json();
      if (data.error) {
        setNpcList([]);
      } else {
        setNpcList(data.npcs || []);
        setNpcOwnerName(data.ownerName || '');
      }
    } catch {
      setNpcList([]);
    } finally {
      setNpcLoading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '不明';
    const d = new Date(ts);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

  const handleDuel = async () => {
    if (!duelTarget) return;
    setDuelBusy(true);
    setDuelError('');
    setDuelResult(null);
    try {
      const data = await onAction('pvp', {
        targetUserId: duelTarget.userId,
        weaponId: duelWeapon || '0',
        mode: duelMode,
        wagerCol: duelMode === 'total_loss' ? 0 : parseInt(duelWager, 10) || 0,
      });
      if (data.error) {
        setDuelError(data.error);
      } else {
        setDuelResult(data);
      }
    } catch {
      setDuelError('決鬥請求失敗');
    } finally {
      setDuelBusy(false);
    }
  };

  const handleNpcDuel = async () => {
    if (!npcDuelTarget) return;
    setNpcDuelBusy(true);
    setNpcDuelError('');
    setNpcDuelResult(null);
    try {
      const data = await onAction('pvp-npc', {
        targetNpcId: npcDuelTarget.npcId,
        weaponId: npcDuelWeapon || '0',
        mode: npcDuelMode,
        wagerCol: npcDuelMode === 'total_loss' ? 0 : parseInt(npcDuelWager, 10) || 0,
      });
      if (data.error) {
        setNpcDuelError(data.error);
      } else {
        setNpcDuelResult(data);
      }
    } catch {
      setNpcDuelError('NPC 決鬥請求失敗');
    } finally {
      setNpcDuelBusy(false);
    }
  };

  const toggleNpcView = (userId) => {
    if (npcViewUserId === userId) {
      setNpcViewUserId(null);
      setNpcList([]);
      setNpcDuelTarget(null);
      setNpcDuelResult(null);
      setNpcDuelError('');
    } else {
      setNpcViewUserId(userId);
      setNpcDuelTarget(null);
      setNpcDuelResult(null);
      setNpcDuelError('');
      fetchNpcs(userId);
    }
  };

  const weapons = user?.weapons || [];

  // Shared duel config UI renderer
  const renderDuelConfig = (opts) => {
    const { mode, setMode, weapon, setWeapon, wager, setWager, busy, onSubmit, targetLabel, result, error: duelErr, isNpc } = opts;
    return (
      <div style={{
        background: isNpc ? 'rgba(59,130,246,0.05)' : 'rgba(239,68,68,0.05)',
        border: `1px solid ${isNpc ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)'}`,
        borderRadius: '6px',
        padding: '0.6rem 0.8rem',
        marginTop: '0.3rem',
      }}>
        <div style={{ fontSize: '0.82rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
          挑戰 <strong>{targetLabel}</strong>
        </div>

        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
          {Object.entries(MODE_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={mode === key ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
              onClick={() => setMode(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
          {MODE_DESCS[mode]}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.4rem' }}>
          <select
            value={weapon}
            onChange={(e) => setWeapon(e.target.value)}
            style={{ fontSize: '0.8rem' }}
          >
            <option value="">— 武器（預設#0）—</option>
            {weapons.map((w) => (
              <option key={w.index} value={String(w.index)}>
                #{w.index} {w.rarityLabel ? `【${w.rarityLabel}】` : ''}{w.weaponName} ATK:{w.atk}
              </option>
            ))}
          </select>
          {mode !== 'total_loss' && (
            <input
              type="number"
              min="0"
              max="5000"
              placeholder="賭注 Col"
              value={wager}
              onChange={(e) => setWager(e.target.value)}
              style={{ width: '80px', fontSize: '0.8rem' }}
            />
          )}
          <button
            className="btn-danger"
            disabled={busy}
            onClick={onSubmit}
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
          >
            {busy ? '決鬥中...' : '確認決鬥'}
          </button>
        </div>

        {mode === 'total_loss' && (
          <div style={{ fontSize: '0.72rem', color: '#f87171', marginBottom: '0.3rem' }}>
            {isNpc
              ? '⚠️ 全損決着：敗者可能死亡（你或 NPC），勝方搶走 50% Col。'
              : '⚠️ 全損決着：敗者 20~80% 機率死亡，勝者搶走 50% Col + 1 素材。殺死非紅名玩家自己會變紅名！'
            }
          </div>
        )}

        {duelErr && <div className="error-msg" style={{ fontSize: '0.8rem' }}>{duelErr}</div>}
        {result && (
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
            padding: '0.5rem',
            marginTop: '0.3rem',
            fontSize: '0.8rem',
            whiteSpace: 'pre-wrap',
          }}>
            {result.battleLog}
          </div>
        )}
      </div>
    );
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
            <div key={player.rank} style={{ marginBottom: '0.4rem' }}>
              <div className="item-row" style={{ alignItems: 'center' }}>
                <span>
                  <strong>{player.rank}.</strong>{' '}
                  {player.isPK && (
                    <span style={{ color: '#ef4444', fontWeight: 'bold', marginRight: '0.3rem' }}>[紅名]</span>
                  )}
                  {player.title && (
                    <span className="player-title">「{player.title}」</span>
                  )}
                  {player.name}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {player.battleLevel > 1 ? `BLv.${player.battleLevel} ` : ''}
                    {player.currentFloor > 1 ? `${player.currentFloor}F ` : ''}
                    鍛造 Lv.{player.forgeLevel} | 挖礦 Lv.{player.mineLevel}
                  </span>
                  {player.userId !== user?.userId && (
                    <>
                      <button
                        className="btn-danger"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => {
                          setDuelTarget(duelTarget?.userId === player.userId ? null : { userId: player.userId, name: player.name });
                          setDuelResult(null);
                          setDuelError('');
                        }}
                      >
                        {duelTarget?.userId === player.userId ? '取消' : '決鬥'}
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => toggleNpcView(player.userId)}
                      >
                        {npcViewUserId === player.userId ? '收起' : 'NPC'}
                      </button>
                    </>
                  )}
                </span>
              </div>

              {/* Player Duel panel */}
              {duelTarget?.userId === player.userId && renderDuelConfig({
                mode: duelMode,
                setMode: setDuelMode,
                weapon: duelWeapon,
                setWeapon: setDuelWeapon,
                wager: duelWager,
                setWager: setDuelWager,
                busy: duelBusy,
                onSubmit: handleDuel,
                targetLabel: player.name,
                result: duelResult,
                error: duelError,
                isNpc: false,
              })}

              {/* NPC List panel */}
              {npcViewUserId === player.userId && (
                <div style={{
                  background: 'rgba(59,130,246,0.03)',
                  border: '1px solid rgba(59,130,246,0.15)',
                  borderRadius: '6px',
                  padding: '0.5rem 0.8rem',
                  marginTop: '0.3rem',
                }}>
                  <div style={{ fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                    {npcOwnerName || player.name} 的 NPC
                  </div>
                  {npcLoading && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>載入中...</div>}
                  {!npcLoading && npcList.length === 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>沒有已雇用的 NPC。</div>
                  )}
                  {!npcLoading && npcList.map((npc) => (
                    <div key={npc.npcId} style={{ marginBottom: '0.3rem' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.3rem 0',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}>
                        <span style={{ fontSize: '0.82rem' }}>
                          <span style={{ color: QUALITY_COLORS[npc.quality] || '#6b7280', fontWeight: 'bold', marginRight: '0.3rem' }}>
                            [{npc.quality}]
                          </span>
                          {npc.name}
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: '0.4rem' }}>
                            Lv.{npc.level} | 體力 {npc.condition}%
                            {npc.hasWeapon ? ` | ${npc.weaponName} ATK:${npc.weaponAtk}` : ' | 無武器'}
                          </span>
                        </span>
                        {npc.hasWeapon && npc.condition >= 10 && (
                          <button
                            className="btn-danger"
                            style={{ padding: '0.15rem 0.4rem', fontSize: '0.72rem' }}
                            onClick={() => {
                              setNpcDuelTarget(
                                npcDuelTarget?.npcId === npc.npcId
                                  ? null
                                  : { npcId: npc.npcId, name: npc.name }
                              );
                              setNpcDuelResult(null);
                              setNpcDuelError('');
                            }}
                          >
                            {npcDuelTarget?.npcId === npc.npcId ? '取消' : '挑戰'}
                          </button>
                        )}
                      </div>

                      {/* NPC Duel config */}
                      {npcDuelTarget?.npcId === npc.npcId && renderDuelConfig({
                        mode: npcDuelMode,
                        setMode: setNpcDuelMode,
                        weapon: npcDuelWeapon,
                        setWeapon: setNpcDuelWeapon,
                        wager: npcDuelWager,
                        setWager: setNpcDuelWager,
                        busy: npcDuelBusy,
                        onSubmit: handleNpcDuel,
                        targetLabel: `${npc.name}（${npcOwnerName || player.name} 的 NPC）`,
                        result: npcDuelResult,
                        error: npcDuelError,
                        isNpc: true,
                      })}
                    </div>
                  ))}
                </div>
              )}
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
