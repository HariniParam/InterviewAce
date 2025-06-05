require('dotenv').config();
const Interview = require('../models/Interview');
const InterviewSession = require('../models/InterviewSession');
const OpenAI = require('openai');
const axios = require('axios');
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

    // Calculate similarity scores for each Q&A pair
    const qnaWithScores = await Promise.all(
      qna.map(async (item) => {
        if (!item.question || !item.answer || !item.correctAnswer) {
          return {
            ...item,
            similarityScore: null,
          };
        }

        try {
          //const score = await calculateSimilarityScore(item.answer, item.correctAnswer);
          const score = await calculateSimilarityScore(
            item.answer, 
            item.correctAnswer, 
            item.question
          );
          return {
            ...item,
            similarityScore: score,
          };
        } catch (error) {
          console.error('Similarity calculation error:', error.message);
          return {
            ...item,
            similarityScore: null,
          };
        }
      })
    );

    const session = new InterviewSession({
      qna: qnaWithScores,
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
    // console.log("RESPONSE : ", responseText)
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

// Helper function to extract option from MCQ answers
const extractMCQOption = (text) => {
  if (!text || typeof text !== 'string') return null;
  
  const cleanText = text.trim().toUpperCase();
  
  // Look for patterns like "A)", "A.", "A", "OPTION A", etc.
  const optionPatterns = [
    /^([ABCD])\)/,           // A), B), C), D)
    /^([ABCD])\./,           // A., B., C., D.
    /^([ABCD])$/,            // Just A, B, C, D
    /^OPTION\s*([ABCD])/,    // OPTION A, OPTION B, etc.
    /^ANSWER\s*([ABCD])/,    // ANSWER A, ANSWER B, etc.
    /^([ABCD])\s*[-:]/,      // A-, A:, etc.
    /CORRECT\s*ANSWER:?\s*([ABCD])/i, // Correct answer: A
    /^.*?([ABCD])(?:\s|$)/   // Any A, B, C, D followed by space or end
  ];
  
  for (const pattern of optionPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

// Helper function to check if question is MCQ
const isMCQQuestion = (question) => {
  if (!question || typeof question !== 'string') return false;
  
  // Check for typical MCQ patterns
  const mcqPatterns = [
    /\n\s*[ABCD]\)/,  // A), B), C), D) on new lines
    /\([ABCD]\)/,     // (A), (B), (C), (D)
    /[ABCD]\.\s/,     // A. B. C. D. with space
    /[ABCD]\)\s/      // A) B) C) D) with space
  ];
  
  return mcqPatterns.some(pattern => pattern.test(question));
};

// similarity calculation function
const calculateSimilarityScore = async (userAnswer, correctAnswer, question = '') => {
  try {
    // Input validation
    if (!userAnswer || !correctAnswer || typeof userAnswer !== 'string' || typeof correctAnswer !== 'string') {
      console.error('Invalid input for similarity calculation');
      return 0;
    }

    // Check if this is an MCQ question
    if (isMCQQuestion(question)) {
      
      const userOption = extractMCQOption(userAnswer);
      const correctOption = extractMCQOption(correctAnswer);
      
      if (userOption && correctOption) {
        // Direct option comparison - exact match = 100, no match = 0
        const score = userOption === correctOption ? 100 : 0;
        return score;
      } else {
        console.warn('Could not extract options from MCQ answers');
        const cleanUser = userAnswer.trim().toUpperCase();
        const cleanCorrect = correctAnswer.trim().toUpperCase();
        
        for (const option of ['A', 'B', 'C', 'D']) {
          if (cleanUser.includes(option) && cleanCorrect.includes(option)) {
            return 100;
          }
        }
        return 0;
      }
    }

    // For non-MCQ questions, use semantic similarity
    
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
      { 
        inputs: {
          source_sentence: userAnswer.trim(),
          sentences: [correctAnswer.trim()]
        },
        options: { wait_for_model: true }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    const similarity = response.data[0];
    const score = Math.max(0, Math.min(100, Math.round(similarity * 100)));
    return score;
    
  } catch (error) {
    console.error('Similarity calculation error:', {
      message: error.message,
      response: error.response?.data
    });
    return fallbackSimilarity(userAnswer, correctAnswer);
  }
};

// Fallback similarity function
const fallbackSimilarity = (answer1, answer2) => {
  try {
    const clean1 = answer1.trim().toLowerCase();
    const clean2 = answer2.trim().toLowerCase();
    
    // Exact match
    if (clean1 === clean2) return 100;
    
    // For very short answers (likely single characters/options)
    if (clean1.length <= 3 && clean2.length <= 3) {
      return clean1 === clean2 ? 100 : 0;
    }
    
    // Word overlap similarity
    const words1 = new Set(clean1.split(/\s+/));
    const words2 = new Set(clean2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    const similarity = intersection.size / union.size;
    return Math.round(similarity * 100);
    
  } catch (error) {
    console.error('Fallback similarity error:', error);
    return 0;
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