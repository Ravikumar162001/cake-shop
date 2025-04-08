const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { sendOrderStatusEmail } = require('../mailer');

module.exports = function (db) {
  const orders = db.collection('orders');
  const contacts = db.collection('contacts');

  // ✅ Get all orders (admin only)
  router.get('/orders', async (req, res) => {
    console.log('✅ Admin hit /orders - user:', req.user?.email, '| Role:', req.user?.role);

    if (!req.user || req.user.role !== 'admin') {
      console.warn('🚫 Unauthorized access attempt to /orders');
      return res.status(403).json({ msg: 'Access denied: Admins only' });
    }

    try {
      const allOrders = await orders.find().sort({ timestamp: -1 }).toArray();
      res.json(allOrders);
    } catch (err) {
      console.error('❌ Failed to fetch orders:', err);
      res.status(500).json({ msg: 'Failed to fetch orders' });
    }
  });

  // ✅ Get all contact messages (admin only)
  router.get('/messages', async (req, res) => {
    console.log('✅ Admin hit /messages - user:', req.user?.email, '| Role:', req.user?.role);

    if (!req.user || req.user.role !== 'admin') {
      console.warn('🚫 Unauthorized access attempt to /messages');
      return res.status(403).json({ msg: 'Access denied: Admins only' });
    }

    try {
      const allMessages = await contacts.find().sort({ _id: -1 }).toArray();
      res.json(allMessages);
    } catch (err) {
      console.error('❌ Failed to fetch messages:', err);
      res.status(500).json({ msg: 'Failed to fetch messages' });
    }
  });

  // ✅ Delete an order
  router.delete('/order/:id', async (req, res) => {
    try {
      const result = await orders.deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 1) {
        res.json({ msg: 'Order deleted successfully' });
      } else {
        res.status(404).json({ msg: 'Order not found' });
      }
    } catch (err) {
      console.error('❌ Failed to delete order:', err);
      res.status(500).json({ msg: 'Failed to delete order' });
    }
  });

  // ✅ Mark order as delivered (optional)
  router.patch('/order/:id/deliver', async (req, res) => {
    try {
      const result = await orders.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { status: 'Delivered' } }
      );
      if (result.modifiedCount === 1) {
        res.json({ msg: 'Order marked as delivered' });
      } else {
        res.status(404).json({ msg: 'Order not found or already delivered' });
      }
    } catch (err) {
      console.error('❌ Failed to mark delivered:', err);
      res.status(500).json({ msg: 'Failed to update order status' });
    }
  });

  // ✅ Update order status & send email to user
  router.patch('/order/:id/status', async (req, res) => {
    const { status } = req.body;

    try {
      const order = await orders.findOne({ _id: new ObjectId(req.params.id) });
      if (!order) return res.status(404).json({ msg: 'Order not found' });

      await orders.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { status } }
      );

      // ✅ Send status email
      sendOrderStatusEmail(order.userEmail, order.name, status)
        .then(() => console.log(`✅ Status email sent to ${order.userEmail}`))
        .catch(err => console.error('❌ Email send error:', err));

      res.json({ msg: `Order marked as ${status}` });
    } catch (err) {
      console.error('❌ Failed to update status:', err);
      res.status(500).json({ msg: 'Failed to update order status' });
    }
  });

  return router;
};
