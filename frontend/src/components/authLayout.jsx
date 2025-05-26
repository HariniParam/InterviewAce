import './authLayout.css';
import logo from '../assets/logo.png';

const AuthLayout = ({ children, title }) => {
  return (
    <div className="auth-container">
      <div className="auth-left">
        <img src={logo} alt="Project Logo" className="project-logo" />
        <h1 className="project-title">InterviewAce</h1>
        <p className="illustration-text">Rehearse Today, Succeed Tomorrow</p>
      </div>
      <div className="auth-right">
        <div className="auth-box">
          <h2>{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
