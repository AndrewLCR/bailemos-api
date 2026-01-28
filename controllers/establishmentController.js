const Event = require('../models/Event');
const Promotion = require('../models/Promotion');
const QRCode = require('qrcode');

// @desc    Create a new event
// @route   POST /api/establishment/events
// @access  Private (Establishment)
exports.createEvent = async (req, res) => {
  try {
    const { name, description, date, coverCharge, location } = req.body;
    
    // Use establishment's location if not provided
    let eventLocation = location;
    if (!eventLocation && req.user.location) {
        eventLocation = req.user.location.coordinates;
    }

    const event = new Event({
      name,
      description,
      date,
      coverCharge,
      establishment: req.user._id,
      location: eventLocation ? { type: 'Point', coordinates: eventLocation } : undefined
    });

    const savedEvent = await event.save();
    res.status(201).json(savedEvent);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all events
// @route   GET /api/establishment/events
// @access  Public
exports.getEvents = async (req, res) => {
  try {
    const query = {};
    if (req.query.establishmentId) {
        query.establishment = req.query.establishmentId;
    }
    
    const events = await Event.find(query).populate('establishment', 'name address');
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create a promotion
// @route   POST /api/establishment/promotions
// @access  Private (Establishment)
exports.createPromotion = async (req, res) => {
    try {
        const { title, description, discountType, value, validUntil } = req.body;

        // Generate QR Code content (e.g., promoID:establishmentID)
        // In a real app, this would be signed or tokenized
        const promotion = new Promotion({
            title,
            description,
            discountType,
            value,
            validUntil,
            establishment: req.user._id
        });

        const qrData = JSON.stringify({
            promoId: promotion._id,
            establishmentId: req.user._id,
            type: discountType,
            val: value
        });

        const qrCodeUrl = await QRCode.toDataURL(qrData);
        promotion.qrCodeData = qrCodeUrl;

        await promotion.save();
        res.status(201).json(promotion);

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get promotions for an establishment
// @route   GET /api/establishment/promotions
// @access  Public (or Protected)
exports.getPromotions = async (req, res) => {
    try {
        const query = {};
        if (req.query.establishmentId) {
            query.establishment = req.query.establishmentId;
        } else if (req.user && req.user.role === 'establishment') {
            query.establishment = req.user._id;
        }

        const promotions = await Promotion.find(query);
        res.json(promotions);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
