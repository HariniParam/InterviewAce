const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');
const { 
  createInterview, 
  getAllInterviews, 
  getInterviewById, 
  deleteInterview } = require('../controllers/interviewController');

router.post('/', isAuthenticated, createInterview);
router.get('/', isAuthenticated, getAllInterviews);
router.get('/:id', isAuthenticated, getInterviewById);
router.delete('/:id', isAuthenticated, deleteInterview);

module.exports = router;
