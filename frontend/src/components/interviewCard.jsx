import './interviewCard.css';
import { useNavigate } from 'react-router-dom';
import API from '../api';

const InterviewCard = ({ interview, onDelete }) => {
  const navigate = useNavigate();

  const handleDeleteInterview = async (id) => {
    try {
      await API.delete(`/interview/${id}`);
      onDelete();
    } catch (err) {
      alert('Failed to delete interview');
    }
  };

  const handleAttendInterview = (id) => {
    navigate(`/interview/${id}`);
  };

  return (
    <div className="card" key={interview._id}>
      <h4>{interview.role}</h4>
      <div className="card-details">
        <span><strong>Experience:</strong> {interview.experience} yrs</span>
        <span><strong>Type:</strong> {interview.jobType}</span>
        <span><strong>Mode:</strong> {interview.mode}</span>
        <span><strong>Created:</strong> {new Date(interview.createdAt).toLocaleDateString()}</span>
      </div>
      <div className="button-container">
        <button className="attend" onClick={() => handleAttendInterview(interview._id)}>
          Attend
        </button>
        <button className="delete" onClick={() => handleDeleteInterview(interview._id)}>
          Delete
        </button>
      </div>
    </div>
  );
};

export default InterviewCard;