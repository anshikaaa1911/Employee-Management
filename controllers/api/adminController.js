const User = require('../../models/user');
const Goal = require('../../models/goal');
const AuditLog = require('../../models/auditLog');
const { allowedRoles, serializeUser } = require('../../utils/userUtils');

exports.userList = async (req, res) => {
  const users = await User.find().select('-password').lean();
  const goals = await Goal.find().lean();
  const completion = users.map((user) => {
    const userGoals = goals.filter((goal) => goal.employeeId?.toString() === user._id.toString());
    const completeCount = userGoals.filter((goal) => goal.status === 'Completed').length;
    return { name: user.name, total: userGoals.length, completed: completeCount };
  });
  res.json({ users: users.map(serializeUser), completion });
};

exports.auditLogs = async (req, res) => {
  const logs = await AuditLog.find().populate('userId', 'name email').sort({ timestamp: -1 }).lean();
  res.json({ logs });
};

exports.unlockGoal = async (req, res) => {
  const goal = await Goal.findById(req.params.id);
  if (!goal) {
    return res.status(404).json({ error: 'Goal not found.' });
  }
  const oldValue = goal.toObject();
  goal.isLocked = false;
  goal.approvalStatus = 'Pending';
  await goal.save();
  await AuditLog.create({ userId: req.user._id, action: 'Unlocked goal', oldValue, newValue: goal.toObject() });
  res.json({ goal });
};

exports.updateUserRole = async (req, res) => {
  if (!allowedRoles.includes(req.body.role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  const oldValue = { role: user.role };
  user.role = req.body.role;
  await user.save();
  await AuditLog.create({ userId: req.user._id, action: 'Updated user role', oldValue, newValue: { role: user.role, userId: user._id } });
  res.json({ user: serializeUser(user) });
};

exports.deleteUser = async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  await Goal.deleteMany({ employeeId: user._id });
  await User.findByIdAndDelete(user._id);
  await AuditLog.create({ userId: req.user._id, action: 'Deleted user', oldValue: serializeUser(user), newValue: null });
  res.json({ success: true });
};
