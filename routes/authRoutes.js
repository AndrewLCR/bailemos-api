const express = require("express");
const {
  register,
  login,
  updateProfile,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.patch("/profile", protect, updateProfile);

module.exports = router;
