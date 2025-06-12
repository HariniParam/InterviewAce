const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  role: { type: String, required: true },
  experience: { type: Number, required: true },
  jobType: { type: String, enum: ['Full Time', 'Intern'], required: true },
  mode: { type: String, enum: ['Written', 'One-to-One'], required: true },
  skills: [{ type: String }],
  resume: { type: String },
  isProfileBased: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewSession'
    }
  ]
});

interviewSchema.index({ role: 1, mode: 1, jobType: 1, user: 1, isProfileBased: 1 }, { unique: true });

module.exports = mongoose.model('Interview', interviewSchema);
