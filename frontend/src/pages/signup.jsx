import { useState } from 'react';
import API from '../api';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../components/authLayout'; 
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Signup = () => {
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
      const res = await API.post('/signup', form);
      localStorage.setItem('token', res.data.token);
      setMessageType('success');
      setMessage('Signup successful! Redirecting...');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setMessageType('error');
      setMessage(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <AuthLayout title="Signup">
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
        <button type="submit">Sign Up</button>
        <p style={{ textAlign: 'center' }}>
          Already have an account? <Link to="/signin">Sign in</Link>
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

export default Signup;
