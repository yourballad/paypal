// middleware/verifyToken.js
const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    console.log(token, 112)
    return res.redirect('/'); // or '/login.html' if you prefer
  }

  try {
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
    
  } catch (err) {
    
    return res.redirect('/'); // or '/login.html'
  }
}

module.exports = authenticate;
