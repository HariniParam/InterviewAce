const express = require('express');
const multer = require('multer');
const { updateProfile, getProfile } = require('../controllers/profileController');
const { isAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

router.get('/', isAuthenticated, getProfile);

// Accept two files: 'resume' and 'profileImage'
router.post('/update', isAuthenticated,
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 }
  ]),
  updateProfile
);

module.exports = router;
