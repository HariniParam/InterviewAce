import React, { useState } from 'react';
import './createInterview.css';

const CreateInterview = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    role: '',
    experience: '',
    jobType: 'Full Time',
    mode: 'Written',
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await onCreate(formData);
      setLoading(false);
      setFormData({ role: '', experience: '', jobType: 'Full Time', mode: 'Written' });
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Create Interview</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="role">Job Role</label>
            <input
              type="text"
              id="role"
              name="role"
              placeholder="Job Role"
              value={formData.role}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="experience">Experience (in years)</label>
            <input
              type="number"
              id="experience"
              name="experience"
              placeholder="Experience (in years)"
              value={formData.experience}
              onChange={handleInputChange}
              required
              min="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="jobType">Job Type</label>
            <select
              id="jobType"
              name="jobType"
              value={formData.jobType}
              onChange={handleInputChange}
            >
              <option value="Full Time">Full Time</option>
              <option value="Intern">Intern</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="mode">Mode</label>
            <select
              id="mode"
              name="mode"
              value={formData.mode}
              onChange={handleInputChange}
            >
              <option value="Written">Written</option>
              <option value="One-to-One">One-to-One</option>
            </select>
          </div>

          {errorMsg && <div className="error-msg">{errorMsg}</div>}

          <div className="button-container">
            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateInterview;