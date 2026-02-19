const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateBattleNarrative(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API 呼叫失敗:", error);
    return "戰鬥的火光太過耀眼，讓人看不清發生了什麼事...";
  }
}

async function streamBattleNarrative(prompt, onChunk, onDone, onError) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const result = await model.generateContentStream(prompt);
    let fullText = "";
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullText += text;
        onChunk(text);
      }
    }
    onDone(fullText);
  } catch (error) {
    console.error("Gemini streaming 失敗:", error);
    onError(error);
  }
}

module.exports = { generateBattleNarrative, streamBattleNarrative };
