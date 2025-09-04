const mongoose = require("mongoose");

const questSchema = new mongoose.Schema(
  {
    // Who owns/attempted this quest
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // High-level metadata
    subject: { type: String, required: true }, // e.g. "algebra", "WWII"
    type: {
      type: String,
      enum: ["micro-quiz", "multi-step", "coding-kata", "translation", "explanation"],
      required: true,
    },
    difficulty: { type: Number, default: 1 }, // adaptive difficulty scale (1-10)
    fingerprint: { type: String, required: true }, // hash of question (cheat detection)

    // AI-generated content
    promptUsed: { type: String }, // stored for moderation/debug
    question: { type: String, required: true },
    choices: { type: [String], default: [] }, // for MCQ
    correctAnswer: { type: String, required: true }, // canonical correct answer
    explanation: { type: String }, // AI-generated explanation

    // User’s interaction
    userAnswer: { type: String, default: null },
    userExplanation: { type: String, default: null }, // their reasoning steps
    score: { type: Number, default: null }, // 0–100
    solved: { type: Boolean, default: false },

    // Moderation / replay
    flagged: { type: Boolean, default: false },
    reviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Unique index: prevent storing exact duplicate questions
questSchema.index({ fingerprint: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Quest", questSchema);