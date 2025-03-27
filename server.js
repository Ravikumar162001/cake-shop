const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// MongoDB Connection URI
const uri = "mongodb+srv://Ravikumar:BILLAdavid%4016@billa.yrg53j9.mongodb.net/cakeShop?retryWrites=true&w=majority&appName=Billa";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');

    const db = client.db('cakeShop');
    const ordersCollection = db.collection('orders');
    const contactsCollection = db.collection('contacts');

    // ===== Routes Setup =====

    // Auth Routes (Login/Signup)
    const authRoutes = require('./auth')(db);
    app.use('/api/auth', authRoutes);

    // Admin Routes (Orders, Messages, Actions)
    const adminRoutes = require('./routes/admin')(db);
    app.use('/api/admin', adminRoutes);

    // Customer Order Endpoint
    app.post('/api/order', async (req, res) => {
      try {
        console.log('📦 Order Received:', req.body);
        await ordersCollection.insertOne(req.body);
        res.send({ message: 'Order received successfully and saved to database!' });
      } catch (err) {
        console.error('❌ Order Save Failed:', err);
        res.status(500).send({ message: 'Failed to save order' });
      }
    });

    // Contact Form Endpoint
    app.post('/api/contact', async (req, res) => {
      try {
        console.log('📩 Contact Message:', req.body);
        await contactsCollection.insertOne(req.body);
        res.send({ message: 'Contact message saved to database!' });
      } catch (err) {
        console.error('❌ Contact Save Failed:', err);
        res.status(500).send({ message: 'Failed to save contact message' });
      }
    });

    // Serve index.html by default
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });

    // Start the server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('❌ MongoDB Connection Failed:', err);
  }
}

run();
