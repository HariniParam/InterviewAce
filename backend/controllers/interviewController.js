const Interview = require('../models/Interview');

// Create a new interview
const createInterview = async (req, res) => {
  try {
    const { role, experience, jobType, mode } = req.body;
    const userId = req.user.id;
    const interview = new Interview({
      role,
      experience,
      jobType,
      mode,
      user: userId
    });

    await interview.save();
    res.status(201).json(interview);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Interview for this role and mode already exists.' });
    }
    res.status(500).json({ error: 'Failed to create interview' });
  }
};

// Get all interviews for logged-in user
const getAllInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(interviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
};

// Get specific interview by ID
const getInterviewById = async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user.id });
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found or unauthorized' });
    }
    res.json(interview);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interview' });
  }
};

// Delete interview by ID
const deleteInterview = async (req, res) => {
  try {
    const interview = await Interview.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found or unauthorized' });
    }
    res.json({ message: 'Interview deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete interview' });
  }
};

module.exports = { createInterview, getAllInterviews, getInterviewById, deleteInterview };