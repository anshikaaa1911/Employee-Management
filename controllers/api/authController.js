const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/user');
const { serializeUser } = require('../../utils/userUtils');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const registrationRoles = ['employee', 'manager'];

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production.');
  }
  return process.env.JWT_SECRET || 'secret123';
};

const signToken = (user) => {
  const payload = { userId: user._id, role: user.role };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '8h' });
};

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

exports.register = async (req, res) => {
  const name = normalizeString(req.body.name);
  const email = normalizeString(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const role = normalizeString(req.body.role).toLowerCase();

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required.' });
  }

  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ error: 'Full name must be between 2 and 80 characters.' });
  }

  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  if (!registrationRoles.includes(role)) {
    return res.status(400).json({ error: 'Role must be Employee or Manager.' });
  }

  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role
    });
    const userObject = user.toObject();
    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: serializeUser(userObject)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    throw error;
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const user = await User.findOne({ email: email.trim().toLowerCase() }).lean();
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const token = signToken(user);
  res.json({ token, user: serializeUser(user) });
};

exports.getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ user: serializeUser(req.user) });
};
