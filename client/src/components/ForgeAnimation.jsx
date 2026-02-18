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

export default function ForgeAnimation({ weapon, forgeText, onComplete }) {
  const isBroken = weapon?.durability <= 0;
  const config   = getRarityConfig(weapon?.rarity);

  const rarityColor = isBroken ? "#ef4444" : config.color;
  const rarityGlow  = isBroken ? "rgba(239,68,68,0.4)" : config.glowColor;
  const rarityLabel = isBroken ? "碎裂" : config.label;

  const [phase, setPhase]       = useState("hammer");
  const [particles, setParticles] = useState([]);
  const timerRef = useRef(null);

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

  const handleClick = () => {
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
              <div className="fa-weapon-name">{weapon.weaponName}</div>
              <div className="fa-weapon-type">[{weapon.name}]</div>
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
              <div className="fa-hint">點擊關閉</div>
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
