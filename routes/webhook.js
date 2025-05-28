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
      order_number,
      name,
      email,
      financial_status,
      fulfillment_status,
      created_at,
      currency,
      total_price,
      subtotal_price,
      total_tax,
      line_items,
      shipping_address,
      billing_address,
      customer,
      payment_gateway_names,
      tags
    } = order;

    // 🌍 Currency conversion (only if in USD)
    let exchangeRate = 0;
    let convertedPrice = null;
    if (currency === 'USD') {
      const fxRes = await axios.get('https://v6.exchangerate-api.com/v6/709df70a0dc092a980a035d8/latest/USD');
      exchangeRate = parseFloat(fxRes.data.conversion_rates.ZAR);
      convertedPrice = (parseFloat(total_price) * exchangeRate).toFixed(2);
    }

    // 💾 Save to MongoDB
    await Order.create({
      id: id,
      order_number,
      name,
      email,
      financial_status,
      fulfillment_status,
      created_at,
      currency,
      total_price,
      subtotal_price,
      total_tax,
      converted_total_price_zar: convertedPrice,
      exchange_rate_usd_to_zar: exchangeRate,
      line_items: line_items.map(item => ({
        title: item.title,
        variant_title: item.variant_title,
        quantity: item.quantity,
        price: item.price,
        product_id: item.product_id,
        variant_id: item.variant_id,
        tax_lines: item.tax_lines?.map(tax => ({
          title: tax.title,
          price: tax.price,
          rate: tax.rate
        })) || []
      })),
      shipping_address: {
        first_name: shipping_address?.first_name,
        last_name: shipping_address?.last_name,
        address1: shipping_address?.address1,
        city: shipping_address?.city,
        province: shipping_address?.province,
        zip: shipping_address?.zip,
        country: shipping_address?.country,
        country_code: shipping_address?.country_code,
        province_code: shipping_address?.province_code
      },
      billing_address: {
        first_name: billing_address?.first_name,
        last_name: billing_address?.last_name,
        address1: billing_address?.address1,
        city: billing_address?.city,
        province: billing_address?.province,
        zip: billing_address?.zip,
        country: billing_address?.country,
        country_code: billing_address?.country_code,
        province_code: billing_address?.province_code
      },
      customer: {
        id: customer?.id,
        email: customer?.email,
        first_name: customer?.first_name,
        last_name: customer?.last_name
      },
      payment_gateway_names,
      tags,
      isPending: fulfillment_status !== 'fulfilled'
    });

    console.log(`✅ Order #${order_number} saved successfully`);
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
    console.log(data)
    const fulfillmentDate = data.fulfillments?.[0]?.created_at || new Date();

    const updated = await Order.findOneAndUpdate(
      { id: orderId },
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

    console.log('✅ Fulfilled order updated:', updated.id);
    res.status(200).send('Order updated');
  } catch (error) {
    console.error('❌ Error updating fulfillment:', error.message || error);
    res.status(500).send('Server error');
  }
});



module.exports = router;
