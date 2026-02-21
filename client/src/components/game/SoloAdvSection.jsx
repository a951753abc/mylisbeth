import React, { useState } from "react";
import WeaponSelect from "../WeaponSelect.jsx";

export default function SoloAdvSection({ user, doAction, isDisabled, busy, cooldownActive, displayStamina }) {
  const [soloWeapon, setSoloWeapon] = useState("");
  const [soloConfirm, setSoloConfirm] = useState(false);

  return (
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
        <WeaponSelect
          weapons={user.weapons}
          value={soloWeapon}
          onChange={(e) => setSoloWeapon(e.target.value)}
          placeholder="— 選擇武器（必填）—"
          showAtk
          showDur
        />
      </div>
      {!soloConfirm ? (
        <button
          className="btn-danger"
          disabled={isDisabled || !soloWeapon || displayStamina < 15}
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
            disabled={isDisabled}
            onClick={async () => {
              setSoloConfirm(false);
              await doAction("solo-adventure", { weaponId: soloWeapon || undefined });
            }}
          >
            {busy ? "出擊中..." : cooldownActive ? "冷卻中..." : "確定"}
          </button>
          <button
            className="btn-secondary"
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
  );
}
