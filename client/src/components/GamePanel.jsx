import React, { useState, useMemo } from "react";
import ForgeAnimation from "./ForgeAnimation.jsx";
import NarrativeDisplay from "./NarrativeDisplay.jsx";
import RandomEventDisplay from "./RandomEventDisplay.jsx";
import { useStaminaTimer, formatCountdown } from "../hooks/useStaminaTimer.js";

export default function GamePanel({ user, onAction, setCooldown, onUserUpdate }) {
  const [result, setResult] = useState(null);
  const [forgeResult, setForgeResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [localStamina, setLocalStamina] = useState(null);
  const [localLastRegenAt, setLocalLastRegenAt] = useState(null);

  // Forge state
  const [forgeMat1, setForgeMat1] = useState("");
  const [forgeMat2, setForgeMat2] = useState("");
  const [forgeWeaponName, setForgeWeaponName] = useState("");

  // Upgrade state
  const [upWeapon, setUpWeapon] = useState("");
  const [upMat, setUpMat] = useState("");

  // Repair state
  const [repairWeapon, setRepairWeapon] = useState("");
  const [repairMat, setRepairMat] = useState("");

  // Adventure state
  const [advWeapon, setAdvWeapon] = useState("");
  const [advNpc, setAdvNpc] = useState("");

  // Solo adventure state
  const [soloWeapon, setSoloWeapon] = useState("");
  const [soloConfirm, setSoloConfirm] = useState(false);

  // Defense weapon state
  const [defenseWeapon, setDefenseWeapon] = useState(user.defenseWeaponIndex ?? 0);
  const [defenseMsg, setDefenseMsg] = useState("");

  // Forge: items available for mat1 (exclude mat2 selection if quantity insufficient)
  const availableForMat1 = useMemo(() => {
    return (user.items || []).filter((item) => {
      if (item.num <= 0) return false;
      if (String(item.index) === forgeMat2 && item.num < 2) return false;
      return true;
    });
  }, [user.items, forgeMat2]);

  // Forge: items available for mat2 (exclude mat1 selection if quantity insufficient)
  const availableForMat2 = useMemo(() => {
    return (user.items || []).filter((item) => {
      if (item.num <= 0) return false;
      if (String(item.index) === forgeMat1 && item.num < 2) return false;
      return true;
    });
  }, [user.items, forgeMat1]);

  const handleMat1Change = (newVal) => {
    setForgeMat1(newVal);
    if (newVal && newVal === forgeMat2) {
      const item = (user.items || []).find((i) => String(i.index) === newVal);
      if (item && item.num < 2) setForgeMat2("");
    }
  };

  const handleMat2Change = (newVal) => {
    setForgeMat2(newVal);
    if (newVal && newVal === forgeMat1) {
      const item = (user.items || []).find((i) => String(i.index) === newVal);
      if (item && item.num < 2) setForgeMat1("");
    }
  };

  const maxStamina = user.maxStamina ?? 100;

  // 體力倒數計時器 Hook（每秒更新）
  const { displayStamina, secondsToNext, secondsToFull, isFull } = useStaminaTimer({
    stamina: user.stamina,
    maxStamina,
    lastStaminaRegenAt: user.lastStaminaRegenAt,
    localStamina,
    localLastRegenAt,
  });

  const staminaRatio = displayStamina / maxStamina;

  const doAction = async (action, body = {}) => {
    setBusy(true);
    setError("");
    setResult(null);
    const data = await onAction(action, body);
    if (data.error) {
      setError(data.error);
      if (data.cooldown) setCooldown(data.cooldown);
    } else if (action === "forge" && data.weapon) {
      // Show forge animation overlay instead of immediate result
      setForgeResult(data);
      if (data.stamina !== undefined) setLocalStamina(data.stamina);
      if (data.lastStaminaRegenAt !== undefined) setLocalLastRegenAt(data.lastStaminaRegenAt);
    } else {
      setResult(data);
      if (data.stamina !== undefined) setLocalStamina(data.stamina);
      if (data.lastStaminaRegenAt !== undefined) setLocalLastRegenAt(data.lastStaminaRegenAt);
    }
    setBusy(false);
  };

  return (
    <div>
      {/* Forge animation overlay */}
      {forgeResult && (
        <ForgeAnimation
          weapon={forgeResult.weapon}
          forgeText={forgeResult.text}
          onComplete={() => {
            setResult(forgeResult);
            setForgeResult(null);
          }}
        />
      )}

      {error && <div className="error-msg">{error}</div>}

      {/* Stats */}
      <div className="card">
        <h2>角色資訊</h2>
        <div className="stat-grid">
          <div className="stat-item">
            <div className="label">挖礦等級</div>
            <div className="value">Lv.{user.mineLevel}{user.mineLevel < 3 ? ` (${user.mineExp || 0}/${user.mineLevel === 1 ? 150 : 200})` : " MAX"}</div>
          </div>
          <div className="stat-item">
            <div className="label">鍛造等級</div>
            <div className="value">Lv.{user.forgeLevel}{user.forgeLevel < 3 ? ` (${user.forgeExp || 0}/500)` : " MAX"}</div>
          </div>
          <div className="stat-item">
            <div className="label">死亡次數</div>
            <div className="value">{user.lost}</div>
          </div>
          <div className="stat-item">
            <div className="label">Col</div>
            <div className="value" style={{ color: "var(--gold)" }}>
              {(user.col || 0).toLocaleString()}
            </div>
          </div>
          <div className="stat-item">
            <div className="label">樓層</div>
            <div className="value">{user.currentFloor || 1} F</div>
          </div>
          <div className="stat-item">
            <div className="label">稱號</div>
            <div
              className="value"
              style={{ fontSize: "0.75rem", color: "var(--warning)" }}
            >
              {user.title || "—"}
            </div>
          </div>
        </div>
        {/* 體力值 */}
        <div style={{ marginTop: "0.6rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>體力</span>
            <span style={{
              color: staminaRatio <= 0.2 ? "#f87171" : staminaRatio <= 0.5 ? "#fbbf24" : "#4ade80",
              fontWeight: "600",
            }}>
              {displayStamina} / {maxStamina}
            </span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
            <div style={{
              width: `${Math.max(0, staminaRatio * 100)}%`,
              height: "100%",
              background: staminaRatio <= 0.2 ? "#f87171" : staminaRatio <= 0.5 ? "#fbbf24" : "#4ade80",
              transition: "width 0.3s ease",
              borderRadius: "4px",
            }} />
          </div>
          {/* 體力倒數計時器 */}
          {isFull ? (
            <div className="stamina-full-badge">已滿</div>
          ) : (
            <div className="stamina-countdown">
              <span>下一點：{formatCountdown(secondsToNext)}</span>
              <span>完全回復：{formatCountdown(secondsToFull)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Mine */}
      <div className="card">
        <h2>挖礦</h2>
        <button
          className="btn-primary"
          disabled={busy || displayStamina < 1}
          onClick={() => doAction("mine")}
        >
          {busy ? "挖礦中..." : "開始挖礦"}
        </button>
        <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
          消耗體力：1～6 點
          {displayStamina < 1 && <span style={{ color: "#f87171", marginLeft: "0.4rem" }}>體力不足！</span>}
        </div>
      </div>

      {/* Forge */}
      <div className="card">
        <h2>鍛造武器</h2>
        {user.isInDebt && (
          <div className="error-msg" style={{ marginBottom: "0.4rem" }}>
            ⚠️ 負債中，鍛造功能已鎖定！請先至「帳單」tab 還清負債。
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            marginBottom: "0.5rem",
          }}
        >
          <select
            value={forgeMat1}
            onChange={(e) => handleMat1Change(e.target.value)}
          >
            <option value="">— 素材1 —</option>
            {availableForMat1.map((item) => {
              const displayNum =
                String(item.index) === forgeMat2 ? item.num - 1 : item.num;
              return (
                <option key={item.index} value={String(item.index)}>
                  #{item.index} [{item.levelText}] {item.name} x{displayNum}
                </option>
              );
            })}
          </select>
          <select
            value={forgeMat2}
            onChange={(e) => handleMat2Change(e.target.value)}
          >
            <option value="">— 素材2 —</option>
            {availableForMat2.map((item) => {
              const displayNum =
                String(item.index) === forgeMat1 ? item.num - 1 : item.num;
              return (
                <option key={item.index} value={String(item.index)}>
                  #{item.index} [{item.levelText}] {item.name} x{displayNum}
                </option>
              );
            })}
          </select>
          <input
            type="text"
            placeholder="武器名稱"
            value={forgeWeaponName}
            onChange={(e) => setForgeWeaponName(e.target.value)}
            style={{ width: "120px" }}
          />
          <button
            className="btn-warning"
            disabled={busy || !forgeMat1 || !forgeMat2 || !forgeWeaponName || displayStamina < 3}
            onClick={() =>
              doAction("forge", {
                material1: forgeMat1,
                material2: forgeMat2,
                weaponName: forgeWeaponName,
              })
            }
          >
            鍛造
          </button>
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
          消耗體力：3～8 點
          {displayStamina < 3 && <span style={{ color: "#f87171", marginLeft: "0.4rem" }}>體力不足！</span>}
        </div>
      </div>

      {/* Upgrade */}
      <div className="card">
        <h2>強化武器</h2>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            marginBottom: "0.5rem",
          }}
        >
          <select
            value={upWeapon}
            onChange={(e) => setUpWeapon(e.target.value)}
          >
            <option value="">— 選擇武器 —</option>
            {(user.weapons || []).map((weapon) => (
              <option key={weapon.index} value={String(weapon.index)}>
                #{weapon.index} {weapon.rarityLabel ? `【${weapon.rarityLabel}】` : ""}{weapon.weaponName} [{weapon.name}] ATK:
                {weapon.atk} 耐久:{weapon.durability}
              </option>
            ))}
          </select>
          <select value={upMat} onChange={(e) => setUpMat(e.target.value)}>
            <option value="">— 選擇素材 —</option>
            {(user.items || [])
              .filter((item) => item.num > 0)
              .map((item) => (
                <option key={item.index} value={String(item.index)}>
                  #{item.index} [{item.levelText}] {item.name} x{item.num}
                </option>
              ))}
          </select>
          <button
            className="btn-success"
            disabled={busy || !upWeapon || !upMat}
            onClick={() =>
              doAction("upgrade", {
                weaponId: upWeapon,
                materialId: upMat,
              })
            }
          >
            強化
          </button>
        </div>
      </div>

      {/* Repair */}
      <div className="card">
        <h2>修復武器</h2>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            marginBottom: "0.5rem",
          }}
        >
          <select
            value={repairWeapon}
            onChange={(e) => setRepairWeapon(e.target.value)}
          >
            <option value="">— 選擇武器 —</option>
            {(user.weapons || []).map((weapon) => (
              <option key={weapon.index} value={String(weapon.index)}>
                #{weapon.index}{" "}
                {weapon.rarityLabel ? `【${weapon.rarityLabel}】` : ""}
                {weapon.weaponName} 耐久:{weapon.durability}
              </option>
            ))}
          </select>
          <select
            value={repairMat}
            onChange={(e) => setRepairMat(e.target.value)}
          >
            <option value="">— 選擇素材 —</option>
            {(user.items || [])
              .filter((item) => item.num > 0)
              .map((item) => (
                <option key={item.index} value={String(item.index)}>
                  #{item.index} [{item.levelText}] {item.name} x{item.num}
                </option>
              ))}
          </select>
          <button
            className="btn-warning"
            disabled={busy || !repairWeapon || !repairMat || displayStamina < 1}
            onClick={() =>
              doAction("repair", {
                weaponId: repairWeapon,
                materialId: repairMat,
              })
            }
          >
            修復
          </button>
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          費用：普通 50 / 優良 100 / 稀有 200 / 史詩 400 / 傳說 800 Col，成功率 85%
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          消耗體力：1～5 點
          {displayStamina < 1 && <span style={{ color: "#f87171", marginLeft: "0.4rem" }}>體力不足！</span>}
        </div>
      </div>

      {/* Adventure */}
      <div className="card">
        <h2>冒險</h2>
        {user.isInDebt && (
          <div style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: "0.4rem" }}>
            ⚠️ 負債中：冒險獎勵減半
          </div>
        )}
        {(() => {
          const floor = user.currentFloor || 1;
          const advFee = 30 + floor * 10;
          return (
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-secondary)",
                marginBottom: "0.4rem",
              }}
            >
              委託費：{advFee} Col（第 {floor} 層）
            </div>
          );
        })()}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={advNpc}
            onChange={(e) => setAdvNpc(e.target.value)}
          >
            <option value="">— 選擇冒險者（必填）—</option>
            {(user.hiredNpcs || []).map((npc) => {
              const cond = npc.condition ?? 100;
              const disabled = cond < 10;
              return (
                <option key={npc.npcId} value={npc.npcId} disabled={disabled}>
                  {npc.name}【{npc.quality}】{npc.class} LV.{npc.level} 體力:{cond}%
                  {disabled ? " (無法出戰)" : ""}
                </option>
              );
            })}
          </select>
          <select
            value={advWeapon}
            onChange={(e) => setAdvWeapon(e.target.value)}
          >
            <option value="">— 選擇武器 (預設#0) —</option>
            {(user.weapons || []).map((weapon) => (
              <option key={weapon.index} value={String(weapon.index)}>
                #{weapon.index}{" "}
                {weapon.rarityLabel ? `【${weapon.rarityLabel}】` : ""}
                {weapon.weaponName} [{weapon.name}] ATK:
                {weapon.atk} 耐久:{weapon.durability}
              </option>
            ))}
          </select>
          <button
            className="btn-primary"
            disabled={busy || !advNpc}
            onClick={() =>
              doAction("adventure", {
                weaponId: advWeapon || undefined,
                npcId: advNpc,
              })
            }
          >
            {busy ? "冒險中..." : "出發冒險"}
          </button>
        </div>
        {(user.hiredNpcs || []).length === 0 && (
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
            ⚠️ 請先至「酒館」tab 雇用冒險者才能冒險
          </div>
        )}
      </div>

      {/* Solo Adventure */}
      <div className="card">
        <h2>親自出擊</h2>
        <div style={{
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "6px",
          padding: "0.5rem 0.75rem",
          marginBottom: "0.6rem",
          fontSize: "0.8rem",
          color: "#f87171",
        }}>
          ⚠️ 高風險行動！鍛造師親自出戰——敗北 80% 死亡，平手 30% 死亡。<br />
          <strong>死亡 = 角色永久刪除（無法復原）</strong>
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
          鍛造師基礎值：HP 30、靠武器數值戰鬥。無委託費，勝利可獲得正常冒險獎勵。
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.5rem" }}>
          <select value={soloWeapon} onChange={(e) => setSoloWeapon(e.target.value)}>
            <option value="">— 選擇武器（必填）—</option>
            {(user.weapons || []).map((w) => (
              <option key={w.index} value={String(w.index)}>
                #{w.index} {w.rarityLabel ? `【${w.rarityLabel}】` : ""}{w.weaponName} ATK:{w.atk} 耐久:{w.durability}
              </option>
            ))}
          </select>
        </div>
        {!soloConfirm ? (
          <button
            className="btn-danger"
            disabled={busy || !soloWeapon || displayStamina < 15}
            onClick={() => setSoloConfirm(true)}
            style={{ marginBottom: "0.3rem" }}
          >
            親自出擊
          </button>
        ) : (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "#f87171" }}>確定出擊？死亡不可復原！</span>
            <button
              className="btn-danger"
              disabled={busy}
              onClick={async () => {
                setSoloConfirm(false);
                await doAction("solo-adventure", { weaponId: soloWeapon || undefined });
              }}
            >
              {busy ? "出擊中..." : "確定"}
            </button>
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={() => setSoloConfirm(false)}
            >
              取消
            </button>
          </div>
        )}
        <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
          消耗體力：15～25 點
          {displayStamina < 15 && <span style={{ color: "#f87171", marginLeft: "0.4rem" }}>體力不足！</span>}
        </div>
      </div>

      {/* 防禦武器設定 & 戰鬥資訊 */}
      <div className="card">
        <h2>決鬥設定</h2>
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
          戰鬥等級 <strong style={{ color: "var(--warning)" }}>Lv.{user.battleLevel || 1}</strong>
          {user.isPK && <span style={{ color: "#ef4444", marginLeft: "0.5rem", fontWeight: "bold" }}>[紅名]</span>}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
          被其他玩家挑戰時自動使用的武器：
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={defenseWeapon}
            onChange={(e) => setDefenseWeapon(Number(e.target.value))}
          >
            {(user.weapons || []).map((weapon) => (
              <option key={weapon.index} value={weapon.index}>
                #{weapon.index} {weapon.rarityLabel ? `【${weapon.rarityLabel}】` : ""}{weapon.weaponName} ATK:{weapon.atk}
              </option>
            ))}
          </select>
          <button
            className="btn-primary"
            disabled={busy}
            onClick={async () => {
              setDefenseMsg("");
              try {
                const res = await fetch("/api/game/pvp/set-defense-weapon", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ weaponIndex: defenseWeapon }),
                });
                const data = await res.json();
                if (data.error) {
                  setDefenseMsg(data.error);
                } else {
                  setDefenseMsg("防禦武器已更新！");
                }
              } catch {
                setDefenseMsg("設定失敗");
              }
            }}
            style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
          >
            設定
          </button>
        </div>
        {defenseMsg && (
          <div style={{ fontSize: "0.75rem", color: defenseMsg.includes("失敗") || defenseMsg.includes("error") ? "#f87171" : "#4ade80", marginTop: "0.3rem" }}>
            {defenseMsg}
          </div>
        )}
        <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
          前往「名冊」tab 可向其他玩家發起決鬥
        </div>
      </div>

      {/* Result display */}
      {result && (
        <div className="card">
          <h2>結果</h2>
          <div className="battle-log">
            {result.text && <div>{result.text}</div>}
            {result.narrative && (
              <NarrativeDisplay text={result.narrative} done={true} />
            )}
            {result.durabilityText && <div>{result.durabilityText}</div>}
            {result.reward && <div>{result.reward}</div>}
            {result.battleLog && <div>{result.battleLog}</div>}
            {result.colEarned > 0 && (
              <div style={{ color: "var(--gold)" }}>
                +{result.colEarned} Col
              </div>
            )}
            {result.colSpent > 0 && (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                委託費：-{result.colSpent} Col
              </div>
            )}
            {result.floor && (
              <div
                style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}
              >
                📍 第 {result.floor} 層 {result.floorName}
              </div>
            )}
            {result.weapon && (
              <div
                style={{
                  marginTop: "0.5rem",
                  border: result.weapon.rarityColor
                    ? `1px solid ${result.weapon.rarityColor}`
                    : undefined,
                  borderRadius: "6px",
                  padding: "0.5rem",
                  boxShadow: result.weapon.rarityColor
                    ? `0 0 10px ${result.weapon.rarityColor}55`
                    : undefined,
                }}
              >
                {result.weapon.rarityLabel && (
                  <div
                    className="rarity-badge"
                    style={{
                      color: result.weapon.rarityColor,
                      borderColor: result.weapon.rarityColor,
                      marginBottom: "0.4rem",
                    }}
                  >
                    {result.weapon.rarityLabel}
                    {result.weapon.totalScore != null && (
                      <span className="rarity-score">
                        {result.weapon.totalScore}
                      </span>
                    )}
                  </div>
                )}
                <strong>{result.weapon.weaponName}</strong> [
                {result.weapon.name}]
                <div className="stat-grid" style={{ marginTop: "0.25rem" }}>
                  <div className="stat-item">
                    <span className="label">ATK</span>{" "}
                    <span className="value">{result.weapon.atk}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">DEF</span>{" "}
                    <span className="value">{result.weapon.def}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">AGI</span>{" "}
                    <span className="value">{result.weapon.agi}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">CRI</span>{" "}
                    <span className="value">{result.weapon.cri}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">HP</span>{" "}
                    <span className="value">{result.weapon.hp}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">耐久</span>{" "}
                    <span className="value">{result.weapon.durability}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 隨機事件 */}
            {result.randomEvent && (
              <RandomEventDisplay event={result.randomEvent} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
