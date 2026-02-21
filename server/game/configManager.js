const db = require("../db.js");
const config = require("./config.js");

// 深複製原始預設值（在任何覆蓋前）
const defaults = JSON.parse(JSON.stringify(config));

/** 依點分隔路徑取值，如 getPath(obj, "PVP.WAGER_MAX", 0) */
function getPath(obj, path, defaultValue) {
  const keys = path.split(".");
  let result = obj;
  for (const key of keys) {
    if (result == null || typeof result !== "object") return defaultValue;
    result = result[key];
  }
  return result === undefined ? defaultValue : result;
}

/** 依點分隔路徑設值，如 setPath(obj, "PVP.WAGER_MAX", 500) */
function setPath(obj, path, value) {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] == null || typeof current[keys[i]] !== "object") {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

/**
 * 啟動時載入 DB 覆蓋值，直接修改記憶體中的 config 物件
 */
async function loadOverrides() {
  const doc = await db.findOne("config_overrides", { _id: "game_config" });
  if (!doc || !doc.overrides) return;

  const entries = Object.entries(doc.overrides);
  for (const [path, value] of entries) {
    setPath(config, path, value);
  }
  console.log(`Loaded ${entries.length} config override(s).`);
}

/**
 * 設定單一覆蓋值
 */
async function setOverride(path, value, adminUsername) {
  // 驗證路徑存在於預設值中
  if (getPath(defaults, path) === undefined) {
    throw new Error(`設定路徑 "${path}" 不存在`);
  }

  // 驗證型別一致
  const defaultVal = getPath(defaults, path);
  if (typeof defaultVal !== typeof value && defaultVal !== null) {
    throw new Error(
      `型別不一致：預期 ${typeof defaultVal}，收到 ${typeof value}`,
    );
  }

  // 持久化到 DB
  await db.upsert("config_overrides", { _id: "game_config" }, {
    $set: {
      [`overrides.${path}`]: value,
      updatedAt: Date.now(),
      updatedBy: adminUsername,
    },
  });

  // 即時生效
  setPath(config, path, value);
}

/**
 * 還原單一設定為預設值
 */
async function resetOverride(path, adminUsername) {
  const defaultVal = getPath(defaults, path);
  if (defaultVal === undefined) {
    throw new Error(`設定路徑 "${path}" 不存在`);
  }

  await db.upsert("config_overrides", { _id: "game_config" }, {
    $unset: { [`overrides.${path}`]: "" },
    $set: { updatedAt: Date.now(), updatedBy: adminUsername },
  });

  setPath(config, path, defaultVal);
}

/**
 * 還原所有覆蓋值
 */
async function resetAll(adminUsername) {
  await db.upsert("config_overrides", { _id: "game_config" }, {
    $set: { overrides: {}, updatedAt: Date.now(), updatedBy: adminUsername },
  });

  // 從 defaults 還原所有值到 config
  const deepRestore = (source, target, prefix = "") => {
    for (const key of Object.keys(source)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      if (
        typeof source[key] === "object" &&
        source[key] !== null &&
        !Array.isArray(source[key])
      ) {
        deepRestore(source[key], target, fullPath);
      } else {
        setPath(target, fullPath, JSON.parse(JSON.stringify(source[key])));
      }
    }
  };
  deepRestore(defaults, config);
}

function getDefaults() {
  return defaults;
}

async function getOverrides() {
  const doc = await db.findOne("config_overrides", { _id: "game_config" });
  return doc?.overrides || {};
}

function getCurrentConfig() {
  return config;
}

module.exports = {
  loadOverrides,
  setOverride,
  resetOverride,
  resetAll,
  getDefaults,
  getOverrides,
  getCurrentConfig,
};
