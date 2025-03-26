const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');

// Enable CORS & JSON parsing
app.use(cors());
app.use(bodyParser.json());

// Serve static files like index.html, style.css, app.js
app.use(express.static(__dirname));

// API: Order endpoint
app.post('/api/order', (req, res) => {
  console.log('Order Received:', req.body);
  res.send({ message: 'Order received successfully!' });
});

// API: Contact endpoint
app.post('/api/contact', (req, res) => {
  console.log('Contact Message:', req.body);
  res.send({ message: 'Message received successfully!' });
});

// Serve index.html when visiting root "/"
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

