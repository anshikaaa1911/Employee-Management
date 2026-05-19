import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import {
  login,
  fetchMe,
  setToken,
  clearToken,
  getGoals,
  createGoal,
  updateGoal,
  submitGoal,
  updateAchievement,
  getTeamGoals,
  approveGoal,
  rejectGoal,
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
          <Route path="/" element={<RequireAuth user={user}><DashboardPage user={user} /></RequireAuth>} />
          <Route path="/employee" element={<RequireAuth user={user} allowedRoles={[ 'employee', 'admin' ]}><EmployeeGoalsPage user={user} /></RequireAuth>} />
          <Route path="/manager" element={<RequireAuth user={user} allowedRoles={[ 'manager', 'admin' ]}><ManagerPage user={user} /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth user={user} allowedRoles={[ 'admin' ]}><AdminPage user={user} /></RequireAuth>} />
          <Route path="/reports" element={<RequireAuth user={user}><ReportsPage user={user} /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
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
