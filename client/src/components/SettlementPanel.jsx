import React, { useState, useEffect, useCallback } from "react";

function formatCountdown(ms) {
  if (ms <= 0) return "即將結算";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}分 ${sec}秒`;
}

export default function SettlementPanel({ user, onRefresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payAmount, setPayAmount] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const fetchSettlement = useCallback(async () => {
    try {
      const res = await fetch("/api/game/settlement", { credentials: "include" });
      const json = await res.json();
      setData(json);
      if (json.nextSettlementAt) {
        setCountdown(json.nextSettlementAt - Date.now());
      }
    } catch {
      setMessage("無法載入帳單資料");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettlement();
  }, [fetchSettlement]);

  // 倒數計時
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1000;
        if (next <= 0) clearInterval(timer);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handlePayDebt = async () => {
    const amount = parseInt(payAmount, 10);
    if (!amount || amount <= 0) return setMessage("請輸入有效的還款金額");
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/game/pay-debt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount }),
      });
      const result = await res.json();
      if (result.error) {
        setMessage(`❌ ${result.error}`);
      } else {
        setMessage(
          result.cleared
            ? "✅ 負債全部清還！限制已解除。"
            : `✅ 還款 ${amount} Col，剩餘負債：${result.remainingDebt} Col`,
        );
        setPayAmount("");
        await fetchSettlement();
        if (onRefresh) onRefresh();
      }
    } catch {
      setMessage("❌ 還款失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="card">載入帳單中...</div>;
  if (!data) return <div className="card error-msg">無法載入帳單</div>;

  const npcWages = (user.hiredNpcs || []).reduce((s, n) => s + (n.weeklyCost || 0), 0);
  const floorTax = (user.currentFloor || 1) * 30;

  return (
    <div className="card">
      <h2>📋 帳單與負債</h2>

      {data.isInDebt && (
        <div
          style={{
            background: "#7f1d1d33",
            border: "1px solid #ef4444",
            borderRadius: "6px",
            padding: "0.6rem 0.8rem",
            marginBottom: "0.8rem",
            color: "#fca5a5",
          }}
        >
          ⚠️ <strong>負債警告</strong>：你目前有 {data.debt} Col 未清還的負債！
          <br />
          連續負債 {data.debtCycleCount} 個週期。超過 {3} 個週期將觸發 <strong>破產</strong>，角色將被永久刪除。
          <br />
          <span style={{ color: "#f87171" }}>
            鍛造與 PVP 已停用，冒險獎勵減半。
          </span>
        </div>
      )}

      {/* 帳單明細 */}
      <div style={{ marginBottom: "0.8rem" }}>
        <div style={{ fontWeight: "bold", marginBottom: "0.3rem" }}>本期帳單明細：</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.85rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>基礎租金</span>
            <span style={{ color: "var(--gold)" }}>100 Col</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>樓層稅（第 {user.currentFloor || 1} 層）</span>
            <span style={{ color: "var(--gold)" }}>{floorTax} Col</span>
          </div>
          {npcWages > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>NPC 週薪（{(user.hiredNpcs || []).length} 人）</span>
              <span style={{ color: "var(--gold)" }}>{npcWages} Col</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: "bold",
              borderTop: "1px solid var(--border)",
              paddingTop: "0.2rem",
              marginTop: "0.2rem",
            }}
          >
            <span>合計</span>
            <span style={{ color: data.col >= data.bill ? "var(--gold)" : "#f44336" }}>
              {data.bill} Col
            </span>
          </div>
        </div>
      </div>

      {/* 現有 Col vs 帳單 */}
      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
        現有 Col：<span style={{ color: "var(--gold)" }}>{data.col.toLocaleString()}</span>
        {data.col < data.bill && (
          <span style={{ color: "#f44336", marginLeft: "0.5rem" }}>⚠️ Col 不足以支付帳單！</span>
        )}
      </div>

      {/* 下次結算倒數 */}
      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.8rem" }}>
        下次結算：{countdown > 0 ? formatCountdown(countdown) : "即將結算"}
        （每 7 遊戲日 = 35 分鐘結算一次）
      </div>

      {/* 還債區 */}
      {data.isInDebt && (
        <div>
          <div style={{ fontWeight: "bold", marginBottom: "0.4rem" }}>
            負債金額：<span style={{ color: "#f44336" }}>{data.debt} Col</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              type="number"
              placeholder="還款金額"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              min="1"
              max={data.debt}
              style={{ width: "120px" }}
            />
            <button
              className="btn-warning"
              disabled={busy || !payAmount}
              onClick={handlePayDebt}
            >
              {busy ? "還款中..." : "還款"}
            </button>
            <button
              className="btn-danger"
              disabled={busy || data.col < data.debt}
              onClick={() => {
                setPayAmount(String(data.debt));
              }}
            >
              一次還清（{data.debt} Col）
            </button>
          </div>
        </div>
      )}

      {message && (
        <div
          className={message.startsWith("❌") ? "error-msg" : ""}
          style={{ marginTop: "0.5rem" }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
