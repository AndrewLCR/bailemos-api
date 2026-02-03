const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("mongo-sanitize");

dotenv.config();

const app = express();

// MongoDB connection
const connectDB = async () => {
  try {
    // Support both MONGO_URI (used locally) and MONGODB_URI (often used in hosting envs like Vercel/Docker)
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error(
        "Missing MongoDB connection string. Set MONGO_URI or MONGODB_URI in your environment."
      );
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

// Middlewares (limit raised for base64 avatars on PATCH /api/auth/profile)
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev")); // Logging

// CORS
const allowedOrigins = [
  "http://localhost:5173",
  "https://bailemos-dashboard.vercel.app",
  "http://localhost:8081",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl) and allowed web origins
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Explicitly handle CORS preflight for all routes
app.options("*", cors());

// Rate limiting (solo en producción)
if (process.env.NODE_ENV === "production") {
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
    })
  );
}

// Security HTTP
app.use(helmet());

// Sanitize req.body (using mongo-sanitize correctly)
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = mongoSanitize(req.body);
  }
  next();
});

// Serve uploaded enrollment vouchers (e.g. /uploads/enrollments/:id.png)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
const authRoutes = require("./routes/authRoutes");
const academyRoutes = require("./routes/academyRoutes");
const establishmentRoutes = require("./routes/establishmentRoutes");
const dancerRoutes = require("./routes/dancerRoutes");
const { protect, authorize } = require("./middleware/authMiddleware");

app.use("/api/auth", authRoutes);
app.use("/api/academy", academyRoutes);
app.use("/api/establishment", establishmentRoutes);
app.use("/api/dancer", dancerRoutes);

app.get("/", (req, res) => {
  res.send("Bailemos API is running");
});

app.get("/api/admin", protect, authorize("admin"), (req, res) => {
  res.send("Admin content");
});

// Start server only if DB connection was successful
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
