const mongoose = require('mongoose');
const Team = require('../../models/team');
const JoinRequest = require('../../models/joinRequest');
const Notification = require('../../models/notification');
const TeamActivity = require('../../models/teamActivity');
const User = require('../../models/user');
const Goal = require('../../models/goal');
const AuditLog = require('../../models/auditLog');
const { calculateProgress } = require('../../utils/goalUtils');

const objectIdIsValid = (id) => mongoose.Types.ObjectId.isValid(id);
const clean = (value) => (typeof value === 'string' ? value.trim() : '');

const getManagerQuery = (user) => (user.role === 'admin' ? {} : { lead: user._id });

const notify = async ({ recipientId, actorId, type, message, metadata = {} }) => {
  if (!recipientId) return null;
  return Notification.create({ recipientId, actorId, type, message, metadata });
};

const logActivity = async ({ teamId, actorId, employeeId, action, message }) => {
  return TeamActivity.create({ teamId, actorId, employeeId, action, message });
};

const getEmployeeTeam = async (employeeId) => {
  return Team.findOne({ members: employeeId })
    .populate('lead', 'name email role department')
    .populate('members', 'name email role department managerId')
    .lean();
};

const teamWithDetails = async (query) => {
  return Team.find(query)
    .populate('lead', 'name email role department')
    .populate('members', 'name email role department managerId')
    .sort({ createdAt: -1 })
    .lean();
};

const teamStats = async (teams) => {
  const memberIds = teams.flatMap((team) => team.members.map((member) => member._id || member));
  const goals = memberIds.length ? await Goal.find({ employeeId: { $in: memberIds } }).lean() : [];
  const completedGoals = goals.filter((goal) => goal.status === 'Completed').length;
  return {
    teams: teams.length,
    employees: new Set(memberIds.map((id) => id.toString())).size,
    goals: goals.length,
    completedGoals,
    completionRate: goals.length ? Math.round((completedGoals / goals.length) * 100) : 0,
    averageProgress: goals.length ? Math.round(goals.reduce((sum, goal) => sum + calculateProgress(goal), 0) / goals.length) : 0
  };
};

exports.overview = async (req, res) => {
  const managerQuery = req.user.role === 'employee'
    ? { members: req.user._id }
    : getManagerQuery(req.user);
  const teams = await teamWithDetails(managerQuery);
  const currentTeam = req.user.role === 'employee' ? await getEmployeeTeam(req.user._id) : null;
  const requestsQuery = req.user.role === 'employee'
    ? { employeeId: req.user._id }
    : { managerId: req.user._id };
  const requests = await JoinRequest.find(requestsQuery)
    .populate('employeeId', 'name email department role managerId')
    .populate('managerId', 'name email department role')
    .populate('teamId', 'name description status')
    .sort({ createdAt: -1 })
    .lean();
  const notifications = await Notification.find({ recipientId: req.user._id })
    .populate('actorId', 'name role')
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  const teamIds = teams.map((team) => team._id);
  const activities = await TeamActivity.find({
    $or: [
      { teamId: { $in: teamIds } },
      { actorId: req.user._id },
      { employeeId: req.user._id }
    ]
  })
    .populate('actorId', 'name role')
    .populate('employeeId', 'name role')
    .populate('teamId', 'name')
    .sort({ createdAt: -1 })
    .limit(40)
    .lean();
  const managers = await User.find({ role: 'manager' }).select('_id name email department').sort({ name: 1 }).lean();
  const employees = req.user.role === 'employee'
    ? []
    : await User.find({ role: 'employee' }).select('_id name email department managerId createdAt').sort({ name: 1 }).lean();
  const stats = await teamStats(req.user.role === 'employee' && currentTeam ? [currentTeam] : teams);

  res.json({
    teams,
    currentTeam,
    requests,
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
    activities,
    managers,
    employees,
    stats
  });
};

exports.createTeam = async (req, res) => {
  const name = clean(req.body.name);
  const description = clean(req.body.description);
  if (!name) {
    return res.status(400).json({ error: 'Team name is required.' });
  }
  const team = await Team.create({
    name,
    description,
    lead: req.user._id,
    members: [],
    status: req.body.status === 'Archived' ? 'Archived' : 'Active'
  });
  await logActivity({ teamId: team._id, actorId: req.user._id, action: 'Team created', message: `${name} was created.` });
  await AuditLog.create({ userId: req.user._id, action: 'Created team', oldValue: null, newValue: team.toObject() });
  res.status(201).json({ team });
};

exports.updateTeam = async (req, res) => {
  const team = await Team.findOne({ _id: req.params.id, ...getManagerQuery(req.user) });
  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }
  const oldValue = team.toObject();
  const name = clean(req.body.name);
  if (name) team.name = name;
  team.description = clean(req.body.description);
  if (['Active', 'Archived'].includes(req.body.status)) team.status = req.body.status;
  await team.save();
  await logActivity({ teamId: team._id, actorId: req.user._id, action: 'Team updated', message: `${team.name} was updated.` });
  await AuditLog.create({ userId: req.user._id, action: 'Updated team', oldValue, newValue: team.toObject() });
  res.json({ team });
};

exports.deleteTeam = async (req, res) => {
  const team = await Team.findOne({ _id: req.params.id, ...getManagerQuery(req.user) });
  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }
  const oldValue = team.toObject();
  await User.updateMany({ _id: { $in: team.members } }, { $unset: { managerId: '' } });
  await JoinRequest.updateMany({ teamId: team._id, status: 'Pending' }, { status: 'Cancelled' });
  await Team.findByIdAndDelete(team._id);
  await logActivity({ actorId: req.user._id, action: 'Team deleted', message: `${team.name} was deleted.` });
  await AuditLog.create({ userId: req.user._id, action: 'Deleted team', oldValue, newValue: null });
  res.json({ success: true });
};

exports.requestJoin = async (req, res) => {
  const managerId = clean(req.body.managerId);
  const teamId = clean(req.body.teamId);
  if (!objectIdIsValid(managerId)) {
    return res.status(400).json({ error: 'Choose a valid manager.' });
  }
  const manager = await User.findOne({ _id: managerId, role: 'manager' }).lean();
  if (!manager) {
    return res.status(400).json({ error: 'Choose a valid manager.' });
  }
  let team = null;
  if (teamId) {
    if (!objectIdIsValid(teamId)) {
      return res.status(400).json({ error: 'Choose a valid team.' });
    }
    team = await Team.findOne({ _id: teamId, lead: managerId, status: 'Active' }).lean();
    if (!team) {
      return res.status(400).json({ error: 'Choose a valid team.' });
    }
  }
  const existingTeam = await Team.findOne({ members: req.user._id }).lean();
  if (existingTeam) {
    return res.status(400).json({ error: 'You are already assigned to a team. Ask your manager to remove you before switching.' });
  }
  const pending = await JoinRequest.findOne({ employeeId: req.user._id, status: 'Pending' }).lean();
  if (pending) {
    return res.status(400).json({ error: 'You already have a pending join request.' });
  }
  const request = await JoinRequest.create({
    employeeId: req.user._id,
    managerId,
    teamId: team?._id,
    message: clean(req.body.message)
  });
  await notify({
    recipientId: managerId,
    actorId: req.user._id,
    type: 'Join request',
    message: `${req.user.name} requested to join ${team?.name || 'your team'}.`,
    metadata: { requestId: request._id, teamId: team?._id }
  });
  await logActivity({ teamId: team?._id, actorId: req.user._id, employeeId: req.user._id, action: 'Join requested', message: `${req.user.name} sent a join request.` });
  res.status(201).json({ request });
};

exports.reviewJoinRequest = async (req, res) => {
  const action = clean(req.body.action).toLowerCase();
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be approve or reject.' });
  }
  const request = await JoinRequest.findOne({ _id: req.params.id, managerId: req.user._id, status: 'Pending' })
    .populate('employeeId', 'name email role')
    .populate('teamId', 'name lead')
    .populate('managerId', 'name')
    .exec();
  if (!request) {
    return res.status(404).json({ error: 'Join request not found.' });
  }
  const employeeId = request.employeeId._id;
  if (action === 'reject') {
    request.status = 'Rejected';
    request.responseMessage = clean(req.body.responseMessage);
    await request.save();
    await notify({ recipientId: employeeId, actorId: req.user._id, type: 'Join rejected', message: `${req.user.name} rejected your team request.` });
    await logActivity({ teamId: request.teamId?._id, actorId: req.user._id, employeeId, action: 'Join rejected', message: `${request.employeeId.name}'s join request was rejected.` });
    return res.json({ request });
  }

  const existingTeam = await Team.findOne({ members: employeeId });
  if (existingTeam) {
    return res.status(400).json({ error: 'Employee already belongs to a team.' });
  }
  let team = request.teamId ? await Team.findById(request.teamId._id) : null;
  if (!team) {
    team = await Team.findOne({ lead: req.user._id, status: 'Active' }).sort({ createdAt: 1 });
  }
  if (!team) {
    team = await Team.create({
      name: `${req.user.name}'s Team`,
      description: 'Default team created from an approved join request.',
      lead: req.user._id,
      members: [],
      status: 'Active'
    });
  }
  if (!team.members.some((member) => member.toString() === employeeId.toString())) {
    team.members.push(employeeId);
    await team.save();
  }
  await User.findByIdAndUpdate(employeeId, { managerId: req.user._id });
  request.status = 'Approved';
  request.teamId = team._id;
  request.responseMessage = clean(req.body.responseMessage);
  await request.save();
  await notify({ recipientId: employeeId, actorId: req.user._id, type: 'Join approved', message: `You joined ${team.name}.`, metadata: { teamId: team._id } });
  await logActivity({ teamId: team._id, actorId: req.user._id, employeeId, action: 'Member joined', message: `${request.employeeId.name} joined ${team.name}.` });
  res.json({ request, team });
};

exports.addMember = async (req, res) => {
  const { employeeId } = req.body;
  const team = await Team.findOne({ _id: req.params.id, ...getManagerQuery(req.user) });
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  if (!objectIdIsValid(employeeId)) return res.status(400).json({ error: 'Choose a valid employee.' });
  const employee = await User.findOne({ _id: employeeId, role: 'employee' }).lean();
  if (!employee) return res.status(400).json({ error: 'Choose a valid employee.' });
  const existingTeam = await Team.findOne({ members: employeeId }).lean();
  if (existingTeam) return res.status(400).json({ error: 'Employee already belongs to a team.' });
  team.members.push(employeeId);
  await team.save();
  await User.findByIdAndUpdate(employeeId, { managerId: team.lead });
  await notify({ recipientId: employeeId, actorId: req.user._id, type: 'Team assignment', message: `You were added to ${team.name}.`, metadata: { teamId: team._id } });
  await logActivity({ teamId: team._id, actorId: req.user._id, employeeId, action: 'Member added', message: `${employee.name} was added to ${team.name}.` });
  res.json({ team });
};

exports.removeMember = async (req, res) => {
  const team = await Team.findOne({ _id: req.params.id, ...getManagerQuery(req.user) });
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  const employeeId = req.params.employeeId;
  team.members = team.members.filter((member) => member.toString() !== employeeId);
  await team.save();
  await User.findByIdAndUpdate(employeeId, { $unset: { managerId: '' } });
  await notify({ recipientId: employeeId, actorId: req.user._id, type: 'Team removal', message: `You were removed from ${team.name}.`, metadata: { teamId: team._id } });
  await logActivity({ teamId: team._id, actorId: req.user._id, employeeId, action: 'Member removed', message: `A member was removed from ${team.name}.` });
  res.json({ team });
};

exports.markNotificationsRead = async (req, res) => {
  await Notification.updateMany({ recipientId: req.user._id, read: false }, { read: true });
  res.json({ success: true });
};
