const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');
const { sendOrderEmail } = require('./mailer');
const { verifyToken, verifyAdmin } = require('./verifyToken'); // ✅ Import JWT + Admin check

// ===== Middleware =====
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// ✅ Serve static images from /uploads
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath);
  console.log('📁 /uploads folder created automatically');
}
app.use('/uploads', express.static(uploadsPath));

// ===== MongoDB Connection =====
const uri = "mongodb+srv://Ravikumar:BILLAdavid%4016@billa.yrg53j9.mongodb.net/cakeShop?retryWrites=true&w=majority&appName=Billa";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');

    const db = client.db('cakeShop');
    const ordersCollection = db.collection('orders');
    const contactsCollection = db.collection('contacts');
    const reviewsCollection = db.collection('reviews');

    // ✅ Auth Routes
    const authRoutes = require('./auth')(db);
    app.use('/api/auth', authRoutes);

    // ✅ Admin Routes (protected)
    const adminRoutes = require('./routes/admin')(db);
    app.use('/api/admin', verifyToken, verifyAdmin, adminRoutes); // 🔐 Secure with both

    // ✅ Upload Routes
    const uploadRoutes = require('./routes/upload')(db);
    app.use('/api/upload', uploadRoutes);
    const couponRoutes = require('./routes/coupons')(db);
    app.use('/api/coupons', couponRoutes);


    // ✅ Get Cakes
    app.get('/api/cakes', async (req, res) => {
      try {
        const cakes = await db.collection('cakes').find().toArray();
        res.json(cakes);
      } catch (err) {
        res.status(500).json({ msg: 'Failed to fetch cakes' });
      }
    });

    // ✅ Save Order & Send Email
    app.post('/api/order', async (req, res) => {
      try {
        const order = req.body;
        console.log('📦 Order Received:', order);
        await ordersCollection.insertOne(order);

        sendOrderEmail(order.userEmail, order)
          .then(() => console.log('✅ Confirmation email sent'))
          .catch(err => console.error('❌ Email send failed:', err));

        res.send({ message: 'Order received successfully and saved to database!' });
      } catch (err) {
        console.error('❌ Order Save Failed:', err);
        res.status(500).send({ message: 'Failed to save order' });
      }
    });

    // ✅ Get User Orders
    app.get('/api/orders/user/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const orders = await ordersCollection.find({ userEmail: email }).sort({ timestamp: -1 }).toArray();
        res.json(orders);
      } catch (err) {
        console.error('❌ Failed to fetch user orders:', err);
        res.status(500).json({ msg: 'Failed to fetch user orders' });
      }
    });

    // ✅ Save Contact Message
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

    // ✅ Save Review (secured with JWT)
    app.post('/api/review', verifyToken, async (req, res) => {
      try {
        const { message } = req.body;
        const name = req.user.email.split('@')[0]; // derive name from email

        if (!message) return res.status(400).send({ message: 'Review message required' });

        await reviewsCollection.insertOne({ name, message });
        res.send({ message: 'Review saved!' });
      } catch (err) {
        console.error('❌ Failed to save review:', err);
        res.status(500).send({ message: 'Error saving review' });
      }
    });

    // ✅ Get All Reviews
    app.get('/api/reviews', async (req, res) => {
      try {
        const reviews = await reviewsCollection.find().sort({ _id: -1 }).toArray();
        res.json(reviews);
      } catch (err) {
        console.error('❌ Failed to fetch reviews:', err);
        res.status(500).send({ message: 'Error fetching reviews' });
      }
    });

    // ✅ Serve index.html
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });

    // ✅ Start Server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('❌ MongoDB Connection Failed:', err);
  }
}

run();
