const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

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

    // Auth (Login/Signup)
    const authRoutes = require('./auth')(db);
    app.use('/api/auth', authRoutes);

    // Admin Routes (View orders, messages)
    const adminRoutes = require('./routes/admin')(db);
    app.use('/api/admin', adminRoutes);

    // Order API
    app.post('/api/order', async (req, res) => {
      console.log('Order Received:', req.body);
      await ordersCollection.insertOne(req.body);
      res.send({ message: 'Order received successfully and saved to database!' });
    });

    // Contact API
    app.post('/api/contact', async (req, res) => {
      console.log('Contact Message:', req.body);
      await contactsCollection.insertOne(req.body);
      res.send({ message: 'Contact message saved to database!' });
    });

    // Serve Frontend
    app.get('/', (req, res) => {
      res.sendFile(__dirname + '/index.html');
    });

    // Server Listen
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('❌ MongoDB Connection Failed:', err);
  }
}

run();

