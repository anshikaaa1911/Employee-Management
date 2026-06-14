import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import {
  login,
  register,
  fetchMe,
  setToken,
  clearToken,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  submitGoal,
  updateAchievement,
  updateGoalProgress,
  getGoalActivity,
  getNotifications,
  getManagerDashboard,
  getTeamGoals,
  approveGoal,
  rejectGoal,
  bulkReviewGoals,
  getUsers,
  getAudit,
  unlockGoal,
  updateUserRole,
  deleteUser,
  downloadReport
} from './services/api';

const navLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/employee', label: 'Goals', role: 'employee' },
  { to: '/manager', label: 'Team', role: 'manager' },
  { to: '/admin', label: 'Admin', role: 'admin' },
  { to: '/reports', label: 'Reports' }
];

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();

  const role = user?.role || 'guest';
  const authorizedLinks = useMemo(
    () => navLinks.filter((item) => !item.role || item.role === role || user?.role === 'admin'),
    [role, user]
  );

  useEffect(() => {
    fetchMe()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    clearToken();
    setUser(null);
    navigate('/login');
  };

  const notify = (type, message) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((items) => [...items, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, 3600);
  };

  if (loading) {
    return <div className="page-shell">Loading portal...</div>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">GoalFlow</Link>
        <nav className="menu">
          {authorizedLinks.map((item) => (
            <Link key={item.to} to={item.to} className="menu-link">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="user-panel">
          {user ? (
            <>
              <span>{user.name}</span>
              <button className="btn-secondary" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <Link to="/login" className="btn-primary">Login</Link>
          )}
        </div>
      </header>
      <main className="page-shell">
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={setUser} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<RequireAuth user={user}><DashboardPage user={user} notify={notify} /></RequireAuth>} />
          <Route path="/employee" element={<RequireAuth user={user} allowedRoles={[ 'employee', 'admin' ]}><EmployeeGoalsPage user={user} notify={notify} /></RequireAuth>} />
          <Route path="/manager" element={<RequireAuth user={user} allowedRoles={[ 'manager', 'admin' ]}><ManagerPage user={user} notify={notify} /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth user={user} allowedRoles={[ 'admin' ]}><AdminPage user={user} /></RequireAuth>} />
          <Route path="/reports" element={<RequireAuth user={user}><ReportsPage user={user} notify={notify} /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <ToastStack toasts={toasts} />
    </div>
  );
};

const RequireAuth = ({ user, allowedRoles = [], children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const priorities = ['High', 'Medium', 'Low'];
const categories = ['Productivity', 'Learning', 'Teamwork', 'Innovation'];
const statuses = ['Not Started', 'On Track', 'Completed'];

const getProgress = (goal) => Number(goal.progress ?? goal.progressPercentage ?? 0);

const calculateStats = (goals) => {
  const total = goals.length;
  const completed = goals.filter((goal) => goal.status === 'Completed').length;
  const pending = goals.filter((goal) => goal.status !== 'Completed').length;
  const approved = goals.filter((goal) => goal.approvalStatus === 'Approved').length;
  const rejected = goals.filter((goal) => goal.approvalStatus === 'Rejected').length;
  const approvalPending = goals.filter((goal) => goal.approvalStatus === 'Pending').length;
  const successRate = total ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pending, approved, rejected, approvalPending, successRate };
};

const groupByMonth = (goals) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map((month, index) => ({
    label: month,
    value: goals.filter((goal) => goal.status === 'Completed' && new Date(goal.updatedAt || goal.createdAt).getMonth() === index).length
  }));
};

const groupByKey = (goals, key, values) => values.map((value) => ({
  label: value,
  value: goals.filter((goal) => goal[key] === value).length
}));

const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : 'No due date');

const KpiCards = ({ stats, extra = [] }) => (
  <div className="stats-grid">
    <div className="stat-card"><span>Total Goals</span><strong>{stats.total}</strong></div>
    <div className="stat-card"><span>Completed</span><strong>{stats.completed}</strong></div>
    <div className="stat-card"><span>Pending</span><strong>{stats.pending}</strong></div>
    <div className="stat-card"><span>Success Rate</span><strong>{stats.successRate}%</strong></div>
    {extra.map((item) => (
      <div className="stat-card" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>
    ))}
  </div>
);

const EmptyState = ({ title, text }) => (
  <div className="empty-state">
    <div className="empty-icon">[]</div>
    <h3>{title}</h3>
    <p>{text}</p>
  </div>
);

const SkeletonBlock = ({ lines = 3 }) => (
  <div className="skeleton-stack">
    {Array.from({ length: lines }).map((_, index) => <span className="skeleton-line" key={index} />)}
  </div>
);

const BarChart = ({ data, title }) => {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      {data.some((item) => item.value) ? (
        <div className="bar-chart">
          {data.map((item) => (
            <div className="bar-item" key={item.label}>
              <div className="bar-track"><span style={{ height: `${(item.value / max) * 100}%` }} /></div>
              <small>{item.label}</small>
            </div>
          ))}
        </div>
      ) : <EmptyState title="No chart data" text="Activity will appear once goals start moving." />}
    </div>
  );
};

const DonutChart = ({ data, title }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const gradient = total
    ? data.reduce((parts, item, index) => {
      const start = parts.offset;
      const end = start + (item.value / total) * 100;
      parts.segments.push(`${item.color} ${start}% ${end}%`);
      parts.offset = end;
      return parts;
    }, { offset: 0, segments: [] }).segments.join(', ')
    : '#e5e7eb 0 100%';
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      {total ? (
        <div className="donut-wrap">
          <div className="donut" style={{ background: `conic-gradient(${gradient})` }}><strong>{total}</strong></div>
          <div className="chart-legend">
            {data.map((item) => <span key={item.label}><i style={{ background: item.color }} />{item.label}: {item.value}</span>)}
          </div>
        </div>
      ) : <EmptyState title="No chart data" text="There is nothing to summarize yet." />}
    </div>
  );
};

const ToastStack = ({ toasts }) => (
  <div className="toast-stack">
    {toasts.map((toast) => <div className={`toast ${toast.type}`} key={toast.id}>{toast.message}</div>)}
  </div>
);

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      const data = await login({ email, password });
      setToken(data.token);
      onLogin(data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="card-panel login-panel">
      <div className="hero-card">
        <h1>Welcome back</h1>
        <p>Sign in to manage goals, approvals, and team performance from one responsive dashboard.</p>
      </div>
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Login to GoalFlow</h2>
        {error && <div className="alert">{error}</div>}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="btn-primary" type="submit">Sign In</button>
        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create Account</Link>
        </p>
      </form>
    </section>
  );
};

const validateRegistration = ({ name, email, password, confirmPassword, role }) => {
  if (!name.trim() || !email.trim() || !password || !confirmPassword || !role) {
    return 'Please complete all fields.';
  }
  if (name.trim().length < 2 || name.trim().length > 80) {
    return 'Full name must be between 2 and 80 characters.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'Enter a valid email address.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }
  if (!['employee', 'manager'].includes(role)) {
    return 'Choose Employee or Manager.';
  }
  return null;
};

const RegisterPage = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee'
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateRegistration(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role
      });
      setSuccess('Account created successfully. Redirecting to sign in...');
      window.setTimeout(() => navigate('/login'), 900);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card-panel login-panel">
      <div className="hero-card">
        <span className="eyebrow">Join GoalFlow</span>
        <h1>Create your account</h1>
        <p>Register as an employee or manager and start tracking goals, progress, and approvals in the same portal.</p>
      </div>
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Sign up</h2>
        {error && <div className="alert">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <label>
          Full Name
          <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required maxLength="80" />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} required minLength="8" />
        </label>
        <label>
          Confirm Password
          <input type="password" value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} required minLength="8" />
        </label>
        <label>
          Role
          <select value={form.role} onChange={(e) => updateField('role', e.target.value)} required>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
        </label>
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Creating Account...' : 'Create Account'}
        </button>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </section>
  );
};

const DashboardPage = ({ user, notify }) => {
  if (user?.role === 'manager' || user?.role === 'admin') {
    return <ManagerPage notify={notify} compact />;
  }
  return <EmployeeDashboard user={user} />;
};

const EmployeeDashboard = ({ user }) => {
  const [goals, setGoals] = useState([]);
  const [activities, setActivities] = useState([]);
  const [notifications, setNotifications] = useState({ notifications: [], unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [goalData, activityData, notificationData] = await Promise.all([getGoals(), getGoalActivity(), getNotifications()]);
        setGoals(goalData.goals);
        setActivities(activityData.activities);
        setNotifications(notificationData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = calculateStats(goals);
  const monthly = groupByMonth(goals);
  const approvalData = [
    { label: 'Approved', value: stats.approved, color: '#22c55e' },
    { label: 'Pending', value: stats.approvalPending, color: '#f59e0b' },
    { label: 'Rejected', value: stats.rejected, color: '#ef4444' }
  ];
  const categoryData = groupByKey(goals, 'category', categories);

  return (
    <section className="card-panel page-card">
      <div className="section-title split-title">
        <div>
          <span className="eyebrow">Personal Dashboard</span>
          <h1>Hi {user?.name}, here is your goal flow.</h1>
          <p>Track completion, approvals, upcoming deadlines, and performance from one employee workspace.</p>
        </div>
        <div className="notification-button">
          Notifications <strong>{notifications.unreadCount}</strong>
        </div>
      </div>
      {error && <div className="alert">{error}</div>}
      {loading ? <SkeletonBlock lines={6} /> : (
        <>
          <KpiCards stats={stats} extra={[{ label: 'Performance Score', value: `${stats.successRate}/100` }]} />
          <div className="progress-summary">
            <div>
              <h3>Completion progress</h3>
              <p>{stats.completed} completed vs {stats.pending} pending</p>
            </div>
            <div className="progress-track"><span style={{ width: `${stats.successRate}%` }} /></div>
          </div>
          <div className="grid-two">
            <BarChart title="Monthly progress" data={monthly} />
            <DonutChart title="Approval status" data={approvalData} />
          </div>
          <div className="grid-two">
            <BarChart title="Goal category distribution" data={categoryData} />
            <div className="panel-form">
              <h3>Activity timeline</h3>
              {activities.length ? activities.slice(0, 8).map((activity) => (
                <div className="timeline-item" key={activity._id}>
                  <strong>{activity.action}</strong>
                  <span>{new Date(activity.timestamp).toLocaleString()}</span>
                </div>
              )) : <EmptyState title="No activity yet" text="Goal submissions, approvals, rejections, and progress updates will show here." />}
            </div>
          </div>
          <div className="panel-form">
            <h3>Notification panel</h3>
            {notifications.notifications.length ? notifications.notifications.map((item) => (
              <div className="notification-card" key={item.id}>
                <strong>{item.type}</strong>
                <p>{item.message}</p>
              </div>
            )) : <EmptyState title="No notifications" text="Approval updates and deadline warnings will appear here." />}
          </div>
        </>
      )}
    </section>
  );
};

const emptyGoalForm = {
  title: '',
  description: '',
  thrustArea: '',
  uomType: 'Max',
  target: '',
  weightage: '',
  priority: 'Medium',
  category: 'Productivity',
  dueDate: '',
  progressPercentage: 0
};

const EmployeeGoalsPage = ({ notify }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyGoalForm);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ priority: '', category: '', status: '' });
  const [error, setError] = useState(null);

  const loadGoals = async () => {
    try {
      const data = await getGoals();
      setGoals(data.goals);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGoals(); }, []);

  const submitNew = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await updateGoal(editingId, form);
        notify?.('success', 'Goal updated successfully.');
      } else {
        await createGoal(form);
        notify?.('success', 'Goal saved successfully.');
      }
      setEditingId(null);
      setForm(emptyGoalForm);
      await loadGoals();
    } catch (err) {
      setError(err.message);
      notify?.('error', err.message);
    }
  };

  const startEdit = (goal) => {
    setEditingId(goal._id);
    setForm({
      title: goal.title || '',
      description: goal.description || '',
      thrustArea: goal.thrustArea || '',
      uomType: goal.uomType || 'Max',
      target: goal.target ?? '',
      weightage: goal.weightage ?? '',
      priority: goal.priority || 'Medium',
      category: goal.category || 'Productivity',
      dueDate: goal.dueDate ? goal.dueDate.slice(0, 10) : '',
      progressPercentage: getProgress(goal)
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await deleteGoal(id);
      notify?.('success', 'Goal deleted.');
      await loadGoals();
    } catch (err) {
      setError(err.message);
      notify?.('error', err.message);
    }
  };

  const handleSubmitGoal = async (id) => {
    if (!window.confirm('Submit this goal for manager approval?')) return;
    try {
      await submitGoal(id);
      notify?.('success', 'Goal submitted for approval.');
      await loadGoals();
    } catch (err) {
      setError(err.message);
      notify?.('error', err.message);
    }
  };

  const handleProgress = async (id, progress) => {
    try {
      await updateGoalProgress(id, Number(progress));
      notify?.('success', 'Progress updated.');
      await loadGoals();
    } catch (err) {
      setError(err.message);
      notify?.('error', err.message);
    }
  };

  const visibleGoals = goals.filter((goal) => (
    (!filters.priority || goal.priority === filters.priority) &&
    (!filters.category || goal.category === filters.category) &&
    (!filters.status || goal.status === filters.status)
  ));
  const stats = calculateStats(goals);

  return (
    <section className="card-panel">
      <div className="section-block">
        <div className="section-title">
          <h2>My goals</h2>
          <p>Manage targets, review progress, and submit goals in one dashboard.</p>
        </div>
        <KpiCards stats={stats} />
        {error && <div className="alert">{error}</div>}
        <div className="filter-bar">
          <label>Priority<select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
            <option value="">All priorities</option>
            {priorities.map((item) => <option key={item} value={item}>{item}</option>)}
          </select></label>
          <label>Category<select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
            <option value="">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select></label>
          <label>Status<select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select></label>
        </div>
        <div className="grid-two">
          <div className="goal-list">
            {loading ? <SkeletonBlock lines={5} /> : visibleGoals.length ? visibleGoals.map((goal) => (
              <div className="goal-card" key={goal._id}>
                <div className="goal-head">
                  <h3>{goal.title}</h3>
                  <div className="badge-row">
                    <span className={`badge priority-${(goal.priority || 'Medium').toLowerCase()}`}>{goal.priority || 'Medium'}</span>
                    <span className={`badge ${goal.approvalStatus.toLowerCase()}`}>{goal.approvalStatus}</span>
                  </div>
                </div>
                <p>{goal.description}</p>
                <div className="goal-meta">
                  <span>{goal.category || 'Productivity'}</span>
                  <span>{formatDate(goal.dueDate)}</span>
                  <span>{goal.uomType} target</span>
                  <span>{getProgress(goal)}% complete</span>
                </div>
                <input type="range" min="0" max="100" value={getProgress(goal)} onChange={(e) => handleProgress(goal._id, e.target.value)} />
                <div className="goal-actions">
                  <button className="btn-secondary" onClick={() => startEdit(goal)}>Edit</button>
                  <button className="btn-secondary" onClick={() => handleDelete(goal._id)}>Delete</button>
                  <button className="btn-primary" onClick={() => handleSubmitGoal(goal._id)}>Submit</button>
                </div>
              </div>
            )) : <EmptyState title="No matching goals" text="Create a new goal or adjust your filters to see results." />}
          </div>
          <form className="panel-form" onSubmit={submitNew}>
            <h3>{editingId ? 'Edit goal' : 'Create new goal'}</h3>
            <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
            <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label>Thrust area<input value={form.thrustArea} onChange={(e) => setForm({ ...form, thrustArea: e.target.value })} /></label>
            <label>UOM type<select value={form.uomType} onChange={(e) => setForm({ ...form, uomType: e.target.value })}>
              <option value="Max">Max</option>
              <option value="Min">Min</option>
              <option value="Zero">Zero</option>
            </select></label>
            <div className="form-row">
              <label>Target<input type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} required /></label>
              <label>Weightage<input type="number" value={form.weightage} onChange={(e) => setForm({ ...form, weightage: e.target.value })} required /></label>
            </div>
            <div className="form-row">
              <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {priorities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select></label>
              <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select></label>
            </div>
            <label>Due date<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
            <label>Progress {form.progressPercentage}%<input type="range" min="0" max="100" value={form.progressPercentage} onChange={(e) => setForm({ ...form, progressPercentage: Number(e.target.value) })} /></label>
            <button className="btn-primary" type="submit">{editingId ? 'Save Changes' : 'Add Goal'}</button>
            {editingId && <button className="btn-secondary" type="button" onClick={() => { setEditingId(null); setForm(emptyGoalForm); }}>Cancel edit</button>}
          </form>
        </div>
      </div>
    </section>
  );
};

const ManagerPage = ({ notify, compact = false }) => {
  const [goals, setGoals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [rejectComment, setRejectComment] = useState('');
  const [sortDir, setSortDir] = useState('desc');

  const load = async () => {
    try {
      const data = await getManagerDashboard();
      setGoals(data.goals);
      setSummary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id, action) => {
    try {
      if (action === 'approve') await approveGoal(id, 'Approved by manager');
      if (action === 'reject') {
        if (!rejectComment.trim()) {
          notify?.('warning', 'Add a rejection comment first.');
          return;
        }
        await rejectGoal(id, rejectComment.trim());
      }
      notify?.('success', action === 'approve' ? 'Approval sent.' : 'Goal rejected.');
      setRejectComment('');
      await load();
    } catch (err) {
      setError(err.message);
      notify?.('error', err.message);
    }
  };

  const handleBulk = async (action) => {
    try {
      if (!selected.length) {
        notify?.('warning', 'Select at least one goal.');
        return;
      }
      if (action === 'reject' && !rejectComment.trim()) {
        notify?.('warning', 'Add a rejection comment first.');
        return;
      }
      await bulkReviewGoals({ goalIds: selected, action, managerComment: action === 'reject' ? rejectComment.trim() : 'Approved by manager' });
      notify?.('success', action === 'approve' ? 'Bulk approval sent.' : 'Bulk rejection sent.');
      setSelected([]);
      setRejectComment('');
      await load();
    } catch (err) {
      setError(err.message);
      notify?.('error', err.message);
    }
  };

  const toggleSelected = (id) => {
    setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  };

  const employeeRows = useMemo(() => {
    const map = new Map();
    goals.forEach((goal) => {
      const employee = goal.employeeId;
      const id = employee?._id || 'unknown';
      const row = map.get(id) || { id, name: employee?.name || 'Unknown employee', department: employee?.department || 'General', total: 0, completed: 0, overdue: 0 };
      row.total += 1;
      if (goal.status === 'Completed') row.completed += 1;
      if (goal.dueDate && goal.status !== 'Completed' && new Date(goal.dueDate) < new Date()) row.overdue += 1;
      map.set(id, row);
    });
    return Array.from(map.values()).map((row) => ({ ...row, rate: row.total ? Math.round((row.completed / row.total) * 100) : 0 }));
  }, [goals]);

  const rankedEmployees = [...employeeRows].sort((a, b) => sortDir === 'desc' ? b.rate - a.rate : a.rate - b.rate);
  const topPerformers = rankedEmployees.slice(0, 3);
  const supportNeeded = rankedEmployees.filter((row) => row.rate < 50 || row.overdue > 0);
  const stats = {
    total: goals.length,
    completed: goals.filter((goal) => goal.status === 'Completed').length,
    pending: goals.filter((goal) => goal.status !== 'Completed').length,
    successRate: summary?.teamPerformanceScore || 0
  };
  const departmentData = groupByKey(goals, 'status', statuses);
  const trendData = groupByMonth(goals);
  const comparisonData = rankedEmployees.map((row) => ({ label: row.name.split(' ')[0], value: row.rate }));

  return (
    <section className="card-panel">
      <div className="section-title">
        <span className="eyebrow">Manager Workspace</span>
        <h2>Team dashboard and approvals</h2>
        <p>Review submissions, compare performance, and surface support needs across the team.</p>
      </div>
      {error && <div className="alert">{error}</div>}
      {loading ? <SkeletonBlock lines={6} /> : (
        <>
          <KpiCards stats={stats} extra={[
            { label: 'Active Employees', value: summary?.activeEmployeeCount || 0 },
            { label: 'Pending Approvals', value: summary?.pendingApprovalsCount || 0 }
          ]} />
          {!compact && (
            <div className="grid-two">
              <BarChart title="Department performance overview" data={departmentData} />
              <BarChart title="Employee comparison" data={comparisonData} />
            </div>
          )}
          <div className="panel-form">
            <div className="section-title">
              <h3>Goal approval center</h3>
              <p>Select submissions for bulk review or handle each goal individually.</p>
            </div>
            <label>Rejection comment<textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Required when rejecting a goal" /></label>
            <div className="goal-actions">
              <button className="btn-primary" type="button" onClick={() => handleBulk('approve')}>Bulk Approve</button>
              <button className="btn-secondary" type="button" onClick={() => handleBulk('reject')}>Bulk Reject</button>
            </div>
            <div className="grid-cards">
              {goals.length ? goals.filter((goal) => goal.approvalStatus === 'Pending').map((goal) => (
                <div className="goal-card" key={goal._id}>
                  <div className="goal-head">
                    <label className="check-row"><input type="checkbox" checked={selected.includes(goal._id)} onChange={() => toggleSelected(goal._id)} /> Select</label>
                    <span className={`badge ${(goal.approvalStatus || 'Pending').toLowerCase()}`}>{goal.approvalStatus}</span>
                  </div>
                  <h3>{goal.title}</h3>
                  <p className="mute">{goal.employeeId?.name || 'Unknown employee'}</p>
                  <p>{goal.description}</p>
                  <div className="goal-meta">
                    <span>{goal.category || 'Productivity'}</span>
                    <span>{goal.priority || 'Medium'} priority</span>
                    <span>{getProgress(goal)}% complete</span>
                  </div>
                  <div className="goal-actions">
                    <button className="btn-secondary" onClick={() => handleAction(goal._id, 'reject')}>Reject</button>
                    <button className="btn-primary" onClick={() => handleAction(goal._id, 'approve')}>Approve</button>
                  </div>
                </div>
              )) : <EmptyState title="No team goals" text="Submitted goals will appear here for manager review." />}
            </div>
          </div>
          {!compact && (
            <>
              <div className="grid-two">
                <BarChart title="Goal completion trends" data={trendData} />
                <div className="panel-form">
                  <h3>Employee insights</h3>
                  <div className="insight-list">
                    <div>
                      <strong>Top performers</strong>
                      {topPerformers.length ? topPerformers.map((row) => <p key={row.id}>{row.name}: {row.rate}%</p>) : <p>No performers ranked yet.</p>}
                    </div>
                    <div>
                      <strong>Employees needing support</strong>
                      {supportNeeded.length ? supportNeeded.map((row) => <p key={row.id}>{row.name}: {row.rate}% completion, {row.overdue} overdue</p>) : <p>No support flags right now.</p>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="table-shell">
                <table>
                  <thead>
                    <tr><th>Employee</th><th>Department</th><th>Total</th><th>Completed</th><th><button className="link-button" onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}>Completion Rate</button></th><th>Overdue</th></tr>
                  </thead>
                  <tbody>
                    {rankedEmployees.map((row) => (
                      <tr key={row.id}><td>{row.name}</td><td>{row.department}</td><td>{row.total}</td><td>{row.completed}</td><td>{row.rate}%</td><td>{row.overdue}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
};

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  const loadAdmin = async () => {
    try {
      const [{ users }, { logs }] = await Promise.all([getUsers(), getAudit()]);
      setUsers(users);
      setLogs(logs);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { loadAdmin(); }, []);

  return (
    <section className="card-panel">
      <div className="section-title">
        <h2>Admin console</h2>
        <p>Manage users and review audit history with a clean administrative experience.</p>
      </div>
      {error && <div className="alert">{error}</div>}
      <div className="grid-two">
        <div className="panel-form">
          <h3>Users</h3>
          <div className="table-shell">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th></tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel-form">
          <h3>Recent activity</h3>
          <div className="log-list">
            {logs.slice(0, 8).map((log) => (
              <div key={log._id} className="log-card">
                <strong>{log.action}</strong>
                <p>{log.userId?.name || 'System'}</p>
                <small>{new Date(log.timestamp).toLocaleString()}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const ReportsPage = ({ notify }) => {
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: '', employeeId: '', category: '', status: '', reportType: 'team' });

  const handleDownload = async (format) => {
    setError(null);
    try {
      await downloadReport(format, filters);
      notify?.('success', `${format === 'excel' ? 'Excel' : 'CSV'} report exported.`);
    } catch (err) {
      setError(err.message);
      notify?.('error', err.message);
    }
  };

  return (
    <section className="card-panel page-card">
      <div className="section-title">
        <h2>Reports</h2>
        <p>Export data and keep leadership informed with one click.</p>
      </div>
      {error && <div className="alert">{error}</div>}
      <div className="filter-bar">
        <label>Report type<select value={filters.reportType} onChange={(e) => setFilters({ ...filters, reportType: e.target.value })}>
          <option value="employee">Employee report</option>
          <option value="team">Team report</option>
          <option value="monthly">Monthly report</option>
        </select></label>
        <label>From<input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></label>
        <label>To<input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></label>
        <label>Employee ID<input value={filters.employeeId} onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })} placeholder="Optional employee id" /></label>
        <label>Category<select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select></label>
        <label>Status<select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          <option value="Approved">Approved</option>
          <option value="Pending">Pending</option>
          <option value="Rejected">Rejected</option>
          <option value="Completed">Completed</option>
        </select></label>
      </div>
      <div className="cards-row">
        <div className="report-card">
          <h3>Export CSV</h3>
          <p>Download filtered goal performance for analysis and sharing.</p>
          <button className="btn-primary" type="button" onClick={() => handleDownload('csv')}>Download</button>
        </div>
        <div className="report-card">
          <h3>Export Excel</h3>
          <p>Get a filtered workbook with goals, approval status, and manager comments.</p>
          <button className="btn-primary" type="button" onClick={() => handleDownload('excel')}>Download</button>
        </div>
      </div>
    </section>
  );
};

const NotFound = () => (
  <section className="card-panel page-card">
    <h2>Page not found</h2>
    <p>Return to your dashboard to continue.</p>
    <Link className="btn-secondary" to="/">Go home</Link>
  </section>
);

export default App;
