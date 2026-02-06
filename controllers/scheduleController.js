const Joi = require("joi");
const { Academy } = require("../models/User");

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const daySchema = Joi.object({
  open: Joi.boolean().required(),
  openTime: Joi.string().allow("").optional(),
  closeTime: Joi.string().allow("").optional(),
});

const scheduleBodySchema = Joi.object({
  schedule: Joi.object({
    mon: daySchema.required(),
    tue: daySchema.required(),
    wed: daySchema.required(),
    thu: daySchema.required(),
    fri: daySchema.required(),
    sat: daySchema.required(),
    sun: daySchema.required(),
  })
    .required()
    .unknown(false),
}).required();

function canAccessSchedule(req, userId) {
  const id = String(userId);
  const self = String(req.user._id);
  if (id === self) return true;
  if (req.user.role === "admin") return true;
  return false;
}

/**
 * GET /api/users/:userId/schedule
 * Auth: required. Caller must be the academy (userId) or admin.
 * Schedule stored in users collection: academy document's schedule field (users/academyId/schedule).
 */
exports.getSchedule = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!canAccessSchedule(req, userId)) {
      return res.status(403).json({
        message: "Not authorized to read this schedule",
      });
    }
    const academy = await Academy.findById(userId).select("schedule").lean();
    if (!academy) {
      return res.status(404).json({ message: "Academy not found" });
    }
    const schedule = academy.schedule || null;
    return res.status(200).json({ schedule });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

/**
 * PUT /api/users/:userId/schedule
 * Auth: required. Caller must be the academy (userId) or admin.
 * Body: { schedule: { mon: { open, openTime?, closeTime? }, ... } }
 * Persistence: stored in users collection, academy document's schedule field.
 */
exports.putSchedule = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!canAccessSchedule(req, userId)) {
      return res.status(403).json({
        message: "Not authorized to update this schedule",
      });
    }
    const { error, value } = scheduleBodySchema.validate(req.body, {
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        message: error.details[0].message || "Invalid schedule payload",
      });
    }
    const normalized = {};
    for (const day of DAYS) {
      const d = value.schedule[day];
      normalized[day] = {
        open: Boolean(d.open),
        openTime: typeof d.openTime === "string" ? d.openTime : "09:00",
        closeTime: typeof d.closeTime === "string" ? d.closeTime : "18:00",
      };
    }
    const academy = await Academy.findByIdAndUpdate(
      userId,
      { schedule: normalized },
      { new: true, runValidators: true }
    )
      .select("schedule")
      .lean();
    if (!academy) {
      return res.status(404).json({ message: "Academy not found" });
    }
    return res.status(200).json({ schedule: academy.schedule || normalized });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};
