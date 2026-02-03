const { User, Dancer, Establishment, Academy } = require("../models/User");
const Enrollment = require("../models/Enrollment");
const jwt = require("jsonwebtoken");
const Joi = require("joi");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Register
exports.register = async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string()
      .valid("dancer", "establishment", "academy", "admin")
      .required(),
    address: Joi.string()
      .when("role", { is: "establishment", then: Joi.required() })
      .when("role", { is: "academy", then: Joi.required() }),
    description: Joi.string(),
    location: Joi.array().items(Joi.number()).length(2), // [long, lat]
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { name, email, password, role, address, description, location } =
    req.body;

  try {
    let userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    let user;
    const userData = { name, email, password, role };

    if (role === "dancer") {
      user = new Dancer({ ...userData });
      if (location) user.location = { type: "Point", coordinates: location };
    } else if (role === "establishment") {
      user = new Establishment({ ...userData, address, description });
      if (location) user.location = { type: "Point", coordinates: location };
    } else if (role === "academy") {
      user = new Academy({ ...userData, address, description });
      if (location) user.location = { type: "Point", coordinates: location };
    } else {
      user = new User(userData);
    }

    await user.save();
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      const payload = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      };

      const approvedEnrollment = await Enrollment.findOne({
        user: user._id,
        status: "approved",
      })
        .populate("academy", "name _id")
        .sort({ updatedAt: -1 })
        .lean();

      if (approvedEnrollment) {
        payload.enrolledAcademy = {
          _id: approvedEnrollment.academy?._id ?? approvedEnrollment.academy,
          name: approvedEnrollment.academy?.name,
          status: approvedEnrollment.status,
          nextPaymentDate:
            approvedEnrollment.updatedAt + 30 * 24 * 60 * 60 * 1000,
        };
      }

      res.json(payload);
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update profile (logged-in user)
exports.updateProfile = async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().min(1),
    avatar: Joi.string().allow(""),
  }).min(1);

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { name, avatar } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (avatar !== undefined) updates.avatar = avatar;

  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select("-password -googleId")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
