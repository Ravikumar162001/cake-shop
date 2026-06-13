const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const { sendOtpEmail } = require('./mailer'); // ✅ Mailer for OTP

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to your .env file or environment.');
}

module.exports = function (db) {
  const users = db.collection('users');

  // ✅ Signup Route
  router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
      return res.status(400).json({ msg: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ msg: 'Password must be at least 6 characters' });
    }

    const existingUser = await users.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = email === ADMIN_EMAIL ? 'admin' : 'user';

    await users.insertOne({ name, email, password: hashedPassword, role });

    const token = jwt.sign({ email, role, name }, JWT_SECRET, { expiresIn: '2d' });

    res.json({ token, email, role, name });
  });

  // ✅ Login Route (💥 FIXED: force role based on email)
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const user = await users.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // 💥 Ensure role is correctly assigned
    const role = email === ADMIN_EMAIL ? 'admin' : 'user';

    const token = jwt.sign(
      { email: user.email, role, name: user.name },
      JWT_SECRET,
      { expiresIn: '2d' }
    );

    res.json({ token, email: user.email, role, name: user.name });
  });

  // ✅ Forgot Password - Send OTP
  router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes from now

    await users.updateOne({ email }, { $set: { resetOtp: otp, resetOtpExpires: expiresAt } });

    try {
      await sendOtpEmail(email, otp);
      res.json({ msg: 'OTP sent to your email' });
    } catch (err) {
      console.error('❌ OTP email failed:', err);
      res.status(500).json({ msg: 'Failed to send OTP' });
    }
  });

  // ✅ Reset Password with OTP
  router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    const user = await users.findOne({ email });
    if (!user || user.resetOtp !== otp) {
      return res.status(400).json({ msg: 'Invalid OTP' });
    }

    if (new Date() > new Date(user.resetOtpExpires)) {
      return res.status(400).json({ msg: 'OTP expired' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await users.updateOne(
      { email },
      {
        $set: { password: hashedPassword },
        $unset: { resetOtp: "", resetOtpExpires: "" }
      }
    );

    res.json({ msg: 'Password reset successful' });
  });

  return router;
};
