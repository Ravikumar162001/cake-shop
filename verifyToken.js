// verifyToken.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'supersecretcaketime'; // same as in auth.js

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ msg: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'Invalid token format' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ msg: 'Invalid token' });
    req.user = decoded; // decoded.email
    next();
  });
}

module.exports = verifyToken;

