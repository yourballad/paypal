const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');

// Middleware to enable cookie setting
const cookieParser = require('cookie-parser');
router.use(cookieParser());

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ msg: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ msg: 'Invalid credentials' });

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Set JWT token as HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 3600000, // 1 hour
      secure: process.env.NODE_ENV === 'production' ? true : false, // or just `false` for dev
      sameSite: 'lax',
    });

    console.log('NODE_ENV:', process.env.NODE_ENV);
    // Send orders.html file
    res.json({ msg: 'Login successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});


router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.sendFile(path.join(__dirname, '../public/login.html'));;
});
module.exports = router;
