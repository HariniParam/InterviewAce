require('dotenv').config();
const Interview = require('../models/Interview');
const InterviewSession = require('../models/InterviewSession');
const OpenAI = require('openai');
const { writtenPrompt, oneToOneFollowUpPrompt, oneToOneInitialPrompt } = require('../prompts/interviewPrompt');

// Initialize OpenAI client
// const openai = new OpenAI({
//   baseURL: "https://openrouter.ai/api/v1",
//   apiKey: process.env.OPENAI_API_KEY,
//   defaultHeaders: {
//     'HTTP-Referer': 'http://localhost:3001',
//     'X-Title': 'InterviewAce'
//   }
// });
const openai = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

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

// Add a session into interview
const addInterviewSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { qna, duration, videoUrl } = req.body;

    const interview = await Interview.findOne({ _id: id, user: req.user.id });
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found or unauthorized' });
    }

    const session = new InterviewSession({
      qna,
      duration,
      videoUrl
    });

    await session.save();

    interview.sessions.push(session._id);
    await interview.save();

    res.status(201).json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add interview session' });
  }
};

// To upload recorded interview session
const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const videoUrl = `/uploads/interviewVideos/${req.file.filename}`;

    res.status(200).json({ 
      message: 'File uploaded successfully', 
      url: videoUrl 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to upload video', error: error.message });
  }
};

// Helper function to parse structured Q&A pairs
const parseStructuredQA = (responseText, mode = 'Written', isFollowUp = false) => {
  const pairs = [];
 
  let cleanText = responseText
    .replace(/^.*?(?:here are|questions?:?|follow-up question\s*(?:and answer template)?:?|RESPONSE\s*:)/i, '')
    .trim();
  
  cleanText = cleanText.replace(/^QA_PAIR_SEPARATOR\s*|\s*QA_PAIR_SEPARATOR$/g, '').trim();
  
  // Split by QA_PAIR_SEPARATOR or treat as single section
  const sections = cleanText.includes('QA_PAIR_SEPARATOR') 
    ? cleanText.split('QA_PAIR_SEPARATOR')
    : [cleanText];
  
  console.log(`Processing ${sections.length} sections`);
  
  // In One-to-One mode, use only the last section for follow-up questions; otherwise, use all sections
  const sectionsToProcess = mode === 'One-to-One' && isFollowUp 
    ? [sections[sections.length - 1] || sections[0]] 
    : sections;
  
  for (const section of sectionsToProcess) {
    if (!section.trim()) {
      console.log('Skipping empty section');
      continue;
    }
    
    console.log('Parsing section:', section.substring(0, 100) + '...');
    
    let questionMatch, answerMatch;
    
    // standard QUESTION: and ANSWER: patterns
    questionMatch = section.match(/QUESTION:\s*([\s\S]*?)(?=\nANSWER:|$)/is);
    answerMatch = section.match(/ANSWER:\s*([\s\S]*)/is);
    
    // Fallback for One-to-One mode: capture question before ANSWER:
    if (!questionMatch && mode === 'One-to-One' && section.includes('ANSWER:')) {
      console.log('Using One-to-One fallback parsing');
      const parts = section.split(/ANSWER:/i);
      if (parts.length >= 2) {
        const questionText = parts[0].trim();
        if (questionText.length > 10) {
          questionMatch = { 1: questionText };
          answerMatch = { 1: parts[1].trim() };
          console.log('Fallback question:', questionText.substring(0, 50) + '...');
        }
      }
    }
    
    if (questionMatch && answerMatch) {
      let question = questionMatch[1].trim();
      let answer = answerMatch[1].trim();
      
      answer = answer.split('QA_PAIR_SEPARATOR')[0].trim();
      
      const mcqOptionPattern = /\n\s*(A\)|B\)|C\)|D\))\s*.*?(?=\n\s*(?:A\)|B\)|C\)|D\)|ANSWER:)|$)/gis;
      const optionsMatch = question.match(mcqOptionPattern);
      
      if (optionsMatch) {
        console.log('Detected MCQ question');
        const correctAnswerMatch = answer.match(/Correct answer:\s*(.*?)(?:\nExplanation:|\s*$)/is);
        const explanationMatch = answer.match(/Explanation:\s*([\s\S]*)/is);
        
        if (correctAnswerMatch) {
          answer = correctAnswerMatch[1].trim();
          if (explanationMatch) {
            answer += `\nExplanation: ${explanationMatch[1].trim()}`;
          }
        }
      }
      
      if (question.length > 10 && answer.length > 10) {
        pairs.push({
          question: question,
          correctAnswer: answer
        });
        console.log('Parsed pair:', {
          question: question.substring(0, 50) + '...',
          answer: answer.substring(0, 50) + '...'
        });
      } else {
        console.warn('Pair too short:', {
          question: question.substring(0, 50) + '...',
          answer: answer.substring(0, 50) + '...'
        });
      }
    } else {
      console.warn('Failed to parse section:', section.substring(0, 100) + '...');
      if (!questionMatch) console.warn('No QUESTION: match');
      if (!answerMatch) console.warn('No ANSWER: match');
    }
  }
  
  return pairs;
};

// To generate questions or follow-up questions
const generateQuestions = async (req, res) => {
  const { jobRole, experience, jobType, mode, previousAnswer, previousQuestion } = req.body;

  let prompt = '';
  let isFollowUp = false;

  if (mode === 'Written') {
    prompt = writtenPrompt({ jobRole, experience, jobType });
  } else if (mode === 'One-to-One') {
    if (previousAnswer && previousQuestion) {
      prompt = oneToOneFollowUpPrompt({ previousQuestion, previousAnswer });
      isFollowUp = true;
    } else {
      prompt = oneToOneInitialPrompt({ jobRole, experience, jobType });
    }
  } else {
    return res.status(400).json({ error: 'Invalid interview mode' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: [{ role: 'user', content: prompt }],
      temperature: mode === 'Written' ? 0.3 : 0.5,
      max_tokens: 4000,
    });

    const responseText = response.choices[0].message.content;
    console.log("RESPONSE : ", responseText)
    const questionsWithAnswers = parseStructuredQA(responseText, mode, isFollowUp);
    
    if (questionsWithAnswers.length === 0) {
      throw new Error('No valid question-answer pairs could be parsed from the response');
    }
    
    const validPairs = questionsWithAnswers
      .filter(pair => pair.question && pair.correctAnswer)
      .filter(pair => pair.question.length > 10 && pair.correctAnswer.length > 10)
      .map(pair => ({
        question: pair.question.trim(),
        correctAnswer: pair.correctAnswer.trim()
      }));
    
    if (validPairs.length === 0) {
      throw new Error('No valid question-answer pairs after filtering');
    }
    
    // console.log("Final valid pairs:", validPairs.length);
    // console.log("Sample pair:", validPairs[0]);

    res.status(200).json({ 
      questionsWithAnswers: validPairs
    });
    
  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).json({ 
      error: 'Failed to generate questions',
      details: err.message 
    });
  }
};

module.exports = { 
  createInterview, 
  getAllInterviews, 
  getInterviewById, 
  deleteInterview,
  addInterviewSession,
  uploadVideo, 
  generateQuestions 
};