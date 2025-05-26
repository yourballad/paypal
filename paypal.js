// utils/paypal.js
const axios = require('axios');

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

async function getAccessToken() {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      auth: {
        username: clientId,
        password: clientSecret,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: 'grant_type=client_credentials',
    });

    console.log('🔑 Got PayPal access token');
    return response.data.access_token;
  } catch (err) {
    console.error('❌ Error getting PayPal token:', err.response?.data || err.message);
    throw err;
  }
}

async function sendTrackingToPayPal(trackingPayload) {
  const accessToken = await getAccessToken();

  const response = await axios.post(
    'https://api-m.sandbox.paypal.com/v1/shipping/trackers-batch',
    trackingPayload,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
}

module.exports = { getAccessToken, sendTrackingToPayPal };
