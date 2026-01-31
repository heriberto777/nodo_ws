module.exports = (roles = []) => (req, res, next) => {
  if (!roles.length) return next();

  const userRole = req.user?.role;
  if (!userRole || !roles.includes(userRole)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  return next();
};
