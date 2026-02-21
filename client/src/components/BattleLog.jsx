import React from 'react';
import RandomEventDisplay from './RandomEventDisplay.jsx';

function getActionLabel(action) {
  if (action === 'mine') return '挖礦結果';
  if (action === 'forge') return '鍛造結果';
  if (action === 'upgrade') return '強化結果';
  if (action === 'repair') return '修復結果';
  if (action === 'adventure') return '冒險日誌';
  if (action === 'solo-adventure') return '獨自出擊';
  if (action === 'pvp') return 'PVP 戰鬥';
  if (action === 'pvp-npc') return 'NPC 決鬥';
  if (action === 'boss-attack') return '⚔️ Boss 攻擊';
  if (action === 'boss:damage') return '🗡️ Boss 受到傷害';
  if (action === 'boss:phase') return '⚡ Boss 進入新階段';
  if (action === 'boss:defeated') return '🏆 Boss 被擊敗！';
  if (action === 'floor:unlocked') return '🎉 新樓層解鎖';
  if (action === 'pvp:attacked') return 'PVP 被攻擊';
  return `事件(${action || 'unknown'})`;
}

export default function BattleLog({ logs }) {
  if (logs.length === 0) {
    return (
      <div className="card">
        <h2>戰鬥日誌</h2>
        <p style={{ color: 'var(--text-secondary)' }}>尚無記錄，去冒險或鍛造看看吧！</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>戰鬥日誌</h2>
      <div className="battle-log">
        {logs.map((log, i) => (
          <div
            key={i}
            style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}
          >
            <div style={{ color: 'var(--gold)', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              {getActionLabel(log.action)}
              <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                {log.time ? new Date(log.time).toLocaleTimeString() : ''}
              </span>
            </div>

            {/* General action results */}
            {log.text && <div>{log.text}</div>}
            {log.narrative && <div style={{ fontStyle: 'italic', lineHeight: 1.8 }}>{log.narrative}</div>}
            {log.durabilityText && <div>{log.durabilityText}</div>}
            {log.reward && <div style={{ color: 'var(--success)' }}>{log.reward}</div>}
            {log.battleLog && <div>{log.battleLog}</div>}

            {/* Floor info for adventure */}
            {log.floor && log.floorName && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                📍 第 {log.floor} 層 {log.floorName}
              </div>
            )}

            {/* Col earned */}
            {log.colEarned > 0 && (
              <div style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>
                💰 +{log.colEarned} Col
              </div>
            )}

            {/* Boss attack result */}
            {log.action === 'boss-attack' && log.damage && (
              <div>
                <span style={{ color: 'var(--danger)' }}>
                  ⚔️ 對 {log.bossName} 造成 {log.damage} 傷害
                </span>
                {log.bossDefeated ? (
                  <span style={{ color: 'var(--gold)', marginLeft: '0.5rem' }}>💥 Boss 已被擊敗！</span>
                ) : (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                    (剩餘 HP: {log.bossHpRemaining?.toLocaleString()})
                  </span>
                )}
                {log.counterAttack && (
                  <div style={{ marginTop: '0.3rem', fontSize: '0.85rem' }}>
                    {log.counterAttack.dodged ? (
                      <span style={{ color: 'var(--success)' }}>🛡️ {log.npcName} 閃避了 Boss 的反擊！</span>
                    ) : log.counterAttack.hit ? (
                      <span style={{ color: 'var(--warning)' }}>
                        💥 Boss 反擊！對 {log.npcName} 造成 {log.counterAttack.counterDamage} 傷害
                        {log.counterAttack.isCrit && <span style={{ color: 'var(--danger)' }}> 暴擊！</span>}
                      </span>
                    ) : null}
                    {log.counterAttack.npcDied && (
                      <div style={{ color: 'var(--danger)', fontWeight: 'bold' }}>
                        💀 {log.npcName} 在 Boss 的反擊中陣亡了！
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Boss damage socket event */}
            {log.action === 'boss:damage' && (
              <div style={{ color: 'var(--warning)' }}>
                <div>{log.player} 對 Boss 造成 {log.damage} 傷害 | 剩餘 {log.bossHpRemaining?.toLocaleString()} HP</div>
                {log.counterAttack && (
                  <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    {log.counterAttack.dodged ? (
                      <span style={{ color: 'var(--success)' }}>🛡️ {log.npcName} 閃避了反擊</span>
                    ) : log.counterAttack.hit ? (
                      <span>
                        💥 Boss 反擊 {log.npcName}：{log.counterAttack.counterDamage} 傷害
                        {log.counterAttack.isCrit && ' (暴擊)'}
                        {log.counterAttack.npcDied && <span style={{ color: 'var(--danger)' }}> — 陣亡！</span>}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* Boss phase socket event */}
            {log.action === 'boss:phase' && (
              <div style={{ color: 'var(--warning)' }}>
                {log.weapon && (
                  <div>🗡️ Boss 切換武器為「{log.weapon}」！</div>
                )}
                <div>
                  ⚡ {log.bossName} 發動了「{log.specialMove}」！
                  {log.defBoost > 0 && ` 防禦力 +${log.defBoost}`}
                  {log.defBoost < 0 && ` 防禦力 ${log.defBoost}`}
                  {log.atkBoost > 0 && ` 攻擊力 +${log.atkBoost}`}
                </div>
              </div>
            )}

            {/* Boss defeated socket event */}
            {log.action === 'boss:defeated' && (
              <div style={{ color: 'var(--gold)' }}>
                <div>
                  第 {log.floorNumber} 層 Boss 「{log.bossName}」已被擊敗！
                  MVP: {log.mvp?.name} ({log.mvp?.damage?.toLocaleString()} 傷害)
                </div>
                {log.lastAttacker && (
                  <div style={{ marginTop: '0.3rem', fontSize: '0.9rem' }}>
                    🗡️ Last Attack: {log.lastAttacker.name}
                  </div>
                )}
                {log.lastAttackDrop && (
                  <div style={{ marginTop: '0.3rem', fontSize: '0.9rem', color: '#ffd700', fontWeight: 'bold' }}>
                    🏆 聖遺物「{log.lastAttackDrop.nameCn}（{log.lastAttackDrop.name}）」！
                  </div>
                )}
                {!log.lastAttackDrop && log.lastAttackAlreadyOwned && (
                  <div style={{ marginTop: '0.3rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    🗡️ {log.lastAttacker?.name} Last Attack! 已擁有聖遺物，獲得 +{log.laColBonus || 0} Col
                  </div>
                )}
                {log.drops && log.drops.length > 0 && (
                  <div style={{ marginTop: '0.3rem', fontSize: '0.85rem' }}>
                    🎁 掉落物：
                    {log.drops.map((d, di) => (
                      <div key={di} style={{ marginLeft: '1rem' }}>
                        {d.playerName}: {'★'.repeat(d.itemLevel)}{d.itemName}
                        {d.isMvp ? ' (MVP保證掉落)' : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Floor unlocked socket event */}
            {log.action === 'floor:unlocked' && (
              <div style={{ color: 'var(--success)' }}>
                第 {log.floorNumber} 層「{log.name}（{log.nameCn}）」已解鎖！
              </div>
            )}

            {/* PVP attacked */}
            {log.action === 'pvp:attacked' && (
              <div>
                <span style={{ color: 'var(--danger)' }}>
                  ⚠️ 遭到 {log.attacker} 的挑戰！勝者: {log.winner}
                </span>
                {log.reward && <div>{log.reward}</div>}
              </div>
            )}

            {/* 隨機事件 */}
            {log.randomEvent && (
              <RandomEventDisplay event={log.randomEvent} />
            )}
          </div>
        )).reverse()}
      </div>
    </div>
  );
}
