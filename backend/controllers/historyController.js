const Interview = require('../models/Interview');
const InterviewSession = require('../models/InterviewSession');

// Get all sessions attended by the user
const getAllSessions = async (req, res) => {
  try {
    const interviews = await Interview.find({ user: req.user.id }).populate('sessions');
    const allSessions = interviews.flatMap(interview =>
      interview.sessions.map(session => ({
        ...session.toObject(),
        interviewId: interview._id,
        role: interview.role,
        jobType: interview.jobType,
        experience: interview.experience,
        mode: interview.mode,
        createdAt: session.createdAt
      }))
    );
    res.status(200).json(allSessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch interview sessions' });
  }
};

// Get specific session details
const getSessionById = async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const interview = await Interview.findOne({ sessions: session._id, user: req.user.id });
    if (!interview) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.status(200).json({
      ...session.toObject(),
      interviewId: interview._id,
      role: interview.role,
      jobType: interview.jobType,
      experience: interview.experience,
      mode: interview.mode
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch session details' });
  }
};

// Delete a specific session
const deleteSessionById = async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const interview = await Interview.findOne({ sessions: session._id, user: req.user.id });
    if (!interview) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    interview.sessions = interview.sessions.filter(sid => sid.toString() !== session._id.toString());
    await interview.save();

    await InterviewSession.findByIdAndDelete(session._id);

    res.status(200).json({ message: 'Session deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
};

module.exports = {
  getAllSessions,
  getSessionById,
  deleteSessionById
};
