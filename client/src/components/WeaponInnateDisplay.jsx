import React from "react";

const EFFECT_LABELS = {
  damage_mult: "傷害倍率",
  agi_boost: "敏捷加成",
  def_boost: "防禦加成",
  atk_boost: "攻擊加成",
  cri_boost: "暴擊強化",
  lifesteal: "生命吸取",
  ignore_def: "無視防禦",
  stun: "暈眩機率",
  evasion_boost: "閃避加成",
  damage_reduction: "傷害減免",
  counter: "反擊機率",
  initiative: "先手攻擊",
};

function formatEffect(effect) {
  const label = EFFECT_LABELS[effect.type] || effect.type;
  if (typeof effect.value === "boolean") return label;
  if (effect.value <= 1 && effect.type !== "stun" && effect.type !== "counter") {
    return `${label} ${effect.value > 0 ? "+" : ""}${Math.round(effect.value * 100)}%`;
  }
  return `${label} +${effect.value}`;
}

export default function WeaponInnateDisplay({ innateEffects }) {
  if (!innateEffects || innateEffects.length === 0) return null;

  return (
    <div style={{ marginTop: "0.2rem" }}>
      {innateEffects.map((ie, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            padding: "0.1rem 0.3rem",
            marginRight: "0.3rem",
            fontSize: "0.7rem",
            background: "rgba(168, 85, 247, 0.15)",
            borderRadius: "3px",
            color: "#a855f7",
          }}
          title={formatEffect(ie.effect)}
        >
          {ie.name}
        </span>
      ))}
    </div>
  );
}
