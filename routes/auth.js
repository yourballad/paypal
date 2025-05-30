const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
require('dotenv').config();
router.use(cookieParser());
router.use(express.json());

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ msg: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 3600000,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

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
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

router.get('/forgotpassword', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'protected', 'forgotpassword.html'));
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'Valid email is required.' });
  }

  try {
    const user = await User.findOne({ email: { $in: [email] } });

    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    const resetLink = `https://pure-cliffs-81924.herokuapp.com/reset-password-page?token=${token}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      text: `You requested a password reset.\n\nClick the link to reset your password:\n${resetLink}\n\nThis link expires in 15 minutes.`
    };

    await transporter.sendMail(mailOptions);

    console.log('Requested email:', email);
    console.log('Matched user ID:', user._id);
    console.log('Password reset link:', resetLink);

    return res.json({
      message: 'Password reset link has been sent to your email.',
      resetLink // only for testing/dev
    });
  } catch (err) {
    console.error('Error in /forgot-password:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


router.get('/reset-password-page', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'protected', 'reset-password.html'));
});

router.post('/reset-password', async (req, res) => {
  const { password, token } = req.body;
  
  console.log('New password (not logged in real app!):', password);

  if (!token) {
    return res.status(400).json({ success: false, message: 'Token is required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
console.log("Stored token:", user.resetToken);
console.log("Provided token:", token);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if stored token exists and matches
    if (user.resetToken !== token) {
      console.error('Stored token does not match provided token.');
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    // Check if token is expired
    if (!user.resetTokenExpiry || user.resetTokenExpiry < Date.now()) {
      console.error('Token has expired.');
      return res.status(400).json({ success: false, message: 'Token expired' });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('JWT error:', err);
    return res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }
});


module.exports = router;