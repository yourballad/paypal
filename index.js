const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const ordersRoute = require('./routes/orders');
const cookieParser = require('cookie-parser');


dotenv.config();
const app = express();
app.use(cookieParser()); // <-- this applies to all route
// --- Mount raw body parser for webhook routes BEFORE json middleware
const webhookRoutes = require('./routes/webhook');
app.use('/api/webhook', webhookRoutes);

// --- Then use normal JSON parser for the rest of the app
app.use(bodyParser.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Auth Routes (after JSON middleware)
const authRoutes = require('./routes/auth');
app.use('/', authRoutes);
// Serve login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.use('/orders', ordersRoute);
app.use('/', ordersRoute);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
