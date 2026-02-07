const express = require("express");
const router = express.Router();
const {
  createClass,
  getClasses,
  getClassBookings,
  bookClass,
  getMyBookings,
  cancelBooking,
  getAcademies,
  getAcademyById,
  enroll,
  listEnrollments,
  getEnrollmentById,
  updateEnrollmentStatus,
  getMyEnrollmentStatus,
} = require("../controllers/academyController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Public/Shared
router.get("/academies", getAcademies);
router.get("/classes", getClasses);
router.get(
  "/classes/:classId/bookings",
  protect,
  authorize("academy"),
  getClassBookings
);

// Academy dashboard – enrollments (fixed path before /:id)
router.get("/enrollments", protect, authorize("academy"), listEnrollments);
router.get(
  "/:academyId/enrollments",
  protect,
  authorize("academy"),
  listEnrollments
);
router.get(
  "/:academyId/enrollments/:enrollmentId",
  protect,
  authorize("academy"),
  getEnrollmentById
);
router.patch(
  "/:academyId/enrollments/:enrollmentId",
  protect,
  authorize("academy"),
  updateEnrollmentStatus
);

// Dancer – enrollment status & submit
router.get(
  "/:academyId/enrollment",
  protect,
  authorize("dancer"),
  getMyEnrollmentStatus
);
router.post("/:academyId/enroll", protect, authorize("dancer"), enroll);

// Academy by ID (parametric route last)
router.get("/:id", getAcademyById);

// Academy Protected
router.post("/classes", protect, authorize("academy"), createClass);

// Dancer Protected
router.post("/bookings", protect, authorize("dancer"), bookClass);
router.get("/bookings/my", protect, authorize("dancer"), getMyBookings);
router.patch("/bookings/:bookingId", protect, authorize("dancer"), cancelBooking);

module.exports = router;
