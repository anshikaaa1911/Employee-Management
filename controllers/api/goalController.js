const Goal = require('../../models/goal');
const AuditLog = require('../../models/auditLog');
const { calculateProgress, checkInPhases, getActivePhase } = require('../../utils/goalUtils');

const priorities = ['High', 'Medium', 'Low'];
const categories = ['Productivity', 'Learning', 'Teamwork', 'Innovation'];

const clampProgress = (value) => Math.min(100, Math.max(0, Math.round(Number(value))));

const getStatusFromProgress = (progress) => {
  if (progress >= 100) return 'Completed';
  if (progress > 0) return 'On Track';
  return 'Not Started';
};

const parseGoalInput = ({ title, description, thrustArea, uomType, target, weightage, priority = 'Medium', category = 'Productivity', dueDate, progressPercentage = 0 }) => {
  const numericTarget = Number(target);
  const numericWeight = Number(weightage);
  const progress = clampProgress(progressPercentage);

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
  if (!priorities.includes(priority)) {
    return { error: 'Priority must be High, Medium, or Low.' };
  }
  if (!categories.includes(category)) {
    return { error: 'Category must be Productivity, Learning, Teamwork, or Innovation.' };
  }
  if (!Number.isFinite(progress)) {
    return { error: 'Progress must be between 0 and 100.' };
  }

  const parsedDueDate = dueDate ? new Date(dueDate) : null;
  if (dueDate && Number.isNaN(parsedDueDate.getTime())) {
    return { error: 'Due date must be a valid date.' };
  }

  return {
    value: {
      title: title.trim(),
      description: description?.trim() || '',
      thrustArea: thrustArea?.trim() || '',
      uomType,
      target: numericTarget,
      weightage: numericWeight,
      priority,
      category,
      dueDate: parsedDueDate,
      progressPercentage: progress,
      status: getStatusFromProgress(progress)
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
    phase: getActivePhase()
  });
  await AuditLog.create({ userId: req.user._id, action: 'Created goal', oldValue: null, newValue: goal.toObject() });
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

exports.deleteGoal = async (req, res) => {
  const goal = await Goal.findById(req.params.id);
  if (!goal || goal.employeeId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ error: 'Goal not found.' });
  }
  if (goal.isLocked || goal.approvalStatus === 'Approved') {
    return res.status(400).json({ error: 'Approved goals cannot be deleted.' });
  }
  await Goal.findByIdAndDelete(goal._id);
  await AuditLog.create({ userId: req.user._id, action: 'Deleted goal', oldValue: goal.toObject(), newValue: null });
  res.json({ success: true });
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
  await AuditLog.create({ userId: req.user._id, action: 'Submitted goal', oldValue: null, newValue: goal.toObject() });
  res.json({ goal });
};

exports.updateAchievement = async (req, res) => {
  const { achievement, progressPercentage } = req.body;
  const goal = await Goal.findById(req.params.id);
  if (!goal || goal.employeeId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ error: 'Goal not found.' });
  }
  const oldValue = goal.toObject();
  const phase = getActivePhase();
  const numericAchievement = Number(achievement);
  if (achievement !== undefined && (!Number.isFinite(numericAchievement) || numericAchievement < 0)) {
    return res.status(400).json({ error: 'Achievement must be a non-negative number.' });
  }

  if (achievement !== undefined) {
    if (!checkInPhases.includes(phase)) {
      return res.status(400).json({ error: 'Achievements can only be updated during check-in phases.' });
    }
    goal.achievement = numericAchievement;
  }
  if (progressPercentage !== undefined) {
    const progress = clampProgress(progressPercentage);
    if (!Number.isFinite(progress)) {
      return res.status(400).json({ error: 'Progress must be between 0 and 100.' });
    }
    goal.progressPercentage = progress;
  } else if (achievement !== undefined) {
    goal.progressPercentage = calculateProgress(goal);
  }
  goal.status = getStatusFromProgress(calculateProgress(goal));
  await goal.save();
  await AuditLog.create({ userId: req.user._id, action: 'Updated progress', oldValue, newValue: goal.toObject() });
  res.json({ goal });
};

exports.activity = async (req, res) => {
  const goals = await Goal.find({ employeeId: req.user._id }).select('_id').lean();
  const goalIds = new Set(goals.map((goal) => goal._id.toString()));
  const logs = await AuditLog.find({
    $or: [
      { userId: req.user._id },
      { 'newValue._id': { $in: Array.from(goalIds) } },
      { 'oldValue._id': { $in: Array.from(goalIds) } }
    ]
  }).populate('userId', 'name role').sort({ timestamp: -1 }).limit(40).lean();
  res.json({ activities: logs });
};

exports.notifications = async (req, res) => {
  const now = new Date();
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const goals = await Goal.find({ employeeId: req.user._id }).lean();
  const notifications = [];

  goals.forEach((goal) => {
    if (goal.approvalStatus === 'Approved') {
      notifications.push({ id: `${goal._id}-approved`, type: 'Goal approved', message: `${goal.title} was approved.`, read: false, createdAt: goal.updatedAt });
    }
    if (goal.approvalStatus === 'Rejected') {
      notifications.push({ id: `${goal._id}-rejected`, type: 'Goal rejected', message: `${goal.title} was rejected${goal.managerComment ? `: ${goal.managerComment}` : '.'}`, read: false, createdAt: goal.updatedAt });
    }
    if (goal.dueDate && goal.status !== 'Completed') {
      const dueDate = new Date(goal.dueDate);
      if (dueDate >= now && dueDate <= threeDays) {
        notifications.push({ id: `${goal._id}-deadline`, type: 'Goal deadline approaching', message: `${goal.title} is due by ${dueDate.toLocaleDateString('en-US')}.`, read: false, createdAt: goal.dueDate });
      }
    }
  });

  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ notifications, unreadCount: notifications.filter((item) => !item.read).length });
};
