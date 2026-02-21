import React, { useState, useEffect, useCallback } from 'react';
import useDuelState from '../hooks/useDuelState.js';
import DuelPanel from './DuelPanel.jsx';
import GraveyardView from './GraveyardView.jsx';

// ── Constants ──────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'power',      label: '綜合實力', subs: [] },
  { key: 'boss',       label: '攻略進度', subs: [
    { key: 'damage',    label: '總傷害' },
    { key: 'defeated',  label: '擊破數' },
    { key: 'mvp',       label: 'MVP' },
    { key: 'lastAttack',label: '最後一擊' },
  ]},
  { key: 'arena',      label: '決鬥場', subs: [
    { key: 'wins',        label: '勝場' },
    { key: 'firstStrike', label: '初撃勝' },
    { key: 'pkKills',     label: 'PK殺數' },
    { key: 'battleLevel', label: '戰鬥等級' },
  ]},
  { key: 'economy',    label: '商會排行', subs: [
    { key: 'totalEarned', label: '累計收入' },
    { key: 'market',      label: '佈告板' },
    { key: 'currentCol',  label: '現有Col' },
  ]},
  { key: 'activity',   label: '活動紀錄', subs: [
    { key: 'forges',       label: '鍛造' },
    { key: 'mines',        label: '挖礦' },
    { key: 'adventures',   label: '冒險' },
    { key: 'missions',     label: '委託' },
    { key: 'achievements', label: '成就' },
  ]},
  { key: 'collection', label: '收藏家', subs: [
    { key: 'relics',  label: '聖遺物' },
    { key: 'weapons', label: '史詩武器' },
    { key: 'npcTeam', label: 'NPC團隊' },
  ]},
];

const QUALITY_COLORS = {
  S: '#f59e0b',
  A: '#a855f7',
  B: '#3b82f6',
  C: '#6b7280',
};

const MEDAL = { 1: { symbol: '\u{1F451}', cls: 'leaderboard-medal-gold' },
                2: { symbol: '\u{1F948}', cls: 'leaderboard-medal-silver' },
                3: { symbol: '\u{1F949}', cls: 'leaderboard-medal-bronze' } };

// ── Value display helpers ──────────────────────────────────────────

function getDisplayValue(player, category, sub) {
  if (category === 'power') return `${Math.floor(player.powerScore || 0)} 分`;

  if (category === 'boss') {
    const bc = player.bossContribution || {};
    if (sub === 'damage' || !sub) return `傷害 ${(bc.totalDamage || 0).toLocaleString()}`;
    if (sub === 'defeated') return `擊破 ${bc.bossesDefeated || 0}`;
    if (sub === 'mvp') return `MVP ${bc.mvpCount || 0}`;
    if (sub === 'lastAttack') return `LA ${bc.lastAttackCount || 0}`;
  }

  if (category === 'arena') {
    if (sub === 'wins' || !sub) {
      const wins = player.stats?.duelKills || 0;
      const total = player.duelTotal || 0;
      const rate = total > 0 ? Math.round((wins / total) * 100) : 0;
      return `${wins} 勝 / ${total} 場 (${rate}%)`;
    }
    if (sub === 'firstStrike') return `初撃 ${player.stats?.firstStrikeWins || 0} 勝`;
    if (sub === 'pkKills') return `PK ${player.pkKills || 0} 殺`;
    if (sub === 'battleLevel') return `Lv.${player.battleLevel || 1}`;
  }

  if (category === 'economy') {
    if (sub === 'totalEarned' || !sub) return `${(player.stats?.totalColEarned || 0).toLocaleString()} Col`;
    if (sub === 'market') return `${(player.stats?.totalMarketEarned || 0).toLocaleString()} Col`;
    if (sub === 'currentCol') return `${(player.col || 0).toLocaleString()} Col`;
  }

  if (category === 'activity') {
    if (sub === 'forges' || !sub) return `${(player.stats?.totalForges || 0).toLocaleString()} 次`;
    if (sub === 'mines') return `${(player.stats?.totalMines || 0).toLocaleString()} 次`;
    if (sub === 'adventures') return `${(player.stats?.totalAdventures || 0).toLocaleString()} 次`;
    if (sub === 'missions') return `${(player.stats?.totalMissionsCompleted || 0).toLocaleString()} 次`;
    if (sub === 'achievements') return `${player.achievementCount || 0} 個`;
  }

  if (category === 'collection') {
    if (sub === 'relics' || !sub) return `${player.relicCount || 0} 件`;
    if (sub === 'weapons') return `${player.epicLegendaryCount || 0} 把`;
    if (sub === 'npcTeam') return `${player.npcQualityScore || 0} 分`;
  }

  return '';
}

function getSecondaryInfo(player, category, sub) {
  if (category === 'power') {
    return `${player.currentFloor || 1}F | 鍛造Lv.${player.forgeLevel || 1}`;
  }
  if (category === 'boss') {
    const bc = player.bossContribution || {};
    if (sub === 'damage' || !sub) return `擊破 ${bc.bossesDefeated || 0} | MVP ${bc.mvpCount || 0}`;
    if (sub === 'defeated') return `傷害 ${(bc.totalDamage || 0).toLocaleString()}`;
    if (sub === 'mvp') return `傷害 ${(bc.totalDamage || 0).toLocaleString()}`;
    if (sub === 'lastAttack') return `擊破 ${bc.bossesDefeated || 0}`;
  }
  return null;
}

// ── Component ──────────────────────────────────────────────────────

export default function LeaderboardPanel({ user, onAction, cooldownActive }) {
  const [view, setView] = useState('leaderboard'); // 'leaderboard' | 'graveyard'
  const [category, setCategory] = useState('power');
  const [sub, setSub] = useState(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [stats, setStats] = useState({ totalAdventurers: 0, aliveCount: 0, deadCount: 0 });

  // Graveyard
  const [graves, setGraves] = useState([]);
  const [gravesLoaded, setGravesLoaded] = useState(false);

  // Duel UI state
  const playerDuel = useDuelState();

  // NPC view state
  const [npcViewUserId, setNpcViewUserId] = useState(null);
  const [npcList, setNpcList] = useState([]);
  const [npcOwnerName, setNpcOwnerName] = useState('');
  const [npcLoading, setNpcLoading] = useState(false);

  // NPC Duel UI state
  const npcDuel = useDuelState();

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/game/players?page=1');
      const d = await res.json();
      if (!d.error) {
        setStats({
          totalAdventurers: d.totalAdventurers ?? 0,
          aliveCount: d.aliveCount ?? 0,
          deadCount: d.deadCount ?? 0,
        });
      }
    } catch { /* ignore */ }
  }, []);

  const fetchLeaderboard = useCallback(async (cat, s, p) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ category: cat, page: String(p) });
      if (s) params.set('sub', s);
      const res = await fetch(`/api/game/leaderboard?${params}`);
      const d = await res.json();
      if (d.error) {
        setError(d.error);
        setData(null);
      } else {
        setData(d);
      }
    } catch {
      setError('無法取得排行榜');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGraveyard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/game/graveyard');
      const d = await res.json();
      if (d.error) {
        setError(d.error);
      } else {
        setGraves(d.graves || []);
        setGravesLoaded(true);
      }
    } catch {
      setError('無法取得墓碑紀錄');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (view === 'leaderboard') fetchLeaderboard(category, sub, page);
  }, [view, category, sub, page, fetchLeaderboard]);

  useEffect(() => {
    if (view === 'graveyard' && !gravesLoaded) fetchGraveyard();
  }, [view, gravesLoaded, fetchGraveyard]);

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    setSub(null);
    setPage(1);
    playerDuel.reset();
  };

  const handleDuel = async () => {
    if (!playerDuel.target) return;
    playerDuel.setBusy(true);
    playerDuel.setError('');
    playerDuel.setResult(null);
    try {
      const result = await onAction('pvp', {
        targetUserId: playerDuel.target.userId,
        weaponId: playerDuel.weapon || '0',
        mode: playerDuel.mode,
        wagerCol: playerDuel.mode === 'total_loss' ? 0 : parseInt(playerDuel.wager, 10) || 0,
      });
      if (result.error) {
        playerDuel.setError(result.error);
      } else {
        playerDuel.setResult(result);
      }
    } catch {
      playerDuel.setError('決鬥請求失敗');
    } finally {
      playerDuel.setBusy(false);
    }
  };

  const fetchNpcs = async (userId) => {
    setNpcLoading(true);
    try {
      const res = await fetch(`/api/game/players/${userId}/npcs`, { credentials: 'include' });
      const d = await res.json();
      if (!d.error) {
        setNpcList(d.npcs || []);
        setNpcOwnerName(d.ownerName || '');
      } else {
        setNpcList([]);
      }
    } catch {
      setNpcList([]);
    } finally {
      setNpcLoading(false);
    }
  };

  const toggleNpcView = (userId) => {
    if (npcViewUserId === userId) {
      setNpcViewUserId(null);
      setNpcList([]);
      npcDuel.reset();
    } else {
      setNpcViewUserId(userId);
      npcDuel.reset();
      fetchNpcs(userId);
    }
  };

  const handleNpcDuel = async () => {
    if (!npcDuel.target) return;
    npcDuel.setBusy(true);
    npcDuel.setError('');
    npcDuel.setResult(null);
    try {
      const result = await onAction('pvp-npc', {
        targetNpcId: npcDuel.target.npcId,
        weaponId: npcDuel.weapon || '0',
        mode: npcDuel.mode,
        wagerCol: npcDuel.mode === 'total_loss' ? 0 : parseInt(npcDuel.wager, 10) || 0,
      });
      if (result.error) {
        npcDuel.setError(result.error);
      } else {
        npcDuel.setResult(result);
      }
    } catch {
      npcDuel.setError('NPC 決鬥請求失敗');
    } finally {
      npcDuel.setBusy(false);
    }
  };

  const weapons = user?.weapons || [];
  const currentCat = CATEGORIES.find((c) => c.key === category);
  const isMyRow = (player) => player.userId === user?.userId;

  return (
    <div className="card">
      <h2>排行榜</h2>

      {/* Stats bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1.5rem',
        margin: '0.5rem 0 1rem',
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
        flexWrap: 'wrap',
      }}>
        <span>冒險者總數 <strong style={{ color: 'var(--text-primary)' }}>{stats.totalAdventurers}</strong></span>
        <span>存活 <strong style={{ color: '#4ade80' }}>{stats.aliveCount}</strong></span>
        <span>陣亡 <strong style={{ color: '#ef4444' }}>{stats.deadCount}</strong></span>
        {data?.myRank && view === 'leaderboard' && (
          <span>我的排名 <strong style={{ color: 'var(--gold)' }}>#{data.myRank.rank}</strong></span>
        )}
      </div>

      {/* Main category tabs + graveyard */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.3rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={view === 'leaderboard' && category === cat.key ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
            onClick={() => { setView('leaderboard'); handleCategoryChange(cat.key); }}
          >
            {cat.label}
          </button>
        ))}
        <button
          className={view === 'graveyard' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
          onClick={() => setView('graveyard')}
        >
          墓碑紀錄
        </button>
      </div>

      {/* Sub-ranking tabs */}
      {view === 'leaderboard' && currentCat?.subs.length > 0 && (
        <div className="leaderboard-sub-tabs">
          {currentCat.subs.map((s, i) => (
            <button
              key={s.key}
              className={(sub === s.key || (sub === null && i === 0)) ? 'active' : ''}
              onClick={() => i === 0 ? setSub(null) : setSub(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="loading">載入中...</div>}
      {error && <div className="error-msg">{error}</div>}

      {/* Leaderboard view */}
      {!loading && view === 'leaderboard' && data && (
        <>
          {data.players.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
              目前沒有符合條件的玩家
            </div>
          ) : (
            data.players.map((player) => {
              const medal = MEDAL[player.rank];
              const mine = isMyRow(player);
              const effectiveSub = sub || (currentCat?.subs[0]?.key ?? null);

              return (
                <div key={player.userId} style={{ marginBottom: '0.4rem' }}>
                  <div
                    className={`item-row${mine ? ' leaderboard-my-row' : ''}`}
                    style={{ alignItems: 'center' }}
                  >
                    <span>
                      {medal ? (
                        <span className={medal.cls} style={{ marginRight: '0.3rem' }}>
                          {medal.symbol}
                        </span>
                      ) : (
                        <strong style={{ marginRight: '0.3rem' }}>{player.rank}.</strong>
                      )}
                      {player.isPK && (
                        <span style={{ color: '#ef4444', fontWeight: 'bold', marginRight: '0.3rem' }}>[紅名]</span>
                      )}
                      {player.title && (
                        <span className="player-title">「{player.title}」</span>
                      )}
                      {player.name}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ textAlign: 'right' }}>
                        <span style={{ color: 'var(--gold)', fontSize: '0.85rem', fontWeight: 600 }}>
                          {getDisplayValue(player, category, effectiveSub)}
                        </span>
                        {getSecondaryInfo(player, category, effectiveSub) && (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                            {getSecondaryInfo(player, category, effectiveSub)}
                          </span>
                        )}
                      </span>
                      {!mine && (
                        <>
                          <button
                            className="btn-danger"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => {
                              playerDuel.setTarget(playerDuel.target?.userId === player.userId ? null : { userId: player.userId, name: player.name });
                              playerDuel.setResult(null);
                              playerDuel.setError('');
                            }}
                          >
                            {playerDuel.target?.userId === player.userId ? '取消' : '決鬥'}
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
                  {playerDuel.target?.userId === player.userId && (
                    <DuelPanel
                      duel={playerDuel}
                      weapons={weapons}
                      targetLabel={player.name}
                      onSubmit={handleDuel}
                      isNpc={false}
                      cooldownActive={cooldownActive}
                    />
                  )}

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
                                  npcDuel.setTarget(
                                    npcDuel.target?.npcId === npc.npcId
                                      ? null
                                      : { npcId: npc.npcId, name: npc.name }
                                  );
                                  npcDuel.setResult(null);
                                  npcDuel.setError('');
                                }}
                              >
                                {npcDuel.target?.npcId === npc.npcId ? '取消' : '挑戰'}
                              </button>
                            )}
                          </div>

                          {/* NPC Duel config */}
                          {npcDuel.target?.npcId === npc.npcId && (
                            <DuelPanel
                              duel={npcDuel}
                              weapons={weapons}
                              targetLabel={`${npc.name}（${npcOwnerName || player.name} 的 NPC）`}
                              onSubmit={handleNpcDuel}
                              isNpc={true}
                              cooldownActive={cooldownActive}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Pagination */}
          {data.totalPages > 1 && (
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
                {data.page} / {data.totalPages}
              </span>
              <button
                className="btn-primary"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{ padding: '0.3rem 0.8rem' }}
              >
                下一頁
              </button>
            </div>
          )}
        </>
      )}

      {/* Graveyard view */}
      {!loading && view === 'graveyard' && <GraveyardView graves={graves} />}
    </div>
  );
}
