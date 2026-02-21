/**
 * 路由共用工具
 */
const emitter = require("../../socket/emitter.js");

async function handleRoute(res, fn, label) {
  try {
    const result = await fn();
    if (result?.error) return res.status(400).json(result);
    return res.json(result);
  } catch (err) {
    console.error(`${label}:`, err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }
}

module.exports = { handleRoute, emitSocketEvents: emitter.emitSocketEvents };
