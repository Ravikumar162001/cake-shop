const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = 'supersecretcaketime';

module.exports = function (db) {
  const users = db.collection('users');

  // ✅ Signup Route
  router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    const existingUser = await users.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Assign role: Ravi is admin, everyone else is user
    const role = email === 'ravikumar162001@gmail.com' ? 'admin' : 'user';

    await users.insertOne({ name, email, password: hashedPassword, role });

    const token = jwt.sign({ email, role, name }, JWT_SECRET, { expiresIn: '2d' });

    // 👇 Include name in the response
    res.json({ token, email, role, name });
  });

  // ✅ Login Route
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await users.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '2d' }
    );

    // 👇 Include name in the response
    res.json({ token, email: user.email, role: user.role, name: user.name });
  });

  return router;
};
