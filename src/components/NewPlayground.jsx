import { useState } from 'react';
import './../components/styles/newPlayground.css';

const NewPlayground = ({ onClose, onSuccess }) => {
  const [coverPreview, setCoverPreview] = useState(null);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    size: '',
    costPerHour: '',
    openingTime: '',
    closingTime: '',
    googleMapUrl: '',
    appleMapUrl: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Cover image must be less than 5MB');
        return;
      }
      setCoverPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Check file sizes
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError('All images must be less than 5MB each');
      return;
    }

    // Limit to 5 images
    if (files.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
    setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Playground name is required');
      return false;
    }
    if (!formData.location.trim()) {
      setError('Location is required');
      return false;
    }
    if (!formData.size || formData.size < 3) {
      setError('Size must be at least 3');
      return false;
    }
    if (!formData.costPerHour || formData.costPerHour < 0) {
      setError('Cost must be a positive number');
      return false;
    }
    if (!formData.openingTime.trim()) {
      setError('Opening time is required');
      return false;
    }
    if (!formData.closingTime.trim()) {
      setError('Closing time is required');
      return false;
    }
    if (!coverPreview) {
      setError('Cover image is required');
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
      const form = e.target;
      const formDataToSend = new FormData();

      // Text / number fields
      formDataToSend.append('name', formData.name);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('size', formData.size);
      formDataToSend.append('costPerHour', formData.costPerHour);
      formDataToSend.append('openingTime', formData.openingTime);
      formDataToSend.append('closingTime', formData.closingTime);
      formDataToSend.append('googleMapUrl', formData.googleMapUrl);
      formDataToSend.append('appleMapUrl', formData.appleMapUrl);

      // Single image file (robust access by id or name)
      const coverInput = form.elements?.namedItem('pgImageCover') || form.elements?.namedItem('imageCover') || document.getElementById('pgImageCover');
      const coverFile = coverInput?.files?.[0];
      if (coverFile) {
        formDataToSend.append('imageCover', coverFile);
      }

      // Multiple image files (robust access by id or name)
      const imagesInput = form.elements?.namedItem('pgImages') || form.elements?.namedItem('images') || document.getElementById('pgImages');
      const images = imagesInput?.files || [];
      for (let i = 0; i < images.length; i++) {
        formDataToSend.append('images', images[i]);
      }

      const token = localStorage.getItem('token');

      const response = await fetch('http://127.0.0.1:8000/playgrounds', {
        method: 'POST',
        headers: {
          Authorization: token,
          Accept: 'application/json',
        },
        body: formDataToSend,
      });

      const data = await response.json();
      console.log('data, ', data);

      if (response.ok) {
        setSuccess('Playground created successfully!');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          if (onClose) onClose();
        }, 1500);
      } else {
        const fallback = `Failed to create playground${response.status ? ` (HTTP ${response.status})` : ''}`;
        setError((data && data.message) ? String(data.message) : fallback);
      }
    } catch (err) {
      console.error('Error uploading:', err);
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
    <div className="newPgContainer" onClick={handleOverlayClick}>
      <div className="subContainer">
        <button className="close-btn" onClick={handleClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <h1>Create New Playground</h1>
        
        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}
        
        {success && (
          <div className="success-message">
            <i className="fas fa-check-circle"></i>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <fieldset>
              <label htmlFor="pgName">Playground Name</label>
              <input 
                type="text" 
                id="pgName" 
                name="name" 
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter playground name"
                autoCorrect="false" 
                spellCheck="false" 
              />
            </fieldset>
            
            <fieldset>
              <label htmlFor="pgLocation">Location</label>
              <input
                type="text"
                id="pgLocation"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Enter location"
                autoCorrect="false"
                spellCheck="false"
              />
            </fieldset>
          </div>

          <div className="form-row">
            <fieldset>
              <label htmlFor="pgSize">Size (players)</label>
              <input
                type="number"
                name="size"
                id="pgSize"
                value={formData.size}
                onChange={handleInputChange}
                min={3}
                max={22}
                placeholder="e.g: 5"
                autoCorrect="false"
                spellCheck="false"
              />
            </fieldset>
            
            <fieldset>
              <label htmlFor="pgCost">Cost per Hour (JOD)</label>
              <input
                type="number"
                name="costPerHour"
                id="pgCost"
                value={formData.costPerHour}
                onChange={handleInputChange}
                min={0}
                step={0.5}
                placeholder="e.g: 25.00"
                autoCorrect="false"
                spellCheck="false"
              />
            </fieldset>
          </div>

          <div className="form-row">
            <fieldset>
              <label htmlFor="pgOpeningTime">Opening Time</label>
              <input
                type="time"
                id="pgOpeningTime"
                name="openingTime"
                value={formData.openingTime}
                onChange={handleInputChange}
                autoCorrect="false"
                spellCheck="false"
              />
            </fieldset>
            
            <fieldset>
              <label htmlFor="pgClosingTime">Closing Time</label>
              <input
                type="time"
                id="pgClosingTime"
                name="closingTime"
                value={formData.closingTime}
                onChange={handleInputChange}
                autoCorrect="false"
                spellCheck="false"
              />
            </fieldset>
          </div>

          <div className="form-row">
            <fieldset>
              <label htmlFor="pgGoogleMapUrl">Google Maps URL</label>
              <input
                type="url"
                id="pgGoogleMapUrl"
                name="googleMapUrl"
                value={formData.googleMapUrl}
                onChange={handleInputChange}
                placeholder="https://maps.google.com/..."
                autoCorrect="false"
                spellCheck="false"
              />
            </fieldset>
            
            <fieldset>
              <label htmlFor="pgAppleMapUrl">Apple Maps URL</label>
              <input
                type="url"
                id="pgAppleMapUrl"
                name="appleMapUrl"
                value={formData.appleMapUrl}
                onChange={handleInputChange}
                placeholder="https://maps.apple.com/..."
                autoCorrect="false"
                spellCheck="false"
              />
            </fieldset>
          </div>

          <fieldset className="file-fieldset">
            <label htmlFor="pgImageCover">Cover Image</label>
            <input
              type="file"
              accept="image/*"
              id="pgImageCover"
              name="imageCover"
              style={{ display: 'none' }}
              onChange={handleCoverChange}
            />
            <label htmlFor="pgImageCover" className="fileUploadBtn">
              <i className="fas fa-upload"></i>
              Choose Cover Image
            </label>
            {coverPreview && (
              <div className="previewBox">
                <img src={coverPreview} alt="Cover Preview" />
                <button 
                  type="button" 
                  className="remove-preview"
                  onClick={() => {
                    setCoverPreview(null);
                    document.getElementById('pgImageCover').value = '';
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
          </fieldset>

          <fieldset className="file-fieldset">
            <label htmlFor="pgImages">Additional Images (Optional)</label>
            <input
              type="file"
              multiple
              accept="image/*"
              id="pgImages"
              name="images"
              style={{ display: 'none' }}
              onChange={handleImagesChange}
            />
            <label htmlFor="pgImages" className="fileUploadBtn">
              <i className="fas fa-images"></i>
              Choose Multiple Images (Max 5)
            </label>
            {imagePreviews.length > 0 && (
              <div className="previewGrid">
                {imagePreviews.map((src, index) => (
                  <div key={index} className="preview-item">
                    <img src={src} alt={`Preview ${index}`} />
                    <button 
                      type="button" 
                      className="remove-preview"
                      onClick={() => {
                        const newPreviews = imagePreviews.filter((_, i) => i !== index);
                        setImagePreviews(newPreviews);
                        // Note: This doesn't remove from the file input, but it's a start
                      }}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </fieldset>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="create-btn" disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fas fa-plus"></i>
                  Create Playground
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPlayground;
