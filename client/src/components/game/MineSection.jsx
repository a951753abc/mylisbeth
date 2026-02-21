import React from "react";

export default function MineSection({ doAction, isDisabled, busy, cooldownActive, displayStamina }) {
  return (
    <div className="card">
      <h2>挖礦</h2>
      <button
        className="btn-primary"
        disabled={isDisabled || displayStamina < 1}
        onClick={() => doAction("mine")}
      >
        {busy ? "挖礦中..." : cooldownActive ? "冷卻中..." : "開始挖礦"}
      </button>
      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
        消耗體力：1～6 點
        {displayStamina < 1 && <span style={{ color: "#f87171", marginLeft: "0.4rem" }}>體力不足！</span>}
      </div>
    </div>
  );
}
