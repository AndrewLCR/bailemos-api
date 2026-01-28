const express = require('express');
const router = express.Router();
const { 
    getNearbyAcademies, 
    getNearbyEvents, 
    getPromotionQR,
    getAvailablePromotions
} = require('../controllers/dancerController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes are protected and only for dancers
router.get('/nearby/academies', protect, authorize('dancer'), getNearbyAcademies);
router.get('/nearby/events', protect, authorize('dancer'), getNearbyEvents);
router.get('/promotions', protect, authorize('dancer'), getAvailablePromotions);
router.get('/promotions/:id/qr', protect, authorize('dancer'), getPromotionQR);

module.exports = router;
