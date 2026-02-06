const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String }, // Optional for Google Auth
    avatar: { type: String }, // URL or base64
    deviceToken: { type: String }, // FCM/APNs for push (any role)
    role: {
      type: String,
      enum: ["dancer", "establishment", "academy", "admin"],
      required: true,
    },
    googleId: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { discriminatorKey: "role", collection: "users" }
);

// Password hashing
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to check password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

// Discriminators
const Dancer = User.discriminator(
  "dancer",
  new mongoose.Schema({
    location: {
      type: { type: String, default: "Point" },
      coordinates: [Number], // [longitude, latitude]
    },
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],
  })
);

const Establishment = User.discriminator(
  "establishment",
  new mongoose.Schema({
    address: { type: String, required: true },
    description: String,
    location: {
      type: { type: String, default: "Point" },
      coordinates: [Number],
    },
  })
);

const priceItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["individual", "couples", "private"],
      required: true,
    },
    monthlyPrice: { type: Number, required: true, min: 0 },
    classesPerWeek: { type: Number, required: true, min: 1, max: 7 },
  },
  { _id: false }
);

const classItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced", "All Levels"],
      required: true,
    },
    schedule: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: true }
);

const scheduleDaySchema = new mongoose.Schema(
  {
    open: { type: Boolean, required: true },
    openTime: { type: String, default: "09:00" },
    closeTime: { type: String, default: "18:00" },
  },
  { _id: false }
);

const weeklyScheduleSchema = new mongoose.Schema(
  {
    mon: { type: scheduleDaySchema },
    tue: { type: scheduleDaySchema },
    wed: { type: scheduleDaySchema },
    thu: { type: scheduleDaySchema },
    fri: { type: scheduleDaySchema },
    sat: { type: scheduleDaySchema },
    sun: { type: scheduleDaySchema },
  },
  { _id: false }
);

const Academy = User.discriminator(
  "academy",
  new mongoose.Schema({
    address: { type: String, required: true },
    description: String,
    location: {
      type: { type: String, default: "Point" },
      coordinates: [Number],
    },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    prices: { type: [priceItemSchema], default: [] },
    classes: { type: [classItemSchema], default: [] },
    schedule: { type: weeklyScheduleSchema },
  })
);

module.exports = { User, Dancer, Establishment, Academy };
