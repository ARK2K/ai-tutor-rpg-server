const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const NodeCache = require("node-cache");

const router = express.Router();

// In-memory cache (per-instance). For prod → Redis
const llmCache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL

// --- Utility: pick provider ---
async function callLLM({ provider, prompt }) {
  switch (provider) {
    case "OPENAI":
      return await callOpenAI(prompt);
    case "GEMINI":
      return await callGemini(prompt);
    case "OPENROUTER":
      return await callOpenRouter(prompt);
    default:
      throw new Error("Unsupported LLM provider: " + provider);
  }
}

// --- OpenAI ---
async function callOpenAI(prompt) {
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini", // adjust model
      messages: [
        { role: "system", content: "You are a helpful tutor RPG." },
        { role: "user", content: prompt },
      ],
      max_tokens: 400,
    },
    {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    }
  );
  return res.data.choices[0].message.content;
}

// --- Gemini (Google AI Studio) ---
async function callGemini(prompt) {
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
    }
  );
  return res.data.candidates?.[0]?.content?.parts?.[0]?.text || "Gemini failed";
}

// --- OpenRouter ---
async function callOpenRouter(prompt) {
  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "openai/gpt-4o-mini", // can swap to other models
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:5173",
        "X-Title": "AI Tutor RPG",
      },
    }
  );
  return res.data.choices[0].message.content;
}

// --- Route: proxy quest generation ---
router.post("/generate", async (req, res) => {
  try {
    const { subject, difficulty = 1 } = req.body;
    if (!subject) return res.status(400).json({ error: "Missing subject" });

    // Cache fingerprint
    const cacheKey = crypto
      .createHash("sha256")
      .update(subject + difficulty)
      .digest("hex");

    if (llmCache.has(cacheKey)) {
      return res.json({ cached: true, data: llmCache.get(cacheKey) });
    }

    // Build prompt
    const prompt = `
    Create an educational RPG quest about "${subject}".
    Quest type: mix micro-quiz or explanation.
    Difficulty: ${difficulty}.
    Return JSON with fields: {question, choices (optional), correctAnswer, explanation}.
    `;

    const provider = process.env.LLM_PROVIDER || "OPENAI";
    const raw = await callLLM({ provider, prompt });

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { question: raw, choices: [], correctAnswer: null, explanation: "" };
    }

    llmCache.set(cacheKey, parsed);
    res.json({ provider, data: parsed });
  } catch (err) {
    console.error("❌ LLM proxy error:", err.message);
    res.status(500).json({ error: "LLM generation failed" });
  }
});

module.exports = router;