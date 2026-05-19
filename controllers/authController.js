const bcrypt = require('bcryptjs');
const User = require('../models/user');

exports.loginPage = (req, res) => {
  res.render('auth/login', { error: req.flash('error') });
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    req.flash('error', 'Invalid email or password.');
    return res.redirect('/login');
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    req.flash('error', 'Invalid email or password.');
    return res.redirect('/login');
  }
  req.session.userId = user._id;
  res.redirect('/dashboard');
};

exports.logoutUser = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};
