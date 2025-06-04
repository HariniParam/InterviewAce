const express = require('express');
const multer = require('multer');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { 
  createInterview, 
  getAllInterviews, 
  getInterviewById, 
  deleteInterview,
  addInterviewSession,
  uploadVideo,
  generateQuestions } = require('../controllers/interviewController');

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'interviewVideos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage for interview video uploads
const storage = multer.diskStorage({
  destination: 'uploads/interviewVideos/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

router.post('/', isAuthenticated, createInterview);
router.get('/', isAuthenticated, getAllInterviews);
router.get('/:id', isAuthenticated, getInterviewById);
router.delete('/:id', isAuthenticated, deleteInterview);

router.post('/:id/session', isAuthenticated, addInterviewSession);
router.post('/:id/questions', isAuthenticated, generateQuestions);
router.post('/upload', isAuthenticated, upload.single('file'), uploadVideo); // Recorded vdo session

module.exports = router;
