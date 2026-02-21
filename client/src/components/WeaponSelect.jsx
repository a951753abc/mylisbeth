import React from "react";

const TYPE_LABELS = {
  one_handed_sword: "片手劍",
  two_handed_sword: "両手劍",
  two_handed_axe: "両手斧",
  mace: "戰鎚",
  katana: "刀",
  curved_sword: "曲劍",
  rapier: "細劍",
  dagger: "短劍",
  spear: "槍",
  bow: "弓",
  shield: "盾",
};

/**
 * 共用武器下拉選單
 * @param {object} props
 * @param {Array} props.weapons - 武器陣列（需有 index, weaponName, rarityLabel, name, atk, durability）
 * @param {string} props.value - 目前選取的值
 * @param {function} props.onChange - onChange handler
 * @param {string} [props.placeholder] - 預設選項文字
 * @param {boolean} [props.showName] - 顯示武器類型名（[name]）
 * @param {boolean} [props.showAtk] - 顯示 ATK（預設 true）
 * @param {boolean} [props.showDur] - 顯示耐久
 * @param {boolean} [props.showType] - 顯示武器類型
 * @param {boolean} [props.showInnate] - 顯示固有效果
 * @param {object} [props.style] - 額外 style
 */
export default function WeaponSelect({
  weapons,
  value,
  onChange,
  placeholder = "— 選擇武器 —",
  showName = false,
  showAtk = true,
  showDur = false,
  showType = false,
  showInnate = false,
  style,
}) {
  return (
    <select value={value} onChange={onChange} style={style}>
      {placeholder != null && <option value="">{placeholder}</option>}
      {(weapons || []).map((w) => {
        const typeLabel = showType && w.type ? TYPE_LABELS[w.type] || w.type : "";
        const innateLabel = showInnate && w.innateEffects && w.innateEffects.length > 0
          ? ` [${w.innateEffects.map((e) => e.name).join("+")}]`
          : "";

        return (
          <option key={w.index} value={String(w.index)}>
            #{w.index}{" "}
            {w.rarityLabel ? `【${w.rarityLabel}】` : ""}
            {w.weaponName}
            {showName ? ` [${w.name}]` : ""}
            {typeLabel ? ` (${typeLabel})` : ""}
            {showAtk ? ` ATK:${w.atk}` : ""}
            {showDur ? ` 耐久:${w.durability}` : ""}
            {innateLabel}
          </option>
        );
      })}
    </select>
  );
}
