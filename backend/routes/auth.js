const express = require('express');
const router = express.Router();
const { signup, signin } = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/signin', signin);

router.get('/dashboard', isAuthenticated, (req, res) => {
  res.json({ message: 'Protected dashboard data', user: req.user });
});

module.exports = router;
