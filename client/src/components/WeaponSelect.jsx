import React from "react";

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
  style,
}) {
  return (
    <select value={value} onChange={onChange} style={style}>
      {placeholder != null && <option value="">{placeholder}</option>}
      {(weapons || []).map((w) => (
        <option key={w.index} value={String(w.index)}>
          #{w.index}{" "}
          {w.rarityLabel ? `【${w.rarityLabel}】` : ""}
          {w.weaponName}
          {showName ? ` [${w.name}]` : ""}
          {showAtk ? ` ATK:${w.atk}` : ""}
          {showDur ? ` 耐久:${w.durability}` : ""}
        </option>
      ))}
    </select>
  );
}
