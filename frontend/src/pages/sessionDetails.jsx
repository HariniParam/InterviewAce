import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/header';
import API from '../api';
import jsPDF from 'jspdf';
import './sessionDetails.css';

const SessionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      const fetchUser = async () => {
        try {
          const res = await API.get('/profile');
          setUser(res.data);
        } catch (err) {
          navigate('/signin');
        }
      };
      fetchUser();
    }

    const fetchSession = async () => {
      try {
        setLoading(true);
        const response = await API.get(`/history/${id}`);
        setSession(response.data);
      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Failed to fetch session details');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [id, navigate]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const isCorrect = (qnaItem) => {
    const { similarityScore, questionType } = qnaItem;
    // Handle null or undefined similarityScore
    if (similarityScore == null) return false;

    // Check if question is MCQ
    if (questionType === 'MCQ') {
      return similarityScore === 100;
    }
    // For non-MCQ questions, using 75% threshold
    return similarityScore >= 75;
  };

  const handleNextQuestion = () => {
    if (session?.qna && currentQuestionIndex < session.qna.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handleDownload = () => {
    if (!session) return;

    const doc = new jsPDF();
    let yPos = 20;
    const leftMargin = 15;
    const maxWidth = 180;
    const lineHeight = 10;

    // Helper function to add text with wrapping and page break check
    const addText = (text, x, y, fontSize, style = 'normal', maxY = 270) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', style);
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line) => {
        if (y > maxY) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, x, y);
        y += lineHeight * 0.8;
      });
      return y;
    };

    // Title
    yPos = addText('Session Details', leftMargin, yPos, 16, 'bold');

    // Session Metadata
    yPos = addText('---------------', leftMargin, yPos, 12);
    const sessionDetails = [
      `Role: ${session.role || 'N/A'}`,
      `Job Type: ${session.jobType || 'N/A'}`,
      `Name: ${session.name || 'N/A'}`,
      `Date: ${formatDate(session.createdAt) || 'N/A'}`,
      `Experience: ${session.experience} ${session.experience === 1 ? 'Year' : 'Years'}`,
      `Skills: ${session.skills || 'N/A'}`,
      `Mode: ${session.mode || 'N/A'}`,
      `Duration: ${formatDuration(session.duration || 0)}`,
      `Total Questions: ${session.qna?.length || 0}`,
    ];
    sessionDetails.forEach((detail) => {
      yPos = addText(detail, leftMargin, yPos, 12);
    });

    // QnA Section
    yPos = addText('\nQnA Details', leftMargin, yPos, 16, 'bold');
    yPos = addText('---------------', leftMargin, yPos, 12);

    if (session.qna?.length) {
      session.qna.forEach((qnaItem, index) => {
        const qnaText = [
          `Question ${index + 1}`,
          `Question: ${qnaItem.question || 'N/A'}`,
          `Your Answer: ${qnaItem.answer || 'No answer provided'}`,
          `Correct Answer: ${qnaItem.correctAnswer || 'N/A'}`,
          `Similarity Score: ${qnaItem.similarityScore !== undefined ? `${qnaItem.similarityScore}%` : 'N/A'}`,
          `Status: ${isCorrect(qnaItem) ? 'Correct' : 'Incorrect'}`,
          '---------------',
        ];
        qnaText.forEach((text) => {
          yPos = addText(text, leftMargin, yPos, 12);
        });
      });
    } else {
      yPos = addText('No questions found for this session.', leftMargin, yPos, 12);
    }

    // Save PDF
    const fileName = `Session_${session.role || 'Unknown'}_${formatDate(session.createdAt).replace(/, /g, '_')}.pdf`;
    doc.save(fileName);
  };

  if (loading) {
    return (
      <div className="session-details-page">
        <Header user={user} />
        <div className="session-details-content">
          <div className="loading-spinner">Loading session details...</div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="session-details-page">
        <Header user={user} />
        <div className="session-details-content">
          <div className="error-message">{error || 'Session not found'}</div>
          <button className="back-btn" onClick={() => navigate('/history')}>
            Back to History
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = session.qna?.[currentQuestionIndex];
  const totalQuestions = session.qna?.length || 0;

  return (
    <div className="session-details-page">
      <Header user={user} />

      <div className="fixed-header">
        <div className="session-header">
          <h1>{session.role} - {session.jobType}</h1>
          <div className="session-meta">
            <div className="meta-item">
              <span className="label">Date:</span>
              <span className="value">{formatDate(session.createdAt)}</span>
            </div>
            <div className="meta-item">
              <span className="label">Experience:</span>
              <span className="value">{session.experience} {session.experience === 1 ? 'Year' : 'Years'}</span>
            </div>
            <div className="meta-item">
              <span className="label">Mode:</span>
              <span className="value">{session.mode}</span>
            </div>
            <div className="meta-item">
              <span className="label">Duration:</span>
              <span className="value">{formatDuration(session.duration || 0)}</span>
            </div>
            <div className="meta-item">
              <span className="label">Questions:</span>
              <span className="value">{totalQuestions}</span>
            </div>
          </div>
           <button className="back-button" onClick={() => navigate('/history')}>
              Back to History
            </button>
            <button className="download-btn" onClick={handleDownload}>
              Download PDF
            </button>
        </div>

        {totalQuestions > 0 && (
          <>
            <div className="question-nav">
              <h2>Question {currentQuestionIndex + 1} of {totalQuestions}</h2>
              <div className="question-indicators">
                {session.qna.map((qnaItem, index) => (
                  <button
                    key={index}
                    className={`question-dot ${index === currentQuestionIndex ? 'active' : ''} ${
                      isCorrect(qnaItem) ? 'correct' : 'incorrect'
                    }`}
                    onClick={() => goToQuestion(index)}
                    title={`Question ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="pagination-controls">
              <button 
                className="pagination-btn" 
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
              >
                ← Previous
              </button>
              <span className="pagination-info">
                {currentQuestionIndex + 1} / {totalQuestions}
              </span>
              <button 
                className="pagination-btn" 
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === totalQuestions - 1}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>

      <div className="scrollable-content">
        {totalQuestions > 0 ? (
          currentQuestion && (
            <div className="qna-layout">
              <div className="question-section">
                <div className="section-header">
                  <h3>Question</h3>
                </div>
                <div className="question-content">
                  <p>{currentQuestion.question}</p>
                </div>
              </div>

              <div className="answers-section">
                <div className="section-header">
                  <h3>Answers</h3>
                  <p className="similarity-score">
                    Similarity Score: {currentQuestion.similarityScore !== undefined
                      ? `${currentQuestion.similarityScore}%`
                      : 'N/A'}
                  </p>
                  <span className={`status ${isCorrect(currentQuestion) ? 'correct' : 'incorrect'}`}>
                    {isCorrect(currentQuestion) ? 'Correct' : 'Incorrect'}
                  </span>
                </div>

                <div className="answers-content">
                  <div className="answer-item">
                    <span className="answer-label">Your Answer:</span>
                    <div className="answer-value">
                      <p>{currentQuestion.answer || 'No answer provided'}</p>
                    </div>
                  </div>

                  <div className="answer-item">
                    <span className="answer-label">Correct Answer:</span>
                    <div className="answer-value">
                      <p>{currentQuestion.correctAnswer}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="no-qna">
            <p>No questions found for this session.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionDetails;
