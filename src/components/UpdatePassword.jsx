import { useState } from 'react';
import config from '../config';
import './styles/updatePassword.css';

const UpdatePassword = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.currentPassword.trim()) {
      setError('Current password is required');
      return false;
    }
    if (!formData.newPassword.trim()) {
      setError('New password is required');
      return false;
    }
    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_URL}users/updatePassword`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          newPasswordConfirm: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password updated successfully!');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          if (onClose) onClose();
        }, 1500);
      } else {
        setError(data.message || 'Failed to update password');
      }
    } catch (err) {
      console.error('Error updating password:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div className="update-password-container" onClick={handleOverlayClick}>
      <div className="update-password-modal">
        <button className="update-password-close-btn" onClick={handleClose}>
          <i className="fas fa-times"></i>
        </button>

        <div className="update-password-header">
          <h2>Update Password</h2>
          <p>Enter your current password and choose a new one</p>
        </div>

        {error && (
          <div className="update-password-error-message">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        {success && (
          <div className="update-password-success-message">
            <i className="fas fa-check-circle"></i>
            {success}
          </div>
        )}

        <form className="update-password-form" onSubmit={handleSubmit}>
          <fieldset className="update-password-fieldset">
            <label htmlFor="currentPassword">Current Password</label>
            <div className="update-password-input-group">
              <i className="fas fa-lock"></i>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                placeholder="Enter your current password"
                required
              />
            </div>
          </fieldset>

          <fieldset className="update-password-fieldset">
            <label htmlFor="newPassword">New Password</label>
            <div className="update-password-input-group">
              <i className="fas fa-key"></i>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Enter new password (min 6 characters)"
                required
                minLength={6}
              />
            </div>
          </fieldset>

          <fieldset className="update-password-fieldset">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className="update-password-input-group">
              <i className="fas fa-check-circle"></i>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your new password"
                required
              />
            </div>
          </fieldset>

          <div className="update-password-requirements">
            <h4>Password Requirements:</h4>
            <ul>
              <li className={formData.newPassword.length >= 6 ? 'valid' : 'invalid'}>
                <i className={`fas fa-${formData.newPassword.length >= 6 ? 'check' : 'times'}`}></i>
                At least 6 characters long
              </li>
              <li
                className={
                  formData.newPassword !== formData.currentPassword && formData.newPassword
                    ? 'valid'
                    : 'invalid'
                }
              >
                <i
                  className={`fas fa-${formData.newPassword !== formData.currentPassword && formData.newPassword ? 'check' : 'times'}`}
                ></i>
                Different from current password
              </li>
              <li
                className={
                  formData.newPassword === formData.confirmPassword && formData.newPassword
                    ? 'valid'
                    : 'invalid'
                }
              >
                <i
                  className={`fas fa-${formData.newPassword === formData.confirmPassword && formData.newPassword ? 'check' : 'times'}`}
                ></i>
                Passwords match
              </li>
            </ul>
          </div>

          <div className="update-password-form-actions">
            <button type="button" className="update-password-cancel-btn" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="update-password-update-btn" disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Updating...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdatePassword;
