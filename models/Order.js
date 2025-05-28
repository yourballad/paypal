const mongoose = require('mongoose');

const CreatedOrderSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  order_number: Number,
  name: String,
  email: String,
  financial_status: String,
  fulfillment_status: {
    type: String,
    default: null
  },
  created_at: String,
  currency: String,
  total_price: String,
  subtotal_price: String,
  total_tax: String,

  line_items: [
    {
      title: String,
      variant_title: String,
      quantity: Number,
      price: String,
      product_id: Number,
      variant_id: Number,
      tax_lines: [
        {
          title: String,
          price: String,
          rate: Number
        }
      ]
    }
  ],

  shipping_address: {
    first_name: String,
    last_name: String,
    address1: String,
    city: String,
    province: String,
    zip: String,
    country: String,
    country_code: String,
    province_code: String
  },

  billing_address: {
    first_name: String,
    last_name: String,
    address1: String,
    city: String,
    province: String,
    zip: String,
    country: String,
    country_code: String,
    province_code: String
  },

  customer: {
    id: Number,
    email: String,
    first_name: String,
    last_name: String
  },

  payment_gateway_names: [String],

  tags: String,

  isPending: {
    type: Boolean,
    default: true
  },
  fulfillment_date: Date,
  saved_at: {
    type: Date,
    default: Date.now
  }
});

// Export the model
module.exports = mongoose.model('Order', CreatedOrderSchema);
