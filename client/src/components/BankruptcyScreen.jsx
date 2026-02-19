import React from "react";

export default function BankruptcyScreen({ info, onDismiss }) {
  const isDeath = info?.cause === "solo_adventure_death";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>
        {isDeath ? "⚔️" : "💀"}
      </div>
      <h1 style={{ color: "#ef4444", fontSize: "2.5rem", marginBottom: "0.5rem" }}>
        {isDeath ? "YOU DIED" : "GAME OVER"}
      </h1>
      <p style={{ fontSize: "1.2rem", color: "#fca5a5", marginBottom: "1.5rem" }}>
        {isDeath
          ? <>{info?.name || "你"}在冒險中壯烈犧牲，永眠於艾恩葛朗特。<br />你的角色已被永久刪除。</>
          : <>{info?.name || "你"}因無力清償負債而宣告破產。<br />你的角色已被永久刪除。</>
        }
      </p>

      {info && (
        <div
          style={{
            background: "#1f1f2e",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "1rem 1.5rem",
            marginBottom: "1.5rem",
            fontSize: "0.9rem",
            lineHeight: "1.8",
            color: "#9ca3af",
          }}
        >
          <div>角色名稱：<span style={{ color: "#fff" }}>{info.name}</span></div>
          {isDeath ? (
            <>
              <div>擁有武器：{info.weaponCount} 把</div>
              <div>雇用冒險者：{info.hiredNpcCount} 人</div>
              <div>遺留 Col：{info.finalCol}</div>
            </>
          ) : (
            <>
              <div>最終負債：<span style={{ color: "#ef4444" }}>{info.totalDebt} Col</span></div>
              <div>連續負債週期：<span style={{ color: "#f87171" }}>{info.debtCycles} 次</span></div>
              <div>破產時 Col：{info.finalCol}</div>
              <div>擁有武器：{info.weaponCount} 把</div>
              <div>雇用冒險者：{info.hiredNpcCount} 人</div>
            </>
          )}
        </div>
      )}

      <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        {isDeath
          ? "「這個世界是殘酷的……但也是美麗的。」"
          : "「浮現在空中的消逝之光，比以往更加耀眼。」"
        }
      </p>

      <button
        className="btn-primary"
        style={{ fontSize: "1rem", padding: "0.7rem 2rem" }}
        onClick={onDismiss}
      >
        重新開始
      </button>
    </div>
  );
}
