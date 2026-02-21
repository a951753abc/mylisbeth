/**
 * 建立 GM 管理員帳號
 * 用法: ADMIN_USER=admin ADMIN_PASS=你的密碼 node server/scripts/seed-admin.js
 */
require("dotenv").config();
const bcrypt = require("bcrypt");
const db = require("../db.js");

async function seed() {
  await db.connect();

  const username = process.env.ADMIN_USER || "admin";
  const password = process.env.ADMIN_PASS;

  if (!password) {
    console.error("請設定 ADMIN_PASS 環境變數");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  await db.upsert("admin_users", { username }, {
    $set: { username, passwordHash: hash, role: "superadmin", lastLoginAt: null },
    $setOnInsert: { createdAt: Date.now() },
  });

  console.log(`管理員帳號 "${username}" 已建立/更新。`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed admin failed:", err);
  process.exit(1);
});
