/**
 * 輸入驗證與清理工具
 */

// 移除 HTML 標籤，防止 XSS
function stripHtml(str) {
  return str.replace(/<[^>]*>/g, "");
}

// 清理使用者輸入的字串（去頭尾空白 + 移除 HTML）
function sanitizeString(str) {
  if (typeof str !== "string") return "";
  return stripHtml(str).trim();
}

// 驗證名稱（角色名、武器名）
// 規則：1~20 字，不含 HTML 標籤、不含控制字元
function validateName(str, fieldName = "名稱") {
  if (typeof str !== "string" || str.trim().length === 0) {
    return { valid: false, error: `必須輸入${fieldName}` };
  }

  const cleaned = sanitizeString(str);

  if (cleaned.length === 0) {
    return { valid: false, error: `${fieldName}不得僅含特殊字元` };
  }

  if (cleaned.length > 20) {
    return { valid: false, error: `${fieldName}不得超過 20 個字` };
  }

  // 禁止控制字元（允許 Unicode 文字、空白、標點）
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(cleaned)) {
    return { valid: false, error: `${fieldName}包含不允許的字元` };
  }

  return { valid: true, value: cleaned };
}

module.exports = { sanitizeString, validateName };
