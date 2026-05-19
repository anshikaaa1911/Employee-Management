const Goal = require('../../models/goal');
const AuditLog = require('../../models/auditLog');
const { getScopedGoalQuery } = require('../../utils/goalUtils');

const findReviewableGoal = async (goalId, user) => {
  const goal = await Goal.findById(goalId).populate('employeeId', 'name department managerId');
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
  const goals = await Goal.find(await getScopedGoalQuery(req.user)).populate('employeeId', 'name department managerId').lean();
  res.json({ goals });
};

exports.reviewGoalPage = async (req, res) => {
  const goal = await findReviewableGoal(req.params.id, req.user);
  if (!goal) {
    return res.status(404).json({ error: 'Goal not found.' });
  }
  res.json({ goal });
};

exports.approveGoal = async (req, res) => {
  const goal = await findReviewableGoal(req.params.id, req.user);
  if (!goal) {
    return res.status(404).json({ error: 'Goal not found.' });
  }
  const oldValue = goal.toObject();
  goal.approvalStatus = 'Approved';
  goal.isLocked = true;
  goal.managerComment = req.body.managerComment || '';
  await goal.save();
  await AuditLog.create({ userId: req.user._id, action: 'Approved goal', oldValue, newValue: goal.toObject() });
  res.json({ goal });
};

exports.rejectGoal = async (req, res) => {
  const goal = await findReviewableGoal(req.params.id, req.user);
  if (!goal) {
    return res.status(404).json({ error: 'Goal not found.' });
  }
  const oldValue = goal.toObject();
  goal.approvalStatus = 'Rejected';
  goal.managerComment = req.body.managerComment || '';
  goal.isLocked = false;
  await goal.save();
  await AuditLog.create({ userId: req.user._id, action: 'Rejected goal', oldValue, newValue: goal.toObject() });
  res.json({ goal });
};

exports.editGoal = async (req, res) => {
  const goal = await findReviewableGoal(req.params.id, req.user);
  if (!goal) {
    return res.status(404).json({ error: 'Goal not found.' });
  }
  const target = Number(req.body.target);
  const weightage = Number(req.body.weightage);
  if (!Number.isFinite(target) || target < 0 || !Number.isFinite(weightage) || weightage < 10 || weightage > 100) {
    return res.status(400).json({ error: 'Target and weightage must be valid non-negative values.' });
  }
  const oldValue = goal.toObject();
  goal.target = target;
  goal.weightage = weightage;
  goal.managerComment = req.body.managerComment || goal.managerComment;
  await goal.save();
  await AuditLog.create({ userId: req.user._id, action: 'Edited goal target or weightage', oldValue, newValue: goal.toObject() });
  res.json({ goal });
};
