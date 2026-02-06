const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  dancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  academy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "paid", // Simulated immediate payment
  },
  status: {
    type: String,
    enum: ["active", "cancelled"],
    default: "active",
  },
  danceRole: {
    type: String,
    enum: ["leader", "follower"],
    default: "follower",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Booking", bookingSchema);
