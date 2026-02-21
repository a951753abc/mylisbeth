/**
 * 路由共用工具
 */

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

function emitSocketEvents(io, events) {
  if (!io || !events) return;
  for (const evt of events) {
    io.emit(evt.event, evt.data);
  }
}

module.exports = { handleRoute, emitSocketEvents };
