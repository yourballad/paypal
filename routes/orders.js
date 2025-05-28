const express = require('express');
const path = require('path');
const authenticate = require('../middleware/verifyToken');
const Order = require('../models/Order');

const router = express.Router();

// ✅ Define helper function BEFORE it's used
function totalQuantity(items) {
  return items.reduce((sum, item) => sum + Number(item.quantity), 0);
}

const matchDate = (str) => {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                          "Jul", "Aug", "Sep",  ];
      const matched = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!matched) return null;

      const [_, year, month, day] = matched;
      const numericMonth = Number(month); // Convert to number
      return `${day} ${monthNames[numericMonth - 1]} ${year}`;
    };
// API: Return JSON list of orders
router.get('/orderstable', authenticate, async (req, res) => {
  try {
    const orders = await Order.find().sort({ created_at: -1 });
    
    const array = orders.map(element => {
      return {
        order_id: element.name,
        created_at: matchDate(element.created_at),
        first_name: `${element.billing_address?.first_name} ${element.billing_address?.last_name}`,
        email: element.customer?.email || '',
        line_items: `${totalQuantity(element.line_items)} item${totalQuantity(element.line_items) > 1 ? "'s" : ''}`,

        total_price: `USD ${element.subtotal_price}`,
        vat: `USD ${element.total_tax}`,
        fulfillment_status: element.fulfillment_status === null ? 'Pending' : 'Fulfilled'
      };
    });

    res.json(array);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// HTML: Serve orders.html (after login)
router.get('/', authenticate, (req, res) => {
  res.sendFile(path.join(__dirname, '../protected/orders.html'));
});

module.exports = router;
