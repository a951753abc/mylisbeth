import React, { useState, useEffect, useCallback } from "react";

function formatCountdown(ms) {
  if (ms <= 0) return "即將結算";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}分 ${sec}秒`;
}

function calcPreviewChance(currentDebt, loanAmount, bill, perBill, cap) {
  if (bill <= 0) return 0;
  return Math.min(cap, Math.floor(((currentDebt + loanAmount) / bill) * perBill));
}

export default function SettlementPanel({ user, onRefresh, onBankruptcy }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payAmount, setPayAmount] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 借款相關
  const [loanAmount, setLoanAmount] = useState("");
  const [loanResult, setLoanResult] = useState(null);
  const [loanBusy, setLoanBusy] = useState(false);

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

  const handleLoan = async () => {
    const amount = parseInt(loanAmount, 10);
    if (!amount || amount <= 0) return setLoanResult({ error: "請輸入有效的借款金額" });
    setLoanBusy(true);
    setLoanResult(null);
    try {
      const res = await fetch("/api/game/loan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount }),
      });
      const result = await res.json();
      if (result.error) {
        setLoanResult({ error: result.error });
      } else if (result.bankruptcy) {
        setLoanResult({
          died: true,
          roll: result.roll,
          threshold: result.threshold,
          amount: result.amount,
        });
        if (onBankruptcy) onBankruptcy(result.bankruptcyInfo);
      } else {
        setLoanResult({
          survived: true,
          roll: result.roll,
          threshold: result.threshold,
          amount: result.amount,
          col: result.col,
          debt: result.debt,
        });
        setLoanAmount("");
        await fetchSettlement();
        if (onRefresh) onRefresh();
      }
    } catch {
      setLoanResult({ error: "借款失敗，請稍後再試" });
    } finally {
      setLoanBusy(false);
    }
  };

  if (loading) return <div className="card">載入帳單中...</div>;
  if (!data) return <div className="card error-msg">無法載入帳單</div>;

  const npcWages = (user.hiredNpcs || []).reduce((s, n) => s + (n.monthlyCost || n.weeklyCost || 0), 0);
  const floorTax = (user.currentFloor || 1) * 30;
  const loan = data.loanInfo || {};

  // 即時預覽破產機率
  const previewAmount = parseInt(loanAmount, 10) || 0;
  const previewChance = loan.canLoan && previewAmount > 0
    ? calcPreviewChance(loan.currentDebt, previewAmount, loan.bill, loan.deathPerBill || 15, loan.deathCap || 90)
    : 0;

  return (
    <div className="card">
      <h2>帳單與負債</h2>

      {user.businessPaused && (
        <div style={{
          background: "#92400e33",
          border: "1px solid #f59e0b",
          borderRadius: "6px",
          padding: "0.6rem 0.8rem",
          marginBottom: "0.8rem",
          color: "#fbbf24",
        }}>
          <strong>店鋪已暫停營業</strong>：帳單暫停計算中，不會產生新的帳單或負債。
        </div>
      )}

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
          <strong>負債警告</strong>：你目前有 {data.debt} Col 未清還的負債！
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
              <span>NPC 月薪（{(user.hiredNpcs || []).length} 人）</span>
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
          <span style={{ color: "#f44336", marginLeft: "0.5rem" }}>Col 不足以支付帳單！</span>
        )}
      </div>

      {/* 下次結算倒數 */}
      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.8rem" }}>
        下次結算：{countdown > 0 ? formatCountdown(countdown) : "即將結算"}
        （每 30 遊戲日 ≈ 2.5 小時結算一次）
      </div>

      {/* 還債區 */}
      {data.isInDebt && (
        <div style={{ marginBottom: "1rem" }}>
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

      {/* 擴大負債（借款）區 */}
      {loan.canLoan && (
        <div
          style={{
            background: "#44141433",
            border: "1px solid #991b1b",
            borderRadius: "6px",
            padding: "0.8rem",
            marginTop: "0.5rem",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "0.5rem", color: "#fbbf24" }}>
            擴大負債
          </div>
          <div style={{ fontSize: "0.8rem", color: "#d4d4d8", marginBottom: "0.5rem" }}>
            向闇商人借款以獲取即時 Col。每次借款都需擲骰判定——負債越高，破產機率越大。
            <br />
            借款範圍：{loan.minLoan} ~ {loan.maxLoan} Col
            {loan.currentDebt > 0 && (
              <span>（目前負債：{loan.currentDebt} Col）</span>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="number"
              placeholder={`${loan.minLoan}~${loan.maxLoan}`}
              value={loanAmount}
              onChange={(e) => {
                setLoanAmount(e.target.value);
                setLoanResult(null);
              }}
              min={loan.minLoan}
              max={loan.maxLoan}
              style={{ width: "130px" }}
            />
            <button
              className="btn-danger"
              disabled={loanBusy || !loanAmount || previewAmount < loan.minLoan || previewAmount > loan.maxLoan}
              onClick={handleLoan}
            >
              {loanBusy ? "擲骰中..." : "借款（賭命）"}
            </button>
          </div>

          {/* 即時風險預覽 */}
          {previewAmount >= loan.minLoan && previewAmount <= loan.maxLoan && (
            <div style={{
              marginTop: "0.4rem",
              fontSize: "0.8rem",
              padding: "0.4rem 0.6rem",
              background: "#1a1a2e",
              borderRadius: "4px",
              border: `1px solid ${previewChance >= 60 ? "#dc2626" : previewChance >= 30 ? "#d97706" : "#4b5563"}`,
            }}>
              借 {previewAmount} Col 後總負債：{loan.currentDebt + previewAmount} Col
              <br />
              <span style={{
                color: previewChance >= 60 ? "#ef4444" : previewChance >= 30 ? "#f59e0b" : "#10b981",
                fontWeight: "bold",
              }}>
                破產機率：{previewChance}%
              </span>
              <span style={{ color: "#9ca3af", marginLeft: "0.5rem" }}>
                （d100 擲出 ≤ {previewChance} 即死）
              </span>
            </div>
          )}

          {/* 借款結果 */}
          {loanResult && (
            <div style={{ marginTop: "0.5rem" }}>
              {loanResult.error && (
                <div className="error-msg">{loanResult.error}</div>
              )}
              {loanResult.survived && (
                <div style={{
                  background: "#14532d33",
                  border: "1px solid #22c55e",
                  borderRadius: "6px",
                  padding: "0.5rem 0.7rem",
                  color: "#86efac",
                }}>
                  <strong>倖存！</strong> 骰出 {loanResult.roll}（安全線 &gt; {loanResult.threshold}）
                  <br />
                  獲得 {loanResult.amount} Col。目前 Col：{loanResult.col}，負債：{loanResult.debt}
                </div>
              )}
              {loanResult.died && (
                <div style={{
                  background: "#7f1d1d55",
                  border: "1px solid #ef4444",
                  borderRadius: "6px",
                  padding: "0.5rem 0.7rem",
                  color: "#fca5a5",
                }}>
                  <strong>破產！</strong> 骰出 {loanResult.roll}（死亡線 ≤ {loanResult.threshold}）
                  <br />
                  借款 {loanResult.amount} Col 的代價——角色已被永久刪除。
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 不可借款的原因 */}
      {loan.canLoan === false && loan.reason && (
        <div style={{
          fontSize: "0.8rem",
          color: "#6b7280",
          marginTop: "0.5rem",
          fontStyle: "italic",
        }}>
          {loan.reason}
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
