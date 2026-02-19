import { useState, useEffect, useRef } from "react";

// 每點體力回復間隔：300,000ms / 20 = 15,000ms
const MS_PER_REGEN = 15_000;

/**
 * 純函式：依目前時間計算體力預測狀態。
 * @param {number} baseStamina - 伺服器確認的體力值
 * @param {number} maxStamina
 * @param {number} lastRegenAt - 上次回復時間戳（ms），必須為有效數值
 * @param {number} now - 目前時間戳（ms）
 * @returns {{ displayStamina, secondsToNext, secondsToFull, isFull }}
 */
export function calcStaminaState(baseStamina, maxStamina, lastRegenAt, now) {
  if (baseStamina >= maxStamina) {
    return {
      displayStamina: maxStamina,
      secondsToNext: 0,
      secondsToFull: 0,
      isFull: true,
    };
  }

  const elapsed = now - lastRegenAt;
  const regenPoints = Math.floor(elapsed / MS_PER_REGEN);
  const displayStamina = Math.min(maxStamina, baseStamina + regenPoints);

  if (displayStamina >= maxStamina) {
    return {
      displayStamina: maxStamina,
      secondsToNext: 0,
      secondsToFull: 0,
      isFull: true,
    };
  }

  // 距下一點回復的剩餘毫秒
  const msIntoCurrentCycle = elapsed % MS_PER_REGEN;
  const msToNext = MS_PER_REGEN - msIntoCurrentCycle;
  const secondsToNext = Math.ceil(msToNext / 1000);

  // 距回滿的剩餘秒數（從現在算）
  const remaining = maxStamina - displayStamina;
  const secondsToFull = Math.ceil(msToNext / 1000) + (remaining - 1) * (MS_PER_REGEN / 1000);

  return {
    displayStamina,
    secondsToNext,
    secondsToFull,
    isFull: false,
  };
}

/**
 * 將秒數格式化為 m:ss（例如 90 → "1:30"）
 */
export function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Hook：每秒更新體力倒數計時狀態。
 * @param {{ stamina, maxStamina, lastStaminaRegenAt, localStamina, localLastRegenAt }} props
 */
export function useStaminaTimer({ stamina, maxStamina, lastStaminaRegenAt, localStamina, localLastRegenAt }) {
  const baseStamina = localStamina !== null && localStamina !== undefined ? localStamina : (stamina ?? maxStamina);
  const rawRegenAt = localLastRegenAt !== null && localLastRegenAt !== undefined ? localLastRegenAt : lastStaminaRegenAt;

  // 當伺服器尚未提供 lastStaminaRegenAt 時，用掛載時的時間戳作為臨時基準
  // 一旦收到伺服器真實值就丟棄 fallback
  const fallbackRef = useRef(null);
  if (rawRegenAt == null && baseStamina < maxStamina && fallbackRef.current == null) {
    fallbackRef.current = Date.now();
  }
  if (rawRegenAt != null) {
    fallbackRef.current = null;
  }
  const baseRegenAt = rawRegenAt ?? fallbackRef.current;

  const [timerState, setTimerState] = useState(() =>
    calcStaminaState(baseStamina, maxStamina, baseRegenAt ?? Date.now(), Date.now())
  );

  const intervalRef = useRef(null);

  useEffect(() => {
    const effectiveRegenAt = baseRegenAt ?? Date.now();

    // 重新計算（輸入值變動或掛載時）
    const update = () => {
      const state = calcStaminaState(baseStamina, maxStamina, effectiveRegenAt, Date.now());
      setTimerState(state);
      if (state.isFull && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    update();

    if (baseStamina < maxStamina) {
      intervalRef.current = setInterval(update, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [baseStamina, maxStamina, baseRegenAt]);

  return timerState;
}
