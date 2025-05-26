// createUser.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const hashed = await bcrypt.hash('QLYpnOKAlO8AFXX6', 10);
  const user = new User({ username: 'yourballad', password: hashed });
  await user.save();
  console.log('Test user created');
  process.exit();
});