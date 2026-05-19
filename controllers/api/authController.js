const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/user');
const { serializeUser } = require('../../utils/userUtils');

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
