const express = require('express');
const router = express.Router();

module.exports = function(db) {
  const orders = db.collection('orders');
  const contacts = db.collection('contacts');

  // Get all orders
  router.get('/orders', async (req, res) => {
    try {
      const allOrders = await orders.find().toArray();
      res.json(allOrders);
    } catch (err) {
      res.status(500).json({ msg: 'Failed to fetch orders' });
    }
  });

  // Get all contact messages
  router.get('/messages', async (req, res) => {
    try {
      const allMessages = await contacts.find().toArray();
      res.json(allMessages);
    } catch (err) {
      res.status(500).json({ msg: 'Failed to fetch messages' });
    }
  });

  return router;
};

