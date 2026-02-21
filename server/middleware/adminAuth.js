const bcrypt = require("bcrypt");
const db = require("../db.js");

// 簡易速率限制：記憶體計數器
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

// 每 10 分鐘清理過期的登入嘗試紀錄，防止記憶體洩漏
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts) {
    if (now - record.firstAttempt > LOCKOUT_MS) {
      loginAttempts.delete(ip);
    }
  }
}, 10 * 60 * 1000).unref();

function checkRateLimit(ip) {
  const record = loginAttempts.get(ip);
  if (!record) return true;
  if (Date.now() - record.firstAttempt > LOCKOUT_MS) {
    loginAttempts.delete(ip);
    return true;
  }
  return record.count < MAX_ATTEMPTS;
}

function recordFailedAttempt(ip) {
  const record = loginAttempts.get(ip);
  if (!record) {
    loginAttempts.set(ip, { count: 1, firstAttempt: Date.now() });
  } else {
    record.count++;
  }
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

async function adminLogin(req, res) {
  const ip = req.ip;
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "登入嘗試過多，請 5 分鐘後再試" });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "請輸入帳號和密碼" });
  }

  try {
    const admin = await db.findOne("admin_users", { username });
    if (!admin) {
      recordFailedAttempt(ip);
      return res.status(401).json({ error: "帳號或密碼錯誤" });
    }

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) {
      recordFailedAttempt(ip);
      return res.status(401).json({ error: "帳號或密碼錯誤" });
    }

    clearAttempts(ip);
    req.session.admin = { username: admin.username, role: admin.role };
    await db.update("admin_users", { username }, {
      $set: { lastLoginAt: Date.now() },
    });
    res.json({ success: true, admin: { username: admin.username, role: admin.role } });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
}

function ensureAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.status(401).json({ error: "未登入管理後台" });
}

module.exports = { adminLogin, ensureAdmin };
