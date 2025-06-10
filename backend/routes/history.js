const express = require('express');
const router = express.Router();
const multer = require('multer');
const { isAuthenticated } = require('../middleware/authMiddleware');
const {
  getAllSessions,
  deleteSessionById,
  getSessionById,
  analyzeEmotion
} = require('../controllers/historyController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // Limit file size to 5MB
  }
});

router.get('/', isAuthenticated, getAllSessions);
router.get('/:sessionId', isAuthenticated, getSessionById);
router.delete('/:sessionId', isAuthenticated, deleteSessionById);
router.post('/:sessionId/analyze', upload.single('image'), analyzeEmotion);

module.exports = router;
