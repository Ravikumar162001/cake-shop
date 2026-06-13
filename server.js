require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { sendOrderEmail } = require('./mailer');
const { verifyToken, verifyAdmin } = require('./verifyToken');

// ===== Middleware =====
// Security headers (CSP disabled so the AngularJS CDN / inline templates keep working)
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
// Strip MongoDB operators ($, .) from user input to prevent NoSQL injection
app.use(mongoSanitize());

// Throttle auth endpoints to slow down brute-force / OTP-spam
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many attempts. Please try again later.' }
});

app.use(express.static(__dirname));

// ✅ Serve static images from /uploads
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath);
  console.log('📁 /uploads folder created automatically');
}
app.use('/uploads', express.static(uploadsPath));

// Weight → price multiplier (kept in sync with the frontend)
function getWeightMultiplier(weight) {
  switch (weight) {
    case '0.5kg': return 0.5;
    case '1kg': return 1;
    case '1.5kg': return 1.5;
    case '2kg': return 2;
    default: return 1;
  }
}

// ===== MongoDB Connection =====
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI is not set. Add it to your .env file or environment.');
  process.exit(1);
}
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');

    const db = client.db('cakeShop');
    const ordersCollection = db.collection('orders');
    const contactsCollection = db.collection('contacts');
    const reviewsCollection = db.collection('reviews');

    // ✅ Auth Routes (rate-limited)
    const authRoutes = require('./auth')(db);
    app.use('/api/auth', authLimiter, authRoutes);

    // ✅ Admin Routes (protected)
    const adminRoutes = require('./routes/admin')(db);
    app.use('/api/admin', verifyToken, verifyAdmin, adminRoutes);

    // ✅ Upload Routes (protected — admin only for writes)
    const uploadRoutes = require('./routes/upload')(db);
    app.use('/api/upload', verifyToken, verifyAdmin, uploadRoutes);

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
    // Totals are recomputed server-side from authoritative cake prices and
    // coupon data — client-supplied amounts are never trusted.
    app.post('/api/order', async (req, res) => {
      try {
        const body = req.body || {};

        // --- Validate basic shape ---
        if (!Array.isArray(body.items) || body.items.length === 0) {
          return res.status(400).send({ message: 'Order must contain at least one item' });
        }
        if (!body.userEmail || typeof body.userEmail !== 'string') {
          return res.status(400).send({ message: 'A valid user email is required' });
        }

        // --- Recompute each line item from the database price ---
        let subtotal = 0;
        const items = [];
        for (const raw of body.items) {
          let cake = null;
          try {
            if (raw && raw._id) {
              cake = await db.collection('cakes').findOne({ _id: new ObjectId(raw._id) });
            }
          } catch (e) {
            cake = null; // invalid ObjectId
          }
          if (!cake) {
            return res.status(400).send({ message: `Unknown or invalid cake in cart: ${raw && raw.name}` });
          }

          const qty = parseInt(raw.qty, 10);
          if (!Number.isInteger(qty) || qty < 1) {
            return res.status(400).send({ message: `Invalid quantity for ${cake.name}` });
          }

          const weight = ['0.5kg', '1kg', '1.5kg', '2kg'].includes(raw.weight) ? raw.weight : '1kg';
          const weightMult = getWeightMultiplier(weight);
          const lineTotal = cake.price * qty * weightMult;
          subtotal += lineTotal;

          items.push({
            _id: cake._id,
            name: cake.name,
            price: cake.price, // authoritative price from DB
            qty,
            weight
          });
        }

        // --- Recompute discount from the coupon record (if any) ---
        let discountAmount = 0;
        let appliedCouponCode = null;
        if (body.couponCode && typeof body.couponCode === 'string') {
          const coupon = await db.collection('coupons').findOne({ code: body.couponCode });
          const now = new Date();
          if (
            coupon &&
            now <= new Date(coupon.expiry) &&
            (coupon.usedCount || 0) < coupon.usageLimit
          ) {
            discountAmount = Math.round((coupon.discount / 100) * subtotal);
            appliedCouponCode = coupon.code;
          }
        }

        const finalAmount = subtotal - discountAmount;

        // --- Build the trusted order document ---
        const order = {
          name: typeof body.name === 'string' ? body.name : '',
          phone: typeof body.phone === 'string' ? body.phone : '',
          address: typeof body.address === 'string' ? body.address : '',
          deliveryArea: typeof body.deliveryArea === 'string' ? body.deliveryArea : '',
          userEmail: body.userEmail,
          items,
          totalAmount: subtotal,
          discountAmount,
          finalAmount,
          couponCode: appliedCouponCode,
          status: 'Pending',
          timestamp: new Date().toISOString()
        };

        await ordersCollection.insertOne(order);

        if (appliedCouponCode) {
          const couponUpdate = await db.collection('coupons').updateOne(
            { code: appliedCouponCode },
            { $inc: { usedCount: 1 } }
          );
          if (couponUpdate.modifiedCount === 1) {
            console.log(`🎟️ Coupon usage incremented for ${appliedCouponCode}`);
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
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId}.pdf`);
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
        doc.text(`Final Total: ₹${order.finalAmount}`);
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
