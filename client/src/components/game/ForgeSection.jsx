import React, { useState, useMemo } from "react";

export default function ForgeSection({ user, doAction, isDisabled, displayStamina }) {
  const [forgeMat1, setForgeMat1] = useState("");
  const [forgeMat2, setForgeMat2] = useState("");

  const availableForMat1 = useMemo(() => {
    return (user.items || []).filter((item) => {
      if (item.num <= 0) return false;
      if (String(item.index) === forgeMat2 && item.num < 2) return false;
      return true;
    });
  }, [user.items, forgeMat2]);

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

  return (
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
        <button
          className="btn-warning"
          disabled={isDisabled || !forgeMat1 || !forgeMat2 || displayStamina < 3}
          onClick={() =>
            doAction("forge", {
              material1: forgeMat1,
              material2: forgeMat2,
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
  );
}
