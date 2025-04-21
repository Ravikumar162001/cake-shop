const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { sendOrderEmail } = require('./mailer');
const { verifyToken, verifyAdmin } = require('./verifyToken');

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
    app.use('/api/admin', verifyToken, verifyAdmin, adminRoutes);

    // ✅ Upload Routes
    const uploadRoutes = require('./routes/upload')(db);
    app.use('/api/upload', uploadRoutes);

    // ✅ Coupon Routes
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

        if (order.couponCode) {
          const couponUpdate = await db.collection('coupons').updateOne(
            { code: order.couponCode },
            { $inc: { usedCount: 1 } }
          );
          if (couponUpdate.modifiedCount === 1) {
            console.log(`🎟️ Coupon usage incremented for ${order.couponCode}`);
          } else {
            console.warn(`⚠️ Coupon code not found or update failed: ${order.couponCode}`);
          }
        }

        sendOrderEmail(order.userEmail, order)
          .then(() => console.log('✅ Confirmation email sent'))
          .catch(err => console.error('❌ Email send failed:', err));

        res.send({ message: 'Order received successfully and saved to database!' });
      } catch (err) {
        console.error('❌ Order Save Failed:', err);
        res.status(500).send({ message: 'Failed to save order' });
      }
    });

    // ✅ Order Invoice (PDF)
    app.get('/api/order/:id/invoice', async (req, res) => {
      try {
        const orderId = req.params.id;
        const order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });

        if (!order) return res.status(404).send('Order not found');

        const doc = new PDFDocument();
        // ✅ Load custom font
        doc.registerFont('DejaVu', path.join(__dirname, 'fonts', 'DejaVuSans.ttf'));
        doc.font('DejaVu');
        doc.pipe(res);


        doc.fontSize(20).text('🧁 Sweet Bites - Order Invoice', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Name: ${order.name}`);
        doc.text(`Email: ${order.userEmail}`);
        doc.text(`Phone: ${order.phone}`);
        doc.text(`Delivery Area: ${order.deliveryArea}`);
        doc.text(`Address: ${order.address}`);
        doc.text(`Date: ${new Date(order.timestamp).toLocaleString()}`);
        doc.moveDown();

        doc.text('📦 Items:');
        order.items.forEach((item, idx) => {
          const weight = item.weight || '1kg';
          let weightMult = 1;
          if (weight === '0.5kg') weightMult = 0.5;
          else if (weight === '1.5kg') weightMult = 1.5;
          else if (weight === '2kg') weightMult = 2;
        
          const itemTotal = item.price * item.qty * weightMult;
          doc.text(`${idx + 1}. ${item.name} (${weight} x${item.qty}) - ₹${itemTotal}`);
        });
        

        doc.moveDown();
        doc.text(`Subtotal: ₹${order.totalAmount}`);
        doc.text(`Discount: ₹${order.discountAmount || 0}`);
        doc.text(`Final Total: ₹${order.finalAmount.toFixed(2)}`);
        doc.end();

      } catch (err) {
        console.error('❌ Invoice generation failed:', err);
        res.status(500).send('Failed to generate invoice');
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

    // ✅ Save Review
    app.post('/api/review', verifyToken, async (req, res) => {
      try {
        const { message } = req.body;
        const name = req.user.email.split('@')[0];

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
