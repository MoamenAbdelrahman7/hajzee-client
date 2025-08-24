import './../pages/styles/login.css';
import { useState, useEffect } from 'react';
import config from '../config';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';

const Login = () => {
  const API_URL = config.API_URL;
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [alert, setAlert] = useState(null);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const showAlert = (message, type = 'error') => {
    setAlert({ message, type });
  };

  const closeAlert = () => {
    setAlert(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}users/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        // Check all possible header names for token
        const authHeader =
          response.headers.get('Authorization') ||
          response.headers.get('authorization') ||
          response.headers.get('x-auth-token') ||
          response.headers.get('token');

        if (authHeader) {
          // Get user data
          const getUser = await fetch(`${API_URL}users/me/`, {
            headers: {
              Authorization: authHeader,
            },
          });
          const userData = await getUser.json();
          
          if (userData && userData.data) {
            // Use auth context to login
            login(userData.data, authHeader);
            showAlert('Login successful!', 'success');
          } else {
            showAlert('Failed to fetch user data');
          }
        } else {
          showAlert('No token received in headers');
        }
      } else {
        showAlert(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      showAlert('An error occurred. Please try again.');
    }
  };

  return (
    <div className="loginContainer">
      <div className="form-container">
        <div className="logo">
          <i className="fas fa-user-circle fa-3x" style={{ color: 'var(--color-green)' }}></i>
        </div>
        <h1>Welcome Back!</h1>
        <p>Sign in to continue to your account</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">
              <i className="fas fa-envelope"></i> Email
            </label>
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

          <div className="input-group">
            <label htmlFor="password">
              <i className="fas fa-lock"></i> Password
            </label>
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

          <button type="submit" className="submit-btn">
            <i className="fas fa-sign-in-alt"></i> Sign In
          </button>
        </form>

        <p className="switch-form">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>

      {alert && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={closeAlert}
        />
      )}
    </div>
  );
};

export default Login;
