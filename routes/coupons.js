const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = function (db) {
  const coupons = db.collection('coupons');

  // ✅ Create a new coupon (Admin only)
  router.post('/', async (req, res) => {
    const { code, discount, expiry, usageLimit } = req.body;

    if (!code || !discount || !expiry || !usageLimit) {
      return res.status(400).json({ msg: 'All fields required' });
    }

    try {
      const existing = await coupons.findOne({ code });
      if (existing) return res.status(400).json({ msg: 'Coupon already exists' });

      await coupons.insertOne({
        code,
        discount,
        expiry: new Date(expiry),
        usageLimit,
        usedCount: 0
      });

      res.json({ msg: 'Coupon created' });
    } catch (err) {
      console.error('❌ Failed to create coupon:', err);
      res.status(500).json({ msg: 'Error creating coupon' });
    }
  });

  // ✅ Get all coupons
  router.get('/', async (req, res) => {
    try {
      const data = await coupons.find().toArray();
      res.json(data);
    } catch (err) {
      res.status(500).json({ msg: 'Failed to fetch coupons' });
    }
  });

  // ✅ Validate coupon on frontend apply
  router.post('/validate', async (req, res) => {
    const { code } = req.body;

    try {
      const coupon = await coupons.findOne({ code });

      if (!coupon) return res.status(404).json({ msg: 'Invalid code' });

      const now = new Date();
      if (now > new Date(coupon.expiry)) {
        return res.status(400).json({ msg: 'Coupon expired' });
      }

      if (coupon.usedCount >= coupon.usageLimit) {
        return res.status(400).json({ msg: 'Usage limit reached' });
      }

      res.json({
        discount: coupon.discount,
        msg: `Coupon applied: ${coupon.discount}% off`
      });
    } catch (err) {
      console.error('❌ Failed to validate coupon:', err);
      res.status(500).json({ msg: 'Error validating coupon' });
    }
  });

  // ✅ (Optional) Delete coupon by ID
  router.delete('/:id', async (req, res) => {
    try {
      const id = req.params.id;
      await coupons.deleteOne({ _id: new ObjectId(id) });
      res.json({ msg: 'Coupon deleted' });
    } catch (err) {
      res.status(500).json({ msg: 'Failed to delete coupon' });
    }
  });

  return router;
};

