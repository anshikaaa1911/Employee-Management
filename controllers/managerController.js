const Goal = require('../models/goal');
const AuditLog = require('../models/auditLog');
const User = require('../models/user');

const findReviewableGoal = async (goalId, user) => {
  const goal = await Goal.findById(goalId).populate('employeeId');
  if (!goal) {
    return null;
  }
  if (user.role === 'admin') {
    return goal;
  }
  if (goal.employeeId?.managerId?.toString() !== user._id.toString()) {
    return null;
  }
  return goal;
};

exports.teamGoals = async (req, res) => {
  const employees = await User.find({ managerId: req.user._id }).lean();
  const employeeIds = employees.map((user) => user._id);
  const goals = await Goal.find({ employeeId: { $in: employeeIds } }).populate('employeeId').lean();
  res.render('manager/teamGoals', { user: req.user, goals, employees });
};

exports.reviewGoalPage = async (req, res) => {
  const goal = await findReviewableGoal(req.params.id, req.user);
  if (!goal) {
    req.flash('error', 'Goal not found.');
    return res.redirect('/manager/team-goals');
  }
  res.render('manager/reviewGoal', { user: req.user, goal, error: req.flash('error') });
};

exports.approveGoal = async (req, res) => {
  const goal = await findReviewableGoal(req.params.id, req.user);
  if (!goal) {
    req.flash('error', 'Goal not found.');
    return res.redirect('/manager/team-goals');
  }
  const oldValue = goal.toObject();
  goal.approvalStatus = 'Approved';
  goal.isLocked = true;
  goal.managerComment = req.body.managerComment || '';
  await goal.save();
  await AuditLog.create({
    userId: req.user._id,
    action: 'Approved goal',
    oldValue,
    newValue: goal.toObject()
  });
  res.redirect('/manager/team-goals');
};

exports.rejectGoal = async (req, res) => {
  const goal = await findReviewableGoal(req.params.id, req.user);
  if (!goal) {
    req.flash('error', 'Goal not found.');
    return res.redirect('/manager/team-goals');
  }
  const oldValue = goal.toObject();
  goal.approvalStatus = 'Rejected';
  goal.managerComment = req.body.managerComment || '';
  goal.isLocked = false;
  await goal.save();
  await AuditLog.create({
    userId: req.user._id,
    action: 'Rejected goal',
    oldValue,
    newValue: goal.toObject()
  });
  res.redirect('/manager/team-goals');
};

exports.editGoal = async (req, res) => {
  const goal = await findReviewableGoal(req.params.id, req.user);
  if (!goal) {
    req.flash('error', 'Goal not found.');
    return res.redirect('/manager/team-goals');
  }
  const oldValue = goal.toObject();
  const target = Number(req.body.target);
  const weightage = Number(req.body.weightage);
  if (!Number.isFinite(target) || target < 0 || !Number.isFinite(weightage) || weightage < 10 || weightage > 100) {
    req.flash('error', 'Target and weightage must be valid values.');
    return res.redirect('/manager/team-goals');
  }
  goal.target = target;
  goal.weightage = weightage;
  goal.managerComment = req.body.managerComment || goal.managerComment;
  await goal.save();
  await AuditLog.create({
    userId: req.user._id,
    action: 'Edited goal target or weightage',
    oldValue,
    newValue: goal.toObject()
  });
  res.redirect('/manager/team-goals');
};
