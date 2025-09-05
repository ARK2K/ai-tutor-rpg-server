const mongoose = require("mongoose");

const questSchema = new mongoose.Schema(
  {
    // Who owns/attempted this quest
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    subject: { type: String, required: true },
    type: {
      type: String,
      enum: ["micro-quiz", "multi-step", "coding-kata", "translation", "explanation"],
      required: true,
    },
    difficulty: { type: Number, default: 1 },
    fingerprint: { type: String, required: true },

    // AI-generated content
    promptUsed: { type: String },
    question: { type: String, required: true },
    choices: { type: [String], default: [] },
    correctAnswer: { type: String, required: true },
    explanation: { type: String },

    // User’s interaction
    userAnswer: { type: String, default: null },
    userExplanation: { type: String, default: null },
    score: { type: Number, default: null }, // 0–100
    solved: { type: Boolean, default: false },
    solvedAt: { type: Date },

    // Moderation / replay
    cheatFlags: { type: [String], default: [] },
    flagged: { type: Boolean, default: false },
    reviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Unique index: prevent storing exact duplicate questions
questSchema.index({ fingerprint: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Quest", questSchema);