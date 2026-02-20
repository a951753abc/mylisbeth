import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import "./ForgeAnimation.css";
import { getRarityConfig } from "../utils/rarity.js";

// Phase durations in ms
const phaseDuration = {
  hammer: (cfg) => 1000 + cfg.hammerHits * 300,
  glow:   (cfg) => 600  + cfg.extraDelay,
  flash:  (cfg) => 350  + Math.floor(cfg.extraDelay * 0.5),
};

function generateParticles(count, color) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (360 / count) * i + Math.random() * (360 / count);
    const dist  = 80 + Math.random() * 120;
    const rad   = (angle * Math.PI) / 180;
    return {
      id:       i,
      dx:       Math.cos(rad) * dist,
      dy:       Math.sin(rad) * dist,
      size:     4 + Math.random() * 6,
      duration: 0.8 + Math.random() * 0.7,
      color,
    };
  });
}

function generateSparks(count) {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.random() * 2 * Math.PI;
    const dist  = 35 + Math.random() * 55;
    return {
      id:    i,
      dx:    Math.cos(angle) * dist,
      dy:    Math.sin(angle) * dist - 15,
      size:  3 + Math.random() * 4,
      delay: Math.random() * 1.2,
    };
  });
}

export default function ForgeAnimation({ weapon, forgeText, onComplete, onRenamed }) {
  const isBroken = weapon?.durability <= 0;
  const config   = getRarityConfig(weapon?.rarity);

  const rarityColor = isBroken ? "#ef4444" : config.color;
  const rarityGlow  = isBroken ? "rgba(239,68,68,0.4)" : config.glowColor;
  const rarityLabel = isBroken ? "碎裂" : config.label;

  const [phase, setPhase]       = useState("hammer");
  const [particles, setParticles] = useState([]);
  const timerRef = useRef(null);

  // Rename state
  const [displayName, setDisplayName] = useState(weapon?.weaponName || "");
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renameMsg, setRenameMsg] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [renamed, setRenamed] = useState(false);
  const renameInputRef = useRef(null);

  const sparks = useMemo(
    () => generateSparks(config.hammerHits + 4),
    [config.hammerHits],
  );

  const goToReveal = useCallback(() => {
    clearTimeout(timerRef.current);
    setParticles(generateParticles(isBroken ? 20 : config.particles, rarityColor));
    setPhase("reveal");
  }, [config.particles, isBroken, rarityColor]);

  useEffect(() => {
    if (phase === "hammer") {
      timerRef.current = setTimeout(
        () => setPhase("glow"),
        phaseDuration.hammer(config),
      );
    } else if (phase === "glow") {
      timerRef.current = setTimeout(
        () => setPhase("flash"),
        phaseDuration.glow(config),
      );
    } else if (phase === "flash") {
      timerRef.current = setTimeout(goToReveal, phaseDuration.flash(config));
    }
    return () => clearTimeout(timerRef.current);
  }, [phase, config, goToReveal]);

  const handleRename = async () => {
    if (!renameName.trim() || renameBusy) return;
    setRenameBusy(true);
    setRenameMsg("");
    try {
      const res = await fetch("/api/game/rename-weapon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          weaponIndex: weapon.weaponIndex,
          newName: renameName.trim(),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setRenameMsg(data.error);
      } else {
        setDisplayName(data.weaponName);
        setRenamed(true);
        setRenaming(false);
        setRenameMsg("");
        if (onRenamed) onRenamed();
      }
    } catch {
      setRenameMsg("改名失敗");
    }
    setRenameBusy(false);
  };

  const handleClick = (e) => {
    // Don't close if interacting with rename UI
    if (renaming) return;
    if (phase === "reveal") {
      onComplete();
    } else {
      goToReveal();
    }
  };

  return (
    <div className="fa-overlay" onClick={handleClick}>
      <div className="fa-stage">

        {/* Phase 1: 打鐵 */}
        {phase === "hammer" && (
          <div className="fa-hammer-scene">
            <div className="fa-anvil">⚒️</div>
            <div
              className="fa-hammer"
              style={{
                animationDuration: `${0.55 - config.hammerHits * 0.04}s`,
              }}
            >
              🔨
            </div>
            {sparks.map((s) => (
              <div
                key={s.id}
                className="fa-spark"
                style={{
                  "--s-dx":    `${s.dx}px`,
                  "--s-dy":    `${s.dy}px`,
                  "--s-size":  `${s.size}px`,
                  animationDelay: `${s.delay}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Phase 2: 聚光 */}
        {phase === "glow" && (
          <div className="fa-glow-scene">
            <div className="fa-glow-orb" />
          </div>
        )}

        {/* Phase 3: 閃光 */}
        {phase === "flash" && (
          <div className="fa-flash-scene">
            <div
              className="fa-flash-burst"
              style={{ "--rarity-color": rarityColor }}
            />
          </div>
        )}

        {/* Phase 4: 揭曉 */}
        {phase === "reveal" && (
          <div className="fa-reveal-scene">
            {/* 粒子 */}
            <div className="fa-particles" aria-hidden="true">
              {particles.map((p) => (
                <div
                  key={p.id}
                  className="fa-particle"
                  style={{
                    "--p-dx":       `${p.dx}px`,
                    "--p-dy":       `${p.dy}px`,
                    "--p-size":     `${p.size}px`,
                    "--p-duration": `${p.duration}s`,
                    "--p-color":    p.color,
                  }}
                />
              ))}
            </div>

            {/* 武器卡片 */}
            <div
              className={`fa-weapon-card ${isBroken ? "fa-weapon-broken" : ""}`}
              style={{
                "--rarity-color": rarityColor,
                "--rarity-glow":  rarityGlow,
              }}
            >
              <div
                className="fa-rarity-badge"
                style={{ color: rarityColor }}
              >
                {rarityLabel}
              </div>
              <div className="fa-weapon-name">{displayName}</div>
              <div className="fa-weapon-type">[{weapon.name}]</div>

              {/* Rename UI */}
              {!isBroken && weapon.weaponIndex >= 0 && (weapon.renameCount || 0) < 1 && !renamed && (
                <div className="fa-rename-section" onClick={(e) => e.stopPropagation()}>
                  {!renaming ? (
                    <button
                      className="fa-rename-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenaming(true);
                        setRenameName(weapon.weaponName);
                        setTimeout(() => renameInputRef.current?.focus(), 50);
                      }}
                    >
                      ✏️ 命名
                    </button>
                  ) : (
                    <div className="fa-rename-form">
                      <input
                        ref={renameInputRef}
                        type="text"
                        className="fa-rename-input"
                        value={renameName}
                        onChange={(e) => setRenameName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename();
                          if (e.key === "Escape") setRenaming(false);
                        }}
                        maxLength={20}
                        placeholder="輸入武器名稱"
                      />
                      <button
                        className="fa-rename-confirm"
                        disabled={renameBusy || !renameName.trim()}
                        onClick={handleRename}
                      >
                        {renameBusy ? "..." : "確定"}
                      </button>
                      <button
                        className="fa-rename-cancel"
                        onClick={() => setRenaming(false)}
                      >
                        取消
                      </button>
                    </div>
                  )}
                  {renameMsg && <div className="fa-rename-msg">{renameMsg}</div>}
                </div>
              )}
              {renamed && (
                <div className="fa-rename-done">✅ 已命名</div>
              )}
              <div className="fa-stat-grid">
                <div className="fa-stat">
                  <span className="fa-stat-label">ATK</span>
                  <span className="fa-stat-val">{weapon.atk}</span>
                </div>
                <div className="fa-stat">
                  <span className="fa-stat-label">DEF</span>
                  <span className="fa-stat-val">{weapon.def}</span>
                </div>
                <div className="fa-stat">
                  <span className="fa-stat-label">AGI</span>
                  <span className="fa-stat-val">{weapon.agi}</span>
                </div>
                <div className="fa-stat">
                  <span className="fa-stat-label">CRI</span>
                  <span className="fa-stat-val">{weapon.cri}</span>
                </div>
                <div className="fa-stat">
                  <span className="fa-stat-label">HP</span>
                  <span className="fa-stat-val">{weapon.hp}</span>
                </div>
                <div className="fa-stat">
                  <span className="fa-stat-label">耐久</span>
                  <span
                    className="fa-stat-val"
                    style={{ color: weapon.durability <= 0 ? "#ef4444" : undefined }}
                  >
                    {weapon.durability}
                  </span>
                </div>
              </div>
              {forgeText && (
                <div className="fa-forge-text">{forgeText}</div>
              )}
              <div className="fa-hint">{renaming ? "Enter 確認 / Esc 取消" : "點擊關閉"}</div>
            </div>
          </div>
        )}

        {phase !== "reveal" && (
          <div className="fa-skip-hint">點擊跳過</div>
        )}
      </div>
    </div>
  );
}
