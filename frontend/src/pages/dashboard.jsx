import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import './dashboard.css';
import Header from '../components/header';
import InterviewCard from '../components/interviewCard';
import CreateInterview from '../components/createInterview';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isProfileBased, setIsProfileBased] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      const fetchDashboard = async () => {
        try {
          const res = await API.get('/profile');
          setUser(res.data);
        } catch (err) {
          navigate('/signin');
        }
      };
      fetchDashboard();
    }
  }, [navigate]);

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const res = await API.get('/interview');
        setInterviews(res.data);
      } catch (err) {
        console.error('Failed to load interviews:', err);
      }
    };
    fetchInterviews();
  }, []);

  const handleStartInterview = () => {
    if (!user) {
      alert('Please complete your profile to start a profile-based interview.');
      navigate('/profile');
      return;
    }
    console.log("User details : ", user)
    setIsProfileBased(true);
    setShowModal(true);
  };

  const handleCreateInterviewClick = () => {
    setIsProfileBased(false);
    setShowModal(true);
  };

  const handleCreateInterview = async (formData) => {
    try {
      const res = await API.post('/interview',  { ...formData, isProfileBased });
      setInterviews((prev) => [...prev, res.data]);
      setShowModal(false);
      if (isProfileBased) {
        navigate(`/interview/${res.data._id}`);
        return { success: true };
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to create interview';
      return { success: false, error: msg };
    }
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 20) return 'Good Evening';
    return 'Good Night';
  };

  const filteredInterviews = interviews.filter((item) => {
    const matchesSearch = item.role.toLowerCase().includes(search.toLowerCase());
    const matchesMode = filterMode ? item.mode === filterMode : true;
    return matchesSearch && matchesMode;
  });

  return (
    <div className="dashboard-container">
      {user && <Header user={user} />}
      <div className="dashboard-content">
        {/* Left Panel */}
        <div className="left-panel">
          <div className="greeting">
            {user ? <h2>{getTimeGreeting()}, {user.name}!</h2> : null}
          </div>
          <div className="interview-box">
            {user ? <h3>Hello {user.name}, Ready for an interview?</h3> : null}
            <button onClick={handleStartInterview}>Start Interview</button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <div className="filters">
            <input
              type="text"
              placeholder="Search by role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
            >
              <option value="">All Modes</option>
              <option value="Written">Written</option>
              <option value="One-to-One">One-to-One</option>
            </select>
            <button className="create-btn" onClick={handleCreateInterviewClick}>Create New Interview</button>
          </div>

          {/* Interview Cards */}
          <div className="cards-wrapper">
            {filteredInterviews.map((interview) => (
              <InterviewCard
                key={interview._id}
                interview={interview}
                onDelete={() => {
                  setInterviews((prev) => prev.filter((i) => i._id !== interview._id));
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <CreateInterview
          onClose={() => setShowModal(false)}
          onCreate={handleCreateInterview}
          isProfileBased={isProfileBased}
          userProfile={user}
        />
      )}
    </div>
  );
};

export default Dashboard;
