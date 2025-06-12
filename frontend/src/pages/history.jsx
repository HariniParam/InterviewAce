import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/header';
import API from '../api';
import './history.css';

const History = () => {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    experience: '',
    mode: '',
    dateRange: '',
  });
  const BASE_URL = 'http://localhost:5000';
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }

    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
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

    fetchSessions();
  }, [navigate]);

  useEffect(() => {
    const filtered = sessions.filter(session => {
      const matchesSearch = 
        session.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.jobType.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesExperience = filters.experience 
        ? session.experience.toString() === filters.experience 
        : true;

      const matchesMode = filters.mode 
        ? session.mode === filters.mode 
        : true;

      const matchesDate = filters.dateRange
        ? (() => {
            const sessionDate = new Date(session.createdAt);
            const now = new Date();
            switch(filters.dateRange) {
              case 'week':
                return sessionDate >= new Date(now.setDate(now.getDate() - 7));
              case 'month':
                return sessionDate >= new Date(now.setMonth(now.getMonth() - 1));
              case 'year':
                return sessionDate >= new Date(now.setFullYear(now.getFullYear() - 1));
              default:
                return true;
            }
          })()
        : true;

      return matchesSearch && matchesExperience && matchesMode && matchesDate;
    });

    setFilteredSessions(filtered);
  }, [sessions, searchQuery, filters]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await API.get('/history');
      setSessions(response.data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to fetch interview sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    setSessionToDelete(sessionId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;

    try {
      setIsDeleting(true);
      await API.delete(`/history/${sessionToDelete}`);
      setSessions(prevSessions => prevSessions.filter(session => session._id !== sessionToDelete));
      setShowDeleteModal(false);
      setSessionToDelete(null);
    } catch (err) {
      console.error('Error deleting session:', err);
      setError('Failed to delete session');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSessionToDelete(null);
  };

  const handleViewSession = (sessionId) => {
    navigate(`/history/${sessionId}`);
  };

  const handleViewAnalysis = (sessionId) => {
    navigate(`/history/${sessionId}/analysis`);
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      experience: '',
      mode: '',
      dateRange: ''
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <div className="history-page">
        <Header user={user} />
        <div className="history-content">
          <div className="loading-spinner">Loading sessions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <Header user={user} />
      <div className="history-content">
        <div className="header-filter-container">
          <div className="history-header">
            <h1>Interview History</h1>
            <p>Review your past interview sessions and performance</p>
          </div>
          <div className="search-filter-container">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search by role or job type..."
                value={searchQuery}
                onChange={handleSearch}
                className="search-input"
              />
            </div>
            <div className="filters">
              <select
                name="experience"
                value={filters.experience}
                onChange={handleFilterChange}
                className="filter-select"
              >
                <option value="">All Experience Levels</option>
                <option value="0">0 Years</option>
                <option value="1">1 Year</option>
                <option value="2">2 Years</option>
                <option value="3">3+ Years</option>
              </select>
              <select
                name="mode"
                value={filters.mode}
                onChange={handleFilterChange}
                className="filter-select"
              >
                <option value="">All Modes</option>
                <option value="One-to-One">One-to-One</option>
                <option value="Written">Written</option>
              </select>
              <select
                name="dateRange"
                value={filters.dateRange}
                onChange={handleFilterChange}
                className="filter-select"
              >
                <option value="">All Time</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
              </select>
              <button
                className="clear-filters-btn"
                onClick={clearFilters}
                disabled={!searchQuery && !filters.experience && !filters.mode && !filters.dateRange}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {filteredSessions.length === 0 ? (
          <div className="no-sessions">
            <h3>No Interview Sessions Found</h3>
            <p>You haven't completed any interviews yet or no sessions match your filters. Start your first interview from the dashboard!</p>
            <button 
              className="start-interview-btn"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="sessions-grid">
            {filteredSessions.map((session) => (
              <div key={session._id} className="session-card">
                <div className="session-header">
                  <div className="session-role">
                    <h3>{session.role}</h3>
                    <span className="job-type">{session.jobType}</span>
                    <span className={`profile-badge ${session.isProfileBased ? 'profile-based' : 'custom'}`}>
                      {session.isProfileBased ? 'Profile-Based' : 'Custom'}
                    </span>
                  </div>
                  <div className="session-date">
                    {formatDate(session.createdAt)}
                  </div>
                </div>

                <div className="session-details">
                  <div className="detail-item">
                    <span className="label">Experience Level:</span>
                    <span className="value">{session.experience} {session.experience === 1 ? 'Year' : 'Years'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Interview Mode:</span>
                    <span className="value">{session.mode}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Duration:</span>
                    <span className="value">{formatDuration(session.duration || 0)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Questions:</span>
                    <span className="value">{session.qna?.length || 0} questions</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Skills:</span>
                    <span className="value skills-value">
                      {session.skills?.length > 0 ? session.skills.join(', ') : 'None'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Resume:</span>
                    <span className="value">
                      {session.resume ? (
                        <a
                          href={`${BASE_URL}${session.resume}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="resume-link"
                          download={session.resume.split('/').pop()}
                        >
                          Download Resume
                        </a>
                      ) : (
                        'None'
                      )}
                    </span>
                  </div>
                </div>

                <div className="session-actions">
                  <button 
                    className="view-btn"
                    onClick={() => handleViewSession(session._id)}
                  >
                    View Answers
                  </button>
                  <button 
                    className="view-btn"
                    onClick={() => handleViewAnalysis(session._id)}
                  >
                    View Analysis
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteSession(session._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this interview session?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="cancel-btn" 
                onClick={cancelDelete}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-btn" 
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;