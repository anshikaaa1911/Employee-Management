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
    <div className="empty-icon">□</div>
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

const DashboardPage = ({ user }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      if (user.role === 'employee') {
        const { goals } = await getGoals();
        const approvals = goals.filter((goal) => goal.approvalStatus === 'Approved').length;
        const completed = goals.filter((goal) => goal.status === 'Completed').length;
        setStats({ goals: goals.length, approvals, completed });
      } else {
        setStats({ goals: 0, approvals: 0, completed: 0 });
      }
    };
    load();
  }, [user]);

  return (
    <section className="card-panel page-card">
      <div className="grid-hero">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1>Hi {user?.name}, ready to move goals forward?</h1>
          <p>Track progress, manage approvals, and explore performance insights with a clean, modern interface.</p>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <span>Total Goals</span>
            <strong>{stats?.goals ?? 0}</strong>
          </div>
          <div className="stat-card">
            <span>Approved</span>
            <strong>{stats?.approvals ?? 0}</strong>
          </div>
          <div className="stat-card">
            <span>Completed</span>
            <strong>{stats?.completed ?? 0}</strong>
          </div>
        </div>
      </div>
      <div className="section-block">
        <h2>Workspace overview</h2>
        <p>Use the navigation above to open your goals, review team activity or administer users.</p>
      </div>
    </section>
  );
};

const EmployeeGoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', thrustArea: '', uomType: 'Max', target: '', weightage: '' });
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
      await createGoal(form);
      setForm({ title: '', description: '', thrustArea: '', uomType: 'Max', target: '', weightage: '' });
      await loadGoals();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmitGoal = async (id) => {
    if (!window.confirm('Submit this goal for manager approval?')) return;
    await submitGoal(id);
    await loadGoals();
  };

  const handleAchievement = async (id) => {
    const achievement = window.prompt('Enter achievement value:');
    if (!achievement) return;
    await updateAchievement(id, Number(achievement));
    await loadGoals();
  };

  return (
    <section className="card-panel">
      <div className="section-block">
        <div className="section-title">
          <h2>My goals</h2>
          <p>Manage targets, review progress, and submit goals in one dashboard.</p>
        </div>
        {error && <div className="alert">{error}</div>}
        <div className="grid-two">
          <div className="goal-list">
            {loading ? <div>Loading goals…</div> : goals.length ? goals.map((goal) => (
              <div className="goal-card" key={goal._id}>
                <div className="goal-head">
                  <h3>{goal.title}</h3>
                  <span className={`badge ${goal.approvalStatus.toLowerCase()}`}>{goal.approvalStatus}</span>
                </div>
                <p>{goal.description}</p>
                <div className="goal-meta">
                  <span>{goal.thrustArea || 'General'}</span>
                  <span>{goal.uomType} target</span>
                  <span>{goal.progress}% complete</span>
                </div>
                <div className="goal-actions">
                  <button className="btn-secondary" onClick={() => handleAchievement(goal._id)}>Update achievement</button>
                  <button className="btn-primary" onClick={() => handleSubmitGoal(goal._id)}>Submit</button>
                </div>
              </div>
            )) : <div className="empty-state">No goals yet. Create one to get started.</div>}
          </div>
          <form className="panel-form" onSubmit={submitNew}>
            <h3>Create new goal</h3>
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
            <button className="btn-primary" type="submit">Add Goal</button>
          </form>
        </div>
      </div>
    </section>
  );
};

const ManagerPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const { goals } = await getTeamGoals();
      setGoals(goals);
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
      if (action === 'reject') await rejectGoal(id, 'Needs revision');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="card-panel">
      <div className="section-title">
        <h2>Team goals</h2>
        <p>Approve work, add manager notes, and keep your team aligned.</p>
      </div>
      {error && <div className="alert">{error}</div>}
      {loading ? <div>Loading team goals…</div> : <div className="grid-cards">
        {goals.map((goal) => (
          <div className="goal-card" key={goal._id}>
            <div className="goal-head">
              <div>
                <h3>{goal.title}</h3>
                <p className="mute">{goal.employeeId?.name || 'Unknown employee'}</p>
              </div>
              <span className={`badge ${goal.approvalStatus.toLowerCase()}`}>{goal.approvalStatus}</span>
            </div>
            <p>{goal.description}</p>
            <div className="goal-meta">
              <span>{goal.thrustArea || 'General'}</span>
              <span>{goal.weightage}% weight</span>
              <span>{goal.status}</span>
            </div>
            <div className="goal-actions">
              <button className="btn-secondary" onClick={() => handleAction(goal._id, 'reject')}>Reject</button>
              <button className="btn-primary" onClick={() => handleAction(goal._id, 'approve')}>Approve</button>
            </div>
          </div>
        ))}
      </div>}
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

const ReportsPage = () => {
  const [error, setError] = useState(null);

  const handleDownload = async (format) => {
    setError(null);
    try {
      await downloadReport(format);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="card-panel page-card">
      <div className="section-title">
        <h2>Reports</h2>
        <p>Export data and keep leadership informed with one click.</p>
      </div>
      {error && <div className="alert">{error}</div>}
      <div className="cards-row">
        <div className="report-card">
          <h3>Export CSV</h3>
          <p>Download goal performance for analysis and sharing.</p>
          <button className="btn-primary" type="button" onClick={() => handleDownload('csv')}>Download</button>
        </div>
        <div className="report-card">
          <h3>Export Excel</h3>
          <p>Get a polished workbook with key metrics and employee data.</p>
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
