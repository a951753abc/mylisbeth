import React, { useState } from "react";
import ForgeAnimation from "./ForgeAnimation.jsx";
import NarrativeDisplay from "./NarrativeDisplay.jsx";
import RandomEventDisplay from "./RandomEventDisplay.jsx";
import CharacterStats from "./CharacterStats.jsx";
import StaminaDisplay from "./StaminaDisplay.jsx";
import { useStaminaTimer } from "../hooks/useStaminaTimer.js";
import MineSection from "./game/MineSection.jsx";
import ForgeSection from "./game/ForgeSection.jsx";
import UpgradeSection from "./game/UpgradeSection.jsx";
import AdventureSection from "./game/AdventureSection.jsx";
import SoloAdvSection from "./game/SoloAdvSection.jsx";
import DuelSetupSection from "./game/DuelSetupSection.jsx";

const ACTION_SOURCE_MAP = {
  mine: "mine",
  forge: "forge",
  synthesize: "forge",
  upgrade: "upgrade",
  repair: "upgrade",
  adventure: "adventure",
  "solo-adventure": "soloAdv",
};

export default function GamePanel({ user, onAction, setCooldown, onUserUpdate, cooldownActive, onSetTitle }) {
  const [result, setResult] = useState(null);
  const [resultSource, setResultSource] = useState(null);
  const [forgeResult, setForgeResult] = useState(null);
  const [lcResult, setLcResult] = useState(null);
  const [error, setError] = useState("");
  const [errorSource, setErrorSource] = useState(null);
  const [busy, setBusy] = useState(false);
  const [localStamina, setLocalStamina] = useState(null);
  const [localLastRegenAt, setLocalLastRegenAt] = useState(null);

  const maxStamina = user.maxStamina ?? 100;

  const { displayStamina, secondsToNext, secondsToFull, isFull } = useStaminaTimer({
    stamina: user.stamina,
    maxStamina,
    lastStaminaRegenAt: user.lastStaminaRegenAt,
    localStamina,
    localLastRegenAt,
  });

  const isDisabled = busy || cooldownActive;

  const doAction = async (action, body = {}) => {
    setBusy(true);
    setError("");
    setErrorSource(null);
    setResult(null);
    setResultSource(null);
    setLcResult(null);
    const source = ACTION_SOURCE_MAP[action] || null;
    const data = await onAction(action, body);
    if (data.error) {
      setError(data.error);
      setErrorSource(source);
      if (data.cooldown) setCooldown(data.cooldown);
    } else if (action === "forge" && data.weapon) {
      setForgeResult(data);
      if (data.stamina !== undefined) setLocalStamina(data.stamina);
      if (data.lastStaminaRegenAt !== undefined) setLocalLastRegenAt(data.lastStaminaRegenAt);
    } else if (action === "lcInfiltrate") {
      setLcResult(data);
    } else if (action === "lcIgnore") {
      // 無視：不需要顯示結果
    } else {
      setResult(data);
      setResultSource(source);
      if (data.stamina !== undefined) setLocalStamina(data.stamina);
      if (data.lastStaminaRegenAt !== undefined) setLocalLastRegenAt(data.lastStaminaRegenAt);
    }
    setBusy(false);
    return data;
  };

  return (
    <div>
      {/* Forge animation overlay */}
      {forgeResult && (
        <ForgeAnimation
          weapon={forgeResult.weapon}
          forgeText={forgeResult.text}
          onComplete={() => {
            setResult(forgeResult);
            setResultSource("forge");
            setForgeResult(null);
          }}
          onRenamed={() => {
            if (onUserUpdate) onUserUpdate();
          }}
        />
      )}

      {/* LC 潛入結果（獨立於 LcEncounterNotice，不受元件卸載影響） */}
      {lcResult && <LcInfiltrationResult result={lcResult} />}

      {/* 潛在的 LC 據點遭遇（從 user 讀取，跨重新整理保留） */}
      {!lcResult && !result?.lcEncounter && user.pendingLcEncounter && (
        <LcEncounterNotice
          encounter={{ type: "lc_base_discovered", baseFloor: user.pendingLcEncounter.baseFloor }}
          doAction={doAction}
          isDisabled={isDisabled}
        />
      )}

      {/* Character stats + stamina */}
      <CharacterStats user={user} onSetTitle={onSetTitle}>
        <StaminaDisplay
          displayStamina={displayStamina}
          maxStamina={maxStamina}
          secondsToNext={secondsToNext}
          secondsToFull={secondsToFull}
          isFull={isFull}
        />
      </CharacterStats>

      <MineSection
        doAction={doAction}
        isDisabled={isDisabled}
        busy={busy}
        cooldownActive={cooldownActive}
        displayStamina={displayStamina}
        mineLevel={user.mineLevel ?? 1}
      />
      <SectionFeedback source="mine" error={error} errorSource={errorSource} result={result} resultSource={resultSource} setResult={setResult} setResultSource={setResultSource} doAction={doAction} isDisabled={isDisabled} />

      <ForgeSection
        user={user}
        doAction={doAction}
        isDisabled={isDisabled}
        displayStamina={displayStamina}
        forgeLevel={user.forgeLevel ?? 1}
      />
      <SectionFeedback source="forge" error={error} errorSource={errorSource} result={result} resultSource={resultSource} setResult={setResult} setResultSource={setResultSource} doAction={doAction} isDisabled={isDisabled} />

      <UpgradeSection
        user={user}
        doAction={doAction}
        isDisabled={isDisabled}
        displayStamina={displayStamina}
      />
      <SectionFeedback source="upgrade" error={error} errorSource={errorSource} result={result} resultSource={resultSource} setResult={setResult} setResultSource={setResultSource} doAction={doAction} isDisabled={isDisabled} />

      <AdventureSection
        user={user}
        doAction={doAction}
        isDisabled={isDisabled}
        busy={busy}
        cooldownActive={cooldownActive}
        onUserUpdate={onUserUpdate}
      />
      <SectionFeedback source="adventure" error={error} errorSource={errorSource} result={result} resultSource={resultSource} setResult={setResult} setResultSource={setResultSource} doAction={doAction} isDisabled={isDisabled} />

      <SoloAdvSection
        user={user}
        doAction={doAction}
        isDisabled={isDisabled}
        busy={busy}
        cooldownActive={cooldownActive}
        displayStamina={displayStamina}
      />
      <SectionFeedback source="soloAdv" error={error} errorSource={errorSource} result={result} resultSource={resultSource} setResult={setResult} setResultSource={setResultSource} doAction={doAction} isDisabled={isDisabled} />

      <DuelSetupSection
        user={user}
        isDisabled={isDisabled}
        onUserUpdate={onUserUpdate}
      />
    </div>
  );
}

function SectionFeedback({ source, error, errorSource, result, resultSource, setResult, setResultSource, doAction, isDisabled }) {
  return (
    <>
      {error && errorSource === source && (
        <div className="error-msg">{error}</div>
      )}
      {result && resultSource === source && (
        <div className="card result-card-highlight">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>結果</h2>
            <button
              className="btn-secondary"
              onClick={() => { setResult(null); setResultSource(null); }}
              style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
            >
              關閉
            </button>
          </div>
          <div className="battle-log">
            {result.text && <div>{result.text}</div>}
            {result.narrative && (
              <NarrativeDisplay text={result.narrative} done={true} />
            )}
            {result.durabilityText && <div>{result.durabilityText}</div>}
            {result.reward && <div>{result.reward}</div>}
            {result.battleLog && typeof result.battleLog === 'string' && <div>{result.battleLog}</div>}
            {result.colEarned > 0 && (
              <div style={{ color: "var(--gold)" }}>
                +{result.colEarned} Col
              </div>
            )}
            {result.autoSellCol > 0 && (
              <div style={{ color: "var(--gold)", fontSize: "0.8rem" }}>
                自動出售收入：+{result.autoSellCol} Col
              </div>
            )}
            {result.colSpent > 0 && (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                委託費：-{result.colSpent} Col
              </div>
            )}
            {result.floor && (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                📍 第 {result.floor} 層 {result.floorName}
              </div>
            )}
            {result.weapon && (
              <div
                style={{
                  marginTop: "0.5rem",
                  border: result.weapon.rarityColor
                    ? `1px solid ${result.weapon.rarityColor}`
                    : undefined,
                  borderRadius: "6px",
                  padding: "0.5rem",
                  boxShadow: result.weapon.rarityColor
                    ? `0 0 10px ${result.weapon.rarityColor}55`
                    : undefined,
                }}
              >
                {result.weapon.rarityLabel && (
                  <div
                    className="rarity-badge"
                    style={{
                      color: result.weapon.rarityColor,
                      borderColor: result.weapon.rarityColor,
                      marginBottom: "0.4rem",
                    }}
                  >
                    {result.weapon.rarityLabel}
                    {result.weapon.totalScore != null && (
                      <span className="rarity-score">
                        {result.weapon.totalScore}
                      </span>
                    )}
                  </div>
                )}
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

            {result.newStatDiscovery && (
              <div style={{
                marginTop: "0.4rem",
                padding: "0.3rem 0.5rem",
                background: "var(--bg-hover)",
                borderRadius: "4px",
                fontSize: "0.8rem",
                border: "1px solid var(--accent)",
              }}>
                記錄書更新：<strong>{result.newStatDiscovery.itemName}</strong> → <strong style={{ color: "var(--accent)" }}>{{ hp: "HP", atk: "ATK", def: "DEF", agi: "AGI", cri: "CRI", durability: "耐久" }[result.newStatDiscovery.stat] || result.newStatDiscovery.stat}</strong>
              </div>
            )}

            {result.randomEvent && (
              <RandomEventDisplay event={result.randomEvent} />
            )}

            {result.lcEncounter && (
              <LcEncounterNotice
                encounter={result.lcEncounter}
                doAction={doAction}
                isDisabled={isDisabled}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function LcEncounterNotice({ encounter, doAction, isDisabled }) {
  const [busy, setBusy] = useState(false);

  const handleInfiltrate = async () => {
    setBusy(true);
    await doAction("lcInfiltrate");
    setBusy(false);
  };

  const handleIgnore = async () => {
    setBusy(true);
    await doAction("lcIgnore");
    setBusy(false);
  };

  return (
    <div style={{
      border: "1px solid rgba(239, 68, 68, 0.5)",
      background: "rgba(239, 68, 68, 0.08)",
      borderRadius: "8px",
      padding: "0.75rem 1rem",
      marginTop: "0.75rem",
    }}>
      <div style={{ fontWeight: "bold", color: "#ef4444", marginBottom: "0.4rem" }}>
        發現微笑棺木據點！
      </div>
      <div style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
        你在第 {encounter.baseFloor} 層發現了微笑棺木公會的藏匿點。要潛入調查嗎？
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          className="btn-danger"
          onClick={handleInfiltrate}
          disabled={isDisabled || busy}
          style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}
        >
          {busy ? "潛入中..." : "潛入調查"}
        </button>
        <button
          className="btn-secondary"
          onClick={handleIgnore}
          disabled={isDisabled || busy}
          style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}
        >
          無視
        </button>
      </div>
    </div>
  );
}

function LcInfiltrationResult({ result }) {
  if (result.outcome === "stealth") {
    return (
      <div style={{
        border: "1px solid rgba(74, 222, 128, 0.4)",
        background: "rgba(74, 222, 128, 0.08)",
        borderRadius: "8px",
        padding: "0.75rem 1rem",
        marginTop: "0.75rem",
      }}>
        <div style={{ fontWeight: "bold", color: "#4ade80", marginBottom: "0.4rem" }}>
          潛行成功！
        </div>
        {result.hasLoot ? (
          <div style={{ fontSize: "0.85rem" }}>
            你成功潛入據點，從贓物池中取回了物品：
            {result.loot.col > 0 && <div style={{ color: "var(--gold)" }}>+{result.loot.col.toLocaleString()} Col</div>}
            {result.loot.materials.map((m, i) => (
              <div key={i} style={{ color: "#4ade80" }}>取回素材：{m.itemName}</div>
            ))}
            {result.loot.weapons.map((w, i) => (
              <div key={i} style={{ color: "#a78bfa" }}>取回武器：{w.weaponName}</div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            你成功潛入據點，但贓物池是空的。
          </div>
        )}
      </div>
    );
  }

  if (result.outcome === "escape") {
    return (
      <div style={{
        border: "1px solid rgba(251, 191, 36, 0.4)",
        background: "rgba(251, 191, 36, 0.08)",
        borderRadius: "8px",
        padding: "0.75rem 1rem",
        marginTop: "0.75rem",
      }}>
        <div style={{ fontWeight: "bold", color: "#fbbf24", marginBottom: "0.4rem" }}>
          被發現但成功逃脫
        </div>
        <div style={{ fontSize: "0.85rem" }}>{result.text}</div>
      </div>
    );
  }

  if (result.outcome === "win") {
    return (
      <div style={{
        border: "1px solid rgba(74, 222, 128, 0.4)",
        background: "rgba(74, 222, 128, 0.08)",
        borderRadius: "8px",
        padding: "0.75rem 1rem",
        marginTop: "0.75rem",
      }}>
        <div style={{ fontWeight: "bold", color: "#4ade80", marginBottom: "0.4rem" }}>
          潛入戰鬥 — 勝利！
        </div>
        <div style={{ fontSize: "0.85rem" }}>
          擊敗了 {result.enemyName}！
          {!result.isGrunt && <span style={{ color: "#ef4444" }}> 該成員已被永久擊殺！</span>}
        </div>
        {result.rewards?.col > 0 && (
          <div style={{ color: "var(--gold)" }}>+{result.rewards.col.toLocaleString()} Col</div>
        )}
      </div>
    );
  }

  if (result.outcome === "lose") {
    return (
      <div style={{
        border: "1px solid rgba(248, 113, 113, 0.4)",
        background: "rgba(248, 113, 113, 0.08)",
        borderRadius: "8px",
        padding: "0.75rem 1rem",
        marginTop: "0.75rem",
      }}>
        <div style={{ fontWeight: "bold", color: "#f87171", marginBottom: "0.4rem" }}>
          潛入戰鬥 — 敗北
        </div>
        <div style={{ fontSize: "0.85rem" }}>
          被 {result.enemyName} 擊敗了...
        </div>
        {result.losses?.col > 0 && (
          <div style={{ color: "#f87171" }}>-{result.losses.col.toLocaleString()} Col</div>
        )}
        {result.losses?.material && (
          <div style={{ color: "#f87171", fontSize: "0.85rem" }}>失去素材：{result.losses.material.name}</div>
        )}
        {result.losses?.weapon && (
          <div style={{ color: "#f87171", fontSize: "0.85rem" }}>失去武器：{result.losses.weapon.name}</div>
        )}
        {result.losses?.npcDeath && (
          <div style={{ color: "#f87171", fontWeight: "bold", fontSize: "0.85rem" }}>{result.losses.npcDeath.name} 陣亡</div>
        )}
      </div>
    );
  }

  return null;
}
