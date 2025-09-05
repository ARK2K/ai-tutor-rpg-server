const axios = require("axios");
const crypto = require("crypto");
const stringSimilarity = require("string-similarity"); // npm i string-similarity
const Quest = require("../models/Quest");
const User = require("../models/User");
const cheatDetection = require("../utils/cheatDetection");

// --- helper to reset daily quota ---
function resetIfNewDay(user) {
  const now = new Date();
  const lastReset = user.dailyQuotaResetAt || new Date(0);

  const isNewDay = now.toISOString().slice(0, 10) !== lastReset.toISOString().slice(0, 10);
  if (isNewDay) {
    user.dailyFreeQuestsUsed = 0;
    user.dailyAdRefillsUsed = 0;
    user.dailyQuotaResetAt = now;
  }
  return user;
}

// --- helper to hash question text ---
function generateFingerprint(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// --- helper to compute score ---
function computeScore(correctAnswer, userAnswer) {
  if (!userAnswer) return 0;
  if (correctAnswer.toLowerCase().trim() === userAnswer.toLowerCase().trim()) {
    return 100;
  }
  const similarity = stringSimilarity.compareTwoStrings(
    correctAnswer.toLowerCase(),
    userAnswer.toLowerCase()
  );
  if (similarity > 0.7) return Math.round(similarity * 100);
  return 0;
}

const requestQuest = async (req, res) => {
  try {
    const { subject, difficulty = 1 } = req.body;
    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    resetIfNewDay(user);

    const DAILY_FREE_LIMIT = 5;
    const DAILY_AD_LIMIT = 5;

    // Subscription check
    const isSubscribed = user.subscriptions?.some((s) => s.active);
    if (!isSubscribed) {
      if (user.dailyFreeQuestsUsed >= DAILY_FREE_LIMIT && user.dailyAdRefillsUsed >= DAILY_AD_LIMIT) {
        return res
          .status(403)
          .json({ error: "Daily quest limit reached. Watch an ad or subscribe." });
      }

      if (user.dailyFreeQuestsUsed < DAILY_FREE_LIMIT) {
        user.dailyFreeQuestsUsed += 1;
      } else {
        user.dailyAdRefillsUsed += 1;
      }
    }
    await user.save();

    // 🔥 Call LLM proxy
    const llmRes = await axios.post(
      `${process.env.BACKEND_URL || "http://localhost:5000"}/api/llm/generate`,
      { subject, difficulty },
      { headers: { Authorization: req.headers.authorization } }
    );

    const { data } = llmRes.data;

    // Generate fingerprint
    const fingerprint = generateFingerprint(data.question);

    const quest = new Quest({
      userId: user._id,
      subject,
      type: data.type || "micro-quiz",
      difficulty,
      question: data.question,
      choices: data.choices || [],
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
      promptUsed: `Generated quest for ${subject} at difficulty ${difficulty}`,
      fingerprint,
    });
    await quest.save();

    res.json({ quest });
  } catch (err) {
    console.error("❌ requestQuest error:", err.message);
    res.status(500).json({ error: "Quest generation failed" });
  }
};

const submitAnswer = async (req, res) => {
  try {
    const { questId, answer, explanation } = req.body;
    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const quest = await Quest.findById(questId);
    if (!quest) return res.status(404).json({ error: "Quest not found" });

    // Cheat detection
    const cheatFlags = cheatDetection({ quest, answer, explanation, user });

    // Compute score
    const score = computeScore(quest.correctAnswer, answer);
    quest.score = score;
    quest.userAnswer = answer;
    quest.userExplanation = explanation;
    quest.cheatFlags = cheatFlags;

    if (score >= 70) {
      quest.solved = true;
      quest.solvedAt = new Date();
      user.xp = (user.xp || 0) + score;
      // Adaptive difficulty: increase
      quest.difficulty = Math.min(quest.difficulty + 1, 10);
    } else {
      // Adaptive difficulty: decrease
      quest.difficulty = Math.max(quest.difficulty - 1, 1);
    }

    await quest.save();
    await user.save();

    res.json({ correct: score === 100, score, cheatFlags, explanation: quest.explanation });
  } catch (err) {
    console.error("❌ submitAnswer error:", err.message);
    res.status(500).json({ error: "Submit failed" });
  }
};

const refillViaAd = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    resetIfNewDay(user);

    const DAILY_AD_LIMIT = 5;
    if (user.dailyAdRefillsUsed >= DAILY_AD_LIMIT) {
      return res.status(403).json({ error: "Ad refill limit reached." });
    }

    // (TODO: verify ad callback)
    user.dailyAdRefillsUsed += 1;
    await user.save();

    res.json({ success: true, remaining: DAILY_AD_LIMIT - user.dailyAdRefillsUsed });
  } catch (err) {
    console.error("❌ refillViaAd error:", err.message);
    res.status(500).json({ error: "Ad refill failed" });
  }
};

const subscriptionCheck = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const isSubscribed = user.subscriptions?.some((s) => s.active);
    res.json({ isSubscribed });
  } catch (err) {
    console.error("❌ subscriptionCheck error:", err.message);
    res.status(500).json({ error: "Subscription check failed" });
  }
};

// --- Quest history endpoint ---
const getHistory = async (req, res) => {
  try {
    const quests = await Quest.find({ userId: req.auth.userId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ quests });
  } catch (err) {
    console.error("❌ getHistory error:", err.message);
    res.status(500).json({ error: "History fetch failed" });
  }
};

module.exports = {
  requestQuest,
  submitAnswer,
  refillViaAd,
  subscriptionCheck,
  getHistory,
};