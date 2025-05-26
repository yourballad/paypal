const mongoose = require('mongoose');

const CreatedOrderSchema = new mongoose.Schema({
  shopifyOrderId: {
    type: Number,
    required: true,
    unique: true
  },
  customer: {
    id: Number,
    first_name: String,
    last_name: String,
    email: String
  },
  line_items: [
    {
      title: String,
      sku: String,
      quantity: Number,
      price: String,
      vendor: String,
      fulfillment_status: String
    }
  ],
  total_price: String,
  currency: String,
  created_at: String,
  fulfillment_status: {
    type: String,
    default: 'pending'
  },
  isPending: {
    type: Boolean,
    default: true
  },
  fulfillment_date: {
    type: Date
  },
  saved_at: {
    type: Date,
    default: Date.now
  }
});

// Model name should be singular and capitalized
module.exports = mongoose.model('Order', CreatedOrderSchema);
