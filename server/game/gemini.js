const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateBattleNarrative(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini API 呼叫失敗:", error);
        return "戰鬥的火光太過耀眼，讓人看不清發生了什麼事...";
    }
}

module.exports = { generateBattleNarrative };
