const { User, Academy } = require('../models/User');
const Event = require('../models/Event');
const Promotion = require('../models/Promotion');

// @desc    Get nearby academies
// @route   GET /api/dancer/nearby/academies
// @access  Private (Dancer)
exports.getNearbyAcademies = async (req, res) => {
    try {
        const { longitude, latitude, maxDistance = 10000 } = req.query; // maxDistance in meters, default 10km

        if (!longitude || !latitude) {
            return res.status(400).json({ message: 'Please provide longitude and latitude' });
        }

        const academies = await Academy.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: parseInt(maxDistance)
                }
            }
        }).select('name address description location');

        res.json(academies);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get nearby events
// @route   GET /api/dancer/nearby/events
// @access  Private (Dancer)
exports.getNearbyEvents = async (req, res) => {
    try {
        const { longitude, latitude, maxDistance = 10000 } = req.query;

        if (!longitude || !latitude) {
            return res.status(400).json({ message: 'Please provide longitude and latitude' });
        }

        const events = await Event.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: parseInt(maxDistance)
                }
            }
        }).populate('establishment', 'name address');

        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get promotion QR code
// @route   GET /api/dancer/promotions/:id/qr
// @access  Private (Dancer)
exports.getPromotionQR = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id).populate('establishment', 'name');

        if (!promotion) {
            return res.status(404).json({ message: 'Promotion not found' });
        }

        // Check if promotion is still valid
        if (new Date() > promotion.validUntil) {
            return res.status(400).json({ message: 'Promotion has expired' });
        }

        res.json({
            promotion: {
                title: promotion.title,
                description: promotion.description,
                establishment: promotion.establishment,
                validUntil: promotion.validUntil
            },
            qrCode: promotion.qrCodeData
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all available promotions
// @route   GET /api/dancer/promotions
// @access  Private (Dancer)
exports.getAvailablePromotions = async (req, res) => {
    try {
        const promotions = await Promotion.find({
            validUntil: { $gte: new Date() }
        }).populate('establishment', 'name address');

        res.json(promotions);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
