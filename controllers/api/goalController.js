const Goal = require('../../models/goal');
const AuditLog = require('../../models/auditLog');
const { calculateProgress, checkInPhases, getActivePhase } = require('../../utils/goalUtils');

const parseGoalInput = ({ title, description, thrustArea, uomType, target, weightage }) => {
  const numericTarget = Number(target);
  const numericWeight = Number(weightage);

  if (!title?.trim() || !['Min', 'Max', 'Zero'].includes(uomType)) {
    return { error: 'Title and a valid measurement type are required.' };
  }
  if (!Number.isFinite(numericTarget) || numericTarget < 0) {
    return { error: 'Target must be a non-negative number.' };
  }
  if (!Number.isFinite(numericWeight) || numericWeight < 10) {
    return { error: 'Each goal must have at least 10% weightage.' };
  }
  if (numericWeight > 100) {
    return { error: 'Weightage cannot exceed 100%.' };
  }

  return {
    value: {
      title: title.trim(),
      description,
      thrustArea,
      uomType,
      target: numericTarget,
      weightage: numericWeight
    }
  };
};

exports.listGoals = async (req, res) => {
  const goals = await Goal.find({ employeeId: req.user._id }).lean();
  res.json({ goals: goals.map((goal) => ({ ...goal, progress: calculateProgress(goal) })) });
};

exports.createGoal = async (req, res) => {
  const parsed = parseGoalInput(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  const goals = await Goal.find({ employeeId: req.user._id });
  const totalWeight = goals.reduce((sum, goal) => sum + goal.weightage, 0) + parsed.value.weightage;
  if (totalWeight > 100) {
    return res.status(400).json({ error: 'Total weightage cannot exceed 100%.' });
  }
  if (goals.length >= 8) {
    return res.status(400).json({ error: 'A maximum of 8 goals is allowed.' });
  }
  const goal = await Goal.create({
    employeeId: req.user._id,
    ...parsed.value,
    status: 'Not Started',
    phase: getActivePhase()
  });
  res.status(201).json({ goal });
};

exports.updateGoal = async (req, res) => {
  const parsed = parseGoalInput(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  const goal = await Goal.findById(req.params.id);
  if (!goal || goal.employeeId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ error: 'Goal not found.' });
  }
  if (goal.isLocked || goal.approvalStatus === 'Approved') {
    return res.status(400).json({ error: 'Approved goals cannot be edited.' });
  }
  const otherGoals = await Goal.find({ employeeId: req.user._id, _id: { $ne: goal._id } });
  const totalWeight = otherGoals.reduce((sum, item) => sum + item.weightage, 0) + parsed.value.weightage;
  if (totalWeight > 100) {
    return res.status(400).json({ error: 'Total weightage cannot exceed 100%.' });
  }
  const oldValue = goal.toObject();
  Object.assign(goal, parsed.value);
  await goal.save();
  await AuditLog.create({ userId: req.user._id, action: 'Updated goal', oldValue, newValue: goal.toObject() });
  res.json({ goal });
};

exports.submitGoal = async (req, res) => {
  const goal = await Goal.findById(req.params.id);
  if (!goal || goal.employeeId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ error: 'Goal not found.' });
  }
  if (goal.isLocked || goal.approvalStatus === 'Approved') {
    return res.status(400).json({ error: 'This goal cannot be submitted.' });
  }
  const goals = await Goal.find({ employeeId: req.user._id });
  const totalWeight = goals.reduce((sum, item) => sum + item.weightage, 0);
  if (totalWeight !== 100) {
    return res.status(400).json({ error: 'Total weightage must equal 100% before submission.' });
  }
  goal.approvalStatus = 'Pending';
  goal.phase = getActivePhase();
  await goal.save();
  res.json({ goal });
};

exports.updateAchievement = async (req, res) => {
  const { achievement } = req.body;
  const goal = await Goal.findById(req.params.id);
  if (!goal || goal.employeeId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ error: 'Goal not found.' });
  }
  const phase = getActivePhase();
  if (!checkInPhases.includes(phase)) {
    return res.status(400).json({ error: 'Achievements can only be updated during check-in phases.' });
  }
  const numericAchievement = Number(achievement);
  if (!Number.isFinite(numericAchievement) || numericAchievement < 0) {
    return res.status(400).json({ error: 'Achievement must be a non-negative number.' });
  }
  goal.achievement = numericAchievement;
  if (goal.achievement >= goal.target && goal.target > 0) {
    goal.status = 'Completed';
  } else if (goal.achievement > 0) {
    goal.status = 'On Track';
  }
  await goal.save();
  res.json({ goal });
};
