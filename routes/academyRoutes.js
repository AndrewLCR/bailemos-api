const express = require('express');
const router = express.Router();
const { createClass, getClasses, bookClass, getMyBookings } = require('../controllers/academyController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public/Shared
router.get('/classes', getClasses);

// Academy Protected
router.post('/classes', protect, authorize('academy'), createClass);

// Dancer Protected
router.post('/bookings', protect, authorize('dancer'), bookClass);
router.get('/bookings/my', protect, authorize('dancer'), getMyBookings);

module.exports = router;
