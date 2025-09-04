/**
 * Basic heuristics to flag suspicious submissions.
 * Returns an array of flags (strings). This does NOT auto-ban —
 * flagged cases should be logged for human moderation review.
 */

function cheatDetection({ quest, answer, explanation, user }) {
  const flags = [];

  // 1. Minimal solve time check
  if (quest.createdAt && quest.solvedAt) {
    const solveMs = quest.solvedAt - quest.createdAt;
    if (solveMs < 2000) {
      flags.push("suspiciously_fast");
    }
  }

  // 2. Empty or copy-paste explanation
  if (!explanation || explanation.trim().length < 5) {
    flags.push("weak_explanation");
  }

  // 3. Repeated same answer across different quests
  if (quest.question && answer) {
    const qHash = hashString(quest.question);
    const aHash = hashString(answer);
    if (qHash === aHash) {
      flags.push("question_answer_identical");
    }
  }

  // 4. Impossible accuracy streaks (placeholder: >95% over 50 quests)
  if (user && user.stats?.recentAccuracy > 0.95 && user.stats?.questCount > 50) {
    flags.push("unreal_accuracy_streak");
  }

  // 5. Identical re-requests (fingerprint reuse)
  if (quest.fingerprint && user.recentFingerprints?.includes(quest.fingerprint)) {
    flags.push("duplicate_fingerprint");
  }

  return flags;
}

/**
 * Simple hash for fingerprinting
 */
function hashString(str) {
  let hash = 0;
  if (!str || !str.length) return hash;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}

module.exports = cheatDetection;