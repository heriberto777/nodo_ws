const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const createError = require("http-errors");
const env = require("../config/env");
const { createUser, findByEmail, countUsers } = require("../models/user.model");

const registerSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid("admin", "operator", "viewer").required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

const register = async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");

  const totalUsers = await countUsers();
  if (totalUsers > 0) {
    if (!req.user || req.user.role !== "admin") {
      throw createError(403, "Forbidden");
    }
  }

  const existing = await findByEmail(req.body.email);
  if (existing) throw createError(409, "Email already exists");

  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const user = await createUser({
    name: req.body.name,
    email: req.body.email,
    passwordHash,
    role: req.body.role
  });

  res.status(201).json(user);
};

const login = async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");

  const user = await findByEmail(req.body.email);
  if (!user) throw createError(401, "Invalid credentials");

  const matches = await bcrypt.compare(req.body.password, user.password_hash);
  if (!matches) throw createError(401, "Invalid credentials");

  if (!env.jwtSecret) throw createError(500, "JWT_SECRET not configured");

  const token = jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
};

module.exports = { register, login };
