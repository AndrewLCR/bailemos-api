const fs = require("fs");
const path = require("path");
const Joi = require("joi");
const Booking = require("../models/Booking");
const Enrollment = require("../models/Enrollment");
const { User, Academy } = require("../models/User");
const { sendPush } = require("../services/pushService");
const {
  sendEnrollmentNotification,
  sendEnrollmentDecisionToDancer,
} = require("../services/emailService");

const baseUrl = () =>
  process.env.APP_URL || process.env.BASE_URL || "http://localhost:5000";
const voucherImageUrl = (enrollment) => {
  if (enrollment.voucherPath)
    return `${baseUrl()}/${enrollment.voucherPath.replace(/\\/g, "/")}`;
  return enrollment.voucherUrl || null;
};

// @desc    Get all academies
// @route   GET /api/academy/academies
// @access  Public
exports.getAcademies = async (req, res) => {
  try {
    const academies = await Academy.find().select("-password").lean();
    res.json(academies);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get academy by ID (full info, no sensitive data)
// @route   GET /api/academy/:id
// @access  Public
exports.getAcademyById = async (req, res) => {
  try {
    const academy = await Academy.findById(req.params.id)
      .select("-password -googleId")
      .populate("students", "name email")
      .lean();

    if (!academy) {
      return res.status(404).json({ message: "Academy not found" });
    }

    res.json(academy);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid academy ID" });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Create a new class (stored in academy user document: users/academyId/classes)
// @route   POST /api/academy/classes
// @access  Private (Academy)
exports.createClass = async (req, res) => {
  try {
    const { name, description, level, schedule, price } = req.body;

    const academy = await Academy.findById(req.user._id);
    if (!academy) {
      return res.status(404).json({ message: "Academy not found" });
    }
    academy.classes.push({ name, description, level, schedule, price });
    await academy.save();
    const savedClass = academy.classes[academy.classes.length - 1];
    res.status(201).json(savedClass);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get all classes for an academy
// @route   GET /api/academy/classes
// @access  Public (or semi-private)
exports.getClasses = async (req, res) => {
  try {
    let academyIds = [];
    if (req.query.academyId) {
      academyIds = [req.query.academyId];
    } else if (req.user && req.user.role === "academy") {
      academyIds = [req.user._id];
    } else {
      const all = await Academy.find().select("_id").lean();
      academyIds = all.map((a) => a._id);
    }

    const academies = await Academy.find({ _id: { $in: academyIds } })
      .select("name address classes")
      .lean();
    const list = [];
    for (const academy of academies) {
      const classes = (academy.classes || []).map((c) => ({
        ...c,
        id: c._id,
        _id: c._id,
        academy: { name: academy.name, address: academy.address },
      }));
      list.push(...classes);
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Book a class (classId = embedded class _id in users/academyId/classes)
// @route   POST /api/academy/bookings
// @access  Private (Dancer)
exports.bookClass = async (req, res) => {
  try {
    const { classId, danceRole } = req.body;

    const academy = await Academy.findOne({ "classes._id": classId })
      .select("_id")
      .lean();
    if (!academy) {
      return res.status(404).json({ message: "Class not found" });
    }

    const existingBooking = await Booking.findOne({
      class: classId,
      dancer: req.user._id,
      status: "active",
    });
    if (existingBooking) {
      return res.status(400).json({ message: "Already booked this class" });
    }

    const booking = new Booking({
      class: classId,
      dancer: req.user._id,
      academy: academy._id,
      paymentStatus: "paid",
      danceRole:
        danceRole === "leader" || danceRole === "follower"
          ? danceRole
          : "follower",
    });
    await booking.save();

    await Academy.findByIdAndUpdate(academy._id, {
      $addToSet: { students: req.user._id },
    });
    await User.findByIdAndUpdate(req.user._id, {
      $push: { bookings: booking._id },
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get all bookings for a class (class in users/academyId/classes)
// @route   GET /api/academy/classes/:classId/bookings
// @access  Private (Academy – class must belong to academy)
exports.getClassBookings = async (req, res) => {
  try {
    const { classId } = req.params;
    const academy = await Academy.findOne({ "classes._id": classId })
      .select("_id")
      .lean();
    if (!academy) {
      return res.status(404).json({ message: "Class not found" });
    }
    if (String(academy._id) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Not authorized to view bookings for this class" });
    }
    const bookings = await Booking.find({ class: classId, status: "active" })
      .populate("dancer", "name phone")
      .sort({ createdAt: -1 })
      .lean();
    const list = bookings.map((b) => ({
      _id: b._id,
      dancerName: b.dancer?.name ?? "—",
      dancerPhone: b.dancer?.phone ?? null,
      danceRole: b.danceRole ?? "follower",
      paymentStatus: b.paymentStatus,
      createdAt: b.createdAt,
    }));
    res.json(list);
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid class ID" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// @desc    Get bookings for a dancer (class/academy from users/academyId/classes)
// @route   GET /api/academy/bookings/my
// @access  Private (Dancer)
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ dancer: req.user._id })
      .populate("dancer", "name")
      .lean();
    const academyIds = [...new Set(bookings.map((b) => String(b.academy)))];
    const academies = await Academy.find({ _id: { $in: academyIds } })
      .select("name classes")
      .lean();
    const academyMap = Object.fromEntries(
      academies.map((a) => [String(a._id), a])
    );
    const list = bookings.map((b) => {
      const academy = academyMap[String(b.academy)];
      const classDoc = academy?.classes?.find(
        (c) => String(c._id) === String(b.class)
      );
      return {
        ...b,
        class: classDoc
          ? { ...classDoc, _id: classDoc._id, id: classDoc._id }
          : null,
        academy: academy ? { name: academy.name } : null,
      };
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Enroll in academy (submit application + voucher)
// @route   POST /api/academy/:academyId/enroll
// @access  Private (Dancer)
exports.enroll = async (req, res) => {
  const schema = Joi.object({
    fullName: Joi.string().required(),
    phone: Joi.string().required(),
    email: Joi.string().email().required(),
    idNumber: Joi.string().required(),
    voucherImage: Joi.string().allow("").optional(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { academyId } = req.params;
  const { fullName, phone, email, idNumber, voucherImage } = req.body;
  const userId = req.user._id;

  try {
    const academy = await Academy.findById(academyId)
      .select("email name deviceToken")
      .lean();
    if (!academy) {
      return res.status(404).json({ message: "Academy not found" });
    }

    const existing = await Enrollment.findOne({
      academy: academyId,
      user: userId,
      status: { $in: ["pending", "approved"] },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Already enrolled",
      });
    }

    const enrollment = new Enrollment({
      academy: academyId,
      user: userId,
      fullName,
      phone,
      email,
      idNumber,
      status: "pending",
    });
    if (voucherImage && !/^data:image\/\w+;base64,/.test(voucherImage)) {
      enrollment.voucherUrl = voucherImage;
    }
    await enrollment.save();

    if (voucherImage && /^data:image\/\w+;base64,/.test(voucherImage)) {
      const dir = path.join(process.cwd(), "uploads", "enrollments");
      fs.mkdirSync(dir, { recursive: true });
      const match = voucherImage.match(/^data:image\/(\w+);base64,/);
      const ext =
        (match && match[1]) === "jpeg" ? "jpg" : (match && match[1]) || "png";
      const filename = `${enrollment._id}.${ext}`;
      const filePath = path.join(dir, filename);
      const base64Data = voucherImage.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      enrollment.voucherPath = path.join("uploads", "enrollments", filename);
      await enrollment.save();
    }

    const voucherLink = voucherImageUrl(enrollment) || "—";
    const applicant = { fullName, phone, email, idNumber };
    const attachments = [];
    if (enrollment.voucherPath) {
      const fullPath = path.join(process.cwd(), enrollment.voucherPath);
      if (fs.existsSync(fullPath)) {
        attachments.push({
          filename: `voucher-${enrollment._id}.${
            path.extname(enrollment.voucherPath).slice(1) || "png"
          }`,
          content: fs.readFileSync(fullPath),
        });
      }
    }

    await sendPush(
      academy.deviceToken,
      {
        title: "New enrollment",
        body: `New enrollment request from ${fullName} for ${academy.name}. Review in the dashboard.`,
      },
      { enrollmentId: String(enrollment._id), fullName }
    );
    await sendEnrollmentNotification(
      academy.email,
      applicant,
      voucherLink,
      attachments
    );

    res.status(200).json({
      success: true,
      enrollmentId: enrollment._id,
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid academy ID" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// @desc    List enrollments for an academy (dashboard)
// @route   GET /api/academy/enrollments or GET /api/academy/:academyId/enrollments
// @access  Private (Academy)
exports.listEnrollments = async (req, res) => {
  try {
    const academyId = req.params.academyId || req.user._id;
    if (
      req.params.academyId &&
      String(req.params.academyId) !== String(req.user._id)
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this academy's enrollments" });
    }
    const statusFilter = req.query.status; // e.g. ?status=pending
    const query = { academy: academyId };
    if (
      statusFilter &&
      ["pending", "approved", "rejected"].includes(statusFilter)
    ) {
      query.status = statusFilter;
    }
    const enrollments = await Enrollment.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();
    const list = enrollments.map((e) => ({
      id: e._id,
      userId: e.user?._id ?? e.user,
      fullName: e.fullName,
      phone: e.phone,
      email: e.email,
      idNumber: e.idNumber,
      voucherImageUrl: voucherImageUrl(e),
      status: e.status,
      createdAt: e.createdAt,
    }));
    res.json(list);
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid academy ID" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// @desc    Get one enrollment (detail for dashboard)
// @route   GET /api/academy/:academyId/enrollments/:enrollmentId
// @access  Private (Academy)
exports.getEnrollmentById = async (req, res) => {
  try {
    const { academyId, enrollmentId } = req.params;
    if (String(academyId) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this enrollment" });
    }
    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      academy: academyId,
    })
      .populate("user", "name email")
      .populate("reviewedBy", "name")
      .lean();
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }
    res.json({
      ...enrollment,
      id: enrollment._id,
      userId: enrollment.user?._id ?? enrollment.user,
      voucherImageUrl: voucherImageUrl(enrollment),
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid ID" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// @desc    Approve or reject enrollment (PATCH status)
// @route   PATCH /api/academy/:academyId/enrollments/:enrollmentId
// @access  Private (Academy)
exports.updateEnrollmentStatus = async (req, res) => {
  const schema = Joi.object({
    status: Joi.string().valid("approved", "rejected").required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { academyId, enrollmentId } = req.params;
  const { status } = req.body;

  try {
    if (String(academyId) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this enrollment" });
    }
    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      academy: academyId,
    })
      .populate("user", "email deviceToken")
      .lean();
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }
    if (enrollment.status !== "pending") {
      return res.status(400).json({ message: "Enrollment is not pending" });
    }

    const reviewedAt = new Date();
    const reviewedBy = req.user._id;
    await Enrollment.findByIdAndUpdate(enrollmentId, {
      status,
      reviewedAt,
      reviewedBy,
      updatedAt: reviewedAt,
    });

    const academy = await Academy.findById(academyId).select("name").lean();
    const academyName = academy?.name || "Academy";
    const dancerEmail = enrollment.user?.email || enrollment.email;
    const dancerToken = enrollment.user?.deviceToken;
    const dancerId = enrollment.user?._id ?? enrollment.user;

    if (status === "approved" && dancerId) {
      await Academy.findByIdAndUpdate(academyId, {
        $addToSet: { students: dancerId },
      });
      await sendPush(
        dancerToken,
        {
          title: "Enrollment approved",
          body: `Your enrollment at ${academyName} has been approved.`,
        },
        { enrollmentId: String(enrollment._id), status: "approved" }
      );
      await sendEnrollmentDecisionToDancer(dancerEmail, academyName, true);
    } else {
      await sendPush(
        dancerToken,
        {
          title: "Enrollment not approved",
          body: `Your enrollment at ${academyName} was not approved. Contact the academy for more information.`,
        },
        { enrollmentId: String(enrollment._id), status: "rejected" }
      );
      await sendEnrollmentDecisionToDancer(dancerEmail, academyName, false);
    }

    const updated = await Enrollment.findById(enrollment._id)
      .populate("user", "name email")
      .populate("reviewedBy", "name")
      .lean();
    res.json({
      ...updated,
      id: updated._id,
      userId: updated.user?._id ?? updated.user,
      voucherImageUrl: voucherImageUrl(updated),
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid ID" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// @desc    Get current user's enrollment status for an academy (dancer)
// @route   GET /api/academy/:academyId/enrollment
// @access  Private (Dancer)
exports.getMyEnrollmentStatus = async (req, res) => {
  try {
    const { academyId } = req.params;
    const userId = req.user._id;
    const enrollment = await Enrollment.findOne({
      academy: academyId,
      user: userId,
    })
      .sort({ createdAt: -1 })
      .lean();
    if (!enrollment) {
      return res.json({ enrolled: false, status: null });
    }
    res.json({
      enrolled: enrollment.status === "approved",
      status: enrollment.status,
      enrollmentId: enrollment._id,
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid academy ID" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};
