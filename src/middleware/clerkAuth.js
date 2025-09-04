const { getAuth } = require("@clerk/clerk-sdk-node");

/**
 * Middleware to enforce Clerk authentication on routes.
 * - Extracts JWT from headers (Authorization: Bearer <token>)
 * - Verifies session with Clerk
 * - Attaches user info to req.user
 */
const requireClerkAuth = (req, res, next) => {
  try {
    const { userId, sessionId } = getAuth(req);

    if (!userId || !sessionId) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing Clerk token" });
    }

    // Attach Clerk info to request for downstream use
    req.user = { userId, sessionId };
    next();
  } catch (err) {
    console.error("❌ Clerk auth error:", err);
    res.status(401).json({ error: "Unauthorized" });
  }
};

module.exports = { requireClerkAuth };