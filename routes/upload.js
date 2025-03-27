const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// 🔧 Set up multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads'); // Save to /uploads folder
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

module.exports = function (db) {
  const cakes = db.collection('cakes');

  // 🚀 POST /api/upload/cake → Save image + cake info
  router.post('/cake', upload.single('image'), async (req, res) => {
    try {
      const { name, price, description } = req.body;

      if (!req.file) {
        return res.status(400).json({ msg: 'Image upload required' });
      }

      const imagePath = '/uploads/' + req.file.filename;

      const newCake = {
        name,
        price: parseInt(price),
        description,
        image: imagePath
      };

      await cakes.insertOne(newCake);
      res.status(200).json({ message: 'Cake added successfully!', cake: newCake });

    } catch (err) {
      console.error('❌ Error uploading cake:', err);
      res.status(500).json({ msg: 'Failed to upload cake' });
    }
  });

  // 🍰 GET /api/cakes → fetch all cakes
  router.get('/cakes', async (req, res) => {
    try {
      const allCakes = await cakes.find().toArray();
      res.status(200).json(allCakes);
    } catch (err) {
      res.status(500).json({ msg: 'Failed to fetch cakes' });
    }
  });

  return router;
};
