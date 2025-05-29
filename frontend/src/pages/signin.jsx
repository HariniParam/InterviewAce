import { useState } from 'react';
import API from '../api';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../components/authLayout';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Signin = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/auth/signin', form);
      localStorage.setItem('token', res.data.token);
      setMessageType('success');
      setMessage('Signin successful! Redirecting...');
      // to check whether profile is updated before working with the app
      const profile = await API.get('/profile');
      setTimeout(() => navigate(profile.data.profileCompleted ? '/dashboard' : '/profile', 
        {state: { profileUpdate: !profile.data.profileCompleted }})
      , 1500);
    } catch (err) {
      setMessageType('error');
      setMessage(err.response?.data?.message || 'Signin failed');
    }
  };

  return (
    <AuthLayout title="Login">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <div className="password-container">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required/>
          <span className="toggle-icon" onClick={togglePasswordVisibility}>
            {showPassword ? <FaEye size={18} /> : <FaEyeSlash size={18} />}
          </span>
        </div>
        <button type="submit">Login</button>
        <p style={{ textAlign: 'center' }}>
          Don’t have an account? <Link to="/signup">Sign up</Link>
        </p>
        {message && (
          <div className={`message ${messageType === 'success' ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </form>
    </AuthLayout>
  );
};

export default Signin;
