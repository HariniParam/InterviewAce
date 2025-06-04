import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './pages/signup';
import Signin from './pages/signin';
import Dashboard from './pages/dashboard';
import Profile from './pages/profile'
import InterviewRoom from './pages/interviewRoom';
import History from './pages/history';
import SessionDetails from './pages/sessionDetails';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/signin" replace />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/interview/:id" element={<InterviewRoom />} />
        <Route path="/history" element={<History/>} />
        <Route path="/history/:id" element={<SessionDetails/>} />
      </Routes>
    </Router>
  );
}

export default App;
