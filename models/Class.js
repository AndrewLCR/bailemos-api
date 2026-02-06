/**
 * @deprecated Classes are now stored in the academy user document (users collection).
 * See User model: Academy discriminator has embedded `classes` array.
 */
const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  level: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced", "All Levels"],
    required: true,
  },
  schedule: { type: String, required: true }, // e.g., "Mondays 18:00"
  price: { type: Number, required: true }, // Monthly fee
  academy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Class", classSchema);
