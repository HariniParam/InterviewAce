import { useState, useEffect } from 'react';
import './createInterview.css';

const CreateInterview = ({ onClose, onCreate, isProfileBased, userProfile }) => {
  const initialFormData = isProfileBased
    ? {
        role: userProfile?.careerGoals,
        experience: userProfile?.experience || 0,
        jobType: 'Full Time',
        mode: 'One-to-One',
        skills: userProfile?.skills || [],
        resume: userProfile?.resume || ''
      }
    : {
        role: '',
        experience: '',
        jobType: 'Full Time',
        mode: 'Written'
      };

  const [formData, setFormData] = useState(initialFormData);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isProfileBased && !userProfile) {
      setErrorMsg('Profile data is missing. Please complete your profile.');
    }
  }, [isProfileBased, userProfile]);

  const handleChange = (e) => {
    setErrorMsg('');
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    if (isProfileBased && !userProfile) {
      setErrorMsg('Cannot create profile-based interview without profile data.');
      setLoading(false);
      return;
    }
    const result = await onCreate(formData);
    if (result.success) {
      setLoading(false);
    } else {
      setErrorMsg(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>{isProfileBased ? 'Start Profile-Based Interview' : 'Create New Interview'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="role">Job Role</label>
            <input
              type="text"
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={isProfileBased}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="experience">Experience (Years)</label>
            <input
              type="number"
              id="experience"
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              disabled={isProfileBased}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="jobType">Job Type</label>
            <select
              id="jobType"
              name="jobType"
              value={formData.jobType}
              onChange={handleChange}
              required
            >
              <option value="Full Time">Full Time</option>
              <option value="Intern">Intern</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="mode">Interview Mode</label>
            <select
              id="mode"
              name="mode"
              value={formData.mode}
              onChange={handleChange}
              disabled={isProfileBased}
              required
            >
              <option value="Written">Written</option>
              <option value="One-to-One">One-to-One</option>
            </select>
          </div>
          {isProfileBased && (
            <>
              <div className="form-group">
                <label htmlFor="skills">Skills (comma-separated)</label>
                <input
                  type="text"
                  id="skills"
                  value={formData.skills.join(', ')}
                  disabled
                />
              </div>
              <div className="form-group">
                <label htmlFor="resume">Resume URL</label>
                <input
                  type="text"
                  id="resume"
                  name="resume"
                  value={formData.resume}
                  disabled
                />
              </div>
            </>
          )}
          {errorMsg && <div className="error-msg">{errorMsg}</div>}
          <div className="button-container">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" disabled={loading}>{loading ? 'Creating...' : (isProfileBased ? 'Create and Start' : 'Create and Save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateInterview;