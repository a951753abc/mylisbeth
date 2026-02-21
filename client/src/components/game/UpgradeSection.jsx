import React, { useState } from "react";
import WeaponSelect from "../WeaponSelect.jsx";

export default function UpgradeSection({ user, doAction, isDisabled, displayStamina }) {
  const [upWeapon, setUpWeapon] = useState("");
  const [upMat, setUpMat] = useState("");
  const [repairWeapon, setRepairWeapon] = useState("");
  const [repairMat, setRepairMat] = useState("");

  const itemOptions = (user.items || []).filter((item) => item.num > 0);

  return (
    <>
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
          <WeaponSelect
            weapons={user.weapons}
            value={upWeapon}
            onChange={(e) => setUpWeapon(e.target.value)}
            showName
            showAtk
            showDur
          />
          <select value={upMat} onChange={(e) => setUpMat(e.target.value)}>
            <option value="">— 選擇素材 —</option>
            {itemOptions.map((item) => (
              <option key={item.index} value={String(item.index)}>
                #{item.index} [{item.levelText}] {item.name} x{item.num}
              </option>
            ))}
          </select>
          <button
            className="btn-success"
            disabled={isDisabled || !upWeapon || !upMat}
            onClick={async () => {
              const data = await doAction("upgrade", {
                weaponId: upWeapon,
                materialId: upMat,
              });
              if (!data.error) setUpMat("");
            }}
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
          <WeaponSelect
            weapons={user.weapons}
            value={repairWeapon}
            onChange={(e) => setRepairWeapon(e.target.value)}
            showAtk={false}
            showDur
          />
          <select
            value={repairMat}
            onChange={(e) => setRepairMat(e.target.value)}
          >
            <option value="">— 選擇素材 —</option>
            {itemOptions.map((item) => (
              <option key={item.index} value={String(item.index)}>
                #{item.index} [{item.levelText}] {item.name} x{item.num}
              </option>
            ))}
          </select>
          <button
            className="btn-warning"
            disabled={isDisabled || !repairWeapon || !repairMat || displayStamina < 1}
            onClick={async () => {
              const data = await doAction("repair", {
                weaponId: repairWeapon,
                materialId: repairMat,
              });
              if (!data.error) setRepairMat("");
            }}
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
    </>
  );
}
