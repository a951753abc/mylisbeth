import React, { useState, useEffect, useRef } from "react";
import { QUALITY_COLOR } from "../constants/npcQuality.js";
import ProficiencyBar from "./ProficiencyBar.jsx";

function conditionColor(cond) {
  if (cond >= 70) return "#4caf50";
  if (cond >= 40) return "#ff9800";
  if (cond >= 10) return "#f44336";
  return "#888";
}

function formatCountdown(ms) {
  if (ms <= 0) return "已完成";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}分 ${sec}秒`;
}

const FORGET_COST = { 1: 100, 2: 300, 3: 500 };

const WEAPON_TYPE_NAMES = {
  one_handed_sword: "單手劍",
  two_handed_sword: "雙手劍",
  two_handed_axe: "雙手斧",
  mace: "單手棍",
  katana: "刀",
  curved_sword: "彎刀",
  rapier: "細劍",
  dagger: "短劍",
  spear: "槍",
  bow: "弓",
  shield: "大盾",
};

export default function NpcPanel({ user, onRefresh }) {
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState("");
  const [missionPicker, setMissionPicker] = useState(null); // npcId showing picker
  const [missionTypes, setMissionTypes] = useState([]);
  const [missionResults, setMissionResults] = useState([]);
  const [countdowns, setCountdowns] = useState({});
  const [concurrentLimit, setConcurrentLimit] = useState(2);
  const [trainingLimit, setTrainingLimit] = useState(2);
  const [skillMap, setSkillMap] = useState({});
  const [trainingPicker, setTrainingPicker] = useState(null);
  const [trainingTypes, setTrainingTypes] = useState([]);
  const [forgetConfirm, setForgetConfirm] = useState(null); // { npcId, npcName, skillId, skillName, cost }

  // 過濾幽靈 NPC（死亡後因競態條件殘留的不完整條目）
  const npcs = (user.hiredNpcs || []).filter((n) => n.npcId && n.name);
  const weapons = user.weapons || [];

  // 讀取技能定義（建立 ID→技能 查詢表）
  useEffect(() => {
    fetch("/api/skill/definitions", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        const map = {};
        (data.skills || []).forEach((s) => { map[s.id] = s; });
        setSkillMap(map);
      })
      .catch(() => {});
  }, []);
  const isPaused = user.businessPaused;

  // 倒計時更新
  useEffect(() => {
    const npcsOnMission = npcs.filter((n) => n.mission);
    if (npcsOnMission.length === 0) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const cd = {};
      npcsOnMission.forEach((npc) => {
        cd[npc.npcId] = Math.max(0, npc.mission.endsAt - now);
      });
      setCountdowns(cd);
    }, 1000);

    return () => clearInterval(timer);
  }, [npcs]);

  const doAction = async (url, body, successMsg) => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(`❌ ${data.error}`);
      } else {
        setMessage(successMsg);
        if (onRefresh) onRefresh();
      }
      return data;
    } catch {
      setMessage("❌ 操作失敗，請稍後再試");
      return { error: true };
    }
  };

  const handleFire = async (npcId, npcName) => {
    if (!confirm(`確定要解雇 ${npcName} 嗎？`)) return;
    setBusy(`fire_${npcId}`);
    await doAction("/api/npc/fire", { npcId }, `✅ ${npcName} 已解雇`);
    setBusy(null);
  };

  const handleHeal = async (npcId, healType) => {
    setBusy(`heal_${npcId}_${healType}`);
    const cost = healType === "full" ? 200 : 50;
    await doAction("/api/npc/heal", { npcId, healType }, `✅ 治療完成（花費 ${cost} Col）`);
    setBusy(null);
  };

  const handleEquip = async (npcId, weaponIndex) => {
    setBusy(`equip_${npcId}`);
    const idx = weaponIndex === "" ? null : parseInt(weaponIndex, 10);
    await doAction("/api/npc/equip", { npcId, weaponIndex: idx }, "✅ 裝備更新完成");
    setBusy(null);
  };

  const handleForgetSkill = async () => {
    if (!forgetConfirm) return;
    const { npcId, skillId, skillName, cost } = forgetConfirm;
    setBusy(`forget_${npcId}_${skillId}`);
    setForgetConfirm(null);
    await doAction(
      "/api/npc/skill/forget",
      { npcId, skillId },
      `✅ 已遺忘「${skillName}」（花費 ${cost} Col）`,
    );
    setBusy(null);
  };

  const openMissionPicker = async (npcId) => {
    setMissionPicker(npcId);
    setTrainingPicker(null);
    setMissionTypes([]);
    try {
      const res = await fetch(`/api/npc/mission/types?npcId=${npcId}`, { credentials: "include" });
      const data = await res.json();
      setMissionTypes(data.missions || []);
      if (data.concurrentLimit != null) setConcurrentLimit(data.concurrentLimit);
    } catch {
      setMessage("❌ 無法載入任務列表");
    }
  };

  const handleStartMission = async (npcId, missionType) => {
    setBusy(`mission_${npcId}`);
    await doAction("/api/npc/mission/start", { npcId, missionType }, "✅ 任務已派遣");
    setMissionPicker(null);
    setBusy(null);
  };

  const openTrainingPicker = async (npcId) => {
    setTrainingPicker(npcId);
    setMissionPicker(null);
    setTrainingTypes([]);
    try {
      const res = await fetch(`/api/npc/training/types?npcId=${npcId}`, { credentials: "include" });
      const data = await res.json();
      setTrainingTypes(data.trainings || []);
      if (data.trainingLimit != null) setTrainingLimit(data.trainingLimit);
    } catch {
      setMessage("❌ 無法載入修練列表");
    }
  };

  const handleStartTraining = async (npcId, trainingType) => {
    setBusy(`training_${npcId}`);
    await doAction("/api/npc/training/start", { npcId, trainingType }, "✅ 修練已開始");
    setTrainingPicker(null);
    setBusy(null);
  };

  const checkMissionsLock = useRef(false);
  const handleCheckMissions = async () => {
    if (checkMissionsLock.current) return; // 防重複點擊（同步互斥鎖）
    checkMissionsLock.current = true;
    setBusy("check_missions");
    try {
      const res = await fetch("/api/npc/mission/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`❌ ${data.error || "結算失敗"}`);
      } else if (data.results && data.results.length > 0) {
        setMissionResults(data.results);
        if (onRefresh) onRefresh();
      } else {
        setMessage("目前沒有已完成的任務");
        if (onRefresh) onRefresh();
      }
    } catch {
      setMessage("❌ 結算失敗");
    }
    setBusy(null);
    checkMissionsLock.current = false;
  };

  if (npcs.length === 0) {
    return (
      <div className="card">
        <h2>我的冒險者</h2>
        <div style={{ color: "var(--text-secondary)" }}>
          目前隊伍為空，前往「酒館」雇用冒險者吧！
        </div>
      </div>
    );
  }

  const activeMissionCount = npcs.filter((n) => n.mission && !n.mission.isTraining).length;
  const activeTrainingCount = npcs.filter((n) => n.mission?.isTraining).length;
  const missionsFull = activeMissionCount >= concurrentLimit;
  const trainingFull = activeTrainingCount >= trainingLimit;

  const hasCompletedMissions = npcs.some(
    (n) => n.mission && Date.now() >= n.mission.endsAt,
  );

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>我的冒險者</h2>
        {hasCompletedMissions && (
          <button
            className="btn-success"
            style={{ fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}
            disabled={busy === "check_missions" || isPaused}
            onClick={handleCheckMissions}
          >
            {busy === "check_missions" ? "結算中..." : "結算任務"}
          </button>
        )}
      </div>

      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
        任務：
        <span style={{ color: missionsFull ? "#f44336" : "var(--gold)" }}>
          {activeMissionCount}/{concurrentLimit}
        </span>
        {missionsFull && <span style={{ color: "#f44336" }}>（已滿）</span>}
        <span style={{ margin: "0 0.4rem" }}>|</span>
        修練：
        <span style={{ color: trainingFull ? "#f44336" : "#a5b4fc" }}>
          {activeTrainingCount}/{trainingLimit}
        </span>
        {trainingFull && <span style={{ color: "#f44336" }}>（已滿）</span>}
      </div>

      {isPaused && (
        <div className="error-msg" style={{ marginBottom: "0.5rem" }}>
          店鋪暫停營業中，無法進行 NPC 相關操作。請先恢復營業。
        </div>
      )}

      {message && (
        <div className={message.startsWith("❌") ? "error-msg" : ""} style={{ marginBottom: "0.5rem" }}>
          {message}
        </div>
      )}

      {/* 任務結算結果 */}
      {missionResults.length > 0 && (
        <div style={{ marginBottom: "0.8rem" }}>
          {missionResults.map((r, i) => (
            <div
              key={i}
              style={{
                background: r.isTraining ? "#1e1b4b33" : (r.success ? "#14532d33" : "#7f1d1d33"),
                border: `1px solid ${r.isTraining ? "#818cf8" : (r.success ? "#22c55e" : "#ef4444")}`,
                borderRadius: "6px",
                padding: "0.5rem 0.7rem",
                marginBottom: "0.3rem",
                fontSize: "0.85rem",
              }}
            >
              {r.isTraining ? (
                <>
                  <strong>{r.npcName}</strong> — {r.trainingName}：
                  <span style={{ color: "#a5b4fc" }}>修練完成！</span>
                  {r.profResult && (
                    <span style={{ color: "var(--gold)", marginLeft: "0.4rem" }}>
                      熟練度 +{r.profResult.profGained}
                    </span>
                  )}
                  {r.skillResult?.learned && (
                    <span style={{ color: "#c084fc", marginLeft: "0.4rem" }}>
                      學會新技能「{r.skillResult.skillName}」！
                    </span>
                  )}
                  {r.expGained > 0 && (
                    <span style={{ color: "#93c5fd", marginLeft: "0.4rem", fontSize: "0.8rem" }}>
                      EXP +{r.expGained}
                      {r.levelUp && ` LV UP! → LV ${r.newLevel}`}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <strong>{r.npcName}</strong> — {r.missionName}：
                  {r.success ? (
                    <span style={{ color: "#86efac" }}>
                      成功！獲得 {r.reward} Col（手續費 {r.commission} Col）
                    </span>
                  ) : r.died ? (
                    <span style={{ color: "#fca5a5" }}>失敗...{r.npcName} 在任務中犧牲了</span>
                  ) : (
                    <span style={{ color: "#fca5a5" }}>失敗，體力 -{r.condLoss}%</span>
                  )}
                  {r.advExpGained > 0 && (
                    <span style={{ color: "#93c5fd", marginLeft: "0.4rem", fontSize: "0.8rem" }}>
                      +{r.advExpGained} 冒險EXP
                      {r.advLevelUp && ` LV UP! → LV ${r.advNewLevel}`}
                    </span>
                  )}
                </>
              )}
            </div>
          ))}
          <button
            style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", marginTop: "0.3rem" }}
            onClick={() => setMissionResults([])}
          >
            關閉
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
        {npcs.map((npc) => {
          const qualityColor = QUALITY_COLOR[npc.quality] || "#ccc";
          const cond = npc.condition ?? 100;
          const equippedWeapon = npc.equippedWeaponIndex != null
            ? weapons.find((w) => String(w.index) === String(npc.equippedWeaponIndex))
            : null;
          // 其他 NPC 已裝備的武器 index 集合
          const equippedByOthers = new Set(
            npcs.filter((n) => n.npcId !== npc.npcId && n.equippedWeaponIndex != null)
              .map((n) => String(n.equippedWeaponIndex)),
          );
          const onMission = !!npc.mission;
          const missionDone = onMission && Date.now() >= npc.mission.endsAt;
          const cdMs = countdowns[npc.npcId] || (onMission ? Math.max(0, npc.mission.endsAt - Date.now()) : 0);

          return (
            <div
              key={npc.npcId}
              style={{
                border: `1px solid ${qualityColor}`,
                borderRadius: "6px",
                padding: "0.7rem 0.9rem",
                boxShadow: `0 0 6px ${qualityColor}22`,
                opacity: onMission && !missionDone ? 0.85 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.3rem" }}>
                <div>
                  <span style={{ color: qualityColor, fontWeight: "bold" }}>【{npc.quality}】</span>
                  <span style={{ fontWeight: "bold", marginLeft: "0.3rem" }}>{npc.name}</span>
                  <span style={{ color: "var(--text-secondary)", marginLeft: "0.4rem", fontSize: "0.8rem" }}>
                    LV.{npc.level}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  <button
                    className="btn-primary"
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                    disabled={busy === `heal_${npc.npcId}_quick` || cond >= 100 || onMission || isPaused}
                    onClick={() => handleHeal(npc.npcId, "quick")}
                  >
                    快速治療 (50 Col)
                  </button>
                  <button
                    className="btn-success"
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                    disabled={busy === `heal_${npc.npcId}_full` || cond >= 100 || onMission || isPaused}
                    onClick={() => handleHeal(npc.npcId, "full")}
                  >
                    完全治療 (200 Col)
                  </button>
                  <button
                    className="btn-danger"
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                    disabled={busy === `fire_${npc.npcId}` || onMission || isPaused}
                    onClick={() => handleFire(npc.npcId, npc.name)}
                  >
                    解雇
                  </button>
                </div>
              </div>

              {/* 任務/修練狀態 */}
              {onMission && (
                <div
                  style={{
                    marginTop: "0.4rem",
                    padding: "0.4rem 0.6rem",
                    borderRadius: "4px",
                    background: missionDone ? "#14532d33" : (npc.mission.isTraining ? "#1e1b4b33" : "#1a1a2e"),
                    border: `1px solid ${missionDone ? "#22c55e" : (npc.mission.isTraining ? "#818cf8" : "#4b5563")}`,
                    fontSize: "0.8rem",
                  }}
                >
                  {missionDone ? (
                    <span style={{ color: "#86efac" }}>
                      {npc.mission.isTraining ? "修練" : "任務"}：{npc.mission.name} — 已完成！請按「結算任務」查看結果
                    </span>
                  ) : (
                    <span style={{ color: npc.mission.isTraining ? "#a5b4fc" : "#d4d4d8" }}>
                      {npc.mission.isTraining ? "修練中" : "任務"}：{npc.mission.name} — 剩餘 {formatCountdown(cdMs)}
                    </span>
                  )}
                </div>
              )}

              {/* 體力條 */}
              <div style={{ marginTop: "0.4rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.15rem" }}>
                  體力：{cond}%
                  {cond < 10 && <span style={{ color: "#f44336", marginLeft: "0.4rem" }}>無法出戰</span>}
                  {cond >= 10 && cond < 40 && <span style={{ color: "#ff9800", marginLeft: "0.4rem" }}>體力虛弱（素質x0.4）</span>}
                  {cond >= 40 && cond < 70 && <span style={{ color: "#ff9800", marginLeft: "0.4rem" }}>體力不足（素質x0.7）</span>}
                </div>
                <div style={{ height: "6px", background: "var(--card-bg)", borderRadius: "3px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${cond}%`,
                      background: conditionColor(cond),
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>

              {/* 素質 */}
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
                HP:{npc.baseStats.hp} ATK:{npc.baseStats.atk} DEF:{npc.baseStats.def} AGI:{npc.baseStats.agi}
                ｜月薪：{npc.monthlyCost || npc.weeklyCost} Col
              </div>

              {/* 裝備武器選擇（任務中停用） */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.4rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>裝備武器：</span>
                <select
                  style={{ fontSize: "0.75rem" }}
                  value={npc.equippedWeaponIndex != null ? String(npc.equippedWeaponIndex) : ""}
                  onChange={(e) => handleEquip(npc.npcId, e.target.value)}
                  disabled={busy === `equip_${npc.npcId}` || onMission || isPaused}
                >
                  <option value="">— 無裝備 —</option>
                  {weapons.map((w) => {
                    const inUse = equippedByOthers.has(String(w.index));
                    return (
                      <option key={w.index} value={String(w.index)} disabled={inUse}>
                        #{w.index} {w.rarityLabel ? `【${w.rarityLabel}】` : ""}{w.weaponName}{inUse ? "（已裝備）" : ""}
                      </option>
                    );
                  })}
                </select>
                {equippedWeapon && (
                  <span style={{ fontSize: "0.75rem", color: "var(--gold)" }}>
                    ATK:{equippedWeapon.atk} 耐久:{equippedWeapon.durability}
                  </span>
                )}
              </div>

              {/* 武器熟練度 + 劍技 */}
              <div style={{ marginTop: "0.4rem" }}>
                {/* 熟練度進度條 */}
                {(() => {
                  const profMap = npc.weaponProficiency || {};
                  const profEntries = Object.entries(profMap).filter(([, v]) => v > 0);
                  if (profEntries.length === 0) {
                    return (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                        武器熟練度：尚無紀錄
                      </div>
                    );
                  }
                  return profEntries.map(([wType, val]) => (
                    <ProficiencyBar
                      key={wType}
                      label={`${WEAPON_TYPE_NAMES[wType] || wType} 熟練度`}
                      value={val}
                      max={1000}
                    />
                  ));
                })()}

                {/* 劍技列表 */}
                {(npc.learnedSkills || []).length > 0 || (npc.equippedSkills || []).length > 0 ? (
                  <>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.2rem" }}>
                      劍技（已學 {(npc.learnedSkills || []).length}，裝備 {(npc.equippedSkills || []).length}）
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                      {(npc.equippedSkills || []).map((es, idx) => {
                        const skillId = typeof es === "string" ? es : es.skillId;
                        const def = skillMap[skillId];
                        const mods = typeof es === "object" && es.mods ? es.mods : [];
                        const cost = FORGET_COST[def?.tier] || FORGET_COST[1];
                        return (
                          <span
                            key={`${skillId}_${idx}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.2rem",
                              padding: "0.15rem 0.4rem",
                              fontSize: "0.7rem",
                              background: `${def?.color || "#a855f7"}22`,
                              border: `1px solid ${def?.color || "#a855f7"}`,
                              borderRadius: "3px",
                              color: def?.color || "#a855f7",
                            }}
                            title={def ? `${def.nameJp} — ${def.description}` : skillId}
                          >
                            {def ? def.nameCn : skillId}
                            {mods.length > 0 && ` +${mods.length}`}
                            {!onMission && (
                              <button
                                onClick={() => setForgetConfirm({
                                  npcId: npc.npcId, npcName: npc.name,
                                  skillId, skillName: def?.nameCn || skillId, cost,
                                })}
                                style={{
                                  background: "none", border: "none", cursor: "pointer",
                                  color: "#888", fontSize: "0.65rem", padding: "0 0.1rem",
                                  lineHeight: 1,
                                }}
                                title={`遺忘此技能（${cost} Col）`}
                              >
                                x
                              </button>
                            )}
                          </span>
                        );
                      })}
                      {(() => {
                        const equippedSet = new Set((npc.equippedSkills || []).map(
                          (es) => typeof es === "string" ? es : es.skillId,
                        ));
                        return (npc.learnedSkills || [])
                          .filter((s) => !equippedSet.has(s))
                          .map((skillId, idx) => {
                            const def = skillMap[skillId];
                            const cost = FORGET_COST[def?.tier] || FORGET_COST[1];
                            return (
                              <span
                                key={`unequip_${skillId}_${idx}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.2rem",
                                  padding: "0.15rem 0.4rem",
                                  fontSize: "0.7rem",
                                  background: "rgba(100, 100, 100, 0.15)",
                                  border: "1px dashed #666",
                                  borderRadius: "3px",
                                  color: "#888",
                                }}
                                title={def ? `${def.nameJp}（未裝備）` : `${skillId}（未裝備）`}
                              >
                                {def ? def.nameCn : skillId}
                                {!onMission && (
                                  <button
                                    onClick={() => setForgetConfirm({
                                      npcId: npc.npcId, npcName: npc.name,
                                      skillId, skillName: def?.nameCn || skillId, cost,
                                    })}
                                    style={{
                                      background: "none", border: "none", cursor: "pointer",
                                      color: "#888", fontSize: "0.65rem", padding: "0 0.1rem",
                                      lineHeight: 1,
                                    }}
                                    title={`遺忘此技能（${cost} Col）`}
                                  >
                                    x
                                  </button>
                                )}
                              </span>
                            );
                          });
                      })()}
                    </div>

                    {/* 遺忘確認面板 */}
                    {forgetConfirm && forgetConfirm.npcId === npc.npcId && (
                      <div style={{
                        marginTop: "0.4rem",
                        padding: "0.4rem 0.6rem",
                        background: "#7f1d1d22",
                        border: "1px solid #ef444466",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                      }}>
                        <span>確定讓 {forgetConfirm.npcName} 遺忘「{forgetConfirm.skillName}」？</span>
                        <span style={{ color: "var(--gold)", marginLeft: "0.3rem" }}>
                          花費 {forgetConfirm.cost} Col
                        </span>
                        <div style={{ marginTop: "0.3rem", display: "flex", gap: "0.4rem" }}>
                          <button
                            className="btn-danger"
                            style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem" }}
                            disabled={busy === `forget_${forgetConfirm.npcId}_${forgetConfirm.skillId}`}
                            onClick={handleForgetSkill}
                          >
                            確認遺忘
                          </button>
                          <button
                            style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem" }}
                            onClick={() => setForgetConfirm(null)}
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                    {Object.keys(npc.weaponProficiency || {}).length === 0
                      ? "裝備武器後派遣冒險或進行修練，即可累積武器熟練度並學習劍技"
                      : "尚未學會任何劍技。累積熟練度後有機會在戰鬥中自動學會"
                    }
                  </div>
                )}
              </div>

              {/* 派遣任務/修練按鈕（不在任務中時顯示） */}
              {!onMission && (
                <div style={{ marginTop: "0.5rem" }}>
                  {missionPicker === npc.npcId ? (
                    <div style={{
                      background: "#1a1a2e",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      padding: "0.5rem",
                    }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.4rem" }}>
                        選擇任務：
                      </div>
                      {missionTypes.length === 0 ? (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>載入中...</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                          {missionTypes.map((m) => (
                            <div
                              key={m.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "0.4rem 0.5rem",
                                background: "var(--card-bg)",
                                borderRadius: "4px",
                                fontSize: "0.8rem",
                              }}
                            >
                              <div>
                                <strong>{m.name}</strong>
                                <span style={{ color: "var(--text-secondary)", marginLeft: "0.4rem" }}>
                                  {m.durationMinutes}分
                                </span>
                                <br />
                                <span style={{ fontSize: "0.75rem" }}>
                                  <span style={{ color: "var(--gold)" }}>{m.reward} Col</span>
                                  {" | "}成功率 <span style={{ color: m.successRate >= 80 ? "#4caf50" : m.successRate >= 70 ? "#ff9800" : "#f44336" }}>{m.successRate}%</span>
                                  {" | "}體力 -{m.condCost}%
                                  {" | "}失敗死亡 {m.deathChance}%
                                </span>
                              </div>
                              <button
                                className="btn-primary"
                                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", whiteSpace: "nowrap" }}
                                disabled={busy === `mission_${npc.npcId}` || cond < 10 || isPaused || missionsFull}
                                onClick={() => handleStartMission(npc.npcId, m.id)}
                              >
                                派遣
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", marginTop: "0.4rem" }}
                        onClick={() => setMissionPicker(null)}
                      >
                        取消
                      </button>
                    </div>
                  ) : trainingPicker === npc.npcId ? (
                    <div style={{
                      background: "#1e1b4b22",
                      border: "1px solid #818cf8",
                      borderRadius: "6px",
                      padding: "0.5rem",
                    }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.4rem", color: "#a5b4fc" }}>
                        選擇修練：
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                        無死亡風險 | 無 Col 收益 | 需裝備武器
                      </div>
                      {trainingTypes.length === 0 ? (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>載入中...</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                          {trainingTypes.map((t) => (
                            <div
                              key={t.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "0.4rem 0.5rem",
                                background: "var(--card-bg)",
                                borderRadius: "4px",
                                fontSize: "0.8rem",
                                opacity: !t.hasWeapon || (t.atProfCap && t.atLevelCap) ? 0.5 : 1,
                              }}
                            >
                              <div>
                                <strong>{t.name}</strong>
                                <span style={{ color: "var(--text-secondary)", marginLeft: "0.4rem" }}>
                                  {t.durationMinutes}分
                                </span>
                                <br />
                                <span style={{ fontSize: "0.75rem" }}>
                                  <span style={{ color: t.atProfCap ? "#f44336" : "#a5b4fc" }}>
                                    熟練度 {t.atProfCap ? `已滿 (${t.profCap})` : `+${t.profGain}`}
                                  </span>
                                  {" | "}學技 <span style={{ color: t.atProfCap ? "#888" : "#c084fc" }}>{t.atProfCap ? "—" : `${t.learnChance}%`}</span>
                                  {" | "}<span style={{ color: t.atLevelCap ? "#f44336" : undefined }}>
                                    EXP {t.atLevelCap ? `已滿 (Lv${t.levelCap})` : `+${t.expReward}`}
                                  </span>
                                  {" | "}體力 -{t.condCost}%
                                </span>
                                {!t.hasWeapon && (
                                  <span style={{ color: "#f44336", fontSize: "0.7rem", marginLeft: "0.3rem" }}>
                                    需裝備武器
                                  </span>
                                )}
                                {t.atProfCap && t.atLevelCap && (
                                  <span style={{ color: "#f44336", fontSize: "0.7rem", marginLeft: "0.3rem" }}>
                                    已達修練上限
                                  </span>
                                )}
                              </div>
                              <button
                                className="btn-primary"
                                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", whiteSpace: "nowrap" }}
                                disabled={!t.hasWeapon || busy === `training_${npc.npcId}` || cond < 10 || isPaused || trainingFull || (t.atProfCap && t.atLevelCap)}
                                onClick={() => handleStartTraining(npc.npcId, t.id)}
                              >
                                修練
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", marginTop: "0.4rem" }}
                        onClick={() => setTrainingPicker(null)}
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        className="btn-primary"
                        style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}
                        disabled={cond < 10 || isPaused || missionsFull}
                        onClick={() => openMissionPicker(npc.npcId)}
                      >
                        {missionsFull ? "派遣已滿" : "派遣任務"}
                      </button>
                      <button
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.2rem 0.6rem",
                          background: "#4338ca",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                        disabled={cond < 10 || isPaused || trainingFull || !equippedWeapon}
                        onClick={() => openTrainingPicker(npc.npcId)}
                        title={!equippedWeapon ? "需裝備武器" : ""}
                      >
                        {trainingFull ? "修練已滿" : "自主修練"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
