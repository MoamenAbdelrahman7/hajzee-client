import { useEffect, useState, useRef } from 'react';
import { IMAGES, API_URL } from '../config';
import './styles/profile.css';
import UpdatePassword from '../components/UpdatePassword';
import Alert from '../components/Alert';

const Profile = () => {
  const IMAGES_URL = IMAGES.users;
  const fileInputRef = useRef(null);
  const [user, setUser] = useState({});
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    photo: null,
  });
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    setUser(storedUser);
    setFormData({
      name: storedUser?.name || '',
      phone: storedUser?.phone || '',
      email: storedUser?.email || '',
    });
  }, []);

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
  };

  const closeAlert = () => {
    setAlert(null);
  };

  const togglePhotoZoom = () => {
    setIsPhotoZoomed(!isPhotoZoomed);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showAlert('Please select an image file', 'warning');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showAlert('Image size should be less than 5MB', 'warning');
        return;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);

      // Update form data
      setFormData((prev) => ({
        ...prev,
        photo: file,
      }));
    }
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    
    // If canceling edit, reset form data to current user data
    if (isEditing) {
      setFormData({
        name: user?.name || '',
        phone: user?.phone || '',
        email: user?.email || '',
        photo: null,
      });
      setPhotoPreview(null);
    }
  };

  const updateInfo = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');

    try {
      // Create FormData object for file upload
      const formDataToSend = new FormData();

      // Append all form fields to FormData
      Object.keys(formData).forEach((key) => {
        if (key === 'photo' && formData[key] instanceof File) {
          formDataToSend.append('photo', formData[key]);
        } else if (formData[key] !== null && formData[key] !== '') {
          formDataToSend.append(key, formData[key]);
        }
      });

      console.log('Profile update data:', formDataToSend);

      const res = await fetch(`${API_URL}users/me`, {
        method: 'PATCH',
        headers: {
          Authorization: token,
        },
        body: formDataToSend,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showAlert('Profile updated successfully!', 'success');
      setUser(data.data.user);
      localStorage.setItem('user', JSON.stringify(data.data.user));

      // Clear photo preview to show updated photo from server
      setPhotoPreview(null);
      setFormData((prev) => ({ ...prev, photo: null }));
      setIsEditing(false); // Exit edit mode after successful update
    } catch (err) {
      console.error('Update failed:', err.message);
      showAlert('Failed to update profile. Please try again.', 'error');
    }
  };

  return (
    <section className="profile-container">
      <div className="profile-sub-container">
        <span className="profile-info">
          <span className="profile-user-photo">
            <img
              src={photoPreview || `${IMAGES_URL}${user.photo}`}
              alt="Profile photo"
              className="photo"
              onClick={togglePhotoZoom}
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="profile-change-photo-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="fas fa-pencil-alt"></i>
            </button>
          </span>
          <h2 className="profile-name">{user.name}</h2>
          {user?.role === 'owner' && (
            <span className="profile-role-badge">Owner</span>
          )}
          <p className="profile-phone">{user.phone || '+962795137282'}</p>
          <button 
            className={`profile-edit-btn ${isEditing ? 'editing' : ''}`} 
            onClick={toggleEditMode}
          >
            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
          <button className="profile-change-password-btn" onClick={() => setShowUpdatePassword(true)}>
            <i className="fas fa-key"></i>
            Change Password
          </button>
        </span>

        <form className={`profile-form ${isEditing ? 'editing' : ''}`} onSubmit={updateInfo}>
          <fieldset className="profile-fieldset">
            <label className="profile-label" htmlFor="username">Username</label>
            <span className={`profile-input-group ${isEditing ? 'editable' : ''}`}>
              <img src="./icons/user.png" alt="#" />
              <input
                type="text"
                name="name"
                id="username"
                className="profile-input"
                value={formData.name}
                onChange={handleChange}
                spellCheck="false"
                autoCorrect="false"
                disabled={!isEditing}
                readOnly={!isEditing}
              />
            </span>
          </fieldset>

          <fieldset className="profile-fieldset">
            <label className="profile-label" htmlFor="phoneNumber">Phone number</label>
            <span className={`profile-input-group ${isEditing ? 'editable' : ''}`}>
              <img src="./icons/phone.png" alt="#" />
              <input
                type="text"
                name="phone"
                id="phoneNumber"
                className="profile-input"
                value={formData.phone}
                onChange={handleChange}
                spellCheck="false"
                autoCorrect="false"
                disabled={!isEditing}
                readOnly={!isEditing}
              />
            </span>
          </fieldset>

          <fieldset className="profile-fieldset">
            <label className="profile-label" htmlFor="email">E-mail</label>
            <span className="profile-input-group">
              <img src="./icons/email.png" alt="#" />
              <input
                type="email"
                name="email"
                id="email"
                className="profile-input"
                value={formData.email}
                onChange={handleChange}
                spellCheck="false"
                autoCorrect="false"
                disabled
                readOnly
              />
            </span>
          </fieldset>

          {isEditing && (
            <button type="submit" className="profile-save-btn">Save</button>
          )}
        </form>
      </div>

      {showUpdatePassword && (
        <UpdatePassword
          onClose={() => setShowUpdatePassword(false)}
          onSuccess={() => {
            setShowUpdatePassword(false);
            showAlert('Password updated successfully!', 'success');
          }}
        />
      )}

      {alert && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={closeAlert}
        />
      )}

      {isPhotoZoomed && (
        <div className="photo-zoom-overlay" onClick={togglePhotoZoom}>
          <div className="photo-zoom-container">
            <img
              src={photoPreview || `${IMAGES_URL}${user.photo}`}
              alt="Profile photo zoomed"
              className="photo-zoomed"
            />
            <button 
              className="photo-zoom-close"
              onClick={togglePhotoZoom}
              aria-label="Close photo"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Profile;
