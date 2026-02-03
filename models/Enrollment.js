const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    academy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // optional for legacy enrollments created before user was added
    },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    idNumber: { type: String, required: true },
    voucherPath: { type: String },
    voucherUrl: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "enrollments" }
);

enrollmentSchema.index({ user: 1, academy: 1 });
enrollmentSchema.pre("save", async function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model("Enrollment", enrollmentSchema);
