const Goal = require('../../models/goal');
const User = require('../../models/user');
const AuditLog = require('../../models/auditLog');
const { calculateProgress, getScopedGoalQuery } = require('../../utils/goalUtils');

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
  res.json({ goals: goals.map((goal) => ({ ...goal, progress: calculateProgress(goal) })) });
};

exports.dashboard = async (req, res) => {
  const scopedQuery = await getScopedGoalQuery(req.user);
  const goals = await Goal.find(scopedQuery).populate('employeeId', 'name department managerId').lean();
  const totalEmployeeCount = await User.countDocuments({ role: 'employee' });
  const employees = req.user.role === 'admin'
    ? await User.find({ role: 'employee' }).select('_id name department').lean()
    : await User.find({ managerId: req.user._id }).select('_id name department').lean();
  const completed = goals.filter((goal) => goal.status === 'Completed').length;
  const teamPerformanceScore = goals.length ? Math.round((completed / goals.length) * 100) : 0;
  res.json({
    activeEmployeeCount: employees.length,
    totalEmployeeCount,
    unassignedEmployeeCount: req.user.role === 'admin' ? await User.countDocuments({ role: 'employee', managerId: { $exists: false } }) : 0,
    pendingApprovalsCount: goals.filter((goal) => goal.approvalStatus === 'Pending').length,
    teamPerformanceScore,
    goals: goals.map((goal) => ({ ...goal, progress: calculateProgress(goal) })),
    employees
  });
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
  if (!req.body.managerComment?.trim()) {
    return res.status(400).json({ error: 'A rejection comment is required.' });
  }
  const oldValue = goal.toObject();
  goal.approvalStatus = 'Rejected';
  goal.managerComment = req.body.managerComment.trim();
  goal.isLocked = false;
  await goal.save();
  await AuditLog.create({ userId: req.user._id, action: 'Rejected goal', oldValue, newValue: goal.toObject() });
  res.json({ goal });
};

exports.bulkReviewGoals = async (req, res) => {
  const { goalIds, action, managerComment = '' } = req.body;
  if (!Array.isArray(goalIds) || goalIds.length === 0) {
    return res.status(400).json({ error: 'Select at least one goal.' });
  }
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Bulk action must be approve or reject.' });
  }
  if (action === 'reject' && !managerComment.trim()) {
    return res.status(400).json({ error: 'A rejection comment is required.' });
  }

  const reviewed = [];
  for (const goalId of goalIds) {
    const goal = await findReviewableGoal(goalId, req.user);
    if (!goal) continue;
    const oldValue = goal.toObject();
    goal.approvalStatus = action === 'approve' ? 'Approved' : 'Rejected';
    goal.isLocked = action === 'approve';
    goal.managerComment = action === 'approve' ? managerComment.trim() : managerComment.trim();
    await goal.save();
    await AuditLog.create({
      userId: req.user._id,
      action: action === 'approve' ? 'Bulk approved goal' : 'Bulk rejected goal',
      oldValue,
      newValue: goal.toObject()
    });
    reviewed.push(goal);
  }

  res.json({ goals: reviewed, count: reviewed.length });
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
