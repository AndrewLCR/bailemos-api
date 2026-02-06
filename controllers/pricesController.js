const Joi = require("joi");
const { Academy } = require("../models/User");

const PRICE_TYPES = ["individual", "couples", "private"];

const priceItemSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string()
    .valid(...PRICE_TYPES)
    .required(),
  monthlyPrice: Joi.number().min(0).required(),
  classesPerWeek: Joi.number().integer().min(1).max(7).required(),
});

const pricesBodySchema = Joi.object({
  prices: Joi.array().items(priceItemSchema).required(),
}).required();

function canAccessPrices(req, userId) {
  const id = String(userId);
  const self = String(req.user._id);
  if (id === self) return true;
  if (req.user.role === "admin") return true;
  return false;
}

/**
 * GET /api/users/:userId/prices
 * Auth: required. Caller must be the academy (userId) or admin.
 * Prices stored in users collection: academy document's prices array.
 */
exports.getPrices = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!canAccessPrices(req, userId)) {
      return res.status(403).json({
        message: "Not authorized to read this academy's prices",
      });
    }
    const academy = await Academy.findById(userId).select("prices").lean();
    if (!academy) {
      return res.status(404).json({ message: "Academy not found" });
    }
    const prices = academy.prices || [];
    return res.status(200).json({ prices });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

/**
 * PUT /api/users/:userId/prices
 * Auth: required. Caller must be the academy (userId) or admin.
 * Body: { prices: [ { id, type, monthlyPrice, classesPerWeek }, ... ] }
 * Persistence: stored in users collection, academy document's prices array.
 */
exports.putPrices = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!canAccessPrices(req, userId)) {
      return res.status(403).json({
        message: "Not authorized to update this academy's prices",
      });
    }
    const { error, value } = pricesBodySchema.validate(req.body, {
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        message: error.details[0].message || "Invalid prices payload",
      });
    }
    const normalized = value.prices.map((p) => ({
      id: String(p.id),
      type: p.type,
      monthlyPrice: Number(p.monthlyPrice),
      classesPerWeek: Math.min(
        7,
        Math.max(1, Math.floor(Number(p.classesPerWeek)))
      ),
    }));
    const academy = await Academy.findByIdAndUpdate(
      userId,
      { prices: normalized },
      { new: true, runValidators: true }
    ).lean();
    if (!academy) {
      return res.status(404).json({ message: "Academy not found" });
    }
    return res.status(200).json({ prices: academy.prices || [] });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};
