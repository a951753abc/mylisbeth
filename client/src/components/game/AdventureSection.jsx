import React, { useState } from "react";
import WeaponSelect from "../WeaponSelect.jsx";

export default function AdventureSection({ user, doAction, isDisabled, busy, cooldownActive }) {
  const [advWeapon, setAdvWeapon] = useState("");
  const [advNpc, setAdvNpc] = useState("");

  return (
    <div className="card">
      <h2>冒險</h2>
      {user.isInDebt && (
        <div style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: "0.4rem" }}>
          ⚠️ 負債中：冒險獎勵減半
        </div>
      )}
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--text-secondary)",
          marginBottom: "0.4rem",
        }}
      >
        委託費：勝利時從獎勵扣除 10%（敗北不收費）
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={advNpc}
          onChange={(e) => setAdvNpc(e.target.value)}
        >
          <option value="">— 選擇冒險者（必填）—</option>
          {(user.hiredNpcs || []).map((npc) => {
            const cond = npc.condition ?? 100;
            const onMission = !!npc.mission;
            const disabled = cond < 10 || onMission;
            return (
              <option key={npc.npcId} value={npc.npcId} disabled={disabled}>
                {npc.name}【{npc.quality}】{npc.class} LV.{npc.level} 體力:{cond}%
                {onMission ? " (任務中)" : disabled ? " (無法出戰)" : ""}
              </option>
            );
          })}
        </select>
        <WeaponSelect
          weapons={user.weapons}
          value={advWeapon}
          onChange={(e) => setAdvWeapon(e.target.value)}
          placeholder="— 選擇武器 (預設#0) —"
          showName
          showAtk
          showDur
        />
        <button
          className="btn-primary"
          disabled={isDisabled || !advNpc}
          onClick={() =>
            doAction("adventure", {
              weaponId: advWeapon || undefined,
              npcId: advNpc,
            })
          }
        >
          {busy ? "冒險中..." : cooldownActive ? "冷卻中..." : "出發冒險"}
        </button>
      </div>
      {(user.hiredNpcs || []).length === 0 && (
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
          ⚠️ 請先至「酒館」tab 雇用冒險者才能冒險
        </div>
      )}
    </div>
  );
}
