const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: [String], // or just String, if you've updated this
  username: String,
  password: String,
  resetToken: String,           // ✅ Must exist
  resetTokenExpiry: Date        // ✅ Must exist
});
module.exports = mongoose.model('User', userSchema);
