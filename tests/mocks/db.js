/**
 * 中央 db.js mock
 * 所有函式預設 vi.fn()，可在個別測試中 override
 */
const { vi } = require("vitest");

const db = {
  findOne: vi.fn(),
  find: vi.fn(),
  update: vi.fn(),
  findOneAndUpdate: vi.fn(),
  atomicIncItem: vi.fn(),
  upsert: vi.fn(),
  saveItemToUser: vi.fn(),
  removeItemFromUser: vi.fn(),
};

module.exports = db;
