const mongoose = require('mongoose');
const QRCode = require('qrcode');

const promotionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  discountType: { 
    type: String, 
    enum: ['percentage', 'fixed', 'free_pass'], 
    required: true 
  },
  value: { type: Number }, // e.g., 20 for 20% or 10 for $10 off. Null for free_pass
  establishment: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  qrCodeData: { type: String }, // Base64 string or URL
  validUntil: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Promotion', promotionSchema);
