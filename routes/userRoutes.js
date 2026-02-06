const express = require("express");
const router = express.Router();
const {
  getSchedule,
  putSchedule,
} = require("../controllers/scheduleController");
const { getPrices, putPrices } = require("../controllers/pricesController");
const { protect } = require("../middleware/authMiddleware");

router.get("/:userId/schedule", protect, getSchedule);
router.put("/:userId/schedule", protect, putSchedule);

router.get("/:userId/prices", protect, getPrices);
router.put("/:userId/prices", protect, putPrices);

module.exports = router;
