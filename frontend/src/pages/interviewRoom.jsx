import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import './interviewRoom.css';
import botImg from '../assets/interviewer.png';

const InterviewRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const previewVideoRef = useRef(null);
  const liveVideoRef = useRef(null);
  const recognitionRef = useRef(null);
  const lastSpokenIndexRef = useRef(-1);

  const [isStarted, setIsStarted] = useState(false);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
  const [questionsReady, setQuestionsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [intervalId, setIntervalId] = useState(null);
  const [stream, setStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const chunksRef = useRef([]);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const [interview, setInterview] = useState(null);
  const [questionsWithAnswers, setQuestionsWithAnswers] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [qna, setQna] = useState([]);
  const [answer, setAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [targetFollowUps, setTargetFollowUps] = useState(2);
  
  // to track if question has been spoken
  const [questionSpoken, setQuestionSpoken] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isQuestionPending, setIsQuestionPending] = useState(false); // New state
  const questions = questionsWithAnswers.map(item => item.question);

  // Initialize webcam
  useEffect(() => {
    const getWebcam = async () => {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(userStream);
        if (previewVideoRef.current) previewVideoRef.current.srcObject = userStream;
      } catch (err) {
        setMessage('Unable to access webcam or microphone');
        setMessageType('error');
      }
    };
    getWebcam();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    };
  }, []);

  // Initialize speech recognition for one-to-one mode
  useEffect(() => {
    if (interview?.mode === 'One-to-One' && isStarted && questionsReady) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setMessage('Speech recognition not supported in this browser');
        setMessageType('error');
        return;
      }
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setAnswer(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setMessage('Speech recognition error: ' + event.error);
        setMessageType('error');
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isStarted, questionsReady, interview]);

  useEffect(() => {
    if (isStarted && liveVideoRef.current && stream) {
      liveVideoRef.current.srcObject = stream;
    }
  }, [isStarted, stream]);

  useEffect(() => {
    if (questionsReady && !intervalId) {
      const startTime = Date.now();
      const timer = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      setIntervalId(timer);
    }
  }, [questionsReady]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Fetch interview details
  useEffect(() => {
    const fetchInterviewDetails = async () => {
      try {
        const response = await API.get(`/interview/${id}`);
        setInterview(response.data);
      } catch (err) {
        console.error(err);
        setMessage('Failed to fetch interview details');
        setMessageType('error');
      }
    };

    fetchInterviewDetails();
  }, [id]);

  useEffect(() => {
    setAnswer(qna[currentQIndex]?.answer || '');
  }, [currentQIndex, qna]);

  useEffect(() => {
    if (
      interview?.mode === 'One-to-One' &&
      questionsReady &&
      questions.length > 0 &&
      currentQIndex < questions.length &&
      !questionSpoken &&
      !isSpeaking &&
      !isQuestionPending &&
      lastSpokenIndexRef.current !== currentQIndex
    ) {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      }

      speechSynthesis.cancel();

      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(questions[currentQIndex]);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setQuestionSpoken(true);
        lastSpokenIndexRef.current = currentQIndex;
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        setQuestionSpoken(true);
        lastSpokenIndexRef.current = currentQIndex;
      };

      speechSynthesis.speak(utterance);
    }
  }, [questions, currentQIndex, questionsReady, interview, questionSpoken, isSpeaking, isQuestionPending]);

  const generateInterviewQuestions = async () => {
    if (!interview) return;

    setIsQuestionsLoading(true);
    try {
      const response = await API.post(`/interview/${id}/questions`, {
        jobRole: interview.role,
        experience: interview.experience,
        jobType: interview.jobType,
        mode: interview.mode,
        skills: interview.skills,
        resume: interview.resume,
        isProfileBased: interview.isProfileBased
      });
      
      const newQuestionsWithAnswers = response.data.questionsWithAnswers;
      setQuestionsWithAnswers(newQuestionsWithAnswers);
      const initialQna = newQuestionsWithAnswers.map(item => ({
        question: item.question,
        answer: '',
        correctAnswer: item.correctAnswer || ''
      }));
      setQna(initialQna);
      setQuestionsReady(true);
      setMessage('Questions loaded successfully!');
      setMessageType('success');
      setTargetFollowUps(Math.random() < 0.5 ? 2 : 3);
    } catch (error) {
      setMessage('Failed to generate questions');
      setMessageType('error');
      setQuestionsReady(false);
    } finally {
      setIsQuestionsLoading(false);
    }
  };

  const generateFollowUpQuestion = async (previousQuestion, previousAnswer) => {
    setIsQuestionsLoading(true);
    setIsQuestionPending(true);

    try {
      const response = await API.post(`/interview/${id}/questions`, {
        jobRole: interview.role,
        experience: interview.experience,
        jobType: interview.jobType,
        mode: interview.mode,
        skills: interview.skills,
        resume: interview.resume,
        isProfileBased: interview.isProfileBased,
        previousQuestion,
        previousAnswer,
      });
      
      const newQuestionWithAnswer = response.data.questionsWithAnswers[0];
      
      setQuestionsWithAnswers(prev => [
        ...prev.slice(0, currentQIndex + 1),
        newQuestionWithAnswer,
        ...prev.slice(currentQIndex + 1)
      ]);
      
      setQna(prev => [
        ...prev.slice(0, currentQIndex + 1),
        { question: newQuestionWithAnswer.question, answer: '', correctAnswer: newQuestionWithAnswer.correctAnswer || '' },
        ...prev.slice(currentQIndex + 1)
      ]);
      
      setCurrentQIndex(currentQIndex + 1);
      setAnswer('');
      setQuestionSpoken(false);
      setFollowUpCount(followUpCount + 1);
      setMessage('Follow-up question generated!');
      setMessageType('success');
      
    } catch (error) {
      setMessage('Failed to generate follow-up question');
      setMessageType('error');
    } finally {
      setIsQuestionsLoading(false);
      setIsQuestionPending(false); 
    }
  };

  // Start session
  const handleStart = () => {
    if (!stream) {
      setMessage('No media stream available to record');
      setMessageType('error');
      return;
    }

    generateInterviewQuestions();
    chunksRef.current = [];
    const options = { mimeType: 'video/webm; codecs=vp8,opus' };
    const recorder = new MediaRecorder(stream, options);

    recorder.ondataavailable = event => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.start(1000);
    setMediaRecorder(recorder);
    setIsStarted(true);
  };

  // End session
  const handleEnd = async () => {
    speechSynthesis.cancel();
    
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    setMessage('Processing video...');
    setMessageType('success');

    mediaRecorder.onstop = async () => {
      try {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `interview_${id}_${Date.now()}.webm`, { type: 'video/webm' });
        const formData = new FormData();
        formData.append('file', file);
        const uploadResponse = await API.post('/interview/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const videoUrl = uploadResponse.data.url;

        await API.post(`/interview/${id}/session`, {
          qna,
          duration,
          videoUrl
        });

        setMessage('Interview session saved');
        setMessageType('success');
        setTimeout(() => navigate('/dashboard'), 1500);
      } catch (err) {
        console.error(err);
        setMessage('Failed to save session');
        setMessageType('error');
      }
    };
  };

  // Handle back navigation
  const handleBack = () => {
    speechSynthesis.cancel();
    
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      setStream(null);
      if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
      if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    navigate('/dashboard');
  };

  // Handle next question
  const handleNextQuestion = async () => {
    if (interview?.mode === 'One-to-One') {
      if (answer.trim() === '') {
        setMessage('Please provide an answer before proceeding.');
        setMessageType('error');
        return;
      }

      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
      speechSynthesis.cancel();

      const newQna = [...qna];
      newQna[currentQIndex] = { 
        question: questions[currentQIndex], 
        answer,
        correctAnswer: questionsWithAnswers[currentQIndex]?.correctAnswer || ''
      };
      setQna(newQna);

      setAnswer('');

      if (currentQIndex === 0 || (currentQIndex > 0 && followUpCount < targetFollowUps)) {
        if (!isSpeaking && !isQuestionPending) {
          await generateFollowUpQuestion(questions[currentQIndex], answer);
        } else {
          setMessage('Please wait for the question to finish speaking or loading.');
          setMessageType('error');
        }
        return;
      }

      setQuestionSpoken(false);
      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex(currentQIndex + 1);
        setAnswer(newQna[currentQIndex + 1]?.answer || '');
      } else {
        setCurrentQIndex(questions.length);
        setAnswer('');
      }
    } else if (interview?.mode === 'Written') {
      if (answer.trim() === '') {
        setMessage('Please enter an answer before proceeding.');
        setMessageType('error');
        return;
      }

      const newQna = [...qna];
      newQna[currentQIndex] = { 
        question: questions[currentQIndex], 
        answer,
        correctAnswer: questionsWithAnswers[currentQIndex]?.correctAnswer || ''
      };
      setQna(newQna);

      if (currentQIndex === questions.length - 1) {
        setCurrentQIndex(questions.length);
        setAnswer('');
      } else {
        setCurrentQIndex(currentQIndex + 1);
        setAnswer(newQna[currentQIndex + 1]?.answer || '');
      }
    }
  };

  const handlePrevQuestion = () => {
    if (interview?.mode === 'Written' && currentQIndex > 0) {
      const newQna = [...qna];
      newQna[currentQIndex] = { 
        question: questions[currentQIndex], 
        answer,
        correctAnswer: questionsWithAnswers[currentQIndex]?.correctAnswer || ''
      };
      setQna(newQna);

      const prevIndex = currentQIndex - 1;
      setCurrentQIndex(prevIndex);
      const prevAnswer = newQna[prevIndex]?.answer || '';
      setAnswer(prevAnswer);
      console.log('Prev: Loaded answer:', prevAnswer, 'for question index:', prevIndex);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current || !questionSpoken) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setAnswer('');
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setMessage('Error starting speech recognition');
        setMessageType('error');
      }
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const LoaderComponent = () => (
    <div className="loader-container">
      <div className="loader-spinner"></div>
      <p className="loader-text">Generating interview questions...</p>
      <p className="loader-subtext">Please wait while we prepare your personalized questions</p>
    </div>
  );

  return (
    <div className="session-container">
      {message && (
        <div className={`message-box ${messageType}`}>
          <span>{message}</span>
          <button className="close-btn" onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      )}

      {!isStarted ? (
        <div className="preview-box">
          <h1 className="ready-heading">🎤 Ready to Attend Your Interview?</h1>
          <p className="ready-subtext">
            Mode: <strong>{interview?.mode}</strong> |
            Make sure you're in a quiet place and your camera is positioned well.
          </p>
          <video ref={previewVideoRef} autoPlay muted className="video-preview" />
          <div className="btn-group">
            <button onClick={handleStart} className="start-btn">Start Interview</button>
            <button onClick={handleBack} className="back-btn">Back</button>
          </div>
        </div>
      ) : (
        <div className={`live-session ${interview?.mode === 'Written' ? 'written-mode' : 'one-to-one-mode'}`}>
          <div className="left-container">
            <div className="bot-section">
              <img src={botImg} alt="AI Bot" className="bot-image" />
              <h3>🤖 AI Interviewer</h3>
              {questionsReady ? (
                <p className="timer">Duration: {formatDuration(duration)}</p>
              ) : (
                <p className="timer">Preparing...</p>
              )}
            </div>

            {isQuestionsLoading && <LoaderComponent />}

            {questionsReady && questions.length > 0 && currentQIndex < questions.length && (
              <div className="question-section">
                <div className="question-header">
                  <span className="question-counter">
                    Question {currentQIndex + 1}
                  </span>
                  {interview?.mode === 'One-to-One' && isSpeaking && (
                    <span className="speaking-indicator">🗣️ Speaking...</span>
                  )}
                </div>
                <div className="question-content">
                  <p className="question-text">{questions[currentQIndex]}</p>
                </div>

                {interview?.mode === 'Written' && (
                  <div className="question-navigation">
                    <button
                      className="nav-btn prev-btn"
                      onClick={handlePrevQuestion}
                      disabled={currentQIndex === 0}
                    >
                      Previous
                    </button>
                    <button
                      className="nav-btn next-btn"
                      onClick={handleNextQuestion}
                    >
                      {currentQIndex === questions.length - 1 ? 'Finish' : 'Next'}
                    </button>
                  </div>
                )}

                {interview?.mode === 'One-to-One' && (
                  <div className="question-navigation">
                    <button
                      className={`nav-btn ${isListening ? 'listening' : ''}`}
                      onClick={toggleListening}
                      disabled={isQuestionsLoading || !questionSpoken || isSpeaking}
                      aria-label={isListening ? 'Stop Speaking' : 'Speak Answer'}
                    >
                      {isListening ? '🛑 Stop Speaking' : '🎤 Speak Answer'}
                    </button>
                    <button
                      className="nav-btn next-btn"
                      onClick={handleNextQuestion}
                      disabled={isQuestionsLoading || isSpeaking}
                      aria-label="Next Question"
                    >
                      Next Question
                    </button>
                  </div>
                )}
              </div>
            )}

            {questionsReady && questions.length > 0 && currentQIndex >= questions.length && (
              <div className="completion-section">
                <p className="completion-text">🎉 All questions completed!</p>
                <p>You can now end the interview.</p>
              </div>
            )}
          </div>

          <div className="right-container">
            <div className="video-container">
              <video ref={liveVideoRef} autoPlay muted className="video-feed" />
            </div>

            {questionsReady && interview?.mode === 'Written' && questions.length > 0 && currentQIndex < questions.length && (
              <div className="answer-section">
                <label className="answer-label" htmlFor="answer-input">Your Answer:</label>
                <textarea
                  id="answer-input"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="answer-textarea"
                  rows={6}
                  aria-label="Answer input"
                />
              </div>
            )}

            {questionsReady && interview?.mode === 'One-to-One' && (
              <div className="instructions-section">
                <p className="instruction-text">
                  📹 {isSpeaking 
                    ? 'Please wait while the AI asks the question...' 
                    : questionSpoken 
                      ? 'Click "Speak Answer" to start recording your response, then "Next Question" to proceed.'
                      : 'Listening for the question...'
                  }
                </p>
              </div>
            )}

            <div className="controls-section">
              <button
                onClick={handleEnd}
                className="end-btn"
                disabled={isQuestionsLoading}
                aria-label="End Interview"
              >
                End Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewRoom;