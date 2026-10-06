const http = require('http');

const leadgenId = `TEST_LEAD_${Date.now()}`;
const payload = JSON.stringify({
  object: 'page',
  entry: [
    {
      id: '1098234857234',
      time: Math.floor(Date.now() / 1000),
      changes: [
        {
          field: 'leadgen',
          value: {
            created_time: Math.floor(Date.now() / 1000),
            leadgen_id: leadgenId,
            page_id: '1098234857234',
            form_id: '876543210987',
          },
        },
      ],
    },
  ],
});

const req = http.request(
  {
    hostname: 'localhost',
    port: 5000,
    path: '/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  },
  (res) => {
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    res.on('end', () => {
      console.log(`✅ Webhook simulation sent! Server response: [${res.statusCode}] ${responseData}`);
      console.log(`   Simulated leadgen_id: ${leadgenId}`);
    });
  }
);

req.on('error', (error) => {
  console.error('❌ Failed to send simulated webhook. Is the backend server running?', error.message);
});

req.write(payload);
req.end();
