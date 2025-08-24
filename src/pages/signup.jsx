import { useState, useRef } from 'react';
// import signupImage from '@/public/images/signup.jpg';
// import { useRouter } from 'next/navigation';
import Popup from './../components/Popup';
import config from '../config';
import { Link } from 'react-router-dom';
import './../pages/styles/signup.css';
export default function SignUp() {
  const API_URL = config.API_URL;
  // const router = useRouter();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    photo: 'default.jpg',
    role: 'user', // default role
  });
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState('error');

  const showErrorPopup = (message) => {
    setPopupMessage(message);
    setPopupType('error');
    setShowPopup(true);
  };

  const showSuccessPopup = (message) => {
    setPopupMessage(message);
    setPopupType('success');
    setShowPopup(true);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showErrorPopup('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showErrorPopup('Image size should be less than 5MB');
        return;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);

      // Update form data
      setFormData({
        ...formData,
        photo: file,
      });
    }
  };

  const validateForm = () => {
    if (formData.name.length < 3 || formData.name.length > 20) {
      showErrorPopup('Name must be between 3 and 20 characters');
      return false;
    }
    
    // Phone validation - Jordanian phone number format
    const phoneRegex = /^(\+962|962|0)?7[789]\d{7}$/;
    if (!phoneRegex.test(formData.phone)) {
      showErrorPopup('Please enter a valid Jordanian phone number (e.g., +962795137282 or 0795137282)');
      return false;
    }
    
    if (formData.password.length < 8) {
      showErrorPopup('Password must be at least 8 characters long');
      return false;
    }
    if (formData.password !== formData.passwordConfirm) {
      showErrorPopup('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      // Create FormData object for file upload
      const formDataToSend = new FormData();

      // Append all form fields to FormData
      Object.keys(formData).forEach((key) => {
        if (key === 'photo' && formData[key] instanceof File) {
          formDataToSend.append('photo', formData[key]);
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });
      console.log('data before sending, ', formDataToSend);

      const response = await fetch(`${API_URL}users/signup`, {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();
      console.log('Signup response:', data);

      if (response.ok) {
        // Get token from response headers
        const token =
          response.headers.get('Authorization') ||
          response.headers.get('authorization') ||
          response.headers.get('x-auth-token') ||
          response.headers.get('token');

        if (token) {
          localStorage.setItem('token', token);
          showSuccessPopup('Account created successfully!');
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        } else {
          showErrorPopup('No token received in response');
        }
      } else {
        showErrorPopup(data.message || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      showErrorPopup('An error occurred. Please try again.');
    }
  };

  return (
    <div className="signupContainer">
      <img src="./images/pitch1.jpg" alt="Signup" />
      <div className="right">
        <div className="head">
          <h1>Create an account</h1>
          <p>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <fieldset className="photo-upload">
            <label htmlFor="photo">Profile Photo</label>
            <div className="photo-preview-container">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile preview"
                  width={100}
                  height={100}
                  className="photo-preview"
                />
              ) : (
                <div className="photo-placeholder">
                  <span>No photo selected</span>
                </div>
              )}
              <input
                type="file"
                id="photo"
                name="photo"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose Photo
              </button>
            </div>
          </fieldset>

          <fieldset>
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              minLength={3}
              maxLength={20}
              placeholder="Enter your full name"
            />
          </fieldset>

          <fieldset>
            <label htmlFor="email">Email address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </fieldset>

          <fieldset>
            <label htmlFor="phone">Phone number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="Enter your phone number (e.g., +962795137282)"
              pattern="(\+962|962|0)?7[789]\d{7}"
              title="Please enter a valid Jordanian phone number"
            />
          </fieldset>

          <fieldset>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              placeholder="Enter your password"
            />
          </fieldset>

          <fieldset>
            <label htmlFor="passwordConfirm">Confirm password</label>
            <input
              type="password"
              id="passwordConfirm"
              name="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />
          </fieldset>

          <fieldset id="role">
            <label>Select Your Role</label>
            <div className="role-options">
              <label
                className={`role ${formData.role === 'user' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, role: 'user' })}
              >
                <input
                  type="radio"
                  name="role"
                  value="user"
                  checked={formData.role === 'user'}
                  onChange={handleChange}
                />
                <i className="fas fa-user fa-2x"></i>
                <p>User</p>
                <small>Book and play at playgrounds</small>
              </label>

              <label
                className={`role ${formData.role === 'owner' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, role: 'owner' })}
              >
                <input
                  type="radio"
                  name="role"
                  value="owner"
                  checked={formData.role === 'owner'}
                  onChange={handleChange}
                />
                <i className="fas fa-futbol fa-2x"></i>
                <p>Owner</p>
                <small>Own and manage playgrounds</small>
              </label>
            </div>
          </fieldset>

          <button type="submit">Register</button>
        </form>
      </div>
      {showPopup && (
        <Popup message={popupMessage} type={popupType} onClose={() => setShowPopup(false)} />
      )}
    </div>
  );
}
