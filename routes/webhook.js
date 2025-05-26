require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const Order = require('../models/Order');
const router = express.Router();
const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
const axios = require('axios');

// 🧠 Middleware to capture raw body for HMAC validation
router.use(bodyParser.raw({
  type: 'application/json',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// 🔒 Verify Shopify HMAC
function isVerified(req) {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
  const hash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.rawBody, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
}

// 📦 Order Created Webhook
router.post('/order-created', async (req, res) => {
  try {
    if (!isVerified(req, req.body)) {
      return res.status(401).send('Unauthorized');
    }

    const order = JSON.parse(req.body.toString('utf8'));
    const {
      id,
      customer,
      line_items,
      total_price,
      currency,
      created_at,
      fulfillment_status
    } = order;

    // 🌍 Fetch USD to ZAR rate
    let exchangeRate = 0;
    let convertedPrice = null;
    if (currency === 'USD') {
      const fxRes = await axios.get('https://v6.exchangerate-api.com/v6/709df70a0dc092a980a035d8/latest/USD');
      exchangeRate = parseFloat(fxRes.data.conversion_rates.ZAR);
      convertedPrice = (parseFloat(total_price) * exchangeRate).toFixed(2);
    }

    // 💾 Save to MongoDB
    await Order.create({
      shopifyOrderId: id,
      customer: {
        id: customer?.id,
        first_name: customer?.first_name,
        last_name: customer?.last_name,
        email: customer?.email
      },
      line_items: line_items.map(item => ({
        title: item.title,
        sku: item.sku,
        quantity: item.quantity,
        price: item.price,
        vendor: item.vendor,
        fulfillment_status: item.fulfillment_status
      })),
      total_price,
      currency, // 👈 fixed this: now saving string like "USD" or "ZAR"
      converted_total_price_zar: convertedPrice,
      exchange_rate_usd_to_zar: exchangeRate,
      created_at,
      fulfillment_status,
      isPending: fulfillment_status !== 'fulfilled'
    });

    console.log(`✅ Order ${id} saved with ZAR: R${convertedPrice}`);
    res.status(200).send('Order saved');

  } catch (err) {
    console.error('❌ Order creation error:', err.message || err);
    res.status(500).send('Internal server error');
  }
});

router.post('/order-fulfilled', async (req, res) => {
  try {
    if (!isVerified(req, req.body)) {
      return res.status(401).send('Unauthorized');
    }

    const data = JSON.parse(req.body.toString('utf8'));
    const orderId = data.id;

    const fulfillmentDate = data.fulfillments?.[0]?.created_at || new Date();

    const updated = await Order.findOneAndUpdate(
      { shopifyOrderId: orderId },
      {
        $set: {
          isPending: false,
          fulfillment_status: 'fulfilled',
          fulfillment_date: fulfillmentDate
        }
      },
      { new: true }
    );

    if (!updated) {
      console.warn(`⚠️ Order ${orderId} not found in DB`);
      return res.status(404).send('Order not found');
    }

    console.log('✅ Fulfilled order updated:', updated.shopifyOrderId);
    res.status(200).send('Order updated');
  } catch (error) {
    console.error('❌ Error updating fulfillment:', error.message || error);
    res.status(500).send('Server error');
  }
});



module.exports = router;
