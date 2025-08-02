// gemini.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const auth = require("./auth.js");

// 使用您的 API 金鑰初始化
const genAI = new GoogleGenerativeAI(auth.gemini_api_key);

/**
 * 產生生動的戰鬥描述
 * @param {string} prompt - 提供給 AI 的詳細提示
 * @returns {Promise<string>} - AI 生成的戰鬥故事
 */
async function generateBattleNarrative(prompt) {
    try {
        // 選用 gemini-2.5-flash 模型
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return text;
    } catch (error) {
        console.error("Gemini API 呼叫失敗:", error);
        return "戰鬥的火光太過耀眼，讓人看不清發生了什麼事..."; // 提供一個預設的錯誤訊息
    }
}

module.exports = { generateBattleNarrative };
