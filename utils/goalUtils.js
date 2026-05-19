const User = require('../models/user');

const checkInPhases = ['Q1 Check-in', 'Q2 Check-in', 'Q3 Check-in', 'Q4 Final Check-in'];

const calculateProgress = (goal) => {
  const target = Number(goal.target);
  const achievement = Number(goal.achievement);

  if (!Number.isFinite(target) || !Number.isFinite(achievement)) {
    return 0;
  }

  if (goal.uomType === 'Min' || goal.uomType === 'Max') {
    return target <= 0 ? 0 : Math.min(100, Math.max(0, Math.round((achievement / target) * 100)));
  }

  if (goal.uomType === 'Zero') {
    return achievement === 0 ? 100 : 0;
  }

  return 0;
};

const getScopedGoalQuery = async (user) => {
  if (user.role === 'admin') {
    return {};
  }

  if (user.role === 'manager') {
    const employees = await User.find({ managerId: user._id }).select('_id').lean();
    return { employeeId: { $in: employees.map((employee) => employee._id) } };
  }

  return { employeeId: user._id };
};

const getActivePhase = () => process.env.ACTIVE_PHASE || 'goal-setting';

module.exports = {
  calculateProgress,
  checkInPhases,
  getActivePhase,
  getScopedGoalQuery
};
