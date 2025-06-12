const Interview = require('../models/Interview');
const InterviewSession = require('../models/InterviewSession');
const axios = require('axios');

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
        skills: interview.skills,
        resume: interview.resume,
        isProfileBased: interview.isProfileBased,
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
      mode: interview.mode,
      skills: interview.skills,
      resume: interview.resume,
      isProfileBased: interview.isProfileBased,
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

// Emotion analysis based on recorded video
const analyzeEmotion = async (req, res) => {
  try {
    if (!req.file) {
      console.error('No image file provided');
      return res.status(400).json({ error: 'No image file provided' });
    }

    const validMimes = ['image/jpeg', 'image/png'];
    if (!validMimes.includes(req.file.mimetype)) {
      console.error('Invalid image format:', req.file.mimetype);
      return res.status(400).json({ error: 'Invalid image format. Only JPEG/PNG supported' });
    }

    const imageBuffer = req.file.buffer;
    if (!imageBuffer || imageBuffer.length === 0) {
      console.error('Empty image buffer');
      return res.status(400).json({ error: 'Empty image buffer' });
    }

    const response = await axios.post(
      'https://api-inference.huggingface.co/models/dima806/facial_emotions_image_detection',
      imageBuffer,
      {
        headers: {
          'Authorization': `Bearer ${process.env.HF_API_KEY}`,
          'Content-Type': req.file.mimetype
        },
        responseType: 'json'
      }
    );

    const emotionResult = response.data;
    if (!emotionResult || !Array.isArray(emotionResult) || emotionResult.length === 0) {
      console.error('Invalid or empty API response:', emotionResult);
      return res.status(500).json({ error: 'Invalid response from Hugging Face API' });
    }

    const formattedResponse = {
      emotions: emotionResult.map(item => ({
        label: item.label,
        score: parseFloat(item.score.toFixed(2))
      })),
      primaryEmotion: emotionResult[0]?.label || 'neutral',
      confidence: parseFloat((emotionResult[0]?.score * 100 || 0).toFixed(2))
    };
    res.status(200).json(formattedResponse);
  } catch (error) {
    console.error('Emotion analysis error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    res.status(500).json({
      error: 'Failed to analyze emotion',
      details: error.response?.data?.error || error.message
    });
  }
};  

module.exports = {
  getAllSessions,
  getSessionById,
  deleteSessionById,
  analyzeEmotion
};
