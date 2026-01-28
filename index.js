const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('mongo-sanitize');

dotenv.config();

const app = express();

// MongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};

// Middlewares
app.use(express.json()); // Body parser
app.use(morgan('dev'));  // Logging

// CORS
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
}));

// Security HTTP
app.use(helmet());

// Sanitize req.body (using mongo-sanitize correctly)
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = mongoSanitize(req.body);
    }
    next();
});

// Routes
const authRoutes = require('./routes/authRoutes');
// const academyRoutes = require('./routes/academyRoutes');
// const establishmentRoutes = require('./routes/establishmentRoutes');
// const dancerRoutes = require('./routes/dancerRoutes');
// const { protect, authorize } = require('./middleware/authMiddleware');

app.use('/api/auth', authRoutes);
// app.use('/api/academy', academyRoutes);
// app.use('/api/establishment', establishmentRoutes);
// app.use('/api/dancer', dancerRoutes);

app.get('/', (req, res) => {
    res.send('Bailemos API is running');
});

// app.get('/api/admin', protect, authorize('admin'), (req, res) => {
//     res.send('Admin content');
// });

// Start server only if DB connection was successful
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
