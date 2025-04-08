const jwt = require('jsonwebtoken');
const JWT_SECRET = 'supersecretcaketime'; // Must match your auth.js secret

// ✅ Middleware to verify any logged-in user
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.warn("🚫 No Authorization header provided");
    return res.status(401).json({ msg: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.warn("🚫 Token format invalid — missing Bearer");
    return res.status(401).json({ msg: 'Invalid token format' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("❌ Token verification failed:", err.message);
      return res.status(401).json({ msg: 'Invalid token' });
    }

    console.log("🔓 Token verified. User:", decoded); // ✅ Logs decoded info
    req.user = decoded; // { email, role, id }
    next();
  });
}

// ✅ Middleware to allow only admin users
function verifyAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    console.warn("⛔ Access denied: Not an admin:", req.user?.email || 'Unknown user');
    return res.status(403).json({ msg: 'Access denied: Admins only' });
  }

  console.log("🛡️ Admin access granted to:", req.user.email);
  next();
}

module.exports = {
  verifyToken,
  verifyAdmin
};
