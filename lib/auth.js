'use strict';

module.exports = function requireAuth(req, res, next) {
  if (req.path === '/login' || req.path.startsWith('/public') || req.path === '/health') {
    return next();
  }
  if (req.session && req.session.authed) {
    return next();
  }
  return res.redirect('/login');
};

module.exports.check = function check(password, submitted) {
  if (typeof submitted !== 'string' || submitted.length === 0) return false;
  return submitted === password;
};
