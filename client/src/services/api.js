const API_BASE = '/api';

const getToken = () => window.localStorage.getItem('goalPortalToken');

const apiFetch = async (path, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (parseError) {
    data = { error: 'Invalid server response' };
  }
  if (!response.ok) {
    throw new Error(data?.error || response.statusText || 'Request failed');
  }
  return data;
};

export const login = ({ email, password }) => apiFetch('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

export const register = ({ name, email, password, role, managerId, teamId }) => apiFetch('/auth/register', {
  method: 'POST',
  body: JSON.stringify({ name, email, password, role, managerId, teamId })
});

export const fetchMe = () => apiFetch('/auth/me');
export const getRegistrationManagers = () => apiFetch('/auth/managers');
export const getTeamOverview = () => apiFetch('/teams/overview');
export const createTeam = (team) => apiFetch('/teams', { method: 'POST', body: JSON.stringify(team) });
export const updateTeam = (id, team) => apiFetch(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(team) });
export const deleteTeam = (id) => apiFetch(`/teams/${id}`, { method: 'DELETE' });
export const requestTeamJoin = (payload) => apiFetch('/teams/join-requests', { method: 'POST', body: JSON.stringify(payload) });
export const reviewTeamJoinRequest = (id, payload) => apiFetch(`/teams/join-requests/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const addTeamMember = (teamId, employeeId) => apiFetch(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify({ employeeId }) });
export const removeTeamMember = (teamId, employeeId) => apiFetch(`/teams/${teamId}/members/${employeeId}`, { method: 'DELETE' });
export const markTeamNotificationsRead = () => apiFetch('/teams/notifications/read', { method: 'PUT' });
export const getGoals = () => apiFetch('/goals');
export const createGoal = (goal) => apiFetch('/goals', { method: 'POST', body: JSON.stringify(goal) });
export const updateGoal = (id, goal) => apiFetch(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(goal) });
export const deleteGoal = (id) => apiFetch(`/goals/${id}`, { method: 'DELETE' });
export const submitGoal = (id) => apiFetch(`/goals/${id}/submit`, { method: 'POST' });
export const updateAchievement = (id, achievement) => apiFetch(`/goals/${id}/achievement`, { method: 'POST', body: JSON.stringify({ achievement }) });
export const updateGoalProgress = (id, progressPercentage) => apiFetch(`/goals/${id}/achievement`, { method: 'POST', body: JSON.stringify({ progressPercentage }) });
export const getGoalActivity = () => apiFetch('/goals/activity');
export const getNotifications = () => apiFetch('/goals/notifications');
export const getManagerDashboard = () => apiFetch('/manager/dashboard');
export const getTeamGoals = () => apiFetch('/manager/team-goals');
export const approveGoal = (id, comment) => apiFetch(`/manager/goals/${id}/approve`, { method: 'POST', body: JSON.stringify({ managerComment: comment }) });
export const rejectGoal = (id, comment) => apiFetch(`/manager/goals/${id}/reject`, { method: 'POST', body: JSON.stringify({ managerComment: comment }) });
export const bulkReviewGoals = ({ goalIds, action, managerComment }) => apiFetch('/manager/goals/bulk-review', { method: 'POST', body: JSON.stringify({ goalIds, action, managerComment }) });
export const getUsers = () => apiFetch('/admin/users');
export const getAudit = () => apiFetch('/admin/audit');
export const unlockGoal = (id) => apiFetch(`/admin/goals/${id}/unlock`, { method: 'POST' });
export const updateUserRole = (id, role) => apiFetch(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
export const deleteUser = (id) => apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
export const downloadReport = async (format, filters = {}) => {
  const token = getToken();
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.append(key, value);
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await fetch(`${API_BASE}/reports/${format}${suffix}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    throw new Error(response.statusText || 'Download failed');
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = format === 'excel' ? 'goal-report.xlsx' : 'goal-report.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
export const setToken = (token) => window.localStorage.setItem('goalPortalToken', token);
export const clearToken = () => window.localStorage.removeItem('goalPortalToken');
