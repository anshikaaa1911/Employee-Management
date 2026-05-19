const allowedRoles = ['employee', 'manager', 'admin'];

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  managerId: user.managerId
});

module.exports = {
  allowedRoles,
  serializeUser
};
