import React, { useState, useEffect, useCallback, useRef } from "react";
import { QUALITY_COLOR } from "../constants/npcQuality.js";

const CARD_STYLE = { marginBottom: "0.8rem" };
const BTN_SMALL = { padding: "0.2rem 0.6rem", fontSize: "0.78rem" };
const EMPTY_STYLE = { color: "var(--text-secondary)", fontSize: "0.85rem" };
const TAG_STYLE = {
  display: "inline-block",
  padding: "0.1rem 0.4rem",
  borderRadius: "3px",
  fontSize: "0.7rem",
  marginRight: "0.3rem",
  marginBottom: "0.2rem",
};

function formatCountdown(ms) {
  if (ms <= 0) return "已完成";
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}分 ${sec.toString().padStart(2, "0")}秒`;
  return `${sec}秒`;
}

function conditionColor(cond) {
  if (cond >= 70) return "#4caf50";
  if (cond >= 40) return "#ff9800";
  if (cond >= 10) return "#f44336";
  return "#888";
}

export default function ExpeditionPanel({ user, onRefresh }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // NPC 選取狀態：{ [npcId]: boolean }
  const [selectedNpcs, setSelectedNpcs] = useState({});
  // 武器分配：{ [npcId]: Set<weaponIndex> }
  const [npcWeapons, setNpcWeapons] = useState({});
  // 倒數計時
  const [countdown, setCountdown] = useState(0);
  // 冷卻倒數
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const isPaused = user.businessPaused;

  const fetchPreview = useCallback(async () => {
    try {
      const res = await fetch("/api/game/expedition", { credentials: "include" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setPreview(data);
        if (data.cooldownRemaining > 0) {
          setCooldownLeft(data.cooldownRemaining);
        }
      }
    } catch {
      setError("載入遠征資料失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  // 遠征倒數計時器
  useEffect(() => {
    const expedition = user.activeExpedition || preview?.activeExpedition;
    if (!expedition) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, expedition.endsAt - Date.now());
      setCountdown(remaining);
    }, 500);

    return () => clearInterval(timer);
  }, [user.activeExpedition, preview?.activeExpedition]);

  // 冷卻倒數
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = setInterval(() => {
      setCooldownLeft((prev) => {
        const next = prev - 1000;
        return next <= 0 ? 0 : next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownLeft]);

  const toggleNpc = useCallback((npcId) => {
    setSelectedNpcs((prev) => {
      const next = { ...prev };
      if (next[npcId]) {
        delete next[npcId];
        // 清除武器分配
        setNpcWeapons((wp) => {
          const newWp = { ...wp };
          delete newWp[npcId];
          return newWp;
        });
      } else {
        next[npcId] = true;
      }
      return next;
    });
  }, []);

  const toggleWeapon = useCallback((npcId, weaponIndex) => {
    setNpcWeapons((prev) => {
      const current = new Set(prev[npcId] || []);
      if (current.has(weaponIndex)) {
        current.delete(weaponIndex);
      } else {
        current.add(weaponIndex);
      }
      return { ...prev, [npcId]: current };
    });
  }, []);

  const handleStart = useCallback(async (dungeonId) => {
    setBusy(true);
    setError("");
    setMessage("");

    const npcWeaponMap = Object.keys(selectedNpcs)
      .filter((npcId) => selectedNpcs[npcId])
      .map((npcId) => ({
        npcId,
        weaponIndices: [...(npcWeapons[npcId] || [])],
      }));

    try {
      const res = await fetch("/api/game/expedition/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dungeonId, npcWeaponMap }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setMessage(data.message);
        setSelectedNpcs({});
        setNpcWeapons({});
        await fetchPreview();
        if (onRefresh) await onRefresh();
      }
    } catch {
      setError("啟動遠征失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }, [selectedNpcs, npcWeapons, fetchPreview, onRefresh]);

  const resolveLock = useRef(false);
  const handleResolve = useCallback(async () => {
    if (resolveLock.current) return;
    resolveLock.current = true;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/game/expedition/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (data.pending) {
        setMessage(data.message);
      } else {
        setResult(data);
        await fetchPreview();
        if (onRefresh) await onRefresh();
      }
    } catch {
      setError("結算遠征失敗");
    } finally {
      setBusy(false);
      resolveLock.current = false;
    }
  }, [fetchPreview, onRefresh]);

  if (loading) return <div style={EMPTY_STYLE}>載入遠征資料中...</div>;

  // 未解鎖
  if (preview && !preview.isUnlocked) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <h2>遠征</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          需要冒險等級 {preview.unlockLevel} 才能解鎖遠征功能。
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
          目前冒險等級：Lv.{preview.currentAdvLevel}
        </p>
      </div>
    );
  }

  const expedition = user.activeExpedition || preview?.activeExpedition;
  const npcs = (user.hiredNpcs || []).filter((n) => n.npcId && n.name);
  const weapons = user.weapons || [];

  // 收集所有已被其他 NPC 分配的武器 index（跨 NPC 不可重複）
  const allAssignedWeapons = new Set();
  for (const indices of Object.values(npcWeapons)) {
    for (const idx of indices) {
      allAssignedWeapons.add(idx);
    }
  }

  // 計算當前選取隊伍的預估戰力（前端概估）
  const selectedNpcList = npcs.filter((n) => selectedNpcs[n.npcId]);

  return (
    <div>
      {/* 反饋 */}
      {message && <div style={{ color: "#4ade80", marginBottom: "0.5rem", fontSize: "0.85rem" }}>{message}</div>}
      {error && <div className="error-msg" style={{ marginBottom: "0.5rem" }}>{error}</div>}

      {/* 結算結果 */}
      {result && <ExpeditionResult result={result} onClose={() => setResult(null)} />}

      {/* 進行中遠征 */}
      {expedition && !result && (
        <ActiveExpedition
          expedition={expedition}
          countdown={countdown}
          busy={busy}
          onResolve={handleResolve}
          isPaused={isPaused}
        />
      )}

      {/* 準備介面（無進行中遠征） */}
      {!expedition && !result && preview && (
        <>
          {/* 冷卻 */}
          {cooldownLeft > 0 && (
            <div style={{
              background: "#1a1a2e",
              border: "1px solid #6366f1",
              borderRadius: "6px",
              padding: "0.6rem 0.8rem",
              marginBottom: "0.8rem",
              textAlign: "center",
              fontSize: "0.85rem",
            }}>
              <span style={{ color: "#a5b4fc" }}>遠征冷卻中：</span>
              <span style={{ color: "var(--gold)", marginLeft: "0.3rem" }}>
                {formatCountdown(cooldownLeft)}
              </span>
            </div>
          )}

          {isPaused && (
            <div className="error-msg" style={{ marginBottom: "0.5rem" }}>
              店鋪暫停營業中，無法發起遠征。請先恢復營業。
            </div>
          )}

          {/* 迷宮選擇 */}
          <div className="card" style={CARD_STYLE}>
            <h2>遠征 — 選擇迷宮</h2>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              派遣 NPC 深入危險迷宮探索，獲取稀有素材。武器將大量消耗耐久，耐久歸零的武器將被永久銷毀。
            </div>
            {(preview.dungeons || []).map((d) => (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.5rem 0.7rem",
                  background: d.unlocked ? "#14532d22" : "#1a1a2e",
                  border: `1px solid ${d.unlocked ? "#22c55e55" : "#4b5563"}`,
                  borderRadius: "6px",
                  marginBottom: "0.4rem",
                  opacity: d.unlocked ? 1 : 0.5,
                }}
              >
                <div>
                  <strong>{d.name}</strong>
                  <span style={{ color: "var(--text-secondary)", marginLeft: "0.5rem", fontSize: "0.8rem" }}>
                    難度 {d.difficulty}
                  </span>
                  {!d.unlocked && (
                    <span style={{ color: "#f44336", marginLeft: "0.5rem", fontSize: "0.75rem" }}>
                      需攻略 {d.requiredFloor}F
                    </span>
                  )}
                </div>
                <button
                  className="btn-primary"
                  style={BTN_SMALL}
                  disabled={!d.unlocked || busy || cooldownLeft > 0 || selectedNpcList.length === 0 || isPaused}
                  onClick={() => handleStart(d.id)}
                >
                  {busy ? "出發中..." : "出發"}
                </button>
              </div>
            ))}
          </div>

          {/* NPC 選擇 + 武器分配 */}
          <div className="card" style={CARD_STYLE}>
            <h2>選擇隊伍</h2>
            {npcs.length === 0 ? (
              <div style={EMPTY_STYLE}>沒有可派遣的 NPC，請先前往酒館雇用冒險者。</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {npcs.map((npc) => {
                  const isSelected = !!selectedNpcs[npc.npcId];
                  const onMission = !!npc.mission;
                  const cond = npc.condition ?? 100;
                  const isLowCond = cond < 30;
                  const disabled = onMission || isLowCond;
                  const qualityColor = QUALITY_COLOR[npc.quality] || "#ccc";
                  const assignedWeapons = npcWeapons[npc.npcId] || new Set();

                  return (
                    <div
                      key={npc.npcId}
                      style={{
                        border: `1px solid ${isSelected ? qualityColor : "#4b5563"}`,
                        borderRadius: "6px",
                        padding: "0.5rem 0.7rem",
                        background: isSelected ? `${qualityColor}11` : "transparent",
                        opacity: disabled ? 0.5 : 1,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <label style={{ cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleNpc(npc.npcId)}
                              disabled={disabled}
                            />
                            <span style={{ color: qualityColor, fontWeight: "bold" }}>【{npc.quality}】</span>
                            <span style={{ fontWeight: "bold" }}>{npc.name}</span>
                            <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>LV.{npc.level}</span>
                          </label>
                        </div>
                        <div style={{ fontSize: "0.75rem" }}>
                          <span style={{ color: conditionColor(cond) }}>體力 {cond}%</span>
                          {onMission && <span style={{ color: "#f44336", marginLeft: "0.4rem" }}>任務中</span>}
                          {isLowCond && !onMission && <span style={{ color: "#f44336", marginLeft: "0.4rem" }}>體力不足</span>}
                        </div>
                      </div>

                      {/* 素質 */}
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                        HP:{npc.baseStats.hp} ATK:{npc.baseStats.atk} DEF:{npc.baseStats.def} AGI:{npc.baseStats.agi}
                      </div>

                      {/* 武器分配（選中後展開） */}
                      {isSelected && (
                        <div style={{ marginTop: "0.4rem" }}>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.2rem" }}>
                            攜帶武器（可多選）：
                          </div>
                          {weapons.length === 0 ? (
                            <div style={{ fontSize: "0.7rem", color: "#888" }}>背包沒有武器</div>
                          ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                              {weapons.map((w) => {
                                const isAssigned = assignedWeapons.has(w.index);
                                const assignedToOther = !isAssigned && allAssignedWeapons.has(w.index);
                                return (
                                  <label
                                    key={w.index}
                                    style={{
                                      ...TAG_STYLE,
                                      cursor: assignedToOther ? "default" : "pointer",
                                      background: isAssigned ? "#22c55e22" : "#1a1a2e",
                                      border: `1px solid ${isAssigned ? "#22c55e" : "#4b5563"}`,
                                      color: isAssigned ? "#86efac" : (assignedToOther ? "#555" : "#d4d4d8"),
                                      opacity: assignedToOther ? 0.4 : 1,
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isAssigned}
                                      onChange={() => toggleWeapon(npc.npcId, w.index)}
                                      disabled={assignedToOther}
                                      style={{ display: "none" }}
                                    />
                                    {w.rarityLabel && <span style={{ color: w.rarityColor }}>【{w.rarityLabel}】</span>}
                                    {w.weaponName}
                                    <span style={{ color: "var(--gold)", marginLeft: "0.2rem" }}>ATK:{w.atk}</span>
                                    <span style={{ color: w.durability <= 5 ? "#f44336" : "var(--text-secondary)", marginLeft: "0.2rem" }}>
                                      耐久:{w.durability}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 隊伍摘要 */}
            {selectedNpcList.length > 0 && (
              <div style={{
                marginTop: "0.6rem",
                padding: "0.4rem 0.6rem",
                background: "#1a1a2e",
                borderRadius: "4px",
                fontSize: "0.8rem",
              }}>
                <span style={{ color: "var(--text-secondary)" }}>選擇：</span>
                <span style={{ color: "var(--gold)" }}>{selectedNpcList.length} 位 NPC</span>
                <span style={{ color: "var(--text-secondary)", marginLeft: "0.4rem" }}>|</span>
                <span style={{ color: "#86efac", marginLeft: "0.4rem" }}>
                  {[...allAssignedWeapons].length} 把武器
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ActiveExpedition({ expedition, countdown, busy, onResolve, isPaused }) {
  const isDone = countdown <= 0;
  const progress = expedition.endsAt && expedition.startedAt
    ? Math.min(100, ((Date.now() - expedition.startedAt) / (expedition.endsAt - expedition.startedAt)) * 100)
    : 0;

  return (
    <div className="card" style={{ textAlign: "center" }}>
      <h2>遠征進行中</h2>
      <div style={{ fontSize: "1rem", fontWeight: "bold", color: "var(--gold)", margin: "0.5rem 0" }}>
        {expedition.dungeonName}
      </div>

      {/* 進度條 */}
      <div style={{
        height: "8px",
        background: "var(--card-bg)",
        borderRadius: "4px",
        overflow: "hidden",
        margin: "0.5rem 0",
      }}>
        <div style={{
          height: "100%",
          width: `${isDone ? 100 : progress}%`,
          background: isDone ? "#22c55e" : "#6366f1",
          transition: "width 0.5s linear",
        }} />
      </div>

      <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: isDone ? "#22c55e" : "#a5b4fc", margin: "0.3rem 0" }}>
        {isDone ? "遠征完成！" : formatCountdown(countdown)}
      </div>

      {/* 隊伍資訊 */}
      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
        戰力：{expedition.totalPower} ｜ 成功率：{expedition.successRate}%
        ｜ NPC {expedition.npcs.length} 人
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.3rem", marginTop: "0.4rem" }}>
        {(expedition.npcs || []).map((n) => (
          <span key={n.npcId} style={{
            ...TAG_STYLE,
            background: "#6366f122",
            border: "1px solid #6366f1",
            color: "#a5b4fc",
          }}>
            {n.npcName}
          </span>
        ))}
      </div>

      {isDone && (
        <button
          className="btn-success"
          disabled={busy || isPaused}
          onClick={onResolve}
          style={{ marginTop: "0.8rem", padding: "0.5rem 1.5rem" }}
        >
          {busy ? "結算中..." : "查看結果"}
        </button>
      )}
    </div>
  );
}

function ExpeditionResult({ result, onClose }) {
  const isSuccess = result.isSuccess;

  return (
    <div className="card" style={{
      border: `1px solid ${isSuccess ? "#22c55e" : "#ef4444"}`,
      background: isSuccess ? "#14532d22" : "#7f1d1d22",
    }}>
      <h2 style={{ color: isSuccess ? "#86efac" : "#fca5a5" }}>
        遠征{isSuccess ? "成功" : "失敗"} — {result.dungeonName}
      </h2>

      {/* 武器耐久 */}
      {result.durabilityDamage && result.durabilityDamage.length > 0 && (
        <div style={{ marginTop: "0.5rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.3rem" }}>武器消耗：</div>
          {result.durabilityDamage.map((d, i) => {
            const destroyed = result.weaponsDestroyed?.some((wd) => wd.weaponIndex === d.weaponIndex);
            return (
              <div key={i} style={{ fontSize: "0.8rem", marginBottom: "0.15rem" }}>
                <span>{d.weaponName}</span>
                <span style={{ color: "var(--text-secondary)", marginLeft: "0.3rem" }}>
                  耐久 {d.oldDurability} → {d.newDurability}（-{d.loss}）
                </span>
                {destroyed && (
                  <span style={{ color: "#ef4444", fontWeight: "bold", marginLeft: "0.3rem" }}>
                    已銷毀！
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* NPC 體力 */}
      {result.conditionChanges && result.conditionChanges.length > 0 && (
        <div style={{ marginTop: "0.5rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.3rem" }}>NPC 體力變化：</div>
          {result.conditionChanges.map((c, i) => {
            const died = result.npcsDied?.some((nd) => nd.npcId === c.npcId);
            return (
              <div key={i} style={{ fontSize: "0.8rem", marginBottom: "0.15rem" }}>
                <span>{c.npcName}</span>
                <span style={{ color: "var(--text-secondary)", marginLeft: "0.3rem" }}>
                  體力 {c.oldCondition}% → {c.newCondition}%（-{c.condLoss}%）
                </span>
                {died && (
                  <span style={{ color: "#ef4444", fontWeight: "bold", marginLeft: "0.3rem" }}>
                    犧牲了...
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 獎勵（成功時） */}
      {isSuccess && result.rewards && (
        <div style={{
          marginTop: "0.5rem",
          padding: "0.5rem",
          background: "#14532d33",
          borderRadius: "6px",
          border: "1px solid #22c55e44",
        }}>
          <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#86efac", marginBottom: "0.3rem" }}>獎勵：</div>

          {result.rewards.col > 0 && (
            <div style={{ fontSize: "0.8rem" }}>
              <span style={{ color: "var(--gold)" }}>{result.rewards.col} Col</span>
            </div>
          )}

          {(result.rewards.materials || []).map((m, i) => (
            <div key={i} style={{ fontSize: "0.8rem" }}>
              <span style={{ color: "#fbbf24" }}>{m.levelText}</span>
              <span style={{ marginLeft: "0.3rem" }}>{m.name}</span>
            </div>
          ))}

          {result.rewards.qualityUpgrade && (
            <div style={{ fontSize: "0.8rem", color: "#c084fc" }}>
              {result.rewards.qualityUpgrade.npcName} 品質提升！
              <span style={{ marginLeft: "0.3rem" }}>
                {result.rewards.qualityUpgrade.oldQuality} → {result.rewards.qualityUpgrade.newQuality}
              </span>
            </div>
          )}

          {result.rewards.relic && (
            <div style={{ fontSize: "0.8rem", color: "#fbbf24" }}>
              獲得聖遺物：{result.rewards.relic.nameCn}
            </div>
          )}
        </div>
      )}

      {/* 冒險經驗 */}
      {result.advExpGained > 0 && (
        <div style={{ fontSize: "0.8rem", color: "#93c5fd", marginTop: "0.3rem" }}>
          +{result.advExpGained} 冒險 EXP
          {result.advLevelUp && <span style={{ color: "#fbbf24", marginLeft: "0.3rem" }}>冒險等級 UP！→ Lv.{result.advNewLevel}</span>}
        </div>
      )}

      <button
        onClick={onClose}
        style={{ marginTop: "0.6rem", padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}
      >
        關閉
      </button>
    </div>
  );
}
