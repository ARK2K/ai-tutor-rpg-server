const express = require("express");
const {
  requestQuest,
  submitAnswer,
  refillViaAd,
  subscriptionCheck,
} = require("../controllers/questController");

const router = express.Router();

router.post("/request-quest", requestQuest);
router.post("/submit-answer", submitAnswer);
router.post("/refill-via-ad", refillViaAd);
router.get("/subscription-check", subscriptionCheck);

module.exports = router;