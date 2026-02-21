/**
 * 遊戲文字覆蓋管理器
 * 鏡像 configManager.js 的架構，用於管理 gameText.js 的即時覆蓋。
 * MongoDB collection: text_overrides, document _id: "game_text"
 */
const db = require("../db.js");
const gameText = require("./gameText.js");

// 深複製原始預設值
const defaults = JSON.parse(JSON.stringify(gameText));

/** 依點分隔路徑取值 */
function getPath(obj, path, defaultValue) {
  const keys = path.split(".");
  let result = obj;
  for (const key of keys) {
    if (result == null || typeof result !== "object") return defaultValue;
    result = result[key];
  }
  return result === undefined ? defaultValue : result;
}

/** 依點分隔路徑設值 */
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
 * 取得當前文字模板（已套用覆蓋）
 * @param {string} key - 點分隔路徑，如 "MINE.CAPACITY_FULL"
 * @returns {string|undefined}
 */
function getText(key) {
  return getPath(gameText, key, undefined);
}

/**
 * 取得文字並替換模板變數 {placeholder}
 * @param {string} key - 點分隔路徑，如 "SYSTEM.COOLDOWN"
 * @param {object} [vars={}] - 變數替換，如 { remaining: 5 }
 * @returns {string}
 */
function formatText(key, vars = {}) {
  const template = getText(key);
  if (!template) return key;
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    return vars[name] !== undefined ? String(vars[name]) : match;
  });
}

/** 啟動時從 DB 載入覆蓋值 */
async function loadOverrides() {
  const doc = await db.findOne("text_overrides", { _id: "game_text" });
  if (!doc || !doc.overrides) return;

  const entries = Object.entries(doc.overrides);
  for (const [path, value] of entries) {
    setPath(gameText, path, value);
  }
  console.log(`Loaded ${entries.length} text override(s).`);
}

/** 設定單一文字覆蓋 */
async function setOverride(path, value, adminUsername) {
  if (getPath(defaults, path) === undefined) {
    throw new Error(`文字路徑 "${path}" 不存在`);
  }
  if (typeof value !== "string") {
    throw new Error("文字值必須為字串");
  }

  await db.upsert("text_overrides", { _id: "game_text" }, {
    $set: {
      [`overrides.${path}`]: value,
      updatedAt: Date.now(),
      updatedBy: adminUsername,
    },
  });

  setPath(gameText, path, value);
}

/** 還原單一文字為預設值 */
async function resetOverride(path, adminUsername) {
  const defaultVal = getPath(defaults, path);
  if (defaultVal === undefined) {
    throw new Error(`文字路徑 "${path}" 不存在`);
  }

  await db.upsert("text_overrides", { _id: "game_text" }, {
    $unset: { [`overrides.${path}`]: "" },
    $set: { updatedAt: Date.now(), updatedBy: adminUsername },
  });

  setPath(gameText, path, defaultVal);
}

/** 還原所有文字覆蓋 */
async function resetAll(adminUsername) {
  await db.upsert("text_overrides", { _id: "game_text" }, {
    $set: { overrides: {}, updatedAt: Date.now(), updatedBy: adminUsername },
  });

  const deepRestore = (source, target, prefix = "") => {
    for (const key of Object.keys(source)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      if (typeof source[key] === "object" && source[key] !== null && !Array.isArray(source[key])) {
        deepRestore(source[key], target, fullPath);
      } else {
        setPath(target, fullPath, JSON.parse(JSON.stringify(source[key])));
      }
    }
  };
  deepRestore(defaults, gameText);
}

function getDefaults() { return defaults; }

async function getOverrides() {
  const doc = await db.findOne("text_overrides", { _id: "game_text" });
  return doc?.overrides || {};
}

function getCurrentTexts() { return gameText; }

module.exports = {
  getText,
  formatText,
  loadOverrides,
  setOverride,
  resetOverride,
  resetAll,
  getDefaults,
  getOverrides,
  getCurrentTexts,
};
