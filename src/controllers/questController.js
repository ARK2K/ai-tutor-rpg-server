const axios = require("axios");
const Quest = require("../models/Quest");
const User = require("../models/User");
const cheatDetection = require("../utils/cheatDetection");

// --- helper to reset daily quota ---
function resetIfNewDay(user) {
  const now = new Date();
  const lastReset = user.dailyQuotaResetAt || new Date(0);

  const isNewDay =
    now.toISOString().slice(0, 10) !== lastReset.toISOString().slice(0, 10);

  if (isNewDay) {
    user.dailyFreeQuestsUsed = 0;
    user.dailyAdRefillsUsed = 0;
    user.dailyQuotaResetAt = now;
  }
  return user;
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
      if (
        user.dailyFreeQuestsUsed >= DAILY_FREE_LIMIT &&
        user.dailyAdRefillsUsed >= DAILY_AD_LIMIT
      ) {
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
      {
        headers: {
          Authorization: req.headers.authorization, // forward Clerk JWT
        },
      }
    );

    const { data } = llmRes.data;

    // Persist quest
    const quest = new Quest({
      userId: user._id,
      subject,
      difficulty,
      question: data.question,
      choices: data.choices || [],
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
      promptUsed: `Generated quest for ${subject} at difficulty ${difficulty}`,
      fingerprint: `${subject}-${difficulty}-${Date.now()}`, // TODO: hash question text
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

    const correct =
      quest.correctAnswer?.toLowerCase().trim() ===
      String(answer).toLowerCase().trim();

    if (correct) {
      quest.solved = true;
      quest.solvedAt = new Date();
      user.xp = (user.xp || 0) + 10;
    }

    quest.userAnswer = answer;
    quest.userExplanation = explanation;
    await quest.save();
    await user.save();

    res.json({ correct, cheatFlags, explanation: quest.explanation });
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

    res.json({
      success: true,
      remaining: DAILY_AD_LIMIT - user.dailyAdRefillsUsed,
    });
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

module.exports = { requestQuest, submitAnswer, refillViaAd, subscriptionCheck };