import React, { useState, useEffect } from "react";
import WeaponSelect from "../WeaponSelect.jsx";

export default function DuelSetupSection({ user, isDisabled, onUserUpdate }) {
  const [defenseWeapon, setDefenseWeapon] = useState(() => {
    const saved = user.defenseWeaponIndex ?? 0;
    const indices = (user.weapons || []).map((w) => w.index);
    return indices.includes(saved) ? saved : (indices[0] ?? 0);
  });
  const [defenseMsg, setDefenseMsg] = useState("");

  useEffect(() => {
    const indices = (user.weapons || []).map((w) => w.index);
    if (indices.length > 0 && !indices.includes(defenseWeapon)) {
      setDefenseWeapon(indices[0]);
    }
  }, [user.weapons, defenseWeapon]);

  return (
    <div className="card">
      <h2>決鬥設定</h2>
      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
        被其他玩家挑戰時自動使用的武器：
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <WeaponSelect
          weapons={user.weapons}
          value={String(defenseWeapon)}
          onChange={(e) => setDefenseWeapon(Number(e.target.value))}
          placeholder={null}
          showAtk
        />
        <button
          className="btn-primary"
          disabled={isDisabled}
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
                if (onUserUpdate) onUserUpdate();
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
  );
}
