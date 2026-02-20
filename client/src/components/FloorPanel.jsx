import React, { useState, useEffect, useCallback } from 'react';
import BossHealthBar from './BossHealthBar';

export default function FloorPanel({ user, onAction, bossUpdate }) {
  const [floorInfo, setFloorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
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

  const handleBossAttack = async () => {
    setBusy(true);
    setError('');
    setResult('');
    try {
      const data = await onAction('boss-attack', { weaponId: parseInt(weaponId, 10), npcId: bossNpcId });
      if (data.error) {
        setError(data.error);
      } else if (data.bossDefeated) {
        let msg;
        if (data.bossAlreadyProcessed) {
          msg = `⚔️ ${data.npcName || '冒險者'} 對 ${data.bossName} 造成了 ${data.damage} 點傷害！\n💥 Boss 被其他玩家同時擊敗了！獎勵已由最後一擊的玩家獲得。`;
        } else {
          msg = `⚔️ ${data.npcName || '冒險者'} 對 ${data.bossName} 造成了 ${data.damage} 點傷害！\n💥 Boss 被擊敗了！ 第 ${data.floorNumber} 層攻略完成！MVP: ${data.mvp?.name || '—'}`;
          if (data.lastAttackDrop) {
            msg += `\n🗡️ Last Attack! 獲得聖遺物「${data.lastAttackDrop.nameCn}（${data.lastAttackDrop.name}）」！`;
            if (data.laColBonus > 0) msg += ` +${data.laColBonus} Col`;
          } else if (data.lastAttackAlreadyOwned) {
            msg += `\n🗡️ Last Attack! 已擁有該聖遺物，獲得 +${data.laColBonus} Col`;
          }
          if (data.drops && data.drops.length > 0) {
            msg += '\n🎁 掉落物：';
            for (const d of data.drops) {
              msg += `\n  ${d.playerName}: ${'★'.repeat(d.itemLevel)}${d.itemName}${d.isMvp ? ' (MVP保證掉落)' : ''}`;
            }
          }
        }
        if (data.npcEventText) msg += `\n${data.npcEventText}`;
        setResult(msg);
        await fetchFloor();
      } else {
        let msg = `⚔️ ${data.npcName || '冒險者'} 對 ${data.bossName} 造成了 ${data.damage} 點傷害！剩餘 HP: ${data.bossHpRemaining?.toLocaleString()}`;
        if (data.npcEventText) msg += `\n${data.npcEventText}`;
        setResult(msg);
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

  const { floor, progress, bossStatus, canAttackBoss } = floorInfo;
  const exploreProgress = Math.min(progress.explored, progress.maxExplore);

  return (
    <div>
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
            <span style={{ fontSize: '0.85rem' }}>{exploreProgress} / {progress.maxExplore}</span>
          </div>
          <div className="explore-track">
            <div
              className="explore-fill"
              style={{ width: `${(exploreProgress / progress.maxExplore) * 100}%` }}
            />
          </div>
          {!canAttackBoss && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              完成探索後可挑戰 Boss（還需 {progress.maxExplore - exploreProgress} 次冒險）
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
                disabled={busy || !bossNpcId}
                onClick={handleBossAttack}
              >
                {busy ? '攻擊中...' : `攻擊 ${floor.boss.name}`}
              </button>
            </div>
            {(user.hiredNpcs || []).length === 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                請先至「酒館」tab 雇用冒險者才能挑戰 Boss
              </div>
            )}
            {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
            {result && (
              <div style={{ marginTop: '0.5rem', color: 'var(--gold)', fontWeight: 'bold', whiteSpace: 'pre-line' }}>
                {result}
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
