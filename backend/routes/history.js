const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');
const {
  getAllSessions,
  deleteSessionById,
  getSessionById,
} = require('../controllers/historyController');

router.get('/', isAuthenticated, getAllSessions);
router.get('/:sessionId', isAuthenticated, getSessionById);
router.delete('/:sessionId', isAuthenticated, deleteSessionById);

module.exports = router;
