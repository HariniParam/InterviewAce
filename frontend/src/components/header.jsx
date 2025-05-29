import { useNavigate, useLocation } from 'react-router-dom';
import defaultUser from '../assets/default-user.jpg';
import './header.css';

const Header = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/signin');
  };

  // Check if the path matches the current location
  const isActive = (path) => location.pathname === path;
  const imageUrl = user?.profileImage
  ? `http://localhost:5000${user.profileImage}`
  : defaultUser;
  // Determine if profile is completed
  const profileCompleted = user?.profileCompleted || false;

  return (
    <header className="header">
      <div className="header-left">
        <h2 className="app-name">
          InterviewAce
        </h2>
        <nav className="nav-links">
          <button
            className={isActive('/dashboard') ? 'active' : ''}
            onClick={() => navigate('/dashboard')}
            disabled={!profileCompleted}
          >
            Dashboard
          </button>
          <button
            className={isActive('/profile') ? 'active' : ''}
            onClick={() => navigate('/profile')}
          >
            Profile Update
          </button>
          <button
            className={isActive('/history') ? 'active' : ''}
            onClick={() => navigate('/history')}
            disabled={!profileCompleted}
          >
            History
          </button>
          <button
            className={isActive('/analytics') ? 'active' : ''}
            onClick={() => navigate('/analytics')}
            disabled={!profileCompleted}
          >
            Analytics
          </button>
        </nav>
      </div>
      <div className="header-right">
        <div className="user-avatar-container" data-tooltip={user?.email || 'No email available'}>
          <img
            src={imageUrl || defaultUser}
            alt="User"
            className="user-avatar"
          />
        </div>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
};

export default Header;
