const express = require("express");
const {
  requestQuest,
  submitAnswer,
  refillViaAd,
  subscriptionCheck,
  getHistory,
} = require("../controllers/questController");

const router = express.Router();

router.post("/request-quest", requestQuest);
router.post("/submit-answer", submitAnswer);
router.post("/refill-via-ad", refillViaAd);
router.get("/subscription-check", subscriptionCheck);

// 🆕 Quest history endpoint
router.get("/history", getHistory);

module.exports = router;