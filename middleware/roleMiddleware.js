exports.allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      req.flash('error', 'You do not have permission to access that page.');
      return res.redirect('/');
    }
    next();
  };
};
