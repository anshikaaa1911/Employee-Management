const Goal = require('../models/goal');
const AuditLog = require('../models/auditLog');
const { calculateProgress, checkInPhases, getActivePhase } = require('../utils/goalUtils');

exports.goalsList = async (req, res) => {
  const goals = await Goal.find({ employeeId: req.user._id }).lean();
  const activePhase = getActivePhase();
  goals.forEach((goal) => {
    goal.progress = calculateProgress(goal);
  });
  res.render('employee/goals', { user: req.user, goals, activePhase, messages: req.flash('error') });
};

exports.newGoalPage = async (req, res) => {
  const count = await Goal.countDocuments({ employeeId: req.user._id });
  if (count >= 8) {
    req.flash('error', 'You already have the maximum of 8 goals.');
    return res.redirect('/employee/goals');
  }
  res.render('employee/newGoal', { user: req.user, activePhase: getActivePhase(), error: req.flash('error') });
};

exports.createGoal = async (req, res) => {
  const { title, description, thrustArea, uomType, target, weightage } = req.body;
  const numericWeight = Number(weightage);
  if (numericWeight < 10) {
    req.flash('error', 'Each goal must have at least 10% weightage.');
    return res.redirect('/employee/goals/new');
  }

  const goals = await Goal.find({ employeeId: req.user._id });
  const totalWeight = goals.reduce((sum, goal) => sum + goal.weightage, 0) + numericWeight;
  if (totalWeight > 100) {
    req.flash('error', 'Total weightage cannot exceed 100%.');
    return res.redirect('/employee/goals/new');
  }

  if (goals.length >= 8) {
    req.flash('error', 'A maximum of 8 goals is allowed.');
    return res.redirect('/employee/goals');
  }

  await Goal.create({
    employeeId: req.user._id,
    title,
    description,
    thrustArea,
    uomType,
    target: Number(target),
    weightage: numericWeight,
    status: 'Not Started',
    phase: getActivePhase()
  });
  res.redirect('/employee/goals');
};

exports.editGoalPage = async (req, res) => {
  const goal = await Goal.findById(req.params.id).lean();
  if (!goal || goal.employeeId.toString() !== req.user._id.toString()) {
    req.flash('error', 'Goal not found.');
    return res.redirect('/employee/goals');
  }
  if (goal.isLocked || goal.approvalStatus === 'Approved') {
    req.flash('error', 'Approved goals cannot be edited.');
    return res.redirect('/employee/goals');
  }
  res.render('employee/editGoal', { user: req.user, goal, activePhase: getActivePhase(), error: req.flash('error') });
};

exports.updateGoal = async (req, res) => {
  const { title, description, thrustArea, uomType, target, weightage } = req.body;
  const goal = await Goal.findById(req.params.id);
  if (!goal || goal.employeeId.toString() !== req.user._id.toString()) {
    req.flash('error', 'Goal not found.');
    return res.redirect('/employee/goals');
  }
  if (goal.isLocked || goal.approvalStatus === 'Approved') {
    req.flash('error', 'Approved goals cannot be edited.');
    return res.redirect('/employee/goals');
  }

  const otherGoals = await Goal.find({ employeeId: req.user._id, _id: { $ne: goal._id } });
  const totalWeight = otherGoals.reduce((sum, item) => sum + item.weightage, 0) + Number(weightage);
  if (Number(weightage) < 10) {
    req.flash('error', 'Each goal must have at least 10% weightage.');
    return res.redirect(`/employee/goals/${goal._id}/edit`);
  }
  if (totalWeight > 100) {
    req.flash('error', 'Total weightage cannot exceed 100%.');
    return res.redirect(`/employee/goals/${goal._id}/edit`);
  }

  const oldValue = goal.toObject();
  goal.title = title;
  goal.description = description;
  goal.thrustArea = thrustArea;
  goal.uomType = uomType;
  goal.target = Number(target);
  goal.weightage = Number(weightage);
  await goal.save();

  await AuditLog.create({
    userId: req.user._id,
    action: 'Updated goal',
    oldValue,
    newValue: goal.toObject()
  });

  res.redirect('/employee/goals');
};

exports.submitGoal = async (req, res) => {
  const goal = await Goal.findById(req.params.id);
  if (!goal || goal.employeeId.toString() !== req.user._id.toString()) {
    req.flash('error', 'Goal not found.');
    return res.redirect('/employee/goals');
  }
  if (goal.isLocked || goal.approvalStatus === 'Approved') {
    req.flash('error', 'This goal cannot be submitted.');
    return res.redirect('/employee/goals');
  }
  const goals = await Goal.find({ employeeId: req.user._id });
  const totalWeight = goals.reduce((sum, item) => sum + item.weightage, 0);
  if (totalWeight !== 100) {
    req.flash('error', 'Total weightage must equal 100% before submission.');
    return res.redirect('/employee/goals');
  }
  goal.approvalStatus = 'Pending';
  goal.phase = getActivePhase();
  await goal.save();
  res.redirect('/employee/goals');
};

exports.updateAchievement = async (req, res) => {
  const { achievement } = req.body;
  const goal = await Goal.findById(req.params.id);
  if (!goal || goal.employeeId.toString() !== req.user._id.toString()) {
    req.flash('error', 'Goal not found.');
    return res.redirect('/employee/goals');
  }
  if (!checkInPhases.includes(getActivePhase())) {
    req.flash('error', 'Achievements can only be updated during check-in phases.');
    return res.redirect('/employee/goals');
  }
  goal.achievement = Number(achievement);
  if (goal.achievement >= goal.target && goal.target > 0) {
    goal.status = 'Completed';
  } else if (goal.achievement > 0) {
    goal.status = 'On Track';
  }
  await goal.save();
  res.redirect('/employee/goals');
};
