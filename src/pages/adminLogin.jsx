import { useState, useEffect } from 'react';
import config from '../config';
import { useNavigate } from 'react-router-dom';
import './styles/adminLogin.css';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const AdminLogin = () => {
  const API_URL = config.API_URL;
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { login, isAuthenticated, hasRole } = useAuth();

  // Check if user is already logged in as admin
  useEffect(() => {
    if (isAuthenticated && hasRole('admin')) {
      navigate('/admin');
    }
  }, [isAuthenticated, hasRole, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}users/login-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const loginContentType = response.headers.get('content-type') || '';
      let data = {};
      if (loginContentType.includes('application/json')) {
        data = await response.json().catch(() => ({}));
      } else {
        const text = await response.text().catch(() => '');
        if (text) console.error('Non-JSON login response:', text.slice(0, 500));
        data = {};
      }

      if (response.ok && data.status === 'success') {
        const authHeader =
          response.headers.get('Authorization') ||
          response.headers.get('authorization') ||
          response.headers.get('x-auth-token') ||
          response.headers.get('token');

        if (authHeader) {
          const getUser = await fetch(`${API_URL}users/me/`, {
            headers: {
              authorization: authHeader,
              Accept: 'application/json',
            },
          });

          const meContentType = getUser.headers.get('content-type') || '';
          let userData = {};
          if (meContentType.includes('application/json')) {
            userData = await getUser.json().catch(() => ({}));
          } else {
            const text = await getUser.text().catch(() => '');
            if (text) console.error('Non-JSON /users/me response:', text.slice(0, 500));
            userData = {};
          }

          if (userData.data && userData.data.role === 'admin') {
            login(userData.data, authHeader);
          } else {
            setError('Access denied. Admin privileges required.');
          }
        } else {
          setError('No token received in headers');
        }
      } else {
        const fallback = `Login failed${response.status ? ` (HTTP ${response.status})` : ''}`;
        setError((data && data.message) ? String(data.message) : fallback);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-form-container">
        <div className="admin-logo">
          <h1>Admin Portal</h1>
        </div>
        <h2>Admin Login</h2>
        <p>Sign in with your admin credentials</p>

        {error && <div className="admin-error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="admin-input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="admin-input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="admin-submit-btn">
            Sign In
          </button>
        </form>

        <div className="back-to-main">
          <a href="/login" className="back-link">
            Back to Main Site
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
