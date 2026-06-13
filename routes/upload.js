const express = require('express');
const multer = require('multer');
const path = require('path');
const { ObjectId } = require('mongodb');
const router = express.Router();

// 🔧 Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads'); // Save images to /uploads
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Only allow image uploads, max 5 MB
const fileFilter = function (req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, png, webp, gif) are allowed'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = function (db) {
  const cakes = db.collection('cakes');

  // 🚀 Add new cake
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

  // 🍰 Get all cakes
  router.get('/cakes', async (req, res) => {
    try {
      const allCakes = await cakes.find().toArray();
      res.status(200).json(allCakes);
    } catch (err) {
      res.status(500).json({ msg: 'Failed to fetch cakes' });
    }
  });

  // ✏️ Update cake by ID
  router.put('/cake/:id', upload.single('image'), async (req, res) => {
    try {
      const id = req.params.id;
      const { name, price, description } = req.body;

      const updateData = {
        name,
        price: parseInt(price),
        description
      };

      if (req.file) {
        updateData.image = '/uploads/' + req.file.filename;
      }

      await cakes.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
      res.json({ message: 'Cake updated successfully!' });

    } catch (err) {
      console.error('❌ Error updating cake:', err);
      res.status(500).json({ msg: 'Failed to update cake' });
    }
  });

  // 🗑️ Delete cake by ID
  router.delete('/cake/:id', async (req, res) => {
    try {
      const id = req.params.id;
      await cakes.deleteOne({ _id: new ObjectId(id) });
      res.json({ message: 'Cake deleted successfully!' });
    } catch (err) {
      console.error('❌ Error deleting cake:', err);
      res.status(500).json({ msg: 'Failed to delete cake' });
    }
  });

  return router;
};
