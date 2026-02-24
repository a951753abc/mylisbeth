/**
 * 路由載入煙霧測試
 * 確保所有路由檔案的 require 路徑可解析，且解構 export 不為 undefined。
 * 此測試防止 import 路徑錯誤導致 app 啟動崩潰（如 de36791 事件）。
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "module";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROUTES_DIR = __dirname;

/** 遞迴收集所有 .js 檔案（排除 .test.js） */
function collectRouteFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectRouteFiles(full));
    } else if (entry.name.endsWith(".js") && !entry.name.endsWith(".test.js")) {
      results.push(full);
    }
  }
  return results;
}

/** 解析檔案中所有 require("...") 的路徑 */
function extractRequirePaths(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const regex = /require\(["']([^"']+)["']\)/g;
  const results = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    results.push(match[1]);
  }
  return results;
}

/**
 * 解析解構式 require：const { a, b } = require("./path")
 * 回傳 [{ requirePath, names }]
 */
function extractDestructuredRequires(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const regex = /const\s*\{([^}]+)\}\s*=\s*require\(["']([^"']+)["']\)/g;
  const results = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const names = match[1].split(",").map((s) => s.trim()).filter(Boolean);
    results.push({ requirePath: match[2], names });
  }
  return results;
}

describe("路由檔案載入驗證", () => {
  const routeFiles = collectRouteFiles(ROUTES_DIR);

  it("應找到路由檔案", () => {
    expect(routeFiles.length).toBeGreaterThan(0);
  });

  describe("所有本地 require 路徑可解析", () => {
    for (const filePath of routeFiles) {
      const relative = path.relative(ROUTES_DIR, filePath).replace(/\\/g, "/");
      const requirePaths = extractRequirePaths(filePath);
      const localRequires = requirePaths.filter((p) => p.startsWith("."));

      for (const reqPath of localRequires) {
        it(`${relative}: require("${reqPath}") 路徑可解析`, () => {
          const dir = path.dirname(filePath);
          const resolved = path.resolve(dir, reqPath);
          // 嘗試 require.resolve 驗證檔案存在
          expect(() => require.resolve(resolved)).not.toThrow();
        });
      }
    }
  });

  describe("解構 require 的 named export 存在", () => {
    for (const filePath of routeFiles) {
      const relative = path.relative(ROUTES_DIR, filePath).replace(/\\/g, "/");
      const destructured = extractDestructuredRequires(filePath);
      const localDestructured = destructured.filter((d) => d.requirePath.startsWith("."));

      for (const { requirePath, names } of localDestructured) {
        for (const name of names) {
          it(`${relative}: require("${requirePath}").${name} 不應為 undefined`, () => {
            const dir = path.dirname(filePath);
            const resolved = path.resolve(dir, requirePath);
            let mod;
            try {
              mod = require(resolved);
            } catch (e) {
              throw new Error(
                `"${relative}" — require("${requirePath}") 載入時拋出錯誤: ${e.message}`,
              );
            }
            expect(
              mod[name],
              `"${name}" 從 "${requirePath}" 解構後為 undefined — 可能引入路徑錯誤`,
            ).toBeDefined();
          });
        }
      }
    }
  });
});
