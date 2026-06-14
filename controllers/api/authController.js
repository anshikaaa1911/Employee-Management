const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../models/user');
const Team = require('../../models/team');
const JoinRequest = require('../../models/joinRequest');
const Notification = require('../../models/notification');
const TeamActivity = require('../../models/teamActivity');
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
  const managerId = normalizeString(req.body.managerId);
  const teamId = normalizeString(req.body.teamId);

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
    let manager = null;
    let team = null;
    if (role === 'employee') {
      if (!managerId) {
        return res.status(400).json({ error: 'Choose a manager/team.' });
      }
      if (!mongoose.Types.ObjectId.isValid(managerId)) {
        return res.status(400).json({ error: 'Choose a valid manager/team.' });
      }
      manager = await User.findOne({ _id: managerId, role: 'manager' }).select('_id name').lean();
      if (!manager) {
        return res.status(400).json({ error: 'Choose a valid manager/team.' });
      }
      if (teamId) {
        if (!mongoose.Types.ObjectId.isValid(teamId)) {
          return res.status(400).json({ error: 'Choose a valid team.' });
        }
        team = await Team.findOne({ _id: teamId, lead: managerId, status: 'Active' }).select('_id name').lean();
        if (!team) {
          return res.status(400).json({ error: 'Choose a valid team.' });
        }
      }
    }

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role
    });
    if (manager) {
      const request = await JoinRequest.create({
        employeeId: user._id,
        managerId: manager._id,
        teamId: team?._id,
        message: `${name} requested access during registration.`
      });
      await Notification.create({
        recipientId: manager._id,
        actorId: user._id,
        type: 'Join request',
        message: `${name} requested to join ${team?.name || 'your team'}.`,
        metadata: { requestId: request._id, teamId: team?._id }
      });
      await TeamActivity.create({
        teamId: team?._id,
        actorId: user._id,
        employeeId: user._id,
        action: 'Join requested',
        message: `${name} selected ${manager.name}'s team during registration.`
      });
    }
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

exports.managers = async (req, res) => {
  const managers = await User.find({ role: 'manager' })
    .select('_id name department')
    .sort({ name: 1 })
    .lean();
  const teams = await Team.find({ lead: { $in: managers.map((manager) => manager._id) }, status: 'Active' })
    .select('_id name description lead members status')
    .sort({ name: 1 })
    .lean();
  const teamsByManager = teams.reduce((map, team) => {
    const key = team.lead.toString();
    map[key] = map[key] || [];
    map[key].push({
      ...team,
      memberCount: team.members.length
    });
    return map;
  }, {});
  res.json({
    managers: managers.map((manager) => ({
      ...manager,
      teams: teamsByManager[manager._id.toString()] || []
    }))
  });
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
