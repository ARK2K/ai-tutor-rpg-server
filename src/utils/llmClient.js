const fetch = require("node-fetch");

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
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are an AI RPG tutor." },
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

// --- Gemini ---
async function callGemini(prompt, { model = "gemini-pro", maxTokens = 400 } = {}) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Gemini failed";
}

// --- OpenRouter ---
async function callOpenRouter(prompt, { model = "openai/gpt-4o-mini", maxTokens = 400 } = {}) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.SITE_URL || "http://localhost:5173",
      "X-Title": "AI Tutor RPG",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are an AI RPG tutor." },
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

module.exports = { generateQuestPrompt };