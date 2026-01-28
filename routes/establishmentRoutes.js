const express = require('express');
const router = express.Router();
const { createEvent, getEvents, createPromotion, getPromotions } = require('../controllers/establishmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Events
router.post('/events', protect, authorize('establishment'), createEvent);
router.get('/events', getEvents); // Public

// Promotions
router.post('/promotions', protect, authorize('establishment'), createPromotion);
router.get('/promotions', getPromotions); // Public or semi-public

module.exports = router;
