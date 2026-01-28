const Class = require('../models/Class');
const Booking = require('../models/Booking');
const { User } = require('../models/User');

// @desc    Create a new class
// @route   POST /api/academy/classes
// @access  Private (Academy)
exports.createClass = async (req, res) => {
  try {
    const { name, description, level, schedule, price } = req.body;
    
    const newClass = new Class({
      name,
      description,
      level,
      schedule,
      price,
      academy: req.user._id
    });

    const savedClass = await newClass.save();
    res.status(201).json(savedClass);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all classes for an academy
// @route   GET /api/academy/classes
// @access  Public (or semi-private)
exports.getClasses = async (req, res) => {
  try {
    const query = {};
    if (req.query.academyId) {
        query.academy = req.query.academyId;
    } else if (req.user && req.user.role === 'academy') {
        // If logged in as academy and no ID provided, show their own classes
        query.academy = req.user._id;
    }
    
    // If getting all classes nearby, that would be a different controller or complex query.
    // Basic list for now.
    const classes = await Class.find(query).populate('academy', 'name address');
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Book a class
// @route   POST /api/academy/bookings
// @access  Private (Dancer)
exports.bookClass = async (req, res) => {
    try {
        const { classId } = req.body;
        
        const classItem = await Class.findById(classId);
        if (!classItem) {
            return res.status(404).json({ message: 'Class not found' });
        }

        // Check if already booked
        const existingBooking = await Booking.findOne({ 
            class: classId, 
            dancer: req.user._id,
            status: 'active'
        });

        if (existingBooking) {
            return res.status(400).json({ message: 'Already booked this class' });
        }

        const booking = new Booking({
            class: classId,
            dancer: req.user._id,
            academy: classItem.academy,
            paymentStatus: 'paid' // Simulating payment
        });

        await booking.save();

        // Add dancer to academy students list if not present
        await User.findByIdAndUpdate(classItem.academy, {
            $addToSet: { students: req.user._id }
        });

        // Add booking to dancer
        await User.findByIdAndUpdate(req.user._id, {
            $push: { bookings: booking._id }
        });

        res.status(201).json(booking);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get bookings for a dancer
// @route   GET /api/academy/bookings/my
// @access  Private (Dancer)
exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ dancer: req.user._id })
            .populate({
                path: 'class',
                populate: { path: 'academy', select: 'name' }
            });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
