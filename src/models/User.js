const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Clerk ID (maps user in DB to Clerk auth system)
    clerkId: { type: String, required: true, unique: true },

    // Gameplay progression
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    loot: { type: [String], default: [] }, // earned items, badges, etc.

    // Daily quest usage
    dailyFreeQuestsUsed: { type: Number, default: 0 },
    dailyAdRefillsUsed: { type: Number, default: 0 },
    dailyQuotaResetAt: { type: Date, default: null }, // UTC reset tracker

    // Monetization
    subscription: {
      active: { type: Boolean, default: false },
      plan: { type: String, enum: ["free", "premium"], default: "free" },
      renewsAt: { type: Date, default: null },
    },

    // Age (COPPA / parental control)
    age: { type: Number, required: true },

    // Audit & moderation
    flags: { type: Number, default: 0 }, // suspicious behavior counter
    banned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// --- Level progression helper ---
userSchema.methods.addXP = function (amount) {
  this.xp += amount;

  // Simple level-up formula (100 XP per level)
  const requiredXP = this.level * 100;
  if (this.xp >= requiredXP) {
    this.level += 1;
    this.xp = this.xp - requiredXP;
  }
};

module.exports = mongoose.model("User", userSchema);