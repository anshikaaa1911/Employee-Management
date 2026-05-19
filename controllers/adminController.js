const User = require('../models/user');
const Goal = require('../models/goal');
const AuditLog = require('../models/auditLog');
const { allowedRoles } = require('../utils/userUtils');

exports.userList = async (req, res) => {
  const users = await User.find().select('-password').lean();
  const goals = await Goal.find().lean();
  const completion = users.map((user) => {
    const userGoals = goals.filter((goal) => goal.employeeId.toString() === user._id.toString());
    const completeCount = userGoals.filter((goal) => goal.status === 'Completed').length;
    return { name: user.name, total: userGoals.length, completed: completeCount };
  });
  res.render('admin/users', { user: req.user, users, completion });
};

exports.auditLogs = async (req, res) => {
  const logs = await AuditLog.find().populate('userId').sort({ timestamp: -1 }).lean();
  res.render('admin/audit', { user: req.user, logs });
};

exports.unlockGoal = async (req, res) => {
  const goal = await Goal.findById(req.params.id);
  if (!goal) {
    req.flash('error', 'Goal not found.');
    return res.redirect('/admin/audit');
  }
  const oldValue = goal.toObject();
  goal.isLocked = false;
  goal.approvalStatus = 'Pending';
  await goal.save();
  await AuditLog.create({
    userId: req.user._id,
    action: 'Unlocked goal',
    oldValue,
    newValue: goal.toObject()
  });
  res.redirect('/admin/audit');
};

exports.deleteUser = async (req, res) => {
  if (req.params.id !== req.user._id.toString()) {
    await Goal.deleteMany({ employeeId: req.params.id });
    await User.findByIdAndDelete(req.params.id);
  }
  res.redirect('/admin/users');
};

exports.updateUserRole = async (req, res) => {
  if (!allowedRoles.includes(req.body.role)) {
    req.flash('error', 'Invalid role.');
    return res.redirect('/admin/users');
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    req.flash('error', 'User not found.');
    return res.redirect('/admin/users');
  }
  user.role = req.body.role;
  await user.save();
  res.redirect('/admin/users');
};
