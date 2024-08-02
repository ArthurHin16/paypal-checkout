import express from 'express';
import fetch from 'node-fetch';
import 'dotenv/config';
import path from 'path';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 3000;
const environment = process.env.ENVIRONMENT || 'sandbox';
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;

if (!client_id || !client_secret) {
  throw new Error('CLIENT_ID and CLIENT_SECRET must be set in environment variables');
}

const endpoint_url = environment === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

app.post('/create_order', async (req, res) => {
  try {
    const access_token = await getAccessToken();
    const orderData = {
      intent: 'CAPTURE',
      payment_source: {
        paypal: {
          name: {
            given_name: 'Arturo',
            surname: 'Hinojosa',
          },
          address: {
            address_line_1: '1234 Sunset Blvd',
            postal_code: '90210',
            country_code: 'US',
            admin_area_1: 'CA',
            admin_area_2: 'Los Angeles',
          },
          email_address: 'arturohin_16@outlook.com',
          phone: {
            phone_type: 'MOBILE',
            phone_number: {
              national_number: '2135551234',
            },
          },
        },
      },
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: '12.89',
          },
        },
      ],
    };

    const response = await fetch(`${endpoint_url}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
        'paypal-request-id': Date.now(),
      },
      body: JSON.stringify(orderData),
    });

    const json = await response.json();
    res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/complete_order', async (req, res) => {
  const { order_id, intent } = req.body;

  if (!order_id || !intent) {
    return res.status(400).json({ error: 'Order ID and intent are required' });
  }

  try {
    const access_token = await getAccessToken();
    const response = await fetch(`${endpoint_url}/v2/checkout/orders/${order_id}/${intent}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
      },
    });

    const json = await response.json();
    res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.get('/style.css', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'style.css'));
});

app.get('/script.js', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'script.js'));
});

async function getAccessToken() {
  const auth = `${client_id}:${client_secret}`;
  const data = 'grant_type=client_credentials';

  const response = await fetch(`${endpoint_url}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(auth).toString('base64')}`,
    },
    body: data,
  });

  const json = await response.json();

  if (!json.access_token) {
    throw new Error('Failed to fetch access token');
  }

  return json.access_token;
}

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});