const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Set up multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads'); // upload to /uploads folder
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

module.exports = function(db) {
  const cakes = db.collection('cakes');

  // Upload cake image and data
  router.post('/cake', upload.single('image'), async (req, res) => {
    try {
      const { name, price, description } = req.body;
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

  return router;
};

