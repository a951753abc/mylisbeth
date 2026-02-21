import { useState } from "react";

/**
 * 決鬥 UI 共用狀態 hook（玩家決鬥 / NPC 決鬥共用）
 * @param {string} [defaultMode="half_loss"] - 預設決鬥模式
 */
export default function useDuelState(defaultMode = "half_loss") {
  const [target, setTarget] = useState(null);
  const [mode, setMode] = useState(defaultMode);
  const [weapon, setWeapon] = useState("");
  const [wager, setWager] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const reset = () => {
    setTarget(null);
    setResult(null);
    setError("");
  };

  return {
    target, setTarget,
    mode, setMode,
    weapon, setWeapon,
    wager, setWager,
    busy, setBusy,
    result, setResult,
    error, setError,
    reset,
  };
}
