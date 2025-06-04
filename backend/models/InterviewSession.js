const mongoose = require('mongoose');

const interviewSessionSchema = new mongoose.Schema({
  qna: [
    {
      question: { type: String },
      answer: { type: String },
      correctAnswer: { type: String },
      similarityScore: { type: Number, default: null }
    }
  ],
  duration: { type: Number },
  videoUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
