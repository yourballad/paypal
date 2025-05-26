const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// GET /api/orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ created_at: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

module.exports = router;
