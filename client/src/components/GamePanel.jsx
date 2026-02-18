import React, { useState } from "react";

export default function GamePanel({ user, onAction, setCooldown }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Forge state
  const [forgeMat1, setForgeMat1] = useState("");
  const [forgeMat2, setForgeMat2] = useState("");
  const [forgeWeaponName, setForgeWeaponName] = useState("");

  // Upgrade state
  const [upWeapon, setUpWeapon] = useState("");
  const [upMat, setUpMat] = useState("");

  // Adventure state
  const [advWeapon, setAdvWeapon] = useState("");

  // PVP state
  const [pvpTarget, setPvpTarget] = useState("");
  const [pvpWeapon, setPvpWeapon] = useState("");

  const doAction = async (action, body = {}) => {
    setBusy(true);
    setError("");
    setResult(null);
    const data = await onAction(action, body);
    if (data.error) {
      setError(data.error);
      if (data.cooldown) setCooldown(data.cooldown);
    } else {
      setResult(data);
    }
    setBusy(false);
  };

  return (
    <div>
      {error && <div className="error-msg">{error}</div>}

      {/* Stats */}
      <div className="card">
        <h2>角色資訊</h2>
        <div className="stat-grid">
          <div className="stat-item">
            <div className="label">挖礦等級</div>
            <div className="value">{user.mineLevel}</div>
          </div>
          <div className="stat-item">
            <div className="label">鍛造等級</div>
            <div className="value">{user.forgeLevel}</div>
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
      </div>

      {/* Mine */}
      <div className="card">
        <h2>挖礦</h2>
        <button
          className="btn-primary"
          disabled={busy}
          onClick={() => doAction("mine")}
        >
          {busy ? "挖礦中..." : "開始挖礦"}
        </button>
      </div>

      {/* Forge */}
      <div className="card">
        <h2>鍛造武器</h2>
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
            onChange={(e) => setForgeMat1(e.target.value)}
          >
            <option value="">— 素材1 —</option>
            {(user.items || [])
              .filter((item) => item.num > 0)
              .map((item) => (
                <option key={item.index} value={String(item.index)}>
                  #{item.index} [{item.levelText}] {item.name} x{item.num}
                </option>
              ))}
          </select>
          <select
            value={forgeMat2}
            onChange={(e) => setForgeMat2(e.target.value)}
          >
            <option value="">— 素材2 —</option>
            {(user.items || [])
              .filter((item) => item.num > 0)
              .map((item) => (
                <option key={item.index} value={String(item.index)}>
                  #{item.index} [{item.levelText}] {item.name} x{item.num}
                </option>
              ))}
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
            disabled={busy || !forgeMat1 || !forgeMat2 || !forgeWeaponName}
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
                #{weapon.index} {weapon.weaponName} [{weapon.name}] ATK:
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

      {/* Adventure */}
      <div className="card">
        <h2>冒險</h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select
            value={advWeapon}
            onChange={(e) => setAdvWeapon(e.target.value)}
          >
            <option value="">— 選擇武器 (預設#0) —</option>
            {(user.weapons || []).map((weapon) => (
              <option key={weapon.index} value={String(weapon.index)}>
                #{weapon.index} {weapon.weaponName} [{weapon.name}] ATK:
                {weapon.atk} 耐久:{weapon.durability}
              </option>
            ))}
          </select>
          <button
            className="btn-primary"
            disabled={busy}
            onClick={() =>
              doAction("adventure", {
                weaponId: advWeapon || undefined,
              })
            }
          >
            {busy ? "冒險中..." : "出發冒險"}
          </button>
        </div>
      </div>

      {/* PVP */}
      <div className="card">
        <h2>PVP 挑戰</h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="對手角色名稱"
            value={pvpTarget}
            onChange={(e) => setPvpTarget(e.target.value)}
            style={{ width: "130px" }}
          />
          <select
            value={pvpWeapon}
            onChange={(e) => setPvpWeapon(e.target.value)}
          >
            <option value="">— 選擇武器 —</option>
            {(user.weapons || []).map((weapon) => (
              <option key={weapon.index} value={String(weapon.index)}>
                #{weapon.index} {weapon.weaponName} [{weapon.name}] ATK:
                {weapon.atk} 耐久:{weapon.durability}
              </option>
            ))}
          </select>
          <button
            className="btn-danger"
            disabled={busy || !pvpTarget || !pvpWeapon}
            onClick={() =>
              doAction("pvp", {
                targetName: pvpTarget,
                weaponId: pvpWeapon,
              })
            }
          >
            挑戰
          </button>
        </div>
      </div>

      {/* Result display */}
      {result && (
        <div className="card">
          <h2>結果</h2>
          <div className="battle-log">
            {result.text && <div>{result.text}</div>}
            {result.narrative && (
              <div style={{ marginTop: "0.5rem", fontStyle: "italic" }}>
                {result.narrative}
              </div>
            )}
            {result.durabilityText && <div>{result.durabilityText}</div>}
            {result.reward && <div>{result.reward}</div>}
            {result.battleLog && <div>{result.battleLog}</div>}
            {result.colEarned > 0 && (
              <div style={{ color: "var(--gold)" }}>
                💰 +{result.colEarned} Col
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
              <div style={{ marginTop: "0.5rem" }}>
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
          </div>
        </div>
      )}
    </div>
  );
}
