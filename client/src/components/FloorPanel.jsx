import React, { useState, useEffect, useCallback } from 'react';
import BossHealthBar from './BossHealthBar';
import NpcQuickHeal from './NpcQuickHeal';

export default function FloorPanel({ user, onAction, bossUpdate, cooldownActive, onUserRefresh }) {
  const [floorInfo, setFloorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [changingFloor, setChangingFloor] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [showBattleLog, setShowBattleLog] = useState(false);
  const [weaponId, setWeaponId] = useState('0');
  const [bossNpcId, setBossNpcId] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const fetchFloor = useCallback(async () => {
    try {
      const res = await fetch('/api/game/floor', { credentials: 'include' });
      const data = await res.json();
      if (!data.error) {
        setFloorInfo(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFloor();
  }, [fetchFloor]);

  // Re-fetch when boss:damage or boss:defeated event received
  useEffect(() => {
    if (bossUpdate) {
      fetchFloor();
    }
  }, [bossUpdate, fetchFloor]);

  const handleChangeFloor = async (floor) => {
    setChangingFloor(true);
    setError('');
    try {
      const res = await fetch('/api/game/change-floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ floor }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        await fetchFloor();
        if (onUserRefresh) onUserRefresh();
      }
    } catch {
      setError('切換樓層失敗');
    } finally {
      setChangingFloor(false);
    }
  };

  const handleBossAttack = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    setShowBattleLog(false);
    try {
      const data = await onAction('boss-attack', { weaponId: parseInt(weaponId, 10), npcId: bossNpcId });
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        await fetchFloor();
      }
    } catch {
      setError('網路錯誤，請稍後再試。');
    } finally {
      setBusy(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/game/floor/history', { credentials: 'include' });
      const data = await res.json();
      if (!data.error) {
        setHistory(data.history || []);
        setShowHistory(true);
      }
    } catch {
      // silent
    }
  };

  if (loading) return <div className="loading">載入樓層資訊...</div>;
  if (!floorInfo) return <div className="card"><p style={{ color: 'var(--text-secondary)' }}>無法取得樓層資訊</p></div>;

  const { floor, progress, bossStatus, canAttackBoss, activeFloor, maxFloor, availableFloors } = floorInfo;
  const maxExplore = progress.maxExplore || floor.maxExplore || 5;
  const explored = progress.explored ?? 0;
  const exploreProgress = Math.min(explored, maxExplore);
  const isAtFrontier = activeFloor === maxFloor;
  const floorDiff = (maxFloor || 1) - (activeFloor || 1);
  const profMult = Math.max(0, 1 - floorDiff * 0.25);
  const selectedBossNpc = bossNpcId
    ? (user.hiredNpcs || []).find((n) => n.npcId === bossNpcId)
    : null;

  return (
    <div>
      {/* 樓層選擇器 */}
      {maxFloor > 1 && (
        <div className="card">
          <h2>🗺️ 樓層移動</h2>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {(availableFloors || []).map((f) => (
              <button
                key={f.floor}
                className={f.floor === activeFloor ? 'btn-primary' : 'btn-secondary'}
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.8rem',
                  minWidth: '3rem',
                  position: 'relative',
                }}
                disabled={changingFloor || f.floor === activeFloor}
                onClick={() => handleChangeFloor(f.floor === maxFloor ? null : f.floor)}
              >
                {f.floor}F{f.floor === maxFloor ? ' ⚔' : ''}
              </button>
            ))}
          </div>
          {!isAtFrontier && (
            <div style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
              <span style={{ color: 'var(--warning)' }}>⚠ 非前線樓層</span>
              <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                熟練度獲取：{Math.round(profMult * 100)}%
                {profMult === 0 && '（無法獲得）'}
              </span>
              <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                ・無法挑戰 Boss
              </span>
            </div>
          )}
        </div>
      )}

      {/* 樓層資訊 */}
      <div className="card">
        <h2>⚔️ Aincrad 第 {floor.floorNumber} 層</h2>
        <div style={{ color: 'var(--gold)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>
          {floor.name} <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>（{floor.nameCn}）</span>
        </div>

        {/* 探索進度 */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>迷宮探索進度</span>
            <span style={{ fontSize: '0.85rem' }}>{exploreProgress} / {maxExplore}</span>
          </div>
          <div className="explore-track">
            <div
              className="explore-fill"
              style={{ width: `${(exploreProgress / maxExplore) * 100}%` }}
            />
          </div>
          {!canAttackBoss && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              完成探索後可挑戰 Boss（還需 {maxExplore - exploreProgress} 次冒險）
            </p>
          )}
          {canAttackBoss && (
            <p style={{ color: 'var(--success)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              ✓ 迷宮探索完成！可以挑戰 Boss
            </p>
          )}
        </div>
      </div>

      {/* Boss 狀態 */}
      <div className="card">
        <h2>👹 Boss 戰況</h2>
        <BossHealthBar
          bossName={floor.boss.name}
          currentHp={bossStatus.active ? bossStatus.currentHp : bossStatus.totalHp}
          totalHp={bossStatus.totalHp}
          participants={bossStatus.participants}
          currentWeapon={bossStatus.active ? bossStatus.currentWeapon : null}
          phases={floor.boss.phases}
        />

        {bossStatus.active && bossStatus.expiresAt && (
          <p style={{ color: 'var(--warning)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            ⏰ 挑戰期限: {new Date(bossStatus.expiresAt).toLocaleString()}
          </p>
        )}

        {!bossStatus.active && !canAttackBoss && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            完成迷宮探索後才能挑戰 Boss
          </p>
        )}

        {canAttackBoss && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={bossNpcId}
                onChange={(e) => setBossNpcId(e.target.value)}
              >
                <option value="">— 選擇冒險者（必填）—</option>
                {(user.hiredNpcs || []).map((npc) => {
                  const cond = npc.condition ?? 100;
                  const onMission = !!npc.mission;
                  const disabled = cond < 10 || onMission;
                  return (
                    <option key={npc.npcId} value={npc.npcId} disabled={disabled}>
                      {npc.name}【{npc.quality}】{npc.class} LV.{npc.level} 體力:{cond}%
                      {onMission ? ' (任務中)' : disabled ? ' (無法出戰)' : ''}
                    </option>
                  );
                })}
              </select>
              <select
                value={weaponId}
                onChange={(e) => setWeaponId(e.target.value)}
              >
                <option value="0">— 選擇武器 (預設#0) —</option>
                {(user.weapons || []).map((weapon) => (
                  <option key={weapon.index} value={String(weapon.index)}>
                    #{weapon.index}{' '}
                    {weapon.rarityLabel ? `【${weapon.rarityLabel}】` : ''}
                    {weapon.weaponName} [{weapon.name}] ATK:{weapon.atk} 耐久:{weapon.durability}
                  </option>
                ))}
              </select>
              <button
                className="btn-danger"
                disabled={busy || cooldownActive || !bossNpcId}
                onClick={handleBossAttack}
              >
                {busy ? '攻擊中...' : cooldownActive ? '冷卻中...' : `攻擊 ${floor.boss.name}`}
              </button>
            </div>
            {selectedBossNpc && <NpcQuickHeal npc={selectedBossNpc} onHealed={onUserRefresh} />}
            {(user.hiredNpcs || []).length === 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                請先至「酒館」tab 雇用冒險者才能挑戰 Boss
              </div>
            )}
            {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
            {result && (
              <div className="result-card-highlight" style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                borderRadius: '6px',
                background: 'var(--bg-secondary)',
              }}>
                {/* 傷害總結 */}
                <div style={{ color: 'var(--gold)', fontWeight: 'bold' }}>
                  ⚔️ {result.npcName || '冒險者'} 對 {result.bossName} 造成了 {result.damage} 點傷害！
                  {result.bossDefeated
                    ? result.bossAlreadyProcessed
                      ? ' 💥 Boss 被其他玩家同時擊敗了！'
                      : ` 💥 Boss 被擊敗了！第 ${result.floorNumber} 層攻略完成！MVP: ${result.mvp?.name || '—'}`
                    : ` 剩餘 HP: ${result.bossHpRemaining?.toLocaleString()}`}
                </div>
                {/* Boss 擊敗獎勵 */}
                {result.bossDefeated && !result.bossAlreadyProcessed && (
                  <div style={{ marginTop: '0.3rem', fontSize: '0.9rem' }}>
                    {result.lastAttackDrop && (
                      <div style={{ color: '#ffd700' }}>🗡️ Last Attack! 獲得聖遺物「{result.lastAttackDrop.nameCn}（{result.lastAttackDrop.name}）」！{result.laColBonus > 0 && ` +${result.laColBonus} Col`}</div>
                    )}
                    {!result.lastAttackDrop && result.lastAttackAlreadyOwned && (
                      <div>🗡️ Last Attack! 已擁有該聖遺物，獲得 +{result.laColBonus} Col</div>
                    )}
                    {result.drops && result.drops.length > 0 && (
                      <div>🎁 掉落物：{result.drops.map((d, di) => (
                        <div key={di} style={{ marginLeft: '1rem' }}>{d.playerName}: {'★'.repeat(d.itemLevel)}{d.itemName}{d.isMvp ? ' (MVP保證掉落)' : ''}</div>
                      ))}</div>
                    )}
                  </div>
                )}
                {/* 特殊機制觸發 */}
                {result.battleLog?.specialMechanics && result.battleLog.specialMechanics.length > 0 && (
                  <div style={{ marginTop: '0.3rem' }}>
                    {result.battleLog.specialMechanics.map((sm, mi) => {
                      const isDanger = sm.mechanic === 'weapon_break' || sm.mechanic === 'persistent_debuff';
                      const isPenalty = sm.triggered === true || (sm.mechanic === 'weapon_affinity' && sm.affinityType !== 'neutral' && sm.affinityType !== 'weak');
                      const isBonus = sm.affinityType === 'weak';
                      const color = isDanger ? '#ef4444' : isBonus ? '#22c55e' : isPenalty ? '#f59e0b' : '#22c55e';
                      const bg = isDanger ? 'rgba(239, 68, 68, 0.08)' : isBonus ? 'rgba(34, 197, 94, 0.08)' : isPenalty ? 'rgba(245, 158, 11, 0.08)' : 'rgba(34, 197, 94, 0.08)';
                      const iconMap = { agi_penalty: '⚡', weapon_affinity: '🗡️', weapon_break: '🔨', persistent_debuff: '☠️' };
                      return (
                        <div key={mi} style={{
                          fontSize: '0.85rem', padding: '0.2rem 0.4rem', marginBottom: '0.2rem',
                          borderLeft: `2px solid ${color}`,
                          background: bg,
                        }}>
                          <span style={{ color }}>
                            {iconMap[sm.mechanic] || '⚡'} {sm.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* 武器耐久損傷 / 詛咒 */}
                {result.weaponDurabilityDamage > 0 && (
                  <div style={{ marginTop: '0.3rem', fontSize: '0.85rem', padding: '0.2rem 0.4rem', borderLeft: '2px solid #ef4444', background: 'rgba(239, 68, 68, 0.08)' }}>
                    <span style={{ color: '#ef4444' }}>
                      {result.weaponBroken
                        ? `💥 ${result.weaponName} 被 Boss 擊碎了！（-${result.weaponDurabilityDamage} 耐久）`
                        : `🔨 ${result.weaponName} 受到損傷（-${result.weaponDurabilityDamage} 耐久）`}
                    </span>
                  </div>
                )}
                {result.debuffApplied && (
                  <div style={{ marginTop: '0.3rem', fontSize: '0.85rem', padding: '0.2rem 0.4rem', borderLeft: '2px solid #a855f7', background: 'rgba(168, 85, 247, 0.08)' }}>
                    <span style={{ color: '#a855f7' }}>
                      ☠️ {result.npcName} 被施加了{result.debuffApplied.bossName}的詛咒！{result.debuffApplied.stat.toUpperCase()} x{result.debuffApplied.mult}（{Math.round(result.debuffApplied.durationMs / 60000)} 分鐘）
                    </span>
                  </div>
                )}
                {/* 劍技事件 */}
                {result.skillEvents && result.skillEvents.length > 0 && (
                  <div style={{ marginTop: '0.3rem' }}>
                    {result.skillEvents.map((evt, si) => (
                      <div key={si} style={{
                        fontSize: '0.85rem', padding: '0.2rem 0.4rem', marginBottom: '0.2rem',
                        borderLeft: `2px solid ${evt.color || '#a855f7'}`, background: 'rgba(168, 85, 247, 0.05)',
                      }}>
                        <span style={{ color: evt.color || '#a855f7', fontWeight: 'bold' }}>⚔️ {evt.attacker} 發動【{evt.skillName}】</span>
                        {' → '}{evt.defender} {evt.damage} 傷害
                        {evt.hitCount > 1 && ` (${evt.hitCount}hit)`}
                        {evt.isCrit && <span style={{ color: 'var(--gold)' }}> 暴擊！</span>}
                        {evt.stunned && <span style={{ color: 'var(--warning)' }}> 暈眩！</span>}
                        {evt.chainCount > 0 && <span style={{ color: '#f97316' }}> Skill Connect ×{evt.chainCount}!</span>}
                      </div>
                    ))}
                  </div>
                )}
                {/* 戰鬥回合日誌（可摺疊） */}
                {result.battleLog?.log && result.battleLog.log.length > 0 && (
                  <div style={{ marginTop: '0.3rem' }}>
                    <button
                      onClick={() => setShowBattleLog(!showBattleLog)}
                      style={{
                        background: 'none', border: 'none', color: 'var(--text-secondary)',
                        cursor: 'pointer', fontSize: '0.85rem', padding: 0, textDecoration: 'underline',
                      }}
                    >
                      {showBattleLog ? '▼ 收合戰鬥日誌' : '▶ 展開戰鬥日誌'}
                    </button>
                    {showBattleLog && (
                      <div style={{ marginTop: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {result.battleLog.log.map((entry, li) => {
                          if (entry.type === 'round') {
                            return <div key={li} style={{ marginTop: '0.3rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>── 第 {entry.number} 回合 ──</div>;
                          }
                          if (entry.type === 'attack') {
                            return (
                              <div key={li} style={{ marginLeft: '0.5rem' }}>
                                {entry.hit
                                  ? <span>{entry.attacker} → {entry.defender} <span style={{ color: 'var(--danger)' }}>{entry.damage} 傷害</span>{entry.isCrit && <span style={{ color: 'var(--gold)' }}> 暴擊！</span>}</span>
                                  : <span style={{ color: 'var(--text-secondary)' }}>{entry.attacker} → {entry.defender} MISS</span>}
                              </div>
                            );
                          }
                          if (entry.type === 'skill_attack') {
                            return (
                              <div key={li} style={{ marginLeft: '0.5rem', color: '#a855f7' }}>
                                ⚔️ {entry.attacker} 發動【{entry.skillName}】→ {entry.defender} {entry.damage} 傷害
                                {entry.hitCount > 1 && ` (${entry.hitCount}hit)`}
                              </div>
                            );
                          }
                          if (entry.type === 'stun') {
                            return <div key={li} style={{ marginLeft: '0.5rem', color: 'var(--warning)' }}>💫 {entry.target} 被暈眩了！</div>;
                          }
                          if (entry.type === 'heal') {
                            return <div key={li} style={{ marginLeft: '0.5rem', color: 'var(--success)' }}>💚 {entry.target} 回復 {entry.value} HP</div>;
                          }
                          if (entry.type === 'weapon_break') {
                            return <div key={li} style={{ marginLeft: '0.5rem', color: '#ef4444' }}>🔨 {entry.text}</div>;
                          }
                          if (entry.type === 'end') {
                            const outcomeText = entry.outcome === 'win' ? '🏆 勝利！' : entry.outcome === 'lose' ? '💀 敗北' : '⏱️ 平手';
                            return <div key={li} style={{ marginTop: '0.3rem', fontWeight: 'bold', color: entry.outcome === 'win' ? 'var(--gold)' : entry.outcome === 'lose' ? 'var(--danger)' : 'var(--text-secondary)' }}>{outcomeText}</div>;
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                )}
                {/* NPC 狀態 */}
                {result.npcResult?.died ? (
                  <div style={{ color: 'var(--danger)', fontWeight: 'bold', marginTop: '0.3rem' }}>💀 {result.npcName} 在 Boss 戰鬥中陣亡了！</div>
                ) : result.condAfter != null && (
                  <div style={{ color: 'var(--text-secondary)', marginTop: '0.3rem' }}>❤️ {result.npcName} 體力：{result.condBefore}% → {result.condAfter}%</div>
                )}
                {result.npcEventText && <div style={{ marginTop: '0.3rem' }}>{result.npcEventText}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 攻略歷史 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>📜 攻略歷史</h2>
          <button
            className="btn-primary"
            onClick={fetchHistory}
            style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
          >
            讀取
          </button>
        </div>
        {showHistory && (
          history.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>尚無攻略記錄</p>
          ) : (
            <div style={{ marginTop: '0.5rem' }}>
              {history.map((h, i) => (
                <div key={i} className="item-row">
                  <span>第 {h.floorNumber} 層</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    MVP: {h.mvp?.name || '—'} | {new Date(h.clearedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
