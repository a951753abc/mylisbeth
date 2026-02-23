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

export default function GamePanel({ user, onAction, setCooldown, onUserUpdate, cooldownActive, onSetTitle }) {
  const [result, setResult] = useState(null);
  const [forgeResult, setForgeResult] = useState(null);
  const [error, setError] = useState("");
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
    setResult(null);
    const data = await onAction(action, body);
    if (data.error) {
      setError(data.error);
      if (data.cooldown) setCooldown(data.cooldown);
    } else if (action === "forge" && data.weapon) {
      setForgeResult(data);
      if (data.stamina !== undefined) setLocalStamina(data.stamina);
      if (data.lastStaminaRegenAt !== undefined) setLocalLastRegenAt(data.lastStaminaRegenAt);
    } else {
      setResult(data);
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
            setForgeResult(null);
          }}
          onRenamed={() => {
            if (onUserUpdate) onUserUpdate();
          }}
        />
      )}

      {error && <div className="error-msg">{error}</div>}

      {/* Result display */}
      {result && (
        <div className="card result-card-highlight">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>結果</h2>
            <button
              className="btn-secondary"
              onClick={() => setResult(null)}
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
            {result.battleLog && <div>{result.battleLog}</div>}
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
                紀錄書更新：<strong>{result.newStatDiscovery.itemName}</strong> → <strong style={{ color: "var(--accent)" }}>{{ hp: "HP", atk: "ATK", def: "DEF", agi: "AGI", cri: "CRI", durability: "耐久" }[result.newStatDiscovery.stat] || result.newStatDiscovery.stat}</strong>
              </div>
            )}

            {result.randomEvent && (
              <RandomEventDisplay event={result.randomEvent} />
            )}
          </div>
        </div>
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

      <ForgeSection
        user={user}
        doAction={doAction}
        isDisabled={isDisabled}
        displayStamina={displayStamina}
        forgeLevel={user.forgeLevel ?? 1}
      />

      <UpgradeSection
        user={user}
        doAction={doAction}
        isDisabled={isDisabled}
        displayStamina={displayStamina}
      />

      <AdventureSection
        user={user}
        doAction={doAction}
        isDisabled={isDisabled}
        busy={busy}
        cooldownActive={cooldownActive}
      />

      <SoloAdvSection
        user={user}
        doAction={doAction}
        isDisabled={isDisabled}
        busy={busy}
        cooldownActive={cooldownActive}
        displayStamina={displayStamina}
      />

      <DuelSetupSection
        user={user}
        isDisabled={isDisabled}
        onUserUpdate={onUserUpdate}
      />
    </div>
  );
}
