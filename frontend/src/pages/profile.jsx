import React, { useState, useEffect } from 'react';
import API from '../api';
import { useNavigate, useLocation } from 'react-router-dom';
import './profile.css';
import Header from '../components/header';
import { FaTimes } from 'react-icons/fa';
import skillsData from '../data/skills.json';

const Profile = () => {
  const [form, setForm] = useState({
    name: '',
    skills: [],
    experience: '',
    careerGoals: '',
  });
  const [resume, setResume] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [resumeName, setResumeName] = useState('');
  const [profileImageName, setProfileImageName] = useState('');
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState(null);
  const [showPopup, setShowPopup] = useState(true);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const profileUpdate = !user?.profileCompleted || location.state?.profileUpdate || false;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get('/profile');
        const user = res.data;
        setUser(user);
        setForm({
          name: user.name || '',
          skills: user.skills || [],
          experience: user.experience || '',
          careerGoals: user.careerGoals || '',
        });
        setResumeName(user.resume ? user.resume.split('/').pop().split('-').pop() : '');
        setProfileImageName(user.profileImage ? user.profileImage.split('/').pop().split('-').pop() : '');
      } catch (error) {
        console.error('Failed to fetch profile', error);
        setMessage({ type: 'error', text: 'Failed to load profile data.' });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'skills') {
      const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
      setForm({ ...form, skills: selectedOptions });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    setResume(file);
    setResumeName(file ? file.name.split('-').length > 1 ? file.name.split('-').pop() : file.name : resumeName);
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    setProfileImage(file);
    setProfileImageName(file ? file.name.split('-').length > 1 ? file.name.split('-').pop() : file.name : profileImageName);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.name.trim() ||
      form.skills.length === 0 ||
      !form.experience.trim() ||
      !form.careerGoals.trim() ||
      (!resume && !resumeName) ||
      (!profileImage && !profileImageName)
    ) {
      setMessage({ type: 'error', text: 'Please fill in all fields and upload both files.' });
      return;
    }
    const data = new FormData();
    data.append('name', form.name);
    data.append('skills', form.skills.join(','));
    data.append('experience', form.experience);
    data.append('careerGoals', form.careerGoals);
    if (resume) data.append('resume', resume);
    if (profileImage) data.append('profileImage', profileImage);

    try {
      const res = await API.post('/profile/update', data);
      const updatedUser = { ...res.data.user, profileCompleted: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setMessage({ type: 'success', text: 'Profile updated successfully! Loading...' });
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Profile update failed', error);
      setMessage({ type: 'error', text: 'Profile update failed. Please try again.' });
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-spinner">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {user && <Header user={user} />}
      <div className="profile-page">
        <h2 className="profile-heading">Complete Your Profile</h2>

        {profileUpdate && showPopup && (
          <div className="profile-popup-overlay">
            <div className="profile-popup">
              <button className="popup-close-button" onClick={handleClosePopup}>
                <FaTimes size={18} />
              </button>
              <p>Please complete your profile to proceed further.</p>
            </div>
          </div>
        )}
        {/*profile updation - success/error*/}
        {message && (
          <div className={`profile-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form-full">
          <div className="profile-form-container">
            <div className="profile-left">
              <label className="profile-label">Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your name"
                className="profile-input"
              />

              <label className="profile-label">Skills</label>
              <select
                name="skills"
                value={form.skills}
                onChange={handleChange}
                className="profile-select"
                multiple
                size="5"
              >
                {skillsData.slice(0, 50).map(skill => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
              <p className="skills-help-text">Hold Ctrl (Cmd on Mac) to select multiple skills</p>
              <div className="selected-skills">
                <strong>Selected Skills:</strong> {form.skills.length > 0 ? form.skills.join(', ') : 'None'}
              </div>

              <label className="profile-label">Years of Experience</label>
              <select
                name="experience"
                value={form.experience}
                onChange={handleChange}
                className="profile-select"
              >
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3+">3+</option>
              </select>
            </div>

            <div className="profile-right">
              <label className="profile-label">Career Goals</label>
              <textarea
                name="careerGoals"
                value={form.careerGoals}
                onChange={handleChange}
                placeholder="E.g.,full-stack developer/system designer..."
                className="profile-textarea"
                rows={1}
              />
              <label className="profile-label">Upload Profile Image</label>
              <div className="custom-file-input">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="hidden-file-input"
                  id="profileImageInput"
                />
                <div className="custom-input-display">
                  <span className="custom-button">Choose File</span>
                  <span className="file-name-display">
                    {profileImageName || 'No file uploaded'}
                  </span>
                </div>
              </div>

              <label className="profile-label">Upload Resume</label>
              <div className="custom-file-input">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleResumeChange}
                  className="hidden-file-input"
                  id="resumeInput"
                />
                <div className="custom-input-display">
                  <span className="custom-button">Choose File</span>
                  <span className="file-name-display">
                    {resumeName || 'No file uploaded'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="profile-button">Update Profile</button>
        </form>
      </div>
    </>
  );
};

export default Profile;