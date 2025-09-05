const axios = require("axios");

const PROVIDER = process.env.LLM_PROVIDER; // OPENAI | GEMINI | OPENROUTER

// API keys
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Unified entrypoint
async function generateQuestPrompt(prompt, opts = {}) {
  switch (PROVIDER) {
    case "OPENAI":
      return callOpenAI(prompt, opts);
    case "GEMINI":
      return callGemini(prompt, opts);
    case "OPENROUTER":
      return callOpenRouter(prompt, opts);
    default:
      throw new Error(`Unsupported LLM_PROVIDER: ${PROVIDER}`);
  }
}

// --- OpenAI ---
async function callOpenAI(prompt, { model = "gpt-4o-mini", maxTokens = 400 } = {}) {
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model,
      messages: [
        { role: "system", content: "You are an AI RPG tutor." },
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data.choices[0].message.content;
}

// --- Gemini ---
async function callGemini(prompt, { model = "gemini-pro", maxTokens = 400 } = {}) {
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    },
    {
      headers: { "Content-Type": "application/json" },
    }
  );
  return res.data.candidates?.[0]?.content?.parts?.[0]?.text || "Gemini failed";
}

// --- OpenRouter ---
async function callOpenRouter(prompt, { model = "openai/gpt-4o-mini", maxTokens = 400 } = {}) {
  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model,
      messages: [
        { role: "system", content: "You are an AI RPG tutor." },
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:5173",
        "X-Title": "AI Tutor RPG",
        "Content-Type": "application/json",
      },
    }
  );
  return res.data.choices[0].message.content;
}

module.exports = { generateQuestPrompt };