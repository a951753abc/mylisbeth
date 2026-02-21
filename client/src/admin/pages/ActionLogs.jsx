import { useState, useEffect, useCallback } from "react";

const ACTION_LABELS = {
  mine: "採礦",
  forge: "鍛造",
  up: "強化",
  adv: "冒險",
  pvp: "PvP",
  pvpNpc: "NPC 決鬥",
  repair: "修復",
  soloAdv: "獨自冒險",
  boss: "Boss 攻擊",
  daily: "每日獎勵",
  sell_item: "出售素材",
  sell_weapon: "出售武器",
  "npc:hire": "雇用 NPC",
  "npc:fire": "解雇 NPC",
  "npc:heal": "治療 NPC",
  "npc:mission": "派遣任務",
  "market:list_item": "掛賣素材",
  "market:list_weapon": "掛賣武器",
  "market:buy": "購買",
  "admin:modify_col": "GM:修改 Col",
  "admin:modify_item": "GM:修改物品",
  "admin:reset_fields": "GM:重設狀態",
  "admin:delete_player": "GM:刪除玩家",
  "admin:config_override": "GM:修改設定",
  "admin:config_reset": "GM:還原設定",
  "admin:config_reset_all": "GM:全部還原",
};

const BATTLE_ACTIONS = new Set(["adv", "soloAdv", "pvp", "boss"]);

function BattleLogDetail({ battle, action }) {
  if (!battle) return null;

  if (action === "adv" || action === "soloAdv") {
    return <PveBattleDetail battle={battle} />;
  }
  if (action === "pvp") {
    return <PvpBattleDetail battle={battle} />;
  }
  if (action === "boss") {
    return <BossBattleDetail battle={battle} />;
  }
  return null;
}

function PveBattleDetail({ battle }) {
  const outcomeColor = battle.outcome === "win" ? "#4caf50" : battle.outcome === "lose" ? "#e94560" : "#ffa726";
  const outcomeText = battle.outcome === "win" ? "勝利" : battle.outcome === "lose" ? "敗北" : "平手";

  return (
    <div style={detailStyles.container}>
      <div style={detailStyles.summary}>
        <span style={{ color: outcomeColor, fontWeight: "bold" }}>{outcomeText}</span>
        {" | "}
        <span>{battle.npcName} vs {battle.enemyName}</span>
        {battle.category && <span style={{ color: "#a855f7" }}> {battle.category}</span>}
      </div>
      <div style={detailStyles.hpBar}>
        HP: {battle.initialHp?.npc ?? "?"} → {battle.finalHp?.npc ?? "?"}
        {" | "}
        敵 HP: {battle.initialHp?.enemy ?? "?"} → {battle.finalHp?.enemy ?? "?"}
      </div>
      {battle.log && <RoundLog log={battle.log} />}
      {battle.skillEvents?.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={detailStyles.sectionTitle}>劍技觸發</div>
          {battle.skillEvents.map((ev, i) => (
            <div key={i} style={{ fontSize: 11, color: "#c084fc" }}>
              {ev.skillName || ev.skillId} — {ev.totalDamage ?? ev.damage ?? 0} dmg
              {ev.chainCount > 0 && ` (Chain x${ev.chainCount})`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PvpBattleDetail({ battle }) {
  const modeLabels = { first_strike: "先制", half_loss: "半殺", total_loss: "全取" };
  return (
    <div style={detailStyles.container}>
      <div style={detailStyles.summary}>
        <span style={{ fontWeight: "bold" }}>{battle.attackerName} vs {battle.defenderName}</span>
        {" | "}
        <span style={{ color: "#ffa726" }}>{modeLabels[battle.duelMode] || battle.duelMode}</span>
        {battle.wagerCol > 0 && <span> | 賭注 {battle.wagerCol} Col</span>}
        {" | 勝者: "}
        <span style={{ color: "#4caf50" }}>{battle.outcome}</span>
      </div>
      {battle.detailLog && <RoundLog log={battle.detailLog} isPvp />}
    </div>
  );
}

function BossBattleDetail({ battle }) {
  const ca = battle.counterAttack;
  return (
    <div style={detailStyles.container}>
      <div style={detailStyles.summary}>
        <span>{battle.bossName}</span>
        {" | 造成 "}
        <span style={{ color: "#ffa726", fontWeight: "bold" }}>{battle.damage}</span>
        {" 傷害 | HP: "}
        {battle.bossHpRemaining}/{battle.bossHpTotal}
        {battle.bossDefeated && <span style={{ color: "#4caf50", marginLeft: 8 }}>DEFEATED</span>}
      </div>
      {ca && (
        <div style={{ fontSize: 11, color: ca.hit ? "#e94560" : "#4caf50", marginTop: 4 }}>
          反擊: {ca.hit ? `命中 ${ca.counterDamage} dmg` : ca.dodged ? "閃避" : "未命中"}
          {ca.isCrit && " (暴擊)"}
          {" | 結果: "}{ca.outcome}
        </div>
      )}
    </div>
  );
}

function RoundLog({ log, isPvp }) {
  if (!log || log.length === 0) return null;

  return (
    <div style={{ marginTop: 6, maxHeight: 300, overflowY: "auto" }}>
      {log.map((entry, i) => {
        if (entry.type === "round") {
          const init = entry.initiative;
          let initText = "";
          if (init) {
            if (init.forced) {
              initText = ` [劍技先制: ${init.skill}]`;
            } else if (isPvp) {
              initText = ` [先手: ${init.atkRoll}+AGI=${init.atkAct} vs ${init.defRoll}+AGI=${init.defAct}]`;
            } else {
              initText = ` [先手: ${init.npcRoll}+AGI=${init.npcAct} vs ${init.eneRoll}+AGI=${init.eneAct}]`;
            }
          }
          return (
            <div key={i} style={detailStyles.roundHeader}>
              第 {entry.number} 回合{initText}
            </div>
          );
        }
        if (entry.type === "end") {
          const color = entry.outcome === "win" ? "#4caf50" : entry.outcome === "lose" ? "#e94560" : "#ffa726";
          return (
            <div key={i} style={{ fontSize: 11, color, fontWeight: "bold", marginTop: 2 }}>
              結束 — {entry.outcome === "win" ? "勝利" : entry.outcome === "lose" ? "敗北" : "平手"}
              {entry.winner && ` (${entry.winner})`}
            </div>
          );
        }
        if (entry.type === "stun") {
          return <div key={i} style={{ fontSize: 11, color: "#fbbf24" }}>{entry.target} 被暈眩！</div>;
        }
        if (entry.type === "skill_heal") {
          return <div key={i} style={{ fontSize: 11, color: "#34d399" }}>{entry.target} 回復 {entry.amount} HP</div>;
        }
        // 技能攻擊 log (from skillEvents embedded in log)
        if (entry.type === "skill_attack") {
          return (
            <div key={i} style={{ fontSize: 11, color: entry.color || "#c084fc" }}>
              {entry.attacker} → {entry.defender} 劍技【{entry.skillName}】{entry.totalDamage} dmg
              {entry.hitCount > 1 && ` (${entry.hitCount}段)`}
              {entry.isCrit && " 暴擊"}
              {entry.chainCount > 0 && ` Chain x${entry.chainCount}`}
            </div>
          );
        }
        // 一般攻擊 log
        if (entry.attacker) {
          const hitDetail = entry.hitDetail;
          const damDetail = entry.damDetail;
          let hitText = "";
          if (hitDetail) {
            hitText = ` [命中: ${hitDetail.atkRoll}+AGI=${hitDetail.atkAct} vs ${hitDetail.defRoll}+AGI=${hitDetail.defAct}]`;
          }
          let dmgText = "";
          if (damDetail) {
            dmgText = ` [攻骰:${damDetail.atkTotal} 防骰:${damDetail.defTotal}`;
            if (damDetail.critCount > 0) dmgText += ` 暴擊x${damDetail.critCount}`;
            dmgText += "]";
          }
          return (
            <div key={i} style={{ fontSize: 11, color: entry.hit ? (entry.isCrit ? "#fbbf24" : "#ddd") : "#666" }}>
              {entry.attacker} → {entry.defender}:
              {entry.hit ? ` ${entry.damage} dmg` : " MISS"}
              {entry.isCrit && " (暴擊)"}
              {entry.skill && ` 【${entry.skill}】`}
              {hitText}{dmgText}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

export default function ActionLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (userId) params.set("userId", userId);
      if (action) params.set("action", action);
      const res = await fetch(`/api/admin/logs?${params}`, { credentials: "include" });
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, userId, action]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setExpandedRow(null);
  }, [page, userId, action]);

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const totalPages = Math.ceil(total / limit);

  function summarizeDetails(log) {
    const d = log.details;
    if (!d) return "";
    if (log.error) return log.error;

    const battle = d.battle;
    if (battle) {
      if (log.action === "adv" || log.action === "soloAdv") {
        const outcome = battle.outcome === "win" ? "勝" : battle.outcome === "lose" ? "敗" : "平";
        return `${outcome} | ${battle.npcName} vs ${battle.enemyName || "?"}${d.colEarned ? ` | +${d.colEarned} Col` : ""}`;
      }
      if (log.action === "pvp") {
        return `${battle.attackerName} vs ${battle.defenderName} | 勝: ${battle.outcome}`;
      }
      if (log.action === "boss") {
        return `${battle.bossName} | ${battle.damage} dmg | HP: ${battle.bossHpRemaining}/${battle.bossHpTotal}`;
      }
    }
    return JSON.stringify(d).slice(0, 100);
  }

  return (
    <div>
      <h2 style={styles.title}>操作日誌</h2>

      <form onSubmit={handleFilter} style={styles.filterBar}>
        <input
          type="text"
          placeholder="玩家 ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={styles.input}
        />
        <select value={action} onChange={(e) => setAction(e.target.value)} style={styles.select}>
          <option value="">全部動作</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button type="submit" style={styles.btn}>篩選</button>
      </form>

      <div style={{ fontSize: 13, color: "#a0a0b0", marginBottom: 12 }}>
        共 {total} 筆紀錄
      </div>

      {loading ? (
        <div style={{ color: "#a0a0b0" }}>載入中...</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>時間</th>
              <th style={styles.th}>玩家</th>
              <th style={styles.th}>動作</th>
              <th style={styles.th}>狀態</th>
              <th style={styles.th}>詳情</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => {
              const hasBattle = BATTLE_ACTIONS.has(log.action) && log.details?.battle;
              const isExpanded = expandedRow === i;
              return (
                <tr key={i}>
                  <td style={styles.td}>
                    {new Date(log.timestamp).toLocaleString("zh-TW")}
                  </td>
                  <td style={styles.td}>{log.playerName || log.userId}</td>
                  <td style={styles.td}>
                    {ACTION_LABELS[log.action] || log.action}
                  </td>
                  <td style={{
                    ...styles.td,
                    color: log.success ? "#4caf50" : "#e94560",
                  }}>
                    {log.success ? "成功" : "失敗"}
                  </td>
                  <td style={{ ...styles.td, maxWidth: 500, whiteSpace: "normal" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "#888", flex: 1 }}>
                        {summarizeDetails(log)}
                      </span>
                      {hasBattle && (
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : i)}
                          style={styles.expandBtn}
                        >
                          {isExpanded ? "收合" : "展開"}
                        </button>
                      )}
                      {!hasBattle && log.details && Object.keys(log.details).length > 3 && (
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : i)}
                          style={styles.expandBtn}
                        >
                          {isExpanded ? "收合" : "展開"}
                        </button>
                      )}
                    </div>
                    {isExpanded && hasBattle && (
                      <BattleLogDetail battle={log.details.battle} action={log.action} />
                    )}
                    {isExpanded && !hasBattle && (
                      <pre style={detailStyles.json}>
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={styles.pageBtn}
          >
            上一頁
          </button>
          <span style={{ color: "#a0a0b0", fontSize: 13 }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={styles.pageBtn}
          >
            下一頁
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { color: "#e94560", marginTop: 0, marginBottom: 20 },
  filterBar: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  input: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #0f3460",
    background: "#1a1a2e",
    color: "#eee",
    fontSize: 13,
    width: 160,
    outline: "none",
  },
  select: {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #0f3460",
    background: "#1a1a2e",
    color: "#eee",
    fontSize: 13,
  },
  btn: {
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    background: "#e94560",
    color: "#fff",
    fontSize: 13,
    cursor: "pointer",
  },
  expandBtn: {
    padding: "2px 8px",
    fontSize: 11,
    borderRadius: 3,
    border: "1px solid #0f3460",
    background: "transparent",
    color: "#a0a0b0",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#16213e",
    borderRadius: 8,
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: 12,
    color: "#a0a0b0",
    borderBottom: "1px solid #0f3460",
  },
  td: {
    padding: "6px 12px",
    fontSize: 13,
    color: "#ddd",
    borderBottom: "1px solid #0f3460",
    verticalAlign: "top",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
  },
  pageBtn: {
    padding: "6px 14px",
    borderRadius: 4,
    border: "1px solid #0f3460",
    background: "transparent",
    color: "#a0a0b0",
    cursor: "pointer",
    fontSize: 13,
  },
};

const detailStyles = {
  container: {
    marginTop: 8,
    padding: "8px 10px",
    background: "#1a1a2e",
    borderRadius: 6,
    border: "1px solid #0f3460",
  },
  summary: {
    fontSize: 12,
    color: "#ddd",
    marginBottom: 4,
  },
  hpBar: {
    fontSize: 11,
    color: "#a0a0b0",
  },
  sectionTitle: {
    fontSize: 11,
    color: "#a855f7",
    fontWeight: "bold",
    marginBottom: 2,
  },
  roundHeader: {
    fontSize: 11,
    color: "#60a5fa",
    fontWeight: "bold",
    marginTop: 4,
    borderTop: "1px solid #0f3460",
    paddingTop: 3,
  },
  json: {
    marginTop: 8,
    padding: 8,
    background: "#1a1a2e",
    borderRadius: 6,
    border: "1px solid #0f3460",
    fontSize: 11,
    color: "#a0a0b0",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    maxHeight: 300,
    overflowY: "auto",
  },
};
