const jwt = require('jsonwebtoken');
const User = require('../models/user');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production.');
  }
  return process.env.JWT_SECRET || 'secret123';
};

exports.authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(token, getJwtSecret());
    const user = await User.findById(payload.userId).lean();
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

exports.allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
