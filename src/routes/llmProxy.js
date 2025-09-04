const express = require("express");
const crypto = require("crypto");
const NodeCache = require("node-cache");
const { generateQuestPrompt } = require("../utils/llmClient");

const router = express.Router();

// In-memory cache (per-instance). For prod → Redis or Mongo TTL
const llmCache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL

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
    Quest type: micro-quiz, multi-step problem, or explanation.
    Difficulty: ${difficulty}.
    Return JSON with fields: {question, choices (optional), correctAnswer, explanation}.
    `;

    const raw = await generateQuestPrompt(prompt);

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { question: raw, choices: [], correctAnswer: null, explanation: "" };
    }

    llmCache.set(cacheKey, parsed);
    res.json({ provider: process.env.LLM_PROVIDER, data: parsed });
  } catch (err) {
    console.error("❌ LLM proxy error:", err.message);
    res.status(500).json({ error: "LLM generation failed" });
  }
});

module.exports = router;