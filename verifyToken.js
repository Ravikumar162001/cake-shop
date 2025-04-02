const jwt = require('jsonwebtoken');
const JWT_SECRET = 'supersecretcaketime'; // should match what's in auth.js

// ✅ Middleware to verify any logged-in user
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ msg: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'Invalid token format' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ msg: 'Invalid token' });
    req.user = decoded; // contains email & role
    next();
  });
}

// ✅ Middleware to allow only admin users
function verifyAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied: Admins only' });
  }
  next();
}

module.exports = {
  verifyToken,
  verifyAdmin
};
